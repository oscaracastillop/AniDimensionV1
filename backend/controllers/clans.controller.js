const fs = require('fs');
const path = require('path');
const { getPool, sql } = require('../config/db');

// Directorio físico donde se guardan los emblemas de clanes
const CLANS_IMAGE_DIR = path.resolve(__dirname, '../../frontend/assets/images/clans');
if (!fs.existsSync(CLANS_IMAGE_DIR)) {
    fs.mkdirSync(CLANS_IMAGE_DIR, { recursive: true });
}

/**
 * Calcula la experiencia necesaria para el siguiente nivel del clan (1 a 100)
 */
function getClanNextLevelExp(level) {
    if (level >= 100) return 999999999;
    return Math.floor(1000 * Math.pow(1.08, level - 1) + (level * 250));
}

/**
 * Obtener lista de todos los clanes activos para exploración (Mediante dbo.sp_ObtenerListaClanes)
 */
async function getClansList(req, res) {
    try {
        const pool = await getPool();
        const userId = parseInt(req.query.userId || 0, 10);

        const result = await pool.request()
            .input('UserId', sql.Int, userId)
            .execute('dbo.sp_ObtenerListaClanes');

        const clansList = result.recordsets[0] || [];
        let userClanId = null;
        let pendingRequestsMap = {};
        let clanCooldownUntil = null;
        let penaltyRemainingMinutes = 0;

        if (userId > 0 && result.recordsets.length > 1) {
            const userClanRes = result.recordsets[1];
            if (userClanRes && userClanRes.length > 0) {
                userClanId = userClanRes[0].ClanId;
            }
            if (result.recordsets.length > 2) {
                const reqs = result.recordsets[2] || [];
                reqs.forEach(r => {
                    pendingRequestsMap[r.ClanId] = r.Status;
                });
            }
            if (result.recordsets.length > 3) {
                const cooldownRes = result.recordsets[3] || [];
                if (cooldownRes.length > 0 && cooldownRes[0].ClanCooldownUntil) {
                    clanCooldownUntil = cooldownRes[0].ClanCooldownUntil;
                    const diffMs = new Date(clanCooldownUntil) - new Date();
                    if (diffMs > 0) {
                        penaltyRemainingMinutes = Math.ceil(diffMs / (1000 * 60));
                    }
                }
            }
        }

        const clans = clansList.map(c => ({
            id: c.Id,
            name: c.Name,
            tag: c.Tag,
            emblemUrl: c.EmblemUrl,
            level: c.Level,
            exp: c.Exp,
            nextLevelExp: c.NextLevelExp || getClanNextLevelExp(c.Level),
            bonusExpPct: c.Level, // 1% a 100%
            bonusStarshipsPct: c.Level, // 1% a 100%
            minLevelReq: c.MinLevelReq,
            noticeMessage: c.NoticeMessage || '',
            currentMembers: c.CurrentMembers,
            onlineMembers: c.OnlineMembers || 0,
            maxMembers: c.MaxMembers || 30,
            trophies: c.Trophies || 0,
            leader: {
                id: c.LeaderUserId,
                username: c.LeaderUsername || 'Líder',
                country: c.LeaderCountryIso,
                avatar: c.LeaderAvatar || 'AVA-001'
            },
            isMember: userClanId === c.Id,
            requestStatus: pendingRequestsMap[c.Id] || null
        }));

        return res.json({
            success: true,
            clans,
            userClanId,
            hasPenalty: penaltyRemainingMinutes > 0,
            penaltyMinutesRemaining: penaltyRemainingMinutes,
            clanCooldownUntil
        });
    } catch (err) {
        console.error('[API /api/clans/list ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al obtener lista de clanes' });
    }
}

/**
 * Obtener detalles completos del clan del usuario en sesión (Mediante dbo.sp_ObtenerMiClan)
 */
