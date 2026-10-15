/**
 * JS Lógica para la Tienda de Cartas Singles ($ USD)
 * Ani-Dimension - NOMBRES ORIGINALES, SIN BADGES DE EXPANSIONES, DESCRIPCIÓN COMPLETA
 */

let currentCardsFilter = 'ALL'; // 'ALL', 'monster', 'spell_trap'

function getUserStarshipsBalance() {
    if (window.Session && typeof window.Session.getStarships === 'function') {
        return window.Session.getStarships();
    }
    return 0;
}

function updateBalanceDisplay() {
    const coinEl = document.getElementById('shop-user-coins');
    if (coinEl) {
        coinEl.textContent = `⭐ ${getUserStarshipsBalance().toLocaleString()}`;
    }
}

function getCardImgUrl(card) {
    const cId = card.cardId || card.card_id;
    if (card.image && typeof card.image === 'string') {
        let clean = card.image.trim();
        if (clean.startsWith('/http://') || clean.startsWith('/https://')) {
            clean = clean.substring(1);
        }
        if (clean.startsWith('http://') || clean.startsWith('https://')) {
            return clean;
        }
        if (clean.length > 0 && !clean.includes('placeholder') && !clean.startsWith('/assets/images/cards/')) {
            return clean;
        }
    }
    if (cId) {
        return `https://images.ygoprodeck.com/images/cards_small/${cId}.jpg`;
    }
    return 'https://images.ygoprodeck.com/images/cards_small/89631139.jpg';
}

