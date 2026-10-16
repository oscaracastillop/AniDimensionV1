/**
 * Ani-Dimension: WebSockets Handler para Duelos OCG, Chat y Matchmaking
 */
const { getPool, sql } = require('../config/db');
const { fetchCardData } = require('../data/cards.data');
const {
    duelRooms,
    roomChainTimers,
    roomChainCallbacks,
    getIo,
    emitDuelLog,
    createInitialDuelState,
    sendCardToGraveyard,
    sendCardToBanished,
    enrichDuelStateForBroadcast,
    processDuelGameOver,
    setOnDuelFinished
} = require('../engine/duel-state');

const {
    resolveActiveChain,
    promptChainWindow,
    setNpcTurnExecutor
} = require('../engine/ocg-engine');

const {
    executeNpcTurn,
    finalizeTurnHandoffToRival,
    isNpcOpponent
} = require('../engine/npc-ai');

const {
    handleDuelAction
} = require('../engine/duel-actions');

const { progressionService } = require('../engine/progression-service');
const duelBridge = require('../services/duel-engine-bridge');

// Conectar ejecutor de turnos de IA en el motor OCG
setNpcTurnExecutor(executeNpcTurn);

let isChatMuted = false;

// Almacén de Salas PvP, Temporizadores de Turno (120s) y Temporizadores de Reconexión (35s)
const pvpRooms = new Map();
const duelTurnTimers = new Map();
const pendingForfeitTimers = new Map();
const TURN_TIME_LIMIT_SECONDS = 120;
const RECONNECT_GRACE_PERIOD_MS = 35000;

/**
 * Generador de número secuencial de sala (1, 2, 3... N).
 * Reutiliza siempre el menor número disponible cuando una sala se cierra.
 */
function getNextAvailableRoomNumber() {
    const occupiedNumbers = new Set();
    for (const room of pvpRooms.values()) {
        if (room.roomNumber && typeof room.roomNumber === 'number') {
            occupiedNumbers.add(room.roomNumber);
        }
    }
    let num = 1;
    while (occupiedNumbers.has(num)) {
        num++;
    }
    return num;
}

function cancelPendingForfeit(roomId, username) {
    if (!roomId || !username) return;
    const key = `${roomId}:${username.toLowerCase()}`;
    if (pendingForfeitTimers.has(key)) {
        clearTimeout(pendingForfeitTimers.get(key));
        pendingForfeitTimers.delete(key);
        console.log(`[PVP RECONNECT] Temporizador de abandono cancelado para ${username} en sala ${roomId}`);
    }
}

function hasActiveSocketForUserInRoom(io, roomId, username) {
    if (!io || !roomId || !username) return false;
    const roomSockets = io.sockets.adapter.rooms.get(roomId);
    if (!roomSockets) return false;
    for (const sId of roomSockets) {
        const s = io.sockets.sockets.get(sId);
        if (s && s.user && s.user.username && s.user.username.toLowerCase() === username.toLowerCase()) {
            return true;
        }
    }
    return false;
}

const { pvpBonusService } = require('../engine/pvp-bonus-service');

function getPvpRoomListSummary() {
    const list = [];
    const activeBonus = pvpBonusService.getActiveBonusSync();

    pvpRooms.forEach((room, roomId) => {
        const isHostAdmin = Boolean(room.host && (room.host.isAdmin || (room.host.username && room.host.username.toLowerCase() === 'admin')));
        const isGuestAdmin = Boolean(room.guest && (room.guest.isAdmin || (room.guest.username && room.guest.username.toLowerCase() === 'admin')));
        const hasAdmin = isHostAdmin || isGuestAdmin;

        list.push({
            id: roomId,
            roomNumber: room.roomNumber || 1,
            name: room.name,
            hasAdmin: hasAdmin,
            hasBonus: Boolean(activeBonus && activeBonus.isActive),
            bonusInfo: activeBonus,
            host: {
                username: room.host.username,
                level: room.host.level || 1,
                isAdmin: isHostAdmin,
                avatar: room.host.avatar || 'AVA-001',
                sleeve: room.host.sleeve || 'default_sleeve'
            },
            guest: room.guest ? {
                username: room.guest.username,
                level: room.guest.level || 1,
                isAdmin: isGuestAdmin,
                avatar: room.guest.avatar || 'AVA-002',
                sleeve: room.guest.sleeve || 'default_sleeve'
            } : null,
            minLevel: room.minLevel || 1,
            maxLevel: room.maxLevel || 999,
            hasPassword: Boolean(room.password && room.password.length > 0),
            status: room.status, // 'WAITING', 'READY_CHECK', 'DUELING'
            createdAt: room.createdAt
        });
    });

    // Ordenar de menor a mayor número de sala (#1, #2, #3...)
    list.sort((a, b) => (a.roomNumber || 0) - (b.roomNumber || 0));

    return { rooms: list, activeBonus: activeBonus };
}

function startDuelTurnTimer(roomId, io) {
    clearDuelTurnTimer(roomId);
    let timeRemaining = TURN_TIME_LIMIT_SECONDS;

    const duelState = duelRooms.get(roomId);
    if (!duelState || duelState.isGameOver) return;
    duelState._timerRemaining = timeRemaining;

    const activeIo = io || getIo();

    // Notificar inicio de temporizador
    if (activeIo) {
        activeIo.to(roomId).emit('PVP_TIMER_TICK', {
            roomId,
            turnPlayer: duelState.turnPlayer,
            timeRemaining,
            totalTime: TURN_TIME_LIMIT_SECONDS
        });
    }

    const intervalId = setInterval(() => {
        const state = duelRooms.get(roomId);
        if (!state || state.isGameOver) {
            clearDuelTurnTimer(roomId);
            return;
        }

        timeRemaining--;
        state._timerRemaining = timeRemaining;

        const currentIo = activeIo || getIo();
        if (currentIo) {
            currentIo.to(roomId).emit('PVP_TIMER_TICK', {
                roomId,
                turnPlayer: state.turnPlayer,
                timeRemaining,
                totalTime: TURN_TIME_LIMIT_SECONDS
            });
        }

        if (timeRemaining <= 0) {
            clearDuelTurnTimer(roomId);
            emitDuelLog(roomId, `⏰ ¡Tiempo agotado (2 minutos)! El turno salta automáticamente al rival.`, 'phase');
            finalizeTurnHandoffToRival(roomId);
        }
    }, 1000);

    duelTurnTimers.set(roomId, intervalId);
}

function clearDuelTurnTimer(roomId) {
    if (duelTurnTimers.has(roomId)) {
        clearInterval(duelTurnTimers.get(roomId));
        duelTurnTimers.delete(roomId);
    }
}

async function broadcastOnlineUsersUpdate(io) {
    try {
        const pool = await getPool();
        if (!pool) return;

        const onlineMap = new Map();
        if (io && io.sockets && io.sockets.sockets) {
            for (const [id, s] of io.sockets.sockets) {
                if (s.user && s.user.username && s.user.username !== 'Invitado') {
                    onlineMap.set(s.user.username.toLowerCase(), {
                        id: s.user.id || 0,
                        username: s.user.username,
                        nivel: s.user.level || 1,
                        avatar: s.user.avatar || 'AVA-001',
                        isOnline: true
                    });
                }
            }
        }

        const usersDb = await pool.request().query(`
            SELECT TOP 100 
                u.Id, u.Username, u.Nivel, u.AvatarActivoId, u.IsAdmin,
                u.IsOnline, u.ActiveSessionToken, u.LastLoginAt
            FROM dbo.Usuarios u
            WHERE u.IsActive = 1
            ORDER BY 
                u.IsOnline DESC,
                CASE WHEN u.ActiveSessionToken IS NOT NULL THEN 1 ELSE 2 END,
                u.LastLoginAt DESC
        `);

        const list = [];
        const seen = new Set();

        for (const [key, user] of onlineMap.entries()) {
            list.push(user);
            seen.add(key);
        }

        if (usersDb.recordset) {
            usersDb.recordset.forEach(u => {
                const uKey = (u.Username || '').toLowerCase();
                if (uKey === 'invitado') return;
                const isUserOnline = onlineMap.has(uKey) || Boolean(u.IsOnline);

                if (!seen.has(uKey)) {
                    list.push({
                        id: u.Id,
                        username: u.Username,
                        nivel: u.Nivel || 1,
                        avatar: u.AvatarActivoId || 'AVA-001',
                        isOnline: isUserOnline
                    });
                    seen.add(uKey);
                } else {
                    const existing = list.find(x => x.username.toLowerCase() === uKey);
                    if (existing) {
                        existing.isOnline = isUserOnline;
                        existing.nivel = u.Nivel || existing.nivel;
                        existing.avatar = u.AvatarActivoId || existing.avatar;
                    }
                }
            });
        }

        io.emit('ONLINE_USERS_UPDATE', list);
    } catch (err) {
        console.warn('[ONLINE_USERS_UPDATE BROADCAST ERROR]', err.message);
    }
}

