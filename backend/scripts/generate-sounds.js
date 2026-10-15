/**
 * ANI-DIMENSION: GENERADOR DE MÚSICA Y SFX EPIC ELECTRONIC METAL
 * Sintetizador de audio profesional: Riffs de guitarra distorsionada (Karplus-Strong / Tube Overdrive),
 * Batería de Metal (Double-Kick, Punch Snare, Cymbals), Sintetizadores Cyberpunk Supersaw y SFX de alto impacto.
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
    const bufferSize = 44 + dataSize;
    const buffer = Buffer.alloc(bufferSize);

    // RIFF header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);

    // fmt chunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20); // PCM
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(SAMPLE_RATE, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(16, 34); // 16-bit

    // data chunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    let offset = 44;
    // Normalizar si es necesario para evitar clipping
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
        let valL = sL < 0 ? sL * 0x8000 : sL * 0x7FFF;
        buffer.writeInt16LE(Math.round(valL), offset);
        offset += 2;

        if (numChannels === 2) {
            let sR = Math.max(-1, Math.min(1, samplesR[i] * norm));
            let valR = sR < 0 ? sR * 0x8000 : sR * 0x7FFF;
            buffer.writeInt16LE(Math.round(valR), offset);
            offset += 2;
        }
    }

    return buffer;
}

// =========================================================================
// DSP & SÍNTESIS DE GUITARRA ELÉCTRICA / DISTORSIÓN DE TUBO / DRUMS
// =========================================================================

function sine(freq, t) {
    return Math.sin(2 * Math.PI * freq * t);
}

function saw(freq, t) {
    return 2 * ((freq * t) % 1) - 1;
}

function square(freq, t, pwm = 0.5) {
    return ((freq * t) % 1) < pwm ? 1 : -1;
}

function noise() {
    return Math.random() * 2 - 1;
}

// Distorsión estilo amplificador de válvulas a alta ganancia (Heavy Metal Overdrive)
function tubeDistortion(input, gain = 8.0) {
    const x = input * gain;
    // Soft-clipping arc-tangent with asymmetric harmonic saturation
    return (Math.atan(x) + 0.15 * Math.sin(x * 1.5)) / (Math.PI / 2);
}

// Síntesis de Guitarra Eléctrica (Power Chords / Palm Mutes)
function synthesizeGuitarChord(rootFreq, fifthFreq, octaveFreq, duration, isPalmMute = false) {
    const len = Math.floor(duration * SAMPLE_RATE);
    const out = new Float32Array(len);
    const decayFactor = isPalmMute ? 18.0 : 3.5;

    for (let i = 0; i < len; i++) {
        const t = i / SAMPLE_RATE;
        const env = Math.exp(-t * decayFactor);
        // Osciladores de cuerdas con armónicos y ligera desafinación
        const r = (saw(rootFreq, t) + saw(rootFreq * 1.004, t)) * 0.5;
        const f = (saw(fifthFreq, t) + saw(fifthFreq * 0.997, t)) * 0.45;
        const o = (saw(octaveFreq, t) + saw(octaveFreq * 1.002, t)) * 0.35;
        const sub = sine(rootFreq / 2, t) * 0.2;
        const pickAttack = noise() * Math.exp(-t * (isPalmMute ? 120 : 60)) * 0.4;

        const raw = (r + f + o + sub + pickAttack) * env;
        // Pasar por amplificador con distorsión pesada
        out[i] = tubeDistortion(raw, isPalmMute ? 10.0 : 14.0) * (isPalmMute ? 0.7 : 0.9);
    }
    return out;
}

// Síntesis de Solo de Guitarra / Lead Metal
function synthesizeGuitarLeadNote(freq, duration, vibratoSpeed = 6.0, vibratoDepth = 0.02) {
    const len = Math.floor(duration * SAMPLE_RATE);
    const out = new Float32Array(len);

    for (let i = 0; i < len; i++) {
        const t = i / SAMPLE_RATE;
        const vib = 1.0 + (t > 0.15 ? Math.sin(2 * Math.PI * vibratoSpeed * t) * vibratoDepth : 0);
        const fVib = freq * vib;
        const env = t < 0.02 ? t / 0.02 : Math.exp(-(t - 0.02) * 2.2);

        const s1 = saw(fVib, t) * 0.5;
        const s2 = saw(fVib * 1.005, t) * 0.3;
        const sq = square(fVib, t, 0.4) * 0.3;
        const raw = (s1 + s2 + sq) * env;
        out[i] = tubeDistortion(raw, 12.0) * 0.75;
    }
    return out;
}

// =========================================================================
// 1. TEMA PRINCIPAL DE DUELO (EPIC CYBER METAL / 138 BPM / SEAMLESS LOOP)
// =========================================================================

function generateDuelTheme() {
    console.log('[AUDIO GENERATOR] Sintetizando "bgm_duel_theme.wav" (Epic Electronic Metal)...');
    const bpm = 138;
    const beatSec = 60 / bpm;
    const totalBars = 16;
    const totalBeats = totalBars * 4;
    const totalDuration = totalBeats * beatSec; // ~27.82s
    const totalSamples = Math.floor(totalDuration * SAMPLE_RATE);

    const outL = new Float32Array(totalSamples);
    const outR = new Float32Array(totalSamples);

    // Escala D Metal (D, F, G, Ab, A, C)
    const D2 = 73.42, A2 = 110.00, D3 = 146.83;
    const F2 = 87.31, C3 = 130.81, F3 = 174.61;
    const G2 = 97.99, D_3 = 146.83, G3 = 195.99;
    const Ab2 = 103.83, Eb3 = 155.56, Ab3 = 207.65;
    const C2 = 65.41, G_2 = 98.00, C_3 = 130.81;

    // 1. RIFFS DE GUITARRA ELÉCTRICA DISTORSIONADA (CHUGGING 16ths + POWER CHORDS)
    const sixteenthDur = beatSec / 4;
    for (let bar = 0; bar < totalBars; bar++) {
        const barStart = bar * 4 * beatSec;
        for (let s = 0; s < 16; s++) {
            const stepTime = barStart + s * sixteenthDur;
            const isHeavyHit = (s === 0 || s === 6 || s === 10 || s === 14);
            const isMute = !isHeavyHit;

            let r = D2, fifth = A2, oct = D3;
            if (bar % 4 === 3 && s >= 8) {
                // Variación armónica hacia F y G
                if (s < 12) { r = F2; fifth = C3; oct = F3; }
                else { r = G2; fifth = D_3; oct = G3; }
            }

            const chordBuf = synthesizeGuitarChord(r, fifth, oct, isMute ? sixteenthDur * 0.9 : sixteenthDur * 2.2, isMute);
            for (let k = 0; k < chordBuf.length; k++) {
                const idx = Math.floor(stepTime * SAMPLE_RATE) + k;
                if (idx >= totalSamples) break;
                // Stereo double-tracking de guitarras izquierda / derecha
                outL[idx] += chordBuf[k] * 0.42;
                outR[idx] += chordBuf[k] * 0.42;
            }
        }
    }

    // 2. BATERÍA HEAVY METAL / CYBER DOUBLE-BASS DRUM
    for (let b = 0; b < totalBeats; b++) {
        const beatStart = b * beatSec;

        // Double Kick (En cada tiempo + semicorchea previa)
        [0, sixteenthDur * 2].forEach(kOffset => {
            const kTime = beatStart + kOffset;
            const kLen = Math.floor(0.22 * SAMPLE_RATE);
            for (let i = 0; i < kLen; i++) {
                const idx = Math.floor(kTime * SAMPLE_RATE) + i;
                if (idx >= totalSamples) return;
                const t = i / SAMPLE_RATE;
                const pitch = 160 * Math.exp(-t * 30) + 48;
                const kVal = (sine(pitch, t) + noise() * Math.exp(-t * 90) * 0.4) * Math.exp(-t * 11) * 0.7;
                outL[idx] += kVal;
                outR[idx] += kVal;
            }
        });

        // Metal Snare contundente en tiempos 2 y 4
        if (b % 2 === 1) {
            const sLen = Math.floor(0.28 * SAMPLE_RATE);
            for (let i = 0; i < sLen; i++) {
                const idx = Math.floor(beatStart * SAMPLE_RATE) + i;
                if (idx >= totalSamples) break;
                const t = i / SAMPLE_RATE;
                const body = (sine(210 * Math.exp(-t * 20), t) + sine(150, t) * 0.5) * Math.exp(-t * 16) * 0.5;
                const wires = noise() * Math.exp(-t * 14) * 0.65;
                const crack = square(400 * Math.exp(-t * 35), t, 0.4) * Math.exp(-t * 25) * 0.3;
                const sVal = (body + wires + crack) * 0.6;
                outL[idx] += sVal;
                outR[idx] += sVal;
            }
        }

        // Platillos Crash y Hi-Hats metálicos
        for (let step = 0; step < 4; step++) {
            const hTime = beatStart + step * sixteenthDur;
            const isCrash = (b % 8 === 0 && step === 0);
            const hLen = Math.floor((isCrash ? 1.2 : 0.08) * SAMPLE_RATE);

            for (let i = 0; i < hLen; i++) {
                const idx = Math.floor(hTime * SAMPLE_RATE) + i;
                if (idx >= totalSamples) break;
                const t = i / SAMPLE_RATE;
                const cym = (noise() * 0.8 + square(6500, t, 0.3) * 0.2) * Math.exp(-t * (isCrash ? 3.0 : 40.0)) * (isCrash ? 0.35 : 0.15);
                outL[idx] += cym * 0.9;
                outR[idx] += cym * 1.1;
            }
        }
    }

    // 3. CAPA ELECTRÓNICA: SUPERSAWS & CYBER ARP
    const arpFreqs = [293.66, 349.23, 440.00, 587.33, 523.25, 440.00, 349.23, 440.00];
    for (let s = 0; s < totalBeats * 4; s++) {
        const f = arpFreqs[s % arpFreqs.length];
        const sTime = s * sixteenthDur;
        const sLen = Math.floor(sixteenthDur * 1.2 * SAMPLE_RATE);

        for (let i = 0; i < sLen; i++) {
            const idx = Math.floor(sTime * SAMPLE_RATE) + i;
            if (idx >= totalSamples) break;
            const t = i / SAMPLE_RATE;
            const env = Math.exp(-t * 12);
            // 3-voice detuned electronic supersaw
            const saw1 = saw(f, t);
            const saw2 = saw(f * 1.008, t);
            const saw3 = saw(f * 0.992, t);
            const synVal = (saw1 + saw2 + saw3) * 0.33 * env * 0.22;
            outL[idx] += synVal * 0.7;
            outR[idx] += synVal * 1.3;
        }
    }

    // 4. SOLO DE GUITARRA ÉPICO / MELODÍA METAL (Compases 8 a 16)
    const leadNotes = [
        { f: 587.33, dur: 1.0 }, // D5
        { f: 698.46, dur: 1.0 }, // F5
        { f: 880.00, dur: 1.5 }, // A5
        { f: 783.99, dur: 0.5 }, // G5
        { f: 698.46, dur: 1.0 }, // F5
        { f: 659.25, dur: 1.0 }, // E5
        { f: 587.33, dur: 2.0 }, // D5
        { f: 880.00, dur: 1.0 }, // A5
        { f: 1046.50, dur: 1.0 },// C6
        { f: 1174.66, dur: 1.5 },// D6
        { f: 1046.50, dur: 0.5 },// C6
        { f: 880.00, dur: 1.5 }, // A5
        { f: 783.99, dur: 0.5 }, // G5
        { f: 587.33, dur: 2.0 }  // D5
    ];

    let leadOffset = 32 * beatSec; // Comienza en compás 8
    for (const note of leadNotes) {
        if (leadOffset >= totalDuration) break;
        const leadBuf = synthesizeGuitarLeadNote(note.f, note.dur * beatSec);
        for (let k = 0; k < leadBuf.length; k++) {
            const idx = Math.floor(leadOffset * SAMPLE_RATE) + k;
            if (idx >= totalSamples) break;
            outL[idx] += leadBuf[k] * 0.45;
            outR[idx] += leadBuf[k] * 0.45;
        }
        leadOffset += note.dur * beatSec;
    }

    return createWavBuffer(outL, outR);
}

// =========================================================================
// 2. BGM CLIMAX (MAXIMUM ADRENALINE HEAVY SPEED METAL / 150 BPM)
// =========================================================================

function generateDuelClimax() {
    console.log('[AUDIO GENERATOR] Sintetizando "bgm_duel_climax.wav" (Speed Metal Overdrive)...');
    const bpm = 150;
    const beatSec = 60 / bpm;
    const totalBars = 8;
    const totalBeats = totalBars * 4;
    const totalDuration = totalBeats * beatSec; // ~12.8s
    const totalSamples = Math.floor(totalDuration * SAMPLE_RATE);

    const outL = new Float32Array(totalSamples);
    const outR = new Float32Array(totalSamples);

    const E2 = 82.41, B2 = 123.47, E3 = 164.81;
    const G2 = 98.00, D3 = 146.83, G3 = 196.00;
    const A2 = 110.00, E_3 = 164.81, A3 = 220.00;
    const Bb2 = 116.54, F3 = 174.61, Bb3 = 233.08;

    const sixteenthDur = beatSec / 4;

    // Fast Power Metal Gallop Riff (16ths chug)
    for (let s = 0; s < totalBeats * 4; s++) {
        const sTime = s * sixteenthDur;
        let r = E2, fifth = B2, oct = E3;
        if ((s % 32) >= 24) { r = G2; fifth = D3; oct = G3; }
        if ((s % 32) >= 28) { r = Bb2; fifth = F3; oct = Bb3; }

        const isAccent = (s % 4 === 0);
        const chord = synthesizeGuitarChord(r, fifth, oct, sixteenthDur * 1.5, !isAccent);
        for (let k = 0; k < chord.length; k++) {
            const idx = Math.floor(sTime * SAMPLE_RATE) + k;
            if (idx >= totalSamples) break;
            outL[idx] += chord[k] * 0.45;
            outR[idx] += chord[k] * 0.45;
        }
    }

    // Heavy Double Bass Blast Beats
    for (let b = 0; b < totalBeats; b++) {
        const beatStart = b * beatSec;
        for (let s = 0; s < 4; s++) {
            const kTime = beatStart + s * sixteenthDur;
            const kLen = Math.floor(0.15 * SAMPLE_RATE);
            for (let i = 0; i < kLen; i++) {
                const idx = Math.floor(kTime * SAMPLE_RATE) + i;
                if (idx >= totalSamples) break;
                const t = i / SAMPLE_RATE;
                const kVal = (sine(180 * Math.exp(-t * 35) + 50, t) + noise() * Math.exp(-t * 80) * 0.3) * Math.exp(-t * 14) * 0.65;
                outL[idx] += kVal;
                outR[idx] += kVal;
            }
        }

        // Snare on 2 and 4
        if (b % 2 === 1) {
            const sLen = Math.floor(0.22 * SAMPLE_RATE);
            for (let i = 0; i < sLen; i++) {
                const idx = Math.floor(beatStart * SAMPLE_RATE) + i;
                if (idx >= totalSamples) break;
                const t = i / SAMPLE_RATE;
                const sVal = (noise() * Math.exp(-t * 18) * 0.7 + sine(240, t) * Math.exp(-t * 30) * 0.4) * 0.65;
                outL[idx] += sVal;
                outR[idx] += sVal;
            }
        }
    }

    return createWavBuffer(outL, outR);
}

// =========================================================================
// 3. BGM VICTORIA Y DERROTA (POWER METAL FANFARE & DOOM METAL)
// =========================================================================

function generateVictoryTheme() {
    console.log('[AUDIO GENERATOR] Sintetizando "bgm_victory.wav" (Epic Power Metal Victory)...');
    const dur = 7.0;
    const totalSamples = Math.floor(dur * SAMPLE_RATE);
    const outL = new Float32Array(totalSamples);
    const outR = new Float32Array(totalSamples);

    // Power Metal Harmony Solo
    const notes = [
        { f: 587.33, start: 0.0, dur: 0.28 }, // D5
        { f: 659.25, start: 0.28, dur: 0.28 }, // E5
        { f: 783.99, start: 0.56, dur: 0.28 }, // G5
        { f: 880.00, start: 0.84, dur: 0.9 },  // A5
        { f: 1046.50, start: 1.8, dur: 0.35 }, // C6
        { f: 1174.66, start: 2.2, dur: 2.8 }  // D6 (Sustained Power Bend)
    ];

    for (const n of notes) {
        const lead1 = synthesizeGuitarLeadNote(n.f, n.dur);
        const leadHarmony = synthesizeGuitarLeadNote(n.f * 1.25, n.dur); // Major 3rd harmony
        for (let k = 0; k < lead1.length; k++) {
            const idx = Math.floor(n.start * SAMPLE_RATE) + k;
            if (idx >= totalSamples) break;
            outL[idx] += lead1[k] * 0.4 + leadHarmony[k] * 0.25;
            outR[idx] += lead1[k] * 0.25 + leadHarmony[k] * 0.4;
        }
    }

    // Heavy crash and kick at start
    const crashLen = Math.floor(3.5 * SAMPLE_RATE);
    for (let i = 0; i < crashLen; i++) {
        const t = i / SAMPLE_RATE;
        const kick = sine(120 * Math.exp(-t * 20), t) * Math.exp(-t * 8) * 0.7;
        const crash = noise() * Math.exp(-t * 2.2) * 0.45;
        if (i < totalSamples) {
            outL[i] += kick + crash;
            outR[i] += kick + crash;
        }
    }

    return createWavBuffer(outL, outR);
}

function generateDefeatTheme() {
    console.log('[AUDIO GENERATOR] Sintetizando "bgm_defeat.wav" (Dark Doom Metal Outro)...');
    const dur = 5.5;
    const totalSamples = Math.floor(dur * SAMPLE_RATE);
    const outL = new Float32Array(totalSamples);
    const outR = new Float32Array(totalSamples);

    // Distorted Doom Power Chords descending
    const chords = [
        { r: 73.42, f: 110.0, o: 146.83, start: 0.0, dur: 1.8 }, // D
        { r: 65.41, f: 98.0,  o: 130.81, start: 1.8, dur: 1.8 }, // C
        { r: 58.27, f: 87.31, o: 116.54, start: 3.6, dur: 1.8 }  // Bb
    ];

    for (const c of chords) {
        const chordBuf = synthesizeGuitarChord(c.r, c.f, c.o, c.dur, false);
        for (let k = 0; k < chordBuf.length; k++) {
            const idx = Math.floor(c.start * SAMPLE_RATE) + k;
            if (idx >= totalSamples) break;
            outL[idx] += chordBuf[k] * 0.5;
            outR[idx] += chordBuf[k] * 0.5;
        }
    }

    return createWavBuffer(outL, outR);
}

// =========================================================================
// 4. EFECTOS DE SONIDO (SFX) CYBER-METAL ÉPICOS
// =========================================================================

function generateSfxDuelStart() {
    console.log('[AUDIO GENERATOR] Sintetizando "sfx_duel_start.wav" (Metal Pick Scrape + Power Explosion)...');
    const dur = 2.4;
    const totalSamples = Math.floor(dur * SAMPLE_RATE);
    const out = new Float32Array(totalSamples);

    for (let i = 0; i < totalSamples; i++) {
        const t = i / SAMPLE_RATE;
        // Pick scrape across guitar strings
        let scrape = 0;
        if (t < 0.8) {
            const scrapeFreq = 400 + Math.pow(t / 0.8, 3) * 3500;
            scrape = (noise() * 0.7 + saw(scrapeFreq, t) * 0.3) * (t / 0.8) * 0.45;
        } else {
            // Massive Heavy Metal Chord + Sub Drop at t = 0.8
            const tHit = t - 0.8;
            const sub = sine(60 * Math.exp(-tHit * 3.5), tHit) * Math.exp(-tHit * 2.5) * 0.8;
            const distortionGtr = tubeDistortion(saw(146.83, tHit) + saw(220, tHit), 12) * Math.exp(-tHit * 2.0) * 0.65;
            const crash = noise() * Math.exp(-tHit * 4.0) * 0.4;
            scrape = sub + distortionGtr + crash;
        }
        out[i] = scrape;
    }
    return createWavBuffer(out, out);
}

function generateSfxSummonNormal() {
    console.log('[AUDIO GENERATOR] Sintetizando "sfx_summon_normal.wav" (Cyber Warp + Resonant Ring)...');
    const dur = 1.3;
    const totalSamples = Math.floor(dur * SAMPLE_RATE);
    const out = new Float32Array(totalSamples);

    for (let i = 0; i < totalSamples; i++) {
        const t = i / SAMPLE_RATE;
        const warp = saw(300 + 800 * Math.exp(-t * 6), t) * Math.exp(-t * 5) * 0.4;
        const ring = sine(1200, t) * Math.exp(-t * 3.5) * 0.3 + sine(2400, t) * Math.exp(-t * 5.5) * 0.2;
        const punch = sine(120 * Math.exp(-t * 15), t) * Math.exp(-t * 8) * 0.5;
        out[i] = warp + ring + punch;
    }
    return createWavBuffer(out, out);
}

function generateSfxSummonSpecial() {
    console.log('[AUDIO GENERATOR] Sintetizando "sfx_summon_special.wav" (Cosmic Lightning + Boss Metal Impact)...');
    const dur = 2.2;
    const totalSamples = Math.floor(dur * SAMPLE_RATE);
    const out = new Float32Array(totalSamples);

    for (let i = 0; i < totalSamples; i++) {
        const t = i / SAMPLE_RATE;
        // Thunder & heavy power chord burst
        const lightning = (noise() * 0.6 + saw(800 * Math.sin(t * 120), t) * 0.4) * Math.exp(-t * 5.0) * 0.5;
        const gtrPower = tubeDistortion(saw(73.42, t) + saw(110, t), 15) * Math.exp(-t * 2.0) * 0.7;
        const subBoom = sine(50 * Math.exp(-t * 3.0), t) * Math.exp(-t * 1.8) * 0.85;
        out[i] = lightning + gtrPower + subBoom;
    }
    return createWavBuffer(out, out);
}

function generateSfxLpDamage() {
    console.log('[AUDIO GENERATOR] Sintetizando "sfx_lp_damage.wav" (Heavy Metal Crunch & Electric Shock)...');
    const dur = 1.0;
    const totalSamples = Math.floor(dur * SAMPLE_RATE);
    const out = new Float32Array(totalSamples);

    for (let i = 0; i < totalSamples; i++) {
        const t = i / SAMPLE_RATE;
        const metalCrunch = tubeDistortion(noise() + saw(120, t), 14) * Math.exp(-t * 10) * 0.6;
        const zap = square(900 + 400 * Math.sin(t * 90), t, 0.5) * Math.exp(-t * 12) * 0.35;
        const subHit = sine(80 * Math.exp(-t * 18), t) * Math.exp(-t * 7) * 0.6;
        out[i] = metalCrunch + zap + subHit;
    }
    return createWavBuffer(out, out);
}

function generateSfxLpHeal() {
    console.log('[AUDIO GENERATOR] Sintetizando "sfx_lp_heal.wav" (Angelic Harmonic Crystal Burst)...');
    const dur = 1.4;
    const totalSamples = Math.floor(dur * SAMPLE_RATE);
    const out = new Float32Array(totalSamples);

    for (let i = 0; i < totalSamples; i++) {
        const t = i / SAMPLE_RATE;
        const f1 = 587.33 + t * 450;
        const f2 = 880.00 + t * 650;
        const f3 = 1174.66 + t * 900;
        const chime = (sine(f1, t) * 0.5 + sine(f2, t) * 0.35 + sine(f3, t) * 0.25) * Math.exp(-t * 2.5) * 0.45;
        out[i] = chime;
    }
    return createWavBuffer(out, out);
}

function generateSfxCardActivate() {
    console.log('[AUDIO GENERATOR] Sintetizando "sfx_card_activate.wav" (Voltage Surge & Hologram Ring)...');
    const dur = 1.2;
    const totalSamples = Math.floor(dur * SAMPLE_RATE);
    const out = new Float32Array(totalSamples);

    for (let i = 0; i < totalSamples; i++) {
        const t = i / SAMPLE_RATE;
        const pulse = saw(440 + 600 * t, t) * Math.exp(-t * 3.5) * 0.35;
        const shimmer = (sine(1760, t) + sine(2637, t)) * Math.exp(-t * 5.0) * 0.3;
        out[i] = pulse + shimmer;
    }
    return createWavBuffer(out, out);
}

function generateSfxCardDestroy() {
    console.log('[AUDIO GENERATOR] Sintetizando "sfx_card_destroy.wav" (Metal Shatter & Sonic Blast)...');
    const dur = 0.95;
    const totalSamples = Math.floor(dur * SAMPLE_RATE);
    const out = new Float32Array(totalSamples);

    for (let i = 0; i < totalSamples; i++) {
        const t = i / SAMPLE_RATE;
        const blast = tubeDistortion(noise(), 10) * Math.exp(-t * 12) * 0.6;
        const glass = square(800 * Math.exp(-t * 25), t, 0.3) * Math.exp(-t * 16) * 0.4;
        const sub = sine(90 * Math.exp(-t * 15), t) * Math.exp(-t * 8) * 0.5;
        out[i] = blast + glass + sub;
    }
    return createWavBuffer(out, out);
}

function generateSfxAttack() {
    console.log('[AUDIO GENERATOR] Sintetizando "sfx_attack.wav" (Sonic Laser Slash & Kinetic Boom)...');
    const dur = 1.1;
    const totalSamples = Math.floor(dur * SAMPLE_RATE);
    const out = new Float32Array(totalSamples);

    for (let i = 0; i < totalSamples; i++) {
        const t = i / SAMPLE_RATE;
        const slash = saw(1600 * Math.exp(-t * 14), t) * Math.exp(-t * 7) * 0.5;
        const boom = sine(70 * Math.exp(-t * 8), t) * Math.exp(-t * 4.5) * 0.65;
        const wind = noise() * Math.exp(-Math.pow((t - 0.12) * 12, 2)) * 0.4;
        out[i] = slash + boom + wind;
    }
    return createWavBuffer(out, out);
}

function generateSfxTurnChange() {
    console.log('[AUDIO GENERATOR] Sintetizando "sfx_turn_change.wav" (Cyber Heavy Lock)...');
    const dur = 0.7;
    const totalSamples = Math.floor(dur * SAMPLE_RATE);
    const out = new Float32Array(totalSamples);

    for (let i = 0; i < totalSamples; i++) {
        const t = i / SAMPLE_RATE;
        const click = square(1400 * Math.exp(-t * 40), t, 0.5) * Math.exp(-t * 25) * 0.45;
        const punch = sine(160 * Math.exp(-t * 20), t) * Math.exp(-t * 15) * 0.4;
        out[i] = click + punch;
    }
    return createWavBuffer(out, out);
}

// =========================================================================
// EJECUCIÓN
// =========================================================================

function generateAllAudioAssets() {
    console.log('========================================================');
    console.log('🎸 GENERADOR DE AUDIO: EPIC ELECTRONIC HEAVY METAL (ANI-DIMENSION)');
    console.log('========================================================');

    const bgmDir = path.resolve(__dirname, '../../frontend/assets/audio/bgm');
    const sfxDir = path.resolve(__dirname, '../../frontend/assets/audio/sfx');

    fs.mkdirSync(bgmDir, { recursive: true });
    fs.mkdirSync(sfxDir, { recursive: true });

    // BGMs
    fs.writeFileSync(path.join(bgmDir, 'bgm_duel_theme.wav'), generateDuelTheme());
    fs.writeFileSync(path.join(bgmDir, 'bgm_duel_climax.wav'), generateDuelClimax());
    fs.writeFileSync(path.join(bgmDir, 'bgm_victory.wav'), generateVictoryTheme());
    fs.writeFileSync(path.join(bgmDir, 'bgm_defeat.wav'), generateDefeatTheme());

    // SFX
    fs.writeFileSync(path.join(sfxDir, 'sfx_duel_start.wav'), generateSfxDuelStart());
    fs.writeFileSync(path.join(sfxDir, 'sfx_summon_normal.wav'), generateSfxSummonNormal());
    fs.writeFileSync(path.join(sfxDir, 'sfx_summon_special.wav'), generateSfxSummonSpecial());
    fs.writeFileSync(path.join(sfxDir, 'sfx_lp_damage.wav'), generateSfxLpDamage());
    fs.writeFileSync(path.join(sfxDir, 'sfx_lp_heal.wav'), generateSfxLpHeal());
    fs.writeFileSync(path.join(sfxDir, 'sfx_card_activate.wav'), generateSfxCardActivate());
    fs.writeFileSync(path.join(sfxDir, 'sfx_card_destroy.wav'), generateSfxCardDestroy());
    fs.writeFileSync(path.join(sfxDir, 'sfx_attack.wav'), generateSfxAttack());
    fs.writeFileSync(path.join(sfxDir, 'sfx_turn_change.wav'), generateSfxTurnChange());

    console.log('========================================================');
    console.log('✅ TODAS LAS PISTAS Y EFECTOS EPIC METAL RE-GENERADOS');
    console.log('========================================================');
}

generateAllAudioAssets();
