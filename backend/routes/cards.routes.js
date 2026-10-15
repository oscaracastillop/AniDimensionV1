const express = require('express');
const router = express.Router();
const cardsController = require('../controllers/cards.controller');

router.get('/health', cardsController.health);
router.get('/packs', cardsController.getPacks);
router.get('/packs/:packId', cardsController.getPackById);
router.get('/cards/packs', cardsController.getPacks);
router.get('/cards/packs/:packId', cardsController.getPackById);
router.post('/cards/batch', cardsController.getBatchCards);
router.get('/cards', cardsController.searchCards);
router.get('/cards/search', cardsController.searchCards);
router.get('/cards/:id', cardsController.getCardById);
router.get('/countries', cardsController.getCountries);
router.get('/cards/:id/image', cardsController.getCardImage);
router.get('/cards/image/:id', cardsController.getCardImage);

module.exports = router;

