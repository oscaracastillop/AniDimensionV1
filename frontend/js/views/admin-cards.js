/**
 * ANI-DIMENSION: LÓGICA DE GERENCIA DE SOBRES (ADMINISTRACIÓN)
 * RENDERIZA LA REJILLA FIEL A LA TIENDA DE SOBRES CON CONTROLES ADMIN DIRECTOS
 */
document.addEventListener('DOMContentLoaded', () => {
    initAdminPacksView();
});

function initAdminPacksView() {
    renderAdminPacksGrid();
}

function renderAdminPacksGrid() {
    const container = document.getElementById('admin-packs-grid-container');
    if (!container) return;

    const packs = window.PacksManager ? window.PacksManager.getPacks() : [];

    container.innerHTML = packs.map(pack => {
        const isPackActive = pack.active !== false;
        const offerText = pack.offer_text || 'SIN OFERTA';
        const price = pack.price !== undefined ? pack.price : 1500;
        
        let packImg = pack.image || '../../../assets/images/packs/lob_pack.jpg';
        if (packImg.startsWith('../../assets/')) {
            packImg = packImg.replace('../../assets/', '../../../assets/');
        }

        return `
            <div class="shop-card" style="position:relative; overflow:hidden; border:1.5px solid ${isPackActive ? 'rgba(0,240,255,0.4)' : 'rgba(239,68,68,0.4)'};">
                
                <!-- CINTA DIAGONAL DE OFERTA EN AMARILLO NEÓN -->
                <div style="position:absolute; top:32px; left:-50px; width:200px; transform:rotate(-35deg); background:linear-gradient(135deg, #ffd700 0%, #f59e0b 100%); color:#020617; font-family:'Orbitron', sans-serif; font-size:10.5px; font-weight:900; padding:6.5px 0; text-transform:uppercase; letter-spacing:0.4px; box-shadow:0 3px 12px rgba(0,0,0,0.5), 0 0 16px rgba(255, 215, 0, 0.9); z-index:10; pointer-events:none; border-top:1.2px solid #ffffff; border-bottom:1.5px solid rgba(0,0,0,0.6); text-align:center; white-space:nowrap; text-shadow:0 0 2px rgba(255,255,255,0.5);">
                    ${offerText}
                </div>

                <div>
                    <!-- HEADER DEL CARD ADMIN: SWITCH ACTIVO / DESACTIVADO EN ESQUINA SUPERIOR DERECHA -->
                    <div class="shop-card-header" style="display:flex; justify-content:flex-end; align-items:center; width:100%; z-index:15; position:relative;">
                        <label style="display:inline-flex; align-items:center; gap:5px; background:rgba(15,23,42,0.9); border:1px solid ${isPackActive ? '#10b981' : '#ef4444'}; padding:2px 7px; border-radius:12px; cursor:pointer;" onclick="event.stopPropagation();">
                            <input type="checkbox" ${isPackActive ? 'checked' : ''} onchange="togglePackActive('${pack.id}', this.checked)" style="accent-color:#10b981; cursor:pointer;">
                            <span style="font-family:'Orbitron', sans-serif; font-size:8px; font-weight:900; color:${isPackActive ? '#10b981' : '#ef4444'}; text-transform:uppercase;">
                                ${isPackActive ? 'ACTIVO' : 'DESACTIVADO'}
                            </span>
                        </label>
                    </div>

                    <div class="shop-card-artwork">
                        <img src="${packImg}" alt="${pack.name}" class="shop-card-img" onerror="this.onerror=null; this.src='../../../assets/images/packs/lob_pack.jpg';" style="object-fit:contain; padding:4px; filter:${isPackActive ? 'drop-shadow(0 0 8px rgba(0,240,255,0.6))' : 'grayscale(0.6) opacity(0.7)'};">
                        <div class="shop-card-glow-overlay"></div>
                    </div>

                    <div class="shop-card-title">${pack.name}</div>
                    <div class="shop-card-desc">
                        ${pack.description || 'Expansión de cartas OCG Ani-Dimension.'}
                    </div>
                </div>

                <!-- BOTTOM BAR CON INPUT DE PRECIO Y BOTÓN EDITAR SOBRE -->
                <div style="display:flex; align-items:center; justify-content:space-between; width:100%; margin-top:4px; padding-top:4px; border-top:1px dashed rgba(255,255,255,0.15);" onclick="event.stopPropagation();">
                    <div style="display:flex; align-items:center; gap:4px; font-family:'Orbitron', sans-serif; font-size:10px; font-weight:900; color:#ffd700;">
                        ⭐
                        <input type="number" value="${price}" onchange="updatePackPrice('${pack.id}', this.value)" style="width:65px; font-family:'Orbitron', sans-serif; font-size:10px; font-weight:900; background:rgba(0,0,0,0.7); border:1px solid #ffd700; color:#ffd700; border-radius:4px; padding:2px 4px; outline:none; text-align:center;" title="Precio del sobre en StarShips">
                    </div>

                    <button class="btn-shop-access" onclick="location.href='cards-sobre-detalle.html?pack_id=${pack.id}'" style="margin:0 !important; height:22px !important; min-width:85px !important; max-width:105px !important; padding:2px 6px !important; font-size:7.5px !important; background:linear-gradient(90deg, #f59e0b, #eab308) !important; color:#0f172a !important; font-weight:900 !important;">
                        <span>EDITAR SOBRE</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:10px; height:10px;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function togglePackActive(packId, isChecked) {
    const packs = window.PacksManager.getPacks();
    const pack = packs.find(p => p.id === packId);
    if (!pack) return;

    pack.active = isChecked;
    window.PacksManager.savePacks(packs);
    renderAdminPacksGrid();
}

function updatePackPrice(packId, newPrice) {
    const packs = window.PacksManager.getPacks();
    const pack = packs.find(p => p.id === packId);
    if (!pack) return;

    pack.price = Math.max(0, parseInt(newPrice) || 0);
    window.PacksManager.savePacks(packs);
    renderAdminPacksGrid();
}
