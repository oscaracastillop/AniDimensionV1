const express = require('express');
const router = express.Router();
const gameController = require('../controllers/game.controller');

// Mazos e Inventario
router.get('/deck-inventory', gameController.getDeckAndInventory);
router.post('/deck/save', gameController.saveDeck);

// Tienda de Sobres
router.post('/shop/open-pack', gameController.buyAndOpenPack);

// Tienda de Cosméticos (Avatares, Tapetes, Fundas, VIP)
router.get('/cosmetics', gameController.getUserCosmetics);
router.post('/cosmetics/buy', gameController.buyCosmetic);
router.post('/cosmetics/equip', gameController.equipCosmetic);
router.post('/vip/buy', gameController.buyVipPass);
router.post('/avatar/upgrade', gameController.upgradeAvatar);

// Buzón y Potenciadores
router.get('/mailbox-stats', gameController.getMailboxAndStats);
router.post('/mailbox/claim', gameController.claimMailboxGift);
router.post('/potenciador/buy', gameController.buyPotenciador);
router.post('/potenciadores/buy', gameController.buyPotenciador); // Alias plural para compatibilidad total
router.post('/potenciador/consume', gameController.consumePotenciador);

// Recompensas y Estadísticas de Duelo (NPC y PvP)
router.post('/duel/finish', gameController.finishDuelRewards);
router.get('/duel/stats', gameController.getDuelStatsAndHistory);
router.get('/duel/stats/:userIdOrName', gameController.getDuelStatsAndHistory);

// Tienda de Cartas Singles (Sueltas)
router.post('/shop/buy-single', gameController.buySingleCard);
router.get('/shop/singles/history', gameController.getSingleCardPurchasesHistory);

// Venta de cartas repetidas (> 3 copias)
router.post('/cards/sell-excess', gameController.sellExcessCard);

// Catálogos Públicos y Estado respaldados 100% en SQL Server
router.get('/shop/singles', gameController.getShopSingles);
router.get('/shop/playmats', gameController.getShopPlaymats);
router.get('/shop/sleeves', gameController.getShopSleeves);
router.get('/shop/estrellas', gameController.getShopEstrellas);
router.get('/shop/avatars', gameController.getShopAvatars);
router.get('/shop/potenciadores', gameController.getShopPotenciadores);
router.get('/shop/vip', gameController.getShopVipPasses);
router.get('/user/avatars', gameController.getUserAvatars);
router.post('/avatar/apply-potenciador', gameController.applyAvatarPotenciador);
router.get('/config', gameController.getGameConfigurations);

module.exports = router;

