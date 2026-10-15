const express = require('express');
const router = express.Router();
const { getRankings } = require('../controllers/rankings.controller');

router.get('/', getRankings);

module.exports = router;
