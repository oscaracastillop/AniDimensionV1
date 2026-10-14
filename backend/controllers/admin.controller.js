const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const { getPool, sql } = require('../config/db');

// Función auxiliar para asegurar que existan las columnas de Baneo, Estado, Avatar, Tapete y Funda en dbo.Usuarios
async function ensureAdminColumnsExist(pool) {
    try {
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Usuarios') AND name = 'IsActive')
                ALTER TABLE dbo.Usuarios ADD IsActive BIT NOT NULL DEFAULT 1;

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Usuarios') AND name = 'BannedUntil')
                ALTER TABLE dbo.Usuarios ADD BannedUntil DATETIME NULL;

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Usuarios') AND name = 'BanReason')
                ALTER TABLE dbo.Usuarios ADD BanReason NVARCHAR(255) NULL;

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Usuarios') AND name = 'AvatarActivoId')
                ALTER TABLE dbo.Usuarios ADD AvatarActivoId NVARCHAR(50) NOT NULL DEFAULT 'AVA-002';

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Usuarios') AND name = 'MatActivoId')
                ALTER TABLE dbo.Usuarios ADD MatActivoId NVARCHAR(50) NULL DEFAULT '';

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Usuarios') AND name = 'FundaActivaId')
                ALTER TABLE dbo.Usuarios ADD FundaActivaId NVARCHAR(50) NULL DEFAULT '';

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Usuarios') AND name = 'VipUntil')
                ALTER TABLE dbo.Usuarios ADD VipUntil DATETIME NULL;
        `);
    } catch (err) {
        console.warn('[ADMIN SCHEMA NOTICE] Columnas de estado/baneo/avatar/vip/tapetes/fundas verificadas:', err.message);
    }
}

/**
 * Obtener lista completa de usuarios con país, bandera y estado
 */
async function getUsers(req, res) {
    try {
        const pool = await getPool();
        await ensureAdminColumnsExist(pool);

        const result = await pool.request().query(`
            SELECT 
                u.Id, u.Username, u.Email, u.CountryIsoCode,
                ISNULL(u.AvatarActivoId, 'AVA-002') as AvatarActivoId,
                u.VipUntil,
                ISNULL(c.Name, 'Desconocido') as CountryName,
                ISNULL(c.FlagEmoji, '🌐') as FlagEmoji,
                ISNULL(c.FlagSvgUrl, '') as FlagSvgUrl,
                ISNULL(u.Nivel, 1) as Nivel,
                ISNULL(u.Starships, 5000) as Starships,
                ISNULL(u.IsAdmin, 0) as IsAdmin,
                ISNULL(u.IsActive, 1) as IsActive,
                u.BannedUntil,
                u.BanReason,
                u.FechaCreacion
            FROM dbo.Usuarios u
            LEFT JOIN dbo.Countries c ON u.CountryIsoCode = c.IsoCode
            ORDER BY u.Id ASC
        `);

        return res.json({
            success: true,
            users: result.recordset
        });
    } catch (error) {
        console.error('[ADMIN GET USERS ERROR]', error);
        return res.status(500).json({ success: false, message: 'Error de servidor al consultar usuarios.' });
    }
}

/**
 * Obtener un solo usuario por ID para la vista de edición dedicada
 */
async function getUserById(req, res) {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ success: false, message: 'ID de usuario inválido.' });
        }

        const pool = await getPool();
        await ensureAdminColumnsExist(pool);
        const result = await pool.request()
            .input('Id', sql.Int, userId)
            .query(`
                SELECT 
                    u.Id, u.Username, u.Email, u.CountryIsoCode,
                    ISNULL(u.AvatarActivoId, 'AVA-002') as AvatarActivoId,
                    u.VipUntil,
                    ISNULL(c.Name, 'Desconocido') as CountryName,
                    ISNULL(c.FlagEmoji, '🌐') as FlagEmoji,
                    ISNULL(c.FlagSvgUrl, '') as FlagSvgUrl,
                    ISNULL(u.Nivel, 1) as Nivel,
                    ISNULL(u.Starships, 5000) as Starships,
                    ISNULL(u.IsAdmin, 0) as IsAdmin,
                    ISNULL(u.IsActive, 1) as IsActive,
                    u.BannedUntil,
                    u.BanReason,
                    u.FechaCreacion,
                    s.BonusExp, s.BonusStarships, s.BonusSuerte
                FROM dbo.Usuarios u
                LEFT JOIN dbo.Countries c ON u.CountryIsoCode = c.IsoCode
                LEFT JOIN dbo.AvatarStats s ON u.Id = s.UsuarioId
                WHERE u.Id = @Id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }

        return res.json({
            success: true,
            user: result.recordset[0]
        });
    } catch (error) {
        console.error('[ADMIN GET USER BY ID ERROR]', error);
        return res.status(500).json({ success: false, message: 'Error al consultar usuario.' });
    }
}

/**
 * Obtener catálogo de países con banderas (FlagEmoji + FlagSvgUrl)
 */
