# ⚔️ CodeDuel - Competitive Coding Battles in VS Code

**CodeDuel** is a VS Code extension that lets you challenge your friends to real-time competitive programming duels — without ever leaving your editor.The one who gets an accepted solution first — wins. It's built to bring the thrill of competitive programming duels directly inside your code editor.

> Compete. Code. Win. All inside VS Code.

- Compete head-to-head by solving the same Codeforces problem  
- See who submits first and wins — results shown live in VS Code  
- Log in with your Codeforces ID to get started  

---

##  Features

-  Random Codeforces problem generator
-  Real-time room-based duels between two coders
-  Automatic winner detection using Codeforces API
-  Pre-filled test cases for each problem
-  Run test cases directly into VS Code.
-  Clean, minimal UI integrated into VS Code
-  Secure and battle-tested backend hosted on Railway

## WorkFlow
- **Open a Folder**
  Open a folder using VS Code .

- **Start a Duel**  
  Use the VS Code Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) and run the `Start Duel` command. Share the generated **Room ID** with a friend.

- **Join a Duel**  
  Your friend runs the `Join Duel` command and enters the shared Room ID. Once both players are in, the duel begins.

- **Same Problem, Same Time**  
  A random Codeforces problem is fetched for both players — Both gets the exact same challenge.

- **Codeforces Integration**  
  When you submit your solution on Codeforces, CodeDuel tracks the verdicts and updates the VS Code interface.

- **Live Winner Detection**  
  The first person to get an **Accepted** verdict wins the duel. A win/loss message is shown right in VS Code.

---

## Setup

1. Install the extension from the VS Code Marketplace.
2. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
3. Search for and run either:
   - `CodeDuel: Start Duel`
   - `CodeDuel: Join Duel`
4. You'll be prompted to enter your **Codeforces handle** (only once per session)
5. Share the **roomId** with your friend
6. Let the games begin!

---


## 🎬 Workflow Demo

Here’s a quick walkthrough of how CodeDuel works inside VS Code:

| Action | Preview |
|--------|---------|
| **Start a Duel** <br>Press F5 and then Press `Cmd+Shift+P` (Mac) / `Ctrl+Shift+P` (Windows) to open the Command Palette. Enter your User ID, then a room ID will be generated. Pass it to your friend. | ![Start a Duel](media/Code_copy_roomid.png) |
| **Join a Duel**<br>Use the command Join Duel in command palette | ![Join Duel](media/Code_join_duel.png) |
| **Enter Room ID**<br>Enter the room ID to connect. | ![Enter Room ID](media/Code_enter_roomId.png) |
| **Problem Delivered**<br>Problem statement appears side-by-side with your code editor. | ![Problem Statement](media/Code_duel_begins.png) |
| **Run Sample Test**<br>Check sample input/output inside VS Code only | ![Sample Test](media/Code_while_solving.png) |
| **Winner Declaration**<br>One who submits first will win the duel | ![Winner](media/Code_winner_declaration.png) |



## Technologies Used

- VS Code Extension API  
- Node.js backend (Socket.IO)
- Codeforces API
- Cheerio and Puppeteer for Problem extraction

---

## Notes

- Make sure you’re logged in to Codeforces before submitting your code.  
- Extension does **not** store your credentials — only your Codeforces handle.  
- You can continue solving the problem even after one player wins — great for practice!

---

## Future Plans

- Leaderboards & rating system  
- Support for more platforms (e.g., LeetCode, AtCoder)  
- Support submission from VS Code only
- Support Complete contest between 2 users

---

## Contributing

Contributions and suggestions are welcome! Feel free to fork this repo, open issues, or submit pull requests.

---

## Author

Made with ❤️ by [Gourav Chourasiya](https://github.com/Gourav-byte)  
Built for focused growth in competitive programming 💪
