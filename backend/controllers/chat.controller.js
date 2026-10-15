/**
 * Ani-Dimension: Controlador de Chat Global y Eventos en Vivo
 */

const { getPool, sql } = require('../config/db');
const chatEngine = require('../engine/chat-event-engine');

// Obtener historial de mensajes (Global o Privado) y estado del chat
// SP: dbo.sp_ObtenerHistorialChat
async function getChatHistory(req, res) {
    try {
        const currentUserId = req.query.userId ? parseInt(req.query.userId, 10) : null;
        const targetUsername = req.query.targetUsername ? req.query.targetUsername.trim() : null;
        const pool = await getPool();
        
        const result = await pool.request()
            .input('UserId', sql.Int, currentUserId)
            .input('TargetUsername', sql.NVarChar(50), targetUsername)
            .input('Limit', sql.Int, 100)
            .execute('dbo.sp_ObtenerHistorialChat');

        const messages = (result.recordset || []).reverse();
        const chatState = chatEngine.getChatState();

        return res.json({
            success: true,
            messages,
            chatState
        });
    } catch (err) {
        console.error('[GET CHAT HISTORY ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al consultar historial del chat.' });
    }
}

// Eliminar mensaje de chat (por el autor o Admin)
// SP: dbo.sp_EliminarMensajeChat
async function deleteChatMessage(req, res) {
    try {
        const { messageId } = req.params;
        const { userId, isAdmin } = req.body;

        const pool = await getPool();
        const result = await pool.request()
            .input('MessageId', sql.BigInt, messageId)
            .input('UserId', sql.Int, parseInt(userId, 10))
            .input('IsAdmin', sql.Bit, isAdmin ? 1 : 0)
            .execute('dbo.sp_EliminarMensajeChat');

        const row = result.recordset && result.recordset[0];
        if (!row || !row.Success) {
            return res.status(403).json({ success: false, message: row?.Message || 'No tienes permisos.' });
        }

        // Notificar en tiempo real por sockets
        if (global.io) {
            global.io.emit('CHAT_MESSAGE_DELETED', { messageId: parseInt(messageId, 10) });
        }

        return res.json({ success: true, message: 'Mensaje eliminado exitosamente.' });
    } catch (err) {
        console.error('[DELETE CHAT MESSAGE ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al eliminar mensaje.' });
    }
}

// Limpiar / Vaciar conversación privada
// SP: dbo.sp_LimpiarConversacionPrivada
async function clearConversation(req, res) {
    try {
        const { userId, targetUsername } = req.body;
        const uid = parseInt(userId || 1, 10);
        const target = (targetUsername && targetUsername.trim() !== '' && targetUsername.trim().toUpperCase() !== 'GLOBAL')
            ? targetUsername.trim()
            : null;

        const pool = await getPool();
        await pool.request()
            .input('UserId', sql.Int, uid)
            .input('TargetUsername', sql.NVarChar(50), target)
            .execute('dbo.sp_LimpiarConversacionPrivada');

        if (global.io) {
            if (target) {
                global.io.emit('CHAT_CONVERSATION_CLEARED', { targetUsername: target, userId: uid, isGlobal: false });
            } else {
                global.io.emit('CHAT_CONVERSATION_CLEARED', { isGlobal: true });
            }
        }

        return res.json({ success: true, message: 'Conversación vaciada correctamente.' });
    } catch (err) {
        console.error('[CLEAR CONVERSATION ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al vaciar conversación.' });
    }
}

