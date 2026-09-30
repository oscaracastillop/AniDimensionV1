const bcrypt = require('bcryptjs');
const { getPool, sql } = require('../config/db');

// Función auxiliar para asegurar que existan las columnas de Baneo y Estado en dbo.Usuarios
async function ensureAdminColumnsExist(pool) {
    try {
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Usuarios') AND name = 'IsActive')
                ALTER TABLE dbo.Usuarios ADD IsActive BIT NOT NULL DEFAULT 1;

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Usuarios') AND name = 'BannedUntil')
                ALTER TABLE dbo.Usuarios ADD BannedUntil DATETIME NULL;

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Usuarios') AND name = 'BanReason')
                ALTER TABLE dbo.Usuarios ADD BanReason NVARCHAR(255) NULL;
        `);
    } catch (err) {
        console.warn('[ADMIN SCHEMA NOTICE] Columnas de estado/baneo verificadas:', err.message);
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
                ISNULL(c.Name, 'Desconocido') as CountryName,
                ISNULL(c.FlagEmoji, '🌐') as FlagEmoji,
                ISNULL(c.FlagSvgUrl, '') as FlagSvgUrl,
                ISNULL(u.Nivel, 1) as Nivel,
                ISNULL(u.Starships, 500) as Starships,
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
            .input('Starships', sql.Int, parseInt(starships || 1000, 10))
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
        const { username, email, password, countryIsoCode, nivel, starships, isAdmin, isActive, bannedUntil, banReason } = req.body;

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

module.exports = {
    getUsers,
    getCountries,
    createUser,
    updateUser,
    toggleUserActive,
    banUser
};
