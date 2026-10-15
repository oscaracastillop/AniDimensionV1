/**
 * ANI-DIMENSION: GENERADOR DE EFECTOS ESPECIALES ANIME Y TIENDA
 * (Fusión, Sincronía, Exodia, Abrir Sobres, Compras, Login y "Es Hora del Duelo")
 */
const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;

function createWavBuffer(samplesL, samplesR) {
    const numChannels = samplesR ? 2 : 1;
    const numSamples = samplesL.length;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = SAMPLE_RATE * blockAlign;
    const dataSize = numSamples * blockAlign;
    const buffer = Buffer.alloc(44 + dataSize);

    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(SAMPLE_RATE, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    let offset = 44;
    let maxAmp = 0.001;
    for (let i = 0; i < numSamples; i++) {
        const aL = Math.abs(samplesL[i]);
        const aR = samplesR ? Math.abs(samplesR[i]) : 0;
        if (aL > maxAmp) maxAmp = aL;
        if (aR > maxAmp) maxAmp = aR;
    }
    const norm = maxAmp > 0.95 ? 0.95 / maxAmp : 1.0;

    for (let i = 0; i < numSamples; i++) {
        let sL = Math.max(-1, Math.min(1, samplesL[i] * norm));
        buffer.writeInt16LE(Math.round(sL < 0 ? sL * 0x8000 : sL * 0x7FFF), offset);
        offset += 2;
        if (numChannels === 2) {
            let sR = Math.max(-1, Math.min(1, samplesR[i] * norm));
            buffer.writeInt16LE(Math.round(sR < 0 ? sR * 0x8000 : sR * 0x7FFF), offset);
            offset += 2;
        }
    }
    return buffer;
}

function sine(freq, t) { return Math.sin(2 * Math.PI * freq * t); }
function saw(freq, t) { return 2 * ((freq * t) % 1) - 1; }
function square(freq, t) { return ((freq * t) % 1) < 0.5 ? 1 : -1; }
function noise() { return Math.random() * 2 - 1; }

// 1. Invocación por Fusión / Polimerización (Vórtice espiral + explosión mística)
function generateFusionSummon() {
    const dur = 2.6;
    const len = Math.floor(dur * SAMPLE_RATE);
    const outL = new Float32Array(len);
    const outR = new Float32Array(len);

    for (let i = 0; i < len; i++) {
        const t = i / SAMPLE_RATE;
        if (t < 1.4) {
            // Swirling vortex frequency sweep & panning
            const pan = Math.sin(2 * Math.PI * 4 * t);
            const freq = 180 + Math.pow(t / 1.4, 2) * 900;
            const vortex = (saw(freq, t) * 0.4 + sine(freq * 1.5, t) * 0.3) * (t / 1.4);
            const hum = sine(65, t) * 0.4;
            outL[i] = (vortex * (0.5 - pan * 0.4) + hum) * 0.7;
            outR[i] = (vortex * (0.5 + pan * 0.4) + hum) * 0.7;
        } else {
            // Fusion emergence burst
            const tBurst = t - 1.4;
            const blast = noise() * Math.exp(-tBurst * 6.0) * 0.5;
            const choir = (sine(440, tBurst) + sine(554.37, tBurst) + sine(659.25, tBurst)) * Math.exp(-tBurst * 2.5) * 0.5;
            const sub = sine(55 * Math.exp(-tBurst * 4), tBurst) * Math.exp(-tBurst * 2.0) * 0.7;
            outL[i] = (blast + choir + sub) * 0.8;
            outR[i] = (blast + choir + sub) * 0.8;
        }
    }
    return createWavBuffer(outL, outR);
}

// 2. Invocación por Sincronía (Anillos de afinación + Rayo estelar)
function generateSynchroSummon() {
    const dur = 2.4;
    const len = Math.floor(dur * SAMPLE_RATE);
    const out = new Float32Array(len);

    for (let i = 0; i < len; i++) {
        const t = i / SAMPLE_RATE;
        // Tuning rings chimes
        let rings = 0;
        [0.0, 0.25, 0.5, 0.75].forEach((ringStart, idx) => {
            if (t >= ringStart) {
                const tr = t - ringStart;
                const ringFreq = 1200 + idx * 300;
                rings += sine(ringFreq, tr) * Math.exp(-tr * 8.0) * 0.3;
            }
        });

        // Cosmic laser beam release at 1.0s
        let beam = 0;
        if (t >= 1.0) {
            const tb = t - 1.0;
            const beamSweep = saw(400 + Math.pow(tb, 0.5) * 2000, tb) * Math.exp(-tb * 3.0) * 0.45;
            const boom = sine(80 * Math.exp(-tb * 10), tb) * Math.exp(-tb * 4) * 0.7;
            beam = beamSweep + boom;
        }
        out[i] = rings + beam;
    }
    return createWavBuffer(out, out);
}

// 3. Exodia El Prohibido / Victoria Inmediata (Trueno divino "Obliterate")
function generateExodiaWin() {
    const dur = 3.5;
    const len = Math.floor(dur * SAMPLE_RATE);
    const out = new Float32Array(len);

    for (let i = 0; i < len; i++) {
        const t = i / SAMPLE_RATE;
        const subEarthquake = sine(38 + 5 * Math.sin(t * 30), t) * Math.exp(-t * 0.8) * 0.8;
        const lightning = noise() * Math.exp(-t * 2.5) * (t < 0.2 ? t / 0.2 : 1) * 0.6;
        const divineHarmonics = (sine(220, t) + sine(330, t) + sine(440, t) + sine(550, t)) * Math.exp(-t * 1.5) * 0.4;
        out[i] = subEarthquake + lightning + divineHarmonics;
    }
    return createWavBuffer(out, out);
}

// 4. Abrir Sobre de Cartas (Rasgado de empaque + destello holográfico Ultra Raro)
function generatePackOpen() {
    const dur = 1.6;
    const len = Math.floor(dur * SAMPLE_RATE);
    const out = new Float32Array(len);

    for (let i = 0; i < len; i++) {
        const t = i / SAMPLE_RATE;
        // Foil tear whoosh
        let rip = 0;
        if (t < 0.45) {
            rip = noise() * Math.exp(-Math.pow((t - 0.2) * 15, 2)) * 0.6;
        }
        // Holographic sparkle reveal
        let sparkle = 0;
        if (t >= 0.3) {
            const ts = t - 0.3;
            sparkle = (sine(2400 + ts * 800, ts) + sine(3600 - ts * 400, ts)) * Math.exp(-ts * 4.0) * 0.35;
        }
        out[i] = rip + sparkle;
    }
    return createWavBuffer(out, out);
}

// 5. Compra Exitosa en Tienda (Monedas galácticas / StarShips chime)
function generateShopBuy() {
    const dur = 1.2;
    const len = Math.floor(dur * SAMPLE_RATE);
    const out = new Float32Array(len);

    for (let i = 0; i < len; i++) {
        const t = i / SAMPLE_RATE;
        const coin1 = (sine(1975.53, t) + sine(3951.07, t) * 0.4) * Math.exp(-t * 12) * 0.5; // B6
        let coin2 = 0;
        if (t > 0.1) {
            const t2 = t - 0.1;
            coin2 = (sine(2637.02, t2) + sine(5274.04, t2) * 0.4) * Math.exp(-t2 * 10) * 0.6; // E7
        }
        out[i] = coin1 + coin2;
    }
    return createWavBuffer(out, out);
}

// 6. Login y Registro Exitoso (Cyber Acceso Concedido)
function generateLoginSuccess() {
    const dur = 1.4;
    const len = Math.floor(dur * SAMPLE_RATE);
    const out = new Float32Array(len);

    const notes = [
        { f: 523.25, start: 0.0 }, // C5
        { f: 659.25, start: 0.12 }, // E5
        { f: 783.99, start: 0.24 }, // G5
        { f: 1046.50, start: 0.36 } // C6
    ];

    for (let i = 0; i < len; i++) {
        const t = i / SAMPLE_RATE;
        let chime = 0;
        for (const n of notes) {
            if (t >= n.start) {
                const tn = t - n.start;
                chime += sine(n.f, tn) * Math.exp(-tn * 6.0) * 0.35;
            }
        }
        const cyberHum = sine(130, t) * Math.exp(-t * 3.0) * 0.25;
        out[i] = chime + cyberHum;
    }
    return createWavBuffer(out, out);
}

// 7. Inicio de Duelo Anime ("¡Es Hora del Duelo!" / Gong de Batalla)
function generateDuelStartAnime() {
    const dur = 2.2;
    const len = Math.floor(dur * SAMPLE_RATE);
    const out = new Float32Array(len);

    for (let i = 0; i < len; i++) {
        const t = i / SAMPLE_RATE;
        // Cosmic gong & energetic bass powerup
        const gong = (sine(110, t) + sine(164.81, t) * 0.7 + sine(220, t) * 0.5) * Math.exp(-t * 2.0) * 0.7;
        const sub = sine(50 * Math.exp(-t * 5), t) * Math.exp(-t * 1.5) * 0.8;
        const shimmer = noise() * Math.exp(-t * 8) * 0.3;
        out[i] = gong + sub + shimmer;
    }
    return createWavBuffer(out, out);
}

function main() {
    const sfxDir = path.resolve(__dirname, '../../frontend/assets/audio/sfx');
    fs.mkdirSync(sfxDir, { recursive: true });

    fs.writeFileSync(path.join(sfxDir, 'sfx_fusion_summon.wav'), generateFusionSummon());
    fs.writeFileSync(path.join(sfxDir, 'sfx_synchro_summon.wav'), generateSynchroSummon());
    fs.writeFileSync(path.join(sfxDir, 'sfx_exodia_win.wav'), generateExodiaWin());
    fs.writeFileSync(path.join(sfxDir, 'sfx_pack_open.wav'), generatePackOpen());
    fs.writeFileSync(path.join(sfxDir, 'sfx_shop_buy.wav'), generateShopBuy());
    fs.writeFileSync(path.join(sfxDir, 'sfx_login_success.wav'), generateLoginSuccess());
    fs.writeFileSync(path.join(sfxDir, 'sfx_duel_start.wav'), generateDuelStartAnime());

    console.log('✅ Efectos de Fusión, Sincronía, Exodia, Tienda y Sobres generados!');
}

main();
