/**
 * Ani-Dimension: Motor y Servicio de Torneos, Brackets OCG y Gestión de Partidas
 */
const { getPool, sql } = require('../config/db');

class TournamentService {
    constructor() {
        this.io = null;
    }

    setIo(io) {
        this.io = io;
    }

    getIo() {
        if (!this.io && global.io) return global.io;
        return this.io;
    }

    /**
     * Nombres legibles para las rondas según el número de participantes restantes
     */
    getRoundName(roundNumber, totalRounds, matchesInRound) {
        if (roundNumber === totalRounds) return 'Gran Final';
        if (roundNumber === totalRounds - 1) return 'Semifinales';
        if (roundNumber === totalRounds - 2) return 'Cuartos de Final';
        if (roundNumber === totalRounds - 3) return 'Octavos de Final';
        if (roundNumber === totalRounds - 4) return 'Dieciseisavos de Final';
        return `Ronda ${roundNumber}`;
    }

    /**
     * Genera el árbol de llaves (Bracket) completo para eliminación directa
     */
    async generateSingleEliminationBracket(torneoId) {
        const pool = await getPool();
        const tRes = await pool.request()
            .input('tId', sql.Int, torneoId)
            .query('SELECT * FROM dbo.Torneos WHERE Id = @tId');

        if (tRes.recordset.length === 0) {
            throw new Error('Torneo no encontrado.');
        }

        const torneo = tRes.recordset[0];
        const maxParticipants = torneo.MaxParticipantes || 8;

        // Obtener participantes inscritos
        const pRes = await pool.request()
            .input('tId', sql.Int, torneoId)
            .query('SELECT * FROM dbo.TorneoParticipantes WHERE TorneoId = @tId ORDER BY Seed ASC, Id ASC');

        const participants = pRes.recordset;
        if (participants.length < 2) {
            throw new Error('Se necesitan al menos 2 duelistas inscritos para generar las llaves del torneo.');
        }

        // Eliminar partidas previas si existiesen
        await pool.request()
            .input('tId', sql.Int, torneoId)
            .query('DELETE FROM dbo.TorneoPartidas WHERE TorneoId = @tId');

        // Determinar número de rondas: 4 -> 2, 8 -> 3, 16 -> 4, 32 -> 5
        let totalRounds = Math.ceil(Math.log2(maxParticipants));
        if (totalRounds < 1) totalRounds = 1;

        // Mezclar o emparejar participantes
        const seedSlots = [];
        for (let i = 0; i < maxParticipants; i++) {
            seedSlots.push(participants[i] || null);
        }

        // Estructura en memoria para almacenar IDs de partidas creadas por ronda y número de match
        // roundMatches[round][matchNum] = dbMatchId
        const createdMatches = {};

        // Obtener horarios programados por ronda si existen
        let roundSchedules = {};
        if (torneo.HorariosRondasJson) {
            try {
                const parsed = JSON.parse(torneo.HorariosRondasJson);
                if (Array.isArray(parsed)) {
                    parsed.forEach(item => {
                        if (item.ronda && item.fechaHora) {
                            roundSchedules[item.ronda] = new Date(item.fechaHora);
                        }
                    });
                }
            } catch (e) {}
        }

        // 1. Crear matches desde la Ronda Final hacia atrás para vincular NextMatchId correctamente
        for (let r = totalRounds; r >= 1; r--) {
            createdMatches[r] = {};
            const matchesInThisRound = Math.pow(2, totalRounds - r);
            const roundName = this.getRoundName(r, totalRounds, matchesInThisRound);
            const scheduledDate = roundSchedules[r] || null;

            for (let m = 1; m <= matchesInThisRound; m++) {
                const nextRound = r + 1;
                const nextMatchNum = Math.ceil(m / 2);
                const nextSlot = (m % 2 === 1) ? 1 : 2;
                const nextMatchId = (nextRound <= totalRounds && createdMatches[nextRound]) 
                    ? createdMatches[nextRound][nextMatchNum] 
                    : null;

                const roomId = `TOURNAMENT_${torneoId}_R${r}_M${m}`;

                const insertRes = await pool.request()
                    .input('tId', sql.Int, torneoId)
                    .input('ronda', sql.Int, r)
                    .input('mNum', sql.Int, m)
                    .input('rName', sql.NVarChar(50), roundName)
                    .input('roomId', sql.NVarChar(100), roomId)
                    .input('nextMatchId', sql.Int, nextMatchId)
                    .input('nextSlot', sql.Int, nextMatchId ? nextSlot : null)
                    .input('fechaProg', sql.DateTime2, scheduledDate)
                    .input('estado', sql.NVarChar(30), r === 1 ? 'LISTA' : 'PENDIENTE')
                    .query(`
                        INSERT INTO dbo.TorneoPartidas (
                            TorneoId, Ronda, NumeroMatch, RondaNombre, RoomId, NextMatchId, NextMatchSlot, FechaHoraProgramada, Estado
                        ) 
                        OUTPUT INSERTED.Id
                        VALUES (
                            @tId, @ronda, @mNum, @rName, @roomId, @nextMatchId, @nextSlot, @fechaProg, @estado
                        )
                    `);

                createdMatches[r][m] = insertRes.recordset[0].Id;
            }
        }

        // 2. Asignar participantes a la Ronda 1
        const r1MatchesCount = Math.pow(2, totalRounds - 1);
        for (let m = 1; m <= r1MatchesCount; m++) {
            const matchId = createdMatches[1][m];
            const p1 = seedSlots[(m - 1) * 2];
            const p2 = seedSlots[(m - 1) * 2 + 1];

            let estado = 'LISTA';
            let ganadorId = null;
            let ganadorUsername = null;

            // Caso BYE (jugador pasa automáticamente por falta de rival)
            if (p1 && !p2) {
                estado = 'BYE';
                ganadorId = p1.UserId;
                ganadorUsername = p1.Username;
            } else if (!p1 && p2) {
                estado = 'BYE';
                ganadorId = p2.UserId;
                ganadorUsername = p2.Username;
            } else if (!p1 && !p2) {
                estado = 'FINALIZADA';
            }

            await pool.request()
                .input('mId', sql.Int, matchId)
                .input('p1Id', sql.Int, p1 ? p1.UserId : null)
                .input('p1Name', sql.NVarChar(50), p1 ? p1.Username : null)
                .input('p1Avatar', sql.NVarChar(50), p1 ? p1.Avatar : null)
                .input('p2Id', sql.Int, p2 ? p2.UserId : null)
                .input('p2Name', sql.NVarChar(50), p2 ? p2.Username : null)
                .input('p2Avatar', sql.NVarChar(50), p2 ? p2.Avatar : null)
                .input('estado', sql.NVarChar(30), estado)
                .input('ganadorId', sql.Int, ganadorId)
                .input('ganadorUsername', sql.NVarChar(50), ganadorUsername)
                .query(`
                    UPDATE dbo.TorneoPartidas 
                    SET 
                        Player1Id = @p1Id, Player1Username = @p1Name, Player1Avatar = @p1Avatar,
                        Player2Id = @p2Id, Player2Username = @p2Name, Player2Avatar = @p2Avatar,
                        Estado = @estado, GanadorId = @ganadorId, GanadorUsername = @ganadorUsername
                    WHERE Id = @mId
                `);

            // Si hubo BYE, avanzar de inmediato a la siguiente ronda
            if (estado === 'BYE' && ganadorUsername) {
                const advanceWinner = p1 || p2;
                await this.advanceWinnerToNextMatch(matchId, advanceWinner.UserId, advanceWinner.Username, advanceWinner.Avatar);
            }
        }

        // 3. Actualizar estado del Torneo a 'EN_CURSO'
        await pool.request()
            .input('tId', sql.Int, torneoId)
            .query("UPDATE dbo.Torneos SET Estado = 'EN_CURSO', RondaActual = 1 WHERE Id = @tId");

        this.broadcastTournamentUpdate(torneoId);
        return { success: true, totalRounds, totalMatches: Object.keys(createdMatches).length };
    }

