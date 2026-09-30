const io = require('socket.io-client');

const socket = io('http://localhost:3005', {
    transports: ['websocket'],
    forceNew: true
});

socket.on('connect', () => {
    socket.emit('DUEL_START', {
        room_id: 'ROOM_CHAIN_TEST',
        opponent_name: 'NPC Yugi Muto',
        player_name: 'Tester',
        first_player: 'player1'
    });
});

let chainPromptReceived = false;

socket.on('DUEL_STATE_UPDATE', (state) => {
    if (state.turnPlayer === 'Tester' && !chainPromptReceived) {
        console.log('[TEST] Setting up battle state with NPC attacking and Player having Mirror Force...');
        socket.emit('TEST_SETUP_DUEL_STATE', {
            room_id: 'ROOM_CHAIN_TEST',
            patch: {
                turnPlayer: 'NPC Yugi Muto',
                phase: 'BATTLE',
                player1: {
                    spells: [
                        { card_id: 44095762, position: 'SET', faceDown: true, card_data: { id: 44095762, name: 'Mirror Force', type: 'Normal Trap' } },
                        null, null, null, null
                    ],
                    monsters: [null, null, null, null, null]
                },
                player2: {
                    monsters: [
                        { card_id: 91152256, position: 'ATK', faceDown: false, card_data: { id: 91152256, name: 'Celtic Guardian', level: 4, atk: 1400, def: 1200 } },
                        null, null, null, null
                    ]
                }
            }
        });

        setTimeout(() => {
            // Emular declaración de ataque del NPC
            console.log('[TEST] Emulating attack declaration prompt...');
            socket.emit('TEST_SETUP_DUEL_STATE', {
                room_id: 'ROOM_CHAIN_TEST',
                patch: {
                    pendingAction: {
                        type: 'ATTACK',
                        attackerSlot: 0,
                        targetSlot: -1,
                        isNpcAttack: true,
                        attackerAtk: 1400,
                        kuribohProtected: false,
                        negated: false
                    }
                }
            });
        }, 500);
    }
});

socket.on('OCG_PROMPT_CHAIN', (data) => {
    console.log('⚡ [TEST] OCG_PROMPT_CHAIN recibido con éxito:', data.message);
    console.log('Cartas permitidas para encadenar:', data.allowed_cards);
    chainPromptReceived = true;

    // Responder encadenando Mirror Force (slot 0)
    console.log('[TEST] Respondiendo a la cadena con Mirror Force...');
    socket.emit('OCG_CHAIN_RESPONSE', {
        room_id: 'ROOM_CHAIN_TEST',
        action: 'CHAIN',
        card_id: 44095762,
        slot_index: 0,
        from_hand: false
    });
});

socket.on('DUEL_LOG', (log) => {
    if (log && log.message && (log.message.includes('Fuerza de Espejo') || log.message.includes('pulveriza') || log.message.includes('RESOLVIENDO CADENA'))) {
        console.log('📜 [DUEL_LOG]:', log.message);
    }
});

setTimeout(() => {
    console.log('🏁 Test completed.');
    socket.disconnect();
    process.exit(0);
}, 5000);
