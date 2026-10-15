const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sleevesDir = path.resolve(__dirname, '../frontend/assets/images/sleeves');
const playmatsDir = path.resolve(__dirname, '../frontend/assets/images/playmats');

// 1. Limpieza absoluta de carpetas
if (fs.existsSync(sleevesDir)) {
  fs.readdirSync(sleevesDir).forEach(f => fs.unlinkSync(path.join(sleevesDir, f)));
} else {
  fs.mkdirSync(sleevesDir, { recursive: true });
}

if (fs.existsSync(playmatsDir)) {
  fs.readdirSync(playmatsDir).forEach(f => fs.unlinkSync(path.join(playmatsDir, f)));
} else {
  fs.mkdirSync(playmatsDir, { recursive: true });
}

console.log("✓ Carpetas de fundas y tapetes completamente limpiadas.");

// 2. Definición de las 3 Nuevas Parejas Oficiales
const threePairs = [
  {
    num: '001',
    name: 'Dragón Blanco de Ojos Azules Cósmico',
    descSleeve: 'Reverso de carta con el Dragón Blanco de Ojos Azules en fulgor astral cósmico y borde negro sólido.',
    descMat: 'Tapete ultra-panorámico del Dragón Blanco de Ojos Azules con vórtice de relámpagos y borde negro sólido.',
    priceSleeve: 50000,
    priceMat: 80000,
    currency: 'STARSHIPS',
    offerText: 'POPULAR',
    color1: '#00d2ff',
    color2: '#003366',
    color3: '#e0f7ff',
    accent: '#00ffff',
    dragonEye: '#00ffff',
    monsterName: 'BLUE-EYES WHITE DRAGON'
  },
  {
    num: '002',
    name: 'Maga Oscura Hechicera Astral',
    descSleeve: 'Reverso de carta con la Maga Oscura canalizando energía mágica magenta y cian con borde negro sólido.',
    descMat: 'Tapete ultra-panorámico del Santuario Arcano de la Maga Oscura con orbes galácticos y borde negro sólido.',
    priceSleeve: 50000,
    priceMat: 80000,
    currency: 'STARSHIPS',
    offerText: 'NUEVO',
    color1: '#ff007f',
    color2: '#3a005c',
    color3: '#00f0ff',
    accent: '#ff2a9d',
    dragonEye: '#ffea00',
    monsterName: 'DARK MAGICIAN GIRL'
  },
  {
    num: '003',
    name: 'Dragón Negro de Ojos Rojos Infernal',
    descSleeve: 'Reverso de carta con el Dragón Negro de Ojos Rojos desatando fuego volcánico y borde negro sólido.',
    descMat: 'Tapete ultra-panorámico de la Fisura Volcánica con el Dragón Negro de Ojos Rojos y borde negro sólido.',
    priceSleeve: 50000,
    priceMat: 80000,
    currency: 'STARSHIPS',
    offerText: 'ÉPICO',
    color1: '#ff2200',
    color2: '#200000',
    color3: '#ff7700',
    accent: '#ff0033',
    dragonEye: '#ff0000',
    monsterName: 'RED-EYES BLACK DRAGON'
  }
];

