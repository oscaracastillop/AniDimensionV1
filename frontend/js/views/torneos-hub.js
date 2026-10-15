/**
 * Ani-Dimension: Hub de Torneos OCG para Jugadores & Espectadores (Salón de la Fama & Activos)
 */

let playerTournaments = [];
let currentViewingTournament = null;
let activeUser = null;
let currentHubTab = 'ACTIVE';

document.addEventListener('DOMContentLoaded', () => {
    if (window.Session && !window.Session.requireAuth('/views/login/login.html')) return;
    activeUser = window.Session ? window.Session.getUser() : null;

    if (window.AppNavbar) {
        window.AppNavbar.init('eventos');
    }

    updateUserStarsDisplay();
    initPlayerTournamentsHub();
});

function initPlayerTournamentsHub() {
    loadPlayerTournaments();

    // Sincronización en vivo con WebSockets
    const socket = window.getSocket ? window.getSocket() : (window.socket || (typeof io !== 'undefined' ? io() : null));
    if (socket) {
        socket.on('TOURNAMENT_UPDATED', (data) => {
            console.log('[SOCKET TOURNAMENT_UPDATED]', data);
            loadPlayerTournaments();
            if (currentViewingTournament && data && data.torneoId === currentViewingTournament.Id) {
                viewPlayerBracket(currentViewingTournament.Id);
            }
        });
    }
}

async function updateUserStarsDisplay() {
    if (!activeUser) return;
    try {
        const res = await fetch(`/api/user/profile?username=${activeUser.username}`);
        const data = await res.json();
        if (data.success && data.user) {
            const starsBadge = document.getElementById('user-stars-badge');
            if (starsBadge) {
                starsBadge.textContent = `⭐ ${(data.user.Starships || 0).toLocaleString()} ★`;
            }
        }
    } catch (e) {}
}

async function loadPlayerTournaments() {
    try {
        const res = await fetch('/api/tournaments');
        const data = await res.json();
        if (data.success) {
            playerTournaments = data.tournaments || [];
            renderPlayerTournamentsGrid();
        }
    } catch (err) {
        console.error('[LOAD PLAYER TOURNAMENTS ERROR]', err);
    }
}