// Helper reutilizable para obtener lista completa de usuarios y su estado online
async function fetchOnlineUsersData() {
    const onlineMap = new Map();
    
    // 1. Usuarios conectados activamente a WebSockets
    if (global.io && global.io.sockets && global.io.sockets.sockets) {
        for (const [id, s] of global.io.sockets.sockets) {
            if (s.user && s.user.username && s.user.username !== 'Invitado') {
                const isAdm = Boolean(s.user.isAdmin) || (s.user.username.toLowerCase() === 'admin');
                onlineMap.set(s.user.username.toLowerCase(), {
                    id: s.user.id || 0,
                    username: s.user.username,
                    nivel: s.user.level || 1,
                    avatar: s.user.avatar || 'AVA-001',
                    isAdmin: isAdm,
                    isOnline: true
                });
            }
        }
    }

    // 2. Traer usuarios de base de datos usando IsOnline y ActiveSessionToken
    const pool = await getPool();
    const usersDb = await pool.request().query(`
        SELECT TOP 100 
            u.Id, u.Username, u.Nivel, u.AvatarActivoId, u.IsAdmin,
            u.IsOnline, u.ActiveSessionToken, u.LastLoginAt, u.VipUntil,
            (SELECT TOP 1 uv.VipCode FROM dbo.UserVipPasses uv WHERE uv.UsuarioId = u.Id AND (uv.ExpiresAt IS NULL OR uv.ExpiresAt > GETDATE()) ORDER BY uv.ExpiresAt DESC) AS VipCode
        FROM dbo.Usuarios u
        WHERE u.IsActive = 1
        ORDER BY 
            u.IsAdmin DESC,
            u.IsOnline DESC,
            CASE WHEN u.ActiveSessionToken IS NOT NULL THEN 1 ELSE 2 END,
            u.LastLoginAt DESC
    `);

    const list = [];
    const seenUsernames = new Set();

    // Primero los que están activos en socket
    for (const [key, user] of onlineMap.entries()) {
        list.push(user);
        seenUsernames.add(key);
    }

    // Luego los registrados en base de datos
    if (usersDb.recordset) {
        usersDb.recordset.forEach(u => {
            const uKey = (u.Username || '').toLowerCase();
            if (uKey === 'invitado') return;
            const isUserOnline = onlineMap.has(uKey) || Boolean(u.IsOnline);
            const isAdm = Boolean(u.IsAdmin) || (uKey === 'admin');
            const isUserVip = Boolean(u.VipUntil && new Date(u.VipUntil) > new Date());
            const vCode = u.VipCode || (isUserVip ? 'VIP-004' : null);

            if (!seenUsernames.has(uKey)) {
                list.push({
                    id: u.Id,
                    username: u.Username,
                    nivel: u.Nivel || 1,
                    avatar: u.AvatarActivoId || 'AVA-001',
                    isAdmin: isAdm,
                    isVip: isUserVip,
                    vipCode: vCode,
                    vipUntil: u.VipUntil,
                    isOnline: isUserOnline
                });
                seenUsernames.add(uKey);
            } else {
                const existing = list.find(x => x.username.toLowerCase() === uKey);
                if (existing) {
                    existing.isOnline = isUserOnline;
                    existing.isAdmin = isAdm;
                    existing.nivel = u.Nivel || existing.nivel;
                    existing.avatar = u.AvatarActivoId || existing.avatar;
                    existing.isVip = isUserVip;
                    existing.vipCode = vCode;
                    existing.vipUntil = u.VipUntil;
                }
            }
        });
    }

    return list;
}

// Obtener lista de usuarios online y activos (API REST)
async function getOnlineUsers(req, res) {
    try {
        const list = await fetchOnlineUsersData();
        return res.json({ success: true, users: list });
    } catch (err) {
        console.error('[GET ONLINE USERS ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al consultar usuarios online.' });
    }
}

