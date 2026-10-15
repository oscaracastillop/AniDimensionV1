/**
 * ANI-DIMENSION: ÁLBUM DE COLECCIÓN Y CATÁLOGO DE CARTAS OCG
 * Gestiona el catálogo unificado de cartas por sobre (capítulos), estados de posesión,
 * conteo global y por sobre, porcentajes dinámicos y visor detallado de cartas.
 */

(function(window) {
    'use strict';

    let allPacks = [];
    let userInventoryMap = new Map(); // card_id -> count
    let activeFilters = {
        search: '',
        ownership: 'all',
        cardType: 'all',
        rarity: 'all'
    };

    let globalTotalCards = 0;
    let globalObtainedCards = 0;

    /**
     * Inicialización del Catálogo
     */
    async function initCatalog() {
        console.log('[CATÁLOGO] Inicializando Álbum y Enciclopedia OCG...');
        
        // 1. Cargar sobres directamente desde la API oficial de SQL Server (/api/cards/packs)
        let rawPacks = [];
        try {
            const packsRes = await fetch('/api/cards/packs');
            if (packsRes.ok) {
                const data = await packsRes.json();
                if (data && data.success && Array.isArray(data.packs)) {
                    rawPacks = data.packs;
                }
            }
        } catch (e) {
            console.warn('[CATÁLOGO] Error al obtener sobres desde API:', e);
        }

        if (rawPacks.length === 0 && window.PacksManager) {
            await window.PacksManager.syncFromServer();
            rawPacks = window.PacksManager.getPacks() || [];
        }

        const canonicalPackOrder = ['LOB', 'MRD', 'MRL', 'PSV', 'LON', 'LOD', 'PGD', 'MFC', 'DCR', 'IOC', 'AST', 'TLM', 'CRV', 'EEN', 'SOI', 'EOJ', 'POTD', 'CDIP', 'STON', 'FOTB', 'TAEV', 'GLAS', 'PTDN', 'LODT', 'TDGS', 'CSOC', 'CRMS', 'RGBT', 'ANPR', 'SOVR', 'ABPF', 'TSHD', 'DREV', 'STBL', 'STOR', 'EXVC', 'DRLG', 'PROMO-DM', 'GODS-EGY'];
        
        // Filtrar únicamente los sobres activos con cartas
        allPacks = rawPacks.filter(p => p.active === true && p.cards && p.cards.length > 0);
        
        // Ordenar según la secuencia canónica de expansiones
        allPacks.sort((a, b) => {
            const idxA = canonicalPackOrder.indexOf(a.id);
            const idxB = canonicalPackOrder.indexOf(b.id);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.id.localeCompare(b.id);
        });

        // 2. Sincronizar y cargar inventario real del usuario desde SQL Server
        await loadUserInventory();

        // 3. Inicializar eventos de filtros y buscador
        setupEventListeners();

        // 4. Renderizar dashboard, capítulos y cartas
        renderAll();
    }

    /**
     * Carga el inventario del usuario y crea un mapa de conteo rápido por ID de carta
     */
    async function loadUserInventory() {
        userInventoryMap.clear();
        let rawInventory = [];
        
        const user = window.Session ? window.Session.getUser() : null;
        const uid = user ? (user.id || user.user_id || user.Id) : (window.Session ? window.Session.getUserId() : 1);

        try {
            const token = window.Session ? window.Session.getSessionToken() : '';
            const res = await fetch(`/api/game/deck-inventory?userId=${uid}`, {
                headers: { 'x-user-id': String(uid), 'x-session-token': token }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success && Array.isArray(data.inventory)) {
                    rawInventory = data.inventory;
                }
            }
        } catch (e) {
            console.warn('[CATÁLOGO] Error al obtener inventario directo, usando fallback:', e);
            if (window.DeckManager && typeof window.DeckManager.syncFromServer === 'function') {
                const syncRes = await window.DeckManager.syncFromServer();
                rawInventory = syncRes.inventory || [];
            }
        }

        rawInventory.forEach(item => {
            const cardId = String(item.card_id || item.id || item.CardCode);
            const count = parseInt(item.quantity || item.ownedCount || item.Quantity || 1, 10);
            if (cardId && count > 0) {
                userInventoryMap.set(cardId, (userInventoryMap.get(cardId) || 0) + count);
            }
        });

        console.log(`[CATÁLOGO] Inventario SQL Server cargado para duelista #${uid}: ${rawInventory.length} registros, ${userInventoryMap.size} cartas distintas.`);
    }

    /**
     * Configuración de eventos interactivos (búsqueda, filtros, modals)
     */
    function setupEventListeners() {
        const searchInput = document.getElementById('catalog-search-input');
        const btnClearSearch = document.getElementById('btn-clear-search');
        const filterOwnership = document.getElementById('filter-ownership');
        const filterCardType = document.getElementById('filter-card-type');
        const filterRarity = document.getElementById('filter-rarity');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                activeFilters.search = e.target.value.trim().toLowerCase();
                if (btnClearSearch) {
                    btnClearSearch.style.display = activeFilters.search ? 'block' : 'none';
                }
                renderChaptersContent();
            });
        }

        if (btnClearSearch && searchInput) {
            btnClearSearch.addEventListener('click', () => {
                searchInput.value = '';
                activeFilters.search = '';
                btnClearSearch.style.display = 'none';
                renderChaptersContent();
            });
        }

        if (filterOwnership) {
            filterOwnership.addEventListener('change', (e) => {
                activeFilters.ownership = e.target.value;
                renderChaptersContent();
            });
        }

        if (filterCardType) {
            filterCardType.addEventListener('change', (e) => {
                activeFilters.cardType = e.target.value;
                renderChaptersContent();
            });
        }

        if (filterRarity) {
            filterRarity.addEventListener('change', (e) => {
                activeFilters.rarity = e.target.value;
                renderChaptersContent();
            });
        }

        // Cerrar modal con tecla Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                window.closeCardInspectModal();
            }
        });
    }

    /**
     * Renderizado completo de la vista
     */
    function renderAll() {
        calculateGlobalStats();
        renderGlobalDashboard();
        renderChaptersPills();
        renderChaptersContent();
    }

    /**
     * Calcula las estadísticas globales de colección
     */
    function calculateGlobalStats() {
        globalTotalCards = 0;
        globalObtainedCards = 0;

        allPacks.forEach(pack => {
            const cards = pack.cards || [];
            globalTotalCards += cards.length;

            cards.forEach(card => {
                const count = userInventoryMap.get(String(card.card_id)) || 0;
                if (count > 0) {
                    globalObtainedCards++;
                }
            });
        });
    }

    /**
     * Renderiza el encabezado de estadísticas globales
     */
    function renderGlobalDashboard() {
        const elObtained = document.getElementById('global-obtained-count');
        const elTotal = document.getElementById('global-total-count');
        const elPercentage = document.getElementById('global-percentage-txt');
        const elProgressFill = document.getElementById('global-progress-fill');
        const elPacksCount = document.getElementById('global-packs-count');

        const percentage = globalTotalCards > 0 ? ((globalObtainedCards / globalTotalCards) * 100).toFixed(1) : '0.0';

        if (elObtained) elObtained.textContent = globalObtainedCards.toLocaleString();
        if (elTotal) elTotal.textContent = globalTotalCards.toLocaleString();
        if (elPercentage) elPercentage.textContent = `${percentage}%`;
        if (elProgressFill) elProgressFill.style.width = `${percentage}%`;
        if (elPacksCount) elPacksCount.textContent = allPacks.length;
    }

    /**
     * Renderiza los botones marcadores de capítulos en la tira superior
     */
    function renderChaptersPills() {
        const container = document.getElementById('chapters-pills-container');
        if (!container) return;

        container.innerHTML = '';

        allPacks.forEach((pack, index) => {
            const cards = pack.cards || [];
            let packObtained = 0;
            cards.forEach(c => {
                if ((userInventoryMap.get(String(c.card_id)) || 0) > 0) packObtained++;
            });

            const packTotal = cards.length;
            const packPercent = packTotal > 0 ? ((packObtained / packTotal) * 100).toFixed(0) : 0;
            const isCompleted = packTotal > 0 && packObtained === packTotal;

            const pill = document.createElement('a');
            pill.className = `chapter-pill ${isCompleted ? 'completed' : ''}`;
            pill.href = `#chapter-${pack.id}`;
            pill.innerHTML = `
                <span>${pack.code || pack.id}</span>
                <span class="pill-progress">${packObtained}/${packTotal} (${packPercent}%)</span>
            `;

            pill.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.getElementById(`chapter-${pack.id}`);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });

            container.appendChild(pill);
        });
    }

    /**
     * Renderiza el contenido de todos los capítulos y sus cartas según los filtros activos
     */
    function renderChaptersContent() {
        const container = document.getElementById('catalog-chapters-container');
        if (!container) return;

        container.innerHTML = '';

        let totalVisibleCardsAcrossAllPacks = 0;

        allPacks.forEach((pack, packIndex) => {
            const cards = pack.cards || [];
            
            // Estadísticas del sobre completo
            let packObtainedCount = 0;
            cards.forEach(c => {
                if ((userInventoryMap.get(String(c.card_id)) || 0) > 0) packObtainedCount++;
            });
            const packTotalCount = cards.length;
            const packPercentage = packTotalCount > 0 ? ((packObtainedCount / packTotalCount) * 100).toFixed(1) : '0.0';

            // Filtrado de cartas del sobre
            const filteredCards = cards.filter(card => {
                const ownedCount = userInventoryMap.get(String(card.card_id)) || 0;
                const isOwned = ownedCount > 0;

                // Filtro Posesión
                if (activeFilters.ownership === 'owned' && !isOwned) return false;
                if (activeFilters.ownership === 'missing' && isOwned) return false;

                // Filtro Búsqueda
                if (activeFilters.search) {
                    const q = activeFilters.search;
                    const nameMatch = (card.name || '').toLowerCase().includes(q);
                    const setMatch = (card.set || '').toLowerCase().includes(q);
                    const idMatch = String(card.card_id).includes(q);
                    const raceMatch = (card.race || '').toLowerCase().includes(q);
                    if (!nameMatch && !setMatch && !idMatch && !raceMatch) return false;
                }

                // Filtro Tipo
                if (activeFilters.cardType !== 'all') {
                    const cardType = (card.type || '').toLowerCase();
                    if (activeFilters.cardType === 'monster' && (!cardType.includes('monster') && !cardType.includes('normal') && !cardType.includes('effect'))) return false;
                    if (activeFilters.cardType === 'spell' && !cardType.includes('spell') && card.race !== 'Spell') return false;
                    if (activeFilters.cardType === 'trap' && !cardType.includes('trap') && card.race !== 'Trap') return false;
                    if (activeFilters.cardType === 'fusion' && !cardType.includes('fusion')) return false;
                    if (activeFilters.cardType === 'ritual' && !cardType.includes('ritual')) return false;
                }

                // Filtro Rareza
                if (activeFilters.rarity !== 'all') {
                    const cardRarity = (card.rarity || 'COMMON').toUpperCase();
                    if (cardRarity !== activeFilters.rarity) return false;
                }

                return true;
            });

            // Si hay filtro activo y este sobre no tiene cartas que coincidan, ocultar el capítulo
            if (filteredCards.length === 0 && (activeFilters.search || activeFilters.ownership !== 'all' || activeFilters.cardType !== 'all' || activeFilters.rarity !== 'all')) {
                return;
            }

            totalVisibleCardsAcrossAllPacks += filteredCards.length;

            // Crear el elemento de capítulo
            const chapterEl = document.createElement('section');
            chapterEl.className = 'chapter-section';
            chapterEl.id = `chapter-${pack.id}`;

            const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
            const chapterNum = romanNumerals[packIndex] || String(packIndex + 1);

            // Header del Capítulo
            const headerEl = document.createElement('div');
            headerEl.className = 'chapter-header';
            headerEl.innerHTML = `
                <div class="chapter-header-left">
                    <img src="${pack.image || '../../assets/images/logo.png'}" alt="${pack.name}" class="chapter-cover-thumb" onerror="this.onerror=null; this.src='../../assets/images/logo.png';">
                    <div class="chapter-meta">
                        <span class="chapter-num-badge">CAPÍTULO ${chapterNum} • [${pack.code || pack.id}]</span>
                        <h2 class="chapter-name">${pack.name}</h2>
                        <div class="chapter-desc">${pack.description || ''}</div>
                    </div>
                </div>
                <div class="chapter-header-right">
                    <div class="chapter-stats-badge">
                        <span class="chapter-obtained-num">${packObtainedCount}</span>
                        <span class="chapter-total-num">/ ${packTotalCount}</span>
                        <span class="chapter-percent-num">(${packPercentage}%)</span>
                    </div>
                    <div class="chapter-progress-bar">
                        <div class="chapter-progress-fill" style="width: ${packPercentage}%;"></div>
                    </div>
                </div>
            `;
            chapterEl.appendChild(headerEl);

            // Rejilla de Cartas del Capítulo
            const gridEl = document.createElement('div');
            gridEl.className = 'chapter-cards-grid';

            filteredCards.forEach(card => {
                const ownedCount = userInventoryMap.get(String(card.card_id)) || 0;
                const isOwned = ownedCount > 0;
                const rarityClass = getRarityClass(card.rarity);

                const cardEl = document.createElement('div');
                cardEl.className = `album-card-item ${isOwned ? 'obtained ' + rarityClass : 'unobtained'}`;
                cardEl.title = `${card.name} (${card.set || ''}) - ${isOwned ? `En posesión: ${ownedCount}` : 'No obtenida'}`;

                cardEl.innerHTML = `
                    <div class="album-card-img-wrap">
                        <img src="https://images.ygoprodeck.com/images/cards_small/${card.card_id}.jpg" alt="${card.name}" loading="lazy" onerror="this.onerror=null; this.src='/assets/card_back.jpg';">
                        ${isOwned ? `<span class="owned-copies-badge">x${ownedCount}</span>` : `
                            <div class="unobtained-overlay">
                                <svg class="lock-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                </svg>
                                <span class="unobtained-txt">BLOQUEADA</span>
                            </div>
                        `}
                    </div>
                    <div class="album-card-info">
                        <div class="album-card-set-row">
                            <span class="album-card-set-code">${card.set || '???'}</span>
                            <span class="album-card-rarity-code">${formatRarityCode(card.rarity)}</span>
                        </div>
                        <div class="album-card-name">${card.name}</div>
                    </div>
                `;

                // Al hacer clic, abrir modal de inspección
                cardEl.addEventListener('click', () => {
                    window.openCardInspectModal(card, pack, ownedCount);
                });

                gridEl.appendChild(cardEl);
            });

            chapterEl.appendChild(gridEl);
            container.appendChild(chapterEl);
        });

        if (totalVisibleCardsAcrossAllPacks === 0) {
            container.innerHTML = `
                <div class="catalog-loading-spinner" style="padding: 80px 20px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#00f0ff" stroke-width="2" style="width:48px; height:48px; opacity:0.6;">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <span style="font-size:15px; color:#e2e8f0;">No se encontraron cartas que coincidan con los filtros aplicados.</span>
                    <button onclick="document.getElementById('catalog-search-input').value=''; document.getElementById('filter-ownership').value='all'; document.getElementById('filter-card-type').value='all'; document.getElementById('filter-rarity').value='all'; window.resetAndRender();" class="btn-catalog-back" style="margin-top:10px;">
                        REINICIAR FILTROS
                    </button>
                </div>
            `;
        }
    }

    /**
     * Helpers de estilo para rarezas
     */
    function getRarityClass(rarity) {
        if (!rarity) return '';
        const r = rarity.toUpperCase();
        if (r.includes('SECRET')) return 'rare-secret';
        if (r.includes('ULTRA')) return 'rare-ultra';
        if (r.includes('SUPER')) return 'rare-super';
        if (r.includes('RARE')) return 'rare-rare';
        return '';
    }

    function formatRarityCode(rarity) {
        if (!rarity) return 'C';
        const r = rarity.toUpperCase();
        if (r.includes('SECRET')) return 'SCR';
        if (r.includes('ULTRA')) return 'UR';
        if (r.includes('SUPER')) return 'SR';
        if (r.includes('RARE')) return 'R';
        return 'C';
    }

    /**
     * Modal de Inspección de Carta
     */
    window.openCardInspectModal = function(card, pack, ownedCount) {
        const modal = document.getElementById('card-inspect-modal');
        if (!modal) return;

        const elImg = document.getElementById('modal-card-img');
        const elLock = document.getElementById('modal-card-lock-badge');
        const elSet = document.getElementById('modal-card-set');
        const elRarity = document.getElementById('modal-card-rarity');
        const elStatus = document.getElementById('modal-card-status-badge');
        const elName = document.getElementById('modal-card-name');
        const elStatsGrid = document.getElementById('modal-card-stats-grid');
        const elDesc = document.getElementById('modal-card-desc');
        const elPasscode = document.getElementById('modal-card-passcode');
        const elPackOrigin = document.getElementById('modal-card-pack-origin');

        const isOwned = ownedCount > 0;

        if (elImg) {
            elImg.src = `https://images.ygoprodeck.com/images/cards/${card.card_id}.jpg`; elImg.onerror = () => { elImg.src = '/assets/card_back.jpg'; };
        }

        if (elLock) {
            elLock.style.display = isOwned ? 'none' : 'block';
        }

        if (elSet) elSet.textContent = card.set || pack.code || 'EXP-???';
        if (elRarity) elRarity.textContent = (card.rarity || 'COMMON').replace('_', ' ');

        if (elStatus) {
            if (isOwned) {
                elStatus.className = 'modal-status-badge';
                elStatus.textContent = `EN POSESIÓN: x${ownedCount}`;
            } else {
                elStatus.className = 'modal-status-badge missing';
                elStatus.textContent = '🔒 NO OBTENIDA';
            }
        }

        if (elName) elName.textContent = card.name;

        // Construir grid de estadísticas
        if (elStatsGrid) {
            elStatsGrid.innerHTML = '';
            
            // Tipo
            elStatsGrid.innerHTML += `
                <div class="modal-stat-item">
                    <span class="modal-stat-label">Tipo</span>
                    <span class="modal-stat-val">${card.type || 'Monster'}</span>
                </div>
            `;

            // Atributo
            if (card.attribute) {
                elStatsGrid.innerHTML += `
                    <div class="modal-stat-item">
                        <span class="modal-stat-label">Atributo</span>
                        <span class="modal-stat-val">${card.attribute}</span>
                    </div>
                `;
            }

            // Nivel / Rango
            if (card.level !== undefined && card.level !== null && card.level > 0) {
                elStatsGrid.innerHTML += `
                    <div class="modal-stat-item">
                        <span class="modal-stat-label">Nivel / Rango</span>
                        <span class="modal-stat-val">★ ${card.level}</span>
                    </div>
                `;
            }

            // ATK / DEF
            if (card.atk !== undefined && card.atk !== null && card.atk >= 0) {
                elStatsGrid.innerHTML += `
                    <div class="modal-stat-item">
                        <span class="modal-stat-label">ATK</span>
                        <span class="modal-stat-val">${card.atk}</span>
                    </div>
                `;
            }

            if (card.def !== undefined && card.def !== null && card.def >= 0) {
                elStatsGrid.innerHTML += `
                    <div class="modal-stat-item">
                        <span class="modal-stat-label">DEF</span>
                        <span class="modal-stat-val">${card.def}</span>
                    </div>
                `;
            }

            // Raza / Arquetipo
            if (card.race) {
                elStatsGrid.innerHTML += `
                    <div class="modal-stat-item">
                        <span class="modal-stat-label">Raza / Tipo</span>
                        <span class="modal-stat-val">${card.race}</span>
                    </div>
                `;
            }
        }

        if (elDesc) {
            const descEn = card.desc || card.description || 'Sin descripción disponible.';
            const descEs = card.desc_es || card.description_es || '';
            const nameEs = card.name_es || card.name;
            if (nameEs && nameEs !== card.name && elName) {
                elName.innerHTML = `${card.name} <span style="font-size:12px; color:#00f0ff; font-weight:700; margin-left:6px;">(${nameEs})</span>`;
            }
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
        if (elPasscode) elPasscode.textContent = `Passcode: ${card.card_id}`;
        if (elPackOrigin) elPackOrigin.textContent = `Expansión: ${pack.name}`;

        modal.style.display = 'flex';
    };

    window.closeCardInspectModal = function() {
        const modal = document.getElementById('card-inspect-modal');
        if (modal) modal.style.display = 'none';
    };

    window.resetAndRender = function() {
        activeFilters = { search: '', ownership: 'all', cardType: 'all', rarity: 'all' };
        renderChaptersContent();
    };

    function showError(msg) {
        const container = document.getElementById('catalog-chapters-container');
        if (container) {
            container.innerHTML = `<div class="catalog-loading-spinner" style="color:#ef4444;">❌ ${msg}</div>`;
        }
    }

    // Inicializar al cargar el DOM
    document.addEventListener('DOMContentLoaded', initCatalog);

})(window);
