const { execFileSync } = require('child_process');
const path = require('path');
const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

execFileSync(edge, [
    '--headless',
    '--disable-gpu',
    '--window-size=1280,720',
    `--screenshot=${path.resolve('scratch/duel_preview_1280.png')}`,
    '--hide-scrollbars',
    'http://localhost:3005/views/duels/npc/duel-npc.html'
]);

execFileSync(edge, [
    '--headless',
    '--disable-gpu',
    '--window-size=1920,1080',
    `--screenshot=${path.resolve('scratch/duel_preview_1920.png')}`,
    '--hide-scrollbars',
    'http://localhost:3005/views/duels/npc/duel-npc.html'
]);

console.log('Captured via http!');