function setPlayerHubTab(tabType, btnElement) {
    currentHubTab = tabType;
    document.querySelectorAll('.hub-tab-btn').forEach(b => b.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    const heading = document.getElementById('player-tab-heading');
    if (heading) {
        if (tabType === 'HALL_OF_FAME') {
            heading.textContent = '🏛️ SALÓN DE LA FAMA & COPAS HISTÓRICAS';
        } else {
            heading.textContent = '🏆 TORNEOS ACTIVOS & INSCRIPCIONES';
        }
    }

    renderPlayerTournamentsGrid();
}

async function renderPlayerTournamentsGrid() {
    const container = document.getElementById('player-tournaments-grid');
    const counter = document.getElementById('torneos-player-counter');
    if (!container) return;

    let filtered = playerTournaments.filter(t => {
        if (currentHubTab === 'ACTIVE') return t.Estado === 'EN_CURSO' || t.Estado === 'REGISTRO';
        if (currentHubTab === 'HALL_OF_FAME') return t.Estado === 'FINALIZADO';
        return true;
    });

    if (counter) {
        counter.textContent = `${filtered.length} torneo(s) en esta categoría`;
    }

    if (filtered.length === 0) {
        const isHall = currentHubTab === 'HALL_OF_FAME';
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align:center; padding:50px 20px; background:rgba(15,23,42,0.6); border:1px dashed rgba(0,240,255,0.25);">
                <div style="font-size:36px; margin-bottom:10px;">${isHall ? '🏛️' : '🏆'}</div>
                <div style="font-family:'Orbitron', sans-serif; font-size:14px; font-weight:700; color:#00f0ff; margin-bottom:6px;">
                    ${isHall ? 'AÚN NO HAY TORNEOS FINALIZADOS EN EL SALÓN DE LA FAMA' : 'NO HAY TORNEOS ACTIVOS EN ESTE MOMENTO'}
                </div>
                <div style="font-size:12px; color:#94a3b8;">
                    ${isHall ? 'Los torneos que concluyan su Gran Final quedarán inmortalizados aquí con sus Campeones y llaves históricas.' : 'La administración publicará nuevas copas oficiales pronto.'}
                </div>
            </div>
        `;
        return;
    }

    const myUsername = activeUser ? activeUser.username.toLowerCase() : '';

    const cardsHtml = await Promise.all(filtered.map(async (t) => {
        const inscritos = t.TotalInscritos || 0;
        const max = t.MaxParticipantes || 8;
        const estado = t.Estado || 'REGISTRO';
        const estadoClass = `status-${estado.toLowerCase()}`;
        const estadoLabel = estado === 'EN_CURSO' ? '🔥 EN CURSO' : (estado === 'REGISTRO' ? '📝 INSCRIPCIONES ABIERTAS' : '🏆 FINALIZADO');

        const isHallOfFame = estado === 'FINALIZADO';

        // Formato Legible
        const formatoStr = t.Formato === 'BO3' 
            ? 'Ida y Vuelta (BO3)' 
            : (t.Formato === 'DOBLE_ELIMINACION' ? 'Doble Eliminación' : (t.Formato === 'SUIZO' ? 'Fase Suiza' : 'Eliminación Directa (BO1)'));

        // Verificar si el usuario está inscrito
        let isUserRegistered = false;
        try {
            const detailRes = await fetch(`/api/tournaments/${t.Id}`);
            const detailData = await detailRes.json();
            if (detailData.success && detailData.participantes) {
                isUserRegistered = detailData.participantes.some(p => p.Username && p.Username.toLowerCase() === myUsername);
            }
        } catch (e) {}

        // Podio Campeón en Salón de la Fama
        let championPodiumHtml = '';
        if (t.CampeonUsername) {
            championPodiumHtml = `
                <div style="background:rgba(255,215,0,0.12); border:1.2px solid #ffd700; color:#ffd700; padding:10px 12px; font-family:'Orbitron', sans-serif; font-size:11px; font-weight:800; border-radius:4px; display:flex; flex-direction:column; gap:4px; box-shadow:0 0 16px rgba(255,215,0,0.2);">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:16px;">👑</span>
                        <div>
                            <div style="font-size:9px; color:#ffd700; letter-spacing:0.5px;">CAMPEÓN SUPREMO:</div>
                            <div style="color:#fff; font-size:13px;">${t.CampeonUsername}</div>
                        </div>
                    </div>
                    ${t.SubcampeonUsername ? `<div style="font-size:10px; color:#94a3b8; margin-top:2px;">🥈 Subcampeón: <b style="color:#cbd5e1;">${t.SubcampeonUsername}</b></div>` : ''}
                </div>
            `;
        }

        // Cronograma de Horarios de Rondas si existen
        let roundScheduleHtml = '';
        if (t.HorariosRondasJson && estado !== 'FINALIZADO') {
            try {
                const parsed = JSON.parse(t.HorariosRondasJson);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    roundScheduleHtml = `
                        <div style="background:rgba(0,0,0,0.4); border:1px solid rgba(56,189,248,0.25); padding:6px 10px; border-radius:4px; font-size:10px;">
                            <div style="font-family:'Orbitron',sans-serif; color:#38bdf8; font-weight:700; margin-bottom:3px;">📅 CRONOGRAMA DE RONDAS:</div>
                            <div style="display:flex; flex-direction:column; gap:2px; color:#cbd5e1;">
                                ${parsed.map(r => `<div>• <b>${r.nombre}:</b> ${r.fechaHora ? new Date(r.fechaHora).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Por definir'}</div>`).join('')}
                            </div>
                        </div>
                    `;
                }
            } catch (e) {}
        }

        let actionButtons = '';
        if (estado === 'REGISTRO') {
            if (isUserRegistered) {
                actionButtons = `
                    <button onclick="leaveTournament(${t.Id}, '${escapeQuotes(t.Titulo)}')" class="btn-pt-action btn-pt-danger">❌ Cancelar Inscripción</button>
                    <button onclick="viewPlayerBracket(${t.Id})" class="btn-pt-action btn-pt-primary">👥 Ver Inscritos</button>
                `;
            } else {
                const isFull = inscritos >= max;
                actionButtons = `
                    <button onclick="registerForTournament(${t.Id}, '${escapeQuotes(t.Titulo)}', ${t.CostoInscripcion || 0})" class="btn-pt-action btn-pt-primary" ${isFull ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
                        ${isFull ? '⚠️ Cupo Lleno' : '📝 Inscribirme'}
                    </button>
                    <button onclick="viewPlayerBracket(${t.Id})" class="btn-pt-action" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#cbd5e1;">👥 Ver Inscritos</button>
                `;
            }
        } else if (estado === 'EN_CURSO') {
            actionButtons = `
                <button onclick="viewPlayerBracket(${t.Id})" class="btn-pt-action btn-pt-gold" style="flex:2;">🏆 VER ÁRBOL & ESPECTAR DUELOS</button>
            `;
        } else {
            actionButtons = `
                <button onclick="viewPlayerBracket(${t.Id})" class="btn-pt-action btn-pt-primary" style="flex:1;">🏆 VER ÁRBOL HISTÓRICO</button>
            `;
        }

        return `
            <div class="player-tournament-card" style="${isHallOfFame ? 'border-color:rgba(255,215,0,0.45); box-shadow:0 0 20px rgba(255,215,0,0.15);' : ''}">
                <div class="pt-card-header">
                    <img src="${t.BannerUrl || '/assets/images/duels/pvp.jpg'}" alt="${t.Titulo}" class="pt-card-banner" onerror="this.src='/assets/images/duels/pvp.jpg'">
                    <div class="pt-card-overlay"></div>
                    <span class="pt-badge-status ${estadoClass}">${estadoLabel}</span>
                </div>

                <div class="pt-card-body">
                    <div class="pt-card-title">${t.Titulo}</div>

                    <div class="pt-meta-row">
                        <span class="pt-meta-pill">👥 ${inscritos} / ${max} Duelistas</span>
                        <span class="pt-meta-pill">⚔️ ${formatoStr}</span>
                        <span class="pt-meta-pill">⚡ Nv. ${t.NivelMinimo} - ${t.NivelMaximo}</span>
                        <span class="pt-meta-pill">⭐ ${t.CostoInscripcion > 0 ? `${t.CostoInscripcion.toLocaleString()} ★` : 'Gratis'}</span>
                    </div>

                    ${championPodiumHtml}
                    ${roundScheduleHtml}

                    <div>
                        <div style="font-family:'Orbitron', sans-serif; font-size:9.5px; font-weight:700; color:#ffd700; margin-bottom:4px; display:flex; align-items:center; gap:4px;">
                            <span>🎁 RECOMPENSAS & PREMIOS:</span>
                        </div>
                        <div class="pt-prizes-box">${t.TextoPremios || 'Premios no especificados.'}</div>
                    </div>

                    ${t.Descripcion ? `<div style="font-size:11px; color:#94a3b8; line-height:1.4;">${t.Descripcion}</div>` : ''}

                    <div class="pt-card-actions">
                        ${actionButtons}
                    </div>
                </div>
            </div>
        `;
    }));

    container.innerHTML = cardsHtml.join('');
}

async function registerForTournament(torneoId, titulo, costo) {
    if (!activeUser) {
        alert('Debes iniciar sesión para inscribirte.');
        return;
    }

    const confirmMsg = costo > 0
        ? `¿Deseas inscribirte en "${titulo}"?\n\nCosto de inscripción: ${costo.toLocaleString()} ★ Starships.`
        : `¿Deseas inscribirte en "${titulo}"?`;

    if (!confirm(confirmMsg)) return;

    try {
        const res = await fetch(`/api/tournaments/${torneoId}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: activeUser.id,
                username: activeUser.username
            })
        });

        const data = await res.json();
        if (data.success) {
            alert(data.message || '¡Inscripción exitosa!');
            updateUserStarsDisplay();
            loadPlayerTournaments();
        } else {
            alert(`⚠️ ${data.message}`);
        }
    } catch (err) {
        console.error('[REGISTER TOURNAMENT ERROR]', err);
        alert('Error al procesar la inscripción.');
    }
}

