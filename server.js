const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const PORT = process.env.PORT || 3000;
const rooms = new Map();

function roomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do {
    code = Array.from({length: 5}, () => chars[Math.floor(Math.random()*chars.length)]).join("");
  } while (rooms.has(code));
  return code;
}

const server = http.createServer((req, res) => {
  let file = req.url === "/" ? "/index.html" : req.url;
  file = path.normalize(file).replace(/^(\.\.[\/\\])+/, "");
  const full = path.join(__dirname, file);
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    const ext = path.extname(full);
    const types = {".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8"};
    res.writeHead(200, {"Content-Type": types[ext] || "application/octet-stream"});
    res.end(data);
  });
});

const wss = new WebSocket.Server({server});

function send(ws, obj) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}
function broadcast(room, obj) {
  for (const p of room.players) send(p.ws, obj);
}

wss.on("connection", ws => {
  let player = null;

  ws.on("message", raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === "create") {
      const code = roomCode();
      const room = {code, players: [], state: {round:1, q:null, category:null, answers:{}, scores:[0,0]}};
      rooms.set(code, room);
      player = {ws, index:0, name: String(msg.name || "Player 1").slice(0,24)};
      room.players.push(player);
      send(ws, {type:"joined", code, index:0, name:player.name});
      return;
    }

    if (msg.type === "join") {
      const code = String(msg.code || "").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,5);
      const room = rooms.get(code);
      if (!room) return send(ws, {type:"error", message:"Room nahi mila."});
      if (room.players.length >= 2) return send(ws, {type:"error", message:"Room full hai."});
      player = {ws, index:1, name: String(msg.name || "Player 2").slice(0,24)};
      room.players.push(player);
      send(ws, {type:"joined", code, index:1, name:player.name});
      broadcast(room, {type:"ready", players:room.players.map(p=>p.name)});
      return;
    }

    if (!player) return;
    const room = rooms.get([...rooms.keys()].find(k => rooms.get(k).players.includes(player)));
    if (!room) return;

    if (msg.type === "question") {
      room.state.round = Number.isFinite(msg.round) ? msg.round : room.state.round;
      room.state.q = String(msg.question || "");
      room.state.category = String(msg.category || "");
      room.state.answers = {};
      broadcast(room, {type:"question", round:room.state.round, question:room.state.q, category:room.state.category});
    }

    if (msg.type === "answer") {
      room.state.answers[player.index] = String(msg.answer || "").slice(0,500);
      broadcast(room, {type:"answerStatus", count:Object.keys(room.state.answers).length});
      if (Object.keys(room.state.answers).length === 2) {
        broadcast(room, {type:"answers", answers:room.state.answers});
      }
    }

    if (msg.type === "score") {
      const winner = msg.winner === 1 ? 1 : 0;
      room.state.scores[winner]++;
      broadcast(room, {type:"scores", scores:room.state.scores});
    }
  });

  ws.on("close", () => {
    if (!player) return;
    for (const [code, room] of rooms) {
      if (room.players.includes(player)) {
        room.players = room.players.filter(p => p !== player);
        broadcast(room, {type:"left"});
        if (!room.players.length) rooms.delete(code);
        break;
      }
    }
  });
});

server.listen(PORT, () => console.log(`Bestie Battle running on port ${PORT}`));
