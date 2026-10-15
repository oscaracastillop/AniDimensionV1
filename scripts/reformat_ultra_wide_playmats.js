const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const brainDir = 'C:/Users/oscar.castillo/.gemini/antigravity-ide/brain/2ecb17c9-01af-4b9b-9c38-85f1ef5ba11e/';
const playmatsDir = path.resolve(__dirname, '../frontend/assets/images/playmats');

const matSources = [
  {
    code: 'MAT-001',
    src: path.join(brainDir, '.tempmediaStorage/media_1790877613300.jpg') // Original high res Blue Eyes
  },
  {
    code: 'MAT-002',
    src: path.join(brainDir, '.user_uploaded/media_1790966287895.jpg')
  },
  {
    code: 'MAT-003',
    src: path.join(brainDir, '.user_uploaded/media_1790966288003.jpg')
  },
  {
    code: 'MAT-004',
    src: path.join(brainDir, 'mat_dark_magician_girl_gold_1790968001442.jpg')
  },
  {
    code: 'MAT-005',
    src: path.join(brainDir, 'mat_slifer_gold_1790968057799.jpg')
  },
  {
    code: 'MAT-006',
    src: path.join(brainDir, 'mat_obelisk_gold_1790968115289.jpg')
  },
  {
    code: 'MAT-007',
    src: path.join(brainDir, 'mat_ra_gold_1790968181687.jpg')
  },
  {
    code: 'MAT-008',
    src: path.join(brainDir, 'mat_red_eyes_gold_1790968260931.jpg')
  }
];

async function reformatUltraWidePlaymats() {
  console.log("Iniciando formateo ultra-panorámico de tapetes (más anchos que altos, borde dorado delgado y borde negro exterior integrado)...");

  // Output Playmat Dimensions: Ultra-wide ratio 2.18:1 (1920 x 880)
  const targetW = 1920;
  const targetH = 880;
  const blackBorder = 16; // Outer stitched black playmat border in pixels

  const innerW = targetW - (blackBorder * 2); // 1888
  const innerH = targetH - (blackBorder * 2); // 848

  for (const item of matSources) {
    const destPath = path.join(playmatsDir, `${item.code}.jpg`);

    let srcPath = item.src;
    if (!fs.existsSync(srcPath)) {
      srcPath = path.join(playmatsDir, `${item.code}.jpg`);
    }

    if (!fs.existsSync(srcPath)) {
      console.warn(`Archivo fuente no encontrado para ${item.code}`);
      continue;
    }

    const inputBuffer = fs.readFileSync(srcPath);
    const metadata = await sharp(inputBuffer).metadata();
    const srcW = metadata.width;
    const srcH = metadata.height;

    // Crop slightly from the outer edges to slim down the thick golden frame
    const cropHorizontalMargin = Math.round(srcW * 0.04);
    const cropVerticalMargin = Math.round(srcH * 0.06);

    const extractWidth = srcW - (cropHorizontalMargin * 2);
    const extractHeight = srcH - (cropVerticalMargin * 2);

    const croppedArtBuffer = await sharp(inputBuffer)
      .extract({
        left: cropHorizontalMargin,
        top: cropVerticalMargin,
        width: extractWidth,
        height: extractHeight
      })
      .resize(innerW, innerH, {
        fit: 'fill',
        kernel: 'lanczos3'
      })
      .sharpen()
      .toBuffer();

    // Composite inside solid black background
    const outputBuffer = await sharp({
      create: {
        width: targetW,
        height: targetH,
        channels: 3,
        background: { r: 8, g: 8, b: 10 }
      }
    })
    .composite([
      {
        input: croppedArtBuffer,
        top: blackBorder,
        left: blackBorder
      }
    ])
    .jpeg({ quality: 96, mozjpeg: true })
    .toBuffer();

    fs.writeFileSync(destPath, outputBuffer);
    console.log(`Tapete ${item.code} re-procesado en 1920x880 (Ultra-Wide + Borde Negro): ${destPath}`);
  }

  console.log("¡Todos los tapetes han sido actualizados con éxito!");
}

reformatUltraWidePlaymats().catch(console.error);
