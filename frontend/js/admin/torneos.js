/**
 * Ani-Dimension: Panel de Administración de Torneos & Brackets OCG
 */

let allTournaments = [];
let currentViewingTournament = null;
let currentAdminTab = 'ALL';

document.addEventListener('DOMContentLoaded', () => {
    if (window.Session && !window.Session.requireAuth('/views/login/login.html')) return;
    const user = window.Session ? window.Session.getUser() : null;
    if (!user || (!user.isAdmin && user.username.toLowerCase() !== 'admin')) {
        alert('Acceso restringido únicamente a Administradores.');
        window.location.href = '/views/lobby/lobby.html';
        return;
    }

    if (window.AppNavbar) {
        window.AppNavbar.init('admin');
    }

    initTournamentsAdmin();
});

function initTournamentsAdmin() {
    loadTournaments();

    // Conectar WebSocket para actualizaciones en vivo
    const socket = window.getSocket ? window.getSocket() : (window.socket || (typeof io !== 'undefined' ? io() : null));
    if (socket) {
        socket.on('TOURNAMENT_UPDATED', (data) => {
            console.log('[SOCKET TOURNAMENT_UPDATED]', data);
            loadTournaments();
            if (currentViewingTournament && data && data.torneoId === currentViewingTournament.Id) {
                viewTournamentBracket(currentViewingTournament.Id);
            }
        });
    }
}

async function loadTournaments() {
    try {
        const res = await fetch('/api/tournaments');
        const data = await res.json();
        if (data.success) {
            allTournaments = data.tournaments || [];
            updateKpiStats(allTournaments);
            renderTournamentsGrid();
        }
    } catch (err) {
        console.error('[LOAD TOURNAMENTS ERROR]', err);
    }
}

function updateKpiStats(tournaments) {
    const total = tournaments.length;
    const enCurso = tournaments.filter(t => t.Estado === 'EN_CURSO').length;
    const enRegistro = tournaments.filter(t => t.Estado === 'REGISTRO').length;
    const finalizados = tournaments.filter(t => t.Estado === 'FINALIZADO').length;

    document.getElementById('kpi-total-torneos').textContent = total;
    document.getElementById('kpi-en-curso').textContent = enCurso;
    document.getElementById('kpi-en-registro').textContent = enRegistro;
    document.getElementById('kpi-finalizados').textContent = finalizados;
}

function setAdminTab(tabType, btnElement) {
    currentAdminTab = tabType;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    const heading = document.getElementById('tab-section-heading');
    if (heading) {
        if (tabType === 'ACTIVE') heading.textContent = '🔥 TORNEOS ACTIVOS & EN REGISTRO';
        else if (tabType === 'HALL_OF_FAME') heading.textContent = '🏛️ SALÓN DE LA FAMA & TORNEOS HISTÓRICOS';
        else heading.textContent = '🏆 LISTADO COMPLETO DE TORNEOS';
    }

    renderTournamentsGrid();
}

