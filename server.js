const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.static('public'));

const rooms = new Map();

// 방 데이터 구조
class Room {
  constructor(id) {
    this.id = id;
    this.players = [];
    this.gameStarted = false;
    this.currentTurn = 0;
    this.selections = {};
    this.chat = [];
  }
}

io.on('connection', (socket) => {
  console.log('연결됨:', socket.id);

  // 방 만들기
  socket.on('createRoom', (name) => {
    const roomId = Math.random().toString(36).substr(2, 6).toUpperCase();
    const room = new Room(roomId);
    room.players.push({ id: socket.id, name, lives: 3, spectator: false });
    rooms.set(roomId, room);
    
    socket.join(roomId);
    socket.roomId = roomId;
    socket.emit('roomCreated', { roomId, room });
  });

  // 방 참여
  socket.on('joinRoom', ({ roomId, name }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('error', '방을 찾을 수 없습니다');
      return;
    }
    if (room.gameStarted) {
      socket.emit('error', '게임이 이미 시작되었습니다');
      return;
    }

    room.players.push({ id: socket.id, name, lives: 3, spectator: false });
    socket.join(roomId);
    socket.roomId = roomId;
    
    io.to(roomId).emit('updateRoom', room);
  });

  // 게임 시작
  socket.on('startGame', () => {
    const room = rooms.get(socket.roomId);
    if (!room || room.players.length < 2) {
      socket.emit('error', '최소 2명 필요합니다');
      return;
    }
    
    room.gameStarted = true;
    room.currentTurn = 0;
    io.to(socket.roomId).emit('gameStarted', room);
  });

  // 숫자 선택
  socket.on('selectNumber', ({ spoken, raised }) => {
    const room = rooms.get(socket.roomId);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.spectator) return;

    room.selections[socket.id] = { spoken, raised };

    // 모든 활성 플레이어가 선택했는지 확인
    const activePlayers = room.players.filter(p => !p.spectator);
    if (Object.keys(room.selections).length === activePlayers.length) {
      // 결과 계산
      const currentPlayer = room.players[room.currentTurn];
      const spokenNum = room.selections[currentPlayer.id].spoken;
      const total = Object.values(room.selections).reduce((sum, s) => sum + s.raised, 0);
      
      const result = {
        total,
        spokenNum,
        correct: total === spokenNum,
        currentPlayer: currentPlayer.name,
        selections: room.selections
      };

      // 틀렸으면 다른 플레이어 라이프 감소
      if (result.correct) {
        room.players.forEach(p => {
          if (p.id !== currentPlayer.id && !p.spectator) {
            p.lives--;
            if (p.lives <= 0) p.spectator = true;
          }
        });
      }

      io.to(socket.roomId).emit('roundResult', result);

      // 다음 턴
      setTimeout(() => {
        room.selections = {};
        const activeCount = room.players.filter(p => !p.spectator).length;
        
        if (activeCount <= 1) {
          const winner = room.players.find(p => !p.spectator);
          io.to(socket.roomId).emit('gameOver', { winner: winner?.name });
        } else {
          do {
            room.currentTurn = (room.currentTurn + 1) % room.players.length;
          } while (room.players[room.currentTurn].spectator);
          
          io.to(socket.roomId).emit('nextTurn', room);
        }
      }, 3000);
    } else {
      io.to(socket.roomId).emit('updateRoom', room);
    }
  });

  // 채팅
  socket.on('chat', (msg) => {
    const room = rooms.get(socket.roomId);
    if (!room) return;
    
    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      const chatMsg = { name: player.name, msg, time: Date.now() };
      room.chat.push(chatMsg);
      io.to(socket.roomId).emit('newChat', chatMsg);
    }
  });

  // 연결 끊김
  socket.on('disconnect', () => {
    const room = rooms.get(socket.roomId);
    if (room) {
      room.players = room.players.filter(p => p.id !== socket.id);
      if (room.players.length === 0) {
        rooms.delete(socket.roomId);
      } else {
        io.to(socket.roomId).emit('updateRoom', room);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`서버 실행 중: ${PORT}`);
});
