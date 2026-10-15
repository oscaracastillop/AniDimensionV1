/**
 * ============================================================================
 * ANI-DIMENSION: MOTOR DEL MAPA POR ERAS DEDICADAS (100% SCREEN-FIT)
 * 12 Eras del Anime (Yu-Gi-Oh! DM, GX, 5D's) • 60 Duelistas • Cero Zoom/Pan
 * Cada Era tiene su propio mapa que llena la pantalla con locaciones temáticas
 * ============================================================================
 */

(function (window) {
    'use strict';

    class AdventureMapEngine {
        constructor() {
            this.stageEl = null;
            this.backdropEl = null;
            this.nodesLayer = null;
            this.cardEl = null;
            this.carouselBar = null;

            this.activeEraId = 1;
            this.selectedNpcId = null;
            this.adventureState = null;
        }

        init(adventureState) {
            this.adventureState = adventureState || { maxNpcUnlocked: 1, records: {}, bonuses: {} };

            this.stageEl = document.getElementById('era-screen-map-stage');
            this.backdropEl = document.getElementById('era-map-backdrop');
            this.nodesLayer = document.getElementById('era-nodes-layer');
            this.cardEl = document.getElementById('npc-floating-card');
            this.carouselBar = document.getElementById('eras-carousel-bar');

            // Determinar la era actual basada en el progreso
            const maxUnlocked = (this.adventureState && this.adventureState.maxNpcUnlocked) || 1;
            const allNpcs = (window.AdventureData && window.AdventureData.NPCS) ? window.AdventureData.NPCS : [];
            const maxAvailableId = allNpcs.length > 0 ? Math.max(...allNpcs.map(n => n.id)) : 193;
            const targetNpcId = (maxUnlocked > maxAvailableId) ? maxAvailableId : maxUnlocked;
            const currentNpc = (window.AdventureData && typeof window.AdventureData.getNpcById === 'function')
                ? window.AdventureData.getNpcById(targetNpcId)
                : null;
            this.activeEraId = (this.activeEraId && this.activeEraId >= 1) ? this.activeEraId : (currentNpc ? (currentNpc.eraId || currentNpc.EraId || 1) : 1);

            this.renderErasCarousel();
            this.renderEraMap(this.activeEraId);
        }

        updateState(newState) {
            this.adventureState = newState;
            this.renderErasCarousel();
            this.renderEraMap(this.activeEraId);
            if (this.selectedNpcId) {
                this.showFloatingCard(this.selectedNpcId);
            }
        }

        /**
         * Renderiza el selector desplegable de las 12 Eras
         */
        renderErasCarousel() {
            const selectEl = document.getElementById('era-select-dropdown');
            const eras = (window.AdventureData && window.AdventureData.ERAS) ? window.AdventureData.ERAS : [];
            const maxUnlocked = (this.adventureState && this.adventureState.maxNpcUnlocked) || 1;
            const records = (this.adventureState && this.adventureState.records) || {};

            if (selectEl) {
                let html = '';
                eras.forEach(era => {
                    const npcsInEra = (window.AdventureData && typeof window.AdventureData.getNpcsByEra === 'function')
                        ? window.AdventureData.getNpcsByEra(era.id)
                        : [];
                    const firstNpc = npcsInEra[0];
                    const firstNpcId = firstNpc ? firstNpc.id : 1;
                    const isUnlocked = firstNpcId <= maxUnlocked;

                    const eraNumStr = `Era ${era.id < 10 ? '0' + era.id : era.id}`;

                    html += `<option value="${era.id}" ${era.id === this.activeEraId ? 'selected' : ''} ${!isUnlocked ? 'disabled' : ''}>
                        ${eraNumStr}${!isUnlocked ? ' 🔒' : ''}
                    </option>`;
                });
                selectEl.innerHTML = html;
                selectEl.value = String(this.activeEraId);
            }

            if (this.carouselBar) {
                let html = '';
                eras.forEach(era => {
                    const npcsInEra = (window.AdventureData && typeof window.AdventureData.getNpcsByEra === 'function')
                        ? window.AdventureData.getNpcsByEra(era.id)
                        : [];
                    const firstNpc = npcsInEra[0];
                    const firstNpcId = firstNpc ? firstNpc.id : 1;
                    const isUnlocked = firstNpcId <= maxUnlocked;

                    const eraNumStr = `Era ${era.id < 10 ? '0' + era.id : era.id}`;
                    const isActive = (era.id === this.activeEraId);

                    let btnClass = 'era-tab-btn';
                    if (isActive) btnClass += ' active';
                    if (!isUnlocked) btnClass += ' locked';

                    html += `
                        <button class="${btnClass}" onclick="${isUnlocked ? `window.AdventureMap.selectEra(${era.id})` : ''}" title="${era.title} (${era.levelRange})">
                            <span>${eraNumStr}</span>
                            ${!isUnlocked ? '<span style="font-size:9px;">🔒</span>' : ''}
                        </button>
                    `;
                });
                this.carouselBar.innerHTML = html;
            }
        }

        /**
         * Cambia a la Era seleccionada y muestra su mapa temático en pantalla completa
         */
        selectEra(eraId) {
            const id = parseInt(eraId, 10) || 1;
            this.activeEraId = id;

            if (window.SoundManager && typeof window.SoundManager.playSFX === 'function') {
                try { window.SoundManager.playSFX('button'); } catch(e){}
            }

            if (window.AdventureView && typeof window.AdventureView.selectChapter === 'function') {
                window.AdventureView.selectChapter(id, false);
            }

            const selectEl = document.getElementById('era-select-dropdown');
            if (selectEl && selectEl.value !== String(id)) {
                selectEl.value = String(id);
            }

            this.closeFloatingCard();
            this.renderErasCarousel();
            this.renderEraMap(id);
        }

        /**
         * Renderiza el mapa dedicado que se ajusta a la pantalla con sus duelistas
         */
        renderEraMap(eraId) {
            const era = (window.AdventureData && typeof window.AdventureData.getEraById === 'function')
                ? window.AdventureData.getEraById(eraId)
                : null;

            if (!era) return;

            // 1. Actualizar el Banner HUD de la Era
            const badgeEl = document.getElementById('era-hud-badge');
            const titleEl = document.getElementById('era-hud-title');
            const subtitleEl = document.getElementById('era-hud-subtitle');
            const rangeEl = document.getElementById('era-hud-range');
            const packEl = document.getElementById('era-hud-pack');

            if (badgeEl) badgeEl.textContent = `ERA ${String(era.id).padStart(2, '0')}`;
            if (titleEl) titleEl.textContent = era.title;
            if (subtitleEl) subtitleEl.textContent = era.subtitle || era.desc;
            if (rangeEl) rangeEl.textContent = era.levelRange;
            if (packEl) packEl.textContent = `Sobre ${era.assignedPack}`;

            // 2. Cambiar la ambientación visual de fondo
            if (this.backdropEl) {
                this.backdropEl.className = `era-map-backdrop ${era.bgTheme || 'era-bg-domino'}`;
            }

            // 3. Renderizar los 5 duelistas de la Era en sus locaciones
            if (!this.nodesLayer) return;

            const npcs = (window.AdventureData && typeof window.AdventureData.getNpcsByEra === 'function')
                ? window.AdventureData.getNpcsByEra(eraId)
                : [];

            const maxUnlocked = (this.adventureState && this.adventureState.maxNpcUnlocked) || 1;
            const records = (this.adventureState && this.adventureState.records) || {};
            const playerLevel = (this.adventureState && this.adventureState.playerLevel) || (window.Session && window.Session.getUser() ? (window.Session.getUser().nivel || window.Session.getUser().Nivel || 1) : 1);

            let html = '';

            npcs.forEach(npc => {
                const isProgressionUnlocked = npc.id <= maxUnlocked;
                const hasRequiredLevel = playerLevel >= npc.level;
                const canChallenge = isProgressionUnlocked && hasRequiredLevel;
                const isBoss = !!npc.isBoss;
                const record = records[npc.id] || { wins: 0, losses: 0 };
                const isDefeated = record.wins > 0;
                const isCurrent = (npc.id === maxUnlocked && !isDefeated);
                const isSelected = (this.selectedNpcId === npc.id);

                let nodeClass = 'era-node-wrapper';
                if (!isProgressionUnlocked) nodeClass += ' locked';
                else if (!hasRequiredLevel) nodeClass += ' level-locked';
                if (isDefeated) nodeClass += ' defeated';
                if (isCurrent && hasRequiredLevel) nodeClass += ' current-target';
                if (isBoss) nodeClass += ' boss-node';
                if (isSelected) nodeClass += ' selected';

                const portraitFile = npc.portrait || npc.portraitCode || npc.PortraitCode || 'yugi_muto';
                const avatarSrc = `/assets/images/characters/${portraitFile}.png`;
                const posX = npc.locX || 50;
                const posY = npc.locY || 50;

                html += `
                    <div class="${nodeClass}" id="era-node-${npc.id}" style="left: ${posX}%; top: ${posY}%;" onclick="window.AdventureMap.selectNpc(${npc.id})">
                        ${isCurrent && hasRequiredLevel ? '<div class="rpg-target-beacon"><span class="beacon-text">¡TU DESAFÍO!</span><span class="beacon-arrow">▼</span></div>' : ''}
                        
                        <!-- Placa de la Locación en el Mapa -->
                        <div class="node-location-tag">
                            ${npc.locationName || 'Zona de Duelo'}
                        </div>

                        <!-- Pedestal Isométrico de Energía con Avatar -->
                        <div class="rpg-node-pedestal" style="width:46px; height:46px; max-width:46px; max-height:46px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; position:relative;">
                            <div class="rpg-avatar-circle" style="width:40px; height:40px; max-width:40px; max-height:40px; border-radius:50%; overflow:hidden; display:flex; align-items:center; justify-content:center; flex-shrink:0; position:relative;">
                                <img src="${avatarSrc}" onerror="this.onerror=null; this.src='/assets/images/characters/yugi_muto.png'" alt="${npc.name}" class="rpg-avatar-img" style="width:100% !important; height:100% !important; max-width:100% !important; max-height:100% !important; object-fit:cover !important; border-radius:50% !important; display:block !important;">
                                
                                ${isDefeated ? '<div class="rpg-badge-check">✓</div>' : ''}
                                ${!isProgressionUnlocked ? '<div class="rpg-badge-lock" title="Bloqueado por campaña">🔒</div>' : (!hasRequiredLevel ? '<div class="rpg-badge-lock" style="background:#ef4444; border-color:#991b1b; color:#fff;" title="Requiere Nivel ' + npc.level + ' (Tu nivel: ' + playerLevel + ')">🔒</div>' : '')}
                                ${isBoss ? '<div class="rpg-badge-crown">👑</div>' : ''}
                            </div>
                        </div>

                        <!-- Placa de Nivel y Nombre -->
                        <div class="rpg-node-plaque ${isBoss ? 'boss-plaque' : ''}">
                            <span class="plaque-lvl" style="${isProgressionUnlocked && !hasRequiredLevel ? 'color:#ff6b81; border-color:#ef4444; background:rgba(239,68,68,0.25);' : ''}">NV. ${npc.level}</span>
                            <span class="plaque-name">${npc.name.split(' ')[0]}</span>
                        </div>
                    </div>
                `;
            });

            this.nodesLayer.innerHTML = html;
        }

        /**
         * Selecciona un NPC y muestra su tarjeta emergente de desafío
         */
        selectNpc(npcId) {
            const id = parseInt(npcId, 10);
            this.selectedNpcId = id;

            if (window.SoundManager && typeof window.SoundManager.playSFX === 'function') {
                try { window.SoundManager.playSFX('button'); } catch(e){}
            }

            document.querySelectorAll('.era-node-wrapper').forEach(el => el.classList.remove('selected'));
            const activeNode = document.getElementById(`era-node-${id}`);
            if (activeNode) activeNode.classList.add('selected');

            this.showFloatingCard(id);
        }

        showFloatingCard(npcId) {
            if (!this.cardEl) return;

            const npc = (window.AdventureData && typeof window.AdventureData.getNpcById === 'function')
                ? window.AdventureData.getNpcById(npcId)
                : null;

            if (!npc) return;

            const maxUnlocked = (this.adventureState && this.adventureState.maxNpcUnlocked) || 1;
            const playerLevel = (this.adventureState && this.adventureState.playerLevel) || (window.Session && window.Session.getUser() ? (window.Session.getUser().nivel || window.Session.getUser().Nivel || 1) : 1);
            const isProgressionUnlocked = npc.id <= maxUnlocked;
            const hasRequiredLevel = playerLevel >= npc.level;
            const canChallenge = isProgressionUnlocked && hasRequiredLevel;
            const isBoss = !!npc.isBoss;
            const record = (this.adventureState && this.adventureState.records && this.adventureState.records[npc.id]) || { wins: 0, losses: 0, bestTurns: 999 };
            const isDefeated = record.wins > 0;
            const assignedPack = (this.adventureState && this.adventureState.packAssignments && this.adventureState.packAssignments[npc.id]) || npc.assignedPackId || 'LOB';

            const medal = (window.AdventureData && typeof window.AdventureData.getMedalByNpcId === 'function')
                ? window.AdventureData.getMedalByNpcId(npc.id)
                : null;

            let boosterText = '';
            if (medal) {
                if (medal.boosterType === 'exp') boosterText = `+${medal.boosterValue}% EXP`;
                else if (medal.boosterType === 'starships') boosterText = `+${medal.boosterValue}% StarShips`;
                else if (medal.boosterType === 'luck') boosterText = `+${medal.boosterValue}% Suerte`;
            }

            let statusLabel = 'BLOQUEADO';
            let statusClass = 'locked';
            if (isDefeated) {
                statusLabel = '✓ VENCIDO';
                statusClass = 'defeated';
            } else if (canChallenge) {
                statusLabel = 'DISPONIBLE';
                statusClass = 'current';
            } else if (isProgressionUnlocked && !hasRequiredLevel) {
                statusLabel = `REQ. NV. ${npc.level}`;
                statusClass = 'locked';
            }

            const portraitFile = npc.portrait || npc.portraitCode || npc.PortraitCode || 'yugi_muto';
            const avatarSrc = `/assets/images/characters/${portraitFile}.png`;

            this.cardEl.innerHTML = `
                <div class="fc-header">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span class="fc-badge-lvl ${isBoss ? 'boss' : ''}">${isBoss ? '👑 JEFE ' : ''}NV. ${npc.level}</span>
                        <span class="fc-status-badge ${statusClass}">
                            ${statusLabel}
                        </span>
                    </div>
                    <button class="fc-close-btn" onclick="window.AdventureMap.closeFloatingCard()">✕</button>
                </div>

                <div class="fc-hero">
                    <div class="fc-avatar-frame ${isBoss ? 'boss-frame' : ''}">
                        <img src="${avatarSrc}" onerror="this.onerror=null; this.src='/assets/images/characters/yugi_muto.png'" alt="${npc.name}" class="fc-avatar-img">
                    </div>
                    <div class="fc-info">
                        <div class="fc-npc-name">${npc.name}</div>
                        <div class="fc-chapter-name">📍 ${npc.locationName || 'Ciudad Domino'}</div>
                        <div class="fc-quote">"${npc.quote || '¡Probemos tus habilidades en el campo!'}"</div>
                    </div>
                </div>

                <div class="fc-details-grid">
                    <div class="fc-detail-item">
                        <span class="fc-lbl">Drop de Cartas:</span>
                        <span class="fc-val highlight">Sobre ${assignedPack}</span>
                    </div>
                    ${medal ? `
                        <div class="fc-detail-item">
                            <span class="fc-lbl">Medalla OCG:</span>
                            <span class="fc-val medal">${boosterText}</span>
                        </div>
                    ` : ''}
                    <div class="fc-detail-item" style="grid-column: 1 / -1;">
                        <span class="fc-lbl">Estrategia / Mazo Temático:</span>
                        <span class="fc-val">${npc.keyCards || 'Mazo Balanceado'}</span>
                    </div>
                </div>

                ${canChallenge ? `
                    <div class="fc-records-row">
                        <span>Victorias: <b style="color:#10b981;">${record.wins}</b></span>
                        <span>Derrotas: <b style="color:#ef4444;">${record.losses}</b></span>
                        <span>Mejor: <b style="color:#00f0ff;">${record.bestTurns < 900 ? record.bestTurns + 'T' : '—'}</b></span>
                    </div>

                    <a href="/views/duels/npc/duel-npc.html?npcId=${npc.id}" class="fc-btn-duel ${isDefeated ? 'retry' : 'active'}" onclick="if(window.SoundManager && window.SoundManager.playSFX) window.SoundManager.playSFX('duel_start');">
                        <span>${isDefeated ? 'REINTENTAR DUELO' : 'ENTRAR AL DUELO'} (NV. ${npc.level})</span>
                    </a>
                ` : (!isProgressionUnlocked ? `
                    <div class="fc-locked-msg">
                        🔒 Vence al duelista anterior para desbloquear esta locación
                    </div>
                    <button class="fc-btn-duel locked" disabled>
                        <span>DUELISTA BLOQUEADO</span>
                    </button>
                ` : `
                    <div class="fc-locked-msg" style="color:#fca5a5; border-color:rgba(239,68,68,0.4); background:rgba(239,68,68,0.12);">
                        🔒 Requiere Nivel ${npc.level} para retar a este duelista (Tu Nivel: ${playerLevel}). ¡Gana duelos previos para subir de nivel!
                    </div>
                    <button class="fc-btn-duel locked" disabled style="background:linear-gradient(135deg, rgba(239,68,68,0.25), rgba(185,28,28,0.45)); border-color:#ef4444; color:#fecaca;">
                        <span>🔒 REQUIERE NIVEL ${npc.level}</span>
                    </button>
                `)}
            `;

            this.cardEl.style.display = 'block';
            this.cardEl.classList.add('active');
        }

        closeFloatingCard() {
            if (this.cardEl) {
                this.cardEl.classList.remove('active');
                setTimeout(() => {
                    if (this.cardEl && !this.cardEl.classList.contains('active')) {
                        this.cardEl.style.display = 'none';
                    }
                }, 180);
            }
            this.selectedNpcId = null;
            document.querySelectorAll('.era-node-wrapper').forEach(el => el.classList.remove('selected'));
        }
    }

    window.AdventureMap = new AdventureMapEngine();

})(window);
