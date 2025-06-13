const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const io = require('socket.io-client');
const cp = require('child_process');
const cheerio = require('cheerio');
const{ exec } = require('child_process'); 

/**
 * @param {vscode.ExtensionContext} context
*/ 
let username = ""
let roomId = ""
let socket;
let outputProvider;
class SampleOutputViewProvider { 
	constructor(context) {
		this.context = context;
		this._view = undefined;
	}

	resolveWebviewView(webviewView) {
		// console.log("Resolving web view");
		this._view = webviewView;
		webviewView.webview.options = { enableScripts: true };

		webviewView.webview.html = this.getHtml('Click "Run Sample Test" to begin.');
	}

	updateOutput(output) {
		// console.log(output);
		if(this._view){
			this._view.webview.postMessage({ output });
		}
		else{
			console.log("view is not defined yet !! ");
		}
	}


	getHtml(output) {
		return `
		<html>
		   <head>
		   <style>
		   	pre {
				background-color: #2d2d2d;
				padding: 1em;
				border-radius: 8px;
				color: #dcdcdc;
				white-space: pre-wrap;
				word-break: break-word;
			}
			
		   </style>
		   </head>
			<body>
			<h3>Sample Output</h3>
			<pre id="out">${output}</pre>
			
			<script>
				window.addEventListener('message', event => {
				document.getElementById('out').textContent = event.data.output;
				});
			</script>
			</body>
		</html>
		`;
	}
}
function activate(context) {
	outputProvider = new SampleOutputViewProvider(context);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('cfSampleOutput', outputProvider, {
    		webviewOptions: { retainContextWhenHidden: true }
  		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('cf.runSampleTest', () => {
			const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
			if (!workspaceFolder) {
				vscode.window.showInformationMessage('Open a folder first');
				return;
			}
			// console.log("running test cases");
			outputProvider?.updateOutput(" Running sample test...");
			vscode.commands.executeCommand('workbench.view.extension.cfViews'),
			vscode.commands.executeCommand('cfSampleOutput.focus')
			runAndCheckSampleTest(workspaceFolder); 
		})
	);
	const startingDuel = vscode.commands.registerCommand('codeduel.startduel',async function() {
		// vscode.window.showInformationMessage('you are starting a duel');
		username = await vscode.window.showInputBox({ prompt: 'Enter your username of Codeforces' });
      	roomId = Math.random().toString(36).substring(2, 8);
      	vscode.window.showInformationMessage(`Room ID: ${roomId}`, 'Copy to Clipboard', 'Dismiss')
		.then(selection => {
			if (selection === 'Copy to Clipboard') 
			{
			vscode.env.clipboard.writeText(roomId);
			vscode.window.showInformationMessage('Room ID copied to clipboard!');
			}
		});

		if(username !== undefined && username != ""){
			start_socket('codeduel.startduel',roomId,username);
		}
	});

	const JoiningDuel = vscode.commands.registerCommand('codeduel.joinduel',async function() {
		// vscode.window.showInformationMessage('you are joining a duel');
		username = await vscode.window.showInputBox({ prompt: 'Enter your username of Codeforces' });
      	roomId = await vscode.window.showInputBox({prompt : 'Enter your room id'});

		// vscode.window.showInformationMessage('Problem sent to server');

		if(username !== undefined && username !== ""){
			start_socket('codeduel.joinduel',roomId,username);
		}
	});

	
	async function start_socket(v,room,username){
		console.log('Connecting socket with', roomId, username);
		socket = io('https://codeduel-production-2fec.up.railway.app/');
		// socket = io('http://localhost:3000')

		socket.on('connect', () =>{
			console.log('Connected with ID : ',socket.id);
			socket.emit('join',{room,username,v});
		});

		socket.on('waiting',(msg)=>{
			vscode.window.showInformationMessage(msg);
		});
		socket.on('roomFull',(msg) =>{
			vscode.window.showInformationMessage(msg);
		});
		socket.on('invalid',(msg) =>{
			vscode.window.showInformationMessage(msg);
		});
		socket.on('user_added',(user_name)=>{
			vscode.window.showInformationMessage(`${user_name} has joined the room , Duel Begins !!`);
		});
		socket.on('error',(msg) =>{
			vscode.window.showInformationMessage(msg);
		})  
		socket.on('duel_result', ({ winner, timeDifference ,message}) => {
			if(message){
				vscode.window.showInformationMessage(message);
			}
			if(winner === 'tie'){
				vscode.window.showInformationMessage(`It's Rare !! But It's a Tie !!.`)
			}
			if (winner === username) {
				vscode.window.showInformationMessage(`CONGRATULATIONS YOU WON THE DUEL! :)`);
			} 
			else {
				vscode.window.showInformationMessage(`SORRY BUT HERE YOU LOST :( . ${winner} SUBMITTED FIRST.`);
			}

			if (timeDifference !== null) {
				vscode.window.showInformationMessage(`Difference: ${timeDifference} seconds`);
			}
			socket.disconnect();
		});

		socket.on('opponent_left', () => {
			console.log("Opponent disconnected. Duel ended.");
			socket.disconnect();
		});
		socket.on('start', async (msg) => {
			const problemText = msg;

			const panel = vscode.window.createWebviewPanel(
				'duelProblem',
				'Problem Statement',
				vscode.ViewColumn.One,
				{
					enableScripts: true,
					retainContextWhenHidden: true
				}
			);
			
			problemText.input = problemText.input.replace(/Input\s*/gi, '').replace(/Copy\s*/gi, '').trim();
			problemText.input = problemText.input.replace(/Output\s*/gi, '').replace(/Copy\s*/gi, '').trim();

			problemText.output = problemText.output.replace(/Input\s*/gi, '').replace(/Copy\s*/gi, '').trim();
			problemText.output = problemText.output.replace(/Output\s*/gi, '').replace(/Copy\s*/gi, '').trim();

			problemText.sampleTests = problemText.sampleTests.replace(/Copy\s*/gi, '').trim();
			problemText.sampleTests = problemText.sampleTests.replace(/Copy\s*/gi, '').trim();

			panel.webview.html = getWebviewContent(problemText,vscode.ViewColumn.One);

			panel.webview.onDidReceiveMessage((message) =>{
				if(message.command === 'runTest'){
					vscode.commands.executeCommand('cf.runSampleTest');
				}
			})

			
			const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
			if (workspaceFolder) {
				const solutionPath = workspaceFolder + '/solution.cpp';

				fs.writeFileSync(solutionPath, '// Write your solution here\n', 'utf8');

				const solutionDoc = await vscode.workspace.openTextDocument(solutionPath);

				vscode.window.showTextDocument(solutionDoc, vscode.ViewColumn.Two);

				const inputPath = workspaceFolder + '/input.txt';
				const expectedPath = workspaceFolder + '/expected.txt';
                const userAgent = `'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:115.0) Gecko/20100101 Firefox/115.0'`;

				exec(`curl -s -A ${userAgent} "${problemText.url}"`, { maxBuffer: 1024 * 1024 * 3 }, (err, stdout) =>{
					if(err){
						console.log("problem in loading input");
					}
					const $ = cheerio.load(stdout);
					const inputPre = $('.sample-test .input pre').first();
					const outputPre = $('.sample-test .output pre').first();

					inputPre.find('div').each((i, el) => {
						const text = $(el).text();
						$(el).replaceWith(text + '\n');
					});

					outputPre.find('div').each((i, el) => {
						const text = $(el).text();
						$(el).replaceWith(text + '\n');
					});

					inputPre.find('br').replaceWith('\n');
					outputPre.find('br').replaceWith('\n');


					let firstInput = inputPre.text().trim();
					let firstOutput = outputPre.text().trim();

					fs.writeFileSync(inputPath, firstInput, 'utf8');
					fs.writeFileSync(expectedPath, firstOutput, 'utf8');
	
					vscode.workspace.openTextDocument(inputPath);
					vscode.workspace.openTextDocument(expectedPath);
				});
			}
			else{
				vscode.window.showErrorMessage('No workspace folder found!');
			}

		});
	}
	context.subscriptions.push(startingDuel);
	context.subscriptions.push(JoiningDuel);
}


function getWebviewContent(problemText){
	const { title, timeLimit, memoryLimit, statement, input, output ,sampleTests, url,contestId,index} = problemText;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
	  <meta http-equiv="Content-Security-Policy" content="
		default-src 'none';
		img-src https: data:;
		script-src 'unsafe-inline' https:;
		style-src 'unsafe-inline' https:;">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
	  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">

      <style>
        body {
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
          padding: 1.5rem;
          line-height: 1.6;
          background-color: #1e1e1e;
          color: #d4d4d4;
        }
        h1 {
          color: #569CD6;
        }
        h2 {
          color: #9CDCFE;
        }
        pre {
          background-color: #2d2d2d;
          padding: 1em;
          border-radius: 8px;
          overflow-x: auto;
          color: #dcdcdc;
        }
        .section {
          margin-bottom: 2em;
        }
        .label {
          font-weight: bold;
          color: #C586C0;
        }

		#submit-btn {
            display: block;
            padding: 0.8em 1.2em;
            font-size: 16px;
            background-color: #007acc;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 2em;
          }
		#runTestBtn {
			display: block;
			margin-left: auto;
			padding: 0.8em 1.2em;
			font-size: 16px;
			background-color: #007acc;
			color: white;
			border: none;
			border-radius: 4px;
			cursor: pointer;
			margin-top: 2em;
		}
		.upper-box{
			display:flex;
			justify-items:space-between;
		}
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="section"><span class="label">Time Limit:</span> ${timeLimit}</div>
      <div class="section"><span class="label">Memory Limit:</span> ${memoryLimit}</div>

      <div class="section">
        <h2>Description</h2>
        ${convertCFMathToLatex(formatLatexMath(statement))}
      </div>

      <div class="section">
        <h2>Input</h2>
        ${convertCFMathToLatex(formatLatexMath(input))}
      </div>

      <div class="section">
        <h2>Output</h2>
        ${convertCFMathToLatex(formatLatexMath(output))}
	
	  <div class="section">
        <h2>Sample Test</h2>
        ${sampleTests}

	  <div class="section">
        <h3>Link to the Problem Statement </h3>
        <a href = "${url}" style = "text-decoration:none;">${url}</a>

		<div class = "upper-box">
			<button id="submit-btn"><a href = "https://codeforces.com/problemset/submit" style = "text-decoration:none; color:white;">Submit</a> </button>
			<button id="runTestBtn"> Run Sample Test</button>
		</div>

        <script>
			console.log("webview script started");
			const vscode = acquireVsCodeApi();
			
			document.getElementById('runTestBtn').addEventListener('click', () => {
				vscode.postMessage({ command: 'runTest' });
			});
        </script>
			<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
			<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"
					onload="renderMathInElement(document.body);"></script>
			<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
			<script type="text/javascript"></script>
			<script type="text/javascript" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js">
				console.log('i am inside mathjax');
				MathJax.startup.promise.then(() => {
					console.log('hello');
					MathJax.typeset();
				});
			</script>


      </div>
    </body>
    </html>
  `;
	
}

function formatLatexMath(rawHtml) {
	if(rawHtml){
		return rawHtml.replace(/\$\$\$(.+?)\$\$\$/g, (_, expr) => `\$begin:math:text$${expr}\\$end:math:text$`);
	}
}
function convertCFMathToLatex(html) {
	if(html){
		return html
		  .replace(/\$begin:math:text\$/g, '')
		  .replace(/\$end:math:text\$/g, ''); 
	}
}
function runAndCheckSampleTest(workspacePath) {
  const cppPath = path.join(workspacePath, 'solution.cpp');
  const inputPath = path.join(workspacePath, 'input.txt');
  const expectedPath = path.join(workspacePath, 'expected.txt');
  const execPath = path.join(workspacePath, 'a.out');

//   console.log("files fetched properly");
  cp.exec(`g++ "${cppPath}" -o "${execPath}"`, (compileErr, _, compileStderr) => {
	// console.log('compile result',compileErr,compileStderr);
    if (compileErr) {
      outputProvider?.updateOutput(`Compilation Error:\n${compileStderr}`);
      return;
    }

    cp.exec(`"${execPath}" < "${inputPath}"`, (runErr, stdout, stderr) => {
      if (runErr) {
        outputProvider?.updateOutput(`Runtime Error:\n${stderr}`);
        return;
      }

      const expected = fs.readFileSync(expectedPath, 'utf-8').trim();
      const actual = stdout.trim();

      if (expected === actual) {
        outputProvider?.updateOutput(`Output Matched!\n\n${actual}`);
      } else {
        outputProvider?.updateOutput(`Output Mismatch!\n\nExpected:\n${expected}\n\nGot:\n${actual}`);
      }
    });
  });
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
