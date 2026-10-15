const { getPool } = require('../backend/config/db');

async function checkDecks() {
    const pool = await getPool();
    const countRes = await pool.request().query('SELECT COUNT(*) AS TotalNpcs FROM dbo.AdventureNpcs');
    console.log('Total NPCs en SQL Server:', countRes.recordset[0].TotalNpcs);

    const extraDeckRes = await pool.request().query(`SELECT COUNT(*) AS NpcsWithExtraDeck FROM dbo.AdventureNpcs WHERE ExtraDeckJson IS NOT NULL AND ExtraDeckJson != '[]'`);
    console.log('NPCs con Extra Deck (Fusiones/Sincronías):', extraDeckRes.recordset[0].NpcsWithExtraDeck);

    const sampleRes = await pool.request().query('SELECT TOP 4 Id, EraId, Name, Level, AssignedPack, DeckJson, ExtraDeckJson FROM dbo.AdventureNpcs ORDER BY Id ASC');
    console.log('\n--- MUESTRA DE LA BASE DE DATOS (Niveles Bajos) ---');
    sampleRes.recordset.forEach(r => {
        const deck = JSON.parse(r.DeckJson);
        const extra = JSON.parse(r.ExtraDeckJson || '[]');
        console.log(`[ID ${r.Id}] ${r.Name} (Nv. ${r.Level}) | Sobre: ${r.AssignedPack} | Main Deck: ${deck.length} cartas | Extra Deck: ${extra.length} cartas`);
        console.log('   Muestra Main:', deck.slice(0, 5));
        if (extra.length > 0) console.log('   Extra Deck:', extra);
    });

    const gxSample = await pool.request().query(`SELECT TOP 3 Id, EraId, Name, Level, AssignedPack, DeckJson, ExtraDeckJson FROM dbo.AdventureNpcs WHERE ExtraDeckJson != '[]' ORDER BY Id ASC`);
    console.log('\n--- MUESTRA DE NPCS CON EXTRA DECK (FUSIONES/SINCRONÍAS) ---');
    gxSample.recordset.forEach(r => {
        const deck = JSON.parse(r.DeckJson);
        const extra = JSON.parse(r.ExtraDeckJson || '[]');
        console.log(`[ID ${r.Id}] ${r.Name} (Nv. ${r.Level}) | Main Deck: ${deck.length} cartas | Extra Deck: ${extra.length} cartas`);
        console.log('   Cartas Extra Deck:', extra);
    });

    process.exit(0);
}

checkDecks().catch(e => {
    console.error(e);
    process.exit(1);
});
