/**
 * Ani-Dimension: Controlador de la Tienda de Potenciadores de Avatar
 * Renderizado dinámico de cards calibradas al estilo cyber sharp oficial.
 * Manejo de compras en StarShips (almacenado directo en dbo.UserMailbox) y compras en USD.
 */

let currentPotTypeFilter = 'ALL';
let currentPotCurrencyFilter = 'ALL';

document.addEventListener('DOMContentLoaded', () => {
    initShopPotenciadores();
});

function initShopPotenciadores() {
    renderPotenciadoresShopCards();
    updateShopUserCoinsDisplay();
}

function updateShopUserCoinsDisplay() {
    const balanceElem = document.getElementById('shop-user-coins');
    const coins = (window.Session && typeof window.Session.getStarships === 'function')
        ? window.Session.getStarships()
        : 0;

    if (balanceElem) {
        balanceElem.textContent = `★ ${parseInt(coins, 10).toLocaleString()}`;
    }
}

function setPotTypeFilter(type, btnEl) {
    if (window.SoundManager) window.SoundManager.playSFX('button');
    currentPotTypeFilter = type;
    const container = document.getElementById('filter-type-group');
    if (container) {
        container.querySelectorAll('.btn-filter-pill').forEach(b => b.classList.remove('active'));
    }
    if (btnEl) btnEl.classList.add('active');
    renderPotenciadoresShopCards();
}

function setPotCurrencyFilter(currency, btnEl) {
    if (window.SoundManager) window.SoundManager.playSFX('button');
    currentPotCurrencyFilter = currency;
    const container = document.getElementById('filter-currency-group');
    if (container) {
        container.querySelectorAll('.btn-filter-currency-pill').forEach(b => b.classList.remove('active'));
    }
    if (btnEl) btnEl.classList.add('active');
    renderPotenciadoresShopCards();
}

