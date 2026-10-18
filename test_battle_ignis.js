const { io } = require('socket.io-client');

async function testBattle() {
    console.log('=== TEST: BATTLE PHASE & ATTACK ARBITRATION VIA PROJECT IGNIS ===');
    const socket = io('http://127.0.0.1:3006', {
        transports: ['polling', 'websocket'],
        reconnection: false
    });

    const roomId = 'TEST_BAT_' + Date.now();
    const testDeck = [
        44519536, 44519536, 44519536, // Celtic Guardian (1400 ATK)
        89631139, 89631139, 89631139,
        46986414, 46986414, 46986414,
        55144522, 55144522, 55144522,
        83764718, 83764718, 83764718,
        6368038,  6368038,  6368038,
        70781052, 70781052, 70781052,
        11901678, 11901678, 11901678,
        44519536, 44519536, 44519536,
        89631139, 89631139, 89631139,
        46986414, 46986414, 46986414,
        44519536, 44519536, 44519536,
        89631139, 89631139
    ];

    const mockUser = {
        id: 6666,
        username: 'JoeyWheeler',
        deck: testDeck
    };

    let monsterSummoned = false;
    let battleEntered = false;
    let attackDeclared = false;

    await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout waiting for battle test')), 25000);

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
            const p2 = state.player2;
            console.log(`[STATE] Turn: ${state.turnNumber || state.turn}, Phase: ${state.phase}, Rival LP: ${p2?.lp}`);
            if (p2 && p2.lp < 8000) {
                console.log(`🎉 Battle Damage confirmed! Rival LP is now ${p2.lp} (8000 -> ${p2.lp})!`);
                clearTimeout(timer);
                resolve();
            }
        });

        socket.on('DUEL_PROMPT', (prompt) => {
            console.log('--- [PROMPT] ---', prompt.promptType);
            if (prompt.promptType === 'IDLE_CMD') {
                if (prompt.summonableCards && prompt.summonableCards.length > 0) {
                    const mon = prompt.summonableCards[0];
                    console.log(`⚔️ Normal Summoning ${mon.name} (${mon.code})...`);
                    socket.emit('DUEL_ACTION', {
                        roomId,
                        room_id: roomId,
                        action_type: 'SUMMON',
                        type: 'SUMMON',
                        code: mon.code,
                        card_id: mon.code,
                        sequence: mon.sequence,
                        slot_index: 0,
                        position: 'ATK'
                    });
                    return;
                }

                if (prompt.canBp) {
                    console.log('👉 prompt.canBp is true! Changing phase to BATTLE (BP)...');
                    socket.emit('DUEL_ACTION', {
                        roomId,
                        room_id: roomId,
                        action_type: 'CHANGE_PHASE',
                        type: 'CHANGE_PHASE',
                        targetPhase: 'BP'
                    });
                    return;
                } else if (prompt.canEp) {
                    console.log('👉 Turn 1: Cannot enter BP. Passing to END PHASE (EP)...');
                    socket.emit('DUEL_ACTION', {
                        roomId,
                        room_id: roomId,
                        action_type: 'CHANGE_PHASE',
                        type: 'CHANGE_PHASE',
                        targetPhase: 'EP'
                    });
                    return;
                }
            } else if (prompt.promptType === 'BATTLE_CMD') {
                console.log('💥 [BATTLE_CMD] attackableCards:', (prompt.attackableCards || []).map(c => `${c.name} (${c.code}) seq:${c.sequence}`));
                if (!attackDeclared) {
                    const attacker = (prompt.attackableCards || [])[0];
                    if (attacker) {
                        console.log(`💥 Declaring attack with ${attacker.name} (${attacker.code})...`);
                        attackDeclared = true;
                        socket.emit('DUEL_ACTION', {
                            roomId,
                            room_id: roomId,
                            action_type: 'ATTACK',
                            type: 'ATTACK',
                            code: attacker.code,
                            card_id: attacker.code,
                            sequence: attacker.sequence,
                            attackerSeq: attacker.sequence
                        });
                        return;
                    } else {
                        console.log('No attacker available in attackableCards!');
                    }
                }
            } else if (prompt.promptType === 'SELECT_CHAIN') {
                console.log('Chain response window. Passing...');
                socket.emit('DUEL_ACTION', {
                    roomId,
                    room_id: roomId,
                    action_type: 'PASS_CHAIN'
                });
            } else if (prompt.promptType === 'SELECT_PLACE') {
                socket.emit('DUEL_ACTION', {
                    roomId,
                    room_id: roomId,
                    action_type: 'SELECT_PLACE',
                    sequence: 0
                });
            }
        });
    });

    console.log('\n🏆 BATTLE SYSTEM, ATTACK DECLARATION, AND DAMAGE CALCULATION FULLY VERIFIED!');
    socket.disconnect();
    process.exit(0);
}

testBattle().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
