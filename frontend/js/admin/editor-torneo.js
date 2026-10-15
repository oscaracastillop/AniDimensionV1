/**
 * Ani-Dimension: Script del Editor Dedicado de Torneos & Cronograma de Rondas
 */

let selectedBannerBase64 = null;
let currentTournamentId = null;

document.addEventListener('DOMContentLoaded', () => {
    if (window.Session && !window.Session.requireAuth('/views/login/login.html')) return;
    const user = window.Session ? window.Session.getUser() : null;
    if (!user || (!user.isAdmin && user.username.toLowerCase() !== 'admin')) {
        alert('Acceso restringido a Administradores.');
        window.location.href = '/views/lobby/lobby.html';
        return;
    }

    if (window.AppNavbar) {
        window.AppNavbar.init('admin');
    }

    initTournamentEditor();
});

async function initTournamentEditor() {
    const urlParams = new URLSearchParams(window.location.search);
    const tId = urlParams.get('id');

    if (tId) {
        currentTournamentId = parseInt(tId, 10);
        document.getElementById('editor-torneo-page-title').textContent = `EDITAR TORNEO #${currentTournamentId}`;
        document.getElementById('editor-torneo-id').value = currentTournamentId;
        await loadTournamentData(currentTournamentId);
    } else {
        // Inicializar fechas por defecto (Inscripciones hoy, torneo en 3 días)
        const now = new Date();
        const startReg = new Date(now.getTime() + 10 * 60 * 1000); // en 10 min
        const endReg = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // en 2 días

        document.getElementById('editor-fecha-reg-inicio').value = formatDateTimeLocal(startReg);
        document.getElementById('editor-fecha-reg-fin').value = formatDateTimeLocal(endReg);

        generateRoundScheduleInputs(8);
        applyPrizePreset('ORO');
    }
}

async function loadTournamentData(torneoId) {
    try {
        const res = await fetch(`/api/tournaments/${torneoId}`);
        const data = await res.json();
        if (!data.success || !data.torneo) {
            alert('Torneo no encontrado.');
            window.location.href = 'torneos.html';
            return;
        }

        const t = data.torneo;
        document.getElementById('editor-titulo').value = t.Titulo || '';
        document.getElementById('editor-formato').value = t.Formato || 'BO1';
        document.getElementById('editor-max-part').value = String(t.MaxParticipantes || 8);
        document.getElementById('editor-min-lvl').value = t.NivelMinimo || 1;
        document.getElementById('editor-max-lvl').value = t.NivelMaximo || 999;
        document.getElementById('editor-costo').value = t.CostoInscripcion || 0;
        document.getElementById('editor-texto-premios').value = t.TextoPremios || '';
        document.getElementById('editor-desc').value = t.Descripcion || '';

        if (t.BannerUrl) {
            document.getElementById('editor-banner-url').value = t.BannerUrl;
            document.getElementById('editor-banner-preview').src = t.BannerUrl;
        }

        if (t.FechaInicioInscripcion) {
            document.getElementById('editor-fecha-reg-inicio').value = formatDateTimeLocal(new Date(t.FechaInicioInscripcion));
        }
        if (t.FechaCierreInscripcion) {
            document.getElementById('editor-fecha-reg-fin').value = formatDateTimeLocal(new Date(t.FechaCierreInscripcion));
        }

        // Cargar horarios de rondas
        let savedRounds = [];
        if (t.HorariosRondasJson) {
            try {
                savedRounds = JSON.parse(t.HorariosRondasJson);
            } catch (e) {}
        }

        generateRoundScheduleInputs(t.MaxParticipantes || 8, savedRounds);
    } catch (err) {
        console.error('[LOAD TOURNAMENT ERROR]', err);
    }
}

function onBannerFileSelected(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
        selectedBannerBase64 = e.target.result;
        const preview = document.getElementById('editor-banner-preview');
        if (preview) preview.src = selectedBannerBase64;
    };

    reader.readAsDataURL(file);
}

function onBannerUrlChange() {
    const url = document.getElementById('editor-banner-url').value.trim();
    const preview = document.getElementById('editor-banner-preview');
    if (preview && url) {
        preview.src = url;
    }
}

function onFormatOrCapacityChange() {
    const maxPart = parseInt(document.getElementById('editor-max-part').value, 10);
    generateRoundScheduleInputs(maxPart);
}

function generateRoundScheduleInputs(maxParticipants, existingSchedules = []) {
    const container = document.getElementById('rounds-schedule-container');
    if (!container) return;

    let totalRounds = Math.ceil(Math.log2(maxParticipants));
    if (totalRounds < 1) totalRounds = 1;

    const baseDate = document.getElementById('editor-fecha-reg-fin').value 
        ? new Date(document.getElementById('editor-fecha-reg-fin').value) 
        : new Date();

    const rounds = [];
    for (let r = 1; r <= totalRounds; r++) {
        let roundName = `Ronda ${r}`;
        if (r === totalRounds) roundName = 'Gran Final 🏆';
        else if (r === totalRounds - 1) roundName = 'Semifinales ⚔️';
        else if (r === totalRounds - 2) roundName = 'Cuartos de Final';
        else if (r === totalRounds - 3) roundName = 'Octavos de Final';
        else if (r === totalRounds - 4) roundName = 'Dieciseisavos';

        // Buscar fecha existente o proyectar 1 hora de diferencia por ronda
        const existing = existingSchedules.find(item => item.ronda === r);
        let roundDateStr = '';

        if (existing && existing.fechaHora) {
            roundDateStr = formatDateTimeLocal(new Date(existing.fechaHora));
        } else {
            const projectedDate = new Date(baseDate.getTime() + (r * 60 * 60 * 1000));
            roundDateStr = formatDateTimeLocal(projectedDate);
        }

        rounds.push({ ronda: r, nombre: roundName, fechaHora: roundDateStr });
    }

    container.innerHTML = rounds.map(r => `
        <div class="round-schedule-row">
            <span style="font-family:'Orbitron', sans-serif; font-size:10px; font-weight:800; color:#00f0ff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                ${r.nombre}
            </span>
            <input type="datetime-local" class="admin-form-input round-schedule-input" data-ronda="${r.ronda}" data-nombre="${r.nombre}" value="${r.fechaHora}" style="font-size:10px; padding:4px 6px;">
        </div>
    `).join('');
}

