const { getPool, sql } = require('../config/db');

async function testSecurity() {
    try {
        const pool = await getPool();

        console.log('--- 1. Testing BoosterPacks Status in DB ---');
        const packsRes = await pool.request().query('SELECT PackId, Name, IsActive FROM dbo.BoosterPacks');
        const active = packsRes.recordset.filter(p => p.IsActive);
        console.log('Total Packs in DB:', packsRes.recordset.length);
        console.log('Active Packs in DB:', active.map(p => p.PackId));

        console.log('\n--- 2. Testing sp_ComprarYGuardarSobre directly for Inactive Pack (MRD) ---');
        try {
            await pool.request()
                .input('UsuarioId', sql.Int, 1)
                .input('PackId', sql.NVarChar(50), 'MRD')
                .input('Costo', sql.Int, 500)
                .input('CardsJson', sql.NVarChar(sql.MAX), JSON.stringify([{ card_id: 25833572, rarity: 'COMMON' }]))
                .execute('dbo.sp_ComprarYGuardarSobre');
            console.error('FAILED: Inactive pack was allowed to be bought!');
        } catch (err) {
            console.log('PASSED: Inactive pack purchase blocked correctly by DB:', err.message);
        }

        console.log('\n--- 3. Testing sp_ComprarYGuardarSobre for Active Pack (LOB) ---');
        const lobRes = await pool.request()
            .input('UsuarioId', sql.Int, 1)
            .input('PackId', sql.NVarChar(50), 'LOB')
            .input('Costo', sql.Int, 500)
            .input('CardsJson', sql.NVarChar(sql.MAX), JSON.stringify([{ card_id: 89631139, rarity: 'ULTRA_RARE' }]))
            .execute('dbo.sp_ComprarYGuardarSobre');
        console.log('PASSED: LOB pack purchased successfully:', lobRes.recordset[0]);

        console.log('\n--- 4. Testing sp_SaveUserDeck & sp_GetUserDecks ---');
        await pool.request()
            .input('UsuarioId', sql.Int, 1)
            .input('Nombre', sql.NVarChar(100), 'Mazo Torneo SQL')
            .input('MainDeckJson', sql.NVarChar(sql.MAX), JSON.stringify([89631139, 39111158]))
            .input('ExtraDeckJson', sql.NVarChar(sql.MAX), JSON.stringify([]))
            .input('SideDeckJson', sql.NVarChar(sql.MAX), JSON.stringify([]))
            .input('IsActive', sql.Bit, 1)
            .execute('dbo.sp_SaveUserDeck');
        
        const decksRes = await pool.request()
            .input('UsuarioId', sql.Int, 1)
            .execute('dbo.sp_GetUserDecks');
        console.log('PASSED: Decks in SQL Server:', decksRes.recordset.length, decksRes.recordset[0].Nombre);

        console.log('\n--- 5. Testing sp_GetUserCosmetics ---');
        const cosRes = await pool.request()
            .input('UsuarioId', sql.Int, 1)
            .execute('dbo.sp_GetUserCosmetics');
        console.log('PASSED: Active cosmetics from DB:', cosRes.recordsets[3] || cosRes.recordsets[0]);

        console.log('\n--- ALL SQL SERVER STORED PROCEDURE SECURITY TESTS COMPLETED ---');
        process.exit(0);
    } catch (err) {
        console.error('Test error:', err);
        process.exit(1);
    }
}

testSecurity();