async function leaveTournament(torneoId, titulo) {
    if (!confirm(`¿Estás seguro de cancelar tu inscripción en "${titulo}"?\nSi pagaste costo de inscripción, te será reembolsado.`)) {
        return;
    }

    try {
        const res = await fetch(`/api/tournaments/${torneoId}/leave`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: activeUser.id,
                username: activeUser.username
            })
        });

        const data = await res.json();
        if (data.success) {
            alert(data.message);
            updateUserStarsDisplay();
            loadPlayerTournaments();
        } else {
            alert(`⚠️ ${data.message}`);
        }
    } catch (err) {
        console.error('[LEAVE TOURNAMENT ERROR]', err);
        alert('Error al cancelar inscripción.');
    }
}

async function viewPlayerBracket(torneoId) {
    try {
        const res = await fetch(`/api/tournaments/${torneoId}`);
        const data = await res.json();
        if (!data.success) {
            alert('Error al obtener datos del torneo.');
            return;
        }

        currentViewingTournament = data.torneo;
        document.getElementById('player-bracket-title').textContent = `🏆 ${data.torneo.Titulo}`;
        document.getElementById('player-bracket-subtitle').innerHTML = `
            Formato: <b>${data.torneo.MaxParticipantes} Duelistas (${data.torneo.Formato || 'BO1'})</b> • Estado: <b>${data.torneo.Estado}</b> 
            ${data.torneo.CampeonUsername ? `• 👑 Campeón: <b style="color:#ffd700;">${data.torneo.CampeonUsername}</b>` : ''}
        `;

        renderPlayerBracketTree(data.partidas || [], data.participantes || [], data.torneo);
        openModal('modal-player-bracket-viewer');
    } catch (err) {
        console.error('[PLAYER BRACKET VIEW ERROR]', err);
    }
}