function applyPrizePreset(type) {
    const textarea = document.getElementById('editor-texto-premios');
    if (!textarea) return;

    if (type === 'ORO') {
        textarea.value = `🥇 1er Lugar: 50,000 Starships + Título Campeón Supremo + Dragón Blanco de Ojos Azules (Secreta)\n🥈 2do Lugar: 25,000 Starships + Funda Exclusiva Cyber\n🥉 3er Lugar: 10,000 Starships\n🏅 4to al 8vo Lugar: 2,500 Starships por participación`;
    } else if (type === 'PLATINO') {
        textarea.value = `🥇 1er Lugar: 100,000 Starships + Título Leyenda de Ani-Dimension + Avatar Exclusivo Dorado + Carta Secreta Holográfica\n🥈 2do Lugar: 50,000 Starships + Tapete Oficial Kaiba Corp\n🥉 3er Lugar: 25,000 Starships + Funda Platino\n🏅 4to al 16vo Lugar: 5,000 Starships por participación`;
    } else if (type === 'DIAMANTE') {
        textarea.value = `🥇 1er Lugar: 250,000 Starships + Título Gran Maestro OCG + 3 Cartas Secretas Raras a Elección + Avatar Épico\n🥈 2do Lugar: 120,000 Starships + Tapete Holográfico + Funda Diamante\n🥉 3er Lugar: 60,000 Starships + Funda Exclusiva\n🏅 4to al 32vo Lugar: 10,000 Starships por clasificación`;
    }
}

async function onSaveTournamentForm(e) {
    e.preventDefault();

    let bannerUrl = document.getElementById('editor-banner-url').value.trim();

    // 1. Si se seleccionó un archivo local, subirlo primero al servidor
    if (selectedBannerBase64) {
        try {
            const uploadRes = await fetch('/api/tournaments/admin/upload-banner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64: selectedBannerBase64 })
            });
            const uploadData = await uploadRes.json();
            if (uploadData.success && uploadData.url) {
                bannerUrl = uploadData.url;
            }
        } catch (uErr) {
            console.warn('[BANNER UPLOAD ERROR]', uErr);
        }
    }

    // 2. Recolectar horarios de cada ronda
    const roundInputs = document.querySelectorAll('.round-schedule-input');
    const horariosRondas = [];
    roundInputs.forEach(inp => {
        horariosRondas.push({
            ronda: parseInt(inp.getAttribute('data-ronda'), 10),
            nombre: inp.getAttribute('data-nombre'),
            fechaHora: inp.value ? new Date(inp.value).toISOString() : null
        });
    });

    const isEdit = Boolean(currentTournamentId);

    const payload = {
        titulo: document.getElementById('editor-titulo').value.trim(),
        descripcion: document.getElementById('editor-desc').value.trim(),
        bannerUrl: bannerUrl || '/assets/images/duels/pvp.jpg',
        formato: document.getElementById('editor-formato').value,
        maxParticipantes: parseInt(document.getElementById('editor-max-part').value, 10),
        nivelMinimo: parseInt(document.getElementById('editor-min-lvl').value, 10),
        nivelMaximo: parseInt(document.getElementById('editor-max-lvl').value, 10),
        costoInscripcion: parseInt(document.getElementById('editor-costo').value, 10),
        textoPremios: document.getElementById('editor-texto-premios').value.trim(),
        fechaInicioInscripcion: document.getElementById('editor-fecha-reg-inicio').value ? new Date(document.getElementById('editor-fecha-reg-inicio').value).toISOString() : null,
        fechaCierreInscripcion: document.getElementById('editor-fecha-reg-fin').value ? new Date(document.getElementById('editor-fecha-reg-fin').value).toISOString() : null,
        fechaInicioTorneo: document.getElementById('editor-fecha-reg-fin').value ? new Date(document.getElementById('editor-fecha-reg-fin').value).toISOString() : null,
        horariosRondasJson: horariosRondas
    };

    try {
        const url = isEdit ? `/api/tournaments/admin/${currentTournamentId}` : '/api/tournaments/admin/create';
        const method = isEdit ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
            alert(data.message || 'Torneo guardado exitosamente.');
            window.location.href = 'torneos.html';
        } else {
            alert(`⚠️ Error al guardar torneo: ${data.message}`);
        }
    } catch (err) {
        console.error('[SAVE TOURNAMENT FORM ERROR]', err);
        alert('Error al conectar con el servidor.');
    }
}

function formatDateTimeLocal(date) {
    if (!date || isNaN(date.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}
