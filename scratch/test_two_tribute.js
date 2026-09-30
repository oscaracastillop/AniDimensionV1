const io = require('socket.io-client');

const socket = io('http://localhost:3005', {
    transports: ['websocket'],
    forceNew: true
});

socket.on('connect', () => {
    socket.emit('DUEL_START', {
        room_id: 'ROOM_TWO_TRIBUTE',
        opponent_name: 'NPC Yugi Muto',
        player_name: 'Tester',
        first_player: 'player1'
    });
});

let setupDone = false;

socket.on('DUEL_STATE_UPDATE', (state) => {
    if (state.turnPlayer === 'Tester' && !setupDone) {
        setupDone = true;
        console.log('[TEST] Setting up board with 2 monsters on field (slots 0 and 1)...');
        socket.emit('TEST_SETUP_DUEL_STATE', {
            room_id: 'ROOM_TWO_TRIBUTE',
            patch: {
                normalSummonUsed: false,
                player1: {
                    monsters: [
                        { card_id: 91152256, position: 'ATK', faceDown: false, card_data: { id: 91152256, name: 'Celtic Guardian', level: 4, atk: 1400, def: 1200 } },
                        { card_id: 78193831, position: 'ATK', faceDown: false, card_data: { id: 78193831, name: 'Feral Imp', level: 4, atk: 1300, def: 1400 } },
                        null, null, null
                    ],
                    hand: [
                        { id: 89631139, card_id: 89631139, name: 'Blue-Eyes White Dragon', level: 8, type: 'Normal Monster', atk: 3000, def: 2500 }
                    ]
                }
            }
        });

        setTimeout(() => {
            console.log('[TEST] Emitting OCG_TRIBUTE_RESPONSE for Blue-Eyes (Nv 8) tributing slots 0 and 1...');
            socket.emit('OCG_TRIBUTE_RESPONSE', {
                room_id: 'ROOM_TWO_TRIBUTE',
                card_id: 89631139,
                target_slot: 0,
                tribute_slots: [0, 1],
                position: 'ATK'
            });
        }, 400);
        return;
    }

    if (state.player1.monsters[0] && state.player1.monsters[0].card_id === 89631139) {
        console.log('🎉 [TEST SUCCESS] ¡Invocación por 2 Sacrificios (Blue-Eyes) completada con éxito!');
        console.log('Monstruo en campo slot 0:', state.player1.monsters[0].card_data.name);
        console.log('Slot 1 debe estar vacío:', state.player1.monsters[1] === null);
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
