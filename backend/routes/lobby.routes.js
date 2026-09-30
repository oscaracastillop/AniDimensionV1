const express = require('express');
const router = express.Router();
const lobbyController = require('../controllers/lobby.controller');

router.get('/content', lobbyController.getLobbyContent);

module.exports = router;
