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
    const coinsEl = document.getElementById('shop-user-coins');
    if (coinsEl) {
        const starships = (window.Session && typeof window.Session.getStarships === 'function')
            ? window.Session.getStarships()
            : 5000;
        coinsEl.textContent = `⭐ ${starships.toLocaleString()}`;
    }
}

function buyShopItem(itemName, price) {
    console.log(`[TIENDA] Selección de '${itemName}' por ${price} Starships.`);
}
