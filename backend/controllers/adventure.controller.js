const { getPool, sql } = require('../config/db');

/**
 * Obtener estado de campaña / aventura de un usuario
 * 100% CONSULTADO DESDE SQL SERVER (Cero archivos JS)
 */
async function getAdventureState(req, res) {
    try {
        let userId = parseInt(req.query.userId || 0, 10);
        const username = req.query.username || '';

        const pool = await getPool();

        // Si userId es 999 o 0, resolver al Admin real (Id: 1) o buscar por Username
        if (userId === 999 || (!userId && username)) {
            const uFind = await pool.request()
                .input('uname', sql.VarChar(50), username || 'Admin')
                .query(`SELECT Id, IsAdmin FROM dbo.Usuarios WHERE LOWER(Username) = LOWER(@uname) OR Id = 1 ORDER BY Id ASC`);
            if (uFind.recordset.length > 0) {
                userId = uFind.recordset[0].Id;
            } else {
                userId = 1;
            }
        }

        if (!userId) {
            return res.status(400).json({ success: false, message: 'Usuario requerido' });
        }

        // 0. Validar si el usuario existe en dbo.Usuarios
        let isUserAdmin = false;
        let playerLevel = 1;
        const userCheck = await pool.request()
            .input('uid', sql.Int, userId)
            .query(`
                SELECT Id, ISNULL(IsAdmin, 0) AS IsAdmin, ISNULL(Nivel, 1) AS Nivel
                FROM dbo.Usuarios 
                WHERE Id = @uid
            `);

        if (userCheck.recordset.length > 0) {
            const uRow = userCheck.recordset[0];
            if (uRow.IsAdmin) isUserAdmin = true;
            playerLevel = parseInt(uRow.Nivel || 1, 10);
        } else {
            return res.json({
                success: true,
                maxNpcUnlocked: 1,
                playerLevel: 1,
                records: {},
                unlockedMedalsCount: 0,
                unlockedMedalIds: [],
                bonuses: { exp: 0, starships: 0, luck: 0 },
                packAssignments: {}
            });
        }

        // 1. Obtener progreso máximo desbloqueado (1 a 223)
        let maxUnlocked = 1;
        const progRes = await pool.request()
            .input('uid', sql.Int, userId)
            .query(`SELECT MaxNpcUnlocked FROM dbo.UserAdventureProgress WHERE UserId = @uid`);

        if (progRes.recordset.length > 0) {
            maxUnlocked = progRes.recordset[0].MaxNpcUnlocked || 1;
        } else {
            await pool.request()
                .input('uid', sql.Int, userId)
                .input('maxNpc', sql.Int, 1)
                .query(`INSERT INTO dbo.UserAdventureProgress (UserId, MaxNpcUnlocked, UpdatedAt) VALUES (@uid, @maxNpc, GETDATE())`);
        }

        // 2. Obtener récords de duelos contra cada NPC
        const recRes = await pool.request()
            .input('uid', sql.Int, userId)
            .query(`SELECT NpcId, Wins, Losses, BestTurns, LastDefeatedAt FROM dbo.UserNpcRecords WHERE UserId = @uid`);
        
        const recordsMap = {};
        recRes.recordset.forEach(r => {
            recordsMap[r.NpcId] = {
                wins: r.Wins,
                losses: r.Losses,
                bestTurns: r.BestTurns,
                lastDefeatedAt: r.LastDefeatedAt
            };
        });

        // 3. Obtener medallas y multiplicadores calculados directamente en SQL mediante Stored Procedure
        const medRes = await pool.request()
            .input('UserId', sql.Int, userId)
            .execute('dbo.sp_ObtenerMedallasUsuario');

        const summaryRow = (medRes.recordsets[0] && medRes.recordsets[0][0]) || {
            TotalExpBonus: 0,
            TotalStarshipsBonus: 0,
            TotalLuckBonus: 0,
            TotalUnlockedMedals: 0
        };
        const unlockedList = (medRes.recordsets[1] || []).map(m => m.id);

        // 4. Obtener asignaciones de sobres por NPC desde dbo.PackNpcAssignments
        const packAssignRes = await pool.request().query(`SELECT PackId, NpcId FROM dbo.PackNpcAssignments`);
        const packAssignmentsMap = {};
        packAssignRes.recordset.forEach(p => {
            packAssignmentsMap[p.NpcId] = p.PackId;
        });

        return res.json({
            success: true,
            maxNpcUnlocked: maxUnlocked,
            playerLevel: playerLevel,
            records: recordsMap,
            unlockedMedalsCount: summaryRow.TotalUnlockedMedals || unlockedList.length,
            unlockedMedalIds: unlockedList,
            bonuses: {
                exp: Math.round(Number(summaryRow.TotalExpBonus) * 100) / 100,
                starships: Math.round(Number(summaryRow.TotalStarshipsBonus) * 100) / 100,
                luck: Math.round(Number(summaryRow.TotalLuckBonus) * 1000) / 1000
            },
            packAssignments: packAssignmentsMap
        });
    } catch (err) {
        console.error('[API /api/adventure/state ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al consultar aventura desde base de datos' });
    }
}

