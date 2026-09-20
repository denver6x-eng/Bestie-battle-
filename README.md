# 💗 Long-Distance Bestie Battle

A tiny real-time 2-player web game. Both phones open the same hosted URL, one player creates a room, the other joins with the 5-character code.

## Run locally
1. Install Node.js 18+.
2. Open this folder in a terminal.
3. Run `npm install`.
4. Run `npm start`.
5. Open `http://localhost:3000`.

For two phones on the same Wi-Fi, use the computer's local IP instead of localhost.

## Put it online
Deploy this folder to any Node.js hosting service that supports WebSockets. The start command is:
`npm start`

The app uses WebSockets for live room synchronization. No database is required for this prototype; rooms exist only while the server is running.
