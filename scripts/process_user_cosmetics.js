const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const USER_UPLOAD_DIR = 'C:/Users/oscar.castillo/.gemini/antigravity-ide/brain/2ecb17c9-01af-4b9b-9c38-85f1ef5ba11e/.user_uploaded/';
const SLEEVES_DIR = path.resolve(__dirname, '../frontend/assets/images/sleeves');
const PLAYMATS_DIR = path.resolve(__dirname, '../frontend/assets/images/playmats');

async function processUserCosmetics() {
  console.log("Procesando imágenes de Fundas y Tapetes subidas por el usuario...");

  // 1. Funda Dragón Tricéfalo (media_1790966287830.png) -> SLV-002.png
  await sharp(path.join(USER_UPLOAD_DIR, 'media_1790966287830.png'))
    .resize(600, 870, { fit: 'fill', kernel: 'lanczos3' })
    .sharpen()
    .png({ quality: 100, compressionLevel: 6 })
    .toFile(path.join(SLEEVES_DIR, 'SLV-002.png'));
  console.log("Funda SLV-002 (Dragón Tricéfalo Fuego) guardada en HD.");

  // 2. Funda Exodia (media_1790966287949.png) -> SLV-003.png
  await sharp(path.join(USER_UPLOAD_DIR, 'media_1790966287949.png'))
    .resize(600, 870, { fit: 'fill', kernel: 'lanczos3' })
    .sharpen()
    .png({ quality: 100, compressionLevel: 6 })
    .toFile(path.join(SLEEVES_DIR, 'SLV-003.png'));
  console.log("Funda SLV-003 (Exodia Faraónico) guardada en HD.");

  // 3. Tapete Dragón Tricéfalo (media_1790966287895.jpg) -> MAT-002.jpg
  await sharp(path.join(USER_UPLOAD_DIR, 'media_1790966287895.jpg'))
    .resize(1920, 1080, { fit: 'fill', kernel: 'lanczos3' })
    .sharpen()
    .jpeg({ quality: 95, mozjpeg: true })
    .toFile(path.join(PLAYMATS_DIR, 'MAT-002.jpg'));
  console.log("Tapete MAT-002 (Dragón Tricéfalo Volcán) guardado en HD.");

  // 4. Tapete Exodia (media_1790966288003.jpg) -> MAT-003.jpg
  await sharp(path.join(USER_UPLOAD_DIR, 'media_1790966288003.jpg'))
    .resize(1920, 1080, { fit: 'fill', kernel: 'lanczos3' })
    .sharpen()
    .jpeg({ quality: 95, mozjpeg: true })
    .toFile(path.join(PLAYMATS_DIR, 'MAT-003.jpg'));
  console.log("Tapete MAT-003 (Exodia Nebulosa Cósmica) guardado en HD.");

  // Actualizar base de datos de fundas
  const sleevesDBPath = path.resolve(__dirname, '../backend/data/sleeves_db.json');
  let sleevesDB = [];
  if (fs.existsSync(sleevesDBPath)) {
    sleevesDB = JSON.parse(fs.readFileSync(sleevesDBPath, 'utf8'));
  }

  // Update or insert SLV-002 and SLV-003
  const s2Idx = sleevesDB.findIndex(s => s.code === 'SLV-002');
  const s2Data = {
    code: "SLV-002",
    name: "Funda Dragón Fénix Tricéfalo",
    description: "Poder del Dragón de Tres Cabezas de Fuego y sello Unleashed Pharaoh con marco dorado de Ani-Dimension.",
    price: 60000,
    currency: "STARSHIPS",
    image: "/assets/images/sleeves/SLV-002.png",
    offer_text: "NUEVO",
    active: true
  };
  if (s2Idx >= 0) sleevesDB[s2Idx] = s2Data; else sleevesDB.push(s2Data);

  const s3Idx = sleevesDB.findIndex(s => s.code === 'SLV-003');
  const s3Data = {
    code: "SLV-003",
    name: "Funda Exodia el Prohibido Faraónico",
    description: "El poder del Dios sellado The Forbidden One con el sello ancestral dorado oficial de Ani-Dimension.",
    price: 95000,
    currency: "STARSHIPS",
    image: "/assets/images/sleeves/SLV-003.png",
    offer_text: "LEGENDARIO",
    active: true
  };
  if (s3Idx >= 0) sleevesDB[s3Idx] = s3Data; else sleevesDB.push(s3Data);

  fs.writeFileSync(sleevesDBPath, JSON.stringify(sleevesDB, null, 2), 'utf8');

  // Actualizar base de datos de tapetes
  const playmatsDBPath = path.resolve(__dirname, '../backend/data/playmats_db.json');
  let playmatsDB = [];
  if (fs.existsSync(playmatsDBPath)) {
    playmatsDB = JSON.parse(fs.readFileSync(playmatsDBPath, 'utf8'));
  }

  const m2Idx = playmatsDB.findIndex(m => m.code === 'MAT-002');
  const m2Data = {
    code: "MAT-002",
    name: "Tapete Coliseo Dragón Fénix de Fuego",
    description: "Superficie de duelo volcánica con el Dragón de Tres Cabezas incandescente y marco ornamental egipcio.",
    price: 90000,
    currency: "STARSHIPS",
    image: "/assets/images/playmats/MAT-002.jpg",
    offer_text: "NUEVO",
    active: true
  };
  if (m2Idx >= 0) playmatsDB[m2Idx] = m2Data; else playmatsDB.push(m2Data);

  const m3Idx = playmatsDB.findIndex(m => m.code === 'MAT-003');
  const m3Data = {
    code: "MAT-003",
    name: "Tapete Nebulosa de Exodia el Prohibido",
    description: "Superficie cósmica con Exodia el Prohibido desatando su poder galáctico y marco faraónico Ani-Dimension.",
    price: 120000,
    currency: "STARSHIPS",
    image: "/assets/images/playmats/MAT-003.jpg",
    offer_text: "LEGENDARIO",
    active: true
  };
  if (m3Idx >= 0) playmatsDB[m3Idx] = m3Data; else playmatsDB.push(m3Data);

  fs.writeFileSync(playmatsDBPath, JSON.stringify(playmatsDB, null, 2), 'utf8');

  console.log("¡Todo procesado y actualizado con éxito!");
}

processUserCosmetics().catch(console.error);
