/**
 * ============================================================================
 * ANI-DIMENSION: SERVICIO CENTRAL DE EVENTOS DE ROMPECABEZAS (PUZZLE)
 * ============================================================================
 * Maneja persistencia en SQL Server (con respaldo JSON local), división de cuadrículas,
 * entrega probabilística de fichas, registro automático de ganadores (Top 10)
 * y liquidación de fichas sobrantes por Starships.
 */
const path = require('path');
const fs = require('fs');
const { getPool, sql } = require('../config/db');

const BACKUP_FILE = path.resolve(__dirname, '../data/events_puzzle_data.json');

// Premios oficiales por defecto para el Top 10
const DEFAULT_TOP10_PRIZES = [
    { place: 1, title: '1er Lugar', starships: 50000, vip_days: 30, avatar_code: 'AVA-HALLOWEEN-01', medal: 'MEDAL-GOLD-HALLOWEEN', badge: '🥇 CAMPEÓN' },
    { place: 2, title: '2do Lugar', starships: 35000, vip_days: 15, avatar_code: 'AVA-HALLOWEEN-02', medal: 'MEDAL-SILVER-HALLOWEEN', badge: '🥈 2DO LUGAR' },
    { place: 3, title: '3er Lugar', starships: 25000, vip_days: 7, avatar_code: 'AVA-HALLOWEEN-03', medal: 'MEDAL-BRONZE-HALLOWEEN', badge: '🥉 3ER LUGAR' },
    { place: 4, title: '4to Lugar', starships: 15000, vip_days: 5, avatar_code: '', medal: '', badge: 'TOP 4' },
    { place: 5, title: '5to Lugar', starships: 12000, vip_days: 3, avatar_code: '', medal: '', badge: 'TOP 5' },
    { place: 6, title: '6to Lugar', starships: 10000, vip_days: 3, avatar_code: '', medal: '', badge: 'TOP 6' },
    { place: 7, title: '7mo Lugar', starships: 8000, vip_days: 2, avatar_code: '', medal: '', badge: 'TOP 7' },
    { place: 8, title: '8vo Lugar', starships: 6000, vip_days: 2, avatar_code: '', medal: '', badge: 'TOP 8' },
    { place: 9, title: '9no Lugar', starships: 4000, vip_days: 1, avatar_code: '', medal: '', badge: 'TOP 9' },
    { place: 10, title: '10mo Lugar', starships: 3000, vip_days: 1, avatar_code: '', medal: '', badge: 'TOP 10' }
];

class PuzzleService {
    constructor() {
        this.cache = this.loadLocalBackup();
        this.ensureTables();
    }