function renderTournamentsGrid() {
    const container = document.getElementById('tournaments-grid-container');
    const counterLbl = document.getElementById('torneos-counter-lbl');
    if (!container) return;

    let filtered = allTournaments.filter(t => {
        if (currentAdminTab === 'ACTIVE') return t.Estado === 'EN_CURSO' || t.Estado === 'REGISTRO';
        if (currentAdminTab === 'HALL_OF_FAME') return t.Estado === 'FINALIZADO';
        return true;
    });

    if (counterLbl) {
        counterLbl.textContent = `${filtered.length} torneo(s) mostrado(s)`;
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align:center; padding:40px 20px; background:rgba(15,23,42,0.6); border:1px dashed rgba(0,240,255,0.25);">
                <div style="font-size:32px; margin-bottom:8px;">🏆</div>
                <div style="font-family:'Orbitron', sans-serif; font-size:13px; font-weight:700; color:#00f0ff; margin-bottom:6px;">NO HAY TORNEOS EN ESTA CATEGORÍA</div>
                <div style="font-size:11px; color:#94a3b8; margin-bottom:14px;">Utiliza el botón de arriba para crear un nuevo torneo oficial con formato y cronograma.</div>
                <a href="editor-torneo.html" class="btn-t-action btn-t-primary" style="display:inline-flex; width:auto; padding:0 20px; height:32px;">➕ CREAR TORNEO</a>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(t => {
        const inscritos = t.TotalInscritos || 0;
        const max = t.MaxParticipantes || 8;
        const estado = t.Estado || 'REGISTRO';
        const estadoClass = `status-${estado.toLowerCase()}`;
        const estadoLabel = estado === 'EN_CURSO' ? '🔥 EN CURSO' : (estado === 'REGISTRO' ? '📝 EN REGISTRO' : '🏆 FINALIZADO');

        const isHallOfFame = estado === 'FINALIZADO';

        // Formato Legible
        const formatoStr = t.Formato === 'BO3' 
            ? 'Ida y Vuelta (BO3)' 
            : (t.Formato === 'DOBLE_ELIMINACION' ? 'Doble Eliminación' : (t.Formato === 'SUIZO' ? 'Fase Suiza' : 'Eliminación Directa (BO1)'));

        let championPodiumHtml = '';
        if (t.CampeonUsername) {
            championPodiumHtml = `
                <div style="background:rgba(255,215,0,0.12); border:1.2px solid #ffd700; color:#ffd700; padding:8px 10px; font-family:'Orbitron', sans-serif; font-size:10.5px; font-weight:800; border-radius:4px; display:flex; flex-direction:column; gap:4px; box-shadow:0 0 12px rgba(255,215,0,0.2);">
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span>👑 CAMPEÓN:</span> <span style="color:#fff; font-size:12px;">${t.CampeonUsername}</span>
                    </div>
                    ${t.SubcampeonUsername ? `<div style="font-size:9.5px; color:#94a3b8;">🥈 Subcampeón: <b style="color:#cbd5e1;">${t.SubcampeonUsername}</b></div>` : ''}
                </div>
            `;
        }

        let actionButtons = '';
        if (estado === 'REGISTRO') {
            actionButtons = `
                <button onclick="startTournament(${t.Id}, '${escapeQuotes(t.Titulo)}')" class="btn-t-action btn-t-primary" title="Generar llaves y arrancar">🚀 INICIAR</button>
                <a href="editor-torneo.html?id=${t.Id}" class="btn-t-action" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#cbd5e1;">✏️ EDITAR</a>
                <button onclick="deleteTournament(${t.Id})" class="btn-t-action btn-t-danger">🗑️</button>
            `;
        } else if (estado === 'EN_CURSO') {
            actionButtons = `
                <button onclick="viewTournamentBracket(${t.Id})" class="btn-t-action btn-t-gold" style="flex:2;">🏆 VER / GESTIONAR LLAVES</button>
                <a href="editor-torneo.html?id=${t.Id}" class="btn-t-action" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#cbd5e1;">✏️</a>
                <button onclick="deleteTournament(${t.Id})" class="btn-t-action btn-t-danger">🗑️</button>
            `;
        } else {
            actionButtons = `
                <button onclick="viewTournamentBracket(${t.Id})" class="btn-t-action btn-t-primary">🏆 VER ÁRBOL HISTÓRICO</button>
                <button onclick="openPrizesDeliveryModal(${t.Id})" class="btn-t-action btn-t-gold">🎁 PREMIOS</button>
                <button onclick="deleteTournament(${t.Id})" class="btn-t-action btn-t-danger">🗑️</button>
            `;
        }

        return `
            <div class="tournament-admin-card" style="${isHallOfFame ? 'border-color:rgba(255,215,0,0.5); box-shadow:0 0 20px rgba(255,215,0,0.15);' : ''}">
                <div class="t-card-header">
                    <img src="${t.BannerUrl || '/assets/images/duels/pvp.jpg'}" alt="${t.Titulo}" class="t-card-banner" onerror="this.src='/assets/images/duels/pvp.jpg'">
                    <div class="t-card-overlay"></div>
                    <span class="t-badge-status ${estadoClass}">${estadoLabel}</span>
                </div>

                <div class="t-card-body">
                    <div class="t-card-title">${t.Titulo}</div>

                    <div class="t-card-meta-row">
                        <span class="t-meta-pill">👥 ${inscritos} / ${max} Inscritos</span>
                        <span class="t-meta-pill">⚔️ ${formatoStr}</span>
                        <span class="t-meta-pill">⚡ Nv. ${t.NivelMinimo} - ${t.NivelMaximo}</span>
                        <span class="t-meta-pill">⭐ ${t.CostoInscripcion > 0 ? `${t.CostoInscripcion.toLocaleString()} ★` : 'Gratis'}</span>
                    </div>

                    ${championPodiumHtml}

                    <div>
                        <div style="font-family:'Orbitron', sans-serif; font-size:9.5px; font-weight:700; color:#ffd700; margin-bottom:3px; display:flex; align-items:center; gap:4px;">
                            <span>🎁 RECOMPENSAS & PREMIOS:</span>
                        </div>
                        <div class="t-prizes-box">${t.TextoPremios || 'Premios no especificados.'}</div>
                    </div>

                    <div class="t-card-actions">
                        ${actionButtons}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function startTournament(torneoId, titulo) {
    if (!confirm(`¿Estás seguro de iniciar el torneo "${titulo}"?\n\nSe cerrarán las inscripciones y se generará automáticamente el árbol de llaves OCG.`)) {
        return;
    }

    try {
        const res = await fetch(`/api/tournaments/admin/${torneoId}/start`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            alert(data.message);
            loadTournaments();
            viewTournamentBracket(torneoId);
        } else {
            alert(`⚠️ No se pudo iniciar el torneo: ${data.message}`);
        }
    } catch (err) {
        console.error('[START TOURNAMENT ERROR]', err);
        alert('Error al iniciar el torneo.');
    }
}

async function viewTournamentBracket(torneoId) {
    try {
        const res = await fetch(`/api/tournaments/${torneoId}`);
        const data = await res.json();
        if (!data.success) {
            alert('Error al obtener datos del torneo.');
            return;
        }

        currentViewingTournament = data.torneo;
        document.getElementById('bracket-modal-title').textContent = `🏆 ${data.torneo.Titulo}`;
        document.getElementById('bracket-modal-subtitle').innerHTML = `
            Formato: <b>${data.torneo.MaxParticipantes} Duelistas (${data.torneo.Formato || 'BO1'})</b> • Estado: <b>${data.torneo.Estado}</b> 
            ${data.torneo.CampeonUsername ? `• 👑 Campeón: <b style="color:#ffd700;">${data.torneo.CampeonUsername}</b>` : ''}
        `;

        renderBracketTree(data.partidas || [], data.torneo);
        openModal('modal-bracket-viewer');
    } catch (err) {
        console.error('[BRACKET VIEW ERROR]', err);
    }
}

function renderBracketTree(matches, torneo) {
    const canvas = document.getElementById('bracket-tree-canvas');
    if (!canvas) return;

    if (matches.length === 0) {
        canvas.innerHTML = `
            <div style="margin:auto; text-align:center; padding:30px; color:#94a3b8;">
                <div style="font-size:32px;">⏳</div>
                <div style="font-family:'Orbitron', sans-serif; font-size:13px; color:#00f0ff; margin-top:6px;">ÁRBOL DE LLAVES NO GENERADO</div>
                <div style="font-size:11px; margin-top:4px;">El torneo aún se encuentra en fase de inscripción. Inicia el torneo para generar las llaves.</div>
            </div>
        `;
        return;
    }

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
                                ${renderAdminMatchCardHtml(upperMatch, torneo)}
                            </div>
                            <div class="bracket-connector-fork">
                                <div class="fork-arm-top ${upperWon ? 'arm-winner' : (lowerWon ? 'arm-loser' : '')}"></div>
                                <div class="fork-arm-bottom ${lowerWon ? 'arm-winner' : (upperWon ? 'arm-loser' : '')}"></div>
                                <div class="fork-spine ${upperWon || lowerWon ? 'spine-active' : ''}"></div>
                                <div class="fork-stem ${upperWon || lowerWon ? 'stem-active' : ''}"></div>
                            </div>
                            ${lowerMatch ? `
                                <div class="bracket-match-slot lower ${rNum > 1 ? 'has-incoming' : ''}">
                                    ${renderAdminMatchCardHtml(lowerMatch, torneo)}
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
                            ${renderAdminMatchCardHtml(finalMatch, torneo)}
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
                    <span class="round-title-text">${escapeHtmlAdmin(roundName)}</span>
                </div>
                <div class="round-matches-body">
                    ${pairsHtml}
                </div>
            </div>
        `;
    }).join('');

    // Columna de Trofeo de Campeón
    columnsHtml += `
        <div class="bracket-podium-col">
            <div class="round-title-bar champion-header">
                <span class="round-tag">OFICIAL</span>
                <span class="round-title-text" style="color:#ffd700;">COPA DE CAMPEÓN</span>
            </div>
            <div class="champion-podium-wrapper">
                ${renderAdminChampionPodiumHtml(torneo)}
            </div>
        </div>
    `;

    canvas.innerHTML = columnsHtml;
}

function renderAdminMatchCardHtml(m, torneo) {
    const isLive = m.Estado === 'EN_JUEGO';
    const isFinished = m.Estado === 'FINALIZADA';
    const isBye = m.Estado === 'BYE';

    const p1IsWinner = isFinished && m.GanadorUsername && m.Player1Username && m.GanadorUsername.toLowerCase() === m.Player1Username.toLowerCase();
    const p2IsWinner = isFinished && m.GanadorUsername && m.Player2Username && m.GanadorUsername.toLowerCase() === m.Player2Username.toLowerCase();

    const spectateBtn = isLive 
        ? `<a href="/views/duels/pvp/duel-pvp.html?room=${m.RoomId}&spectate=1" target="_blank" class="btn-t-action btn-t-gold" style="height:23px; font-size:9px; padding:0 8px; flex:1;" title="Ver combate en vivo como espectador">
            👁️ ESPECTAR EN VIVO
           </a>`
        : '';

    const resolveBtn = (!isFinished && !isBye && m.Player1Username && m.Player2Username)
        ? `<button onclick="openResolveMatchModal(${torneo.Id}, ${m.Id}, '${escapeQuotes(m.Player1Username)}', '${escapeQuotes(m.Player2Username)}')" class="btn-t-action" style="height:23px; font-size:9px; padding:0 8px; background:rgba(0,240,255,0.15); border:1px solid #00f0ff; color:#00f0ff; flex:1;" title="Definir ganador manual">
            ⚖️ RESOLVER
           </button>`
        : '';

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
        <div class="match-node-card ${isLive ? 'live-duel' : ''}">
            <div class="match-node-header">
                <span class="match-badge-tag">M#${m.NumeroMatch} • ${escapeHtmlAdmin(torneo.Formato || 'BO1')}</span>
                ${statusPillHtml}
            </div>

            ${progDateStr}

            <!-- Jugador 1 -->
            <div class="match-player-row ${p1IsWinner ? 'winner-row' : (isFinished && !p1IsWinner && m.Player1Username ? 'loser-row' : '')}">
                <div style="display:flex; align-items:center; min-width:0; flex:1;">
                    <img src="/assets/images/avatars/${m.Player1Avatar || 'AVA-001'}.png" onerror="this.onerror=null; this.src='/assets/images/avatars/AVA-001.png';" class="match-player-avatar ${p1IsWinner ? 'winner-avatar' : ''}">
                    <span class="player-name-text">${m.Player1Username ? escapeHtmlAdmin(m.Player1Username) : '<i style="color:#64748b;">Por definir</i>'}</span>
                </div>
                <span class="player-score-box">${p1IsWinner ? '👑 ' : ''}${m.Player1Score != null ? m.Player1Score : 0}</span>
            </div>

            <!-- Jugador 2 -->
            <div class="match-player-row ${p2IsWinner ? 'winner-row' : (isFinished && !p2IsWinner && m.Player2Username ? 'loser-row' : '')}">
                <div style="display:flex; align-items:center; min-width:0; flex:1;">
                    <img src="/assets/images/avatars/${m.Player2Avatar || 'AVA-002'}.png" onerror="this.onerror=null; this.src='/assets/images/avatars/AVA-002.png';" class="match-player-avatar ${p2IsWinner ? 'winner-avatar' : ''}">
                    <span class="player-name-text">${m.Player2Username ? escapeHtmlAdmin(m.Player2Username) : '<i style="color:#64748b;">Por definir</i>'}</span>
                </div>
                <span class="player-score-box">${p2IsWinner ? '👑 ' : ''}${m.Player2Score != null ? m.Player2Score : 0}</span>
            </div>

            <!-- Botones de Acción Admin -->
            ${(spectateBtn || resolveBtn) ? `
                <div style="display:flex; gap:6px; margin-top:3px;">
                    ${spectateBtn}
                    ${resolveBtn}
                </div>
            ` : ''}
        </div>
    `;
}

function renderAdminChampionPodiumHtml(torneo) {
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
                    <div class="champion-badge-pill crowned">👑 CAMPEÓN OFICIAL</div>
                    <div class="champion-user-display">${escapeHtmlAdmin(champ)}</div>
                    <div class="champion-sub-text">Inmortalizado en el Salón de la Fama</div>
                    ${subchamp ? `<div style="font-size:10px; color:#cbd5e1; margin-bottom:8px;">🥈 Subcampeón: <b>${escapeHtmlAdmin(subchamp)}</b></div>` : ''}
                    <div class="champion-reward-box">⭐ RECOMPENSA REGISTRADA</div>
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

function escapeHtmlAdmin(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function openResolveMatchModal(torneoId, matchId, p1Name, p2Name) {
    document.getElementById('resolve-torneo-id').value = torneoId;
    document.getElementById('resolve-match-id').value = matchId;

    const select = document.getElementById('resolve-winner-select');
    select.innerHTML = `
        <option value="${p1Name}">🥇 ${p1Name} (Victoria 1-0)</option>
        <option value="${p2Name}">🥇 ${p2Name} (Victoria 1-0)</option>
    `;

    openModal('modal-resolve-match');
}

async function submitResolveMatch() {
    const torneoId = document.getElementById('resolve-torneo-id').value;
    const matchId = document.getElementById('resolve-match-id').value;
    const winnerUsername = document.getElementById('resolve-winner-select').value;

    try {
        const res = await fetch(`/api/tournaments/admin/${torneoId}/matches/${matchId}/set-winner`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ winnerUsername })
        });

        const data = await res.json();
        if (data.success) {
            alert(data.message);
            closeModal('modal-resolve-match');
            viewTournamentBracket(torneoId);
        } else {
            alert(`⚠️ Error: ${data.message}`);
        }
    } catch (err) {
        console.error('[SUBMIT RESOLVE MATCH ERROR]', err);
    }
}

function openPrizesDeliveryModal(torneoId) {
    const t = allTournaments.find(item => item.Id === torneoId);
    if (!t) return;

    document.getElementById('prize-torneo-id').value = t.Id;
    document.getElementById('prize-champion-name').textContent = t.CampeonUsername || 'No registrado';
    document.getElementById('prize-text-preview').textContent = t.TextoPremios || 'Sin detalle de premios.';
    document.getElementById('prize-delivery-notes').value = t.NotasEntregaPremios || '';

    openModal('modal-prizes-delivery');
}

async function submitPrizesDelivered() {
    const torneoId = document.getElementById('prize-torneo-id').value;
    const notasEntrega = document.getElementById('prize-delivery-notes').value.trim();

    try {
        const res = await fetch(`/api/tournaments/admin/${torneoId}/deliver-prizes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notasEntrega })
        });

        const data = await res.json();
        if (data.success) {
            alert(data.message);
            closeModal('modal-prizes-delivery');
            loadTournaments();
        } else {
            alert(`⚠️ Error: ${data.message}`);
        }
    } catch (err) {
        console.error('[DELIVER PRIZES ERROR]', err);
    }
}

async function deleteTournament(torneoId) {
    if (!confirm(`¿Estás seguro de eliminar el Torneo #${torneoId}?\nEsta acción no se puede deshacer.`)) {
        return;
    }

    try {
        const res = await fetch(`/api/tournaments/admin/${torneoId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            alert(data.message);
            loadTournaments();
        } else {
            alert(`⚠️ Error: ${data.message}`);
        }
    } catch (err) {
        console.error('[DELETE TOURNAMENT ERROR]', err);
    }
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
