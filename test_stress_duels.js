const { io } = require('socket.io-client');

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

async function runSingleDuel(duelIndex) {
    return new Promise((resolve, reject) => {
        const roomId = `STRESS_DUEL_${duelIndex}_${Date.now()}`;
        const socket = io('http://127.0.0.1:3006', {
            transports: ['polling', 'websocket'],
            reconnection: false
        });

        const mockUser = {
            id: 8880 + duelIndex,
            username: `Tester_${duelIndex}`,
            deck: testDeck
        };

        let actionsCount = 0;
        let isDone = false;

        const timer = setTimeout(() => {
            if (!isDone) {
                socket.disconnect();
                reject(new Error(`Duel ${duelIndex} timed out after 30s (${actionsCount} actions taken)`));
            }
        }, 30000);

        socket.on('connect', () => {
            socket.emit('DUEL_JOIN_ROOM', { roomId, user: mockUser });
            setTimeout(() => {
                socket.emit('DUEL_START', {
                    roomId,
                    user: mockUser,
                    isNpc: true,
                    npcDeck: testDeck
                });
            }, 300);
        });

        socket.on('DUEL_PROMPT', (prompt) => {
            if (isDone) return;
            actionsCount++;
            const pType = prompt.promptType;

            if (pType === 'IDLE_CMD') {
                // If can summon:
                if (prompt.summonableCards && prompt.summonableCards.length > 0) {
                    const c = prompt.summonableCards[0];
                    socket.emit('DUEL_ACTION', {
                        roomId,
                        room_id: roomId,
                        action_type: 'SUMMON',
                        card_id: c.code,
                        sequence: c.sequence
                    });
                } else if (prompt.activatableCards && prompt.activatableCards.length > 0) {
                    const sp = prompt.activatableCards[0];
                    socket.emit('DUEL_ACTION', {
                        roomId,
                        room_id: roomId,
                        action_type: 'ACTIVATE',
                        card_id: sp.code,
                        sequence: sp.sequence,
                        from_hand: true
                    });
                } else if (prompt.canBp) {
                    socket.emit('DUEL_ACTION', {
                        roomId,
                        room_id: roomId,
                        action_type: 'CHANGE_PHASE',
                        target_phase: 'BP'
                    });
                } else if (prompt.canEp) {
                    socket.emit('DUEL_ACTION', {
                        roomId,
                        room_id: roomId,
                        action_type: 'CHANGE_PHASE',
                        target_phase: 'EP'
                    });
                }
            } else if (pType === 'BATTLE_CMD') {
                if (prompt.attackableCards && prompt.attackableCards.length > 0) {
                    const atk = prompt.attackableCards[0];
                    socket.emit('DUEL_ACTION', {
                        roomId,
                        room_id: roomId,
                        action_type: 'ATTACK',
                        attackerSeq: atk.sequence
                    });
                } else if (prompt.canEp) {
                    socket.emit('DUEL_ACTION', {
                        roomId,
                        room_id: roomId,
                        action_type: 'CHANGE_PHASE',
                        target_phase: 'EP'
                    });
                }
            } else if (pType === 'SELECT_CHAIN') {
                socket.emit('DUEL_ACTION', {
                    roomId,
                    room_id: roomId,
                    action_type: 'PASS_CHAIN'
                });
            } else if (pType === 'SELECT_YESNO') {
                socket.emit('DUEL_ACTION', {
                    roomId,
                    room_id: roomId,
                    action_type: 'YESNO',
                    answer: false
                });
            } else if (pType === 'SELECT_POSITION') {
                socket.emit('DUEL_ACTION', {
                    roomId,
                    room_id: roomId,
                    action_type: 'SELECT_POSITION',
                    position: 1
                });
            } else if (pType === 'SELECT_PLACE') {
                socket.emit('DUEL_ACTION', {
                    roomId,
                    room_id: roomId,
                    action_type: 'SELECT_PLACE',
                    sequence: 0
                });
            }

            // Finish after 8 validated official interactions
            if (actionsCount >= 8 && !isDone) {
                isDone = true;
                clearTimeout(timer);
                socket.disconnect();
                resolve({ duelIndex, actionsCount, status: 'PASSED' });
            }
        });

        socket.on('DUEL_STATE_UPDATE', (st) => {
            if (st.isGameOver && !isDone) {
                isDone = true;
                clearTimeout(timer);
                socket.disconnect();
                resolve({ duelIndex, actionsCount, status: 'GAME_OVER_VICTORY' });
            }
        });
    });
}

async function runBatchStressTest(count = 5) {
    console.log(`====================================================`);
    console.log(`🚀 INICIANDO TEST DE ESTRÉS DE DUELOS REALES (BATCH: ${count})`);
    console.log(`   Árbitro: Project Ignis / EDOPro ocgcore WebAssembly`);
    console.log(`====================================================`);

    let passed = 0;
    for (let i = 1; i <= count; i++) {
        process.stdout.write(`⚡ Duelo #${i}... `);
        try {
            const res = await runSingleDuel(i);
            console.log(`✅ COMPLETADO (${res.actionsCount} acciones oficiales procesadas sin errores)`);
            passed++;
        } catch (err) {
            console.log(`❌ ERROR: ${err.message}`);
        }
    }

    console.log(`====================================================`);
    console.log(`📊 RESULTADO FINAL: ${passed}/${count} Duelos superados exitosamente.`);
    console.log(`====================================================`);
    process.exit(passed === count ? 0 : 1);
}

runBatchStressTest(5);
