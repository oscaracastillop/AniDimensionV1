/**
 * ANI-DIMENSION: LÓGICA DEL ESTUDIO DE AUDIO Y VISUALIZADOR EN TIEMPO REAL
 */
let audioCtx = null;
let analyser = null;
let dataArray = null;
let activeSource = null;
let currentPlayingAudio = null;
let animFrameId = null;

document.addEventListener('DOMContentLoaded', () => {
    initVisualizerCanvas();

    const volSlider = document.getElementById('master-volume');
    if (volSlider) {
        volSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            if (window.SoundManager) {
                window.SoundManager.setBgmVolume(val);
                window.SoundManager.setSfxVolume(val);
            }
            if (currentPlayingAudio) {
                currentPlayingAudio.volume = val;
            }
        });
    }
});

function initAudioContext() {
    if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function initVisualizerCanvas() {
    const canvas = document.getElementById('spectrum-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = 120;
    }
    resize();
    window.addEventListener('resize', resize);

    function draw() {
        animFrameId = requestAnimationFrame(draw);

        ctx.fillStyle = 'rgba(2, 6, 17, 0.35)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (!analyser || !dataArray) {
            // Idle ambient line
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
            ctx.lineWidth = 1.5;
            const mid = canvas.height / 2;
            ctx.moveTo(0, mid);
            ctx.lineTo(canvas.width, mid);
            ctx.stroke();
            return;
        }

        analyser.getByteFrequencyData(dataArray);

        const barCount = dataArray.length;
        const barWidth = (canvas.width / barCount) * 1.5;
        let x = 0;

        for (let i = 0; i < barCount; i++) {
            const barHeight = (dataArray[i] / 255) * (canvas.height - 10);

            // Cyberpunk color gradient
            const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
            gradient.addColorStop(0, '#00f0ff');
            gradient.addColorStop(0.5, '#ec4899');
            gradient.addColorStop(1, '#ffd700');

            ctx.fillStyle = gradient;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00f0ff';
            ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);

            x += barWidth;
        }
    }

    draw();
}

function connectAudioToVisualizer(audioElem) {
    initAudioContext();
    try {
        const source = audioCtx.createMediaElementSource(audioElem);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
    } catch (e) {
        // Already connected or cross-origin
    }
}

function playTrack(bgmKey, trackTitle) {
    initAudioContext();
    stopAllAudio();

    const trackUrl = window.SoundManager.BGM[bgmKey];
    if (!trackUrl) return;

    currentPlayingAudio = new Audio(trackUrl);
    currentPlayingAudio.loop = (bgmKey === 'DUEL_THEME' || bgmKey === 'DUEL_CLIMAX');
    const vol = parseFloat(document.getElementById('master-volume')?.value || '0.75');
    currentPlayingAudio.volume = vol;

    connectAudioToVisualizer(currentPlayingAudio);
    currentPlayingAudio.play().catch(e => console.warn(e));

    // UI Updates
    document.querySelectorAll('.track-card').forEach(c => c.classList.remove('active'));
    const targetCard = document.getElementById(
        bgmKey === 'DUEL_THEME' ? 'card-bgm-duel' :
        bgmKey === 'DUEL_CLIMAX' ? 'card-bgm-climax' :
        bgmKey === 'VICTORY' ? 'card-bgm-victory' : 'card-bgm-defeat'
    );
    if (targetCard) targetCard.classList.add('active');

    const playingText = document.getElementById('now-playing-text');
    if (playingText) {
        playingText.textContent = `▶️ ${trackTitle} ${currentPlayingAudio.loop ? '(En Bucle)' : ''}`;
        playingText.style.color = bgmKey === 'VICTORY' ? '#ffd700' : bgmKey === 'DUEL_CLIMAX' ? '#ec4899' : '#00f0ff';
    }
}

function stopTrack() {
    stopAllAudio();
}

function stopAllAudio() {
    if (currentPlayingAudio) {
        currentPlayingAudio.pause();
        currentPlayingAudio.currentTime = 0;
        currentPlayingAudio = null;
    }
    if (window.SoundManager) {
        window.SoundManager.stopBgm();
    }
    document.querySelectorAll('.track-card').forEach(c => c.classList.remove('active'));
    const playingText = document.getElementById('now-playing-text');
    if (playingText) {
        playingText.textContent = 'Ninguna pista activa';
        playingText.style.color = '#94a3b8';
    }
}

function playSfxEffect(sfxKey) {
    initAudioContext();
    const sfxUrl = window.SoundManager.SFX[sfxKey];
    if (!sfxUrl) return;

    const sfx = new Audio(sfxUrl);
    const vol = parseFloat(document.getElementById('master-volume')?.value || '0.85');
    sfx.volume = vol;
    connectAudioToVisualizer(sfx);
    sfx.play().catch(e => console.warn(e));
}

// Simulador de Duelo
function startDuelSimulation() {
    playTrack('DUEL_THEME', 'Simulación de Duelo // Música de Fondo');
    setTimeout(() => {
        playSfxEffect('DUEL_START');
    }, 400);
}

function triggerSimEvent(type) {
    if (type === 'CLIMAX') {
        playTrack('DUEL_CLIMAX', '¡MOMENTO DECISIVO // CLÍMAX DE DUELO!');
    } else if (type === 'VICTORY') {
        playTrack('VICTORY', '¡VICTORIA EN EL DUELO!');
    } else {
        playSfxEffect(type);
    }
}
