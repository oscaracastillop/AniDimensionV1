const io = require('socket.io-client');

const socket = io('http://localhost:3005', {
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('[TEST] Connected to server, id:', socket.id);
  
  socket.emit('USER_IDENTIFY', { username: 'Admin' });

  console.log('[TEST] Emitting DUEL_START with first_player=player2 (NPC first)...');
  socket.emit('DUEL_START', {
    room_id: 'ROOM_SOCKET_TEST',
    opponent_name: 'Yugi Muto (Nv. 5)',
    player_name: 'Admin',
    first_player: 'player2'
  });
});

let updateCount = 0;

socket.on('DUEL_STATE_UPDATE', (state) => {
  updateCount++;
  console.log(`[STATE UPDATE #${updateCount}] Turn: ${state.turnNumber}, Player: ${state.turnPlayer}, Phase: ${state.phase}`);
  console.log(` - Player Hand: ${state.player1.hand.length}, Field: ${state.player1.monsters.filter(Boolean).length}`);
  console.log(` - NPC Hand: ${state.player2.hand.length}, Field: ${state.player2.monsters.filter(Boolean).length}`);
  
  // If NPC finished turn 1 and handed off to player (turn 2 or player turn)
  if (state.turnPlayer === 'Admin' || (updateCount >= 4 && state.phase === 'MAIN_1')) {
    console.log('[TEST SUCCESS] NPC completed Turn 1 and handed off to player successfully!');
    setTimeout(() => {
      socket.disconnect();
      process.exit(0);
    }, 500);
  }
});

socket.on('OCG_EVENT_LOG', (log) => {
  console.log('[LOG]', log.message);
});

socket.on('ACTION_ERROR', (err) => {
  console.error('[ERROR]', err);
});

// Timeout after 15s if no progress
setTimeout(() => {
  console.error('[TIMEOUT] Did not finish in 15 seconds.');
  socket.disconnect();
  process.exit(1);
}, 15000);
