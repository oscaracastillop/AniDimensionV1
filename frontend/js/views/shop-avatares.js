/**
 * JS Lógica para la Tienda de Avatares
 * Ani-Dimension - SINCRONIZACIÓN 1:1 CON GERENCIA DE AVATARES
 */

let currentCurrencyFilter = 'ALL'; // 'ALL', 'STARSHIPS', 'USD'

function getUserStarshipsBalance() {
    if (window.Session && typeof window.Session.getStarships === 'function') {
        return window.Session.getStarships();
    }
    return 0;
}

function updateBalanceDisplay() {
    const coinEl = document.getElementById('shop-user-coins');
    if (coinEl) {
        coinEl.textContent = `⭐ ${getUserStarshipsBalance().toLocaleString()}`;
    }
}

function renderShopAvatarsGrid() {
    const container = document.getElementById('shop-avatars-grid-container') || document.querySelector('.shop-scroll-content');
    if (!container) return;

    if (typeof AvatarsManager === 'undefined') {
        console.error('AvatarsManager no disponible');
        return;
    }

    // Obtiene avatares activos directamente del Single Source of Truth
    let activeAvatars = AvatarsManager.getActiveAvatars();
    const activeAvatarCode = AvatarsManager.getActiveAvatarCode();

    // Aplicar filtro de moneda
    if (currentCurrencyFilter === 'STARSHIPS') {
        activeAvatars = activeAvatars.filter(a => (a.currency || 'STARSHIPS') === 'STARSHIPS');
    } else if (currentCurrencyFilter === 'USD') {
        activeAvatars = activeAvatars.filter(a => (a.currency || 'STARSHIPS') === 'USD');
    }

    if (!activeAvatars || activeAvatars.length === 0) {
        container.innerHTML = `
            <div class="shop-empty-category-container">
                <div class="shop-empty-icon" style="color:#00f0ff;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:100%; height:100%;">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                </div>
                <div class="shop-empty-title">NO HAY AVATARES DISPONIBLES EN ESTA CATEGORÍA</div>
                <div class="shop-empty-desc">No se encontraron avatares activos con el filtro seleccionado.</div>
            </div>
        `;
        return;
    }

    let gridHtml = `<div class="avatars-shop-grid">`;

    activeAvatars.forEach(avatar => {
        const isOwned = AvatarsManager.isAvatarOwned(avatar.code);
        const isEquipped = activeAvatarCode === avatar.code;
        const currency = avatar.currency || 'STARSHIPS';

        // Estadísticas decimales sincronizadas 1:1 con la gerencia de avatares admin
        const expText = parseFloat(avatar.exp_boost !== undefined ? avatar.exp_boost : 0).toFixed(1);
        const starText = parseFloat(avatar.starships_boost !== undefined ? avatar.starships_boost : 0).toFixed(1);
        const luckText = parseFloat(avatar.luck_boost !== undefined ? avatar.luck_boost : (avatar.suerte_boost || 0)).toFixed(1);
        
        const rawPrice = avatar.price !== undefined ? parseFloat(avatar.price) : 50000;
        const bannerText = avatar.offer_text || avatar.banner || (avatar.code === 'AVA-002' ? 'INICIAL' : 'NUEVO');
        const imgPath = avatar.image || `../../assets/images/avatars/${avatar.code}.png`;

        let actionBtnHtml = '';
        let currencyTagHtml = '';

        if (currency === 'USD') {
            currencyTagHtml = `<span style="position:absolute; top:6px; left:6px; font-family:'Orbitron', sans-serif; font-size:7.5px; font-weight:800; background:rgba(34,197,94,0.25); border:1px solid #22c55e; color:#22c55e; padding:1.5px 4px; z-index:3;">💵 USD</span>`;
        }

        if (isEquipped) {
            actionBtnHtml = `<button type="button" class="btn-avatar-action equipped" disabled>EQUIPADO ✓</button>`;
        } else if (isOwned) {
            actionBtnHtml = `<button type="button" class="btn-avatar-action equip" onclick="if(window.SoundManager) window.SoundManager.playSFX('button'); window.ShopAvatars.equip('${avatar.code}')">ACTIVAR / EQUIPAR</button>`;
        } else {
            if (currency === 'USD') {
                actionBtnHtml = `<button type="button" class="btn-avatar-action buy" style="background:linear-gradient(135deg, rgba(34,197,94,0.3), rgba(22,163,74,0.6)); border-color:#22c55e; color:#fff;" onclick="if(window.SoundManager) window.SoundManager.playSFX('button'); window.ShopAvatars.buyUsd('${avatar.code}')">ADQUIRIR $ ${rawPrice.toFixed(2)} USD</button>`;
            } else {
                actionBtnHtml = `<button type="button" class="btn-avatar-action buy" onclick="if(window.SoundManager) window.SoundManager.playSFX('button'); window.ShopAvatars.confirmBuyStarships('${avatar.code}')">COMPRAR ⭐ ${rawPrice.toLocaleString()}</button>`;
            }
        }

        gridHtml += `
            <div class="avatar-shop-card ${isEquipped ? 'is-active-avatar' : ''} ${isOwned ? 'is-owned-avatar' : ''}">
                <!-- BANNER DE OFERTA CONFIGURADO POR EL ADMIN -->
                <div class="avatar-card-banner">${bannerText}</div>
                ${currencyTagHtml}
                
                <!-- IMAGEN COMPLETA DEL AVATAR -->
                <div class="avatar-card-img-wrap">
                    <img src="${imgPath}" 
                         alt="${avatar.code}"
                         onerror="this.onerror=null; this.src='../../assets/images/avatars/AVA-002.png';">
                </div>

                <!-- TITULO CON CÓDIGO ÚNICO DEL AVATAR -->
                <div class="avatar-card-info">
                    <div class="avatar-card-code">${avatar.code}</div>
                    <div class="avatar-card-name" style="font-size:9.5px; color:#cbd5e1; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px;">${avatar.name || avatar.code}</div>
                    ${currency === 'USD' ? `<div style="font-size:7px; color:#c084fc; font-family:'Orbitron', sans-serif; font-weight:800; margin-top:1px;">🎨 PERSONALIZABLE</div>` : ''}
                </div>

                <!-- LOS 3 POTENCIADORES DECIMALES SINCRONIZADOS 1:1 CON EL ADMIN -->
                <div class="avatar-card-boosters">
                    <div class="booster-tag exp" title="Aumento de Exp (%)">
                        <span class="b-lbl">EXP</span>
                        <span class="b-val">+${expText}%</span>
                    </div>
                    <div class="booster-tag star" title="Aumento de StarShips (%)">
                        <span class="b-lbl">STAR</span>
                        <span class="b-val">+${starText}%</span>
                    </div>
                    <div class="booster-tag suerte" title="Aumento de Suerte (%)">
                        <span class="b-lbl">LUCK</span>
                        <span class="b-val">+${luckText}%</span>
                    </div>
                </div>

                <!-- BOTÓN DE ACCIÓN CON EL PRECIO INTEGRADO -->
                <div class="avatar-card-footer">
                    ${actionBtnHtml}
                </div>
            </div>
        `;
    });

    gridHtml += `</div>`;
    container.innerHTML = gridHtml;
}

