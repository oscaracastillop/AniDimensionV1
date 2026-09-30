const fs = require('fs');
const html = fs.readFileSync('frontend/views/duels/npc/duel-npc.html', 'utf8');
const lines = html.split('\n').slice(0, 614);
const ids = [];
lines.forEach((l, i) => {
  const m = l.match(/id="([^"]+)"/g);
  if (m) m.forEach(x => ids.push(x.replace('id="', '').replace('"', '')));
});
console.log('Total IDs found in first 614 lines:', ids.length);
console.log('Key IDs present:');
['dice-roll-modal', 'game-over-modal', 'duel-app', 'die-player-cube', 'die-npc-cube', 'btn-roll-dice', 'dice-actions-container', 'dice-choice-container'].forEach(id => {
  console.log(` - ${id}: ${ids.includes(id) ? 'FOUND' : 'MISSING'}`);
});
