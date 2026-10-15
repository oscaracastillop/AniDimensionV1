/**
 * ANI-DIMENSION: CONTROLADOR DE GESTIÓN DE PASES VIP (ADMIN)
 * Formato tabla Cyber Sharp con búsqueda en tiempo real, creación, edición,
 * duración en días, bonificadores (EXP, StarShips, Suerte), moneda (⭐ / $ USD) y banners.
 */

let allAdminVipPasses = [];
let filteredAdminVipPasses = [];
let currentAdminVipPage = 1;
const VIP_PAGE_SIZE = 12;

document.addEventListener('DOMContentLoaded', () => {
    if (window.Session && !window.Session.requireAuth('/views/login/login.html')) {
        return;
    }

    initAdminVipTable();
});

function initAdminVipTable() {
    loadAdminVipList();
}

function loadAdminVipList() {
    if (!window.VipManager) return;
    allAdminVipPasses = window.VipManager.getVipPasses();
    filteredAdminVipPasses = [...allAdminVipPasses];
    renderVipTable();
}

function onVipSearch(input) {
    const q = input.value.trim().toLowerCase();
    if (!q) {
        filteredAdminVipPasses = [...allAdminVipPasses];
    } else {
        filteredAdminVipPasses = allAdminVipPasses.filter(v => {
            const codeMatch = (v.code || '').toLowerCase().includes(q);
            const nameMatch = (v.name || '').toLowerCase().includes(q);
            const bannerMatch = (v.offer_text || '').toLowerCase().includes(q);
            return codeMatch || nameMatch || bannerMatch;
        });
    }
    currentAdminVipPage = 1;
    renderVipTable();
}

