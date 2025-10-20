// 소켓 연결
const socket = io();

// DOM 요소
const screens = {
  lobby: document.getElementById('lobby'),
  roomList: document.getElementById('roomList'),
  waiting: document.getElementById('waiting'),
  game: document.getElementById('game')
};

const elements = {
  playerName: document.getElementById('playerName'),
  createBtn: document.getElementById('createBtn'),
  joinBtn: document.getElementById('joinBtn'),
  backToLobby: document.getElementById('backToLobby'),
  roomListContainer: document.getElementById('roomListContainer'),
  roomCode: document.getElementById('roomCode'),
  playerList: document.getElementById('playerList'),
  startBtn: document.getElementById('startBtn'),
  chatInput: document.getElementById('chatInput'),
  sendChat: document.getElementById('sendChat')
};

let currentRoom = null;
let myId = null;
let myName = '';
let inRoom = false; // 방 입장 여부

// 화면 전환
function showScreen(screenName) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[screenName].classList.add('active');
}

// 방 만들기
elements.createBtn.addEventListener('click', () => {
  const name = elements.playerName.value.trim();
  if (!name) {
    alert('이름을 입력하세요');
    return;
  }
  if (inRoom) {
    alert('이미 방에 입장해 있습니다');
    return;
  }
  myName = name;
  socket.emit('createRoom', name);
});

// 방 참여 버튼 - 방 목록 표시
elements.joinBtn.addEventListener('click', () => {
  const name = elements.playerName.value.trim();
  if (!name) {
    alert('이름을 입력하세요');
    return;
  }
  if (inRoom) {
    alert('이미 방에 입장해 있습니다');
    return;
  }
  myName = name;
  socket.emit('getRooms');
  showScreen('roomList');
});

// 뒤로가기
elements.backToLobby.addEventListener('click', () => {
  showScreen('lobby');
});

// 게임 시작
elements.startBtn.addEventListener('click', () => {
  socket.emit('startGame');
});

// 채팅 전송
function sendChatMessage() {
  const msg = elements.chatInput.value.trim();
  if (msg) {
    socket.emit('chat', msg);
    elements.chatInput.value = '';
  }
}

elements.sendChat.addEventListener('click', sendChatMessage);
elements.chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendChatMessage();
});

// 플레이어 리스트 업데이트
function updatePlayerList(room) {
  const html = room.players.map(p => `
    <div class="player-item ${p.spectator ? 'player-spectator' : ''}">
      <span>${p.name}</span>
      <span class="player-lives">❤️ ${p.lives}</span>
    </div>
  `).join('');
  elements.playerList.innerHTML = html;
}

// 방 목록 표시
function displayRoomList(rooms) {
  if (rooms.length === 0) {
    elements.roomListContainer.innerHTML = '<div class="empty-rooms">참여 가능한 방이 없습니다</div>';
    return;
  }

  const html = rooms.map(room => `
    <div class="room-item" onclick="joinRoomById('${room.id}')">
      <div class="room-info">
        <h3>${room.hostName}님의 방</h3>
        <p>방 코드: ${room.id} | 인원: ${room.playerCount}명</p>
      </div>
      <button class="room-join-btn">참여</button>
    </div>
  `).join('');
  
  elements.roomListContainer.innerHTML = html;
}

// 방 참여
window.joinRoomById = function(roomId) {
  if (inRoom) {
    alert('이미 방에 입장해 있습니다');
    return;
  }
  socket.emit('joinRoom', { roomId, name: myName });
};

// 소켓 이벤트
socket.on('roomList', (rooms) => {
  displayRoomList(rooms);
});

socket.on('roomCreated', ({ roomId, room }) => {
  currentRoom = room;
  myId = socket.id;
  inRoom = true;
  elements.roomCode.textContent = roomId;
  updatePlayerList(room);
  showScreen('waiting');
});

socket.on('roomJoined', ({ roomId, room }) => {
  currentRoom = room;
  myId = socket.id;
  inRoom = true;
  elements.roomCode.textContent = roomId;
  updatePlayerList(room);
  showScreen('waiting');
});

socket.on('updateRoom', (room) => {
  currentRoom = room;
  updatePlayerList(room);
});

socket.on('gameStarted', (room) => {
  currentRoom = room;
  showScreen('game');
  initGame(room);
});

socket.on('nextTurn', (room) => {
  currentRoom = room;
  updateGameUI(room);
  startZeroZeroAnimation();
});

socket.on('roundResult', (result) => {
  displayResult(result);
});

socket.on('gameOver', ({ winner }) => {
  setTimeout(() => {
    alert(`게임 종료! 승자: ${winner || '없음'}`);
    inRoom = false;
    showScreen('lobby');
  }, 1000);
});

socket.on('newChat', (chatMsg) => {
  addChatMessage(chatMsg);
});

socket.on('error', (msg) => {
  alert(msg);
});

// 채팅 메시지 추가
function addChatMessage({ name, msg }) {
  const chatBox = document.getElementById('chatBox');
  const div = document.createElement('div');
  div.className = 'chat-message';
  div.innerHTML = `<strong>${name}:</strong> ${msg}`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}
