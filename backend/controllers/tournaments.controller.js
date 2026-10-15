/**
 * Ani-Dimension: Controlador de Torneos, Brackets y Gestión de Premios
 * Implementado 100% con Procedimientos Almacenados en SQL Server (AniDimensionDB)
 */
const { getPool, sql } = require('../config/db');
const { tournamentService } = require('../engine/tournament-service');
const path = require('path');
const fs = require('fs');

/**
 * Listar torneos públicos para el Hub de Jugadores
 * SP: dbo.sp_ObtenerTorneos
 */
async function getTournaments(req, res) {
    try {
        const pool = await getPool();
        const result = await pool.request().execute('dbo.sp_ObtenerTorneos');
        return res.json({ success: true, tournaments: result.recordset });
    } catch (err) {
        console.error('[TOURNAMENT API ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al consultar torneos.' });
    }
}

/**
 * Obtener detalle completo de un torneo (Datos, Participantes, Brackets / Partidas)
 * SP: dbo.sp_ObtenerDetalleTorneo
 */
async function getTournamentById(req, res) {
    try {
        const { id } = req.params;
        const details = await tournamentService.getTournamentDetails(parseInt(id, 10));

        if (!details || !details.torneo) {
            return res.status(404).json({ success: false, message: 'Torneo no encontrado.' });
        }

        return res.json({ success: true, ...details });
    } catch (err) {
        console.error('[TOURNAMENT DETAIL ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al consultar detalle del torneo.' });
    }
}

/**
 * Inscripción de un jugador a un torneo
 * SP: dbo.sp_InscribirJugadorTorneo (Transaccional, valida nivel, cupos y descuenta Starships)
 */
async function registerPlayer(req, res) {
    try {
        const { id } = req.params;
        const { userId, username } = req.body;

        if (!userId || !username) {
            return res.status(400).json({ success: false, message: 'Usuario no autenticado.' });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('TorneoId', sql.Int, parseInt(id, 10))
            .input('UserId', sql.Int, parseInt(userId, 10))
            .input('Username', sql.NVarChar(50), username)
            .execute('dbo.sp_InscribirJugadorTorneo');

        const row = result.recordset && result.recordset[0];
        tournamentService.broadcastTournamentUpdate(parseInt(id, 10));

        return res.json({ 
            success: true, 
            message: `🎉 ¡Te has inscrito exitosamente en "${row?.TorneoTitulo || 'el torneo'}"!`,
            seed: row?.Seed || 1
        });
    } catch (err) {
        console.error('[TOURNAMENT REGISTER ERROR]', err);
        const errMsg = err.originalError?.message || err.message || 'Error al procesar la inscripción.';
        return res.status(400).json({ success: false, message: errMsg });
    }
}

/**
 * Cancelación de inscripción por parte del jugador
 * SP: dbo.sp_DesinscribirJugadorTorneo (Reembolso atómico)
 */
async function leaveTournament(req, res) {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'Usuario no autenticado.' });
        }

        const pool = await getPool();
        await pool.request()
            .input('TorneoId', sql.Int, parseInt(id, 10))
            .input('UserId', sql.Int, parseInt(userId, 10))
            .execute('dbo.sp_DesinscribirJugadorTorneo');

        tournamentService.broadcastTournamentUpdate(parseInt(id, 10));

        return res.json({ success: true, message: 'Inscripción cancelada y reembolsada exitosamente.' });
    } catch (err) {
        console.error('[TOURNAMENT LEAVE ERROR]', err);
        const errMsg = err.originalError?.message || err.message || 'Error al cancelar inscripción.';
        return res.status(400).json({ success: false, message: errMsg });
    }
}

// =========================================================================
// MÓDULO ADMINISTRADOR DE TORNEOS (STORED PROCEDURES)
// =========================================================================

/**
 * Subir imagen de banner de torneo al servidor
 */
async function uploadTournamentBanner(req, res) {
    try {
        const { imageBase64 } = req.body;
        if (!imageBase64) {
            return res.status(400).json({ success: false, message: 'No se proporcionó imagen para subir.' });
        }

        const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        const buffer = matches ? Buffer.from(matches[2], 'base64') : Buffer.from(imageBase64, 'base64');

        const uploadDir = path.resolve(__dirname, '../../frontend/assets/images/tournaments');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const safeFilename = `tournament_banner_${Date.now()}_${Math.floor(Math.random() * 1000)}.png`;
        const filePath = path.join(uploadDir, safeFilename);

        fs.writeFileSync(filePath, buffer);

        const publicUrl = `/assets/images/tournaments/${safeFilename}`;
        return res.json({
            success: true,
            url: publicUrl,
            message: 'Imagen subida exitosamente al servidor.'
        });
    } catch (err) {
        console.error('[UPLOAD BANNER ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al procesar la subida de imagen.' });
    }
}

