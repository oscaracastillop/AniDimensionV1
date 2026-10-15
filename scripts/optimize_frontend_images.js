const fs = require('fs');
const path = require('path');

const CDN_SMALL = 'https://images.ygoprodeck.com/images/cards_small/';
const CDN_LARGE = 'https://images.ygoprodeck.com/images/cards/';
const FALLBACK = '/assets/card_back.jpg';

function replaceInFile(filePath, replacements) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    for (const [pattern, replacement] of replacements) {
        content = content.replace(pattern, replacement);
    }
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('✓ Actualizado:', path.relative(__dirname, filePath));
    }
}

// 1. duel-ui.js
replaceInFile(path.join(__dirname, '../frontend/js/duel/duel-ui.js'), [
    [/`\.\.\/\.\.\/\.\.\/assets\/images\/cards\/\${cId}\.jpg`/g, `\`${CDN_SMALL}\${cId}.jpg\``],
    [/`\.\.\/\.\.\/\.\.\/assets\/images\/cards\/\${topCard\.id \|\| topCard\.card_id}\.jpg`/g, `\`${CDN_SMALL}\${topCard.id || topCard.card_id}.jpg\``],
    [/background-image:url\('\.\.\/\.\.\/\.\.\/assets\/images\/cards\/\${cId}\.jpg'\),\s*url\('https:\/\/images\.ygoprodeck\.com\/images\/cards\/\${cId}\.jpg'\)/g, `background-image:url('${CDN_SMALL}\${cId}.jpg'), url('/assets/card_back.jpg')`],
    [/url\('\.\.\/\.\.\/\.\.\/assets\/images\/cards\/\${cId}\.jpg'\),\s*url\('https:\/\/images\.ygoprodeck\.com\/images\/cards\/\${cId}\.jpg'\),\s*url\('\/assets\/card_back\.jpg'\)/g, `url('${CDN_SMALL}\${cId}.jpg'), url('/assets/card_back.jpg')`],
    [/url\('\.\.\/\.\.\/\.\.\/assets\/images\/cards\/\${cId}\.jpg'\)/g, `url('${CDN_SMALL}\${cId}.jpg')`]
]);

// 2. duel-chains.js
replaceInFile(path.join(__dirname, '../frontend/js/duel/duel-chains.js'), [
    [/url\('\.\.\/\.\.\/\.\.\/assets\/images\/cards\/\${cId}\.jpg'\)/g, `url('${CDN_SMALL}\${cId}.jpg')`]
]);

// 3. deck-builder.js
replaceInFile(path.join(__dirname, '../frontend/js/views/deck-builder.js'), [
    [
        /<img src="\.\.\/\.\.\/assets\/images\/cards\/\${item\.card_id}\.jpg" onerror="this\.onerror=null; this\.src='https:\/\/images\.ygoprodeck\.com\/images\/cards\/\${item\.card_id}\.jpg';" class="([^"]+)"([^>]*)>/g,
        `<img src="${CDN_SMALL}\${item.card_id}.jpg" onerror="this.onerror=null; this.src='${FALLBACK}';" class="$1"$2 loading="lazy">`
    ],
    [
        /`\.\.\/\.\.\/assets\/images\/cards\/\${cId}\.jpg`/g,
        `\`${CDN_LARGE}\${cId}.jpg\``
    ]
]);

// 4. catalog.js
replaceInFile(path.join(__dirname, '../frontend/js/views/catalog.js'), [
    [
        /<img src="\.\.\/\.\.\/assets\/images\/cards\/\${card\.card_id}\.jpg" alt="\${card\.name}" loading="lazy" onerror="this\.onerror=null; this\.src='https:\/\/images\.ygoprodeck\.com\/images\/cards\/\${card\.card_id}\.jpg';">/g,
        `<img src="${CDN_SMALL}\${card.card_id}.jpg" alt="\${card.name}" loading="lazy" onerror="this.onerror=null; this.src='${FALLBACK}';">`
    ],
    [
        /elImg\.src = `\.\.\/\.\.\/assets\/images\/cards\/\${card\.card_id}\.jpg`;\s*elImg\.onerror = \(\) => { elImg\.src = `https:\/\/images\.ygoprodeck\.com\/images\/cards\/\${card\.card_id}\.jpg`; };/g,
        `elImg.src = \`${CDN_LARGE}\${card.card_id}.jpg\`; elImg.onerror = () => { elImg.src = '${FALLBACK}'; };`
    ]
]);

