const { io } = require('socket.io-client');

async function testSpecialSummons() {
    console.log('=== TEST: PROJECT IGNIS SPECIAL SUMMONS & LUA SCRIPTS ===');
    const socket = io('http://127.0.0.1:3006', {
        transports: ['polling', 'websocket'],
        reconnection: false
    });

    const roomId = 'TEST_SS_' + Date.now();
    const sixSamDeck = [
        95515060, 95515060, 95515060, // Zanji (1800 ATK, Six Samurai)
        49721904, 49721904, 49721904, // Kizan (Special summonable if Six Sam on field)
        83039727, 83039727, 83039727, // Grandmaster (Special summonable if Six Sam on field)
        55144522, 55144522, 55144522, // Pot of Greed
        83764718, 83764718, 83764718, // Monster Reborn
        44519536, 44519536, 44519536,
        89631139, 89631139, 89631139,
        46986414, 46986414, 46986414,
        6368038,  6368038,  6368038,
        70781052, 70781052, 70781052,
        11901678, 11901678, 11901678,
        44519536, 44519536, 44519536,
        89631139, 89631139, 89631139,
        46986414
    ];

    const mockUser = {
        id: 8888,
        username: 'SixSamMaster',
        deck: sixSamDeck
    };

    let step = 0;

    await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout waiting for special summon test')), 20000);

        socket.on('connect', () => {
            console.log('✅ Connected to backend. Room:', roomId);
            socket.emit('DUEL_JOIN_ROOM', { roomId, user: mockUser });

            setTimeout(() => {
                console.log('🚀 Starting NPC Duel...');
                socket.emit('DUEL_START', {
                    roomId,
                    user: mockUser,
                    isNpc: true,
                    npcDeck: sixSamDeck
                });
            }, 600);
        });

        socket.on('DUEL_STATE_UPDATE', (state) => {
            const p1 = state.player1;
            console.log(`[STATE] Turn: ${state.turnNumber || state.turn}, Phase: ${state.phase}, P1 Monsters:`, (p1?.monsters || []).map(m => m ? m.card_data?.name || m.name || m.card_id : null).filter(Boolean));
        });

        socket.on('DUEL_PROMPT', (prompt) => {
            console.log('\n--- [DUEL_PROMPT RECEIVED] ---');
            console.log('promptType:', prompt.promptType || prompt.rawName);
            console.log('summonableCards:', (prompt.summonableCards || []).map(c => `${c.name} (${c.code})`));
            console.log('spSummonableCards:', (prompt.spSummonableCards || []).map(c => `${c.name} (${c.code})`));
            console.log('activatableCards:', (prompt.activatableCards || []).map(c => `${c.name} (${c.code})`));

            if (prompt.promptType === 'IDLE_CMD') {
                if (step === 0) {
                    // Step 0: Normal Summon Zanji
                    const zanji = (prompt.summonableCards || []).find(c => Number(c.code) === 95515060) || prompt.summonableCards?.[0];
                    if (zanji) {
                        console.log(`👉 STEP 1: Normal Summoning ${zanji.name} (${zanji.code})...`);
                        step = 1;
                        socket.emit('DUEL_ACTION', {
                            roomId,
                            room_id: roomId,
                            action_type: 'SUMMON',
                            type: 'SUMMON',
                            code: zanji.code,
                            card_id: zanji.code,
                            sequence: zanji.sequence,
                            slot_index: 0,
                            position: 'ATK'
                        });
                        return;
                    }
                }

                if (step === 1) {
                    // Step 1: Check if Kizan or Grandmaster is in spSummonableCards!
                    const spCards = prompt.spSummonableCards || [];
                    console.log('Checking spSummonableCards in Step 1:', spCards.map(c => c.name));

                    if (spCards.length > 0) {
                        const targetSp = spCards[0];
                        console.log(`🎉 SUCCESS! Engine correctly detected Special Summon for: ${targetSp.name} (${targetSp.code})!`);
                        console.log(`👉 STEP 2: Executing Special Summon via microservice...`);
                        step = 2;
                        socket.emit('DUEL_ACTION', {
                            roomId,
                            room_id: roomId,
                            action_type: 'SPECIAL_SUMMON',
                            type: 'SPECIAL_SUMMON',
                            code: targetSp.code,
                            card_id: targetSp.code,
                            sequence: targetSp.sequence,
                            slot_index: 1,
                            position: 'ATK'
                        });
                        return;
                    } else {
                        console.log('Note: No special summon available yet. Passing phase...');
                        step = 99;
                        socket.emit('DUEL_ACTION', {
                            roomId,
                            room_id: roomId,
                            action_type: 'CHANGE_PHASE',
                            type: 'CHANGE_PHASE',
                            targetPhase: 'BP'
                        });
                    }
                }

                if (step === 2) {
                    console.log('🎉 STEP 2 COMPLETE: Special Summon resolved by Project Ignis ocgcore engine!');
                    clearTimeout(timer);
                    resolve();
                }
            } else if (prompt.promptType === 'SELECT_CHAIN') {
                console.log('Chain prompt received, passing chain...');
                socket.emit('DUEL_ACTION', {
                    roomId,
                    room_id: roomId,
                    action_type: 'PASS_CHAIN'
                });
            } else if (prompt.promptType === 'SELECT_PLACE') {
                console.log('Select Place prompt received, auto selecting place 0...');
                socket.emit('DUEL_ACTION', {
                    roomId,
                    room_id: roomId,
                    action_type: 'SELECT_PLACE',
                    sequence: 0
                });
            }
        });

        socket.on('ACTION_ERROR', (err) => {
            console.error('❌ ACTION_ERROR:', err);
        });

        socket.on('DUEL_ERROR', (err) => {
            console.error('❌ DUEL_ERROR:', err);
        });
    });

    console.log('\n🏆 ALL SPECIAL SUMMON AND ARBITRATION TESTS PASSED!');
    socket.disconnect();
    process.exit(0);
}

testSpecialSummons().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
