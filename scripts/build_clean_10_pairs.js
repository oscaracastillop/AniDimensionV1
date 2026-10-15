const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const brainDir = 'C:/Users/oscar.castillo/.gemini/antigravity-ide/brain/2ecb17c9-01af-4b9b-9c38-85f1ef5ba11e/';
const sleevesDir = path.resolve(__dirname, '../frontend/assets/images/sleeves');
const playmatsDir = path.resolve(__dirname, '../frontend/assets/images/playmats');

// 1. LIMPIEZA TOTAL DE CARPETAS
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

console.log("Carpetas sleeves y playmats limpiadas por completo.");

// 2. DEFINICIÓN DE LAS 10 PAREJAS OFICIALES
const pairs = [
  {
    num: '001',
    name: 'Maga Oscura de los Círculos Arcanos',
    descSleeve: 'La Maga Oscura en pose de combate mágico invocando círculos arcanos con su varita estelar.',
    descMat: 'Santuario galáctico místico con la Maga Oscura desatando constelaciones arcanas de poder.',
    priceSleeve: 50000,
    priceMat: 80000,
    currency: 'STARSHIPS',
    offerText: 'POPULAR',
    slvSrc: path.join(brainDir, 'slv_dark_magician_girl_gold_1790967975153.jpg'),
    matSrc: path.join(brainDir, 'mat_dark_magician_girl_gold_1790968001442.jpg')
  },
  {
    num: '002',
    name: 'Slifer el Dragón del Cielo Divino',
    descSleeve: 'El colosal Dios del Cielo rugiendo con truenos carmesí y aura de tormenta celestial.',
    descMat: 'Cielos de tormenta sobre las pirámides con el Dios Slifer desatando relámpagos rojos divinos.',
    priceSleeve: 75000,
    priceMat: 110000,
    currency: 'STARSHIPS',
    offerText: 'DIVINO',
    slvSrc: path.join(brainDir, 'slv_slifer_gold_1790968020452.jpg'),
    matSrc: path.join(brainDir, 'mat_slifer_gold_1790968057799.jpg')
  },
  {
    num: '003',
    name: 'Obelisco el Atormentador Titánico',
    descSleeve: 'El Dios de la Fuerza Titánica cargando su puño destructor con relámpagos de zafiro.',
    descMat: 'Ruinas del templo ancestral en el desierto con Obelisco desatando tormentas de energía azul.',
    priceSleeve: 75000,
    priceMat: 110000,
    currency: 'STARSHIPS',
    offerText: 'DIVINO',
    slvSrc: path.join(brainDir, 'slv_obelisk_gold_1790968096129.jpg'),
    matSrc: path.join(brainDir, 'mat_obelisk_gold_1790968115289.jpg')
  },
  {
    num: '004',
    name: 'El Dragón Alado de Ra Solar',
    descSleeve: 'El Fénix divino de Ra en pleno resplandor de oro fundido y fuego solar eterno.',
    descMat: 'Gran eclipse solar sobre las pirámides sagradas con El Dragón Alado de Ra en gloria dorada.',
    priceSleeve: 85000,
    priceMat: 125000,
    currency: 'STARSHIPS',
    offerText: 'DIVINO',
    slvSrc: path.join(brainDir, 'slv_ra_gold_1790968161242.jpg'),
    matSrc: path.join(brainDir, 'mat_ra_gold_1790968181687.jpg')
  },
  {
    num: '005',
    name: 'Dragón Negro de Ojos Rojos Infernal',
    descSleeve: 'La feroz mirada carmesí y llamaradas infernales del temible Dragón Negro de Ojos Rojos.',
    descMat: 'Fisuras de lava y riscos volcánicos oscuros con el Dragón Negro de Ojos Rojos rugiendo fuego.',
    priceSleeve: 60000,
    priceMat: 95000,
    currency: 'STARSHIPS',
    offerText: 'ÉPICO',
    slvSrc: path.join(brainDir, 'slv_red_eyes_gold_1790968239048.jpg'),
    matSrc: path.join(brainDir, 'mat_red_eyes_gold_1790968260931.jpg')
  },
  {
    num: '006',
    name: 'Dragón Fénix Tricéfalo de Fuego',
    descSleeve: 'El Dragón de Tres Cabezas desatando llamaradas ardientes en su pedestal de gloria.',
    descMat: 'Cráter de volcán ardiente con el Dragón Fénix Tricéfalo extendiendo sus alas de fuego.',
    priceSleeve: 60000,
    priceMat: 90000,
    currency: 'STARSHIPS',
    offerText: 'NUEVO',
    slvSrc: path.join(brainDir, '.user_uploaded/media_1790966287830.png'),
    matSrc: path.join(brainDir, '.user_uploaded/media_1790966287895.jpg')
  },
  {
    num: '007',
    name: 'Exodia el Prohibido Faraónico',
    descSleeve: 'El Dios sellado de poder infinito rompiendo las cadenas del olvido.',
    descMat: 'Nebulosa cósmica ancestral con Exodia el Prohibido desatando su energía suprema.',
    priceSleeve: 90000,
    priceMat: 130000,
    currency: 'STARSHIPS',
    offerText: 'LEGENDARIO',
    slvSrc: path.join(brainDir, '.user_uploaded/media_1790966287949.png'),
    matSrc: path.join(brainDir, '.user_uploaded/media_1790966288003.jpg')
  },
  {
    num: '008',
    name: 'Dragón Blanco de Ojos Azules Cósmico',
    descSleeve: 'El legendario Dragón Blanco de Ojos Azules con destellos de energía astral.',
    descMat: 'Vórtice dimensional cósmico con el Dragón Blanco de Ojos Azules surcando el espacio.',
    priceSleeve: 55000,
    priceMat: 85000,
    currency: 'STARSHIPS',
    offerText: 'POPULAR',
    slvSrc: path.join(brainDir, 'sleeve_digital_art_1790967033652.jpg'),
    matSrc: path.join(brainDir, '.tempmediaStorage/media_1790877613300.jpg')
  },
  {
    num: '009',
    name: 'Maga Oscura de Noche de Brujas',
    descSleeve: 'La Maga Oscura con atuendo de hechicera de Halloween, linternas y luna llena.',
    descMat: 'Castillo y bosque encantado de medianoche con la Maga Oscura y fuegos fatuos.',
    priceSleeve: 65000,
    priceMat: 95000,
    currency: 'STARSHIPS',
    offerText: 'EDICIÓN ESPECIAL',
    slvSrc: path.resolve(__dirname, '../frontend/assets/images/events/halloween_maga_oscura.jpg'),
    matSrc: path.resolve(__dirname, '../frontend/assets/images/events/halloween_maga_oscura.jpg')
  },
  {
    num: '010',
    name: 'Cyber Dragón Infinito Neón',
    descSleeve: 'Coraza de titanio y circuitos cuánticos de alta velocidad del Cyber Dragón.',
    descMat: 'Pista de datos cuántica en el ciberespacio con el Cyber Dragón y rayos de luz neón.',
    priceSleeve: 70000,
    priceMat: 100000,
    currency: 'STARSHIPS',
    offerText: 'CIBER',
    slvSrc: null, // Generated procedurally in high-res
    matSrc: null
  }
];

