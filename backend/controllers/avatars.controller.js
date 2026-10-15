/**
 * Ani-Dimension: Controlador de Avatares Individuales por Usuario
 * Gestiona la posesión, activación y aplicación de potenciadores únicos por avatar.
 */

const { getPool, sql } = require('../config/db');

// Obtener todos los avatares que posee un usuario con sus estadísticas individuales
async function getUserAvatars(req, res) {
    try {
        const userId = parseInt(req.params.userId || req.query.userId, 10);
        if (!userId) {
            return res.status(400).json({ success: false, message: 'ID de usuario requerido.' });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('uid', sql.Int, userId)
            .query(`
                SELECT Id, UserId, AvatarCode, ExpBoost, StarshipsBoost, LuckBoost, IsActive, AcquiredAt
                FROM dbo.UserAvatars
                WHERE UserId = @uid
                ORDER BY IsActive DESC, AcquiredAt ASC
            `);

        return res.json({
            success: true,
            avatars: result.recordset
        });
    } catch (err) {
        console.error('[GET USER AVATARS ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al consultar avatares del usuario.' });
    }
}

// Establecer avatar activo para un usuario
async function setActiveAvatar(req, res) {
    try {
        const { userId, avatarCode } = req.body;
        if (!userId || !avatarCode) {
            return res.status(400).json({ success: false, message: 'Usuario y código de avatar requeridos.' });
        }

        const cleanCode = avatarCode.toUpperCase().trim();
        const pool = await getPool();

        // Verificar posesión del avatar
        const check = await pool.request()
            .input('uid', sql.Int, userId)
            .input('code', sql.VarChar(50), cleanCode)
            .query(`SELECT Id, ExpBoost, StarshipsBoost, LuckBoost FROM dbo.UserAvatars WHERE UserId = @uid AND AvatarCode = @code`);

        if (check.recordset.length === 0) {
            // Si es AVA-002 (inicial), crearlo automáticamente si no existe
            if (cleanCode === 'AVA-002') {
                await pool.request()
                    .input('uid', sql.Int, userId)
                    .query(`INSERT INTO dbo.UserAvatars (UserId, AvatarCode, ExpBoost, StarshipsBoost, LuckBoost, IsActive) VALUES (@uid, 'AVA-002', 0.0, 0.0, 0.0, 1)`);
            } else {
                return res.status(400).json({ success: false, message: 'No posees este avatar en tu inventario.' });
            }
        }

        // Actualizar IsActive en dbo.UserAvatars
        await pool.request()
            .input('uid', sql.Int, userId)
            .input('code', sql.VarChar(50), cleanCode)
            .query(`
                UPDATE dbo.UserAvatars SET IsActive = 0 WHERE UserId = @uid;
                UPDATE dbo.UserAvatars SET IsActive = 1 WHERE UserId = @uid AND AvatarCode = @code;
                UPDATE dbo.Usuarios SET AvatarActivoId = @code WHERE Id = @uid;
            `);

        const activeAvatar = check.recordset[0] || { AvatarCode: cleanCode, ExpBoost: 0, StarshipsBoost: 0, LuckBoost: 0 };

        return res.json({
            success: true,
            message: `Avatar ${cleanCode} equipado como activo.`,
            activeAvatar
        });
    } catch (err) {
        console.error('[SET ACTIVE AVATAR ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al activar avatar.' });
    }
}