function generateSleeveSVG(item) {
  const W = 600;
  const H = 870;
  const { color1, color2, color3, accent, name, num, monsterName } = item;

  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <defs>
      <radialGradient id="slvBg" cx="50%" cy="45%" r="70%">
        <stop offset="0%" stop-color="${color1}" stop-opacity="0.95"/>
        <stop offset="50%" stop-color="${color2}" stop-opacity="1"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="1"/>
      </radialGradient>

      <linearGradient id="neonTrim" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color3}"/>
        <stop offset="50%" stop-color="${color1}"/>
        <stop offset="100%" stop-color="${accent}"/>
      </linearGradient>

      <filter id="slvGlow">
        <feGaussianBlur stdDeviation="8" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
    </defs>

    <!-- Fondo y Borde Negro Sólido -->
    <rect width="${W}" height="${H}" fill="#000000"/>
    <rect x="14" y="14" width="${W - 28}" height="${H - 28}" rx="6" fill="url(#slvBg)"/>

    <!-- Fina línea de contorno sutil (sin marcos dorados gruesos) -->
    <rect x="22" y="22" width="${W - 44}" height="${H - 44}" rx="4" fill="none" stroke="url(#neonTrim)" stroke-width="1.5" stroke-opacity="0.75"/>

    <!-- Arte Central / Runas y Círculo Místico -->
    <g transform="translate(${W/2}, ${H/2 - 15})">
      <circle r="190" fill="none" stroke="${color1}" stroke-width="2" stroke-dasharray="14 7" filter="url(#slvGlow)"/>
      <circle r="160" fill="none" stroke="${color3}" stroke-width="1.5" stroke-opacity="0.8"/>
      <circle r="130" fill="none" stroke="url(#neonTrim)" stroke-width="2"/>

      <!-- Geometría Mágica -->
      <polygon points="0,-125 108,62 -108,62" fill="none" stroke="url(#neonTrim)" stroke-width="1.8" filter="url(#slvGlow)"/>
      <polygon points="0,125 108,-62 -108,-62" fill="none" stroke="url(#neonTrim)" stroke-width="1.8" filter="url(#slvGlow)"/>
      
      <!-- Núcleo de Energía -->
      <circle r="60" fill="url(#slvBg)" stroke="${color1}" stroke-width="2.5" filter="url(#slvGlow)"/>
      <polygon points="0,-30 30,0 0,30 -30,0" fill="${color3}"/>
      <circle cx="0" cy="0" r="10" fill="#ffffff" filter="url(#slvGlow)"/>
    </g>

    <!-- Nombre del Monstruo Central -->
    <text x="${W/2}" y="${H/2 + 135}" fill="#ffffff" font-family="'Orbitron', sans-serif" font-size="16" font-weight="900" letter-spacing="3" text-anchor="middle" filter="url(#slvGlow)">${monsterName}</text>

    <!-- Encabezado Sutil ANI DIMENSION -->
    <g text-anchor="middle" font-family="'Orbitron', sans-serif">
      <text x="${W/2}" y="58" fill="#ffffff" font-size="13" font-weight="900" letter-spacing="4" filter="url(#slvGlow)">ANI DIMENSION</text>
      <text x="${W/2}" y="${H - 42}" fill="${color3}" font-size="11" font-weight="700" letter-spacing="2">SLV-${num} • OFFICIAL SLEEVE</text>
    </g>
  </svg>
  `;
}

function generatePlaymatSVG(item) {
  // Proporción Ultra-Panorámica exacta 2.35:1 (1920 x 816)
  const W = 1920;
  const H = 816;
  const blackBorder = 18; // 18px borde negro sólido parejo en todos los lados
  const { color1, color2, color3, accent, name, num, monsterName } = item;

  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <defs>
      <radialGradient id="matLeft" cx="20%" cy="50%" r="65%">
        <stop offset="0%" stop-color="${color1}" stop-opacity="0.95"/>
        <stop offset="55%" stop-color="${color2}" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="1"/>
      </radialGradient>

      <radialGradient id="matRight" cx="80%" cy="50%" r="65%">
        <stop offset="0%" stop-color="${color3}" stop-opacity="0.9"/>
        <stop offset="55%" stop-color="${color2}" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="1"/>
      </radialGradient>

      <radialGradient id="matCenter" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85"/>
        <stop offset="25%" stop-color="${color1}" stop-opacity="0.7"/>
        <stop offset="65%" stop-color="${color2}" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="transparent" stop-opacity="0"/>
      </radialGradient>

      <linearGradient id="neonMatTrim" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${color1}"/>
        <stop offset="50%" stop-color="${color3}"/>
        <stop offset="100%" stop-color="${color1}"/>
      </linearGradient>

      <filter id="matGlow">
        <feGaussianBlur stdDeviation="8" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
    </defs>

    <!-- Borde Negro Sólido Exterior de 18px en todos los lados -->
    <rect width="${W}" height="${H}" fill="#000000"/>

    <!-- Lienzo de Arte Interior a Sangre Completa (Sin marcos dorados gruesos) -->
    <g transform="translate(${blackBorder}, ${blackBorder})">
      <rect width="${W - blackBorder*2}" height="${H - blackBorder*2}" rx="4" fill="#000000"/>
      <rect width="${W - blackBorder*2}" height="${H - blackBorder*2}" rx="4" fill="url(#matLeft)"/>
      <rect width="${W - blackBorder*2}" height="${H - blackBorder*2}" rx="4" fill="url(#matRight)" style="mix-blend-mode: screen;"/>
      <rect width="${W - blackBorder*2}" height="${H - blackBorder*2}" rx="4" fill="url(#matCenter)" style="mix-blend-mode: screen;"/>

      <!-- Fino borde interior de alta definición (sólo 1px sutil) -->
      <rect x="6" y="6" width="${W - blackBorder*2 - 12}" height="${H - blackBorder*2 - 12}" rx="3" fill="none" stroke="url(#neonMatTrim)" stroke-width="1.2" stroke-opacity="0.5"/>

      <!-- Eje Central del Campo -->
      <line x1="30" y1="${(H - blackBorder*2)/2}" x2="${W - blackBorder*2 - 30}" y2="${(H - blackBorder*2)/2}" stroke="${color3}" stroke-width="1.5" stroke-dasharray="24 12" stroke-opacity="0.6" filter="url(#matGlow)"/>

      <!-- Círculo Táctico Izquierdo -->
      <g transform="translate(360, ${(H - blackBorder*2)/2})">
        <circle r="150" fill="none" stroke="${color1}" stroke-width="1.5" stroke-opacity="0.6" stroke-dasharray="10 5"/>
        <circle r="110" fill="none" stroke="${color3}" stroke-width="1.8" filter="url(#matGlow)"/>
        <polygon points="0,-90 78,45 -78,45" fill="none" stroke="${color3}" stroke-width="1.5"/>
        <polygon points="0,90 78,-45 -78,-45" fill="none" stroke="${color3}" stroke-width="1.5"/>
      </g>

      <!-- Círculo Táctico Derecho -->
      <g transform="translate(${W - blackBorder*2 - 360}, ${(H - blackBorder*2)/2})">
        <circle r="150" fill="none" stroke="${color3}" stroke-width="1.5" stroke-opacity="0.6" stroke-dasharray="10 5"/>
        <circle r="110" fill="none" stroke="${color1}" stroke-width="1.8" filter="url(#matGlow)"/>
        <polygon points="0,-90 78,45 -78,45" fill="none" stroke="${color1}" stroke-width="1.5"/>
        <polygon points="0,90 78,-45 -78,-45" fill="none" stroke="${color1}" stroke-width="1.5"/>
      </g>

      <!-- Portal Central con Emblema del Monstruo -->
      <g transform="translate(${(W - blackBorder*2)/2}, ${(H - blackBorder*2)/2})">
        <circle r="180" fill="none" stroke="url(#neonMatTrim)" stroke-width="2" stroke-dasharray="20 10" filter="url(#matGlow)"/>
        <circle r="135" fill="none" stroke="${color3}" stroke-width="1.5" stroke-opacity="0.8"/>
        <circle r="95" fill="#000000" fill-opacity="0.85" stroke="${color1}" stroke-width="2" filter="url(#matGlow)"/>
        <polygon points="0,-32 32,0 0,32 -32,0" fill="${color3}"/>
        <circle cx="0" cy="0" r="8" fill="#ffffff" filter="url(#matGlow)"/>
      </g>

      <!-- Nombre del Monstruo Central -->
      <text x="${(W - blackBorder*2)/2}" y="${(H - blackBorder*2)/2 + 130}" fill="#ffffff" font-family="'Orbitron', sans-serif" font-size="20" font-weight="900" letter-spacing="6" text-anchor="middle" filter="url(#matGlow)">${monsterName}</text>

      <!-- Logos y Textos Sutiles -->
      <g text-anchor="middle" font-family="'Orbitron', sans-serif">
        <text x="${(W - blackBorder*2)/2}" y="38" fill="#ffffff" font-size="14" font-weight="900" letter-spacing="4" filter="url(#matGlow)">ANI DIMENSION</text>
        <text x="${(W - blackBorder*2)/2}" y="${H - blackBorder*2 - 20}" fill="${color3}" font-size="11" font-weight="700" letter-spacing="2">MAT-${num} • DUEL ARENA</text>
      </g>
    </g>
  </svg>
  `;
}