async function getCountries(req, res) {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT IsoCode, Name, FlagEmoji, FlagSvgUrl, PhonePrefix
            FROM dbo.Countries
            ORDER BY Name ASC
        `);

        return res.json({
            success: true,
            countries: result.recordset
        });
    } catch (error) {
        console.error('[ADMIN GET COUNTRIES ERROR]', error);
        return res.status(500).json({ success: false, message: 'Error de servidor al consultar catálogo de países.' });
    }
}

/**
 * Crear un nuevo usuario directamente por el Administrador
 */
async function createUser(req, res) {
    try {
        const { username, email, password, countryIsoCode, nivel, starships, isAdmin } = req.body;
        if (!username || !email || !password || !countryIsoCode) {
            return res.status(400).json({ success: false, message: 'Usuario, Email, Contraseña y País son obligatorios.' });
        }

        const cleanUsername = username.trim();
        const cleanEmail = email.trim().toLowerCase();
        const cleanCountry = countryIsoCode.trim().toUpperCase();

        if (cleanUsername.length < 3 || cleanUsername.length > 15 || /\s/.test(cleanUsername)) {
            return res.status(400).json({ success: false, message: 'El nick debe tener entre 3 y 15 caracteres sin espacios.' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
            return res.status(400).json({ success: false, message: 'El formato de correo electrónico no es válido.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres.' });
        }

        const pool = await getPool();
        await ensureAdminColumnsExist(pool);

        // Verificar duplicados
        const dupCheck = await pool.request()
            .input('Username', sql.VarChar(50), cleanUsername)
            .input('Email', sql.VarChar(150), cleanEmail)
            .query('SELECT Username, Email FROM dbo.Usuarios WHERE Username = @Username OR Email = @Email');

        if (dupCheck.recordset.length > 0) {
            return res.status(409).json({ success: false, message: 'El usuario o correo ya está registrado.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const insertRes = await pool.request()
            .input('Username', sql.VarChar(50), cleanUsername)
            .input('Email', sql.VarChar(150), cleanEmail)
            .input('PasswordHash', sql.VarChar(255), passwordHash)
            .input('CountryIsoCode', sql.NVarChar(5), cleanCountry)
            .input('Nivel', sql.Int, parseInt(nivel || 1, 10))
            .input('Starships', sql.Int, parseInt(starships || 5000, 10))
            .input('IsAdmin', sql.Bit, isAdmin ? 1 : 0)
            .query(`
                INSERT INTO dbo.Usuarios (Username, Email, PasswordHash, Nivel, Experiencia, Starships, IsAdmin, FechaCreacion, FundaActivaId, MatActivoId, CountryIsoCode, IsActive)
                OUTPUT INSERTED.Id, INSERTED.Username, INSERTED.Email, INSERTED.Nivel, INSERTED.Starships, INSERTED.IsAdmin, INSERTED.CountryIsoCode
                VALUES (@Username, @Email, @PasswordHash, @Nivel, 0, @Starships, @IsAdmin, GETDATE(), 'default_sleeve', 'default_mat', @CountryIsoCode, 1)
            `);

        const newUser = insertRes.recordset[0];

        // Crear registro AvatarStats
        try {
            await pool.request()
                .input('UsuarioId', sql.Int, newUser.Id)
                .query(`
                    IF NOT EXISTS (SELECT * FROM dbo.AvatarStats WHERE UsuarioId = @UsuarioId)
                        INSERT INTO dbo.AvatarStats (UsuarioId, EloRating, PartidasJugadas, Victorias, Derrotas, RachaActual, RachaMaxima)
                        VALUES (@UsuarioId, 1000, 0, 0, 0, 0, 0)
                `);
        } catch (stErr) {
            console.warn('[ADMIN CREATE USER AVATARSTATS NOTICE]', stErr.message);
        }

        return res.status(201).json({
            success: true,
            message: 'Usuario creado exitosamente por el administrador.',
            user: newUser
        });
    } catch (error) {
        console.error('[ADMIN CREATE USER ERROR]', error);
        return res.status(500).json({ success: false, message: 'Error al crear usuario: ' + error.message });
    }
}

/**
 * Actualizar datos completos de usuario
 */
async function updateUser(req, res) {
    try {
        const userId = parseInt(req.params.id, 10);
        const { username, email, password, countryIsoCode, nivel, starships, isAdmin, isActive, bannedUntil, banReason, avatarActivoId } = req.body;

        if (!userId || isNaN(userId)) {
            return res.status(400).json({ success: false, message: 'ID de usuario no válido.' });
        }

        const pool = await getPool();
        await ensureAdminColumnsExist(pool);

        // Verificar existencia del usuario
        const userCheck = await pool.request()
            .input('Id', sql.Int, userId)
            .query('SELECT Id, Username, Email FROM dbo.Usuarios WHERE Id = @Id');

        if (userCheck.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'El usuario especificado no existe.' });
        }

        const cleanUsername = username ? username.trim() : null;
        const cleanEmail = email ? email.trim().toLowerCase() : null;
        const cleanCountry = countryIsoCode ? countryIsoCode.trim().toUpperCase() : null;

        if (cleanUsername) {
            if (cleanUsername.length < 3 || cleanUsername.length > 15 || /\s/.test(cleanUsername)) {
                return res.status(400).json({ success: false, message: 'El nick debe tener entre 3 y 15 caracteres sin espacios.' });
            }
        }

        if (cleanEmail) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(cleanEmail)) {
                return res.status(400).json({ success: false, message: 'El formato de correo no es válido.' });
            }
        }

        // Verificar duplicados de Username / Email en otros usuarios
        if (cleanUsername || cleanEmail) {
            const dupCheck = await pool.request()
                .input('Id', sql.Int, userId)
                .input('Username', sql.VarChar(50), cleanUsername || '')
                .input('Email', sql.VarChar(150), cleanEmail || '')
                .query(`
                    SELECT Id, Username, Email FROM dbo.Usuarios 
                    WHERE (Username = @Username OR Email = @Email) AND Id <> @Id
                `);

            if (dupCheck.recordset.length > 0) {
                return res.status(409).json({ success: false, message: 'El nombre de usuario o correo ya pertenece a otro usuario.' });
            }
        }

        let passwordHash = null;
        if (password && password.trim().length > 0) {
            if (password.length < 6) {
                return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres.' });
            }
            const salt = await bcrypt.genSalt(10);
            passwordHash = await bcrypt.hash(password, salt);
        }

        const reqPool = pool.request()
            .input('Id', sql.Int, userId);

        let updateFields = [];

        if (cleanUsername) {
            reqPool.input('Username', sql.VarChar(50), cleanUsername);
            updateFields.push('Username = @Username');
        }
        if (cleanEmail) {
            reqPool.input('Email', sql.VarChar(150), cleanEmail);
            updateFields.push('Email = @Email');
        }
        if (passwordHash) {
            reqPool.input('PasswordHash', sql.VarChar(255), passwordHash);
            updateFields.push('PasswordHash = @PasswordHash');
        }
        if (cleanCountry) {
            reqPool.input('CountryIsoCode', sql.NVarChar(5), cleanCountry);
            updateFields.push('CountryIsoCode = @CountryIsoCode');
        }
        if (nivel !== undefined && nivel !== null) {
            reqPool.input('Nivel', sql.Int, parseInt(nivel, 10));
            updateFields.push('Nivel = @Nivel');
        }
        if (starships !== undefined && starships !== null) {
            reqPool.input('Starships', sql.Int, parseInt(starships, 10));
            updateFields.push('Starships = @Starships');
        }
        if (isAdmin !== undefined && isAdmin !== null) {
            reqPool.input('IsAdmin', sql.Bit, isAdmin ? 1 : 0);
            updateFields.push('IsAdmin = @IsAdmin');
        }
        if (isActive !== undefined && isActive !== null) {
            reqPool.input('IsActive', sql.Bit, isActive ? 1 : 0);
            updateFields.push('IsActive = @IsActive');
        }
        if (avatarActivoId) {
            reqPool.input('AvatarActivoId', sql.NVarChar(50), avatarActivoId.trim().toUpperCase());
            updateFields.push('AvatarActivoId = @AvatarActivoId');
        }

        if (bannedUntil !== undefined) {
            if (bannedUntil) {
                reqPool.input('BannedUntil', sql.DateTime, new Date(bannedUntil));
            } else {
                reqPool.input('BannedUntil', sql.DateTime, null);
            }
            updateFields.push('BannedUntil = @BannedUntil');
        }

        if (banReason !== undefined) {
            reqPool.input('BanReason', sql.NVarChar(255), banReason || null);
            updateFields.push('BanReason = @BanReason');
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ success: false, message: 'No se enviaron datos para actualizar.' });
        }

        await reqPool.query(`UPDATE dbo.Usuarios SET ${updateFields.join(', ')} WHERE Id = @Id`);

        return res.json({
            success: true,
            message: 'Usuario actualizado exitosamente.'
        });
    } catch (error) {
        console.error('[ADMIN UPDATE USER ERROR]', error);
        return res.status(500).json({ success: false, message: 'Error al actualizar usuario: ' + error.message });
    }
}

/**
 * Alternar estado Activo / Inactivo de usuario
 */
async function toggleUserActive(req, res) {
    try {
        const userId = parseInt(req.params.id, 10);
        const pool = await getPool();
        await ensureAdminColumnsExist(pool);

        const userRes = await pool.request()
            .input('Id', sql.Int, userId)
            .query('SELECT Id, ISNULL(IsActive, 1) as IsActive FROM dbo.Usuarios WHERE Id = @Id');

        if (userRes.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }

        const currentActive = userRes.recordset[0].IsActive;
        const newActive = currentActive ? 0 : 1;

        await pool.request()
            .input('Id', sql.Int, userId)
            .input('IsActive', sql.Bit, newActive)
            .query('UPDATE dbo.Usuarios SET IsActive = @IsActive WHERE Id = @Id');

        return res.json({
            success: true,
            isActive: newActive === 1,
            message: newActive === 1 ? 'Usuario activado exitosamente.' : 'Usuario inactivado exitosamente.'
        });
    } catch (error) {
        console.error('[ADMIN TOGGLE ACTIVE ERROR]', error);
        return res.status(500).json({ success: false, message: 'Error de servidor.' });
    }
}

/**
 * Aplicar o Levantar Baneo con Fecha de Expiración y Motivo
 */
async function banUser(req, res) {
    try {
        const userId = parseInt(req.params.id, 10);
        const { bannedUntil, banReason } = req.body;

        const pool = await getPool();
        await ensureAdminColumnsExist(pool);

        const reqPool = pool.request().input('Id', sql.Int, userId);

        if (bannedUntil) {
            reqPool.input('BannedUntil', sql.DateTime, new Date(bannedUntil));
            reqPool.input('BanReason', sql.NVarChar(255), banReason || 'Violación de términos del juego');
            await reqPool.query('UPDATE dbo.Usuarios SET BannedUntil = @BannedUntil, BanReason = @BanReason WHERE Id = @Id');
        } else {
            reqPool.input('BannedUntil', sql.DateTime, null);
            reqPool.input('BanReason', sql.NVarChar(255), null);
            await reqPool.query('UPDATE dbo.Usuarios SET BannedUntil = NULL, BanReason = NULL WHERE Id = @Id');
        }

        return res.json({
            success: true,
            message: bannedUntil ? 'Baneo aplicado correctamente.' : 'Baneo removido correctamente.'
        });
    } catch (error) {
        console.error('[ADMIN BAN USER ERROR]', error);
        return res.status(500).json({ success: false, message: 'Error al procesar baneo: ' + error.message });
    }
}

// ============================================================================
// MÓDULO DE REGALOS Y RECOMPENSAS (BUZÓN GLOBAL / INDIVIDUAL)
// ============================================================================

async function ensureMailboxTableExist(pool) {
    try {
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserMailbox')
            BEGIN
                CREATE TABLE dbo.UserMailbox (
                    Id INT IDENTITY(1,1) PRIMARY KEY,
                    UsuarioId INT NULL, -- NULL = Regalo Global para todos
                    GiftType NVARCHAR(50) NOT NULL, -- 'STARSHIPS', 'CARD', 'POTENCIADOR', 'AVATAR'
                    Title NVARCHAR(150) NOT NULL,
                    Description NVARCHAR(500) NULL,
                    PayloadJson NVARCHAR(MAX) NOT NULL,
                    IsClaimed BIT NOT NULL DEFAULT 0,
                    ClaimedAt DATETIME NULL,
                    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
                    Sender NVARCHAR(100) NOT NULL DEFAULT 'Administración AD'
                );
            END;

            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserMailboxGlobalClaims')
            BEGIN
                CREATE TABLE dbo.UserMailboxGlobalClaims (
                    Id INT IDENTITY(1,1) PRIMARY KEY,
                    MailboxGiftId INT NOT NULL,
                    UsuarioId INT NOT NULL,
                    ClaimedAt DATETIME NOT NULL DEFAULT GETDATE(),
                    CONSTRAINT UQ_Gift_User UNIQUE (MailboxGiftId, UsuarioId)
                );
            END;
        `);
    } catch (err) {
        console.warn('[ADMIN MAILBOX TABLE NOTICE]', err.message);
    }
}

