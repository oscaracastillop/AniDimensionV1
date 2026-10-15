const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

/**
 * GET /api/audio/manifest
 * Devuelve el manifiesto completo de todos los archivos de sonido (BGM y SFX)
 * disponibles en el servidor para descarga bajo demanda en el APK o navegador.
 */
router.get('/manifest', (req, res) => {
    try {
        const rootAudio = path.resolve(__dirname, '../../frontend/assets/audio');
        const files = [];
        let totalBytes = 0;

        ['bgm', 'sfx'].forEach(category => {
            const dir = path.join(rootAudio, category);
            if (fs.existsSync(dir)) {
                const dirFiles = fs.readdirSync(dir);
                dirFiles.forEach(fileName => {
                    const fullPath = path.join(dir, fileName);
                    try {
                        const stat = fs.statSync(fullPath);
                        if (stat.isFile() && /\.(mp3|wav|ogg)$/i.test(fileName)) {
                            totalBytes += stat.size;
                            files.push({
                                name: fileName,
                                type: category,
                                path: `assets/audio/${category}/${fileName}`,
                                size: stat.size,
                                sizeFormatted: (stat.size / (1024 * 1024)).toFixed(2) + ' MB'
                            });
                        }
                    } catch (e) {}
                });
            }
        });

        res.json({
            success: true,
            version: '1.0.0',
            totalFiles: files.length,
            totalBytes: totalBytes,
            totalSizeMB: (totalBytes / (1024 * 1024)).toFixed(2) + ' MB',
            files: files
        });
    } catch (err) {
        console.error('[AUDIO MANIFEST ERROR]', err);
        res.status(500).json({ success: false, error: 'Error al generar manifiesto de audios' });
    }
});

module.exports = router;