async function generateProceduralCyber(isPlaymat) {
  if (isPlaymat) {
    const W = 1920, H = 860;
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
      <defs>
        <radialGradient id="cybCenter" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
          <stop offset="25%" stop-color="#00f0ff" stop-opacity="0.7"/>
          <stop offset="65%" stop-color="#02132e" stop-opacity="0.95"/>
          <stop offset="100%" stop-color="#01040a" stop-opacity="1"/>
        </radialGradient>
        <pattern id="gridCyb" width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M50 0 L0 0 0 50" fill="none" stroke="#00d2ff" stroke-width="0.8" stroke-opacity="0.2"/>
        </pattern>
        <filter id="cGlow"><feGaussianBlur stdDeviation="6" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter>
      </defs>
      <rect width="${W}" height="${H}" fill="#01050f"/>
      <rect width="${W}" height="${H}" fill="url(#cybCenter)"/>
      <rect width="${W}" height="${H}" fill="url(#gridCyb)"/>
      <g stroke="#00f0ff" stroke-width="1.5" stroke-opacity="0.6" fill="none" filter="url(#cGlow)">
        <circle cx="${W/2}" cy="${H/2}" r="220" stroke-dasharray="16 8"/>
        <circle cx="${W/2}" cy="${H/2}" r="160" stroke="#ffd700" stroke-width="2"/>
        <polygon points="${W/2},${H/2-130} ${W/2+112},${H/2+65} ${W/2-112},${H/2+65}"/>
        <polygon points="${W/2},${H/2+130} ${W/2+112},${H/2-65} ${W/2-112},${H/2-65}"/>
      </g>
      <text x="${W/2}" y="${H/2+10}" fill="#ffffff" font-family="'Orbitron', sans-serif" font-size="28" font-weight="900" letter-spacing="8" text-anchor="middle" filter="url(#cGlow)">CYBER DRAGON INFINITY</text>
      <text x="${W/2}" y="50" fill="#ffd700" font-family="'Orbitron', sans-serif" font-size="14" font-weight="900" letter-spacing="4" text-anchor="middle">ANI DIMENSION DUEL ARENA</text>
    </svg>`;
    return sharp(Buffer.from(svg)).jpeg({ quality: 96 }).toBuffer();
  } else {
    const W = 600, H = 870;
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
      <defs>
        <radialGradient id="cybSleeve" cx="50%" cy="45%" r="65%">
          <stop offset="0%" stop-color="#00f0ff" stop-opacity="0.95"/>
          <stop offset="60%" stop-color="#021026" stop-opacity="1"/>
          <stop offset="100%" stop-color="#010308" stop-opacity="1"/>
        </radialGradient>
        <filter id="cGlow"><feGaussianBlur stdDeviation="6" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter>
      </defs>
      <rect width="${W}" height="${H}" fill="#010308"/>
      <rect x="10" y="10" width="${W-20}" height="${H-20}" rx="8" fill="url(#cybSleeve)"/>
      <g stroke="#00f0ff" stroke-width="1.8" fill="none" filter="url(#cGlow)">
        <circle cx="${W/2}" cy="${H/2-15}" r="170" stroke-dasharray="14 7"/>
        <circle cx="${W/2}" cy="${H/2-15}" r="120" stroke="#ffd700" stroke-width="2"/>
        <polygon points="${W/2},${H/2-125} ${W/2+95},${H/2+40} ${W/2-95},${H/2+40}"/>
        <polygon points="${W/2},${H/2+95} ${W/2+95},${H/2-70} ${W/2-95},${H/2-70}"/>
      </g>
      <text x="${W/2}" y="${H/2-5}" fill="#ffffff" font-family="'Orbitron', sans-serif" font-size="18" font-weight="900" letter-spacing="4" text-anchor="middle" filter="url(#cGlow)">CYBER DRAGON</text>
      <text x="${W/2}" y="55" fill="#ffd700" font-family="'Orbitron', sans-serif" font-size="12" font-weight="900" letter-spacing="3" text-anchor="middle">ANI DIMENSION</text>
      <text x="${W/2}" y="${H-40}" fill="#00f0ff" font-family="'Orbitron', sans-serif" font-size="11" font-weight="700" letter-spacing="2" text-anchor="middle">SLV-010 • HOLO</text>
    </svg>`;
    return sharp(Buffer.from(svg)).png({ quality: 100 }).toBuffer();
  }
}

