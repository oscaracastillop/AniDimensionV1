/**
 * ANI-DIMENSION: LÓGICA DE GERENCIA DE SOBRES (ADMINISTRACIÓN)
 * 100% PERSISTIDO EN BASE DE DATOS MEDIANTE STORED PROCEDURES (dbo.sp_UpdateBoosterPack)
 */

let currentAdminSeriesTab = 'ALL';

document.addEventListener('DOMContentLoaded', () => {
    initAdminPacksView();
});

async function initAdminPacksView() {
    if (window.PacksManager && typeof window.PacksManager.syncFromServer === 'function') {
        await window.PacksManager.syncFromServer();
    }
    renderAdminPacksGrid();
}

function setAdminSeriesTab(tabKey) {
    currentAdminSeriesTab = tabKey;
    renderAdminPacksGrid();
}

function renderAdminPacksGrid() {
    const container = document.getElementById('admin-packs-grid-container');
    if (!container) return;

    const allPacks = window.PacksManager ? window.PacksManager.getPacks() : [];

    const filteredPacks = allPacks.filter(p => {
        if (currentAdminSeriesTab === 'ALL') return true;
        const pSeries = p.series || (p.id === 'TDGS' ? '5D' : (p.id === 'TLM' ? 'GX' : (p.id === 'PROMO-DM' || p.id === 'GODS-EGY' || p.id === 'DRLG' ? 'EVENT' : 'DM')));
        if (currentAdminSeriesTab === 'DM') {
            return pSeries === 'DM' && p.id !== 'PROMO-DM' && p.id !== 'GODS-EGY' && p.id !== 'DRLG';
        } else if (currentAdminSeriesTab === 'GX') {
            return pSeries === 'GX' || p.id === 'TLM';
        } else if (currentAdminSeriesTab === '5D') {
            return pSeries === '5D' || p.id === 'TDGS';
        } else if (currentAdminSeriesTab === 'EVENT') {
            return pSeries === 'EVENT' || p.id === 'PROMO-DM' || p.id === 'GODS-EGY' || p.id === 'DRLG';
        }
        return true;
    });

    const tabsHtml = `
        <!-- NAVEGACIÓN ADMIN POR GENERACIONES -->
        <div style="grid-column:1/-1; display:flex; justify-content:center; align-items:center; gap:8px; margin-bottom:12px; flex-wrap:wrap;">
            <button onclick="setAdminSeriesTab('ALL')" style="background:${currentAdminSeriesTab === 'ALL' ? 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(200,200,200,0.2) 100%)' : 'rgba(15,23,42,0.6)'}; color:${currentAdminSeriesTab === 'ALL' ? '#ffffff' : '#94a3b8'}; border:1px solid ${currentAdminSeriesTab === 'ALL' ? '#ffffff' : 'rgba(255,255,255,0.15)'}; padding:5px 12px; border-radius:8px; font-family:'Orbitron', sans-serif; font-size:10.5px; font-weight:800; cursor:pointer; transition:all 0.2s ease;">
                🌐 TODOS (${allPacks.length})
            </button>
            <button onclick="setAdminSeriesTab('DM')" style="background:${currentAdminSeriesTab === 'DM' ? 'linear-gradient(135deg, rgba(0,240,255,0.3) 0%, rgba(14,165,233,0.2) 100%)' : 'rgba(15,23,42,0.6)'}; color:${currentAdminSeriesTab === 'DM' ? '#00f0ff' : '#94a3b8'}; border:1px solid ${currentAdminSeriesTab === 'DM' ? '#00f0ff' : 'rgba(255,255,255,0.1)'}; padding:5px 12px; border-radius:8px; font-family:'Orbitron', sans-serif; font-size:10.5px; font-weight:800; cursor:pointer; transition:all 0.2s ease;">
                🏛️ DM (11)
            </button>
            <button onclick="setAdminSeriesTab('GX')" style="background:${currentAdminSeriesTab === 'GX' ? 'linear-gradient(135deg, rgba(239,68,68,0.3) 0%, rgba(249,115,22,0.2) 100%)' : 'rgba(15,23,42,0.6)'}; color:${currentAdminSeriesTab === 'GX' ? '#ff3b30' : '#94a3b8'}; border:1px solid ${currentAdminSeriesTab === 'GX' ? '#ff3b30' : 'rgba(255,255,255,0.1)'}; padding:5px 12px; border-radius:8px; font-family:'Orbitron', sans-serif; font-size:10.5px; font-weight:800; cursor:pointer; transition:all 0.2s ease;">
                🎓 GX (13)
            </button>
            <button onclick="setAdminSeriesTab('5D')" style="background:${currentAdminSeriesTab === '5D' ? 'linear-gradient(135deg, rgba(16,185,129,0.35) 0%, rgba(5,150,105,0.25) 100%)' : 'rgba(15,23,42,0.6)'}; color:${currentAdminSeriesTab === '5D' ? '#10b981' : '#94a3b8'}; border:1px solid ${currentAdminSeriesTab === '5D' ? '#10b981' : 'rgba(255,255,255,0.1)'}; padding:5px 12px; border-radius:8px; font-family:'Orbitron', sans-serif; font-size:10.5px; font-weight:800; cursor:pointer; transition:all 0.2s ease;">
                🏎️ 5D'S (1)
            </button>
            <button onclick="setAdminSeriesTab('EVENT')" style="background:${currentAdminSeriesTab === 'EVENT' ? 'linear-gradient(135deg, rgba(234,179,8,0.3) 0%, rgba(202,138,4,0.2) 100%)' : 'rgba(15,23,42,0.6)'}; color:${currentAdminSeriesTab === 'EVENT' ? '#ffd700' : '#94a3b8'}; border:1px solid ${currentAdminSeriesTab === 'EVENT' ? '#ffd700' : 'rgba(255,255,255,0.1)'}; padding:5px 12px; border-radius:8px; font-family:'Orbitron', sans-serif; font-size:10.5px; font-weight:800; cursor:pointer; transition:all 0.2s ease;">
                ⭐ EVENTOS (3)
            </button>
        </div>
    `;

    const cardsHtml = filteredPacks.map(pack => {
        const isPackActive = pack.active !== false;
        const isPackVisible = pack.visible !== false;
        const offerText = pack.offer_text || 'SIN OFERTA';
        const price = pack.price !== undefined ? pack.price : 1500;
        
        let packImg = pack.image || '../../../assets/images/packs/lob_pack.jpg';
        if (packImg.startsWith('../../assets/')) {
            packImg = packImg.replace('../../assets/', '../../../assets/');
        }

        const borderColor = !isPackVisible ? 'rgba(148, 163, 184, 0.4)' : (isPackActive ? 'rgba(0,240,255,0.4)' : 'rgba(239,68,68,0.4)');

        return `
            <div class="shop-card" style="position:relative; overflow:hidden; border:1.5px solid ${borderColor}; opacity:${!isPackVisible ? '0.75' : '1'};">
                
                <!-- CINTA DIAGONAL DE OFERTA EN AMARILLO NEÓN -->
                <div style="position:absolute; top:32px; left:-50px; width:200px; transform:rotate(-35deg); background:linear-gradient(135deg, #ffd700 0%, #f59e0b 100%); color:#020617; font-family:'Orbitron', sans-serif; font-size:10.5px; font-weight:900; padding:6.5px 0; text-transform:uppercase; letter-spacing:0.4px; box-shadow:0 3px 12px rgba(0,0,0,0.5), 0 0 16px rgba(255, 215, 0, 0.9); z-index:10; pointer-events:none; border-top:1.2px solid #ffffff; border-bottom:1.5px solid rgba(0,0,0,0.6); text-align:center; white-space:nowrap; text-shadow:0 0 2px rgba(255,255,255,0.5);">
                    ${offerText}
                </div>

                <div>
                    <!-- HEADER DEL CARD ADMIN: SWITCHES DE ESTADO Y VISIBILIDAD -->
                    <div class="shop-card-header" style="display:flex; justify-content:space-between; align-items:center; width:100%; z-index:15; position:relative; gap:4px; margin-bottom:4px;">
                        
                        <!-- SWITCH VISIBLE EN TIENDA (MOSTRAR / OCULTAR) -->
                        <label title="Controla si los usuarios pueden ver este sobre en la Tienda" style="display:inline-flex; align-items:center; gap:4px; background:rgba(15,23,42,0.92); border:1px solid ${isPackVisible ? '#00f0ff' : '#64748b'}; padding:2px 6px; border-radius:10px; cursor:pointer;" onclick="event.stopPropagation();">
                            <input type="checkbox" ${isPackVisible ? 'checked' : ''} onchange="togglePackVisible('${pack.id}', this.checked)" style="accent-color:#00f0ff; width:12px; height:12px; cursor:pointer;">
                            <span style="font-family:'Orbitron', sans-serif; font-size:7.5px; font-weight:900; color:${isPackVisible ? '#00f0ff' : '#94a3b8'}; text-transform:uppercase;">
                                ${isPackVisible ? '👁️ TIENDA' : '🚫 OCULTO'}
                            </span>
                        </label>

                        <!-- SWITCH ACTIVO / DESACTIVADO (DISPONIBLE / PRÓXIMAMENTE) -->
                        <label title="Controla si el sobre se puede comprar o aparece como Próximamente" style="display:inline-flex; align-items:center; gap:4px; background:rgba(15,23,42,0.92); border:1px solid ${isPackActive ? '#10b981' : '#ef4444'}; padding:2px 6px; border-radius:10px; cursor:pointer;" onclick="event.stopPropagation();">
                            <input type="checkbox" ${isPackActive ? 'checked' : ''} onchange="togglePackActive('${pack.id}', this.checked)" style="accent-color:#10b981; width:12px; height:12px; cursor:pointer;">
                            <span style="font-family:'Orbitron', sans-serif; font-size:7.5px; font-weight:900; color:${isPackActive ? '#10b981' : '#ef4444'}; text-transform:uppercase;">
                                ${isPackActive ? 'ACTIVO' : 'PRÓXIMO'}
                            </span>
                        </label>
                    </div>

                    <div class="shop-card-artwork">
                        <img src="${packImg}" alt="${pack.name}" class="shop-card-img" onerror="this.onerror=null; this.src='https://images.ygoprodeck.com/images/cards_small/89631139.jpg';" style="object-fit:contain; padding:4px; filter:${isPackActive ? 'drop-shadow(0 0 8px rgba(0,240,255,0.6))' : 'grayscale(0.6) opacity(0.7)'};">
                        <div class="shop-card-glow-overlay"></div>
                    </div>

                    <div class="shop-card-title">${pack.name}</div>
                    <div class="shop-card-desc">
                        ${pack.description || 'Expansión de cartas Ani-Dimension.'}
                    </div>
                </div>

                <!-- BOTTOM BAR CON INPUT DE PRECIO Y BOTÓN EDITAR SOBRE -->
                <div style="display:flex; align-items:center; justify-content:space-between; width:100%; margin-top:6px; padding-top:6px; border-top:1px dashed rgba(255,255,255,0.15); gap:6px; box-sizing:border-box;" onclick="event.stopPropagation();">
                    <div style="display:inline-flex; align-items:center; gap:4px; background:rgba(0,0,0,0.85); border:1px solid #ffd700; border-radius:4px; padding:2px 6px; flex-shrink:0;">
                        <span style="font-size:11px; color:#ffd700; line-height:1;">⭐</span>
                        <input type="number" value="${price}" onchange="updatePackPrice('${pack.id}', this.value)" style="width:52px; background:transparent; border:none; color:#ffd700; font-family:'Orbitron', sans-serif; font-size:10.5px; font-weight:900; outline:none; text-align:right; -moz-appearance:textfield;" title="Precio del sobre en StarShips">
                    </div>

                    <button class="btn-admin-pack-edit" onclick="location.href='cards-sobre-detalle.html?pack_id=${pack.id}'" style="display:inline-flex; align-items:center; justify-content:center; gap:5px; height:24px; padding:0 8px; font-family:'Orbitron', sans-serif; font-size:8px; font-weight:900; background:linear-gradient(90deg, #f59e0b, #eab308); color:#0f172a; border:none; border-radius:3px; cursor:pointer; white-space:nowrap; flex-shrink:0; text-transform:uppercase; transition:all 0.2s ease;">
                        <span>EDITAR SOBRE</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:10px; height:10px;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = tabsHtml + cardsHtml;
}

async function togglePackActive(packId, isChecked) {
    if (!window.PacksManager) return;
    const pack = window.PacksManager.getPackById(packId);
    if (!pack) return;

    pack.active = isChecked;
    await window.PacksManager.savePackToDb(packId, { active: isChecked });
    renderAdminPacksGrid();
}

async function togglePackVisible(packId, isChecked) {
    if (!window.PacksManager) return;
    const pack = window.PacksManager.getPackById(packId);
    if (!pack) return;

    pack.visible = isChecked;
    await window.PacksManager.savePackToDb(packId, { visible: isChecked });
    renderAdminPacksGrid();
}

async function updatePackPrice(packId, newPrice) {
    if (!window.PacksManager) return;
    const pack = window.PacksManager.getPackById(packId);
    if (!pack) return;

    const priceVal = Math.max(0, parseInt(newPrice) || 0);
    pack.price = priceVal;
    await window.PacksManager.savePackToDb(packId, { price: priceVal });
    renderAdminPacksGrid();
}
