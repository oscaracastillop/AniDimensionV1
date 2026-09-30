const io = require('socket.io-client');

const socket = io('http://localhost:3005', {
    transports: ['websocket'],
    forceNew: true
});

socket.on('connect', () => {
    socket.emit('DUEL_START', {
        room_id: 'ROOM_ATK_CHAIN',
        opponent_name: 'NPC Yugi Muto',
        player_name: 'Tester',
        first_player: 'player1'
    });
});

let testInitiated = false;

socket.on('DUEL_STATE_UPDATE', (state) => {
    if (state.turnPlayer === 'Tester' && !testInitiated) {
        testInitiated = true;
        console.log('[TEST] Setting up Battle Phase with Player Monster and NPC with set Mirror Force...');
        socket.emit('TEST_SETUP_DUEL_STATE', {
            room_id: 'ROOM_ATK_CHAIN',
            patch: {
                turnNumber: 2,
                phase: 'BATTLE',
                player1: {
                    monsters: [
                        { card_id: 91152256, position: 'ATK', faceDown: false, hasAttacked: false, card_data: { id: 91152256, name: 'Celtic Guardian', level: 4, atk: 1400, def: 1200 } },
                        null, null, null, null
                    ]
                },
                player2: {
                    spells: [
                        { card_id: 44095762, position: 'SET', faceDown: true, card_data: { id: 44095762, name: 'Mirror Force', type: 'Normal Trap' } },
                        null, null, null, null
                    ],
                    monsters: [null, null, null, null, null]
                }
            }
        });

        setTimeout(() => {
            console.log('[TEST] Emitting CLIENT_ATTACK from slot 0 against rival (direct attack)...');
            socket.emit('CLIENT_ATTACK', {
                room_id: 'ROOM_ATK_CHAIN',
                attacker_slot: 0,
                target_slot: -1
            });
        }, 500);
    }
});

socket.on('DUEL_LOG', (log) => {
    if (log && log.message) {
        console.log('📜 [DUEL_LOG]:', log.message);
    }
});

setTimeout(() => {
    console.log('🏁 Attack chain test completed.');
    socket.disconnect();
    process.exit(0);
}, 4500);
