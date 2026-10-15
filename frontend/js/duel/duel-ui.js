/**
 * Ani-Dimension: Renderizador Visual del Tablero y Paneles OCG
 */
var currentUser = window.currentUser || (window.Session && window.Session.getUser()) || { id: 1, username: 'Admin' };

function getActiveSocket() {
    if (window.getSocket && typeof window.getSocket === 'function') {
        const s = window.getSocket();
        if (s) return s;
    }
    if (window.socket) return window.socket;
    if (typeof socket !== 'undefined' && socket) return socket;
    if (typeof io !== 'undefined') {
        window.socket = io();
        return window.socket;
    }
    return null;
}
window.getActiveSocket = getActiveSocket;

const ATTR_BADGE_CONFIG = {
    'LIGHT':  { bg: 'linear-gradient(135deg, #ffd700, #f59e0b)', text: '#020617', border: '#ffd700', shadow: '0 0 10px rgba(255,215,0,0.7)', label: '☀️ LUZ' },
    'DARK':   { bg: 'linear-gradient(135deg, #7e22ce, #3b0764)', text: '#ffffff', border: '#a855f7', shadow: '0 0 10px rgba(168,85,247,0.7)', label: '🌑 OSCURIDAD' },
    'FIRE':   { bg: 'linear-gradient(135deg, #dc2626, #7f1d1d)', text: '#ffffff', border: '#ef4444', shadow: '0 0 10px rgba(239,68,68,0.7)', label: '🔥 FUEGO' },
    'WATER':  { bg: 'linear-gradient(135deg, #0284c7, #075985)', text: '#ffffff', border: '#38bdf8', shadow: '0 0 10px rgba(56,189,248,0.7)', label: '💧 AGUA' },
    'EARTH':  { bg: 'linear-gradient(135deg, #b45309, #78350f)', text: '#ffffff', border: '#f59e0b', shadow: '0 0 10px rgba(245,158,11,0.7)', label: '⛰️ TIERRA' },
    'WIND':   { bg: 'linear-gradient(135deg, #059669, #064e3b)', text: '#ffffff', border: '#10b981', shadow: '0 0 10px rgba(16,185,129,0.7)', label: '🌪️ VIENTO' },
    'DIVINE': { bg: 'linear-gradient(135deg, #eab308, #ca8a04)', text: '#020617', border: '#fef08a', shadow: '0 0 12px rgba(254,240,138,0.9)', label: '⚡ DIVINO' },
    'SPELL':  { bg: 'linear-gradient(135deg, #059669, #047857)', text: '#ffffff', border: '#10b981', shadow: '0 0 10px rgba(16,185,129,0.7)', label: '✨ MÁGICA' },
    'TRAP':   { bg: 'linear-gradient(135deg, #db2777, #831843)', text: '#ffffff', border: '#f472b6', shadow: '0 0 10px rgba(244,114,182,0.7)', label: '🛡️ TRAMPA' }
};

// Bloque lateral retirado por solicitud: Se mantiene exclusivamente la ventana flotante original
function toggleCardInspector() {}
function renderCardDetailsInInspector() {}
function inspectCardById() {}
window.toggleCardInspector = toggleCardInspector;

// =========================================================================
// VENTANA FLOTANTE HORIZONTAL: INFO CARTA (DIRECTO DESDE CARDS.CDB / DB)
// =========================================================================
async function showCardInfoFloating(cardOrId) {
    if (!cardOrId) return;

    let cardId = typeof cardOrId === 'object' ? (cardOrId.id || cardOrId.card_id) : cardOrId;
    let card = typeof cardOrId === 'object' ? { ...cardOrId } : { id: cardId, card_id: cardId };

    // 1. Consultar siempre la base de datos oficial cards.cdb vía API backend
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
    const artId = (card.alias && Number(card.alias) > 0) ? card.alias : (Number(cId) === 70781057 ? 70781052 : cId);
    const cardName = card.name || `Carta #${cId}`;
    const cardNameEs = card.name_es || card.nameEs || '';
    const cardImg = `/api/cards/${artId || cId}/image`;
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
    else if (card.attribute && ATTR_BADGE_CONFIG[card.attribute.toUpperCase()]) {
        attrKey = card.attribute.toUpperCase();
    } else if (card.attribute_es) {
        const esMap = { 'LUZ': 'LIGHT', 'OSCURIDAD': 'DARK', 'FUEGO': 'FIRE', 'AGUA': 'WATER', 'TIERRA': 'EARTH', 'VIENTO': 'WIND', 'DIVINIDAD': 'DIVINE' };
        attrKey = esMap[card.attribute_es.toUpperCase()] || 'EARTH';
    }
    const attrCfg = ATTR_BADGE_CONFIG[attrKey] || ATTR_BADGE_CONFIG['EARTH'];

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
                <img src="${cardImg}" alt="${cardName}" class="floating-card-img" onerror="this.onerror=null; this.src='/assets/card_back.jpg';">
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
                    <span class="floating-badge" style="background:${attrCfg.bg}; color:${attrCfg.text}; border:1px solid ${attrCfg.border}; box-shadow:${attrCfg.shadow}; font-weight:800;">${attrCfg.label}</span>
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
    const elemW = floatingElem.offsetWidth || Math.min(windowW * 0.52, 600);
    const elemH = floatingElem.offsetHeight || 320;
    
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
        if (e.target.closest('button')) return; // No arrastrar si se hace clic en el botón cerrar
        e.preventDefault();
        
        // Obtener posición absoluta exacta en viewport sin saltos
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

        // Limitar dentro de los bordes visibles de la pantalla
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

// Cerrar automáticamente la ventana flotante original al hacer clic por fuera o presionar Esc
if (typeof document !== 'undefined') {
    document.addEventListener('pointerdown', (e) => {
        const floatWin = document.getElementById('card-info-floating-window');
        if (!floatWin || floatWin.style.display === 'none') return;
        if (e.target.closest('#card-info-floating-window')) return;
        if (e.target.closest('.context-menu-button') || e.target.closest('#context-menu') || e.target.closest('.custom-context-menu')) return;
        hideCardInfoFloating();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideCardInfoFloating();
        }
    });
}

window.showCardInfoFloating = showCardInfoFloating;
window.hideCardInfoFloating = hideCardInfoFloating;

