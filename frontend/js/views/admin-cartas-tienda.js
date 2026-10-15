// =============================================================================
// GESTIÓN ADMINISTRATIVA DE CARTAS SINGLES EN TIENDA ($ USD)
// Ani-Dimension System - TABLA LIMPIA Y AUTO-COMPLETADO POR PASSCODE
// =============================================================================

let allCartasSingles = [];
let filteredCartasSingles = [];
let currentPage = 1;
const pageSize = 12;

document.addEventListener('DOMContentLoaded', async () => {
    await loadCartasSingles();
});

async function loadCartasSingles() {
    try {
        const tbody = document.getElementById('admin-cartas-tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#94a3b8; padding:24px; font-size:11px;">Cargando catálogo de cartas...</td></tr>`;
        }

        const res = await fetch('/api/admin/cartas-singles');
        if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.singles || data.cartas)) {
                allCartasSingles = data.singles || data.cartas;
            } else if (window.CartasSinglesData && window.CartasSinglesData.cartas) {
                allCartasSingles = window.CartasSinglesData.cartas;
            }
        } else if (window.CartasSinglesData && window.CartasSinglesData.cartas) {
            allCartasSingles = window.CartasSinglesData.cartas;
        }

        filteredCartasSingles = [...allCartasSingles];
        renderCartasTable();
    } catch (e) {
        console.error('Error cargando cartas en tienda:', e);
        if (window.CartasSinglesData && window.CartasSinglesData.cartas) {
            allCartasSingles = window.CartasSinglesData.cartas;
            filteredCartasSingles = [...allCartasSingles];
            renderCartasTable();
        }
    }
}

