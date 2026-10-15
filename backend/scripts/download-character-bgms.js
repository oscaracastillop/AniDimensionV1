/**
 * ANI-DIMENSION: EXPANDIR CATÁLOGO DE MÚSICAS PARA TODOS LOS PERSONAJES Y NPCS
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE_RAW_URL = 'https://raw.githubusercontent.com/Lahrenheit/EDOPRO-Soundpack/master';

const CHARACTER_BGM_FILES = [
    { urlPath: 'BGM/duel/62_Track%2062%20-%20Yu-Gi-Oh!%20-%20The%20Duelists%20of%20the%20Roses.mp3', target: 'bgm_duel_yugi_roses.mp3' },
    { urlPath: 'BGM/duel/BGM_DUEL_NORMAL_03%20%238582.mp3', target: 'bgm_duel_joey_rock.mp3' },
    { urlPath: 'BGM/duel/m_yuri%20(4).mp3', target: 'bgm_duel_marik_darkness.mp3' },
    { urlPath: 'BGM/duel/BGM_DUEL_NORMAL_04.mp3', target: 'bgm_duel_zane_cyber.mp3' },
    { urlPath: 'BGM/duel/BGM_DUEL_NORMAL_06.mp3', target: 'bgm_duel_turbo_synchro.mp3' },
    { urlPath: 'BGM/duel/BGM_DUEL_NORMAL_08.mp3', target: 'bgm_duel_legendary_gods.mp3' },
    { urlPath: 'BGM/duel/%E8%93%91%E9%83%A8%E9%9B%84%E5%B4%87%20-%20%E3%82%B9%E3%83%94%E3%83%BC%E3%83%89%E3%83%AF%E3%83%BC%E3%83%AB%E3%83%89.mp3', target: 'bgm_duel_speed_world.mp3' },
    { urlPath: 'BGM/duel/%E8%93%91%E9%83%A8%E9%9B%84%E5%B4%87%20-%20%E9%AC%BC%E6%9F%B3%E4%BA%AC%E4%BB%8B.mp3', target: 'bgm_duel_kalin_rock.mp3' }
];

function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        https.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
            }
            if (response.statusCode !== 200) {
                file.close();
                try { fs.unlinkSync(destPath); } catch(e) {}
                return reject(new Error(`Failed to download ${url}: Status ${response.statusCode}`));
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(() => resolve(destPath));
            });
        }).on('error', (err) => {
            file.close();
            try { fs.unlinkSync(destPath); } catch (e) {}
            reject(err);
        });
    });
}

async function main() {
    console.log('========================================================');
    console.log('🎸 DESCARGANDO TEMAS OFICIALES POR PERSONAJES Y NPCS');
    console.log('========================================================');

    const bgmDir = path.resolve(__dirname, '../../frontend/assets/audio/bgm');
    fs.mkdirSync(bgmDir, { recursive: true });

    for (const item of CHARACTER_BGM_FILES) {
        const url = `${BASE_RAW_URL}/${item.urlPath}`;
        const dest = path.join(bgmDir, item.target);
        try {
            process.stdout.write(`Descargando: ${item.target}... `);
            await downloadFile(url, dest);
            console.log('✅ OK');
        } catch (e) {
            console.log(`❌ ERROR: ${e.message}`);
        }
    }

    console.log('\n🎉 TODOS LOS TEMAS DE PERSONAJES DESCARGADOS CON ÉXITO');
}

main();
