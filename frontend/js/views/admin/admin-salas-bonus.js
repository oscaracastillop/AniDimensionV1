/**
 * Ani-Dimension: Controlador del Panel de Administración de Bonificaciones de Salas PvP
 */
var allBonusEvents = [];
var activeBonusEvent = null;

document.addEventListener('DOMContentLoaded', () => {
    // Validar sesión de admin
    if (window.Session && !window.Session.requireAuth('../../../login/login.html')) return;
    
    // Verificar permisos
    const user = window.Session ? window.Session.getUser() : null;
    if (!user || (!user.isAdmin && user.username !== 'Admin')) {
        if (window.showAniModal) {
            window.showAniModal('ACCESO DENEGADO', 'Se requieren credenciales de Administrador.', 'error');
        }
        setTimeout(() => { window.location.href = '../../menu.html'; }, 1500);
        return;
    }

    loadBonusEvents();
    setDefaultDateInputs();
    updateLivePreview();
});

function setDefaultDateInputs() {
    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + 7);

    const startInput = document.getElementById('bonus-start-input');
    const endInput = document.getElementById('bonus-end-input');

    if (startInput) startInput.value = formatDateTimeForInput(now);
    if (endInput) endInput.value = formatDateTimeForInput(future);
}

function formatDateTimeForInput(date) {
    const d = new Date(date);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function loadBonusEvents() {
    const tbody = document.getElementById('admin-bonus-tbody');
    try {
        const user = window.Session ? window.Session.getUser() : {};
        const res = await fetch('/api/admin/pvp-bonus-events', {
            headers: {
                'x-user-id': user.id || 1,
                'x-admin-username': user.username || 'Admin'
            }
        });
        const data = await res.json();

        if (data && data.success) {
            allBonusEvents = data.events || [];
            activeBonusEvent = data.activeBonus || null;
            renderBonusTable(allBonusEvents);
            renderLiveBanner(activeBonusEvent);
        } else {
            if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#ef4444; padding:20px;">Error: ${data.message || 'No se pudieron cargar los eventos'}</td></tr>`;
        }
    } catch (err) {
        console.error('[LOAD PVP BONUS ERROR]', err);
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#ef4444; padding:20px;">Error al conectar con el servidor.</td></tr>`;
    }
}

function renderLiveBanner(active) {
    const banner = document.getElementById('active-bonus-live-banner');
    if (!banner) return;

    if (active && active.isActive) {
        banner.style.display = 'flex';
        const titleEl = document.getElementById('live-bonus-title');
        const descEl = document.getElementById('live-bonus-desc');
        const timeEl = document.getElementById('live-bonus-time-badge');

        if (titleEl) titleEl.textContent = `🔥 ${active.title.toUpperCase()} (EN CURSO)`;
        if (descEl) descEl.textContent = `⚡ +${active.expBonusPct}% EXP / ★ +${active.starshipsBonusPct}% Starships | Termina: ${new Date(active.endDate).toLocaleString()}`;
        if (timeEl) timeEl.textContent = `ACTIVO HASTA ${new Date(active.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
        banner.style.display = 'none';
    }
}

function renderBonusTable(events) {
    const tbody = document.getElementById('admin-bonus-tbody');
    if (!tbody) return;

    if (!events || events.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#94a3b8; padding:24px;">No hay eventos de bonificación configurados. ¡Crea el primero!</td></tr>`;
        return;
    }

    const now = new Date();

    tbody.innerHTML = events.map(ev => {
        const start = new Date(ev.StartDate);
        const end = new Date(ev.EndDate);
        const isCurrentlyRunning = ev.IsActive && now >= start && now <= end;
        const isExpired = now > end;

        let statusBadge = '';
        if (isCurrentlyRunning) {
            statusBadge = `<span style="background:rgba(16,185,129,0.2); border:1px solid #10b981; color:#10b981; padding:3px 8px; font-size:9.5px; font-weight:800; border-radius:4px; font-family:'Orbitron', sans-serif;">🔥 EN CURSO</span>`;
        } else if (ev.IsActive && !isExpired) {
            statusBadge = `<span style="background:rgba(0,240,255,0.2); border:1px solid #00f0ff; color:#00f0ff; padding:3px 8px; font-size:9.5px; font-weight:800; border-radius:4px; font-family:'Orbitron', sans-serif;">PROGRAMADO</span>`;
        } else if (isExpired) {
            statusBadge = `<span style="background:rgba(100,116,139,0.2); border:1px solid #64748b; color:#94a3b8; padding:3px 8px; font-size:9.5px; font-weight:800; border-radius:4px; font-family:'Orbitron', sans-serif;">FINALIZADO</span>`;
        } else {
            statusBadge = `<span style="background:rgba(239,68,68,0.2); border:1px solid #ef4444; color:#ef4444; padding:3px 8px; font-size:9.5px; font-weight:800; border-radius:4px; font-family:'Orbitron', sans-serif;">INACTIVO</span>`;
        }

        return `
            <tr style="height:48px; border-bottom:1px solid rgba(255,255,255,0.06);">
                <td style="font-weight:800; color:#fff; font-family:'Orbitron', sans-serif; font-size:11.5px;">
                    ${ev.Title}
                    ${ev.Description ? `<div style="font-size:9px; color:#94a3b8; font-weight:400; margin-top:2px;">${ev.Description}</div>` : ''}
                </td>
                <td style="font-size:10.5px; color:#cbd5e1;">${start.toLocaleString()}</td>
                <td style="font-size:10.5px; color:#cbd5e1;">${end.toLocaleString()}</td>
                <td style="text-align:center; color:#00f0ff; font-weight:800; font-family:'Orbitron', sans-serif; font-size:11px;">+${ev.ExpBonusPct}%</td>
                <td style="text-align:center; color:#ffd700; font-weight:800; font-family:'Orbitron', sans-serif; font-size:11px;">+${ev.StarshipsBonusPct}%</td>
                <td style="text-align:center; font-size:10px; color:#cbd5e1;">
                    ${ev.SpecialRoomStyle === 'fire_glow' ? '🔥 Fuego Dorado' : (ev.SpecialRoomStyle === 'purple_vip' ? '💎 Púrpura VIP' : '⚡ Rayo Cian')}
                </td>
                <td style="text-align:center;">${statusBadge}</td>
                <td style="text-align:center;">
                    <div style="display:flex; gap:6px; justify-content:center;">
                        <button onclick="editBonusEvent(${ev.Id})" class="btn-act-sm btn-act-activate" style="height:24px; padding:0 8px; font-size:9px;" title="Editar Parámetros">
                            EDITAR
                        </button>
                        <button onclick="toggleBonusActive(${ev.Id}, ${!ev.IsActive})" style="height:24px; padding:0 8px; font-size:9px; background:${ev.IsActive ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}; border:1px solid ${ev.IsActive ? '#ef4444' : '#10b981'}; color:${ev.IsActive ? '#ef4444' : '#10b981'}; cursor:pointer; font-weight:700;">
                            ${ev.IsActive ? 'DESACTIVAR' : 'ACTIVAR'}
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function openBonusEditorModal() {
    document.getElementById('bonus-id-input').value = '0';
    document.getElementById('bonus-title-input').value = '🔥 Fiebre de Duelos PvP';
    document.getElementById('bonus-desc-input').value = '¡Bonus especial de EXP y StarShips en todas las salas!';
    document.getElementById('bonus-exp-slider').value = '50';
    document.getElementById('exp-val-tag').textContent = '+50%';
    document.getElementById('bonus-star-slider').value = '50';
    document.getElementById('star-val-tag').textContent = '+50%';
    document.getElementById('bonus-style-select').value = 'fire_glow';
    document.getElementById('bonus-active-check').checked = true;
    document.getElementById('bonus-modal-title').textContent = 'NUEVA BONIFICACIÓN DE SALAS PVP';

    setDefaultDateInputs();
    updateLivePreview();
    document.getElementById('admin-bonus-modal').style.display = 'flex';
}

function editBonusEvent(id) {
    const ev = allBonusEvents.find(e => e.Id === id);
    if (!ev) return;

    document.getElementById('bonus-id-input').value = ev.Id;
    document.getElementById('bonus-title-input').value = ev.Title;
    document.getElementById('bonus-desc-input').value = ev.Description || '';
    document.getElementById('bonus-start-input').value = formatDateTimeForInput(ev.StartDate);
    document.getElementById('bonus-end-input').value = formatDateTimeForInput(ev.EndDate);
    document.getElementById('bonus-exp-slider').value = ev.ExpBonusPct || 0;
    document.getElementById('exp-val-tag').textContent = `+${ev.ExpBonusPct}%`;
    document.getElementById('bonus-star-slider').value = ev.StarshipsBonusPct || 0;
    document.getElementById('star-val-tag').textContent = `+${ev.StarshipsBonusPct}%`;
    document.getElementById('bonus-style-select').value = ev.SpecialRoomStyle || 'fire_glow';
    document.getElementById('bonus-active-check').checked = Boolean(ev.IsActive);
    document.getElementById('bonus-modal-title').textContent = `EDITAR BONIFICACIÓN #${ev.Id}`;

    updateLivePreview();
    document.getElementById('admin-bonus-modal').style.display = 'flex';
}

function closeBonusEditorModal() {
    document.getElementById('admin-bonus-modal').style.display = 'none';
}

function updateLivePreview() {
    const container = document.getElementById('live-card-preview-container');
    if (!container) return;

    const title = document.getElementById('bonus-title-input').value || '🔥 Bonus PvP';
    const exp = document.getElementById('bonus-exp-slider').value || 50;
    const star = document.getElementById('bonus-star-slider').value || 50;
    const style = document.getElementById('bonus-style-select').value || 'fire_glow';
    const active = document.getElementById('bonus-active-check').checked;

    let glowBorder = 'border: 1.5px solid #f59e0b; box-shadow: 0 0 16px rgba(245, 158, 11, 0.45);';
    if (style === 'purple_vip') {
        glowBorder = 'border: 1.5px solid #c084fc; box-shadow: 0 0 16px rgba(192, 132, 252, 0.45);';
    } else if (style === 'cyan_cyber') {
        glowBorder = 'border: 1.5px solid #00f0ff; box-shadow: 0 0 16px rgba(0, 240, 255, 0.45);';
    }

    container.innerHTML = `
        <div class="pvp-room-card bonus-room-card" style="width:100%; margin:0; ${glowBorder}">
            <div class="room-header-tags" style="display:flex; justify-content:space-between; align-items:center;">
                <span class="room-badge-lock open">🔓 Libre</span>
                <span style="background:rgba(16,185,129,0.2); border:1px solid #10b981; color:#10b981; font-family:'Orbitron', sans-serif; font-size:8px; font-weight:800; padding:2px 6px; border-radius:3px;">🟢 ESPERANDO</span>
            </div>

            <div class="room-card-title">Sala #1 • Admin</div>

            <div class="room-host-box">
                <img src="/assets/images/avatars/AVA-001.png" onerror="this.onerror=null; this.src='/assets/images/packs/lob_pack.jpg';" class="room-host-avatar" style="border: 1.5px solid #ffd700;">
                <div class="room-host-meta">
                    <span class="room-host-name" style="color:#ffd700;">Admin 👑</span>
                    <span class="room-host-level">Nv. 500</span>
                </div>
            </div>

            <div class="room-footer-stats" style="display:flex; justify-content:space-between; align-items:center;">
                <span class="room-lvl-range">🎯 Nv. 1 - 500</span>
                <span style="background:linear-gradient(90deg, #f59e0b, #ef4444); color:#fff; font-family:'Orbitron', sans-serif; font-size:8px; font-weight:900; padding:2px 6px; border-radius:3px; box-shadow:0 0 8px rgba(245,158,11,0.6);">
                    🔥 +${exp}% EXP | +${star}% ★
                </span>
            </div>

            <button class="btn-join-room btn-join-active" style="cursor:default;">
                ⚡ ENTRAR AL DUELO
            </button>
        </div>
    `;
}

async function handleSaveBonus(event) {
    event.preventDefault();

    const id = parseInt(document.getElementById('bonus-id-input').value, 10) || 0;
    const title = document.getElementById('bonus-title-input').value.trim();
    const description = document.getElementById('bonus-desc-input').value.trim();
    const startDate = document.getElementById('bonus-start-input').value;
    const endDate = document.getElementById('bonus-end-input').value;
    const expBonusPct = parseFloat(document.getElementById('bonus-exp-slider').value) || 0;
    const starshipsBonusPct = parseFloat(document.getElementById('bonus-star-slider').value) || 0;
    const specialRoomStyle = document.getElementById('bonus-style-select').value;
    const isActive = document.getElementById('bonus-active-check').checked;

    if (!startDate || !endDate || new Date(startDate) >= new Date(endDate)) {
        if (window.showAniModal) {
            window.showAniModal('FECHAS INVÁLIDAS', 'La fecha de inicio debe ser anterior a la fecha de fin.', 'warning');
        } else {
            alert('La fecha de inicio debe ser anterior a la fecha de fin.');
        }
        return;
    }

    try {
        const user = window.Session ? window.Session.getUser() : {};
        const res = await fetch('/api/admin/pvp-bonus-events', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': user.id || 1,
                'x-admin-username': user.username || 'Admin'
            },
            body: JSON.stringify({
                id,
                title,
                description,
                startDate,
                endDate,
                expBonusPct,
                starshipsBonusPct,
                specialRoomStyle,
                isActive
            })
        });

        const data = await res.json();
        if (data && data.success) {
            if (window.showAniModal) {
                window.showAniModal('ÉXITO', data.message || 'Bonificación guardada exitosamente.', 'success');
            } else {
                alert('Bonificación guardada exitosamente.');
            }
            closeBonusEditorModal();
            loadBonusEvents();
        } else {
            if (window.showAniModal) {
                window.showAniModal('ERROR', data.message || 'Error al guardar.', 'error');
            } else {
                alert(data.message || 'Error al guardar.');
            }
        }
    } catch (err) {
        console.error('[SAVE BONUS ERROR]', err);
        if (window.showAniModal) {
            window.showAniModal('ERROR DE CONEXIÓN', err.message, 'error');
        }
    }
}

async function toggleBonusActive(id, newActiveState) {
    try {
        const user = window.Session ? window.Session.getUser() : {};
        const res = await fetch('/api/admin/pvp-bonus-events/toggle', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': user.id || 1,
                'x-admin-username': user.username || 'Admin'
            },
            body: JSON.stringify({
                id,
                isActive: newActiveState
            })
        });

        const data = await res.json();
        if (data && data.success) {
            loadBonusEvents();
        } else {
            if (window.showAniModal) {
                window.showAniModal('ERROR', data.message || 'Error al alternar estado.', 'error');
            }
        }
    } catch (err) {
        console.error('[TOGGLE BONUS ERROR]', err);
    }
}

window.openBonusEditorModal = openBonusEditorModal;
window.editBonusEvent = editBonusEvent;
window.closeBonusEditorModal = closeBonusEditorModal;
window.handleSaveBonus = handleSaveBonus;
window.toggleBonusActive = toggleBonusActive;
window.updateLivePreview = updateLivePreview;
