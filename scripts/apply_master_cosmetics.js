const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const brainDir = 'C:/Users/oscar.castillo/.gemini/antigravity-ide/brain/2ecb17c9-01af-4b9b-9c38-85f1ef5ba11e/';
const sleevesDir = path.resolve(__dirname, '../frontend/assets/images/sleeves');
const playmatsDir = path.resolve(__dirname, '../frontend/assets/images/playmats');

const pairs = [
  {
    code: 'SLV-001',
    matCode: 'MAT-001',
    name: 'Dragón Blanco de Ojos Azules Cósmico',
    descSleeve: 'Reverso de carta con el Dragón Blanco de Ojos Azules y marco de Ani-Dimension.',
    descMat: 'Superficie de duelo con el Dragón Blanco de Ojos Azules y vórtice dimensional.',
    priceSleeve: 50000,
    priceMat: 80000,
    currency: 'STARSHIPS',
    offerText: 'POPULAR',
    // Keep existing SLV-001.png and MAT-001.jpg
    slvSrc: null,
    matSrc: null
  },
  {
    code: 'SLV-002',
    matCode: 'MAT-002',
    name: 'Dragón Fénix Tricéfalo de Fuego',
    descSleeve: 'Poder del Dragón de Tres Cabezas de Fuego con marco dorado de Ani-Dimension Unleashed Pharaoh.',
    descMat: 'Superficie volcánica con el Dragón Fénix de Tres Cabezas y marco ornamental egipcio Ani-Dimension.',
    priceSleeve: 60000,
    priceMat: 90000,
    currency: 'STARSHIPS',
    offerText: 'NUEVO',
    slvSrc: 'media_1790966287830.png',
    matSrc: 'media_1790966287895.jpg',
    isUserUploaded: true
  },
  {
    code: 'SLV-003',
    matCode: 'MAT-003',
    name: 'Exodia el Prohibido Faraónico',
    descSleeve: 'El poder del Dios sellado The Forbidden One con el sello ancestral dorado oficial de Ani-Dimension.',
    descMat: 'Superficie cósmica con Exodia el Prohibido desatando su poder galáctico y marco faraónico Ani-Dimension.',
    priceSleeve: 95000,
    priceMat: 120000,
    currency: 'STARSHIPS',
    offerText: 'LEGENDARIO',
    slvSrc: 'media_1790966287949.png',
    matSrc: 'media_1790966288003.jpg',
    isUserUploaded: true
  },
  {
    code: 'SLV-004',
    matCode: 'MAT-004',
    name: 'Maga Oscura de los Círculos Arcanos',
    descSleeve: 'La Maga Oscura invocando círculos arcanos galácticos dentro del marco dorado sagrado de Ani-Dimension.',
    descMat: 'Santuario místico con la Maga Oscura y constelaciones arcanas con marco egipcio dorado Ani-Dimension.',
    priceSleeve: 65000,
    priceMat: 95000,
    currency: 'STARSHIPS',
    offerText: 'ÉPICO',
    slvSrc: 'slv_dark_magician_girl_gold_1790967975153.jpg',
    matSrc: 'mat_dark_magician_girl_gold_1790968001442.jpg'
  },
  {
    code: 'SLV-005',
    matCode: 'MAT-005',
    name: 'Slifer el Dragón del Cielo Divino',
    descSleeve: 'El Dios Egipcio Slifer el Dragón del Cielo con truenos carmesí y marco faraónico de Ani-Dimension.',
    descMat: 'Cielos de tormenta divina sobre las pirámides con Slifer y marco dorado ornamental de Ani-Dimension.',
    priceSleeve: 85000,
    priceMat: 130000,
    currency: 'STARSHIPS',
    offerText: 'DIVINO',
    slvSrc: 'slv_slifer_gold_1790968020452.jpg',
    matSrc: 'mat_slifer_gold_1790968057799.jpg'
  },
  {
    code: 'SLV-006',
    matCode: 'MAT-006',
    name: 'Obelisco el Atormentador Titánico',
    descSleeve: 'Fuerza colosal de Obelisco el Atormentador cargando su puño divino con marco de oro de Ani-Dimension.',
    descMat: 'Ruinas del templo ancestral con Obelisco desatando tormentas de zafiro y marco dorado de Ani-Dimension.',
    priceSleeve: 85000,
    priceMat: 130000,
    currency: 'STARSHIPS',
    offerText: 'DIVINO',
    slvSrc: 'slv_obelisk_gold_1790968096129.jpg',
    matSrc: 'mat_obelisk_gold_1790968115289.jpg'
  },
  {
    code: 'SLV-007',
    matCode: 'MAT-007',
    name: 'El Dragón Alado de Ra Solar',
    descSleeve: 'El Fénix divino de Ra bañado en oro y fuego solar sagrado con marco jeroglífico de Ani-Dimension.',
    descMat: 'Eclipse solar sobre el desierto sagrado con El Dragón Alado de Ra y marco dorado de Ani-Dimension.',
    priceSleeve: 95000,
    priceMat: 140000,
    currency: 'STARSHIPS',
    offerText: 'DIVINO',
    slvSrc: 'slv_ra_gold_1790968161242.jpg',
    matSrc: 'mat_ra_gold_1790968181687.jpg'
  },
  {
    code: 'SLV-008',
    matCode: 'MAT-008',
    name: 'Dragón Negro de Ojos Rojos Infernal',
    descSleeve: 'Feroz Dragón Negro de Ojos Rojos desatando llamaradas infernales con marco dorado de Ani-Dimension.',
    descMat: 'Fisuras volcánicas ardientes con el Dragón Negro de Ojos Rojos y marco ornamental egipcio de Ani-Dimension.',
    priceSleeve: 70000,
    priceMat: 100000,
    currency: 'STARSHIPS',
    offerText: 'ÉPICO',
    slvSrc: 'slv_red_eyes_gold_1790968239048.jpg',
    matSrc: 'mat_red_eyes_gold_1790968260931.jpg'
  }
];

