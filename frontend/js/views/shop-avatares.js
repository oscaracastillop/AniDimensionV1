/**
 * JS Lógica para la Tienda de Avatares
 * Ani-Dimension - SINCRONIZACIÓN 1:1 CON GERENCIA DE AVATARES
 */

(function () {
    let userStarships = 100000; // Saldo por defecto de prueba

    function loadUserCurrency() {
        const savedCurrency = localStorage.getItem('ad_user_starships');
        if (savedCurrency !== null) {
            userStarships = parseFloat(savedCurrency);
        } else {
            localStorage.setItem('ad_user_starships', userStarships.toString());
        }
        updateBalanceDisplay();
    }

    function updateBalanceDisplay() {
        const coinEl = document.getElementById('shop-user-coins');
        if (coinEl) {
            coinEl.textContent = `⭐ ${userStarships.toLocaleString()}`;
        }
    }

    function renderShopAvatarsGrid() {
        const container = document.querySelector('.shop-scroll-content');
        if (!container) return;

        if (typeof AvatarsManager === 'undefined') {
            console.error('AvatarsManager no disponible');
            return;
        }

        // Obtiene avatares activos directamente del Single Source of Truth (Excluye AVA-001 de venta pública)
        const activeAvatars = AvatarsManager.getActiveAvatars();
        const activeAvatarCode = AvatarsManager.getActiveAvatarCode();

        if (!activeAvatars || activeAvatars.length === 0) {
            container.innerHTML = `
                <div class="shop-empty-category-container">
                    <div class="shop-empty-icon" style="color:#ff4757;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:100%; height:100%;">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                    </div>
                    <div class="shop-empty-title">NO HAY AVATARES DISPONIBLES</div>
                    <div class="shop-empty-desc">El administrador aún no ha activado avatares en la tienda.</div>
                </div>
            `;
            return;
        }

        let gridHtml = `<div class="avatars-shop-grid">`;

        activeAvatars.forEach(avatar => {
            const isOwned = AvatarsManager.isAvatarOwned(avatar.code);
            const isEquipped = activeAvatarCode === avatar.code;

            // Datos 1:1 sincronizados exactamente con la gerencia de avatares admin
            const expText = parseFloat(avatar.exp_boost !== undefined ? avatar.exp_boost : 0).toFixed(1);
            const starText = parseFloat(avatar.starships_boost !== undefined ? avatar.starships_boost : 0).toFixed(1);
            const luckText = parseFloat(avatar.luck_boost !== undefined ? avatar.luck_boost : (avatar.suerte_boost || 0)).toFixed(1);
            const price = avatar.price !== undefined ? avatar.price : 50000;
            const bannerText = avatar.offer_text || avatar.banner || 'NUEVO';
            const imgPath = avatar.image || `../../assets/images/avatars/${avatar.code}.png`;

            let actionBtnHtml = '';
            if (isEquipped) {
                actionBtnHtml = `<button class="btn-avatar-action equipped" disabled>EQUIPADO ✓</button>`;
            } else if (isOwned) {
                actionBtnHtml = `<button class="btn-avatar-action equip" onclick="window.ShopAvatars.equip('${avatar.code}')">ACTIVAR / EQUIPAR</button>`;
            } else {
                actionBtnHtml = `<button class="btn-avatar-action buy" onclick="window.ShopAvatars.buy('${avatar.code}')">COMPRAR ⭐ ${price.toLocaleString()}</button>`;
            }

            gridHtml += `
                <div class="avatar-shop-card ${isEquipped ? 'is-active-avatar' : ''} ${isOwned ? 'is-owned-avatar' : ''}">
                    <!-- BANNER DE OFERTA CONFIGURADO POR EL ADMIN -->
                    <div class="avatar-card-banner">${bannerText}</div>
                    
                    <!-- IMAGEN COMPLETA SIN ENCERRAR EN CIRCULO -->
                    <div class="avatar-card-img-wrap">
                        <img src="${imgPath}" 
                             alt="${avatar.code}"
                             onerror="this.onerror=null; this.src='../../assets/images/avatars/AVA-002.png';">
                    </div>

                    <!-- TITULO CON CÓDIGO ÚNICO DEL AVATAR -->
                    <div class="avatar-card-info">
                        <div class="avatar-card-code">${avatar.code}</div>
                    </div>

                    <!-- LOS 3 POTENCIADORES DECIMALES SINCRONIZADOS 1:1 CON EL ADMIN -->
                    <div class="avatar-card-boosters">
                        <div class="booster-tag exp" title="Aumento de Exp (%)">
                            <span class="b-lbl">EXP</span>
                            <span class="b-val">+${expText}%</span>
                        </div>
                        <div class="booster-tag star" title="Aumento de StarShips (%)">
                            <span class="b-lbl">STAR</span>
                            <span class="b-val">+${starText}%</span>
                        </div>
                        <div class="booster-tag suerte" title="Aumento de Suerte (%)">
                            <span class="b-lbl">LUCK</span>
                            <span class="b-val">+${luckText}%</span>
                        </div>
                    </div>

                    <!-- BOTÓN DE ACCIÓN CON EL PRECIO INTEGRADO -->
                    <div class="avatar-card-footer">
                        ${actionBtnHtml}
                    </div>
                </div>
            `;
        });

        gridHtml += `</div>`;
        container.innerHTML = gridHtml;
    }

    function buyAvatar(code) {
        const avatar = AvatarsManager.getAvatarByCode(code);
        if (!avatar) return;

        if (userStarships < avatar.price) {
            showNotification(`❌ StarShips insuficientes. Requieres ⭐ ${avatar.price.toLocaleString()} StarShips.`, 'error');
            return;
        }

        userStarships -= avatar.price;
        localStorage.setItem('ad_user_starships', userStarships.toString());
        updateBalanceDisplay();

        AvatarsManager.buyAvatar(code);
        // Auto-equipar tras la compra
        AvatarsManager.setActiveAvatar(code);

        showNotification(`🎉 ¡Avatar ${code} comprado y equipado exitosamente!`, 'success');
        renderShopAvatarsGrid();
    }

    function equipAvatar(code) {
        AvatarsManager.setActiveAvatar(code);
        showNotification(`✨ Avatar ${code} activado como tu avatar principal.`, 'success');
        renderShopAvatarsGrid();
    }

    function showNotification(msg, type = 'info') {
        let toast = document.getElementById('shop-toast-notif');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'shop-toast-notif';
            toast.style.cssText = `
                position: fixed;
                bottom: 70px;
                left: 50%;
                transform: translateX(-50%);
                padding: 12px 24px;
                border-radius: 8px;
                font-weight: 700;
                font-size: 0.95rem;
                color: #fff;
                z-index: 99999;
                box-shadow: 0 10px 25px rgba(0,0,0,0.5);
                transition: all 0.3s ease;
                pointer-events: none;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            `;
            document.body.appendChild(toast);
        }

        toast.style.backgroundColor = type === 'error' ? 'rgba(255, 71, 87, 0.95)' : 'rgba(46, 213, 115, 0.95)';
        toast.textContent = msg;
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(10px)';
        }, 3000);
    }

    // Exportar objeto global para callbacks
    window.ShopAvatars = {
        buy: buyAvatar,
        equip: equipAvatar,
        reload: renderShopAvatarsGrid
    };

    document.addEventListener('DOMContentLoaded', () => {
        loadUserCurrency();
        renderShopAvatarsGrid();
    });
})();
