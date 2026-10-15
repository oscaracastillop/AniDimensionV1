const fs = require('fs');
const path = require('path');
const { getCardEffect, hasCardEffect } = require('../backend/engine/card-registry');

const audit = JSON.parse(fs.readFileSync('./scratch/lob_non_vanilla.json', 'utf8'));

console.log('=== VERIFICANDO MÓDULOS DE EFECTO PARA CARTAS LOB ===');

const withEffects = audit.filter(c => c.CardType !== 'Normal Monster');
console.log(`Cartas que requieren lógica / efecto: ${withEffects.length}`);

const report = [];

withEffects.forEach(c => {
    const hasMod = hasCardEffect(c.CardId);
    const mod = getCardEffect(c.CardId);
    const hooks = mod ? Object.keys(mod).filter(k => typeof mod[k] === 'function') : [];
    
    report.push({
        id: c.CardId,
        name: c.CardName,
        name_es: c.CardNameEs,
        type: c.CardType,
        hasModule: hasMod,
        hooks: hooks
    });
});

const missingMods = report.filter(r => !r.hasModule);
console.log(`Cartas con módulo de efecto: ${report.length - missingMods.length} / ${report.length}`);
console.log(`Cartas SIN módulo de efecto: ${missingMods.length}`);

if (missingMods.length > 0) {
    console.log('\n--- FALTANTES EN card_effects/ ---');
    missingMods.forEach(m => console.log(`- [${m.id}] ${m.name} (${m.type})`));
}

fs.writeFileSync('./scratch/lob_effects_status.json', JSON.stringify(report, null, 2), 'utf8');