function renderPlayerBracketTree(matches, participants, torneo) {
    const canvas = document.getElementById('player-bracket-tree-canvas');
    if (!canvas) return;

    if (matches.length === 0) {
        // Mostrar listado de participantes inscritos
        const participantsList = participants.map(p => `
            <div style="display:flex; align-items:center; gap:8px; padding:8px 12px; background:rgba(255,255,255,0.04); border:1px solid rgba(0,240,255,0.2); border-radius:6px; box-shadow:0 4px 12px rgba(0,0,0,0.3);">
                <img src="/assets/images/avatars/${p.Avatar || 'AVA-001'}.png" onerror="this.onerror=null; this.src='/assets/images/avatars/AVA-001.png';" style="width:28px; height:28px; border-radius:50%; border:1.5px solid #00f0ff; object-fit:cover;">
                <div style="flex:1;">
                    <div style="font-size:12px; font-weight:700; color:#fff;">${escapeHtml(p.Username)}</div>
                    <div style="font-size:9.5px; color:#94a3b8; font-family:'Orbitron',sans-serif;">Nivel ${p.Nivel} • <span style="color:#00f0ff;">Seed #${p.Seed}</span></div>
                </div>
            </div>
        `).join('');

        canvas.innerHTML = `
            <div style="margin:auto; max-width:580px; text-align:center; padding:32px 20px; color:#94a3b8; background:rgba(15,23,42,0.7); border:1.5px dashed rgba(0,240,255,0.3); border-radius:8px;">
                <div style="font-size:36px; margin-bottom:6px;">⚔️</div>
                <div style="font-family:'Orbitron', sans-serif; font-size:14px; font-weight:900; color:#00f0ff; letter-spacing:0.8px;">FASE DE INSCRIPCIONES ABIERTA</div>
                <div style="font-size:11px; margin-top:6px; margin-bottom:18px; color:#cbd5e1;">Duelistas registrados actualmente (${participants.length} / ${torneo.MaxParticipantes || 8}):</div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; text-align:left;">
                    ${participantsList || '<div style="grid-column:1/-1; text-align:center; color:#64748b; padding:15px;">Aún no hay duelistas inscritos. ¡Sé el primero en apuntarte!</div>'}
                </div>
            </div>
        `;
        return;
    }

    const myName = activeUser ? activeUser.username.toLowerCase() : '';

    // Agrupar matches por ronda
    const roundsMap = {};
    matches.forEach(m => {
        if (!roundsMap[m.Ronda]) roundsMap[m.Ronda] = [];
        roundsMap[m.Ronda].push(m);
    });

    const roundNumbers = Object.keys(roundsMap).map(Number).sort((a, b) => a - b);
    const totalRounds = roundNumbers.length;

    let columnsHtml = roundNumbers.map(rNum => {
        const roundMatches = roundsMap[rNum];
        const roundName = roundMatches[0] ? roundMatches[0].RondaNombre : `Ronda ${rNum}`;
        const isFinalRound = (rNum === totalRounds);

        let pairsHtml = '';
        if (roundMatches.length > 1) {
            for (let i = 0; i < roundMatches.length; i += 2) {
                const upperMatch = roundMatches[i];
                const lowerMatch = roundMatches[i + 1] || null;

                const upperWon = upperMatch && upperMatch.Estado === 'FINALIZADA' && upperMatch.GanadorUsername;
                const lowerWon = lowerMatch && lowerMatch.Estado === 'FINALIZADA' && lowerMatch.GanadorUsername;

                pairsHtml += `
                    <div class="bracket-match-cell">
                        <div class="bracket-pair-container">
                            <div class="bracket-match-slot upper ${rNum > 1 ? 'has-incoming' : ''}">
                                ${renderPlayerMatchCardHtml(upperMatch, torneo, myName)}
                            </div>
                            <div class="bracket-connector-fork">
                                <div class="fork-arm-top ${upperWon ? 'arm-winner' : (lowerWon ? 'arm-loser' : '')}"></div>
                                <div class="fork-arm-bottom ${lowerWon ? 'arm-winner' : (upperWon ? 'arm-loser' : '')}"></div>
                                <div class="fork-spine ${upperWon || lowerWon ? 'spine-active' : ''}"></div>
                                <div class="fork-stem ${upperWon || lowerWon ? 'stem-active' : ''}"></div>
                            </div>
                            ${lowerMatch ? `
                                <div class="bracket-match-slot lower ${rNum > 1 ? 'has-incoming' : ''}">
                                    ${renderPlayerMatchCardHtml(lowerMatch, torneo, myName)}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            }
        } else {
            // Ronda Final (1 solo match)
            const finalMatch = roundMatches[0];
            pairsHtml = `
                <div class="bracket-match-cell">
                    <div class="bracket-single-container">
                        <div class="bracket-match-slot final-slot ${rNum > 1 ? 'has-incoming' : ''}">
                            ${renderPlayerMatchCardHtml(finalMatch, torneo, myName)}
                        </div>
                        <div class="bracket-trophy-stem">
                            <div class="trophy-beam"></div>
                            <div class="trophy-arrow">▶</div>
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="bracket-round-col">
                <div class="round-title-bar">
                    <span class="round-tag">FASE ${rNum}</span>
                    <span class="round-title-text">${escapeHtml(roundName)}</span>
                </div>
                <div class="round-matches-body">
                    ${pairsHtml}
                </div>
            </div>
        `;
    }).join('');

    // Columna Final: Trofeo y Podio de Campeón
    const championPodiumHtml = `
        <div class="bracket-podium-col">
            <div class="round-title-bar champion-header">
                <span class="round-tag">OFICIAL</span>
                <span class="round-title-text" style="color:#ffd700;">COPA DE CAMPEÓN</span>
            </div>
            <div class="champion-podium-wrapper">
                ${renderChampionPodiumColumnHtml(torneo)}
            </div>
        </div>
    `;
    columnsHtml += championPodiumHtml;

    canvas.innerHTML = columnsHtml;
}

function renderPlayerMatchCardHtml(m, torneo, myName) {
    const isLive = m.Estado === 'EN_JUEGO';
    const isFinished = m.Estado === 'FINALIZADA';
    const isBye = m.Estado === 'BYE';

    const isP1 = m.Player1Username && m.Player1Username.toLowerCase() === myName;
    const isP2 = m.Player2Username && m.Player2Username.toLowerCase() === myName;
    const isMyMatch = isP1 || isP2;

    const p1IsWinner = isFinished && m.GanadorUsername && m.Player1Username && m.GanadorUsername.toLowerCase() === m.Player1Username.toLowerCase();
    const p2IsWinner = isFinished && m.GanadorUsername && m.Player2Username && m.GanadorUsername.toLowerCase() === m.Player2Username.toLowerCase();

    // Botones de acción
    let actionBtn = '';
    if (isLive) {
        if (isMyMatch) {
            actionBtn = `<a href="/views/duels/pvp/duel-pvp.html?room=${m.RoomId}&tournament=${torneo.Id}&match=${m.Id}" class="btn-pt-action btn-pt-gold" style="height:25px; font-size:9.5px; padding:0 8px; width:100%; border-radius:4px; box-shadow:0 0 10px rgba(255,215,0,0.4);">
                ⚔️ ¡REANUDAR COMBATE!
            </a>`;
        } else {
            actionBtn = `<a href="/views/duels/pvp/duel-pvp.html?room=${m.RoomId}&spectate=1" target="_blank" class="btn-pt-action btn-pt-primary" style="height:25px; font-size:9.5px; padding:0 8px; width:100%; border-radius:4px;">
                👁️ ESPECTAR EN VIVO
            </a>`;
        }
    } else if (!isFinished && !isBye && isMyMatch && m.Player1Username && m.Player2Username) {
        actionBtn = `<a href="/views/duels/pvp/duel-pvp.html?room=${m.RoomId}&tournament=${torneo.Id}&match=${m.Id}" class="btn-pt-action btn-pt-gold" style="height:25px; font-size:9.5px; padding:0 8px; width:100%; border-radius:4px;">
            ⚔️ ¡ENTRAR A MI PARTIDA!
        </a>`;
    }

    const progDateStr = m.FechaHoraProgramada 
        ? `<div style="font-size:8.5px; color:#38bdf8; margin-bottom:2px; font-family:'Orbitron',sans-serif;">📅 ${new Date(m.FechaHoraProgramada).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>`
        : '';

    let statusPillHtml = '';
    if (isLive) {
        statusPillHtml = `<span class="match-status-pill status-pill-live"><span class="live-dot"></span> EN VIVO</span>`;
    } else if (isFinished) {
        statusPillHtml = `<span class="match-status-pill status-pill-finished">✓ FINALIZADA</span>`;
    } else if (isBye) {
        statusPillHtml = `<span class="match-status-pill status-pill-bye">⏩ PASE DIRECTO</span>`;
    } else {
        statusPillHtml = `<span class="match-status-pill status-pill-pending">⏳ PENDIENTE</span>`;
    }

    return `
        <div class="match-node-card ${isLive ? 'live-duel' : ''} ${isMyMatch ? 'my-match' : ''}">
            <div class="match-node-header">
                <span class="match-badge-tag">M#${m.NumeroMatch} • ${escapeHtml(torneo.Formato || 'BO1')}</span>
                ${statusPillHtml}
            </div>

            ${progDateStr}

            <!-- Jugador 1 -->
            <div class="match-player-row ${p1IsWinner ? 'winner-row' : (isFinished && !p1IsWinner && m.Player1Username ? 'loser-row' : '')}">
                <div style="display:flex; align-items:center; min-width:0; flex:1;">
                    <img src="/assets/images/avatars/${m.Player1Avatar || 'AVA-001'}.png" onerror="this.onerror=null; this.src='/assets/images/avatars/AVA-001.png';" class="match-player-avatar ${p1IsWinner ? 'winner-avatar' : ''}">
                    <span class="player-name-text ${isP1 ? 'me-highlight' : ''}">
                        ${m.Player1Username ? `${escapeHtml(m.Player1Username)} ${isP1 ? '(Tú)' : ''}` : '<i style="color:#64748b;">Por definir</i>'}
                    </span>
                </div>
                <span class="player-score-box">${p1IsWinner ? '👑 ' : ''}${m.Player1Score != null ? m.Player1Score : 0}</span>
            </div>

            <!-- Jugador 2 -->
            <div class="match-player-row ${p2IsWinner ? 'winner-row' : (isFinished && !p2IsWinner && m.Player2Username ? 'loser-row' : '')}">
                <div style="display:flex; align-items:center; min-width:0; flex:1;">
                    <img src="/assets/images/avatars/${m.Player2Avatar || 'AVA-002'}.png" onerror="this.onerror=null; this.src='/assets/images/avatars/AVA-002.png';" class="match-player-avatar ${p2IsWinner ? 'winner-avatar' : ''}">
                    <span class="player-name-text ${isP2 ? 'me-highlight' : ''}">
                        ${m.Player2Username ? `${escapeHtml(m.Player2Username)} ${isP2 ? '(Tú)' : ''}` : '<i style="color:#64748b;">Por definir</i>'}
                    </span>
                </div>
                <span class="player-score-box">${p2IsWinner ? '👑 ' : ''}${m.Player2Score != null ? m.Player2Score : 0}</span>
            </div>

            ${actionBtn ? `<div style="margin-top:3px;">${actionBtn}</div>` : ''}
        </div>
    `;
}

function renderChampionPodiumColumnHtml(torneo) {
    const champ = torneo.CampeonUsername;
    const subchamp = torneo.SubcampeonUsername;

    return `
        <div class="bracket-podium-col">
            <div class="round-title-bar champion-header">
                <span class="round-tag">OFICIAL</span>
                <span class="round-title-text" style="color:#ffd700;">COPA DE CAMPEÓN</span>
            </div>

            <div class="champion-podium-card">
                <div class="trophy-glow-wrap">
                    <div class="trophy-icon-large">🏆</div>
                </div>

                ${champ ? `
                    <div class="champion-badge-pill crowned">👑 CAMPEÓN SUPREMO</div>
                    <div class="champion-user-display">${escapeHtml(champ)}</div>
                    <div class="champion-sub-text">Inmortalizado en el Salón de la Fama</div>
                    ${subchamp ? `<div style="font-size:10px; color:#cbd5e1; margin-bottom:8px;">🥈 Subcampeón: <b>${escapeHtml(subchamp)}</b></div>` : ''}
                    <div class="champion-reward-box">⭐ RECOMPENSA ENTREGADA</div>
                ` : `
                    <div class="champion-badge-pill dispute">EN DISPUTA</div>
                    <div class="champion-user-display" style="font-size:12px; color:#cbd5e1;">POR DEFINIR</div>
                    <div class="champion-sub-text">Esperando al vencedor de la Gran Final</div>
                    <div class="champion-reward-box">🏆 Gran Trofeo Oficial</div>
                `}
            </div>
        </div>
    `;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.style.display = 'flex';
}

function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.style.display = 'none';
}

function escapeQuotes(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
