const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sleevesDir = path.resolve(__dirname, '../frontend/assets/images/sleeves');
const playmatsDir = path.resolve(__dirname, '../frontend/assets/images/playmats');
const brainDir = 'C:/Users/oscar.castillo/.gemini/antigravity-ide/brain/2ecb17c9-01af-4b9b-9c38-85f1ef5ba11e/';

// 1. ELIMINAR 001, 002, 003 de tapetes y fundas
const toDelete = ['001', '002', '003'];
toDelete.forEach(num => {
  const sPath = path.join(sleevesDir, `SLV-${num}.png`);
  const mPath = path.join(playmatsDir, `MAT-${num}.jpg`);
  if (fs.existsSync(sPath)) fs.unlinkSync(sPath);
  if (fs.existsSync(mPath)) fs.unlinkSync(mPath);
  console.log(`Eliminados SLV-${num} y MAT-${num}`);
});

// Definitions for 009 to 020
const newCosmetics = [
  {
    num: '009',
    name: 'Maga Oscura Festival de Halloween',
    descSleeve: 'La Maga Oscura con atuendo festivo de Halloween, calabazas mágicas y murciélagos bajo la luna llena.',
    descMat: 'Santuario nocturno embrujado con la Maga Oscura de Halloween, calderos arcanos y linternas flotantes.',
    priceSleeve: 70000,
    priceMat: 105000,
    offerText: 'HALLOWEEN',
    color1: '#ff6600', color2: '#2a0845', color3: '#9900cc', accent: '#ffea00',
    theme: 'halloween_dmsg'
  },
  {
    num: '010',
    name: 'Cyber Dragón Infinito Neón',
    descSleeve: 'Titanio pulido y circuitos cuánticos de alta tensión con el Cyber Dragón Infinito.',
    descMat: 'Autopista virtual ciberespacial con el Cyber Dragón Infinito surcando cables de fibra óptica y neón.',
    priceSleeve: 75000,
    priceMat: 110000,
    offerText: 'CIBER',
    color1: '#00f0ff', color2: '#020b1c', color3: '#ffffff', accent: '#0077ff',
    theme: 'cyber_dragon'
  },
  {
    num: '011',
    name: 'Dragón de Polvo de Estrellas Astral',
    descSleeve: 'Lluvia de estrellas holográficas y estela plateada del Dragón de Polvo de Estrellas.',
    descMat: 'Nebulosa cósmica de polvo de estrellas con auroras boreales y constelaciones sinfónicas.',
    priceSleeve: 80000,
    priceMat: 115000,
    offerText: 'ASTRAL',
    color1: '#a5f3fc', color2: '#081426', color3: '#f472b6', accent: '#38bdf8',
    theme: 'stardust'
  },
  {
    num: '012',
    name: 'Dragón Caos Máximo de Ojos Azules',
    descSleeve: 'Obsidiana indestructible y energía ritual azul cobalto del Dragón Caos Máximo.',
    descMat: 'Vórtice de invocación por ritual destructor con pilares de magma cósmico azul.',
    priceSleeve: 85000,
    priceMat: 120000,
    offerText: 'ÉPICO',
    color1: '#1d4ed8', color2: '#030712', color3: '#9333ea', accent: '#60a5fa',
    theme: 'chaos_max'
  },
  {
    num: '013',
    name: 'Dragón Rosa Negra Carmesí',
    descSleeve: 'Pétalos de espinas carmesí y fulgor lunar gótico del Dragón Rosa Negra.',
    descMat: 'Jardín lunar de rosas oscuras bajo el eclipse sangriento con niebla mística.',
    priceSleeve: 70000,
    priceMat: 100000,
    offerText: 'ROSA',
    color1: '#e11d48', color2: '#180208', color3: '#f43f5e', accent: '#fda4af',
    theme: 'black_rose'
  },
  {
    num: '014',
    name: 'Número 39: Utopía Rayo de la Esperanza',
    descSleeve: 'Alas doradas blindadas y halo astral del guerrero Xyz de la esperanza.',
    descMat: 'Horizonte cósmico astral con pilares de luz dorada y la silueta majestuosa de Utopía.',
    priceSleeve: 65000,
    priceMat: 95000,
    offerText: 'XYZ',
    color1: '#f59e0b', color2: '#1c1002', color3: '#fef08a', accent: '#f97316',
    theme: 'utopia'
  },
  {
    num: '015',
    name: 'HÉROE Elemental Neos Destello Galáctico',
    descSleeve: 'El héroe del Espacio Neo surcando galaxias con destellos de prisma multicolor.',
    descMat: 'Cima del rascacielos heroico al atardecer cósmico con vista a la metrópolis futurista.',
    priceSleeve: 65000,
    priceMat: 95000,
    offerText: 'HÉROE',
    color1: '#0284c7', color2: '#03172e', color3: '#ec4899', accent: '#fbbf24',
    theme: 'neos'
  },
  {
    num: '016',
    name: 'Glaciar del Dragón de Hielo Absoluto',
    descSleeve: 'Cristales de hielo eterno, nieve prismática y escamas heladas del Dragón del Glaciar.',
    descMat: 'Pico ártico milenario con estalactitas de hielo resplandecientes y auroras boreales polares.',
    priceSleeve: 75000,
    priceMat: 105000,
    offerText: 'HIELO',
    color1: '#38bdf8', color2: '#041d30', color3: '#e0f2fe', accent: '#67e8f9',
    theme: 'ice_glacier'
  },
  {
    num: '017',
    name: 'Volcán Apocalíptico del Dragón de Magma',
    descSleeve: 'Furia incandescente de lava ardiente y chispas de fuego del Dragón de Magma.',
    descMat: 'Cráter de erupción volcánica con ríos de lava dorada y cielo cubierto de cenizas encendidas.',
    priceSleeve: 80000,
    priceMat: 110000,
    offerText: 'FUEGO',
    color1: '#ea580c', color2: '#1c0502', color3: '#f97316', accent: '#fde047',
    theme: 'magma_volcano'
  },
  {
    num: '018',
    name: 'Santuario Sagrado de los Artículos del Milenio',
    descSleeve: 'El Ojo de Wadjet y la Pirámide del Milenio bañados en oro puro faraónico.',
    descMat: 'Cámara sagrada del Faraón con los siete Artículos del Milenio emanando energía divina.',
    priceSleeve: 90000,
    priceMat: 125000,
    offerText: 'MILENIO',
    color1: '#ca8a04', color2: '#1f1302', color3: '#fef08a', accent: '#eab308',
    theme: 'millennium_shrine'
  },
  {
    num: '019',
    name: 'Reino de las Sombras y Niebla Espectral',
    descSleeve: 'Niebla púrpura espectral y ojos misteriosos vigilando desde el Reino de las Sombras.',
    descMat: 'Coliseo de piedra ancestral envuelto en tormentas del inframundo y runas oscuras.',
    priceSleeve: 85000,
    priceMat: 120000,
    offerText: 'OSCURO',
    color1: '#7e22ce', color2: '#0f0219', color3: '#c084fc', accent: '#ec4899',
    theme: 'shadow_realm'
  },
  {
    num: '020',
    name: 'Torneo Mundial Ani-Dimension Gran Maestro',
    descSleeve: 'Emblema oficial de Gran Maestro de Ani-Dimension con marco dimensional de campeones.',
    descMat: 'Estadio interdimensional de Grandes Maestros con portales de energía cian y magenta.',
    priceSleeve: 150000,
    priceMat: 200000,
    offerText: 'CAMPEÓN',
    color1: '#00f0ff', color2: '#030814', color3: '#ff007f', accent: '#ffd700',
    theme: 'ani_championship'
  }
];

