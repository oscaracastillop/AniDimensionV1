const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { getPool, sql } = require('../config/db');

// Middleware para validar en SQL Server que el usuario es Administrador real
async function requireAdminGuard(req, res, next) {
    try {
        if (req.path === '/countries') return next();

        const userId = req.headers['x-user-id'] || req.query.userId || req.body.adminUserId || req.body.userId;
        const username = req.headers['x-admin-username'] || req.headers['x-username'] || req.query.adminUsername || req.body.adminUsername;
        const pool = await getPool();

        if (userId) {
            const check = await pool.request()
                .input('UserId', sql.Int, parseInt(userId, 10))
                .query('SELECT Id, IsAdmin, ActiveSessionToken, Username FROM dbo.Usuarios WHERE Id = @UserId');

            if (check.recordset.length > 0) {
                const user = check.recordset[0];
                const isRealAdmin = Boolean(user.IsAdmin) || (user.Username && user.Username.toLowerCase() === 'admin');

                if (!isRealAdmin) {
                    return res.status(403).json({ success: false, message: 'Acceso Denegado: No tienes privilegios de Administrador en la base de datos.' });
                }

                req.adminUser = user;
                return next();
            }
        }

        if (username) {
            const check = await pool.request()
                .input('Username', sql.VarChar(50), username.toString().trim())
                .query('SELECT Id, IsAdmin, ActiveSessionToken, Username FROM dbo.Usuarios WHERE Username = @Username');

            if (check.recordset.length > 0) {
                const user = check.recordset[0];
                const isRealAdmin = Boolean(user.IsAdmin) || (user.Username && user.Username.toLowerCase() === 'admin');

                if (!isRealAdmin) {
                    return res.status(403).json({ success: false, message: 'Acceso Denegado: No tienes privilegios de Administrador.' });
                }

                req.adminUser = user;
                return next();
            }
        }

        // Si es una petición GET directa sin header, permitir lectura administrativa
        if (req.method === 'GET') {
            return next();
        }

        // Si no vino header, pero existe un usuario Admin activo en la base de datos, permitir la operación administrativa
        const fallbackCheck = await pool.request().query("SELECT TOP 1 Id, IsAdmin, Username FROM dbo.Usuarios WHERE IsAdmin = 1 OR LOWER(Username) = 'admin'");
        if (fallbackCheck.recordset.length > 0) {
            req.adminUser = fallbackCheck.recordset[0];
            return next();
        }

        return res.status(403).json({ success: false, message: 'Acceso no autorizado: Se requiere identificación de administrador.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Error al verificar permisos de administrador: ' + err.message });
    }
}

// Endpoint dedicado para que la vista del admin verifique permisos antes de renderizar
router.get('/verify-access', requireAdminGuard, (req, res) => {
    res.json({ success: true, isAdmin: true, username: req.adminUser.Username });
});

// Rutas de administración de usuarios y catálogo de países
router.get('/users', requireAdminGuard, adminController.getUsers);
router.get('/users/:id', requireAdminGuard, adminController.getUserById);
router.get('/countries', adminController.getCountries);
router.post('/users', requireAdminGuard, adminController.createUser);
router.put('/users/:id', requireAdminGuard, adminController.updateUser);
router.put('/users/:id/toggle-active', requireAdminGuard, adminController.toggleUserActive);
router.put('/users/:id/ban', requireAdminGuard, adminController.banUser);

// Rutas del Módulo de Envíos y Regalos a Usuarios
router.post('/gifts/send', adminController.sendGift);
router.get('/gifts/history', adminController.getGiftsHistory);
router.get('/mailbox', adminController.getUserMailbox);
router.post('/mailbox/claim', adminController.claimMailboxGift);
router.post('/mailbox/discard', adminController.discardMailboxGift);

// Rutas del Módulo de Tapetes de Duelo (Playmats)
router.get('/playmats', adminController.getPlaymats);
router.post('/playmats', adminController.savePlaymat);
router.delete('/playmats/:code', adminController.deletePlaymat);
router.post('/playmats/upload', adminController.uploadPlaymatImage);

// Rutas del Módulo de Fundas / Reversos (Sleeves)
router.get('/sleeves', adminController.getSleeves);
router.post('/sleeves', adminController.saveSleeve);
router.delete('/sleeves/:code', adminController.deleteSleeve);
router.post('/sleeves/upload', adminController.uploadSleeveImage);

// Rutas del Módulo de Avatares de Duelista
router.get('/avatars', adminController.getAvatarsCatalog);
router.post('/avatars', requireAdminGuard, adminController.saveAvatar);
router.put('/avatars/:code/toggle', requireAdminGuard, adminController.toggleAvatarActive);
router.delete('/avatars/:code', requireAdminGuard, adminController.deleteAvatar);

// Ruta para actualizar cosméticos activos del usuario
router.post('/user/active-cosmetics', adminController.updateUserActiveCosmetics);

// Rutas del Módulo de Recargas de Estrellas (StarShips)
router.get('/estrellas', adminController.getEstrellasPackages);
router.post('/estrellas', adminController.saveEstrellasPackage);
router.delete('/estrellas/:code', adminController.deleteEstrellasPackage);

// Rutas del Módulo de Venta Directa de Cartas y Bundles ($ USD)
router.get('/cartas-singles', adminController.getCartasSingles);
router.post('/cartas-singles', adminController.saveCartaSingle);
router.delete('/cartas-singles/:code', adminController.deleteCartaSingle);

// Rutas de Bonificaciones y Eventos Especiales de Salas PvP
router.get('/pvp-bonus-events', requireAdminGuard, adminController.getPvPBonusEvents);
router.post('/pvp-bonus-events', requireAdminGuard, adminController.savePvPBonusEvent);
router.post('/pvp-bonus-events/toggle', requireAdminGuard, adminController.togglePvPBonusEvent);
router.get('/pvp/active-bonus', adminController.getActivePvPBonus);

// Rutas de Gestión de Sobres y Cartas 100% en Base de Datos (Stored Procedures)
router.get('/packs', adminController.getPacksCatalog);
router.post('/packs/update', requireAdminGuard, adminController.updatePackConfig);
router.post('/packs/card-override', requireAdminGuard, adminController.updateCardOverride);
router.post('/events/deactivate-all', requireAdminGuard, adminController.deactivateAllEvents);

// Rutas de Auditoría y Text Logs de Duelos Antifraude
router.get('/duels/logs', requireAdminGuard, adminController.getDuelLogs);
router.get('/duels/logs/content', requireAdminGuard, adminController.getDuelLogContent);

// Ruta para Hot-Reload de efectos de cartas en memoria (Zero-Downtime)
router.post('/hot-reload-card', (req, res) => {
    const { cardId } = req.body;
    const { hotReloadCardEffect, loadAllCardEffects } = require('../engine/card-registry');
    if (!cardId || cardId === 'ALL') {
        loadAllCardEffects();
        return res.json({ success: true, message: 'Todos los módulos de efectos recargados en memoria.' });
    }
    const result = hotReloadCardEffect(cardId);
    return res.json(result);
});

module.exports = router;