// 5. shop-sobre-detalle.js
replaceInFile(path.join(__dirname, '../frontend/js/views/shop-sobre-detalle.js'), [
    [
        /<img src="\.\.\/\.\.\/assets\/images\/cards\/\${c\.card_id}\.jpg" onerror="this\.onerror=null; this\.src='https:\/\/images\.ygoprodeck\.com\/images\/cards\/\${c\.card_id}\.jpg';"([^>]*)>/g,
        `<img src="${CDN_SMALL}\${c.card_id}.jpg" onerror="this.onerror=null; this.src='${FALLBACK}';"$1 loading="lazy">`
    ]
]);

// 6. shop-cartas.js
replaceInFile(path.join(__dirname, '../frontend/js/views/shop-cartas.js'), [
    [/imgThumb = `\/assets\/images\/cards\/\${cId}\.jpg`;/g, `imgThumb = \`${CDN_SMALL}\${cId}.jpg\`;`],
    [/this\.src='\/assets\/images\/cards\/placeholder\.png';/g, `this.src='${FALLBACK}';`]
]);

// 7. duel-npc.js & duel-pvp.js
[
    path.join(__dirname, '../frontend/js/views/duel-npc.js'),
    path.join(__dirname, '../frontend/js/views/duel-pvp.js')
].forEach(f => {
    replaceInFile(f, [
        [
            /<img src="\.\.\/\.\.\/assets\/images\/cards\/\${cardDrop\.card_id \|\| cardDrop\.id}\.jpg" onerror="this\.onerror=null; this\.src='https:\/\/images\.ygoprodeck\.com\/images\/cards\/\${cardDrop\.card_id \|\| cardDrop\.id}\.jpg';"([^>]*)>/g,
            `<img src="${CDN_SMALL}\${cardDrop.card_id || cardDrop.id}.jpg" onerror="this.onerror=null; this.src='${FALLBACK}';"$1>`
        ]
    ]);
});

// 8. eventos-subasta.js & eventos-hub.js
[
    path.join(__dirname, '../frontend/js/views/eventos-subasta.js'),
    path.join(__dirname, '../frontend/js/views/eventos-hub.js')
].forEach(f => {
    replaceInFile(f, [
        [/`\/assets\/images\/cards\/\${a\.CardCode}\.jpg`/g, `\`${CDN_SMALL}\${a.CardCode}.jpg\``]
    ]);
});

// 9. admin views
[
    path.join(__dirname, '../frontend/js/views/admin-cards-detail.js'),
    path.join(__dirname, '../frontend/js/views/admin-cards.js'),
    path.join(__dirname, '../frontend/js/views/admin-cartas-tienda.js'),
    path.join(__dirname, '../frontend/js/views/admin-subasta.js')
].forEach(f => {
    replaceInFile(f, [
        [/`\.\.\/\.\.\/\.\.\/assets\/images\/cards\/\${c\.card_id}\.jpg`/g, `\`${CDN_SMALL}\${c.card_id}.jpg\``],
        [/`\/assets\/images\/cards\/\${cleanVal}\.jpg`/g, `\`${CDN_SMALL}\${cleanVal}.jpg\``],
        [/`\/assets\/images\/cards\/\${cardCode}\.jpg`/g, `\`${CDN_SMALL}\${cardCode}.jpg\``],
        [/`\/assets\/images\/cards\/\${cId}\.jpg`/g, `\`${CDN_SMALL}\${cId}.jpg\``],
        [/`\/assets\/images\/cards\/\${cardId}\.jpg`/g, `\`${CDN_SMALL}\${cardId}.jpg\``],
        [/\/assets\/images\/cards\/89631139\.jpg/g, `${CDN_SMALL}89631139.jpg`],
        [/\.\.\/\.\.\/\.\.\/assets\/images\/cards\/89631139\.jpg/g, `${CDN_SMALL}89631139.jpg`],
        [/\.\.\/\.\.\/assets\/images\/cards\/89631139\.jpg/g, `${CDN_SMALL}89631139.jpg`]
    ]);
});

// 10. html files
[
    path.join(__dirname, '../frontend/views/admin/eventos/eventos.html'),
    path.join(__dirname, '../frontend/views/admin/eventos/subasta.html'),
    path.join(__dirname, '../frontend/views/shop/shop.html'),
    path.join(__dirname, '../frontend/views/duels/menu.html'),
    path.join(__dirname, '../frontend/views/admin/cartas-tienda/cartas-tienda.html')
].forEach(f => {
    if (fs.existsSync(f)) {
        replaceInFile(f, [
            [/\/assets\/images\/cards\/89631139\.jpg/g, `${CDN_SMALL}89631139.jpg`],
            [/\.\.\/\.\.\/assets\/images\/cards\/89631139\.jpg/g, `${CDN_SMALL}89631139.jpg`]
        ]);
    }
});

console.log('✅ Optimización de URLs de cartas a CDN completada.');