/**
 * Registrar resultado de duelo contra NPC y desbloquear siguiente NPC / Medalla
 * 100% TRANSACCIONAL EN SQL SERVER (sp_RegistrarVictoriaNpc)
 */
async function recordNpcDuel(req, res) {
    try {
        const { userId, npcId, isWinner, turns } = req.body;
        let uid = parseInt(userId, 10);
        if (uid === 999) uid = 1;
        const nid = parseInt(npcId, 10);
        const turnsCount = Math.max(1, parseInt(turns || 10, 10));

        if (!uid || !nid) {
            return res.status(400).json({ success: false, message: 'Parámetros inválidos' });
        }

        const pool = await getPool();
        const spResult = await pool.request()
            .input('UserId', sql.Int, uid)
            .input('NpcId', sql.Int, nid)
            .input('Turns', sql.Int, turnsCount)
            .input('IsWinner', sql.Bit, isWinner ? 1 : 0)
            .execute('dbo.sp_RegistrarVictoriaNpc');

        const row = (spResult.recordset && spResult.recordset[0]) || {};

        if (!row.Success) {
            return res.status(500).json({ success: false, message: row.Message || 'Error en procedimiento de victoria NPC' });
        }

        let unlockedMedal = null;
        if (row.MedalUnlocked && row.UnlockedMedalCode) {
            unlockedMedal = {
                id: row.UnlockedMedalCode,
                name: row.UnlockedMedalName || 'Medalla Conquistada',
                desc: row.UnlockedMedalDesc || row.MedalDescription || '¡Has derrotado con honores a este duelista legendario!',
                npcId: nid
            };
        }

        return res.json({
            success: true,
            isWinner: !!row.IsWinner,
            isFirstTimeWin: !!row.IsFirstTimeWin,
            unlockedMedal: unlockedMedal,
            isNewNpcUnlocked: !!row.IsNewNpcUnlocked,
            nextNpcId: row.MaxNpcUnlocked || nid
        });
    } catch (err) {
        console.error('[API /api/adventure/defeat-npc ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al registrar duelo de aventura' });
    }
}

/**
 * Obtener asignaciones de sobres para NPCs
 */
async function getPackAssignments(req, res) {
    try {
        const pool = await getPool();
        const results = await pool.request().query(`SELECT PackId, NpcId FROM dbo.PackNpcAssignments`);
        return res.json({ success: true, assignments: results.recordset });
    } catch (err) {
        console.error('[API /api/adventure/pack-assignments ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al obtener asignaciones' });
    }
}

/**
 * Actualizar asignaciones de sobres para NPCs (Panel Admin)
 */
async function updatePackAssignments(req, res) {
    try {
        const { packId, npcIds } = req.body;
        if (!packId || !Array.isArray(npcIds)) {
            return res.status(400).json({ success: false, message: 'Parámetros inválidos' });
        }

        const pool = await getPool();

        // 1. Eliminar asignaciones anteriores de este sobre
        await pool.request()
            .input('packId', sql.VarChar(20), packId)
            .query(`DELETE FROM dbo.PackNpcAssignments WHERE PackId = @packId`);

        // 2. Insertar nuevas asignaciones
        for (const nid of npcIds) {
            const npcNum = parseInt(nid, 10);
            if (npcNum >= 1 && npcNum <= 223) {
                await pool.request()
                    .input('packId', sql.VarChar(20), packId)
                    .input('nid', sql.Int, npcNum)
                    .query(`
                        IF NOT EXISTS (SELECT 1 FROM dbo.PackNpcAssignments WHERE PackId = @packId AND NpcId = @nid)
                            INSERT INTO dbo.PackNpcAssignments (PackId, NpcId) VALUES (@packId, @nid)
                    `);
            }
        }

        return res.json({
            success: true,
            message: `Asignación de NPCs para el sobre "${packId}" actualizada exitosamente.`
        });
    } catch (err) {
        console.error('[API /api/adventure/pack-assignments PUT ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al actualizar asignaciones' });
    }
}

/**
 * Obtener catálogo completo de 12 Eras y 223 NPCs directamente desde SQL Server
 * (dbo.sp_ObtenerCatalogoAventura)
 */
