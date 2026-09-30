const fs = require('fs');

const files = [
  'frontend/js/core/session.js',
  'frontend/js/core/socket.js',
  'frontend/js/duel/duel-state-client.js',
  'frontend/js/duel/duel-ui.js',
  'frontend/js/duel/duel-actions.js',
  'frontend/js/duel/duel-chains.js',
  'frontend/js/views/duel-npc.js'
];

const decls = {};

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    // Only match top-level declarations (not indented or lightly indented)
    const m = line.match(/^(?:\s{0,4})(?:let|const|var)\s+([a-zA-Z0-9_$]+)/);
    if (m) {
      const varName = m[1];
      if (!decls[varName]) decls[varName] = [];
      decls[varName].push({ file: f, line: idx + 1, statement: line.trim() });
    }
  });
});

console.log('Duplicates / collisions across top-level scripts:');
Object.keys(decls).forEach(name => {
  if (decls[name].length > 1) {
    console.log(`\nVariable "${name}" declared ${decls[name].length} times:`);
    decls[name].forEach(d => console.log(`  - ${d.file}:${d.line} -> ${d.statement}`));
  }
});
