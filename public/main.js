// 소켓 연결
const socket = io();

// DOM 요소
const screens = {
  lobby: document.getElementById('lobby'),
  waiting: document.getElementById('waiting'),
  game: document.getElementById('game')
};

const elements = {
  playerName: document.getElementById('playerName'),
  createBtn: document.getElementById('createBtn'),
  joinBtn: document.getElementById('joinBtn'),
  joinModal: document.getElementById('joinModal'),
  roomCodeInput: document.getElementById('roomCodeInput'),
  confirmJoin: document.getElementById('confirmJoin'),
  cancelJoin: document.getElementById('cancelJoin'),
  roomCode: document.getElementById('roomCode'),
  playerList: document.getElementById('playerList'),
  startBtn: document.getElementById('startBtn'),
  chatInput: document.getElementById('chatInput'),
  sendChat: document.getElementById('sendChat')
};

let currentRoom = null;
let myId = null;

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
  socket.emit('createRoom', name);
});

// 방 참여 모달 열기
elements.joinBtn.addEventListener('click', () => {
  const name = elements.playerName.value.trim();
  if (!name) {
    alert('이름을 입력하세요');
    return;
  }
  elements.joinModal.classList.add('active');
});

// 방 참여 확인
elements.confirmJoin.addEventListener('click', () => {
  const roomId = elements.roomCodeInput.value.trim().toUpperCase();
  const name = elements.playerName.value.trim();
  
  if (!roomId) {
    alert('방 코드를 입력하세요');
    return;
  }
  
  socket.emit('joinRoom', { roomId, name });
  elements.joinModal.classList.remove('active');
  elements.roomCodeInput.value = '';
});

// 모달 취소
elements.cancelJoin.addEventListener('click', () => {
  elements.joinModal.classList.remove('active');
  elements.roomCodeInput.value = '';
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

// 소켓 이벤트
socket.on('roomCreated', ({ roomId, room }) => {
  currentRoom = room;
  myId = socket.id;
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
  alert(`게임 종료! 승자: ${winner}`);
  showScreen('lobby');
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
