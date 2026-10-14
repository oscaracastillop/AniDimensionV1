/**
 * ANI-DIMENSION: TIENDA DE SOBRES CON PESTAÑAS POR GENERACIÓN (DM vs GX vs 5D vs EVENTOS)
 * RENDERIZA TODOS LOS SOBRES DESDE EL PANEL DE ADMINISTRACIÓN (SINGLE SOURCE OF TRUTH)
 * SIN ICONOS EN PESTAÑAS • BORDES RECTOS • RIBBONS COMPACTOS • 5px MÁRGENES
 */

let currentShopSeriesTab = 'DM';

document.addEventListener('DOMContentLoaded', () => {
    initShopSobres();
});

async function initShopSobres() {
    if (window.PacksManager && typeof window.PacksManager.syncFromServer === 'function') {
        await window.PacksManager.syncFromServer();
    }
    renderShopPacks();
    updateUserBalanceDisplay();
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

function setShopSeriesTab(tabKey) {
    currentShopSeriesTab = tabKey;
    if (window.SoundManager && typeof window.SoundManager.playSFX === 'function') {
        window.SoundManager.playSFX('button');
    }
    renderShopPacks();
}

function cleanMojibake(str) {
    if (!str) return '';
    return String(str)
        .replace(/POPULAR.*$/i, 'POPULAR')
        .replace(/ðŸ”¥|DÝ~¥|🔥/g, '')
        .replace(/Â¡/g, '¡')
        .replace(/Â¿/g, '¿')
        .replace(/Ã“/g, 'Ó')
        .replace(/Ã¡/g, 'á')
        .replace(/Ã©/g, 'é')
        .replace(/Ã­/g, 'í')
        .replace(/Ã³/g, 'ó')
        .replace(/Ãº/g, 'ú')
        .replace(/Ã±/g, 'ñ')
        .replace(/Ã /g, 'À')
        .replace(/EXPANSI.N/gi, 'EXPANSIÓN')
        .replace(/INICIACI.N/gi, 'INICIACIÓN')
        .replace(/FARA.N/gi, 'FARAÓN')
        .replace(/EDICI.N/gi, 'EDICIÓN')
        .replace(/DRAG.N/gi, 'DRAGÓN')
        .trim();
}

function renderShopPacks() {
    const container = document.querySelector('.shop-scroll-content');
    if (!container) return;

    const allPacks = (window.PacksManager ? window.PacksManager.getPacks() : [])
        .filter(pack => pack.visible !== false);

    // Filtrar por pestaña activa
    const filteredPacks = allPacks.filter(p => {
        const pSeries = p.series || (p.id === 'TLM' ? 'GX' : (p.id === 'PROMO-DM' || p.id === 'GODS-EGY' || p.id === 'DRLG' ? 'EVENT' : 'DM'));
        if (currentShopSeriesTab === 'DM') {
            return pSeries === 'DM' && p.id !== 'PROMO-DM' && p.id !== 'GODS-EGY' && p.id !== 'DRLG';
        } else if (currentShopSeriesTab === 'GX') {
            return pSeries === 'GX' || p.id === 'TLM';
        } else if (currentShopSeriesTab === '5D') {
            return pSeries === '5D' || p.id === 'TDGS';
        } else if (currentShopSeriesTab === 'EVENT') {
            return pSeries === 'EVENT' || p.id === 'PROMO-DM' || p.id === 'GODS-EGY' || p.id === 'DRLG';
        }
        return true;
    });

    container.innerHTML = `
        <!-- NAVEGACIÓN POR GENERACIONES / SERIES (SIN ICONOS, BORDES RECTOS) -->
        <div class="shop-series-tabs" style="display:flex; justify-content:center; align-items:center; gap:8px; margin-bottom:12px; flex-wrap:wrap;">
            <button class="shop-series-tab-btn ${currentShopSeriesTab === 'DM' ? 'active' : ''}" onclick="setShopSeriesTab('DM')" style="background:${currentShopSeriesTab === 'DM' ? 'linear-gradient(135deg, rgba(0,240,255,0.3) 0%, rgba(14,165,233,0.2) 100%)' : 'rgba(15,23,42,0.6)'}; color:${currentShopSeriesTab === 'DM' ? '#00f0ff' : '#94a3b8'}; border:1px solid ${currentShopSeriesTab === 'DM' ? '#00f0ff' : 'rgba(255,255,255,0.15)'}; padding:6px 14px; border-radius:0 !important; font-family:'Orbitron', sans-serif; font-size:10px; font-weight:800; cursor:pointer; letter-spacing:0.5px; transition:all 0.2s ease; box-shadow:${currentShopSeriesTab === 'DM' ? '0 0 12px rgba(0,240,255,0.4)' : 'none'};">
                DUEL MONSTERS (DM)
            </button>
            <button class="shop-series-tab-btn ${currentShopSeriesTab === 'GX' ? 'active' : ''}" onclick="setShopSeriesTab('GX')" style="background:${currentShopSeriesTab === 'GX' ? 'linear-gradient(135deg, rgba(239,68,68,0.3) 0%, rgba(249,115,22,0.2) 100%)' : 'rgba(15,23,42,0.6)'}; color:${currentShopSeriesTab === 'GX' ? '#ff3b30' : '#94a3b8'}; border:1px solid ${currentShopSeriesTab === 'GX' ? '#ff3b30' : 'rgba(255,255,255,0.15)'}; padding:6px 14px; border-radius:0 !important; font-family:'Orbitron', sans-serif; font-size:10px; font-weight:800; cursor:pointer; letter-spacing:0.5px; transition:all 0.2s ease; box-shadow:${currentShopSeriesTab === 'GX' ? '0 0 12px rgba(255,59,48,0.4)' : 'none'};">
                YU-GI-OH! GX
            </button>
            <button class="shop-series-tab-btn ${currentShopSeriesTab === '5D' ? 'active' : ''}" onclick="setShopSeriesTab('5D')" style="background:${currentShopSeriesTab === '5D' ? 'linear-gradient(135deg, rgba(16,185,129,0.35) 0%, rgba(5,150,105,0.25) 100%)' : 'rgba(15,23,42,0.6)'}; color:${currentShopSeriesTab === '5D' ? '#10b981' : '#94a3b8'}; border:1px solid ${currentShopSeriesTab === '5D' ? '#10b981' : 'rgba(255,255,255,0.15)'}; padding:6px 14px; border-radius:0 !important; font-family:'Orbitron', sans-serif; font-size:10px; font-weight:800; cursor:pointer; letter-spacing:0.5px; transition:all 0.2s ease; box-shadow:${currentShopSeriesTab === '5D' ? '0 0 14px rgba(16,185,129,0.5)' : 'none'};">
                YU-GI-OH! 5D'S
            </button>
            <button class="shop-series-tab-btn ${currentShopSeriesTab === 'EVENT' ? 'active' : ''}" onclick="setShopSeriesTab('EVENT')" style="background:${currentShopSeriesTab === 'EVENT' ? 'linear-gradient(135deg, rgba(234,179,8,0.3) 0%, rgba(202,138,4,0.2) 100%)' : 'rgba(15,23,42,0.6)'}; color:${currentShopSeriesTab === 'EVENT' ? '#ffd700' : '#94a3b8'}; border:1px solid ${currentShopSeriesTab === 'EVENT' ? '#ffd700' : 'rgba(255,255,255,0.15)'}; padding:6px 14px; border-radius:0 !important; font-family:'Orbitron', sans-serif; font-size:10px; font-weight:800; cursor:pointer; letter-spacing:0.5px; transition:all 0.2s ease; box-shadow:${currentShopSeriesTab === 'EVENT' ? '0 0 12px rgba(255,215,0,0.4)' : 'none'};">
                EDICIONES ESPECIALES
            </button>
        </div>

        <div class="shop-grid-container">
            ${filteredPacks.length === 0 ? `
                <div style="grid-column:1/-1; text-align:center; padding:40px 20px; color:#94a3b8; font-family:'Outfit', sans-serif;">
                    <div style="font-size:32px; margin-bottom:8px;">📦</div>
                    <div style="font-size:14px; font-weight:700; color:#cbd5e1;">NO HAY SOBRES DISPONIBLES EN ESTA CATEGORÍA</div>
                    <div style="font-size:12px; margin-top:4px;">Los próximos lanzamientos se habilitarán pronto.</div>
                </div>
            ` : filteredPacks.map(pack => {
                const isPackActive = pack.active !== false;
                const rawOffer = pack.offer_text || '';
                const offerText = cleanMojibake(rawOffer);
                const packName = cleanMojibake(pack.name || '');
                const packDesc = cleanMojibake(pack.description || '');
                const priceText = (pack.price !== undefined ? pack.price : 1500).toLocaleString();
                const packImg = pack.image || '../../assets/images/packs/lob_pack.jpg';

                return `
                    <div class="shop-card" ${isPackActive ? `onclick="location.href='shop-sobre-detalle.html?pack_id=${pack.id}'"` : ''} style="position:relative; overflow:hidden; opacity:${isPackActive ? '1' : '0.85'};">
                        
                        <!-- CINTA DIAGONAL DE OFERTA EN AMARILLO NEÓN COMPACTA -->
                        ${offerText ? `
                        <div class="shop-pack-ribbon" style="position:absolute; top:18px; left:-42px; width:155px; transform:rotate(-35deg); background:linear-gradient(135deg, #ffd700 0%, #f59e0b 100%); color:#020617; font-family:'Orbitron', sans-serif; font-size:8px; font-weight:900; padding:4px 0; text-transform:uppercase; letter-spacing:0.4px; box-shadow:0 3px 10px rgba(0,0,0,0.5), 0 0 12px rgba(255, 215, 0, 0.7); z-index:10; pointer-events:none; border-top:1px solid #ffffff; border-bottom:1.2px solid rgba(0,0,0,0.6); text-align:center; white-space:nowrap; text-shadow:0 0 2px rgba(255,255,255,0.5);">
                            ${offerText}
                        </div>
                        ` : ''}

                        <div>
                            <div class="shop-card-header" style="display:flex; justify-content:flex-end; align-items:center; width:100%;">
                                <span class="shop-card-badge ${isPackActive ? 'active' : 'upcoming'}" style="font-size:7.5px !important; padding:2px 5px !important;">
                                    ${isPackActive ? 'Disponible' : 'Próximamente'}
                                </span>
                            </div>
                            <div class="shop-card-artwork">
                                <img src="${packImg}" alt="${packName}" class="shop-card-img" onerror="this.onerror=null; this.src='https://images.ygoprodeck.com/images/cards_small/89631139.jpg';" style="object-fit:contain; padding:4px; ${isPackActive ? 'filter:drop-shadow(0 0 8px rgba(0,240,255,0.6));' : 'opacity:0.75;'}">
                                <div class="shop-card-glow-overlay"></div>
                            </div>
                            <div class="shop-card-title">${packName}</div>
                            <div class="shop-card-desc">
                                ${packDesc}
                            </div>
                        </div>

                        <div style="display:flex; align-items:center; justify-content:space-between; width:100%; margin-top:4px; padding-top:4px; border-top:1px dashed rgba(255,255,255,0.15);">
                            <div style="font-family:'Orbitron', sans-serif; font-size:10.5px; font-weight:900; color:#ffd700; ${!isPackActive ? 'opacity:0.5;' : 'text-shadow:0 0 6px rgba(255,215,0,0.6);'}">
                                ⭐ ${priceText}
                            </div>
                            ${isPackActive ? `
                            <button class="btn-shop-access" onclick="event.stopPropagation(); location.href='shop-sobre-detalle.html?pack_id=${pack.id}'" style="margin:0 !important; height:22px !important; min-width:72px !important; max-width:85px !important; padding:2px 6px !important; font-size:7.5px !important;">
                                <span>Ver Sobre</span>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:10px; height:10px;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                            </button>
                            ` : `
                            <button class="btn-shop-disabled" disabled style="margin:0 !important; height:22px !important; min-width:72px !important; max-width:85px !important; padding:2px 6px !important; font-size:7.5px !important;">Próximamente</button>
                            `}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}
