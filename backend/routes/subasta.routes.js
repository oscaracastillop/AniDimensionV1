const express = require('express');
const router = express.Router();
const subastaController = require('../controllers/subasta.controller');

router.get('/active', subastaController.getActiveAuctions);
router.get('/all', subastaController.getAllAuctionsAdmin);
router.get('/history', subastaController.getAuctionHistory);
router.post('/create', subastaController.createAuction);
router.post('/edit', subastaController.editAuction);
router.post('/bid', subastaController.placeBid);
router.post('/finalize', subastaController.finalizeAuction);
router.post('/cancel', subastaController.cancelAuction);

module.exports = router;