function inspectMonsterSlot() {}
function inspectCardDirectly() {}

        function getCardTypeBadgeColor(typeStr) {
            if (!typeStr) return '#c084fc';
            const t = typeStr.toLowerCase();
            if (t.includes('fusion')) return '#c084fc';
            if (t.includes('synchro')) return '#e2e8f0';
            if (t.includes('xyz')) return '#38bdf8';
            if (t.includes('link')) return '#00f0ff';
            if (t.includes('spell')) return '#2ed573';
            if (t.includes('trap')) return '#ff4757';
            return 'var(--accent-gold)';
        }

        function openGraveyardModal(playerKey) {
            if (!lastDuelState) return;
            const p = lastDuelState[playerKey];
            if (!p) return;
            const modal = document.getElementById('gy-inspector-modal');
            const box = document.getElementById('gy-drawer-card-box');
            const titleElem = document.getElementById('gy-modal-title');
            const grid = document.getElementById('gy-cards-grid');

            if (box) box.className = 'gy-drawer-card drawer-theme-gy';

            const gyCards = p.graveyard || [];
            if (titleElem) titleElem.textContent = `Cementerio de ${p.username} (${gyCards.length} cartas)`;
            if (grid) {
                grid.innerHTML = '';
                grid.onwheel = (e) => {
                    if (e.deltaY !== 0) {
                        e.preventDefault();
                        grid.scrollLeft += e.deltaY;
                    }
                };
            }

            if (gyCards.length === 0) {
                if (grid) grid.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:30px; width:100%;">El Cementerio está vacío.</div>`;
            } else {
                // Regla OCG / UX: Mostrar la carta más recientemente enviada al Cementerio de primeras (LIFO)
                const displayCards = [...gyCards].reverse();
                displayCards.forEach((c, idx) => {
                    const cId = c.id || c.card_id;
                    const cardDiv = document.createElement('div');
                    cardDiv.className = 'gy-card-item' + (idx === 0 ? ' gy-card-selected' : '');
                    cardDiv.innerHTML = `
                        <div class="gy-card-img" style="background-image:url('/api/cards/${cId}/image'), url('/assets/card_back.jpg');"></div>
                    `;
                    cardDiv.onclick = (e) => {
                        if (e) e.stopPropagation();
                        grid.querySelectorAll('.gy-card-item').forEach(item => item.classList.remove('gy-card-selected'));
                        cardDiv.classList.add('gy-card-selected');
                        inspectCardDirectly(c);

                        // Si estamos en modo de selección de objetivo para revivir
                        if (targetSelectMode && typeof targetSelectMode.callback === 'function') {
                            targetSelectMode.callback(cId);
                            targetSelectMode = null;
                            closeGraveyardModal();
                            return;
                        }

                        // Menú contextual con opciones y Info Carta
                        const ctxFunc = (typeof showContextMenu === 'function') ? showContextMenu : (typeof window.showContextMenu === 'function' ? window.showContextMenu : null);
                        if (ctxFunc) {
                            const actions = [];
                            actions.push({
                                label: 'ℹ️ Info Carta',
                                onClick: () => {
                                    const infoFunc = (typeof showCardInfoFloating === 'function') ? showCardInfoFloating : (typeof window.showCardInfoFloating === 'function' ? window.showCardInfoFloating : null);
                                    if (infoFunc) {
                                        infoFunc(c || cId);
                                    }
                                }
                            });
                            ctxFunc(e, c.name || 'Carta de Cementerio', actions);
                        }
                    };
                    grid.appendChild(cardDiv);
                });

                // Cargar inmediatamente la carta más reciente en el inspector lateral izquierdo
                inspectCardDirectly(displayCards[0]);
            }

            if (modal) modal.style.display = 'flex';
        }

        function openBanishedModal(playerKey) {
            if (!lastDuelState) return;
            const p = lastDuelState[playerKey];
            if (!p) return;
            const modal = document.getElementById('gy-inspector-modal');
            const box = document.getElementById('gy-drawer-card-box');
            const titleElem = document.getElementById('gy-modal-title');
            const grid = document.getElementById('gy-cards-grid');

            if (box) box.className = 'gy-drawer-card drawer-theme-banished';

            const banishedCards = p.banished || [];
            if (titleElem) titleElem.textContent = `Cartas Desterradas de ${p.username} (${banishedCards.length} cartas)`;
            if (grid) {
                grid.innerHTML = '';
                grid.onwheel = (e) => {
                    if (e.deltaY !== 0) {
                        e.preventDefault();
                        grid.scrollLeft += e.deltaY;
                    }
                };
            }

            if (banishedCards.length === 0) {
                if (grid) grid.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:30px; width:100%;">No hay cartas desterradas.</div>`;
            } else {
                // Regla OCG / UX: Mostrar la carta más recientemente desterrada de primeras
                const displayBanished = [...banishedCards].reverse();
                displayBanished.forEach((c, idx) => {
                    const cId = c.id || c.card_id;
                    const cardDiv = document.createElement('div');
                    cardDiv.className = 'gy-card-item' + (idx === 0 ? ' gy-card-selected' : '');
                    cardDiv.innerHTML = `
                        <div class="gy-card-img" style="background-image:url('/api/cards/${cId}/image'), url('/assets/card_back.jpg');"></div>
                    `;
                    cardDiv.onclick = (e) => {
                        if (e) e.stopPropagation();
                        grid.querySelectorAll('.gy-card-item').forEach(item => item.classList.remove('gy-card-selected'));
                        cardDiv.classList.add('gy-card-selected');
                        inspectCardDirectly(c);

                        const ctxFunc = (typeof showContextMenu === 'function') ? showContextMenu : (typeof window.showContextMenu === 'function' ? window.showContextMenu : null);
                        if (ctxFunc) {
                            const actions = [];
                            actions.push({
                                label: 'ℹ️ Info Carta',
                                onClick: () => {
                                    const infoFunc = (typeof showCardInfoFloating === 'function') ? showCardInfoFloating : (typeof window.showCardInfoFloating === 'function' ? window.showCardInfoFloating : null);
                                    if (infoFunc) {
                                        infoFunc(c || cId);
                                    }
                                }
                            });
                            ctxFunc(e, c.name || 'Carta Desterrada', actions);
                        }
                    };
                    grid.appendChild(cardDiv);
                });

                // Cargar inmediatamente la carta más reciente en el inspector lateral izquierdo
                inspectCardDirectly(displayBanished[0]);
            }

            if (modal) modal.style.display = 'flex';
        }

        function openExtraDeckModal(playerKey) {
            if (!lastDuelState) return;
            const p = lastDuelState[playerKey];
            if (!p) return;

            const modal = document.getElementById('gy-inspector-modal');
            const box = document.getElementById('gy-drawer-card-box');
            const titleElem = document.getElementById('gy-modal-title');
            const grid = document.getElementById('gy-cards-grid');

            if (box) box.className = 'gy-drawer-card drawer-theme-extra';

            const extraCards = p.extraDeck || [];
            if (titleElem) titleElem.textContent = `Extra Deck de ${p.username} (${extraCards.length} cartas)`;
            if (grid) {
                grid.innerHTML = '';
                grid.onwheel = (e) => {
                    if (e.deltaY !== 0) {
                        e.preventDefault();
                        grid.scrollLeft += e.deltaY;
                    }
                };
            }

            if (extraCards.length === 0) {
                if (grid) grid.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:30px; width:100%;">El Extra Deck está vacío.</div>`;
            } else {
                extraCards.forEach((c, idx) => {
                    const cId = c.id || c.card_id;
                    const cardDiv = document.createElement('div');
                    cardDiv.className = 'gy-card-item' + (idx === 0 ? ' gy-card-selected' : '');
                    cardDiv.innerHTML = `
                        <div class="gy-card-img" style="background-image:url('/api/cards/${cId}/image'), url('/assets/card_back.jpg');"></div>
                    `;
                    cardDiv.onclick = (e) => {
                        if (e) e.stopPropagation();
                        grid.querySelectorAll('.gy-card-item').forEach(item => item.classList.remove('gy-card-selected'));
                        cardDiv.classList.add('gy-card-selected');
                        inspectCardDirectly(c);

                        const ctxFunc = (typeof showContextMenu === 'function') ? showContextMenu : (typeof window.showContextMenu === 'function' ? window.showContextMenu : null);
                        if (ctxFunc) {
                            const actions = [];
                            const myUsername = currentUser ? currentUser.username : 'Admin';
                            const isMyTurn = !lastDuelState || lastDuelState.turnPlayer === myUsername;
                            const isMainPhase = !lastDuelState || lastDuelState.phase === 'M1' || lastDuelState.phase === 'M2' || lastDuelState.phase === 'MAIN_1' || lastDuelState.phase === 'MAIN_2';
                            const numId = Number(cId);
                            const isContact = [91998119, 99261403, 2111707, 99724761, 99728880, 25119460, 77622396].includes(numId);
                            const typeStr = (c.type || c.card_type || '').toLowerCase();
                            const isSynchro = typeStr.includes('synchro') || typeStr.includes('sincron') || Boolean(c.typeCode && (c.typeCode & 0x2000)) || numId === 29981921;
                            const isFusion = typeStr.includes('fusion') || typeStr.includes('fusión') || Boolean(c.typeCode && (c.typeCode & 0x40)) || isContact;

                            if (playerKey === 'player1' && isMyTurn && isMainPhase) {
                                if (isSynchro) {
                                    actions.push({
                                        label: `⚡🌠 Invocar por Sincronía: ${c.name}`,
                                        onClick: () => {
                                            const check = typeof window.checkCanPerformSynchro === 'function' ? window.checkCanPerformSynchro(c) : { canSynchro: false, reason: 'Función de Sincronía no disponible.' };
                                            if (!check.canSynchro) {
                                                const alertFunc = (typeof showRuleAlert === 'function') ? showRuleAlert : alert;
                                                alertFunc(check.reason || `⚠️ [Sincronía] No tienes los materiales necesarios en tu campo para invocar a "${c.name}".`);
                                                return;
                                            }
                                            closeGraveyardModal();
                                            if (typeof window.openSynchroModal === 'function') {
                                                window.openSynchroModal(c, check.combinations);
                                            }
                                        }
                                    });
                                } else if (isFusion) {
                                    if (isContact) {
                                        actions.push({
                                            label: `⚡ Invocar por Contacto: ${c.name}`,
                                            onClick: () => {
                                                const check = typeof window.checkCanPerformFusion === 'function' ? window.checkCanPerformFusion(false, true) : (typeof checkCanPerformFusion === 'function' ? checkCanPerformFusion(false, true) : { canFusion: false });
                                                const matchedCandidate = check.availableFusions && check.availableFusions.filter(f => Number(f.fusionCard.id || f.fusionCard.card_id) === numId);
                                                if (!check.canFusion || !matchedCandidate || matchedCandidate.length === 0) {
                                                    const alertFunc = (typeof showRuleAlert === 'function') ? showRuleAlert : alert;
                                                    alertFunc(`⚠️ [Invocación por Contacto] No controlas todos los monstruos de material requeridos en tu campo para invocar a "${c.name}".`);
                                                    return;
                                                }
                                                closeGraveyardModal();
                                                if (typeof window.openFusionModal === 'function') {
                                                    window.openFusionModal(matchedCandidate, false, true);
                                                }
                                            }
                                        });
                                    }

                                    actions.push({
                                        label: `🌀 Invocar por Fusión: ${c.name}`,
                                        onClick: () => {
                                            const check = typeof window.checkCanPerformFusion === 'function' ? window.checkCanPerformFusion() : (typeof checkCanPerformFusion === 'function' ? checkCanPerformFusion() : { canFusion: false });
                                            if (!check.canFusion) {
                                                const alertFunc = (typeof showRuleAlert === 'function') ? showRuleAlert : alert;
                                                alertFunc(check.reason || `⚠️ [Fusión] No tienes los materiales necesarios en tu mano o campo para invocar a "${c.name}".`);
                                                return;
                                            }
                                            const matchedCandidate = check.availableFusions && check.availableFusions.filter(f => Number(f.fusionCard.id || f.fusionCard.card_id) === numId);
                                            if (!matchedCandidate || matchedCandidate.length === 0) {
                                                const alertFunc = (typeof showRuleAlert === 'function') ? showRuleAlert : alert;
                                                alertFunc(`⚠️ [Fusión] No tienes los materiales específicos requeridos en tu mano o campo para invocar a "${c.name}".`);
                                                return;
                                            }
                                            closeGraveyardModal();
                                            if (typeof window.openFusionModal === 'function') {
                                                window.openFusionModal(matchedCandidate, matchedCandidate[0].isFusionGate, matchedCandidate[0].isContactFusion);
                                            }
                                        }
                                    });
                                }
                            }

                            actions.push({
                                label: 'ℹ️ Info Carta',
                                onClick: () => {
                                    const infoFunc = (typeof showCardInfoFloating === 'function') ? showCardInfoFloating : (typeof window.showCardInfoFloating === 'function' ? window.showCardInfoFloating : null);
                                    if (infoFunc) {
                                        infoFunc(c || cId);
                                    }
                                }
                            });
                            ctxFunc(e, c.name || 'Extra Deck', actions);
                        }
                    };
                    grid.appendChild(cardDiv);
                });

                // Cargar inmediatamente la primera carta del Extra Deck en el inspector lateral izquierdo
                inspectCardDirectly(extraCards[0]);
            }

            if (modal) modal.style.display = 'flex';
        }

        function closeGraveyardModal() {
            const modal = document.getElementById('gy-inspector-modal');
            if (modal) modal.style.display = 'none';
        }

        // =========================================================================
        // CONTROL DEL MODAL DE EDICIÓN DE NICK DE USUARIO (MÁX 15 CAR., 1 PALABRA)
        // =========================================================================
        function openEditNickModal() {
            const modal = document.getElementById('edit-nick-modal');
            const input = document.getElementById('editNickInput');
            const alertBox = document.getElementById('edit-nick-alert');
            const countElem = document.getElementById('editNickCharCount');
            if (!modal || !input) return;

            const currentNick = currentUser ? currentUser.username : (document.getElementById('player-name-val')?.textContent?.trim() || '');
            const cleanCurrent = currentNick.replace(/^[\uD800-\uDBFF][\uDC00-\uDFFF]\s*/, '').trim();
            input.value = cleanCurrent;
            if (countElem) countElem.textContent = `${cleanCurrent.length}/15`;
            if (alertBox) alertBox.style.display = 'none';

            modal.style.display = 'flex';
            setTimeout(() => { input.focus(); input.select(); }, 50);
        }

        function closeEditNickModal() {
            const modal = document.getElementById('edit-nick-modal');
            if (modal) modal.style.display = 'none';
        }

        function onEditNickInputChanged(input) {
            if (/\s/.test(input.value)) {
                input.value = input.value.replace(/\s+/g, '');
            }
            const countElem = document.getElementById('editNickCharCount');
            if (countElem) {
                countElem.textContent = `${input.value.length}/15`;
                countElem.style.color = input.value.length > 15 ? '#ff4757' : (input.value.length === 15 ? 'var(--accent-gold)' : '#888');
            }
        }

        async function saveEditedNick() {
            const input = document.getElementById('editNickInput');
            const btnSave = document.getElementById('btn-save-nick');
            if (!input) return;

            const newNick = input.value.trim();

            if (!newNick || newNick.length < 3 || newNick.length > 15) {
                showEditNickAlert('El nick debe tener entre 3 y 15 caracteres (máximo 15).', true);
                return;
            }

            if (/\s/.test(newNick) || newNick.split(/\s+/).length > 1) {
                showEditNickAlert('El nick debe ser una sola palabra, no se permiten espacios en blanco.', true);
                return;
            }

            const validNickRegex = /^[a-zA-Z0-9_.-]+$/;
            if (!validNickRegex.test(newNick)) {
                showEditNickAlert('El nick solo puede contener caracteres alfanuméricos, guiones o puntos.', true);
                return;
            }

            if (btnSave) {
                btnSave.disabled = true;
                btnSave.textContent = 'GUARDANDO...';
            }

            try {
                const payload = {
                    userId: currentUser ? currentUser.id : null,
                    currentUsername: currentUser ? currentUser.username : 'Admin',
                    newUsername: newNick
                };

                const res = await fetch('/api/user/update-nick', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();

                if (!res.ok || !data.success) {
                    showEditNickAlert(data.message || 'No se pudo actualizar el nick.', true);
                    if (btnSave) {
                        btnSave.disabled = false;
                        btnSave.textContent = 'GUARDAR CAMBIOS';
                    }
                    return;
                }

                if (currentUser) {
                    currentUser.username = data.username;
                }

                const flag = (currentUser && currentUser.flagEmoji) ? (currentUser.flagEmoji + ' ') : '';
                const playerNameElem = document.getElementById('player-name-val');
                if (playerNameElem) {
                    playerNameElem.textContent = `${flag}${data.username}`;
                }

                if (window.socket) {
                    window.socket.emit('USER_IDENTIFY', {
                        username: data.username,
                        userId: currentUser ? currentUser.id : null,
                        countryIsoCode: currentUser ? currentUser.countryIsoCode : null
                    });
                }

                showEditNickAlert(data.message || '¡Nick actualizado con éxito!', false);

                setTimeout(() => {
                    closeEditNickModal();
                    if (btnSave) {
                        btnSave.disabled = false;
                        btnSave.textContent = 'GUARDAR CAMBIOS';
                    }
                }, 1000);

            } catch (err) {
                console.error("Error al actualizar nick:", err);
                showEditNickAlert('Error de comunicación con el servidor.', true);
                if (btnSave) {
                    btnSave.disabled = false;
                    btnSave.textContent = 'GUARDAR CAMBIOS';
                }
            }
        }

        function showEditNickAlert(message, isError = true) {
            const alertBox = document.getElementById('edit-nick-alert');
            if (!alertBox) return;
            alertBox.style.display = 'block';
            alertBox.style.background = isError ? 'rgba(255, 71, 87, 0.15)' : 'rgba(46, 213, 115, 0.15)';
            alertBox.style.border = isError ? '1px solid #ff4757' : '1px solid #2ed573';
            alertBox.style.color = isError ? '#ff6b81' : '#2ed573';
            alertBox.innerHTML = (isError ? '⚠️ ' : '✅ ') + message;
        }

        // Cerrar visor flotante o modal de nick al presionar tecla Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeGraveyardModal();
                closeEditNickModal();
            }
        });

        const uiLogSocket = (typeof getActiveSocket === 'function') ? getActiveSocket() : (window.getSocket ? window.getSocket() : (window.socket || (typeof socket !== 'undefined' ? socket : null)));
        if (uiLogSocket) {
            uiLogSocket.on('OCG_EVENT_LOG', (log) => {
                const container = document.getElementById('duel-event-log');
                if (container) {
                    const div = document.createElement('div');
                    div.className = `log-item ${log.type || 'info'}`;
                    div.textContent = log.message;
                    // SIEMPRE EL ÚLTIMO MOVIMIENTO DE PRIMERAS (PREPEND)
                    container.prepend(div);
                }

                if (window.SoundManager && typeof window.SoundManager.playSFX === 'function') {
                    const msg = (log && log.message ? log.message : '').toLowerCase();
                    if (msg.includes('invoc') || msg.includes('summon')) {
                        if (msg.includes('especial') || msg.includes('special')) window.SoundManager.playSFX('summon_special');
                        else if (msg.includes('fusión') || msg.includes('fusion')) window.SoundManager.playSFX('summon_fusion');
                        else if (msg.includes('sincronía') || msg.includes('synchro')) window.SoundManager.playSFX('summon_synchro');
                        else window.SoundManager.playSFX('summon_normal');
                    } else if (msg.includes('activa') || msg.includes('activate')) {
                        window.SoundManager.playSFX('activate');
                    } else if (msg.includes('coloca') || msg.includes('set')) {
                        window.SoundManager.playSFX('set_card');
                    } else if (msg.includes('ataca') || msg.includes('attack')) {
                        if (msg.includes('directo') || msg.includes('direct')) window.SoundManager.playSFX('direct_attack');
                        else window.SoundManager.playSFX('attack');
                    } else if (msg.includes('destru') || msg.includes('destroy')) {
                        window.SoundManager.playSFX('destroy');
                    } else if (msg.includes('roba') || msg.includes('draw')) {
                        window.SoundManager.playSFX('draw');
                    } else if (msg.includes('cadena') || msg.includes('chain')) {
                        window.SoundManager.playSFX('chain');
                    } else if (msg.includes('baraja') || msg.includes('shuffle')) {
                        window.SoundManager.playSFX('shuffle');
                    } else if (msg.includes('destierra') || msg.includes('banish')) {
                        window.SoundManager.playSFX('banish');
                    } else if (msg.includes('equipa') || msg.includes('equip')) {
                        window.SoundManager.playSFX('equip');
                    }
                }
            });
        }

        function promptSurrender() {
            const modal = document.getElementById('surrender-modal');
            if (modal) modal.style.display = 'flex';
        }

        function closeSurrenderModal() {
            const modal = document.getElementById('surrender-modal');
            if (modal) modal.style.display = 'none';
        }

        function confirmSurrender() {
            closeSurrenderModal();
            const myUsername = (window.currentUser && window.currentUser.username) 
                || (window.Session && window.Session.getUser() && window.Session.getUser().username) 
                || 'Admin';
            const activeSocket = (typeof getActiveSocket === 'function') ? getActiveSocket() : (window.getSocket ? window.getSocket() : (window.socket || socket));
            const roomId = (typeof window.getActiveDuelRoomId === 'function') 
                ? window.getActiveDuelRoomId() 
                : (window.currentPvpRoomId || (typeof currentPvpRoomId !== 'undefined' ? currentPvpRoomId : 'ROOM_DEMO'));

            if (activeSocket) {
                activeSocket.emit('SURRENDER', {
                    room_id: roomId,
                    player_name: myUsername,
                    action_type: 'SURRENDER'
                });
            }

            // Fallback: Si el servidor tarda o no responde, desplegar la modal de fin de duelo
            setTimeout(() => {
                const gameOverModal = document.getElementById('game-over-modal');
                if (gameOverModal && gameOverModal.style.display !== 'flex') {
                    const rivalName = (lastDuelState && lastDuelState.player2 && lastDuelState.player2.username) || 'NPC Yugi Muto';
                    if (typeof showGameOverModal === 'function') {
                        showGameOverModal({
                            winner: rivalName,
                            loser: myUsername,
                            reason: 'SURRENDER',
                            rewards: null
                        });
                    }
                }
            }, 350);
        }

        function toggleDuelEventLog() {
            const win = document.getElementById('duel-event-log-window') || document.getElementById('duel-event-log-drawer');
            if (!win) return;
            if (win.style.display === 'flex') {
                win.style.display = 'none';
            } else {
                win.style.display = 'flex';
                const handle = document.getElementById('floating-log-drag-handle');
                if (handle && typeof makeElementDraggable === 'function') {
                    makeElementDraggable(handle, win);
                }
            }
        }
        window.toggleDuelEventLog = toggleDuelEventLog;

        /**
         * Botón / Función de Inyección y Reporte Rápido de Errores en Duelos
         */
        function reportDuelBug(customNote) {
            if (customNote && typeof customNote === 'string') {
                _sendDuelBugReport(customNote);
                return;
            }

            let existingModal = document.getElementById('duel-bug-report-modal');
            if (existingModal) {
                existingModal.remove();
            }

            const modalHtml = `
                <div id="duel-bug-report-modal" style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.75); z-index:999999; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px); font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                    <div style="background:#111827; border:1px solid #ef4444; border-radius:10px; width:90%; max-width:440px; padding:18px 20px; box-shadow:0 0 25px rgba(239,68,68,0.4); color:#f3f4f6;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                            <div style="font-size:14px; font-weight:bold; color:#f87171; display:flex; align-items:center; gap:6px;">
                                <span>🐛</span> <span>Reportar Incidencia en Duelo</span>
                            </div>
                            <button id="btn-close-bug-modal" style="background:transparent; border:none; color:#9ca3af; font-size:18px; cursor:pointer; line-height:1;">✕</button>
                        </div>
                        <p style="font-size:11.5px; color:#9ca3af; margin:0 0 10px 0; line-height:1.4;">
                            Describe brevemente el error observado. Este reporte se registrará en el log oficial sin interrumpir la conexión del duelo:
                        </p>
                        <textarea id="bug-report-textarea" rows="3" placeholder="Ej: La carta de magia Stop Defense no activó su efecto..." style="width:100%; box-sizing:border-box; background:#1f2937; border:1px solid #374151; border-radius:6px; color:#fff; padding:8px 10px; font-size:12px; resize:none; outline:none; margin-bottom:12px;"></textarea>
                        <div style="display:flex; justify-content:flex-end; gap:8px;">
                            <button id="btn-cancel-bug-report" style="background:#374151; color:#d1d5db; border:none; border-radius:5px; padding:6px 14px; font-size:11.5px; cursor:pointer; font-weight:600;">Cancelar</button>
                            <button id="btn-submit-bug-report" style="background:linear-gradient(135deg, #ef4444, #dc2626); color:#fff; border:none; border-radius:5px; padding:6px 16px; font-size:11.5px; cursor:pointer; font-weight:bold; box-shadow:0 0 10px rgba(239,68,68,0.5);">Enviar Reporte</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);

            const modalElem = document.getElementById('duel-bug-report-modal');
            const textarea = document.getElementById('bug-report-textarea');
            const submitBtn = document.getElementById('btn-submit-bug-report');
            const cancelBtn = document.getElementById('btn-cancel-bug-report');
            const closeBtn = document.getElementById('btn-close-bug-modal');

            if (textarea) textarea.focus();

            const closeModal = () => {
                if (modalElem) modalElem.remove();
            };

            if (cancelBtn) cancelBtn.onclick = closeModal;
            if (closeBtn) closeBtn.onclick = closeModal;

            if (submitBtn) {
                submitBtn.onclick = () => {
                    const text = textarea ? textarea.value.trim() : '';
                    if (!text) {
                        if (typeof showRuleAlert === 'function') showRuleAlert('⚠️ Por favor escribe una breve descripción del error.');
                        return;
                    }
                    closeModal();
                    _sendDuelBugReport(text);
                };
            }
        }

        function _sendDuelBugReport(note) {
            const myUsername = (window.currentUser && window.currentUser.username) 
                || (window.Session && window.Session.getUser() && window.Session.getUser().username) 
                || 'Admin';
            const activeSocket = window.getSocket ? window.getSocket() : (window.socket || (typeof socket !== 'undefined' ? socket : null));
            const roomId = (typeof window.getActiveDuelRoomId === 'function') 
                ? window.getActiveDuelRoomId() 
                : (window.currentPvpRoomId || (typeof currentPvpRoomId !== 'undefined' ? currentPvpRoomId : 'ROOM_DEMO'));

            let targetCardId = window.selectedHandCardId || null;
            let targetCardName = null;
            if (window.lastDuelState && window.lastDuelState.lastPlayedCard) {
                targetCardId = targetCardId || window.lastDuelState.lastPlayedCard.id;
                targetCardName = window.lastDuelState.lastPlayedCard.name;
            }

            if (activeSocket) {
                activeSocket.emit('REPORT_DUEL_BUG', {
                    room_id: roomId,
                    player_name: myUsername,
                    description: note,
                    card_id: targetCardId,
                    card_name: targetCardName
                });
            }
            if (typeof showDuelNotification === 'function') {
                showDuelNotification(`🚨 Error registrado en el log del duelo y enviado para auditoría técnica.`, 'info');
            }
        }
        window.reportDuelBug = reportDuelBug;

        let _lastDisplayedPhase = null;
        let _lastDisplayedTurnPlayer = null;

        function triggerPhaseTransitionBanner(phase, turnPlayer, isMyTurn) {
            if (!phase) return;
            const banner = document.getElementById('phase-transition-overlay');
            const blade = document.getElementById('phase-slash-blade');
            const titleEl = document.getElementById('phase-slash-title');
            const turnEl = document.getElementById('phase-slash-turn-badge');
            const subEl = document.getElementById('phase-slash-sub');
            if (!banner || !blade || !titleEl) return;

            const titles = {
                'DRAW': 'DRAW PHASE',
                'STANDBY': 'STANDBY PHASE',
                'MAIN_1': 'MAIN PHASE 1',
                'BATTLE': 'BATTLE PHASE',
                'MAIN_2': 'MAIN PHASE 2',
                'END': 'END PHASE'
            };

            titleEl.textContent = titles[phase] || `${phase} PHASE`;
            if (turnEl) turnEl.style.display = 'none';
            if (subEl) subEl.style.display = 'none';

            // Azul para todas las fases del jugador, Rojo para todas las fases del rival (NPC o PvP)
            const sideClass = isMyTurn ? 'phase-side-player' : 'phase-side-rival';
            blade.classList.remove('phase-slash-active');
            blade.className = `phase-slash-blade ${sideClass}`;
            banner.style.display = 'flex';
            void blade.offsetWidth; // Reiniciar reflow para animación CSS
            blade.classList.add('phase-slash-active');

            // NOTA: Cero sonido entre fases (silencio solicitado por el usuario)

            if (window._phaseBannerTimer) clearTimeout(window._phaseBannerTimer);
            window._phaseBannerTimer = setTimeout(() => {
                banner.style.display = 'none';
                blade.classList.remove('phase-slash-active');
            }, 1180);
        }

        function updatePhaseUI(phase, turnPlayer, turnNumber) {
            const PHASES_ORDER = ['DRAW', 'STANDBY', 'MAIN_1', 'BATTLE', 'MAIN_2', 'END'];
            
            // Resolución precisa de identidad del jugador local y pertenencia del turno
            const userObj = (window.currentUser) 
                || (window.Session && typeof window.Session.getUser === 'function' ? window.Session.getUser() : null)
                || (typeof currentUser !== 'undefined' ? currentUser : null);
            const myUsername = (userObj && userObj.username) 
                ? userObj.username 
                : (window.localPlayerRoleKey === 'player2' ? (lastDuelState?.player2?.username || 'Player2') : (lastDuelState?.player1?.username || 'Player1'));

            const turnPlayerStr = String(turnPlayer || '').trim().toLowerCase();
            const myUserStr = String(myUsername || '').trim().toLowerCase();
            const localRoleUser = (lastDuelState && window.localPlayerRoleKey && lastDuelState[window.localPlayerRoleKey]?.username) ? lastDuelState[window.localPlayerRoleKey].username.toLowerCase() : '';

            const isMyTurn = Boolean(turnPlayerStr && (
                (myUserStr && turnPlayerStr === myUserStr) || 
                (localRoleUser && turnPlayerStr === localRoleUser) ||
                turnPlayerStr === 'player' || 
                (turnPlayerStr === 'player1' && window.localPlayerRoleKey !== 'player2') ||
                (window.localPlayerRoleKey && turnPlayerStr === window.localPlayerRoleKey.toLowerCase())
            ));

            const isTurnChange = (_lastDisplayedTurnPlayer !== null && _lastDisplayedTurnPlayer !== turnPlayer);
            const isPhaseChange = (_lastDisplayedPhase !== phase);

            if (isPhaseChange || isTurnChange) {
                const isFirst = (_lastDisplayedPhase === null);
                _lastDisplayedPhase = phase;
                _lastDisplayedTurnPlayer = turnPlayer;

                // El banner visual entre fases SIEMPRE se muestra perfectamente sincronizado
                triggerPhaseTransitionBanner(phase, turnPlayer, isMyTurn);

                // ¡EL SONIDO ÚNICAMENTE SE REPRODUCE CUANDO CAMBIA EL TURNO!
                if (!isFirst && isTurnChange && window.SoundManager && typeof window.SoundManager.playSFX === 'function') {
                    window.SoundManager.playSFX('turn_change');
                }
            }

            const currentIdx = PHASES_ORDER.indexOf(phase);

            const pTracker = document.getElementById('player-phase-tracker');
            const rTracker = document.getElementById('rival-phase-tracker');

            if (pTracker && rTracker) {
                if (isMyTurn) {
                    pTracker.classList.remove('tracker-disabled');
                    rTracker.classList.add('tracker-disabled');
                } else {
                    pTracker.classList.add('tracker-disabled');
                    rTracker.classList.remove('tracker-disabled');
                }
            }

            PHASES_ORDER.forEach((p, idx) => {
                // 1. Botones de Fases del Jugador (FASES)
                const btnP = document.getElementById(`phase-btn-p-${p}`);
                if (btnP) {
                    btnP.classList.remove('active-phase', 'phase-disabled', 'phase-available');
                    if (!isMyTurn) {
                        btnP.style.pointerEvents = 'none';
                        if (p === phase) btnP.classList.add('active-phase');
                        else btnP.classList.add('phase-disabled');
                    } else {
                        if (idx < currentIdx) {
                            btnP.classList.add('phase-disabled');
                            btnP.style.pointerEvents = 'none';
                        } else if (idx === currentIdx) {
                            btnP.classList.add('active-phase');
                            btnP.style.pointerEvents = 'none';
                        } else {
                            if (phase === 'MAIN_1' && p === 'MAIN_2') {
                                btnP.classList.add('phase-disabled');
                                btnP.style.pointerEvents = 'none';
                                btnP.title = 'No puedes entrar a Main Phase 2 sin pasar por Battle Phase';
                            } else if (p === 'BATTLE' && turnNumber === 1) {
                                btnP.classList.add('phase-disabled');
                                btnP.style.pointerEvents = 'none';
                                btnP.title = '🚫 No disponible en Turno 1 (Regla Oficial Konami: El 1er jugador no ataca)';
                            } else {
                                btnP.classList.add('phase-available');
                                btnP.style.pointerEvents = 'auto';
                                btnP.title = '';
                            }
                        }
                    }
                }

                // 2. Indicadores de Fases del Rival (RIVAL)
                const btnR = document.getElementById(`phase-btn-r-${p}`);
                if (btnR) {
                    btnR.classList.remove('active-phase', 'phase-disabled');
                    if (!isMyTurn && p === phase) {
                        btnR.classList.add('active-phase');
                    } else {
                        btnR.classList.add('phase-disabled');
                    }
                }

                // Compatibilidad con items anteriores
                const legacyItem = document.getElementById(`phase-item-${p}`);
                if (legacyItem) {
                    legacyItem.classList.remove('active-phase', 'phase-disabled', 'phase-available');
                    if (p === phase) legacyItem.classList.add('active-phase');
                    else legacyItem.classList.add('phase-disabled');
                }
            });
        }

        function advanceToPhase(targetPhase) {
            // Cero sonido al cambiar de fase por botón
            if (lastDuelState) {
                lastDuelState.phase = targetPhase;
                window.lastDuelState = lastDuelState;
                if (typeof updatePhasesIndicator === 'function') {
                    updatePhasesIndicator(lastDuelState);
                }
            }

            const roomId = (typeof window.getActiveDuelRoomId === 'function') 
                ? window.getActiveDuelRoomId() 
                : ((typeof currentPvpRoomId !== 'undefined' && currentPvpRoomId) ? currentPvpRoomId : (lastDuelState?.roomId || 'ROOM_DEMO'));

            const activeSocket = (typeof getActiveSocket === 'function') ? getActiveSocket() : (window.getSocket ? window.getSocket() : (window.socket || (typeof socket !== 'undefined' ? socket : null)));
            if (activeSocket) {
                activeSocket.emit('CMD_ACTION', {
                    room_id: roomId,
                    action_type: 'SET_PHASE',
                    target_phase: targetPhase
                });
            }
        }

        function attemptPhaseChange(clickedPhase) {
            if (!lastDuelState) return;
            const isMyTurn = (typeof isPlayerTurnActive === 'function') ? isPlayerTurnActive() : true;

            if (!isMyTurn) {
                showRuleAlert('⚠️ No es tu turno. Espera a que el oponente finalice su turno.');
                return;
            }
            const current = lastDuelState.phase;
            if (current === clickedPhase) return;

            // Regla oficial Konami: El primer jugador NO puede entrar a Battle Phase en el Turno 1
            if (clickedPhase === 'BATTLE' && lastDuelState.turnNumber === 1) {
                showRuleAlert('⚠️ [Regla Oficial Konami] El primer jugador no puede entrar a la Battle Phase ni declarar ataques en el Turno 1.');
                return;
            }

            const PHASES_ORDER = ['DRAW', 'STANDBY', 'MAIN_1', 'BATTLE', 'MAIN_2', 'END'];
            const currentIdx = PHASES_ORDER.indexOf(current);
            const targetIdx = PHASES_ORDER.indexOf(clickedPhase);

            // Regla oficial: Fases anteriores ya concluyeron en este turno
            if (targetIdx < currentIdx) {
                showRuleAlert(`⚠️ [Regla Oficial] Las fases anteriores ya concluyeron en este turno. No puedes retroceder.`);
                return;
            }

            // Validar salto ilegal a Main Phase 2 sin combate
            if (current === 'MAIN_1' && clickedPhase === 'MAIN_2') {
                showRuleAlert('⚠️ [Regla Oficial] No puedes entrar a Main Phase 2 sin haber entrado a la Battle Phase.');
                return;
            }

            if (clickedPhase === 'END') {
                showRuleAlert('⏱️ Entrando a End Phase. Validando límite de mano y finalizando turno...');
            }

            advanceToPhase(clickedPhase);
        }

        // =========================================================================
        // MOTOR DE ANIMACIÓN FLUIDA DE LIFE POINTS (LP)
        // =========================================================================
        window._displayedLpMap = window._displayedLpMap || {};

        function spawnLpDelta(elem, diff, isDamage) {
            if (!elem || diff <= 0) return;
            const container = elem.closest('.board-lp-box') || elem.parentElement || elem;
            const delta = document.createElement('div');
            delta.className = `lp-delta-float ${isDamage ? 'lp-damage' : 'lp-heal'}`;
            delta.textContent = (isDamage ? '-' : '+') + diff;
            container.appendChild(delta);

            container.classList.remove('lp-box-shock-damage', 'lp-box-shock-heal');
            void container.offsetWidth;
            container.classList.add(isDamage ? 'lp-box-shock-damage' : 'lp-box-shock-heal');

            setTimeout(() => {
                if (delta.parentNode) delta.parentNode.removeChild(delta);
                container.classList.remove('lp-box-shock-damage', 'lp-box-shock-heal');
            }, 1250);
        }

        function animateLifePoints(elemId, targetLp) {
            const elem = document.getElementById(elemId);
            if (!elem) return;

            targetLp = Math.max(0, parseInt(targetLp, 10) || 0);
            const prevLp = window._displayedLpMap[elemId] !== undefined 
                ? window._displayedLpMap[elemId] 
                : (parseInt(elem.textContent, 10) || targetLp);

            window._displayedLpMap[elemId] = targetLp;

            if (prevLp === targetLp) {
                elem.textContent = targetLp;
                return;
            }

            const isDamage = targetLp < prevLp;
            const diff = Math.abs(targetLp - prevLp);
            spawnLpDelta(elem, diff, isDamage);

            elem.classList.remove('lp-damage-pulse', 'lp-heal-pulse');
            void elem.offsetWidth; // Trigger reflow
            if (isDamage) {
                elem.classList.add('lp-damage-pulse');
                if (window.SoundManager && typeof window.SoundManager.playSFX === 'function') {
                    window.SoundManager.playSFX('damage');
                }
            } else {
                elem.classList.add('lp-heal-pulse');
                if (window.SoundManager && typeof window.SoundManager.playSFX === 'function') {
                    window.SoundManager.playSFX('heal');
                }
            }

            const duration = 650;
            const startTime = performance.now();

            function step(now) {
                const elapsed = now - startTime;
                const progress = Math.min(1, elapsed / duration);
                const ease = 1 - Math.pow(1 - progress, 2);
                const current = Math.round(isDamage ? (prevLp - diff * ease) : (prevLp + diff * ease));
                elem.textContent = current;

                if (progress < 1) {
                    requestAnimationFrame(step);
                } else {
                    elem.textContent = targetLp;
                    setTimeout(() => elem.classList.remove('lp-damage-pulse', 'lp-heal-pulse'), 200);
                }
            }
            requestAnimationFrame(step);
        }

        // =========================================================================
        // SINCRONIZACIÓN TOTAL DEL ESTADO DEL DUELO (PERSPECTIVA LOCAL KONAMI)
        // =========================================================================
        function bindDuelUiSocketEvents() {
            const stateSocket = getActiveSocket();
            if (!stateSocket) {
                setTimeout(bindDuelUiSocketEvents, 200);
                return;
            }
            stateSocket.off('DUEL_STATE_UPDATE');
            stateSocket.on('DUEL_STATE_UPDATE', (state) => {
                if (!state) return;
                lastDuelState = state;
                window.lastDuelState = state;

                // Garantizar que el campo de duelo esté visible y la modal de dados cerrada
                const duelApp = document.getElementById('duel-app');
                if (duelApp) duelApp.style.display = 'flex';

                const diceModal = document.getElementById('dice-roll-modal');
                if (diceModal) diceModal.style.display = 'none';

            // Determinar perspectiva: El jugador frente al dispositivo SIEMPRE es local (Mitad Inferior)
            const myUsername = (window.currentUser && window.currentUser.username) 
                || (window.Session && window.Session.getUser() && window.Session.getUser().username) 
                || 'Admin';

            const isP2 = Boolean(state.player2 && state.player2.username && myUsername && state.player2.username.toLowerCase() === myUsername.toLowerCase());
            const localKey = isP2 ? 'player2' : 'player1';
            const rivalKey = isP2 ? 'player1' : 'player2';

            const local = state[localKey] || state.player1;
            const rival = state[rivalKey] || state.player2;

            if (state.isGameOver && typeof showGameOverModal === 'function') {
                let resolvedWinner = state.winner;
                let resolvedLoser = state.loser;
                if (!resolvedWinner) {
                    if (local && rival) {
                        if (Number(local.lp) > 0 && Number(rival.lp) <= 0) {
                            resolvedWinner = local.username;
                            resolvedLoser = rival.username;
                        } else if (Number(local.lp) <= 0 && Number(rival.lp) > 0) {
                            resolvedWinner = rival.username;
                            resolvedLoser = local.username;
                        } else {
                            resolvedWinner = local.username;
                            resolvedLoser = rival.username;
                        }
                    } else {
                        resolvedWinner = (state.player1 ? state.player1.username : myUsername);
                        resolvedLoser = (state.player2 ? state.player2.username : 'Rival');
                    }
                }
                showGameOverModal({
                    winner: resolvedWinner,
                    loser: resolvedLoser || (resolvedWinner === local?.username ? rival?.username : local?.username),
                    reason: state.gameOverReason || 'FIN_DUELO',
                    rewards: state.rewards || null
                });
            }

            window.localPlayerRoleKey = localKey;
            window.rivalPlayerRoleKey = rivalKey;

            // Sincronizar cosméticos activos (Tapetes y Fundas de Jugador Local y Rival)
            if (window.DuelCosmetics) {
                window.DuelCosmetics.initCosmetics(local, rival);
            }

            // 1. Life Points y Nombres con animación fluida
            if (local && local.lp !== undefined) {
                animateLifePoints('player-lp', local.lp);
            }
            if (rival && rival.lp !== undefined) {
                animateLifePoints('rival-lp', rival.lp);
            }

            // Clímax dinámico de música de duelo según LP
            if (window.SoundManager && typeof window.SoundManager.checkDuelClimax === 'function' && local && rival && local.lp !== undefined && rival.lp !== undefined) {
                window.SoundManager.checkDuelClimax(local.lp, rival.lp);
            }

            const pNameElem = document.getElementById('player-name-val');
            if (pNameElem && local && local.username) {
                pNameElem.textContent = local.username;
            }
            const rNameElem = document.getElementById('board-rival-name');
            if (rNameElem && rival && rival.username) {
                rNameElem.textContent = rival.username;
            }
            const deckLbl = document.getElementById('deck-count-lbl');
            if (deckLbl) deckLbl.textContent = `${local.mainDeckCount} / 40`;
            
            // 2. Actualizar Control de Fases OCG / TCG
            updatePhaseUI(state.phase, state.turnPlayer, state.turnNumber);

            // 3. Contadores en Pilas de Cartas (Deck, Extra, GY) & Portada Superior Oficial
            const pDeckCounter = document.getElementById('p-deck-counter');
            if (pDeckCounter) pDeckCounter.textContent = `${local.mainDeckCount}`;

            const rDeckCounter = document.getElementById('r-deck-counter');
            if (rDeckCounter) rDeckCounter.textContent = `${rival.mainDeckCount}`;

            // COMPROBACIÓN DE SINCRONÍA DISPONIBLE: ILUMINACIÓN DEL EXTRA DECK
            function checkAnySynchroAvailable(pLocal, dState) {
                if (!pLocal || !pLocal.extraDeck || pLocal.extraDeck.length === 0) return false;
                const ph = (dState && dState.phase ? dState.phase : 'MAIN_1').toUpperCase();
                const isMain = ph.includes('MAIN') || ph === 'M1' || ph === 'M2';
                if (!isMain) return false;

                const isMyTurn = typeof isPlayerTurnActive === 'function' ? isPlayerTurnActive() : true;
                if (!isMyTurn) return false;

                const synchroFunc = (typeof checkCanPerformSynchro === 'function') ? checkCanPerformSynchro : (typeof window.checkCanPerformSynchro === 'function' ? window.checkCanPerformSynchro : null);
                if (!synchroFunc) return false;

                for (const card of pLocal.extraDeck) {
                    const cd = card.card_data || card;
                    const monType = ((cd && cd.type) || card.type || '').toLowerCase();
                    const isSynchro = Boolean(monType.includes('synchro') || (cd.typeCode && (cd.typeCode & 0x2000)));
                    if (isSynchro) {
                        const check = synchroFunc(card);
                        if (check && check.canSynchro) return true;
                    }
                }
                return false;
            }

            // Extra Deck Jugador Local
            const pExtraCount = (local.extraDeckCount !== undefined) ? local.extraDeckCount : (local.extraDeck ? local.extraDeck.length : 0);
            const pExtraSlot = document.getElementById('p-extra');
            const pExtraCounter = document.getElementById('p-extra-counter');
            if (pExtraCounter) {
                pExtraCounter.textContent = `${pExtraCount}`;
                pExtraCounter.style.display = pExtraCount > 0 ? 'block' : 'none';
            }
            if (pExtraSlot) {
                const sleeve = pExtraSlot.querySelector('.card-sleeve');
                const icon = pExtraSlot.querySelector('.slot-zone-icon');
                const synchroReady = checkAnySynchroAvailable(local, state);

                if (synchroReady) {
                    pExtraSlot.classList.add('synchro-ready-glow');
                    let synchroBadge = pExtraSlot.querySelector('.synchro-ready-badge');
                    if (!synchroBadge) {
                        synchroBadge = document.createElement('div');
                        synchroBadge.className = 'synchro-ready-badge';
                        synchroBadge.textContent = '⚡ SINCRONÍA DISPONIBLE';
                        pExtraSlot.appendChild(synchroBadge);
                    }
                    synchroBadge.style.display = 'block';
                } else {
                    pExtraSlot.classList.remove('synchro-ready-glow');
                    const synchroBadge = pExtraSlot.querySelector('.synchro-ready-badge');
                    if (synchroBadge) synchroBadge.style.display = 'none';
                }

                if (pExtraCount > 0) {
                    pExtraSlot.classList.add('has-card');
                    pExtraSlot.classList.remove('empty-stack');
                    if (sleeve) sleeve.style.display = 'block';
                    if (icon) icon.style.display = 'none';
                } else {
                    pExtraSlot.classList.remove('has-card');
                    pExtraSlot.classList.add('empty-stack');
                    if (sleeve) sleeve.style.display = 'none';
                    if (icon) icon.style.display = 'block';
                }
            }

            // Extra Deck Rival
            const rExtraCount = (rival.extraDeckCount !== undefined) ? rival.extraDeckCount : (rival.extraDeck ? rival.extraDeck.length : 0);
            const rExtraSlot = document.getElementById('r-extra');
            const rExtraCounter = document.getElementById('r-extra-counter');
            if (rExtraCounter) {
                rExtraCounter.textContent = `${rExtraCount}`;
                rExtraCounter.style.display = rExtraCount > 0 ? 'block' : 'none';
            }
            if (rExtraSlot) {
                const sleeve = rExtraSlot.querySelector('.card-sleeve');
                const icon = rExtraSlot.querySelector('.slot-zone-icon');
                if (rExtraCount > 0) {
                    rExtraSlot.classList.add('has-card');
                    rExtraSlot.classList.remove('empty-stack');
                    if (sleeve) sleeve.style.display = 'block';
                    if (icon) icon.style.display = 'none';
                } else {
                    rExtraSlot.classList.remove('has-card');
                    rExtraSlot.classList.add('empty-stack');
                    if (sleeve) sleeve.style.display = 'none';
                    if (icon) icon.style.display = 'block';
                }
            }

            // Top Card y Contador en Cementerio y Desierto (Jugador Local)
            const pGyCards = local.graveyard || [];
            const pGySlot = document.getElementById('p-gy');
            const pGyBadge = document.getElementById('p-gy-counter');
            if (pGyBadge) {
                pGyBadge.textContent = pGyCards.length;
                pGyBadge.style.display = pGyCards.length > 0 ? 'block' : 'none';
            }
            if (pGySlot) {
                if (pGyCards.length > 0) {
                    pGySlot.classList.add('has-card');
                    const topCard = pGyCards[pGyCards.length - 1];
                    const topImg = `/api/cards/${topCard.id || topCard.card_id}/image`;
                    pGySlot.style.backgroundImage = `url('${topImg}'), url('/assets/card_back.jpg')`;
                    pGySlot.style.backgroundSize = 'cover';
                    pGySlot.style.backgroundPosition = 'center';
                } else {
                    pGySlot.classList.remove('has-card');
                    pGySlot.style.backgroundImage = '';
                }
            }

            const pBanCards = local.banished || [];
            const pBanSlot = document.getElementById('p-banished');
            if (pBanSlot) {
                if (pBanCards.length > 0) {
                    pBanSlot.classList.add('has-card');
                    const topCard = pBanCards[pBanCards.length - 1];
                    const topImg = `/api/cards/${topCard.id || topCard.card_id}/image`;
                    pBanSlot.style.backgroundImage = `url('${topImg}'), url('/assets/card_back.jpg')`;
                    pBanSlot.style.backgroundSize = 'cover';
                    pBanSlot.style.backgroundPosition = 'center';
                } else {
                    pBanSlot.classList.remove('has-card');
                    pBanSlot.style.backgroundImage = '';
                }
            }

            // Top Card y Contador en Cementerio y Desierto (Rival)
            const rGyCards = rival.graveyard || [];
            const rGySlot = document.getElementById('r-gy');
            const rGyBadge = document.getElementById('r-gy-counter');
            if (rGyBadge) {
                rGyBadge.textContent = rGyCards.length;
                rGyBadge.style.display = rGyCards.length > 0 ? 'block' : 'none';
            }
            if (rGySlot) {
                if (rGyCards.length > 0) {
                    rGySlot.classList.add('has-card');
                    const topCard = rGyCards[rGyCards.length - 1];
                    const topImg = `/api/cards/${topCard.id || topCard.card_id}/image`;
                    rGySlot.style.backgroundImage = `url('${topImg}'), url('/assets/card_back.jpg')`;
                    rGySlot.style.backgroundSize = 'cover';
                    rGySlot.style.backgroundPosition = 'center';
                } else {
                    rGySlot.classList.remove('has-card');
                    rGySlot.style.backgroundImage = '';
                }
            }

            const rBanCards = rival.banished || [];
            const rBanSlot = document.getElementById('r-banished');
            if (rBanSlot) {
                if (rBanCards.length > 0) {
                    rBanSlot.classList.add('has-card');
                    const topCard = rBanCards[rBanCards.length - 1];
                    const topImg = `/api/cards/${topCard.id || topCard.card_id}/image`;
                    rBanSlot.style.backgroundImage = `url('${topImg}'), url('/assets/card_back.jpg')`;
                    rBanSlot.style.backgroundSize = 'cover';
                    rBanSlot.style.backgroundPosition = 'center';
                } else {
                    rBanSlot.classList.remove('has-card');
                    rBanSlot.style.backgroundImage = '';
                }
            }

            // 4. Visualizador de Cadena Activa (Estilo Master Duel)
            const chainVisualizer = document.getElementById('chain-stack-visualizer');
            const chainItemsContainer = document.getElementById('chain-stack-items');
            const masterChainOverlay = document.getElementById('master-chain-overlay');
            const masterChainStack = document.getElementById('master-chain-stack');

            if (state.activeChain && state.activeChain.length > 0) {
                if (chainVisualizer) {
                    chainVisualizer.style.display = 'flex';
                    if (chainItemsContainer) {
                        chainItemsContainer.innerHTML = state.activeChain.map(link => 
                            `<div class="chain-stack-badge">⛓️ Eslabón ${link.chainLink}: ${link.card_data ? link.card_data.name : 'Efecto'}</div>`
                        ).join(' ➔ ');
                    }
                }
                if (masterChainOverlay && masterChainStack) {
                    masterChainOverlay.style.display = 'flex';
                    masterChainStack.innerHTML = state.activeChain.map((link, idx) => {
                        const linkNum = link.chainLink || (idx + 1);
                        const cName = link.card_data ? link.card_data.name : (link.name || 'Efecto');
                        return `
                            <div class="chain-medallion" id="chain-medallion-${linkNum}">
                                <div class="chain-medallion-icon">⛓️</div>
                                <div class="chain-medallion-link">LINK ${linkNum}</div>
                                <div class="chain-medallion-name" title="${cName}">${cName}</div>
                            </div>
                        `;
                    }).join('');
                }
            } else {
                if (chainVisualizer) chainVisualizer.style.display = 'none';
                if (masterChainOverlay) masterChainOverlay.style.display = 'none';
            }

            // 5. Renderizado de Campo Mágico (Field Spell) con Icono de Estrella Neón
            const fieldSpellStarSvg = `<svg class="slot-zone-icon icon-star" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
            const pCampo = document.getElementById('p-campo');
            if (pCampo) {
                if (local.fieldSpell) {
                    const c = local.fieldSpell.card_data || local.fieldSpell;
                    const cId = c.id || c.card_id;
                    const isSet = local.fieldSpell.faceDown || local.fieldSpell.position === 'SET';
                    const pSpellCounters = Number(local.fieldSpell.spellCounters || c.spellCounters || 0);
                    const pBushidoCounters = Number(local.fieldSpell.bushidoCounters || c.bushidoCounters || 0);
                    let pFieldBadge = '';
                    if (!isSet) {
                        if (pSpellCounters > 0) {
                            pFieldBadge = `<div class="spell-counter-badge" style="position:absolute; top:2px; right:2px; background:linear-gradient(135deg, #8b5cf6, #6d28d9); border:1px solid #c084fc; color:#fff; font-size:7.5px; font-weight:800; padding:1px 4px; border-radius:4px; z-index:5; box-shadow:0 0 5px rgba(139,92,246,0.8);" title="Contadores Mágicos: ${pSpellCounters}">✨ ${pSpellCounters}</div>`;
                        } else if (pBushidoCounters > 0) {
                            pFieldBadge = `<div class="bushido-counter-badge" style="position:absolute; top:2px; right:2px; background:linear-gradient(135deg, #f59e0b, #b45309); border:1px solid #ffd700; color:#fff; font-size:7.5px; font-weight:800; padding:1px 4px; border-radius:4px; z-index:5; box-shadow:0 0 5px rgba(245,158,11,0.8);" title="Contadores Bushido: ${pBushidoCounters}">🏮 ${pBushidoCounters}</div>`;
                        }
                    }
                    pCampo.classList.add('has-card');
                    const imgStyle = isSet ? '' : `background-image:url('/api/cards/${cId}/image'), url('/assets/card_back.jpg');`;
                    const sGlow = isSet ? 'field-card-activatable' : '';
                    pCampo.innerHTML = `<div class="card-on-field ${isSet ? 'card-sleeve player-card-sleeve' : ''} ${sGlow}" style="${imgStyle}" title="${c.name || 'Campo Mágico'}" onclick="onSlotClick('P_CAMPO', 0, event); inspectCardById(${cId});"></div>${pFieldBadge}`;
                } else {
                    pCampo.classList.remove('has-card');
                    pCampo.innerHTML = fieldSpellStarSvg;
                }
            }

            const rCampo = document.getElementById('r-campo');
            if (rCampo) {
                if (rival.fieldSpell) {
                    const c = rival.fieldSpell.card_data || rival.fieldSpell;
                    const cId = c.id || c.card_id;
                    const isSet = rival.fieldSpell.faceDown || rival.fieldSpell.position === 'SET';
                    const rSpellCounters = Number(rival.fieldSpell.spellCounters || c.spellCounters || 0);
                    const rBushidoCounters = Number(rival.fieldSpell.bushidoCounters || c.bushidoCounters || 0);
                    let rFieldBadge = '';
                    if (!isSet) {
                        if (rSpellCounters > 0) {
                            rFieldBadge = `<div class="spell-counter-badge" style="position:absolute; top:2px; right:2px; background:linear-gradient(135deg, #8b5cf6, #6d28d9); border:1px solid #c084fc; color:#fff; font-size:7.5px; font-weight:800; padding:1px 4px; border-radius:4px; z-index:5; box-shadow:0 0 5px rgba(139,92,246,0.8);" title="Contadores Mágicos: ${rSpellCounters}">✨ ${rSpellCounters}</div>`;
                        } else if (rBushidoCounters > 0) {
                            rFieldBadge = `<div class="bushido-counter-badge" style="position:absolute; top:2px; right:2px; background:linear-gradient(135deg, #f59e0b, #b45309); border:1px solid #ffd700; color:#fff; font-size:7.5px; font-weight:800; padding:1px 4px; border-radius:4px; z-index:5; box-shadow:0 0 5px rgba(245,158,11,0.8);" title="Contadores Bushido: ${rBushidoCounters}">🏮 ${rBushidoCounters}</div>`;
                        }
                    }
                    rCampo.classList.add('has-card');
                    const imgStyle = isSet ? '' : `background-image:url('/api/cards/${cId}/image'), url('/assets/card_back.jpg');`;
                    rCampo.innerHTML = `<div class="card-on-field ${isSet ? 'card-sleeve rival-card-sleeve' : ''}" style="${imgStyle}" title="${isSet ? 'Carta Boca Abajo' : (c.name || 'Campo Rival')}" onclick="onSlotClick('R_CAMPO', 0, event); if(!${isSet}) inspectCardById(${cId});"></div>${rFieldBadge}`;
                } else {
                    rCampo.classList.remove('has-card');
                    rCampo.innerHTML = fieldSpellStarSvg;
                }
            }

            // Detectar si efectos continuos están activos en el campo
            const checkHasSwords = (pObj) => {
                if (!pObj || !pObj.spells) return false;
                return pObj.spells.some(s => {
                    if (!s || s.faceDown || s.position === 'SET') return false;
                    const cId = Number(s.card_id || (s.card_data && s.card_data.id) || 0);
                    const n = ((s.card_data && s.card_data.name) || '').toLowerCase();
                    return cId === 72302403 || n.includes('espadas') || n.includes('swords');
                });
            };
            const rivalHasSwords = checkHasSwords(rival);
            const playerHasSwords = checkHasSwords(local);
            const isDragonJarActive = [...(local.spells || []), ...(rival.spells || [])].some(s => s && s.card_data && s.card_data.name && (s.card_data.name.includes('Jarra') || s.card_data.name.includes('Jar')) && !s.faceDown && s.position !== 'SET');

            const checkIsDragon = (monsterObj) => {
                if (!monsterObj) return false;
                const cd = monsterObj.card_data || {};
                const r = (cd.race || monsterObj.race || '').toLowerCase();
                const t = (cd.type || monsterObj.type || '').toLowerCase();
                const n = (cd.name || monsterObj.name || '').toLowerCase();
                const raceCode = Number(cd.raceCode || monsterObj.raceCode || 0);
                if ((raceCode & 0x2000) !== 0) return true;
                if (r === 'dragon' || r.includes('dragon')) return true;
                if (t.includes('dragon')) return true;
                if (n.includes('dragon') || n.includes('dragón')) return true;
                return false;
            };

            // 6. Renderizado de Monstruos del Jugador Local (Ranuras 0..4)
            for (let i = 0; i < 5; i++) {
                const slot = document.getElementById(`p-m${i}`);
                if (!slot) continue;
                const m = local.monsters[i];
                if (m) {
                    const isDragon = checkIsDragon(m);
                    const isJarLocked = isDragonJarActive && isDragon;
                    const isFaceDown = m.faceDown;
                    const isDef = m.position === 'DEF' || m.position === 'SET' || (isJarLocked && !isFaceDown);
                    const slotKey = `P_M_${i}`;
                    const currentCardId = m ? (m.card_id || (m.card_data ? m.card_data.id : 1)) : 0;

                    if (currentCardId && (!window._prevFieldCards || window._prevFieldCards[slotKey] !== currentCardId)) {
                        window._prevFieldCards = window._prevFieldCards || {};
                        window._prevFieldCards[slotKey] = currentCardId;
                        const animClass = isDef ? 'monster-summon-def' : 'monster-summon-atk';
                        slot.classList.remove('monster-summon-atk', 'monster-summon-def', 'monster-summon-vortex');
                        slot.classList.add(animClass);
                        setTimeout(() => slot.classList.remove(animClass), 950);
                    } else if (!currentCardId && window._prevFieldCards) {
                        window._prevFieldCards[slotKey] = 0;
                    }

                    const cId = m.card_id || (m.card_data ? m.card_data.id : 0);
                    const artId = (m.card_data && m.card_data.alias && Number(m.card_data.alias) > 0) ? m.card_data.alias : (Number(cId) === 70781057 ? 70781052 : cId);
                    const cardImgStyle = `background-image:url('/api/cards/${artId || cId}/image'), url('/assets/card_back.jpg');`;

                    const isTrapped = m.isTrapped || (m.attachedEffects && m.attachedEffects.some(e => e.effect_type === 'CANNOT_ATTACK'));
                    const isSwordsLocked = rivalHasSwords;
                    const hasAttacked = !!m.hasAttacked;
                    const isMyTurn = (typeof isPlayerTurnActive === 'function') ? isPlayerTurnActive() : true;
                    const canAttackGlow = (isMyTurn && state.phase === 'BATTLE' && !isDef && !isFaceDown && !hasAttacked && !isTrapped && !isSwordsLocked) ? 'field-card-activatable' : '';

                    let attachedBadgeHtml = '';
                    if (isTrapped || (m.attachedEffects && m.attachedEffects.length > 0)) {
                        const firstEff = m.attachedEffects && m.attachedEffects[0];
                        const effNames = m.attachedEffects && m.attachedEffects.length > 0 
                            ? m.attachedEffects.map(e => e.card_name || e.name).join(', ') 
                            : 'Círculo Atador de Hechizos';
                        const firstEffName = firstEff ? (firstEff.card_name || firstEff.name || 'Efecto') : 'Círculo Atador';
                        const isEquip = Boolean(firstEff && (firstEff.is_equip || firstEff.effect_type === 'EQUIP' || firstEffName.toLowerCase().includes('espada') || firstEffName.toLowerCase().includes('sword')));
                        const icon = isEquip ? '🗡️' : '⛓️';
                        const shortName = firstEffName.length > 13 ? firstEffName.substring(0, 12) + '…' : firstEffName;
                        attachedBadgeHtml = `<div class="attached-effects-badge" style="${isEquip ? 'background:rgba(16, 185, 129, 0.95); border-color:#10b981; color:#fff;' : ''}" title="Vinculado a: ${effNames}">${icon} ${shortName}</div>`;
                    } else if (isJarLocked && !isFaceDown) {
                        attachedBadgeHtml = `<div class="attached-effects-badge jar-locked-badge" style="background:rgba(217, 119, 6, 0.95); border-color:#f59e0b; color:#fff;" title="Sellado en Posición de Defensa por Jarra de Captura de Dragones">🏺 EN LA JARRA (DEF)</div>`;
                    } else if (isSwordsLocked && !isFaceDown) {
                        attachedBadgeHtml = `<div class="swords-lock-badge" title="Ataques bloqueados por las Espadas de la Luz Reveladora del Rival">⚔️ BLOQUEO (ESPADAS)</div>`;
                    }
                    
                    let statBadgeHtml = '';
                    if (!isFaceDown) {
                        if (isDef) {
                            const defVal = (m.currentDef !== undefined && m.currentDef !== null) ? m.currentDef : (m.card_data ? m.card_data.def : 0);
                            const modClass = (m.defMod > 0) ? 'stat-buffed' : (m.defMod < 0 ? 'stat-nerfed' : 'stat-def');
                            statBadgeHtml = `<div class="monster-stat-badge ${modClass}">DEF ${defVal}</div>`;
                        } else {
                            const atkVal = (m.currentAtk !== undefined && m.currentAtk !== null) ? m.currentAtk : (m.card_data ? m.card_data.atk : 0);
                            const modClass = (m.atkMod > 0) ? 'stat-buffed' : (m.atkMod < 0 ? 'stat-nerfed' : '');
                            const attackedBadge = hasAttacked ? `<div class="monster-stat-badge stat-attacked" style="position:absolute; bottom:18px; left:50%; transform:translateX(-50%); font-size:6.5px; padding:1px 4px; z-index:4;">⚔️ ATACÓ</div>` : '';
                            statBadgeHtml = `${attackedBadge}<div class="monster-stat-badge ${modClass}">ATK ${atkVal}</div>`;
                        }
                    }

                    let counterBadgeHtml = '';
                    const mBushido = Number(m.bushidoCounters || (m.card_data && m.card_data.bushidoCounters) || 0);
                    const mSpell = Number(m.spellCounters || (m.card_data && m.card_data.spellCounters) || 0);
                    if (!isFaceDown && mBushido > 0) {
                        counterBadgeHtml = `<div class="bushido-counter-badge" style="position:absolute; top:2px; right:2px; background:linear-gradient(135deg, #f59e0b, #b45309); border:1px solid #ffd700; color:#fff; font-size:7.5px; font-weight:800; padding:1px 4px; border-radius:4px; z-index:5; box-shadow:0 0 5px rgba(245,158,11,0.8);" title="Contadores Bushido: ${mBushido}">🏮 ${mBushido}</div>`;
                    } else if (!isFaceDown && mSpell > 0) {
                        counterBadgeHtml = `<div class="spell-counter-badge" style="position:absolute; top:2px; right:2px; background:linear-gradient(135deg, #8b5cf6, #6d28d9); border:1px solid #c084fc; color:#fff; font-size:7.5px; font-weight:800; padding:1px 4px; border-radius:4px; z-index:5; box-shadow:0 0 5px rgba(139,92,246,0.8);" title="Contadores Mágicos: ${mSpell}">✨ ${mSpell}</div>`;
                    }

                    let equipLinkBadge = '';

                    slot.innerHTML = `<div class="card-on-field ${isDef ? 'def-pos' : ''} ${isFaceDown ? 'card-sleeve player-card-sleeve' : ''} ${canAttackGlow} ${isTrapped ? 'monster-trapped' : ''} ${isSwordsLocked ? 'monster-swords-locked' : ''} ${hasAttacked ? 'monster-attacked' : ''}" 
                                           ${!isFaceDown ? `style="${cardImgStyle}"` : ''} 
                                           title="${m.card_data ? m.card_data.name : 'Monstruo'}"
                                           onclick="onSlotClick('P_M', ${i}, event);"></div>${attachedBadgeHtml}${equipLinkBadge}${statBadgeHtml}${counterBadgeHtml}`;
                } else {
                    const slotKey = `P_M_${i}`;
                    if (window._prevFieldCards) window._prevFieldCards[slotKey] = 0;
                    slot.classList.remove('monster-summon-atk', 'monster-summon-def', 'monster-summon-vortex');
                    slot.innerHTML = '';
                }
            }

            // 7. Renderizado de Magias/Trampas del Jugador Local (Ranuras 0..4)
            for (let i = 0; i < 5; i++) {
                const slot = document.getElementById(`p-s${i}`);
                if (!slot) continue;
                const s = local.spells[i];
                if (s) {
                    const isSet = s.faceDown || s.position === 'SET';
                    const cId = Number(s.card_id || (s.card_data ? s.card_data.id : 0));
                    const isSwordsCard = (cId === 72302403) || (s.card_data && s.card_data.name && (s.card_data.name.includes('Espadas') || s.card_data.name.includes('Swords')));
                    const isDragonJarCard = s.card_data && s.card_data.name && (s.card_data.name.includes('Jarra') || s.card_data.name.includes('Jar'));
                    const cardImgStyle = `background-image:url('/api/cards/${cId}/image'), url('/assets/card_back.jpg');`;
                    let linkBadge = '';
                    if (!isSet && isSwordsCard) {
                        linkBadge = `<div class="swords-turn-badge" title="Espadas de la Luz Reveladora (Activa: 3 turnos del rival)">⚔️ ESPADAS (${s.turnCounter || 0}/3)</div>`;
                    } else if (!isSet && isDragonJarCard) {
                        linkBadge = `<div class="attached-effects-badge" style="top:auto; bottom:2px; font-size:7px; background:rgba(217,119,6,0.95); border-color:#f59e0b; color:#fff;" title="Jarra de Captura de Dragones (Activa)">🏺 JARRA ACTIVA</div>`;
                    }
                    if (!isSet && (s.bushidoCounters || (s.card_data && s.card_data.bushidoCounters))) {
                        const bCount = Number(s.bushidoCounters || s.card_data.bushidoCounters || 0);
                        if (bCount > 0) {
                            linkBadge += `<div class="bushido-counter-badge" style="position:absolute; top:2px; right:2px; background:linear-gradient(135deg, #f59e0b, #b45309); border:1px solid #ffd700; color:#fff; font-size:7.5px; font-weight:800; padding:1px 4px; border-radius:4px; z-index:5; box-shadow:0 0 5px rgba(245,158,11,0.8);" title="Contadores Bushido: ${bCount}">🏮 ${bCount}</div>`;
                        }
                    } else if (!isSet && (s.spellCounters || (s.card_data && s.card_data.spellCounters))) {
                        const scCount = Number(s.spellCounters || s.card_data.spellCounters || 0);
                        if (scCount > 0) {
                            linkBadge += `<div class="spell-counter-badge" style="position:absolute; top:2px; right:2px; background:linear-gradient(135deg, #8b5cf6, #6d28d9); border:1px solid #c084fc; color:#fff; font-size:7.5px; font-weight:800; padding:1px 4px; border-radius:4px; z-index:5; box-shadow:0 0 5px rgba(139,92,246,0.8);" title="Contadores Mágicos: ${scCount}">✨ ${scCount}</div>`;
                        }
                    }
                    
                    const cd = s.card_data || {};
                    const isTrap = (cd.type && cd.type.includes('Trap')) || (cd.race && cd.race.includes('Trap'));
                    const isQuick = (cd.race === 'Quick-Play') || (cd.type && cd.type.includes('Quick-Play'));
                    const isActivatableSpellTrap = isSet ? (isTrap || isQuick) : (!isSet && (s.bushidoCounters || s.spellCounters));
                    const sGlow = isActivatableSpellTrap ? 'field-card-activatable' : '';
                    
                    slot.innerHTML = `<div class="card-on-field ${isSet ? 'card-sleeve player-card-sleeve' : ''} ${sGlow} ${!isSet && isSwordsCard ? 'card-swords-active' : ''}" 
                                           ${!isSet ? `style="${cardImgStyle}"` : ''} 
                                           title="${s.card_data ? s.card_data.name : 'Magia/Trampa'}"
                                           onclick="onSlotClick('P_S', ${i}, event); if(typeof inspectCardById==='function') inspectCardById(${cId});"></div>${linkBadge}`;
                } else {
                    slot.innerHTML = '';
                }
            }

            // 8. Renderizado de Monstruos del Rival (Ranuras 0..4)
            for (let i = 0; i < 5; i++) {
                const slot = document.getElementById(`r-m${i}`);
                if (!slot) continue;
                const m = rival.monsters[i];
                if (m) {
                    const isDragon = checkIsDragon(m);
                    const isJarLocked = isDragonJarActive && isDragon;
                    const isFaceDown = m.faceDown;
                    const isDef = m.position === 'DEF' || m.position === 'SET' || (isJarLocked && !isFaceDown);
                    const rSlotKey = `R_M_${i}`;
                    const rCurrentCardId = m ? (m.card_id || (m.card_data ? m.card_data.id : 1)) : 0;

                    if (rCurrentCardId && (!window._prevFieldCards || window._prevFieldCards[rSlotKey] !== rCurrentCardId)) {
                        window._prevFieldCards = window._prevFieldCards || {};
                        window._prevFieldCards[rSlotKey] = rCurrentCardId;
                        const animClass = isDef ? 'monster-summon-def' : 'monster-summon-atk';
                        slot.classList.remove('monster-summon-atk', 'monster-summon-def', 'monster-summon-vortex');
                        slot.classList.add(animClass);
                        setTimeout(() => slot.classList.remove(animClass), 950);
                    } else if (!rCurrentCardId && window._prevFieldCards) {
                        window._prevFieldCards[rSlotKey] = 0;
                    }
                    const cId = m.card_id || (m.card_data ? m.card_data.id : 0);
                    const artId = (m.card_data && m.card_data.alias && Number(m.card_data.alias) > 0) ? m.card_data.alias : (Number(cId) === 70781057 ? 70781052 : cId);
                    const cardImgStyle = `background-image:url('/api/cards/${artId || cId}/image'), url('/assets/card_back.jpg');`;

                    const isTrapped = m.isTrapped || (m.attachedEffects && m.attachedEffects.some(e => e.effect_type === 'CANNOT_ATTACK'));
                    const isSwordsLocked = playerHasSwords;
                    const hasAttacked = !!m.hasAttacked;

                    let attachedBadgeHtml = '';
                    if (isTrapped || (m.attachedEffects && m.attachedEffects.length > 0)) {
                        const firstEff = m.attachedEffects && m.attachedEffects[0];
                        const effNames = m.attachedEffects && m.attachedEffects.length > 0 
                            ? m.attachedEffects.map(e => e.card_name || e.name).join(', ') 
                            : 'Círculo Atador de Hechizos';
                        const firstEffName = firstEff ? (firstEff.card_name || firstEff.name || 'Efecto') : 'Círculo Atador';
                        const isEquip = Boolean(firstEff && (firstEff.is_equip || firstEff.effect_type === 'EQUIP' || firstEffName.toLowerCase().includes('espada') || firstEffName.toLowerCase().includes('sword')));
                        const icon = isEquip ? '🗡️' : '⛓️';
                        const shortName = firstEffName.length > 13 ? firstEffName.substring(0, 12) + '…' : firstEffName;
                        attachedBadgeHtml = `<div class="attached-effects-badge" style="${isEquip ? 'background:rgba(16, 185, 129, 0.95); border-color:#10b981; color:#fff;' : ''}" title="Vinculado a: ${effNames}">${icon} ${shortName}</div>`;
                    } else if (isJarLocked && !isFaceDown) {
                        attachedBadgeHtml = `<div class="attached-effects-badge jar-locked-badge" style="background:rgba(217, 119, 6, 0.95); border-color:#f59e0b; color:#fff;" title="Sellado en Posición de Defensa por Jarra de Captura de Dragones">🏺 EN LA JARRA (DEF)</div>`;
                    } else if (isSwordsLocked && !isFaceDown) {
                        attachedBadgeHtml = `<div class="swords-lock-badge" title="Ataques bloqueados por las Espadas de la Luz Reveladora">⚔️ BLOQUEO (ESPADAS)</div>`;
                    }

                    let rEquipLinkBadge = '';

                    let statBadgeHtml = '';
                    if (!isFaceDown) {
                        if (isDef) {
                            const defVal = (m.currentDef !== undefined && m.currentDef !== null) ? m.currentDef : (m.card_data ? m.card_data.def : 0);
                            const modClass = (m.defMod > 0) ? 'stat-buffed' : (m.defMod < 0 ? 'stat-nerfed' : 'stat-def');
                            statBadgeHtml = `<div class="monster-stat-badge ${modClass}">DEF ${defVal}</div>`;
                        } else {
                            const atkVal = (m.currentAtk !== undefined && m.currentAtk !== null) ? m.currentAtk : (m.card_data ? m.card_data.atk : 0);
                            const modClass = (m.atkMod > 0) ? 'stat-buffed' : (m.atkMod < 0 ? 'stat-nerfed' : '');
                            const attackedBadge = hasAttacked ? `<div class="monster-stat-badge stat-attacked" style="position:absolute; bottom:18px; left:50%; transform:translateX(-50%); font-size:6.5px; padding:1px 4px; z-index:4;">⚔️ ATACÓ</div>` : '';
                            statBadgeHtml = `${attackedBadge}<div class="monster-stat-badge ${modClass}">ATK ${atkVal}</div>`;
                        }
                    }

                    let rCounterBadgeHtml = '';
                    const rBushido = Number(m.bushidoCounters || (m.card_data && m.card_data.bushidoCounters) || 0);
                    const rSpell = Number(m.spellCounters || (m.card_data && m.card_data.spellCounters) || 0);
                    if (!isFaceDown && rBushido > 0) {
                        rCounterBadgeHtml = `<div class="bushido-counter-badge" style="position:absolute; top:2px; right:2px; background:linear-gradient(135deg, #f59e0b, #b45309); border:1px solid #ffd700; color:#fff; font-size:7.5px; font-weight:800; padding:1px 4px; border-radius:4px; z-index:5; box-shadow:0 0 5px rgba(245,158,11,0.8);" title="Contadores Bushido: ${rBushido}">🏮 ${rBushido}</div>`;
                    } else if (!isFaceDown && rSpell > 0) {
                        rCounterBadgeHtml = `<div class="spell-counter-badge" style="position:absolute; top:2px; right:2px; background:linear-gradient(135deg, #8b5cf6, #6d28d9); border:1px solid #c084fc; color:#fff; font-size:7.5px; font-weight:800; padding:1px 4px; border-radius:4px; z-index:5; box-shadow:0 0 5px rgba(139,92,246,0.8);" title="Contadores Mágicos: ${rSpell}">✨ ${rSpell}</div>`;
                    }

                    slot.innerHTML = `<div class="card-on-field ${isDef ? 'def-pos' : ''} ${isFaceDown ? 'card-sleeve rival-card-sleeve' : ''} ${isTrapped ? 'monster-trapped' : ''} ${isSwordsLocked ? 'monster-swords-locked' : ''} ${hasAttacked ? 'monster-attacked' : ''}" 
                                           ${!isFaceDown ? `style="${cardImgStyle}"` : ''} 
                                           title="${!isFaceDown && m.card_data ? m.card_data.name : 'Monstruo Rival'}"
                                           onclick="onSlotClick('R_M', ${i}, event);"></div>${attachedBadgeHtml}${rEquipLinkBadge}${statBadgeHtml}${rCounterBadgeHtml}`;
                } else {
                    const rSlotKey = `R_M_${i}`;
                    if (window._prevFieldCards) window._prevFieldCards[rSlotKey] = 0;
                    slot.classList.remove('monster-summon-atk', 'monster-summon-def', 'monster-summon-vortex');
                    slot.innerHTML = '';
                }
            }

            // 9. Renderizado de Magias/Trampas del Rival (Ranuras 0..4)
            for (let i = 0; i < 5; i++) {
                const slot = document.getElementById(`r-s${i}`);
                if (!slot) continue;
                const s = rival.spells[i];
                if (s) {
                    const isSet = s.faceDown || s.position === 'SET';
                    const cId = s.card_id || (s.card_data ? s.card_data.id : 0);
                    const isSwordsCard = (cId === 72302403) || (s.card_data && s.card_data.name && (s.card_data.name.includes('Espadas') || s.card_data.name.includes('Swords')));
                    const isDragonJarCard = s.card_data && s.card_data.name && (s.card_data.name.includes('Jarra') || s.card_data.name.includes('Jar'));
                    const cardImgStyle = `background-image:url('/api/cards/${cId}/image'), url('/assets/card_back.jpg');`;
                    let linkBadge = '';
                    if (!isSet && isSwordsCard) {
                        linkBadge = `<div class="swords-turn-badge" title="Espadas de la Luz Reveladora (Activa: 3 turnos)">⚔️ ESPADAS (${s.turnCounter || 0}/3)</div>`;
                    } else if (!isSet && isDragonJarCard) {
                        linkBadge = `<div class="attached-effects-badge" style="top:auto; bottom:2px; font-size:7px; background:rgba(217,119,6,0.95); border-color:#f59e0b; color:#fff;" title="Jarra de Captura de Dragones (Activa)">🏺 JARRA ACTIVA</div>`;
                    }
                    if (!isSet && (s.bushidoCounters || (s.card_data && s.card_data.bushidoCounters))) {
                        const bCount = Number(s.bushidoCounters || s.card_data.bushidoCounters || 0);
                        if (bCount > 0) {
                            linkBadge += `<div class="bushido-counter-badge" style="position:absolute; top:2px; right:2px; background:linear-gradient(135deg, #f59e0b, #b45309); border:1px solid #ffd700; color:#fff; font-size:7.5px; font-weight:800; padding:1px 4px; border-radius:4px; z-index:5; box-shadow:0 0 5px rgba(245,158,11,0.8);" title="Contadores Bushido: ${bCount}">🏮 ${bCount}</div>`;
                        }
                    } else if (!isSet && (s.spellCounters || (s.card_data && s.card_data.spellCounters))) {
                        const scCount = Number(s.spellCounters || s.card_data.spellCounters || 0);
                        if (scCount > 0) {
                            linkBadge += `<div class="spell-counter-badge" style="position:absolute; top:2px; right:2px; background:linear-gradient(135deg, #8b5cf6, #6d28d9); border:1px solid #c084fc; color:#fff; font-size:7.5px; font-weight:800; padding:1px 4px; border-radius:4px; z-index:5; box-shadow:0 0 5px rgba(139,92,246,0.8);" title="Contadores Mágicos: ${scCount}">✨ ${scCount}</div>`;
                        }
                    }
                    
                    slot.innerHTML = `<div class="card-on-field ${isSet ? 'card-sleeve rival-card-sleeve' : ''} ${!isSet && isSwordsCard ? 'card-swords-active' : ''}" 
                                           ${!isSet ? `style="${cardImgStyle}"` : ''} 
                                           title="${!isSet && s.card_data ? s.card_data.name : 'Carta Boca Abajo Rival'}"
                                           onclick="onSlotClick('R_S', ${i}, event); ${!isSet ? `inspectCardById(${cId});` : ''}"></div>${linkBadge}`;
                } else {
                    slot.innerHTML = '';
                }
            }

            // 10. Renderizado de la Mano del Jugador Local (Aura Dorada Activables estilo Master Duel)
            function isHandCardPlayable(card, duelState, localPlayer) {
                if (!card || !duelState || !localPlayer) return false;
                const isMyTurn = (typeof isPlayerTurnActive === 'function') ? isPlayerTurnActive() : true;
                const phase = (duelState.phase || '').toUpperCase();
                const isMainPhase = phase === 'MAIN_1' || phase === 'MAIN_2';

                const cardData = card.card_data || card;
                const typeStr = (cardData.type || card.type || '').toLowerCase();
                const raceStr = (cardData.race || card.race || '').toLowerCase();
                const isMonster = typeStr.includes('monster') || (cardData.atk !== undefined && cardData.atk !== null);
                const isSpell = typeStr.includes('spell') || raceStr.includes('spell');
                const isTrap = typeStr.includes('trap') || raceStr.includes('trap');

                if (!isMyTurn) {
                    if (Number(card.id || card.card_id) === 40640057) return true; // Kuriboh
                    return false;
                }

                if (isMainPhase) {
                    if (isMonster) {
                        const cNumId = Number(card.id || card.card_id || cardData.id || 0);
                        const desc = (cardData.desc || cardData.description || '').toLowerCase();
                        const myMons = (localPlayer.monsters || []).filter(m => m !== null && m !== undefined);
                        const oppPlayer = (duelState.player1?.username === localPlayer.username) ? duelState.player2 : duelState.player1;
                        const oppMons = (oppPlayer?.monsters || []).filter(m => m !== null && m !== undefined);
                        const hasFreeSlot = (localPlayer.monsters || []).some(m => m === null || m === undefined);

                        // A. Efectos de Mano (Dragón de Trueno, etc.)
                        if (cNumId === 31786629 || Boolean(cardData.isHandEffect) || desc.includes('discard this card') || desc.includes('descartar esta carta')) {
                            return true;
                        }

                        // B. Invocación Especial Inherente OCG
                        if (hasFreeSlot) {
                            // 1. Anciano de los Seis Samuráis (61737116) / Ciber Dragón (70095154)
                            if (cNumId === 61737116 || cNumId === 70095154 || desc.includes('opponent controls a monster and you control no monsters') || desc.includes('adversario controla un monstruo y tú no controlas ninguno')) {
                                if (oppMons.length >= 1 && myMons.length === 0) return true;
                            }
                            // 2. Gran Shogun Shien (63176202)
                            if (cNumId === 63176202 || (desc.includes('six samurai') && (desc.includes('control 2 or more') || desc.includes('controlas 2 o más')))) {
                                const sixSamCount = myMons.filter(m => {
                                    const mName = (m.card_data?.name || '').toLowerCase();
                                    return (mName.includes('six samurai') || mName.includes('seis samur')) && !m.faceDown;
                                }).length;
                                if (sixSamCount >= 2) return true;
                            }
                            // 3. Gran Maestro de los Seis Samuráis (83039727 / 83039729)
                            if (cNumId === 83039727 || cNumId === 83039729) {
                                const hasSixSam = myMons.some(m => {
                                    const mName = (m.card_data?.name || '').toLowerCase();
                                    return (mName.includes('six samurai') || mName.includes('seis samur')) && !m.faceDown;
                                });
                                const alreadyHasGm = myMons.some(m => Number(m.card_id || m.card_data?.id) === 83039727 || Number(m.card_id || m.card_data?.id) === 83039729);
                                if (hasSixSam && !alreadyHasGm) return true;
                            }
                            // 4. Kizan (49721904)
                            if (cNumId === 49721904) {
                                const hasOtherSixSam = myMons.some(m => {
                                    const mName = (m.card_data?.name || '').toLowerCase();
                                    return (mName.includes('six samurai') || mName.includes('seis samur')) && !m.faceDown && Number(m.card_id || m.card_data?.id) !== 49721904;
                                });
                                if (hasOtherSixSam) return true;
                            }
                            // 5. BLS (72989439) / Chaos Sorcerer (99188141)
                            if ([72989439, 99188141].includes(cNumId)) {
                                const myGy = localPlayer.graveyard || [];
                                const hasLight = myGy.some(c => ((c.attribute || (c.card_data && c.card_data.attribute)) || '').toUpperCase() === 'LIGHT');
                                const hasDark = myGy.some(c => ((c.attribute || (c.card_data && c.card_data.attribute)) || '').toUpperCase() === 'DARK');
                                if (hasLight && hasDark) return true;
                            }
                            // 6. Dragón Armado Oscuro (65192027)
                            if (cNumId === 65192027) {
                                const myGy = localPlayer.graveyard || [];
                                const darkCount = myGy.filter(c => ((c.attribute || (c.card_data && c.card_data.attribute)) || '').toUpperCase() === 'DARK').length;
                                if (darkCount === 3) return true;
                            }
                            // 7. Genérico con Invocación Especial inherente
                            if (card.canSpecialSummon || desc.includes('special summon this card') || desc.includes('invocar esta carta de modo especial')) {
                                return true;
                            }
                        }

                        // C. Invocación Normal / Colocación
                        if (!localPlayer.normalSummonUsed) {
                            const lvl = Number(cardData.level || card.level || 0);
                            const monstersOnField = myMons.length;
                            if (lvl <= 4) return true;
                            if ((lvl === 5 || lvl === 6) && monstersOnField >= 1) return true;
                            if (lvl >= 7 && monstersOnField >= 2) return true;
                        }
                        return false;
                    }

                    if (isSpell) {
                        if (raceStr.includes('equip') || typeStr.includes('equip')) {
                            const anyMon = (localPlayer.monsters || []).some(m => m !== null && !m.faceDown) || 
                                           ((duelState.player2?.monsters || []).some(m => m !== null && !m.faceDown));
                            return anyMon;
                        }
                        const hasSpellSlot = (localPlayer.spells || []).some(s => s === null || s === undefined);
                        const isFieldSpell = raceStr.includes('field') || typeStr.includes('field');
                        return hasSpellSlot || isFieldSpell;
                    }

                    if (isTrap) {
                        const hasSpellSlot = (localPlayer.spells || []).some(s => s === null || s === undefined);
                        return hasSpellSlot;
                    }
                }

                if (phase === 'BATTLE') {
                    if (Number(card.id || card.card_id) === 40640057) return true;
                    if (isSpell && (raceStr.includes('quick-play') || typeStr.includes('quick-play'))) {
                        return true;
                    }
                }

                return false;
            }

            const handContainer = document.getElementById('player-hand');
            if (local.hand && Array.isArray(local.hand)) {
                handContainer.innerHTML = local.hand.map((c, idx) => {
                    const cId = c.id || c.card_id;
                    const artId = (c.card_data && c.card_data.alias && Number(c.card_data.alias) > 0) ? c.card_data.alias : (c.alias && Number(c.alias) > 0 ? c.alias : (Number(cId) === 70781057 ? 70781052 : cId));
                    const cardImgStyle = `background-image:url('/api/cards/${artId || cId}/image'), url('/assets/card_back.jpg');`;
                    const isSel = idx === selectedHandCardIndex ? 'selected-hand' : '';
                    const isPlayable = isHandCardPlayable(c, state, local);
                    const activatableClass = isPlayable ? 'hand-card-activatable' : '';
                    return `<div class="hand-card ${isSel} ${activatableClass}" style="${cardImgStyle}" onclick="selectHandCard(${idx}, ${cId}, event)"></div>`;
                }).join('');
            }

            // 11. Renderizado de la Mano del Rival (Reversos Oficiales Simétricos)
            const rivalHandContainer = document.getElementById('rival-hand');
            if (rival.hand && Array.isArray(rival.hand)) {
                rivalHandContainer.innerHTML = rival.hand.map(() => `<div class="rival-hand-card"></div>`).join('');
            }
        });

        stateSocket.off('DUEL_GAME_OVER');
        stateSocket.on('DUEL_GAME_OVER', (data) => {
            if (typeof showGameOverModal === 'function') {
                showGameOverModal(data);
            } else if (typeof window.showGameOverModal === 'function') {
                window.showGameOverModal(data);
            }
        });
        }
        bindDuelUiSocketEvents();
        if (typeof window !== 'undefined') {
            window.bindDuelUiSocketEvents = bindDuelUiSocketEvents;
        }

        // ==========================================================================
        // CONTROLADOR DE VENTANA FLOTANTE DE PERFIL DEL DUELISTA (NO MODAL)
        // ==========================================================================
        function openDuelistProfileDrawer(target = 'player') {
            const drawer = document.getElementById('duelist-profile-drawer');
            const titleEl = document.getElementById('duelist-profile-title');
            const bodyEl = document.getElementById('duelist-profile-body');
            if (!drawer || !bodyEl) return;

            const isRival = target === 'rival';
            drawer.classList.toggle('theme-rival', isRival);

            // Detectar si el rival es NPC o Jugador Humano
            const isNpc = isRival && (!window.location.pathname.includes('pvp') || (typeof currentNpcOpponent !== 'undefined' && currentNpcOpponent));
            
            if (titleEl) {
                titleEl.innerHTML = isRival ? '⚔️ PERFIL DEL RIVAL' : '👤 PERFIL DEL JUGADOR';
            }

            if (isRival && isNpc) {
                // Renderizado de Información de NPC
                const npcName = (typeof currentNpcOpponent !== 'undefined' && currentNpcOpponent) ? currentNpcOpponent : (lastDuelState?.player2?.username || 'NPC Principiante (Nv. 1)');
                
                let npcLvl = 1;
                const match = npcName.match(/Nv\.\s*(\d+)/i);
                if (match) npcLvl = match[1];

                const npcPortrait = (window.currentNpcPortrait) 
                    || (window.currentNpcObj && (window.currentNpcObj.portrait || window.currentNpcObj.PortraitCode)) 
                    || 'yugi_muto';
                const npcAvatarImg = `/assets/images/characters/${npcPortrait}.png`;

                bodyEl.innerHTML = `
                    <div class="dp-hero-row">
                        <div class="dp-avatar-box">
                            <img src="${npcAvatarImg}" class="dp-avatar-img" onerror="this.onerror=null; this.src='/assets/images/characters/yugi_muto.png'" alt="Avatar NPC">
                        </div>
                        <div class="dp-info-col">
                            <div class="dp-username">${npcName}</div>
                            <div class="dp-tags-row">
                                <span class="dp-level-tag">Nv. ${npcLvl}</span>
                                <span class="dp-country-tag">🤖 Inteligencia Artificial</span>
                            </div>
                        </div>
                    </div>

                    <div class="dp-section-title">DETALLES DEL OPONENTE</div>
                    <div class="dp-npc-desc">
                        Oponente automatizado según reglas oficiales de <b>Ani-Dimension</b>. Ejecuta invocaciones, colocación de trampas y respuestas en cadena con activación de efectos reglamentarios.
                    </div>

                    <div class="dp-stats-grid">
                        <div class="dp-stat-box">
                            <div class="dp-stat-header">⚔️ DIFICULTAD</div>
                            <div class="dp-stat-row"><span>Rango:</span> <b class="dp-stat-val-highlight">Principiante</b></div>
                            <div class="dp-stat-row"><span>Nivel:</span> <b>${npcLvl}</b></div>
                        </div>
                        <div class="dp-stat-box">
                            <div class="dp-stat-header">🃏 BARAJA</div>
                            <div class="dp-stat-row"><span>Tipo:</span> <b>Básica</b></div>
                            <div class="dp-stat-row"><span>Total Cartas:</span> <b>40</b></div>
                        </div>
                    </div>
                `;
            } else {
                // Renderizado de Información de Jugador Humano
                const localKey = window.localPlayerRoleKey || 'player1';
                const rivalKey = window.rivalPlayerRoleKey || 'player2';

                let user = (window.Session && window.Session.getUser()) || { username: 'Duelista', nivel: 1 };
                if (!isRival) {
                    if (lastDuelState?.[localKey]?.username) {
                        user.username = lastDuelState[localKey].username;
                    }
                } else {
                    const rivalName = lastDuelState?.[rivalKey]?.username || 'Rival PvP';
                    if (window.opponentUserProfile && window.opponentUserProfile.username === rivalName) {
                        user = window.opponentUserProfile;
                    } else {
                        user = {
                            username: rivalName,
                            nivel: 1,
                            countryName: 'Argentina',
                            flagEmoji: '🇦🇷',
                            avatarImage: '../../../assets/images/avatars/AVA-250.png',
                            boosts: { exp: 0, starships: 0, luck: 0 },
                            npcStats: { totalDuels: 0, wins: 0, losses: 0 },
                            pvpStats: { totalDuels: 0, wins: 0, losses: 0 }
                        };
                        // Cargar perfil en vivo desde el servidor si es rival PvP
                        fetch(`/api/chat/user-profile/${encodeURIComponent(rivalName)}`)
                            .then(r => r.json())
                            .then(res => {
                                if (res.success && res.profile) {
                                    window.opponentUserProfile = {
                                        username: res.profile.username,
                                        nivel: res.profile.level || res.profile.nivel || 1,
                                        avatar: res.profile.avatar,
                                        avatarImage: res.profile.avatarImage || `../../../assets/images/avatars/${res.profile.avatar || 'AVA-002'}.png`,
                                        countryName: res.profile.countryName || 'Internacional',
                                        flagEmoji: res.profile.flagEmoji || '🌐',
                                        flagSvgUrl: res.profile.flagSvgUrl || '',
                                        boosts: res.profile.boosts || { exp: 0, starships: 0, luck: 0 },
                                        npcStats: res.profile.stats?.npc || { totalDuels: 0, wins: 0, losses: 0 },
                                        pvpStats: res.profile.stats?.pvp || { totalDuels: 0, wins: 0, losses: 0 }
                                    };
                                    if (drawer && drawer.style.display === 'flex' && isRival) {
                                        openDuelistProfileDrawer('rival');
                                    }
                                }
                            })
                            .catch(e => console.warn('[DRAWER] No se pudo cargar perfil extendido del rival:', e));
                    }
                }

                const username = user.username || (isRival ? 'Rival PvP' : 'Duelista');
                const nivel = user.nivel || (user.stats && user.stats.level) || user.level || 1;
                const countryName = user.countryName || 'Colombia';
                const flagEmoji = user.flagEmoji || '🇨🇴';
                const flagSvg = user.flagSvgUrl || '';
                const flagHtml = flagSvg ? `<img src="${flagSvg}" style="width:15px; height:10px; object-fit:cover; display:inline-block; vertical-align:middle; margin-right:4px;">` : flagEmoji;

                // Avatar
                let avatarSrc = user.avatarImage || (user.avatar ? `../../../assets/images/avatars/${user.avatar}.png` : '../../../assets/images/avatars/AVA-002.png');
                if (window.AvatarsManager && !isRival) {
                    const act = window.AvatarsManager.getActiveAvatar();
                    if (act) avatarSrc = act.image || `../../../assets/images/avatars/${act.code}.png`;
                }

                // Bonificaciones Totales Consolidadas
                let expBoost = 0.0, starBoost = 0.0, luckBoost = 0.0;
                if (isRival && user.boosts) {
                    expBoost = parseFloat(user.boosts.exp || 0);
                    starBoost = parseFloat(user.boosts.starships || 0);
                    luckBoost = parseFloat(user.boosts.luck || 0);
                } else {
                    if (window.AvatarsManager) {
                        const act = window.AvatarsManager.getActiveAvatar();
                        if (act) {
                            expBoost += parseFloat(act.exp_boost || 0);
                            starBoost += parseFloat(act.starships_boost || 0);
                            luckBoost += parseFloat(act.luck_boost || 0);
                        }
                    }
                    if (window.VipManager) {
                        const vip = window.VipManager.getUserVipStatus();
                        if (vip.active) {
                            expBoost += parseFloat(vip.exp_boost || 0);
                            starBoost += parseFloat(vip.starships_boost || 0);
                            luckBoost += parseFloat(vip.luck_boost || 0);
                        }
                    }
                    if (user.medalsBonuses) {
                        expBoost += parseFloat(user.medalsBonuses.exp || 0);
                        starBoost += parseFloat(user.medalsBonuses.starships || 0);
                        luckBoost += parseFloat(user.medalsBonuses.luck || 0);
                    }
                }

                // Estadísticas y Win Rates directamente del usuario (SQL Server)
                let npcStats = user.npcStats || { totalDuels: 0, wins: 0, losses: 0 };
                let pvpStats = user.pvpStats || { totalDuels: 0, wins: 0, losses: 0 };

                const npcTotal = parseInt(npcStats.totalDuels || 0, 10);
                const npcWins = parseInt(npcStats.wins || 0, 10);
                const npcWinrate = npcTotal > 0 ? Math.round((npcWins / npcTotal) * 100) : 0;

                const pvpTotal = parseInt(pvpStats.totalDuels || 0, 10);
                const pvpWins = parseInt(pvpStats.wins || 0, 10);
                const pvpWinrate = pvpTotal > 0 ? Math.round((pvpWins / pvpTotal) * 100) : 0;

                bodyEl.innerHTML = `
                    <div class="dp-hero-row">
                        <div class="dp-avatar-box">
                            <img src="${avatarSrc}" class="dp-avatar-img" onerror="this.src='../../../assets/images/avatars/AVA-002.png'" alt="Avatar">
                        </div>
                        <div class="dp-info-col">
                            <div class="dp-username">${username}</div>
                            <div class="dp-tags-row">
                                <span class="dp-level-tag">Nv. ${nivel}</span>
                                <span class="dp-country-tag">${flagHtml} ${countryName}</span>
                            </div>
                        </div>
                    </div>

                    <div class="dp-section-title">BONIFICACIONES TOTALES ACTIVAS</div>
                    <div class="dp-boosts-grid">
                        <div class="dp-boost-card">
                            <span class="dp-boost-lbl">EXP BOOST</span>
                            <span class="dp-boost-val">+${expBoost.toFixed(1)}%</span>
                        </div>
                        <div class="dp-boost-card">
                            <span class="dp-boost-lbl">ORO / STAR</span>
                            <span class="dp-boost-val">+${starBoost.toFixed(1)}%</span>
                        </div>
                        <div class="dp-boost-card">
                            <span class="dp-boost-lbl">SUERTE</span>
                            <span class="dp-boost-val">+${luckBoost.toFixed(1)}%</span>
                        </div>
                    </div>

                    <div class="dp-section-title" style="margin-top:4px;">ESTADÍSTICAS & WIN RATE</div>
                    <div class="dp-stats-grid">
                        <div class="dp-stat-box">
                            <div class="dp-stat-header">🤖 DUELOS VS NPC</div>
                            <div class="dp-stat-row"><span>Duelos:</span> <b>${npcTotal}</b></div>
                            <div class="dp-stat-row"><span>Victorias:</span> <b>${npcWins}</b></div>
                            <div class="dp-stat-row"><span>Win Rate:</span> <b class="dp-stat-val-highlight">${npcWinrate}%</b></div>
                        </div>
                        <div class="dp-stat-box">
                            <div class="dp-stat-header">⚔️ DUELOS VS PVP</div>
                            <div class="dp-stat-row"><span>Duelos:</span> <b>${pvpTotal}</b></div>
                            <div class="dp-stat-row"><span>Victorias:</span> <b>${pvpWins}</b></div>
                            <div class="dp-stat-row"><span>Win Rate:</span> <b class="dp-stat-val-highlight">${pvpWinrate}%</b></div>
                        </div>
                    </div>
                `;
            }

            drawer.style.display = 'flex';
        }

        function closeDuelistProfileDrawer() {
            const drawer = document.getElementById('duelist-profile-drawer');
            if (drawer) drawer.style.display = 'none';
        }

        function highlightLinkedSlot(player, slot, isHover, zoneType) {
            if (slot === null || slot === undefined) return;
            const state = window.lastDuelState || window.currentDuelState || (typeof duelState !== 'undefined' ? duelState : null);
            const myUser = (window.currentUser && window.currentUser.username) || (state && state.player1 && state.player1.username);
            const isLocal = (player === 'player' || player === 'player1' || (state && state.player1 && state.player1.username === player) || (myUser && player === myUser));
            const prefix = isLocal ? 'p-' : 'r-';
            const zone = (zoneType && zoneType.toLowerCase() === 's') ? 's' : 'm';
            const elId = `${prefix}${zone}${slot}`;
            const el = document.getElementById(elId);
            if (!el) return;
            if (isHover) {
                el.classList.add('slot-linked-active');
            } else {
                el.classList.remove('slot-linked-active');
            }
        }

        // Exportaciones globales para eventos HTML
        window.highlightLinkedSlot = highlightLinkedSlot;
        if (typeof inspectCardById !== 'undefined') window.inspectCardById = inspectCardById;
        if (typeof openGraveyardModal !== 'undefined') window.openGraveyardModal = openGraveyardModal;
        if (typeof closeGraveyardModal !== 'undefined') window.closeGraveyardModal = closeGraveyardModal;
        if (typeof openBanishedModal !== 'undefined') window.openBanishedModal = openBanishedModal;
        if (typeof openExtraDeckModal !== 'undefined') window.openExtraDeckModal = openExtraDeckModal;
        if (typeof attemptPhaseChange !== 'undefined') window.attemptPhaseChange = attemptPhaseChange;
        if (typeof advanceToPhase !== 'undefined') window.advanceToPhase = advanceToPhase;
        if (typeof updatePhaseUI !== 'undefined') window.updatePhaseUI = updatePhaseUI;
        if (typeof promptSurrender !== 'undefined') window.promptSurrender = promptSurrender;
        if (typeof closeSurrenderModal !== 'undefined') window.closeSurrenderModal = closeSurrenderModal;
        if (typeof confirmSurrender !== 'undefined') window.confirmSurrender = confirmSurrender;
        if (typeof showRuleAlert !== 'undefined') window.showRuleAlert = showRuleAlert;
        if (typeof highlightAvailableSlots !== 'undefined') window.highlightAvailableSlots = highlightAvailableSlots;
        if (typeof clearHighlightedSlots !== 'undefined') window.clearHighlightedSlots = clearHighlightedSlots;
        if (typeof openEditNickModal !== 'undefined') window.openEditNickModal = openEditNickModal;
        if (typeof closeEditNickModal !== 'undefined') window.closeEditNickModal = closeEditNickModal;
        if (typeof saveEditedNick !== 'undefined') window.saveEditedNick = saveEditedNick;
        if (typeof onEditNickInputChanged !== 'undefined') window.onEditNickInputChanged = onEditNickInputChanged;
        if (typeof openDuelistProfileDrawer !== 'undefined') window.openDuelistProfileDrawer = openDuelistProfileDrawer;
        if (typeof closeDuelistProfileDrawer !== 'undefined') window.closeDuelistProfileDrawer = closeDuelistProfileDrawer;