    /**
     * Avanza al ganador a la siguiente partida en el árbol
     */
    async advanceWinnerToNextMatch(currentMatchId, winnerId, winnerUsername, winnerAvatar) {
        const pool = await getPool();
        const mRes = await pool.request()
            .input('mId', sql.Int, currentMatchId)
            .query('SELECT NextMatchId, NextMatchSlot FROM dbo.TorneoPartidas WHERE Id = @mId');

        if (mRes.recordset.length === 0 || !mRes.recordset[0].NextMatchId) {
            return; // Era la final
        }

        const { NextMatchId, NextMatchSlot } = mRes.recordset[0];

        if (NextMatchSlot === 1) {
            await pool.request()
                .input('nextId', sql.Int, NextMatchId)
                .input('pId', sql.Int, winnerId)
                .input('pName', sql.NVarChar(50), winnerUsername)
                .input('pAvatar', sql.NVarChar(50), winnerAvatar || 'AVA-001')
                .query(`
                    UPDATE dbo.TorneoPartidas 
                    SET Player1Id = @pId, Player1Username = @pName, Player1Avatar = @pAvatar
                    WHERE Id = @nextId
                `);
        } else {
            await pool.request()
                .input('nextId', sql.Int, NextMatchId)
                .input('pId', sql.Int, winnerId)
                .input('pName', sql.NVarChar(50), winnerUsername)
                .input('pAvatar', sql.NVarChar(50), winnerAvatar || 'AVA-002')
                .query(`
                    UPDATE dbo.TorneoPartidas 
                    SET Player2Id = @pId, Player2Username = @pName, Player2Avatar = @pAvatar
                    WHERE Id = @nextId
                `);
        }

        // Si ambos jugadores ya están definidos en el siguiente match, marcar como 'LISTA'
        await pool.request()
            .input('nextId', sql.Int, NextMatchId)
            .query(`
                UPDATE dbo.TorneoPartidas 
                SET Estado = 'LISTA'
                WHERE Id = @nextId 
                  AND Player1Username IS NOT NULL 
                  AND Player2Username IS NOT NULL 
                  AND Estado = 'PENDIENTE'
            `);
    }

