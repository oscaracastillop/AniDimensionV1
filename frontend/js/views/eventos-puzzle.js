/**
 * ============================================================================
 * ANI-DIMENSION: CONTROLADOR DEL EVENTO DE ROMPECABEZAS (PUZZLE CLIENT)
 * ACTUALIZACIÓN EN TIEMPO REAL + SILUETA VISIBLE DE FICHAS + PODIO TOP 10
 * ============================================================================
 */

var currentPuzzleData = null;
var countdownInterval = null;
var realtimePollInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    if (window.Session && !window.Session.requireAuth('../../login/login.html')) {
        return;
    }

    loadPuzzleStatus();

    // Sondeo periódico en tiempo real cada 4 segundos
    realtimePollInterval = setInterval(loadPuzzleStatusSilent, 4000);
});

window.addEventListener('beforeunload', () => {
    if (countdownInterval) clearInterval(countdownInterval);
    if (realtimePollInterval) clearInterval(realtimePollInterval);
});

async function loadPuzzleStatus() {
    const user = window.Session ? window.Session.getUser() : null;
    const userId = user ? (user.id || user.user_id || 1) : 1;
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('eventId');

    try {
        const endpoint = eventId 
            ? `/api/events/puzzle/status?userId=${userId}&eventId=${eventId}` 
            : `/api/events/active?userId=${userId}`;

        const res = await fetch(endpoint);
        const data = await res.json();

        if (data && data.success && data.data) {
            currentPuzzleData = data.data;
            renderPuzzleUI(currentPuzzleData);
            if (currentPuzzleData.event && currentPuzzleData.event.end_date) {
                startCountdownTimer(currentPuzzleData.event.end_date);
            }
        } else {
            const board = document.getElementById('puzzle-board-container');
            if (board) {
                board.innerHTML = `
                    <div style="padding:40px; text-align:center; color:#94a3b8; font-size:14px; grid-column:1 / -1;">
                        ⚡ No hay ningún evento de rompecabezas activo en este momento.
                    </div>
                `;
            }
        }
    } catch (e) {
        console.error('[PUZZLE LOAD ERROR]', e);
    }
}

async function loadPuzzleStatusSilent() {
    const user = window.Session ? window.Session.getUser() : null;
    const userId = user ? (user.id || user.user_id || 1) : 1;
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('eventId');

    try {
        const endpoint = eventId 
            ? `/api/events/puzzle/status?userId=${userId}&eventId=${eventId}` 
            : `/api/events/active?userId=${userId}`;

        const res = await fetch(endpoint);
        const data = await res.json();

        if (data && data.success && data.data) {
            currentPuzzleData = data.data;
            renderPuzzleUI(currentPuzzleData);
        }
    } catch (e) {
        // Silencioso en sondeo en segundo plano
    }
}

