/**
 * Ani-Dimension: Controlador de Gestión de Potenciadores de Avatar (Panel Admin)
 * Permite listar, buscar, crear (código secuencial POT-XXX), editar, activar/desactivar y eliminar.
 */

let allPotenciadores = [];
let filteredPotenciadores = [];
let currentAdminPotPage = 1;
const POT_PAGE_SIZE = 10;

document.addEventListener('DOMContentLoaded', () => {
    if (window.Session && !window.Session.requireAuth('/views/login/login.html')) {
        return;
    }

    initAdminPotenciadores();
});

function initAdminPotenciadores() {
    loadPotenciadoresList();
}

function loadPotenciadoresList() {
    if (!window.PotenciadoresManager) return;
    allPotenciadores = window.PotenciadoresManager.getPotenciadores();
    filteredPotenciadores = [...allPotenciadores];
    renderPotenciadoresTable();
}

function onPotenciadoresSearch(input) {
    const q = input.value.trim().toLowerCase();
    if (!q) {
        filteredPotenciadores = [...allPotenciadores];
    } else {
        filteredPotenciadores = allPotenciadores.filter(p => {
            const codeMatch = (p.code || '').toLowerCase().includes(q);
            const nameMatch = (p.name || '').toLowerCase().includes(q);
            const typeMatch = (p.type || '').toLowerCase().includes(q);
            const bannerMatch = (p.offer_text || '').toLowerCase().includes(q);
            return codeMatch || nameMatch || typeMatch || bannerMatch;
        });
    }
    currentAdminPotPage = 1;
    renderPotenciadoresTable();
}

