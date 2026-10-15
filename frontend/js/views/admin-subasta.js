/**
 * ANI-DIMENSION: CONTROLADOR DEL GESTOR DE SUBASTAS (ADMINISTRADOR)
 * Soporta creación múltiple en simultáneo, edición, finalización, cancelación y tabla histórica.
 */

let currentAdminUser = null;
let selectedAuctionCard = {
    cardCode: 89631139,
    cardName: 'Dragón Blanco de Ojos Azules',
    cardRarity: 'ULTRA_RARE',
    cardType: 'Dragon / Normal Monster',
    imageUrl: 'https://images.ygoprodeck.com/images/cards_small/89631139.jpg'
};
let isEditingMode = false;
let editingSubastaId = null;
let adminSubastaSocket = null;
let adminTableInterval = null;
let allAuctionsCache = [];

async function initAdminSubastaView() {
    currentAdminUser = window.Session ? window.Session.getUser() : null;
    const isAdm = (currentAdminUser && (currentAdminUser.role === 'admin' || currentAdminUser.username.toLowerCase() === 'admin' || currentAdminUser.isAdmin));

    if (!isAdm) {
        showSubastaToast('Acceso restringido a Administradores.', 'error');
        setTimeout(() => { window.location.href = '/views/lobby/lobby.html'; }, 1500);
        return;
    }

    initAdminSocket();
    setupCardSearch();
    await loadAdminAuctionData();
    if (adminTableInterval) clearInterval(adminTableInterval);
    adminTableInterval = setInterval(loadAdminAuctionData, 8000);
}

function initAdminSocket() {
    adminSubastaSocket = window.getSocket ? window.getSocket() : (window.socket || (typeof io !== 'undefined' ? io() : null));
    if (!adminSubastaSocket && typeof io !== 'undefined') {
        adminSubastaSocket = io();
    }

    if (!adminSubastaSocket) return;

    adminSubastaSocket.off('SUBASTA_NUEVA_PUJA');
    adminSubastaSocket.on('SUBASTA_NUEVA_PUJA', () => loadAdminAuctionData());

    adminSubastaSocket.off('SUBASTA_FINALIZADA');
    adminSubastaSocket.on('SUBASTA_FINALIZADA', () => loadAdminAuctionData());

    adminSubastaSocket.off('SUBASTA_NUEVA_CREADA');
    adminSubastaSocket.on('SUBASTA_NUEVA_CREADA', () => loadAdminAuctionData());

    adminSubastaSocket.off('SUBASTA_UPDATED');
    adminSubastaSocket.on('SUBASTA_UPDATED', () => loadAdminAuctionData());

    adminSubastaSocket.off('SUBASTA_CANCELLED');
    adminSubastaSocket.on('SUBASTA_CANCELLED', () => loadAdminAuctionData());
}

