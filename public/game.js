// 게임 로직

function initGame(room) {
  updateGameUI(room);
  startZeroZeroAnimation();
}

function updateGameUI(room) {
  // 플레이어 정보 표시
  const playerInfo = document.getElementById('playerInfo');
  const html = room.players.map((p, idx) => `
    <div class="player-card ${idx === room.currentTurn ? 'current' : ''} ${p.spectator ? 'spectator' : ''}">
      <div>${p.name}</div>
      <div class="player-lives">❤️ ${p.lives}</div>
    </div>
  `).join('');
  playerInfo.innerHTML = html;

  // 드롭다운 옵션 설정
  const maxNum = room.players.filter(p => !p.spectator).length * 2;
  const spokenSelect = document.getElementById('spokenNum');
  const raisedSelect = document.getElementById('raisedNum');
  
  spokenSelect.innerHTML = '';
  raisedSelect.innerHTML = '';
  
  for (let i = 0; i <= maxNum; i++) {
    spokenSelect.innerHTML += `<option value="${i}">${i}</option>`;
    raisedSelect.innerHTML += `<option value="${i}">${i}</option>`;
  }

  // 현재 턴인 플레이어인지 확인
  const currentPlayer = room.players[room.currentTurn];
  const isMyTurn = currentPlayer.id === socket.id;
  const player = room.players.find(p => p.id === socket.id);
  
  document.getElementById('controls').style.display = 
    (player && !player.spectator) ? 'block' : 'none';
  
  // 말할 숫자는 현재 턴인 사람만 선택
  spokenSelect.disabled = !isMyTurn;
  if (!isMyTurn) {
    spokenSelect.style.opacity = '0.5';
  } else {
    spokenSelect.style.opacity = '1';
  }
}

function startZeroZeroAnimation() {
  const animDiv = document.getElementById('zeroZeroAnim');
  const resultDiv = document.getElementById('resultDisplay');
  const controls = document.getElementById('controls');
  const submitBtn = document.getElementById('submitBtn');
  
  resultDiv.textContent = '';
  controls.style.display = 'none';
  
  let count = 0;
  animDiv.textContent = '';
  
  const interval = setInterval(() => {
    if (count < 2) {
      animDiv.textContent = '제로';
      setTimeout(() => {
        animDiv.textContent = '';
      }, 1000);
    }
    count++;
    
    if (count >= 2) {
      clearInterval(interval);
      animDiv.textContent = '';
      
      // 컨트롤 표시
      const player = currentRoom.players.find(p => p.id === socket.id);
      if (player && !player.spectator) {
        controls.style.display = 'block';
        
        // 확인 버튼 이벤트
        submitBtn.onclick = () => {
          const spokenNum = parseInt(document.getElementById('spokenNum').value);
          const raisedNum = parseInt(document.getElementById('raisedNum').value);
          
          socket.emit('selectNumber', { spoken: spokenNum, raised: raisedNum });
          controls.style.display = 'none';
          resultDiv.textContent = '다른 플레이어 대기 중...';
        };
      }
    }
  }, 2500);
}

function displayResult(result) {
  const resultDiv = document.getElementById('resultDisplay');
  const animDiv = document.getElementById('zeroZeroAnim');
  
  animDiv.textContent = '';
  
  // 현재 플레이어가 말한 숫자 표시
  resultDiv.textContent = `${result.spokenNum}!`;
  
  setTimeout(() => {
    if (result.correct) {
      resultDiv.textContent = `정답! 합계: ${result.total}`;
      resultDiv.style.color = '#8b8680';
    } else {
      resultDiv.textContent = `오답! 합계: ${result.total}`;
      resultDiv.style.color = '#d4696e';
    }
  }, 1000);
}