async function applyMasterCosmetics() {
  const finalSleevesDB = [];
  const finalPlaymatsDB = [];

  for (const item of pairs) {
    const slvDest = path.join(sleevesDir, `${item.code}.png`);
    const matDest = path.join(playmatsDir, `${item.matCode}.jpg`);

    if (item.slvSrc) {
      const srcPath = item.isUserUploaded 
        ? path.join(brainDir, '.user_uploaded', item.slvSrc)
        : path.join(brainDir, item.slvSrc);

      await sharp(srcPath)
        .resize(600, 870, { fit: 'fill', kernel: 'lanczos3' })
        .sharpen()
        .png({ quality: 100, compressionLevel: 6 })
        .toFile(slvDest);
      console.log(`Funda ${item.code} creada con éxito.`);
    }

    if (item.matSrc) {
      const srcPath = item.isUserUploaded 
        ? path.join(brainDir, '.user_uploaded', item.matSrc)
        : path.join(brainDir, item.matSrc);

      await sharp(srcPath)
        .resize(1920, 1080, { fit: 'fill', kernel: 'lanczos3' })
        .sharpen()
        .jpeg({ quality: 95, mozjpeg: true })
        .toFile(matDest);
      console.log(`Tapete ${item.matCode} creado con éxito.`);
    }

    finalSleevesDB.push({
      code: item.code,
      name: `Funda ${item.name}`,
      description: item.descSleeve,
      price: item.priceSleeve,
      currency: item.currency,
      image: `/assets/images/sleeves/${item.code}.png`,
      offer_text: item.offerText,
      active: true
    });

    finalPlaymatsDB.push({
      code: item.matCode,
      name: `Tapete ${item.name}`,
      description: item.descMat,
      price: item.priceMat,
      currency: item.currency,
      image: `/assets/images/playmats/${item.matCode}.jpg`,
      offer_text: item.offerText,
      active: true
    });
  }

  // Guardar bases de datos
  const sleevesDBPath = path.resolve(__dirname, '../backend/data/sleeves_db.json');
  const playmatsDBPath = path.resolve(__dirname, '../backend/data/playmats_db.json');

  fs.writeFileSync(sleevesDBPath, JSON.stringify(finalSleevesDB, null, 2), 'utf8');
  fs.writeFileSync(playmatsDBPath, JSON.stringify(finalPlaymatsDB, null, 2), 'utf8');

  console.log("¡Bases de datos de cosméticos maestras actualizadas con éxito!");
}

applyMasterCosmetics().catch(console.error);