async function buildClean3Pairs() {
  const finalSleevesDB = [];
  const finalPlaymatsDB = [];

  for (const item of threePairs) {
    const slvCode = `SLV-${item.num}`;
    const matCode = `MAT-${item.num}`;
    const slvFileName = `${slvCode}.png`;
    const matFileName = `${matCode}.jpg`;

    const slvDest = path.join(sleevesDir, slvFileName);
    const matDest = path.join(playmatsDir, matFileName);

    // Generar Funda
    const slvSvg = generateSleeveSVG(item);
    await sharp(Buffer.from(slvSvg))
      .png({ quality: 100, compressionLevel: 6 })
      .toFile(slvDest);

    // Generar Tapete
    const matSvg = generatePlaymatSVG(item);
    await sharp(Buffer.from(matSvg))
      .jpeg({ quality: 96, mozjpeg: true })
      .toFile(matDest);

    console.log(`✓ Creada Pareja Oficial ${item.num}: ${item.name}`);

    finalSleevesDB.push({
      code: slvCode,
      name: `Funda ${item.name}`,
      description: item.descSleeve,
      price: item.priceSleeve,
      currency: item.currency,
      image: `/assets/images/sleeves/${slvFileName}`,
      offer_text: item.offerText,
      active: true
    });

    finalPlaymatsDB.push({
      code: matCode,
      name: `Tapete ${item.name}`,
      description: item.descMat,
      price: item.priceMat,
      currency: item.currency,
      image: `/assets/images/playmats/${matFileName}`,
      offer_text: item.offerText,
      active: true
    });
  }

  // Guardar Bases de Datos limpias
  const sleevesDBPath = path.resolve(__dirname, '../backend/data/sleeves_db.json');
  const playmatsDBPath = path.resolve(__dirname, '../backend/data/playmats_db.json');

  fs.writeFileSync(sleevesDBPath, JSON.stringify(finalSleevesDB, null, 2), 'utf8');
  fs.writeFileSync(playmatsDBPath, JSON.stringify(finalPlaymatsDB, null, 2), 'utf8');

  console.log("¡Bases de datos reiniciadas desde cero exitosamente con sólo 3 parejas!");
}

buildClean3Pairs().catch(console.error);
