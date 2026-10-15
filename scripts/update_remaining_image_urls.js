const fs = require('fs');
const path = require('path');

const CDN_SMALL = 'https://images.ygoprodeck.com/images/cards_small/';
const CDN_LARGE = 'https://images.ygoprodeck.com/images/cards/';
const FALLBACK = '/assets/card_back.jpg';

// 1. packs-data.js
const packsPath = path.join(__dirname, '../frontend/js/data/packs-data.js');
if (fs.existsSync(packsPath)) {
    let content = fs.readFileSync(packsPath, 'utf8');
    content = content.replace(/"\.\.\/\.\.\/assets\/images\/cards\/(\d+)\.jpg"/g, `"${CDN_SMALL}$1.jpg"`);
    fs.writeFileSync(packsPath, content, 'utf8');
    console.log('✓ packs-data.js actualizado');
}

// 2. cartas-singles-data.js
const singlesPath = path.join(__dirname, '../frontend/js/data/cartas-singles-data.js');
if (fs.existsSync(singlesPath)) {
    let content = fs.readFileSync(singlesPath, 'utf8');
    content = content.replace(/(\.\.\/)*assets\/images\/cards\/(\d+)\.jpg/g, `${CDN_SMALL}$2.jpg`);
    fs.writeFileSync(singlesPath, content, 'utf8');
    console.log('✓ cartas-singles-data.js actualizado');
}

// 3. duel-chains.js
const chainsPath = path.join(__dirname, '../frontend/js/duel/duel-chains.js');
if (fs.existsSync(chainsPath)) {
    let content = fs.readFileSync(chainsPath, 'utf8');
    content = content.replace(/\.\.\/\.\.\/\.\.\/assets\/images\/cards\/\${([^}]+)}\.jpg/g, `${CDN_SMALL}\${$1}.jpg`);
    fs.writeFileSync(chainsPath, content, 'utf8');
    console.log('✓ duel-chains.js actualizado');
}

// 4. profile.js
const profilePath = path.join(__dirname, '../frontend/js/views/profile.js');
if (fs.existsSync(profilePath)) {
    let content = fs.readFileSync(profilePath, 'utf8');
    content = content.replace(/\.\.\/\.\.\/assets\/images\/cards\/\${([^}]+)}\.jpg/g, `${CDN_SMALL}\${$1}.jpg`);
    fs.writeFileSync(profilePath, content, 'utf8');
    console.log('✓ profile.js actualizado');
}

// 5. shop-sobres.js
const sobresPath = path.join(__dirname, '../frontend/js/views/shop-sobres.js');
if (fs.existsSync(sobresPath)) {
    let content = fs.readFileSync(sobresPath, 'utf8');
    content = content.replace(/\.\.\/\.\.\/assets\/images\/cards\/89631139\.jpg/g, `${CDN_SMALL}89631139.jpg`);
    fs.writeFileSync(sobresPath, content, 'utf8');
    console.log('✓ shop-sobres.js actualizado');
}

// 6. admin-cards-detail.js
const adminCardsDetailPath = path.join(__dirname, '../frontend/js/views/admin-cards-detail.js');
if (fs.existsSync(adminCardsDetailPath)) {
    let content = fs.readFileSync(adminCardsDetailPath, 'utf8');
    content = content.replace(/\.\.\/\.\.\/\.\.\/assets\/images\/cards\/\${c\.card_id}\.jpg/g, `${CDN_SMALL}\${c.card_id}.jpg`);
    fs.writeFileSync(adminCardsDetailPath, content, 'utf8');
    console.log('✓ admin-cards-detail.js actualizado');
}

// 7. admin-subasta.js
const adminSubastaPath = path.join(__dirname, '../frontend/js/views/admin-subasta.js');
if (fs.existsSync(adminSubastaPath)) {
    let content = fs.readFileSync(adminSubastaPath, 'utf8');
    content = content.replace(/\/assets\/images\/cards\/\${([^}]+)}\.jpg/g, `${CDN_SMALL}\${$1}.jpg`);
    content = content.replace(/\/assets\/images\/cards\/ava-002\.png/g, FALLBACK);
    fs.writeFileSync(adminSubastaPath, content, 'utf8');
    console.log('✓ admin-subasta.js actualizado');
}

console.log('✅ Archivos restantes actualizados correctamente.');
