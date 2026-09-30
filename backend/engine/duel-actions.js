/**
 * Ani-Dimension: Controlador de Acciones de Duelo (Invocaciones, Fases, Batalla)
 */
const {
    duelRooms,
    getIo,
    emitDuelLog,
    createInitialDuelState,
    sendCardToGraveyard,
    sendCardToBanished,
    calculateMonsterCurrentStats,
    enrichDuelStateForBroadcast,
    checkDuelGameOver,
    checkTributesNeeded
} = require('./duel-state');

const { fetchCardData } = require('../data/cards.data');
const { ocgCardReader } = require('../data/sql-card-reader');

const {
    executeCardEffect,
    promptChainWindow,
    proceedWithAttackExecution
} = require('./ocg-engine');
const { ocgLuaRunner } = require('../ocgcore/lua-runner');

const {
    executeNpcTurn,
    finalizeTurnHandoffToRival
} = require('./npc-ai');

const OFFICIAL_PHASES = ['DRAW', 'STANDBY', 'MAIN_1', 'BATTLE', 'MAIN_2', 'END'];

async function handleDuelAction(socket, data) {
        if (!data) return;

        const roomId = data.room_id || 'ROOM_DEMO';
        const actionType = data.action_type || 'SUMMON';
        let slotIndex = data.slot_index !== undefined ? parseInt(data.slot_index, 10) : 0;
        const cardId = data.card_id ? parseInt(data.card_id, 10) : 89631139;
        const targetPosition = data.position || 'ATK';

        let duelState = duelRooms.get(roomId);
        if (!duelState) {
            duelState = createInitialDuelState(roomId, socket.user.username, 'NPC Yugi Muto', socket.user.sleeve);
            duelRooms.set(roomId, duelState);
        }

        const p1 = duelState.player1;
        const p2 = duelState.player2;
        const zoneType = data.zone_type || (data.slot_type === 'SPELL' ? 'P_S' : 'P_M');

        // =====================================================================
        // 1. INVOCACIÓN NORMAL DE MONSTRUO (SUMMON) CON SISTEMA DE TRIBUTOS OCG
        // =====================================================================
        if (actionType === 'SUMMON') {
            if (duelState.turnPlayer !== p1.username) {
                return socket.emit('ACTION_ERROR', { message: '⚠️ [Regla Oficial] No es tu turno. Espera a que el oponente finalice su turno.' });
            }
            if (duelState.phase !== 'MAIN_1' && duelState.phase !== 'MAIN_2') {
                return socket.emit('ACTION_ERROR', { 
                    message: `⚠️ [Regla Oficial] Solo puedes realizar Invocaciones Normales durante la Main Phase 1 o 2 (Fase actual: ${duelState.phase}).` 
                });
            }
            if (duelState.normalSummonUsed) {
                return socket.emit('ACTION_ERROR', { 
                    message: '⚠️ [Regla Oficial] Ya has realizado tu Invocación Normal / Colocación de este turno (límite 1 por turno).' 
                });
            }

            const cardData = ocgCardReader(cardId) || await fetchCardData(cardId);
            const isMonster = cardData.type && cardData.type.includes('Monster');

            if (!isMonster) {
                return socket.emit('ACTION_ERROR', { 
                    message: '⚠️ [Regla Oficial] Las cartas Mágicas y de Trampa no pueden invocarse como Monstruos. Debes colocarlas en la Zona de Magias/Trampas.' 
                });
            }

            if (zoneType === 'P_S') {
                return socket.emit('ACTION_ERROR', { 
                    message: '⚠️ [Regla Oficial] Los monstruos solo pueden invocarse en la Zona de Monstruos (Fila Central).' 
                });
            }

            if (slotIndex < 0 || slotIndex >= 5) {
                return socket.emit('ACTION_ERROR', { message: 'Casilla de monstruo inválida (debe ser de 0 a 4).' });
            }

            // REGLAMENTO DE SACRIFICIOS (TRIBUTOS) OCG:
            const tributesNeeded = checkTributesNeeded(cardData.level || 0);

            // Si no requiere sacrificios (Nivel 1-4), la casilla debe estar vacía directamente
            if (tributesNeeded === 0 && p1.monsters[slotIndex] !== null) {
                return socket.emit('ACTION_ERROR', { message: `La casilla de monstruo #${slotIndex + 1} ya está ocupada.` });
            }
            const monstersOnField = p1.monsters.map((m, idx) => m !== null ? idx : null).filter(idx => idx !== null);

            if (monstersOnField.length < tributesNeeded) {
                return socket.emit('ACTION_ERROR', {
                    message: `⚠️ [Regla Oficial Konami] ${cardData.name} es Nivel ${cardData.level} y requiere ${tributesNeeded} sacrificio(s) en el campo. Actualmente controlas ${monstersOnField.length}.`
                });
            }

            // Si requiere tributos y aún no se especificaron: Consultar "A la Inversa" al cliente
            if (tributesNeeded > 0 && (!data.tribute_slots || data.tribute_slots.length < tributesNeeded)) {
                console.log(`[OCG TRIBUTE PROMPT] Solicitando selección de ${tributesNeeded} sacrificio(s) al cliente...`);
                return socket.emit('OCG_PROMPT_TRIBUTE', {
                    card_id: cardId,
                    card_name: cardData.name,
                    level: cardData.level,
                    required_count: tributesNeeded,
                    target_slot: slotIndex,
                    position: targetPosition,
                    available_slots: monstersOnField
                });
            }

            // Si se suministraron tributos, validarlos estrictamente y enviarlos al Cementerio
            if (tributesNeeded > 0) {
                const validTributes = (data.tribute_slots || []).filter(tSlot => tSlot >= 0 && tSlot < 5 && p1.monsters[tSlot] !== null);
                if (validTributes.length < tributesNeeded) {
                    return socket.emit('ACTION_ERROR', {
                        message: `⚠️ [Regla Oficial] ${cardData.name} requiere ${tributesNeeded} sacrificio(s). No puedes seleccionar casillas vacías; debes tributar monstruos reales que controles en tu campo.`
                    });
                }

                validTributes.slice(0, tributesNeeded).forEach(tSlot => {
                    const sacrificedMonster = p1.monsters[tSlot];
                    sendCardToGraveyard(duelState, sacrificedMonster, 'player1');
                    p1.monsters[tSlot] = null;
                });
                // Si la casilla elegida sigue ocupada tras el sacrificio, ubicar en la primera casilla recién sacrificada
                if (p1.monsters[slotIndex] !== null) {
                    slotIndex = validTributes[0];
                }
                emitDuelLog(roomId, `⭐ [Invocación por Sacrificio] ${p1.username} tributó ${tributesNeeded} monstruo(s) en su campo para invocar a ${cardData.name}!`, 'tribute');
            } else {
                emitDuelLog(roomId, `⚔️ [Invocación Normal] ${p1.username} invoca a ${cardData.name} en Modo Ataque en casilla #${slotIndex + 1}.`, 'summon');
            }

            p1.monsters[slotIndex] = {
                card_id: cardId,
                position: targetPosition || 'ATK',
                faceDown: (targetPosition === 'DEF'),
                hasAttacked: false,
                turnSummoned: duelState.turnNumber,
                hasChangedPosition: false,
                originalOwner: 'player1',
                card_data: { ...cardData, originalOwner: 'player1' }
            };
            duelState.normalSummonUsed = true;

            // Quitar de la mano
            const hIdx = p1.hand.findIndex(c => (c.id || c.card_id) === cardId);
            if (hIdx !== -1) p1.hand.splice(hIdx, 1);

            // Ventana de interrupción al oponente
            promptChainWindow(roomId, `${p1.username} invocó a ${cardData.name}`, cardData, p2.username);
        }

        // =====================================================================
        // 2. COLOCAR EN DEFENSA O MAGIA/TRAMPA BOCA ABAJO (SET / DEF_SUMMON)
        // =====================================================================
        else if (actionType === 'SET' || actionType === 'DEF_SUMMON') {
            if (duelState.turnPlayer !== p1.username) {
                return socket.emit('ACTION_ERROR', { message: '⚠️ [Regla Oficial] No es tu turno. Espera a que el oponente finalice su turno.' });
            }
            if (duelState.phase !== 'MAIN_1' && duelState.phase !== 'MAIN_2') {
                return socket.emit('ACTION_ERROR', { 
                    message: `⚠️ [Regla Oficial] Solo puedes colocar cartas durante la Main Phase 1 o 2 (Fase actual: ${duelState.phase}).` 
                });
            }
            const cardData = ocgCardReader(cardId) || await fetchCardData(cardId);
            const isMonster = cardData.type && cardData.type.includes('Monster');

            if (isMonster) {
                if (zoneType === 'P_S') {
                    return socket.emit('ACTION_ERROR', { 
                        message: '⚠️ [Regla Oficial] Los monstruos no pueden colocarse en la Zona de Magias/Trampas.' 
                    });
                }
                if (slotIndex < 0 || slotIndex >= 5) return socket.emit('ACTION_ERROR', { message: 'Casilla de monstruo inválida.' });

                // Regla de tributos en colocación
                const tributesNeeded = checkTributesNeeded(cardData.level || 0);

                if (tributesNeeded === 0 && p1.monsters[slotIndex] !== null) {
                    return socket.emit('ACTION_ERROR', { message: `Casilla de monstruo #${slotIndex + 1} ocupada.` });
                }

                const monstersOnField = p1.monsters.map((m, idx) => m !== null ? idx : null).filter(idx => idx !== null);

                if (monstersOnField.length < tributesNeeded) {
                    return socket.emit('ACTION_ERROR', {
                        message: `⚠️ [Regla Oficial Konami] ${cardData.name} (Nv. ${cardData.level}) requiere ${tributesNeeded} sacrificio(s) en el campo para ser colocado. Actualmente controlas ${monstersOnField.length}.`
                    });
                }

                if (tributesNeeded > 0 && (!data.tribute_slots || data.tribute_slots.length < tributesNeeded)) {
                    return socket.emit('OCG_PROMPT_TRIBUTE', {
                        card_id: cardId,
                        card_name: cardData.name,
                        level: cardData.level,
                        required_count: tributesNeeded,
                        target_slot: slotIndex,
                        position: 'DEF',
                        available_slots: monstersOnField
                    });
                }

                if (tributesNeeded > 0) {
                    const validTributes = (data.tribute_slots || []).filter(tSlot => tSlot >= 0 && tSlot < 5 && p1.monsters[tSlot] !== null);
                    if (validTributes.length < tributesNeeded) {
                        return socket.emit('ACTION_ERROR', {
                            message: `⚠️ [Regla Oficial] ${cardData.name} requiere ${tributesNeeded} sacrificio(s). Debes seleccionar monstruos reales que controles en tu campo.`
                        });
                    }
                    validTributes.slice(0, tributesNeeded).forEach(tSlot => {
                        const sacrificedMonster = p1.monsters[tSlot];
                        sendCardToGraveyard(duelState, sacrificedMonster, 'player1');
                        p1.monsters[tSlot] = null;
                    });
                    if (p1.monsters[slotIndex] !== null) {
                        slotIndex = validTributes[0];
                    }
                }

                p1.monsters[slotIndex] = {
                    card_id: cardId,
                    position: 'DEF',
                    faceDown: true,
                    hasAttacked: false,
                    turnSummoned: duelState.turnNumber,
                    hasChangedPosition: false,
                    originalOwner: 'player1',
                    card_data: { ...cardData, originalOwner: 'player1' }
                };
                emitDuelLog(roomId, `🛡️ ${p1.username} colocó un monstruo boca abajo en Posición de Defensa (DEF) en casilla #${slotIndex + 1}.`, 'set');
            } else {
                // Magia o Trampa SET
                if (zoneType === 'P_M') {
                    return socket.emit('ACTION_ERROR', { 
                        message: '⚠️ [Regla Oficial] Las cartas Mágicas y de Trampa deben colocarse en la Zona de Magias y Trampas (Fila Inferior).' 
                    });
                }
                if (slotIndex < 0 || slotIndex >= 5) return socket.emit('ACTION_ERROR', { message: 'Casilla de Magia/Trampa inválida.' });
                if (p1.spells[slotIndex] !== null) return socket.emit('ACTION_ERROR', { message: `Casilla mágica #${slotIndex + 1} ocupada.` });

                p1.spells[slotIndex] = {
                    card_id: cardId,
                    position: 'SET',
                    faceDown: true,
                    turnSet: duelState.turnNumber,
                    card_data: cardData
                };
                emitDuelLog(roomId, `🎴 ${p1.username} colocó una carta boca abajo en la Zona de Magias/Trampas #${slotIndex + 1}.`, 'set');
            }

            const hIdx = p1.hand.findIndex(c => (c.id || c.card_id) === cardId);
            if (hIdx !== -1) p1.hand.splice(hIdx, 1);
        }

        // =====================================================================
        // 3. ACTIVACIÓN DIRECTA DE MAGIA O TRAMPA (ACTIVATE / CLIENT_ACTIVATE)
        // =====================================================================
        else if (actionType === 'ACTIVATE' || actionType === 'CLIENT_ACTIVATE') {
            const cardData = ocgCardReader(cardId) || await fetchCardData(cardId);
            const isField = cardData.race === 'Field' || (cardData.type && cardData.type.includes('Field'));
            const isTrap = cardData.type && cardData.type.includes('Trap');
            const isQuickPlay = cardData.race === 'Quick-Play' || (cardData.type && cardData.type.includes('Quick-Play'));
            const isHandTrap = (cardId === 40640057 || cardId === 14558127 || cardId === 23434538);
            const isEquip = cardData.race === 'Equip' || (cardData.type && cardData.type.includes('Equip'));

            // REGLA OFICIAL OCG: Validación de compatibilidad con script Lua para cartas de equipo
            if (isEquip) {
                if (!data.target_data || data.target_data.slot_index === undefined) {
                    return socket.emit('ACTION_ERROR', {
                        message: `⚠️ [Regla Oficial] Debes seleccionar un monstruo objetivo para equipar "${cardData.name}".`
                    });
                }
                const tPlayerKey = data.target_data.target_player || 'player1';
                const tPlayer = duelState[tPlayerKey];
                const targetMonster = tPlayer && tPlayer.monsters[data.target_data.slot_index];
                if (!targetMonster) {
                    return socket.emit('ACTION_ERROR', {
                        message: '⚠️ [Regla Oficial] No hay un monstruo en la casilla seleccionada para equipar.'
                    });
                }
                if (targetMonster.faceDown) {
                    return socket.emit('ACTION_ERROR', {
                        message: '⚠️ [Regla Oficial] Las cartas de equipo solo pueden equiparse a monstruos boca arriba.'
                    });
                }
                const check = ocgLuaRunner.checkCanEquip(cardId, targetMonster.card_data || targetMonster);
                if (!check.valid) {
                    return socket.emit('ACTION_ERROR', {
                        message: `⚠️ [Regla Oficial Konami] "${cardData.name}" no es compatible con "${targetMonster.card_data ? targetMonster.card_data.name : 'Monstruo'}". El script oficial Lua de la carta prohíbe equiparla a monstruos de este tipo/atributo.`
                    });
                }
            }

            // REGLA OFICIAL OCG: Durante el turno del rival solo se permiten Trampas, Mágicas de Juego Rápido y Efectos de Mano (Hand Traps)
            if (duelState.turnPlayer !== p1.username && !isTrap && !isQuickPlay && !isHandTrap) {
                return socket.emit('ACTION_ERROR', { 
                    message: '⚠️ [Regla Oficial OCG] Solo puedes activar Cartas de Trampa, Mágicas de Juego Rápido o Efectos de Mano (Hand Traps) durante el turno del rival.' 
                });
            }

            // REGLA OFICIAL OCG: Una carta en campo que ya esté boca arriba (activa) no puede volver a activarse
            if (slotIndex !== undefined && slotIndex >= 0 && p1.spells[slotIndex]) {
                const sCard = p1.spells[slotIndex];
                if (!data.from_hand && (!sCard.faceDown && sCard.position !== 'SET')) {
                    return socket.emit('ACTION_ERROR', { 
                        message: `⚠️ [Regla Oficial OCG] "${sCard.card_data ? sCard.card_data.name : 'Esta carta'}" ya fue activada y se encuentra activa en el campo.` 
                    });
                }
                // REGLA OFICIAL OCG: Una trampa no puede activarse en el mismo turno en que fue colocada
                if (isTrap && sCard.turnSet === duelState.turnNumber && duelState.turnPlayer === p1.username) {
                    return socket.emit('ACTION_ERROR', { 
                        message: '⚠️ [Regla Oficial OCG] Las cartas de Trampa no pueden activarse en el mismo turno en que fueron colocadas.' 
                    });
                }
            }

            // REGLA OFICIAL OCG: Las trampas no se activan directamente de la mano (deben colocarse previamente)
            if (isTrap && (data.from_hand || (!p1.spells[slotIndex] && !p1.spells.some(s => s && s.card_id === cardId)))) {
                return socket.emit('ACTION_ERROR', { 
                    message: '⚠️ [Regla Oficial OCG] Las cartas de Trampa no pueden activarse directamente desde la mano. Debes colocarlas (SET) previamente en el campo.' 
                });
            }

            if (isHandTrap) {
                // Hand Trap: Descartar de la mano y abrir cadena
                const hIdx = p1.hand.findIndex(c => (c.id || c.card_id) === cardId);
                if (hIdx !== -1) p1.hand.splice(hIdx, 1);

                const nextLink = duelState.activeChain.length + 1;
                duelState.activeChain.push({
                    chainLink: nextLink,
                    player: p1.username,
                    card_id: cardId,
                    card_data: cardData,
                    from_hand: true,
                    target_data: data.target_data || null
                });

                emitDuelLog(roomId, `🛡️ [Cadena Eslabón ${nextLink}] ¡${p1.username} activa el efecto de mano de "${cardData.name}"!`, 'chain');
                if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                promptChainWindow(roomId, `${p1.username} activó efecto de mano ${cardData.name}`, cardData, p2.username);
                return;
            }

            if (isField) {
                // Colocar en casilla de Campo Mágico y abrir cadena
                p1.fieldSpell = { card_id: cardId, card_data: cardData };
                const hIdx = p1.hand.findIndex(c => (c.id || c.card_id) === cardId);
                if (hIdx !== -1) p1.hand.splice(hIdx, 1);

                duelState.activeChain.push({
                    chainLink: 1,
                    player: p1.username,
                    card_id: cardId,
                    card_data: cardData,
                    target_data: data.target_data || null
                });

                emitDuelLog(roomId, `🌌 [Cadena Eslabón 1] ${p1.username} activa el Campo Mágico "${cardData.name}"!`, 'chain');
                enrichDuelStateForBroadcast(duelState);
                if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                promptChainWindow(roomId, `${p1.username} activó Campo Mágico ${cardData.name}`, cardData, p2.username);
                return;
            }

            // Verificar si se activa desde la mano o desde el campo
            let fromField = false;
            let targetSlotUsed = slotIndex;

            const isFromHand = data.from_hand === true || data.from_hand === 'true' || 
                (p1.hand.some(c => (c.id || c.card_id) === cardId) && (!p1.spells[slotIndex] || p1.spells[slotIndex].card_id !== cardId));

            if (isFromHand) {
                // Desde la mano: colocar temporalmente en casilla libre
                targetSlotUsed = p1.spells.findIndex(s => s === null);
                if (targetSlotUsed === -1) {
                    return socket.emit('ACTION_ERROR', { message: 'No tienes casillas de Magias/Trampas libres para activar esta carta.' });
                }
                const hIdx = p1.hand.findIndex(c => (c.id || c.card_id) === cardId);
                if (hIdx !== -1) p1.hand.splice(hIdx, 1);
                
                p1.spells[targetSlotUsed] = {
                    card_id: cardId,
                    position: 'ACT',
                    faceDown: false,
                    card_data: cardData
                };
            } else {
                fromField = true;
                if (p1.spells[slotIndex]) {
                    p1.spells[slotIndex].faceDown = false;
                    p1.spells[slotIndex].position = 'ACT';
                }
            }

            // Iniciar o agregar a la Cadena Oficial
            const nextLink = duelState.activeChain.length + 1;
            duelState.activeChain.push({
                chainLink: nextLink,
                player: p1.username,
                card_id: cardId,
                card_data: cardData,
                slot_index: targetSlotUsed,
                from_hand: isFromHand,
                target_data: data.target_data || null
            });

            emitDuelLog(roomId, `⚡ [Cadena Eslabón ${nextLink}] ${p1.username} activa "${cardData.name}"!`, 'chain');
            if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);

            // Preguntar al rival si desea encadenar
            promptChainWindow(roomId, `${p1.username} activó ${cardData.name}`, cardData, p2.username);
            return;
        }

        // =====================================================================
        // 3.5 ACTIVACIÓN DE EFECTO DE MONSTRUO (MONSTER_EFFECT)
        // =====================================================================
        else if (actionType === 'MONSTER_EFFECT') {
            if (duelState.turnPlayer !== p1.username) {
                return socket.emit('ACTION_ERROR', { message: '⚠️ [Regla Oficial] Solo puedes activar efectos de ignición durante tu propio turno.' });
            }
            if (duelState.phase !== 'MAIN_1' && duelState.phase !== 'MAIN_2') {
                return socket.emit('ACTION_ERROR', { 
                    message: `⚠️ [Regla Oficial] Los efectos de monstruo de ignición solo se pueden activar durante la Main Phase 1 o 2 (Fase actual: ${duelState.phase}).` 
                });
            }
            if (slotIndex < 0 || slotIndex >= 5 || !p1.monsters[slotIndex]) {
                return socket.emit('ACTION_ERROR', { message: 'No hay un monstruo en esa casilla.' });
            }

            const monster = p1.monsters[slotIndex];
            if (monster.faceDown) {
                return socket.emit('ACTION_ERROR', { message: 'Un monstruo boca abajo no puede activar sus efectos de ignición.' });
            }
            if (monster.hasUsedEffect) {
                return socket.emit('ACTION_ERROR', { message: `⚠️ [Regla Oficial] El efecto de "${monster.card_data.name}" solo puede usarse una vez por turno.` });
            }
            if (monster.isTrapped) {
                return socket.emit('ACTION_ERROR', { message: 'Este monstruo está atrapado por un efecto continuo y no puede activar sus efectos.' });
            }

            monster.hasUsedEffect = true;

            const nextLink = duelState.activeChain.length + 1;
            duelState.activeChain.push({
                chainLink: nextLink,
                player: p1.username,
                card_id: monster.card_id,
                card_data: monster.card_data,
                slot_index: slotIndex,
                is_monster_effect: true,
                target_data: data.target_data || null
            });

            emitDuelLog(roomId, `⚡ [Cadena Eslabón ${nextLink}] ¡${p1.username} activa el efecto de "${monster.card_data.name}"!`, 'chain');
            enrichDuelStateForBroadcast(duelState);
            if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);

            promptChainWindow(roomId, `${p1.username} activó efecto de ${monster.card_data.name}`, monster.card_data, p2.username);
            return;
        }

        // =====================================================================
        // RENDICIÓN OFICIAL DEL DUELO (SURRENDER)
        // =====================================================================
        else if (actionType === 'SURRENDER') {
            emitDuelLog(roomId, `🏳️ ${p1.username} se ha rendido. Victoria por abandono concedida a ${p2.username}.`, 'battle');
            if (getIo()) getIo().to(roomId).emit('DUEL_GAME_OVER', {
                winner: p2.username,
                loser: p1.username,
                reason: 'SURRENDER'
            });
            duelRooms.delete(roomId);
            return;
        }

        // =====================================================================
        // 4. CAMBIO DE POSICIÓN DE BATALLA (CHANGE_POS)
        // =====================================================================
        else if (actionType === 'CHANGE_POS') {
            if (duelState.turnPlayer !== p1.username) {
                return socket.emit('ACTION_ERROR', { message: '⚠️ [Regla Oficial OCG] No es tu turno. Espera a que el oponente finalice su turno.' });
            }
            if (duelState.phase !== 'MAIN_1' && duelState.phase !== 'MAIN_2') {
                return socket.emit('ACTION_ERROR', { 
                    message: `⚠️ [Regla Oficial OCG] Solo puedes cambiar la posición de batalla durante la Main Phase 1 o 2 (Fase actual: ${duelState.phase}).` 
                });
            }
            if (slotIndex >= 0 && slotIndex < 5 && p1.monsters[slotIndex]) {
                const m = p1.monsters[slotIndex];
                if (m.isTrapped) {
                    return socket.emit('ACTION_ERROR', { message: '⚠️ [Regla Oficial OCG] Este monstruo está atrapado por Círculo Atador de Hechizos y no puede cambiar su posición de batalla.' });
                }
                if (m.turnSummoned === duelState.turnNumber) {
                    return socket.emit('ACTION_ERROR', { message: '⚠️ [Regla Oficial OCG] No puedes cambiar la posición de batalla de un monstruo en el mismo turno en que fue invocado o colocado.' });
                }
                if (m.hasAttacked) {
                    return socket.emit('ACTION_ERROR', { message: '⚠️ [Regla Oficial OCG] Un monstruo que declaró un ataque este turno no puede cambiar su posición de batalla.' });
                }
                if (m.hasChangedPosition) {
                    return socket.emit('ACTION_ERROR', { message: '⚠️ [Regla Oficial OCG] Cada monstruo solo puede cambiar manualmente su posición de batalla una vez por turno.' });
                }

                // Si está en Defensa Boca Abajo -> Flip Summon (Invocación por Volteo) a Ataque Boca Arriba
                if (m.position === 'DEF' && m.faceDown) {
                    m.position = 'ATK';
                    m.faceDown = false;
                    m.hasChangedPosition = true;
                    emitDuelLog(roomId, `🔄⭐ [Invocación por Volteo] ${p1.username} cambia a ${m.card_data.name} a Posición de Ataque boca arriba.`, 'position');
                    
                    // Ejecutar efecto de Volteo si aplica
                    const flipId = m.card_id || (m.card_data ? m.card_data.id : 0);
                    const isFlip = (m.card_data && m.card_data.type && typeof m.card_data.type === 'string' && m.card_data.type.includes('Flip')) || (m.card_data && (Number(m.card_data.type) & 0x200000)) || [54652250, 7089711, 9076207, 33066139].includes(flipId);
                    if (isFlip) {
                        await executeCardEffect(roomId, m.card_data, 'player1', 'player2', data.target_data || null);
                    }
                } else if (m.position === 'ATK') {
                    // Ataque Boca Arriba -> Defensa Boca Arriba (según regla oficial Konami OCG, nunca se coloca boca abajo manualmente)
                    m.position = 'DEF';
                    m.faceDown = false;
                    m.hasChangedPosition = true;
                    emitDuelLog(roomId, `🔄 ${p1.username} cambió a ${m.card_data.name} a Posición de Defensa boca arriba.`, 'position');
                } else if (m.position === 'DEF' && !m.faceDown) {
                    // Defensa Boca Arriba -> Ataque Boca Arriba
                    m.position = 'ATK';
                    m.faceDown = false;
                    m.hasChangedPosition = true;
                    emitDuelLog(roomId, `🔄 ${p1.username} cambió a ${m.card_data.name} a Posición de Ataque boca arriba.`, 'position');
                }
            }
        }

        // =====================================================================
        // 5. CAMBIO DE FASE REGLAMENTARIA & ROBO (PASS_PHASE / SET_PHASE)
        // =====================================================================
        else if (actionType === 'PASS_PHASE' || actionType === 'SET_PHASE') {
            if (duelState.turnPlayer !== p1.username) {
                return socket.emit('ACTION_ERROR', { message: 'Solo puedes cambiar de fase durante tu turno.' });
            }

            let nextPhase = data.target_phase;

            if (!nextPhase) {
                let currentIdx = OFFICIAL_PHASES.indexOf(duelState.phase);
                nextPhase = OFFICIAL_PHASES[(currentIdx + 1) % OFFICIAL_PHASES.length];
            }

            // Validar saltos hacia atrás (regla oficial: fases anteriores quedan deshabilitadas)
            const currentIdx = OFFICIAL_PHASES.indexOf(duelState.phase);
            const targetIdx = OFFICIAL_PHASES.indexOf(nextPhase);
            if (targetIdx !== -1 && targetIdx < currentIdx) {
                return socket.emit('ACTION_ERROR', { 
                    message: '⚠️ [Regla Oficial] Las fases anteriores ya concluyeron en este turno. No puedes retroceder.' 
                });
            }

            // Regla oficial Konami: El primer jugador NO puede entrar a Battle Phase ni atacar en el Turno 1
            if (nextPhase === 'BATTLE' && duelState.turnNumber === 1) {
                return socket.emit('ACTION_ERROR', { 
                    message: '⚠️ [Regla Oficial Konami] El primer jugador no puede entrar a la Battle Phase ni declarar ataques en el Turno 1.' 
                });
            }

            // Validar reglas oficiales de transición OCG / TCG
            if (duelState.phase === 'MAIN_1' && nextPhase === 'MAIN_2') {
                return socket.emit('ACTION_ERROR', { 
                    message: '⚠️ [Regla Oficial] No puedes entrar a Main Phase 2 sin haber entrado a la Battle Phase.' 
                });
            }

            if (nextPhase === 'END') {
                duelState.phase = 'END';
                emitDuelLog(roomId, `⏱️ Cambio oficial a END PHASE.`, 'phase');
                enrichDuelStateForBroadcast(duelState);
                if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);

                // Comprobación reglamentaria de límite de mano (Máx 6 cartas)
                if (p1.hand.length > 6) {
                    const excessCount = p1.hand.length - 6;
                    emitDuelLog(roomId, `📦 [Límite de Mano] ${p1.username} debe seleccionar y descartar ${excessCount} carta(s) al Cementerio.`, 'phase');
                    socket.emit('OCG_PROMPT_HAND_DISCARD', {
                        required_count: excessCount,
                        hand: p1.hand
                    });
                    // El traspaso de turno ocurrirá cuando el jugador confirme su descarte
                    return;
                }

                // Si no sobrepasa el límite, ceder turno al rival
                finalizeTurnHandoffToRival(roomId);
                return;
            } else {
                duelState.phase = nextPhase;
                emitDuelLog(roomId, `⏱️ Cambio oficial a ${duelState.phase} PHASE.`, 'phase');
                enrichDuelStateForBroadcast(duelState);
                if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
            }
        }

        // =====================================================================
        // 6. DECLARAR ATAQUE Y VENTANA DE CADENAS DE COMBATE (ATTACK)
        // =====================================================================
        else if (actionType === 'ATTACK' || actionType === 'CLIENT_ATTACK') {
            if (duelState.turnNumber === 1) {
                return socket.emit('ACTION_ERROR', {
                    message: '⚠️ [Regla Oficial Konami] No se pueden declarar ataques en el Turno 1 del duelo.'
                });
            }

            if (duelState.phase !== 'BATTLE') {
                return socket.emit('ACTION_ERROR', {
                    message: `⚠️ [Regla Oficial] No puedes atacar en la fase "${duelState.phase}". Pasa primero a la BATTLE PHASE.`
                });
            }

            if (duelState.pendingAction && duelState.pendingAction.type === 'ATTACK') {
                return socket.emit('ACTION_ERROR', { message: 'Ya hay un ataque en proceso de resolución.' });
            }

            const attackerSlot = data.attacker_slot !== undefined ? parseInt(data.attacker_slot, 10) : slotIndex;
            const attacker = p1.monsters[attackerSlot];

            if (!attacker) {
                return socket.emit('ACTION_ERROR', { message: 'No hay ningún monstruo atacante en la casilla seleccionada.' });
            }
            if (attacker.position !== 'ATK') {
                return socket.emit('ACTION_ERROR', { message: 'Un monstruo en Posición de Defensa no puede declarar ataque.' });
            }
            if (attacker.hasAttacked) {
                return socket.emit('ACTION_ERROR', { message: 'Este monstruo ya ha declarado un ataque en este turno.' });
            }
            if (attacker.isTrapped || (attacker.attachedEffects && attacker.attachedEffects.some(e => e.effect_type === 'CANNOT_ATTACK'))) {
                return socket.emit('ACTION_ERROR', { message: 'Este monstruo está inmovilizado por un efecto continuo (Círculo Atador de Hechizos) y no puede atacar.' });
            }

            const targetSlot = data.target_slot !== undefined ? parseInt(data.target_slot, 10) : -1;
            const hasMonsters = p2.monsters.some(m => m !== null);
            if (hasMonsters && targetSlot === -1) {
                return socket.emit('ACTION_ERROR', { message: 'No puedes atacar directamente mientras el rival tenga monstruos en el campo.' });
            }

            emitDuelLog(roomId, `⚔️ ${p1.username} declara un ataque con ${attacker.card_data.name}!`, 'battle');

            // Guardar acción pendiente de batalla y abrir ventana de interrupción para trampas
            duelState.pendingAction = {
                type: 'ATTACK',
                attackerSlot: attackerSlot,
                targetSlot: targetSlot
            };

            promptChainWindow(roomId, `Ataque declarado por ${attacker.card_data.name}`, attacker.card_data, p2.username);
            return;
        }

        // =====================================================================
        // 6. RENDICIÓN OFICIAL (SURRENDER)
        // =====================================================================
        else if (actionType === 'SURRENDER') {
            const isP1 = (socket.user && socket.user.username === p1.username) || true;
            const winner = isP1 ? p2.username : p1.username;
            const loser = isP1 ? p1.username : p2.username;

            emitDuelLog(roomId, `🏳️ [Rendición] ${loser} se ha rendido. Victoria concedida a ${winner}.`, 'game_over');
            if (getIo()) getIo().to(roomId).emit('DUEL_GAME_OVER', {
                winner: winner,
                loser: loser,
                reason: 'SURRENDER'
            });
            duelRooms.delete(roomId);
            return;
        }

        if (getIo()) getIo().to(roomId).emit('DUEL_STATE_UPDATE', duelState);
    }

    // =========================================================================
    // RESPUESTAS "A LA INVERSA" DEL CLIENTE (CADENAS, TRIBUTOS, OBJETIVOS)
    // =========================================================================

    

module.exports = {
    handleDuelAction
};