    loadLocalBackup() {
        try {
            if (fs.existsSync(BACKUP_FILE)) {
                return JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));
            }
        } catch (e) {
            console.warn('[PUZZLE SERVICE] Error al leer backup local:', e.message);
        }

        // Configuración inicial de Halloween
        const now = new Date();
        const start = new Date(now.getTime() - 1000 * 60 * 60); // Inició hace 1 hora
        const end = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30); // Finaliza en 30 días

        const initialData = {
            events: [
                {
                    id: 1,
                    title: 'Ani Dimension y la Maga Oscura - Especial Halloween',
                    description: '¡Reúne todas las fichas del rompecabezas mágico de Halloween tras tus duelos y sé uno de los 10 primeros en completarlo para ganar premios legendarios!',
                    image_url: '/assets/images/events/halloween_maga_oscura.jpg',
                    start_date: start.toISOString(),
                    end_date: end.toISOString(),
                    grid_rows: 4,
                    grid_cols: 4,
                    total_pieces: 16,
                    payout_per_leftover_piece: 50,
                    drop_rate_npc: 0.40,
                    drop_rate_pvp: 0.75,
                    prizes_config: DEFAULT_TOP10_PRIZES,
                    is_active: true,
                    created_at: now.toISOString()
                }
            ],
            user_pieces: {}, // { "userId_eventId": { "0": 2, "1": 1, ... } }
            winners: {},     // { "eventId": [ { user_id, username, position, completed_at, prize } ] }
            exchanges: {}    // { "userId_eventId": { pieces_exchanged, starships_awarded, exchanged_at } }
        };

        this.saveLocalBackup(initialData);
        return initialData;
    }

    saveLocalBackup(data = null) {
        try {
            const toSave = data || this.cache;
            const dir = path.dirname(BACKUP_FILE);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(BACKUP_FILE, JSON.stringify(toSave, null, 2), 'utf8');
        } catch (e) {
            console.warn('[PUZZLE SERVICE] Error al guardar backup local:', e.message);
        }
    }

    async ensureTables() {
        try {
            const pool = await getPool();
            if (!pool) return;

            await pool.request().query(`
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Events_Puzzle' AND xtype='U')
                CREATE TABLE Events_Puzzle (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    title NVARCHAR(255) NOT NULL,
                    description NVARCHAR(MAX),
                    image_url NVARCHAR(500) NOT NULL,
                    start_date DATETIME2 NOT NULL,
                    end_date DATETIME2 NOT NULL,
                    grid_rows INT DEFAULT 4,
                    grid_cols INT DEFAULT 4,
                    total_pieces INT DEFAULT 16,
                    payout_per_leftover_piece INT DEFAULT 50,
                    drop_rate_npc FLOAT DEFAULT 0.40,
                    drop_rate_pvp FLOAT DEFAULT 0.75,
                    prizes_config NVARCHAR(MAX),
                    is_active BIT DEFAULT 1,
                    created_at DATETIME2 DEFAULT SYSUTCDATETIME()
                );

                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Events_Puzzle_Pieces' AND xtype='U')
                CREATE TABLE Events_Puzzle_Pieces (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    event_id INT NOT NULL,
                    user_id INT NOT NULL,
                    piece_index INT NOT NULL,
                    quantity INT DEFAULT 1,
                    updated_at DATETIME2 DEFAULT SYSUTCDATETIME(),
                    CONSTRAINT UQ_User_Event_Piece UNIQUE (event_id, user_id, piece_index)
                );

                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Events_Puzzle_Winners' AND xtype='U')
                CREATE TABLE Events_Puzzle_Winners (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    event_id INT NOT NULL,
                    user_id INT NOT NULL,
                    username NVARCHAR(100),
                    position INT NOT NULL,
                    completed_at DATETIME2 DEFAULT SYSUTCDATETIME(),
                    prize_data NVARCHAR(MAX),
                    delivered BIT DEFAULT 0,
                    CONSTRAINT UQ_User_Event_Winner UNIQUE (event_id, user_id)
                );

                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Events_Puzzle_Exchanges' AND xtype='U')
                CREATE TABLE Events_Puzzle_Exchanges (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    event_id INT NOT NULL,
                    user_id INT NOT NULL,
                    pieces_exchanged INT NOT NULL,
                    starships_awarded INT NOT NULL,
                    exchanged_at DATETIME2 DEFAULT SYSUTCDATETIME(),
                    CONSTRAINT UQ_User_Event_Exchange UNIQUE (event_id, user_id)
                );
            `);
            console.log('[PUZZLE SERVICE] Tablas SQL de Eventos de Rompecabezas verificadas exitosamente.');
        } catch (e) {
            console.warn('[PUZZLE SERVICE] Operando con respaldo JSON local:', e.message);
        }
    }

    getActiveEvent() {
        const now = new Date();
        const activeEvt = this.cache.events.find(e => e.is_active && new Date(e.start_date) <= now && new Date(e.end_date) >= now)
            || this.cache.events.find(e => e.is_active)
            || this.cache.events[0];
        return activeEvt || null;
    }

    getEventById(eventId) {
        return this.cache.events.find(e => String(e.id) === String(eventId)) || null;
    }

    getAllEvents() {
        this.cache = this.loadLocalBackup();
        return (this.cache.events || []).map(evt => {
            const winners = (this.cache.winners && this.cache.winners[evt.id]) || [];
            return {
                ...evt,
                winners_count: winners.length,
                winners: winners
            };
        });
    }

    getAllEventsWithStatus(userId = 1) {
        this.cache = this.loadLocalBackup();
        const now = new Date();
        const eventsList = (this.cache.events || []).map(evt => {
            const start = new Date(evt.start_date);
            const end = new Date(evt.end_date);
            const isFinished = now > end || !evt.is_active;
            const isUpcoming = now < start;
            const isActive = !isFinished && !isUpcoming && evt.is_active;

            let statusLabel = 'ACTIVE';
            if (isFinished) statusLabel = 'FINISHED';
            else if (isUpcoming) statusLabel = 'UPCOMING';

            const userStatus = this.getUserPuzzleStatus(userId, evt.id);
            const winners = (this.cache.winners && this.cache.winners[evt.id]) || [];

            return {
                id: evt.id,
                title: evt.title,
                description: evt.description,
                image_url: evt.image_url,
                start_date: evt.start_date,
                end_date: evt.end_date,
                grid_rows: evt.grid_rows || 4,
                grid_cols: evt.grid_cols || 4,
                total_pieces: evt.total_pieces || 16,
                payout_per_leftover_piece: evt.payout_per_leftover_piece || 50,
                drop_rate_npc: evt.drop_rate_npc,
                drop_rate_pvp: evt.drop_rate_pvp,
                prizes_config: evt.prizes_config,
                is_active: evt.is_active,
                status: statusLabel,
                is_finished: isFinished,
                is_upcoming: isUpcoming,
                winners_count: winners.length,
                top_winners: winners.slice(0, 3),
                user_progress: userStatus ? userStatus.progress : null
            };
        });

        // Orden cronológico:
        // 1. ACTIVOS primero (ordenados por finalización más próxima)
        // 2. PRÓXIMOS (ordenados por inicio)
        // 3. FINALIZADOS (ordenados por fecha de finalización más reciente primero)
        return eventsList.sort((a, b) => {
            if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
            if (b.status === 'ACTIVE' && a.status !== 'ACTIVE') return 1;

            if (a.status === 'UPCOMING' && b.status === 'FINISHED') return -1;
            if (b.status === 'UPCOMING' && a.status === 'FINISHED') return 1;

            if (a.status === 'FINISHED' && b.status === 'FINISHED') {
                return new Date(b.end_date) - new Date(a.end_date);
            }

            return new Date(a.end_date) - new Date(b.end_date);
        });
    }

    saveEvent(eventData) {
        const id = eventData.id ? parseInt(eventData.id, 10) : (this.cache.events.length + 1);
        const rows = parseInt(eventData.grid_rows || 4, 10);
        const cols = parseInt(eventData.grid_cols || 4, 10);
        const total = rows * cols;

        let finalImageUrl = eventData.image_url || '/assets/images/events/halloween_maga_oscura.jpg';

        // Si se subió una imagen desde el dispositivo (Base64), guardarla como archivo físico en el servidor
        const rawBase64 = eventData.image_data || (eventData.image_url && eventData.image_url.startsWith('data:image/') ? eventData.image_url : null);
        if (rawBase64 && rawBase64.startsWith('data:image/')) {
            try {
                const matches = rawBase64.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
                if (matches && matches.length === 3) {
                    let ext = matches[1].toLowerCase();
                    if (ext === 'jpeg') ext = 'jpg';
                    const fileName = `event_${id}_${Date.now()}.${ext}`;
                    const targetDir = path.resolve(__dirname, '../../frontend/assets/images/events');
                    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
                    const filePath = path.join(targetDir, fileName);
                    fs.writeFileSync(filePath, Buffer.from(matches[2], 'base64'));
                    finalImageUrl = `/assets/images/events/${fileName}`;
                }
            } catch (err) {
                console.warn('[PUZZLE SERVICE] Error al guardar imagen subida:', err.message);
            }
        }

        const updated = {
            id: id,
            title: eventData.title || 'Evento de Rompecabezas',
            description: eventData.description || '',
            image_url: finalImageUrl,
            start_date: eventData.start_date || new Date().toISOString(),
            end_date: eventData.end_date || new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
            grid_rows: rows,
            grid_cols: cols,
            total_pieces: total,
            payout_per_leftover_piece: parseInt(eventData.payout_per_leftover_piece || 50, 10),
            drop_rate_npc: parseFloat(eventData.drop_rate_npc || 0.40),
            drop_rate_pvp: parseFloat(eventData.drop_rate_pvp || 0.75),
            prizes_config: eventData.prizes_config || DEFAULT_TOP10_PRIZES,
            is_active: eventData.is_active !== undefined ? !!eventData.is_active : true,
            created_at: eventData.created_at || new Date().toISOString()
        };

        const existingIdx = this.cache.events.findIndex(e => e.id === id);
        if (existingIdx >= 0) {
            this.cache.events[existingIdx] = updated;
        } else {
            this.cache.events.push(updated);
        }

        this.saveLocalBackup();
        return updated;
    }


    /**
     * Algoritmo probabilístico de obtención de fichas (Coupon Collector con Rarezas)
     */
    rollPiece(totalPieces = 16) {
        const weights = {};
        const keyPieces = [Math.floor(totalPieces / 2), totalPieces - 1];

        for (let i = 0; i < totalPieces; i++) {
            if (keyPieces.includes(i)) {
                weights[i] = 1.2; // Escasa / Clave (~10%)
            } else if (i % 2 === 1) {
                weights[i] = 4.0; // Poco Común (~30%)
            } else {
                weights[i] = 10.0; // Común (~60%)
            }
        }

        const indices = Object.keys(weights).map(Number);
        const totalWeight = indices.reduce((acc, idx) => acc + weights[idx], 0);
        let randomNum = Math.random() * totalWeight;

        for (let idx of indices) {
            if (randomNum < weights[idx]) {
                return idx;
            }
            randomNum -= weights[idx];
        }

        return indices[indices.length - 1];
    }

    /**
     * Entrega de ficha tras victoria de duelo
     */
    async awardDuelDrop(userId, username, isPvp = false) {
        const event = this.getActiveEvent();
        if (!event) return null;

        const now = new Date();
        if (now < new Date(event.start_date) || now > new Date(event.end_date)) {
            return null; // Evento inactivo o finalizado
        }

        const userKey = `${userId}_${event.id}`;
        const totalPieces = event.total_pieces || 16;
        const currentCountBefore = this.cache.user_pieces[userKey] ? Object.keys(this.cache.user_pieces[userKey]).length : 0;

        // Probabilidad de drop según tipo de duelo (La suerte del avatar NO influye)
        const dropRate = isPvp ? (event.drop_rate_pvp || 0.75) : (event.drop_rate_npc || 0.40);
        if (Math.random() > dropRate) {
            return {
                active: true,
                dropped: false,
                event_title: event.title,
                current_pieces_count: currentCountBefore,
                total_pieces: totalPieces
            };
        }

        const pieceIndex = this.rollPiece(event.total_pieces || 16);

        if (!this.cache.user_pieces[userKey]) {
            this.cache.user_pieces[userKey] = {};
        }

        this.cache.user_pieces[userKey][pieceIndex] = (this.cache.user_pieces[userKey][pieceIndex] || 0) + 1;
        this.saveLocalBackup();

        // Guardar en SQL Server mediante Stored Procedure
        try {
            const pool = await getPool();
            if (pool) {
                await pool.request()
                    .input('EventId', sql.Int, event.id)
                    .input('UserId', sql.Int, userId)
                    .input('PieceIndex', sql.Int, pieceIndex)
                    .execute('dbo.sp_EntregarFichaPuzzle');
            }
        } catch (e) {
            console.warn('[PUZZLE SERVICE] SQL Drop Notice:', e.message);
        }

        const currentPiecesCount = Object.keys(this.cache.user_pieces[userKey]).length;

        return {
            active: true,
            dropped: true,
            piece_index: pieceIndex,
            piece_number: pieceIndex + 1,
            event_title: event.title,
            current_pieces_count: currentPiecesCount,
            total_pieces: totalPieces,
            is_complete: currentPiecesCount >= totalPieces
        };
    }

    /**
     * Obtiene el estado del rompecabezas para un usuario
     */
    getUserPuzzleStatus(userId, eventId = null) {
        const event = eventId ? this.getEventById(eventId) : this.getActiveEvent();
        if (!event) return null;

        const userKey = `${userId}_${event.id}`;
        const pieces = this.cache.user_pieces[userKey] || {};
        const winnersList = this.cache.winners[event.id] || [];

        const userWinner = winnersList.find(w => String(w.user_id) === String(userId));
        const userExchange = this.cache.exchanges[userKey] || null;

        const totalPieces = event.total_pieces || 16;
        let unlockedCount = 0;
        let totalPiecesInInventory = 0;

        const piecesArray = [];
        for (let i = 0; i < totalPieces; i++) {
            const qty = pieces[i] || 0;
            totalPiecesInInventory += qty;
            if (qty > 0) {
                unlockedCount++;
            }
            const r = Math.floor(i / (event.grid_cols || 4));
            const c = i % (event.grid_cols || 4);
            const bgX = ((event.grid_cols || 4) > 1) ? (c / ((event.grid_cols || 4) - 1) * 100) : 0;
            const bgY = ((event.grid_rows || 4) > 1) ? (r / ((event.grid_rows || 4) - 1) * 100) : 0;

            piecesArray.push({
                index: i,
                number: i + 1,
                row: r,
                col: c,
                bg_x: Math.round(bgX * 100) / 100,
                bg_y: Math.round(bgY * 100) / 100,
                quantity: qty,
                unlocked: qty > 0
            });
        }

        const now = new Date();
        const isEventEnded = now > new Date(event.end_date) || !event.is_active;
        const isCompleted = unlockedCount >= totalPieces;

        // Cálculo de fichas sobrantes para canje
        let totalLeftoverPieces = 0;
        if (isEventEnded) {
            if (userWinner) {
                totalLeftoverPieces = Math.max(0, totalPiecesInInventory - totalPieces);
            } else {
                totalLeftoverPieces = totalPiecesInInventory;
            }
        } else {
            for (let i = 0; i < totalPieces; i++) {
                const qty = pieces[i] || 0;
                if (qty > 1) totalLeftoverPieces += (qty - 1);
            }
        }

        return {
            event: {
                id: event.id,
                title: event.title,
                description: event.description,
                image_url: event.image_url,
                start_date: event.start_date,
                end_date: event.end_date,
                grid_rows: event.grid_rows,
                grid_cols: event.grid_cols,
                total_pieces: totalPieces,
                payout_per_leftover_piece: event.payout_per_leftover_piece,
                prizes: event.prizes_config,
                is_ended: isEventEnded
            },
            progress: {
                unlocked_count: unlockedCount,
                total_pieces: totalPieces,
                percent: Math.round((unlockedCount / totalPieces) * 100),
                is_completed: isCompleted,
                has_submitted: !!userWinner,
                winner_position: userWinner ? userWinner.position : null,
                winner_prize: userWinner ? userWinner.prize : null,
                total_leftover_pieces: totalLeftoverPieces,
                has_exchanged: !!userExchange,
                exchange_data: userExchange
            },
            pieces: piecesArray,
            winners: winnersList
        };
    }

    /**
     * Registro de completar el rompecabezas (Bloquea puesto Top 10 con Stored Procedure)
     */
    async submitPuzzleCompletion(userId, username, eventId = null) {
        const event = eventId ? this.getEventById(eventId) : this.getActiveEvent();
        if (!event) return { success: false, message: 'Evento no encontrado' };

        const userKey = `${userId}_${event.id}`;
        const pieces = this.cache.user_pieces[userKey] || {};
        const totalPieces = event.total_pieces || 16;

        let unlockedCount = 0;
        for (let i = 0; i < totalPieces; i++) {
            if ((pieces[i] || 0) > 0) unlockedCount++;
        }

        if (unlockedCount < totalPieces) {
            return {
                success: false,
                message: `Aún no has completado el rompecabezas (${unlockedCount}/${totalPieces} piezas recolectadas).`
            };
        }

        if (!this.cache.winners[event.id]) {
            this.cache.winners[event.id] = [];
        }

        const existingWinner = this.cache.winners[event.id].find(w => String(w.user_id) === String(userId));
        if (existingWinner) {
            return {
                success: false,
                message: `Ya has registrado tu premio previamente (Puesto #${existingWinner.position}). Solo se permite participar 1 vez por premio.`,
                winner: existingWinner
            };
        }

        // Asignar siguiente puesto libre (1, 2, 3... 10)
        const currentWinners = this.cache.winners[event.id];
        const nextPosition = currentWinners.length + 1;
        const prizesConfig = event.prizes_config || DEFAULT_TOP10_PRIZES;
        const prizeForPosition = prizesConfig.find(p => p.place === nextPosition) || {
            place: nextPosition,
            title: `Puesto #${nextPosition}`,
            starships: 1000,
            vip_days: 0,
            badge: `TOP ${nextPosition}`
        };

        const winnerRecord = {
            event_id: event.id,
            user_id: userId,
            username: username || `Duelista #${userId}`,
            position: nextPosition,
            completed_at: new Date().toISOString(),
            prize: prizeForPosition,
            delivered: false
        };

        this.cache.winners[event.id].push(winnerRecord);
        this.saveLocalBackup();

        // Persistir en SQL Server mediante Stored Procedure
        try {
            const pool = await getPool();
            if (pool) {
                await pool.request()
                    .input('EventId', sql.Int, event.id)
                    .input('UserId', sql.Int, userId)
                    .input('Username', sql.NVarChar(100), winnerRecord.username)
                    .input('PrizeData', sql.NVarChar(sql.MAX), JSON.stringify(prizeForPosition))
                    .execute('dbo.sp_CompletarRompecabezas');
            }
        } catch (e) {
            console.warn('[PUZZLE SERVICE] SQL Winners save fallback:', e.message);
        }

        return {
            success: true,
            position: nextPosition,
            prize: prizeForPosition,
            message: `¡Felicidades! Has completado el rompecabezas en el Puesto #${nextPosition}. Tu puesto ha quedado registrado en la base de datos oficial.`
        };
    }

    /**
     * Canje de fichas sobrantes por Starships una vez finalizado el evento
     */
    async exchangeLeftoverPieces(userId, eventId = null) {
        const event = eventId ? this.getEventById(eventId) : this.getActiveEvent();
        if (!event) return { success: false, message: 'Evento no encontrado' };

        const now = new Date();
        const isEnded = now > new Date(event.end_date) || !event.is_active;
        if (!isEnded) {
            return {
                success: false,
                message: 'El canje de fichas sobrantes se habilitará una vez finalizado el evento.'
            };
        }

        const userKey = `${userId}_${event.id}`;
        if (this.cache.exchanges[userKey]) {
            return {
                success: false,
                message: 'Ya has realizado el canje de tus fichas sobrantes para este evento.'
            };
        }

        const pieces = this.cache.user_pieces[userKey] || {};
        const totalPieces = event.total_pieces || 16;
        const winnersList = this.cache.winners[event.id] || [];
        const userWinner = winnersList.find(w => String(w.user_id) === String(userId));

        let totalLeftoverPieces = 0;
        let totalPiecesInInventory = 0;

        for (let i = 0; i < totalPieces; i++) {
            totalPiecesInInventory += (pieces[i] || 0);
        }

        if (userWinner) {
            for (let i = 0; i < totalPieces; i++) {
                const qty = pieces[i] || 0;
                if (qty > 1) {
                    totalLeftoverPieces += (qty - 1);
                }
            }
        } else {
            totalLeftoverPieces = totalPiecesInInventory;
        }

        if (totalLeftoverPieces <= 0) {
            return {
                success: false,
                message: 'No tienes fichas sobrantes para canjear.'
            };
        }

        const rate = event.payout_per_leftover_piece || 50;
        const totalStarships = totalLeftoverPieces * rate;

        const exchangeRecord = {
            event_id: event.id,
            user_id: userId,
            pieces_exchanged: totalLeftoverPieces,
            starships_awarded: totalStarships,
            exchanged_at: new Date().toISOString()
        };

        this.cache.exchanges[userKey] = exchangeRecord;

        // Descontar fichas canjeadas del inventario
        if (userWinner) {
            for (let i = 0; i < totalPieces; i++) {
                if ((pieces[i] || 0) > 1) {
                    pieces[i] = 1;
                }
            }
        } else {
            for (let i = 0; i < totalPieces; i++) {
                pieces[i] = 0;
            }
        }

        this.saveLocalBackup();

        // Abonar Starships al usuario en SQL Server mediante Stored Procedure
        try {
            const pool = await getPool();
            if (pool) {
                await pool.request()
                    .input('EventId', sql.Int, event.id)
                    .input('UserId', sql.Int, userId)
                    .input('PiecesExchanged', sql.Int, totalLeftoverPieces)
                    .input('StarshipsAwarded', sql.Int, totalStarships)
                    .execute('dbo.sp_CanjearFichasSobrantesPuzzle');
            }
        } catch (e) {
            console.warn('[PUZZLE SERVICE] SQL Starships credit notice:', e.message);
        }

        return {
            success: true,
            pieces_exchanged: totalLeftoverPieces,
            starships_awarded: totalStarships,
            message: `¡Canje exitoso! Se han convertido ${totalLeftoverPieces} fichas sobrantes en ${totalStarships.toLocaleString()} Starships acreditadas a tu cuenta oficial.`
        };
    }

    /**
     * [ADMIN] REINICIAR EVENTO (Elimina fichas de usuarios, podio de ganadores y canjes para pruebas limpias)
     */
    async resetEvent(eventId) {
        const id = parseInt(eventId, 10);
        const event = this.getEventById(id);
        if (!event) return { success: false, message: 'Evento no encontrado' };

        // 1. Limpiar fichas de todos los usuarios para este evento
        if (this.cache.user_pieces) {
            const pieceKeys = Object.keys(this.cache.user_pieces).filter(k => k.endsWith(`_${id}`));
            pieceKeys.forEach(k => delete this.cache.user_pieces[k]);
        }

        // 2. Limpiar ganadores registrados del podio
        if (this.cache.winners) {
            delete this.cache.winners[id];
            this.cache.winners[id] = [];
        }

        // 3. Limpiar canjes de fichas sobrantes realizados
        if (this.cache.exchanges) {
            const exchangeKeys = Object.keys(this.cache.exchanges).filter(k => k.endsWith(`_${id}`));
            exchangeKeys.forEach(k => delete this.cache.exchanges[k]);
        }

        // 4. Restaurar vigencia y estado activo
        const now = new Date();
        const endDate = new Date(event.end_date);
        if (endDate <= now) {
            event.end_date = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30).toISOString();
        }
        event.is_active = true;

        this.saveLocalBackup();

        // 5. Limpieza en SQL Server
        try {
            const pool = await getPool();
            if (pool) {
                await pool.request()
                    .input('event_id', sql.Int, id)
                    .input('end_date', sql.DateTime2, new Date(event.end_date))
                    .query(`
                        DELETE FROM Events_Puzzle_Pieces WHERE event_id = @event_id;
                        DELETE FROM Events_Puzzle_Winners WHERE event_id = @event_id;
                        DELETE FROM Events_Puzzle_Exchanges WHERE event_id = @event_id;
                        UPDATE Events_Puzzle SET is_active = 1, end_date = @end_date WHERE id = @event_id;
                    `);
            }
        } catch (e) {
            console.warn('[PUZZLE SERVICE] SQL Reset fallback notice:', e.message);
        }

        return {
            success: true,
            event: event,
            message: `Evento #${id} ("${event.title}") reiniciado con éxito. Se eliminaron todas las fichas de los usuarios, podio Top 10 y canjes previos.`
        };
    }

    /**
     * [ADMIN] FINALIZAR EVENTO (Fuerza fin de fecha y estado para probar liquidación, canje y cierre de drops)
     */
    async finishEvent(eventId) {
        const id = parseInt(eventId, 10);
        const event = this.getEventById(id);
        if (!event) return { success: false, message: 'Evento no encontrado' };

        const now = new Date();
        event.end_date = now.toISOString();
        event.is_active = false;

        this.saveLocalBackup();

        // Persistir en SQL Server
        try {
            const pool = await getPool();
            if (pool) {
                await pool.request()
                    .input('event_id', sql.Int, id)
                    .input('end_date', sql.DateTime2, now)
                    .query(`
                        UPDATE Events_Puzzle 
                        SET end_date = @end_date, is_active = 0 
                        WHERE id = @event_id;
                    `);
            }
        } catch (e) {
            console.warn('[PUZZLE SERVICE] SQL Finish fallback notice:', e.message);
        }

        return {
            success: true,
            event: event,
            message: `Evento #${id} ("${event.title}") finalizado con éxito. Los drops de fichas han concluido y el canje por Starships ha quedado habilitado.`
        };
    }
}

const puzzleService = new PuzzleService();

module.exports = {
    puzzleService,
    DEFAULT_TOP10_PRIZES
};
