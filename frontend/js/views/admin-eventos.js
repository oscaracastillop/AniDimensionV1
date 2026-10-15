/**
 * ============================================================================
 * ANI-DIMENSION: CONTROLADOR DE ADMINISTRACIÓN DE EVENTOS
 * ============================================================================
 */

var adminCurrentEvent = null;

document.addEventListener('DOMContentLoaded', () => {
    if (window.Session && !window.Session.requireAuth('../../login/login.html')) {
        return;
    }

    const user = window.Session ? window.Session.getUser() : null;
    if (!user || (!user.isAdmin && user.role !== 'admin' && user.username !== 'Admin')) {
        alert('Acceso restringido a Administradores.');
        window.location.href = '../../lobby/lobby.html';
        return;
    }

    loadAdminEventsData();
});

async function loadAdminEventsData() {
    try {
        const res = await fetch('/api/events/admin/all');
        const data = await res.json();

        if (data && data.success && data.events && data.events.length > 0) {
            adminCurrentEvent = data.events[0];
            populateEventForm(adminCurrentEvent);
            loadWinnersData(adminCurrentEvent.id);
        } else {
            // Cargar valores por defecto
            resetEventFormDefaults();
        }
    } catch (e) {
        console.error('[ADMIN EVENTS LOAD ERROR]', e);
    }
}

function populateEventForm(evt) {
    if (!evt) return;

    document.getElementById('evt-id').value = evt.id || '';
    document.getElementById('evt-title').value = evt.title || '';
    document.getElementById('evt-desc').value = evt.description || '';
    document.getElementById('evt-image-url').value = evt.image_url || '';
    document.getElementById('evt-image-preview').src = evt.image_url || '/assets/images/events/halloween_maga_oscura.jpg';
    
    // Fechas en formato datetime-local
    if (evt.start_date) {
        const sDate = new Date(evt.start_date);
        document.getElementById('evt-start-date').value = sDate.toISOString().slice(0, 16);
    }
    if (evt.end_date) {
        const eDate = new Date(evt.end_date);
        document.getElementById('evt-end-date').value = eDate.toISOString().slice(0, 16);
    }

    document.getElementById('evt-grid-size').value = `${evt.grid_rows || 4}x${evt.grid_cols || 4}`;
    document.getElementById('evt-leftover-payout').value = evt.payout_per_leftover_piece || 50;
    document.getElementById('evt-drop-npc').value = Math.round((evt.drop_rate_npc || 0.40) * 100);
    document.getElementById('evt-drop-pvp').value = Math.round((evt.drop_rate_pvp || 0.75) * 100);

    renderPrizesConfigTable(evt.prizes_config || []);
}

function renderPrizesConfigTable(prizes) {
    const tbody = document.getElementById('admin-prizes-tbody');
    if (!tbody) return;

    let html = '';
    for (let i = 1; i <= 10; i++) {
        const prize = prizes.find(p => p.place === i) || {
            place: i,
            title: `${i}° Lugar`,
            starships: i === 1 ? 50000 : (i === 2 ? 35000 : (i === 3 ? 25000 : 5000)),
            vip_days: i === 1 ? 30 : (i === 2 ? 15 : (i === 3 ? 7 : 0)),
            avatar_code: i <= 3 ? `AVA-HALLOWEEN-0${i}` : '',
            medal: i <= 3 ? `MEDAL-HALLOWEEN-0${i}` : ''
        };

        html += `
            <tr>
                <td style="font-family:'Orbitron',sans-serif; font-weight:800; color:#ffd700;">#${i}</td>
                <td><input type="text" id="prize-title-${i}" value="${prize.title}"></td>
                <td><input type="number" id="prize-starships-${i}" value="${prize.starships}"></td>
                <td><input type="number" id="prize-vip-${i}" value="${prize.vip_days || 0}"></td>
                <td><input type="text" id="prize-avatar-${i}" value="${prize.avatar_code || ''}" placeholder="Ej: AVA-001"></td>
            </tr>
        `;
    }
    tbody.innerHTML = html;
}

function onImageUrlChange() {
    const url = document.getElementById('evt-image-url').value;
    const preview = document.getElementById('evt-image-preview');
    if (preview && url) {
        preview.src = url;
    }
}