function renderPotenciadoresTable() {
    const tbody = document.getElementById('admin-potenciadores-tbody');
    const pagContainer = document.getElementById('admin-potenciadores-pagination');
    if (!tbody) return;

    if (filteredPotenciadores.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#94a3b8; padding:24px;">No se encontraron potenciadores que coincidan con la búsqueda.</td></tr>`;
        if (pagContainer) pagContainer.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(filteredPotenciadores.length / POT_PAGE_SIZE) || 1;
    if (currentAdminPotPage > totalPages) currentAdminPotPage = totalPages;
    if (currentAdminPotPage < 1) currentAdminPotPage = 1;

    const startIndex = (currentAdminPotPage - 1) * POT_PAGE_SIZE;
    const pageData = filteredPotenciadores.slice(startIndex, startIndex + POT_PAGE_SIZE);

    tbody.innerHTML = pageData.map((p, idx) => {
        const globalPos = startIndex + idx + 1;
        const isActive = p.active !== false;

        let typeBadge = '';
        if (p.type === 'EXP') {
            typeBadge = `<span class="type-badge-exp">⚡ EXP</span>`;
        } else if (p.type === 'STARSHIPS') {
            typeBadge = `<span class="type-badge-starships">⭐ STARSHIPS</span>`;
        } else {
            typeBadge = `<span class="type-badge-suerte">🍀 SUERTE</span>`;
        }

        const priceDisplay = p.currency === 'USD' 
            ? `<span style="color:#22c55e; font-weight:400; font-family:'Orbitron', sans-serif;">$ ${parseFloat(p.price || 0).toFixed(2)} USD</span>`
            : `<span style="color:#ffd700; font-weight:400; font-family:'Orbitron', sans-serif;">⭐ ${parseInt(p.price || 0, 10).toLocaleString()}</span>`;

        const bannerDisplay = p.offer_text 
            ? `<span style="background:linear-gradient(135deg, #ffd700, #f59e0b); color:#000; font-family:'Orbitron', sans-serif; font-size:8px; font-weight:400; padding:2px 6px; box-shadow:0 0 8px rgba(255,215,0,0.4);">${p.offer_text}</span>` 
            : `<span style="color:#64748b;">—</span>`;

        const expDisplay = p.expires_at 
            ? `<span style="font-size:9.5px; color:#cbd5e1;">${new Date(p.expires_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</span>` 
            : `<span style="color:#10b981; font-size:9.5px; font-weight:400;">Permanente</span>`;

        const statusBadge = isActive 
            ? `<span class="status-badge active">✅ ACTIVO</span>` 
            : `<span class="status-badge inactive">⏸️ INACTIVO</span>`;

        return `
            <tr>
                <td style="font-family:'Orbitron', sans-serif; font-size:10.5px; font-weight:400; color:var(--accent-cyan);">
                    #${globalPos} <span style="color:#fff;">${p.code}</span>
                </td>
                <td>
                    <div style="font-weight:400; color:#fff; font-size:11px;">${p.name}</div>
                    <div style="font-size:9px; color:#94a3b8; margin-top:2px;">${p.description || 'Sin descripción'}</div>
                </td>
                <td>${typeBadge}</td>
                <td style="text-align:center; font-family:'Orbitron', sans-serif; font-size:11.5px; font-weight:400; color:#38bdf8;">
                    +${parseFloat(p.boost_value || 0).toFixed(1)}%
                </td>
                <td>${priceDisplay}</td>
                <td>${bannerDisplay}</td>
                <td>${expDisplay}</td>
                <td style="text-align:center;">${statusBadge}</td>
                <td style="text-align:center;">
                    <div class="actions-group" style="justify-content:center;">
                        <button type="button" class="btn-act-sm btn-act-edit" onclick="openEditPotenciadorModal('${p.code}')" title="Editar datos del potenciador">
                            <span>Editar</span>
                        </button>
                        <button type="button" class="btn-act-sm ${isActive ? 'btn-act-inactivate' : 'btn-act-activate'}" onclick="togglePotenciadorActiveStatus('${p.code}')" title="${isActive ? 'Inactivar en tienda' : 'Activar en tienda'}">
                            <span>${isActive ? 'Inactivar' : 'Activar'}</span>
                        </button>
                        <button type="button" class="btn-act-sm" onclick="deletePotenciadorRecord('${p.code}')" style="background:rgba(239,68,68,0.15); border:1px solid #ef4444; color:#ff6b81;" title="Eliminar potenciador">
                            <span>Eliminar</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    renderPotPagination(pagContainer, currentAdminPotPage, totalPages);
}

function renderPotPagination(container, current, total) {
    if (!container) return;
    if (total <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = `<div style="display:flex; justify-content:center; align-items:center; gap:6px; margin-top:14px; padding:10px 0;">`;
    html += `<button type="button" onclick="goToPotPage(${current - 1})" ${current === 1 ? 'disabled' : ''} style="background:rgba(0,0,0,0.5); border:1px solid rgba(0,240,255,0.3); color:#fff; font-family:'Orbitron', sans-serif; font-size:9px; padding:4px 10px; cursor:pointer;">« ANT</button>`;
    
    for (let i = 1; i <= total; i++) {
        const isCur = (i === current);
        html += `<button type="button" onclick="goToPotPage(${i})" style="background:${isCur ? 'var(--accent-cyan)' : 'rgba(0,0,0,0.5)'}; color:${isCur ? '#000' : '#fff'}; border:1px solid rgba(0,240,255,0.3); font-family:'Orbitron', sans-serif; font-size:9px; font-weight:800; padding:4px 8px; cursor:pointer;">${i}</button>`;
    }

    html += `<button type="button" onclick="goToPotPage(${current + 1})" ${current === total ? 'disabled' : ''} style="background:rgba(0,0,0,0.5); border:1px solid rgba(0,240,255,0.3); color:#fff; font-family:'Orbitron', sans-serif; font-size:9px; padding:4px 10px; cursor:pointer;">SIG »</button>`;
    html += `</div>`;
    container.innerHTML = html;
}

function goToPotPage(p) {
    currentAdminPotPage = p;
    renderPotenciadoresTable();
}

// ==========================================================================
// MODAL DE CREACIÓN / EDICIÓN
// ==========================================================================
function openCreatePotenciadorModal() {
    const modal = document.getElementById('admin-potenciador-modal');
    if (!modal || !window.PotenciadoresManager) return;

    document.getElementById('modal-pot-title').textContent = 'CREAR NUEVO POTENCIADOR DE AVATAR';
    document.getElementById('form-pot-edit-mode').value = 'create';

    const nextCode = window.PotenciadoresManager.getNextCode();
    document.getElementById('form-pot-code').value = nextCode;
    document.getElementById('form-pot-name').value = '';
    document.getElementById('form-pot-type').value = 'EXP';
    document.getElementById('form-pot-boost').value = '1.0';
    document.getElementById('form-pot-currency').value = 'STARSHIPS';
    document.getElementById('form-pot-price').value = '40000';
    document.getElementById('form-pot-banner').value = '';
    document.getElementById('form-pot-expires').value = '';
    document.getElementById('form-pot-desc').value = '';
    document.getElementById('form-pot-active').value = '1';

    onPotTypeChange();
    onPotCurrencyChange();

    const alertBox = document.getElementById('modal-pot-alert');
    if (alertBox) alertBox.style.display = 'none';

    modal.style.display = 'flex';
}

function openEditPotenciadorModal(code) {
    const modal = document.getElementById('admin-potenciador-modal');
    if (!modal || !window.PotenciadoresManager) return;

    const pot = window.PotenciadoresManager.getPotenciadorByCode(code);
    if (!pot) return;

    document.getElementById('modal-pot-title').textContent = `EDITAR POTENCIADOR: ${pot.code}`;
    document.getElementById('form-pot-edit-mode').value = 'edit';

    document.getElementById('form-pot-code').value = pot.code;
    document.getElementById('form-pot-name').value = pot.name || '';
    document.getElementById('form-pot-type').value = pot.type || 'EXP';
    document.getElementById('form-pot-boost').value = parseFloat(pot.boost_value || 1.0).toFixed(1);
    document.getElementById('form-pot-currency').value = pot.currency || 'STARSHIPS';
    document.getElementById('form-pot-price').value = pot.price || 40000;
    document.getElementById('form-pot-banner').value = pot.offer_text || '';
    
    if (pot.expires_at) {
        const d = new Date(pot.expires_at);
        const pad = num => String(num).padStart(2, '0');
        document.getElementById('form-pot-expires').value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } else {
        document.getElementById('form-pot-expires').value = '';
    }

    document.getElementById('form-pot-desc').value = pot.description || '';
    document.getElementById('form-pot-active').value = pot.active !== false ? '1' : '0';

    onPotTypeChange();
    onPotCurrencyChange();

    const alertBox = document.getElementById('modal-pot-alert');
    if (alertBox) alertBox.style.display = 'none';

    modal.style.display = 'flex';
}

function closePotenciadorModal() {
    const modal = document.getElementById('admin-potenciador-modal');
    if (modal) modal.style.display = 'none';
}

function onPotTypeChange() {
    const type = document.getElementById('form-pot-type').value;
    const iconEl = document.getElementById('modal-pot-icon');
    if (iconEl) {
        if (type === 'EXP') iconEl.textContent = '⚡';
        else if (type === 'STARSHIPS') iconEl.textContent = '⭐';
        else iconEl.textContent = '🍀';
    }
}

function onPotCurrencyChange() {
    const currency = document.getElementById('form-pot-currency').value;
    const priceLbl = document.getElementById('form-pot-price-label');
    const priceInput = document.getElementById('form-pot-price');

    if (currency === 'USD') {
        if (priceLbl) priceLbl.textContent = 'PRECIO EN DÓLARES ($ USD) *';
        if (priceInput && (priceInput.value > 100 || !priceInput.value)) priceInput.value = '4.99';
    } else {
        if (priceLbl) priceLbl.textContent = 'PRECIO EN STARSHIPS (⭐) *';
        if (priceInput && (priceInput.value < 1000 || !priceInput.value)) priceInput.value = '40000';
    }
}

function savePotenciadorForm() {
    const mode = document.getElementById('form-pot-edit-mode').value;
    const code = document.getElementById('form-pot-code').value.trim();
    const name = document.getElementById('form-pot-name').value.trim();
    const type = document.getElementById('form-pot-type').value;
    const boost_value = parseFloat(document.getElementById('form-pot-boost').value);
    const currency = document.getElementById('form-pot-currency').value;
    const price = parseFloat(document.getElementById('form-pot-price').value);
    const offer_text = document.getElementById('form-pot-banner').value.trim();
    const expires_at_val = document.getElementById('form-pot-expires').value;
    const description = document.getElementById('form-pot-desc').value.trim();
    const active = document.getElementById('form-pot-active').value === '1';

    const alertBox = document.getElementById('modal-pot-alert');

    if (!name || isNaN(boost_value) || isNaN(price)) {
        showPotAlert('Por favor completa todos los campos requeridos.', true);
        return;
    }

    const payload = {
        code,
        name,
        type,
        boost_value,
        currency,
        price,
        offer_text,
        expires_at: expires_at_val ? new Date(expires_at_val).toISOString() : null,
        description,
        active
    };

    if (mode === 'create') {
        window.PotenciadoresManager.createPotenciador(payload);
        showPotAlert('✅ ¡Potenciador creado exitosamente!', false);
    } else {
        window.PotenciadoresManager.updatePotenciador(code, payload);
        showPotAlert('✅ ¡Potenciador actualizado exitosamente!', false);
    }

    loadPotenciadoresList();
    setTimeout(() => {
        closePotenciadorModal();
    }, 900);
}

function showPotAlert(msg, isErr = true) {
    const box = document.getElementById('modal-pot-alert');
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

function togglePotenciadorActiveStatus(code) {
    if (!window.PotenciadoresManager) return;
    window.PotenciadoresManager.togglePotenciador(code);
    loadPotenciadoresList();
}

function deletePotenciadorRecord(code) {
    if (!confirm(`¿Estás seguro de eliminar el potenciador ${code}? Esta acción no se puede deshacer.`)) {
        return;
    }
    window.PotenciadoresManager.deletePotenciador(code);
    loadPotenciadoresList();
}

window.onPotenciadoresSearch = onPotenciadoresSearch;
window.openCreatePotenciadorModal = openCreatePotenciadorModal;
window.openEditPotenciadorModal = openEditPotenciadorModal;
window.closePotenciadorModal = closePotenciadorModal;
window.onPotTypeChange = onPotTypeChange;
window.onPotCurrencyChange = onPotCurrencyChange;
window.savePotenciadorForm = savePotenciadorForm;
window.togglePotenciadorActiveStatus = togglePotenciadorActiveStatus;
window.deletePotenciadorRecord = deletePotenciadorRecord;
window.goToPotPage = goToPotPage;