async function loadAdminAuctionData() {
    const tbody = document.getElementById('admin-auctions-tbody');
    const activeCountEl = document.getElementById('admin-active-count');
    const totalCountEl = document.getElementById('admin-total-count');

    try {
        const res = await fetch('/api/subastas/all');
        const data = await res.json();

        if (data.success && Array.isArray(data.auctions)) {
            allAuctionsCache = data.auctions;
            const activeAuctions = data.auctions.filter(a => a.Status === 'ACTIVE');
            
            if (activeCountEl) activeCountEl.textContent = activeAuctions.length;
            if (totalCountEl) totalCountEl.textContent = data.auctions.length;

            if (!tbody) return;

            if (data.auctions.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:20px;">No hay registros de subastas. Crea la primera usando el formulario.</td></tr>`;
                return;
            }

            tbody.innerHTML = data.auctions.map(a => {
                const isActive = (a.Status === 'ACTIVE');
                const rarityCol = a.CardRarity === 'SECRET_RARE' ? '#ec4899' : a.CardRarity === 'ULTRA_RARE' ? '#ffd700' : '#00f0ff';
                const winner = a.HighestBidderUsername ? `<b>${escapeHtml(a.HighestBidderUsername)}</b>` : '<span style="color:#64748b;">Sin ofertas</span>';

                let timeOrStatus = '';
                if (isActive) {
                    const secs = a.SecondsRemaining !== undefined ? a.SecondsRemaining : 0;
                    if (secs <= 0) {
                        timeOrStatus = '<span style="color:#ff0055; font-weight:700;">FINALIZANDO...</span>';
                    } else {
                        const d = Math.floor(secs / 86400);
                        const h = Math.floor((secs % 86400) / 3600);
                        const m = Math.floor((secs % 3600) / 60);
                        const s = secs % 60;
                        const dStr = d > 0 ? `${d}d ` : '';
                        timeOrStatus = `<span style="color:#00ff88; font-weight:700; font-family:'Orbitron',sans-serif;">⏳ ${dStr}${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}</span>`;
                    }
                } else if (a.Status === 'FINISHED') {
                    timeOrStatus = '<span style="color:#00ff88; font-weight:700; font-size:9px;">🏆 FINALIZADA</span>';
                } else {
                    timeOrStatus = '<span style="color:#ff0055; font-weight:700; font-size:9px;">✕ CANCELADA</span>';
                }

                return `
                    <tr>
                        <td style="font-family:'Orbitron',sans-serif; color:#94a3b8; font-weight:700;">#${a.Id}</td>
                        <td>
                            <div style="display:flex; align-items:center; gap:8px;">
                                <img src="${a.ImageUrl || `https://images.ygoprodeck.com/images/cards_small/${a.CardCode}.jpg`}" onerror="this.onerror=null; this.src='/assets/card_back.jpg';" style="width:24px; height:35px; object-fit:cover; border:1px solid ${rarityCol};">
                                <div>
                                    <div style="font-weight:700; color:#fff; max-width:160px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(a.CardName)}</div>
                                    <div style="font-size:8px; color:${rarityCol};">#${a.CardCode} • ${escapeHtml(a.CardRarity || 'ULTRA_RARE')}</div>
                                </div>
                            </div>
                        </td>
                        <td style="color:#ffd700; font-family:'Orbitron',sans-serif; font-weight:700;">⭐ ${Number(a.InitialPrice).toLocaleString()}</td>
                        <td style="color:#00f0ff; font-family:'Orbitron',sans-serif; font-weight:800;">
                            ⭐ ${Number(a.CurrentPrice).toLocaleString()}
                            <div style="font-size:8px; color:#94a3b8; font-family:'Outfit',sans-serif;">(${a.TotalBids || 0} pujas)</div>
                        </td>
                        <td>${winner}</td>
                        <td>${timeOrStatus}</td>
                        <td style="text-align:center;">
                            <div style="display:flex; gap:4px; justify-content:center; flex-wrap:wrap;">
                                ${isActive ? `
                                    <button class="btn-table-action edit" onclick="startEditAuction(${a.Id})" title="Editar precio base, incremento o tiempo">
                                        ✏️ EDITAR
                                    </button>
                                    <button class="btn-table-action finish" onclick="onAdminFinalizeAuction(${a.Id})" title="Finalizar y transferir al ganador">
                                        🏆 ENTREGAR
                                    </button>
                                    <button class="btn-table-action cancel" onclick="onAdminCancelAuction(${a.Id})" title="Cancelar y devolver estrellas">
                                        ✕ CANCELAR
                                    </button>
                                ` : `
                                    <span style="color:#64748b; font-size:9px; font-family:'Orbitron',sans-serif;">CERRADA</span>
                                `}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    } catch (e) {
        console.error('[ADMIN LOAD ERROR]', e);
    }
}

function setupCardSearch() {
    const input = document.getElementById('admin-card-search');
    const results = document.getElementById('admin-card-search-results');
    if (!input || !results) return;

    let debounceTimeout = null;

    async function executeSearch(query) {
        if (!query) {
            results.style.display = 'none';
            return;
        }

        try {
            const res = await fetch(`/api/cards/search?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            const cards = data.cards || (Array.isArray(data) ? data : []);

            if (cards.length === 0) {
                results.innerHTML = '<div style="padding:6px; font-size:10px; color:#64748b;">No se encontraron cartas.</div>';
                results.style.display = 'block';
                return;
            }

            const exactCode = parseInt(query, 10);

            results.innerHTML = cards.slice(0, 10).map(c => {
                const cId = c.card_id || c.id;
                const isExact = (cId === exactCode);
                return `
                    <div style="padding:5px 8px; font-size:10.5px; cursor:pointer; border-bottom:1px solid rgba(255,255,255,0.06); display:flex; justify-content:space-between; align-items:center; background:${isExact ? 'rgba(0,240,255,0.12)' : 'transparent'};" onclick="selectCardForAuction(${cId}, '${escapeHtml(c.name)}', '${c.rarity || 'ULTRA_RARE'}', '${escapeHtml(c.type || 'Monster')}')">
                        <div style="display:flex; align-items:center; gap:6px;">
                            <img src="https://images.ygoprodeck.com/images/cards_small/${cId}.jpg" onerror="this.onerror=null; this.src='https://images.ygoprodeck.com/images/cards/${cId}.jpg';" style="width:18px; height:26px; object-fit:cover; border:1px solid #00f0ff;">
                            <span style="color:#fff; font-weight:${isExact ? '700' : '400'};">${escapeHtml(c.name)}</span>
                        </div>
                        <span style="color:#38bdf8; font-family:'Orbitron',sans-serif; font-size:9px;">#${cId}</span>
                    </div>
                `;
            }).join('');
            results.style.display = 'block';

        } catch (e) {
            console.error('[CARD SEARCH ERROR]', e);
        }
    }

    input.addEventListener('input', () => {
        clearTimeout(debounceTimeout);
        const query = (input.value || '').trim();
        debounceTimeout = setTimeout(() => executeSearch(query), 200);
    });

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !results.contains(e.target)) {
            results.style.display = 'none';
        }
    });
}

function selectCardForAuction(cardCode, name, rarity, type) {
    selectedAuctionCard = {
        cardCode: cardCode,
        cardName: name,
        cardRarity: rarity,
        cardType: type,
        imageUrl: `https://images.ygoprodeck.com/images/cards_small/${cardCode}.jpg`
    };

    const previewImg = document.getElementById('admin-preview-img');
    const previewName = document.getElementById('admin-preview-name');
    const previewCode = document.getElementById('admin-preview-code');
    const previewRarity = document.getElementById('admin-preview-rarity');
    const results = document.getElementById('admin-card-search-results');
    const input = document.getElementById('admin-card-search');

    if (previewImg) previewImg.src = `https://images.ygoprodeck.com/images/cards_small/${cardCode}.jpg`;
    if (previewName) previewName.textContent = name;
    if (previewCode) previewCode.textContent = `Código OCG: #${cardCode}`;
    if (previewRarity) previewRarity.textContent = `${rarity} • ${type}`;
    if (results) results.style.display = 'none';
    if (input) input.value = `${name} (#${cardCode})`;
}

function startEditAuction(subastaId) {
    const auction = allAuctionsCache.find(a => a.Id === subastaId);
    if (!auction) return;

    isEditingMode = true;
    editingSubastaId = subastaId;

    selectCardForAuction(auction.CardCode, auction.CardName, auction.CardRarity, auction.CardType);

    document.getElementById('form-mode-title').textContent = `EDITAR SUBASTA #${subastaId}`;
    document.getElementById('form-mode-title').style.color = '#ffd700';
    document.getElementById('btn-cancel-edit').style.display = 'inline-block';

    document.getElementById('admin-init-price').value = auction.InitialPrice;
    document.getElementById('admin-min-increment').value = auction.MinBidIncrement;
    document.getElementById('admin-editing-subasta-id').value = subastaId;

    document.getElementById('duration-container').style.display = 'none';
    document.getElementById('extend-container').style.display = 'block';

    const submitBtn = document.getElementById('btn-admin-submit-auction');
    submitBtn.textContent = '💾 GUARDAR CAMBIOS DE SUBASTA';
    submitBtn.style.background = 'linear-gradient(135deg, rgba(255,215,0,0.3), rgba(255,215,0,0.1))';
    submitBtn.style.borderColor = '#ffd700';

    showSubastaToast(`Modo edición activo para subasta #${subastaId}`, 'info');
}

function resetAuctionForm() {
    isEditingMode = false;
    editingSubastaId = null;

    document.getElementById('form-mode-title').textContent = 'PUBLICAR NUEVA SUBASTA';
    document.getElementById('form-mode-title').style.color = '#00f0ff';
    document.getElementById('btn-cancel-edit').style.display = 'none';

    document.getElementById('admin-init-price').value = 500;
    document.getElementById('admin-min-increment').value = 100;
    document.getElementById('admin-editing-subasta-id').value = '';

    document.getElementById('duration-container').style.display = 'block';
    document.getElementById('extend-container').style.display = 'none';

    const submitBtn = document.getElementById('btn-admin-submit-auction');
    submitBtn.textContent = '🚀 LANZAR SUBASTA EN VIVO';
    submitBtn.style.background = 'linear-gradient(135deg, rgba(0,240,255,0.3), rgba(0,240,255,0.1))';
    submitBtn.style.borderColor = '#00f0ff';
}

async function onAdminSubmitAuction() {
    if (isEditingMode && editingSubastaId) {
        await onAdminSaveEditedAuction();
    } else {
        await onAdminLaunchAuction();
    }
}

async function onAdminLaunchAuction() {
    if (!selectedAuctionCard || !selectedAuctionCard.cardCode) {
        showSubastaToast('Selecciona una carta para la subasta.', 'warning');
        return;
    }

    const initPrice = parseInt(document.getElementById('admin-init-price').value, 10) || 500;
    const minInc = parseInt(document.getElementById('admin-min-increment').value, 10) || 100;
    const duration = parseInt(document.getElementById('admin-duration-select').value, 10) || 1440;
    const btn = document.getElementById('btn-admin-submit-auction');

    try {
        if (btn) btn.disabled = true;

        const res = await fetch('/api/subastas/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cardCode: selectedAuctionCard.cardCode,
                cardName: selectedAuctionCard.cardName,
                cardRarity: selectedAuctionCard.cardRarity,
                cardType: selectedAuctionCard.cardType,
                imageUrl: selectedAuctionCard.imageUrl,
                initialPrice: initPrice,
                minBidIncrement: minInc,
                durationMinutes: duration,
                createdBy: currentAdminUser.username || 'Admin'
            })
        });

        const data = await res.json();
        if (data.success) {
            showSubastaToast(data.message || '¡Subasta lanzada con éxito!', 'success');
            resetAuctionForm();
            await loadAdminAuctionData();
        } else {
            showSubastaToast(data.message || 'Error al lanzar subasta.', 'error');
        }
    } catch (e) {
        console.error('[LAUNCH ERROR]', e);
        showSubastaToast('Error de conexión al lanzar la subasta.', 'error');
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function onAdminSaveEditedAuction() {
    const initPrice = parseInt(document.getElementById('admin-init-price').value, 10) || 500;
    const minInc = parseInt(document.getElementById('admin-min-increment').value, 10) || 100;
    const extendMin = parseInt(document.getElementById('admin-extend-select').value, 10) || 0;
    const btn = document.getElementById('btn-admin-submit-auction');

    try {
        if (btn) btn.disabled = true;

        const res = await fetch('/api/subastas/edit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subastaId: editingSubastaId,
                cardCode: selectedAuctionCard.cardCode,
                cardName: selectedAuctionCard.cardName,
                cardRarity: selectedAuctionCard.cardRarity,
                cardType: selectedAuctionCard.cardType,
                imageUrl: selectedAuctionCard.imageUrl,
                initialPrice: initPrice,
                minBidIncrement: minInc,
                extendMinutes: extendMin
            })
        });

        const data = await res.json();
        if (data.success) {
            showSubastaToast(data.message || 'Subasta actualizada con éxito.', 'success');
            resetAuctionForm();
            await loadAdminAuctionData();
        } else {
            showSubastaToast(data.message || 'Error al actualizar subasta.', 'error');
        }
    } catch (e) {
        console.error('[EDIT ERROR]', e);
        showSubastaToast('Error de conexión al actualizar la subasta.', 'error');
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function onAdminFinalizeAuction(subastaId) {
    try {
        const res = await fetch('/api/subastas/finalize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subastaId })
        });
        const data = await res.json();
        if (data.success) {
            showSubastaToast(data.message || 'Subasta finalizada exitosamente.', 'success');
            await loadAdminAuctionData();
        } else {
            showSubastaToast(data.message || 'Error al finalizar subasta.', 'error');
        }
    } catch (e) {
        console.error('[FINALIZE ERROR]', e);
        showSubastaToast('Error de conexión al finalizar.', 'error');
    }
}

async function onAdminCancelAuction(subastaId) {
    try {
        const res = await fetch('/api/subastas/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subastaId })
        });
        const data = await res.json();
        if (data.success) {
            showSubastaToast(data.message || 'Subasta cancelada y estrellas reintegradas.', 'info');
            await loadAdminAuctionData();
        } else {
            showSubastaToast(data.message || 'Error al cancelar subasta.', 'error');
        }
    } catch (e) {
        console.error('[CANCEL ERROR]', e);
        showSubastaToast('Error de conexión al cancelar.', 'error');
    }
}

function showSubastaToast(message, type = 'info') {
    let toast = document.getElementById('subasta-admin-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'subasta-admin-toast';
        toast.className = 'subasta-toast';
        document.body.appendChild(toast);
    }
    toast.className = `subasta-toast ${type} show`;
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;

    if (window._subastaToastTimeout) clearTimeout(window._subastaToastTimeout);
    window._subastaToastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
