/**
 * ============================================================================
 * ANI-DIMENSION: CONTROLADOR ADMIN DE ROMPECABEZAS (CATÁLOGO Y PODIO)
 * ============================================================================
 */

var adminPuzzleEventsList = [];

document.addEventListener('DOMContentLoaded', () => {
    if (window.Session && !window.Session.requireAuth('../../../login/login.html')) {
        return;
    }

    const user = window.Session ? window.Session.getUser() : null;
    if (!user || (!user.isAdmin && user.role !== 'admin' && user.username !== 'Admin')) {
        alert('Acceso restringido a Administradores.');
        window.location.href = '../../../lobby/lobby.html';
        return;
    }

    loadAdminPuzzleEvents();
});

async function loadAdminPuzzleEvents() {
    try {
        const res = await fetch('/api/events/admin/all');
        const data = await res.json();

        if (data && data.success && Array.isArray(data.events)) {
            adminPuzzleEventsList = data.events;
            renderAdminPuzzleTable(adminPuzzleEventsList);
        } else {
            renderEmptyAdminTable();
        }
    } catch (e) {
        console.error('[ADMIN PUZZLE LOAD ERROR]', e);
        renderEmptyAdminTable();
    }
}

function onPuzzleSearch(input) {
    const term = (input.value || '').toLowerCase().trim();
    if (!term) {
        renderAdminPuzzleTable(adminPuzzleEventsList);
        return;
    }

    const filtered = adminPuzzleEventsList.filter(e => 
        (e.title && e.title.toLowerCase().includes(term)) ||
        (e.description && e.description.toLowerCase().includes(term))
    );
    renderAdminPuzzleTable(filtered);
}

