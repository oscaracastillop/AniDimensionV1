/**
 * ANI-DIMENSION: CONTROLADOR DE GESTIÓN DE AVATARES DE DUELISTA (ADMIN)
 * Lista en formato de tabla con buscador dinámico, creación, edición, carga de imagen,
 * estadísticas (EXP, StarShips, Suerte), moneda (⭐ / $ USD), precios y banners.
 */

let allAdminAvatars = [];
let filteredAdminAvatars = [];
let currentAdminAvatarPage = 1;
const AVATAR_PAGE_SIZE = 15;

document.addEventListener('DOMContentLoaded', async () => {
    if (window.Session && !window.Session.requireAuth('/views/login/login.html')) {
        return;
    }

    const searchInput = document.getElementById('admin-avatar-search');
    if (searchInput) searchInput.value = '';

    if (window.AvatarsManager) {
        await window.AvatarsManager.syncFromServer();
    }
    initAdminAvatarsTable();
});

function initAdminAvatarsTable() {
    loadAdminAvatarsList();
}

function loadAdminAvatarsList() {
    if (!window.AvatarsManager) return;
    allAdminAvatars = window.AvatarsManager.getAvatars() || [];
    const searchInput = document.getElementById('admin-avatar-search');
    const q = (searchInput ? searchInput.value : '').trim().toLowerCase();
    if (!q) {
        filteredAdminAvatars = [...allAdminAvatars];
    } else {
        filteredAdminAvatars = allAdminAvatars.filter(a => {
            const codeMatch = (a.code || '').toLowerCase().includes(q);
            const nameMatch = (a.name || '').toLowerCase().includes(q);
            const bannerMatch = (a.offer_text || '').toLowerCase().includes(q);
            return codeMatch || nameMatch || bannerMatch;
        });
    }
    renderAvatarsTable();
}

window.loadAdminAvatarsList = loadAdminAvatarsList;

function onAvatarsSearch(input) {
    const q = input.value.trim().toLowerCase();
    if (!q) {
        filteredAdminAvatars = [...allAdminAvatars];
    } else {
        filteredAdminAvatars = allAdminAvatars.filter(a => {
            const codeMatch = (a.code || '').toLowerCase().includes(q);
            const nameMatch = (a.name || '').toLowerCase().includes(q);
            const bannerMatch = (a.offer_text || '').toLowerCase().includes(q);
            return codeMatch || nameMatch || bannerMatch;
        });
    }
    currentAdminAvatarPage = 1;
    renderAvatarsTable();
}

