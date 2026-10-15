/**
 * ANI-DIMENSION: LÓGICA DE CONSTRUCCIÓN DE DECK (VISTA DEDICADA)
 * GESTIÓN REGLAMENTARIA OFICIAL DE YU-GI-OH! OCG
 */

let currentDeck = { mainDeck: [], extraDeck: [] };
let currentInventoryGrouped = [];
let currentInventoryFilter = 'ALL';
let currentSearchTerm = '';

function setupDeckLoadedListener() {
    window.addEventListener('ad-deck-loaded', (e) => {
        if (window.DeckManager) {
            currentDeck = window.DeckManager.getDeck();
            currentInventoryGrouped = window.DeckManager.getUserInventoryGrouped();
            renderDeckGrid();
            renderInventoryCatalog();
            updateDeckStatsAndValidation();
        }
    });
}

setupDeckLoadedListener();

async function initDeckBuilder() {
    if (window.Session && !window.Session.isLoggedIn()) {
        window.location.href = '../login/login.html';
        return;
    }

    if (!window.DeckManager) {
        console.error('[DECK BUILDER] DeckManager no disponible.');
        return;
    }

    try {
        await window.DeckManager.syncFromServer();
        currentDeck = window.DeckManager.getDeck();
        currentInventoryGrouped = window.DeckManager.getUserInventoryGrouped();

        renderDeckGrid();
        renderInventoryCatalog();
        updateDeckStatsAndValidation();
    } catch (err) {
        console.error('[DECK BUILDER INIT ERROR]', err);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDeckBuilder);
} else {
    initDeckBuilder();
}

/**
 * Renderiza el Main Deck y el Extra Deck en el panel izquierdo
 */
function renderDeckGrid() {
    const mainGrid = document.getElementById('main-deck-grid');
    const extraGrid = document.getElementById('extra-deck-grid');

    if (!mainGrid || !extraGrid) return;

    // Agrupar cartas por ID en Main Deck
    const mainMap = new Map();
    (currentDeck.mainDeck || []).forEach(card => {
        const id = String(card.card_id);
        if (!mainMap.has(id)) {
            mainMap.set(id, { ...card, count: 1 });
        } else {
            mainMap.get(id).count++;
        }
    });

    const mainGrouped = Array.from(mainMap.values());

    if (mainGrouped.length === 0) {
        mainGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:#94a3b8; font-size:9px; padding:25px 10px; font-family:'Orbitron', sans-serif;">El Main Deck está vacío. Selecciona cartas de tu inventario para agregar.</div>`;
    } else {
        mainGrid.innerHTML = mainGrouped.map(item => {
            const isUsable = window.DeckManager.isCardDeckUsable(item.card_id);
            const borderCol = !isUsable ? '#ef4444' : (item.rarity === 'SECRET_RARE' ? '#ec4899' : item.rarity === 'ULTRA_RARE' ? '#ffd700' : item.rarity === 'SUPER_RARE' ? '#00f0ff' : item.rarity === 'RARE' ? '#38bdf8' : 'rgba(0,240,255,0.3)');

            return `
                <div class="deck-card-item" onclick="removeCardFromDeck(${item.card_id}, false)" title="${!isUsable ? 'CARTA BLOQUEADA POR ADMIN - Clic para quitar' : `Clic para quitar 1 copia de ${item.name}`}" style="border-color:${borderCol}; opacity:${!isUsable ? '0.75' : '1'}; position:relative;">
                    ${!isUsable ? '<span style="position:absolute; bottom:20px; left:2px; background:#ef4444; color:#fff; font-size:6.5px; font-weight:700; padding:1px 3px; z-index:5;">BLOQUEADA</span>' : ''}
                    <button type="button" class="card-mini-btn info-btn" onclick="event.stopPropagation(); showCardInfoFloating(${item.card_id})" style="top:2px; left:2px;" title="Ver detalles y efecto"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></button>
                    <span class="deck-card-copies-badge">x${item.count}</span>
                    <img src="https://images.ygoprodeck.com/images/cards_small/${item.card_id}.jpg" onerror="this.onerror=null; this.src='/assets/card_back.jpg';" class="deck-card-img" style="filter:${!isUsable ? 'grayscale(0.8) brightness(0.6)' : 'none'};" loading="lazy">
                    <div class="deck-card-name" title="${item.name}">${item.name}</div>
                </div>
            `;
        }).join('');
    }

    // Agrupar cartas por ID en Extra Deck
    const extraMap = new Map();
    (currentDeck.extraDeck || []).forEach(card => {
        const id = String(card.card_id);
        if (!extraMap.has(id)) {
            extraMap.set(id, { ...card, count: 1 });
        } else {
            extraMap.get(id).count++;
        }
    });

    const extraGrouped = Array.from(extraMap.values());

    if (extraGrouped.length === 0) {
        extraGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:#94a3b8; font-size:9px; padding:20px 10px; font-family:'Orbitron', sans-serif;">Extra Deck vacío (Fusión / Sincronía / Xyz / Link).</div>`;
    } else {
        extraGrid.innerHTML = extraGrouped.map(item => {
            const isUsable = window.DeckManager.isCardDeckUsable(item.card_id);
            return `
                <div class="deck-card-item" onclick="removeCardFromDeck(${item.card_id}, true)" title="${!isUsable ? 'CARTA BLOQUEADA POR ADMIN - Clic para quitar' : `Clic para quitar 1 copia de ${item.name}`}" style="border-color:${!isUsable ? '#ef4444' : '#a855f7'}; opacity:${!isUsable ? '0.75' : '1'}; position:relative;">
                    ${!isUsable ? '<span style="position:absolute; bottom:20px; left:2px; background:#ef4444; color:#fff; font-size:6.5px; font-weight:700; padding:1px 3px; z-index:5;">BLOQUEADA</span>' : ''}
                    <button type="button" class="card-mini-btn info-btn" style="top:2px; left:2px; border-color:#a855f7; color:#c084fc; background:rgba(168,85,247,0.2);" onclick="event.stopPropagation(); showCardInfoFloating(${item.card_id})" title="Ver detalles y efecto"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></button>
                    <span class="deck-card-copies-badge" style="background:linear-gradient(135deg, #a855f7, #7e22ce); color:#fff;">x${item.count}</span>
                    <img src="https://images.ygoprodeck.com/images/cards_small/${item.card_id}.jpg" onerror="this.onerror=null; this.src='/assets/card_back.jpg';" class="deck-card-img" style="filter:${!isUsable ? 'grayscale(0.8) brightness(0.6)' : 'none'};" loading="lazy">
                    <div class="deck-card-name" title="${item.name}">${item.name}</div>
                </div>
            `;
        }).join('');
    }
}