async function getMyClan(req, res) {
    try {
        const userId = parseInt(req.query.userId || req.body.userId || 0, 10);
        if (!userId) {
            return res.status(400).json({ success: false, message: 'ID de usuario requerido' });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('UserId', sql.Int, userId)
            .execute('dbo.sp_ObtenerMiClan');

        const firstSet = result.recordsets[0] || [];
        if (firstSet.length === 0 || !firstSet[0].HasClan) {
            const penaltyData = firstSet[0] || {};
            return res.json({
                success: true,
                hasClan: false,
                clan: null,
                hasPenalty: Boolean(penaltyData.HasPenalty),
                penaltyMinutesRemaining: penaltyData.PenaltyMinutesRemaining || 0,
                clanCooldownUntil: penaltyData.ClanCooldownUntil || null
            });
        }

        const clanHeader = firstSet[0];
        const membersRows = result.recordsets[1] || [];
        const pendingReqs = result.recordsets[2] || [];

        const clanLevel = clanHeader.Level || 1;
        const clanData = {
            id: clanHeader.Id,
            name: clanHeader.Name,
            tag: clanHeader.Tag,
            emblemUrl: clanHeader.EmblemUrl,
            level: clanLevel,
            exp: clanHeader.Exp || 0,
            nextLevelExp: clanHeader.NextLevelExp || getClanNextLevelExp(clanLevel),
            bonusExpPct: clanLevel, // 1% a 100%
            bonusStarshipsPct: clanLevel, // 1% a 100%
            bonusLuckPct: 0,
            minLevelReq: clanHeader.MinLevelReq || 1,
            noticeMessage: clanHeader.NoticeMessage || '',
            maxMembers: clanHeader.MaxMembers || 30,
            trophies: clanHeader.Trophies || 0,
            createdAt: clanHeader.CreatedAt,
            leaderUserId: clanHeader.LeaderUserId,
            myRole: clanHeader.MyRole,
            myContributedExp: clanHeader.MyContributedExp || 0,
            myJoinedAt: clanHeader.MyJoinedAt,
            onlineMembersCount: clanHeader.OnlineMembers || 0,
            totalMembersCount: clanHeader.TotalMembers || membersRows.length,
            members: membersRows.map(m => ({
                userId: m.UserId,
                username: m.Username,
                role: m.Role,
                level: m.Nivel,
                avatar: m.AvatarActivoId || 'AVA-002',
                countryFlag: m.FlagEmoji || '🌐',
                countryName: m.CountryName || 'Mundial',
                countryIsoCode: m.CountryIsoCode || 'UN',
                contributedExp: m.ContributedExp || 0,
                joinedAt: m.JoinedAt,
                isOnline: Boolean(m.IsOnline),
                lastLoginAt: m.LastLoginAt
            })),
            pendingRequests: pendingReqs.map(r => ({
                requestId: r.RequestId,
                userId: r.UserId,
                username: r.Username,
                level: r.Nivel,
                avatar: r.AvatarActivoId || 'AVA-002',
                countryFlag: r.FlagEmoji || '🌐',
                requestedAt: r.RequestedAt
            }))
        };

        return res.json({
            success: true,
            hasClan: true,
            clan: clanData
        });
    } catch (err) {
        console.error('[API /api/clans/my-clan ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al consultar clan' });
    }
}

/**
 * Crear Clan Oficial (Costo: 50,000 StarShips, Nombre máx 15 alfanumérico, Emblema subido)
 * Mediante dbo.sp_CrearClan
 */
async function createClan(req, res) {
    try {
        const { userId, name, tag, noticeMessage, minLevelReq, emblemBase64 } = req.body;
        const uid = parseInt(userId, 10);

        if (!uid) {
            return res.status(400).json({ success: false, message: 'Usuario no autenticado' });
        }

        // 1. Validar nombre (máx 15 caracteres, alfanumérico)
        const cleanName = (name || '').trim();
        if (!cleanName || cleanName.length < 3 || cleanName.length > 15) {
            return res.status(400).json({ success: false, message: 'El nombre del clan debe tener entre 3 y 15 caracteres' });
        }

        // Solo letras y números
        const alphaRegex = /^[a-zA-Z0-9]+$/;
        if (!alphaRegex.test(cleanName)) {
            return res.status(400).json({ success: false, message: 'El nombre del clan solo puede contener letras y números (sin espacios ni caracteres especiales)' });
        }

        const cleanTag = (tag || '').trim().toUpperCase().slice(0, 5);
        const cleanNotice = (noticeMessage || '').trim().slice(0, 500);
        const cleanMinLvl = Math.max(1, Math.min(500, parseInt(minLevelReq || 1, 10)));

        // 2. Procesar Imagen de Emblema
        let emblemUrl = '/assets/images/clans/default_emblem.png';

        if (req.file) {
            emblemUrl = `/assets/images/clans/${req.file.filename}`;
        } else if (emblemBase64 && emblemBase64.startsWith('data:image')) {
            const matches = emblemBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                const ext = matches[1].split('/')[1] || 'png';
                const filename = `clan_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext === 'jpeg' ? 'jpg' : ext}`;
                const fullPath = path.join(CLANS_IMAGE_DIR, filename);
                fs.writeFileSync(fullPath, Buffer.from(matches[2], 'base64'));
                emblemUrl = `/assets/images/clans/${filename}`;
            }
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('LeaderUserId', sql.Int, uid)
            .input('Name', sql.VarChar(20), cleanName)
            .input('Tag', sql.VarChar(6), cleanTag || null)
            .input('EmblemUrl', sql.NVarChar(300), emblemUrl)
            .input('MinLevelReq', sql.Int, cleanMinLvl)
            .input('NoticeMessage', sql.NVarChar(500), cleanNotice || '¡Bienvenidos al clan oficial!')
            .execute('dbo.sp_CrearClan');

        const out = (result.recordset && result.recordset[0]) || {};

        if (!out.Success) {
            return res.status(400).json({ success: false, message: out.Message || 'No se pudo fundar el clan.' });
        }

        return res.json({
            success: true,
            message: out.Message,
            clanId: out.ClanId,
            remainingStarships: out.RemainingStarships
        });
    } catch (err) {
        console.error('[API /api/clans/create ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error interno al fundar clan: ' + err.message });
    }
}