function renderAdminPuzzleTable(events) {
    const tbody = document.getElementById('admin-puzzles-tbody');
    if (!tbody) return;

    if (!events || events.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#94a3b8; padding:24px;">No hay eventos de rompecabezas registrados. Haz clic en "Crear Evento" para añadir uno.</td></tr>`;
        return;
    }

    const now = new Date();

    tbody.innerHTML = events.map(evt => {
        const start = new Date(evt.start_date);
        const end = new Date(evt.end_date);
        const isFinished = now > end || !evt.is_active;
        const isUpcoming = now < start;
        const isActive = !isFinished && !isUpcoming && evt.is_active;

        let statusHtml = '<span class="status-badge active">ACTIVO</span>';
        if (isFinished) {
            statusHtml = '<span class="status-badge inactive">FINALIZADO</span>';
        } else if (isUpcoming) {
            statusHtml = '<span class="status-badge" style="background:rgba(56,189,248,0.15); border:1px solid #38bdf8; color:#38bdf8;">PRÓXIMAMENTE</span>';
        }

        const startStr = start.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const endStr = end.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

        const npcRate = Math.round((evt.drop_rate_npc || 0.40) * 100);
        const pvpRate = Math.round((evt.drop_rate_pvp || 0.75) * 100);

        return `
            <tr>
                <td>
                    <img src="${evt.image_url || '/assets/images/events/halloween_maga_oscura.jpg'}" alt="${evt.title}" style="width:65px; height:45px; object-fit:cover; border:1px solid rgba(0,240,255,0.4); display:block;">
                </td>
                <td>
                    <div style="font-size:11px; font-weight:700; color:#fff; font-family:'Orbitron',sans-serif;">${evt.title}</div>
                    <div style="color:#94a3b8; font-size:9.5px; margin-top:2px;">ID: #${evt.id} &bull; ${evt.description ? evt.description.slice(0, 50) + '...' : ''}</div>
                </td>
                <td style="color:#cbd5e1; font-size:10px;">
                    ${startStr} ➔ ${endStr}
                </td>
                <td style="text-align:center; font-family:'Orbitron',sans-serif; color:#38bdf8; font-weight:700; font-size:10.5px;">
                    ${evt.grid_rows || 4}x${evt.grid_cols || 4} <span style="font-size:9px; color:#94a3b8;">(${evt.total_pieces || 16} Pzs)</span>
                </td>
                <td style="text-align:center; font-size:10px;">
                    <span style="color:#94a3b8;">NPC:</span> <b style="color:#fff;">${npcRate}%</b> | <span style="color:#94a3b8;">PvP:</span> <b style="color:#00ff88;">${pvpRate}%</b>
                </td>
                <td style="text-align:center; font-family:'Orbitron',sans-serif; color:#ffd700; font-weight:700; font-size:10.5px;">
                    ⭐ ${evt.payout_per_leftover_piece || 50}
                </td>
                <td style="text-align:center;">
                    ${statusHtml}
                </td>
                <td style="text-align:center; font-family:'Orbitron',sans-serif; font-weight:700; color:#ffd700; font-size:10px;">
                    ${evt.winners_count !== undefined ? evt.winners_count : (evt.winners ? evt.winners.length : 0)} / 10
                </td>
                <td style="text-align:center;">
                    <div class="actions-group" style="justify-content:center;">
                        <a href="editor.html?id=${evt.id}" class="btn-act-sm btn-act-edit" title="Editar y gestionar evento" style="text-decoration:none; padding:4px 16px; font-size:10px;">
                            EDITAR
                        </a>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderEmptyAdminTable() {
    const tbody = document.getElementById('admin-puzzles-tbody');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#94a3b8; padding:24px;">No se pudieron cargar los registros.</td></tr>`;
    }
}

// ----------------------------------------------------------------------------
// MODAL DE GANADORES REGISTRADOS
// ----------------------------------------------------------------------------
async function openWinnersModal(eventId, title) {
    document.getElementById('winners-modal-title').textContent = `PODIO TOP 10: ${title}`;
    const tbody = document.getElementById('admin-event-winners-tbody');
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:16px;">Consultando ganadores...</td></tr>`;
    document.getElementById('admin-winners-modal').style.display = 'flex';

    try {
        const res = await fetch(`/api/events/puzzle/status?eventId=${eventId}`);
        const data = await res.json();

        if (data && data.success && data.data && Array.isArray(data.data.winners) && data.data.winners.length > 0) {
            tbody.innerHTML = data.data.winners.map(w => {
                let prizeStr = '';
                if (w.prize) {
                    if (w.prize.starships && w.prize.starships !== '0') {
                        const num = Number(w.prize.starships);
                        prizeStr += isNaN(num) ? `⭐ ${w.prize.starships}` : `⭐ ${num.toLocaleString()} ST`;
                    }
                    if (w.prize.vip_days && w.prize.vip_days !== '0') {
                        prizeStr += `${prizeStr ? ' + ' : ''}👑 ${w.prize.vip_days}`;
                    }
                    if (w.prize.avatar_code) {
                        prizeStr += `${prizeStr ? ' + ' : ''}👤 ${w.prize.avatar_code}`;
                    }
                }
                if (!prizeStr) prizeStr = '-';

                return `
                    <tr>
                        <td style="font-family:'Orbitron',sans-serif; font-weight:800; color:#ffd700; text-align:center;">#${w.position}</td>
                        <td style="font-weight:700; color:#fff;">${w.username}</td>
                        <td style="color:#cbd5e1; font-size:10px;">${new Date(w.completed_at).toLocaleString('es-ES')}</td>
                        <td style="color:#00ff88; font-family:'Orbitron',sans-serif; font-size:10.5px;">${prizeStr}</td>
                        <td style="text-align:center;">
                            <span class="status-badge" style="background:rgba(234,179,8,0.2); border:1px solid #eab308; color:#fef08a;">
                                ${w.delivered ? 'ENTREGADO' : 'PENDIENTE'}
                            </span>
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:20px;">⚡ Aún no hay ganadores registrados para este evento.</td></tr>`;
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#ff4d4f; padding:16px;">Error al cargar ganadores.</td></tr>`;
    }
}

function closeWinnersModal() {
    document.getElementById('admin-winners-modal').style.display = 'none';
}

// ----------------------------------------------------------------------------
// ACCIONES DE REINICIO Y FINALIZACIÓN DE EVENTOS
// ----------------------------------------------------------------------------
async function onAdminFinishEvent(eventId, title) {
    const confirmMsg = `¿Deseas FINALIZAR el evento "${title}" (ID #${eventId}) inmediatamente?\n\n• Se ajustará la fecha de término a este instante.\n• Se detendrán los drops de fichas tras los duelos.\n• Quedará habilitado el canje de fichas sobrantes por Starships y el reclamo de recompensas.`;

    const executeFinish = async () => {
        try {
            const res = await fetch('/api/events/admin/finish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId })
            });
            const data = await res.json();
            if (data && data.success) {
                if (window.showAniModal) {
                    window.showAniModal({
                        title: 'EVENTO FINALIZADO',
                        message: data.message || 'El evento ha sido finalizado con éxito.',
                        type: 'success'
                    });
                } else {
                    alert(data.message || 'Evento finalizado con éxito.');
                }
                loadAdminPuzzleEvents();
            } else {
                throw new Error(data.message || 'Error al finalizar el evento');
            }
        } catch (err) {
            console.error('[ADMIN FINISH ERROR]', err);
            if (window.showAniModal) {
                window.showAniModal({
                    title: 'ERROR AL FINALIZAR',
                    message: err.message,
                    type: 'error'
                });
            } else {
                alert('Error: ' + err.message);
            }
        }
    };

    if (window.showAniModal) {
        window.showAniModal({
            title: 'FINALIZAR EVENTO',
            message: confirmMsg,
            type: 'warning',
            confirmText: 'FINALIZAR AHORA',
            onConfirm: executeFinish
        });
    } else if (confirm(confirmMsg)) {
        executeFinish();
    }
}

async function onAdminResetEvent(eventId, title) {
    const confirmMsg = `⚠️ ATENCIÓN: ¿Deseas REINICIAR el evento "${title}" (ID #${eventId})?\n\n• Se ELIMINARÁN todas las fichas entregadas a los jugadores.\n• Se limpiará el podio de ganadores (Top 10).\n• Se eliminarán los canjes de fichas sobrantes previos.\n• El evento volverá a quedar activo desde cero para pruebas limpias.\n\n¿Deseas proceder con el reinicio?`;

    const executeReset = async () => {
        try {
            const res = await fetch('/api/events/admin/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId })
            });
            const data = await res.json();
            if (data && data.success) {
                if (window.showAniModal) {
                    window.showAniModal({
                        title: 'EVENTO REINICIADO',
                        message: data.message || 'El evento ha sido reiniciado desde cero exitosamente.',
                        type: 'success'
                    });
                } else {
                    alert(data.message || 'Evento reiniciado.');
                }
                loadAdminPuzzleEvents();
            } else {
                throw new Error(data.message || 'Error al reiniciar el evento');
            }
        } catch (err) {
            console.error('[ADMIN RESET ERROR]', err);
            if (window.showAniModal) {
                window.showAniModal({
                    title: 'ERROR AL REINICIAR',
                    message: err.message,
                    type: 'error'
                });
            } else {
                alert('Error: ' + err.message);
            }
        }
    };

    if (window.showAniModal) {
        window.showAniModal({
            title: 'REINICIAR EVENTO',
            message: confirmMsg,
            type: 'error',
            confirmText: 'REINICIAR AHORA',
            onConfirm: executeReset
        });
    } else if (confirm(confirmMsg)) {
        executeReset();
    }
}

window.openWinnersModal = openWinnersModal;
window.closeWinnersModal = closeWinnersModal;
window.onPuzzleSearch = onPuzzleSearch;
window.onAdminFinishEvent = onAdminFinishEvent;
window.onAdminResetEvent = onAdminResetEvent;