/**
 * Renderiza el catálogo de cartas poseídas en el inventario (Panel derecho)
 */
function renderInventoryCatalog() {
    const grid = document.getElementById('inventory-cards-grid');
    const totalCountElem = document.getElementById('inventory-total-count');
    if (!grid) return;

    let list = [...currentInventoryGrouped];

    // Conteo total de copias en el deck combinado
    const currentDeckCopyMap = new Map();
    [...(currentDeck.mainDeck || []), ...(currentDeck.extraDeck || [])].forEach(c => {
        const id = String(c.card_id);
        currentDeckCopyMap.set(id, (currentDeckCopyMap.get(id) || 0) + 1);
    });

    // Filtros por Categoría
    if (currentInventoryFilter === 'MONSTER') {
        list = list.filter(c => ((c.type || '').toLowerCase().includes('monster') || (c.typeCode && (c.typeCode & 0x1) !== 0)) && !window.DeckManager.isExtraDeckCard(c));
    } else if (currentInventoryFilter === 'SPELL') {
        list = list.filter(c => ((c.type || '').toLowerCase().includes('spell') && !(c.type || '').toLowerCase().includes('monster') && !(c.type || '').toLowerCase().includes('spellcaster')) || (c.typeCode && (c.typeCode & 0x2) !== 0));
    } else if (currentInventoryFilter === 'TRAP') {
        list = list.filter(c => ((c.type || '').toLowerCase().includes('trap') && !(c.type || '').toLowerCase().includes('monster')) || (c.typeCode && (c.typeCode & 0x4) !== 0));
    } else if (currentInventoryFilter === 'EXTRA') {
        list = list.filter(c => window.DeckManager.isExtraDeckCard(c));
    }

    // Buscador por nombre o passcode
    if (currentSearchTerm) {
        list = list.filter(c => 
            (c.name || '').toLowerCase().includes(currentSearchTerm) || 
            String(c.card_id).includes(currentSearchTerm)
        );
    }

    if (totalCountElem) {
        totalCountElem.textContent = `${list.length} CARTAS ENCONTRADAS (${currentInventoryGrouped.length} ÚNICAS POSEÍDAS)`;
    }

    if (list.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:#94a3b8; font-size:10px; padding:40px 10px; font-family:'Orbitron', sans-serif;">No se encontraron cartas poseídas en tu inventario con los filtros seleccionados.</div>`;
        return;
    }

    grid.innerHTML = list.map(item => {
        const cardIdStr = String(item.card_id);
        const inDeckCount = currentDeckCopyMap.get(cardIdStr) || 0;
        const owned = item.ownedCount || 1;
        const isExtra = window.DeckManager.isExtraDeckCard(item);
        const isUsable = window.DeckManager.isCardDeckUsable(item.card_id);

        const isMaxDeckCopies = inDeckCount >= 3;
        const isMaxOwned = inDeckCount >= owned;
        const isMaxDeckLimit = isExtra ? (currentDeck.extraDeck.length >= 15) : (currentDeck.mainDeck.length >= 60);

        const canAdd = isUsable && !isMaxDeckCopies && !isMaxOwned && !isMaxDeckLimit;

        let btnLabel = '+ AÑADIR';
        let disabledReason = '';

        if (!isUsable) {
            btnLabel = 'BLOQUEADA';
            disabledReason = 'Carta desactivada por el Administrador';
        } else if (isMaxOwned) {
            btnLabel = 'EN USO';
            disabledReason = `Ya has equipado todas tus ${owned} copias poseídas`;
        } else if (isMaxDeckCopies) {
            btnLabel = 'MÁX 3';
            disabledReason = 'Límite Konami de 3 copias alcanzado';
        } else if (isMaxDeckLimit) {
            btnLabel = isExtra ? 'EXTRA LLENO' : 'MAIN LLENO';
            disabledReason = isExtra ? 'Extra Deck lleno (máx 15)' : 'Main Deck lleno (máx 60)';
        }

        const rarityCol = item.rarity === 'SECRET_RARE' ? '#ec4899' : item.rarity === 'ULTRA_RARE' ? '#ffd700' : item.rarity === 'SUPER_RARE' ? '#00f0ff' : item.rarity === 'RARE' ? '#38bdf8' : '#94a3b8';
        const typeText = item.type || 'Monster';

        return `
            <div class="inv-card-item" style="border-color:${isUsable ? 'rgba(255,255,255,0.15)' : '#ef4444'}; opacity:${isUsable ? '1' : '0.75'}; position:relative;">
                <button type="button" class="card-mini-btn info-btn" onclick="event.stopPropagation(); showDeckCardModal(${item.card_id})" title="Ver detalles y efecto">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                </button>
                ${owned > inDeckCount ? `
                    <button type="button" class="card-mini-btn sell-btn" onclick="event.stopPropagation(); onSellExcessCardClick(${item.card_id})" title="Vender 1 copia al sistema (+100 estrellas)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                    </button>
                ` : ''}
                <div class="inv-card-passcode">#${item.card_id}</div>
                <img src="https://images.ygoprodeck.com/images/cards_small/${item.card_id}.jpg" onerror="this.onerror=null; this.src='/assets/card_back.jpg';" class="inv-card-img" style="filter:${!isUsable ? 'grayscale(0.8)' : 'none'};" loading="lazy">
                
                <div class="inv-card-name" title="${item.name}">${item.name}</div>
                <div class="inv-card-meta" style="color:${rarityCol};">${item.rarity || 'COMMON'}</div>
                
                <div class="inv-card-counts">
                    <span>Poseídas: <b>${owned}</b></span>
                    <span>En Deck: <b style="color:${inDeckCount > 0 ? '#10b981' : '#94a3b8'};">${inDeckCount}</b></span>
                </div>

                <button class="btn-add-to-deck" ${canAdd ? `onclick="addCardToDeck(${item.card_id})"` : 'disabled'} title="${disabledReason}">
                    ${btnLabel}
                </button>
            </div>
        `;
    }).join('');
}

