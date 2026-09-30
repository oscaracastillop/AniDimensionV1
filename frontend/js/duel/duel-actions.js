/**
 * Ani-Dimension: Controlador de Acciones del Jugador (Invocaciones, Fases, Batalla)
 */
var currentUser = window.currentUser || (window.Session && window.Session.getUser()) || { id: 999, username: 'Admin' };

        function setSummonMode(mode) {
            currentSummonMode = mode;
            const btnAtk = document.getElementById('btn-mode-atk');
            const btnDef = document.getElementById('btn-mode-def');
            if (btnAtk && btnDef) {
                if (mode === 'ATK') {
                    btnAtk.style.borderColor = '#00f0ff';
                    btnAtk.style.background = 'rgba(0, 240, 255, 0.28)';
                    btnDef.style.borderColor = 'rgba(255, 215, 0, 0.35)';
                    btnDef.style.background = 'rgba(255, 215, 0, 0.12)';
                } else {
                    btnDef.style.borderColor = '#ffd700';
                    btnDef.style.background = 'rgba(255, 215, 0, 0.28)';
                    btnAtk.style.borderColor = 'rgba(0, 240, 255, 0.35)';
                    btnAtk.style.background = 'rgba(0, 240, 255, 0.12)';
                }
            }
        }

        function highlightAvailableSlots(enable, isMonsterCard) {
            if (!lastDuelState) return;
            for (let i = 0; i < 5; i++) {
                const slotM = document.getElementById(`p-m${i}`);
                if (slotM) {
                    if (enable && isMonsterCard && !lastDuelState.player1.monsters[i]) {
                        slotM.classList.add('slot-droppable');
                    } else {
                        slotM.classList.remove('slot-droppable');
                    }
                }
                const slotS = document.getElementById(`p-s${i}`);
                if (slotS) {
                    if (enable && !isMonsterCard && !lastDuelState.player1.spells[i]) {
                        slotS.classList.add('slot-droppable');
                    } else {
                        slotS.classList.remove('slot-droppable');
                    }
                }
            }
        }

        // =========================================================================
        // MENÚ CONTEXTUAL DINÁMICO DE ACCIONES
        // =========================================================================
        function showContextMenu(e, title, actions) {
            const menu = document.getElementById('context-action-menu');
            const titleElem = document.getElementById('context-menu-title');
            const btnsContainer = document.getElementById('context-menu-buttons');

            titleElem.textContent = title;
            btnsContainer.innerHTML = '';

            actions.forEach(act => {
                const btn = document.createElement('button');
                btn.className = 'context-btn';
                btn.textContent = act.label;
                btn.onclick = (event) => {
                    event.stopPropagation();
                    hideContextMenu();
                    act.onClick();
                };
                btnsContainer.appendChild(btn);
            });

            menu.style.left = `${Math.min(e.clientX + 10, window.innerWidth - 200)}px`;
            menu.style.top = `${Math.min(e.clientY - 20, window.innerHeight - 150)}px`;
            menu.style.display = 'flex';
        }

        function hideContextMenu() {
            document.getElementById('context-action-menu').style.display = 'none';
        }

        document.addEventListener('click', () => hideContextMenu());

        // =========================================================================
        // SELECCIÓN LIBRE DE MANO & MENÚ CONTEXTUAL DE ACCIÓN
        // =========================================================================
        function selectHandCard(index, cardId, event = null) {
            selectedHandCardIndex = index;
            selectedHandCardId = cardId;

            // Iluminar la carta seleccionada en la mano con contorno dorado
            document.querySelectorAll('.hand-card').forEach((c, idx) => {
                if (idx === index) c.classList.add('selected-hand');
                else c.classList.remove('selected-hand');
            });

            const cardObj = lastDuelState && lastDuelState.player1.hand ? lastDuelState.player1.hand[index] : null;
            let isMonsterCard = true;
            let isSpell = false;
            let isTrap = false;

            if (cardObj && cardObj.type) {
                isMonsterCard = cardObj.type.includes('Monster');
                isSpell = cardObj.type.includes('Spell');
                isTrap = cardObj.type.includes('Trap');
            }

            if (isSpell || isTrap) {
                currentSummonMode = 'DEF';
            }

            const myUsername = currentUser ? currentUser.username : 'Admin';
            const isMyTurn = !lastDuelState || lastDuelState.turnPlayer === myUsername;

            if (isMyTurn && (lastDuelState.phase === 'MAIN_1' || lastDuelState.phase === 'MAIN_2')) {
                highlightAvailableSlots(true, isMonsterCard);
            }
            inspectCardById(cardId);

            // Si es turno del rival o fase no válida, solo inspecciona la carta
            if (!isMyTurn) {
                showRuleAlert('⚠️ [Turno del Rival] Solo puedes inspeccionar cartas. Los controles de juego están bloqueados.');
                return;
            }

            if (lastDuelState && lastDuelState.phase !== 'MAIN_1' && lastDuelState.phase !== 'MAIN_2') {
                showRuleAlert(`⚠️ [Regla Oficial] Solo puedes realizar jugadas de invocación/colocación durante la Main Phase 1 o 2 (Fase actual: ${lastDuelState.phase}).`);
                return;
            }

            // Si hay evento de ratón, abrir menú contextual
            if (event) {
                event.stopPropagation();
                const cardName = cardObj ? cardObj.name : `Carta #${cardId}`;
                const actions = [];

                if (isMonsterCard) {
                    const level = cardObj ? (cardObj.level || 0) : 0;
                    const tributesNeeded = level >= 7 ? 2 : (level >= 5 ? 1 : 0);
                    const atkLabel = tributesNeeded === 0 
                        ? '⚔️ Invocar Normal (ATK)' 
                        : (tributesNeeded === 1 ? '⭐ Invocar por Sacrificio (1 Tributo - ATK)' : '⭐⭐ Invocar por Sacrificio (2 Tributos - ATK)');
                    const defLabel = tributesNeeded === 0 
                        ? '🛡️ Colocar en Defensa (SET)' 
                        : (tributesNeeded === 1 ? '🛡️ Colocar por Sacrificio (1 Tributo - SET)' : '🛡️ Colocar por Sacrificio (2 Tributos - SET)');

                    actions.push({
                        label: atkLabel,
                        onClick: () => {
                            setSummonMode('ATK');
                            if (tributesNeeded > 0) {
                                initiateTributeFlow(cardId, cardName, level, tributesNeeded, 'ATK');
                            } else {
                                showRuleAlert('Elige una casilla libre en la Zona de Monstruos (0..4).');
                            }
                        }
                    });
                    actions.push({
                        label: defLabel,
                        onClick: () => {
                            setSummonMode('DEF');
                            if (tributesNeeded > 0) {
                                initiateTributeFlow(cardId, cardName, level, tributesNeeded, 'DEF');
                            } else {
                                showRuleAlert('Elige una casilla libre en la Zona de Monstruos (0..4).');
                            }
                        }
                    });
                } else if (isSpell) {
                    actions.push({
                        label: '✨ Activar Efecto',
                        onClick: () => activateCardFromHand(cardId)
                    });
                    actions.push({
                        label: '🎴 Colocar Boca Abajo (SET)',
                        onClick: () => {
                            setSummonMode('DEF');
                            const emptySlot = lastDuelState && lastDuelState.player1 ? lastDuelState.player1.spells.findIndex(s => s === null) : -1;
                            if (emptySlot !== -1) {
                                socket.emit('CLIENT_SET', {
                                    room_id: 'ROOM_DEMO',
                                    card_id: cardId,
                                    slot_index: emptySlot,
                                    zone_type: 'P_S',
                                    position: 'DEF'
                                });
                                selectedHandCardIndex = -1;
                                selectedHandCardId = null;
                                highlightAvailableSlots(false, false);
                                document.querySelectorAll('.hand-card').forEach(c => c.classList.remove('selected-hand'));
                            } else {
                                showRuleAlert('⚠️ [Zona Llena] No tienes casillas libres en la Zona de Magias y Trampas.');
                            }
                        }
                    });
                } else if (isTrap) {
                    actions.push({
                        label: '🎴 Colocar Boca Abajo (SET)',
                        onClick: () => {
                            setSummonMode('DEF');
                            const emptySlot = lastDuelState && lastDuelState.player1 ? lastDuelState.player1.spells.findIndex(s => s === null) : -1;
                            if (emptySlot !== -1) {
                                socket.emit('CLIENT_SET', {
                                    room_id: 'ROOM_DEMO',
                                    card_id: cardId,
                                    slot_index: emptySlot,
                                    zone_type: 'P_S',
                                    position: 'DEF'
                                });
                                selectedHandCardIndex = -1;
                                selectedHandCardId = null;
                                highlightAvailableSlots(false, false);
                                document.querySelectorAll('.hand-card').forEach(c => c.classList.remove('selected-hand'));
                            } else {
                                showRuleAlert('⚠️ [Zona Llena] No tienes casillas libres en la Zona de Magias y Trampas.');
                            }
                        }
                    });
                }

                showContextMenu(event, cardName, actions);
            }
        }

        // =========================================================================
        // CONTROL UNIFICADO DE SELECCIÓN DE OBJETIVOS (MAGIAS, TRAMPAS Y CADENAS OCG)
        // =========================================================================
        let pendingTargetAction = null; // { mode, cardId, slotIndex, fromHand, isChain, cardName }


        function onSlotClick(zoneType, slotIndex, event = null) {
            if (event) {
                event.stopPropagation();
            }

            // GESTIÓN DE SELECCIÓN DE OBJETIVOS INTERACTIVOS (OCG OFICIAL: TRAMPAS, MAGIAS Y EFECTOS)
            if (pendingTargetAction) {
                if (pendingTargetAction.mode === 'MONSTER_OPPONENT' || pendingTargetAction.mode === 'MONSTER_PLAYER' || pendingTargetAction.mode === 'MONSTER_ANY') {
                    const isOpponentSlot = (zoneType === 'R_M');
                    const isPlayerSlot = (zoneType === 'P_M');
                    let targetPlayer = null;
                    let targetMonster = null;

                    if (isOpponentSlot && (pendingTargetAction.mode === 'MONSTER_OPPONENT' || pendingTargetAction.mode === 'MONSTER_ANY')) {
                        if (lastDuelState && lastDuelState.player2.monsters[slotIndex]) {
                            targetPlayer = 'player2';
                            targetMonster = lastDuelState.player2.monsters[slotIndex];
                        }
                    } else if (isPlayerSlot && (pendingTargetAction.mode === 'MONSTER_PLAYER' || pendingTargetAction.mode === 'MONSTER_ANY')) {
                        if (lastDuelState && lastDuelState.player1.monsters[slotIndex]) {
                            targetPlayer = 'player1';
                            targetMonster = lastDuelState.player1.monsters[slotIndex];
                        }
                    }

                    if (targetPlayer && targetMonster) {
                        const targetName = targetMonster.card_data ? targetMonster.card_data.name : `Monstruo #${slotIndex + 1}`;
                        const targetData = {
                            slot_index: slotIndex,
                            target_slot: slotIndex,
                            target_player: targetPlayer,
                            source_slot: pendingTargetAction.slotIndex
                        };

                        if (pendingTargetAction.isChain) {
                            socket.emit('OCG_CHAIN_RESPONSE', {
                                room_id: 'ROOM_DEMO',
                                action: 'CHAIN',
                                card_id: pendingTargetAction.cardId,
                                slot_index: pendingTargetAction.slotIndex,
                                from_hand: pendingTargetAction.fromHand,
                                target_data: targetData
                            });
                        } else if (pendingTargetAction.actionType === 'CHANGE_POS') {
                            socket.emit('CMD_ACTION', {
                                room_id: 'ROOM_DEMO',
                                action_type: 'CHANGE_POS',
                                slot_index: pendingTargetAction.slotIndex,
                                target_data: targetData
                            });
                        } else if (pendingTargetAction.actionType === 'MONSTER_EFFECT') {
                            socket.emit('CMD_ACTION', {
                                room_id: 'ROOM_DEMO',
                                action_type: 'MONSTER_EFFECT',
                                slot_index: pendingTargetAction.slotIndex,
                                card_id: pendingTargetAction.cardId,
                                target_data: targetData
                            });
                        } else {
                            socket.emit('OCG_ACTIVATE_CARD', {
                                room_id: 'ROOM_DEMO',
                                card_id: pendingTargetAction.cardId,
                                slot_index: pendingTargetAction.slotIndex,
                                from_hand: pendingTargetAction.fromHand,
                                target_data: targetData
                            });
                        }
                        showRuleAlert(`🎯 ¡Objetivo seleccionado: ${targetName} (${targetPlayer === 'player2' ? 'Rival' : 'Tu campo'}, casilla #${slotIndex + 1})!`);
                        cancelInteractiveTargeting();
                        return;
                    } else {
                        showRuleAlert('⚠️ [Selección de Objetivo] Selecciona un monstruo válido según el efecto de la carta.');
                        return;
                    }
                } else if (pendingTargetAction.mode === 'SPELL_TRAP') {
                    let targetPlayer = null;
                    let isField = false;
                    let targetName = 'Carta Mágica/Trampa';

                    if (zoneType === 'P_S' && lastDuelState && lastDuelState.player1.spells[slotIndex]) {
                        targetPlayer = 'player1';
                        targetName = lastDuelState.player1.spells[slotIndex].card_data ? lastDuelState.player1.spells[slotIndex].card_data.name : 'Magia/Trampa';
                    } else if (zoneType === 'R_S' && lastDuelState && lastDuelState.player2.spells[slotIndex]) {
                        targetPlayer = 'player2';
                        targetName = lastDuelState.player2.spells[slotIndex].card_data ? lastDuelState.player2.spells[slotIndex].card_data.name : 'Magia/Trampa';
                    } else if (zoneType === 'P_CAMPO' && lastDuelState && lastDuelState.player1.fieldSpell) {
                        targetPlayer = 'player1';
                        isField = true;
                        targetName = lastDuelState.player1.fieldSpell.card_data ? lastDuelState.player1.fieldSpell.card_data.name : 'Campo';
                    } else if (zoneType === 'R_CAMPO' && lastDuelState && lastDuelState.player2.fieldSpell) {
                        targetPlayer = 'player2';
                        isField = true;
                        targetName = lastDuelState.player2.fieldSpell.card_data ? lastDuelState.player2.fieldSpell.card_data.name : 'Campo';
                    }

                    if (targetPlayer) {
                        const targetData = {
                            target_player: targetPlayer,
                            target_slot: slotIndex,
                            is_field_spell: isField,
                            source_slot: pendingTargetAction.slotIndex
                        };

                        if (pendingTargetAction.isChain) {
                            socket.emit('OCG_CHAIN_RESPONSE', {
                                room_id: 'ROOM_DEMO',
                                action: 'CHAIN',
                                card_id: pendingTargetAction.cardId,
                                slot_index: pendingTargetAction.slotIndex,
                                from_hand: pendingTargetAction.fromHand,
                                target_data: targetData
                            });
                        } else if (pendingTargetAction.actionType === 'CHANGE_POS') {
                            socket.emit('CMD_ACTION', {
                                room_id: 'ROOM_DEMO',
                                action_type: 'CHANGE_POS',
                                slot_index: pendingTargetAction.slotIndex,
                                target_data: targetData
                            });
                        } else if (pendingTargetAction.actionType === 'MONSTER_EFFECT') {
                            socket.emit('CMD_ACTION', {
                                room_id: 'ROOM_DEMO',
                                action_type: 'MONSTER_EFFECT',
                                slot_index: pendingTargetAction.slotIndex,
                                card_id: pendingTargetAction.cardId,
                                target_data: targetData
                            });
                        } else {
                            socket.emit('OCG_ACTIVATE_CARD', {
                                room_id: 'ROOM_DEMO',
                                card_id: pendingTargetAction.cardId,
                                slot_index: pendingTargetAction.slotIndex,
                                from_hand: pendingTargetAction.fromHand,
                                target_data: targetData
                            });
                        }
                        showRuleAlert(`🌪️ ¡Objetivo seleccionado: ${targetName}!`);
                        cancelInteractiveTargeting();
                        return;
                    } else {
                        showRuleAlert('⚠️ [Selección de Objetivo] Selecciona una carta Mágica, Trampa o de Campo válida.');
                        return;
                    }
                }
            }

            document.querySelectorAll('.field-slot').forEach(el => el.classList.remove('slot-targeted'));

            const myUsername = currentUser ? currentUser.username : 'Admin';
            const isMyTurn = !lastDuelState || lastDuelState.turnPlayer === myUsername;

            // Si es turno del rival: el jugador puede inspeccionar o activar Trampas y Mágicas Rápidas
            if (!isMyTurn) {
                if (zoneType === 'P_M' && lastDuelState && lastDuelState.player1.monsters[slotIndex]) {
                    inspectMonsterSlot('player1', slotIndex);
                    return;
                } else if (zoneType === 'R_M' && lastDuelState && lastDuelState.player2.monsters[slotIndex]) {
                    if (!lastDuelState.player2.monsters[slotIndex].faceDown) {
                        inspectMonsterSlot('player2', slotIndex);
                    }
                    return;
                } else if (zoneType === 'P_S' && lastDuelState && lastDuelState.player1.spells[slotIndex]) {
                    const sObj = lastDuelState.player1.spells[slotIndex];
                    inspectCardById(sObj.card_id);

                    const cardData = sObj.card_data || {};
                    const isTrap = cardData.type && cardData.type.includes('Trap');
                    const isQuickPlay = cardData.race === 'Quick-Play' || (cardData.type && cardData.type.includes('Quick-Play'));
                    const isFaceDown = sObj.faceDown === true || sObj.position === 'SET';

                    // REGLA OFICIAL OCG: Las cartas de Trampa y Mágicas Rápidas colocadas boca abajo PUEDEN activarse durante el turno del rival
                    if ((isTrap || isQuickPlay) && isFaceDown) {
                        if (event) event.stopPropagation();
                        showContextMenu(event, cardData.name || 'Trampa / Mágica Rápida', [
                            {
                                label: '⚡ Activar Carta (Respuesta OCG)',
                                onClick: () => {
                                    activateCardDirectly(sObj.card_id, false, slotIndex, cardData.name || 'Carta');
                                }
                            }
                        ]);
                        return;
                    } else if (!isFaceDown) {
                        showRuleAlert(`ℹ️ [Efecto Activo] "${cardData.name || 'Esta carta'}" ya se encuentra activa en el campo.`);
                        return;
                    } else {
                        showRuleAlert('⚠️ [Regla Oficial OCG] Las cartas Mágicas normales no pueden activarse durante el turno del adversario.');
                        return;
                    }
                }
                showRuleAlert('⚠️ [Turno del Rival] Solo puedes activar Trampas o Mágicas de Juego Rápido en respuesta.');
                return;
            }

            // 0. Si estamos en Modo de Selección de Tributos
            if (pendingTributeData && zoneType === 'P_M') {
                toggleTributeSlot(slotIndex);
                return;
            }

            // 1. FLUJO DE INVOCACIÓN DINÁMICA (Mano -> Casilla Libre 0..4)
            if ((zoneType === 'P_M' || zoneType === 'P_S') && selectedHandCardId !== null) {
                if (lastDuelState && lastDuelState.phase !== 'MAIN_1' && lastDuelState.phase !== 'MAIN_2') {
                    showRuleAlert(`⚠️ [Regla Oficial] Solo puedes invocar o colocar cartas durante la Main Phase 1 o 2 (Fase actual: ${lastDuelState.phase}).`);
                    return;
                }

                let isMonsterCard = true;
                let handCard = null;
                if (lastDuelState && lastDuelState.player1.hand) {
                    handCard = lastDuelState.player1.hand.find(card => (card.id || card.card_id) === selectedHandCardId);
                    if (handCard && handCard.type) isMonsterCard = handCard.type.includes('Monster');
                }

                if (zoneType === 'P_M' && !isMonsterCard) {
                    showRuleAlert('⚠️ [Regla Oficial] Las cartas Mágicas y de Trampa deben colocarse en la Zona de Magias y Trampas (Fila Inferior).');
                    return;
                }

                if (zoneType === 'P_S' && isMonsterCard) {
                    showRuleAlert('⚠️ [Regla Oficial] Los monstruos solo pueden invocarse en la Zona de Monstruos (Fila Central).');
                    return;
                }

                // Invocación por Sacrificio (Nivel 5+):
                if (zoneType === 'P_M' && isMonsterCard && handCard) {
                    const level = handCard.level || 0;
                    const tributesNeeded = level >= 7 ? 2 : (level >= 5 ? 1 : 0);
                    if (tributesNeeded > 0) {
                        const controlledSlots = [];
                        for (let i = 0; i < 5; i++) {
                            if (lastDuelState.player1.monsters[i]) controlledSlots.push(i);
                        }

                        if (controlledSlots.length < tributesNeeded) {
                            showRuleAlert(`⚠️ [Regla Oficial Konami] "${handCard.name}" es Nivel ${level} y requiere ${tributesNeeded} sacrificio(s) en el campo. Actualmente solo controlas ${controlledSlots.length} monstruo(s).`);
                            return;
                        }

                        // Caso Fácil A: Requiere 1 solo sacrificio (Nivel 5 o 6, ej. Jinzo, Cráneo Convocado)
                        // Si el jugador hace clic sobre un monstruo en su campo, ¡se tributa directamente ese monstruo!
                        if (tributesNeeded === 1 && lastDuelState.player1.monsters[slotIndex]) {
                            const sacrificedMonster = lastDuelState.player1.monsters[slotIndex];
                            const sacrificedName = sacrificedMonster.card_data ? sacrificedMonster.card_data.name : `Monstruo #${slotIndex + 1}`;
                            showRuleAlert(`⭐ [Sacrificio Directo] Tributando a "${sacrificedName}" para invocar a "${handCard.name}"...`);

                            const actionEvent = currentSummonMode === 'DEF' ? 'CLIENT_SET' : 'CLIENT_SUMMON';
                            socket.emit(actionEvent, {
                                room_id: 'ROOM_DEMO',
                                card_id: selectedHandCardId,
                                slot_index: slotIndex,
                                tribute_slots: [slotIndex],
                                position: currentSummonMode || 'ATK'
                            });

                            selectedHandCardIndex = -1;
                            selectedHandCardId = null;
                            document.querySelectorAll('.hand-card').forEach(c => c.classList.remove('selected-hand'));
                            highlightAvailableSlots(false, true);
                            return;
                        }

                        // Caso Fácil B: Requiere 2 sacrificios (Nivel 7+, ej. Dragón Blanco, Mago Oscuro) o hizo clic en casilla vacía
                        // Abrir el modal interactivo visual con los monstruos en campo
                        const preselected = lastDuelState.player1.monsters[slotIndex] ? slotIndex : -1;
                        if (typeof openTributeModal === 'function') {
                            openTributeModal(selectedHandCardId, handCard.name || 'Monstruo', level, tributesNeeded, currentSummonMode, preselected);
                        } else if (typeof initiateTributeFlow === 'function') {
                            initiateTributeFlow(selectedHandCardId, handCard.name || 'Monstruo', level, tributesNeeded, currentSummonMode, preselected);
                        }
                        return;
                    }
                }

                const targetSlotElem = document.getElementById(zoneType === 'P_M' ? `p-m${slotIndex}` : `p-s${slotIndex}`);
                if (targetSlotElem) targetSlotElem.classList.add('slot-targeted');

                const actionEvent = (!isMonsterCard || currentSummonMode === 'DEF') ? 'CLIENT_SET' : 'CLIENT_SUMMON';
                const positionChosen = (!isMonsterCard || currentSummonMode === 'DEF') ? 'DEF' : 'ATK';

                socket.emit(actionEvent, {
                    room_id: 'ROOM_DEMO',
                    card_id: selectedHandCardId,
                    slot_index: slotIndex,
                    zone_type: zoneType,
                    position: positionChosen
                });

                selectedHandCardIndex = -1;
                selectedHandCardId = null;
                document.querySelectorAll('.hand-card').forEach(c => c.classList.remove('selected-hand'));
                highlightAvailableSlots(false, true);
                return;
            }

            // 2. SELECCIÓN DE MONSTRUO PROPIO EN CAMPO
            if (zoneType === 'P_M') {
                selectedAttackerSlot = slotIndex;
                const slotElem = document.getElementById(`p-m${slotIndex}`);
                if (slotElem) slotElem.classList.add('slot-targeted');

                const monsterObj = lastDuelState ? lastDuelState.player1.monsters[slotIndex] : null;
                if (monsterObj) {
                    inspectMonsterSlot('player1', slotIndex);

                    if (event) {
                        event.stopPropagation();
                        const actions = [];
                        const cardData = monsterObj.card_data || {};
                        const isEffectMonster = (cardData.type && cardData.type.includes('Effect'));

                        // 1. Activar Efecto de Monstruo (Regla OCG: En Main Phase 1 o 2, boca arriba)
                        if ((lastDuelState.phase === 'MAIN_1' || lastDuelState.phase === 'MAIN_2') && !monsterObj.faceDown && isEffectMonster) {
                            if (monsterObj.hasUsedEffect) {
                                actions.push({
                                    label: `⏳ Efecto Ya Usado (${cardData.name})`,
                                    onClick: () => showRuleAlert(`⚠️ [Regla Oficial] Ya has usado el efecto de "${cardData.name}" en este turno.`)
                                });
                            } else {
                                actions.push({
                                    label: `✨ Activar Efecto (${cardData.name})`,
                                    onClick: () => triggerMonsterEffect(slotIndex, monsterObj.card_id)
                                });
                            }
                        }

                        // 2. Cambiar Posición de Batalla (Reglas Oficiales Konami OCG)
                        if (lastDuelState.phase === 'MAIN_1' || lastDuelState.phase === 'MAIN_2') {
                            const isSummonedThisTurn = monsterObj.turnSummoned === lastDuelState.turnNumber;
                            const hasAttackedThisTurn = !!monsterObj.hasAttacked;
                            const hasChangedPosThisTurn = !!monsterObj.hasChangedPosition;
                            const isTrapped = !!monsterObj.isTrapped;

                            if (isTrapped) {
                                actions.push({
                                    label: '🔒 Posición Bloqueada (Atrapado)',
                                    onClick: () => showRuleAlert('⚠️ [Regla Oficial OCG] Este monstruo está atrapado por Círculo Atador de Hechizos y no puede cambiar su posición de batalla.')
                                });
                            } else if (isSummonedThisTurn) {
                                actions.push({
                                    label: '⏳ Invocado Este Turno (No cambiable)',
                                    onClick: () => showRuleAlert('⚠️ [Regla Oficial OCG] No puedes cambiar manualmente la posición de este monstruo en el turno en que fue invocado. (Sí puedes declarar ataque durante la Battle Phase).')
                                });
                            } else if (hasAttackedThisTurn) {
                                actions.push({
                                    label: '⚔️ Ya Atacó (No cambiable)',
                                    onClick: () => showRuleAlert('⚠️ [Regla Oficial OCG] Un monstruo que declaró un ataque este turno no puede cambiar su posición de batalla.')
                                });
                            } else if (hasChangedPosThisTurn) {
                                actions.push({
                                    label: '🔄 Ya Cambió Posición (1 por turno)',
                                    onClick: () => showRuleAlert('⚠️ [Regla Oficial OCG] Cada monstruo solo puede cambiar manualmente de posición una vez por turno.')
                                });
                            } else {
                                const isFlipSummon = (monsterObj.position === 'DEF' && monsterObj.faceDown);
                                const nextPosLabel = isFlipSummon 
                                    ? '⭐ Invocación por Volteo (ATK)' 
                                    : (monsterObj.position === 'ATK' ? '🛡️ Cambiar a Defensa (DEF)' : '⚔️ Cambiar a Ataque (ATK)');
                                actions.push({
                                    label: `🔄 ${nextPosLabel}`,
                                    onClick: () => {
                                        if (isFlipSummon) {
                                            const flipId = monsterObj.card_id || (cardData ? cardData.id : 0);
                                            const targetMode = isCardRequiringTarget(flipId);
                                            if (targetMode) {
                                                startInteractiveTargeting(targetMode, flipId, slotIndex, false, false, cardData.name || 'Monstruo', 'CHANGE_POS');
                                                return;
                                            }
                                        }
                                        triggerChangePos();
                                    }
                                });
                            }
                        }

                        // 3. Declarar Ataque
                        if (lastDuelState.phase === 'BATTLE') {
                            if (monsterObj.position !== 'ATK') {
                                actions.push({
                                    label: '🛡️ En Defensa (No puede atacar)',
                                    onClick: () => showRuleAlert('⚠️ [Regla Oficial] Un monstruo en Posición de Defensa no puede declarar ataque.')
                                });
                            } else if (monsterObj.hasAttacked) {
                                actions.push({
                                    label: '⚔️ Ya Atacó este Turno',
                                    onClick: () => showRuleAlert('⚠️ [Regla Oficial] Este monstruo ya ha declarado su ataque en este turno.')
                                });
                            } else {
                                actions.push({
                                    label: '💥 Declarar Ataque',
                                    onClick: () => triggerAttack()
                                });
                            }
                        } else if (lastDuelState.phase === 'MAIN_1' && lastDuelState.turnNumber > 1 && monsterObj.position === 'ATK' && !monsterObj.hasAttacked) {
                            actions.push({
                                label: '⚔️ Ir a Battle Phase y Atacar',
                                onClick: () => {
                                    advanceToPhase('BATTLE');
                                    setTimeout(() => {
                                        selectedAttackerSlot = slotIndex;
                                        triggerAttack();
                                    }, 300);
                                }
                            });
                        }

                        if (actions.length > 0) {
                            showContextMenu(event, cardData.name || 'Monstruo', actions);
                        }
                    }
                }
            }
            // 3. SELECCIÓN DE OBJETIVO RIVAL EN CAMPO
            else if (zoneType === 'R_M') {
                selectedRivalTargetSlot = slotIndex;
                const rivalSlotElem = document.getElementById(`r-m${slotIndex}`);
                if (rivalSlotElem) rivalSlotElem.classList.add('slot-targeted');

                if (lastDuelState && lastDuelState.player2.monsters[slotIndex]) {
                    inspectMonsterSlot('player2', slotIndex);
                }

                if (lastDuelState && lastDuelState.phase === 'BATTLE') {
                    if (selectedAttackerSlot >= 0 && lastDuelState.player1.monsters[selectedAttackerSlot]) {
                        executeAttack(selectedAttackerSlot, slotIndex);
                    } else {
                        showRuleAlert('⚠️ Primero selecciona un monstruo atacante en tu campo haciendo clic en él.');
                    }
                } else if (lastDuelState && lastDuelState.phase === 'MAIN_1') {
                    if (lastDuelState.turnNumber > 1 && selectedAttackerSlot >= 0 && lastDuelState.player1.monsters[selectedAttackerSlot] && !lastDuelState.player1.monsters[selectedAttackerSlot].hasAttacked && lastDuelState.player1.monsters[selectedAttackerSlot].position === 'ATK') {
                        advanceToPhase('BATTLE');
                        setTimeout(() => {
                            executeAttack(selectedAttackerSlot, slotIndex);
                        }, 300);
                    } else {
                        showRuleAlert('⚠️ [Regla Oficial] Solo puedes atacar durante la BATTLE PHASE.');
                    }
                } else if (lastDuelState && lastDuelState.phase !== 'BATTLE') {
                    showRuleAlert('⚠️ [Regla Oficial] Solo puedes atacar durante la BATTLE PHASE.');
                }
            } 
            // 4. MAGIAS / TRAMPAS PROPIAS EN CAMPO
            else if (zoneType === 'P_S') {
                const sObj = lastDuelState ? lastDuelState.player1.spells[slotIndex] : null;
                if (sObj) {
                    inspectCardById(sObj.card_id);
                    const isFaceDown = sObj.faceDown === true || sObj.position === 'SET';

                    if (isFaceDown) {
                        if (event) {
                            event.stopPropagation();
                            showContextMenu(event, sObj.card_data ? sObj.card_data.name : 'Magia/Trampa', [
                                {
                                    label: '✨ Activar Carta / Efecto',
                                    onClick: () => {
                                        activateCardDirectly(sObj.card_id, false, slotIndex, sObj.card_data ? sObj.card_data.name : 'Magia/Trampa');
                                    }
                                }
                            ]);
                        }
                    } else {
                        showRuleAlert(`ℹ️ [Efecto Activo] "${sObj.card_data ? sObj.card_data.name : 'Esta carta'}" ya se encuentra activa en el campo.`);
                    }
                }
            }
        }

        // =========================================================================
        // MOTOR DE CADENAS BIDIRECCIONAL ("A LA INVERSA")
        // =========================================================================

        function triggerChangePos() {
            socket.emit('CMD_ACTION', {
                room_id: 'ROOM_DEMO',
                action_type: 'CHANGE_POS',
                slot_index: selectedAttackerSlot
            });
        }

        function triggerAttack() {
            if (!lastDuelState) return;
            if (lastDuelState.phase !== 'BATTLE') {
                showRuleAlert('⚠️ [Regla Oficial] No puedes atacar durante la fase actual. Pasa primero a la BATTLE PHASE.');
                return;
            }
            if (selectedAttackerSlot < 0 || !lastDuelState.player1.monsters[selectedAttackerSlot]) {
                showRuleAlert('⚠️ Selecciona un monstruo en tu campo para atacar.');
                return;
            }

            const rivalHasMonsters = lastDuelState.player2 && lastDuelState.player2.monsters && lastDuelState.player2.monsters.some(m => m !== null);
            if (rivalHasMonsters) {
                if (selectedRivalTargetSlot >= 0 && lastDuelState.player2.monsters[selectedRivalTargetSlot]) {
                    executeAttack(selectedAttackerSlot, selectedRivalTargetSlot);
                } else {
                    // Resaltar monstruos rivales como objetivos válidos
                    for (let i = 0; i < 5; i++) {
                        const rSlot = document.getElementById(`r-m${i}`);
                        if (rSlot && lastDuelState.player2.monsters[i]) {
                            rSlot.classList.add('slot-targeted');
                        }
                    }
                    const attMonster = lastDuelState.player1.monsters[selectedAttackerSlot];
                    const attName = attMonster && attMonster.card_data ? attMonster.card_data.name : 'Monstruo';
                    showRuleAlert(`⚔️ [${attName}] Haz clic en el monstruo rival que deseas atacar.`);
                }
            } else {
                // Ataque directo si el rival no controla monstruos
                executeAttack(selectedAttackerSlot, -1);
            }
        }

        function triggerDirectAttack() {
            executeAttack(selectedAttackerSlot, -1);
        }

        function executeAttack(attackerSlot, targetSlot) {
            if (attackerSlot === undefined || attackerSlot < 0) {
                showRuleAlert('⚠️ Primero selecciona un monstruo atacante en tu campo.');
                return;
            }
            socket.emit('CLIENT_ATTACK', {
                room_id: 'ROOM_DEMO',
                attacker_slot: attackerSlot,
                target_slot: targetSlot
            });
            document.querySelectorAll('.field-slot').forEach(el => el.classList.remove('slot-targeted'));
        }

        function sendAction(actionType) {
            socket.emit('CMD_ACTION', {
                room_id: 'ROOM_DEMO',
                action_type: actionType,
                slot_index: selectedAttackerSlot,
                card_id: selectedHandCardId
            });
        }

        function showRuleAlert(msg) {
            const banner = document.getElementById('rule-alert-banner');
            banner.textContent = msg;
            banner.style.display = 'block';
            setTimeout(() => banner.style.display = 'none', 3500);
        }

        socket.on('ACTION_ERROR', (data) => {
            showRuleAlert(data.message || 'Error en la acción solicitada.');
        });

        socket.on('CHAIN_START', (data) => {
            const banner = document.getElementById('trap-chain-banner');
            banner.textContent = data.message || '¡Cadena activada!';
            banner.style.display = 'block';
            setTimeout(() => banner.style.display = 'none', 4500);
        });

        // =========================================================================
        // MOTOR DE CONTROL Y NAVEGACIÓN DE FASES OFICIALES (KONAMI OCG/TCG)
        // =========================================================================

        // Exportaciones globales para eventos HTML
        window.selectHandCard = selectHandCard;
        window.onSlotClick = onSlotClick;
        window.setSummonMode = setSummonMode;
        window.triggerChangePos = triggerChangePos;
        window.triggerAttack = triggerAttack;
        window.triggerDirectAttack = triggerDirectAttack;
        window.executeAttack = executeAttack;
        window.sendAction = sendAction;
        if (typeof activateCardDirectly !== 'undefined') window.activateCardDirectly = activateCardDirectly;
        if (typeof performTributeSummon !== 'undefined') window.performTributeSummon = performTributeSummon;
        if (typeof showContextMenu !== 'undefined') window.showContextMenu = showContextMenu;
        if (typeof hideContextMenu !== 'undefined') window.hideContextMenu = hideContextMenu;
        if (typeof showRuleAlert !== 'undefined') window.showRuleAlert = showRuleAlert;
