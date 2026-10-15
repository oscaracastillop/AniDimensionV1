const { getPool, sql } = require('../config/db');

async function cleanDatabase() {
    console.log('=== INICIANDO LIMPIEZA COMPLETA DE BASE DE DATOS ===');
    const pool = await getPool();

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        const req = new sql.Request(transaction);

        console.log('[1/10] Eliminando registros de Buzones y Regalos...');
        await req.query(`
            DELETE FROM BuzonRegalos;
            DELETE FROM BuzonRecompensas;
            DELETE FROM UserMailboxGlobalClaims;
            DELETE FROM UserMailbox;
        `);

        console.log('[2/10] Eliminando registros de Transacciones, Potenciadores y Compras...');
        await req.query(`
            DELETE FROM UserAvatarPotenciadores;
            DELETE FROM StarshipTransactions;
            DELETE FROM UserSinglePurchases;
            DELETE FROM UserVipPasses;
        `);

        console.log('[3/10] Eliminando Duelos, Puzzles, Chat y Clanes...');
        await req.query(`
            DELETE FROM HistorialDuelos;
            DELETE FROM ChatMessages;
            DELETE FROM ChatEvents;
            DELETE FROM ClanJoinRequests;
            DELETE FROM ClanMembers;
            DELETE FROM Clans;
            DELETE FROM SubastaPujas;
            DELETE FROM EventosSubasta;
            DELETE FROM TorneoPartidas;
            DELETE FROM TorneoParticipantes;
            DELETE FROM Torneos;
            DELETE FROM Events_Puzzle_Exchanges;
            DELETE FROM Events_Puzzle_Winners;
        `);

        console.log('[4/10] Eliminando Progreso de Aventura y Medallas de usuarios...');
        await req.query(`
            DELETE FROM UserAdventureProgress;
            DELETE FROM UserNpcRecords;
            DELETE FROM UserMedals;
        `);

        console.log('[5/10] Eliminando mazos y cartas de usuarios no-admin...');
        await req.query(`
            DELETE FROM DeckCards;
            DELETE FROM Decks WHERE UsuarioId <> 1;
            DELETE FROM UserCardsSql WHERE UsuarioId <> 1;
            IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'UserCards')
            BEGIN
                DELETE FROM UserCards;
            END
        `);

        console.log('[6/10] Limpiando cosméticos (Avatares, Playmats, Sleeves)...');
        await req.query(`
            DELETE FROM UserAvatars;
            DELETE FROM UserPlaymats;
            DELETE FROM UserSleeves;
        `);

        console.log('[7/10] Eliminando usuarios secundarios (manteniendo solo a Admin)...');
        await req.query(`
            DELETE FROM AvatarStats WHERE UsuarioId <> 1;
            DELETE FROM Usuarios WHERE Id <> 1;
            IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Users')
            BEGIN
                DELETE FROM Users;
            END
        `);

        console.log('[8/10] Reseteando identidades (DBCC CHECKIDENT)...');
        const emptyTablesToReseed0 = [
            'BuzonRegalos',
            'BuzonRecompensas',
            'UserMailboxGlobalClaims',
            'UserMailbox',
            'UserAvatarPotenciadores',
            'StarshipTransactions',
            'UserSinglePurchases',
            'UserVipPasses',
            'HistorialDuelos',
            'ChatMessages',
            'ChatEvents',
            'ClanJoinRequests',
            'ClanMembers',
            'Clans',
            'SubastaPujas',
            'EventosSubasta',
            'TorneoPartidas',
            'TorneoParticipantes',
            'Torneos',
            'Events_Puzzle_Exchanges',
            'Events_Puzzle_Winners',
            'UserAdventureProgress',
            'UserNpcRecords',
            'UserMedals',
            'UserAvatars',
            'UserPlaymats',
            'UserSleeves',
            'DeckCards'
        ];

        for (const tbl of emptyTablesToReseed0) {
            try {
                await req.query(`DBCC CHECKIDENT ('[dbo].[${tbl}]', RESEED, 0);`);
            } catch (err) {
                console.warn(`Aviso al resetear identity en ${tbl}:`, err.message);
            }
        }

        // Usuarios reseeded to 1 (next user will be 2)
        try {
            await req.query(`DBCC CHECKIDENT ('[dbo].[Usuarios]', RESEED, 1);`);
        } catch (err) {
            console.warn('Aviso al resetear identity en Usuarios:', err.message);
        }

        console.log('[9/10] Dejando cosméticos y valores por defecto para Admin (Id = 1)...');
        await req.query(`
            UPDATE Usuarios
            SET Nivel = 1,
                Experiencia = 0,
                Starships = 500,
                AvatarActivoId = 'AVA-001',
                FundaActivaId = 'SLV-001',
                MatActivoId = 'MAT-001',
                IsAdmin = 1,
                IsActive = 1,
                IsBanned = 0,
                BannedUntil = NULL,
                BanReason = NULL,
                VipUntil = NULL,
                ActiveSessionToken = NULL,
                IsOnline = 0,
                ClanCooldownUntil = NULL
            WHERE Id = 1;

            UPDATE AvatarStats
            SET BonusExp = 5.00,
                BonusStarships = 5.00,
                BonusSuerte = 1.00
            WHERE UsuarioId = 1;

            -- Insertar únicamente avatar por defecto para Admin
            INSERT INTO UserAvatars (UserId, AvatarCode, ExpBoost, StarshipsBoost, LuckBoost, IsActive)
            VALUES (1, 'AVA-001', 5.0, 5.0, 1.0, 1);

            -- Insertar únicamente playmat por defecto para Admin
            INSERT INTO UserPlaymats (UsuarioId, PlaymatCode)
            VALUES (1, 'MAT-001');

            -- Insertar únicamente funda por defecto para Admin
            INSERT INTO UserSleeves (UsuarioId, SleeveCode)
            VALUES (1, 'SLV-001');
        `);

        await transaction.commit();
        console.log('[10/10] ¡LIMPIEZA DE BASE DE DATOS FINALIZADA CON ÉXITO!');

    } catch (err) {
        await transaction.rollback();
        console.error('ERROR DURANTE LA LIMPIEZA:', err);
        throw err;
    }

    process.exit(0);
}

cleanDatabase().catch(err => {
    console.error(err);
    process.exit(1);
});
