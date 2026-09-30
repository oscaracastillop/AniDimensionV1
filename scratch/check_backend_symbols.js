const fs = require('fs');

// We can run node --check or inspect undefined references
const files = [
  'backend/engine/duel-actions.js',
  'backend/engine/duel-state.js',
  'backend/engine/npc-ai.js',
  'backend/engine/ocg-engine.js'
];

files.forEach(f => {
  try {
    const code = fs.readFileSync(f, 'utf8');
    // Simple regex check for common constants or unimported symbols
    const checkSymbols = ['OFFICIAL_PHASES', 'finalizeTurnHandoffToRival', 'checkDeckOut', 'fetchCardData'];
    checkSymbols.forEach(sym => {
      if (code.includes(sym) && !code.includes(`const ${sym}`) && !code.includes(`let ${sym}`) && !code.includes(`function ${sym}`) && !code.includes(`${sym} =`) && !code.includes(` ${sym},`) && !code.includes(` ${sym}\n`) && !code.includes(` ${sym}\r`)) {
        console.log(`[POTENTIALLY UNDEFINED] "${sym}" in ${f}`);
      }
    });
  } catch (e) {
    console.error(e);
  }
});
