const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
// const problems = require('./problem.json');
const {exec} = require('child_process');
// import {exec } from 'child_process'
const axios = require('axios');
const cheerio = require('cheerio');
// const vscode = require('vscode');
const {Server} = require('socket.io');
const puppeteer = require('puppeteer');

const app = express();
const server = createServer(app);
const io = new Server(server, {
});
app.get('/', (req, res) => {
    res.send('Server is Working !! ');
});
let rooms = {};

console.log('Server started');
io.on('connection',(socket) =>{
    socket.on('join',({room,username,v})=>{
        if (!rooms[room]) {
            rooms[room] = {
                user:[],
                contestId:null,
                index:null,
                intervalId:null,
                timeoutId:null
            }
                rooms[room].timeoutId = setTimeout(() => {
                    if(rooms[room].user.length === 1){
                        io.to(room).emit('error', 'No opponent joined. Duel expired.');
                        io.in(room).socketsLeave(room);
                        socket.disconnect();
                        delete rooms[room];
                    }
                }, 120000); // 60 seconds
        } 
        if(rooms[room].user.length >= 2){
            socket.emit('roomFull','No more users are allowed , Sorry !! ');
            socket.disconnect();
            return ;
        }

        if(v === 'codeduel.joinduel' && rooms[room].user.length === 0){
            socket.emit('invalid','Please Enter a valid room Id !! ');
            socket.disconnect();
            return ;
        }
        
        socket.join(room);

        rooms[room].user.push({ id: socket.id, username });
        if (rooms[room].user.length === 2 && rooms[room].timeoutId) {
            clearTimeout(rooms[room].timeoutId);
            rooms[room].timeoutId = null;
            socket.to(room).emit('user_added',username);
            
            fetchAndSendProblem(room).then(() =>{

                startPollingWinner(room);

            });

        } 
        else if(rooms[room].user.length === 1){
            socket.emit('waiting','Waiting for second user');
        }

    });


async function fetchAndSendProblem(room) { 
  try {
    const problemData = await fetchRandomCodeforcesProblemWithDetails();
    const {contestId,index} = problemData;

    rooms[room].contestId = contestId;
    rooms[room].index = index;

    io.to(room).emit('start', problemData);
  } 
  catch (error) {

    io.to(room).emit('error', 'Failed to fetch problem data');
  }
}


function fetchRandomCodeforcesProblemWithDetails(minRating = 800, maxRating = 1600) {
  try {
        // let problems = {};
        const url2 = `https://codeforces.com/api/problemset.problems`;
        return new Promise((resolve, reject) => {
            exec(`curl -A "Mozilla/5.0" "${url2}"`, { maxBuffer: 1024 * 1024 * 5 }, async (err, stdout) => {
                if (err) {
                    console.error('Curl error:', err.message);
                }

                try {
                    const data = JSON.parse(stdout);
                    const problems = data.result.problems;
                    if (!problems || problems.length === 0) {
                        console.log("no problem found for this rating !!");
                    }
                    
                    const filtered = problems.filter(
                    p => typeof p.rating === 'number' && p.rating >= minRating && p.rating <= maxRating
                    );

                    if (filtered.length === 0) throw new Error('No problems found in this rating range.');
                    const randomProblem = filtered[Math.floor(Math.random() * filtered.length)];
                    const { contestId, index, name, rating } = randomProblem;
                    

                    const url = `https://codeforces.com/problemset/problem/${contestId}/${index}`;
                    const userAgent = `"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:115.0) Gecko/20100101 Firefox/115.0"`;


                    try {
                    const browser = await puppeteer.launch({
                        headless: true,
                        args: ['--no-sandbox'],
                    });

                    const page = await browser.newPage();
                    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:115.0) Gecko/20100101 Firefox/115.0");
                    await page.goto(url, { waitUntil: 'domcontentloaded' });

                    const html = await page.content();
                    await browser.close();

                    const $ = cheerio.load(html);
                    const title = $('.problem-statement .title').first().text().trim();

                    const timeLimitBlock = $('.time-limit');
                    const timeLabel = timeLimitBlock.find('.property-title').text();
                    const timeValue = timeLimitBlock.contents().filter(function () {
                        return this.type === 'text';
                    }).text().trim();
                    const timeLimit = `${timeLabel} ${timeValue}`;

                    const memoryLimitBlock = $('.memory-limit');
                    const memoryLabel = memoryLimitBlock.find('.property-title').text();
                    const memoryValue = memoryLimitBlock.contents().filter(function () {
                        return this.type === 'text';
                    }).text().trim();
                    const memoryLimit = `${memoryLabel} ${memoryValue}`;

                    let statement = $('.problem-statement .header + div').html() || '';
                    let input = $('.problem-statement .input-specification').html();
                    let output = $('.problem-statement .output-specification').html();
                    const sampleTests = $('.sample-test').html() || '';

                    resolve({
                        title,
                        timeLimit,
                        memoryLimit,
                        statement,
                        input,
                        output,
                        sampleTests,
                        url,
                        contestId,
                        index,
                    });

                } catch (e) {
                    reject(new Error('Failed to scrape with puppeteer: ' + e.message));
                }
                } 
                catch (e) {
                    console.error('JSON parse error:', e.message);
                }
            });
        });

    
  } catch (err) {
    console.error('Error fetching Codeforces problem:', err.message);
    return null;
  }
}

async function checkVerdict(handle, contestId, problemIndex) {
    const url = `https://codeforces.com/api/user.status?handle=${handle}&from=1&count=10`;
    try {
        const res = await axios.get(url);
        const submissions = res.data.result;
        for (let sub of submissions) {
            if(sub.verdict === "OK" && sub.problem.contestId == contestId && sub.problem.index == problemIndex) {
                return sub.creationTimeSeconds;
            }
        }
    } catch (e) {
        console.error("Error checking verdict:", e.message);
    }
    return null;
}
 
function startPollingWinner(roomId) {
    
    const max_wait_time = 2*60*60*1000;
    const starting_time = Date.now();
    const intervalId = setInterval(async () => {
 
        const room = rooms[roomId];

        if (room.user.length === 0) {
            if (room.intervalId) {
                clearInterval(room.intervalId);

                room.intervalId = null;
                
                return ;
            }
            delete rooms[roomId];
        } 
        if (!room || room.user.length !== 2 || !room.contestId || !room.index){
            return;
        }

        const { user, contestId, index } = room;
        const times = await Promise.all(user.map(u =>{
            // console.log(u.username);
            return checkVerdict(u.username, contestId, index);
        }));

        if (times[0] && times[1]) {
            let winner;
            if(times[0] < times[1]){
                winner = user[0].username;
            }
            else if(times[0] > times[1]){
                winner = user[1].username;
            }
            else{
                winner = 'tie';
            }
            const diff = Math.abs(times[0] - times[1]);
            io.to(roomId).emit('duel_result', {
                winner,
                timeDifference: diff
            });
            clearInterval(intervalId);
            room.intervalId = null;
        } 
        else if (times[0] || times[1]) {
            const winner = times[0] ? user[0].username : user[1].username;
            io.to(roomId).emit('duel_result', {
                winner,
                timeDifference: null
            });
            clearInterval(intervalId);
            room.intervalId = null;
        }
        else{
            if(Date.now() - starting_time >= max_wait_time){
                io.to(roomId).emit('duel_result', {
                    winner: null,
                    timeDifference: null,
                    message: "Duel timed out. No correct submission from either side."
                });
                clearInterval(intervalId);
                room.intervalId = null;

                user.forEach(u => {
                    const socket = io.sockets.sockets.get(u.socketId);
                    if (socket) socket.disconnect();
                });

                delete rooms[roomId];
            }
        }
    }, 10000);

    const room = rooms[roomId];
    if(room){
        room.intervalId = intervalId;
    }
}
    socket.on('disconnect',() =>{
        // console.log(rooms);
        // console.log(`User with this socket id: ${socket.id} disconnected`);
        // cnt -= 1;
        for (const roomId in rooms) {
            // console.log("not working");
			const room = rooms[roomId];
			const userIndex = room.user.findIndex(u => u.id === socket.id);

            // console.log(userIndex);
			if (userIndex !== -1) {
				room.user.splice(userIndex, 1);

				io.to(roomId).emit('opponent_left');

				if (room.intervalId) {
                    // console.log("clearing interval :",room.intervalId);
					clearInterval(room.intervalId);
					room.intervalId = null;
					// console.log("Stopped polling due to disconnect.");
                    return ;
				}

				if (room.user.length === 0) {
					delete rooms[roomId];
                    // console.log(rooms);
                    return ;
				}
				break;
			}
		}
        
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server is listening on port ${PORT}`));
// server.listen(3000,() => console.log("server is listening to port 3000"));
