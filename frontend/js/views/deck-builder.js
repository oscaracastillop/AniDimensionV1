/**
 * ANI-DIMENSION: LÓGICA DE CONSTRUCCIÓN DE DECK (VISTA DEDICADA)
 * GESTIÓN REGLAMENTARIA OFICIAL DE YU-GI-OH! OCG
 */

let currentDeck = { mainDeck: [], extraDeck: [] };
let currentInventoryGrouped = [];
let currentInventoryFilter = 'ALL';
let currentSearchTerm = '';

document.addEventListener('DOMContentLoaded', () => {
    initDeckBuilder();
});

function initDeckBuilder() {
    if (!window.DeckManager) {
        console.error('DeckManager no disponible.');
        return;
    }

    currentDeck = window.DeckManager.getDeck();
    currentInventoryGrouped = window.DeckManager.getUserInventoryGrouped();

    renderDeckGrid();
    renderInventoryCatalog();
    updateDeckStatsAndValidation();
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
                    ${!isUsable ? '<span style="position:absolute; top:2px; left:2px; background:#ef4444; color:#fff; font-size:6.5px; font-weight:900; padding:1px 3px; z-index:5;">BLOQUEADA</span>' : ''}
                    <button onclick="event.stopPropagation(); showDeckCardModal(${item.card_id})" style="position:absolute; top:2px; right:2px; background:rgba(0,240,255,0.25); border:1px solid #00f0ff; color:#00f0ff; font-size:8px; border-radius:3px; padding:1px 4px; cursor:pointer; z-index:6; line-height:1;" title="Ver detalles y efecto">ℹ️</button>
                    <span class="deck-card-copies-badge">x${item.count}</span>
                    <img src="../../assets/images/cards/${item.card_id}.jpg" onerror="this.onerror=null; this.src='https://images.ygoprodeck.com/images/cards/${item.card_id}.jpg';" class="deck-card-img" style="filter:${!isUsable ? 'grayscale(0.8) brightness(0.6)' : 'none'};">
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
                    ${!isUsable ? '<span style="position:absolute; top:2px; left:2px; background:#ef4444; color:#fff; font-size:6.5px; font-weight:900; padding:1px 3px; z-index:5;">BLOQUEADA</span>' : ''}
                    <button onclick="event.stopPropagation(); showDeckCardModal(${item.card_id})" style="position:absolute; top:2px; right:2px; background:rgba(168,85,247,0.3); border:1px solid #a855f7; color:#c084fc; font-size:8px; border-radius:3px; padding:1px 4px; cursor:pointer; z-index:6; line-height:1;" title="Ver detalles y efecto">ℹ️</button>
                    <span class="deck-card-copies-badge" style="background:linear-gradient(135deg, #a855f7, #7e22ce); color:#fff;">x${item.count}</span>
                    <img src="../../assets/images/cards/${item.card_id}.jpg" onerror="this.onerror=null; this.src='https://images.ygoprodeck.com/images/cards/${item.card_id}.jpg';" class="deck-card-img" style="filter:${!isUsable ? 'grayscale(0.8) brightness(0.6)' : 'none'};">
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
        list = list.filter(c => (c.type || '').toLowerCase().includes('monster') && !window.DeckManager.isExtraDeckCard(c));
    } else if (currentInventoryFilter === 'SPELL') {
        list = list.filter(c => (c.type || '').toLowerCase().includes('spell'));
    } else if (currentInventoryFilter === 'TRAP') {
        list = list.filter(c => (c.type || '').toLowerCase().includes('trap'));
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
                <button onclick="event.stopPropagation(); showDeckCardModal(${item.card_id})" style="position:absolute; top:3px; right:3px; background:rgba(0,240,255,0.25); border:1px solid #00f0ff; color:#00f0ff; font-size:8px; border-radius:3px; padding:1px 4px; cursor:pointer; z-index:6; line-height:1;" title="Ver detalles y efecto">ℹ️</button>
                <div class="inv-card-passcode">#${item.card_id}</div>
                <img src="../../assets/images/cards/${item.card_id}.jpg" onerror="this.onerror=null; this.src='https://images.ygoprodeck.com/images/cards/${item.card_id}.jpg';" class="inv-card-img" style="filter:${!isUsable ? 'grayscale(0.8)' : 'none'};">
                
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
        if (type.includes('spell')) spells++;
        else if (type.includes('trap')) traps++;
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
 * Restablece el deck inicial por defecto
 */
function resetUserDeckToDefault() {
    if (window.showAniModal) {
        window.showAniModal(
            'Resetear Deck',
            '¿Deseas restablecer tu Deck al Starter Deck reglamentario por defecto?',
            'confirm',
            () => {
                currentDeck = window.DeckManager.generateDefaultStarterDeck();
                renderDeckGrid();
                renderInventoryCatalog();
                updateDeckStatsAndValidation();
            }
        );
    }
}

/**
 * Guarda los cambios del deck con validación estricta
 */
function saveUserDeckChanges() {
    const validation = window.DeckManager.validateDeck(currentDeck);

    if (!validation.isValid) {
        const errorMsg = validation.errors.join('\n• ');
        if (window.showAniModal) {
            window.showAniModal('Reglamento de Deck Konami', `No se puede guardar el Deck por los siguientes motivos:\n\n• ${errorMsg}`, 'error');
        }
        return;
    }

    const saved = window.DeckManager.saveDeck(currentDeck);
    if (saved && window.showAniModal) {
        window.showAniModal('Deck Guardado', `¡Tu Deck de ${currentDeck.mainDeck.length} cartas principales y ${currentDeck.extraDeck.length} cartas de Extra Deck ha sido guardado exitosamente!`, 'success');
    }
}

const DECK_ATTR_STYLES = {
    'LIGHT':  { bg: 'linear-gradient(135deg, #ffd700, #f59e0b)', text: '#020617', border: '#ffd700', label: '☀️ LUZ' },
    'DARK':   { bg: 'linear-gradient(135deg, #7e22ce, #3b0764)', text: '#ffffff', border: '#a855f7', label: '🌑 OSCURIDAD' },
    'FIRE':   { bg: 'linear-gradient(135deg, #dc2626, #7f1d1d)', text: '#ffffff', border: '#ef4444', label: '🔥 FUEGO' },
    'WATER':  { bg: 'linear-gradient(135deg, #0284c7, #075985)', text: '#ffffff', border: '#38bdf8', label: '💧 AGUA' },
    'EARTH':  { bg: 'linear-gradient(135deg, #b45309, #78350f)', text: '#ffffff', border: '#f59e0b', label: '⛰️ TIERRA' },
    'WIND':   { bg: 'linear-gradient(135deg, #059669, #064e3b)', text: '#ffffff', border: '#10b981', label: '🌪️ VIENTO' },
    'DIVINE': { bg: 'linear-gradient(135deg, #eab308, #ca8a04)', text: '#020617', border: '#fef08a', label: '⚡ DIVINO' },
    'SPELL':  { bg: 'linear-gradient(135deg, #059669, #047857)', text: '#ffffff', border: '#10b981', label: '✨ MÁGICA' },
    'TRAP':   { bg: 'linear-gradient(135deg, #db2777, #831843)', text: '#ffffff', border: '#f472b6', label: '🛡️ TRAMPA' }
};

function showDeckCardModal(cardId) {
    const card = (window.PacksManager && window.PacksManager.getCardById(cardId)) || 
                 currentInventoryGrouped.find(c => String(c.card_id) === String(cardId)) ||
                 { card_id: cardId, id: cardId, name: `Carta #${cardId}` };

    const modal = document.getElementById('deck-card-modal');
    if (!modal) return;

    const img = document.getElementById('modal-card-img');
    const passcode = document.getElementById('modal-card-passcode');
    const rarity = document.getElementById('modal-card-rarity');
    const name = document.getElementById('modal-card-name');
    const attr = document.getElementById('modal-card-attr');
    const stars = document.getElementById('modal-card-stars');
    const type = document.getElementById('modal-card-type');
    const atk = document.getElementById('modal-card-atk');
    const def = document.getElementById('modal-card-def');
    const statsBox = document.getElementById('modal-card-stats');
    const desc = document.getElementById('modal-card-desc');

    const cId = card.card_id || card.id || cardId;

    if (img) {
        img.src = `../../assets/images/cards/${cId}.jpg`;
        img.onerror = function() {
            this.onerror = null;
            this.src = `https://images.ygoprodeck.com/images/cards/${cId}.jpg`;
        };
    }

    if (passcode) passcode.textContent = `#${String(cId).padStart(8, '0')}`;
    if (rarity) {
        rarity.textContent = (card.rarity || 'COMMON').replace(/_/g, ' ');
        const rCol = card.rarity === 'SECRET_RARE' ? '#ec4899' : card.rarity === 'ULTRA_RARE' ? '#ffd700' : card.rarity === 'SUPER_RARE' ? '#00f0ff' : '#94a3b8';
        rarity.style.color = rCol;
    }
    if (name) name.textContent = card.name || `Carta #${cId}`;

    const typeStr = (card.type || '').toLowerCase();
    const isSpell = typeStr.includes('spell');
    const isTrap = typeStr.includes('trap');
    const isMonster = !isSpell && !isTrap;

    let attrKey = 'EARTH';
    if (isSpell) attrKey = 'SPELL';
    else if (isTrap) attrKey = 'TRAP';
    else if (card.attribute && DECK_ATTR_STYLES[card.attribute.toUpperCase()]) {
        attrKey = card.attribute.toUpperCase();
    }
    const attrCfg = DECK_ATTR_STYLES[attrKey] || DECK_ATTR_STYLES['EARTH'];
    if (attr) {
        attr.innerHTML = attrCfg.label;
        attr.style.background = attrCfg.bg;
        attr.style.color = attrCfg.text;
        attr.style.border = `1px solid ${attrCfg.border}`;
    }

    if (stars) {
        const lvl = card.level || 0;
        if (isMonster && lvl > 0) {
            stars.innerHTML = `<span style="color:#ffd700;">★</span>`.repeat(Math.min(lvl, 12)) + ` <b style="color:#ffd700;">(Nv. ${lvl})</b>`;
        } else if (isSpell) {
            stars.innerHTML = `<span style="color:#34d399; font-weight:800;">[ MÁGICA ]</span>`;
        } else if (isTrap) {
            stars.innerHTML = `<span style="color:#f472b6; font-weight:800;">[ TRAMPA ]</span>`;
        } else {
            stars.innerHTML = '';
        }
    }

    if (type) {
        type.innerHTML = `<span style="color:#38bdf8;">[</span> <b style="color:#fff;">${card.race || 'Guerrero'}</b> / <span>${card.type || 'Monstruo'}</span> <span style="color:#38bdf8;">]</span>`;
    }

    if (statsBox && atk && def) {
        if (isMonster && card.atk !== null && card.atk !== undefined) {
            statsBox.style.display = 'flex';
            atk.textContent = card.atk;
            def.textContent = card.def !== null ? card.def : '0';
        } else {
            statsBox.style.display = 'none';
        }
    }

    if (desc) {
        desc.textContent = card.desc || 'Sin descripción disponible.';
    }

    modal.style.display = 'flex';
}

function closeDeckCardModal() {
    const modal = document.getElementById('deck-card-modal');
    if (modal) modal.style.display = 'none';
}
