/**
 * Ani-Dimension: Controlador de la Vista Dedicada de Tienda
 */
document.addEventListener('DOMContentLoaded', () => {
    if (window.Session && !window.Session.requireAuth('../login/login.html')) {
        return;
    }

    initShop();
});

function initShop() {
    const user = window.Session ? window.Session.getUser() : null;
    if (user) {
        const coinsEl = document.getElementById('shop-user-coins');
        if (coinsEl) {
            coinsEl.textContent = `⭐ ${user.starships || user.coins || 500}`;
        }
    }
}

function buyShopItem(itemName, price) {
    alert(`⚡ [TIENDA] Has seleccionado comprar '${itemName}' por ${price} Starships. ¡Módulo de catálogo en desarrollo!`);
}
