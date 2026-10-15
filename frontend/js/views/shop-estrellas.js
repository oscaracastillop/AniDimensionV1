/**
 * JS Lógica para la Tienda de Recarga de StarShips ($ USD)
 * Ani-Dimension - SINCRONIZACIÓN 1:1 CON GERENCIA DE ESTRELLAS
 */

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

async function renderShopEstrellasGrid() {
    const container = document.getElementById('shop-estrellas-grid-container');
    if (!container) return;

    let packages = [];

    try {
        const res = await fetch('/api/admin/estrellas');
        if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.packages)) {
                packages = data.packages.filter(p => p.activo !== 0 && p.activo !== false);
            }
        }
    } catch (e) {
        console.warn('Usando catálogo local de estrellas:', e);
    }

    if (!packages.length && window.EstrellasData && window.EstrellasData.packages) {
        packages = window.EstrellasData.packages.filter(p => p.activo !== 0 && p.activo !== false);
    }

    if (!packages || packages.length === 0) {
        container.innerHTML = `
            <div class="shop-empty-category-container">
                <div class="shop-empty-icon" style="color:#ffd700;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:100%; height:100%;">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                </div>
                <div class="shop-empty-title">NO HAY PAQUETES DE STARSHIPS DISPONIBLES</div>
                <div class="shop-empty-desc">No se encontraron paquetes de recarga activos en este momento.</div>
            </div>
        `;
        return;
    }

    let gridHtml = '';

    packages.forEach(pkg => {
        const rawPrice = parseFloat(pkg.precio_usd !== undefined ? pkg.precio_usd : (pkg.price !== undefined ? pkg.price : 0.99));
        const bannerText = pkg.banner_tag || pkg.offer_text || 'STARSHIPS';
        const base = parseInt(pkg.estrellas_base !== undefined ? pkg.estrellas_base : (pkg.stars !== undefined ? pkg.stars : 5000), 10);
        const bonus = parseInt(pkg.estrellas_bonus !== undefined ? pkg.estrellas_bonus : (pkg.bonus !== undefined ? pkg.bonus : 0), 10);
        const total = base + bonus;
        const code = pkg.codigo || pkg.code || '';
        const name = pkg.nombre || pkg.name || 'Bolsa de StarShips';

        // Determinar estilo temático según el nivel del paquete
        let theme = {
            borderColor: '#ffd700',
            cardBg: 'linear-gradient(180deg, rgba(38, 28, 6, 0.95) 0%, rgba(16, 11, 2, 0.98) 100%)',
            boxShadow: '0 0 25px rgba(255, 215, 0, 0.25)',
            bannerBg: 'linear-gradient(135deg, #ffd700, #f59e0b)',
            bannerColor: '#000',
            bannerShadow: '0 0 10px rgba(255, 215, 0, 0.5)',
            artworkBg: 'radial-gradient(circle, rgba(255, 215, 0, 0.2) 0%, rgba(16, 11, 2, 0.95) 75%)',
            artBorder: 'rgba(255, 215, 0, 0.35)',
            crestColor: '#ffd700',
            badgeBg: 'rgba(255, 215, 0, 0.15)',
            badgeBorder: '#ffd700',
            badgeColor: '#ffd700',
            btnBg: 'linear-gradient(135deg, rgba(234, 179, 8, 0.25), rgba(217, 119, 6, 0.55))',
            btnBorder: '#ffd700',
            btnShadow: '0 0 10px rgba(255, 215, 0, 0.3)',
            crestSvg: `
                <svg viewBox="0 0 64 64" fill="none" style="width:48px; height:48px; filter:drop-shadow(0 0 10px rgba(255,215,0,0.8));">
                    <polygon points="32,4 40,22 60,25 45,39 49,59 32,49 15,59 19,39 4,25 24,22" stroke="#ffd700" stroke-width="2.2" fill="rgba(255,215,0,0.2)"/>
                    <circle cx="32" cy="34" r="8" stroke="#f59e0b" stroke-width="1.5" fill="rgba(255,215,0,0.3)"/>
                </svg>
            `
        };

        if (bonus >= 100000) {
            theme.bannerBg = 'linear-gradient(135deg, #ec4899, #8b5cf6)';
            theme.bannerColor = '#fff';
            theme.borderColor = '#c084fc';
            theme.boxShadow = '0 0 25px rgba(192, 132, 252, 0.35)';
            theme.btnBorder = '#c084fc';
            theme.btnBg = 'linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(124, 58, 237, 0.6))';
            theme.btnShadow = '0 0 10px rgba(168, 85, 247, 0.4)';
        }

        const btnStyle = `
            width: 100% !important;
            height: 25px !important;
            border-radius: 0 !important;
            font-family: 'Orbitron', sans-serif !important;
            font-size: 8px !important;
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
            <div class="potenciador-shop-card" style="background:${theme.cardBg}; border:1.5px solid ${theme.borderColor}; box-shadow:${theme.boxShadow}; position:relative; overflow:hidden;">
                <!-- BANNER DE OFERTA / TIER COMPLETAMENTE CENTRADO -->
                <div style="background:${theme.bannerBg}; color:${theme.bannerColor}; box-shadow:${theme.bannerShadow}; text-align:center; font-family:'Orbitron', sans-serif; font-size:9.5px; font-weight:600; letter-spacing:0.8px; padding:4px 0; width:100%; border-bottom:1px solid rgba(0,0,0,0.3);">
                    ${bannerText}
                </div>

                <!-- EMBLEMA CYBER VECTORIAL Y BADGE DE TOTAL STARSHIPS -->
                <div class="pot-card-artwork" style="background:${theme.artworkBg}; border-bottom:1px solid ${theme.artBorder}; padding:14px 10px 10px 10px; text-align:center;">
                    <div style="margin-bottom:6px; display:flex; align-items:center; justify-content:center;">
                        ${theme.crestSvg}
                    </div>
                    <div style="font-family:'Orbitron', sans-serif; font-size:9px; font-weight:500; color:${theme.badgeColor}; background:${theme.badgeBg}; border:1px solid ${theme.badgeBorder}; padding:2.5px 8px; letter-spacing:0.4px; box-shadow:0 0 8px rgba(0,0,0,0.5); display:inline-block;">
                        ⭐ ${total.toLocaleString()} STARSHIPS
                    </div>
                </div>

                <!-- INFORMACIÓN DEL PAQUETE -->
                <div class="pot-card-body" style="padding:10px 12px; background:rgba(0,0,0,0.45); text-align:center;">
                    <div style="font-family:'Orbitron', sans-serif; font-size:8.5px; color:${theme.crestColor}; font-weight:400; letter-spacing:0.4px;">${code}</div>
                    <div style="font-family:'Outfit', sans-serif; font-size:12px; font-weight:500; color:#ffffff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin:3px 0 8px 0; letter-spacing:0.2px;">${name}</div>

                    <!-- 3 ESTADÍSTICAS DEL PAQUETE -->
                    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:4px; margin-bottom:10px;">
                        <div style="background:rgba(0,240,255,0.08); border:1px solid rgba(0,240,255,0.25); padding:4px 2px; text-align:center;">
                            <div style="font-size:7.5px; color:#94a3b8; font-weight:400;">BASE</div>
                            <div style="font-family:'Orbitron', sans-serif; font-size:8.5px; font-weight:500; color:#00f0ff;">${base.toLocaleString()}</div>
                        </div>
                        <div style="background:rgba(34,197,94,0.08); border:1px solid rgba(34,197,94,0.25); padding:4px 2px; text-align:center;">
                            <div style="font-size:7.5px; color:#94a3b8; font-weight:400;">BONUS</div>
                            <div style="font-family:'Orbitron', sans-serif; font-size:8.5px; font-weight:500; color:#4ade80;">+${bonus.toLocaleString()}</div>
                        </div>
                        <div style="background:rgba(255,215,0,0.08); border:1px solid rgba(255,215,0,0.25); padding:4px 2px; text-align:center;">
                            <div style="font-size:7.5px; color:#94a3b8; font-weight:400;">TOTAL</div>
                            <div style="font-family:'Orbitron', sans-serif; font-size:8.5px; font-weight:500; color:#ffd700;">${total.toLocaleString()}</div>
                        </div>
                    </div>

                    <!-- BOTÓN DE ACCIÓN ESTILIZADO -->
                    <button type="button" style="${btnStyle}" onclick="window.ShopEstrellas.buyUsd('${code}')">
                        <span>Adquirir $ ${rawPrice.toFixed(2)} USD</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:10px; height:10px;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = gridHtml;
}

window.ShopEstrellas = {
    buyUsd: function (codigo) {
        if (window.SoundManager && typeof window.SoundManager.playSFX === 'function') {
            window.SoundManager.playSFX('button');
        }
        window.location.href = `shop-pago-instrucciones.html?type=estrellas&code=${encodeURIComponent(codigo)}`;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    updateBalanceDisplay();
    renderShopEstrellasGrid();
});
