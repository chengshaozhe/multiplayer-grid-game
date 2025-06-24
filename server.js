
// server.js - Firebase-like multiplayer grid game using Express + WebSocket (for Render deployment)

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static('public'));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const ROOMS = {}; // gameId -> { players: {P1: ws, P2: ws}, state: {...} }

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    const { type, roomId, playerId, payload } = data;

    if (type === 'join') {
      if (!ROOMS[roomId]) {
        ROOMS[roomId] = {
          players: {},
          state: {
            P1: { x: 0, y: 0 },
            P2: { x: 14, y: 14 },
            turn: 'P1',
            gridSize: 15
          }
        };
      }
      ROOMS[roomId].players[playerId] = ws;
      ws.send(JSON.stringify({ type: 'init', state: ROOMS[roomId].state }));
    }

    if (type === 'move') {
      const state = ROOMS[roomId].state;
      if (state.turn !== playerId) return;

      const pos = state[playerId];
      const { dx, dy } = payload;
      pos.x = Math.max(0, Math.min(state.gridSize - 1, pos.x + dx));
      pos.y = Math.max(0, Math.min(state.gridSize - 1, pos.y + dy));

      state.turn = playerId === 'P1' ? 'P2' : 'P1';

      for (const pid in ROOMS[roomId].players) {
        ROOMS[roomId].players[pid].send(JSON.stringify({ type: 'update', state }));
      }
    }
  });
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