/**
 * Añade 1 copia de una carta al Main Deck o Extra Deck
 */
function addCardToDeck(cardId) {
    const cardObj = currentInventoryGrouped.find(c => String(c.card_id) === String(cardId));
    if (!cardObj) return;

    if (!window.DeckManager.isCardDeckUsable(cardId)) {
        if (window.showAniModal) window.showAniModal('Aviso Admin', `La carta "${cardObj.name}" está deshabilitada por el Administrador.`, 'warning');
        return;
    }

    const isExtra = window.DeckManager.isExtraDeckCard(cardObj);

    if (isExtra) {
        if (currentDeck.extraDeck.length >= 15) {
            if (window.showAniModal) window.showAniModal('Extra Deck Lleno', 'El Extra Deck no puede exceder las 15 cartas.', 'warning');
            return;
        }
        currentDeck.extraDeck.push({ ...cardObj });
    } else {
        if (currentDeck.mainDeck.length >= 60) {
            if (window.showAniModal) window.showAniModal('Main Deck Lleno', 'El Main Deck no puede exceder las 60 cartas.', 'warning');
            return;
        }
        currentDeck.mainDeck.push({ ...cardObj });
    }

    renderDeckGrid();
    renderInventoryCatalog();
    updateDeckStatsAndValidation();
}

/**
 * Remueve 1 copia de una carta del Main Deck o Extra Deck
 */
function removeCardFromDeck(cardId, isExtra) {
    const targetArray = isExtra ? currentDeck.extraDeck : currentDeck.mainDeck;
    const index = targetArray.findIndex(c => String(c.card_id) === String(cardId));

    if (index !== -1) {
        targetArray.splice(index, 1);
        renderDeckGrid();
        renderInventoryCatalog();
        updateDeckStatsAndValidation();
    }
}

