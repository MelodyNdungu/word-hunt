// @ts-check
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

/** @type {Map<string, import('./src/lib/types').GameRoom>} */
const rooms = new Map();

const PLAYER_COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A"];

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("create_room", ({ playerName, timerDuration, grid }) => {
      const roomId = generateRoomId();
      const playerIdx = 0;
      /** @type {import('./src/lib/types').GameRoom} */
      const room = {
        id: roomId,
        grid,
        players: {
          [socket.id]: {
            name: playerName || "Player 1",
            score: 0,
            foundWords: [],
            color: PLAYER_COLORS[playerIdx],
          },
        },
        gameStarted: false,
        gameOver: false,
        timerDuration: timerDuration || 90,
      };
      rooms.set(roomId, room);
      socket.join(roomId);
      socket.emit("room_joined", {
        roomId,
        playerId: socket.id,
        grid: room.grid,
        timerDuration: room.timerDuration,
      });
    });

    socket.on("join_room", ({ roomId, playerName }) => {
      const room = rooms.get(roomId);
      if (!room) {
        socket.emit("error", "Room not found");
        return;
      }
      if (room.gameStarted) {
        socket.emit("error", "Game already started");
        return;
      }
      const playerCount = Object.keys(room.players).length;
      if (playerCount >= 4) {
        socket.emit("error", "Room is full");
        return;
      }
      room.players[socket.id] = {
        name: playerName || `Player ${playerCount + 1}`,
        score: 0,
        foundWords: [],
        color: PLAYER_COLORS[playerCount],
      };
      socket.join(roomId);
      socket.emit("room_joined", {
        roomId,
        playerId: socket.id,
        grid: room.grid,
        timerDuration: room.timerDuration,
      });
      // Notify all players in room of the new player
      io.to(roomId).emit("player_update", {
        playerId: socket.id,
        state: room.players[socket.id],
      });
    });

    socket.on("start_game", ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      room.gameStarted = true;
      room.startTime = Date.now();
      io.to(roomId).emit("game_start", {
        grid: room.grid,
        startTime: room.startTime,
        timerDuration: room.timerDuration,
      });
      // Auto-end after timer
      setTimeout(() => {
        if (!room.gameOver) {
          room.gameOver = true;
          io.to(roomId).emit("game_over", { players: room.players });
        }
      }, room.timerDuration * 1000 + 500);
    });

    socket.on("word_found", ({ roomId, word, score }) => {
      const room = rooms.get(roomId);
      if (!room || !room.players[socket.id]) return;
      const player = room.players[socket.id];
      if (!player.foundWords.includes(word)) {
        player.foundWords.push(word);
        player.score += score;
        io.to(roomId).emit("player_update", {
          playerId: socket.id,
          state: player,
        });
      }
    });

    socket.on("disconnect", () => {
      rooms.forEach((room, roomId) => {
        if (room.players[socket.id]) {
          const playerName = room.players[socket.id].name;
          delete room.players[socket.id];
          io.to(roomId).emit("player_left", { playerId: socket.id });
          if (Object.keys(room.players).length === 0) {
            rooms.delete(roomId);
          }
        }
      });
    });
  });

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`> Word Hunt running on http://localhost:${PORT}`);
  });
});