// Consultar perfil completo del jugador usando el Stored Procedure dbo.sp_ObtenerDetallePerfilUsuario
async function getUserProfileDetails(req, res) {
    try {
        const { usernameOrId } = req.params;
        const pool = await getPool();
        const request = pool.request();

        if (!isNaN(usernameOrId) && Number(usernameOrId) > 0) {
            request.input('UserId', sql.Int, parseInt(usernameOrId, 10));
        } else {
            request.input('Username', sql.NVarChar(50), String(usernameOrId).trim());
        }

        const result = await request.execute('dbo.sp_ObtenerDetallePerfilUsuario');

        if (!result.recordset || result.recordset.length === 0 || !result.recordset[0].Success) {
            return res.status(404).json({ success: false, message: result?.recordset?.[0]?.Message || 'Usuario no encontrado.' });
        }

        const u = result.recordset[0];
        
        // 1. Bonificaciones del Avatar Activo
        const avatarExp = parseFloat(u.AvatarExp || 0.0);
        const avatarStar = parseFloat(u.AvatarStar || 0.0);
        const avatarLuck = parseFloat(u.AvatarLuck || 0.0);

        // 2. Bonificaciones VIP (si está activo)
        const isVip = Boolean(u.IsVip);
        const vipExp = isVip ? 100.0 : 0.0;
        const vipStar = isVip ? 100.0 : 0.0;
        const vipLuck = isVip ? 15.0 : 0.0;

        // 3. Medallas / Misiones
        const medalsExp = parseFloat(u.AstBonusExp || 0.0);
        const medalsStar = parseFloat(u.AstBonusStar || 0.0);
        const medalsLuck = parseFloat(u.AstBonusLuck || 0.0);

        // 4. Totales Consolidados
        const totalExp = (avatarExp + vipExp + medalsExp);
        const totalStar = (avatarStar + vipStar + medalsStar);
        const totalLuck = (avatarLuck + vipLuck + medalsLuck);

        const avCode = (u.AvatarActivoId || 'AVA-002').toUpperCase();

        return res.json({
            success: true,
            profile: {
                id: u.Id,
                username: u.Username,
                level: u.Nivel || 1,
                nivel: u.Nivel || 1,
                starships: parseInt(u.Starships || 0, 10),
                exp: u.Experiencia || 0,
                experiencia: u.Experiencia || 0,
                avatar: avCode,
                avatarImage: `/assets/images/avatars/${avCode.toLowerCase()}.png`,
                sleeve: u.FundaActivaId || 'default_sleeve',
                mat: u.MatActivoId || 'default_mat',
                isAdmin: Boolean(u.IsAdmin),
                isVip: isVip,
                vipCode: u.VipCode || (isVip ? 'VIP-004' : null),
                vipUntil: u.VipUntil,
                isOnline: Boolean(u.IsOnline),
                countryIsoCode: u.CountryIsoCode || 'CO',
                countryName: u.CountryName || 'Colombia',
                flagEmoji: u.FlagEmoji || '🇨🇴',
                flagSvgUrl: u.FlagSvgUrl || '',
                clan: {
                    id: u.ClanId || 0,
                    nombre: u.ClanNombre || 'Sin Clan',
                    name: u.ClanNombre || 'Sin Clan',
                    tag: u.ClanTag || '',
                    rol: u.ClanRol || null,
                    emblemUrl: u.ClanEmblemUrl || null
                },
                clanNombre: u.ClanNombre || 'Sin Clan',
                ClanNombre: u.ClanNombre || 'Sin Clan',
                boosts: {
                    totalExp: totalExp,
                    totalStarships: totalStar,
                    totalLuck: totalLuck,
                    avatarExp: avatarExp,
                    avatarStar: avatarStar,
                    avatarLuck: avatarLuck,
                    vipExp: vipExp,
                    vipStar: vipStar,
                    vipLuck: vipLuck
                },
                stats: {
                    npc: {
                        totalDuels: parseInt(u.NpcDuels || 0, 10),
                        wins: parseInt(u.NpcWins || 0, 10),
                        losses: parseInt(u.NpcLosses || 0, 10),
                        winRate: `${u.NpcWinRate || 0}%`
                    },
                    pvp: {
                        totalDuels: parseInt(u.PvpDuels || 0, 10),
                        wins: parseInt(u.PvpWins || 0, 10),
                        losses: parseInt(u.PvpLosses || 0, 10),
                        winRate: `${u.PvpWinRate || 0}%`
                    }
                }
            }
        });
    } catch (err) {
        console.error('[GET USER PROFILE ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al consultar perfil del usuario.' });
    }
}

// Previsualización dinámica enmascarada para "Completar Palabra / Frase"
function previewMaskedPhrase(req, res) {
    const phrase = req.body.phrase || '';
    const masked = chatEngine.generateMaskedPrompt(phrase);
    return res.json({
        success: true,
        phrase,
        maskedPrompt: masked
    });
}