/**
 * Enviar regalo individual o masivo a usuarios
 */
async function sendGift(req, res) {
    try {
        const { target, userId, giftType, title, description, payload, sender } = req.body;

        if (!giftType || !title) {
            return res.status(400).json({ success: false, message: 'El tipo de regalo y el título son obligatorios.' });
        }

        const validTypes = ['STARSHIPS', 'CARD', 'POTENCIADOR', 'AVATAR', 'VIP', 'SLEEVE', 'PLAYMAT', 'MEDAL'];
        const cleanType = giftType.toString().toUpperCase().trim();
        if (!validTypes.includes(cleanType)) {
            return res.status(400).json({ success: false, message: `Tipo de regalo inválido. Permitidos: ${validTypes.join(', ')}` });
        }

        // Validar topes máximos en regalos de tipo AVATAR
        if (cleanType === 'AVATAR' && payload) {
            const exp = parseFloat(payload.exp_boost || 0);
            const star = parseFloat(payload.starships_boost || 0);
            const luck = parseFloat(payload.luck_boost || 0);

            if (isNaN(exp) || exp < 0 || exp > 300.0) {
                return res.status(400).json({ success: false, message: 'El potenciador de EXP no puede ser menor a 0.0% ni superar el tope máximo permitido de 300.0%.' });
            }
            if (isNaN(star) || star < 0 || star > 300.0) {
                return res.status(400).json({ success: false, message: 'El potenciador de StarShips no puede ser menor a 0.0% ni superar el tope máximo permitido de 300.0%.' });
            }
            if (isNaN(luck) || luck < 0 || luck > 100.0) {
                return res.status(400).json({ success: false, message: 'El potenciador de Suerte no puede ser menor a 0.0% ni superar el tope máximo permitido de 100.0%.' });
            }
        }

        const pool = await getPool();
        await ensureMailboxTableExist(pool);

        const cleanTitle = (title || 'Recompensa Especial').trim();
        const cleanDesc = (description || '').trim();
        const cleanSender = (sender || 'Administración Ani-Dimension').trim();
        const payloadJson = JSON.stringify(payload || {});

        const isGlobal = (target === 'ALL' || !userId);
        const targetId = isGlobal ? null : parseInt(userId, 10);

        if (!isGlobal && (isNaN(targetId) || targetId <= 0)) {
            return res.status(400).json({ success: false, message: 'ID de usuario destinatario inválido.' });
        }

        const result = await pool.request()
            .input('UsuarioId', sql.Int, targetId)
            .input('GiftType', sql.NVarChar(50), cleanType)
            .input('Title', sql.NVarChar(150), cleanTitle)
            .input('Description', sql.NVarChar(500), cleanDesc)
            .input('PayloadJson', sql.NVarChar(sql.MAX), payloadJson)
            .input('Sender', sql.NVarChar(100), cleanSender)
            .execute('dbo.sp_EnviarRegalo');

        const row = result.recordset && result.recordset[0] ? result.recordset[0] : {};

        console.log(`[GIFT SENT] Regalo (${cleanType}) [${isGlobal ? 'GLOBAL' : 'USER: ' + targetId}]: "${cleanTitle}"`);

        return res.status(201).json({
            success: true,
            message: isGlobal 
                ? `Regalo masivo (${cleanType}) enviado exitosamente a TODOS los duelistas del juego.` 
                : `Regalo (${cleanType}) enviado exitosamente. Estará disponible en su buzón.`,
            target: isGlobal ? 'ALL' : 'USER',
            mailboxId: row.MailboxId
        });
    } catch (error) {
        console.error('[ADMIN SEND GIFT ERROR]', error);
        return res.status(500).json({ success: false, message: 'Error interno al enviar regalo: ' + error.message });
    }
}

/**
 * Consultar buzón / regalos pendientes para un usuario
 */
async function getUserMailbox(req, res) {
    try {
        const userId = parseInt(req.query.userId, 10);
        const username = req.query.username || '';

        const pool = await getPool();
        await ensureMailboxTableExist(pool);

        let targetId = userId;
        if ((!targetId || isNaN(targetId)) && username) {
            const userLookup = await pool.request()
                .input('Username', sql.VarChar(50), username.trim())
                .query('SELECT Id FROM dbo.Usuarios WHERE Username = @Username');
            if (userLookup.recordset.length > 0) {
                targetId = userLookup.recordset[0].Id;
            }
        }

        if (!targetId || isNaN(targetId)) {
            return res.json({ success: true, gifts: [] });
        }

        // Consultar buzón mediante Stored Procedure Oficial dbo.sp_ObtenerBuzonUsuario
        const result = await pool.request()
            .input('UsuarioId', sql.Int, targetId)
            .execute('dbo.sp_ObtenerBuzonUsuario');

        const gifts = (result.recordset || []).map(g => {
            let payload = {};
            try { payload = JSON.parse(g.PayloadJson); } catch (e) {}
            return {
                id: g.Id,
                giftType: g.GiftType,
                title: g.Title,
                description: g.Description,
                payload: payload,
                sender: g.Sender,
                isGlobal: Boolean(g.IsGlobal),
                createdAt: g.CreatedAt
            };
        });

        return res.json({
            success: true,
            gifts: gifts
        });
    } catch (error) {
        console.error('[API GET USER MAILBOX ERROR]', error);
        return res.status(500).json({ success: false, message: 'Error al consultar buzón.', error: error.message });
    }
}

/**
 * Reclamar un regalo del buzón
 */
