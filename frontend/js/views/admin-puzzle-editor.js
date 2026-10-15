/**
 * ============================================================================
 * ANI-DIMENSION: CONTROLADOR VISTA DEDICADA EDITOR DE ROMPECABEZAS (ADMIN)
 * CARGA DE IMÁGENES DESDE DISPOSITIVO + PERSISTENCIA + TABLA TOP 10 COMPACTA
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', async () => {
    if (window.Session && !window.Session.requireAuth('../../../login/login.html')) {
        return;
    }

    const user = window.Session ? window.Session.getUser() : null;
    if (!user || (!user.isAdmin && user.role !== 'admin' && user.username !== 'Admin')) {
        if (window.showAniModal) {
            window.showAniModal('ACCESO DENEGADO', 'Acceso restringido a Administradores.', 'error', 'SALIR', () => {
                window.location.href = '../../../lobby/lobby.html';
            });
        } else {
            window.location.href = '../../../lobby/lobby.html';
        }
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');

    if (eventId) {
        await loadEventForEditing(parseInt(eventId, 10));
    } else {
        setupNewEventDefaults();
    }
});

function setupNewEventDefaults() {
    document.getElementById('editor-page-title').textContent = 'CONFIGURAR NUEVO EVENTO';
    document.getElementById('editor-evt-id').value = '';
    document.getElementById('editor-evt-title').value = '';
    document.getElementById('editor-evt-desc').value = '';
    document.getElementById('editor-evt-img-data').value = '';

    const now = new Date();
    const end = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30);
    document.getElementById('editor-evt-start').value = now.toISOString().slice(0, 16);
    document.getElementById('editor-evt-end').value = end.toISOString().slice(0, 16);
    document.getElementById('editor-evt-grid').value = '4x4';
    document.getElementById('editor-evt-npc').value = 40;
    document.getElementById('editor-evt-pvp').value = 75;
    document.getElementById('editor-evt-payout').value = 50;
    document.getElementById('editor-evt-img-url').value = '/assets/images/events/halloween_maga_oscura.jpg';
    document.getElementById('editor-evt-img-preview').src = '/assets/images/events/halloween_maga_oscura.jpg';

    renderEditorPrizesTable([]);
}

async function loadEventForEditing(eventId) {
    try {
        const res = await fetch('/api/events/admin/all');
        const data = await res.json();

        if (data && data.success && Array.isArray(data.events)) {
            const evt = data.events.find(e => e.id === eventId);
            if (!evt) {
                if (window.showAniModal) {
                    window.showAniModal('EVENTO NO ENCONTRADO', 'El evento no existe.', 'error', 'VOLVER', () => {
                        window.location.href = 'rompecabezas.html';
                    });
                } else {
                    window.location.href = 'rompecabezas.html';
                }
                return;
            }

            document.getElementById('editor-page-title').textContent = `EDITAR: ${evt.title}`;
            document.getElementById('editor-evt-id').value = evt.id;
            document.getElementById('editor-evt-title').value = evt.title;
            document.getElementById('editor-evt-desc').value = evt.description || '';
            document.getElementById('editor-evt-img-data').value = '';

            const btnPodio = document.getElementById('btn-editor-podio');
            const btnFinish = document.getElementById('btn-editor-finish');
            const btnReset = document.getElementById('btn-editor-reset');
            if (btnPodio) btnPodio.style.display = 'flex';
            if (btnFinish) btnFinish.style.display = 'flex';
            if (btnReset) btnReset.style.display = 'flex';

            if (evt.start_date) document.getElementById('editor-evt-start').value = new Date(evt.start_date).toISOString().slice(0, 16);
            if (evt.end_date) document.getElementById('editor-evt-end').value = new Date(evt.end_date).toISOString().slice(0, 16);

            document.getElementById('editor-evt-grid').value = `${evt.grid_rows || 4}x${evt.grid_cols || 4}`;
            document.getElementById('editor-evt-npc').value = Math.round((evt.drop_rate_npc || 0.40) * 100);
            document.getElementById('editor-evt-pvp').value = Math.round((evt.drop_rate_pvp || 0.75) * 100);
            document.getElementById('editor-evt-payout').value = evt.payout_per_leftover_piece || 50;

            const imgUrl = evt.image_url || '/assets/images/events/halloween_maga_oscura.jpg';
            document.getElementById('editor-evt-img-url').value = imgUrl;
            document.getElementById('editor-evt-img-preview').src = imgUrl;

            renderEditorPrizesTable(evt.prizes_config || []);
        } else {
            window.showAniModal ? window.showAniModal('ERROR', 'Error al consultar datos.', 'error') : alert('Error al consultar datos.');
        }
    } catch (e) {
        console.error('[LOAD EVENT ERROR]', e);
        window.showAniModal ? window.showAniModal('ERROR', 'Error de conexión con el servidor.', 'error') : alert('Error de conexión.');
    }
}

function onEditorFileSelected(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('editor-evt-img-preview');
            const dataInput = document.getElementById('editor-evt-img-data');
            const urlInput = document.getElementById('editor-evt-img-url');

            if (preview) preview.src = e.target.result;
            if (dataInput) dataInput.value = e.target.result;
            if (urlInput) urlInput.value = file.name;
        };
        reader.readAsDataURL(file);
    }
}

function onEditorImagePreviewChange() {
    const url = document.getElementById('editor-evt-img-url').value;
    const preview = document.getElementById('editor-evt-img-preview');
    if (preview && url && !url.startsWith('data:')) {
        preview.src = url;
    }
}

function renderEditorPrizesTable(prizes) {
    const tbody = document.getElementById('editor-prizes-tbody');
    if (!tbody) return;

    let html = '';
    for (let i = 1; i <= 10; i++) {
        const prize = (prizes && prizes.find(p => p.place === i)) || {
            place: i,
            title: `${i}° Lugar`,
            starships: i === 1 ? '50000' : (i === 2 ? '35000' : (i === 3 ? '25000' : (i === 4 ? '15000' : '5000'))),
            vip_days: i === 1 ? '30 Días' : (i === 2 ? '15 Días' : (i === 3 ? '7 Días' : '0')),
            avatar_code: i <= 3 ? `AVA-EVENT-0${i}` : ''
        };

        const starVal = prize.starships !== undefined && prize.starships !== null ? String(prize.starships) : '';
        const vipVal = prize.vip_days !== undefined && prize.vip_days !== null ? String(prize.vip_days) : '';
        const avaVal = prize.avatar_code ? String(prize.avatar_code) : '';

        html += `
            <tr style="height:23px;">
                <td style="font-family:'Orbitron',sans-serif; font-weight:700; color:#ffd700; text-align:center; font-size:9px; padding:1px 3px;">
                    #${i}
                </td>
                <td style="padding:1px 3px;">
                    <input type="text" id="prize-starships-${i}" value="${starVal}" class="admin-form-input" style="font-family:'Outfit',sans-serif; color:#ffd700; font-weight:600; padding:2px 4px; font-size:9.5px; height:20px;" placeholder="Ej: 50000 o 50K ST">
                </td>
                <td style="padding:1px 3px;">
                    <input type="text" id="prize-vip-${i}" value="${vipVal}" class="admin-form-input" style="font-family:'Outfit',sans-serif; color:#00f0ff; font-weight:600; padding:2px 4px; font-size:9.5px; height:20px;" placeholder="Ej: 30 Días o 1 Mes">
                </td>
                <td style="padding:1px 3px;">
                    <input type="text" id="prize-avatar-${i}" value="${avaVal}" class="admin-form-input" style="padding:2px 4px; font-size:9.5px; height:20px;" placeholder="Ej: AVA-HALLOWEEN-01">
                </td>
            </tr>
        `;
    }
    tbody.innerHTML = html;
}

async function onSavePuzzleForm(e) {
    if (e) e.preventDefault();

    const idVal = document.getElementById('editor-evt-id').value;
    const title = document.getElementById('editor-evt-title').value.trim();
    const description = document.getElementById('editor-evt-desc').value.trim();
    const image_url = document.getElementById('editor-evt-img-url').value.trim();
    const image_data = document.getElementById('editor-evt-img-data').value.trim();
    const start_date = document.getElementById('editor-evt-start').value;
    const end_date = document.getElementById('editor-evt-end').value;
    const gridSize = document.getElementById('editor-evt-grid').value.split('x');
    const payout_per_leftover_piece = parseInt(document.getElementById('editor-evt-payout').value, 10) || 50;
    const drop_rate_npc = parseFloat(document.getElementById('editor-evt-npc').value) / 100 || 0.40;
    const drop_rate_pvp = parseFloat(document.getElementById('editor-evt-pvp').value) / 100 || 0.75;

    if (!title || !description || (!image_url && !image_data) || !start_date || !end_date) {
        window.showAniModal ? window.showAniModal('CAMPOS REQUERIDOS', 'Por favor completa todos los campos obligatorios (*).', 'warning') : alert('Por favor completa todos los campos requeridos (*).');
        return;
    }

    const prizes_config = [];
    for (let i = 1; i <= 10; i++) {
        prizes_config.push({
            place: i,
            title: `${i}° Lugar`,
            starships: document.getElementById(`prize-starships-${i}`).value.trim(),
            vip_days: document.getElementById(`prize-vip-${i}`).value.trim(),
            avatar_code: document.getElementById(`prize-avatar-${i}`).value.trim(),
            badge: `TOP ${i}`
        });
    }


    const payload = {
        id: idVal ? parseInt(idVal, 10) : undefined,
        title,
        description,
        image_url,
        image_data: image_data || undefined,
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
            window.showAniModal(
                'OPERACIÓN EXITOSA',
                'El evento de rompecabezas ha sido guardado exitosamente.',
                'success',
                'CONTINUAR',
                () => {
                    window.location.href = 'rompecabezas.html';
                }
            );
        } else {
            window.showAniModal ? window.showAniModal('ERROR AL GUARDAR', data.message || 'No se pudo guardar la configuración.', 'error') : alert('Error al guardar.');
        }
    } catch (err) {
        window.showAniModal ? window.showAniModal('ERROR DE CONEXIÓN', 'No se pudo conectar con el servidor.', 'error') : alert('Error de conexión.');
    }
}

async function onAdminSimulateDrop() {
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
            const msg = `¡Ficha obtenida: Ficha #${data.drop.piece_number}!\n(${data.drop.current_pieces_count}/${data.drop.total_pieces} fichas totales en posesión).`;
            window.showAniModal ? window.showAniModal('SIMULACIÓN DROP IA', msg, 'success') : alert(msg);
        } else {
            const msg = 'La tirada no arrojó ficha en esta ocasión según las probabilidades.';
            window.showAniModal ? window.showAniModal('SIMULACIÓN DROP IA', msg, 'info') : alert(msg);
        }
    } catch (e) {
        window.showAniModal ? window.showAniModal('ERROR', 'Error al simular drop con el motor IA.', 'error') : alert('Error en simulación.');
    }
}

async function onAdminEditorFinish() {
    const eventId = document.getElementById('editor-evt-id').value;
    const title = document.getElementById('editor-evt-title').value || 'Evento';
    if (!eventId) return;

    const confirmMsg = `¿Deseas FINALIZAR el evento "${title}" inmediatamente?\n\n• Se ajustará la fecha de fin al instante actual.\n• Se detendrán los drops de fichas.\n• Quedará habilitado el canje de fichas sobrantes por Starships.`;

    const executeFinish = async () => {
        try {
            const res = await fetch('/api/events/admin/finish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId: parseInt(eventId, 10) })
            });
            const data = await res.json();
            if (data && data.success) {
                if (window.showAniModal) {
                    window.showAniModal({
                        title: 'EVENTO FINALIZADO',
                        message: data.message || 'El evento ha sido finalizado con éxito.',
                        type: 'success',
                        confirmText: 'CONTINUAR',
                        onConfirm: () => {
                            window.location.href = 'rompecabezas.html';
                        }
                    });
                } else {
                    alert(data.message || 'Evento finalizado.');
                    window.location.href = 'rompecabezas.html';
                }
            } else {
                throw new Error(data.message || 'Error al finalizar el evento');
            }
        } catch (err) {
            window.showAniModal ? window.showAniModal('ERROR AL FINALIZAR', err.message, 'error') : alert('Error: ' + err.message);
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

async function onAdminEditorReset() {
    const eventId = document.getElementById('editor-evt-id').value;
    const title = document.getElementById('editor-evt-title').value || 'Evento';
    if (!eventId) return;

    const confirmMsg = `⚠️ ATENCIÓN: ¿Deseas REINICIAR el evento "${title}"?\n\n• Se eliminarán todas las fichas de todos los jugadores.\n• Se limpiará el podio de ganadores (Top 10).\n• Se eliminarán los canjes realizados.\n• El evento quedará listo desde cero para nuevas pruebas limpias.`;

    const executeReset = async () => {
        try {
            const res = await fetch('/api/events/admin/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId: parseInt(eventId, 10) })
            });
            const data = await res.json();
            if (data && data.success) {
                if (window.showAniModal) {
                    window.showAniModal({
                        title: 'EVENTO REINICIADO',
                        message: data.message || 'El evento ha sido reiniciado desde cero exitosamente.',
                        type: 'success',
                        confirmText: 'CONTINUAR',
                        onConfirm: () => {
                            window.location.href = 'rompecabezas.html';
                        }
                    });
                } else {
                    alert(data.message || 'Evento reiniciado.');
                    window.location.href = 'rompecabezas.html';
                }
            } else {
                throw new Error(data.message || 'Error al reiniciar el evento');
            }
        } catch (err) {
            window.showAniModal ? window.showAniModal('ERROR AL REINICIAR', err.message, 'error') : alert('Error: ' + err.message);
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

async function openEditorWinnersModal() {
    const eventId = document.getElementById('editor-evt-id').value;
    const title = document.getElementById('editor-evt-title').value || 'Evento';
    if (!eventId) return;

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
                        prizeStr += isNaN(num) ? `${w.prize.starships} ST` : `${num.toLocaleString()} ST`;
                    }
                    if (w.prize.vip_days && w.prize.vip_days !== '0') {
                        prizeStr += `${prizeStr ? ' + ' : ''}VIP ${w.prize.vip_days}D`;
                    }
                    if (w.prize.avatar_code) {
                        prizeStr += `${prizeStr ? ' + ' : ''}Avatar ${w.prize.avatar_code}`;
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
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:20px;">Aún no hay ganadores registrados para este evento.</td></tr>`;
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#ff4d4f; padding:16px;">Error al cargar ganadores.</td></tr>`;
    }
}

function closeEditorWinnersModal() {
    const modal = document.getElementById('admin-winners-modal');
    if (modal) modal.style.display = 'none';
}

window.onEditorFileSelected = onEditorFileSelected;
window.onEditorImagePreviewChange = onEditorImagePreviewChange;
window.onSavePuzzleForm = onSavePuzzleForm;
window.onAdminSimulateDrop = onAdminSimulateDrop;
window.onAdminEditorFinish = onAdminEditorFinish;
window.onAdminEditorReset = onAdminEditorReset;
window.openEditorWinnersModal = openEditorWinnersModal;
window.closeEditorWinnersModal = closeEditorWinnersModal;
