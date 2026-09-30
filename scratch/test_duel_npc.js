const fs = require('fs');

const html = fs.readFileSync('frontend/views/duels/npc/duel-npc.html', 'utf8');
const bodyHtml = html.split('\n').slice(0, 614).join('\n');

const onEvents = bodyHtml.match(/on[a-z]+="[^"]+"/gi) || [];
const calls = new Set();
onEvents.forEach(e => {
  const code = e.replace(/on[a-z]+="/i, '').replace(/"$/, '');
  code.split(';').forEach(stmt => {
    const fnMatch = stmt.trim().match(/^([a-zA-Z0-9_$]+)\s*\(/);
    if (fnMatch) calls.add(fnMatch[1]);
  });
});
console.log('Functions called in duel-npc.html HTML:');
console.log(Array.from(calls));

// Read modular JS files and check defined functions
const jsFiles = [
  'frontend/js/core/session.js',
  'frontend/js/core/socket.js',
  'frontend/js/duel/duel-state-client.js',
  'frontend/js/duel/duel-ui.js',
  'frontend/js/duel/duel-actions.js',
  'frontend/js/duel/duel-chains.js',
  'frontend/js/views/duel-npc.js'
];

let allJsCode = '';
jsFiles.forEach(f => {
  allJsCode += '\n' + fs.readFileSync(f, 'utf8');
});

const definedFuncs = new Set();
const funcMatches = allJsCode.match(/(?:function\s+([a-zA-Z0-9_$]+)|window\.([a-zA-Z0-9_$]+)\s*=)/g) || [];
funcMatches.forEach(m => {
  const clean = m.replace(/function\s+/, '').replace(/window\./, '').replace(/\s*=/, '').trim();
  if (clean) definedFuncs.add(clean);
});

console.log('\nMissing functions:');
Array.from(calls).forEach(c => {
  if (!definedFuncs.has(c)) {
    console.log(' - MISSING:', c);
  } else {
    console.log(' + OK:', c);
  }
});
