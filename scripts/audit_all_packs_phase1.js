/**
 * PASE 1: Auditoría exhaustiva de todos los sobres activos en Ani Dimension.
 * Identifica cartas totales, monstruos normales, efectos implementados y stubs.
 */
const fs = require('fs');
const path = require('path');
const { getPool } = require('../backend/config/db');

async function auditAllPacks() {
    const pool = await getPool();
    const packsRes = await pool.request().query('SELECT PackId, Name FROM dbo.BoosterPacks WHERE IsActive = 1 ORDER BY Series, PackId');
    const packs = packsRes.recordset;
    const effectDir = path.resolve(__dirname, '../backend/engine/card_effects');

    console.log('================================================================');
    console.log('PASE 1: AUDITORÍA DE SOBRES Y DETECCIÓN DE EFECTOS / STUBS');
    console.log('================================================================\n');

    const packSummary = [];

    for (const p of packs) {
        const cardsRes = await pool.request().query(
            `SELECT CardId, CardNumber, CardName, CardType
             FROM dbo.BoosterPackCards
             WHERE PackId = '${p.PackId}'
             ORDER BY Id ASC`
        );
        const cards = cardsRes.recordset;
        let normalCount = 0;
        let effectCount = 0;
        let stubsCount = 0;
        let realCount = 0;
        let missingCount = 0;
        const stubsList = [];

        cards.forEach(c => {
            const isNormal = c.CardType === 'Normal Monster' || (c.CardType && c.CardType.includes('Normal Monster'));
            if (isNormal) {
                normalCount++;
            } else {
                effectCount++;
                const fPath = path.join(effectDir, `c${c.CardId}.js`);
                if (!fs.existsSync(fPath)) {
                    missingCount++;
                    stubsList.push({ id: c.CardId, num: c.CardNumber, name: c.CardName, reason: 'MISSING' });
                } else {
                    const content = fs.readFileSync(fPath, 'utf8');
                    const isStub = content.includes('Activación de Efecto General Reglamentario') || 
                                   content.includes('Auto-implementado') || 
                                   content.includes('GENERIC_STUB') ||
                                   (content.includes('return { success: true }') && !content.includes('duelState.') && !content.includes('effectUtils.'));
                    if (isStub) {
                        stubsCount++;
                        stubsList.push({ id: c.CardId, num: c.CardNumber, name: c.CardName, reason: 'STUB' });
                    } else {
                        realCount++;
                    }
                }
            }
        });

        packSummary.push({
            PackId: p.PackId,
            Name: p.Name,
            Total: cards.length,
            Normal: normalCount,
            EffectsTotal: effectCount,
            RealEffects: realCount,
            StubsOrMissing: stubsCount + missingCount
        });

        if (stubsList.length > 0) {
            fs.writeFileSync(`scratch/stubs_${p.PackId}.json`, JSON.stringify(stubsList, null, 2));
        }
    }

    console.table(packSummary);
    fs.writeFileSync('scratch/packs_audit_summary.json', JSON.stringify(packSummary, null, 2));
    process.exit(0);
}

auditAllPacks().catch(err => {
    console.error('Error en Pase 1:', err);
    process.exit(1);
});
