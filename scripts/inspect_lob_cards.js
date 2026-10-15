const { getPool, sql } = require('../backend/config/db');

async function inspectLob() {
    const pool = await getPool();
    const result = await pool.request().query(`
        SELECT 
            bpc.Id,
            bpc.CardId,
            bpc.CardNumber,
            bpc.CardName,
            ISNULL(t.name_es, bpc.CardName) AS CardNameEs,
            bpc.CardType,
            bpc.Atk,
            bpc.Def,
            bpc.[Level],
            bpc.Attribute,
            bpc.Race,
            bpc.Rarity,
            bpc.Description,
            ISNULL(t.desc_es, bpc.Description) AS DescriptionEs
        FROM dbo.BoosterPackCards bpc
        LEFT JOIN dbo.texts t ON bpc.CardId = t.id
        WHERE bpc.PackId = 'LOB'
        ORDER BY bpc.Id ASC;
    `);

    const cards = result.recordset;
    console.log(`Total LOB Cards in DB: ${cards.length}`);

    const missingEsDesc = cards.filter(c => !c.DescriptionEs || c.DescriptionEs === c.Description);
    console.log(`Cards with missing/fallback Spanish desc: ${missingEsDesc.length}`);

    const types = {};
    cards.forEach(c => {
        types[c.CardType] = (types[c.CardType] || 0) + 1;
    });
    console.log('Types distribution:', types);

    // Guardar JSON de auditoría para el harness
    const fs = require('fs');
    fs.writeFileSync('./scratch/lob_126_cards_audit.json', JSON.stringify(cards, null, 2), 'utf-8');
    console.log('✅ Guardado scratch/lob_126_cards_audit.json');
    process.exit(0);
}

inspectLob().catch(err => {
    console.error(err);
    process.exit(1);
});
