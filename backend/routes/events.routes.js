/**
 * ============================================================================
 * ANI-DIMENSION: RUTAS DE EVENTOS (PUZZLE & ESPECIALES)
 * ============================================================================
 */
const express = require('express');
const router = express.Router();
const { puzzleService } = require('../engine/puzzle-service');

// 1. Obtener Evento Activo e información general
router.get('/active', (req, res) => {
    try {
        const userId = req.query.userId || req.query.user_id || 1;
        const activeEvent = puzzleService.getActiveEvent();
        if (!activeEvent) {
            return res.json({ success: true, active: false, message: 'No hay eventos activos en este momento.' });
        }

        const userStatus = puzzleService.getUserPuzzleStatus(userId, activeEvent.id);
        res.json({
            success: true,
            active: true,
            data: userStatus
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 1.1 Obtener todos los eventos ordenados cronológicamente (Activos, Próximos y Finalizados)
router.get('/all', (req, res) => {
    try {
        const userId = req.query.userId || req.query.user_id || 1;
        const events = puzzleService.getAllEventsWithStatus(userId);
        res.json({
            success: true,
            events: events
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 2. Obtener estado del rompecabezas de un usuario
router.get('/puzzle/status', (req, res) => {
    try {
        const userId = req.query.userId || req.query.user_id || 1;
        const eventId = req.query.eventId || null;
        const status = puzzleService.getUserPuzzleStatus(userId, eventId);
        if (!status) {
            return res.status(404).json({ success: false, message: 'Evento no encontrado' });
        }
        res.json({ success: true, data: status });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 3. Reclamar / Registrar que completó el rompecabezas (Bloquea puesto en Top 10)
router.post('/puzzle/complete', async (req, res) => {
    try {
        const { userId, username, eventId } = req.body;
        if (!userId) {
            return res.status(400).json({ success: false, message: 'userId requerido' });
        }

        const result = await puzzleService.submitPuzzleCompletion(userId, username, eventId);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 4. Canjear fichas sobrantes por Starships (Habilitado una vez finalizado el evento)
router.post('/puzzle/exchange', async (req, res) => {
    try {
        const { userId, eventId } = req.body;
        if (!userId) {
            return res.status(400).json({ success: false, message: 'userId requerido' });
        }

        const result = await puzzleService.exchangeLeftoverPieces(userId, eventId);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 5. Test/Simulación manual de drop de ficha (Útil para pruebas y admin)
router.post('/puzzle/roll-test', async (req, res) => {
    try {
        const { userId, username, isPvp } = req.body;
        const dropResult = await puzzleService.awardDuelDrop(userId || 1, username || 'Duelista', !!isPvp);
        res.json({ success: true, drop: dropResult });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 6. [ADMIN] Obtener todos los eventos de rompecabezas
router.get('/admin/all', (req, res) => {
    try {
        const events = puzzleService.getAllEvents();
        res.json({ success: true, events });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 7. [ADMIN] Guardar / Crear / Modificar evento de rompecabezas
router.post('/admin/save', (req, res) => {
    try {
        const eventData = req.body;
        if (!eventData.title) {
            return res.status(400).json({ success: false, message: 'El título del evento es obligatorio' });
        }
        const saved = puzzleService.saveEvent(eventData);
        res.json({ success: true, event: saved, message: 'Evento guardado exitosamente.' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 8. [ADMIN] Reiniciar evento (elimina fichas, ganadores y canjes para pruebas limpias)
router.post('/admin/reset', async (req, res) => {
    try {
        const { eventId } = req.body;
        if (!eventId) {
            return res.status(400).json({ success: false, message: 'eventId es requerido' });
        }
        const result = await puzzleService.resetEvent(eventId);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 9. [ADMIN] Finalizar evento anticipadamente (para pruebas de canje de fichas sobrantes o cierre forzado)
router.post('/admin/finish', async (req, res) => {
    try {
        const { eventId } = req.body;
        if (!eventId) {
            return res.status(400).json({ success: false, message: 'eventId es requerido' });
        }
        const result = await puzzleService.finishEvent(eventId);
        res.json(result);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

module.exports = router;