// Filtros de Moneda
window.setAvatarCurrencyFilter = function(currency, btn) {
    currentCurrencyFilter = currency;
    const group = document.getElementById('filter-currency-group');
    if (group) {
        group.querySelectorAll('.btn-filter-currency-pill').forEach(b => b.classList.remove('active'));
    }
    if (btn) btn.classList.add('active');
    renderShopAvatarsGrid();
};

// Modal de confirmación de compra con StarShips
function confirmBuyStarships(code) {
    const avatar = AvatarsManager.getAvatarByCode(code);
    if (!avatar) return;

    const modal = document.getElementById('shop-avatar-confirm-modal');
    const details = document.getElementById('modal-avatar-buy-details');
    const confirmBtn = document.getElementById('btn-modal-avatar-confirm-buy');

    if (!modal || !details || !confirmBtn) return;

    const expText = parseFloat(avatar.exp_boost || 0).toFixed(1);
    const starText = parseFloat(avatar.starships_boost || 0).toFixed(1);
    const luckText = parseFloat(avatar.luck_boost !== undefined ? avatar.luck_boost : (avatar.suerte_boost || 0)).toFixed(1);
    const price = parseFloat(avatar.price || 0);

    const currentBal = getUserStarshipsBalance();

    details.innerHTML = `
        <div style="font-size:14px; font-weight:800; color:#fff; margin-bottom:4px;">${avatar.name || avatar.code}</div>
        <div style="font-family:'Orbitron', sans-serif; font-size:10px; color:var(--accent-cyan); margin-bottom:8px;">CÓDIGO: <b>${avatar.code}</b></div>
        <div style="display:flex; justify-content:center; gap:8px; margin-bottom:10px;">
            <span style="background:rgba(56,189,248,0.15); border:1px solid #38bdf8; color:#38bdf8; padding:2px 6px; font-size:9px; font-weight:800;">+${expText}% EXP</span>
            <span style="background:rgba(234,179,8,0.15); border:1px solid #eab308; color:#eab308; padding:2px 6px; font-size:9px; font-weight:800;">+${starText}% STAR</span>
            <span style="background:rgba(192,132,252,0.15); border:1px solid #c084fc; color:#c084fc; padding:2px 6px; font-size:9px; font-weight:800;">+${luckText}% LUCK</span>
        </div>
        <div style="font-size:12px; color:#cbd5e1;">Costo Total: <b style="color:#ffd700; font-size:13px;">⭐ ${price.toLocaleString()} StarShips</b></div>
        <div style="font-size:10px; color:#94a3b8; margin-top:4px;">Tu saldo actual: ⭐ ${currentBal.toLocaleString()}</div>
    `;

    confirmBtn.onclick = function () {
        closeAvatarConfirmModal();
        executeBuyStarships(avatar);
    };

    modal.style.display = 'flex';
}

