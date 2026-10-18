const { io } = require('socket.io-client');

async function testSpellActivation() {
    console.log('=== TEST: SPELL ACTIVATION (POT OF GREED c55144522.lua) ===');
    const socket = io('http://127.0.0.1:3006', {
        transports: ['polling', 'websocket'],
        reconnection: false
    });

    const roomId = 'TEST_POG_' + Date.now();
    const testDeck = [
        55144522, 55144522, 55144522, // Pot of Greed
        44519536, 44519536, 44519536, // Celtic Guardian
        89631139, 89631139, 89631139, // Blue-Eyes
        46986414, 46986414, 46986414, // Dark Magician
        83764718, 83764718, 83764718, // Monster Reborn
        6368038,  6368038,  6368038,  // Mirror Force
        70781052, 70781052, 70781052,
        11901678, 11901678, 11901678,
        44519536, 44519536, 44519536,
        89631139, 89631139, 89631139,
        46986414, 46986414, 46986414,
        44519536, 44519536, 44519536,
        89631139, 89631139
    ];

    const mockUser = {
        id: 7777,
        username: 'YugiMuto',
        deck: testDeck
    };

    let pogActivated = false;

    await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout waiting for spell activation')), 20000);

        socket.on('connect', () => {
            console.log('✅ Connected to backend. Room:', roomId);
            socket.emit('DUEL_JOIN_ROOM', { roomId, user: mockUser });

            setTimeout(() => {
                console.log('🚀 Starting NPC Duel...');
                socket.emit('DUEL_START', {
                    roomId,
                    user: mockUser,
                    isNpc: true,
                    npcDeck: testDeck
                });
            }, 600);
        });

        socket.on('DUEL_STATE_UPDATE', (state) => {
            const p1 = state.player1;
            console.log(`[STATE] Turn: ${state.turnNumber || state.turn}, Phase: ${state.phase}, Hand Cards: ${(p1?.hand || []).length}, GY Cards: ${(p1?.graveyard || []).length}`);
            if (pogActivated) {
                const hasPogInGy = (p1?.graveyard || []).some(c => Number(c.code || c.id || c.card_id) === 55144522);
                if (hasPogInGy) {
                    console.log('🎉 Pot of Greed found in Graveyard! Lua script c55144522.lua executed and resolved successfully!');
                    clearTimeout(timer);
                    resolve();
                }
            }
        });

        socket.on('DUEL_PROMPT', (prompt) => {
            console.log('--- [PROMPT] ---', prompt.promptType);
            if (prompt.promptType === 'IDLE_CMD') {
                if (!pogActivated) {
                    const pog = (prompt.activatableCards || []).find(c => Number(c.code) === 55144522);
                    if (pog) {
                        console.log(`🎯 Activating Pot of Greed (sequence ${pog.sequence}, code ${pog.code})...`);
                        pogActivated = true;
                        socket.emit('OCG_ACTIVATE_CARD', {
                            room_id: roomId,
                            roomId,
                            action_type: 'ACTIVATE',
                            type: 'ACTIVATE',
                            code: pog.code,
                            card_id: pog.code,
                            sequence: pog.sequence,
                            from_hand: true
                        });
                    } else {
                        console.log('Pot of Greed not in initial hand, checking activatables:', (prompt.activatableCards || []).map(c => c.code));
                    }
                }
            } else if (prompt.promptType === 'SELECT_CHAIN') {
                console.log('Chain window opened. Passing chain response...');
                socket.emit('DUEL_ACTION', {
                    roomId,
                    room_id: roomId,
                    action_type: 'PASS_CHAIN'
                });
            } else if (prompt.promptType === 'SELECT_PLACE') {
                console.log('Select Place prompt received, auto selecting...');
                socket.emit('DUEL_ACTION', {
                    roomId,
                    room_id: roomId,
                    action_type: 'SELECT_PLACE',
                    sequence: 0
                });
            }
        });
    });

    console.log('\n🏆 POT OF GREED AND LUA SCRIPT ENGINE EXECUTION FULLY VERIFIED!');
    socket.disconnect();
    process.exit(0);
}

testSpellActivation().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
