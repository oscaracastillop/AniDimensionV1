const fs = require('fs');
const path = require('path');
const { getPool, sql } = require('../backend/config/db');

async function enforce193CanonicalNpcs() {
    console.log('========================================================================');
    console.log('🚀 APLICANDO PURGA DEFINITIVA: 193 DUELISTAS CANÓNICOS EN SQL SERVER');
    console.log('========================================================================');

    const pool = await getPool();

    // 1. Lista exacta de los 30 personajes no-duelistas acordados:
    // 18 de las Eras 3, 4, 6 y 7
    // 12 de las Eras 8, 9, 10 y 11
    const idsToDelete = [
        // Era 3 (Preliminares)
        34, 35, 37, 39, 41,
        // Era 4 (Dirigible & Virtual)
        49, 50, 62, 63, 64,
        // Era 6 (Orichalcos)
        74, 77, 78, 85, 86,
        // Era 7 (Memorias & Egipto)
        96, 98, 100,
        // Era 8 (GX 1)
        117, 121,
        // Era 9 (GX 2)
        141, 148, 149,
        // Era 10 (GX 3)
        173, 175, 179, 180, 181,
        // Era 11 (5Ds)
        192, 193
    ];
    const idListStr = idsToDelete.join(',');

    console.log(`[1/5] Eliminando 30 no-duelistas en cascada segura (IDs: ${idListStr})...`);

    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
        const req = new sql.Request(tx);
        await req.query(`DELETE FROM dbo.NpcDeckCards WHERE NpcId IN (${idListStr})`);
        await req.query(`DELETE FROM dbo.PackNpcAssignments WHERE NpcId IN (${idListStr})`);
        await req.query(`DELETE FROM dbo.AdventureMedals WHERE NpcId IN (${idListStr})`);
        await req.query(`DELETE FROM dbo.UserNpcRecords WHERE NpcId IN (${idListStr})`);
        await req.query(`DELETE FROM dbo.AdventureNpcs WHERE Id IN (${idListStr})`);
        await req.query(`DELETE FROM dbo.NPCs WHERE Id IN (${idListStr})`);
        await tx.commit();
        console.log('✅ Eliminación de 30 no-duelistas completada en SQL Server.');
    } catch (err) {
        await tx.rollback();
        console.error('❌ Error al eliminar no-duelistas:', err);
        throw err;
    }

    // 2. Ajuste canónico de Sherry LeBlanc y Tetsu Trudge en Era 12
    console.log('[2/5] Verificando Sherry LeBlanc (203) y Tetsu Trudge (206)...');
    await pool.request().query(`
        UPDATE dbo.NPCs
        SET Name = 'Sherry LeBlanc (Nobleza de la Rosa)',
            PortraitCode = 'sherry_leblanc',
            DeckTheme = 'Caballeros Nobles & Flor Centauro',
            KeyCards = 'Baronne de Fleur / Fleur de Chevalier',
            Quote = '¡Por el honor de mi familia y el futuro del mundo, aceleraré más allá de todo límite!',
            UpdatedAt = GETDATE()
        WHERE Id = 203;

        UPDATE dbo.AdventureNpcs
        SET Name = 'Sherry LeBlanc (Nobleza de la Rosa)',
            PortraitCode = 'sherry_leblanc',
            DeckTheme = 'Caballeros Nobles & Flor Centauro',
            KeyCards = 'Baronne de Fleur / Fleur de Chevalier',
            Quote = '¡Por el honor de mi familia y el futuro del mundo, aceleraré más allá de todo límite!'
        WHERE Id = 203;

        UPDATE dbo.NPCs
        SET Name = 'Tetsu Trudge (Seguridad de Neo Domino)',
            DeckTheme = 'Goyo Guardian & Oficiales de Seguridad',
            UpdatedAt = GETDATE()
        WHERE Id = 206;

        UPDATE dbo.AdventureNpcs
        SET Name = 'Tetsu Trudge (Seguridad de Neo Domino)',
            DeckTheme = 'Goyo Guardian & Oficiales de Seguridad'
        WHERE Id = 206;
    `);

    // 3. Rebalanceo equilibrado de los porcentajes de medallas para los 193 duelistas
    console.log('[3/5] Calibrando porcentajes de medallas (193 medallas oficiales)...');
    await pool.request().query(`
        -- Medallas regulares
        UPDATE m
        SET m.BoosterValue = CASE 
                WHEN m.BoosterType = 'exp' THEN 0.1
                WHEN m.BoosterType = 'starships' THEN 0.1
                WHEN m.BoosterType = 'luck' THEN 0.05
                ELSE 0.1
            END,
            m.DescText = CASE 
                WHEN m.BoosterType = 'exp' THEN CONCAT('+0.1% de experiencia ganada en todos los modos por derrotar a ', n.Name, '.')
                WHEN m.BoosterType = 'starships' THEN CONCAT('+0.1% de Starships ganadas en recompensas por derrotar a ', n.Name, '.')
                WHEN m.BoosterType = 'luck' THEN CONCAT('+0.05% de suerte en aperturas de sobres y drops raros por derrotar a ', n.Name, '.')
                ELSE m.DescText
            END
        FROM dbo.AdventureMedals m
        INNER JOIN dbo.NPCs n ON m.NpcId = n.Id
        WHERE ISNULL(n.IsBoss, 0) = 0;

        -- Medallas de Jefes Supremos (IsBoss = 1)
        UPDATE m
        SET m.BoosterValue = CASE 
                WHEN m.BoosterType = 'exp' THEN 0.25
                WHEN m.BoosterType = 'starships' THEN 0.25
                WHEN m.BoosterType = 'luck' THEN 0.1
                ELSE 0.25
            END,
            m.DescText = CASE 
                WHEN m.BoosterType = 'exp' THEN CONCAT('+0.25% de experiencia permanente por derrotar al Jefe Supremo ', n.Name, '.')
                WHEN m.BoosterType = 'starships' THEN CONCAT('+0.25% de Starships permanentes por derrotar al Jefe Supremo ', n.Name, '.')
                WHEN m.BoosterType = 'luck' THEN CONCAT('+0.1% de suerte permanente en drops raros por derrotar al Jefe Supremo ', n.Name, '.')
                ELSE m.DescText
            END
        FROM dbo.AdventureMedals m
        INNER JOIN dbo.NPCs n ON m.NpcId = n.Id
        WHERE n.IsBoss = 1;
    `);

    // 4. Exportar el nuevo archivo canónico JSON oficial de 193 duelistas
    console.log('[4/5] Guardando archivo canónico oficial de 193 duelistas...');
    const npcsRes = await pool.request().query(`
        SELECT n.Id, n.EraId, n.Name, n.Level, n.AvatarCode, n.PortraitCode, 
               n.LocationName, n.LocX, n.LocY, n.IsBoss, n.DeckTheme, n.KeyCards, 
               n.Quote, n.AssignedPack, n.Difficulty, n.AiLevel, n.ExpReward, n.StarshipsReward
        FROM dbo.NPCs n
        ORDER BY n.Id ASC
    `);
    const canonical193 = npcsRes.recordset;
    const destJsonPath = path.join(__dirname, '../backend/data/all-193-canonical-npcs.json');
    fs.writeFileSync(destJsonPath, JSON.stringify(canonical193, null, 2), 'utf8');

    // También actualizar all-223-canonical-npcs.json para que apunte a los 193 y nunca vuelva a desfasar
    const legacyJsonPath = path.join(__dirname, '../backend/data/all-223-canonical-npcs.json');
    fs.writeFileSync(legacyJsonPath, JSON.stringify(canonical193, null, 2), 'utf8');
    console.log(`✅ Archivos JSON sincronizados con ${canonical193.length} duelistas canónicos.`);

    // 5. Comprobar conteos en base de datos
    const totalNpcs = await pool.request().query('SELECT COUNT(*) as c FROM dbo.NPCs');
    const totalAdvNpcs = await pool.request().query('SELECT COUNT(*) as c FROM dbo.AdventureNpcs');
    const totalMedals = await pool.request().query('SELECT COUNT(*) as c FROM dbo.AdventureMedals');
    const distribution = await pool.request().query(`
        SELECT EraId, COUNT(*) as Count, MIN(Level) as MinLvl, MAX(Level) as MaxLvl 
        FROM dbo.NPCs 
        GROUP BY EraId 
        ORDER BY EraId
    `);

    console.log('========================================================================');
    console.log(`🎯 CONTEO TOTAL NPCS EN dbo.NPCs: ${totalNpcs.recordset[0].c}`);
    console.log(`🎯 CONTEO TOTAL NPCS EN dbo.AdventureNpcs: ${totalAdvNpcs.recordset[0].c}`);
    console.log(`🎯 CONTEO TOTAL MEDALLAS EN dbo.AdventureMedals: ${totalMedals.recordset[0].c}`);
    console.table(distribution.recordset);
    console.log('========================================================================');
}

enforce193CanonicalNpcs().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
