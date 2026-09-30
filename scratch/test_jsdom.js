const fs = require('fs');

// We test if all the JS files parse without syntax error
const jsFiles = [
  'frontend/js/core/session.js',
  'frontend/js/core/socket.js',
  'frontend/js/duel/duel-state-client.js',
  'frontend/js/duel/duel-ui.js',
  'frontend/js/duel/duel-actions.js',
  'frontend/js/duel/duel-chains.js',
  'frontend/js/views/duel-npc.js'
];

jsFiles.forEach(f => {
  try {
    const code = fs.readFileSync(f, 'utf8');
    new Function(code);
    console.log(`[SYNTAX OK] ${f}`);
  } catch (e) {
    console.error(`[SYNTAX ERROR] in ${f}:`, e.message);
  }
});