/**
 * Solicitar ingreso a un clan (Mediante dbo.sp_SolicitarIngresoClan)
 */
async function sendJoinRequest(req, res) {
    try {
        const clanId = parseInt(req.params.id, 10);
        const userId = parseInt(req.body.userId, 10);

        if (!clanId || !userId) {
            return res.status(400).json({ success: false, message: 'Parámetros inválidos' });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('ClanId', sql.Int, clanId)
            .input('UserId', sql.Int, userId)
            .execute('dbo.sp_SolicitarIngresoClan');

        const out = (result.recordset && result.recordset[0]) || {};

        if (!out.Success) {
            return res.status(400).json({ success: false, message: out.Message || 'No se pudo enviar la solicitud.' });
        }

        return res.json({
            success: true,
            message: out.Message
        });
    } catch (err) {
        console.error('[API /api/clans/:id/join-request ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al enviar solicitud: ' + err.message });
    }
}

/**
 * Responder a solicitud de ingreso (Aceptar / Rechazar)
 * Mediante dbo.sp_ResponderSolicitudClan
 */
async function handleJoinRequest(req, res) {
    try {
        const clanId = parseInt(req.params.id, 10);
        const { adminUserId, targetUserId, action } = req.body; // action: 'ACCEPT' o 'REJECT'

        if (!clanId || !adminUserId || !targetUserId || !action) {
            return res.status(400).json({ success: false, message: 'Parámetros incompletos' });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('ClanId', sql.Int, clanId)
            .input('AdminUserId', sql.Int, adminUserId)
            .input('TargetUserId', sql.Int, targetUserId)
            .input('Action', sql.VarChar(10), action.toUpperCase())
            .execute('dbo.sp_ResponderSolicitudClan');

        const out = (result.recordset && result.recordset[0]) || {};

        if (!out.Success) {
            return res.status(400).json({ success: false, message: out.Message || 'Error al procesar solicitud.' });
        }

        return res.json({
            success: true,
            message: out.Message
        });
    } catch (err) {
        console.error('[API /api/clans/:id/handle-request ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al procesar solicitud: ' + err.message });
    }
}

/**
 * Actualizar Configuración y Tablón de Anuncios
 * Mediante dbo.sp_ActualizarConfigClan
 */
async function updateClanConfig(req, res) {
    try {
        const clanId = parseInt(req.params.id, 10);
        const { userId, noticeMessage, minLevelReq, tag } = req.body;

        const pool = await getPool();
        const result = await pool.request()
            .input('ClanId', sql.Int, clanId)
            .input('AdminUserId', sql.Int, parseInt(userId, 10))
            .input('NoticeMessage', sql.NVarChar(500), (noticeMessage !== undefined) ? String(noticeMessage).trim().slice(0, 500) : null)
            .input('MinLevelReq', sql.Int, (minLevelReq !== undefined) ? Math.max(1, Math.min(500, parseInt(minLevelReq, 10))) : null)
            .input('Tag', sql.VarChar(6), (tag !== undefined) ? String(tag).trim().toUpperCase().slice(0, 5) : null)
            .execute('dbo.sp_ActualizarConfigClan');

        const out = (result.recordset && result.recordset[0]) || {};

        if (!out.Success) {
            return res.status(400).json({ success: false, message: out.Message || 'Error al actualizar configuración.' });
        }

        return res.json({ success: true, message: out.Message });
    } catch (err) {
        console.error('[API /api/clans/:id/update-config ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al actualizar clan' });
    }
}