function generateSleeveArtSVG(item) {
  const W = 600;
  const H = 870;
  const { color1, color2, color3, accent, name, num } = item;

  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <defs>
      <radialGradient id="gradRadial" cx="50%" cy="45%" r="65%">
        <stop offset="0%" stop-color="${color1}" stop-opacity="0.95"/>
        <stop offset="55%" stop-color="${color2}" stop-opacity="1"/>
        <stop offset="100%" stop-color="#020409" stop-opacity="1"/>
      </radialGradient>

      <linearGradient id="goldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${accent}"/>
        <stop offset="30%" stop-color="#ffffff"/>
        <stop offset="50%" stop-color="${accent}"/>
        <stop offset="80%" stop-color="#8a6500"/>
        <stop offset="100%" stop-color="${accent}"/>
      </linearGradient>

      <linearGradient id="holoSweep" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color3}" stop-opacity="0.7"/>
        <stop offset="50%" stop-color="${color1}" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="${accent}" stop-opacity="0.8"/>
      </linearGradient>

      <filter id="glow">
        <feGaussianBlur stdDeviation="8" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
    </defs>

    <rect width="${W}" height="${H}" fill="#03050a"/>
    <rect x="6" y="6" width="${W - 12}" height="${H - 12}" rx="8" fill="url(#gradRadial)"/>

    <!-- Inner Slim Golden Egyptian / Mystic Frame -->
    <rect x="16" y="16" width="${W - 32}" height="${H - 32}" rx="6" fill="none" stroke="url(#goldBorder)" stroke-width="3" filter="url(#glow)"/>
    <rect x="24" y="24" width="${W - 48}" height="${H - 48}" rx="4" fill="none" stroke="${color1}" stroke-width="1.2" stroke-opacity="0.6"/>

    <!-- Central Mystic Circle & Seal -->
    <g transform="translate(${W/2}, ${H/2 - 10})">
      <circle r="185" fill="none" stroke="url(#holoSweep)" stroke-width="2.5" stroke-dasharray="16 8" filter="url(#glow)"/>
      <circle r="160" fill="none" stroke="${color1}" stroke-width="1.5" stroke-opacity="0.7"/>
      <circle r="135" fill="none" stroke="url(#goldBorder)" stroke-width="2"/>

      <!-- Sacred Geometry Stars -->
      <polygon points="0,-130 112,65 -112,65" fill="none" stroke="url(#holoSweep)" stroke-width="1.8"/>
      <polygon points="0,130 112,-65 -112,-65" fill="none" stroke="url(#holoSweep)" stroke-width="1.8"/>
      <circle r="105" fill="none" stroke="${accent}" stroke-width="1.5" stroke-dasharray="6 4"/>

      <!-- Center Glowing Gem -->
      <circle r="55" fill="url(#gradRadial)" stroke="url(#goldBorder)" stroke-width="2.5" filter="url(#glow)"/>
      <polygon points="0,-28 28,0 0,28 -28,0" fill="url(#goldBorder)"/>
      <circle cx="0" cy="0" r="8" fill="#ffffff" filter="url(#glow)"/>
    </g>

    <!-- Top & Bottom Badges with Official ANI DIMENSION -->
    <g text-anchor="middle" font-family="'Orbitron', 'Cinzel', 'Segoe UI', sans-serif">
      <rect x="${W/2 - 130}" y="45" width="260" height="32" rx="16" fill="#040914" fill-opacity="0.9" stroke="url(#goldBorder)" stroke-width="1.5"/>
      <text x="${W/2}" y="66" fill="${accent}" font-size="12" font-weight="900" letter-spacing="3">ANI DIMENSION</text>

      <rect x="${W/2 - 140}" y="${H - 65}" width="280" height="28" rx="14" fill="#040914" fill-opacity="0.9" stroke="${color1}" stroke-width="1.2"/>
      <text x="${W/2}" y="${H - 47}" fill="#ffffff" font-size="10" font-weight="700" letter-spacing="2">SLV-${num} • ${name.toUpperCase()}</text>
    </g>
  </svg>
  `;
}

function generatePlaymatArtSVG(item) {
  const W = 1920;
  const H = 880;
  const { color1, color2, color3, accent, name, num } = item;

  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <defs>
      <radialGradient id="matGradLeft" cx="25%" cy="50%" r="65%">
        <stop offset="0%" stop-color="${color1}" stop-opacity="0.9"/>
        <stop offset="60%" stop-color="${color2}" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="#020409" stop-opacity="1"/>
      </radialGradient>

      <radialGradient id="matGradRight" cx="75%" cy="50%" r="65%">
        <stop offset="0%" stop-color="${color3}" stop-opacity="0.85"/>
        <stop offset="60%" stop-color="${color2}" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="#020409" stop-opacity="1"/>
      </radialGradient>

      <radialGradient id="matGradCenter" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.8"/>
        <stop offset="25%" stop-color="${color1}" stop-opacity="0.6"/>
        <stop offset="65%" stop-color="${color2}" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="transparent" stop-opacity="0"/>
      </radialGradient>

      <linearGradient id="goldBorderMat" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${accent}"/>
        <stop offset="25%" stop-color="#ffffff"/>
        <stop offset="50%" stop-color="${accent}"/>
        <stop offset="75%" stop-color="${color1}"/>
        <stop offset="100%" stop-color="${accent}"/>
      </linearGradient>

      <filter id="matGlow">
        <feGaussianBlur stdDeviation="8" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
    </defs>

    <!-- Outer Solid Black Stitched Edge Border (Directly in pixels) -->
    <rect width="${W}" height="${H}" fill="#08080a"/>

    <!-- Inner Playmat Artwork Canvas (with Black Border Margin) -->
    <g transform="translate(16, 16)">
      <rect width="${W - 32}" height="${H - 32}" rx="10" fill="#03050d"/>
      <rect width="${W - 32}" height="${H - 32}" rx="10" fill="url(#matGradLeft)"/>
      <rect width="${W - 32}" height="${H - 32}" rx="10" fill="url(#matGradRight)" style="mix-blend-mode: screen;"/>
      <rect width="${W - 32}" height="${H - 32}" rx="10" fill="url(#matGradCenter)" style="mix-blend-mode: screen;"/>

      <!-- Slim Gold Egyptian/Arena Frame -->
      <rect x="12" y="12" width="${W - 56}" height="${H - 56}" rx="8" fill="none" stroke="url(#goldBorderMat)" stroke-width="2.5" filter="url(#matGlow)"/>
      <rect x="22" y="22" width="${W - 76}" height="${H - 76}" rx="6" fill="none" stroke="${color1}" stroke-width="1.2" stroke-opacity="0.5"/>

      <!-- Center Division Axis -->
      <line x1="40" y1="${(H - 32)/2}" x2="${W - 72}" y2="${(H - 32)/2}" stroke="${accent}" stroke-width="1.5" stroke-dasharray="20 10" stroke-opacity="0.6" filter="url(#matGlow)"/>

      <!-- Left & Right Tactical Field Runes -->
      <g transform="translate(380, ${(H - 32)/2})">
        <circle r="160" fill="none" stroke="${color1}" stroke-width="1.5" stroke-opacity="0.6" stroke-dasharray="10 6"/>
        <circle r="120" fill="none" stroke="url(#goldBorderMat)" stroke-width="2" filter="url(#matGlow)"/>
        <polygon points="0,-100 86,50 -86,50" fill="none" stroke="${color3}" stroke-width="1.5" stroke-opacity="0.7"/>
        <polygon points="0,100 86,-50 -86,-50" fill="none" stroke="${color3}" stroke-width="1.5" stroke-opacity="0.7"/>
      </g>

      <g transform="translate(${W - 32 - 380}, ${(H - 32)/2})">
        <circle r="160" fill="none" stroke="${color3}" stroke-width="1.5" stroke-opacity="0.6" stroke-dasharray="10 6"/>
        <circle r="120" fill="none" stroke="url(#goldBorderMat)" stroke-width="2" filter="url(#matGlow)"/>
        <polygon points="0,-100 86,50 -86,50" fill="none" stroke="${color1}" stroke-width="1.5" stroke-opacity="0.7"/>
        <polygon points="0,100 86,-50 -86,-50" fill="none" stroke="${color1}" stroke-width="1.5" stroke-opacity="0.7"/>
      </g>

      <!-- Grand Center Arena Portal -->
      <g transform="translate(${(W - 32)/2}, ${(H - 32)/2})">
        <circle r="190" fill="none" stroke="url(#goldBorderMat)" stroke-width="2.5" stroke-dasharray="24 12" filter="url(#matGlow)"/>
        <circle r="145" fill="none" stroke="${color1}" stroke-width="1.8" stroke-opacity="0.8"/>
        <circle r="105" fill="#030817" fill-opacity="0.9" stroke="${accent}" stroke-width="2.5" filter="url(#matGlow)"/>
        <polygon points="0,-36 36,0 0,36 -36,0" fill="url(#goldBorderMat)"/>
        <circle cx="0" cy="0" r="10" fill="#ffffff" filter="url(#matGlow)"/>
      </g>

      <!-- Header & Footer Banners -->
      <g text-anchor="middle" font-family="'Orbitron', 'Cinzel', 'Segoe UI', sans-serif">
        <rect x="${(W - 32)/2 - 180}" y="28" width="360" height="32" rx="16" fill="#030814" fill-opacity="0.92" stroke="url(#goldBorderMat)" stroke-width="1.5"/>
        <text x="${(W - 32)/2}" y="49" fill="${accent}" font-size="13" font-weight="900" letter-spacing="3">ANI DIMENSION DUEL ARENA</text>

        <rect x="${(W - 32)/2 - 200}" y="${H - 32 - 48}" width="400" height="28" rx="14" fill="#030814" fill-opacity="0.92" stroke="${color1}" stroke-width="1.2"/>
        <text x="${(W - 32)/2}" y="${H - 32 - 30}" fill="#ffffff" font-size="11" font-weight="700" letter-spacing="2">MAT-${num} • ${name.toUpperCase()}</text>
      </g>
    </g>
  </svg>
  `;
}