function renderVipTable() {
    const tbody = document.getElementById('admin-vip-tbody');
    const pagContainer = document.getElementById('admin-vip-pagination');
    if (!tbody) return;

    if (filteredAdminVipPasses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:#94a3b8; padding:24px;">No se encontraron pases VIP que coincidan con la búsqueda.</td></tr>`;
        if (pagContainer) pagContainer.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(filteredAdminVipPasses.length / VIP_PAGE_SIZE) || 1;
    if (currentAdminVipPage > totalPages) currentAdminVipPage = totalPages;
    if (currentAdminVipPage < 1) currentAdminVipPage = 1;

    const startIndex = (currentAdminVipPage - 1) * VIP_PAGE_SIZE;
    const pageData = filteredAdminVipPasses.slice(startIndex, startIndex + VIP_PAGE_SIZE);

    tbody.innerHTML = pageData.map((v, idx) => {
        const globalPos = startIndex + idx + 1;
        const isActive = v.active !== false;
        const isUsd = (v.currency === 'USD');

        const priceDisplay = isUsd 
            ? `<span style="color:#22c55e; font-weight:400; font-family:'Orbitron', sans-serif;">$ ${parseFloat(v.price || 0).toFixed(2)} USD</span>`
            : `<span style="color:#ffd700; font-weight:400; font-family:'Orbitron', sans-serif;">⭐ ${parseInt(v.price || 0, 10).toLocaleString()}</span>`;

        const bannerDisplay = v.offer_text 
            ? `<span style="background:linear-gradient(135deg, #a855f7, #7c3aed); color:#fff; font-family:'Orbitron', sans-serif; font-size:8px; font-weight:400; padding:2px 6px; box-shadow:0 0 8px rgba(168,85,247,0.4);">${v.offer_text}</span>` 
            : `<span style="color:#64748b;">—</span>`;

        const statusBadge = isActive 
            ? `<span class="status-badge active">✅ ACTIVO</span>` 
            : `<span class="status-badge inactive">⏸️ INACTIVO</span>`;

        return `
            <tr>
                <td>
                    <div style="font-family:'Orbitron', sans-serif; font-size:10.5px; font-weight:400; color:#c084fc;">${v.code}</div>
                    <div style="font-size:7.5px; color:#64748b;">#${globalPos}</div>
                </td>
                <td>
                    <div style="font-weight:400; color:#fff; font-size:11px;">${v.name || v.code}</div>
                </td>
                <td style="text-align:center;">
                    <span style="background:rgba(0,240,255,0.15); border:1px solid rgba(0,240,255,0.4); color:#00f0ff; font-family:'Orbitron', sans-serif; font-size:9.5px; font-weight:400; padding:2px 7px;">
                        ⏳ ${v.days || 3} DÍAS
                    </span>
                </td>
                <td style="text-align:center; font-family:'Orbitron', sans-serif; font-size:10.5px; font-weight:400; color:#00f0ff;">
                    +${parseFloat(v.exp_boost || 0).toFixed(1)}%
                </td>
                <td style="text-align:center; font-family:'Orbitron', sans-serif; font-size:10.5px; font-weight:400; color:#ffd700;">
                    +${parseFloat(v.starships_boost || 0).toFixed(1)}%
                </td>
                <td style="text-align:center; font-family:'Orbitron', sans-serif; font-size:10.5px; font-weight:400; color:#10b981;">
                    +${parseFloat(v.luck_boost || 0).toFixed(1)}%
                </td>
                <td>${priceDisplay}</td>
                <td>${bannerDisplay}</td>
                <td style="text-align:center;">${statusBadge}</td>
                <td style="text-align:center;">
                    <div class="actions-group" style="justify-content:center;">
                        <button type="button" class="btn-act-sm btn-act-edit" onclick="openEditVipModal('${v.code}')" title="Editar datos del pase VIP">
                            <span>Editar</span>
                        </button>
                        <button type="button" class="btn-act-sm ${isActive ? 'btn-act-inactivate' : 'btn-act-activate'}" onclick="toggleVipActiveStatus('${v.code}')" title="${isActive ? 'Inactivar' : 'Activar'}">
                            <span>${isActive ? 'Inactivar' : 'Activar'}</span>
                        </button>
                        <button type="button" class="btn-act-sm" onclick="deleteVipRecord('${v.code}')" style="background:rgba(239,68,68,0.15); border:1px solid #ef4444; color:#ff6b81;" title="Eliminar pase VIP">
                            <span>Eliminar</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    renderVipPagination(pagContainer, currentAdminVipPage, totalPages);
}

function renderVipPagination(container, current, total) {
    if (!container) return;
    if (total <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = `<div style="display:flex; justify-content:center; align-items:center; gap:6px; margin-top:14px; padding:10px 0;">`;
    html += `<button type="button" onclick="goToVipPage(${current - 1})" ${current === 1 ? 'disabled' : ''} style="background:rgba(0,0,0,0.5); border:1px solid rgba(192,132,252,0.3); color:#fff; font-family:'Orbitron', sans-serif; font-size:9px; padding:4px 10px; cursor:pointer;">« ANT</button>`;

    for (let i = 1; i <= total; i++) {
        const isCur = (i === current);
        html += `<button type="button" onclick="goToVipPage(${i})" style="background:${isCur ? '#a855f7' : 'rgba(0,0,0,0.5)'}; color:${isCur ? '#fff' : '#fff'}; border:1px solid rgba(192,132,252,0.3); font-family:'Orbitron', sans-serif; font-size:9px; font-weight:800; padding:4px 8px; cursor:pointer;">${i}</button>`;
    }

    html += `<button type="button" onclick="goToVipPage(${current + 1})" ${current === total ? 'disabled' : ''} style="background:rgba(0,0,0,0.5); border:1px solid rgba(192,132,252,0.3); color:#fff; font-family:'Orbitron', sans-serif; font-size:9px; padding:4px 10px; cursor:pointer;">SIG »</button>`;
    html += `</div>`;
    container.innerHTML = html;
}

function goToVipPage(p) {
    currentAdminVipPage = p;
    renderVipTable();
}

// ==========================================================================
// MODAL DE CREACIÓN / EDICIÓN DE PASES VIP
// ==========================================================================
function openCreateVipModal() {
    const modal = document.getElementById('admin-vip-modal');
    if (!modal || !window.VipManager) return;

    document.getElementById('modal-vip-title').textContent = 'CREAR NUEVO PASE VIP';
    document.getElementById('form-vip-edit-mode').value = 'create';

    const nextCode = window.VipManager.getNextCode();
    document.getElementById('form-vip-code').value = nextCode;
    document.getElementById('form-vip-name').value = '';
    document.getElementById('form-vip-days').value = '7';

    document.getElementById('form-vip-exp').value = '100.0';
    document.getElementById('form-vip-star').value = '100.0';
    document.getElementById('form-vip-luck').value = '50.0';

    document.getElementById('form-vip-currency').value = 'USD';
    document.getElementById('form-vip-price').value = '30.00';
    document.getElementById('form-vip-banner').value = 'BRONCE';
    document.getElementById('form-vip-active').value = '1';

    onVipCurrencyChange();

    const alertBox = document.getElementById('modal-vip-alert');
    if (alertBox) alertBox.style.display = 'none';

    modal.style.display = 'flex';
}

function openEditVipModal(code) {
    const modal = document.getElementById('admin-vip-modal');
    if (!modal || !window.VipManager) return;

    const pass = window.VipManager.getVipPassByCode(code);
    if (!pass) return;

    document.getElementById('modal-vip-title').textContent = `EDITAR PASE VIP: ${pass.code}`;
    document.getElementById('form-vip-edit-mode').value = 'edit';

    document.getElementById('form-vip-code').value = pass.code;
    document.getElementById('form-vip-name').value = pass.name || pass.code;
    document.getElementById('form-vip-days').value = pass.days || 3;

    document.getElementById('form-vip-exp').value = parseFloat(pass.exp_boost || 0).toFixed(1);
    document.getElementById('form-vip-star').value = parseFloat(pass.starships_boost || 0).toFixed(1);
    document.getElementById('form-vip-luck').value = parseFloat(pass.luck_boost || 0).toFixed(1);

    document.getElementById('form-vip-currency').value = pass.currency || 'USD';
    document.getElementById('form-vip-price').value = pass.price !== undefined ? pass.price : 30.0;
    document.getElementById('form-vip-banner').value = pass.offer_text || '';
    document.getElementById('form-vip-active').value = pass.active !== false ? '1' : '0';

    onVipCurrencyChange();

    const alertBox = document.getElementById('modal-vip-alert');
    if (alertBox) alertBox.style.display = 'none';

    modal.style.display = 'flex';
}

function closeVipModal() {
    const modal = document.getElementById('admin-vip-modal');
    if (modal) modal.style.display = 'none';
}

function onVipCurrencyChange() {
    const currency = document.getElementById('form-vip-currency').value;
    const priceLbl = document.getElementById('form-vip-price-label');
    const priceInput = document.getElementById('form-vip-price');

    if (currency === 'USD') {
        if (priceLbl) priceLbl.textContent = 'PRECIO EN DÓLARES ($ USD) *';
        if (priceInput && (parseFloat(priceInput.value) > 200 || !priceInput.value)) priceInput.value = '30.00';
    } else {
        if (priceLbl) priceLbl.textContent = 'PRECIO EN STARSHIPS (⭐) *';
        if (priceInput && (parseFloat(priceInput.value) < 1000 || !priceInput.value)) priceInput.value = '20000';
    }
}

function saveVipForm() {
    const mode = document.getElementById('form-vip-edit-mode').value;
    const code = document.getElementById('form-vip-code').value.trim();
    const name = document.getElementById('form-vip-name').value.trim();
    const days = parseInt(document.getElementById('form-vip-days').value, 10);
    const exp_boost = parseFloat(document.getElementById('form-vip-exp').value);
    const starships_boost = parseFloat(document.getElementById('form-vip-star').value);
    const luck_boost = parseFloat(document.getElementById('form-vip-luck').value);
    const currency = document.getElementById('form-vip-currency').value;
    const price = parseFloat(document.getElementById('form-vip-price').value);
    const offer_text = document.getElementById('form-vip-banner').value.trim();
    const active = document.getElementById('form-vip-active').value === '1';

    if (!name || isNaN(days) || days < 1 || isNaN(exp_boost) || isNaN(starships_boost) || isNaN(luck_boost) || isNaN(price)) {
        showVipAlert('Por favor completa todos los campos requeridos con valores válidos.', true);
        return;
    }

    const payload = {
        code,
        name,
        days,
        exp_boost,
        starships_boost,
        luck_boost,
        currency,
        price,
        offer_text,
        active
    };

    if (mode === 'create') {
        window.VipManager.createVipPass(payload);
        showVipAlert('✅ ¡Pase VIP creado exitosamente!', false);
    } else {
        window.VipManager.updateVipPass(code, payload);
        showVipAlert('✅ ¡Pase VIP actualizado exitosamente!', false);
    }

    loadAdminVipList();
    setTimeout(() => {
        closeVipModal();
    }, 850);
}

function showVipAlert(msg, isErr = true) {
    const box = document.getElementById('modal-vip-alert');
    if (!box) return;
    box.style.display = 'block';
    box.textContent = msg;
    if (isErr) {
        box.style.background = 'rgba(239, 68, 68, 0.15)';
        box.style.border = '1px solid #ef4444';
        box.style.color = '#ff6b81';
    } else {
        box.style.background = 'rgba(16, 185, 129, 0.15)';
        box.style.border = '1px solid #10b981';
        box.style.color = '#34d399';
    }
}

function toggleVipActiveStatus(code) {
    if (!window.VipManager) return;
    window.VipManager.toggleVipPass(code);
    loadAdminVipList();
}

function deleteVipRecord(code) {
    if (!confirm(`¿Estás seguro de eliminar el pase ${code}? Esta acción no se puede deshacer.`)) {
        return;
    }
    window.VipManager.deleteVipPass(code);
    loadAdminVipList();
}

window.onVipSearch = onVipSearch;
window.openCreateVipModal = openCreateVipModal;
window.openEditVipModal = openEditVipModal;
window.closeVipModal = closeVipModal;
window.onVipCurrencyChange = onVipCurrencyChange;
window.saveVipForm = saveVipForm;
window.toggleVipActiveStatus = toggleVipActiveStatus;
window.deleteVipRecord = deleteVipRecord;
window.goToVipPage = goToVipPage;
