const io = require('socket.io-client');

const socket = io('http://localhost:3005', {
    transports: ['websocket'],
    forceNew: true
});

socket.on('connect', () => {
    console.log('[TEST] Connected to server.');

    socket.emit('DUEL_START', {
        room_id: 'ROOM_DIRECT_TRIBUTE',
        opponent_name: 'NPC Yugi Muto',
        player_name: 'Tester',
        first_player: 'player1'
    });
});

let setupDone = false;

socket.on('DUEL_STATE_UPDATE', (state) => {
    if (state.turnPlayer === 'Tester' && !setupDone) {
        setupDone = true;
        console.log('[TEST] Setting up board with 1 monster on field (slot 0)...');
        socket.emit('TEST_SETUP_DUEL_STATE', {
            room_id: 'ROOM_DIRECT_TRIBUTE',
            patch: {
                normalSummonUsed: false,
                player1: {
                    monsters: [
                        { card_id: 91152256, position: 'ATK', faceDown: false, card_data: { id: 91152256, name: 'Celtic Guardian', level: 4, atk: 1400, def: 1200 } },
                        null, null, null, null
                    ],
                    hand: [
                        { id: 70781052, card_id: 70781052, name: 'Summoned Skull', level: 6, type: 'Normal Monster', atk: 2500, def: 1200 }
                    ]
                }
            }
        });

        setTimeout(() => {
            console.log('[TEST] Emitting CLIENT_SUMMON for Summoned Skull (Nv 6) tributing slot 0...');
            socket.emit('CLIENT_SUMMON', {
                room_id: 'ROOM_DIRECT_TRIBUTE',
                card_id: 70781052,
                slot_index: 0,
                tribute_slots: [0],
                position: 'ATK'
            });
        }, 400);
        return;
    }

    if (state.player1.monsters[0] && state.player1.monsters[0].card_id === 70781052) {
        console.log('🎉 [TEST SUCCESS] ¡Invocación por Sacrificio completada con éxito!');
        console.log('Monstruo en campo slot 0:', state.player1.monsters[0].card_data.name);
        console.log('Cementerio del jugador:', state.player1.graveyard.map(c => c.name || c.id));
        socket.disconnect();
        process.exit(0);
    }
});

socket.on('ACTION_ERROR', (err) => {
    console.error('❌ [TEST ACTION_ERROR]', err);
    socket.disconnect();
    process.exit(1);
});

setTimeout(() => {
    console.error('⏰ [TEST TIMEOUT]');
    socket.disconnect();
    process.exit(1);
}, 6000);
