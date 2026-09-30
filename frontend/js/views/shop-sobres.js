/**
 * ANI-DIMENSION: TIENDA DE SOBRES Y APERTURA AUTOMÁTICA DE 4 CARTAS
 * RENDERIZA TODOS LOS SOBRES DESDE EL PANEL DE ADMINISTRACIÓN (SINGLE SOURCE OF TRUTH)
 */
document.addEventListener('DOMContentLoaded', () => {
    initShopSobres();
});

function initShopSobres() {
    renderShopPacks();
    updateUserBalanceDisplay();
}

function updateUserBalanceDisplay() {
    const balanceElem = document.getElementById('shop-user-coins');
    const userCoins = localStorage.getItem('ad_user_coins') || 5000;
    if (balanceElem) {
        balanceElem.textContent = `⭐ ${parseInt(userCoins).toLocaleString()}`;
    }
}

function renderShopPacks() {
    const container = document.querySelector('.shop-scroll-content');
    if (!container) return;

    const allPacks = window.PacksManager ? window.PacksManager.getPacks() : [];

    container.innerHTML = `
        <div class="shop-grid-container">
            ${allPacks.map(pack => {
                const isPackActive = pack.active !== false;
                const offerText = pack.offer_text || '';
                const priceText = (pack.price !== undefined ? pack.price : 1500).toLocaleString();
                const packImg = pack.image || '../../assets/images/packs/lob_pack.jpg';

                return `
                    <div class="shop-card" ${isPackActive ? `onclick="location.href='shop-sobre-detalle.html?pack_id=${pack.id}'"` : ''} style="position:relative; overflow:hidden; opacity:${isPackActive ? '1' : '0.85'};">
                        
                        <!-- CINTA DIAGONAL DE OFERTA EN AMARILLO NEÓN (TEXTO MÁXIMO 12 CARACTERES) -->
                        ${offerText ? `
                        <div style="position:absolute; top:32px; left:-50px; width:200px; transform:rotate(-35deg); background:linear-gradient(135deg, #ffd700 0%, #f59e0b 100%); color:#020617; font-family:'Orbitron', sans-serif; font-size:10.5px; font-weight:900; padding:6.5px 0; text-transform:uppercase; letter-spacing:0.4px; box-shadow:0 3px 12px rgba(0,0,0,0.5), 0 0 16px rgba(255, 215, 0, 0.9); z-index:10; pointer-events:none; border-top:1.2px solid #ffffff; border-bottom:1.5px solid rgba(0,0,0,0.6); text-align:center; white-space:nowrap; text-shadow:0 0 2px rgba(255,255,255,0.5);">
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
                                <img src="${packImg}" alt="${pack.name}" class="shop-card-img" onerror="this.onerror=null; this.src='../../assets/images/packs/lob_pack.jpg';" style="object-fit:contain; padding:4px; ${isPackActive ? 'filter:drop-shadow(0 0 8px rgba(0,240,255,0.6));' : 'opacity:0.75;'}">
                                <div class="shop-card-glow-overlay"></div>
                            </div>
                            <div class="shop-card-title">${pack.name}</div>
                            <div class="shop-card-desc">
                                ${pack.description || ''}
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