function renderPotenciadoresShopCards() {
    const grid = document.getElementById('shop-potenciadores-grid');
    if (!grid || !window.PotenciadoresManager) return;

    let allPots = window.PotenciadoresManager.getActivePotenciadores();

    // Aplicar Filtro de Tipo
    if (currentPotTypeFilter !== 'ALL') {
        allPots = allPots.filter(p => (p.type || '').toUpperCase() === currentPotTypeFilter);
    }

    // Aplicar Filtro de Moneda
    if (currentPotCurrencyFilter !== 'ALL') {
        allPots = allPots.filter(p => (p.currency || 'STARSHIPS').toUpperCase() === currentPotCurrencyFilter);
    }

    if (allPots.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align:center; padding:40px; color:#94a3b8;">
                <div style="font-size:32px; margin-bottom:8px;">🔍</div>
                <div style="font-family:'Orbitron', sans-serif; font-size:13px; font-weight:800; color:#fff;">NO HAY POTENCIADORES CON ESTE FILTRO</div>
                <div style="font-size:10px; margin-top:4px; color:#64748b;">Prueba seleccionando otro tipo de potenciador o moneda.</div>
            </div>
        `;
        return;
    }

    grid.innerHTML = allPots.map(pot => {
        const offerText = pot.offer_text || '';
        const isUsd = (pot.currency === 'USD');

        // Configuración visual por tipo
        let typeIcon = '⚡';
        let typeColor = '#c084fc';
        let typeBorder = '#a855f7';
        let typeBg = 'rgba(168, 85, 247, 0.15)';
        let typeLabel = `+${parseFloat(pot.boost_value || 0).toFixed(1)}% EXP`;

        if (pot.type === 'STARSHIPS') {
            typeIcon = '⭐';
            typeColor = '#00f0ff';
            typeBorder = '#00f0ff';
            typeBg = 'rgba(0, 240, 255, 0.15)';
            typeLabel = `+${parseFloat(pot.boost_value || 0).toFixed(1)}% STARSHIPS`;
        } else if (pot.type === 'SUERTE') {
            typeIcon = '🍀';
            typeColor = '#34d399';
            typeBorder = '#10b981';
            typeBg = 'rgba(16, 185, 129, 0.15)';
            typeLabel = `+${parseFloat(pot.boost_value || 0).toFixed(1)}% SUERTE`;
        }

        const priceDisplay = isUsd 
            ? `<span style="color:#22c55e; font-weight:900; font-family:'Orbitron', sans-serif; font-size:10px; letter-spacing:0.3px;">$ ${parseFloat(pot.price || 0).toFixed(2)} USD</span>`
            : `<span style="color:#ffd700; font-weight:900; font-family:'Orbitron', sans-serif; font-size:10.5px; letter-spacing:0.3px;">★ ${parseInt(pot.price || 0, 10).toLocaleString()}</span>`;

        return `
            <div class="shop-card" style="position:relative; overflow:hidden; display:flex; flex-direction:column; justify-content:space-between; border-radius:0 !important; background:linear-gradient(180deg, #091122 0%, #040812 100%) !important; border:1.2px solid rgba(0,240,255,0.3) !important;">
                
                <!-- CINTA DIAGONAL DE OFERTA EN AMARILLO NEÓN -->
                ${offerText ? `
                <div style="position:absolute; top:20px; left:-50px; width:170px; transform:rotate(-35deg); background:linear-gradient(135deg, #ffd700 0%, #f59e0b 100%); color:#000; font-family:'Orbitron', sans-serif; font-size:9px; font-weight:900; padding:4px 0; text-transform:uppercase; letter-spacing:0.5px; box-shadow:0 3px 12px rgba(0,0,0,0.6), 0 0 12px rgba(255, 215, 0, 0.6); z-index:10; pointer-events:none; border-top:1px solid #ffffff; border-bottom:1.2px solid rgba(0,0,0,0.6); text-align:center; white-space:nowrap;">
                    ${offerText}
                </div>
                ` : ''}

                <div>
                    <!-- CABECERA DE LA CARD (CÓDIGO Y ESTADO ALINEADOS A LA DERECHA) -->
                    <div class="shop-card-header" style="display:flex; justify-content:flex-end; align-items:center; width:100%; gap:5px; margin-bottom:4px;">
                        <span style="font-family:'Orbitron', sans-serif; font-size:8px; font-weight:800; color:#38bdf8; background:rgba(0,0,0,0.65); padding:1.5px 6px; border:1px solid rgba(0,240,255,0.35); border-radius:0;">
                            ${pot.code}
                        </span>
                        <span class="shop-card-badge active" style="font-size:7.5px !important; padding:1.5px 5px !important; border-radius:0 !important;">
                            DISPONIBLE
                        </span>
                    </div>

                    <!-- ARTWORK CON ICONO CÓSMICO -->
                    <div class="shop-card-artwork" style="background:radial-gradient(circle, ${typeBg} 0%, #030712 85%); display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:85px; position:relative; border:1px solid rgba(255,255,255,0.05); margin-bottom:6px;">
                        <div style="font-size:36px; filter:drop-shadow(0 0 12px ${typeBorder}); transform:scale(1.05); transition:transform 0.2s;">
                            ${typeIcon}
                        </div>
                        <div style="margin-top:6px; font-family:'Orbitron', sans-serif; font-size:8.5px; font-weight:900; color:${typeColor}; background:rgba(0,0,0,0.75); border:1px solid ${typeBorder}; padding:2px 8px; box-shadow:0 0 8px ${typeBorder}; border-radius:0;">
                            ${typeLabel}
                        </div>
                        <div class="shop-card-glow-overlay"></div>
                    </div>

                    <div class="shop-card-title" style="margin-top:4px; font-size:11.5px; font-family:'Orbitron', sans-serif; font-weight:800; color:#fff; text-transform:uppercase; line-height:1.2;">${pot.name}</div>
                    <div class="shop-card-desc" style="font-size:9px; color:#94a3b8; line-height:1.3; min-height:36px; margin-top:3px;">
                        ${pot.description || ''}
                    </div>
                </div>

                <!-- PRECIO Y BOTÓN DE COMPRA COMPACTO CON BORDES RECTOS -->
                <div style="display:flex; align-items:center; justify-content:space-between; width:100%; margin-top:8px; padding-top:6px; border-top:1px dashed rgba(255,255,255,0.15); box-sizing:border-box;">
                    <div style="flex-shrink:0;">
                        ${priceDisplay}
                    </div>
                    
                    ${isUsd ? `
                    <button type="button" onclick="buyUsdPotenciador('${pot.code}')" style="margin:0 !important; height:24px !important; min-width:80px !important; max-width:96px !important; padding:2px 8px !important; font-family:'Orbitron', sans-serif; font-size:8px !important; font-weight:500; background:linear-gradient(135deg, #16a34a, #15803d); border:1px solid #22c55e; color:#fff; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:4px; box-shadow:0 0 10px rgba(34,197,94,0.3); border-radius:0;">
                        <span>ADQUIRIR →</span>
                    </button>
                    ` : `
                    <button type="button" onclick="openShopConfirmModal('${pot.code}')" style="margin:0 !important; height:24px !important; min-width:76px !important; max-width:90px !important; padding:2px 8px !important; font-family:'Orbitron', sans-serif; font-size:8px !important; font-weight:500; background:linear-gradient(135deg, rgba(0,240,255,0.25), rgba(0,180,216,0.5)); border:1px solid #00f0ff; color:#00f0ff; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:4px; box-shadow:0 0 10px rgba(0,240,255,0.25); border-radius:0;">
                        <span>COMPRAR →</span>
                    </button>
                    `}
                </div>

            </div>
        `;
    }).join('');
}

let pendingShopPurchaseCode = null;

/**
 * Abre el Modal Elegante Cyber Sharp de Confirmación
 */
function openShopConfirmModal(code) {
    if (window.SoundManager) window.SoundManager.playSFX('button');
    if (!window.PotenciadoresManager) return;
    const pot = window.PotenciadoresManager.getPotenciadorByCode(code);
    if (!pot) return;

    pendingShopPurchaseCode = code;

    const modal = document.getElementById('shop-pot-confirm-modal');
    const detailsEl = document.getElementById('modal-buy-details');
    const iconEl = document.getElementById('modal-buy-icon');
    const btnConfirm = document.getElementById('btn-modal-confirm-buy');

    let typeIcon = pot.type === 'STARSHIPS' ? '⭐' : (pot.type === 'SUERTE' ? '🍀' : '⚡');
    let typeColor = pot.type === 'STARSHIPS' ? '#ffd700' : (pot.type === 'SUERTE' ? '#10b981' : '#00f0ff');
    const price = parseInt(pot.price || 0, 10);

    if (iconEl) iconEl.textContent = typeIcon;
    if (detailsEl) {
        detailsEl.innerHTML = `
            <div style="font-family:'Orbitron', sans-serif; font-size:12px; font-weight:900; color:#fff; margin-bottom:4px;">
                ${pot.name} <span style="color:var(--accent-cyan); font-size:9.5px;">(${pot.code})</span>
            </div>
            <div style="color:${typeColor}; font-weight:800; font-size:11px; margin-bottom:8px;">
                +${parseFloat(pot.boost_value || 0).toFixed(1)}% ${pot.type}
            </div>
            <div style="border-top:1px dashed rgba(255,255,255,0.15); padding-top:8px; font-family:'Orbitron', sans-serif; font-size:13px; font-weight:900; color:#ffd700;">
                ★ ${price.toLocaleString()} StarShips
            </div>
        `;
    }

    if (btnConfirm) {
        btnConfirm.onclick = () => executeConfirmPurchase();
    }

    if (modal) modal.style.display = 'flex';
}

function closeShopConfirmModal() {
    if (window.SoundManager) window.SoundManager.playSFX('button');
    const modal = document.getElementById('shop-pot-confirm-modal');
    if (modal) modal.style.display = 'none';
    pendingShopPurchaseCode = null;
}

async function executeConfirmPurchase() {
    if (window.SoundManager) window.SoundManager.playSFX('button');
    if (!pendingShopPurchaseCode || !window.PotenciadoresManager) return;

    const pot = window.PotenciadoresManager.getPotenciadorByCode(pendingShopPurchaseCode);
    if (!pot) {
        closeShopConfirmModal();
        return;
    }

    const price = parseInt(pot.price || 0, 10);
    const user = window.Session ? window.Session.getUser() : null;
    const uid = user ? (user.id || user.user_id || user.Id) : 0;
    
    if (!uid) {
        closeShopConfirmModal();
        openShopNoticeModal('ACCESO REQUERIDO', 'Debes iniciar sesión para comprar potenciadores.', false);
        return;
    }

    const currentCoins = (window.Session && typeof window.Session.getStarships === 'function')
        ? window.Session.getStarships()
        : (user.starships || 0);

    if (currentCoins < price) {
        closeShopConfirmModal();
        openShopNoticeModal('SALDO INSUFICIENTE', `No posees suficientes StarShips para adquirir este potenciador.<br>Requiere: <b>★ ${price.toLocaleString()}</b><br>Tu saldo actual: <b>★ ${parseInt(currentCoins, 10).toLocaleString()}</b>`, false);
        return;
    }

    try {
        const res = await fetch('/api/game/potenciador/buy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': String(uid),
                'x-session-token': window.Session.getSessionToken()
            },
            body: JSON.stringify({
                userId: uid,
                itemCode: pot.code,
                itemName: pot.name,
                itemType: pot.type,
                boostValue: pot.boost_value,
                costStarships: price
            })
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

            closeShopConfirmModal();
            updateShopUserCoinsDisplay();
            if (window.SoundManager) window.SoundManager.playSFX('success');

            openShopNoticeModal(
                '¡COMPRA REALIZADA CON ÉXITO!',
                `Has adquirido <b>${pot.name}</b> (+${parseFloat(pot.boost_value).toFixed(1)}% ${pot.type}).<br><br>📬 El potenciador ha sido guardado oficialmente en tu <b>Buzón de Recompensas</b> en la base de datos para que puedas reclamarlo y consumirlo cuando gustes.`,
                true
            );
        } else {
            closeShopConfirmModal();
            openShopNoticeModal('AVISO DE COMPRA', data.message || 'No se pudo procesar la transacción.', false);
        }
    } catch (err) {
        closeShopConfirmModal();
        openShopNoticeModal('ERROR DE CONEXIÓN', 'Ocurrió un problema de comunicación al registrar la compra.', false);
    }
}

function openShopNoticeModal(title, msg, isSuccess = true) {
    const modal = document.getElementById('shop-pot-notice-modal');
    const titleEl = document.getElementById('modal-notice-title');
    const msgEl = document.getElementById('modal-notice-msg');
    const iconEl = document.getElementById('modal-notice-icon');

    if (titleEl) {
        titleEl.textContent = title;
        titleEl.style.color = isSuccess ? '#00f0ff' : '#ef4444';
    }
    if (msgEl) msgEl.innerHTML = msg;
    if (iconEl) iconEl.textContent = isSuccess ? '🎁' : '⚠️';

    if (modal) modal.style.display = 'flex';
}

function closeShopNoticeModal() {
    if (window.SoundManager) window.SoundManager.playSFX('button');
    const modal = document.getElementById('shop-pot-notice-modal');
    if (modal) modal.style.display = 'none';
}

/**
 * Redirecciona a la vista de instrucciones de pago en USD
 */
function buyUsdPotenciador(code) {
    if (window.SoundManager) window.SoundManager.playSFX('button');
    window.location.href = `shop-pago-instrucciones.html?codigo=${encodeURIComponent(code)}`;
}

window.openShopConfirmModal = openShopConfirmModal;
window.closeShopConfirmModal = closeShopConfirmModal;
window.executeConfirmPurchase = executeConfirmPurchase;
window.openShopNoticeModal = openShopNoticeModal;
window.closeShopNoticeModal = closeShopNoticeModal;
window.buyUsdPotenciador = buyUsdPotenciador;
window.setPotTypeFilter = setPotTypeFilter;
window.setPotCurrencyFilter = setPotCurrencyFilter;


