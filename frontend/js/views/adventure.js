/**
 * Ani-Dimension: Controlador del Modo Aventura / Multiverso OCG (12 Eras • 60 NPCs)
 * Orquestador de 12 Eras del Anime (Yu-Gi-Oh! DM, GX, 5D's) • 60 Medallas OCG
 */

(function(window) {
    let currentChapter = 1;
    let adventureState = {
        maxNpcUnlocked: 1,
        records: {},
        unlockedMedalsCount: 0,
        unlockedMedalIds: [],
        bonuses: { exp: 0, starships: 0, luck: 0 },
        packAssignments: {}
    };

    let activeMedalFilter = 'all';

    async function initAdventure() {
        if (window.Session && !window.Session.isLoggedIn()) {
            window.Session.saveUser({ id: 999, username: 'Admin', role: 'admin' });
        }

        const user = window.Session ? window.Session.getUser() : null;
        const userId = user ? (user.id || 999) : 999;

        // Iniciar música de menú de aventura
        if (window.SoundManager && typeof window.SoundManager.playBGM === 'function') {
            window.SoundManager.playBGM('menu', true);
        }

        // Cargar catálogo de Aventura desde SQL Server
        if (window.AdventureData && typeof window.AdventureData.syncFromServer === 'function') {
            await window.AdventureData.syncFromServer();
        }

        // Cargar estado de la base de datos
        await fetchAdventureState(userId);

        // Inicializar Motor del Multiverso
        if (window.AdventureMap && typeof window.AdventureMap.init === 'function') {
            window.AdventureMap.init(adventureState);
        }

        // Renderizar componentes
        renderHeaderStats();
        renderChapterTabs();
        renderNpcsList();
        setupEventListeners();
    }

    async function fetchAdventureState(userId) {
        const user = window.Session ? window.Session.getUser() : null;
        const isAdmin = user && (user.isAdmin || user.role === 'admin' || user.id === 999);
        const allNpcs = (window.AdventureData && window.AdventureData.NPCS) ? window.AdventureData.NPCS : [];
        const totalNpcs = allNpcs.length || 109;

        try {
            const res = await fetch(`/api/adventure/state?userId=${userId}`);
            const data = await res.json();
            if (data && data.success) {
                adventureState = data;
                const sessUser = window.Session ? window.Session.getUser() : null;
                adventureState.playerLevel = data.playerLevel || (sessUser ? (sessUser.nivel || sessUser.Nivel || 1) : 1);
            }
        } catch (err) {
            console.warn('[ADVENTURE] Error al conectar con servidor, usando respaldo local:', err);
            const sessUser = window.Session ? window.Session.getUser() : null;
            adventureState = {
                maxNpcUnlocked: 1,
                playerLevel: sessUser ? (sessUser.nivel || sessUser.Nivel || 1) : 1,
                records: {},
                unlockedMedalsCount: 0,
                unlockedMedalIds: [],
                bonuses: { exp: 0, starships: 0, luck: 0 },
                packAssignments: {}
            };
        }
    }

    function renderHeaderStats() {
        const npcsEl = document.getElementById('stat-unlocked-npcs');
        const erasEl = document.getElementById('stat-unlocked-eras');
        const medalsEl = document.getElementById('stat-medals-count');
        const expEl = document.getElementById('stat-exp-bonus');
        const stEl = document.getElementById('stat-st-bonus');
        const luckEl = document.getElementById('stat-luck-bonus');

        const allNpcs = (window.AdventureData && window.AdventureData.NPCS) ? window.AdventureData.NPCS : [];
        const allEras = (window.AdventureData && window.AdventureData.ERAS) ? window.AdventureData.ERAS : [];
        const totalNpcs = allNpcs.length || 72;
        const totalEras = allEras.length || 12;

        const maxUnlocked = adventureState.maxNpcUnlocked || 1;
        let unlockedErasCount = 0;
        allEras.forEach(era => {
            const npcs = (window.AdventureData && typeof window.AdventureData.getNpcsByEra === 'function')
                ? window.AdventureData.getNpcsByEra(era.id)
                : [];
            if (npcs.length > 0 && npcs[0].id <= maxUnlocked) {
                unlockedErasCount++;
            }
        });

        const subTitleEl = document.getElementById('adventure-subtitle-text');
        if (subTitleEl) subTitleEl.textContent = `MULTIVERSO DEL ANIME • ${totalEras} ERAS • ${totalNpcs} DUELISTAS`;

        if (npcsEl) npcsEl.textContent = `${Math.min(totalNpcs, maxUnlocked)} / ${totalNpcs}`;
        if (erasEl) erasEl.textContent = `${unlockedErasCount} / ${totalEras}`;
        if (medalsEl) medalsEl.textContent = `${adventureState.unlockedMedalsCount || 0} / ${totalNpcs}`;
        if (expEl) expEl.textContent = `+${adventureState.bonuses.exp || 0}%`;
        if (stEl) stEl.textContent = `+${adventureState.bonuses.starships || 0}%`;
        if (luckEl) luckEl.textContent = `+${adventureState.bonuses.luck || 0}%`;
    }

    function renderChapterTabs() {
        const container = document.getElementById('chapters-nav-bar');
        if (!container) return;

        const eras = (window.AdventureData && window.AdventureData.ERAS) ? window.AdventureData.ERAS : [];

        let html = '';
        eras.forEach(era => {
            const isActive = era.id === currentChapter;
            const npcsInEra = (window.AdventureData && typeof window.AdventureData.getNpcsByEra === 'function')
                ? window.AdventureData.getNpcsByEra(era.id)
                : [];
            let defeatedInEra = 0;

            npcsInEra.forEach(n => {
                if (adventureState.records && adventureState.records[n.id] && adventureState.records[n.id].wins > 0) {
                    defeatedInEra++;
                }
            });

            const totalInEra = npcsInEra.length;
            const isCompleted = (totalInEra > 0 && defeatedInEra === totalInEra);

            html += `
                <div class="chapter-tab ${isActive ? 'active' : ''}" onclick="window.AdventureView.selectChapter(${era.id})">
                    <div class="chapter-tab-num">
                        <span>ERA ${era.id}</span>
                        <span style="font-size:9.5px; color:${isCompleted ? '#10b981' : '#00f0ff'};">${defeatedInEra}/${totalInEra} ⚔️</span>
                    </div>
                    <div class="chapter-tab-title">${era.title}</div>
                    <div class="chapter-tab-range">${era.levelRange}</div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    function renderNpcsList() {
        const container = document.getElementById('npcs-adventure-grid');
        if (!container) return;

        const npcs = (window.AdventureData && typeof window.AdventureData.getNpcsByEra === 'function')
            ? window.AdventureData.getNpcsByEra(currentChapter)
            : [];

        if (npcs.length === 0) {
            container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:#94a3b8;">No se encontraron duelistas para esta era.</div>`;
            return;
        }

        const maxUnlocked = adventureState.maxNpcUnlocked || 1;

        let html = '';
        npcs.forEach(npc => {
            const isUnlocked = npc.id <= maxUnlocked;
            const isBoss = (npc.id % 5 === 0);
            const record = (adventureState.records && adventureState.records[npc.id]) || { wins: 0, losses: 0, bestTurns: 999 };
            const isDefeated = record.wins > 0;

            const assignedPack = (adventureState.packAssignments && adventureState.packAssignments[npc.id]) || npc.assignedPackId || 'LOB';

            const medal = (window.AdventureData && typeof window.AdventureData.getMedalByNpcId === 'function')
                ? window.AdventureData.getMedalByNpcId(npc.id)
                : null;

            let boosterText = '';
            if (medal) {
                if (medal.boosterType === 'exp') boosterText = `+${medal.boosterValue}% ⚡ EXP`;
                else if (medal.boosterType === 'starships') boosterText = `+${medal.boosterValue}% ⭐ StarShips`;
                else if (medal.boosterType === 'luck') boosterText = `+${medal.boosterValue}% 🍀 Suerte`;
            }

            let cardClass = 'npc-adv-card';
            if (!isUnlocked) cardClass += ' locked';
            if (isDefeated) cardClass += ' defeated';
            if (isBoss) cardClass += ' boss-card';

            html += `
                <div class="${cardClass}">
                    <div>
                        <div class="npc-card-header">
                            <div class="npc-level-badge ${isBoss ? 'boss' : ''}">
                                ${isBoss ? '👑 JEFE ' : ''}NV. ${npc.level}
                            </div>
                            <div class="npc-status-badge ${isDefeated ? 'defeated' : (isUnlocked ? 'current' : 'locked')}">
                                ${isDefeated ? '✓ VENCIDO' : (isUnlocked ? '⚔️ DESBLOQUEADO' : '🔒 BLOQUEADO')}
                            </div>
                        </div>

                        <div class="npc-card-body">
                            <div class="npc-avatar-frame" style="border-color:${isBoss ? '#ffd700' : (isUnlocked ? '#00f0ff' : 'rgba(255,255,255,0.2)')};">
                                <img src="/assets/images/characters/${npc.portrait || npc.portraitCode || npc.PortraitCode || 'yugi_muto'}.png" onerror="this.onerror=null; this.src='/assets/images/characters/yugi_muto.png'" alt="${npc.name}" class="npc-avatar-img">
                            </div>
                            <div class="npc-details-box">
                                <h3 class="npc-name">${npc.id}. ${npc.name}</h3>
                                <div class="npc-quote">"${npc.quote || '¡Probemos tus habilidades en el campo!'}"</div>
                                <div class="npc-key-cards"><b>Estrategia:</b> ${npc.keyCards || 'Mazo Balanceado'}</div>
                            </div>
                        </div>

                        <div class="npc-rewards-preview">
                            <div class="reward-pill">
                                <span class="reward-pill-label">DROP:</span>
                                <span class="reward-pill-val">Sobre ${assignedPack}</span>
                            </div>
                            ${medal ? `
                                <div class="reward-pill medal">
                                    <span class="reward-pill-label">MEDALLA:</span>
                                    <span class="reward-pill-val" style="color:#ffd700;">${boosterText}</span>
                                </div>
                            ` : ''}
                        </div>

                        <div class="npc-stats-row">
                            <span>Victorias: <b style="color:#10b981;">${record.wins}</b></span>
                            <span>Derrotas: <b style="color:#ef4444;">${record.losses}</b></span>
                            <span>Mejor récord: <b style="color:#00f0ff;">${record.bestTurns < 900 ? record.bestTurns + ' Turnos' : '—'}</b></span>
                        </div>
                    </div>

                    <div>
                        ${isUnlocked ? `
                            <a href="/views/duels/npc/duel-npc.html?npcId=${npc.id}" class="btn-start-duel ${isDefeated ? 'retry' : ''}" onclick="if(window.SoundManager) window.SoundManager.playSFX('duel_start');">
                                <span>${isDefeated ? 'REINTENTAR DUELO' : 'INICIAR DUELO'}</span>
                            </a>
                        ` : `
                            <button class="btn-start-duel locked" disabled>
                                <span>🔒 VENCE AL ANTERIOR</span>
                            </button>
                        `}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    let currentViewMode = 'map';

    function selectChapter(chapterNum, syncMap = true) {
        if (window.SoundManager && typeof window.SoundManager.playSFX === 'function') {
            try { window.SoundManager.playSFX('button'); } catch(e){}
        }
        currentChapter = parseInt(chapterNum, 10) || 1;
        renderChapterTabs();
        renderNpcsList();

        const selectEl = document.getElementById('era-select-dropdown');
        if (selectEl && selectEl.value !== String(currentChapter)) {
            selectEl.value = String(currentChapter);
        }

        if (syncMap && window.AdventureMap && window.AdventureMap.activeEraId !== currentChapter) {
            window.AdventureMap.selectEra(currentChapter);
        }
    }

    function toggleView() {
        if (window.SoundManager && typeof window.SoundManager.playSFX === 'function') {
            try { window.SoundManager.playSFX('button'); } catch(e){}
        }
        const newMode = (currentViewMode === 'map') ? 'list' : 'map';
        switchViewMode(newMode);
    }

    function switchViewMode(mode) {
        currentViewMode = mode;
        const btnToggleText = document.getElementById('btn-toggle-view-text');
        const btnToggle = document.getElementById('btn-toggle-list-view');
        const mapStageEl = document.getElementById('era-screen-map-stage');
        const listEl = document.getElementById('adventure-list-container');

        if (mode === 'map') {
            if (btnToggleText) btnToggleText.textContent = 'LISTA';
            if (btnToggle) btnToggle.classList.remove('active');
            if (listEl) listEl.style.display = 'none';
            if (mapStageEl) mapStageEl.style.display = 'flex';
        } else {
            if (btnToggleText) btnToggleText.textContent = 'MAPA';
            if (btnToggle) btnToggle.classList.add('active');
            if (mapStageEl) mapStageEl.style.display = 'none';
            if (listEl) listEl.style.display = 'flex';
            renderChapterTabs();
            renderNpcsList();
        }
    }

    function openMedalsModal() {
        if (window.SoundManager) window.SoundManager.playSFX('button');
        const modal = document.getElementById('medals-showcase-modal');
        if (modal) {
            modal.style.display = 'flex';
            renderMedalsShowcase();
        }
    }

    function closeMedalsModal() {
        if (window.SoundManager) window.SoundManager.playSFX('button');
        const modal = document.getElementById('medals-showcase-modal');
        if (modal) modal.style.display = 'none';
    }

    function filterMedals(type) {
        if (window.SoundManager) window.SoundManager.playSFX('button');
        activeMedalFilter = type || 'all';

        document.querySelectorAll('.medal-filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-type') === activeMedalFilter);
        });

        renderMedalsShowcase();
    }

    function renderMedalsShowcase() {
        const container = document.getElementById('medals-showcase-grid');
        if (!container) return;

        const allMedals = (window.AdventureData && window.AdventureData.MEDALS) ? window.AdventureData.MEDALS : [];
        const unlockedIds = new Set(adventureState.unlockedMedalIds || []);

        let filtered = allMedals;
        if (activeMedalFilter !== 'all') {
            filtered = allMedals.filter(m => m.boosterType === activeMedalFilter);
        }

        let html = '';
        filtered.forEach(m => {
            const isUnlocked = unlockedIds.has(m.id);
            const npc = (window.AdventureData && typeof window.AdventureData.getNpcById === 'function')
                ? window.AdventureData.getNpcById(m.npcId)
                : null;

            let boosterBadge = '';
            if (m.boosterType === 'exp') boosterBadge = `<span style="color:#00f0ff; font-weight:800;">+${m.boosterValue}% EXP</span>`;
            else if (m.boosterType === 'starships') boosterBadge = `<span style="color:#ffd700; font-weight:800;">+${m.boosterValue}% StarShips</span>`;
            else if (m.boosterType === 'luck') boosterBadge = `<span style="color:#10b981; font-weight:800;">+${m.boosterValue}% Suerte</span>`;

            html += `
                <div class="medal-slot-card ${isUnlocked ? 'unlocked' : 'locked'}">
                    <div class="medal-slot-icon">${isUnlocked ? m.icon : '🔒'}</div>
                    <div class="medal-slot-name">${m.name}</div>
                    <div class="medal-slot-booster">${isUnlocked ? boosterBadge : '<span style="color:#64748b;">Bloqueada</span>'}</div>
                    <div class="medal-slot-req">${npc ? `Derrota a ${npc.name.split(' ')[0]} (Nv. ${npc.level})` : 'Requisito OCG'}</div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    function setupEventListeners() {
        // Atajos de teclado si aplica
    }

    window.AdventureView = {
        init: initAdventure,
        selectChapter,
        openMedalsModal,
        closeMedalsModal,
        filterMedals
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAdventure);
    } else {
        initAdventure();
    }

})(window);