async function claimMailboxGift(req, res) {
    try {
        const { giftId, userId, username } = req.body;
        const gid = parseInt(giftId, 10);
        let uid = parseInt(userId, 10);

        const pool = await getPool();
        await ensureMailboxTableExist(pool);

        if ((!uid || isNaN(uid)) && username) {
            const userLookup = await pool.request()
                .input('Username', sql.VarChar(50), username.trim())
                .query('SELECT Id FROM dbo.Usuarios WHERE Username = @Username');
            if (userLookup.recordset.length > 0) {
                uid = userLookup.recordset[0].Id;
            }
        }

        if (isNaN(gid) || isNaN(uid)) {
            return res.status(400).json({ success: false, message: 'Datos incompletos para reclamar regalo.' });
        }

        // Ejecutar Stored Procedure Transaccional Oficial dbo.sp_ReclamarRegaloBuzon
        const result = await pool.request()
            .input('UsuarioId', sql.Int, uid)
            .input('MailboxId', sql.Int, gid)
            .execute('dbo.sp_ReclamarRegaloBuzon');

        const row = result.recordset && result.recordset[0] ? result.recordset[0] : {};
        let payload = {};
        try { payload = JSON.parse(row.PayloadJson); } catch (e) {}

        return res.json({
            success: true,
            message: row.Message || 'Regalo reclamado exitosamente.',
            giftType: row.GiftType,
            payload: payload,
            newStarships: row.NewStarships,
            avatar: {
                code: row.ActiveAvatarCode,
                exp: row.AvatarExp !== null && row.AvatarExp !== undefined ? parseFloat(row.AvatarExp) : undefined,
                starships: row.AvatarStar !== null && row.AvatarStar !== undefined ? parseFloat(row.AvatarStar) : undefined,
                luck: row.AvatarLuck !== null && row.AvatarLuck !== undefined ? parseFloat(row.AvatarLuck) : undefined
            },
            stats: {
                bonusExp: row.BonusExp !== null && row.BonusExp !== undefined ? parseFloat(row.BonusExp) : undefined,
                bonusStarships: row.BonusStarships !== null && row.BonusStarships !== undefined ? parseFloat(row.BonusStarships) : undefined,
                bonusSuerte: row.BonusSuerte !== null && row.BonusSuerte !== undefined ? parseFloat(row.BonusSuerte) : undefined
            }
        });
    } catch (error) {
        console.error('[API CLAIM GIFT ERROR]', error);
        return res.status(400).json({ success: false, message: error.message });
    }
}

/**
 * Descartar / eliminar un regalo del buzón de un usuario
 */
async function discardMailboxGift(req, res) {
    try {
        const { giftId, userId, username } = req.body;
        const gid = parseInt(giftId, 10);
        let uid = parseInt(userId, 10);

        const pool = await getPool();
        await ensureMailboxTableExist(pool);

        if ((!uid || isNaN(uid)) && username) {
            const userLookup = await pool.request()
                .input('Username', sql.VarChar(50), username.trim())
                .query('SELECT Id FROM dbo.Usuarios WHERE Username = @Username');
            if (userLookup.recordset.length > 0) {
                uid = userLookup.recordset[0].Id;
            }
        }

        if (isNaN(gid) || isNaN(uid)) {
            return res.status(400).json({ success: false, message: 'Datos incompletos para descartar regalo.' });
        }

        const giftCheck = await pool.request()
            .input('Id', sql.Int, gid)
            .query('SELECT Id, UsuarioId, Title FROM dbo.UserMailbox WHERE Id = @Id');

        if (giftCheck.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'El regalo no fue encontrado.' });
        }

        const gift = giftCheck.recordset[0];
        const isGlobal = (gift.UsuarioId === null);

        if (!isGlobal) {
            if (gift.UsuarioId !== uid) {
                return res.status(403).json({ success: false, message: 'Este regalo no pertenece a este usuario.' });
            }
            await pool.request()
                .input('Id', sql.Int, gid)
                .query('DELETE FROM dbo.UserMailbox WHERE Id = @Id');
        } else {
            await pool.request()
                .input('GiftId', sql.Int, gid)
                .input('UsuarioId', sql.Int, uid)
                .query(`
                    IF NOT EXISTS (SELECT 1 FROM dbo.UserMailboxGlobalClaims WHERE MailboxGiftId = @GiftId AND UsuarioId = @UsuarioId)
                    BEGIN
                        INSERT INTO dbo.UserMailboxGlobalClaims (MailboxGiftId, UsuarioId, ClaimedAt) VALUES (@GiftId, @UsuarioId, GETDATE())
                    END
                `);
        }

        return res.json({
            success: true,
            message: `El premio "${gift.Title}" ha sido descartado de tu buzón.`
        });
    } catch (error) {
        console.error('[API DISCARD GIFT ERROR]', error);
        return res.status(500).json({ success: false, message: 'Error al descartar regalo: ' + error.message });
    }
}

/**
 * Obtener historial de regalos enviados para auditoría de Admin
 */
async function getGiftsHistory(req, res) {
    try {
        const pool = await getPool();
        await ensureMailboxTableExist(pool);

        const historyQuery = await pool.request().query(`
            SELECT TOP 50
                m.Id, m.UsuarioId, m.GiftType, m.Title, m.Description, m.PayloadJson,
                m.IsClaimed, m.CreatedAt, m.Sender,
                ISNULL(u.Username, 'TODOS (GLOBAL)') as TargetName
            FROM dbo.UserMailbox m
            LEFT JOIN dbo.Usuarios u ON m.UsuarioId = u.Id
            ORDER BY m.CreatedAt DESC
        `);

        return res.json({
            success: true,
            history: historyQuery.recordset
        });
    } catch (error) {
        console.error('[ADMIN GIFTS HISTORY ERROR]', error);
        return res.status(500).json({ success: false, message: 'Error al consultar historial de regalos.' });
    }
}

/**
 * ============================================================================
 * MÓDULO DE TAPETES DE DUELO (PLAYMATS) - CONTROLADOR BACKEND
 * ============================================================================
 */
const PLAYMATS_DB_PATH = path.resolve(__dirname, '../data/playmats_db.json');
const PLAYMATS_IMG_DIR = path.resolve(__dirname, '../../frontend/assets/images/playmats');

function readPlaymatsDb() {
    try {
        if (!fs.existsSync(PLAYMATS_DB_PATH)) {
            return [];
        }
        const content = fs.readFileSync(PLAYMATS_DB_PATH, 'utf8');
        return JSON.parse(content || '[]');
    } catch (e) {
        console.error('[READ PLAYMATS DB ERROR]', e);
        return [];
    }
}

