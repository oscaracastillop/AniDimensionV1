/**
 * Ani-Dimension: Rutas de Avatares Individuales y Potenciadores
 */

const express = require('express');
const router = express.Router();
const avatarsController = require('../controllers/avatars.controller');

router.get('/user/:userId', avatarsController.getUserAvatars);
router.post('/set-active', avatarsController.setActiveAvatar);
router.post('/apply-potenciador', avatarsController.applyPotenciadorToAvatar);
router.post('/purchase', avatarsController.purchaseAvatar);

module.exports = router;