function renderPuzzleUI(data) {
    if (!data || !data.event) return;

    const evt = data.event;
    const prog = data.progress || { percent: 0, unlocked_count: 0, total_pieces: 16 };
    const pieces = data.pieces || [];
    const winners = data.winners || [];

    // 1. Títulos y Metadatos
    const titleEl = document.getElementById('puzzle-event-title');
    const descEl = document.getElementById('puzzle-event-desc');
    const payoutEl = document.getElementById('puzzle-payout-rate');

    if (titleEl) titleEl.textContent = evt.title || 'EVENTO DE ROMPECABEZAS';
    if (descEl) descEl.textContent = evt.description || 'Gana duelos, reúne fichas y asegura tu puesto en el Top 10.';
    if (payoutEl) payoutEl.textContent = `⭐ ${evt.payout_per_leftover_piece || 50} Starships`;

    // 2. Barra de Progreso
    const fillEl = document.getElementById('puzzle-progress-fill');
    const textEl = document.getElementById('puzzle-progress-text');
    const percentEl = document.getElementById('puzzle-progress-percent');

    if (fillEl) fillEl.style.width = `${prog.percent || 0}%`;
    if (textEl) textEl.textContent = `${prog.unlocked_count || 0} / ${prog.total_pieces || 16} Fichas`;
    if (percentEl) percentEl.textContent = `${prog.percent || 0}%`;

    // 3. Renderizar Cuadrícula de Piezas Dinámica
    const gridEl = document.getElementById('puzzle-grid');
    if (gridEl) {
        gridEl.style.gridTemplateColumns = `repeat(${evt.grid_cols || 4}, 1fr)`;
        gridEl.style.gridTemplateRows = `repeat(${evt.grid_rows || 4}, 1fr)`;

        const bgUrl = evt.image_url || '/assets/images/events/halloween_maga_oscura.jpg';
        const cols = evt.grid_cols || 4;
        const rows = evt.grid_rows || 4;
        const bgSizeX = cols * 100;
        const bgSizeY = rows * 100;

        gridEl.innerHTML = pieces.map(p => {
            const isUnlocked = p.unlocked;

            if (isUnlocked) {
                return `
                    <div class="puzzle-tile unlocked" 
                         style="background-image:url('${bgUrl}'); background-size:${bgSizeX}% ${bgSizeY}%; background-position:${p.bg_x}% ${p.bg_y}%;"
                         title="Ficha #${p.number} - Desbloqueada (${p.quantity} en inventario)">
                        <span class="tile-number-hint">#${p.number}</span>
                        <span class="puzzle-qty-badge">x${p.quantity}</span>
                    </div>
                `;
            } else {
                return `
                    <div class="puzzle-tile locked" 
                         style="background-image:url('${bgUrl}'); background-size:${bgSizeX}% ${bgSizeY}%; background-position:${p.bg_x}% ${p.bg_y}%;"
                         title="Ficha #${p.number} - Bloqueada (0 en inventario)">
                        <span class="tile-number-hint">#${p.number}</span>
                        <span class="tile-lock-icon">🔒</span>
                    </div>
                `;
            }
        }).join('');
    }

    // 4. Botones de Acción
    const btnComplete = document.getElementById('btn-complete-puzzle');
    const btnExchange = document.getElementById('btn-exchange-pieces');

    if (btnComplete) {
        if (prog.has_submitted) {
            btnComplete.disabled = true;
            btnComplete.innerHTML = `<span>PUESTO #${prog.winner_position} ASEGURADO</span>`;
            btnComplete.style.background = 'rgba(16,185,129,0.15)';
            btnComplete.style.border = '1.2px solid #10b981';
            btnComplete.style.color = '#10b981';
        } else if (prog.is_completed) {
            btnComplete.disabled = false;
            btnComplete.innerHTML = `<span>RECLAMAR PUESTO EN TOP 10</span>`;
            btnComplete.style.boxShadow = '0 0 20px #ffd700';
        } else {
            btnComplete.disabled = true;
            btnComplete.innerHTML = `<span>COMPLETAR (${prog.unlocked_count}/${prog.total_pieces})</span>`;
        }
    }

    if (btnExchange) {
        if (prog.has_exchanged) {
            btnExchange.disabled = true;
            btnExchange.innerHTML = `<span>CANJE REALIZADO</span>`;
        } else if (evt.is_ended && prog.total_leftover_pieces > 0) {
            const potentialStarships = prog.total_leftover_pieces * (evt.payout_per_leftover_piece || 50);
            const unitTxt = prog.total_leftover_pieces === 1 ? 'FICHA' : 'FICHAS';
            btnExchange.disabled = false;
            btnExchange.innerHTML = `<span>CANJEAR ${prog.total_leftover_pieces} ${unitTxt} (+${potentialStarships.toLocaleString()} ST)</span>`;
            btnExchange.style.borderColor = '#00f0ff';
            btnExchange.style.color = '#00f0ff';
            btnExchange.style.boxShadow = '0 0 15px rgba(0,240,255,0.4)';
        } else if (evt.is_ended) {
            btnExchange.disabled = true;
            btnExchange.innerHTML = `<span>SIN FICHAS SOBRANTES</span>`;
        } else {
            btnExchange.disabled = true;
            btnExchange.innerHTML = `<span>CANJEAR SOBRANTES (AL FINALIZAR)</span>`;
        }
    }

    // 5. Tabla de Ganadores del Top 10 en Tiempo Real
    renderWinnersTable(evt.prizes_config || evt.prizes || [], winners);
}

function renderWinnersTable(prizesConfig, winnersList) {
    const listEl = document.getElementById('puzzle-winners-list');
    if (!listEl) return;

    const user = window.Session ? window.Session.getUser() : null;
    const currentUserId = user ? String(user.id || user.user_id || 1) : null;

    let html = '';
    for (let i = 1; i <= 10; i++) {
        const prize = (prizesConfig && prizesConfig.find(p => p.place === i)) || {
            place: i,
            title: `${i}° Lugar`,
            starships: i === 1 ? 50000 : (i === 2 ? 35000 : (i === 3 ? 25000 : 5000)),
            vip_days: i === 1 ? 30 : 0,
            avatar_code: ''
        };

        const winner = winnersList && winnersList.find(w => w.position === i);
        const rankBadgeClass = i === 1 ? 'winner-rank-1' : (i === 2 ? 'winner-rank-2' : (i === 3 ? 'winner-rank-3' : 'winner-rank-other'));
        const isCurrentUser = winner && String(winner.user_id) === currentUserId;

        let parts = [];
        if (prize.starships && String(prize.starships).trim() !== '' && String(prize.starships).trim() !== '0') {
            const num = Number(prize.starships);
            const val = isNaN(num) ? String(prize.starships).trim() : `${num.toLocaleString()} ST`;
            parts.push(`StarShips: ${val}`);
        }
        if (prize.vip_days && String(prize.vip_days).trim() !== '' && String(prize.vip_days).trim() !== '0') {
            parts.push(`VIP: ${String(prize.vip_days).trim()}`);
        }
        if (prize.avatar_code && String(prize.avatar_code).trim() !== '' && String(prize.avatar_code).trim() !== '0') {
            parts.push(`Avatar: ${String(prize.avatar_code).trim()}`);
        }
        let prizeDesc = parts.length > 0 ? parts.join(' • ') : '-';


        if (winner) {
            const timeStr = winner.completed_at 
                ? new Date(winner.completed_at).toLocaleDateString('es-ES', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) 
                : '';

            html += `
                <div class="winner-item-row claimed ${isCurrentUser ? 'current-user' : ''}" style="${isCurrentUser ? 'border-color:#00f0ff; background:rgba(0,240,255,0.1);' : ''}">
                    <div class="winner-left-box">
                        <span class="winner-rank-badge ${rankBadgeClass}">#${i}</span>
                        <div>
                            <div class="winner-name-txt" style="color:${isCurrentUser ? '#00f0ff' : '#00ff88'};">${winner.username} ${isCurrentUser ? '👑 (Tú)' : ''}</div>
                            <div style="font-size:8px; color:#94a3b8;">${timeStr}</div>
                        </div>
                    </div>
                    <div class="winner-prize-preview">
                        ${prizeDesc}
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="winner-item-row">
                    <div class="winner-left-box">
                        <span class="winner-rank-badge ${rankBadgeClass}">#${i}</span>
                        <span class="winner-available-txt" style="color:#64748b;">Disponible</span>
                    </div>
                    <div class="winner-prize-preview">
                        ${prizeDesc}
                    </div>
                </div>
            `;
        }
    }

    listEl.innerHTML = html;
}

