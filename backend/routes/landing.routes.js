const express = require('express');
const router = express.Router();
const { getLandingData } = require('../controllers/landing.controller');

router.get('/data', getLandingData);
router.get('/', getLandingData);

module.exports = router;