async function buildCosmeticsCollectionV2() {
  console.log("Generando colección refinada de cosméticos (SLV-004 a SLV-020 y MAT-004 a MAT-020)...");

  // Keep 004 to 008 (the master gold series already generated)
  const existingMasterPairs = [
    {
      num: '004',
      name: 'Maga Oscura de los Círculos Arcanos',
      descSleeve: 'La Maga Oscura invocando círculos arcanos galácticos dentro del marco dorado sagrado de Ani-Dimension.',
      descMat: 'Santuario místico con la Maga Oscura y constelaciones arcanas con marco egipcio dorado Ani-Dimension.',
      priceSleeve: 65000, priceMat: 95000, offerText: 'ÉPICO'
    },
    {
      num: '005',
      name: 'Slifer el Dragón del Cielo Divino',
      descSleeve: 'El Dios Egipcio Slifer el Dragón del Cielo con truenos carmesí y marco faraónico de Ani-Dimension.',
      descMat: 'Cielos de tormenta divina sobre las pirámides con Slifer y marco dorado ornamental de Ani-Dimension.',
      priceSleeve: 85000, priceMat: 130000, offerText: 'DIVINO'
    },
    {
      num: '006',
      name: 'Obelisco el Atormentador Titánico',
      descSleeve: 'Fuerza colosal de Obelisco el Atormentador cargando su puño divino con marco de oro de Ani-Dimension.',
      descMat: 'Ruinas del templo ancestral con Obelisco desatando tormentas de zafiro y marco dorado de Ani-Dimension.',
      priceSleeve: 85000, priceMat: 130000, offerText: 'DIVINO'
    },
    {
      num: '007',
      name: 'El Dragón Alado de Ra Solar',
      descSleeve: 'El Fénix divino de Ra bañado en oro y fuego solar sagrado con marco jeroglífico de Ani-Dimension.',
      descMat: 'Eclipse solar sobre el desierto sagrado con El Dragón Alado de Ra y marco dorado de Ani-Dimension.',
      priceSleeve: 95000, priceMat: 140000, offerText: 'DIVINO'
    },
    {
      num: '008',
      name: 'Dragón Negro de Ojos Rojos Infernal',
      descSleeve: 'Feroz Dragón Negro de Ojos Rojos desatando llamaradas infernales con marco dorado de Ani-Dimension.',
      descMat: 'Fisuras volcánicas ardientes con el Dragón Negro de Ojos Rojos y marco ornamental egipcio de Ani-Dimension.',
      priceSleeve: 70000, priceMat: 100000, offerText: 'ÉPICO'
    }
  ];

  const finalSleevesDB = [];
  const finalPlaymatsDB = [];

  // Register existing 004-008
  for (const pair of existingMasterPairs) {
    finalSleevesDB.push({
      code: `SLV-${pair.num}`,
      name: `Funda ${pair.name}`,
      description: pair.descSleeve,
      price: pair.priceSleeve,
      currency: 'STARSHIPS',
      image: `/assets/images/sleeves/SLV-${pair.num}.png`,
      offer_text: pair.offerText,
      active: true
    });

    finalPlaymatsDB.push({
      code: `MAT-${pair.num}`,
      name: `Tapete ${pair.name}`,
      description: pair.descMat,
      price: pair.priceMat,
      currency: 'STARSHIPS',
      image: `/assets/images/playmats/MAT-${pair.num}.jpg`,
      offer_text: pair.offerText,
      active: true
    });
  }

  // Generate new 009 to 020
  for (const item of newCosmetics) {
    const slvDest = path.join(sleevesDir, `SLV-${item.num}.png`);
    const matDest = path.join(playmatsDir, `MAT-${item.num}.jpg`);

    const slvSvg = generateSleeveArtSVG(item);
    await sharp(Buffer.from(slvSvg))
      .png({ quality: 100, compressionLevel: 6 })
      .toFile(slvDest);

    const matSvg = generatePlaymatArtSVG(item);
    await sharp(Buffer.from(matSvg))
      .jpeg({ quality: 96, mozjpeg: true })
      .toFile(matDest);

    console.log(`Generada pareja ${item.num}: ${item.name}`);

    finalSleevesDB.push({
      code: `SLV-${item.num}`,
      name: `Funda ${item.name}`,
      description: item.descSleeve,
      price: item.priceSleeve,
      currency: 'STARSHIPS',
      image: `/assets/images/sleeves/SLV-${item.num}.png`,
      offer_text: item.offerText,
      active: true
    });

    finalPlaymatsDB.push({
      code: `MAT-${item.num}`,
      name: `Tapete ${item.name}`,
      description: item.descMat,
      price: item.priceMat,
      currency: 'STARSHIPS',
      image: `/assets/images/playmats/MAT-${item.num}.jpg`,
      offer_text: item.offerText,
      active: true
    });
  }

  // Guardar bases de datos
  const sleevesDBPath = path.resolve(__dirname, '../backend/data/sleeves_db.json');
  const playmatsDBPath = path.resolve(__dirname, '../backend/data/playmats_db.json');

  fs.writeFileSync(sleevesDBPath, JSON.stringify(finalSleevesDB, null, 2), 'utf8');
  fs.writeFileSync(playmatsDBPath, JSON.stringify(finalPlaymatsDB, null, 2), 'utf8');

  console.log("¡Bases de datos de cosméticos v2 actualizadas con éxito!");
}

buildCosmeticsCollectionV2().catch(console.error);
