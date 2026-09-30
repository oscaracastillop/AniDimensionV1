const io = require('socket.io-client');

const socket = io('http://localhost:3005', {
    transports: ['websocket'],
    forceNew: true
});

socket.on('connect', () => {
    console.log('[TEST] Connected to server.');

    socket.emit('DUEL_START', {
        room_id: 'ROOM_TEST_TRIBUTE',
        opponent_name: 'NPC Yugi Muto',
        player_name: 'Tester',
        first_player: 'player1'
    });
});

socket.on('DUEL_STATE_UPDATE', (state) => {
    console.log(`[TEST] State update - Phase: ${state.phase}, TurnPlayer: ${state.turnPlayer}`);
    
    // Step 1: Invocación normal nivel 4
    if (state.turnPlayer === 'Tester' && state.phase === 'MAIN_1' && !state.player1.monsters[0] && !state.normalSummonUsed) {
        console.log('[TEST] Step 1: Invocando monstruo nivel 4 en casilla 0...');
        socket.emit('CLIENT_SUMMON', {
            room_id: 'ROOM_TEST_TRIBUTE',
            card_id: 91152256, // Celtic Guardian (Nv 4)
            slot_index: 0,
            zone_type: 'P_M',
            position: 'ATK'
        });
    }
    // Step 2: Invocación por Sacrificio nivel 6 (1 tributo directo en casilla 0)
    else if (state.turnPlayer === 'Tester' && state.player1.monsters[0] && state.player1.monsters[0].card_id === 91152256) {
        console.log('[TEST] Step 2: Invocando Cráneo Convocado (Nv 6) tributando casilla 0...');
        // Simulamos un nuevo turno para poder invocar de nuevo
        socket.emit('TEST_SETUP_DUEL_STATE', {
            room_id: 'ROOM_TEST_TRIBUTE',
            patch: {
                normalSummonUsed: false,
                player1: {
                    hand: [{ id: 70781052, card_id: 70781052, name: 'Summoned Skull', level: 6, type: 'Normal Monster' }]
                }
            }
        });

        setTimeout(() => {
            socket.emit('CLIENT_SUMMON', {
                room_id: 'ROOM_TEST_TRIBUTE',
                card_id: 70781052,
                slot_index: 0,
                tribute_slots: [0],
                position: 'ATK'
            });
        }, 300);
    }
    else if (state.player1.monsters[0] && state.player1.monsters[0].card_id === 70781052) {
        console.log('✅ [TEST SUCCESS] ¡Cráneo Convocado invocado exitosamente por sacrificio en casilla 0!');
        console.log('Cementerio del jugador:', state.player1.graveyard.map(c => c.name || c.id));
        socket.disconnect();
        process.exit(0);
    }
});

socket.on('ACTION_ERROR', (err) => {
    console.error('[TEST ERROR]', err);
    socket.disconnect();
    process.exit(1);
});

setTimeout(() => {
    console.error('[TEST TIMEOUT] Did not finish in time.');
    socket.disconnect();
    process.exit(1);
}, 8000);