function renderAvatarsTable() {
    const tbody = document.getElementById('admin-avatars-tbody');
    const pagContainer = document.getElementById('admin-avatars-pagination');
    if (!tbody) return;

    if (filteredAdminAvatars.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#94a3b8; padding:24px;">No se encontraron avatares que coincidan con la búsqueda.</td></tr>`;
        if (pagContainer) pagContainer.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(filteredAdminAvatars.length / AVATAR_PAGE_SIZE) || 1;
    if (currentAdminAvatarPage > totalPages) currentAdminAvatarPage = totalPages;
    if (currentAdminAvatarPage < 1) currentAdminAvatarPage = 1;

    const startIndex = (currentAdminAvatarPage - 1) * AVATAR_PAGE_SIZE;
    const pageData = filteredAdminAvatars.slice(startIndex, startIndex + AVATAR_PAGE_SIZE);

    tbody.innerHTML = pageData.map((a, idx) => {
        const globalPos = startIndex + idx + 1;
        const isActive = a.active !== false;
        const isUsd = (a.currency === 'USD');
        const imgPath = a.image || `../../../assets/images/avatars/${a.code}.png`;

        const priceDisplay = isUsd 
            ? `<span style="color:#22c55e; font-weight:400; font-family:'Orbitron', sans-serif;">$ ${parseFloat(a.price || 0).toFixed(2)} USD</span>`
            : `<span style="color:#ffd700; font-weight:400; font-family:'Orbitron', sans-serif;">⭐ ${parseInt(a.price || 0, 10).toLocaleString()}</span>`;

        const bannerDisplay = a.offer_text 
            ? `<span style="background:linear-gradient(135deg, #ffd700, #f59e0b); color:#000; font-family:'Orbitron', sans-serif; font-size:8px; font-weight:400; padding:2px 6px; box-shadow:0 0 8px rgba(255,215,0,0.4);">${a.offer_text}</span>` 
            : `<span style="color:#64748b;">—</span>`;

        const statusBadge = isActive 
            ? `<span class="status-badge active">✅ ACTIVO</span>` 
            : `<span class="status-badge inactive">⏸️ INACTIVO</span>`;

        return `
            <tr>
                <td style="display:flex; align-items:center; gap:8px; padding:6px 10px;">
                    <div style="width:34px; height:34px; background:rgba(0,0,0,0.5); border:1px solid rgba(0,240,255,0.3); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                        <img src="${imgPath}" alt="${a.code}" style="max-width:100%; max-height:100%; object-fit:contain;" onerror="this.src='../../../assets/images/avatars/AVA-002.png';">
                    </div>
                    <div>
                        <div style="font-family:'Orbitron', sans-serif; font-size:10px; font-weight:400; color:var(--accent-cyan);">${a.code}</div>
                        <div style="font-size:7.5px; color:#64748b;">#${globalPos}</div>
                    </div>
                </td>
                <td>
                    <div style="font-weight:400; color:#fff; font-size:11px;">${a.name || a.code}</div>
                </td>
                <td style="text-align:center; font-family:'Orbitron', sans-serif; font-size:10.5px; font-weight:400; color:#00f0ff;">
                    +${parseFloat(a.exp_boost || 0).toFixed(1)}%
                </td>
                <td style="text-align:center; font-family:'Orbitron', sans-serif; font-size:10.5px; font-weight:400; color:#ffd700;">
                    +${parseFloat(a.starships_boost || 0).toFixed(1)}%
                </td>
                <td style="text-align:center; font-family:'Orbitron', sans-serif; font-size:10.5px; font-weight:400; color:#10b981;">
                    +${parseFloat(a.luck_boost || 0).toFixed(1)}%
                </td>
                <td>${priceDisplay}</td>
                <td>${bannerDisplay}</td>
                <td style="text-align:center;">${statusBadge}</td>
                <td style="text-align:center;">
                    <div class="actions-group" style="justify-content:center;">
                        <button type="button" class="btn-act-sm btn-act-edit" onclick="openEditAvatarModal('${a.code}')" title="Editar datos del avatar">
                            <span>Editar</span>
                        </button>
                        <button type="button" class="btn-act-sm ${isActive ? 'btn-act-inactivate' : 'btn-act-activate'}" onclick="toggleAvatarActiveStatus('${a.code}')" title="${isActive ? 'Inactivar' : 'Activar'}">
                            <span>${isActive ? 'Inactivar' : 'Activar'}</span>
                        </button>
                        <button type="button" class="btn-act-sm" onclick="deleteAvatarRecord('${a.code}')" style="background:rgba(239,68,68,0.15); border:1px solid #ef4444; color:#ff6b81;" title="Eliminar avatar">
                            <span>Eliminar</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    renderAvatarsPagination(pagContainer, currentAdminAvatarPage, totalPages);
}

function renderAvatarsPagination(container, current, total) {
    if (!container) return;
    if (total <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = `<div style="display:flex; justify-content:center; align-items:center; gap:6px; margin-top:14px; padding:10px 0;">`;
    html += `<button type="button" onclick="goToAvatarPage(${current - 1})" ${current === 1 ? 'disabled' : ''} style="background:rgba(0,0,0,0.5); border:1px solid rgba(0,240,255,0.3); color:#fff; font-family:'Orbitron', sans-serif; font-size:9px; padding:4px 10px; cursor:pointer;">« ANT</button>`;
    
    // Mostrar páginas con ventana deslizante
    let startP = Math.max(1, current - 3);
    let endP = Math.min(total, current + 3);

    if (startP > 1) {
        html += `<button type="button" onclick="goToAvatarPage(1)" style="background:rgba(0,0,0,0.5); color:#fff; border:1px solid rgba(0,240,255,0.3); font-family:'Orbitron', sans-serif; font-size:9px; padding:4px 8px; cursor:pointer;">1</button>`;
        if (startP > 2) html += `<span style="color:#64748b; font-size:9px;">...</span>`;
    }

    for (let i = startP; i <= endP; i++) {
        const isCur = (i === current);
        html += `<button type="button" onclick="goToAvatarPage(${i})" style="background:${isCur ? 'var(--accent-cyan)' : 'rgba(0,0,0,0.5)'}; color:${isCur ? '#000' : '#fff'}; border:1px solid rgba(0,240,255,0.3); font-family:'Orbitron', sans-serif; font-size:9px; font-weight:800; padding:4px 8px; cursor:pointer;">${i}</button>`;
    }

    if (endP < total) {
        if (endP < total - 1) html += `<span style="color:#64748b; font-size:9px;">...</span>`;
        html += `<button type="button" onclick="goToAvatarPage(${total})" style="background:rgba(0,0,0,0.5); color:#fff; border:1px solid rgba(0,240,255,0.3); font-family:'Orbitron', sans-serif; font-size:9px; padding:4px 8px; cursor:pointer;">${total}</button>`;
    }

    html += `<button type="button" onclick="goToAvatarPage(${current + 1})" ${current === total ? 'disabled' : ''} style="background:rgba(0,0,0,0.5); border:1px solid rgba(0,240,255,0.3); color:#fff; font-family:'Orbitron', sans-serif; font-size:9px; padding:4px 10px; cursor:pointer;">SIG »</button>`;
    html += `</div>`;
    container.innerHTML = html;
}

function goToAvatarPage(p) {
    currentAdminAvatarPage = p;
    renderAvatarsTable();
}

// ==========================================================================
// MODAL DE CREACIÓN / EDICIÓN DE AVATARES
// ==========================================================================
function openCreateAvatarModal() {
    const modal = document.getElementById('admin-avatar-modal');
    if (!modal || !window.AvatarsManager) return;

    document.getElementById('modal-avatar-title').textContent = 'CREAR NUEVO AVATAR DE DUELISTA';
    document.getElementById('form-avatar-edit-mode').value = 'create';

    const nextCode = window.AvatarsManager.getNextCode();
    document.getElementById('form-avatar-code').value = nextCode;
    document.getElementById('form-avatar-name').value = '';
    document.getElementById('form-avatar-preview').src = `../../../assets/images/avatars/AVA-002.png`;
    document.getElementById('form-avatar-image-data').value = '';
    document.getElementById('form-avatar-file').value = '';

    document.getElementById('form-avatar-exp').value = '3.0';
    document.getElementById('form-avatar-star').value = '2.0';
    document.getElementById('form-avatar-luck').value = '1.0';

    document.getElementById('form-avatar-currency').value = 'STARSHIPS';
    document.getElementById('form-avatar-price').value = '50000';
    document.getElementById('form-avatar-banner').value = 'NUEVO';
    document.getElementById('form-avatar-active').value = '1';

    onAvatarCurrencyChange();

    const alertBox = document.getElementById('modal-avatar-alert');
    if (alertBox) alertBox.style.display = 'none';

    modal.style.display = 'flex';
}

function openEditAvatarModal(code) {
    const modal = document.getElementById('admin-avatar-modal');
    if (!modal || !window.AvatarsManager) return;

    const avatar = window.AvatarsManager.getAvatarByCode(code);
    if (!avatar) return;

    document.getElementById('modal-avatar-title').textContent = `EDITAR AVATAR: ${avatar.code}`;
    document.getElementById('form-avatar-edit-mode').value = 'edit';

    document.getElementById('form-avatar-code').value = avatar.code;
    document.getElementById('form-avatar-name').value = avatar.name || avatar.code;
    
    const imgPath = avatar.image || `../../../assets/images/avatars/${avatar.code}.png`;
    document.getElementById('form-avatar-preview').src = imgPath;
    document.getElementById('form-avatar-image-data').value = avatar.image || '';
    document.getElementById('form-avatar-file').value = '';

    document.getElementById('form-avatar-exp').value = parseFloat(avatar.exp_boost || 0).toFixed(1);
    document.getElementById('form-avatar-star').value = parseFloat(avatar.starships_boost || 0).toFixed(1);
    document.getElementById('form-avatar-luck').value = parseFloat(avatar.luck_boost || 0).toFixed(1);

    const exactPrice = (avatar.price !== undefined && avatar.price !== null) ? avatar.price : (avatar.currency === 'USD' ? 4.99 : 50000);
    document.getElementById('form-avatar-currency').value = avatar.currency || 'STARSHIPS';
    document.getElementById('form-avatar-price').value = exactPrice;
    document.getElementById('form-avatar-banner').value = avatar.offer_text || '';
    document.getElementById('form-avatar-active').value = avatar.active !== false ? '1' : '0';

    onAvatarCurrencyChange(true); // Preservar precio exacto cargado del avatar

    const alertBox = document.getElementById('modal-avatar-alert');
    if (alertBox) alertBox.style.display = 'none';

    modal.style.display = 'flex';
}

function closeAvatarModal() {
    const modal = document.getElementById('admin-avatar-modal');
    if (modal) modal.style.display = 'none';
}

function onAvatarFileSelected(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('form-avatar-preview');
            const dataInput = document.getElementById('form-avatar-image-data');
            if (preview) preview.src = e.target.result;
            if (dataInput) dataInput.value = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function onAvatarCurrencyChange(preserveExistingPrice = false) {
    const currency = document.getElementById('form-avatar-currency').value;
    const priceLbl = document.getElementById('form-avatar-price-label');
    const priceInput = document.getElementById('form-avatar-price');

    if (currency === 'USD') {
        if (priceLbl) priceLbl.textContent = 'PRECIO EN DÓLARES ($ USD) *';
        if (!preserveExistingPrice && (!priceInput.value || parseFloat(priceInput.value) <= 0)) {
            priceInput.value = '4.99';
        }
    } else {
        if (priceLbl) priceLbl.textContent = 'PRECIO EN STARSHIPS (⭐) *';
        if (!preserveExistingPrice && (!priceInput.value || parseFloat(priceInput.value) <= 0)) {
            priceInput.value = '50000';
        }
    }
}

function saveAvatarForm() {
    const mode = document.getElementById('form-avatar-edit-mode').value;
    const code = document.getElementById('form-avatar-code').value.trim();
    const name = document.getElementById('form-avatar-name').value.trim();
    const imageData = document.getElementById('form-avatar-image-data').value.trim();
    const exp_boost = parseFloat(document.getElementById('form-avatar-exp').value);
    const starships_boost = parseFloat(document.getElementById('form-avatar-star').value);
    const luck_boost = parseFloat(document.getElementById('form-avatar-luck').value);
    const currency = document.getElementById('form-avatar-currency').value;
    const price = parseFloat(document.getElementById('form-avatar-price').value);
    const offer_text = document.getElementById('form-avatar-banner').value.trim();
    const active = document.getElementById('form-avatar-active').value === '1';

    if (!name || isNaN(exp_boost) || isNaN(starships_boost) || isNaN(luck_boost) || isNaN(price)) {
        showAvatarAlert('Por favor completa todos los campos requeridos con valores válidos.', true);
        return;
    }

    if (exp_boost < 0 || exp_boost > 300.0) {
        showAvatarAlert('El potenciador de EXP no puede superar el límite máximo de 300.0% (Mínimo: 0.0%).', true);
        return;
    }
    if (starships_boost < 0 || starships_boost > 300.0) {
        showAvatarAlert('El potenciador de StarShips no puede superar el límite máximo de 300.0% (Mínimo: 0.0%).', true);
        return;
    }
    if (luck_boost < 0 || luck_boost > 100.0) {
        showAvatarAlert('El potenciador de Suerte no puede superar el límite máximo de 100.0% (Mínimo: 0.0%).', true);
        return;
    }
    if (price < 0) {
        showAvatarAlert('El precio no puede ser negativo.', true);
        return;
    }

    const payload = {
        code,
        name,
        image: imageData || `../../../assets/images/avatars/${code}.png`,
        exp_boost,
        starships_boost,
        luck_boost,
        currency,
        price,
        offer_text,
        active
    };

    if (mode === 'create') {
        window.AvatarsManager.createAvatar(payload);
        showAvatarAlert('✅ ¡Avatar creado exitosamente!', false);
    } else {
        window.AvatarsManager.updateAvatar(code, payload);
        showAvatarAlert('✅ ¡Avatar actualizado exitosamente!', false);
    }

    loadAdminAvatarsList();
    setTimeout(() => {
        closeAvatarModal();
    }, 850);
}

function showAvatarAlert(msg, isErr = true) {
    const box = document.getElementById('modal-avatar-alert');
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

function toggleAvatarActiveStatus(code) {
    if (!window.AvatarsManager) return;
    window.AvatarsManager.toggleAvatar(code);
    loadAdminAvatarsList();
}

function deleteAvatarRecord(code) {
    if (code === 'AVA-001' || code === 'AVA-002') {
        alert('❌ No se pueden eliminar los avatares base del sistema (AVA-001 Admin / AVA-002 Inicial).');
        return;
    }

    if (!confirm(`¿Estás seguro de eliminar el avatar ${code}? Esta acción no se puede deshacer.`)) {
        return;
    }
    window.AvatarsManager.deleteAvatar(code);
    loadAdminAvatarsList();
}

window.onAvatarsSearch = onAvatarsSearch;
window.openCreateAvatarModal = openCreateAvatarModal;
window.openEditAvatarModal = openEditAvatarModal;
window.closeAvatarModal = closeAvatarModal;
window.onAvatarFileSelected = onAvatarFileSelected;
window.onAvatarCurrencyChange = onAvatarCurrencyChange;
window.saveAvatarForm = saveAvatarForm;
window.toggleAvatarActiveStatus = toggleAvatarActiveStatus;
window.deleteAvatarRecord = deleteAvatarRecord;
window.goToAvatarPage = goToAvatarPage;
