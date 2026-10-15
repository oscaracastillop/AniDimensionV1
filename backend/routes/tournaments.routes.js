/**
 * Ani-Dimension: Rutas de la API de Torneos y Gestión de Brackets
 */
const express = require('express');
const router = express.Router();
const tournamentsController = require('../controllers/tournaments.controller');

// Rutas Públicas (Hub de Jugadores)
router.get('/', tournamentsController.getTournaments);
router.get('/:id', tournamentsController.getTournamentById);
router.post('/:id/register', tournamentsController.registerPlayer);
router.post('/:id/leave', tournamentsController.leaveTournament);

// Rutas de Administración
router.post('/admin/upload-banner', tournamentsController.uploadTournamentBanner);
router.post('/admin/create', tournamentsController.createTournamentAdmin);
router.put('/admin/:id', tournamentsController.updateTournamentAdmin);
router.delete('/admin/:id', tournamentsController.deleteTournamentAdmin);
router.post('/admin/:id/start', tournamentsController.startTournamentAdmin);
router.post('/admin/:id/matches/:matchId/set-winner', tournamentsController.setMatchWinnerAdmin);
router.post('/admin/:id/deliver-prizes', tournamentsController.deliverPrizesAdmin);

module.exports = router;