/**
 * Actualiza las estadísticas visuales del Deck y el pill de validación en el header
 */
function updateDeckStatsAndValidation() {
    const mainCards = currentDeck.mainDeck || [];
    const extraCards = currentDeck.extraDeck || [];

    let monsters = 0, spells = 0, traps = 0;

    mainCards.forEach(c => {
        const type = (c.type || '').toLowerCase();
        const typeCode = Number(c.typeCode || 0);
        const isMonster = (typeCode > 0 ? (typeCode & 0x1) !== 0 : false) || type.includes('monster') || (c.atk !== undefined && c.atk !== null && c.atk !== '---');
        const isSpell = !isMonster && ((typeCode > 0 ? (typeCode & 0x2) !== 0 : false) || (type.includes('spell') && !type.includes('spellcaster')));
        const isTrap = !isMonster && !isSpell && ((typeCode > 0 ? (typeCode & 0x4) !== 0 : false) || type.includes('trap'));

        if (isSpell) spells++;
        else if (isTrap) traps++;
        else monsters++;
    });

    document.getElementById('stat-monsters-count').textContent = monsters;
    document.getElementById('stat-spells-count').textContent = spells;
    document.getElementById('stat-traps-count').textContent = traps;
    document.getElementById('stat-extra-count').textContent = extraCards.length;

    document.getElementById('main-deck-count-badge').textContent = `${mainCards.length} / 40-60`;
    document.getElementById('extra-deck-count-badge').textContent = `${extraCards.length} / 15`;

    const validation = window.DeckManager.validateDeck(currentDeck);
    const pill = document.getElementById('deck-status-pill');
    const icon = document.getElementById('deck-status-icon');
    const text = document.getElementById('deck-status-text');

    if (validation.isValid) {
        pill.className = 'deck-status-pill valid';
        icon.textContent = '✓';
        text.textContent = `DECK VÁLIDO (${mainCards.length}/60)`;
    } else {
        pill.className = 'deck-status-pill invalid';
        icon.textContent = '⚠️';
        text.textContent = `DECK INCOMPLETO (${mainCards.length}/40-60)`;
    }
}

/**
 * Filtros de categoría para el inventario
 */
