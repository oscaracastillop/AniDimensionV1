/**
 * Ani-Dimension: Renderizador Visual del Tablero y Paneles OCG
 */
var currentUser = window.currentUser || (window.Session && window.Session.getUser()) || { id: 999, username: 'Admin' };

        async function inspectCardById(cardId) {
            if (!cardId) return;
            const imgElem = document.getElementById('inspect-img');
            const titleElem = document.getElementById('inspect-title');
            const attrElem = document.getElementById('inspect-attr');
            const starsElem = document.getElementById('inspect-stars');
            const typeElem = document.getElementById('inspect-type');
            const archetypeElem = document.getElementById('inspect-archetype');
            const atkElem = document.getElementById('inspect-atk');
            const defElem = document.getElementById('inspect-def');
            const descElem = document.getElementById('inspect-desc');
            const statsGrid = document.getElementById('inspect-stats-grid');

            imgElem.src = `https://images.ygoprodeck.com/images/cards/${cardId}.jpg`;
            titleElem.textContent = `Cargando ID #${cardId}...`;
            descElem.textContent = "Obteniendo datos oficiales de carta...";

            try {
                const res = await fetch(`/api/cards/${cardId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.card) {
                        const card = data.card;
                        imgElem.src = card.image_url || `https://images.ygoprodeck.com/images/cards/${card.id}.jpg`;
                        titleElem.textContent = card.name;
                        
                        attrElem.textContent = card.attribute || (card.type && card.type.includes('Spell') ? 'SPELL' : 'TRAP');
                        
                        const lvl = card.level || 0;
                        if (lvl > 0) {
                            starsElem.textContent = '⭐'.repeat(Math.min(lvl, 12)) + ` (Nv. ${lvl})`;
                            starsElem.style.display = 'inline';
                        } else {
                            starsElem.textContent = (card.type && card.type.includes('Spell')) ? '✨ MÁGICA' : '🛡️ TRAMPA';
                        }

                        typeElem.textContent = `${card.race || 'Carta'} / ${card.type || 'Normal'}`;
                        
                        const invalidArchetypes = ['Field', 'Spell', 'Trap', 'Normal', 'Continuous', 'Quick-Play', 'Equip', 'Ritual', 'Counter'];
                        if (card.archetype && !invalidArchetypes.includes(card.archetype)) {
                            archetypeElem.textContent = `Arquetipo: ${card.archetype}`;
                        } else {
                            archetypeElem.textContent = 'Sin Arquetipo';
                        }

                        if (card.atk !== null && card.atk !== undefined) {
                            statsGrid.style.display = 'grid';
                            let displayAtk = card.atk;
                            let displayDef = card.def;
                            let atkExtra = '';
                            let defExtra = '';

                            // Si Yami está activo en campo, reflejar buff/debuff
                            let activeField = null;
                            if (lastDuelState) {
                                if (lastDuelState.player1 && lastDuelState.player1.fieldSpell) activeField = lastDuelState.player1.fieldSpell.card_id;
                                if (lastDuelState.player2 && lastDuelState.player2.fieldSpell) activeField = lastDuelState.player2.fieldSpell.card_id;
                            }

                            if (activeField === 59197169 && card.race) {
                                const r = card.race.toLowerCase();
                                if (r === 'spellcaster' || r === 'fiend') {
                                    displayAtk = (card.atk || 0) + 200;
                                    displayDef = (card.def || 0) + 200;
                                    atkExtra = ' <span class="stat-buffed">(+200)</span>';
                                    defExtra = ' <span class="stat-buffed">(+200)</span>';
                                } else if (r === 'fairy') {
                                    displayAtk = Math.max(0, (card.atk || 0) - 200);
                                    displayDef = Math.max(0, (card.def || 0) - 200);
                                    atkExtra = ' <span class="stat-debuffed">(-200)</span>';
                                    defExtra = ' <span class="stat-debuffed">(-200)</span>';
                                }
                            }

                            atkElem.innerHTML = `${displayAtk}${atkExtra}`;
                            defElem.innerHTML = `${displayDef !== null ? displayDef : '---'}${defExtra}`;
                        } else {
                            statsGrid.style.display = 'none';
                        }

                        descElem.textContent = card.desc;
                        return;
                    }
                }
            } catch (err) {
                console.error("Error al consultar API de carta:", err);
            }

            titleElem.textContent = `Carta #${cardId}`;
            descElem.textContent = "Datos oficiales registrados en base de datos.";
            const attachedBox = document.getElementById('inspect-attached-box');
            if (attachedBox) attachedBox.style.display = 'none';
        }

        function inspectMonsterSlot(playerKey, slotIndex) {
            if (!lastDuelState || !lastDuelState[playerKey]) return;
            const monster = lastDuelState[playerKey].monsters[slotIndex];
            if (!monster) return;

            inspectCardById(monster.card_id);

            const attachedBox = document.getElementById('inspect-attached-box');
            const attachedList = document.getElementById('inspect-attached-list');

            const isTrapped = monster.isTrapped || (monster.attachedEffects && monster.attachedEffects.some(e => e.effect_type === 'CANNOT_ATTACK'));
            const effects = monster.attachedEffects || [];

            if (isTrapped || effects.length > 0) {
                if (attachedBox && attachedList) {
                    attachedBox.style.display = 'block';
                    if (effects.length > 0) {
                        attachedList.innerHTML = effects.map(e => `
                            <div style="margin-bottom:4px; padding-bottom:3px; border-bottom:1px solid rgba(192,132,252,0.25);">
                                <strong style="color:#f3e8ff;">⛓️ ${e.card_name || e.name}</strong><br>
                                <span style="color:#d8b4fe; font-size:8.5px;">${e.desc || 'No puede declarar ataque ni cambiar su posición de batalla.'}</span>
                            </div>
                        `).join('');
                    } else if (isTrapped) {
                        attachedList.innerHTML = `<div><strong style="color:#f3e8ff;">⛓️ Círculo Atador de Hechizos</strong>: Inmovilizado. No puede atacar ni cambiar posición.</div>`;
                    }
                }
            } else {
                if (attachedBox) attachedBox.style.display = 'none';
            }
        }

        function highlightTargetSlot(playerKey, slotIdx, enable) {
            const prefix = playerKey === 'player1' ? 'p-m' : 'r-m';
            const slotElem = document.getElementById(`${prefix}${slotIdx}`);
            if (slotElem) {
                if (enable) slotElem.classList.add('slot-target-highlight');
                else slotElem.classList.remove('slot-target-highlight');
            }
        }

        // =========================================================================
        // MODO DE INVOCACIÓN (ATK / DEF) & RESALTADO DE RANURAS DISPONIBLES
        // =========================================================================

        function inspectCardDirectly(card) {
            if (!card) return;
            const cId = card.id || card.card_id;
            const imgElem = document.getElementById('inspect-img');
            const titleElem = document.getElementById('inspect-title');
            const attrElem = document.getElementById('inspect-attr');
            const starsElem = document.getElementById('inspect-stars');
            const typeElem = document.getElementById('inspect-type');
            const archetypeElem = document.getElementById('inspect-archetype');
            const atkElem = document.getElementById('inspect-atk');
            const defElem = document.getElementById('inspect-def');
            const descElem = document.getElementById('inspect-desc');
            const statsGrid = document.getElementById('inspect-stats-grid');
            const attachedBox = document.getElementById('inspect-attached-box');

            if (attachedBox) attachedBox.style.display = 'none';

            imgElem.src = card.image_url || `https://images.ygoprodeck.com/images/cards/${cId}.jpg`;
            titleElem.textContent = card.name || `Carta #${cId}`;
            attrElem.textContent = card.attribute || (card.type && card.type.includes('Spell') ? 'SPELL' : (card.type && card.type.includes('Trap') ? 'TRAP' : 'DARK'));

            const lvl = card.level || card.rank || card.linkval || 0;
            if (lvl > 0) {
                if (card.type && card.type.includes('XYZ')) {
                    starsElem.textContent = '⚫'.repeat(Math.min(lvl, 12)) + ` (Rango ${lvl})`;
                } else if (card.type && card.type.includes('Link')) {
                    starsElem.textContent = `🔷 LINK-${lvl}`;
                } else {
                    starsElem.textContent = '⭐'.repeat(Math.min(lvl, 12)) + ` (Nv. ${lvl})`;
                }
                starsElem.style.display = 'inline';
            } else {
                starsElem.textContent = (card.type && card.type.includes('Spell')) ? '✨ MÁGICA' : ((card.type && card.type.includes('Trap')) ? '🛡️ TRAMPA' : '');
            }

            typeElem.textContent = `${card.race || 'Carta'} / ${card.type || 'Monstruo'}`;

            const invalidArchetypes = ['Field', 'Spell', 'Trap', 'Normal', 'Continuous', 'Quick-Play', 'Equip', 'Ritual', 'Counter'];
            if (card.archetype && !invalidArchetypes.includes(card.archetype)) {
                archetypeElem.textContent = `Arquetipo: ${card.archetype}`;
            } else {
                archetypeElem.textContent = 'Sin Arquetipo';
            }

            if (card.atk !== null && card.atk !== undefined) {
                statsGrid.style.display = 'grid';
                atkElem.innerHTML = `${card.atk}`;
                defElem.innerHTML = `${card.def !== null && card.def !== undefined ? card.def : '---'}`;
            } else {
                statsGrid.style.display = 'none';
            }

            descElem.textContent = card.desc || 'Sin descripción disponible.';

            // Sincronizar consulta al backend para datos ampliados o efectos adicionales
            inspectCardById(cId);
        }

        function getCardTypeBadgeColor(typeStr) {
            if (!typeStr) return '#c084fc';
            const t = typeStr.toLowerCase();
            if (t.includes('fusion')) return '#c084fc';
            if (t.includes('synchro')) return '#e2e8f0';
            if (t.includes('xyz')) return '#38bdf8';
            if (t.includes('link')) return '#00f0ff';
            if (t.includes('spell')) return '#2ed573';
            if (t.includes('trap')) return '#ff4757';
            return 'var(--accent-gold)';
        }

        function openGraveyardModal(playerKey) {
            if (!lastDuelState) return;
            const p = lastDuelState[playerKey];
            const modal = document.getElementById('gy-inspector-modal');
            const box = document.getElementById('gy-drawer-card-box');
            const iconElem = document.getElementById('gy-drawer-icon');
            const titleElem = document.getElementById('gy-modal-title');
            const hintElem = document.getElementById('gy-drawer-hint');
            const grid = document.getElementById('gy-cards-grid');

            box.className = 'gy-drawer-card drawer-theme-gy';
            if (iconElem) iconElem.textContent = '🪦';
            if (hintElem) hintElem.textContent = '💡 Haz clic en cualquier carta para ver sus detalles en el panel izquierdo.';

            const gyCards = p.graveyard || [];
            titleElem.textContent = `🪦 Cementerio de ${p.username} (${gyCards.length} cartas)`;
            grid.innerHTML = '';

            if (gyCards.length === 0) {
                grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; color:#94a3b8; padding:30px;">El Cementerio está vacío.</div>`;
            } else {
                gyCards.forEach((c, idx) => {
                    const cId = c.id || c.card_id;
                    const cardDiv = document.createElement('div');
                    cardDiv.className = 'gy-card-item' + (idx === 0 ? ' gy-card-selected' : '');
                    const badgeColor = getCardTypeBadgeColor(c.type);
                    cardDiv.innerHTML = `
                        <div class="gy-card-img" style="background-image:url('https://images.ygoprodeck.com/images/cards/${cId}.jpg');"></div>
                        <div class="gy-card-name" title="${c.name || 'Carta'}">${c.name || 'Carta'}</div>
                        <div style="font-size:8px; color:${badgeColor}; font-weight:800;">${c.atk !== null && c.atk !== undefined ? `ATK: ${c.atk} / DEF: ${c.def}` : (c.type || 'Mágica/Trampa')}</div>
                    `;
                    cardDiv.onclick = () => {
                        grid.querySelectorAll('.gy-card-item').forEach(item => item.classList.remove('gy-card-selected'));
                        cardDiv.classList.add('gy-card-selected');
                        inspectCardDirectly(c);

                        // Si estamos en modo de selección de objetivo para revivir
                        if (targetSelectMode && typeof targetSelectMode.callback === 'function') {
                            targetSelectMode.callback(cId);
                            targetSelectMode = null;
                            closeGraveyardModal();
                        }
                    };
                    grid.appendChild(cardDiv);
                });

                // Cargar inmediatamente la primera carta en el inspector lateral izquierdo
                inspectCardDirectly(gyCards[0]);
            }

            modal.style.display = 'flex';
        }

        function openBanishedModal(playerKey) {
            if (!lastDuelState) return;
            const p = lastDuelState[playerKey];
            const modal = document.getElementById('gy-inspector-modal');
            const box = document.getElementById('gy-drawer-card-box');
            const iconElem = document.getElementById('gy-drawer-icon');
            const titleElem = document.getElementById('gy-modal-title');
            const hintElem = document.getElementById('gy-drawer-hint');
            const grid = document.getElementById('gy-cards-grid');

            box.className = 'gy-drawer-card drawer-theme-banished';
            if (iconElem) iconElem.textContent = '🌌';
            if (hintElem) hintElem.textContent = '💡 Haz clic en cualquier carta para ver sus detalles en el panel izquierdo.';

            const banishedCards = p.banished || [];
            titleElem.textContent = `🌌 Cartas Desterradas de ${p.username} (${banishedCards.length} cartas)`;
            grid.innerHTML = '';

            if (banishedCards.length === 0) {
                grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; color:#94a3b8; padding:30px;">No hay cartas desterradas.</div>`;
            } else {
                banishedCards.forEach((c, idx) => {
                    const cId = c.id || c.card_id;
                    const cardDiv = document.createElement('div');
                    cardDiv.className = 'gy-card-item' + (idx === 0 ? ' gy-card-selected' : '');
                    const badgeColor = getCardTypeBadgeColor(c.type);
                    cardDiv.innerHTML = `
                        <div class="gy-card-img" style="background-image:url('https://images.ygoprodeck.com/images/cards/${cId}.jpg');"></div>
                        <div class="gy-card-name" title="${c.name || 'Carta'}">${c.name || 'Carta'}</div>
                        <div style="font-size:8px; color:${badgeColor}; font-weight:800;">${c.atk !== null && c.atk !== undefined ? `ATK: ${c.atk} / DEF: ${c.def}` : (c.type || 'Desterrada')}</div>
                    `;
                    cardDiv.onclick = () => {
                        grid.querySelectorAll('.gy-card-item').forEach(item => item.classList.remove('gy-card-selected'));
                        cardDiv.classList.add('gy-card-selected');
                        inspectCardDirectly(c);
                    };
                    grid.appendChild(cardDiv);
                });

                // Cargar inmediatamente la primera carta en el inspector lateral izquierdo
                inspectCardDirectly(banishedCards[0]);
            }

            modal.style.display = 'flex';
        }

        function openExtraDeckModal(playerKey) {
            if (!lastDuelState) return;
            const p = lastDuelState[playerKey];
            if (!p) return;

            const modal = document.getElementById('gy-inspector-modal');
            const box = document.getElementById('gy-drawer-card-box');
            const iconElem = document.getElementById('gy-drawer-icon');
            const titleElem = document.getElementById('gy-modal-title');
            const hintElem = document.getElementById('gy-drawer-hint');
            const grid = document.getElementById('gy-cards-grid');

            box.className = 'gy-drawer-card drawer-theme-extra';
            if (iconElem) iconElem.textContent = '🔮';
            if (hintElem) hintElem.textContent = '💡 Haz clic en cualquier carta del Extra Deck para ver sus detalles completos a la izquierda.';

            const extraCards = p.extraDeck || [];
            titleElem.textContent = `🔮 Extra Deck de ${p.username} (${extraCards.length} cartas)`;
            grid.innerHTML = '';

            if (extraCards.length === 0) {
                grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; color:#94a3b8; padding:30px;">El Extra Deck está vacío.</div>`;
            } else {
                extraCards.forEach((c, idx) => {
                    const cId = c.id || c.card_id;
                    const cardDiv = document.createElement('div');
                    cardDiv.className = 'gy-card-item' + (idx === 0 ? ' gy-card-selected' : '');
                    const badgeColor = getCardTypeBadgeColor(c.type);
                    cardDiv.innerHTML = `
                        <div class="gy-card-img" style="background-image:url('https://images.ygoprodeck.com/images/cards/${cId}.jpg');"></div>
                        <div class="gy-card-name" title="${c.name || 'Carta'}">${c.name || 'Carta'}</div>
                        <div style="font-size:8px; color:${badgeColor}; font-weight:800;">${c.atk !== null && c.atk !== undefined ? `ATK: ${c.atk} / DEF: ${c.def}` : (c.type || 'Fusión')}</div>
                    `;
                    cardDiv.onclick = () => {
                        grid.querySelectorAll('.gy-card-item').forEach(item => item.classList.remove('gy-card-selected'));
                        cardDiv.classList.add('gy-card-selected');
                        inspectCardDirectly(c);
                    };
                    grid.appendChild(cardDiv);
                });

                // Cargar inmediatamente la primera carta del Extra Deck en el inspector lateral izquierdo
                inspectCardDirectly(extraCards[0]);
            }

            modal.style.display = 'flex';
        }

        function closeGraveyardModal() {
            const modal = document.getElementById('gy-inspector-modal');
            if (modal) modal.style.display = 'none';
        }

        // =========================================================================
        // CONTROL DEL MODAL DE EDICIÓN DE NICK DE USUARIO (MÁX 15 CAR., 1 PALABRA)
        // =========================================================================
        function openEditNickModal() {
            const modal = document.getElementById('edit-nick-modal');
            const input = document.getElementById('editNickInput');
            const alertBox = document.getElementById('edit-nick-alert');
            const countElem = document.getElementById('editNickCharCount');
            if (!modal || !input) return;

            const currentNick = currentUser ? currentUser.username : (document.getElementById('player-name-val')?.textContent?.trim() || '');
            const cleanCurrent = currentNick.replace(/^[\uD800-\uDBFF][\uDC00-\uDFFF]\s*/, '').trim();
            input.value = cleanCurrent;
            if (countElem) countElem.textContent = `${cleanCurrent.length}/15`;
            if (alertBox) alertBox.style.display = 'none';

            modal.style.display = 'flex';
            setTimeout(() => { input.focus(); input.select(); }, 50);
        }

        function closeEditNickModal() {
            const modal = document.getElementById('edit-nick-modal');
            if (modal) modal.style.display = 'none';
        }

        function onEditNickInputChanged(input) {
            if (/\s/.test(input.value)) {
                input.value = input.value.replace(/\s+/g, '');
            }
            const countElem = document.getElementById('editNickCharCount');
            if (countElem) {
                countElem.textContent = `${input.value.length}/15`;
                countElem.style.color = input.value.length > 15 ? '#ff4757' : (input.value.length === 15 ? 'var(--accent-gold)' : '#888');
            }
        }

        async function saveEditedNick() {
            const input = document.getElementById('editNickInput');
            const btnSave = document.getElementById('btn-save-nick');
            if (!input) return;

            const newNick = input.value.trim();

            if (!newNick || newNick.length < 3 || newNick.length > 15) {
                showEditNickAlert('El nick debe tener entre 3 y 15 caracteres (máximo 15).', true);
                return;
            }

            if (/\s/.test(newNick) || newNick.split(/\s+/).length > 1) {
                showEditNickAlert('El nick debe ser una sola palabra, no se permiten espacios en blanco.', true);
                return;
            }

            const validNickRegex = /^[a-zA-Z0-9_.-]+$/;
            if (!validNickRegex.test(newNick)) {
                showEditNickAlert('El nick solo puede contener caracteres alfanuméricos, guiones o puntos.', true);
                return;
            }

            if (btnSave) {
                btnSave.disabled = true;
                btnSave.textContent = 'GUARDANDO...';
            }

            try {
                const payload = {
                    userId: currentUser ? currentUser.id : null,
                    currentUsername: currentUser ? currentUser.username : 'Admin',
                    newUsername: newNick
                };

                const res = await fetch('/api/user/update-nick', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();

                if (!res.ok || !data.success) {
                    showEditNickAlert(data.message || 'No se pudo actualizar el nick.', true);
                    if (btnSave) {
                        btnSave.disabled = false;
                        btnSave.textContent = 'GUARDAR CAMBIOS';
                    }
                    return;
                }

                if (currentUser) {
                    currentUser.username = data.username;
                }

                const flag = (currentUser && currentUser.flagEmoji) ? (currentUser.flagEmoji + ' ') : '';
                const playerNameElem = document.getElementById('player-name-val');
                if (playerNameElem) {
                    playerNameElem.textContent = `${flag}${data.username}`;
                }

                if (window.socket) {
                    window.socket.emit('USER_IDENTIFY', {
                        username: data.username,
                        userId: currentUser ? currentUser.id : null,
                        countryIsoCode: currentUser ? currentUser.countryIsoCode : null
                    });
                }

                showEditNickAlert(data.message || '¡Nick actualizado con éxito!', false);

                setTimeout(() => {
                    closeEditNickModal();
                    if (btnSave) {
                        btnSave.disabled = false;
                        btnSave.textContent = 'GUARDAR CAMBIOS';
                    }
                }, 1000);

            } catch (err) {
                console.error("Error al actualizar nick:", err);
                showEditNickAlert('Error de comunicación con el servidor.', true);
                if (btnSave) {
                    btnSave.disabled = false;
                    btnSave.textContent = 'GUARDAR CAMBIOS';
                }
            }
        }

        function showEditNickAlert(message, isError = true) {
            const alertBox = document.getElementById('edit-nick-alert');
            if (!alertBox) return;
            alertBox.style.display = 'block';
            alertBox.style.background = isError ? 'rgba(255, 71, 87, 0.15)' : 'rgba(46, 213, 115, 0.15)';
            alertBox.style.border = isError ? '1px solid #ff4757' : '1px solid #2ed573';
            alertBox.style.color = isError ? '#ff6b81' : '#2ed573';
            alertBox.innerHTML = (isError ? '⚠️ ' : '✅ ') + message;
        }

        // Cerrar visor flotante o modal de nick al presionar tecla Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeGraveyardModal();
                closeEditNickModal();
            }
        });

        // =========================================================================
        // REGISTRO DE EVENTOS OCG EN TIEMPO REAL
        // =========================================================================
        socket.on('OCG_EVENT_LOG', (log) => {
            const container = document.getElementById('duel-event-log');
            if (!container) return;
            const div = document.createElement('div');
            div.className = `log-item ${log.type || 'info'}`;
            div.textContent = log.message;
            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
        });



        function promptSurrender() {
            const modal = document.getElementById('surrender-modal');
            if (modal) modal.style.display = 'flex';
        }

        function closeSurrenderModal() {
            const modal = document.getElementById('surrender-modal');
            if (modal) modal.style.display = 'none';
        }

        function confirmSurrender() {
            closeSurrenderModal();
            socket.emit('CMD_ACTION', {
                room_id: 'ROOM_DEMO',
                action_type: 'SURRENDER'
            });
        }

        // =========================================================================
        // PROTECCIÓN CONTRA RETROCESO ACCIDENTAL Y RECARGA (WEB & APK ANDROID)
        // =========================================================================

        function updatePhaseUI(phase, turnPlayer, turnNumber) {
            const PHASES_ORDER = ['DRAW', 'STANDBY', 'MAIN_1', 'BATTLE', 'MAIN_2', 'END'];
            const myUsername = currentUser ? currentUser.username : 'Admin';
            const isMyTurn = !currentUser || turnPlayer === myUsername;
            const currentIdx = PHASES_ORDER.indexOf(phase);

            PHASES_ORDER.forEach((p, idx) => {
                const item = document.getElementById(`phase-item-${p}`);
                if (!item) return;

                // Resetear clases y estilos
                item.classList.remove('active-phase', 'phase-disabled', 'phase-available');

                if (!isMyTurn) {
                    // TURNO DEL RIVAL: Todos los botones quedan bloqueados para el jugador
                    item.style.pointerEvents = 'none';
                    if (p === phase) {
                        item.classList.add('active-phase');
                    } else {
                        item.classList.add('phase-disabled');
                    }
                } else {
                    // TURNO DEL JUGADOR:
                    if (idx < currentIdx) {
                        // Fases anteriores: DESHABILITADAS
                        item.classList.add('phase-disabled');
                        item.style.pointerEvents = 'none';
                    } else if (idx === currentIdx) {
                        // Fase activa actual
                        item.classList.add('active-phase');
                        item.style.pointerEvents = 'none';
                    } else {
                        // Fases futuras disponibles según reglas oficiales
                        if (phase === 'MAIN_1' && p === 'MAIN_2') {
                            // Main Phase 2 requiere haber pasado por Battle Phase
                            item.classList.add('phase-disabled');
                            item.style.pointerEvents = 'none';
                        } else {
                            item.classList.add('phase-available');
                            item.style.pointerEvents = 'auto';
                        }
                    }
                }
            });

            const turnBadge = document.getElementById('turn-player-badge');
            const turnNumLabel = document.getElementById('turn-num-label');
            if (turnNumLabel) turnNumLabel.textContent = `TURNO ${turnNumber || 1}`;
            if (turnBadge) {
                if (isMyTurn) {
                    turnBadge.textContent = 'TU TURNO';
                    turnBadge.className = 'turn-player-tag my-turn';
                } else {
                    turnBadge.textContent = 'TURNO DEL RIVAL';
                    turnBadge.className = 'turn-player-tag rival-turn';
                }
            }
        }

        function advanceToPhase(targetPhase) {
            socket.emit('CMD_ACTION', {
                room_id: 'ROOM_DEMO',
                action_type: 'SET_PHASE',
                target_phase: targetPhase
            });
        }

        function attemptPhaseChange(clickedPhase) {
            if (!lastDuelState) return;
            const myUsername = currentUser ? currentUser.username : 'Admin';
            if (lastDuelState.turnPlayer !== myUsername) {
                showRuleAlert('⚠️ No es tu turno. Espera a que el oponente finalice su turno.');
                return;
            }
            const current = lastDuelState.phase;
            if (current === clickedPhase) return;

            // Regla oficial Konami: El primer jugador NO puede entrar a Battle Phase en el Turno 1
            if (clickedPhase === 'BATTLE' && lastDuelState.turnNumber === 1) {
                showRuleAlert('⚠️ [Regla Oficial Konami] El primer jugador no puede entrar a la Battle Phase ni declarar ataques en el Turno 1.');
                return;
            }

            const PHASES_ORDER = ['DRAW', 'STANDBY', 'MAIN_1', 'BATTLE', 'MAIN_2', 'END'];
            const currentIdx = PHASES_ORDER.indexOf(current);
            const targetIdx = PHASES_ORDER.indexOf(clickedPhase);

            // Regla oficial: Fases anteriores ya concluyeron en este turno
            if (targetIdx < currentIdx) {
                showRuleAlert(`⚠️ [Regla Oficial] Las fases anteriores ya concluyeron en este turno. No puedes retroceder.`);
                return;
            }

            // Validar salto ilegal a Main Phase 2 sin combate
            if (current === 'MAIN_1' && clickedPhase === 'MAIN_2') {
                showRuleAlert('⚠️ [Regla Oficial] No puedes entrar a Main Phase 2 sin haber entrado a la Battle Phase.');
                return;
            }

            if (clickedPhase === 'END') {
                showRuleAlert('⏱️ Entrando a End Phase. Validando límite de mano y finalizando turno...');
            }

            advanceToPhase(clickedPhase);
        }

        // =========================================================================
        // SINCRONIZACIÓN TOTAL DEL ESTADO DEL DUELO
        // =========================================================================
        socket.on('DUEL_STATE_UPDATE', (state) => {
            if (!state) return;
            lastDuelState = state;

            // 1. Life Points y Fase
            document.getElementById('player-lp').textContent = `LP: ${state.player1.lp}`;
            document.getElementById('rival-lp').textContent = `LP: ${state.player2.lp}`;
            const deckLbl = document.getElementById('deck-count-lbl');
            if (deckLbl) deckLbl.textContent = `${state.player1.mainDeckCount} / 40`;
            
            // 2. Actualizar Control de Fases OCG / TCG
            updatePhaseUI(state.phase, state.turnPlayer, state.turnNumber);

            // 3. Contadores en Pilas de Cartas (Deck, Extra, GY) & Portada Superior Oficial
            document.getElementById('p-deck-counter').textContent = `${state.player1.mainDeckCount}`;
            document.getElementById('r-deck-counter').textContent = `${state.player2.mainDeckCount}`;
            document.getElementById('p-extra-counter').textContent = `${state.player1.extraDeckCount}`;
            document.getElementById('r-extra-counter').textContent = `${state.player2.extraDeckCount}`;

            // Top Card y Contador en Cementerio y Desierto (Jugador)
            const pGyCards = state.player1.graveyard || [];
            const pGySlot = document.getElementById('p-gy');
            const pGyBadge = document.getElementById('p-gy-counter');
            if (pGyBadge) {
                pGyBadge.textContent = pGyCards.length;
                pGyBadge.style.display = pGyCards.length > 0 ? 'block' : 'none';
            }
            if (pGySlot) {
                if (pGyCards.length > 0) {
                    const topCard = pGyCards[pGyCards.length - 1];
                    const topImg = topCard.image_url || `https://images.ygoprodeck.com/images/cards/${topCard.id || topCard.card_id}.jpg`;
                    pGySlot.style.backgroundImage = `url('${topImg}')`;
                    pGySlot.style.backgroundSize = 'cover';
                    pGySlot.style.backgroundPosition = 'center';
                } else {
                    pGySlot.style.backgroundImage = '';
                }
            }

            const pBanCards = state.player1.banished || [];
            const pBanSlot = document.getElementById('p-banished');
            if (pBanSlot) {
                if (pBanCards.length > 0) {
                    const topCard = pBanCards[pBanCards.length - 1];
                    const topImg = topCard.image_url || `https://images.ygoprodeck.com/images/cards/${topCard.id || topCard.card_id}.jpg`;
                    pBanSlot.style.backgroundImage = `url('${topImg}')`;
                    pBanSlot.style.backgroundSize = 'cover';
                    pBanSlot.style.backgroundPosition = 'center';
                } else {
                    pBanSlot.style.backgroundImage = '';
                }
            }

            // Top Card y Contador en Cementerio y Desierto (Rival)
            const rGyCards = state.player2.graveyard || [];
            const rGySlot = document.getElementById('r-gy');
            const rGyBadge = document.getElementById('r-gy-counter');
            if (rGyBadge) {
                rGyBadge.textContent = rGyCards.length;
                rGyBadge.style.display = rGyCards.length > 0 ? 'block' : 'none';
            }
            if (rGySlot) {
                if (rGyCards.length > 0) {
                    const topCard = rGyCards[rGyCards.length - 1];
                    const topImg = topCard.image_url || `https://images.ygoprodeck.com/images/cards/${topCard.id || topCard.card_id}.jpg`;
                    rGySlot.style.backgroundImage = `url('${topImg}')`;
                    rGySlot.style.backgroundSize = 'cover';
                    rGySlot.style.backgroundPosition = 'center';
                } else {
                    rGySlot.style.backgroundImage = '';
                }
            }

            const rBanCards = state.player2.banished || [];
            const rBanSlot = document.getElementById('r-banished');
            if (rBanSlot) {
                if (rBanCards.length > 0) {
                    const topCard = rBanCards[rBanCards.length - 1];
                    const topImg = topCard.image_url || `https://images.ygoprodeck.com/images/cards/${topCard.id || topCard.card_id}.jpg`;
                    rBanSlot.style.backgroundImage = `url('${topImg}')`;
                    rBanSlot.style.backgroundSize = 'cover';
                    rBanSlot.style.backgroundPosition = 'center';
                } else {
                    rBanSlot.style.backgroundImage = '';
                }
            }

            // 4. Visualizador de Cadena Activa
            const chainVisualizer = document.getElementById('chain-stack-visualizer');
            const chainItemsContainer = document.getElementById('chain-stack-items');
            if (state.activeChain && state.activeChain.length > 0) {
                chainVisualizer.style.display = 'flex';
                chainItemsContainer.innerHTML = state.activeChain.map(link => 
                    `<div class="chain-stack-badge">⛓️ Eslabón ${link.chainLink}: ${link.card_data ? link.card_data.name : 'Efecto'}</div>`
                ).join(' ➔ ');
            } else {
                chainVisualizer.style.display = 'none';
            }

            // 5. Renderizado de Campo Mágico (Field Spell)
            const pCampo = document.getElementById('p-campo');
            if (pCampo) {
                if (state.player1.fieldSpell) {
                    const c = state.player1.fieldSpell.card_data;
                    pCampo.innerHTML = `<div class="card-on-field" style="background-image:url('${c.image_url || `https://images.ygoprodeck.com/images/cards/${c.id}.jpg`}');" title="${c.name}" onclick="onSlotClick('P_CAMPO', 0, event); inspectCardById(${c.id});"></div>`;
                } else {
                    pCampo.innerHTML = `<div class="slot-tooltip">CAMPO</div>`;
                }
            }

            const rCampo = document.getElementById('r-campo');
            if (rCampo) {
                if (state.player2.fieldSpell) {
                    const c = state.player2.fieldSpell.card_data;
                    rCampo.innerHTML = `<div class="card-on-field" style="background-image:url('${c.image_url || `https://images.ygoprodeck.com/images/cards/${c.id}.jpg`}');" title="${c.name}" onclick="onSlotClick('R_CAMPO', 0, event); inspectCardById(${c.id});"></div>`;
                } else {
                    rCampo.innerHTML = `<div class="slot-tooltip">CAMPO</div>`;
                }
            }

            // 6. Renderizado de Monstruos del Jugador (Ranuras 0..4) - Rotación 90° e Insignia Dinámica de ATK/DEF
            for (let i = 0; i < 5; i++) {
                const slot = document.getElementById(`p-m${i}`);
                if (!slot) continue;
                const m = state.player1.monsters[i];
                if (m) {
                    const isDef = m.position === 'DEF';
                    const isFaceDown = m.faceDown;
                    const cardImg = m.card_data ? m.card_data.image_url : `https://images.ygoprodeck.com/images/cards/${m.card_id}.jpg`;
                    const bgUrl = isFaceDown ? '/assets/card_back.jpg' : cardImg;

                    let badgeHtml = '';
                    if (!isFaceDown) {
                        const curAtk = m.currentAtk !== undefined ? m.currentAtk : (m.card_data ? m.card_data.atk : 0);
                        const curDef = m.currentDef !== undefined ? m.currentDef : (m.card_data ? m.card_data.def : 0);
                        const atkClass = (m.atkMod > 0) ? 'stat-buffed' : (m.atkMod < 0 ? 'stat-debuffed' : '');
                        const defClass = (m.defMod > 0) ? 'stat-buffed' : (m.defMod < 0 ? 'stat-debuffed' : '');
                        badgeHtml = `<div class="monster-field-stat-badge">
                            ${isDef ? `DEF: <span class="${defClass}">${curDef}</span>` : `ATK: <span class="${atkClass}">${curAtk}</span>`}
                        </div>`;
                    }
                    
                    const isTrapped = m.isTrapped || (m.attachedEffects && m.attachedEffects.some(e => e.effect_type === 'CANNOT_ATTACK'));
                    let attachedBadgeHtml = '';
                    if (isTrapped || (m.attachedEffects && m.attachedEffects.length > 0)) {
                        const effNames = m.attachedEffects && m.attachedEffects.length > 0 
                            ? m.attachedEffects.map(e => e.card_name || e.name).join(', ') 
                            : 'Círculo Atador de Hechizos';
                        attachedBadgeHtml = `<div class="attached-effects-badge" title="Afectado por: ${effNames} (Inmovilizado)">⛓️ ENCADENADO</div>`;
                    }
                    
                    slot.innerHTML = `<div class="card-on-field ${isDef ? 'def-pos' : ''} ${isFaceDown ? 'card-sleeve' : ''} ${isTrapped ? 'monster-trapped' : ''}" 
                                           style="background-image:url('${bgUrl}');" 
                                           title="${m.card_data ? m.card_data.name : 'Monstruo'}"
                                           onclick="onSlotClick('P_M', ${i}, event)"></div>${attachedBadgeHtml}${badgeHtml}`;
                } else {
                    slot.innerHTML = '';
                }
            }

            // 7. Renderizado de Magias/Trampas del Jugador (Ranuras 0..4) - Reverso Oficial Konami si está SET
            for (let i = 0; i < 5; i++) {
                const slot = document.getElementById(`p-s${i}`);
                if (!slot) continue;
                const s = state.player1.spells[i];
                if (s) {
                    const isSet = s.faceDown || s.position === 'SET';
                    const cardImg = s.card_data ? s.card_data.image_url : `https://images.ygoprodeck.com/images/cards/${s.card_id}.jpg`;
                    const bgUrl = isSet ? '/assets/card_back.jpg' : cardImg;
                    const targetHighlightAttr = s.targetingMonster 
                        ? `onmouseenter="highlightTargetSlot('${s.targetingMonster.player}', ${s.targetingMonster.slot}, true)" onmouseleave="highlightTargetSlot('${s.targetingMonster.player}', ${s.targetingMonster.slot}, false)"`
                        : '';
                    const linkBadge = (!isSet && s.targetingMonster) ? `<div class="attached-effects-badge" style="top:auto; bottom:2px; font-size:7px; background:rgba(0,229,255,0.85); border-color:#00e5ff; color:#000;">🎯 #${s.targetingMonster.slot + 1}</div>` : '';
                    
                    slot.innerHTML = `<div class="card-on-field ${isSet ? 'card-sleeve' : ''}" 
                                           style="background-image:url('${bgUrl}');" 
                                           title="${s.card_data ? s.card_data.name : 'Magia/Trampa'}"
                                           ${targetHighlightAttr}
                                           onclick="onSlotClick('P_S', ${i}, event)"></div>${linkBadge}`;
                } else {
                    slot.innerHTML = '';
                }
            }

            // 8. Renderizado de Monstruos del Rival (Ranuras 0..4) - Rotación 90° e Insignia Dinámica de ATK/DEF
            for (let i = 0; i < 5; i++) {
                const slot = document.getElementById(`r-m${i}`);
                if (!slot) continue;
                const m = state.player2.monsters[i];
                if (m) {
                    const isDef = m.position === 'DEF';
                    const isFaceDown = m.faceDown;
                    const cardImg = m.card_data ? m.card_data.image_url : `https://images.ygoprodeck.com/images/cards/${m.card_id}.jpg`;
                    const bgUrl = isFaceDown ? '/assets/card_back.jpg' : cardImg;

                    let badgeHtml = '';
                    if (!isFaceDown) {
                        const curAtk = m.currentAtk !== undefined ? m.currentAtk : (m.card_data ? m.card_data.atk : 0);
                        const curDef = m.currentDef !== undefined ? m.currentDef : (m.card_data ? m.card_data.def : 0);
                        const atkClass = (m.atkMod > 0) ? 'stat-buffed' : (m.atkMod < 0 ? 'stat-debuffed' : '');
                        const defClass = (m.defMod > 0) ? 'stat-buffed' : (m.defMod < 0 ? 'stat-debuffed' : '');
                        badgeHtml = `<div class="monster-field-stat-badge">
                            ${isDef ? `DEF: <span class="${defClass}">${curDef}</span>` : `ATK: <span class="${atkClass}">${curAtk}</span>`}
                        </div>`;
                    }

                    const isTrapped = m.isTrapped || (m.attachedEffects && m.attachedEffects.some(e => e.effect_type === 'CANNOT_ATTACK'));
                    let attachedBadgeHtml = '';
                    if (isTrapped || (m.attachedEffects && m.attachedEffects.length > 0)) {
                        const effNames = m.attachedEffects && m.attachedEffects.length > 0 
                            ? m.attachedEffects.map(e => e.card_name || e.name).join(', ') 
                            : 'Círculo Atador de Hechizos';
                        attachedBadgeHtml = `<div class="attached-effects-badge" title="Afectado por: ${effNames} (Inmovilizado)">⛓️ ENCADENADO</div>`;
                    }
                    
                    slot.innerHTML = `<div class="card-on-field ${isDef ? 'def-pos' : ''} ${isFaceDown ? 'card-sleeve' : ''} ${isTrapped ? 'monster-trapped' : ''}" 
                                           style="background-image:url('${bgUrl}');" 
                                           title="${!isFaceDown && m.card_data ? m.card_data.name : 'Monstruo Rival'}"
                                           onclick="onSlotClick('R_M', ${i}, event);"></div>${attachedBadgeHtml}${badgeHtml}`;
                } else {
                    slot.innerHTML = '';
                }
            }

            // 9. Renderizado de Magias/Trampas del Rival (Ranuras 0..4) - Reverso Oficial Konami
            for (let i = 0; i < 5; i++) {
                const slot = document.getElementById(`r-s${i}`);
                if (!slot) continue;
                const s = state.player2.spells[i];
                if (s) {
                    const isSet = s.faceDown || s.position === 'SET';
                    const cardImg = s.card_data ? s.card_data.image_url : `https://images.ygoprodeck.com/images/cards/${s.card_id}.jpg`;
                    const bgUrl = isSet ? '/assets/card_back.jpg' : cardImg;
                    const targetHighlightAttr = s.targetingMonster 
                        ? `onmouseenter="highlightTargetSlot('${s.targetingMonster.player}', ${s.targetingMonster.slot}, true)" onmouseleave="highlightTargetSlot('${s.targetingMonster.player}', ${s.targetingMonster.slot}, false)"`
                        : '';
                    const linkBadge = (!isSet && s.targetingMonster) ? `<div class="attached-effects-badge" style="top:auto; bottom:2px; font-size:7px; background:rgba(0,229,255,0.85); border-color:#00e5ff; color:#000;">🎯 #${s.targetingMonster.slot + 1}</div>` : '';
                    
                    slot.innerHTML = `<div class="card-on-field ${isSet ? 'card-sleeve' : ''}" 
                                           style="background-image:url('${bgUrl}');" 
                                           title="${!isSet && s.card_data ? s.card_data.name : 'Carta Boca Abajo Rival'}"
                                           ${targetHighlightAttr}
                                           onclick="onSlotClick('R_S', ${i}, event); ${!isSet ? `inspectCardById(${s.card_id});` : ''}"></div>${linkBadge}`;
                } else {
                    slot.innerHTML = '';
                }
            }

            // 10. Renderizado de la Mano del Jugador (Contorno Dorado si está seleccionada)
            const handContainer = document.getElementById('player-hand');
            if (state.player1.hand && Array.isArray(state.player1.hand)) {
                handContainer.innerHTML = state.player1.hand.map((c, idx) => {
                    const cId = c.id || c.card_id;
                    const img = c.image_url || `https://images.ygoprodeck.com/images/cards/${cId}.jpg`;
                    const isSel = idx === selectedHandCardIndex ? 'selected-hand' : '';
                    return `<div class="hand-card ${isSel}" style="background-image:url('${img}');" onclick="selectHandCard(${idx}, ${cId}, event)"></div>`;
                }).join('');
            }

            // 11. Renderizado de la Mano del Rival (Reversos Oficiales Simétricos)
            const rivalHandContainer = document.getElementById('rival-hand');
            if (state.player2.hand && Array.isArray(state.player2.hand)) {
                rivalHandContainer.innerHTML = state.player2.hand.map(() => `<div class="rival-hand-card"></div>`).join('');
            }
        });

        // Exportaciones globales para eventos HTML
        if (typeof inspectCardById !== 'undefined') window.inspectCardById = inspectCardById;
        if (typeof openGraveyardModal !== 'undefined') window.openGraveyardModal = openGraveyardModal;
        if (typeof closeGraveyardModal !== 'undefined') window.closeGraveyardModal = closeGraveyardModal;
        if (typeof openBanishedModal !== 'undefined') window.openBanishedModal = openBanishedModal;
        if (typeof openExtraDeckModal !== 'undefined') window.openExtraDeckModal = openExtraDeckModal;
        if (typeof attemptPhaseChange !== 'undefined') window.attemptPhaseChange = attemptPhaseChange;
        if (typeof advanceToPhase !== 'undefined') window.advanceToPhase = advanceToPhase;
        if (typeof updatePhaseUI !== 'undefined') window.updatePhaseUI = updatePhaseUI;
        if (typeof promptSurrender !== 'undefined') window.promptSurrender = promptSurrender;
        if (typeof closeSurrenderModal !== 'undefined') window.closeSurrenderModal = closeSurrenderModal;
        if (typeof confirmSurrender !== 'undefined') window.confirmSurrender = confirmSurrender;
        if (typeof showRuleAlert !== 'undefined') window.showRuleAlert = showRuleAlert;
        if (typeof highlightAvailableSlots !== 'undefined') window.highlightAvailableSlots = highlightAvailableSlots;
        if (typeof clearHighlightedSlots !== 'undefined') window.clearHighlightedSlots = clearHighlightedSlots;
        if (typeof openEditNickModal !== 'undefined') window.openEditNickModal = openEditNickModal;
        if (typeof closeEditNickModal !== 'undefined') window.closeEditNickModal = closeEditNickModal;
        if (typeof saveEditedNick !== 'undefined') window.saveEditedNick = saveEditedNick;
        if (typeof onEditNickInputChanged !== 'undefined') window.onEditNickInputChanged = onEditNickInputChanged;