window.closeAvatarConfirmModal = function() {
    const modal = document.getElementById('shop-avatar-confirm-modal');
    if (modal) modal.style.display = 'none';
};

async function executeBuyStarships(avatar) {
    const price = parseFloat(avatar.price || 0);
    const uid = window.Session ? window.Session.getUserId() : 0;
    if (!uid) {
        openNoticeModal('ACCESO REQUERIDO', 'Debes iniciar sesión para adquirir avatares.', 'error');
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
            body: JSON.stringify({ userId: uid, itemType: 'AVATAR', itemCode: avatar.code, costStarships: price })
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

            // Equipar automáticamente
            await fetch('/api/game/cosmetics/equip', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': String(uid),
                    'x-session-token': window.Session.getSessionToken()
                },
                body: JSON.stringify({ userId: uid, itemType: 'AVATAR', itemCode: avatar.code })
            });

            if (window.AvatarsManager) {
                window.AvatarsManager.buyAvatar(avatar.code);
                window.AvatarsManager.setActiveAvatar(avatar.code);
            }

            openNoticeModal(
                '¡AVATAR DESBLOQUEADO Y EQUIPADO!',
                `Has adquirido exitosamente el avatar <b>${avatar.name || avatar.code}</b> por ⭐ ${price.toLocaleString()} StarShips. Ya se encuentra activo en tu perfil de duelista.`,
                'success'
            );

            updateBalanceDisplay();
            renderShopAvatarsGrid();
        } else {
            openNoticeModal('ERROR EN COMPRA', data.message || 'No se pudo procesar la compra.', 'error');
        }
    } catch (err) {
        openNoticeModal('ERROR DE CONEXIÓN', 'No se pudo comunicar con el servidor.', 'error');
    }
}

// Redirección a instrucciones de pago para compras en Dólares USD
function buyUsdAvatar(code) {
    window.location.href = `shop-pago-instrucciones.html?type=avatar&codigo=${encodeURIComponent(code)}`;
}

async function equipAvatar(code) {
    const uid = window.Session ? window.Session.getUserId() : 0;
    if (!uid) {
        openNoticeModal('ACCESO REQUERIDO', 'Debes iniciar sesión para equipar avatares.', 'error');
        return;
    }

    try {
        const res = await fetch('/api/game/cosmetics/equip', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': String(uid),
                'x-session-token': window.Session.getSessionToken()
            },
            body: JSON.stringify({ userId: uid, itemType: 'AVATAR', itemCode: code })
        });

        const data = await res.json();
        if (data.success) {
            if (window.AvatarsManager) {
                window.AvatarsManager.setActiveAvatar(code);
            }
            const u = window.Session.getUser();
            if (u) {
                u.avatarActivoId = code;
                window.Session.saveUser(u);
            }
            openNoticeModal(
                '¡AVATAR EQUIPADO!',
                `El avatar <b>${code}</b> ha sido configurado como tu avatar principal de duelo.`,
                'success'
            );
            renderShopAvatarsGrid();
        } else {
            openNoticeModal('ERROR AL EQUIPAR', data.message || 'No se pudo equipar el avatar seleccionado.', 'error');
        }
    } catch (e) {
        openNoticeModal('ERROR DE CONEXIÓN', 'No se pudo comunicar con el servidor.', 'error');
    }
}

function openNoticeModal(title, msg, type = 'success') {
    const modal = document.getElementById('shop-avatar-notice-modal');
    const titleEl = document.getElementById('modal-avatar-notice-title');
    const msgEl = document.getElementById('modal-avatar-notice-msg');
    const iconEl = document.getElementById('modal-avatar-notice-icon');

    if (!modal || !titleEl || !msgEl) return;

    titleEl.textContent = title;
    titleEl.style.color = type === 'error' ? '#ef4444' : '#00f0ff';
    msgEl.innerHTML = msg;
    if (iconEl) {
        iconEl.textContent = type === 'error' ? '⚠️' : '✨';
    }

    modal.style.display = 'flex';
}

window.closeAvatarNoticeModal = function() {
    const modal = document.getElementById('shop-avatar-notice-modal');
    if (modal) modal.style.display = 'none';
};

// Exportar objeto global para callbacks
window.renderShopAvatarsGrid = renderShopAvatarsGrid;
window.ShopAvatars = {
    buyUsd: buyUsdAvatar,
    confirmBuyStarships: confirmBuyStarships,
    equip: equipAvatar,
    reload: renderShopAvatarsGrid
};

document.addEventListener('DOMContentLoaded', async () => {
    updateBalanceDisplay();
    if (window.AvatarsManager) {
        await window.AvatarsManager.syncFromServer();
    }
    renderShopAvatarsGrid();
});