/**
 * Expulsar a un miembro (Líder o Colíder)
 * Mediante dbo.sp_ExpulsarMiembroClan (Aplica penalización 24h)
 */
async function kickMember(req, res) {
    try {
        const clanId = parseInt(req.params.id, 10);
        const { adminUserId, targetUserId } = req.body;

        const pool = await getPool();
        const result = await pool.request()
            .input('ClanId', sql.Int, clanId)
            .input('AdminUserId', sql.Int, parseInt(adminUserId, 10))
            .input('TargetUserId', sql.Int, parseInt(targetUserId, 10))
            .execute('dbo.sp_ExpulsarMiembroClan');

        const out = (result.recordset && result.recordset[0]) || {};

        if (!out.Success) {
            return res.status(400).json({ success: false, message: out.Message || 'Error al expulsar miembro.' });
        }

        return res.json({ success: true, message: out.Message });
    } catch (err) {
        console.error('[API /api/clans/:id/kick ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al expulsar miembro' });
    }
}

/**
 * Promover / Degradar rango (Solo Líder)
 * Mediante dbo.sp_CambiarRolClan
 */
async function changeRole(req, res) {
    try {
        const clanId = parseInt(req.params.id, 10);
        const { leaderUserId, targetUserId, newRole } = req.body; // newRole: 'Colider', 'Miembro', 'Lider'

        const pool = await getPool();
        const result = await pool.request()
            .input('ClanId', sql.Int, clanId)
            .input('LeaderUserId', sql.Int, parseInt(leaderUserId, 10))
            .input('TargetUserId', sql.Int, parseInt(targetUserId, 10))
            .input('NewRole', sql.VarChar(20), newRole)
            .execute('dbo.sp_CambiarRolClan');

        const out = (result.recordset && result.recordset[0]) || {};

        if (!out.Success) {
            return res.status(400).json({ success: false, message: out.Message || 'Error al cambiar rango.' });
        }

        return res.json({ success: true, message: out.Message });
    } catch (err) {
        console.error('[API /api/clans/:id/role ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al cambiar rango' });
    }
}

/**
 * Abandonar clan (Aplica penalización 24h)
 * Mediante dbo.sp_AbandonarClan
 */
async function leaveClan(req, res) {
    try {
        const clanId = parseInt(req.params.id, 10);
        const { userId } = req.body;
        const uid = parseInt(userId, 10);

        if (!clanId || !uid) {
            return res.status(400).json({ success: false, message: 'Parámetros incompletos.' });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('ClanId', sql.Int, clanId)
            .input('UserId', sql.Int, uid)
            .execute('dbo.sp_AbandonarClan');

        const out = (result.recordset && result.recordset[0]) || {};

        if (!out.Success) {
            return res.status(400).json({ success: false, message: out.Message || 'No se pudo abandonar el clan.' });
        }

        return res.json({ success: true, message: out.Message });
    } catch (err) {
        console.error('[API /api/clans/:id/leave ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al abandonar clan' });
    }
}

/**
 * Disolver clan (Solo Líder Fundador)
 * Mediante dbo.sp_DisolverClan
 */
async function disbandClan(req, res) {
    try {
        const clanId = parseInt(req.params.id, 10);
        const { leaderUserId } = req.body;
        const uid = parseInt(leaderUserId, 10);

        if (!clanId || !uid) {
            return res.status(400).json({ success: false, message: 'Parámetros incompletos.' });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('ClanId', sql.Int, clanId)
            .input('LeaderUserId', sql.Int, uid)
            .execute('dbo.sp_DisolverClan');

        const out = (result.recordset && result.recordset[0]) || {};

        if (!out.Success) {
            return res.status(400).json({ success: false, message: out.Message || 'Error al disolver clan.' });
        }

        return res.json({ success: true, message: out.Message });
    } catch (err) {
        console.error('[API /api/clans/:id/disband ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al disolver clan' });
    }
}

module.exports = {
    getClansList,
    getMyClan,
    createClan,
    sendJoinRequest,
    handleJoinRequest,
    updateClanConfig,
    kickMember,
    changeRole,
    leaveClan,
    disbandClan
};