function setInventoryFilter(filterType) {
    currentInventoryFilter = filterType;
    document.querySelectorAll('.inv-filter-btn').forEach(btn => btn.classList.remove('active'));
    
    const activeBtn = document.querySelector(`.inv-filter-btn[data-filter="${filterType}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    renderInventoryCatalog();
}

/**
 * Filtrado dinámico por texto de búsqueda
 */
function filterInventoryCatalog() {
    const input = document.getElementById('inventory-search');
    currentSearchTerm = input ? input.value.trim().toLowerCase() : '';
    renderInventoryCatalog();
}

/**
 * Vacía el Main Deck y Extra Deck activos sin tocar ni borrar ninguna carta del inventario
 */
function clearUserActiveDeck() {
    currentDeck = { mainDeck: [], extraDeck: [] };
    if (window.DeckManager && typeof window.DeckManager.saveDeck === 'function') {
        window.DeckManager.saveDeck(currentDeck);
    }
    currentInventoryGrouped = window.DeckManager.getUserInventoryGrouped();
    renderDeckGrid();
    renderInventoryCatalog();
    updateDeckStatsAndValidation();
    showDeckNotification('Se han retirado todas las cartas del mazo. Tu inventario está intacto.', 'info');
}

/**
 * Guarda los cambios del deck con validación estricta
 */
function saveUserDeckChanges() {
    const validation = window.DeckManager.validateDeck(currentDeck);

    if (!validation.isValid) {
        const errorMsg = validation.errors.join(' | ');
        showDeckNotification(`Reglamento Konami: ${errorMsg}`, 'warning');
        return;
    }

    const saved = window.DeckManager.saveDeck(currentDeck);
    if (saved) {
        showDeckNotification(`¡Deck guardado con éxito (${currentDeck.mainDeck.length} cartas principales / ${currentDeck.extraDeck.length} extra)!`, 'success');
    }
}

const DECK_ATTR_STYLES = {
    'LIGHT':  { bg: 'linear-gradient(135deg, #ffd700, #f59e0b)', text: '#020617', border: '#ffd700', label: '☀️ LUZ', shadow: '0 0 8px rgba(255,215,0,0.5)' },
    'DARK':   { bg: 'linear-gradient(135deg, #7e22ce, #3b0764)', text: '#ffffff', border: '#a855f7', label: '🌑 OSCURIDAD', shadow: '0 0 8px rgba(168,85,247,0.5)' },
    'FIRE':   { bg: 'linear-gradient(135deg, #dc2626, #7f1d1d)', text: '#ffffff', border: '#ef4444', label: '🔥 FUEGO', shadow: '0 0 8px rgba(239,68,68,0.5)' },
    'WATER':  { bg: 'linear-gradient(135deg, #0284c7, #075985)', text: '#ffffff', border: '#38bdf8', label: '💧 AGUA', shadow: '0 0 8px rgba(56,189,248,0.5)' },
    'EARTH':  { bg: 'linear-gradient(135deg, #b45309, #78350f)', text: '#ffffff', border: '#f59e0b', label: '⛰️ TIERRA', shadow: '0 0 8px rgba(245,158,11,0.5)' },
    'WIND':   { bg: 'linear-gradient(135deg, #059669, #064e3b)', text: '#ffffff', border: '#10b981', label: '🌪️ VIENTO', shadow: '0 0 8px rgba(16,185,129,0.5)' },
    'DIVINE': { bg: 'linear-gradient(135deg, #eab308, #ca8a04)', text: '#020617', border: '#fef08a', label: '⚡ DIVINO', shadow: '0 0 8px rgba(234,179,8,0.5)' },
    'SPELL':  { bg: 'linear-gradient(135deg, #059669, #047857)', text: '#ffffff', border: '#10b981', label: '✨ MÁGICA', shadow: '0 0 8px rgba(16,185,129,0.5)' },
    'TRAP':   { bg: 'linear-gradient(135deg, #db2777, #831843)', text: '#ffffff', border: '#f472b6', label: '🛡️ TRAMPA', shadow: '0 0 8px rgba(219,39,119,0.5)' }
};

/**
 * Muestra la información oficial de la carta en una ventana flotante no modal y arrastrable
 */
async function showCardInfoFloating(cardOrId) {
    if (!cardOrId) return;

    let cardId = typeof cardOrId === 'object' ? (cardOrId.id || cardOrId.card_id) : cardOrId;
    let card = typeof cardOrId === 'object' ? { ...cardOrId } : { id: cardId, card_id: cardId };

    // Buscar en PacksManager o inventario local primero
    if (window.PacksManager && window.PacksManager.getCardById) {
        const local = window.PacksManager.getCardById(cardId);
        if (local) card = { ...card, ...local };
    }

    // Consultar cards.cdb oficial vía API backend
    if (cardId) {
        try {
            const res = await fetch(`/api/cards/${cardId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.card) {
                    card = { ...card, ...data.card };
                }
            }
        } catch (err) {
            console.warn("Consulta a base de datos de cartas:", err);
        }
    }

    let floatingElem = document.getElementById('card-info-floating-window');
    if (!floatingElem) {
        floatingElem = document.createElement('div');
        floatingElem.id = 'card-info-floating-window';
        document.body.appendChild(floatingElem);
    }

    const cId = card.id || card.card_id || cardId || 0;
    const cardName = card.name || `Carta #${cId}`;
    const cardNameEs = card.name_es && card.name_es !== card.name ? card.name_es : '';
    const cardImg = card.image_url || card.image || `https://images.ygoprodeck.com/images/cards/${cId}.jpg`;
    const typeStr = (card.type || '').toLowerCase();
    const raceStr = (card.race || '').toLowerCase();
    const attrStr = (card.attribute || '').toUpperCase();
    const typeCode = Number(card.typeCode || 0);

    const isMonster = (typeCode > 0 ? (typeCode & 0x1) !== 0 : false) || 
                      typeStr.includes('monster') || 
                      typeStr.includes('monstruo') || 
                      (card.atk !== undefined && card.atk !== null && card.atk !== '---') || 
                      (card.level !== undefined && parseInt(card.level, 10) > 0);

    const isSpell = !isMonster && (
        (typeCode > 0 ? (typeCode & 0x2) !== 0 : false) || 
        (typeStr.includes('spell') && !typeStr.includes('spellcaster')) || 
        typeStr.includes('mágica') || 
        typeStr.includes('magica') || 
        raceStr === 'spell' || 
        raceStr === 'mágica' || 
        raceStr === 'magica' || 
        attrStr === 'SPELL' || 
        attrStr === 'MÁGICA'
    );

    const isTrap = !isMonster && !isSpell && (
        (typeCode > 0 ? (typeCode & 0x4) !== 0 : false) || 
        typeStr.includes('trap') || 
        typeStr.includes('trampa') || 
        raceStr === 'trap' || 
        raceStr === 'trampa' || 
        attrStr === 'TRAP' || 
        attrStr === 'TRAMPA'
    );

    let attrKey = 'EARTH';
    if (isSpell) attrKey = 'SPELL';
    else if (isTrap) attrKey = 'TRAP';
    else if (card.attribute && DECK_ATTR_STYLES[card.attribute.toUpperCase()]) {
        attrKey = card.attribute.toUpperCase();
    } else if (card.attribute_es) {
        const esMap = { 'LUZ': 'LIGHT', 'OSCURIDAD': 'DARK', 'FUEGO': 'FIRE', 'AGUA': 'WATER', 'TIERRA': 'EARTH', 'VIENTO': 'WIND', 'DIVINIDAD': 'DIVINE' };
        attrKey = esMap[card.attribute_es.toUpperCase()] || 'EARTH';
    }
    const attrCfg = DECK_ATTR_STYLES[attrKey] || DECK_ATTR_STYLES['EARTH'];

    const atk = (card.atk !== undefined && card.atk !== null) ? card.atk : ((card.attack !== undefined && card.attack !== null) ? card.attack : (isMonster ? 0 : '---'));
    const def = (card.def !== undefined && card.def !== null) ? card.def : ((card.defense !== undefined && card.defense !== null) ? card.defense : (isMonster ? 0 : '---'));
    const level = parseInt(card.level, 10) || 0;
    const rank = parseInt(card.rank, 10) || 0;
    const race = card.race_es || card.race || (isSpell ? 'Mágica' : (isTrap ? 'Trampa' : 'Monstruo'));
    const typeLine = card.typeLine_es || card.typeLine || (isMonster ? `[ ${race} / ${card.type ? card.type.replace(/monster/i, '').trim() || 'Normal' : 'Normal'} ]` : `[ ${race} / ${card.type || 'Normal'} ]`);
    
    // Configuración visual de Rareza oficial
    const rarity = (card.rarity || 'COMMON').toUpperCase();
    const RARITY_THEMES = {
        'COMMON': { label: 'COMÚN', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)' },
        'RARE': { label: 'RARA', color: '#38bdf8', bg: 'rgba(56,189,248,0.18)', border: '#38bdf8' },
        'SUPER_RARE': { label: 'SÚPER RARA', color: '#c084fc', bg: 'rgba(168,85,247,0.22)', border: '#c084fc', shadow: '0 0 10px rgba(168,85,247,0.4)' },
        'ULTRA_RARE': { label: 'ULTRA RARA', color: '#ffd700', bg: 'rgba(255,215,0,0.22)', border: '#ffd700', shadow: '0 0 12px rgba(255,215,0,0.55)' },
        'SECRET_RARE': { label: 'SECRETA RARA', color: '#00f0ff', bg: 'rgba(0,240,255,0.22)', border: '#00f0ff', shadow: '0 0 14px rgba(0,240,255,0.6)' },
        'PRISMATIC_SECRET_RARE': { label: 'SECRETA PRISMÁTICA', color: '#f472b6', bg: 'rgba(236,72,153,0.25)', border: '#f472b6', shadow: '0 0 14px rgba(236,72,153,0.6)' },
        'ULTIMATE_RARE': { label: 'RARA DEFINITIVA', color: '#fb923c', bg: 'rgba(251,146,60,0.25)', border: '#fb923c', shadow: '0 0 12px rgba(251,146,60,0.6)' },
        'GHOST_RARE': { label: 'RARA FANTASMA', color: '#ffffff', bg: 'rgba(255,255,255,0.25)', border: '#ffffff', shadow: '0 0 16px rgba(255,255,255,0.8)' }
    };
    const rTheme = RARITY_THEMES[rarity] || RARITY_THEMES['COMMON'];

    const descEn = card.desc || card.description || 'No description recorded in database.';
    const descEs = card.desc_es || card.description_es || card.descEs || '';

    let propertyBadge = '';
    if (isSpell) {
        if (typeStr.includes('field')) propertyBadge = '<span class="floating-badge badge-type">🌌 CAMPO</span>';
        else if (typeStr.includes('quick-play')) propertyBadge = '<span class="floating-badge badge-type">⚡ RÁPIDA</span>';
        else if (typeStr.includes('continuous')) propertyBadge = '<span class="floating-badge badge-type">♾️ CONTINUA</span>';
        else if (typeStr.includes('equip')) propertyBadge = '<span class="floating-badge badge-type">🗡️ EQUIPO</span>';
        else if (typeStr.includes('ritual')) propertyBadge = '<span class="floating-badge badge-type">🔮 RITUAL</span>';
        else propertyBadge = '<span class="floating-badge badge-type">NORMAL</span>';
    } else if (isTrap) {
        if (typeStr.includes('continuous')) propertyBadge = '<span class="floating-badge badge-race">♾️ CONTINUA</span>';
        else if (typeStr.includes('counter')) propertyBadge = '<span class="floating-badge badge-race">⚡ CONTRAEFECTO</span>';
        else propertyBadge = '<span class="floating-badge badge-race">NORMAL</span>';
    } else if (isMonster) {
        if (typeStr.includes('fusion') || typeStr.includes('fusión')) propertyBadge = '<span class="floating-badge badge-type" style="background:rgba(147,51,234,0.25); border:1px solid #a855f7; color:#c084fc;">FUSIÓN</span>';
        else if (typeStr.includes('ritual')) propertyBadge = '<span class="floating-badge badge-type" style="background:rgba(59,130,246,0.25); border:1px solid #3b82f6; color:#60a5fa;">RITUAL</span>';
        else if (typeStr.includes('synchro') || typeStr.includes('sincronía')) propertyBadge = '<span class="floating-badge badge-type" style="background:rgba(255,255,255,0.2); border:1px solid #ffffff; color:#ffffff;">SINCRONÍA</span>';
        else if (typeStr.includes('xyz')) propertyBadge = '<span class="floating-badge badge-type" style="background:rgba(0,0,0,0.6); border:1px solid #fbbf24; color:#fbbf24;">XYZ</span>';
        else if (typeStr.includes('effect') || typeStr.includes('efecto')) propertyBadge = '<span class="floating-badge badge-type" style="background:rgba(249,115,22,0.25); border:1px solid #f97316; color:#fb923c;">EFECTO</span>';
        else propertyBadge = '<span class="floating-badge badge-type" style="background:rgba(234,179,8,0.2); border:1px solid #eab308; color:#fde047;">NORMAL</span>';
    }

    const starIcons = level > 0 ? '★'.repeat(Math.min(level, 12)) : (rank > 0 ? '★'.repeat(Math.min(rank, 12)) : '');

    floatingElem.innerHTML = `
        <div class="floating-window-header" id="floating-card-drag-handle">
            <div class="floating-window-title">
                <span>INFO CARTA</span>
            </div>
            <button class="floating-window-close" onclick="hideCardInfoFloating()" title="Cerrar ventana">✕</button>
        </div>
        <div class="floating-window-body">
            <div class="floating-card-left">
                <img src="${cardImg}" alt="${cardName}" class="floating-card-img" onerror="this.onerror=null; this.src='https://images.ygoprodeck.com/images/cards/${cId}.jpg';">
                <div class="floating-card-passcode">#${String(cId).padStart(8, '0')}</div>
            </div>
            <div class="floating-card-right">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px;">
                    <div>
                        <div class="floating-card-name" style="margin-bottom:2px;">${cardName}</div>
                        ${cardNameEs ? `<div style="font-size:11px; font-weight:700; color:#00f0ff; font-family:'Orbitron', sans-serif; letter-spacing:0.5px;">${cardNameEs}</div>` : ''}
                    </div>
                    <span class="floating-badge" style="background:${rTheme.bg}; color:${rTheme.color}; border:1px solid ${rTheme.border}; ${rTheme.shadow ? `box-shadow:${rTheme.shadow};` : ''} font-weight:900; font-family:'Orbitron', sans-serif; font-size:9.5px;">${rTheme.label}</span>
                </div>
                <div class="floating-badges-row">
                    <span class="floating-badge" style="background:${attrCfg.bg}; color:${attrCfg.text}; border:1px solid ${attrCfg.border}; box-shadow:${attrCfg.shadow || 'none'}; font-weight:800;">${attrCfg.label}</span>
                    ${propertyBadge}
                    ${isMonster && level > 0 ? `<span class="floating-badge badge-level" style="background:rgba(234,179,8,0.2); border:1px solid #ffd700; color:#ffd700; font-weight:800;" title="Nivel ${level} (${starIcons})">★ Nv. ${level} <span style="letter-spacing:1px; margin-left:3px; color:#ffd700;">${starIcons}</span></span>` : ''}
                    ${isMonster && rank > 0 ? `<span class="floating-badge badge-rank" style="background:rgba(20,20,20,0.85); border:1px solid #ffd700; color:#ffd700; font-weight:800;" title="Rango ${rank} (${starIcons})">⯌ Rango ${rank} <span style="letter-spacing:1px; margin-left:3px; color:#ffd700;">${starIcons}</span></span>` : ''}
                    <span class="floating-badge" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#f1f5f9; font-weight:800;">${typeLine}</span>
                </div>
                ${isMonster ? `
                    <div class="floating-stats-row">
                        <span class="floating-stat-atk">⚔️ ATK / ${atk}</span>
                        <span class="floating-stat-def">🛡️ DEF / ${def}</span>
                    </div>
                ` : ''}
                <div class="floating-desc-box">
                    <div class="floating-desc-text" style="color:#cbd5e1; font-size:9.5px; font-weight:400; line-height:1.4; font-family:'Outfit', sans-serif;">${descEn}</div>
                    ${descEs && descEs !== descEn ? `
                        <div class="floating-desc-divider" style="margin:6px 0; border-top:1px dashed rgba(0,240,255,0.2);"></div>
                        <div class="floating-desc-text" style="color:#94a3b8; font-size:9.5px; font-weight:400; line-height:1.4; font-family:'Outfit', sans-serif;">${descEs}</div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    floatingElem.style.display = 'flex';
    floatingElem.style.transform = 'none';

    // Centrar inicialmente de forma limpia en píxeles
    const windowW = window.innerWidth || document.documentElement.clientWidth;
    const windowH = window.innerHeight || document.documentElement.clientHeight;
    const elemW = floatingElem.offsetWidth || Math.min(windowW * 0.52, 540);
    const elemH = floatingElem.offsetHeight || 300;
    
    floatingElem.style.left = `${Math.max(10, Math.floor((windowW - elemW) / 2))}px`;
    floatingElem.style.top = `${Math.max(10, Math.floor((windowH - elemH) / 2))}px`;

    const handle = document.getElementById('floating-card-drag-handle');
    if (handle) {
        makeElementDraggable(handle, floatingElem);
    }
}