    /**
     * Resuelve el ganador de una partida del torneo
     */
    async resolveMatch(matchId, winnerUsername, loserUsername, score1 = 1, score2 = 0) {
        const pool = await getPool();
        const mRes = await pool.request()
            .input('mId', sql.Int, matchId)
            .query('SELECT * FROM dbo.TorneoPartidas WHERE Id = @mId');

        if (mRes.recordset.length === 0) {
            throw new Error('Partida de torneo no encontrada.');
        }

        const match = mRes.recordset[0];
        const torneoId = match.TorneoId;

        let winnerId = null;
        let winnerAvatar = 'AVA-001';
        let loserId = null;

        if (match.Player1Username && match.Player1Username.toLowerCase() === winnerUsername.toLowerCase()) {
            winnerId = match.Player1Id;
            winnerAvatar = match.Player1Avatar;
            loserId = match.Player2Id;
        } else if (match.Player2Username && match.Player2Username.toLowerCase() === winnerUsername.toLowerCase()) {
            winnerId = match.Player2Id;
            winnerAvatar = match.Player2Avatar;
            loserId = match.Player1Id;
        }

        // 1. Actualizar resultado de la partida
        await pool.request()
            .input('mId', sql.Int, matchId)
            .input('winnerId', sql.Int, winnerId)
            .input('winnerName', sql.NVarChar(50), winnerUsername)
            .input('loserId', sql.Int, loserId)
            .input('loserName', sql.NVarChar(50), loserUsername)
            .input('s1', sql.Int, score1)
            .input('s2', sql.Int, score2)
            .query(`
                UPDATE dbo.TorneoPartidas 
                SET 
                    GanadorId = @winnerId,
                    GanadorUsername = @winnerName,
                    PerdedorId = @loserId,
                    PerdedorUsername = @loserName,
                    Player1Score = @s1,
                    Player2Score = @s2,
                    Estado = 'FINALIZADA',
                    FinalizadoAt = SYSUTCDATETIME()
                WHERE Id = @mId
            `);

        // 2. Marcar participante perdedor como eliminado
        if (loserUsername) {
            await pool.request()
                .input('tId', sql.Int, torneoId)
                .input('loserName', sql.NVarChar(50), loserUsername)
                .input('ronda', sql.Int, match.Ronda)
                .query(`
                    UPDATE dbo.TorneoParticipantes 
                    SET Estado = 'ELIMINADO', EliminadoEnRonda = @ronda 
                    WHERE TorneoId = @tId AND Username = @loserName
                `);
        }

        // 3. Avanzar al ganador a la siguiente ronda
        if (match.NextMatchId) {
            await this.advanceWinnerToNextMatch(matchId, winnerId, winnerUsername, winnerAvatar);
        } else {
            // ¡Era la Gran Final! Coronar al campeón, subcampeón y finalizar el torneo
            await pool.request()
                .input('tId', sql.Int, torneoId)
                .input('champId', sql.Int, winnerId)
                .input('champName', sql.NVarChar(50), winnerUsername)
                .input('subChampName', sql.NVarChar(50), loserUsername || null)
                .query(`
                    UPDATE dbo.Torneos 
                    SET 
                        Estado = 'FINALIZADO',
                        CampeonUserId = @champId,
                        CampeonUsername = @champName,
                        SubcampeonUsername = @subChampName
                    WHERE Id = @tId
                `);

            await pool.request()
                .input('tId', sql.Int, torneoId)
                .input('champName', sql.NVarChar(50), winnerUsername)
                .query(`
                    UPDATE dbo.TorneoParticipantes 
                    SET Estado = 'CAMPEON' 
                    WHERE TorneoId = @tId AND Username = @champName
                `);

            console.log(`🏆 [TORNEO #${torneoId}] ¡${winnerUsername} ha ganado la Gran Final y es el nuevo Campeón!`);
        }

        this.broadcastTournamentUpdate(torneoId);
        return { success: true, isFinal: !match.NextMatchId };
    }