function startCountdownTimer(endDateStr) {
    if (countdownInterval) clearInterval(countdownInterval);

    const timerEl = document.getElementById('puzzle-countdown-timer');
    if (!timerEl) return;

    const endDate = new Date(endDateStr).getTime();

    function update() {
        const now = new Date().getTime();
        const diff = endDate - now;

        if (diff <= 0) {
            timerEl.textContent = 'EVENTO FINALIZADO';
            if (countdownInterval) clearInterval(countdownInterval);
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        timerEl.textContent = `${days}D ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
    }

    update();
    countdownInterval = setInterval(update, 1000);
}

// Acción: Reclamar puesto al completar
async function onClaimPuzzleCompletion() {
    const user = window.Session ? window.Session.getUser() : null;
    if (!user) {
        window.showAniModal ? window.showAniModal('ACCESO REQUERIDO', 'Debes iniciar sesión para participar.', 'warning') : alert('Debes iniciar sesión');
        return;
    }

    const userId = user.id || user.user_id || 1;
    const username = user.username || 'Duelista';

    try {
        const res = await fetch('/api/events/puzzle/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, username, eventId: currentPuzzleData?.event?.id })
        });

        const data = await res.json();
        if (data && data.success) {
            if (window.showAniModal) {
                window.showAniModal('ENHORABUENA', data.message, 'success');
            } else {
                alert(data.message);
            }
            loadPuzzleStatus();
        } else {
            if (window.showAniModal) {
                window.showAniModal('ATENCIÓN', data.message || 'No se pudo registrar la finalización.', 'warning');
            } else {
                alert(data.message || 'No se pudo registrar la finalización.');
            }
        }
    } catch (e) {
        if (window.showAniModal) {
            window.showAniModal('ERROR', 'Error al comunicar con el servidor.', 'error');
        } else {
            alert('Error al comunicar con el servidor.');
        }
    }
}

// Acción: Canjear fichas sobrantes por Starships
async function onExchangeLeftoverPieces() {
    const user = window.Session ? window.Session.getUser() : null;
    if (!user) {
        window.showAniModal ? window.showAniModal('ACCESO REQUERIDO', 'Debes iniciar sesión para canjear.', 'warning') : alert('Debes iniciar sesión');
        return;
    }

    const userId = user.id || user.user_id || 1;

    try {
        const res = await fetch('/api/events/puzzle/exchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, eventId: currentPuzzleData?.event?.id })
        });

        const data = await res.json();
        if (data && data.success) {
            if (window.showAniModal) {
                window.showAniModal('CANJE REALIZADO', data.message, 'success');
            } else {
                alert(data.message);
            }
            if (window.Session && typeof window.Session.addStarships === 'function') {
                window.Session.addStarships(data.starships_awarded);
            }
            loadPuzzleStatus();
        } else {
            if (window.showAniModal) {
                window.showAniModal('ATENCIÓN', data.message || 'No se pudo realizar el canje.', 'warning');
            } else {
                alert(data.message || 'No se pudo realizar el canje.');
            }
        }
    } catch (e) {
        if (window.showAniModal) {
            window.showAniModal('ERROR', 'Error al procesar el canje.', 'error');
        } else {
            alert('Error al procesar el canje.');
        }
    }
}

window.onClaimPuzzleCompletion = onClaimPuzzleCompletion;
window.onExchangeLeftoverPieces = onExchangeLeftoverPieces;