/**
 * Crear nuevo torneo (Admin)
 * SP: dbo.sp_CrearTorneo
 */
async function createTournamentAdmin(req, res) {
    try {
        const {
            titulo,
            descripcion,
            bannerUrl,
            formato,
            maxParticipantes,
            nivelMinimo,
            nivelMaximo,
            costoInscripcion,
            textoPremios,
            fechaInicioInscripcion,
            fechaCierreInscripcion,
            fechaInicioTorneo,
            horariosRondasJson,
            creadoPor
        } = req.body;

        if (!titulo || !textoPremios) {
            return res.status(400).json({ 
                success: false, 
                message: 'El título del torneo y el detalle de premios son obligatorios.' 
            });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('Titulo', sql.NVarChar(150), titulo.trim())
            .input('Descripcion', sql.NVarChar(sql.MAX), descripcion || '')
            .input('BannerUrl', sql.NVarChar(500), bannerUrl || '/assets/images/duels/pvp.jpg')
            .input('Formato', sql.NVarChar(50), formato || 'BO1')
            .input('MaxParticipantes', sql.Int, parseInt(maxParticipantes || 8, 10))
            .input('NivelMinimo', sql.Int, parseInt(nivelMinimo || 1, 10))
            .input('NivelMaximo', sql.Int, parseInt(nivelMaximo || 500, 10))
            .input('CostoInscripcion', sql.Int, parseInt(costoInscripcion || 0, 10))
            .input('TextoPremios', sql.NVarChar(sql.MAX), textoPremios.trim())
            .input('FechaInicioInscripcion', sql.DateTime2, fechaInicioInscripcion ? new Date(fechaInicioInscripcion) : null)
            .input('FechaCierreInscripcion', sql.DateTime2, fechaCierreInscripcion ? new Date(fechaCierreInscripcion) : null)
            .input('FechaInicioTorneo', sql.DateTime2, fechaInicioTorneo ? new Date(fechaInicioTorneo) : null)
            .input('HorariosRondasJson', sql.NVarChar(sql.MAX), horariosRondasJson ? (typeof horariosRondasJson === 'string' ? horariosRondasJson : JSON.stringify(horariosRondasJson)) : null)
            .input('CreadoPor', sql.NVarChar(50), creadoPor || 'Admin')
            .execute('dbo.sp_CrearTorneo');

        const newId = result.recordset && result.recordset[0]?.TorneoId;
        tournamentService.broadcastTournamentUpdate(newId);

        return res.json({ 
            success: true, 
            message: '🏆 Torneo creado y publicado exitosamente en estado de REGISTRO.',
            torneoId: newId
        });
    } catch (err) {
        console.error('[CREATE TOURNAMENT ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al crear el torneo.' });
    }
}

/**
 * Editar torneo (Admin)
 * SP: dbo.sp_ModificarTorneo
 */
async function updateTournamentAdmin(req, res) {
    try {
        const { id } = req.params;
        const {
            titulo,
            descripcion,
            bannerUrl,
            formato,
            maxParticipantes,
            nivelMinimo,
            nivelMaximo,
            costoInscripcion,
            textoPremios,
            fechaInicioInscripcion,
            fechaCierreInscripcion,
            fechaInicioTorneo,
            horariosRondasJson
        } = req.body;

        const pool = await getPool();
        await pool.request()
            .input('TorneoId', sql.Int, parseInt(id, 10))
            .input('Titulo', sql.NVarChar(150), titulo ? titulo.trim() : '')
            .input('Descripcion', sql.NVarChar(sql.MAX), descripcion || '')
            .input('BannerUrl', sql.NVarChar(500), bannerUrl || '/assets/images/duels/pvp.jpg')
            .input('Formato', sql.NVarChar(50), formato || 'BO1')
            .input('MaxParticipantes', sql.Int, parseInt(maxParticipantes || 8, 10))
            .input('NivelMinimo', sql.Int, parseInt(nivelMinimo || 1, 10))
            .input('NivelMaximo', sql.Int, parseInt(nivelMaximo || 500, 10))
            .input('CostoInscripcion', sql.Int, parseInt(costoInscripcion || 0, 10))
            .input('TextoPremios', sql.NVarChar(sql.MAX), textoPremios ? textoPremios.trim() : '')
            .input('FechaInicioInscripcion', sql.DateTime2, fechaInicioInscripcion ? new Date(fechaInicioInscripcion) : null)
            .input('FechaCierreInscripcion', sql.DateTime2, fechaCierreInscripcion ? new Date(fechaCierreInscripcion) : null)
            .input('FechaInicioTorneo', sql.DateTime2, fechaInicioTorneo ? new Date(fechaInicioTorneo) : null)
            .input('HorariosRondasJson', sql.NVarChar(sql.MAX), horariosRondasJson ? (typeof horariosRondasJson === 'string' ? horariosRondasJson : JSON.stringify(horariosRondasJson)) : null)
            .execute('dbo.sp_ModificarTorneo');

        tournamentService.broadcastTournamentUpdate(parseInt(id, 10));

        return res.json({ success: true, message: 'Torneo actualizado exitosamente.' });
    } catch (err) {
        console.error('[UPDATE TOURNAMENT ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al actualizar el torneo.' });
    }
}

