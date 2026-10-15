const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const playmatsDir = path.resolve(__dirname, '../frontend/assets/images/playmats');

async function processPlaymatsWithSlimGoldAndBlackBorder() {
  console.log("Iniciando ajuste de tapetes: borde dorado más delgado + borde negro exterior integrado...");

  const files = fs.readdirSync(playmatsDir).filter(f => f.startsWith('MAT-') && f.endsWith('.jpg'));

  for (const file of files) {
    const filePath = path.join(playmatsDir, file);
    const backupPath = path.join(playmatsDir, `${file}.bak`);

    // Create backup if not exists
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(filePath, backupPath);
    }

    const inputSource = fs.existsSync(backupPath) ? backupPath : filePath;

    // Target dimensions
    const W = 1920;
    const H = 1080;
    const blackBorderWidth = 24; // Stitched playmat black outer border

    // The inner art will be scaled slightly larger to reduce the thick golden frame,
    // then framed within the black border.
    const innerW = W - (blackBorderWidth * 2); // 1872
    const innerH = H - (blackBorderWidth * 2); // 1032

    // To make the gold border thinner and reveal more monster art, we zoom in slightly (e.g. 107%)
    const zoomFactor = 1.07;
    const extractW = Math.round(W / zoomFactor);
    const extractH = Math.round(H / zoomFactor);
    const left = Math.round((W - extractW) / 2);
    const top = Math.round((H - extractH) / 2);

    // 1. Zoom into the center of the original image (reducing outer gold frame thickness)
    const zoomedInner = await sharp(inputSource)
      .resize(W, H, { fit: 'fill' })
      .extract({ left, top, width: extractW, height: extractH })
      .resize(innerW, innerH, { fit: 'fill', kernel: 'lanczos3' })
      .toBuffer();

    // 2. Composite over solid black 1920x1080 canvas with a subtle inner dark contour
    await sharp({
      create: {
        width: W,
        height: H,
        channels: 3,
        background: { r: 10, g: 10, b: 12 } // Deep playmat black
      }
    })
    .composite([
      {
        input: zoomedInner,
        top: blackBorderWidth,
        left: blackBorderWidth
      }
    ])
    .jpeg({ quality: 96, mozjpeg: true })
    .toFile(filePath);

    console.log(`Tapete actualizado con éxito: ${file}`);
  }

  console.log("¡Todos los tapetes fueron actualizados directamente en las imágenes!");
}

processPlaymatsWithSlimGoldAndBlackBorder().catch(console.error);