function initDuelSockets(io) {
    global.restartDuelTimer = (rId) => startDuelTurnTimer(rId, io);

    setOnDuelFinished((roomId) => {
        try { duelBridge.endDuel(roomId); } catch(e) {}
        if (pvpRooms.has(roomId)) {
            const roomNum = pvpRooms.get(roomId).roomNumber || '';
            console.log(`[PVP] Duelo finalizado. Sala #${roomNum} (${roomId}) liberada.`);
            pvpRooms.delete(roomId);
            io.emit('PVP_ROOM_LIST', getPvpRoomListSummary());
        }
    });

    io.on('connection', (socket) => {
        socket.user = { id: 0, username: 'Invitado', level: 1, isAdmin: false, sleeve: 'default_sleeve', mat: 'default_mat', avatar: 'AVA-001' };

        // 1. Identificación del usuario en socket
        socket.on('USER_IDENTIFY', async (data) => {
            if (!data || !data.username) return;
            const cleanUsername = data.username.trim();
            socket.user.username = cleanUsername;
            try {
                const pool = await getPool();
                if (pool) {
                    const userQuery = await pool.request()
                        .input('Username', sql.VarChar(50), cleanUsername)
                        .query(`
                            UPDATE dbo.Usuarios 
                            SET IsOnline = 1, LastLoginAt = GETDATE() 
                            WHERE LOWER(Username) = LOWER(@Username);

                            SELECT Id, Username, Nivel, IsAdmin, FundaActivaId, AvatarActivoId 
                            FROM dbo.Usuarios 
                            WHERE LOWER(Username) = LOWER(@Username);
                        `);

                    if (userQuery && userQuery.recordset.length > 0) {
                        const dbUser = userQuery.recordset[0];
                        socket.user = {
                            id: dbUser.Id,
                            username: dbUser.Username,
                            level: dbUser.Nivel || 1,
                            isAdmin: Boolean(dbUser.IsAdmin) || dbUser.Username.toLowerCase() === 'admin',
                            sleeve: dbUser.FundaActivaId || 'default_sleeve',
                            mat: (data && data.mat) || 'default_mat',
                            avatar: dbUser.AvatarActivoId || 'AVA-001'
                        };
                    }
                }
                broadcastOnlineUsersUpdate(io);
            } catch (err) {
                console.error('[WEBSOCKET AUTH ERROR]', err.message);
            }
        });

        // 2. Desconexión de socket (actualiza IsOnline en DB si no quedan más conexiones)
        socket.on('disconnect', async () => {
            const disconnectedUsername = socket.user && socket.user.username;
            if (disconnectedUsername && disconnectedUsername !== 'Invitado') {
                let hasOtherSockets = false;
                if (io && io.sockets && io.sockets.sockets) {
                    for (const [id, s] of io.sockets.sockets) {
                        if (s !== socket && s.user && (s.user.username || '').toLowerCase() === disconnectedUsername.toLowerCase()) {
                            hasOtherSockets = true;
                            break;
                        }
                    }
                }

                if (!hasOtherSockets) {
                    try {
                        const pool = await getPool();
                        if (pool) {
                            await pool.request()
                                .input('Username', sql.VarChar(50), disconnectedUsername)
                                .query('UPDATE dbo.Usuarios SET IsOnline = 0 WHERE LOWER(Username) = LOWER(@Username)');
                        }
                    } catch (e) {}
                }
                broadcastOnlineUsersUpdate(io);
            }
        });

        // =====================================================================
        // MÓDULO PVP: LOBBY, SALAS DE DUELO Y EMPAREJAMIENTO
        // =====================================================================

        // A. Obtener listado de salas activas
        socket.on('PVP_GET_ROOMS', () => {
            socket.emit('PVP_ROOM_LIST', getPvpRoomListSummary());
        });

        // B. Crear Sala de Duelo (Ventana Flotante Horizontal)
        socket.on('PVP_CREATE_ROOM', async (data) => {
            if (!data) return;

            // 1. Cargar usuario real de base de datos si es necesario
            const reqUsername = (data.username || (socket.user && socket.user.username) || '').trim();
            if (reqUsername && reqUsername !== 'Invitado' && (!socket.user || socket.user.id === 0 || socket.user.username === 'Invitado')) {
                try {
                    const pool = await getPool();
                    if (pool) {
                        const userQuery = await pool.request()
                            .input('Username', sql.VarChar(50), reqUsername)
                            .query('SELECT Id, Username, Nivel, IsAdmin, FundaActivaId, AvatarActivoId FROM dbo.Usuarios WHERE Username = @Username');

                        if (userQuery && userQuery.recordset.length > 0) {
                            const dbUser = userQuery.recordset[0];
                            socket.user = {
                                id: dbUser.Id,
                                username: dbUser.Username,
                                level: dbUser.Nivel || 1,
                                isAdmin: Boolean(dbUser.IsAdmin) || dbUser.Username.toLowerCase() === 'admin',
                                sleeve: dbUser.FundaActivaId || 'default_sleeve',
                                mat: (data && data.player_mat) || 'default_mat',
                                avatar: dbUser.AvatarActivoId || 'AVA-001'
                            };
                        }
                    }
                } catch (err) {
                    console.error('[PVP_CREATE_ROOM USER QUERY ERROR]', err.message);
                }
            }

            // 2. RESTRICCIÓN: Solo 1 sala activa creada por jugador
            // Eliminar cualquier sala previa en estado WAITING o READY_CHECK que pertenezca a este socket o usuario
            const currentUserId = socket.user.id;
            const currentUsername = socket.user.username;
            
            for (const [existingId, existingRoom] of pvpRooms.entries()) {
                if (existingRoom.status === 'WAITING' || existingRoom.status === 'READY_CHECK') {
                    if (existingRoom.host.socketId === socket.id || 
                       (currentUserId > 0 && existingRoom.host.id === currentUserId) ||
                       (currentUsername && currentUsername !== 'Invitado' && existingRoom.host.username === currentUsername)) {
                        console.log(`[PVP] Limpiando sala previa ${existingId} del usuario ${currentUsername}`);
                        pvpRooms.delete(existingId);
                    }
                }
            }

            const roomName = (data.name || `Sala de ${socket.user.username}`).trim().slice(0, 30);
            const minLevel = parseInt(data.min_level, 10) || 1;
            const maxLevel = parseInt(data.max_level, 10) || 999;
            const password = (data.password || '').trim();
            const hostDeck = data.player_deck || null;
            const roomId = `PVP_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            const userLevel = socket.user.level || 1;
            const isHostAdmin = Boolean(socket.user.isAdmin || (socket.user.username && socket.user.username.toLowerCase() === 'admin'));

            const requiredStarships = progressionService.getBaseStarshipsForLevel(minLevel);
            // Validar nivel y saldo de Starships mediante Stored Procedure
            if (socket.user && socket.user.username && socket.user.username !== 'Invitado') {
                try {
                    const pool = await getPool();
                    const validRes = await pool.request()
                        .input('UserId', sql.Int, socket.user.id || null)
                        .input('Username', sql.NVarChar(50), socket.user.username)
                        .input('MinLevel', sql.Int, minLevel)
                        .input('MaxLevel', sql.Int, maxLevel)
                        .input('RequiredStarships', sql.BigInt, requiredStarships)
                        .execute('dbo.sp_ValidarRequisitosDuelo');

                    const check = validRes.recordset && validRes.recordset[0];
                    if (check && !check.IsValid) {
                        return socket.emit('PVP_ERROR', { message: check.Message });
                    }
                } catch(e) {
                    console.error('[SP_VALIDAR_REQUISITOS_DUELO HOST ERROR]', e.message);
                }
            }

            const activeBonus = pvpBonusService.getActiveBonusSync();
            const roomNumber = getNextAvailableRoomNumber();

            const newRoom = {
                id: roomId,
                roomNumber: roomNumber,
                name: roomName,
                minLevel: minLevel,
                maxLevel: maxLevel,
                password: password,
                status: 'WAITING',
                hasBonus: Boolean(activeBonus && activeBonus.isActive),
                bonusInfo: activeBonus,
                createdAt: Date.now(),
                host: {
                    socketId: socket.id,
                    id: socket.user.id,
                    username: socket.user.username,
                    level: userLevel,
                    isAdmin: isHostAdmin,
                    avatar: socket.user.avatar || (data && data.avatar) || 'AVA-001',
                    sleeve: socket.user.sleeve,
                    mat: socket.user.mat || (data && data.player_mat) || 'default_mat',
                    deck: hostDeck,
                    ready: true
                },
                guest: null
            };

            pvpRooms.set(roomId, newRoom);
            socket.join(roomId);
            socket.currentPvpRoomId = roomId;

            console.log(`[PVP] Sala #${roomNumber} creada: ${roomId} por ${socket.user.username} (Nv. ${userLevel}) [Admin: ${isHostAdmin}] (Rango Nivel: ${minLevel}-${maxLevel})`);
            socket.emit('PVP_ROOM_CREATED', newRoom);
            io.emit('PVP_ROOM_LIST', getPvpRoomListSummary());
        });

        // C. Cancelar o Salir de la Sala de Espera
        socket.on('PVP_LEAVE_ROOM', (data) => {
            const roomId = (data && data.room_id) || socket.currentPvpRoomId;
            if (!roomId || !pvpRooms.has(roomId)) return;

            const room = pvpRooms.get(roomId);

            if (room.host.socketId === socket.id || room.host.username === socket.user.username) {
                // Si el anfitrión sale, la sala se cancela y se elimina
                console.log(`[PVP] Anfitrión ${socket.user.username} canceló la sala ${roomId}.`);
                io.to(roomId).emit('PVP_ROOM_CANCELLED', { message: 'El anfitrión ha cancelado la sala de espera.' });
                pvpRooms.delete(roomId);
            } else if (room.guest && (room.guest.socketId === socket.id || room.guest.username === socket.user.username)) {
                // Si el invitado sale, la sala vuelve a estado WAITING
                console.log(`[PVP] Invitado ${socket.user.username} abandonó la sala ${roomId}.`);
                room.guest = null;
                room.status = 'WAITING';
                io.to(roomId).emit('PVP_GUEST_LEFT', { message: 'El rival abandonó la sala.' });
            }

            socket.leave(roomId);
            socket.currentPvpRoomId = null;
            io.emit('PVP_ROOM_LIST', getPvpRoomListSummary());
        });

        // D. Ingresar a una Sala de Duelo
        socket.on('PVP_JOIN_ROOM', async (data) => {
            if (!data || !data.room_id) return;
            const roomId = data.room_id;
            const room = pvpRooms.get(roomId);

            if (!room) {
                return socket.emit('PVP_ERROR', { message: 'La sala de duelo seleccionada ya no existe.' });
            }

            if (room.status !== 'WAITING' || room.guest) {
                return socket.emit('PVP_ERROR', { message: 'Esta sala ya está completa o el duelo está en curso.' });
            }

            // 1. Cargar usuario real de base de datos si es necesario
            const reqUsername = (data.username || (socket.user && socket.user.username) || '').trim();
            if (reqUsername && reqUsername !== 'Invitado' && (!socket.user || socket.user.id === 0 || socket.user.username === 'Invitado')) {
                try {
                    const pool = await getPool();
                    if (pool) {
                        const userQuery = await pool.request()
                            .input('Username', sql.VarChar(50), reqUsername)
                            .query('SELECT Id, Username, Nivel, IsAdmin, FundaActivaId, AvatarActivoId FROM dbo.Usuarios WHERE Username = @Username');

                        if (userQuery && userQuery.recordset.length > 0) {
                            const dbUser = userQuery.recordset[0];
                            socket.user = {
                                id: dbUser.Id,
                                username: dbUser.Username,
                                level: dbUser.Nivel || 1,
                                isAdmin: Boolean(dbUser.IsAdmin) || dbUser.Username.toLowerCase() === 'admin',
                                sleeve: dbUser.FundaActivaId || 'default_sleeve',
                                mat: (data && data.player_mat) || 'kaiba_mat',
                                avatar: dbUser.AvatarActivoId || 'AVA-002'
                            };
                        }
                    }
                } catch (err) {
                    console.error('[PVP_JOIN_ROOM USER QUERY ERROR]', err.message);
                }
            }

            const guestLevel = (socket.user && socket.user.level) ? socket.user.level : 1;
            const isGuestAdmin = Boolean(socket.user && (socket.user.isAdmin || (socket.user.username && socket.user.username.toLowerCase() === 'admin')));

            // Validar nivel y saldo de Starships del retador mediante Stored Procedure
            const requiredStarships = progressionService.getBaseStarshipsForLevel(room.minLevel);
            if (socket.user && socket.user.username && socket.user.username !== 'Invitado') {
                try {
                    const pool = await getPool();
                    const validRes = await pool.request()
                        .input('UserId', sql.Int, socket.user.id || null)
                        .input('Username', sql.NVarChar(50), socket.user.username)
                        .input('MinLevel', sql.Int, room.minLevel)
                        .input('MaxLevel', sql.Int, room.maxLevel)
                        .input('RequiredStarships', sql.BigInt, requiredStarships)
                        .execute('dbo.sp_ValidarRequisitosDuelo');

                    const check = validRes.recordset && validRes.recordset[0];
                    if (check && !check.IsValid) {
                        return socket.emit('PVP_ERROR', { message: check.Message });
                    }
                } catch(e) {
                    console.error('[SP_VALIDAR_REQUISITOS_DUELO GUEST ERROR]', e.message);
                }
            }

            if (room.password && room.password.length > 0) {
                if (data.password !== room.password) {
                    return socket.emit('PVP_ERROR', { message: '🔒 Contraseña de sala incorrecta.' });
                }
            }

            room.guest = {
                socketId: socket.id,
                id: socket.user ? socket.user.id : null,
                username: socket.user ? socket.user.username : (data.username || 'Rival'),
                level: guestLevel,
                isAdmin: isGuestAdmin,
                avatar: (socket.user && socket.user.avatar) || (data && data.avatar) || 'AVA-002',
                sleeve: (socket.user && socket.user.sleeve) || 'default_sleeve',
                mat: (socket.user && socket.user.mat) || (data && data.player_mat) || 'kaiba_mat',
                deck: data.player_deck || null,
                ready: false
            };
            room.status = 'READY_CHECK';

            socket.join(roomId);
            socket.currentPvpRoomId = roomId;

            console.log(`[PVP] ${socket.user ? socket.user.username : 'Invitado'} ingresó a la sala ${roomId}. Esperando confirmación de ambos duelistas...`);
            io.to(roomId).emit('PVP_ROOM_JOINED', { room: room });
            io.emit('PVP_ROOM_LIST', getPvpRoomListSummary());
        });

        // E. Confirmación de "Listo / Aceptar Duelo"
        socket.on('PVP_SET_READY', (data) => {
            const roomId = (data && data.room_id) || socket.currentPvpRoomId;
            if (!roomId || !pvpRooms.has(roomId)) return;
            const room = pvpRooms.get(roomId);

            if (room.host.username === socket.user.username) {
                room.host.ready = Boolean(data.ready !== undefined ? data.ready : true);
            } else if (room.guest && room.guest.username === socket.user.username) {
                room.guest.ready = Boolean(data.ready !== undefined ? data.ready : true);
            }

            io.to(roomId).emit('PVP_READY_STATUS', {
                hostReady: room.host.ready,
                guestReady: room.guest ? room.guest.ready : false
            });

            // Si ambos aceptaron, iniciar cuenta regresiva y cargar el duelo sincronizadamente
            if (room.host.ready && room.guest && room.guest.ready) {
                room.status = 'DUELING';
                io.emit('PVP_ROOM_LIST', getPvpRoomListSummary());

                console.log(`[PVP] ¡Ambos jugadores aceptaron el duelo en ${roomId}! Iniciando duelo reglamentario sincronizado...`);

                io.to(roomId).emit('PVP_START_COUNTDOWN', { seconds: 3 });

                setTimeout(() => {
                    // Inicializar estado oficial OCG para 2 jugadores reales
                    const player1Name = room.host.username;
                    const player2Name = room.guest.username;
                    const firstPlayer = Math.random() < 0.5 ? 'player1' : 'player2';

                    const duelState = createInitialDuelState(
                        roomId, 
                        player1Name, 
                        player2Name, 
                        room.host.sleeve, 
                        firstPlayer, 
                        room.host.deck,
                        room.guest.deck,
                        room.guest.sleeve,
                        room.host.mat || 'default_mat',
                        room.guest.mat || 'kaiba_mat'
                    );

                    duelState.isNpcDuel = false;
                    duelState.mode = 'PVP';

                    duelRooms.set(roomId, duelState);
                    enrichDuelStateForBroadcast(duelState);

                    // Registrar e inicializar en el Árbitro Oficial Project Ignis (puerto 7001) para PvP
                    try {
                        const p0DeckCodes = (room.host.deck && room.host.deck.mainDeck) ? room.host.deck.mainDeck : [];
                        const p1DeckCodes = (room.guest.deck && room.guest.deck.mainDeck) ? room.guest.deck.mainDeck : [];
                        duelBridge.createDuel({
                            duelId: roomId,
                            player0Deck: p0DeckCodes,
                            player1Deck: p1DeckCodes,
                            lp: 8000,
                            isNpc: false
                        }).then(officialRes => {
                            console.log(`[PROJECT IGNIS ARBITRO PVP] Sala ${roomId} sincronizada en el motor oficial.`);
                            duelState.officialIgnisSession = {
                                active: true,
                                duelId: roomId,
                                initialEvents: officialRes.events
                            };
                            duelBridge.syncStateFromIgnis(duelState, officialRes);
                            enrichDuelStateForBroadcast(duelState);
                            io.to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                            if (officialRes.pendingPrompt) {
                                io.to(roomId).emit('DUEL_PROMPT', officialRes.pendingPrompt);
                            }
                        }).catch(err => {
                            console.warn(`[PROJECT IGNIS ARBITRO NOTICE PVP] Fallback local: ${err.message}`);
                        });
                    } catch (bridgeErr) {
                        console.warn('[PROJECT IGNIS ARBITRO NOTICE PVP]', bridgeErr.message);
                    }

                    io.to(roomId).emit('PVP_DUEL_START_NOW', {
                        roomId: roomId,
                        player1: player1Name,
                        player2: player2Name,
                        firstPlayer: firstPlayer
                    });

                    io.to(roomId).emit('DUEL_STATE_UPDATE', duelState);

                    // Iniciar el temporizador reglamentario de 2 minutos (120s)
                    startDuelTurnTimer(roomId, io);
                }, 3200);
            }
        });

        // F. Conexión de cliente a la sala PvP activa (Jugador o Espectador)
        socket.on('PVP_CONNECT_DUEL', (data) => {
            const roomId = data && data.room_id;
            if (!roomId) return;
            socket.join(roomId);
            socket.currentPvpRoomId = roomId;
            socket.currentDuelRoomId = roomId;
            if (data.username) socket.user.username = data.username.trim();

            const duelState = duelRooms.get(roomId);
            const isSpectatorReq = Boolean(data && data.isSpectator);
            const isP1 = duelState && duelState.player1 && duelState.player1.username && socket.user.username && duelState.player1.username.toLowerCase() === socket.user.username.toLowerCase();
            const isP2 = duelState && duelState.player2 && duelState.player2.username && socket.user.username && duelState.player2.username.toLowerCase() === socket.user.username.toLowerCase();
            const isActualSpectator = isSpectatorReq || (!isP1 && !isP2 && Boolean(duelState));

            socket.isSpectator = isActualSpectator;

            if (!isActualSpectator) {
                cancelPendingForfeit(roomId, socket.user.username);
            }

            if (duelState) {
                if (!duelState.spectators) duelState.spectators = new Set();
                if (isActualSpectator) {
                    duelState.spectators.add(socket.id);
                    emitDuelLog(roomId, `👁️ ${socket.user.username} ha entrado como espectador.`, 'system');
                }

                enrichDuelStateForBroadcast(duelState);
                socket.emit('DUEL_STATE_UPDATE', duelState);

                const timeRemaining = duelState._timerRemaining !== undefined ? duelState._timerRemaining : 120;
                socket.emit('PVP_TIMER_TICK', {
                    roomId,
                    turnPlayer: duelState.turnPlayer,
                    timeRemaining,
                    totalTime: TURN_TIME_LIMIT_SECONDS
                });

                io.to(roomId).emit('PVP_SPECTATOR_COUNT', {
                    roomId,
                    count: duelState.spectators ? duelState.spectators.size : 0
                });
            }
        });

        // G. Unirse a una Sala Oficial de Partida de Torneo
        socket.on('TOURNAMENT_JOIN_MATCH_ROOM', async (data) => {
            if (!data || !data.matchId || !data.torneoId) return;
            const matchId = parseInt(data.matchId, 10);
            const torneoId = parseInt(data.torneoId, 10);
            const roomId = data.roomId || `TOURNAMENT_${torneoId}_M${matchId}`;

            socket.join(roomId);
            socket.currentPvpRoomId = roomId;
            socket.currentDuelRoomId = roomId;

            try {
                const pool = await getPool();
                const mRes = await pool.request()
                    .input('mId', sql.Int, matchId)
                    .query('SELECT * FROM dbo.TorneoPartidas WHERE Id = @mId');

                if (mRes.recordset.length === 0) {
                    return socket.emit('PVP_ERROR', { message: 'Partida de torneo no encontrada.' });
                }

                const match = mRes.recordset[0];
                const myName = (socket.user && socket.user.username) ? socket.user.username : (data.username || 'Duelista');
                const isP1 = match.Player1Username && match.Player1Username.toLowerCase() === myName.toLowerCase();
                const isP2 = match.Player2Username && match.Player2Username.toLowerCase() === myName.toLowerCase();

                if (!isP1 && !isP2) {
                    // Es un espectador que entra a ver la partida
                    socket.isSpectator = true;
                    const duelState = duelRooms.get(roomId);
                    if (duelState) {
                        if (!duelState.spectators) duelState.spectators = new Set();
                        duelState.spectators.add(socket.id);
                        enrichDuelStateForBroadcast(duelState);
                        socket.emit('DUEL_STATE_UPDATE', duelState);
                        io.to(roomId).emit('PVP_SPECTATOR_COUNT', { roomId, count: duelState.spectators.size });
                    }
                    return;
                }

                // Es uno de los jugadores
                let tRoom = pvpRooms.get(roomId);
                if (!tRoom) {
                    tRoom = {
                        id: roomId,
                        name: `🏆 ${match.RondaNombre} #${match.NumeroMatch}`,
                        isTournament: true,
                        torneoId: torneoId,
                        matchId: matchId,
                        host: {
                            socketId: socket.id,
                            id: socket.user.id,
                            username: myName,
                            level: socket.user.level || 1,
                            avatar: socket.user.avatar || 'AVA-001',
                            sleeve: socket.user.sleeve || 'default_sleeve',
                            mat: socket.user.mat || 'default_mat',
                            deck: data.player_deck || null,
                            ready: true
                        },
                        guest: null,
                        status: 'WAITING',
                        createdAt: Date.now()
                    };
                    pvpRooms.set(roomId, tRoom);
                    console.log(`[TORNEO] ${myName} listo en sala ${roomId}. Esperando rival...`);
                    socket.emit('TOURNAMENT_WAITING_RIVAL', { message: `Esperando que tu oponente (${isP1 ? match.Player2Username : match.Player1Username}) se conecte a la partida...` });
                } else {
                    if (tRoom.host.username.toLowerCase() !== myName.toLowerCase()) {
                        tRoom.guest = {
                            socketId: socket.id,
                            id: socket.user.id,
                            username: myName,
                            level: socket.user.level || 1,
                            avatar: socket.user.avatar || 'AVA-002',
                            sleeve: socket.user.sleeve || 'default_sleeve',
                            mat: socket.user.mat || 'kaiba_mat',
                            deck: data.player_deck || null,
                            ready: true
                        };
                        tRoom.status = 'DUELING';

                        console.log(`[TORNEO] Ambos duelistas (${tRoom.host.username} vs ${tRoom.guest.username}) en sala ${roomId}. Iniciando combate...`);

                        await pool.request()
                            .input('mId', sql.Int, matchId)
                            .query("UPDATE dbo.TorneoPartidas SET Estado = 'EN_JUEGO' WHERE Id = @mId");

                        io.to(roomId).emit('PVP_START_COUNTDOWN', { seconds: 3 });

                        setTimeout(() => {
                            const p1Name = tRoom.host.username;
                            const p2Name = tRoom.guest.username;
                            const firstPlayer = Math.random() < 0.5 ? 'player1' : 'player2';

                            const duelState = createInitialDuelState(
                                roomId,
                                p1Name,
                                p2Name,
                                tRoom.host.sleeve,
                                firstPlayer,
                                tRoom.host.deck,
                                tRoom.guest.deck,
                                tRoom.guest.sleeve,
                                tRoom.host.mat || 'default_mat',
                                tRoom.guest.mat || 'kaiba_mat'
                            );

                            duelState.isNpcDuel = false;
                            duelState.mode = 'PVP';

                            duelRooms.set(roomId, duelState);
                            enrichDuelStateForBroadcast(duelState);

                            io.to(roomId).emit('PVP_DUEL_START_NOW', {
                                roomId: roomId,
                                player1: p1Name,
                                player2: p2Name,
                                firstPlayer: firstPlayer
                            });

                            io.to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                            startDuelTurnTimer(roomId, io);
                        }, 3200);
                    }
                }
            } catch (err) {
                console.error('[TOURNAMENT MATCH ERROR]', err);
            }
        });

        // 3. Manejo Central de Acciones de Duelo
        socket.on('DUEL_ACTION', async (data) => {
            try {
                await handleDuelAction(socket, data);
            } catch (err) {
                console.error('[DUEL_ACTION SOCKET ERROR]', err);
                socket.emit('ACTION_ERROR', { message: err.message || 'Error procesando la jugada.' });
            }
        });

        // 4. Respuestas del motor de Cadenas OCG
        socket.on('OCG_CHAIN_RESPONSE', async (data) => {
            try {
                if (!data) return;
                const roomId = data.room_id || 'ROOM_DEMO';
                const duelState = duelRooms.get(roomId);
                if (!duelState || duelState.isGameOver) return;

                if (roomChainTimers.has(roomId)) {
                    clearTimeout(roomChainTimers.get(roomId));
                    roomChainTimers.delete(roomId);
                }

                const chainPlayer = (socket.user && socket.user.username && socket.user.username !== 'Invitado') ? socket.user.username : (data.player_name || duelState.player1.username);
                const isP2 = Boolean(duelState.player2 && duelState.player2.username && chainPlayer && chainPlayer.toLowerCase() === duelState.player2.username.toLowerCase());
                const chainPlayerKey = isP2 ? 'player2' : 'player1';
                const rivalPlayerKey = isP2 ? 'player1' : 'player2';

                if (data.action === 'CHAIN' && data.card_id) {
                    const cardData = await fetchCardData(data.card_id);
                    const nextLink = duelState.activeChain.length + 1;

                    // Si la carta encadenada estaba en el campo, revelarla boca arriba
                    if (data.slot_index !== undefined && data.slot_index >= 0 && duelState[chainPlayerKey] && duelState[chainPlayerKey].spells && duelState[chainPlayerKey].spells[data.slot_index]) {
                        duelState[chainPlayerKey].spells[data.slot_index].faceDown = false;
                        duelState[chainPlayerKey].spells[data.slot_index].position = 'ACT';
                    }

                    duelState.activeChain.push({
                        chainLink: nextLink,
                        player: chainPlayer,
                        card_id: data.card_id,
                        card_data: cardData,
                        slot_index: data.slot_index,
                        target_data: data.target_data || null,
                        from_hand: data.from_hand || (data.card_id === 40640057)
                    });

                    emitDuelLog(roomId, `⛓️ [Cadena Eslabón ${nextLink}] ¡${chainPlayer} encadena "${cardData.name}"!`, 'chain');
                    enrichDuelStateForBroadcast(duelState);
                    io.to(roomId).emit('DUEL_STATE_UPDATE', duelState);

                    // Consultar al rival si encadena
                    const rivalPlayer = duelState[rivalPlayerKey];
                    const rivalName = (rivalPlayer && rivalPlayer.username) ? rivalPlayer.username : 'Oponente';
                    promptChainWindow(roomId, `${chainPlayer} encadenó ${cardData.name}`, cardData, rivalName);
                } else {
                    emitDuelLog(roomId, `✋ ${chainPlayer} pasa su prioridad de respuesta.`, 'chain');
                    resolveActiveChain(roomId);
                }
            } catch (chainErr) {
                console.error('[OCG_CHAIN_RESPONSE SOCKET ERROR]', chainErr);
            }
        });

        // 5. Respuesta de Selección de Tributos OCG
        socket.on('OCG_TRIBUTE_RESPONSE', async (data) => {
            try {
                if (!data || !data.card_id) return;
                const roomId = data.room_id || 'ROOM_DEMO';
                const cardId = parseInt(data.card_id, 10);
                const tributeSlots = data.tribute_slots || [];
                const targetSlot = data.target_slot !== undefined ? data.target_slot : 0;
                const position = data.position || 'ATK';

                await handleDuelAction(socket, {
                    room_id: roomId,
                    action_type: position === 'DEF' ? 'SET' : 'SUMMON',
                    card_id: cardId,
                    slot_index: targetSlot,
                    tribute_slots: tributeSlots,
                    position: position
                });
            } catch (tribErr) {
                console.error('[OCG_TRIBUTE_RESPONSE SOCKET ERROR]', tribErr);
                socket.emit('ACTION_ERROR', { message: 'Error procesando tributo.' });
            }
        });

        // 6. Descarte por límite de mano (End Phase > 6 cartas)
        socket.on('OCG_HAND_DISCARD_RESPONSE', async (data) => {
            try {
                if (!data || !Array.isArray(data.discard_indices)) return;
                const roomId = data.room_id || 'ROOM_DEMO';
                const duelState = duelRooms.get(roomId);
                if (!duelState || duelState.turnPlayer !== duelState.player1.username) return;

                const p1 = duelState.player1;
                const sortedIndices = [...new Set(data.discard_indices)].sort((a, b) => b - a);
                sortedIndices.forEach(idx => {
                    if (idx >= 0 && idx < p1.hand.length) {
                        const disc = p1.hand.splice(idx, 1)[0];
                        sendCardToGraveyard(duelState, disc, 'player1');
                    }
                });

                emitDuelLog(roomId, `📦 [Regla de Mano] ${p1.username} descartó ${sortedIndices.length} carta(s) al Cementerio por límite de 6 cartas.`, 'phase');
                enrichDuelStateForBroadcast(duelState);
                io.to(roomId).emit('DUEL_STATE_UPDATE', duelState);

                finalizeTurnHandoffToRival(roomId);
            } catch (discErr) {
                console.error('[OCG_HAND_DISCARD_RESPONSE SOCKET ERROR]', discErr);
            }
        });

        // 7. Activación directa de cartas
        socket.on('OCG_ACTIVATE_CARD', async (data) => {
            try {
                if (!data || !data.card_id) return;
                data.action_type = 'ACTIVATE';
                await handleDuelAction(socket, data);
            } catch (actErr) {
                console.error('[OCG_ACTIVATE_CARD SOCKET ERROR]', actErr);
                socket.emit('ACTION_ERROR', { message: actErr.message || 'Error activando carta.' });
            }
        });

        // 8. Alias de acciones de cliente
        socket.on('CMD_ACTION', async (data) => { try { await handleDuelAction(socket, data); } catch (e) { console.error('[CMD_ACTION ERROR]', e); } });
        socket.on('CLIENT_SUMMON', async (data) => { try { if (!data) data = {}; data.action_type = data.action_type || 'SUMMON'; await handleDuelAction(socket, data); } catch (e) { console.error('[CLIENT_SUMMON ERROR]', e); } });
        socket.on('CLIENT_SET', async (data) => { try { if (!data) data = {}; data.action_type = data.action_type || 'SET'; await handleDuelAction(socket, data); } catch (e) { console.error('[CLIENT_SET ERROR]', e); } });
        socket.on('CLIENT_ATTACK', async (data) => { try { if (!data) data = {}; data.action_type = 'CLIENT_ATTACK'; await handleDuelAction(socket, data); } catch (e) { console.error('[CLIENT_ATTACK ERROR]', e); } });
        socket.on('SURRENDER', async (data) => { try { if (!data) data = {}; data.action_type = 'SURRENDER'; await handleDuelAction(socket, data); } catch (e) { console.error('[SURRENDER ERROR]', e); } });

        // 9. Configuración de prueba de estados de duelo (QA / debug) - BLINDADO ANTI-CHEAT
        socket.on('TEST_SETUP_DUEL_STATE', (data) => {
            const isAdmin = Boolean(socket.user && (socket.user.isAdmin || (socket.user.username && socket.user.username.toLowerCase() === 'admin')));
            if (!isAdmin) {
                console.warn(`🛡️ [ANTI-CHEAT ALERT] Intento no autorizado de manipular TEST_SETUP_DUEL_STATE desde socket ${socket.id} (${socket.user ? socket.user.username : 'Anon'}). Rechazado.`);
                socket.emit('SECURITY_ALERT', { message: 'Operación no autorizada: violación de integridad detectada.' });
                return;
            }
            if (!data || !data.room_id) return;
            const duel = duelRooms.get(data.room_id);
            if (!duel) return;
            duel.isGameOver = false;
            duel.winner = null;
            duel.isNpcTurnActive = false;
            if (duel.player1 && duel.player1.lp <= 0) duel.player1.lp = 8000;
            if (duel.player2 && duel.player2.lp <= 0) duel.player2.lp = 8000;
            if (data.patch) {
                if (data.patch.normalSummonUsed !== undefined) duel.normalSummonUsed = data.patch.normalSummonUsed;
                if (data.patch.turnNumber !== undefined) duel.turnNumber = data.patch.turnNumber;
                if (data.patch.turnPlayer !== undefined) duel.turnPlayer = data.patch.turnPlayer;
                else if (duel.player1 && duel.player1.username) duel.turnPlayer = duel.player1.username;
                if (data.patch.phase !== undefined) duel.phase = data.patch.phase;
                if (data.patch.pendingAction !== undefined) duel.pendingAction = data.patch.pendingAction;
                if (data.patch.activeChain !== undefined) duel.activeChain = data.patch.activeChain;
                if (data.patch.player1) {
                    if (data.patch.player1.monsters) duel.player1.monsters = data.patch.player1.monsters;
                    if (data.patch.player1.spells) duel.player1.spells = data.patch.player1.spells;
                    if (data.patch.player1.hand) duel.player1.hand = data.patch.player1.hand;
                    if (data.patch.player1.graveyard) duel.player1.graveyard = data.patch.player1.graveyard;
                    if (data.patch.player1.banished) duel.player1.banished = data.patch.player1.banished;
                    if (data.patch.player1.extraDeck) duel.player1.extraDeck = data.patch.player1.extraDeck;
                    if (data.patch.player1.lp !== undefined) duel.player1.lp = data.patch.player1.lp;
                }
                if (data.patch.player2) {
                    if (data.patch.player2.monsters) duel.player2.monsters = data.patch.player2.monsters;
                    if (data.patch.player2.spells) duel.player2.spells = data.patch.player2.spells;
                    if (data.patch.player2.hand) duel.player2.hand = data.patch.player2.hand;
                    if (data.patch.player2.graveyard) duel.player2.graveyard = data.patch.player2.graveyard;
                    if (data.patch.player2.banished) duel.player2.banished = data.patch.player2.banished;
                    if (data.patch.player2.extraDeck) duel.player2.extraDeck = data.patch.player2.extraDeck;
                    if (data.patch.player2.lp !== undefined) duel.player2.lp = data.patch.player2.lp;
                }
            }
            enrichDuelStateForBroadcast(duel);
            io.to(data.room_id).emit('DUEL_STATE_UPDATE', duel);
        });

        // 10. Chat en tiempo real y Eventos en Vivo
        socket.on('CHAT_MESSAGE', async (data) => {
            const text = (data && data.message ? data.message : '').trim();
            if (!text) return;

            const chatEngine = require('../engine/chat-event-engine');
            const chatState = chatEngine.getChatState();

            // Determinar si el remitente es Administrador con máxima certeza
            const isSenderAdmin = socket.user.isAdmin || 
                (socket.user.username && socket.user.username.toLowerCase() === 'admin') || 
                (data.role && data.role.toLowerCase() === 'admin') ||
                (data.username && data.username.toLowerCase() === 'admin') ||
                Boolean(data.isAdmin);

            // Comandos rápidos de administrador
            if (isSenderAdmin && text.startsWith('/')) {
                if (text === '/mutechat') {
                    await chatEngine.setChatMutedState(true, socket.user.username);
                    return;
                } else if (text === '/unmutechat') {
                    await chatEngine.setChatMutedState(false, socket.user.username);
                    return;
                }
            }

            // 1. Validación de chat bloqueado (El Administrador SIEMPRE puede escribir)
            if (chatState.isChatMuted && !isSenderAdmin) {
                return socket.emit('CHAT_REJECTED', { message: 'Chat bloqueado por la Administración.' });
            }

            const senderUserId = data.userId || socket.user.id || 1;
            const senderUsername = data.username || socket.user.username || 'Duelista';
            const senderAvatar = data.avatar || socket.user.avatar || 'AVA-002';
            const senderLevel = data.level || socket.user.level || 1;
            const senderClan = data.clanTag || null;
            const textColor = data.textColor || (isSenderAdmin ? '#FFD700' : '#FFFFFF');

            // 2. Sistema Anti-Spam y Rate Limiting (Los administradores están exentos)
            if (!isSenderAdmin) {
                if (!global.userLastChatTimestamp) global.userLastChatTimestamp = new Map();
                const lastChat = global.userLastChatTimestamp.get(senderUserId);
                const now = Date.now();

                if (lastChat) {
                    // Cooldown de 2.5 segundos entre mensajes
                    if (now - lastChat.timestamp < 2500) {
                        const waitSec = ((2500 - (now - lastChat.timestamp)) / 1000).toFixed(1);
                        return socket.emit('CHAT_REJECTED', { message: `⏳ Anti-Spam: Por favor espera ${waitSec}s antes de enviar otro mensaje.` });
                    }
                    // Bloqueo de mensajes duplicados consecutivos dentro de 5 segundos
                    if (lastChat.message.toLowerCase() === text.toLowerCase() && (now - lastChat.timestamp < 5000)) {
                        return socket.emit('CHAT_REJECTED', { message: '⚠️ Anti-Spam: No envíes mensajes repetidos de forma consecutiva.' });
                    }
                }

                global.userLastChatTimestamp.set(senderUserId, { timestamp: now, message: text });
            }

            // 3. Detección y Enrutamiento de MENSAJES PRIVADOS (/w @usuario mensaje)
            let isPrivateMsg = Boolean(data.isPrivate);
            let targetUsername = data.targetUsername || null;
            let finalMessage = text;

            const whisperMatch = text.match(/^\/(?:w|whisper|msg)\s+@?([a-zA-Z0-9_\-]+)\s+(.+)$/i);
            if (whisperMatch) {
                isPrivateMsg = true;
                targetUsername = whisperMatch[1].trim();
                finalMessage = whisperMatch[2].trim();
            }

            if (isPrivateMsg && targetUsername) {
                try {
                    const pool = await getPool();
                    const targetRes = await pool.request()
                        .input('tname', sql.VarChar(50), targetUsername)
                        .query('SELECT Id, Username, Nivel, AvatarActivoId FROM dbo.Usuarios WHERE Username = @tname');

                    if (!targetRes.recordset || targetRes.recordset.length === 0) {
                        return socket.emit('CHAT_REJECTED', { message: `❌ Usuario @${targetUsername} no encontrado.` });
                    }

                    const targetUser = targetRes.recordset[0];

                    // Guardar mensaje privado mediante Stored Procedure
                    let savedMsgId = Date.now();
                    try {
                        const spRes = await pool.request()
                            .input('UserId', sql.Int, senderUserId)
                            .input('Username', sql.NVarChar(50), senderUsername)
                            .input('AvatarCode', sql.NVarChar(50), senderAvatar)
                            .input('ClanTag', sql.NVarChar(20), senderClan)
                            .input('Message', sql.NVarChar(sql.MAX), finalMessage)
                            .input('TextColor', sql.NVarChar(30), '#d8b4fe')
                            .input('IsAdmin', sql.Bit, isSenderAdmin ? 1 : 0)
                            .input('IsSystem', sql.Bit, 0)
                            .input('IsPinned', sql.Bit, 0)
                            .input('IsPrivate', sql.Bit, 1)
                            .input('TargetUserId', sql.Int, targetUser.Id)
                            .input('TargetUsername', sql.NVarChar(50), targetUser.Username)
                            .execute('dbo.sp_GuardarMensajeChat');

                        if (spRes.recordset && spRes.recordset[0]?.MessageId) {
                            savedMsgId = spRes.recordset[0].MessageId;
                        }
                    } catch (dbErr) {
                        console.warn('[SP_GUARDAR_MENSAJE_CHAT PRIVATE WARNING]', dbErr.message);
                    }

                    // Determinar VIP del remitente
                    let senderVipCode = data.vip_code || data.vipCode || null;
                    let isSenderVip = Boolean(data.is_vip || data.isVip);
                    if (!isSenderAdmin && !senderVipCode) {
                        try {
                            const vRes = await pool.request()
                                .input('vuid', sql.Int, senderUserId)
                                .query(`
                                    SELECT TOP 1 uv.VipCode, u.VipUntil
                                    FROM dbo.Usuarios u
                                    LEFT JOIN dbo.UserVipPasses uv ON u.Id = uv.UsuarioId AND (uv.ExpiresAt IS NULL OR uv.ExpiresAt > GETDATE())
                                    WHERE u.Id = @vuid
                                    ORDER BY uv.ExpiresAt DESC
                                `);
                            if (vRes.recordset && vRes.recordset[0]) {
                                const row = vRes.recordset[0];
                                if (row.VipUntil && new Date(row.VipUntil) > new Date()) {
                                    isSenderVip = true;
                                    senderVipCode = row.VipCode || 'VIP-004';
                                }
                            }
                        } catch(e) {}
                    }

                    const privatePayload = {
                        id: savedMsgId,
                        is_private: true,
                        user_id: senderUserId,
                        username: senderUsername,
                        avatar: senderAvatar,
                        level: senderLevel,
                        clan_tag: senderClan,
                        target_id: targetUser.Id,
                        target_username: targetUser.Username,
                        mensaje: finalMessage,
                        text_color: '#d8b4fe',
                        name_color: isSenderAdmin ? '#FFD700' : '#00F0FF',
                        is_admin: isSenderAdmin,
                        is_vip: isSenderVip,
                        vip_code: senderVipCode,
                        timestamp: Date.now()
                    };

                    // Emitir a los sockets del destinatario y al remitente
                    for (const [sId, s] of io.sockets.sockets) {
                        if (s.user && (s.user.id === targetUser.Id || (s.user.username && s.user.username.toLowerCase() === targetUser.Username.toLowerCase()))) {
                            s.emit('CHAT_PRIVATE_MESSAGE', privatePayload);
                        }
                    }

                    // Enviar confirmación al remitente
                    socket.emit('CHAT_PRIVATE_MESSAGE', privatePayload);
                    return;
                } catch (privErr) {
                    console.error('[WHISPER ERROR]', privErr);
                    return socket.emit('CHAT_REJECTED', { message: 'Error al enviar mensaje privado.' });
                }
            }

            // Determinar VIP del remitente para mensaje público
            let senderVipCode = data.vip_code || data.vipCode || null;
            let isSenderVip = Boolean(data.is_vip || data.isVip);
            if (!isSenderAdmin && !senderVipCode) {
                try {
                    const pool = await getPool();
                    const vRes = await pool.request()
                        .input('vuid', sql.Int, senderUserId)
                        .query(`
                            SELECT TOP 1 uv.VipCode, u.VipUntil
                            FROM dbo.Usuarios u
                            LEFT JOIN dbo.UserVipPasses uv ON u.Id = uv.UsuarioId AND (uv.ExpiresAt IS NULL OR uv.ExpiresAt > GETDATE())
                            WHERE u.Id = @vuid
                            ORDER BY uv.ExpiresAt DESC
                        `);
                    if (vRes.recordset && vRes.recordset[0]) {
                        const row = vRes.recordset[0];
                        if (row.VipUntil && new Date(row.VipUntil) > new Date()) {
                            isSenderVip = true;
                            senderVipCode = row.VipCode || 'VIP-004';
                        }
                    }
                } catch(e) {}
            }

            // 4. Evaluar si este mensaje público acierta el Evento en Vivo activo
            const eventResult = await chatEngine.evaluateMessageForActiveEvent(senderUserId, senderUsername, text);
            const isWinnerEvent = eventResult && eventResult.isWinner;

            // 5. Persistir mensaje público en Base de Datos SQL Server mediante Stored Procedure
            let publicMsgId = Date.now();
            try {
                const pool = await getPool();
                const pubRes = await pool.request()
                    .input('UserId', sql.Int, senderUserId)
                    .input('Username', sql.NVarChar(50), senderUsername)
                    .input('AvatarCode', sql.NVarChar(50), senderAvatar)
                    .input('ClanTag', sql.NVarChar(20), senderClan)
                    .input('Message', sql.NVarChar(sql.MAX), text)
                    .input('TextColor', sql.NVarChar(30), textColor)
                    .input('IsAdmin', sql.Bit, isSenderAdmin ? 1 : 0)
                    .input('IsSystem', sql.Bit, 0)
                    .input('IsPinned', sql.Bit, 0)
                    .input('IsPrivate', sql.Bit, 0)
                    .input('TargetUserId', sql.Int, null)
                    .input('TargetUsername', sql.NVarChar(50), null)
                    .execute('dbo.sp_GuardarMensajeChat');

                if (pubRes.recordset && pubRes.recordset[0]?.MessageId) {
                    publicMsgId = pubRes.recordset[0].MessageId;
                }
            } catch (msgErr) {
                console.warn('[CHAT DB SAVE WARNING]', msgErr.message);
            }

            // 6. Emitir mensaje público a todos los clientes conectados
            const formattedMessage = {
                id: publicMsgId,
                user_id: senderUserId,
                username: senderUsername,
                avatar: senderAvatar,
                level: senderLevel,
                clan_tag: senderClan,
                mensaje: text,
                text_color: textColor,
                name_color: isSenderAdmin ? '#FFD700' : '#00F0FF',
                is_admin: isSenderAdmin,
                is_vip: isSenderVip,
                vip_code: senderVipCode,
                is_winner_event: isWinnerEvent,
                timestamp: Date.now()
            };

            io.emit('CHAT_BROADCAST', formattedMessage);
        });

        // 10.B Eliminación de mensaje en tiempo real
        socket.on('CHAT_DELETE_MESSAGE', async (data) => {
            if (!data || !data.messageId) return;
            const messageId = parseInt(data.messageId, 10);
            const senderUserId = socket.user ? (socket.user.id || 0) : 0;
            const isSenderAdmin = Boolean(socket.user && (socket.user.isAdmin || socket.user.username?.toLowerCase() === 'admin'));

            try {
                const pool = await getPool();
                const result = await pool.request()
                    .input('MessageId', sql.BigInt, messageId)
                    .input('UserId', sql.Int, senderUserId)
                    .input('IsAdmin', sql.Bit, isSenderAdmin ? 1 : 0)
                    .execute('dbo.sp_EliminarMensajeChat');

                const row = result.recordset && result.recordset[0];
                if (row && row.Success) {
                    io.emit('CHAT_MESSAGE_DELETED', { messageId });
                } else {
                    socket.emit('CHAT_REJECTED', { message: row?.Message || 'No puedes eliminar este mensaje.' });
                }
            } catch (err) {
                console.error('[CHAT_DELETE_MESSAGE ERROR]', err);
            }
        });

        // 10.C Vaciar conversación en tiempo real
        socket.on('CHAT_CLEAR_CONVERSATION', async (data) => {
            const senderUserId = socket.user ? (socket.user.id || 0) : 0;
            const targetUsername = (data && data.targetUsername && data.targetUsername.trim() !== '' && data.targetUsername.trim().toUpperCase() !== 'GLOBAL')
                ? data.targetUsername.trim()
                : null;

            try {
                const pool = await getPool();
                await pool.request()
                    .input('UserId', sql.Int, senderUserId)
                    .input('TargetUsername', sql.NVarChar(50), targetUsername)
                    .execute('dbo.sp_LimpiarConversacionPrivada');

                if (targetUsername) {
                    io.emit('CHAT_CONVERSATION_CLEARED', { targetUsername, userId: senderUserId, isGlobal: false });
                } else {
                    io.emit('CHAT_CONVERSATION_CLEARED', { isGlobal: true });
                }
            } catch (err) {
                console.error('[CHAT_CLEAR_CONVERSATION ERROR]', err);
            }
        });

        // 11. Inicio directo / vs NPC (DUEL_START)
        socket.on('DUEL_START', async (data) => {
            const roomId = (data && data.room_id) || 'ROOM_DEMO';
            const playerName = (data && data.player_name) || socket.user.username || 'Admin';
            if (playerName) socket.user.username = playerName;

            socket.currentDuelRoomId = roomId;
            cancelPendingForfeit(roomId, socket.user.username);

            let uid = socket.user ? socket.user.id : 0;

            // Si es una sala PvP que ya fue creada por el sistema de matchmaking, solo unirse y sincronizar
            if (roomId.startsWith('PVP_') && duelRooms.has(roomId)) {
                socket.join(roomId);
                socket.currentPvpRoomId = roomId;
                const activeState = duelRooms.get(roomId);
                enrichDuelStateForBroadcast(activeState);
                socket.emit('DUEL_STATE_UPDATE', activeState);
                const timeRemaining = activeState._timerRemaining !== undefined ? activeState._timerRemaining : 120;
                socket.emit('PVP_TIMER_TICK', {
                    roomId,
                    turnPlayer: activeState.turnPlayer,
                    timeRemaining,
                    totalTime: TURN_TIME_LIMIT_SECONDS
                });
                return;
            }

            const firstPlayerChoice = (data && data.first_player) ? data.first_player : 'player1';
            let playerDeckToUse = (data && data.player_deck) ? data.player_deck : null;

            // Consultar mazo oficial en SQL Server si no viene completo
            if (!playerDeckToUse || !Array.isArray(playerDeckToUse.mainDeck) || playerDeckToUse.mainDeck.length < 40) {
                try {
                    const pool = await getPool();
                    if (!uid && socket.user.username) {
                        const uRes = await pool.request()
                            .input('uname', sql.VarChar, socket.user.username)
                            .query('SELECT Id FROM dbo.Usuarios WHERE Username = @uname');
                        if (uRes.recordset && uRes.recordset[0]) uid = uRes.recordset[0].Id;
                    }
                    if (uid) {
                        const dRes = await pool.request()
                            .input('uid', sql.Int, uid)
                            .query('SELECT TOP 1 MainDeckJson, ExtraDeckJson, SideDeckJson FROM dbo.Decks WHERE UsuarioId = @uid AND EsActivo = 1');
                        if (dRes.recordset && dRes.recordset[0]) {
                            playerDeckToUse = {
                                mainDeck: JSON.parse(dRes.recordset[0].MainDeckJson || '[]'),
                                extraDeck: JSON.parse(dRes.recordset[0].ExtraDeckJson || '[]'),
                                sideDeck: JSON.parse(dRes.recordset[0].SideDeckJson || '[]')
                            };
                        }
                    }
                } catch (e) {
                    console.error('[DUEL_START DB DECK ERROR]', e.message);
                }
            }

            const mainCardCount = playerDeckToUse && Array.isArray(playerDeckToUse.mainDeck) ? playerDeckToUse.mainDeck.length : 0;
            if (mainCardCount < 40) {
                console.warn(`[DUEL_START] Rechazado para ${playerName}: mazo insuficiente (${mainCardCount} cartas).`);
                socket.emit('DUEL_ERROR', {
                    code: 'INVALID_DECK',
                    message: `Tu mazo actual tiene ${mainCardCount} cartas. Debes armar y activar un mazo reglamentario (mínimo 40 cartas) en el Constructor de Mazos antes de iniciar un duelo.`
                });
                return;
            }

            let opponentName = (data && data.opponent_name) || 'NPC Principiante (Nv. 1)';
            let customOpponentDeck = (data && data.opponent_deck) ? data.opponent_deck : null;
            let npcId = (data && data.npc_id) ? parseInt(data.npc_id, 10) : null;
            let npcAvatar = 'AVA-002';

            if (npcId) {
                try {
                    const pool = await getPool();

                    // Validar nivel del jugador si es duelo de aventura
                    let userLvl = 1;
                    if (uid) {
                        const uRes = await pool.request().input('uidLvl', sql.Int, uid).query('SELECT Nivel FROM dbo.Usuarios WHERE Id = @uidLvl');
                        if (uRes.recordset && uRes.recordset[0]) {
                            userLvl = parseInt(uRes.recordset[0].Nivel || 1, 10);
                        }
                    }

                    const deckRes = await pool.request()
                        .input('NpcId', sql.Int, npcId)
                        .execute('dbo.sp_ObtenerDeckNpc');
                    
                    const headerRow = deckRes.recordsets[0] && deckRes.recordsets[0][0];
                    if (headerRow) {
                        const requiredLvl = headerRow.Level || 1;
                        if (userLvl < requiredLvl) {
                            console.warn(`[DUEL_START] Rechazado para ${playerName}: nivel insuficiente (${userLvl} < ${requiredLvl}).`);
                            socket.emit('DUEL_ERROR', {
                                code: 'INSUFFICIENT_LEVEL',
                                message: `Nivel insuficiente: Tu nivel actual es ${userLvl}, pero ${headerRow.Name} requiere Nivel ${requiredLvl}. ¡Gana experiencia en duelos anteriores para subir de nivel!`
                            });
                            return;
                        }

                        opponentName = `${headerRow.Name} (Nv. ${headerRow.Level})`;
                        npcAvatar = headerRow.AvatarCode || 'AVA-002';
                        
                        const cardsList = deckRes.recordsets[1] || [];
                        const mDeck = [];
                        const eDeck = [];
                        cardsList.forEach(c => {
                            if (c.Section === 'MAIN') mDeck.push(c.CardCode);
                            else if (c.Section === 'EXTRA') eDeck.push(c.CardCode);
                        });

                        customOpponentDeck = {
                            mainDeck: mDeck,
                            extraDeck: eDeck
                        };
                    }
                } catch (e) {
                    console.warn('[NPC SQL LOAD NOTICE]', e.message);
                }
            }

            const duelState = createInitialDuelState(roomId, playerName, opponentName, socket.user.sleeve, firstPlayerChoice, playerDeckToUse, customOpponentDeck, 'yugi_sleeve');
            
            duelState.isNpcDuel = true;
            duelState.mode = 'NPC';
            duelState.player2.isNpc = true;
            duelState.player2.npcId = npcId || 1;
            duelState.player2.avatar = npcAvatar;

            duelRooms.set(roomId, duelState);
            socket.join(roomId);

            // Registrar e inicializar en el Árbitro Oficial Project Ignis (puerto 7001)
            try {
                const p0DeckCodes = (playerDeckToUse && playerDeckToUse.mainDeck) ? playerDeckToUse.mainDeck : [];
                const p1DeckCodes = (customOpponentDeck && customOpponentDeck.mainDeck) ? customOpponentDeck.mainDeck : [];
                duelBridge.createDuel({
                    duelId: roomId,
                    player0Deck: p0DeckCodes,
                    player1Deck: p1DeckCodes,
                    lp: 8000,
                    isNpc: true
                }).then(officialRes => {
                    console.log(`[PROJECT IGNIS ARBITRO] Sala ${roomId} sincronizada y activa en el motor oficial ocgcore.`);
                    duelState.officialIgnisSession = {
                        active: true,
                        duelId: roomId,
                        initialEvents: officialRes.events
                    };
                    duelBridge.syncStateFromIgnis(duelState, officialRes);
                    enrichDuelStateForBroadcast(duelState);
                    io.to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                    socket.emit('DUEL_STATE_UPDATE', duelState);
                    if (officialRes.pendingPrompt) {
                        io.to(roomId).emit('DUEL_PROMPT', officialRes.pendingPrompt);
                    }
                    if (Array.isArray(officialRes.logs)) {
                        officialRes.logs.forEach(l => emitDuelLog(roomId, l, 'system'));
                    }
                }).catch(err => {
                    console.warn(`[PROJECT IGNIS ARBITRO NOTICE] Fallback a árbitro local: ${err.message}`);
                });
            } catch (bridgeErr) {
                console.warn('[PROJECT IGNIS ARBITRO NOTICE]', bridgeErr.message);
            }

            console.log(`[CAMPO REGLAMENTARIO] Duelo iniciado en sala: ${roomId} contra ${opponentName} (NPC #${npcId || 'N/A'})`);
            enrichDuelStateForBroadcast(duelState);
            io.to(roomId).emit('DUEL_STATE_UPDATE', duelState);
            socket.emit('DUEL_STATE_UPDATE', duelState);

            // Iniciar temporizador de 120s para el turno inicial
            startDuelTurnTimer(roomId, io);
        });

        // 12. Desconexión de socket (Lobby y Duelo Activo)
        socket.on('disconnect', async () => {
            const username = socket.user ? socket.user.username : null;

            // A. Manejo de desconexión en Duelos Activos
            if (username && username !== 'Invitado') {
                for (const [roomId, state] of duelRooms.entries()) {
                    if (!state || state.isGameOver) continue;

                    const isP1 = Boolean(state.player1 && state.player1.username && state.player1.username.toLowerCase() === username.toLowerCase());
                    const isP2 = Boolean(state.player2 && state.player2.username && state.player2.username.toLowerCase() === username.toLowerCase());

                    if (isP1 || isP2) {
                        // Si es duelo contra NPC, no penalizar con surrender por desconexión de socket
                        if (isNpcOpponent(state.player2)) {
                            continue;
                        }

                        // Duelo PvP entre 2 jugadores humanos:
                        // Dar una ventana de gracia para reconexión (35s)
                        const loserKey = isP1 ? 'player1' : 'player2';
                        const winnerKey = isP1 ? 'player2' : 'player1';
                        const key = `${roomId}:${username.toLowerCase()}`;

                        // Esperar 2 segundos antes de iniciar el conteo para permitir que la navegación entre páginas conecte el nuevo socket
                        setTimeout(() => {
                            if (hasActiveSocketForUserInRoom(io, roomId, username)) {
                                return; // Ya tiene conexión activa en la arena
                            }

                            if (pendingForfeitTimers.has(key)) return; // Ya existe temporizador corriendo

                            emitDuelLog(roomId, `⚠️ ${username} se ha desconectado. Esperando reconexión (${Math.round(RECONNECT_GRACE_PERIOD_MS / 1000)}s)...`, 'chain');

                            const forfeitTimeout = setTimeout(async () => {
                                pendingForfeitTimers.delete(key);
                                const currentState = duelRooms.get(roomId);
                                if (!currentState || currentState.isGameOver) return;

                                if (hasActiveSocketForUserInRoom(io, roomId, username)) {
                                    return; // Se reconectó a tiempo
                                }

                                emitDuelLog(roomId, `🚪 ${username} no se reconectó a tiempo. Victoria concedida al rival por abandono.`, 'game_over');
                                clearDuelTurnTimer(roomId);
                                await processDuelGameOver(roomId, currentState, winnerKey, loserKey, 'SURRENDER');
                            }, RECONNECT_GRACE_PERIOD_MS);

                            pendingForfeitTimers.set(key, forfeitTimeout);
                        }, 2000);
                    }
                }
            }

            // B. Manejo en Lobby PvP (Solo si la sala NO está en combate)
            const roomId = socket.currentPvpRoomId;
            if (roomId && pvpRooms.has(roomId)) {
                const room = pvpRooms.get(roomId);
                if (room.status !== 'DUELING') {
                    if (room.host && (room.host.socketId === socket.id || room.host.username === socket.user.username)) {
                        console.log(`[PVP] Desconexión de anfitrión ${socket.user.username}. Cancelando sala ${roomId}.`);
                        io.to(roomId).emit('PVP_ROOM_CANCELLED', { message: 'El anfitrión se ha desconectado.' });
                        pvpRooms.delete(roomId);
                    } else if (room.guest && (room.guest.socketId === socket.id || room.guest.username === socket.user.username)) {
                        console.log(`[PVP] Desconexión de invitado ${socket.user.username} en sala ${roomId}.`);
                        room.guest = null;
                        room.status = 'WAITING';
                        io.to(roomId).emit('PVP_GUEST_LEFT', { message: 'El oponente se ha desconectado.' });
                    }
                    io.emit('PVP_ROOM_LIST', getPvpRoomListSummary());
                }
            }
        });

        // 13. Sorteo de Dados PvP Sincronizado
        socket.on('PVP_ROLL_DICE', (data) => {
            if (!data || !data.room_id) return;
            const roomId = data.room_id;
            const duelState = duelRooms.get(roomId);
            if (!duelState) return;

            let p1Roll = Math.floor(Math.random() * 6) + 1;
            let p2Roll = Math.floor(Math.random() * 6) + 1;
            while (p1Roll === p2Roll) {
                p2Roll = Math.floor(Math.random() * 6) + 1;
            }

            const p1Won = p1Roll > p2Roll;
            const winnerUsername = p1Won ? duelState.player1.username : duelState.player2.username;
            const winnerKey = p1Won ? 'player1' : 'player2';

            duelState.turnPlayer = winnerUsername;

            io.to(roomId).emit('PVP_DICE_RESULT', {
                p1Roll,
                p2Roll,
                p1Username: duelState.player1.username,
                p2Username: duelState.player2.username,
                winnerUsername,
                winnerKey
            });

            setTimeout(() => {
                enrichDuelStateForBroadcast(duelState);
                io.to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                startDuelTurnTimer(roomId, io);
            }, 2600);
        });

        // 14. Inyección de Error y Reporte Rápido de Bugs en Vivo
        socket.on('REPORT_DUEL_BUG', (data) => {
            try {
                if (!data || !data.room_id) return;
                const roomId = data.room_id;
                const duelState = duelRooms.get(roomId);
                const reporter = (socket.user && socket.user.username) || data.player_name || 'Jugador';
                const userNote = data.description || data.note || 'Error reportado durante la jugada';
                const cardName = data.card_name ? ` (Carta: ${data.card_name})` : '';

                const logMsg = `🚨 [ERROR REPORTADO] @${reporter}: "${userNote}"${cardName} | Turno: #${duelState ? duelState.turnNumber : '?'}, Fase: ${duelState ? duelState.phase : '?'}, TurnPlayer: ${duelState ? duelState.turnPlayer : '?'}`;
                console.warn(`\n========================================\n[REPORTED DUEL BUG] ${logMsg}\n========================================\n`);

                emitDuelLog(roomId, logMsg, 'error', {
                    reporter,
                    note: userNote,
                    cardName: data.card_name || null,
                    timestamp: new Date().toISOString()
                });

                // Guardar en archivo persistente de errores para auditoría y disparar Agente IA
                try {
                    const fs = require('fs');
                    const path = require('path');
                    const logDir = path.resolve(__dirname, '../../logs');
                    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
                    const logFilePath = path.resolve(logDir, 'reported_duel_bugs.log');
                    const entry = `[${new Date().toISOString()}] [ROOM: ${roomId}] ${logMsg}\n`;
                    fs.appendFile(logFilePath, entry, 'utf8', () => {});

                    // Disparar Agente IA para generar propuesta de corrección en el Panel
                    let cardIdToFix = data.card_id || data.cardId || (duelState && duelState.lastPlayedCard ? duelState.lastPlayedCard.id : null);
                    let detectedName = data.card_name || null;

                    if (!cardIdToFix && duelState) {
                        const isPlayer2 = socket.user && duelState.player2 && socket.user.username === duelState.player2.username;
                        const p = duelState[isPlayer2 ? 'player2' : 'player1'];
                        if (p) {
                            const allActiveCards = [...(p.spells || []), ...(p.monsters || []), ...(p.hand || [])].filter(c => c !== null);
                            if (allActiveCards.length > 0) {
                                const lastCard = allActiveCards[0];
                                cardIdToFix = lastCard.card_id || (lastCard.card_data ? lastCard.card_data.id : null);
                                detectedName = lastCard.card_data ? lastCard.card_data.name : null;
                            }
                        }
                    }

                    // Notificar al duelo que el reporte fue registrado exitosamente para revisión
                    if (duelState) {
                        duelState.duelLogs.push({
                            text: `📋 [SISTEMA] Incidencia registrada en la sala para análisis técnico.`,
                            type: 'system',
                            timestamp: new Date().toLocaleTimeString()
                        });
                    }
                } catch (err) {
                    console.error('[BUG LOGGER ERROR]', err);
                }

                if (duelState) {
                    try {
                        enrichDuelStateForBroadcast(duelState);
                        io.to(roomId).emit('DUEL_STATE_UPDATE', duelState);
                    } catch (broadcastErr) {
                        console.error('[REPORT_DUEL_BUG BROADCAST ERROR]', broadcastErr);
                    }
                }
            } catch (outerErr) {
                console.error('[REPORT_DUEL_BUG FATAL ERROR]', outerErr);
            }
        });
    });
}

module.exports = {
    initDuelSockets
};