function writePlaymatsDb(data) {
    try {
        fs.writeFileSync(PLAYMATS_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('[WRITE PLAYMATS DB ERROR]', e);
        return false;
    }
}

async function getPlaymats(req, res) {
    try {
        const pool = await getPool();
        const result = await pool.request().query('SELECT * FROM dbo.PlaymatsCatalog ORDER BY Price ASC');
        const playmats = (result.recordset || []).map(r => ({
            code: r.Code,
            name: r.Name,
            description: r.Description || '',
            price: r.Price,
            currency: r.Currency,
            image: r.Image,
            offer_text: r.OfferText || '',
            active: Boolean(r.IsActive)
        }));
        return res.json({ success: true, playmats });
    } catch (e) {
        console.error('[ADMIN GET PLAYMATS DB ERROR]', e);
        return res.status(500).json({ success: false, message: e.message });
    }
}

async function savePlaymat(req, res) {
    try {
        const playmatData = req.body;
        if (!playmatData || !playmatData.code) {
            return res.status(400).json({ success: false, message: 'Código de tapete requerido.' });
        }

        const pool = await getPool();
        const code = playmatData.code.trim().toUpperCase();
        const name = (playmatData.name || code).trim();
        const description = (playmatData.description || '').trim();
        const price = parseInt(playmatData.price || 0, 10);
        const currency = (playmatData.currency || 'STARSHIPS').toUpperCase();
        const image = playmatData.image || `/assets/images/playmats/${code}.jpg`;
        const offerText = (playmatData.offer_text || '').trim().toUpperCase();
        const isActive = playmatData.active !== false;

        await pool.request()
            .input('Code', sql.NVarChar(50), code)
            .input('Name', sql.NVarChar(150), name)
            .input('Description', sql.NVarChar(sql.MAX), description)
            .input('Price', sql.Int, price)
            .input('Currency', sql.NVarChar(20), currency)
            .input('Image', sql.NVarChar(500), image)
            .input('OfferText', sql.NVarChar(100), offerText)
            .input('IsActive', sql.Bit, isActive ? 1 : 0)
            .query(`
                MERGE dbo.PlaymatsCatalog AS target
                USING (SELECT @Code AS Code) AS source
                ON (target.Code = source.Code)
                WHEN MATCHED THEN
                    UPDATE SET 
                        Name = @Name,
                        Description = @Description,
                        Price = @Price,
                        Currency = @Currency,
                        Image = @Image,
                        OfferText = @OfferText,
                        IsActive = @IsActive,
                        UpdatedAt = GETDATE()
                WHEN NOT MATCHED THEN
                    INSERT (Code, Name, Description, Price, Currency, Image, OfferText, IsActive, UpdatedAt)
                    VALUES (@Code, @Name, @Description, @Price, @Currency, @Image, @OfferText, @IsActive, GETDATE());
            `);

        const item = { code, name, description, price, currency, image, offer_text: offerText, active: isActive };
        return res.json({ success: true, message: 'Tapete guardado en SQL Server.', playmat: item });
    } catch (e) {
        console.error('[ADMIN SAVE PLAYMAT ERROR]', e);
        return res.status(500).json({ success: false, message: e.message });
    }
}

async function deletePlaymat(req, res) {
    try {
        const { code } = req.params;
        const pool = await getPool();
        await pool.request()
            .input('Code', sql.NVarChar(50), code.trim().toUpperCase())
            .query('DELETE FROM dbo.PlaymatsCatalog WHERE Code = @Code');
        return res.json({ success: true, message: 'Tapete eliminado de la base de datos.' });
    } catch (e) {
        console.error('[ADMIN DELETE PLAYMAT ERROR]', e);
        return res.status(500).json({ success: false, message: e.message });
    }
}

async function uploadPlaymatImage(req, res) {
    try {
        const { code, imageBase64, extension = 'jpg' } = req.body;
        if (!imageBase64 || !code) {
            return res.status(400).json({ success: false, message: 'Faltan datos de imagen o código.' });
        }

        if (!fs.existsSync(PLAYMATS_IMG_DIR)) {
            fs.mkdirSync(PLAYMATS_IMG_DIR, { recursive: true });
        }

        const ext = extension.replace('.', '').toLowerCase();
        const filename = `${code}.${ext}`;
        const filePath = path.join(PLAYMATS_IMG_DIR, filename);

        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

        const relativeUrl = `/assets/images/playmats/${filename}`;
        return res.json({ success: true, url: relativeUrl });
    } catch (e) {
        console.error('[UPLOAD PLAYMAT IMAGE ERROR]', e);
        return res.status(500).json({ success: false, message: e.message });
    }
}

/**
 * ============================================================================
 * MÓDULO DE FUNDAS / REVERSOS (SLEEVES) - CONTROLADOR BACKEND
 * ============================================================================
 */
const SLEEVES_DB_PATH = path.resolve(__dirname, '../data/sleeves_db.json');
const SLEEVES_IMG_DIR = path.resolve(__dirname, '../../frontend/assets/images/sleeves');

function readSleevesDb() {
    try {
        if (!fs.existsSync(SLEEVES_DB_PATH)) {
            return [];
        }
        const content = fs.readFileSync(SLEEVES_DB_PATH, 'utf8');
        return JSON.parse(content || '[]');
    } catch (e) {
        console.error('[READ SLEEVES DB ERROR]', e);
        return [];
    }
}

function writeSleevesDb(data) {
    try {
        fs.writeFileSync(SLEEVES_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('[WRITE SLEEVES DB ERROR]', e);
        return false;
    }
}

async function getSleeves(req, res) {
    try {
        const pool = await getPool();
        const result = await pool.request().query('SELECT * FROM dbo.SleevesCatalog ORDER BY Price ASC');
        const sleeves = (result.recordset || []).map(r => ({
            code: r.Code,
            name: r.Name,
            description: r.Description || '',
            price: r.Price,
            currency: r.Currency,
            image: r.Image,
            offer_text: r.OfferText || '',
            active: Boolean(r.IsActive)
        }));
        return res.json({ success: true, sleeves });
    } catch (e) {
        console.error('[ADMIN GET SLEEVES DB ERROR]', e);
        return res.status(500).json({ success: false, message: e.message });
    }
}

async function saveSleeve(req, res) {
    try {
        const sleeveData = req.body;
        if (!sleeveData || !sleeveData.code) {
            return res.status(400).json({ success: false, message: 'Código de funda requerido.' });
        }

        const pool = await getPool();
        const code = sleeveData.code.trim().toUpperCase();
        const name = (sleeveData.name || code).trim();
        const description = (sleeveData.description || '').trim();
        const price = parseInt(sleeveData.price || 0, 10);
        const currency = (sleeveData.currency || 'STARSHIPS').toUpperCase();
        const image = sleeveData.image || `/assets/images/sleeves/${code}.png`;
        const offerText = (sleeveData.offer_text || '').trim().toUpperCase();
        const isActive = sleeveData.active !== false;

        await pool.request()
            .input('Code', sql.NVarChar(50), code)
            .input('Name', sql.NVarChar(150), name)
            .input('Description', sql.NVarChar(sql.MAX), description)
            .input('Price', sql.Int, price)
            .input('Currency', sql.NVarChar(20), currency)
            .input('Image', sql.NVarChar(500), image)
            .input('OfferText', sql.NVarChar(100), offerText)
            .input('IsActive', sql.Bit, isActive ? 1 : 0)
            .query(`
                MERGE dbo.SleevesCatalog AS target
                USING (SELECT @Code AS Code) AS source
                ON (target.Code = source.Code)
                WHEN MATCHED THEN
                    UPDATE SET 
                        Name = @Name,
                        Description = @Description,
                        Price = @Price,
                        Currency = @Currency,
                        Image = @Image,
                        OfferText = @OfferText,
                        IsActive = @IsActive,
                        UpdatedAt = GETDATE()
                WHEN NOT MATCHED THEN
                    INSERT (Code, Name, Description, Price, Currency, Image, OfferText, IsActive, UpdatedAt)
                    VALUES (@Code, @Name, @Description, @Price, @Currency, @Image, @OfferText, @IsActive, GETDATE());
            `);

        const item = { code, name, description, price, currency, image, offer_text: offerText, active: isActive };
        return res.json({ success: true, message: 'Funda guardada en SQL Server.', sleeve: item });
    } catch (e) {
        console.error('[ADMIN SAVE SLEEVE ERROR]', e);
        return res.status(500).json({ success: false, message: e.message });
    }
}

async function deleteSleeve(req, res) {
    try {
        const { code } = req.params;
        const pool = await getPool();
        await pool.request()
            .input('Code', sql.NVarChar(50), code.trim().toUpperCase())
            .query('DELETE FROM dbo.SleevesCatalog WHERE Code = @Code');
        return res.json({ success: true, message: 'Funda eliminada de la base de datos.' });
    } catch (e) {
        console.error('[ADMIN DELETE SLEEVE ERROR]', e);
        return res.status(500).json({ success: false, message: e.message });
    }
}

async function uploadSleeveImage(req, res) {
    try {
        const { code, imageBase64, extension = 'png' } = req.body;
        if (!imageBase64 || !code) {
            return res.status(400).json({ success: false, message: 'Faltan datos de imagen o código.' });
        }

        if (!fs.existsSync(SLEEVES_IMG_DIR)) {
            fs.mkdirSync(SLEEVES_IMG_DIR, { recursive: true });
        }

        const ext = extension.replace('.', '').toLowerCase();
        const filename = `${code}.${ext}`;
        const filePath = path.join(SLEEVES_IMG_DIR, filename);

        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

        const relativeUrl = `/assets/images/sleeves/${filename}`;
        return res.json({ success: true, url: relativeUrl });
    } catch (e) {
        console.error('[UPLOAD SLEEVE IMAGE ERROR]', e);
        return res.status(500).json({ success: false, message: e.message });
    }
}

/**
 * Actualizar cosméticos activos del usuario en dbo.Usuarios
 */
async function updateUserActiveCosmetics(req, res) {
    try {
        const { userId, matActivoId, fundaActivaId } = req.body;
        if (!userId) {
            return res.status(400).json({ success: false, message: 'ID de usuario requerido.' });
        }

        const pool = await getPool();
        await ensureAdminColumnsExist(pool);

        let query = 'UPDATE dbo.Usuarios SET ';
        const updates = [];
        const request = pool.request().input('UserId', sql.Int, userId);

        if (matActivoId !== undefined) {
            updates.push('MatActivoId = @MatActivoId');
            request.input('MatActivoId', sql.NVarChar(50), matActivoId || '');
        }
        if (fundaActivaId !== undefined) {
            updates.push('FundaActivaId = @FundaActivaId');
            request.input('FundaActivaId', sql.NVarChar(50), fundaActivaId || '');
        }

        if (updates.length === 0) {
            return res.json({ success: true, message: 'Sin cambios.' });
        }

        query += updates.join(', ') + ' WHERE Id = @UserId';
        await request.query(query);

        return res.json({ success: true, message: 'Cosméticos activos actualizados.' });
    } catch (e) {
        console.error('[UPDATE USER COSMETICS ERROR]', e);
        return res.status(500).json({ success: false, message: e.message });
    }
}

/**
 * ============================================================================
 * MÓDULO DE RECARGA DE STARSHIPS ($ USD)
 * ============================================================================
 */
const ESTRELLAS_DB_PATH = path.resolve(__dirname, '../data/estrellas_db.json');

function readEstrellasDb() {
    try {
        if (!fs.existsSync(ESTRELLAS_DB_PATH)) return [];
        return JSON.parse(fs.readFileSync(ESTRELLAS_DB_PATH, 'utf8') || '[]');
    } catch (e) {
        return [];
    }
}

function writeEstrellasDb(data) {
    try {
        fs.writeFileSync(ESTRELLAS_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (e) {
        return false;
    }
}

async function getEstrellasPackages(req, res) {
    try {
        const pool = await getPool();
        const result = await pool.request().query('SELECT * FROM dbo.EstrellasPackagesCatalog ORDER BY Price ASC');
        const packages = (result.recordset || []).map(r => ({
            codigo: r.Code,
            code: r.Code,
            nombre: r.Name,
            name: r.Name,
            icono: r.Icon || '⭐',
            estrellas_base: r.StarshipsBase,
            estrellas_bonus: r.StarshipsBonus,
            starships: r.StarshipsBase + r.StarshipsBonus,
            precio_usd: parseFloat(r.Price),
            price: parseFloat(r.Price),
            banner_tag: r.BannerTag || '',
            offer_text: r.BannerTag || '',
            descripcion: r.Description || '',
            description: r.Description || '',
            activo: r.IsActive ? 1 : 0,
            active: Boolean(r.IsActive)
        }));
        return res.json({ success: true, packages });
    } catch (e) {
        console.error('[ADMIN GET ESTRELLAS DB ERROR]', e);
        return res.status(500).json({ success: false, message: e.message });
    }
}

async function saveEstrellasPackage(req, res) {
    try {
        const pkg = req.body;
        if (!pkg || (!pkg.code && !pkg.codigo)) {
            return res.status(400).json({ success: false, message: 'Código de paquete requerido.' });
        }

        const pool = await getPool();
        const code = (pkg.code || pkg.codigo).trim().toUpperCase();
        const name = (pkg.name || pkg.nombre || code).trim();
        const icon = (pkg.icono || pkg.icon || '⭐').trim();
        const starshipsBase = parseInt(pkg.estrellas_base || pkg.starshipsBase || pkg.starships || 10000, 10);
        const starshipsBonus = parseInt(pkg.estrellas_bonus || pkg.starshipsBonus || 0, 10);
        const price = parseFloat(pkg.price || pkg.precio_usd || 0.99);
        const bannerTag = (pkg.banner_tag || pkg.offer_text || '').trim().toUpperCase();
        const description = (pkg.description || pkg.descripcion || '').trim();
        const isActive = pkg.active !== false && pkg.activo !== 0;

        await pool.request()
            .input('Code', sql.NVarChar(50), code)
            .input('Name', sql.NVarChar(150), name)
            .input('Icon', sql.NVarChar(10), icon)
            .input('StarshipsBase', sql.Int, starshipsBase)
            .input('StarshipsBonus', sql.Int, starshipsBonus)
            .input('Price', sql.Decimal(10, 2), price)
            .input('Currency', sql.NVarChar(10), 'USD')
            .input('BannerTag', sql.NVarChar(50), bannerTag)
            .input('Description', sql.NVarChar(sql.MAX), description)
            .input('IsActive', sql.Bit, isActive ? 1 : 0)
            .query(`
                MERGE dbo.EstrellasPackagesCatalog AS target
                USING (SELECT @Code AS Code) AS source
                ON (target.Code = source.Code)
                WHEN MATCHED THEN
                    UPDATE SET 
                        Name = @Name,
                        Icon = @Icon,
                        StarshipsBase = @StarshipsBase,
                        StarshipsBonus = @StarshipsBonus,
                        Price = @Price,
                        Currency = @Currency,
                        BannerTag = @BannerTag,
                        Description = @Description,
                        IsActive = @IsActive,
                        UpdatedAt = GETDATE()
                WHEN NOT MATCHED THEN
                    INSERT (Code, Name, Icon, StarshipsBase, StarshipsBonus, Price, Currency, BannerTag, Description, IsActive, UpdatedAt)
                    VALUES (@Code, @Name, @Icon, @StarshipsBase, @StarshipsBonus, @Price, @Currency, @BannerTag, @Description, @IsActive, GETDATE());
            `);

        const item = {
            code, codigo: code, name, nombre: name, icono: icon,
            estrellas_base: starshipsBase, estrellas_bonus: starshipsBonus,
            starships: starshipsBase + starshipsBonus, price, precio_usd: price,
            banner_tag: bannerTag, description, active: isActive, activo: isActive ? 1 : 0
        };
        return res.json({ success: true, message: 'Paquete de estrellas guardado en SQL Server.', package: item });
    } catch (e) {
        console.error('[ADMIN SAVE ESTRELLAS ERROR]', e);
        return res.status(500).json({ success: false, message: e.message });
    }
}

async function deleteEstrellasPackage(req, res) {
    try {
        const { code } = req.params;
        const pool = await getPool();
        await pool.request()
            .input('Code', sql.NVarChar(50), code.trim().toUpperCase())
            .query('DELETE FROM dbo.EstrellasPackagesCatalog WHERE Code = @Code');
        return res.json({ success: true, message: 'Paquete de estrellas eliminado de la base de datos.' });
    } catch (e) {
        console.error('[ADMIN DELETE ESTRELLAS ERROR]', e);
        return res.status(500).json({ success: false, message: e.message });
    }
}

/**
 * ============================================================================
 * MÓDULO DE VENTA DIRECTA DE CARTAS Y BUNDLES ($ USD)
 * ============================================================================
 */
const CARTAS_SINGLES_DB_PATH = path.resolve(__dirname, '../data/cartas_singles_db.json');

function readCartasSinglesDb() {
    try {
        if (!fs.existsSync(CARTAS_SINGLES_DB_PATH)) return [];
        return JSON.parse(fs.readFileSync(CARTAS_SINGLES_DB_PATH, 'utf8') || '[]');
    } catch (e) {
        return [];
    }
}

function writeCartasSinglesDb(data) {
    try {
        fs.writeFileSync(CARTAS_SINGLES_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (e) {
        return false;
    }
}

async function getCartasSingles(req, res) {
    try {
        const pool = await getPool();
        const result = await pool.request().query('SELECT * FROM dbo.CartasSinglesCatalog ORDER BY Price ASC');
        const singles = (result.recordset || []).map(r => ({
            code: r.Code,
            codigo: r.Code,
            cardId: r.CardId,
            card_id: r.CardId,
            name: r.Name,
            nombre: r.Name,
            packCode: r.PackCode,
            rarity: r.Rarity,
            rareza: r.Rarity,
            type: r.Type,
            tipo: r.Type,
            cardsList: r.CardsList ? JSON.parse(r.CardsList) : null,
            price: parseFloat(r.Price),
            precio_usd: parseFloat(r.Price),
            currency: r.Currency,
            offer_text: r.OfferText || '',
            image: r.Image,
            description: r.Description || '',
            descripcion: r.Description || '',
            active: Boolean(r.IsActive),
            activo: r.IsActive ? 1 : 0
        }));
        return res.json({ success: true, singles, cartas: singles });
    } catch (e) {
        console.error('[ADMIN GET CARTAS SINGLES DB ERROR]', e);
        return res.status(500).json({ success: false, message: e.message });
    }
}

async function saveCartaSingle(req, res) {
    try {
        const single = req.body;
        if (!single || (!single.code && !single.codigo)) {
            return res.status(400).json({ success: false, message: 'Código de carta/bundle requerido.' });
        }

        const pool = await getPool();
        const code = (single.code || single.codigo).trim().toUpperCase();
        const cardId = single.cardId || single.card_id ? parseInt(single.cardId || single.card_id, 10) : null;
        const name = (single.name || single.nombre || code).trim();
        const packCode = (single.packCode || 'LOB').trim().toUpperCase();
        const rarity = (single.rarity || single.rareza || 'ULTRA RARE').trim().toUpperCase();
        const type = (single.type || single.tipo || 'SINGLE').trim().toUpperCase();
        const cardsList = single.cardsList ? (typeof single.cardsList === 'string' ? single.cardsList : JSON.stringify(single.cardsList)) : null;
        const price = parseFloat(single.price || single.precio_usd || 1.99);
        const currency = (single.currency || 'USD').trim().toUpperCase();
        const offerText = (single.offer_text || '').trim().toUpperCase();
        const image = single.image || (cardId ? `/assets/images/cards/${cardId}.jpg` : '/assets/images/logo.png');
        const description = (single.description || single.descripcion || '').trim();
        const isActive = single.active !== false && single.activo !== 0;

        await pool.request()
            .input('Code', sql.NVarChar(50), code)
            .input('CardId', sql.Int, cardId)
            .input('Name', sql.NVarChar(150), name)
            .input('PackCode', sql.NVarChar(50), packCode)
            .input('Rarity', sql.NVarChar(50), rarity)
            .input('Type', sql.NVarChar(50), type)
            .input('CardsList', sql.NVarChar(sql.MAX), cardsList)
            .input('Price', sql.Decimal(10, 2), price)
            .input('Currency', sql.NVarChar(10), currency)
            .input('OfferText', sql.NVarChar(100), offerText)
            .input('Image', sql.NVarChar(500), image)
            .input('Description', sql.NVarChar(sql.MAX), description)
            .input('IsActive', sql.Bit, isActive ? 1 : 0)
            .query(`
                MERGE dbo.CartasSinglesCatalog AS target
                USING (SELECT @Code AS Code) AS source
                ON (target.Code = source.Code)
                WHEN MATCHED THEN
                    UPDATE SET 
                        CardId = @CardId,
                        Name = @Name,
                        PackCode = @PackCode,
                        Rarity = @Rarity,
                        Type = @Type,
                        CardsList = @CardsList,
                        Price = @Price,
                        Currency = @Currency,
                        OfferText = @OfferText,
                        Image = @Image,
                        Description = @Description,
                        IsActive = @IsActive,
                        UpdatedAt = GETDATE()
                WHEN NOT MATCHED THEN
                    INSERT (Code, CardId, Name, PackCode, Rarity, Type, CardsList, Price, Currency, OfferText, Image, Description, IsActive, UpdatedAt)
                    VALUES (@Code, @CardId, @Name, @PackCode, @Rarity, @Type, @CardsList, @Price, @Currency, @OfferText, @Image, @Description, @IsActive, GETDATE());
            `);

        const item = {
            code, codigo: code, cardId, card_id: cardId, name, nombre: name,
            packCode, rarity, rareza: rarity, type, tipo: type,
            cardsList: single.cardsList || null, price, precio_usd: price,
            currency, offer_text: offerText, image, description, descripcion: description,
            active: isActive, activo: isActive ? 1 : 0
        };
        return res.json({ success: true, message: 'Carta o Bundle guardado en SQL Server.', single: item });
    } catch (e) {
        console.error('[ADMIN SAVE CARTA SINGLE ERROR]', e);
        return res.status(500).json({ success: false, message: e.message });
    }
}

async function deleteCartaSingle(req, res) {
    try {
        const { code } = req.params;
        const pool = await getPool();
        await pool.request()
            .input('Code', sql.NVarChar(50), code.trim().toUpperCase())
            .query('DELETE FROM dbo.CartasSinglesCatalog WHERE Code = @Code');
        return res.json({ success: true, message: 'Carta o Bundle eliminado de la base de datos.' });
    } catch (e) {
        console.error('[ADMIN DELETE CARTA SINGLE ERROR]', e);
        return res.status(500).json({ success: false, message: e.message });
    }
}

// ============================================================================
// FUNCIONES DE EVENTOS Y BONIFICACIONES DE SALAS PVP
// ============================================================================
const { pvpBonusService } = require('../engine/pvp-bonus-service');

async function getPvPBonusEvents(req, res) {
    try {
        const events = await pvpBonusService.getAllBonusEvents();
        const activeBonus = await pvpBonusService.getActiveBonus();
        return res.json({
            success: true,
            events: events,
            activeBonus: activeBonus
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Error al obtener bonificaciones PvP: ' + err.message });
    }
}

async function getActivePvPBonus(req, res) {
    try {
        const activeBonus = await pvpBonusService.getActiveBonus();
        return res.json({
            success: true,
            activeBonus: activeBonus
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}

async function savePvPBonusEvent(req, res) {
    try {
        const result = await pvpBonusService.saveBonusEvent(req.body);
        return res.json({
            success: true,
            message: 'Bonificación de Salas PvP guardada correctamente.',
            activeBonus: result.activeBonus
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Error al guardar bonificación PvP: ' + err.message });
    }
}

async function togglePvPBonusEvent(req, res) {
    try {
        const { id, isActive } = req.body;
        const result = await pvpBonusService.toggleBonusEvent(id, isActive);
        return res.json({
            success: true,
            message: `Evento de bonificación ${isActive ? 'activado' : 'desactivado'} correctamente.`,
            activeBonus: result.activeBonus
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Error al cambiar estado: ' + err.message });
    }
}

async function getPacksCatalog(req, res) {
    try {
        const pool = await getPool();
        const result = await pool.request().execute('dbo.sp_GetBoosterPacks');
        const packs = result.recordsets[0] || [];
        const overrides = result.recordsets[1] || [];

        return res.json({
            success: true,
            packs,
            overrides
        });
    } catch (err) {
        console.error('[ADMIN GET PACKS ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al consultar catálogo de sobres: ' + err.message });
    }
}

async function updatePackConfig(req, res) {
    try {
        const { packId, isActive, isVisible, price, offerText } = req.body;
        if (!packId) {
            return res.status(400).json({ success: false, message: 'PackId es requerido.' });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('PackId', sql.NVarChar(50), packId.toString().trim().toUpperCase())
            .input('IsActive', sql.Bit, Boolean(isActive))
            .input('IsVisible', sql.Bit, isVisible !== undefined ? Boolean(isVisible) : true)
            .input('Price', sql.Int, parseInt(price, 10) || 1500)
            .input('OfferText', sql.NVarChar(100), offerText ? offerText.toString().trim().slice(0, 100) : null)
            .execute('dbo.sp_UpdateBoosterPack');

        return res.json({
            success: true,
            message: `Sobre ${packId} actualizado correctamente en la base de datos.`,
            pack: result.recordset && result.recordset[0]
        });
    } catch (err) {
        console.error('[ADMIN UPDATE PACK ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al actualizar configuración de sobre: ' + err.message });
    }
}

async function updateCardOverride(req, res) {
    try {
        const { packId, cardId, isActive, packDrop, deckUsable, npcDrop } = req.body;
        if (!packId || !cardId) {
            return res.status(400).json({ success: false, message: 'PackId y CardId son requeridos.' });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('PackId', sql.NVarChar(50), packId.toString().trim().toUpperCase())
            .input('CardId', sql.Int, parseInt(cardId, 10))
            .input('IsActive', sql.Bit, isActive !== undefined ? Boolean(isActive) : 1)
            .input('PackDrop', sql.Bit, packDrop !== undefined ? Boolean(packDrop) : 1)
            .input('DeckUsable', sql.Bit, deckUsable !== undefined ? Boolean(deckUsable) : 1)
            .input('NpcDrop', sql.Bit, npcDrop !== undefined ? Boolean(npcDrop) : 1)
            .execute('dbo.sp_UpdateCardOverride');

        return res.json({
            success: true,
            message: `Carta #${cardId} en sobre ${packId} actualizada correctamente en base de datos.`,
            override: result.recordset && result.recordset[0]
        });
    } catch (err) {
        console.error('[ADMIN UPDATE CARD OVERRIDE ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al actualizar configuración de carta: ' + err.message });
    }
}

async function deactivateAllEvents(req, res) {
    try {
        const pool = await getPool();
        await pool.request().execute('dbo.sp_DeactivateAllEvents');

        return res.json({
            success: true,
            message: 'Todos los eventos de torneos y subastas han sido desactivados en la base de datos.'
        });
    } catch (err) {
        console.error('[ADMIN DEACTIVATE EVENTS ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al desactivar eventos: ' + err.message });
    }
}

const duelLogger = require('../engine/duel-logger');

async function getDuelLogs(req, res) {
    try {
        const date = req.query.date || null;
        const logs = duelLogger.listDuelLogs(date);
        return res.json({ success: true, logs });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Error al listar logs de duelos: ' + err.message });
    }
}

async function getDuelLogContent(req, res) {
    try {
        const pathParam = req.query.path || req.params.path;
        if (!pathParam) {
            return res.status(400).json({ success: false, message: 'Ruta de log requerida.' });
        }
        const content = duelLogger.readDuelLogContent(pathParam);
        if (!content) {
            return res.status(404).json({ success: false, message: 'Archivo de log no encontrado.' });
        }
        return res.json({ success: true, content });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Error al leer log: ' + err.message });
    }
}

async function getAvatarsCatalog(req, res) {
    try {
        const pool = await getPool();
        const result = await pool.request().query('SELECT * FROM dbo.AvatarsCatalog ORDER BY Id ASC');
        const avatars = result.recordset.map(r => ({
            id: r.Id,
            code: r.Code,
            name: r.Name,
            image: r.ImageUrl,
            exp_boost: parseFloat(r.ExpBoost || 0),
            starships_boost: parseFloat(r.StarshipsBoost || 0),
            luck_boost: parseFloat(r.LuckBoost || 0),
            currency: r.Currency,
            price: r.Currency === 'USD' ? parseFloat(r.PriceUsd || 0) : parseInt(r.PriceStarships || 0, 10),
            price_usd: parseFloat(r.PriceUsd || 0),
            price_starships: parseInt(r.PriceStarships || 0, 10),
            offer_text: r.OfferText || '',
            is_vip_only: Boolean(r.IsVipOnly),
            active: Boolean(r.IsActive)
        }));
        return res.json({ success: true, avatars });
    } catch (e) {
        console.error('[ADMIN GET AVATARS DB ERROR]', e);
        return res.status(500).json({ success: false, message: e.message });
    }
}

async function saveAvatar(req, res) {
    try {
        const data = req.body;
        if (!data || !data.code) {
            return res.status(400).json({ success: false, message: 'Código de avatar requerido.' });
        }
        const pool = await getPool();
        const code = data.code.trim().toUpperCase();
        const name = (data.name || code).trim();
        const image = data.image || `../../../assets/images/avatars/${code}.png`;
        const exp = parseFloat(data.exp_boost || 0);
        const star = parseFloat(data.starships_boost || 0);
        const luck = parseFloat(data.luck_boost || 0);
        const currency = (data.currency || 'STARSHIPS').toUpperCase();
        const priceStarships = currency === 'USD' ? 0 : parseInt(data.price || 0, 10);
        const priceUsd = currency === 'USD' ? parseFloat(data.price || 0) : 0;
        const offerText = (data.offer_text || '').trim();
        const isActive = data.active !== false;

        await pool.request()
            .input('Code', sql.VarChar(50), code)
            .input('Name', sql.NVarChar(100), name)
            .input('ImageUrl', sql.NVarChar(255), image)
            .input('ExpBoost', sql.Decimal(5, 2), exp)
            .input('StarshipsBoost', sql.Decimal(5, 2), star)
            .input('LuckBoost', sql.Decimal(5, 2), luck)
            .input('Currency', sql.VarChar(20), currency)
            .input('PriceStarships', sql.Int, priceStarships)
            .input('PriceUsd', sql.Decimal(10, 2), priceUsd)
            .input('OfferText', sql.NVarChar(50), offerText)
            .input('IsActive', sql.Bit, isActive ? 1 : 0)
            .query(`
                MERGE dbo.AvatarsCatalog AS target
                USING (SELECT @Code AS Code) AS source
                ON (target.Code = source.Code)
                WHEN MATCHED THEN
                    UPDATE SET
                        Name = @Name,
                        ImageUrl = @ImageUrl,
                        ExpBoost = @ExpBoost,
                        StarshipsBoost = @StarshipsBoost,
                        LuckBoost = @LuckBoost,
                        Currency = @Currency,
                        PriceStarships = @PriceStarships,
                        PriceUsd = @PriceUsd,
                        OfferText = @OfferText,
                        IsActive = @IsActive
                WHEN NOT MATCHED THEN
                    INSERT (Code, Name, ImageUrl, ExpBoost, StarshipsBoost, LuckBoost, Currency, PriceStarships, PriceUsd, OfferText, IsVipOnly, IsActive, CreatedAt)
                    VALUES (@Code, @Name, @ImageUrl, @ExpBoost, @StarshipsBoost, @LuckBoost, @Currency, @PriceStarships, @PriceUsd, @OfferText, 0, @IsActive, GETDATE());
            `);

        return res.json({ success: true, message: 'Avatar guardado en la base de datos.', avatar: { code, name, image, exp_boost: exp, starships_boost: star, luck_boost: luck, currency, price: currency === 'USD' ? priceUsd : priceStarships, offer_text: offerText, active: isActive } });
    } catch (e) {
        console.error('[ADMIN SAVE AVATAR DB ERROR]', e);
        return res.status(500).json({ success: false, message: e.message });
    }
}

async function toggleAvatarActive(req, res) {
    try {
        const code = req.params.code ? req.params.code.trim().toUpperCase() : '';
        if (!code) return res.status(400).json({ success: false, message: 'Código requerido.' });
        const pool = await getPool();
        const result = await pool.request()
            .input('Code', sql.VarChar(50), code)
            .query(`
                UPDATE dbo.AvatarsCatalog
                SET IsActive = CASE WHEN IsActive = 1 THEN 0 ELSE 1 END
                OUTPUT INSERTED.IsActive
                WHERE Code = @Code
            `);
        const newStatus = result.recordset[0]?.IsActive;
        return res.json({ success: true, isActive: newStatus, message: `Avatar ${code} ${newStatus ? 'activado' : 'inactivado'}.` });
    } catch (e) {
        console.error('[ADMIN TOGGLE AVATAR DB ERROR]', e);
        return res.status(500).json({ success: false, message: e.message });
    }
}

async function deleteAvatar(req, res) {
    try {
        const code = req.params.code ? req.params.code.trim().toUpperCase() : '';
        if (!code) return res.status(400).json({ success: false, message: 'Código requerido.' });
        if (code === 'AVA-001' || code === 'AVA-002') {
            return res.status(400).json({ success: false, message: 'No se pueden eliminar los avatares base del sistema (AVA-001 / AVA-002).' });
        }
        const pool = await getPool();
        await pool.request()
            .input('Code', sql.VarChar(50), code)
            .query('DELETE FROM dbo.AvatarsCatalog WHERE Code = @Code');
        return res.json({ success: true, message: `Avatar ${code} eliminado del catálogo.` });
    } catch (e) {
        console.error('[ADMIN DELETE AVATAR DB ERROR]', e);
        return res.status(500).json({ success: false, message: e.message });
    }
}

module.exports = {
    getUsers,
    getUserById,
    getCountries,
    createUser,
    updateUser,
    toggleUserActive,
    banUser,
    sendGift,
    getUserMailbox,
    claimMailboxGift,
    discardMailboxGift,
    getGiftsHistory,
    getPlaymats,
    savePlaymat,
    deletePlaymat,
    uploadPlaymatImage,
    getSleeves,
    saveSleeve,
    deleteSleeve,
    uploadSleeveImage,
    updateUserActiveCosmetics,
    getEstrellasPackages,
    saveEstrellasPackage,
    deleteEstrellasPackage,
    getCartasSingles,
    saveCartaSingle,
    deleteCartaSingle,
    getPvPBonusEvents,
    getActivePvPBonus,
    savePvPBonusEvent,
    togglePvPBonusEvent,
    getPacksCatalog,
    updatePackConfig,
    updateCardOverride,
    deactivateAllEvents,
    getDuelLogs,
    getDuelLogContent,
    getAvatarsCatalog,
    saveAvatar,
    toggleAvatarActive,
    deleteAvatar
};