async function onSaveEventSubmit(e) {
    if (e) e.preventDefault();

    const id = document.getElementById('evt-id').value;
    const title = document.getElementById('evt-title').value.trim();
    const description = document.getElementById('evt-desc').value.trim();
    const image_url = document.getElementById('evt-image-url').value.trim();
    const start_date = document.getElementById('evt-start-date').value;
    const end_date = document.getElementById('evt-end-date').value;
    const gridSize = document.getElementById('evt-grid-size').value.split('x');
    const payout_per_leftover_piece = parseInt(document.getElementById('evt-leftover-payout').value, 10) || 50;
    const drop_rate_npc = parseFloat(document.getElementById('evt-drop-npc').value) / 100 || 0.40;
    const drop_rate_pvp = parseFloat(document.getElementById('evt-drop-pvp').value) / 100 || 0.75;

    // Recoger tabla de premios Top 10
    const prizes_config = [];
    for (let i = 1; i <= 10; i++) {
        prizes_config.push({
            place: i,
            title: document.getElementById(`prize-title-${i}`).value.trim() || `${i}° Lugar`,
            starships: parseInt(document.getElementById(`prize-starships-${i}`).value, 10) || 0,
            vip_days: parseInt(document.getElementById(`prize-vip-${i}`).value, 10) || 0,
            avatar_code: document.getElementById(`prize-avatar-${i}`).value.trim(),
            badge: `TOP ${i}`
        });
    }

    const payload = {
        id: id || 1,
        title,
        description,
        image_url,
        start_date: new Date(start_date).toISOString(),
        end_date: new Date(end_date).toISOString(),
        grid_rows: parseInt(gridSize[0], 10),
        grid_cols: parseInt(gridSize[1], 10),
        payout_per_leftover_piece,
        drop_rate_npc,
        drop_rate_pvp,
        prizes_config,
        is_active: true
    };

    try {
        const res = await fetch('/api/events/admin/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data && data.success) {
            alert('✅ Evento guardado y publicado exitosamente en la plataforma.');
            loadAdminEventsData();
        } else {
            alert(`⚠️ Error al guardar: ${data.message || 'Error desconocido'}`);
        }
    } catch (err) {
        alert('Error al conectar con el servidor.');
    }
}

async function loadWinnersData(eventId) {
    try {
        const res = await fetch(`/api/events/puzzle/status?eventId=${eventId}`);
        const data = await res.json();

        if (data && data.success && data.data) {
            const winners = data.data.winners || [];
            renderAdminWinnersTable(winners);
        }
    } catch (e) {
        console.warn('[ADMIN WINNERS NOTICE]', e);
    }
}

function renderAdminWinnersTable(winners) {
    const tbody = document.getElementById('admin-winners-tbody');
    if (!tbody) return;

    if (!winners || winners.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:16px;">⚡ Aún no hay ganadores registrados. El primero en completar el rompecabezas ocupará el 1er Lugar automáticamente.</td></tr>`;
        return;
    }

    tbody.innerHTML = winners.map(w => {
        const prizeDesc = w.prize ? `⭐ ${w.prize.starships.toLocaleString()} ST${w.prize.vip_days > 0 ? ` + 👑 VIP ${w.prize.vip_days}D` : ''}` : '-';
        const timeStr = w.completed_at ? new Date(w.completed_at).toLocaleString('es-ES') : '-';
        return `
            <tr>
                <td style="font-family:'Orbitron',sans-serif; font-weight:800; color:#ffd700;">#${w.position}</td>
                <td style="font-weight:700; color:#fff;">${w.username} (ID: ${w.user_id})</td>
                <td style="color:#cbd5e1;">${timeStr}</td>
                <td style="color:#00ff88; font-family:'Orbitron',sans-serif;">${prizeDesc}</td>
                <td>
                    <span style="background:rgba(234,179,8,0.2); border:1px solid #eab308; color:#fef08a; font-size:10px; padding:2px 6px; font-weight:700;">
                        ${w.delivered ? 'ENTREGADO' : 'PENDIENTE (FIN DE EVENTO)'}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

// Herramienta de Test: Simular drop de ficha para probar
async function onSimulateDropTest() {
    const user = window.Session ? window.Session.getUser() : null;
    const userId = user ? (user.id || user.user_id || 1) : 1;
    const username = user ? (user.username || 'Admin') : 'Admin';

    try {
        const res = await fetch('/api/events/puzzle/roll-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, username, isPvp: true })
        });
        const data = await res.json();
        if (data && data.success && data.drop) {
            alert(`🎲 [SIMULACIÓN DROP] ¡Ficha obtenida: Ficha #${data.drop.piece_number}! (${data.drop.current_pieces_count}/${data.drop.total_pieces} fichas totales).`);
        } else {
            alert('🎲 [SIMULACIÓN DROP] La tirada no arrojó ficha en esta ocasión (Drop Rate aplicado).');
        }
    } catch (e) {
        alert('Error en simulación.');
    }
}

window.onImageUrlChange = onImageUrlChange;
window.onSaveEventSubmit = onSaveEventSubmit;
window.onSimulateDropTest = onSimulateDropTest;
