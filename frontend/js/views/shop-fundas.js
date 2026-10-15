/**
 * Ani-Dimension: Controlador de la Tienda de Fundas y Reversos
 * Renderizado de cards con el diseño exacto y elegante de la Vista Previa (Card TCG).
 */

let currentSleeveCurrencyFilter = 'ALL';
let pendingBuySleeveCode = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (window.SleevesManager) {
        await window.SleevesManager.syncFromServer();
    }
    initShopFundas();
});

function initShopFundas() {
    renderFundasShopCards();
    updateShopUserCoinsDisplay();
}

function updateShopUserCoinsDisplay() {
    const balanceElem = document.getElementById('shop-user-coins');
    const coins = (window.Session && typeof window.Session.getStarships === 'function')
        ? window.Session.getStarships()
        : 0;

    if (balanceElem) {
        balanceElem.textContent = `⭐ ${parseInt(coins, 10).toLocaleString()}`;
    }
}

function setSleeveCurrencyFilter(currency, btnEl) {
    currentSleeveCurrencyFilter = currency;
    const container = document.getElementById('filter-currency-group');
    if (container) {
        container.querySelectorAll('.btn-filter-currency-pill').forEach(b => b.classList.remove('active'));
    }
    if (btnEl) btnEl.classList.add('active');
    renderFundasShopCards();
}

