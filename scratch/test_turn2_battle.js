const io = require('socket.io-client');

const socket = io('http://localhost:3005', {
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('[TEST] Connected, socket ID:', socket.id);
  socket.emit('USER_IDENTIFY', { username: 'Admin' });

  setTimeout(() => {
    socket.emit('DUEL_START', {
      room_id: 'ROOM_BATTLE_RUN',
      opponent_name: 'Yugi Muto (Nv. 5)',
      player_name: 'Admin',
      first_player: 'player1'
    });
  }, 200);
});

socket.on('DUEL_STATE_UPDATE', (state) => {
  console.log(`[STATE] Turn ${state.turnNumber}, TurnPlayer: ${state.turnPlayer}, Phase: ${state.phase}`);

  if (state.turnNumber === 1 && state.turnPlayer === 'Admin' && state.phase === 'MAIN_1') {
    console.log('[HUMAN] In MAIN_1 Turn 1, changing to END phase...');
    socket.emit('CMD_ACTION', {
      room_id: 'ROOM_BATTLE_RUN',
      action_type: 'SET_PHASE',
      target_phase: 'END'
    });
  }

  if (state.turnNumber === 2 && state.turnPlayer !== 'Admin') {
    console.log(`[NPC TURN ACTIVE] NPC is playing Turn 2! Phase: ${state.phase}`);
  }
});

socket.on('OCG_EVENT_LOG', (log) => {
  console.log('[LOG]', log.message);
});

socket.on('ACTION_ERROR', (err) => {
  console.error('[ACTION_ERROR]', err.message);
});

setTimeout(() => {
  console.log('[TEST TIMEOUT EXPIRED]');
  socket.disconnect();
  process.exit(0);
}, 12000);
