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

// 1. Copy potenciadores from cosmic orbs image
const orbSource = path.resolve('frontend/assets/images/shop/potenciadores.png');
const brainOrbs = 'C:\\Users\\oscar.castillo\\.gemini\\antigravity-ide\\brain\\af4c1523-fa6d-48a7-a020-0117e744a7f4\\shop_potenciadores_orbs_1790425608989.jpg';
if (fs.existsSync(brainOrbs)) {
    fs.copyFileSync(brainOrbs, 'frontend/assets/images/shop/potenciadores.png');
    console.log('Copied clean cosmic potenciadores.png');
}

// 2. Render fundas (card backs)
renderHtmlToPng('frontend/assets/images/fundas_art.html', 'frontend/assets/images/shop/fundas.png', 600, 450);

// 3. Render sobres (booster packs)
renderHtmlToPng('frontend/assets/images/sobres_art.html', 'frontend/assets/images/shop/sobres.png', 600, 450);

console.log('ALL SHOP ARTWORKS RENDERED PERFECTLY!');
