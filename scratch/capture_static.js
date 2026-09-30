const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

let html = fs.readFileSync('frontend/views/duels/npc/duel-npc.html', 'utf8');

// Replace script loading with inline script that keeps duel-app visible and hides dice-roll-modal
html = html.replace('id="dice-roll-modal" style="display:none;"', 'id="dice-roll-modal" style="display:none !important;"');
html = html.replace('id="dice-roll-modal" style="display:flex;"', 'id="dice-roll-modal" style="display:none !important;"');
html = html.replace('id="duel-app" style="display:none;"', 'id="duel-app" style="display:flex !important;"');
html = html.replace('id="duel-app" style="display:flex;"', 'id="duel-app" style="display:flex !important;"');

// Remove JS scripts at bottom to avoid modal reset
html = html.replace(/<script src="\.\.\/\.\.\/\.\.\/js\/views\/duel-npc\.js.*?<\/script>/, '<script>document.getElementById("dice-roll-modal").style.display="none"; document.getElementById("duel-app").style.display="flex";</script>');

// Fix CSS relative paths for standalone preview
html = html.replace(/href="\.\.\/\.\.\/\.\.\/css\//g, 'href="http://localhost:3005/css/');

fs.writeFileSync('scratch/duel_static_preview.html', html);

const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

execFileSync(edge, [
    '--headless',
    '--disable-gpu',
    '--window-size=1280,720',
    `--screenshot=${path.resolve('scratch/duel_board_1280.png')}`,
    '--hide-scrollbars',
    `file:///${path.resolve('scratch/duel_static_preview.html').replace(/\\/g, '/')}`
]);

console.log('Captured 1280 static');

execFileSync(edge, [
    '--headless',
    '--disable-gpu',
    '--window-size=1920,1080',
    `--screenshot=${path.resolve('scratch/duel_board_1920.png')}`,
    '--hide-scrollbars',
    `file:///${path.resolve('scratch/duel_static_preview.html').replace(/\\/g, '/')}`
]);

console.log('Captured 1920 static');
