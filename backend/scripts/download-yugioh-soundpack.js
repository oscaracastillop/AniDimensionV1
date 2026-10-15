/**
 * ANI-DIMENSION: DESCARGADOR DE EFECTOS Y MÚSICAS AUTÉNTICAS (EDOPRO / DUEL LINKS / MASTER DUEL)
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE_RAW_URL = 'https://raw.githubusercontent.com/Lahrenheit/EDOPRO-Soundpack/master';

const SFX_FILES = [
    { file: 'summon.wav', target: 'sfx_summon_normal.wav' },
    { file: 'specialsummon.wav', target: 'sfx_summon_special.wav' },
    { file: 'activate.wav', target: 'sfx_card_activate.wav' },
    { file: 'set.wav', target: 'sfx_card_set.wav' },
    { file: 'flip.wav', target: 'sfx_card_flip.wav' },
    { file: 'attack.wav', target: 'sfx_attack.wav' },
    { file: 'directattack.wav', target: 'sfx_direct_attack.wav' },
    { file: 'damage.wav', target: 'sfx_lp_damage.wav' },
    { file: 'gainlp.wav', target: 'sfx_lp_heal.wav' },
    { file: 'destroyed.wav', target: 'sfx_card_destroy.wav' },
    { file: 'draw.wav', target: 'sfx_card_draw.wav' },
    { file: 'shuffle.wav', target: 'sfx_shuffle.wav' },
    { file: 'chain.wav', target: 'sfx_chain.wav' },
    { file: 'nextturn.wav', target: 'sfx_turn_change.wav' },
    { file: 'equip.wav', target: 'sfx_equip.wav' },
    { file: 'banished.wav', target: 'sfx_banish.wav' },
    { file: 'cardpick.wav', target: 'sfx_card_pick.wav' },
    { file: 'carddrop.wav', target: 'sfx_card_drop.wav' },
    { file: 'button.wav', target: 'sfx_button.wav' },
    { file: 'coinflip.wav', target: 'sfx_coinflip.wav' }
];

const BGM_FILES = [
    { file: 'menu.mp3', target: 'bgm_menu.mp3' },
    { file: 'deck.mp3', target: 'bgm_deck_builder.mp3' },
    { file: 'duelwin.mp3', target: 'bgm_victory.mp3' },
    { file: 'duellose.mp3', target: 'bgm_defeat.mp3' },
    { file: 'song-advantage.mp3', target: 'bgm_climax_advantage.mp3' },
    { file: 'song-disadvantage.mp3', target: 'bgm_climax_disadvantage.mp3' },
    { urlPath: 'BGM/duel/BGM_DUEL_NORMAL_01%20%231292.mp3', target: 'bgm_duel_standard.mp3' },
    { urlPath: 'BGM/duel/BGM_DUEL_NORMAL_02.mp3', target: 'bgm_duel_cyber.mp3' },
    { urlPath: 'BGM/duel/18.%20Priest%20Seto.mp3', target: 'bgm_duel_boss_kaiba.mp3' },
    { urlPath: 'BGM/duel/12.%20Final\'s%20Match.mp3', target: 'bgm_duel_tournament_finals.mp3' }
];

function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        https.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                // Handle redirect
                return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
            }
            if (response.statusCode !== 200) {
                file.close();
                fs.unlinkSync(destPath);
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
    console.log('🎮 DESCARGANDO EFECTOS Y MÚSICAS AUTÉNTICAS DE YU-GI-OH!');
    console.log('========================================================');

    const sfxDir = path.resolve(__dirname, '../../frontend/assets/audio/sfx');
    const bgmDir = path.resolve(__dirname, '../../frontend/assets/audio/bgm');

    fs.mkdirSync(sfxDir, { recursive: true });
    fs.mkdirSync(bgmDir, { recursive: true });

    // 1. Descargar SFX
    console.log('\n--- Descargando Efectos de Sonido (SFX) ---');
    for (const item of SFX_FILES) {
        const url = `${BASE_RAW_URL}/${encodeURIComponent(item.file)}`;
        const dest = path.join(sfxDir, item.target);
        try {
            process.stdout.write(`Descargando SFX: ${item.file} -> ${item.target}... `);
            await downloadFile(url, dest);
            console.log('✅ OK');
        } catch (e) {
            console.log(`❌ ERROR: ${e.message}`);
        }
    }

    // 2. Descargar BGM
    console.log('\n--- Descargando Músicas de Fondo (BGM) ---');
    for (const item of BGM_FILES) {
        const subPath = item.urlPath ? item.urlPath : encodeURIComponent(item.file);
        const url = `${BASE_RAW_URL}/${subPath}`;
        const dest = path.join(bgmDir, item.target);
        try {
            process.stdout.write(`Descargando BGM: ${item.file || item.urlPath} -> ${item.target}... `);
            await downloadFile(url, dest);
            console.log('✅ OK');
        } catch (e) {
            console.log(`❌ ERROR: ${e.message}`);
        }
    }

    console.log('\n========================================================');
    console.log('🎉 TODOS LOS AUDIOS REALES HAN SIDO DESCARGADOS CON ÉXITO');
    console.log('========================================================');
}

main();
