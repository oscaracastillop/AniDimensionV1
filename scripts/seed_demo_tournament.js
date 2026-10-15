const { getPool, sql } = require('../backend/config/db');
const { tournamentService } = require('../backend/engine/tournament-service');

async function seedDemoTournament() {
    const pool = await getPool();

    await pool.request().query('DELETE FROM dbo.TorneoPartidas; DELETE FROM dbo.TorneoParticipantes; DELETE FROM dbo.Torneos;');

    // 1. Crear Torneo
    const createRes = await pool.request()
        .input('Titulo', sql.NVarChar(150), 'Copa Cyber Masters - Gran Torneo OCG')
        .input('Descripcion', sql.NVarChar(sql.MAX), 'Torneo oficial de eliminación directa con llaves OCG en tiempo real. ¡Demuestra tu maestría como duelista!')
        .input('BannerUrl', sql.NVarChar(500), '/assets/images/duels/pvp.jpg')
        .input('Formato', sql.NVarChar(50), 'BO1')
        .input('MaxParticipantes', sql.Int, 8)
        .input('NivelMinimo', sql.Int, 1)
        .input('NivelMaximo', sql.Int, 500)
        .input('CostoInscripcion', sql.Int, 0)
        .input('TextoPremios', sql.NVarChar(sql.MAX), '🥇 1er Lugar: ⭐ 50,000 Estrellas + Carta Ultra Rara\n🥈 2do Lugar: ⭐ 20,000 Estrellas\n🥉 Semifinalistas: ⭐ 5,000 Estrellas')
        .input('FechaInicioInscripcion', sql.DateTime2, new Date())
        .input('FechaCierreInscripcion', sql.DateTime2, new Date(Date.now() + 86400000))
        .input('FechaInicioTorneo', sql.DateTime2, new Date(Date.now() + 3600000))
        .input('HorariosRondasJson', sql.NVarChar(sql.MAX), null)
        .input('CreadoPor', sql.NVarChar(50), 'Admin')
        .execute('dbo.sp_CrearTorneo');

    const torneoId = createRes.recordset[0].TorneoId;
    console.log('Torneo creado con ID:', torneoId);

    // 2. Participantes de prueba
    const duelistas = [
        { id: 1, name: 'Seto Kaiba', avatar: 'AVA-002', level: 85, seed: 1 },
        { id: 2, name: 'Yugi Muto', avatar: 'AVA-001', level: 90, seed: 2 },
        { id: 3, name: 'Joey Wheeler', avatar: 'AVA-003', level: 75, seed: 3 },
        { id: 4, name: 'Mai Valentine', avatar: 'AVA-004', level: 70, seed: 4 },
        { id: 5, name: 'Ryo Bakura', avatar: 'AVA-005', level: 68, seed: 5 },
        { id: 6, name: 'Yami Marik', avatar: 'AVA-006', level: 82, seed: 6 },
        { id: 7, name: 'Maximillion Pegasus', avatar: 'AVA-007', level: 88, seed: 7 },
        { id: 8, name: 'Admin', avatar: 'AVA-008', level: 99, seed: 8 }
    ];

    for (const d of duelistas) {
        await pool.request()
            .input('tId', sql.Int, torneoId)
            .input('uId', sql.Int, d.id)
            .input('uName', sql.NVarChar(50), d.name)
            .input('seed', sql.Int, d.seed)
            .input('avatar', sql.NVarChar(50), d.avatar)
            .input('nivel', sql.Int, d.level)
            .query(`
                INSERT INTO dbo.TorneoParticipantes (TorneoId, UserId, Username, Seed, Avatar, Nivel, InscritoAt)
                VALUES (@tId, @uId, @uName, @seed, @avatar, @nivel, GETDATE())
            `);
    }

    // 3. Iniciar el Torneo y Generar Árbol de Llaves
    console.log('Generando árbol de llaves...');
    await tournamentService.generateSingleEliminationBracket(torneoId);

    // 4. Simular avance de un par de matches para que la visualización tenga estado variado (finalizada, en juego, pendiente)
    const matchesRes = await pool.request()
        .input('tId', sql.Int, torneoId)
        .query('SELECT * FROM dbo.TorneoPartidas WHERE TorneoId = @tId ORDER BY Ronda ASC, NumeroMatch ASC');

    const mList = matchesRes.recordset;
    console.log(`Total partidas creadas en el árbol: ${mList.length}`);

    // M1: Kaiba vs Yugi -> Ganó Kaiba 2 - 1
    const m1 = mList.find(m => m.Ronda === 1 && m.NumeroMatch === 1);
    if (m1) {
        await pool.request()
            .input('mId', sql.Int, m1.Id)
            .input('gId', sql.Int, m1.Player1Id)
            .input('gName', sql.NVarChar(50), m1.Player1Username)
            .query(`
                UPDATE dbo.TorneoPartidas 
                SET Estado = 'FINALIZADA', Player1Score = 2, Player2Score = 1, GanadorId = @gId, GanadorUsername = @gName
                WHERE Id = @mId
            `);
        await tournamentService.advanceWinnerToNextMatch(m1.Id, m1.Player1Id, m1.Player1Username, m1.Player1Avatar);
    }

    // M2: Joey vs Mai -> Ganó Mai 2 - 0
    const m2 = mList.find(m => m.Ronda === 1 && m.NumeroMatch === 2);
    if (m2) {
        await pool.request()
            .input('mId', sql.Int, m2.Id)
            .input('gId', sql.Int, m2.Player2Id)
            .input('gName', sql.NVarChar(50), m2.Player2Username)
            .query(`
                UPDATE dbo.TorneoPartidas 
                SET Estado = 'FINALIZADA', Player1Score = 0, Player2Score = 2, GanadorId = @gId, GanadorUsername = @gName
                WHERE Id = @mId
            `);
        await tournamentService.advanceWinnerToNextMatch(m2.Id, m2.Player2Id, m2.Player2Username, m2.Player2Avatar);
    }

    // M3: Bakura vs Marik -> En Combate (EN_JUEGO) 1 - 1
    const m3 = mList.find(m => m.Ronda === 1 && m.NumeroMatch === 3);
    if (m3) {
        await pool.request()
            .input('mId', sql.Int, m3.Id)
            .query(`
                UPDATE dbo.TorneoPartidas 
                SET Estado = 'EN_JUEGO', Player1Score = 1, Player2Score = 1
                WHERE Id = @mId
            `);
    }

    console.log('¡Demo tournament generado exitosamente con llaves y partidas activas!');
    await pool.close();
}

seedDemoTournament().catch(console.error);
