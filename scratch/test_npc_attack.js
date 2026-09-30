const io = require('socket.io-client');

const socket = io('http://localhost:3005', {
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('[TEST] Connected');
  socket.emit('USER_IDENTIFY', { username: 'Admin' });
  // Start with player1 (human first)
  socket.emit('DUEL_START', {
    room_id: 'ROOM_ATTACK_TEST',
    opponent_name: 'Yugi Muto (Nv. 5)',
    player_name: 'Admin',
    first_player: 'player1'
  });
});

let turnPassed = false;

socket.on('DUEL_STATE_UPDATE', (state) => {
  console.log(`[STATE] Turn ${state.turnNumber}, TurnPlayer: ${state.turnPlayer}, Phase: ${state.phase}`);

  // In turn 1, human player passes turn immediately to NPC
  if (state.turnNumber === 1 && state.turnPlayer === 'Admin' && !turnPassed) {
    turnPassed = true;
    console.log('[HUMAN] Passing Turn 1 to NPC...');
    setTimeout(() => {
      socket.emit('DUEL_ACTION', {
        room_id: 'ROOM_ATTACK_TEST',
        action_type: 'PASS_PHASE',
        target_phase: 'END'
      });
    }, 1000);
  }

  // In turn 2, it is NPC's turn! Since turnNumber is 2 (> 1), NPC CAN ENTER BATTLE PHASE AND ATTACK!
  if (state.turnNumber === 2 && state.phase === 'BATTLE') {
    console.log('[SUCCESS] NPC entered BATTLE PHASE in Turn 2!');
  }
});

socket.on('OCG_EVENT_LOG', (log) => {
  console.log('[LOG]', log.message);
  if (log.message.includes('Ataque Directo') || log.message.includes('destruye a') || log.message.includes('BATTLE PHASE')) {
    console.log('[BATTLE CONFIRMED]', log.message);
  }
});

setTimeout(() => {
  console.log('[DONE TESTING]');
  socket.disconnect();
  process.exit(0);
}, 12000);