async function processAll10Pairs() {
  const finalSleevesDB = [];
  const finalPlaymatsDB = [];

  // DIMENSIONES ESTRICTAS
  // Tapetes: Ultra-Wide 1920x860 (Ratio 2.23:1)
  const targetMatW = 1920;
  const targetMatH = 860;
  const blackBorder = 18; // 18px parejo en los 4 lados

  const innerMatW = targetMatW - (blackBorder * 2); // 1884
  const innerMatH = targetMatH - (blackBorder * 2); // 824

  // Fundas: Vertical 600x870 (Ratio 1:1.45)
  const targetSlvW = 600;
  const targetSlvH = 870;

  for (const item of pairs) {
    const slvCode = `SLV-${item.num}`;
    const matCode = `MAT-${item.num}`;
    const slvFileName = `${slvCode}.png`;
    const matFileName = `${matCode}.jpg`;

    const slvDest = path.join(sleevesDir, slvFileName);
    const matDest = path.join(playmatsDir, matFileName);

    console.log(`Procesando Pareja ${item.num}: ${item.name}...`);

    // 1. PROCESAR FUNDA (SLV)
    if (item.slvSrc && fs.existsSync(item.slvSrc)) {
      await sharp(item.slvSrc)
        .resize(targetSlvW, targetSlvH, { fit: 'fill', kernel: 'lanczos3' })
        .sharpen()
        .png({ quality: 100, compressionLevel: 6 })
        .toFile(slvDest);
    } else {
      const cybSlvBuf = await generateProceduralCyber(false);
      fs.writeFileSync(slvDest, cybSlvBuf);
    }

    // 2. PROCESAR TAPETE (MAT) - Formato Panorámico Ultra-Ancho + Borde Negro Simétrico Único
    if (item.matSrc && fs.existsSync(item.matSrc)) {
      const inputBuffer = fs.readFileSync(item.matSrc);
      const meta = await sharp(inputBuffer).metadata();
      const sW = meta.width;
      const sH = meta.height;

      // Calculate proportional center crop to avoid stretching (sin apachurrar)
      const targetAspect = innerMatW / innerMatH; // ~2.28
      const srcAspect = sW / sH;

      let cropW = sW;
      let cropH = sH;

      if (srcAspect > targetAspect) {
        // Source is wider than target
        cropW = Math.round(sH * targetAspect);
      } else {
        // Source is taller than target -> crop top/bottom symmetrically
        cropH = Math.round(sW / targetAspect);
      }

      const left = Math.max(0, Math.round((sW - cropW) / 2));
      const top = Math.max(0, Math.round((sH - cropH) / 2));

      // Extract proportional center art and resize to inner area
      const croppedArt = await sharp(inputBuffer)
        .extract({ left, top, width: cropW, height: cropH })
        .resize(innerMatW, innerMatH, { fit: 'fill', kernel: 'lanczos3' })
        .sharpen()
        .toBuffer();

      // Put inside solid black canvas (18px uniform black border around entire image)
      const matFinal = await sharp({
        create: {
          width: targetMatW,
          height: targetMatH,
          channels: 3,
          background: { r: 0, g: 0, b: 0 } // Pure black border
        }
      })
      .composite([
        {
          input: croppedArt,
          top: blackBorder,
          left: blackBorder
        }
      ])
      .jpeg({ quality: 96, mozjpeg: true })
      .toBuffer();

      fs.writeFileSync(matDest, matFinal);
    } else {
      const cybMatBuf = await generateProceduralCyber(true);
      fs.writeFileSync(matDest, cybMatBuf);
    }

    // 3. REGISTRAR EN BASES DE DATOS
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

    console.log(`✓ ${slvCode} y ${matCode} generados correctamente.`);
  }

  // 4. GUARDAR BASES DE DATOS REINICIADAS (001 a 010)
  const sleevesDBPath = path.resolve(__dirname, '../backend/data/sleeves_db.json');
  const playmatsDBPath = path.resolve(__dirname, '../backend/data/playmats_db.json');

  fs.writeFileSync(sleevesDBPath, JSON.stringify(finalSleevesDB, null, 2), 'utf8');
  fs.writeFileSync(playmatsDBPath, JSON.stringify(finalPlaymatsDB, null, 2), 'utf8');

  console.log("¡Colección de 10 Parejas Oficiales reiniciada con éxito (SLV-001 a 010 y MAT-001 a 010)!");
}

processAll10Pairs().catch(console.error);