function makeElementDraggable(dragHandle, targetElement) {
    let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;
    dragHandle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        if (e.target.closest('button')) return; // No arrastrar si se hace clic en cerrar
        e.preventDefault();
        
        const rect = targetElement.getBoundingClientRect();
        targetElement.style.position = 'fixed';
        targetElement.style.transform = 'none';
        targetElement.style.left = `${rect.left}px`;
        targetElement.style.top = `${rect.top}px`;
        targetElement.style.bottom = 'auto';
        targetElement.style.right = 'auto';
        targetElement.style.margin = '0';

        startX = e.clientX;
        startY = e.clientY;
        initialLeft = rect.left;
        initialTop = rect.top;

        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        let newLeft = initialLeft + dx;
        let newTop = initialTop + dy;

        const maxLeft = (window.innerWidth || document.documentElement.clientWidth) - targetElement.offsetWidth - 5;
        const maxTop = (window.innerHeight || document.documentElement.clientHeight) - targetElement.offsetHeight - 5;
        newLeft = Math.max(5, Math.min(newLeft, maxLeft));
        newTop = Math.max(5, Math.min(newTop, maxTop));

        targetElement.style.left = `${newLeft}px`;
        targetElement.style.top = `${newTop}px`;
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

function hideCardInfoFloating() {
    const elem = document.getElementById('card-info-floating-window');
    if (elem) elem.style.display = 'none';
}

function showDeckNotification(message, type = 'info') {
    let toast = document.getElementById('deck-builder-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'deck-builder-toast';
        toast.className = 'deck-toast';
        document.body.appendChild(toast);
    }
    toast.className = `deck-toast ${type} show`;
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;

    if (window._deckToastTimeout) clearTimeout(window._deckToastTimeout);
    window._deckToastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

/**
 * Vender 1 copia excedente al sistema (Solo cartas con > 3 copias)
 */
async function onSellExcessCardClick(cardId) {
    const cardObj = currentInventoryGrouped.find(c => String(c.card_id) === String(cardId));
    const cardName = cardObj ? cardObj.name : `Carta #${cardId}`;
    const user = window.Session ? window.Session.getUser() : null;
    const userId = user ? (user.id || user.user_id || user.Id) : (window.Session ? window.Session.getUserId() : 1);

    try {
        const res = await fetch('/api/game/cards/sell-excess', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, cardCode: cardId })
        });

        const data = await res.json();
        if (data.success) {
            showDeckNotification(`¡Venta realizada! +100 ⭐ StarShips. Te quedan ${data.remainingQuantity} copias.`, 'success');

            // Actualizar balance de sesión
            if (user && data.newBalance !== undefined) {
                user.starships = data.newBalance;
                user.Starships = data.newBalance;
                if (window.Session) {
                    if (typeof window.Session.saveUser === 'function') window.Session.saveUser(user);
                    if (typeof window.Session.setStarships === 'function') window.Session.setStarships(data.newBalance);
                }
            }

            // Sincronizar inventario desde el servidor
            if (window.DeckManager) {
                await window.DeckManager.syncFromServer();
                currentDeck = window.DeckManager.getDeck();
                currentInventoryGrouped = window.DeckManager.getUserInventoryGrouped();
                renderDeckGrid();
                renderInventoryCatalog();
                updateDeckStatsAndValidation();
            }
        } else {
            showDeckNotification(data.message || 'No se pudo completar la venta.', 'error');
        }
    } catch (e) {
        console.error('[SELL CARD ERROR]', e);
        showDeckNotification('Error de conexión al procesar la venta.', 'error');
    }
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

// Alias de compatibilidad
window.showCardInfoFloating = showCardInfoFloating;
window.hideCardInfoFloating = hideCardInfoFloating;
window.showDeckCardModal = showCardInfoFloating;
window.closeDeckCardModal = hideCardInfoFloating;
window.onSellExcessCardClick = onSellExcessCardClick;