async function getAdventureCatalog(req, res) {
    try {
        const pool = await getPool();
        const result = await pool.request().execute('dbo.sp_ObtenerCatalogoAventura');

        const rawEras = result.recordsets[0] || [];
        const rawNpcs = result.recordsets[1] || [];
        const rawMedals = result.recordsets[2] || [];

        const eras = rawEras.map(e => ({
            id: e.Id,
            Id: e.Id,
            code: e.Code,
            series: e.Series,
            title: e.Title,
            subtitle: e.Subtitle,
            desc: e.desc || e.DescText,
            icon: e.Icon,
            bgTheme: e.BgTheme,
            levelRange: e.LevelRange,
            assignedPack: e.AssignedPack
        }));

        const medals = rawMedals.map(m => ({
            id: m.id || m.Id,
            Id: m.Id,
            npcId: m.NpcId,
            NpcId: m.NpcId,
            eraId: m.EraId,
            name: m.Name,
            icon: m.Icon,
            desc: m.desc,
            boosterType: m.BoosterType ? m.BoosterType.toLowerCase() : 'exp',
            boosterValue: m.BoosterValue,
            requirement: m.Requirement
        }));

        // Consultar mazos completos desde la tabla hija dbo.NpcDeckCards para respuesta consolidada si el cliente lo requiere
        const npcsMap = new Map();
        rawNpcs.forEach(n => {
            npcsMap.set(n.Id, {
                id: n.Id,
                eraId: n.EraId,
                name: n.Name,
                level: n.Level,
                avatar: n.AvatarCode || n.avatar || 'AVA-001',
                avatarCode: n.AvatarCode || n.avatar || 'AVA-001',
                portrait: n.PortraitCode || n.portrait || 'yugi_muto',
                portraitCode: n.PortraitCode || n.portrait || 'yugi_muto',
                locationName: n.LocationName,
                locX: n.LocX,
                locY: n.LocY,
                isBoss: !!n.IsBoss,
                deckTheme: n.DeckTheme,
                keyCards: n.KeyCards,
                quote: n.Quote,
                assignedPack: n.AssignedPack,
                difficulty: n.Difficulty,
                aiLevel: n.AiLevel,
                expReward: n.ExpReward,
                starshipsReward: n.StarshipsReward,
                deck: [],
                extraDeck: []
            });
        });

        // Cargar cartas asociadas por NPC desde dbo.NpcDeckCards
        const cardsRes = await pool.request().query(`
            SELECT NpcId, CardCode, Section, SlotOrder 
            FROM dbo.NpcDeckCards 
            ORDER BY NpcId, Section, SlotOrder
        `);

        cardsRes.recordset.forEach(c => {
            const npc = npcsMap.get(c.NpcId);
            if (npc) {
                if (c.Section === 'MAIN') {
                    npc.deck.push(c.CardCode);
                } else if (c.Section === 'EXTRA') {
                    npc.extraDeck.push(c.CardCode);
                }
            }
        });

        return res.json({
            success: true,
            eras: eras,
            npcs: Array.from(npcsMap.values()),
            medals: medals
        });
    } catch (err) {
        console.error('[API /api/adventure/catalog ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al consultar catálogo de aventura desde SQL Server' });
    }
}

/**
 * Obtener detalle de un NPC específico con su mazo desde SQL Server
 * (dbo.sp_ObtenerDeckNpc)
 */
async function getNpcDetail(req, res) {
    try {
        const npcId = parseInt(req.params.id, 10);
        if (!npcId) return res.status(400).json({ success: false, message: 'ID inválido' });

        const pool = await getPool();
        const result = await pool.request()
            .input('NpcId', sql.Int, npcId)
            .execute('dbo.sp_ObtenerDeckNpc');

        const headerRow = result.recordsets[0] && result.recordsets[0][0];
        if (!headerRow) {
            return res.status(404).json({ success: false, message: 'NPC no encontrado en base de datos' });
        }

        const cardsList = result.recordsets[1] || [];
        const mainDeck = [];
        const extraDeck = [];

        cardsList.forEach(c => {
            if (c.Section === 'MAIN') mainDeck.push(c.CardCode);
            else if (c.Section === 'EXTRA') extraDeck.push(c.CardCode);
        });

        return res.json({
            success: true,
            npc: {
                id: headerRow.Id,
                eraId: headerRow.EraId,
                name: headerRow.Name,
                level: headerRow.Level,
                avatar: headerRow.AvatarCode || headerRow.avatar || 'AVA-001',
                avatarCode: headerRow.AvatarCode || headerRow.avatar || 'AVA-001',
                portrait: headerRow.PortraitCode || headerRow.portrait || 'yugi_muto',
                portraitCode: headerRow.PortraitCode || headerRow.portrait || 'yugi_muto',
                locationName: headerRow.LocationName,
                locX: headerRow.LocX,
                locY: headerRow.LocY,
                isBoss: !!headerRow.IsBoss,
                deckTheme: headerRow.DeckTheme,
                keyCards: headerRow.KeyCards,
                quote: headerRow.Quote,
                assignedPack: headerRow.AssignedPack,
                difficulty: headerRow.Difficulty,
                aiLevel: headerRow.AiLevel,
                expReward: headerRow.ExpReward,
                starshipsReward: headerRow.StarshipsReward,
                deck: mainDeck,
                extraDeck: extraDeck,
                cardsDetail: cardsList
            }
        });
    } catch (err) {
        console.error('[API /api/adventure/npc/:id ERROR]', err);
        return res.status(500).json({ success: false, message: 'Error al obtener detalle de NPC desde base de datos' });
    }
}

module.exports = {
    getAdventureState,
    recordNpcDuel,
    getPackAssignments,
    updatePackAssignments,
    getAdventureCatalog,
    getNpcDetail
};