// Lanzar evento en vivo con cuenta regresiva
async function launchEvent(req, res) {
    try {
        const { eventType, questionOrPrompt, correctAnswer, prizeText, countdownSeconds, launchedBy } = req.body;
        if (!correctAnswer || !prizeText) {
            return res.status(400).json({ success: false, message: 'La respuesta correcta y el premio son obligatorios.' });
        }

        const event = await chatEngine.launchLiveEvent({
            eventType,
            questionOrPrompt: questionOrPrompt || (eventType === 'WORD_COMPLETION' ? '¡Completa la palabra o frase oculta!' : '¡Responde a la siguiente pregunta!'),
            correctAnswer,
            prizeText,
            countdownSeconds: countdownSeconds || 5,
            launchedBy: launchedBy || 'Admin'
        });

        return res.json({
            success: true,
            message: `Evento '${eventType}' iniciado con cuenta regresiva.`,
            event
        });
    } catch (err) {
        console.error('[LAUNCH EVENT ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al iniciar evento en vivo.' });
    }
}

// Cancelar evento activo
async function cancelEvent(req, res) {
    try {
        const { byUser } = req.body;
        await chatEngine.cancelActiveEvent(byUser || 'Admin');
        return res.json({ success: true, message: 'Evento cancelado con éxito.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Error al cancelar evento.' });
    }
}

// Bloquear / Desbloquear chat general
async function toggleChatMute(req, res) {
    try {
        const { isMuted, byUser } = req.body;
        const newState = await chatEngine.setChatMutedState(isMuted, byUser || 'Admin');
        return res.json({
            success: true,
            isMuted: newState,
            message: newState ? 'Chat bloqueado exclusivamente para administradores.' : 'Chat general desbloqueado para todos.'
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Error al modificar estado del chat.' });
    }
}

// Fijar / Desfijar mensaje destacado
async function setPinnedMessage(req, res) {
    try {
        const { message, color, byUser } = req.body;
        const result = await chatEngine.setPinnedMessage(message, color, byUser || 'Admin');
        return res.json({
            success: true,
            message: message ? 'Mensaje fijado en el chat.' : 'Mensaje fijado eliminado.',
            pinned: result
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Error al fijar mensaje.' });
    }
}

// Historial de eventos y rondas con estado de premios
async function getEventsHistory(req, res) {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT 
                Id, EventType, QuestionOrPrompt, MaskedPrompt, CorrectAnswer, 
                PrizeText, LaunchCountdownSeconds, Status, WinnerUserId, 
                WinnerUsername, WinnerMessage, PrizeStatus, DeliveredAt, CreatedAt, CompletedAt
            FROM dbo.ChatEvents
            ORDER BY CreatedAt DESC
        `);

        return res.json({
            success: true,
            events: result.recordset
        });
    } catch (err) {
        console.error('[GET EVENTS HISTORY ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al obtener historial de eventos.' });
    }
}

// Cambiar estado de entrega del premio (PENDING <-> DELIVERED)
async function togglePrizeDelivery(req, res) {
    try {
        const { eventId, prizeStatus } = req.body;
        if (!eventId) return res.status(400).json({ success: false, message: 'ID de evento requerido.' });

        const newStatus = (prizeStatus === 'DELIVERED') ? 'DELIVERED' : 'PENDING';
        const pool = await getPool();
        await pool.request()
            .input('eid', sql.Int, eventId)
            .input('st', sql.VarChar(30), newStatus)
            .query(`
                UPDATE dbo.ChatEvents 
                SET PrizeStatus = @st,
                    DeliveredAt = CASE WHEN @st = 'DELIVERED' THEN GETDATE() ELSE NULL END
                WHERE Id = @eid
            `);

        return res.json({
            success: true,
            eventId,
            prizeStatus: newStatus,
            message: `Estado de premio actualizado a: ${newStatus}`
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Error al actualizar entrega de premio.' });
    }
}

module.exports = {
    getChatHistory,
    getUserProfileDetails,
    previewMaskedPhrase,
    launchEvent,
    cancelEvent,
    toggleChatMute,
    setPinnedMessage,
    getEventsHistory,
    togglePrizeDelivery,
    deleteChatMessage,
    clearConversation,
    getOnlineUsers
};
