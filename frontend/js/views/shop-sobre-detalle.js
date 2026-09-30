/**
 * ANI-DIMENSION: LÓGICA DE LA VISTA DEDICADA DE DETALLE DE SOBRE
 */
let currentPack = null;
let currentRarityFilter = 'ALL';

document.addEventListener('DOMContentLoaded', () => {
    initPackDetailView();
});

function initPackDetailView() {
    const urlParams = new URLSearchParams(window.location.search);
    const packId = urlParams.get('pack_id') || 'LOB';

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
    const userCoins = localStorage.getItem('ad_user_coins') || 5000;
    if (balanceElem) {
        balanceElem.textContent = `⭐ ${parseInt(userCoins).toLocaleString()}`;
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
            <div class="showcase-price-responsive" style="font-family:'Orbitron', sans-serif; font-size:14px; font-weight:900; color:#ffd700; text-shadow:0 0 10px rgba(255,215,0,0.6);">
                ⭐ ${currentPack.price} StarShips
            </div>
            <button onclick="buyAndOpenPackDetail()" class="btn-buy-responsive" style="padding:9px 18px; font-family:'Orbitron', sans-serif; font-size:11.5px; font-weight:900; color:#000000; background:linear-gradient(90deg, #00f0ff, #38bdf8); border:none; border-radius:8px; cursor:pointer; box-shadow:0 0 16px rgba(0,240,255,0.7); transition:all 0.2s ease; letter-spacing:0.5px; white-space:nowrap;">
                Comprar y Abrir
            </button>
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
            <div class="catalog-card-item" style="border-color:${borderCol}; min-height: 185px; justify-content: space-between;">
                <span class="${ownedCount > 0 ? 'owned-counter-tag' : 'unowned-counter-tag'}">x${ownedCount}</span>
                
                <img src="../../assets/images/cards/${c.card_id}.jpg" onerror="this.onerror=null; this.src='https://images.ygoprodeck.com/images/cards/${c.card_id}.jpg';" style="width:100%; height:125px; object-fit:contain; border-radius:4px; filter:${ownedCount === 0 ? 'brightness(0.65) grayscale(0.4)' : 'none'};">
                
                <div style="font-size:9.5px; font-weight:800; color:#fff; text-align:center; line-height:1.2; width:100%; word-break:break-word; margin:2px 0 0 0; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;" title="${c.name}">${c.name}</div>
                
                <div style="font-family:'Orbitron', sans-serif; font-size:8px; font-weight:900; color:${rarityCol}; margin-top:auto; padding-top:2px;">${c.rarity}</div>
            </div>
        `;
    }).join('');
}

// COMPRAR Y ABRIR DESDE LA VISTA DEDICADA DE DETALLE DE SOBRE
function buyAndOpenPackDetail() {
    if (!currentPack) return;

    let userCoins = parseInt(localStorage.getItem('ad_user_coins') || 5000);
    if (userCoins < currentPack.price) {
        alert(`❌ Monedas insuficientes. Necesitas ⭐ ${currentPack.price} StarShips. ¡Gana más duelos contra NPCs para farmear monedas!`);
        return;
    }

    userCoins -= currentPack.price;
    localStorage.setItem('ad_user_coins', userCoins);
    updateUserBalanceDisplay();

    // Tirada de 4 cartas y GUARDADO AUTOMÁTICO
    const openedCards = window.PacksManager.openPack(currentPack.id);
    if (!openedCards) return;

    showPackOpeningModalDetail(currentPack.name, openedCards);
}

function showPackOpeningModalDetail(packName, cards) {
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
            🎉 ¡SOBRE ABIERTO Y GUARDADO EN TU INVENTARIO!
        </div>
        <div style="font-size:11.5px; color:#00f0ff; font-family:'Orbitron', sans-serif;">${packName} - 4 Cartas añadidas automáticamente</div>

        <div style="display:flex; gap:14px; justify-content:center; flex-wrap:wrap; max-width:90vw; margin:14px 0;">
            ${cards.map(c => `
                <div style="width:115px; background:radial-gradient(circle at 50% 50%, rgba(9, 13, 22, 0.98), rgba(2, 4, 8, 0.99)); border:1.5px solid ${c.rarity === 'SECRET_RARE' ? '#ec4899' : c.rarity === 'ULTRA_RARE' ? '#ffd700' : c.rarity === 'SUPER_RARE' ? '#00f0ff' : 'rgba(255,255,255,0.3)'}; border-radius:6px; padding:6px; display:flex; flex-direction:column; gap:4px; align-items:center; box-shadow:0 0 15px ${c.rarity === 'ULTRA_RARE' || c.rarity === 'SECRET_RARE' ? 'rgba(255,215,0,0.5)' : 'rgba(0,0,0,0.5)'}; transform:scale(1.05);">
                    <img src="../../assets/images/cards/${c.card_id}.jpg" onerror="this.onerror=null; this.src='https://images.ygoprodeck.com/images/cards/${c.card_id}.jpg';" style="width:100%; height:135px; object-fit:contain; border-radius:4px;">
                    <div style="font-size:9.5px; font-weight:800; color:#fff; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%;">${c.name}</div>
                    <div style="font-family:'Orbitron', sans-serif; font-size:8px; font-weight:900; color:${c.rarity === 'SECRET_RARE' ? '#ec4899' : c.rarity === 'ULTRA_RARE' ? '#ffd700' : c.rarity === 'SUPER_RARE' ? '#00f0ff' : '#94a3b8'};">${c.rarity}</div>
                </div>
            `).join('')}
        </div>

        <button onclick="closePackOpeningModalDetail()" style="padding:10px 30px; font-family:'Orbitron', sans-serif; font-size:12px; font-weight:900; background:#10b981; color:#fff; border:none; border-radius:6px; cursor:pointer; box-shadow:0 0 12px #10b981;">
            Aceptar
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