/**
 * Iniciar Torneo y Generar Brackets (Admin)
 */
async function startTournamentAdmin(req, res) {
    try {
        const { id } = req.params;
        const result = await tournamentService.generateSingleEliminationBracket(parseInt(id, 10));
        return res.json({ 
            success: true, 
            message: `🚀 ¡Torneo iniciado! Árbol de llaves generado con ${result.totalRounds} rondas.`,
            ...result
        });
    } catch (err) {
        console.error('[START TOURNAMENT ERROR]', err);
        return res.status(400).json({ success: false, message: err.message || 'Error al iniciar el torneo.' });
    }
}

/**
 * Forzar / Establecer ganador de una partida manualmente (Admin)
 */
async function setMatchWinnerAdmin(req, res) {
    try {
        const { id, matchId } = req.params;
        const { winnerUsername, loserUsername, score1, score2 } = req.body;

        if (!winnerUsername) {
            return res.status(400).json({ success: false, message: 'Debes especificar el nombre del ganador.' });
        }

        const result = await tournamentService.resolveMatch(
            parseInt(matchId, 10),
            winnerUsername,
            loserUsername || '',
            score1 !== undefined ? parseInt(score1, 10) : 1,
            score2 !== undefined ? parseInt(score2, 10) : 0
        );

        return res.json({ 
            success: true, 
            message: `✅ Partida resuelta exitosamente. Ganador oficial: ${winnerUsername}.`,
            ...result
        });
    } catch (err) {
        console.error('[SET MATCH WINNER ERROR]', err);
        return res.status(500).json({ success: false, message: err.message || 'Error al resolver la partida.' });
    }
}

/**
 * Registrar entrega directa de premios por el Administrador
 * SP: dbo.sp_EntregarPremiosTorneo
 */
async function deliverPrizesAdmin(req, res) {
    try {
        const { id } = req.params;
        const { notasEntrega } = req.body;

        const pool = await getPool();
        await pool.request()
            .input('TorneoId', sql.Int, parseInt(id, 10))
            .input('NotasEntrega', sql.NVarChar(sql.MAX), (notasEntrega || '').trim())
            .execute('dbo.sp_EntregarPremiosTorneo');

        tournamentService.broadcastTournamentUpdate(parseInt(id, 10));

        return res.json({ 
            success: true, 
            message: '🎁 Estado de entrega de premios guardado y registrado correctamente.' 
        });
    } catch (err) {
        console.error('[DELIVER PRIZES ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al registrar entrega de premios.' });
    }
}

/**
 * Eliminar torneo (Admin)
 * SP: dbo.sp_EliminarTorneo
 */
async function deleteTournamentAdmin(req, res) {
    try {
        const { id } = req.params;
        const pool = await getPool();
        await pool.request()
            .input('TorneoId', sql.Int, parseInt(id, 10))
            .execute('dbo.sp_EliminarTorneo');

        tournamentService.broadcastTournamentUpdate(parseInt(id, 10));

        return res.json({ success: true, message: 'Torneo eliminado correctamente.' });
    } catch (err) {
        console.error('[DELETE TOURNAMENT ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al eliminar torneo.' });
    }
}

module.exports = {
    getTournaments,
    getTournamentById,
    registerPlayer,
    leaveTournament,
    uploadTournamentBanner,
    createTournamentAdmin,
    updateTournamentAdmin,
    startTournamentAdmin,
    setMatchWinnerAdmin,
    deliverPrizesAdmin,
    deleteTournamentAdmin
};