// Aplicar potenciador exclusivamente a un avatar específico de un usuario
async function applyPotenciadorToAvatar(req, res) {
    try {
        const { userId, avatarCode, boostType, boostValue, maxCap } = req.body;
        if (!userId || !avatarCode || !boostType || boostValue === undefined) {
            return res.status(400).json({ success: false, message: 'Parámetros incompletos para aplicar potenciador.' });
        }

        const cleanCode = avatarCode.toUpperCase().trim();
        const type = boostType.toUpperCase().trim();
        const val = parseFloat(boostValue);
        const cap = parseFloat(maxCap || (type === 'SUERTE' ? 100.0 : 300.0));

        const pool = await getPool();

        // Obtener avatar del usuario
        const avRes = await pool.request()
            .input('uid', sql.Int, userId)
            .input('code', sql.VarChar(50), cleanCode)
            .query(`SELECT * FROM dbo.UserAvatars WHERE UserId = @uid AND AvatarCode = @code`);

        if (avRes.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Avatar no encontrado en tu inventario.' });
        }

        const avatar = avRes.recordset[0];
        let colName = 'ExpBoost';
        let current = avatar.ExpBoost;
        if (type === 'STARSHIPS') {
            colName = 'StarshipsBoost';
            current = avatar.StarshipsBoost;
        } else if (type === 'SUERTE') {
            colName = 'LuckBoost';
            current = avatar.LuckBoost;
        }

        const potential = current + val;
        if (potential > cap) {
            return res.status(400).json({
                success: false,
                message: `No se puede aplicar: superaría el límite de ${cap}% (alcanzaría ${potential}%). Actual: ${current}%.`
            });
        }

        const newVal = Math.min(cap, potential);

        await pool.request()
            .input('uid', sql.Int, userId)
            .input('code', sql.VarChar(50), cleanCode)
            .input('val', sql.Decimal(6, 2), newVal)
            .query(`UPDATE dbo.UserAvatars SET ${colName} = @val WHERE UserId = @uid AND AvatarCode = @code`);

        return res.json({
            success: true,
            message: `Potenciador aplicado con éxito al avatar ${cleanCode}.`,
            avatarCode: cleanCode,
            statType: type,
            previousValue: current,
            newValue: newVal
        });
    } catch (err) {
        console.error('[APPLY POTENCIADOR ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al aplicar potenciador al avatar.' });
    }
}

// Comprar nuevo avatar para el usuario
async function purchaseAvatar(req, res) {
    try {
        const { userId, avatarCode, expBoost = 0, starshipsBoost = 0, luckBoost = 0, priceStarships = 0 } = req.body;
        if (!userId || !avatarCode) {
            return res.status(400).json({ success: false, message: 'Parámetros de compra requeridos.' });
        }

        const cleanCode = avatarCode.toUpperCase().trim();
        const pool = await getPool();

        // Verificar si ya posee el avatar
        const exists = await pool.request()
            .input('uid', sql.Int, userId)
            .input('code', sql.VarChar(50), cleanCode)
            .query(`SELECT Id FROM dbo.UserAvatars WHERE UserId = @uid AND AvatarCode = @code`);

        if (exists.recordset.length > 0) {
            return res.status(400).json({ success: false, message: 'Ya posees este avatar en tu inventario.' });
        }

        // Verificar saldo de StarShips si tiene costo
        if (priceStarships > 0) {
            const uRes = await pool.request()
                .input('uid', sql.Int, userId)
                .query(`SELECT Starships FROM dbo.Usuarios WHERE Id = @uid`);
            
            const currentStarships = uRes.recordset[0]?.Starships || 0;
            if (currentStarships < priceStarships) {
                return res.status(400).json({ success: false, message: `StarShips insuficientes. Requiere ⭐ ${priceStarships.toLocaleString()}.` });
            }

            // Descontar StarShips
            await pool.request()
                .input('uid', sql.Int, userId)
                .input('cost', sql.BigInt, priceStarships)
                .query(`UPDATE dbo.Usuarios SET Starships = Starships - @cost WHERE Id = @uid`);
        }

        // Insertar avatar en dbo.UserAvatars
        await pool.request()
            .input('uid', sql.Int, userId)
            .input('code', sql.VarChar(50), cleanCode)
            .input('exp', sql.Decimal(6, 2), expBoost)
            .input('star', sql.Decimal(6, 2), starshipsBoost)
            .input('luck', sql.Decimal(6, 2), luckBoost)
            .query(`
                INSERT INTO dbo.UserAvatars (UserId, AvatarCode, ExpBoost, StarshipsBoost, LuckBoost, IsActive)
                VALUES (@uid, @code, @exp, @star, @luck, 0)
            `);

        return res.json({
            success: true,
            message: `Avatar ${cleanCode} adquirido con éxito.`,
            avatarCode: cleanCode
        });
    } catch (err) {
        console.error('[PURCHASE AVATAR ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al procesar compra de avatar.' });
    }
}

module.exports = {
    getUserAvatars,
    setActiveAvatar,
    applyPotenciadorToAvatar,
    purchaseAvatar
};