    /**
     * Callback invocado automáticamente cuando un duelo OCG finaliza
     */
    async onDuelEnded(roomId, winnerUsername, loserUsername) {
        if (!roomId || !roomId.startsWith('TOURNAMENT_')) return;

        try {
            const pool = await getPool();
            const mRes = await pool.request()
                .input('roomId', sql.NVarChar(100), roomId)
                .query('SELECT Id, TorneoId, Estado FROM dbo.TorneoPartidas WHERE RoomId = @roomId');

            if (mRes.recordset.length > 0) {
                const match = mRes.recordset[0];
                if (match.Estado !== 'FINALIZADA') {
                    console.log(`[TORNEO MATCH] Duelo ${roomId} finalizado. Ganador: ${winnerUsername}, Perdedor: ${loserUsername}.`);
                    await this.resolveMatch(match.Id, winnerUsername, loserUsername, 1, 0);
                }
            }
        } catch (err) {
            console.error('[TORNEO DUEL END ERROR]', err.message);
        }
    }

    /**
     * Notifica a todos los clientes conectados de cambios en un torneo
     */
    broadcastTournamentUpdate(torneoId) {
        const io = this.getIo();
        if (io) {
            io.emit('TOURNAMENT_UPDATED', { torneoId: torneoId, timestamp: Date.now() });
        }
    }

    /**
     * Obtiene el listado completo de partidas y participantes de un torneo vía Stored Procedure
     */
    async getTournamentDetails(torneoId) {
        const pool = await getPool();
        const result = await pool.request()
            .input('TorneoId', sql.Int, torneoId)
            .execute('dbo.sp_ObtenerDetalleTorneo');

        if (!result.recordsets || result.recordsets[0].length === 0) return null;

        return {
            torneo: result.recordsets[0][0],
            participantes: result.recordsets[1] || [],
            partidas: result.recordsets[2] || []
        };
    }
}

const tournamentService = new TournamentService();
module.exports = { tournamentService };
