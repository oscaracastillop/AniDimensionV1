/**
 * Ani-Dimension: WebSockets Handler para Duelos OCG, Chat y Matchmaking
 */
const { getPool, sql } = require('../config/db');
const { fetchCardData } = require('../data/cards.data');
const {
    duelRooms,
    roomChainTimers,
    roomChainCallbacks,
    getIo,
    emitDuelLog,
    createInitialDuelState,
    sendCardToGraveyard,
    sendCardToBanished,
    enrichDuelStateForBroadcast
} = require('../engine/duel-state');

const {
    resolveActiveChain,
    promptChainWindow,
    setNpcTurnExecutor
} = require('../engine/ocg-engine');

const {
    executeNpcTurn,
    finalizeTurnHandoffToRival,
    isNpcOpponent
} = require('../engine/npc-ai');

const {
    handleDuelAction
} = require('../engine/duel-actions');

// Conectar ejecutor de turnos de IA en el motor OCG
setNpcTurnExecutor(executeNpcTurn);

let isChatMuted = false;

function initDuelSockets(io) {
    io.on('connection', (socket) => {
        socket.user = { id: 0, username: 'Invitado', isAdmin: false, sleeve: 'default_sleeve' };

        // 1. Identificación del usuario en socket
        socket.on('USER_IDENTIFY', async (data) => {
            if (!data || !data.username) return;
            socket.user.username = data.username.trim();
            try {
                const pool = await getPool();
                if (pool) {
                    const userQuery = await pool.request()
                        .input('Username', sql.VarChar(50), data.username.trim())
                        .query('SELECT Id, Username, IsAdmin, FundaActivaId FROM dbo.Usuarios WHERE Username = @Username');

                    if (userQuery && userQuery.recordset.length > 0) {
                        const dbUser = userQuery.recordset[0];
                        socket.user = {
                            id: dbUser.Id,
                            username: dbUser.Username,
                            isAdmin: Boolean(dbUser.IsAdmin) || dbUser.Username.toLowerCase() === 'admin',
                            sleeve: dbUser.FundaActivaId || 'default_sleeve'
                        };
                    }
                }
            } catch (err) {
                console.error('[WEBSOCKET AUTH ERROR]', err.message);
            }
        });

        // 2. Inicio de Duelo Reglamentario (NPC o PvP)
        socket.on('DUEL_START', async (data) => {
            const roomId = (data && data.room_id) || 'ROOM_DEMO';
            const opponentName = (data && data.opponent_name) || 'NPC Principiante (Nv. 1)';
            const playerName = (data && data.player_name) || socket.user.username || 'Admin';
            if (playerName) socket.user.username = playerName;
            const firstPlayerChoice = (data && data.first_player) ? data.first_player : 'player1';
            const customPlayerDeck = (data && data.player_deck) ? data.player_deck : null;

            const duelState = createInitialDuelState(roomId, playerName, opponentName, socket.user.sleeve, firstPlayerChoice, customPlayerDeck);
            
            duelRooms.set(roomId, duelState);
            socket.join(roomId);

            console.log(`[CAMPO REGLAMENTARIO] Duelo iniciado en sala: ${roomId} (Mazo de 40 cartas y casillas dinámicas)`);
            enrichDuelStateForBroadcast(duelState);
            io.to(roomId).emit('DUEL_STATE_UPDATE', duelState);
            socket.emit('DUEL_STATE_UPDATE', duelState);

            // Si el rival (NPC) inicia de primeras en el Turno 1, activar su IA automáticamente
            if (isNpcOpponent(duelState.player2) && duelState.turnPlayer === duelState.player2.username) {
                console.log(`[NPC AI] Turno 1 asignado al NPC (${duelState.turnPlayer}). Programando turno de IA en 1400ms...`);
                setTimeout(() => {
                    executeNpcTurn(roomId);
                }, 1400);
            }
        });

        // 3. Manejo Central de Acciones de Duelo
        socket.on('DUEL_ACTION', async (data) => {
            await handleDuelAction(socket, data);
        });

        // 4. Respuestas del motor de Cadenas OCG
        socket.on('OCG_CHAIN_RESPONSE', async (data) => {
            if (!data) return;
            const roomId = data.room_id || 'ROOM_DEMO';
            const duelState = duelRooms.get(roomId);
            if (!duelState || duelState.isGameOver) return;

            if (roomChainTimers.has(roomId)) {
                clearTimeout(roomChainTimers.get(roomId));
                roomChainTimers.delete(roomId);
            }

            const chainPlayer = (socket.user && socket.user.username && socket.user.username !== 'Invitado') ? socket.user.username : duelState.player1.username;

            if (data.action === 'CHAIN' && data.card_id) {
                const cardData = await fetchCardData(data.card_id);
                const nextLink = duelState.activeChain.length + 1;

                // Si la carta encadenada estaba en el campo, revelarla boca arriba
                if (data.slot_index !== undefined && data.slot_index >= 0 && duelState.player1.spells[data.slot_index]) {
                    duelState.player1.spells[data.slot_index].faceDown = false;
                    duelState.player1.spells[data.slot_index].position = 'ACT';
                }

                duelState.activeChain.push({
                    chainLink: nextLink,
                    player: chainPlayer,
                    card_id: data.card_id,
                    card_data: cardData,
                    slot_index: data.slot_index,
                    target_data: data.target_data || null,
                    from_hand: data.from_hand || (data.card_id === 40640057)
                });

                emitDuelLog(roomId, `⛓️ [Cadena Eslabón ${nextLink}] ¡${chainPlayer} encadena "${cardData.name}"!`, 'chain');
                io.to(roomId).emit('DUEL_STATE_UPDATE', duelState);

                // Consultar al rival si encadena
                const rivalName = chainPlayer === duelState.player1.username ? duelState.player2.username : duelState.player1.username;
                promptChainWindow(roomId, `${chainPlayer} encadenó ${cardData.name}`, cardData, rivalName);
            } else {
                emitDuelLog(roomId, `✋ ${chainPlayer} pasa su prioridad de respuesta.`, 'chain');
                resolveActiveChain(roomId);
            }
        });

        // 5. Respuesta de Selección de Tributos OCG
        socket.on('OCG_TRIBUTE_RESPONSE', async (data) => {
            if (!data || !data.card_id) return;
            const roomId = data.room_id || 'ROOM_DEMO';
            const cardId = parseInt(data.card_id, 10);
            const tributeSlots = data.tribute_slots || [];
            const targetSlot = data.target_slot !== undefined ? data.target_slot : 0;
            const position = data.position || 'ATK';

            await handleDuelAction(socket, {
                room_id: roomId,
                action_type: position === 'DEF' ? 'SET' : 'SUMMON',
                card_id: cardId,
                slot_index: targetSlot,
                tribute_slots: tributeSlots,
                position: position
            });
        });

        // 6. Descarte por límite de mano (End Phase > 6 cartas)
        socket.on('OCG_HAND_DISCARD_RESPONSE', async (data) => {
            if (!data || !Array.isArray(data.discard_indices)) return;
            const roomId = data.room_id || 'ROOM_DEMO';
            const duelState = duelRooms.get(roomId);
            if (!duelState || duelState.turnPlayer !== duelState.player1.username) return;

            const p1 = duelState.player1;
            const sortedIndices = [...new Set(data.discard_indices)].sort((a, b) => b - a);
            sortedIndices.forEach(idx => {
                if (idx >= 0 && idx < p1.hand.length) {
                    const disc = p1.hand.splice(idx, 1)[0];
                    sendCardToGraveyard(duelState, disc, 'player1');
                }
            });

            emitDuelLog(roomId, `📦 [Regla de Mano] ${p1.username} descartó ${sortedIndices.length} carta(s) al Cementerio por límite de 6 cartas.`, 'phase');
            enrichDuelStateForBroadcast(duelState);
            io.to(roomId).emit('DUEL_STATE_UPDATE', duelState);

            finalizeTurnHandoffToRival(roomId);
        });

        // 7. Activación directa de cartas
        socket.on('OCG_ACTIVATE_CARD', async (data) => {
            if (!data || !data.card_id) return;
            data.action_type = 'ACTIVATE';
            await handleDuelAction(socket, data);
        });

        // 8. Alias de acciones de cliente
        socket.on('CMD_ACTION', async (data) => handleDuelAction(socket, data));
        socket.on('CLIENT_SUMMON', async (data) => { if (!data) data = {}; data.action_type = 'SUMMON'; await handleDuelAction(socket, data); });
        socket.on('CLIENT_SET', async (data) => { if (!data) data = {}; data.action_type = 'SET'; await handleDuelAction(socket, data); });
        socket.on('CLIENT_ATTACK', async (data) => { if (!data) data = {}; data.action_type = 'CLIENT_ATTACK'; await handleDuelAction(socket, data); });
        socket.on('SURRENDER', async (data) => { if (!data) data = {}; data.action_type = 'SURRENDER'; await handleDuelAction(socket, data); });

        // 9. Configuración de prueba de estados de duelo (QA / debug)
        socket.on('TEST_SETUP_DUEL_STATE', (data) => {
            if (!data || !data.room_id) return;
            const duel = duelRooms.get(data.room_id);
            if (!duel) return;
            if (data.patch) {
                if (data.patch.normalSummonUsed !== undefined) duel.normalSummonUsed = data.patch.normalSummonUsed;
                if (data.patch.turnNumber !== undefined) duel.turnNumber = data.patch.turnNumber;
                if (data.patch.turnPlayer !== undefined) duel.turnPlayer = data.patch.turnPlayer;
                if (data.patch.phase !== undefined) duel.phase = data.patch.phase;
                if (data.patch.pendingAction !== undefined) duel.pendingAction = data.patch.pendingAction;
                if (data.patch.player1) {
                    if (data.patch.player1.monsters) duel.player1.monsters = data.patch.player1.monsters;
                    if (data.patch.player1.spells) duel.player1.spells = data.patch.player1.spells;
                    if (data.patch.player1.hand) duel.player1.hand = data.patch.player1.hand;
                    if (data.patch.player1.lp !== undefined) duel.player1.lp = data.patch.player1.lp;
                }
                if (data.patch.player2) {
                    if (data.patch.player2.monsters) duel.player2.monsters = data.patch.player2.monsters;
                    if (data.patch.player2.spells) duel.player2.spells = data.patch.player2.spells;
                    if (data.patch.player2.hand) duel.player2.hand = data.patch.player2.hand;
                    if (data.patch.player2.lp !== undefined) duel.player2.lp = data.patch.player2.lp;
                }
            }
            enrichDuelStateForBroadcast(duel);
            io.to(data.room_id).emit('DUEL_STATE_UPDATE', duel);
        });

        // 10. Chat en tiempo real
        socket.on('CHAT_MESSAGE', async (data) => {
            const text = (data && data.message ? data.message : '').trim();
            if (!text) return;

            if (socket.user.isAdmin && text.startsWith('/')) {
                if (text === '/mutechat') {
                    isChatMuted = true;
                    return io.emit('CHAT_MUTED_CHANGE', { isMuted: true, by: socket.user.username });
                } else if (text === '/unmutechat') {
                    isChatMuted = false;
                    return io.emit('CHAT_MUTED_CHANGE', { isMuted: false, by: socket.user.username });
                }
            }

            if (isChatMuted && !socket.user.isAdmin) {
                return socket.emit('CHAT_REJECTED', { message: 'Chat silenciado por el Administrador.' });
            }

            const formattedMessage = {
                username: socket.user.username,
                mensaje: text,
                text_color: socket.user.isAdmin ? '#FFD700' : '#FFFFFF',
                name_color: socket.user.isAdmin ? '#FFD700' : '#00F0FF',
                is_admin: socket.user.isAdmin,
                timestamp: Date.now()
            };

            io.emit('CHAT_BROADCAST', formattedMessage);
        });
    });
}

module.exports = {
    initDuelSockets
};
