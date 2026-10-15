const express = require('express');
const router = express.Router();
const adventureController = require('../controllers/adventure.controller');

// Obtener catálogo completo de 12 Eras y 125 NPCs canónicos directamente desde SQL Server
router.get('/catalog', adventureController.getAdventureCatalog);
router.get('/npc/:id', adventureController.getNpcDetail);

// Obtener estado de campaña del usuario (progreso, récords, medallas, bonificaciones)
router.get('/state', adventureController.getAdventureState);

// Registrar duelo contra NPC (victoria/derrota, desbloqueo de medalla, avance)
router.post('/defeat-npc', adventureController.recordNpcDuel);

// Obtener y actualizar asignación de drops de sobres a NPCs
router.get('/pack-assignments', adventureController.getPackAssignments);
router.put('/pack-assignments', adventureController.updatePackAssignments);

module.exports = router;