async function renderShopCartasGrid() {
    const container = document.getElementById('shop-cartas-grid-container');
    if (!container) return;

    let cartas = [];

    try {
        const res = await fetch('/api/admin/cartas-singles');
        if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.singles || data.cartas)) {
                cartas = (data.singles || data.cartas).filter(c => c.activo !== 0 && c.activo !== false && c.active !== false);
            }
        }
    } catch (e) {
        console.warn('Usando catálogo local de cartas singles:', e);
    }

    if (!cartas.length && window.CartasSinglesData && window.CartasSinglesData.cartas) {
        cartas = window.CartasSinglesData.cartas.filter(c => c.activo !== 0 && c.activo !== false && c.active !== false);
    }

    // Ordenamiento preferencial para coincidir con la vista estándar de referencia
    const preferredOrder = [
        'CARD-SING-05', // Raigeki
        'CARD-SING-06', // Monster Reborn
        'CARD-SING-07', // Mirror Force
        'CARD-SING-08', // Change of Heart
        'CARD-SING-09', // Summoned Skull
        'CARD-SING-01', // Blue-Eyes White Dragon
        'CARD-SING-02', // Dark Magician
        'CARD-SING-03', // Red-Eyes Black Dragon
        'CARD-SING-04'  // Exodia
    ];

    cartas.sort((a, b) => {
        const codeA = (a.code || a.codigo || '').toUpperCase();
        const codeB = (b.code || b.codigo || '').toUpperCase();
        const idxA = preferredOrder.indexOf(codeA);
        const idxB = preferredOrder.indexOf(codeB);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return (a.price || 0) - (b.price || 0);
    });

    // Filtrado inteligente por categoría
    if (currentCardsFilter === 'monster') {
        cartas = cartas.filter(c => {
            const t = (c.tipo_carta || c.card_type || c.categoria || c.type || '').toLowerCase();
            const n = (c.name || c.nombre || '').toLowerCase();
            return t.includes('monstruo') || t.includes('monster') || n.includes('dragon') || n.includes('magician') || n.includes('skull') || n.includes('exodia');
        });
    } else if (currentCardsFilter === 'spell_trap') {
        cartas = cartas.filter(c => {
            const t = (c.tipo_carta || c.card_type || c.categoria || c.type || '').toLowerCase();
            const n = (c.name || c.nombre || '').toLowerCase();
            return t.includes('mágica') || t.includes('trampa') || t.includes('spell') || t.includes('trap') || n.includes('raigeki') || n.includes('reborn') || n.includes('mirror') || n.includes('heart');
        });
    }

    if (!cartas || cartas.length === 0) {
        container.innerHTML = `
            <div class="shop-empty-category-container">
                <div class="shop-empty-icon" style="color:#00f0ff;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:100%; height:100%;">
                        <rect x="2" y="3" width="20" height="18" rx="2" ry="2"></rect>
                        <line x1="8" y1="21" x2="8" y2="3"></line>
                        <line x1="16" y1="21" x2="16" y2="3"></line>
                    </svg>
                </div>
                <div class="shop-empty-title">NO HAY CARTAS DISPONIBLES EN ESTA CATEGORÍA</div>
                <div class="shop-empty-desc">No se encontraron cartas activas con el filtro seleccionado.</div>
            </div>
        `;
        return;
    }

    let gridHtml = '';

    cartas.forEach(card => {
        const rawPrice = parseFloat(card.precio_usd !== undefined ? card.precio_usd : (card.price !== undefined ? card.price : 1.99));
        const code = card.codigo || card.code || '';
        const name = card.name || card.nombre || 'Card';
        const rareza = card.rareza || card.rarity || 'Ultra Rare';
        const cardType = card.tipo_carta || card.card_type || (name.includes('Dragon') || name.includes('Magician') || name.includes('Skull') || name.includes('Exodia') ? 'Monstruo' : 'Carta Mágica / Trampa');
        const descText = card.description || card.descripcion || '';

        const cId = card.cardId || card.card_id;
        const imgThumb = getCardImgUrl(card);

        const theme = {
            borderColor: '#00f0ff',
            cardBg: 'linear-gradient(180deg, rgba(8, 26, 48, 0.95) 0%, rgba(3, 10, 22, 0.98) 100%)',
            boxShadow: '0 0 25px rgba(0, 240, 255, 0.2)',
            bannerBg: 'linear-gradient(135deg, rgba(0, 240, 255, 0.3), rgba(14, 165, 233, 0.7))',
            bannerColor: '#ffffff',
            bannerBorder: '1px solid rgba(0, 240, 255, 0.4)',
            artworkBg: 'radial-gradient(circle, rgba(0, 240, 255, 0.18) 0%, rgba(3, 10, 22, 0.95) 75%)',
            artBorder: 'rgba(0, 240, 255, 0.3)',
            crestColor: '#00f0ff',
            btnBg: 'linear-gradient(135deg, rgba(0, 240, 255, 0.25), rgba(14, 165, 233, 0.55))',
            btnBorder: '#00f0ff',
            btnShadow: '0 0 10px rgba(0, 240, 255, 0.3)'
        };

        const btnStyle = `
            width: 100% !important;
            height: 25px !important;
            border-radius: 0 !important;
            font-family: 'Orbitron', sans-serif !important;
            font-size: 8.5px !important;
            font-weight: 500 !important;
            letter-spacing: 0.4px !important;
            text-transform: uppercase !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 5px !important;
            padding: 4px 8px !important;
            cursor: pointer !important;
            color: #ffffff !important;
            background: ${theme.btnBg} !important;
            border: 1.2px solid ${theme.btnBorder} !important;
            box-shadow: ${theme.btnShadow} !important;
            transition: all 0.2s ease !important;
            box-sizing: border-box !important;
        `;

        gridHtml += `
            <div class="potenciador-shop-card" style="background:${theme.cardBg}; border:1.5px solid ${theme.borderColor}; box-shadow:${theme.boxShadow}; position:relative; overflow:hidden; display:flex; flex-direction:column; justify-content:space-between;">
                
                <!-- HEADER SUPERIOR CON EL NOMBRE ORIGINAL DE LA CARTA -->
                <div style="background:${theme.bannerBg}; color:${theme.bannerColor}; border-bottom:${theme.bannerBorder}; text-align:center; font-family:'Orbitron', sans-serif; font-size:9.5px; font-weight:700; letter-spacing:0.6px; padding:5px 6px; width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    ${name.toUpperCase()}
                </div>

                <!-- PREVIEW DE LA CARTA CON IMAGEN DE LA API -->
                <div class="pot-card-artwork" style="background:${theme.artworkBg}; border-bottom:1px solid ${theme.artBorder}; padding:12px 10px 10px 10px; text-align:center; flex-shrink:0;">
                    <div style="display:flex; align-items:center; justify-content:center;">
                        <img src="${imgThumb}" alt="${name}" style="height:102px; width:auto; object-fit:contain; filter:drop-shadow(0 0 10px rgba(0,240,255,0.45));" onerror="this.onerror=null; this.src='https://images.ygoprodeck.com/images/cards/${cId || 89631139}.jpg';">
                    </div>
                </div>

                <!-- INFORMACIÓN DE LA CARTA: CÓDIGO, DESCRIPCIÓN COMPLETA, TIPO Y RAREZA -->
                <div class="pot-card-body" style="padding:8px 10px; background:rgba(0,0,0,0.45); text-align:center; flex:1; display:flex; flex-direction:column; justify-content:space-between;">
                    <div>
                        <div style="font-family:'Orbitron', sans-serif; font-size:8.5px; color:${theme.crestColor}; font-weight:400; letter-spacing:0.4px;">${code}</div>
                        
                        <!-- DESCRIPCIÓN CON FUENTE COMPACTA PARA MOSTRAR TODO EL CONTENIDO -->
                        <div style="font-family:'Outfit', sans-serif; font-size:9px; color:#cbd5e1; line-height:1.3; margin:4px 0 8px 0; min-height:36px; display:flex; align-items:center; justify-content:center; text-align:center;">
                            ${descText}
                        </div>

                        <!-- 2 METADATOS CLAROS: TIPO DE CARTA Y RAREZA -->
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px; margin-bottom:8px;">
                            <div style="background:rgba(0,240,255,0.08); border:1px solid rgba(0,240,255,0.25); padding:3px 2px; text-align:center;">
                                <div style="font-size:7px; color:#94a3b8; font-weight:400;">TIPO</div>
                                <div style="font-family:'Orbitron', sans-serif; font-size:8px; font-weight:500; color:#00f0ff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${cardType}</div>
                            </div>
                            <div style="background:rgba(255,215,0,0.08); border:1px solid rgba(255,215,0,0.25); padding:3px 2px; text-align:center;">
                                <div style="font-size:7px; color:#94a3b8; font-weight:400;">RAREZA</div>
                                <div style="font-family:'Orbitron', sans-serif; font-size:8px; font-weight:500; color:#ffd700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${rareza}</div>
                            </div>
                        </div>
                    </div>

                    <!-- BOTÓN DE COMPRA USD -->
                    <button type="button" style="${btnStyle}" onclick="if(window.SoundManager) window.SoundManager.playSFX('button'); window.ShopCartas.buyUsd('${code}')">
                        <span>Adquirir $ ${rawPrice.toFixed(2)} USD</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:10px; height:10px;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = gridHtml;
}

window.setCartasCategoryFilter = function (filter, btn) {
    currentCardsFilter = filter;
    const group = document.getElementById('filter-cards-group');
    if (group) {
        group.querySelectorAll('.btn-filter-pill').forEach(b => b.classList.remove('active'));
    }
    if (btn) btn.classList.add('active');
    renderShopCartasGrid();
};

window.ShopCartas = {
    buyUsd: function (codigo) {
        window.location.href = `shop-pago-instrucciones.html?type=carta&code=${encodeURIComponent(codigo)}`;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    updateBalanceDisplay();
    renderShopCartasGrid();
});
