/**
 * ANI-DIMENSION: LÓGICA DE LA VISTA DEDICADA DE DETALLE DE SOBRE
 */
let currentPack = null;
let currentRarityFilter = 'ALL';

document.addEventListener('DOMContentLoaded', () => {
    initPackDetailView();
});

async function initPackDetailView() {
    const urlParams = new URLSearchParams(window.location.search);
    const packId = urlParams.get('pack_id') || 'LOB';

    if (window.PacksManager && typeof window.PacksManager.syncFromServer === 'function') {
        await window.PacksManager.syncFromServer();
    }

    const packs = window.PacksManager.getPacks();
    currentPack = packs.find(p => p.id === packId) || packs[0];

    if (!currentPack) return;

    updateUserBalanceDisplay();
    renderShowcasePanel();
    updateRarityCounts();
    renderCardsGrid();
}

function updateUserBalanceDisplay() {
    const balanceElem = document.getElementById('shop-user-coins');
    const userCoins = (window.Session && typeof window.Session.getStarships === 'function')
        ? window.Session.getStarships()
        : 0;
    if (balanceElem) {
        balanceElem.textContent = `⭐ ${parseInt(userCoins, 10).toLocaleString()}`;
    }
}

function renderShowcasePanel() {
    const panel = document.getElementById('pack-showcase-panel');
    if (!panel || !currentPack) return;

    document.getElementById('pack-detail-title').textContent = `CATÁLOGO DEL SOBRE: ${currentPack.name}`;

    const inventory = window.PacksManager.getUserInventory();
    const packCards = currentPack.cards || [];
    
    // Contar cuántas cartas distintas del sobre posee el jugador
    let ownedUnique = 0;
    packCards.forEach(c => {
        if (inventory.some(invCard => String(invCard.card_id) === String(c.card_id))) {
            ownedUnique++;
        }
    });

    const percent = packCards.length > 0 ? Math.round((ownedUnique / packCards.length) * 100) : 0;

    panel.innerHTML = `
        <div style="flex:1; display:flex; flex-direction:column; gap:4px; min-width:0;">
            <div style="display:flex; align-items:center; gap:10px;">
                <span class="showcase-title-responsive" style="font-family:'Orbitron', sans-serif; font-size:15px; font-weight:900; color:#fff; text-shadow:0 0 10px #00f0ff;">${currentPack.name}</span>
            </div>

            <div class="showcase-desc-responsive" style="font-size:11px; color:#cbd5e1; line-height:1.3;">${currentPack.description}</div>

            <div style="display:flex; gap:16px; align-items:center; margin-top:2px; flex-wrap:wrap;">
                <div class="showcase-stat-responsive" style="font-size:10.5px; color:#94a3b8; font-family:'Orbitron', sans-serif;">
                    TOTAL CARTAS: <b style="color:#00f0ff; font-size:11.5px;">${packCards.length}</b>
                </div>
                <div class="showcase-stat-responsive" style="font-size:10.5px; color:#94a3b8; font-family:'Orbitron', sans-serif;">
                    COLECCIÓN: <b style="color:#10b981; font-size:11.5px;">${ownedUnique} / ${packCards.length} (${percent}%)</b>
                </div>
            </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end; flex-shrink:0;">
            <div style="display:flex; gap:8px; align-items:center;">
                <button onclick="buyAndOpenPackDetail(false)" class="btn-buy-responsive" style="padding:6px 12px; font-family:'Orbitron', sans-serif; font-size:9.5px; font-weight:500; color:#00f0ff; background:rgba(0, 240, 255, 0.12); border:1.2px solid rgba(0, 240, 255, 0.45); border-radius:0; cursor:pointer; box-shadow:0 0 10px rgba(0, 240, 255, 0.25); transition:all 0.2s ease; letter-spacing:0.5px; white-space:nowrap; text-transform:uppercase;">
                    1 Sobre (3 Cartas) ⭐ 500
                </button>
                <button onclick="buyAndOpenPackDetail(true)" class="btn-buy-responsive" style="padding:6px 12px; font-family:'Orbitron', sans-serif; font-size:9.5px; font-weight:500; color:#ffd700; background:linear-gradient(135deg, rgba(234, 179, 8, 0.25), rgba(217, 119, 6, 0.55)); border:1.2px solid #ffd700; border-radius:0; cursor:pointer; box-shadow:0 0 12px rgba(255, 215, 0, 0.35); transition:all 0.2s ease; letter-spacing:0.5px; white-space:nowrap; text-transform:uppercase;">
                    Caja x10 (30 Cartas) ⭐ 4,500
                </button>
            </div>
        </div>
    `;
}