function renderCartasTable() {
    const tbody = document.getElementById('admin-cartas-tbody');
    if (!tbody) return;

    if (!filteredCartasSingles.length) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#94a3b8; padding:24px; font-size:11px;">No se encontraron cartas que coincidan con la búsqueda.</td></tr>`;
        renderPagination();
        return;
    }

    const start = (currentPage - 1) * pageSize;
    const paginated = filteredCartasSingles.slice(start, start + pageSize);

    let html = '';
    paginated.forEach((c, idx) => {
        const globalPos = start + idx + 1;
        const isActive = c.activo !== 0 && c.activo !== false && c.active !== false;
        const name = c.name || c.nombre || 'Card';
        const cardType = c.tipo_carta || c.card_type || 'Monstruo Normal';
        const cId = c.cardId || c.card_id;
        const desc = c.description || c.descripcion || '—';
        
        let thumb = '/assets/images/cards/placeholder.png';
        if (c.image) {
            thumb = c.image;
        } else if (cId) {
            thumb = `https://images.ygoprodeck.com/images/cards_small/${cId}.jpg`;
        }

        const statusBadge = isActive 
            ? `<span class="status-badge active">ACTIVO</span>` 
            : `<span class="status-badge inactive">INACTIVO</span>`;

        html += `
            <tr>
                <td>
                    <div style="font-size:10px; color:#ffd700; font-weight:500;">${c.codigo || c.code}</div>
                    <div style="font-size:7.5px; color:#64748b;">#${globalPos}</div>
                </td>
                <td style="text-align:center;">
                    <img src="${thumb}" alt="${name}" class="card-thumb-preview" onerror="this.onerror=null; this.src='/assets/images/cards/placeholder.png';">
                </td>
                <td>
                    <div style="font-weight:400; color:#fff; font-size:11px;">${name}</div>
                    <div style="font-size:8.5px; color:#64748b; margin-top:2px;">Passcode: ${cId || '—'}</div>
                </td>
                <td style="font-size:10px; color:#cbd5e1; line-height:1.4;">
                    ${desc}
                </td>
                <td style="text-align:center; font-size:10.5px; color:#38bdf8;">
                    ${cardType}
                </td>
                <td style="text-align:center; font-size:10.5px; color:#ffd700;">
                    ${c.rareza || c.rarity || 'Ultra Rare'}
                </td>
                <td style="text-align:center; font-size:11px; color:#fff; font-weight:500;">
                    $${Number(c.precio_usd !== undefined ? c.precio_usd : (c.price || 0)).toFixed(2)}
                </td>
                <td style="text-align:center;">${statusBadge}</td>
                <td style="text-align:center;">
                    <div class="actions-group" style="justify-content:center; display:flex; gap:5px;">
                        <button type="button" class="btn-act-sm btn-act-edit" onclick="editCarta('${c.codigo || c.code}')" style="font-family:'Outfit', sans-serif; font-size:10.5px; font-weight:500; text-transform:none; padding:2px 9px;" title="Editar Carta">
                            <span>Editar</span>
                        </button>
                        <button type="button" class="btn-act-sm" onclick="deleteCarta('${c.codigo || c.code}')" style="background:rgba(239,68,68,0.15); border:1px solid #ef4444; color:#ff6b81; font-family:'Outfit', sans-serif; font-size:10.5px; font-weight:500; text-transform:none; padding:2px 9px;" title="Eliminar Carta">
                            <span>Eliminar</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    renderPagination();
}

function renderPagination() {
    const container = document.getElementById('admin-cartas-pagination');
    if (!container) return;

    const totalPages = Math.ceil(filteredCartasSingles.length / pageSize) || 1;
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = `<div style="display:flex; justify-content:center; align-items:center; gap:6px; margin-top:14px; padding:10px 0;">`;
    html += `<button type="button" onclick="changeCartasPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} style="background:rgba(0,0,0,0.5); border:1px solid rgba(0,240,255,0.3); color:#fff; font-family:'Orbitron', sans-serif; font-size:9px; padding:4px 10px; cursor:pointer;">« ANT</button>`;
    
    for (let p = 1; p <= totalPages; p++) {
        const isCurrent = p === currentPage;
        html += `<button type="button" onclick="changeCartasPage(${p})" style="background:${isCurrent ? '#00f0ff' : 'rgba(0,0,0,0.5)'}; color:${isCurrent ? '#000' : '#fff'}; border:1px solid rgba(0,240,255,0.3); font-family:'Orbitron', sans-serif; font-size:9px; font-weight:700; padding:4px 8px; cursor:pointer;">${p}</button>`;
    }

    html += `<button type="button" onclick="changeCartasPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} style="background:rgba(0,0,0,0.5); border:1px solid rgba(0,240,255,0.3); color:#fff; font-family:'Orbitron', sans-serif; font-size:9px; padding:4px 10px; cursor:pointer;">SIG »</button>`;
    html += `</div>`;

    container.innerHTML = html;
}

function changeCartasPage(p) {
    const totalPages = Math.ceil(filteredCartasSingles.length / pageSize) || 1;
    if (p < 1 || p > totalPages) return;
    currentPage = p;
    renderCartasTable();
}

function onCartasSearch(input) {
    const q = (input.value || '').trim().toLowerCase();
    currentPage = 1;
    if (!q) {
        filteredCartasSingles = [...allCartasSingles];
    } else {
        filteredCartasSingles = allCartasSingles.filter(c => {
            const code = (c.codigo || c.code || '').toLowerCase();
            const name = (c.name || c.nombre || '').toLowerCase();
            const id = String(c.card_id || c.cardId || '');
            const type = (c.tipo_carta || c.card_type || '').toLowerCase();
            const desc = (c.description || c.descripcion || '').toLowerCase();
            return code.includes(q) || name.includes(q) || id.includes(q) || type.includes(q) || desc.includes(q);
        });
    }
    renderCartasTable();
}

function generateNextCartaCode() {
    const prefix = 'CARD-SING-';
    let maxNum = 0;
    allCartasSingles.forEach(c => {
        const code = c.codigo || c.code || '';
        if (code.startsWith(prefix)) {
            const num = parseInt(code.replace(prefix, ''), 10);
            if (!isNaN(num) && num > maxNum) maxNum = num;
        }
    });
    const nextNum = maxNum + 1;
    return `${prefix}${String(nextNum).padStart(2, '0')}`;
}

// Búsqueda inteligente en la base de datos de cartas
function lookupCardInfo(passcode) {
    const pCode = parseInt(passcode, 10);
    if (isNaN(pCode)) return null;

    if (window.PacksManager && typeof window.PacksManager.getPacks === 'function') {
        const packs = window.PacksManager.getPacks();
        for (const p of packs) {
            if (Array.isArray(p.cards)) {
                const found = p.cards.find(c => c.card_id === pCode || parseInt(c.card_id, 10) === pCode);
                if (found) return found;
            }
        }
    }
    return null;
}

function onPasscodeInput(val) {
    const passcodeInput = document.getElementById('form-carta-id');
    const nameInput = document.getElementById('form-carta-name');
    const tipoSelect = document.getElementById('form-carta-tipo-exacto');
    const rarezaSelect = document.getElementById('form-carta-rareza');
    const descInput = document.getElementById('form-carta-desc');
    const previewImg = document.getElementById('form-carta-preview-img');
    const statusMsg = document.getElementById('passcode-status-msg');

    const cleanVal = (val || '').trim();
    if (!cleanVal) {
        if (nameInput) nameInput.value = '';
        if (previewImg) previewImg.src = '/assets/images/cards/placeholder.png';
        if (statusMsg) {
            statusMsg.textContent = 'Escribe el passcode para auto-completar los datos';
            statusMsg.style.color = '#38bdf8';
        }
        return;
    }

    if (previewImg) {
        previewImg.src = `https://images.ygoprodeck.com/images/cards_small/${cleanVal}.jpg`;
    }

    const card = lookupCardInfo(cleanVal);
    if (card) {
        if (nameInput) nameInput.value = card.name || card.nombre || '';
        
        // Determinar tipo oficial
        if (tipoSelect) {
            const rawType = (card.type || '').toLowerCase();
            if (rawType.includes('effect')) {
                tipoSelect.value = 'Monstruo con Efecto';
            } else if (rawType.includes('spell') || rawType.includes('mágica')) {
                tipoSelect.value = 'Carta Mágica';
            } else if (rawType.includes('trap') || rawType.includes('trampa')) {
                tipoSelect.value = 'Carta Trampa';
            } else {
                tipoSelect.value = 'Monstruo Normal';
            }
        }

        // Determinar rareza
        if (rarezaSelect && card.rarity) {
            const rawRarity = card.rarity.toUpperCase();
            if (rawRarity.includes('SECRET')) rarezaSelect.value = 'Secret Rare';
            else if (rawRarity.includes('ULTRA')) rarezaSelect.value = 'Ultra Rare';
            else if (rawRarity.includes('SUPER')) rarezaSelect.value = 'Super Rare';
            else if (rawRarity.includes('RARE')) rarezaSelect.value = 'Rare';
            else rarezaSelect.value = 'Common';
        }

        // Auto-llenar descripción
        if (descInput && (!descInput.value.trim() || document.getElementById('form-carta-edit-mode').value === 'create')) {
            descInput.value = card.desc || card.description || '';
        }

        if (statusMsg) {
            statusMsg.textContent = `Carta identificada: ${card.name}`;
            statusMsg.style.color = '#4ade80';
        }
    } else {
        if (nameInput) nameInput.value = '';
        if (statusMsg) {
            statusMsg.textContent = `Passcode ${cleanVal} - Ingresa el nombre si es una carta especial`;
            statusMsg.style.color = '#ffd700';
        }
        if (nameInput) nameInput.removeAttribute('readonly');
    }
}

function openCreateCartaModal() {
    document.getElementById('form-carta-edit-mode').value = 'create';
    document.getElementById('modal-cartas-title').textContent = 'CREAR CARTA EN VENTA';
    document.getElementById('form-carta-code').value = generateNextCartaCode();
    document.getElementById('form-carta-id').value = '';
    document.getElementById('form-carta-name').value = '';
    document.getElementById('form-carta-name').setAttribute('readonly', 'true');
    document.getElementById('form-carta-tipo-exacto').value = 'Monstruo Normal';
    document.getElementById('form-carta-rareza').value = 'Ultra Rare';
    document.getElementById('form-carta-usd').value = '1.99';
    document.getElementById('form-carta-active').value = '1';
    document.getElementById('form-carta-desc').value = '';
    
    const previewImg = document.getElementById('form-carta-preview-img');
    if (previewImg) previewImg.src = '/assets/images/cards/placeholder.png';

    const statusMsg = document.getElementById('passcode-status-msg');
    if (statusMsg) {
        statusMsg.textContent = 'Escribe el passcode para auto-completar los datos';
        statusMsg.style.color = '#38bdf8';
    }

    hideAlert();
    document.getElementById('admin-cartas-modal').style.display = 'flex';
}

function editCarta(codigo) {
    const c = allCartasSingles.find(item => (item.codigo || item.code) === codigo);
    if (!c) return;

    const cId = c.card_id || c.cardId || '';

    document.getElementById('form-carta-edit-mode').value = 'edit';
    document.getElementById('modal-cartas-title').textContent = `EDITAR (${c.codigo || c.code})`;
    document.getElementById('form-carta-code').value = c.codigo || c.code;
    document.getElementById('form-carta-id').value = cId;
    document.getElementById('form-carta-name').value = c.name || c.nombre || '';
    document.getElementById('form-carta-name').removeAttribute('readonly');
    document.getElementById('form-carta-tipo-exacto').value = c.tipo_carta || c.card_type || 'Monstruo Normal';
    document.getElementById('form-carta-rareza').value = c.rareza || c.rarity || 'Ultra Rare';
    document.getElementById('form-carta-usd').value = c.precio_usd !== undefined ? c.precio_usd : (c.price || 1.99);
    document.getElementById('form-carta-active').value = (c.activo !== 0 && c.activo !== false && c.active !== false) ? '1' : '0';
    document.getElementById('form-carta-desc').value = c.description || c.descripcion || '';

    const previewImg = document.getElementById('form-carta-preview-img');
    if (previewImg) {
        previewImg.src = c.image || (cId ? `https://images.ygoprodeck.com/images/cards_small/${cId}.jpg` : '/assets/images/cards/placeholder.png');
    }

    const statusMsg = document.getElementById('passcode-status-msg');
    if (statusMsg) {
        statusMsg.textContent = `Editando carta: ${c.name || c.codigo}`;
        statusMsg.style.color = '#38bdf8';
    }

    hideAlert();
    document.getElementById('admin-cartas-modal').style.display = 'flex';
}

function closeCartaModal() {
    document.getElementById('admin-cartas-modal').style.display = 'none';
}

async function saveCartaForm() {
    const editMode = document.getElementById('form-carta-edit-mode').value;
    const codigo = document.getElementById('form-carta-code').value.trim();
    const cardId = parseInt(document.getElementById('form-carta-id').value, 10);
    const name = document.getElementById('form-carta-name').value.trim();
    const tipoCarta = document.getElementById('form-carta-tipo-exacto').value;
    const rareza = document.getElementById('form-carta-rareza').value;
    const precioUsd = parseFloat(document.getElementById('form-carta-usd').value) || 1.99;
    const activo = parseInt(document.getElementById('form-carta-active').value, 10);
    const desc = document.getElementById('form-carta-desc').value.trim();

    if (!codigo || !name || isNaN(cardId)) {
        showAlert('Completa los campos obligatorios (*)', 'error');
        return;
    }

    const payload = {
        codigo: codigo,
        code: codigo,
        card_id: cardId,
        cardId: cardId,
        nombre: name,
        name: name,
        rareza: rareza,
        rarity: rareza,
        tipo_carta: tipoCarta,
        card_type: tipoCarta,
        tipo: 'single',
        type: 'SINGLE',
        precio_usd: precioUsd,
        price: precioUsd,
        image: `https://images.ygoprodeck.com/images/cards_small/${cardId}.jpg`,
        descripcion: desc,
        description: desc,
        activo: activo,
        active: activo === 1
    };

    try {
        if (editMode === 'create') {
            allCartasSingles.push(payload);
        } else {
            const idx = allCartasSingles.findIndex(c => (c.codigo || c.code) === codigo);
            if (idx !== -1) {
                allCartasSingles[idx] = payload;
            }
        }

        // Sincronizar en Backend SQL Server
        try {
            await fetch('/api/admin/cartas-singles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: payload.code,
                    cardId: payload.cardId,
                    name: payload.name,
                    rarity: payload.rarity,
                    price: payload.price,
                    description: payload.description,
                    active: payload.active
                })
            });
        } catch (e) {
            console.warn('Backend sync error:', e);
        }

        closeCartaModal();
        filteredCartasSingles = [...allCartasSingles];
        renderCartasTable();
    } catch (e) {
        showAlert('Error al guardar carta: ' + e.message, 'error');
    }
}

async function deleteCarta(codigo) {
    if (!confirm(`¿Estás seguro de eliminar la carta ${codigo}?`)) return;

    allCartasSingles = allCartasSingles.filter(item => (item.codigo || item.code) !== codigo);
    filteredCartasSingles = [...allCartasSingles];

    try {
        await fetch(`/api/admin/cartas-singles/${encodeURIComponent(codigo)}`, { method: 'DELETE' });
    } catch (e) {}

    try {
        await fetch(`/api/admin/cartas-singles/${encodeURIComponent(codigo)}`, {
            method: 'DELETE'
        });
    } catch (e) {}

    renderCartasTable();
}

function showAlert(msg, type) {
    const alertEl = document.getElementById('modal-cartas-alert');
    if (!alertEl) return;
    alertEl.style.display = 'block';
    alertEl.textContent = msg;
    alertEl.style.color = type === 'error' ? '#ff6b81' : '#4ade80';
    alertEl.style.background = type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)';
    alertEl.style.border = `1px solid ${type === 'error' ? '#ef4444' : '#22c55e'}`;
}

function hideAlert() {
    const alertEl = document.getElementById('modal-cartas-alert');
    if (alertEl) alertEl.style.display = 'none';
}