function renderFundasShopCards() {
    const grid = document.getElementById('shop-fundas-grid');
    if (!grid || !window.SleevesManager) return;

    let allSleeves = window.SleevesManager.getActiveSleeves();

    if (currentSleeveCurrencyFilter !== 'ALL') {
        allSleeves = allSleeves.filter(s => (s.currency || 'STARSHIPS').toUpperCase() === currentSleeveCurrencyFilter);
    }

    if (allSleeves.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align:center; padding:40px; color:#94a3b8;">
                <div style="font-family:'Orbitron', sans-serif; font-size:13px; font-weight:800; color:#fff;">NO HAY FUNDAS DISPONIBLES CON ESTE FILTRO</div>
                <div style="font-size:10px; margin-top:4px; color:#64748b;">Prueba seleccionando otra moneda.</div>
            </div>
        `;
        return;
    }

    const activeCode = window.SleevesManager.getActiveSleeveCode();
    grid.className = 'shop-cosmetics-grid';

    grid.innerHTML = allSleeves.map(slv => {
        const isOwned = window.SleevesManager.isSleeveOwned(slv.code);
        const isActive = (activeCode === slv.code);
        const isUsd = (slv.currency === 'USD');
        const offerText = slv.offer_text || '';

        const bannerTag = offerText 
            ? `<div style="position:absolute; top:10px; right:10px; background:linear-gradient(135deg, #ffd700, #f59e0b); color:#000; font-family:'Orbitron', sans-serif; font-size:8px; font-weight:900; padding:2px 8px; box-shadow:0 0 10px rgba(255,215,0,0.5); z-index:2;">${offerText}</div>` 
            : '';

        let actionButtonHtml = '';
        if (isActive) {
            actionButtonHtml = `
                <button type="button" onclick="onDeactivateSleeve()" style="width:100%; height:32px; font-family:'Orbitron', sans-serif; font-size:9.5px; font-weight:700; background:linear-gradient(135deg, rgba(239,68,68,0.25), rgba(185,28,28,0.5)); border:1.5px solid #ef4444; color:#fca5a5; cursor:pointer; box-shadow:0 0 15px rgba(239,68,68,0.3); border-radius:4px; transition:all 0.2s ease;" title="Haz clic para volver a la funda predeterminada">
                    DESACTIVAR
                </button>
            `;
        } else if (isOwned) {
            actionButtonHtml = `
                <button type="button" onclick="onEquipSleeve('${slv.code}')" style="width:100%; height:32px; font-family:'Orbitron', sans-serif; font-size:9.5px; font-weight:500; background:rgba(0,240,255,0.15); border:1.5px solid #00f0ff; color:#00f0ff; cursor:pointer; box-shadow:0 0 12px rgba(0,240,255,0.25); border-radius:4px; transition:all 0.2s ease;">
                    ACTIVAR
                </button>
            `;
        } else {
            if (isUsd) {
                actionButtonHtml = `
                    <button type="button" onclick="onBuySleeveUsd('${slv.code}')" style="width:100%; height:32px; font-family:'Orbitron', sans-serif; font-size:9.5px; font-weight:500; background:linear-gradient(135deg, #16a34a, #15803d); border:1.5px solid #22c55e; color:#fff; cursor:pointer; box-shadow:0 0 12px rgba(34,197,94,0.35); border-radius:4px;">
                        COMPRAR $
                    </button>
                `;
            } else {
                actionButtonHtml = `
                    <button type="button" onclick="onOpenBuySleeveModal('${slv.code}')" style="width:100%; height:32px; font-family:'Orbitron', sans-serif; font-size:9.5px; font-weight:500; background:linear-gradient(135deg, rgba(0,240,255,0.25), rgba(0,180,216,0.5)); border:1.5px solid #00f0ff; color:#00f0ff; cursor:pointer; box-shadow:0 0 12px rgba(0,240,255,0.3); border-radius:4px;">
                        COMPRAR ⭐
                    </button>
                `;
            }
        }

        const priceFormatted = isUsd 
            ? `$ ${parseFloat(slv.price || 0).toFixed(2)} USD` 
            : `⭐ ${parseInt(slv.price || 0, 10).toLocaleString()} STARSHIPS`;

        const statusBadge = isActive 
            ? `<span style="font-size:8px; color:#00f0ff; background:rgba(0,240,255,0.15); border:1px solid #00f0ff; padding:1px 6px; font-weight:700;">ACTIVADO</span>` 
            : (isOwned 
                ? `<span style="font-size:8px; color:#10b981; background:rgba(16,185,129,0.15); border:1px solid #10b981; padding:1px 6px; font-weight:700;">ADQUIRIDO</span>`
                : `<span style="font-size:8px; color:#38bdf8; background:rgba(56,189,248,0.15); border:1px solid #38bdf8; padding:1px 6px; font-weight:700;">DISPONIBLE</span>`);

        return `
            <div class="shop-cosmetic-card" style="background:linear-gradient(180deg, #0e172a 0%, #060a14 100%); border:2px solid ${isActive ? '#00f0ff' : 'rgba(0,240,255,0.45)'}; border-radius:10px; padding:14px; text-align:center; box-shadow:0 0 ${isActive ? '25px rgba(0,240,255,0.45)' : '16px rgba(0,0,0,0.6)'}; position:relative; overflow:hidden; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box;">
                ${bannerTag}
                
                <div>
                    <div style="font-family:'Orbitron', sans-serif; font-size:10px; font-weight:700; color:var(--accent-cyan); margin-bottom:6px; text-align:left;">
                        ${slv.code}
                    </div>

                    <div style="width:120px; height:175px; margin:0 auto 10px auto; border-radius:6px; overflow:hidden; border:1.5px solid rgba(0,240,255,0.5); background:#000; box-shadow:0 0 16px rgba(0,240,255,0.25); display:flex; align-items:center; justify-content:center;">
                        <img src="${slv.image}" alt="${slv.name || slv.code}" style="width:100%; height:100%; object-fit:cover;" onerror="this.onerror=null; this.src='/assets/card_back.jpg';">
                    </div>

                    <div style="font-family:'Outfit', sans-serif; font-size:12.5px; font-weight:800; color:#fff; margin-bottom:4px; text-transform:uppercase; line-height:1.2;">
                        ${slv.name || 'NOMBRE DE LA FUNDA'}
                    </div>

                    <div style="font-size:9.5px; color:#94a3b8; margin-bottom:8px; line-height:1.3; min-height:24px;">
                        ${slv.description || 'Reverso protector místico holográfico oficial con durabilidad vitalicia.'}
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.5); padding:6px 10px; border:1px solid rgba(255,255,255,0.1); margin-bottom:8px;">
                        <span style="font-size:9px; color:#cbd5e1; font-weight:700;">DURACIÓN:</span>
                        <span style="font-size:9px; color:#10b981; font-weight:800;">VITALICIO</span>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,240,255,0.08); padding:6px 10px; border:1px solid rgba(0,240,255,0.3); margin-bottom:8px;">
                        <span style="font-size:9px; color:var(--accent-cyan); font-weight:700;">PRECIO:</span>
                        <span style="font-family:'Orbitron', sans-serif; font-size:10.5px; font-weight:800; color:#ffd700;">${priceFormatted}</span>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                        <span style="font-size:8.5px; color:#94a3b8;">ESTADO:</span>
                        ${statusBadge}
                    </div>
                </div>

                <div>
                    ${actionButtonHtml}
                </div>
            </div>
        `;
    }).join('');
}

async function onEquipSleeve(code) {
    const uid = window.Session ? window.Session.getUserId() : 0;
    if (!uid) return;

    try {
        const res = await fetch('/api/game/cosmetics/equip', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': String(uid),
                'x-session-token': window.Session.getSessionToken()
            },
            body: JSON.stringify({ userId: uid, itemType: 'SLEEVE', itemCode: code })
        });

        const data = await res.json();
        if (data.success) {
            if (window.SleevesManager) {
                window.SleevesManager.setActiveSleeve(code);
            }
            const u = window.Session.getUser();
            if (u) {
                u.fundaActivaId = code;
                window.Session.saveUser(u);
            }
            renderFundasShopCards();
            showSleeveNotice('¡FUNDA EQUIPADA!', `Has activado exitosamente la funda <b>${code}</b> en la base de datos oficial.`);
        } else {
            showSleeveNotice('❌ ERROR', data.message);
        }
    } catch (e) {
        showSleeveNotice('❌ ERROR DE RED', 'Error al comunicar con el servidor.');
    }
}

async function onDeactivateSleeve() {
    const uid = window.Session ? window.Session.getUserId() : 0;
    if (!uid) return;

    try {
        if (window.SleevesManager) {
            await window.SleevesManager.setActiveSleeve('');
        }
        const u = window.Session.getUser();
        if (u) {
            u.fundaActivaId = null;
            u.sleeve = null;
            window.Session.saveUser(u);
        }
        renderFundasShopCards();
        showSleeveNotice('FUNDA DESACTIVADA', 'Has retirado tu funda activa. Tus cartas volverán a mostrar el reverso tradicional original.');
    } catch (e) {
        showSleeveNotice('❌ ERROR', 'Error al desactivar la funda.');
    }
}

function onOpenBuySleeveModal(code) {
    const slv = window.SleevesManager.getSleeveByCode(code);
    if (!slv) return;

    pendingBuySleeveCode = code;
    const detailsEl = document.getElementById('modal-sleeve-buy-details');
    if (detailsEl) {
        detailsEl.innerHTML = `
            <div style="font-size:12px; font-weight:800; color:#fff; margin-bottom:4px;">${slv.name} (${slv.code})</div>
            <div style="font-size:13px; color:#ffd700; font-weight:900; font-family:'Orbitron', sans-serif; margin-top:4px;">
                PRECIO: ⭐ ${parseInt(slv.price || 0, 10).toLocaleString()} STARSHIPS
            </div>
        `;
    }

    const confirmBtn = document.getElementById('btn-modal-confirm-sleeve-buy');
    if (confirmBtn) {
        confirmBtn.onclick = onConfirmBuySleeveStarships;
    }

    const modal = document.getElementById('shop-sleeve-confirm-modal');
    if (modal) modal.style.display = 'flex';
}

function closeSleeveConfirmModal() {
    const modal = document.getElementById('shop-sleeve-confirm-modal');
    if (modal) modal.style.display = 'none';
    pendingBuySleeveCode = null;
}

async function onConfirmBuySleeveStarships() {
    if (!pendingBuySleeveCode || !window.SleevesManager) return;
    const slv = window.SleevesManager.getSleeveByCode(pendingBuySleeveCode);
    if (!slv) return;

    const price = parseInt(slv.price || 0, 10);
    const uid = window.Session ? window.Session.getUserId() : 0;
    if (!uid) {
        closeSleeveConfirmModal();
        alert('Debes iniciar sesión para comprar fundas.');
        return;
    }

    try {
        const res = await fetch('/api/game/cosmetics/buy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': String(uid),
                'x-session-token': window.Session.getSessionToken()
            },
            body: JSON.stringify({ userId: uid, itemType: 'SLEEVE', itemCode: slv.code, costStarships: price })
        });

        const data = await res.json();
        if (data.success) {
            if (window.Session && data.newStarshipsBalance !== undefined) {
                const u = window.Session.getUser();
                if (u) {
                    u.starships = data.newStarshipsBalance;
                    window.Session.saveUser(u);
                    window.Session.applyImmediateUI();
                }
            }

            // Equipar en DB
            await fetch('/api/game/cosmetics/equip', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': String(uid),
                    'x-session-token': window.Session.getSessionToken()
                },
                body: JSON.stringify({ userId: uid, itemType: 'SLEEVE', itemCode: slv.code })
            });

            window.SleevesManager.buySleeve(slv.code);
            window.SleevesManager.setActiveSleeve(slv.code);

            closeSleeveConfirmModal();
            updateShopUserCoinsDisplay();
            renderFundasShopCards();

            showSleeveNotice('¡COMPRA Y ACTIVACIÓN EXITOSA!', `Has adquirido la funda <b>${slv.name}</b> (${slv.code}) por ⭐ ${price.toLocaleString()} StarShips y ha quedado activada en tus cartas.`);
        } else {
            closeSleeveConfirmModal();
            showSleeveNotice('❌ ERROR EN COMPRA', data.message || 'No se pudo procesar la compra.');
        }
    } catch (err) {
        closeSleeveConfirmModal();
        showSleeveNotice('❌ ERROR DE RED', 'Error al conectar con la base de datos.');
    }
}

function onBuySleeveUsd(code) {
    const slv = window.SleevesManager.getSleeveByCode(code);
    if (!slv) return;

    sessionStorage.setItem('ad_pending_payment_item', JSON.stringify({
        type: 'SLEEVE',
        code: slv.code,
        name: slv.name,
        price: slv.price,
        currency: 'USD',
        image: slv.image
    }));

    window.location.href = 'shop-pago-instrucciones.html';
}

function showSleeveNotice(title, msg) {
    const modal = document.getElementById('shop-sleeve-notice-modal');
    const titleEl = document.getElementById('modal-sleeve-notice-title');
    const msgEl = document.getElementById('modal-sleeve-notice-msg');

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.innerHTML = msg;
    if (modal) modal.style.display = 'flex';
}

function closeSleeveNoticeModal() {
    const modal = document.getElementById('shop-sleeve-notice-modal');
    if (modal) modal.style.display = 'none';
}