function updateRarityCounts() {
    if (!currentPack || !currentPack.cards) return;

    const cards = currentPack.cards;
    document.getElementById('count-all').textContent = cards.length;
    document.getElementById('count-secret').textContent = cards.filter(c => c.rarity === 'SECRET_RARE').length;
    document.getElementById('count-ultra').textContent = cards.filter(c => c.rarity === 'ULTRA_RARE').length;
    document.getElementById('count-super').textContent = cards.filter(c => c.rarity === 'SUPER_RARE').length;
    document.getElementById('count-rare').textContent = cards.filter(c => c.rarity === 'RARE').length;
    document.getElementById('count-common').textContent = cards.filter(c => c.rarity === 'COMMON').length;
}

function filterRarity(rarity) {
    currentRarityFilter = rarity;
    document.querySelectorAll('.rarity-btn').forEach(btn => btn.classList.remove('active'));
    
    const targetBtn = Array.from(document.querySelectorAll('.rarity-btn')).find(b => b.getAttribute('onclick')?.includes(rarity));
    if (targetBtn) targetBtn.classList.add('active');

    renderCardsGrid();
}

function filterCards() {
    renderCardsGrid();
}

function renderCardsGrid() {
    const container = document.getElementById('cards-grid-container');
    if (!container || !currentPack || !currentPack.cards) return;

    const inventory = window.PacksManager.getUserInventory();
    const searchTerm = (document.getElementById('card-search-input')?.value || '').toLowerCase();

    let filtered = currentPack.cards;

    if (currentRarityFilter !== 'ALL') {
        filtered = filtered.filter(c => c.rarity === currentRarityFilter);
    }

    if (searchTerm) {
        filtered = filtered.filter(c => c.name.toLowerCase().includes(searchTerm) || String(c.card_id).includes(searchTerm));
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align:center; padding:40px; color:#94a3b8; font-size:12px;">
                No se encontraron cartas en este filtro.
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(c => {
        // Contar copias en inventario del usuario
        const ownedCount = inventory.filter(invCard => String(invCard.card_id) === String(c.card_id)).length;

        const borderCol = c.rarity === 'SECRET_RARE' ? '#ec4899' : c.rarity === 'ULTRA_RARE' ? '#ffd700' : c.rarity === 'SUPER_RARE' ? '#00f0ff' : c.rarity === 'RARE' ? '#38bdf8' : 'rgba(255,255,255,0.15)';
        const rarityCol = c.rarity === 'SECRET_RARE' ? '#ec4899' : c.rarity === 'ULTRA_RARE' ? '#ffd700' : c.rarity === 'SUPER_RARE' ? '#00f0ff' : c.rarity === 'RARE' ? '#38bdf8' : '#94a3b8';

        return `
            <div class="catalog-card-item" onclick="openPackCardInspect(${c.card_id})" style="border-color:${borderCol}; min-height: 185px; justify-content: space-between; cursor:pointer;" title="Clic para inspeccionar carta">
                <span class="${ownedCount > 0 ? 'owned-counter-tag' : 'unowned-counter-tag'}">x${ownedCount}</span>
                
                <img src="https://images.ygoprodeck.com/images/cards_small/${c.card_id}.jpg" onerror="this.onerror=null; this.src='/assets/card_back.jpg';" style="width:100%; height:125px; object-fit:contain; border-radius:4px; filter:${ownedCount === 0 ? 'brightness(0.65) grayscale(0.4)' : 'none'};" loading="lazy">
                
                <div style="font-size:9.5px; font-weight:800; color:#fff; text-align:center; line-height:1.2; width:100%; word-break:break-word; margin:2px 0 0 0; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;" title="${c.name}">${c.name}</div>
                
                <div style="font-family:'Orbitron', sans-serif; font-size:8px; font-weight:900; color:${rarityCol}; margin-top:auto; padding-top:2px;">${c.rarity}</div>
            </div>
        `;
    }).join('');
}

// COMPRAR Y ABRIR DESDE LA VISTA DEDICADA DE DETALLE DE SOBRE
async function buyAndOpenPackDetail(isBox = false) {
    if (!currentPack) return;

    const uid = window.Session ? window.Session.getUserId() : 0;
    if (!uid) {
        if (window.showAniModal) {
            window.showAniModal('SESIÓN REQUERIDA', 'Debes iniciar sesión para comprar sobres.', 'warning');
        }
        setTimeout(() => { window.location.href = '/views/login/login.html'; }, 1200);
        return;
    }

    const basePrice = parseInt(currentPack && currentPack.price ? currentPack.price : 500, 10);
    const cost = isBox ? Math.round(basePrice * 9) : basePrice;
    const currentStars = window.Session.getStarships();
    if (currentStars < cost) {
        if (window.showAniModal) {
            window.showAniModal('SALDO INSUFICIENTE', `Requieres ⭐ ${cost.toLocaleString()} StarShips y tienes ⭐ ${currentStars.toLocaleString()}.`, 'warning');
        } else {
            window.aniAlert(`Requieres ⭐ ${cost.toLocaleString()} StarShips y tienes ⭐ ${currentStars.toLocaleString()}.`, 'SALDO INSUFICIENTE', 'warning');
        }
        return;
    }

    try {
        const res = await fetch('/api/game/shop/open-pack', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': String(uid),
                'x-session-token': window.Session.getSessionToken()
            },
            body: JSON.stringify({ userId: uid, packId: currentPack.id, isBox })
        });

        const data = await res.json();
        if (data.success) {
            // Sincronizar nuevo balance desde DB
            if (window.Session && data.newStarshipsBalance !== undefined) {
                const u = window.Session.getUser();
                if (u) {
                    u.starships = data.newStarshipsBalance;
                    window.Session.saveUser(u);
                    window.Session.applyImmediateUI();
                }
            }

            // Sincronizar inventario desde DB
            if (window.DeckManager) {
                await window.DeckManager.syncFromServer();
            }

            updateUserBalanceDisplay();
            showPackOpeningModalDetail(currentPack.name, data.openedCards, isBox);
        } else {
            if (window.showAniModal) {
                window.showAniModal('ERROR AL ABRIR', data.message || 'No se pudo abrir el sobre.', 'error');
            } else {
                window.aniAlert(data.message || 'No se pudo abrir el sobre.', 'ERROR AL ABRIR', 'error');
            }
        }
    } catch (err) {
        console.error('[OPEN PACK ERROR]', err);
        if (window.showAniModal) {
            window.showAniModal('ERROR DE CONEXIÓN', 'Error de conexión con el servidor al abrir el sobre.', 'error');
        } else {
            window.aniAlert('Error de conexión con el servidor al abrir el sobre.', 'ERROR DE CONEXIÓN', 'error');
        }
    }
}

