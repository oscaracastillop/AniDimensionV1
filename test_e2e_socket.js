const { io } = require('socket.io-client');

async function runE2ETest() {
    console.log('--- STARTING E2E DUEL INTEGRATION TEST ---');
    const socket = io('http://localhost:3006', {
        transports: ['websocket'],
        reconnection: false
    });

    const roomId = 'TEST_E2E_' + Date.now();
    const mockUser = {
        id: 9999,
        username: 'TestDuelist',
        avatar: '/assets/images/avatars/default.png',
        deck: [
            44519536, 44519536, 44519536, // Celtic Guardian
            89631139, 89631139, 89631139, // Blue-Eyes
            46986414, 46986414, 46986414, // Dark Magician
            55144522, 55144522, 55144522, // Pot of Greed
            83764718, 83764718, 83764718, // Monster Reborn
            6368038,  6368038,  6368038,  // Mirror Force
            70781052, 70781052, 70781052, // Summoned Skull
            11901678, 11901678, 11901678  // Sangan
        ]
    };

    let receivedInitialUpdate = false;
    let receivedPrompt = false;

    await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Connection or duel start timeout after 15s'));
        }, 15000);

        socket.on('connect', () => {
            console.log('✅ Socket connected to backend: socket.id =', socket.id);
            
            // Join duel room
            socket.emit('DUEL_JOIN_ROOM', { roomId, user: mockUser });

            // Start NPC duel
            setTimeout(() => {
                console.log('Sending DUEL_START (NPC)...');
                socket.emit('DUEL_START', {
                    roomId,
                    user: mockUser,
                    isNpc: true,
                    npcDeck: mockUser.deck
                });
            }, 600);
        });

        socket.on('DUEL_STATE_UPDATE', (state) => {
            console.log('📦 Received DUEL_STATE_UPDATE:', {
                turn: state.turn,
                phase: state.phase,
                p0Lp: state.players?.[0]?.lp,
                p1Lp: state.players?.[1]?.lp,
                p0HandCount: state.players?.[0]?.hand?.length,
                p1HandCount: state.players?.[1]?.hand?.length
            });
            receivedInitialUpdate = true;
        });

        socket.on('DUEL_PROMPT', (prompt) => {
            console.log('⚡ Received DUEL_PROMPT:', {
                type: prompt.type,
                player: prompt.player,
                canSummonCount: prompt.summonableCards?.length,
                canAttackCount: prompt.attackableCards?.length,
                canBp: prompt.canBp,
                canEp: prompt.canEp
            });
            receivedPrompt = true;

            // If we have an Idle prompt, test summoning Celtic Guardian!
            if (prompt.type === 'YGOProMsgSelectIdleCmd' && prompt.summonableCards && prompt.summonableCards.length > 0) {
                const targetCard = prompt.summonableCards[0];
                console.log('🎯 Dispatching test summon of card:', targetCard.name || targetCard.code);
                
                socket.emit('DUEL_ACTION', {
                    roomId,
                    action: 'SUMMON',
                    cardId: targetCard.code,
                    index: targetCard.sequence !== undefined ? targetCard.sequence : 0,
                    slotIndex: 0,
                    position: 'ATK'
                });
            } else if (prompt.type === 'YGOProMsgSelectChain') {
                console.log('⛓ Chain prompt received, passing chain priority...');
                socket.emit('DUEL_ACTION', {
                    roomId,
                    action: 'PASS_CHAIN'
                });
            }
        });

        socket.on('DUEL_ACTION_RESULT', (result) => {
            console.log('✨ DUEL_ACTION_RESULT received:', result);
            if (result.success) {
                console.log('🎉 Action executed successfully via microservice!');
                clearTimeout(timeout);
                resolve();
            }
        });

        socket.on('DUEL_ERROR', (err) => {
            console.error('❌ DUEL_ERROR received:', err);
        });
    });

    console.log('✅ End-to-End Test finished successfully!');
    socket.disconnect();
    process.exit(0);
}

runE2ETest().catch(err => {
    console.error('❌ E2E Test Failed:', err);
    process.exit(1);
});
