/**
 * Ani-Dimension: Modales OCG, Resolución de Cadenas LIFO, Tributos y Descarte
 */
        function isCardRequiringTarget(cardId) {
            const numId = Number(cardId);
            // Monstruos de volteo o efectos de monstruo
            if (numId === 54652250 || numId === 7089711) return 'MONSTER_ANY';
            if (numId === 9076207 || numId === 33066139 || numId === 51482758) return 'SPELL_TRAP';
            if (numId === 18807109 || numId === 18807108 || numId === 44519536 || numId === 63102017 || numId === 63519819 || numId === 83887306) return 'MONSTER_OPPONENT';
            if (numId === 5318639 || numId === 46130346) return 'SPELL_TRAP';

            // Buscar en mano o campo del jugador si es carta de equipo
            let cardObj = null;
            if (typeof lastDuelState !== 'undefined' && lastDuelState && lastDuelState.player1) {
                cardObj = (lastDuelState.player1.hand && lastDuelState.player1.hand.find(c => Number(c.id || c.card_id) === numId))
                    || (lastDuelState.player1.spells && lastDuelState.player1.spells.find(s => s && Number(s.card_id) === numId));
            }
            if (cardObj) {
                const cd = cardObj.card_data || cardObj;
                const isEquip = cd.race === 'Equip' || (cd.type && typeof cd.type === 'string' && cd.type.includes('Equip'));
                if (isEquip) return 'MONSTER_PLAYER';
            }

            // Cartas Mágicas de Equipo conocidas (LOB y posteriores)
            const equipIds = [
                61854111, 46009906, 15052462, 91595718, 77027445, 4614116, 77007920, 39774685, 
                1557499, 1435851, 37820550, 36607978, 25769732, 51267887, 98252586, 37120512, 
                43422537, 46986414, 98374133
            ];
            if (equipIds.includes(numId)) return 'MONSTER_PLAYER';
            return null;
        }

        function startInteractiveTargeting(mode, cardId, slotIndex = -1, fromHand = false, isChain = false, cardName = 'Carta', actionType = 'ACTIVATE') {
            pendingTargetAction = {
                mode: mode,
                cardId: cardId,
                slotIndex: slotIndex,
                fromHand: fromHand,
                isChain: isChain,
                cardName: cardName,
                actionType: actionType
            };

            // Si proviene de un aviso de cadena, pausar temporizador y ocultar modal mientras el jugador elige objetivo
            if (isChain) {
                if (chainTimerInterval) clearInterval(chainTimerInterval);
                const modal = document.getElementById('chain-prompt-modal');
                if (modal) modal.style.display = 'none';
            }

            const banner = document.getElementById('targeting-floating-banner');
            const icon = document.getElementById('targeting-icon');
            const title = document.getElementById('targeting-title');
            const desc = document.getElementById('targeting-desc');

            if (mode === 'MONSTER_OPPONENT') {
                if (banner) {
                    banner.style.borderColor = '#ff0055';
                    banner.style.boxShadow = '0 0 25px rgba(255, 0, 85, 0.6)';
                    banner.style.display = 'flex';
                }
                if (icon) { icon.textContent = '🎯'; icon.style.color = '#ff0055'; }
                if (title) { title.textContent = `SELECCIÓN DE OBJETIVO (OCG) - ${cardName.toUpperCase()}`; title.style.color = '#ff0055'; }
                if (desc) desc.textContent = `Haz clic sobre el monstruo del rival que deseas seleccionar como objetivo de "${cardName}".`;
                highlightTargets('MONSTER_OPPONENT', true);
            } else if (mode === 'MONSTER_ANY') {
                if (banner) {
                    banner.style.borderColor = '#ffaa00';
                    banner.style.boxShadow = '0 0 25px rgba(255, 170, 0, 0.6)';
                    banner.style.display = 'flex';
                }
                if (icon) { icon.textContent = '🎯'; icon.style.color = '#ffaa00'; }
                if (title) { title.textContent = `SELECCIÓN DE OBJETIVO - ${cardName.toUpperCase()}`; title.style.color = '#ffaa00'; }
                if (desc) desc.textContent = `Haz clic sobre un monstruo en el campo para aplicar el efecto de "${cardName}".`;
                highlightTargets('MONSTER_ANY', true);
            } else if (mode === 'MONSTER_PLAYER') {
                if (banner) {
                    banner.style.borderColor = '#00e5ff';
                    banner.style.boxShadow = '0 0 25px rgba(0, 229, 255, 0.6)';
                    banner.style.display = 'flex';
                }
                if (icon) { icon.textContent = '🗡️'; icon.style.color = '#00e5ff'; }
                if (title) { title.textContent = `SELECCIÓN DE OBJETIVO (EQUIPAR) - ${cardName.toUpperCase()}`; title.style.color = '#00e5ff'; }
                if (desc) desc.textContent = `Haz clic sobre tu monstruo que deseas equipar con "${cardName}".`;
                highlightTargets('MONSTER_PLAYER', true);
            } else if (mode === 'SPELL_TRAP') {
                if (banner) {
                    banner.style.borderColor = '#00ff88';
                    banner.style.boxShadow = '0 0 25px rgba(0, 255, 136, 0.6)';
                    banner.style.display = 'flex';
                }
                if (icon) { icon.textContent = '⚡'; icon.style.color = '#00ff88'; }
                if (title) { title.textContent = `SELECCIÓN DE OBJETIVO (OCG) - ${cardName.toUpperCase()}`; title.style.color = '#00ff88'; }
                if (desc) desc.textContent = `Haz clic sobre la carta Mágica o Trampa en el campo que deseas seleccionar con "${cardName}".`;
                highlightTargets('SPELL_TRAP', true);
            }
        }

        function cancelInteractiveTargeting() {
            const wasChain = pendingTargetAction && pendingTargetAction.isChain;
            pendingTargetAction = null;

            const banner = document.getElementById('targeting-floating-banner');
            if (banner) banner.style.display = 'none';

            highlightTargets('ALL', false);

            if (wasChain) {
                const modal = document.getElementById('chain-prompt-modal');
                if (modal) modal.style.display = 'flex';
            }
        }

        function highlightTargets(mode, enable) {
            if (!enable) {
                document.querySelectorAll('.trap-target-candidate, .mst-target-candidate').forEach(el => {
                    el.classList.remove('trap-target-candidate');
                    el.classList.remove('mst-target-candidate');
                });
                return;
            }
            if (!lastDuelState) return;

            if (mode === 'MONSTER_OPPONENT' || mode === 'MONSTER_ANY') {
                for (let i = 0; i < 5; i++) {
                    if (lastDuelState.player2 && lastDuelState.player2.monsters[i]) {
                        const el = document.getElementById(`r-m${i}`);
                        if (el) el.classList.add('trap-target-candidate');
                    }
                }
            }
            if (mode === 'MONSTER_PLAYER' || mode === 'MONSTER_ANY') {
                for (let i = 0; i < 5; i++) {
                    if (lastDuelState.player1 && lastDuelState.player1.monsters[i]) {
                        const el = document.getElementById(`p-m${i}`);
                        if (el) el.classList.add('trap-target-candidate');
                    }
                }
            }
            if (mode === 'SPELL_TRAP') {
                for (let i = 0; i < 5; i++) {
                    if (lastDuelState.player1 && lastDuelState.player1.spells[i]) {
                        const el = document.getElementById(`p-s${i}`);
                        if (el) el.classList.add('mst-target-candidate');
                    }
                    if (lastDuelState.player2 && lastDuelState.player2.spells[i]) {
                        const el = document.getElementById(`r-s${i}`);
                        if (el) el.classList.add('mst-target-candidate');
                    }
                }
                if (lastDuelState.player1 && lastDuelState.player1.fieldSpell) {
                    const el = document.getElementById('p-campo');
                    if (el) el.classList.add('mst-target-candidate');
                }
                if (lastDuelState.player2 && lastDuelState.player2.fieldSpell) {
                    const el = document.getElementById('r-campo');
                    if (el) el.classList.add('mst-target-candidate');
                }
            }
        }

        function activateCardDirectly(cardId, fromHand = false, slotIndex = -1, cardName = 'Carta') {
            const targetMode = isCardRequiringTarget(cardId);
            if (targetMode) {
                startInteractiveTargeting(targetMode, cardId, slotIndex, fromHand, false, cardName, 'ACTIVATE');
                return;
            }

            socket.emit('OCG_ACTIVATE_CARD', {
                room_id: 'ROOM_DEMO',
                card_id: cardId,
                slot_index: slotIndex,
                from_hand: fromHand
            });
        }

        function triggerMonsterEffect(slotIndex, cardId) {
            const cardData = (lastDuelState && lastDuelState.player1.monsters[slotIndex]) ? lastDuelState.player1.monsters[slotIndex].card_data : null;
            const cardName = cardData ? cardData.name : 'Monstruo';
            const targetMode = isCardRequiringTarget(cardId);
            if (targetMode) {
                startInteractiveTargeting(targetMode, cardId, slotIndex, false, false, cardName, 'MONSTER_EFFECT');
                return;
            }

            socket.emit('CMD_ACTION', {
                room_id: 'ROOM_DEMO',
                action_type: 'MONSTER_EFFECT',
                slot_index: slotIndex,
                card_id: cardId
            });
        }

        function openRebornModal() {
            if (!lastDuelState) return;
            const p1Gy = lastDuelState.player1.graveyard || [];
            const p2Gy = lastDuelState.player2.graveyard || [];

            const isMonster = c => (c.type && c.type.includes('Monster')) || (c.atk !== null && c.atk !== undefined);
            const p1Monsters = p1Gy.filter(isMonster);
            const p2Monsters = p2Gy.filter(isMonster);

            if (p1Monsters.length === 0 && p2Monsters.length === 0) {
                showRuleAlert('⚠️ [Monster Reborn] No hay monstruos en ningún Cementerio para revivir.');
                return;
            }

            const modal = document.getElementById('reborn-modal');
            const p1Count = document.getElementById('reborn-p1-count');
            const p2Count = document.getElementById('reborn-p2-count');
            const p1Grid = document.getElementById('reborn-p1-grid');
            const p2Grid = document.getElementById('reborn-p2-grid');

            if (p1Count) p1Count.textContent = p1Monsters.length;
            if (p2Count) p2Count.textContent = p2Monsters.length;

            p1Grid.innerHTML = '';
            p2Grid.innerHTML = '';

            if (p1Monsters.length === 0) {
                p1Grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:#94a3b8; padding:20px; font-size:10px;">Sin monstruos en tu Cementerio</div>`;
            } else {
                p1Gy.forEach((c, idx) => {
                    if (!isMonster(c)) return;
                    const cId = c.id || c.card_id;
                    const el = document.createElement('div');
                    el.className = 'gy-card-item';
                    el.innerHTML = `
                        <div class="gy-card-img" style="background-image:url('../../../assets/images/cards/${cId}.jpg');"></div>
                        <div class="gy-card-name">${c.name || 'Monstruo'}</div>
                        <div style="font-size:8px; color:var(--accent-gold);">ATK: ${c.atk} / DEF: ${c.def}</div>
                    `;
                    el.onclick = () => selectRebornMonster('player1', idx);
                    p1Grid.appendChild(el);
                });
            }

            if (p2Monsters.length === 0) {
                p2Grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:#94a3b8; padding:20px; font-size:10px;">Sin monstruos en Cementerio Rival</div>`;
            } else {
                p2Gy.forEach((c, idx) => {
                    if (!isMonster(c)) return;
                    const cId = c.id || c.card_id;
                    const el = document.createElement('div');
                    el.className = 'gy-card-item';
                    el.innerHTML = `
                        <div class="gy-card-img" style="background-image:url('../../../assets/images/cards/${cId}.jpg');"></div>
                        <div class="gy-card-name">${c.name || 'Monstruo'}</div>
                        <div style="font-size:8px; color:var(--accent-gold);">ATK: ${c.atk} / DEF: ${c.def}</div>
                    `;
                    el.onclick = () => selectRebornMonster('player2', idx);
                    p2Grid.appendChild(el);
                });
            }

            modal.style.display = 'flex';
        }

        function closeRebornModal() {
            const modal = document.getElementById('reborn-modal');
            if (modal) modal.style.display = 'none';
        }

        function selectRebornMonster(targetGy, targetIndex) {
            socket.emit('OCG_ACTIVATE_CARD', {
                room_id: 'ROOM_DEMO',
                card_id: 83764718,
                from_hand: true,
                target_data: {
                    target_gy: targetGy,
                    target_index: targetIndex
                }
            });

            closeRebornModal();
            selectedHandCardIndex = -1;
            selectedHandCardId = null;
            highlightAvailableSlots(false, true);
        }

        // =========================================================================
        // LÍMITE DE MANO EN END PHASE (DESCARTE OBLIGATORIO SEGÚN KONAMI OCG)
        // =========================================================================
        let pendingDiscardData = null;
        let selectedDiscardIndices = [];

        socket.on('OCG_PROMPT_HAND_DISCARD', (data) => {
            console.log('[OCG HAND DISCARD PROMPT]', data);
            pendingDiscardData = data;
            selectedDiscardIndices = [];
            const modal = document.getElementById('hand-discard-modal');
            const desc = document.getElementById('hand-discard-desc');
            const grid = document.getElementById('hand-discard-grid');
            const confirmBtn = document.getElementById('btn-confirm-discard');

            desc.textContent = `Tienes ${data.hand.length} cartas en la mano (límite oficial: 6). Selecciona ${data.required_count} carta(s) para descartar al Cementerio:`;
            confirmBtn.textContent = `Confirmar Descarte (0/${data.required_count})`;
            confirmBtn.disabled = true;
            grid.innerHTML = '';

            data.hand.forEach((card, idx) => {
                const cId = card.id || card.card_id;
                const div = document.createElement('div');
                div.className = 'gy-card-item discard-candidate';
                div.id = `discard-card-${idx}`;
                div.innerHTML = `
                    <div class="gy-card-img" style="background-image:url('../../../assets/images/cards/${cId}.jpg');"></div>
                    <div class="gy-card-name">${card.name || 'Carta'}</div>
                `;
                div.onclick = () => toggleDiscardCard(idx);
                grid.appendChild(div);
            });

            modal.style.display = 'flex';
        });

        function toggleDiscardCard(idx) {
            if (!pendingDiscardData) return;
            const cardEl = document.getElementById(`discard-card-${idx}`);
            const selIdx = selectedDiscardIndices.indexOf(idx);

            if (selIdx !== -1) {
                selectedDiscardIndices.splice(selIdx, 1);
                if (cardEl) cardEl.classList.remove('discard-selected');
            } else {
                if (selectedDiscardIndices.length < pendingDiscardData.required_count) {
                    selectedDiscardIndices.push(idx);
                    if (cardEl) cardEl.classList.add('discard-selected');
                }
            }

            const confirmBtn = document.getElementById('btn-confirm-discard');
            confirmBtn.textContent = `Confirmar Descarte (${selectedDiscardIndices.length}/${pendingDiscardData.required_count})`;
            confirmBtn.disabled = selectedDiscardIndices.length !== pendingDiscardData.required_count;
        }

        function confirmHandDiscard() {
            if (!pendingDiscardData || selectedDiscardIndices.length !== pendingDiscardData.required_count) return;

            socket.emit('OCG_HAND_DISCARD_RESPONSE', {
                room_id: 'ROOM_DEMO',
                discard_indices: selectedDiscardIndices
            });

            document.getElementById('hand-discard-modal').style.display = 'none';
            pendingDiscardData = null;
            selectedDiscardIndices = [];
        }

        function activateCardFromHand(cardId) {
            if (cardId === 83764718) { // Monster Reborn
                openRebornModal();
                return;
            }
            const targetMode = isCardRequiringTarget(cardId);
            if (targetMode) {
                let cardName = 'Carta';
                if (lastDuelState && lastDuelState.player1 && lastDuelState.player1.hand) {
                    const c = lastDuelState.player1.hand.find(h => (h.id || h.card_id) === cardId);
                    if (c) cardName = c.name;
                }
                startInteractiveTargeting(targetMode, cardId, -1, true, false, cardName);
                selectedHandCardIndex = -1;
                selectedHandCardId = null;
                highlightAvailableSlots(false, true);
                return;
            }

            socket.emit('OCG_ACTIVATE_CARD', {
                room_id: 'ROOM_DEMO',
                card_id: cardId,
                from_hand: true
            });
            selectedHandCardIndex = -1;
            selectedHandCardId = null;
            highlightAvailableSlots(false, true);
        }

        // =========================================================================
        // INTERACCIÓN CON CASILLAS DEL TABLERO (0..4)
        // =========================================================================

        socket.on('OCG_PROMPT_CHAIN', (data) => {
            console.log('[OCG CHAIN PROMPT]', data);
            const modal = document.getElementById('chain-prompt-modal');
            const linkElem = document.getElementById('chain-link-num');
            const timerTag = document.getElementById('chain-timer-num');
            const timerBar = document.getElementById('chain-timer-bar');
            const promptText = document.getElementById('chain-prompt-text');
            const allowedCardsContainer = document.getElementById('chain-allowed-cards');

            linkElem.textContent = data.chain_link || 1;
            promptText.textContent = data.message || '¿Deseas activar una carta o efecto en respuesta?';
            allowedCardsContainer.innerHTML = '';

            // Mostrar cartas que el jugador puede encadenar
            if (data.allowed_cards && data.allowed_cards.length > 0) {
                data.allowed_cards.forEach(card => {
                    const cardDiv = document.createElement('div');
                    cardDiv.className = 'chain-card-item';
                    cardDiv.style.backgroundImage = `url('../../../assets/images/cards/${card.card_id}.jpg')`;
                    cardDiv.innerHTML = `<div class="item-title">${card.name}</div>`;
                    cardDiv.onclick = () => {
                        respondChainCard(card.card_id, card.slot_index, card.location === 'HAND');
                    };
                    allowedCardsContainer.appendChild(cardDiv);
                });
            } else {
                allowedCardsContainer.innerHTML = `<div style="font-size:10px; color:#94a3b8; padding:8px;">No tienes cartas rápidas o trampas disponibles para encadenar en este momento.</div>`;
            }

            modal.style.display = 'flex';

            // Temporizador animado de 8s
            let timeLeft = Math.floor((data.timeout || 8000) / 1000);
            timerTag.textContent = `${timeLeft}s`;
            timerBar.style.width = '100%';

            if (chainTimerInterval) clearInterval(chainTimerInterval);
            const totalMs = data.timeout || 8000;
            const startMs = Date.now();

            chainTimerInterval = setInterval(() => {
                const elapsed = Date.now() - startMs;
                const remainingRatio = Math.max(0, 1 - (elapsed / totalMs));
                timerBar.style.width = `${remainingRatio * 100}%`;
                timerTag.textContent = `${Math.ceil((totalMs - elapsed) / 1000)}s`;

                if (elapsed >= totalMs) {
                    clearInterval(chainTimerInterval);
                    modal.style.display = 'none';
                }
            }, 100);
        });

        function respondChainPass() {
            if (chainTimerInterval) clearInterval(chainTimerInterval);
            document.getElementById('chain-prompt-modal').style.display = 'none';
            socket.emit('OCG_CHAIN_RESPONSE', {
                room_id: 'ROOM_DEMO',
                action: 'PASS'
            });
        }

        function respondChainCard(cardId, slotIndex, fromHand) {
            const targetMode = isCardRequiringTarget(cardId);
            if (targetMode) {
                let cardName = 'Carta';
                if (fromHand && lastDuelState && lastDuelState.player1 && lastDuelState.player1.hand) {
                    const c = lastDuelState.player1.hand.find(h => (h.id || h.card_id) === cardId);
                    if (c) cardName = c.name;
                } else if (!fromHand && lastDuelState && lastDuelState.player1 && lastDuelState.player1.spells[slotIndex]) {
                    const s = lastDuelState.player1.spells[slotIndex];
                    if (s && s.card_data) cardName = s.card_data.name;
                }
                startInteractiveTargeting(targetMode, cardId, slotIndex, fromHand, true, cardName);
                return;
            }

            if (chainTimerInterval) clearInterval(chainTimerInterval);
            document.getElementById('chain-prompt-modal').style.display = 'none';
            socket.emit('OCG_CHAIN_RESPONSE', {
                room_id: 'ROOM_DEMO',
                action: 'CHAIN',
                card_id: cardId,
                slot_index: slotIndex,
                from_hand: fromHand
            });
        }

        // =========================================================================
        // MOTOR DE SELECCIÓN DE SACRIFICIOS (TRIBUTOS OCG) - VISUAL E INTUITIVO
        // =========================================================================
        function initiateTributeFlow(cardId, cardName, level, tributesNeeded, position = 'ATK', preselectedSlot = -1) {
            if (!lastDuelState || !lastDuelState.player1) return;
            const controlledSlots = [];
            for (let i = 0; i < 5; i++) {
                if (lastDuelState.player1.monsters[i]) controlledSlots.push(i);
            }

            if (controlledSlots.length < tributesNeeded) {
                showRuleAlert(`⚠️ [Regla Oficial Konami] "${cardName}" es Nivel ${level} y requiere ${tributesNeeded} sacrificio(s) en el campo. Actualmente solo controlas ${controlledSlots.length} monstruo(s).`);
                return;
            }

            openTributeModal(cardId, cardName, level, tributesNeeded, position, preselectedSlot);
        }

        function openTributeModal(cardId, cardName, level, tributesNeeded, position = 'ATK', preselectedSlot = -1) {
            console.log('[OPEN TRIBUTE MODAL]', { cardId, cardName, level, tributesNeeded, position, preselectedSlot });
            pendingTributeData = {
                card_id: cardId,
                card_name: cardName,
                level: level,
                required_count: tributesNeeded,
                position: position,
                target_slot: preselectedSlot >= 0 ? preselectedSlot : 0
            };
            selectedTributeSlots = [];
            if (preselectedSlot >= 0 && lastDuelState && lastDuelState.player1 && lastDuelState.player1.monsters[preselectedSlot]) {
                selectedTributeSlots.push(preselectedSlot);
            }

            const modal = document.getElementById('tribute-modal');
            const titleElem = document.getElementById('tribute-modal-title');
            const descElem = document.getElementById('tribute-modal-desc');

            if (titleElem) {
                titleElem.textContent = `INVOCACIÓN POR SACRIFICIO: ${cardName.toUpperCase()} (Nv. ${level})`;
            }
            if (descElem) {
                descElem.textContent = `Selecciona ${tributesNeeded} monstruo(s) en tu campo para tributar e invocar a "${cardName}":`;
            }

            renderTributeModalMonsters();
            updateTributeButtonsState();

            if (modal) modal.style.display = 'flex';
        }

        function renderTributeModalMonsters() {
            const gridElem = document.getElementById('tribute-monsters-grid');
            if (!gridElem || !lastDuelState || !lastDuelState.player1) return;
            gridElem.innerHTML = '';

            let countMonsters = 0;
            for (let i = 0; i < 5; i++) {
                const m = lastDuelState.player1.monsters[i];
                if (!m) continue;
                countMonsters++;
                const isSelected = selectedTributeSlots.includes(i);
                const cData = m.card_data || {};
                const cImg = `../../../assets/images/cards/${m.card_id}.jpg`;
                const curAtk = m.currentAtk !== undefined ? m.currentAtk : (cData.atk || 0);

                const cardDiv = document.createElement('div');
                cardDiv.className = `tribute-card-choice ${isSelected ? 'selected-tribute' : ''}`;
                cardDiv.onclick = (e) => {
                    if (e) e.stopPropagation();
                    toggleTributeSlotModal(i);
                };
                cardDiv.innerHTML = `
                    <div class="tribute-card-img" style="background-image:url('${cImg}')"></div>
                    <div class="tribute-card-name">${cData.name || 'Monstruo'}</div>
                    <div class="tribute-card-atk">ATK: ${curAtk} | #${i + 1}</div>
                    ${isSelected ? `<div class="tribute-card-badge">TRIBUTO</div>` : ''}
                `;
                gridElem.appendChild(cardDiv);
            }

            if (countMonsters === 0) {
                gridElem.innerHTML = '<div style="color:#94a3b8; font-size:11px; padding:20px;">No controlas monstruos en tu campo para tributar.</div>';
            }
        }

        function toggleTributeSlotModal(slotIndex) {
            if (!pendingTributeData) return;
            const idx = selectedTributeSlots.indexOf(slotIndex);
            if (idx !== -1) {
                selectedTributeSlots.splice(idx, 1);
            } else {
                if (selectedTributeSlots.length < pendingTributeData.required_count) {
                    selectedTributeSlots.push(slotIndex);
                } else if (pendingTributeData.required_count === 1) {
                    selectedTributeSlots = [slotIndex];
                }
            }
            renderTributeModalMonsters();
            updateTributeButtonsState();
        }

        function updateTributeButtonsState() {
            if (!pendingTributeData) return;
            const isReady = selectedTributeSlots.length === pendingTributeData.required_count;
            const badge = document.getElementById('tribute-status-badge');
            const btnAtk = document.getElementById('btn-tribute-atk');
            const btnDef = document.getElementById('btn-tribute-def');

            if (badge) {
                badge.textContent = `Seleccionados: ${selectedTributeSlots.length} / ${pendingTributeData.required_count}`;
                badge.style.color = isReady ? '#00ff88' : 'var(--accent-gold)';
            }
            if (btnAtk) btnAtk.disabled = !isReady;
            if (btnDef) btnDef.disabled = !isReady;
        }

        function executeTributeSummon(position = 'ATK') {
            if (!pendingTributeData || selectedTributeSlots.length !== pendingTributeData.required_count) return;

            const targetSlot = pendingTributeData.target_slot !== undefined && pendingTributeData.target_slot >= 0
                ? pendingTributeData.target_slot
                : selectedTributeSlots[0];

            socket.emit('OCG_TRIBUTE_RESPONSE', {
                room_id: 'ROOM_DEMO',
                card_id: pendingTributeData.card_id,
                tribute_slots: selectedTributeSlots,
                target_slot: targetSlot,
                position: position
            });

            cancelTributeSelection();
        }

        socket.on('OCG_PROMPT_TRIBUTE', (data) => {
            console.log('[OCG TRIBUTE PROMPT]', data);
            openTributeModal(data.card_id, data.card_name, data.level, data.required_count, data.position || 'ATK', data.target_slot !== undefined ? data.target_slot : -1);
        });

        function toggleTributeSlot(slotIndex) {
            toggleTributeSlotModal(slotIndex);
        }

        function confirmTributeSelection() {
            executeTributeSummon('ATK');
        }

        function cancelTributeSelection() {
            pendingTributeData = null;
            selectedTributeSlots = [];
            const modal = document.getElementById('tribute-modal');
            if (modal) modal.style.display = 'none';
            const banner = document.getElementById('tribute-banner');
            if (banner) banner.style.display = 'none';
            for (let i = 0; i < 5; i++) {
                const slot = document.getElementById(`p-m${i}`);
                if (slot) {
                    slot.classList.remove('slot-droppable');
                    slot.classList.remove('slot-targeted');
                }
            }
        }

        // =========================================================================
        // VISOR E INSPECTOR FLOTANTE NO BLOQUEANTE (EXTRA DECK, CEMENTERIO, DESTIERRO)
        // =========================================================================

        // Exportaciones globales para eventos HTML
        if (typeof respondChainPass !== 'undefined') window.respondChainPass = respondChainPass;
        if (typeof respondChainCard !== 'undefined') window.respondChainCard = respondChainCard;
        if (typeof confirmTributeSelection !== 'undefined') window.confirmTributeSelection = confirmTributeSelection;
        if (typeof cancelTributeSelection !== 'undefined') window.cancelTributeSelection = cancelTributeSelection;
        if (typeof confirmHandDiscard !== 'undefined') window.confirmHandDiscard = confirmHandDiscard;
        if (typeof cancelInteractiveTargeting !== 'undefined') window.cancelInteractiveTargeting = cancelInteractiveTargeting;
        if (typeof closeRebornModal !== 'undefined') window.closeRebornModal = closeRebornModal;
        if (typeof openTributeModal !== 'undefined') window.openTributeModal = openTributeModal;
        if (typeof toggleTributeSlotModal !== 'undefined') window.toggleTributeSlotModal = toggleTributeSlotModal;
        if (typeof executeTributeSummon !== 'undefined') window.executeTributeSummon = executeTributeSummon;
        if (typeof initiateTributeFlow !== 'undefined') window.initiateTributeFlow = initiateTributeFlow;
        if (typeof activateCardFromHand !== 'undefined') window.activateCardFromHand = activateCardFromHand;
        if (typeof activateCardDirectly !== 'undefined') window.activateCardDirectly = activateCardDirectly;