function showPackOpeningModalDetail(packName, cards, isBox = false) {
    let modal = document.getElementById('pack-opening-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'pack-opening-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(2, 4, 8, 0.95); backdrop-filter: blur(12px);
            z-index: 10000; display: flex; flex-direction: column;
            align-items: center; justify-content: center; gap: 14px; padding: 20px;
            box-sizing: border-box;
        `;
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div style="font-family:'Orbitron', sans-serif; font-size:17px; font-weight:900; color:#ffd700; text-shadow:0 0 15px #ffd700; text-transform:uppercase; text-align:center;">
            🎉 ¡${isBox ? 'CAJA X10 ABIERTA (30 CARTAS)' : 'SOBRE ABIERTO (3 CARTAS)'}!
        </div>
        <div style="font-size:11.5px; color:#00f0ff; font-family:'Orbitron', sans-serif;">${packName} - ${cards.length} Cartas añadidas automáticamente a tu colección</div>

        <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap; max-width:90vw; max-height:60vh; overflow-y:auto; margin:10px 0; padding:10px;">
            ${cards.map(c => `
                <div style="width:105px; background:radial-gradient(circle at 50% 50%, rgba(9, 13, 22, 0.98), rgba(2, 4, 8, 0.99)); border:1.5px solid ${c.rarity === 'SECRET_RARE' ? '#ec4899' : c.rarity === 'ULTRA_RARE' ? '#ffd700' : c.rarity === 'SUPER_RARE' ? '#00f0ff' : 'rgba(255,255,255,0.3)'}; border-radius:0; padding:4px; display:flex; flex-direction:column; gap:3px; align-items:center; box-shadow:0 0 10px ${c.rarity === 'ULTRA_RARE' || c.rarity === 'SECRET_RARE' ? 'rgba(255,215,0,0.5)' : 'rgba(0,0,0,0.5)'};">
                    <img src="https://images.ygoprodeck.com/images/cards_small/${c.card_id}.jpg" onerror="this.onerror=null; this.src='/assets/card_back.jpg';" style="width:100%; height:120px; object-fit:contain;" loading="lazy">
                    <div style="font-size:8.5px; font-weight:700; color:#fff; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%;">${c.name}</div>
                    <div style="font-family:'Orbitron', sans-serif; font-size:7.5px; font-weight:800; color:${c.rarity === 'SECRET_RARE' ? '#ec4899' : c.rarity === 'ULTRA_RARE' ? '#ffd700' : c.rarity === 'SUPER_RARE' ? '#00f0ff' : '#94a3b8'};">${c.rarity}</div>
                </div>
            `).join('')}
        </div>

        <button onclick="closePackOpeningModalDetail()" style="padding:8px 24px; font-family:'Orbitron', sans-serif; font-size:11px; font-weight:500; background:rgba(0, 240, 255, 0.15); color:#00f0ff; border:1.2px solid rgba(0, 240, 255, 0.5); border-radius:0; cursor:pointer; box-shadow:0 0 12px rgba(0,240,255,0.3); text-transform:uppercase; letter-spacing:1px;">
            ACEPTAR
        </button>
    `;

    modal.style.display = 'flex';
}

function closePackOpeningModalDetail() {
    const modal = document.getElementById('pack-opening-modal');
    if (modal) modal.style.display = 'none';
    renderShowcasePanel();
    renderCardsGrid();
}

// INSPECCIÓN DETALLADA DE CARTA DEL SOBRE
window.openPackCardInspect = function(cardId) {
    if (!currentPack || !currentPack.cards) return;
    const card = currentPack.cards.find(c => String(c.card_id) === String(cardId));
    if (!card) return;

    const modal = document.getElementById('card-inspect-modal');
    if (!modal) return;

    const elImg = document.getElementById('modal-card-img');
    const elName = document.getElementById('modal-card-name');
    const elRarity = document.getElementById('modal-card-rarity');
    const elSet = document.getElementById('modal-card-set');
    const elPasscode = document.getElementById('modal-card-passcode');
    const elStatsGrid = document.getElementById('modal-card-stats-grid');
    const elDesc = document.getElementById('modal-card-desc');

    if (elImg) {
        elImg.src = `https://images.ygoprodeck.com/images/cards/${card.card_id}.jpg`;
        elImg.onerror = () => { elImg.src = `https://images.ygoprodeck.com/images/cards_small/${card.card_id}.jpg`; };
    }

    const nameEs = card.name_es || card.name;
    if (elName) {
        if (nameEs && nameEs !== card.name) {
            elName.innerHTML = `${card.name} <span style="font-size:12px; color:#00f0ff; font-weight:700; margin-left:6px;">(${nameEs})</span>`;
        } else {
            elName.textContent = card.name;
        }
    }

    if (elRarity) {
        elRarity.textContent = card.rarity;
        elRarity.style.color = card.rarity === 'SECRET_RARE' ? '#ec4899' : card.rarity === 'ULTRA_RARE' ? '#ffd700' : card.rarity === 'SUPER_RARE' ? '#00f0ff' : '#94a3b8';
        elRarity.style.borderColor = elRarity.style.color;
    }

    if (elSet) elSet.textContent = currentPack.name || 'EXPANSIÓN';
    if (elPasscode) elPasscode.textContent = `PASSCODE: ${card.card_id}`;

    if (elStatsGrid) {
        elStatsGrid.innerHTML = '';
        if (card.card_type) {
            elStatsGrid.innerHTML += `<div style="font-size:10px; background:rgba(255,255,255,0.06); padding:2px 8px; border-radius:4px; color:#00f0ff; font-weight:700;">${card.card_type}</div>`;
        }
        if (card.attribute) {
            elStatsGrid.innerHTML += `<div style="font-size:10px; background:rgba(255,255,255,0.06); padding:2px 8px; border-radius:4px; color:#ffd700;">${card.attribute}</div>`;
        }
        if (card.level !== undefined && card.level !== null && card.level > 0) {
            elStatsGrid.innerHTML += `<div style="font-size:10px; background:rgba(255,255,255,0.06); padding:2px 8px; border-radius:4px; color:#f59e0b;">★ ${card.level}</div>`;
        }
        if (card.atk !== undefined && card.atk !== null && card.atk >= 0) {
            elStatsGrid.innerHTML += `<div style="font-size:10px; background:rgba(255,255,255,0.06); padding:2px 8px; border-radius:4px; color:#ef4444;">ATK / ${card.atk}</div>`;
        }
        if (card.def !== undefined && card.def !== null && card.def >= 0) {
            elStatsGrid.innerHTML += `<div style="font-size:10px; background:rgba(255,255,255,0.06); padding:2px 8px; border-radius:4px; color:#3b82f6;">DEF / ${card.def}</div>`;
        }
    }

    if (elDesc) {
        const descEn = card.desc || card.description || 'Sin descripción disponible.';
        const descEs = card.desc_es || card.description_es || '';
        if (descEs && descEs !== descEn) {
            elDesc.innerHTML = `
                <div style="font-family:'Outfit', sans-serif; font-size:9.5px; font-weight:400; line-height:1.4; color:#cbd5e1; margin-bottom:6px;">${descEn}</div>
                <div style="padding-top:6px; border-top:1px dashed rgba(255,255,255,0.1);">
                    <div style="font-family:'Outfit', sans-serif; font-size:9.5px; font-weight:400; line-height:1.4; color:#94a3b8;">${descEs}</div>
                </div>
            `;
        } else {
            elDesc.innerHTML = `<div style="font-family:'Outfit', sans-serif; font-size:9.5px; font-weight:400; line-height:1.4; color:#cbd5e1;">${descEn}</div>`;
        }
    }

    modal.style.display = 'flex';
};

window.closeCardInspectModal = function() {
    const modal = document.getElementById('card-inspect-modal');
    if (modal) modal.style.display = 'none';
};

