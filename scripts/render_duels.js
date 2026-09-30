const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function renderHtmlToPng(htmlPath, pngPath, width = 600, height = 450) {
    const fileUrl = 'file:///' + path.resolve(htmlPath).replace(/\\/g, '/');
    const outPath = path.resolve(pngPath);
    console.log(`Rendering ${fileUrl} -> ${outPath}`);
    execFileSync(edge, [
        '--headless',
        '--disable-gpu',
        `--window-size=${width},${height}`,
        `--screenshot=${outPath}`,
        '--hide-scrollbars',
        fileUrl
    ]);
    console.log(`Success: ${outPath} (${fs.statSync(outPath).size} bytes)`);
}

// Render catalog and tournaments for duels
renderHtmlToPng('frontend/assets/images/catalog_art.html', 'frontend/assets/images/duels/catalog.jpg', 600, 350);
renderHtmlToPng('frontend/assets/images/tournaments_art.html', 'frontend/assets/images/duels/tournaments.jpg', 600, 350);

console.log('ALL DUELS ARTWORKS RENDERED CLEANLY WITH AD LOGO!');
