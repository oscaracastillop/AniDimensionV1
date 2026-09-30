/**
 * Ani-Dimension: Controlador de la Vista Dedicada de Rankings (3 Secciones Top 15 + KPIs)
 */

document.addEventListener('DOMContentLoaded', () => {
    loadRankingsData();
});

async function loadRankingsData() {
    try {
        let basePlayers = [];
        let baseClans = [];

        try {
            const res = await fetch('/api/lobby/content');
            if (res.ok) {
                const data = await res.json();
                basePlayers = data.playerRankings || [];
                baseClans = data.clanRankings || [];
            }
        } catch (e) {
            console.warn('[RANKINGS] Usando datos locales de reserva:', e);
        }

        // 25 Duelistas oficiales únicos de Ani Dimension
        const sampleDuelists = [
            { Username: "SetoKaiba", CountryName: "Japón", Nivel: 99, Wins: 342 },
            { Username: "YugiMuto", CountryName: "Japón", Nivel: 95, Wins: 310 },
            { Username: "JoeyWheeler", CountryName: "Estados Unidos", Nivel: 82, Wins: 198 },
            { Username: "MaiValentine", CountryName: "Estados Unidos", Nivel: 78, Wins: 175 },
            { Username: "MarikIshtar", CountryName: "Egipto", Nivel: 75, Wins: 160 },
            { Username: "BakuraRyo", CountryName: "Reino Unido", Nivel: 70, Wins: 145 },
            { Username: "PegasusJ", CountryName: "Estados Unidos", Nivel: 68, Wins: 130 },
            { Username: "ZaneTruesdale", CountryName: "Japón", Nivel: 66, Wins: 124 },
            { Username: "JadenYuki", CountryName: "Japón", Nivel: 64, Wins: 118 },
            { Username: "AsterPhoenix", CountryName: "Reino Unido", Nivel: 62, Wins: 112 },
            { Username: "ChazzPrinceton", CountryName: "Estados Unidos", Nivel: 60, Wins: 105 },
            { Username: "AlexisRhodes", CountryName: "Estados Unidos", Nivel: 58, Wins: 98 },
            { Username: "YuseiFudo", CountryName: "Japón", Nivel: 56, Wins: 92 },
            { Username: "JackAtlas", CountryName: "Reino Unido", Nivel: 54, Wins: 86 },
            { Username: "CrowHogan", CountryName: "Japón", Nivel: 52, Wins: 80 },
            { Username: "AkizaIzinski", CountryName: "Japón", Nivel: 50, Wins: 76 },
            { Username: "KaitoTenjo", CountryName: "Japón", Nivel: 48, Wins: 71 },
            { Username: "SharkReginald", CountryName: "Japón", Nivel: 46, Wins: 65 },
            { Username: "YumaTsukumo", CountryName: "Japón", Nivel: 45, Wins: 61 },
            { Username: "YuyaSakaki", CountryName: "Japón", Nivel: 44, Wins: 58 },
            { Username: "YusakuFujiki", CountryName: "Japón", Nivel: 43, Wins: 54 },
            { Username: "Revolver", CountryName: "Japón", Nivel: 42, Wins: 50 },
            { Username: "Soulburner", CountryName: "Japón", Nivel: 41, Wins: 47 },
            { Username: "DeclanAkaba", CountryName: "Japón", Nivel: 40, Wins: 44 },
            { Username: "JesseAnderson", CountryName: "Estados Unidos", Nivel: 39, Wins: 40 }
        ];

        // Deduplicar jugadores por nombre de usuario
        const seenPlayers = new Set();
        const mergedPlayers = [];

        basePlayers.forEach(p => {
            const u = (p.Username || p.username || '').toLowerCase().trim();
            if (u && !seenPlayers.has(u)) {
                seenPlayers.add(u);
                mergedPlayers.push(p);
            }
        });

        sampleDuelists.forEach(p => {
            const u = (p.Username || p.username || '').toLowerCase().trim();
            if (u && !seenPlayers.has(u)) {
                seenPlayers.add(u);
                mergedPlayers.push(p);
            }
        });

        // 25 Clanes oficiales Ani Dimension únicos (sin KaibaCorp ni KC)
        const sampleClans = [
            { Name: "Ani Dimension Elite", Tag: "AD", Leader: "DuelMaster", Members: 48, MaxMembers: 50, Trophies: 12500 },
            { Name: "Ilusionistas Milenio", Tag: "EYE", Leader: "PegasusJ", Members: 45, MaxMembers: 50, Trophies: 11200 },
            { Name: "Fuerza del Dragón", Tag: "DRG", Leader: "Admin", Members: 42, MaxMembers: 50, Trophies: 9800 },
            { Name: "Magos del Tiempo", Tag: "WIZ", Leader: "JoeyWheeler", Members: 38, MaxMembers: 50, Trophies: 8650 },
            { Name: "Héroes del Destino", Tag: "D-H", Leader: "AsterP", Members: 35, MaxMembers: 50, Trophies: 7900 },
            { Name: "Sombras Oscuras", Tag: "SHD", Leader: "MarikIshtar", Members: 30, MaxMembers: 50, Trophies: 6800 },
            { Name: "Cuerpo Dragón Cyber", Tag: "CYB", Leader: "ZaneT", Members: 28, MaxMembers: 50, Trophies: 6200 },
            { Name: "Academia Slifer", Tag: "RED", Leader: "JadenY", Members: 26, MaxMembers: 50, Trophies: 5800 },
            { Name: "Rider Stardust", Tag: "STD", Leader: "YuseiF", Members: 25, MaxMembers: 50, Trophies: 5400 },
            { Name: "Galaxy Eyes Elite", Tag: "GLX", Leader: "KaitoT", Members: 22, MaxMembers: 50, Trophies: 4900 },
            { Name: "Revolución Péndulo", Tag: "PDL", Leader: "YuyaS", Members: 20, MaxMembers: 50, Trophies: 4400 },
            { Name: "Red Cyberse", Tag: "CYB", Leader: "YusakuF", Members: 18, MaxMembers: 50, Trophies: 3900 },
            { Name: "Fuerza Xyz Astral", Tag: "XYZ", Leader: "YumaT", Members: 16, MaxMembers: 50, Trophies: 3500 },
            { Name: "Vínculo Sincronía", Tag: "SNC", Leader: "JackA", Members: 15, MaxMembers: 50, Trophies: 3100 },
            { Name: "Fusión Dimensional", Tag: "FUS", Leader: "ChazzP", Members: 14, MaxMembers: 50, Trophies: 2800 },
            { Name: "Rosas Negras", Tag: "BRS", Leader: "AkizaI", Members: 12, MaxMembers: 50, Trophies: 2500 },
            { Name: "Imperio Barian", Tag: "BAR", Leader: "Nash", Members: 11, MaxMembers: 50, Trophies: 2200 },
            { Name: "Arquetipo Supremo", Tag: "ARC", Leader: "Zarc", Members: 10, MaxMembers: 50, Trophies: 1950 },
            { Name: "Caballeros de Hanoi", Tag: "HNO", Leader: "Revolver", Members: 9, MaxMembers: 50, Trophies: 1800 },
            { Name: "Bestias de Cristal", Tag: "CB", Leader: "JesseA", Members: 8, MaxMembers: 50, Trophies: 1650 },
            { Name: "Órea Dimensional", Tag: "ORD", Leader: "DeclanA", Members: 8, MaxMembers: 50, Trophies: 1500 },
            { Name: "Salamangreat Clan", Tag: "SG", Leader: "Soulburner", Members: 7, MaxMembers: 50, Trophies: 1350 },
            { Name: "Valkirias Celestiales", Tag: "VAL", Leader: "AlexisR", Members: 6, MaxMembers: 50, Trophies: 1200 },
            { Name: "Alas Negras OCG", Tag: "BW", Leader: "CrowH", Members: 5, MaxMembers: 50, Trophies: 1050 }
        ];

        // Deduplicar clanes por nombre normalizado
        const seenClans = new Set();
        const mergedClans = [];

        baseClans.forEach(c => {
            let name = (c.Name || c.name || '').trim();
            if (name.toLowerCase().includes('kaiba')) name = 'Ani Dimension Elite';
            const key = name.toLowerCase();
            if (key && !seenClans.has(key)) {
                seenClans.add(key);
                mergedClans.push({ ...c, Name: name });
            }
        });

        sampleClans.forEach(c => {
            let name = (c.Name || c.name || '').trim();
            if (name.toLowerCase().includes('kaiba')) name = 'Ani Dimension Elite';
            const key = name.toLowerCase();
            if (key && !seenClans.has(key)) {
                seenClans.add(key);
                mergedClans.push({ ...c, Name: name });
            }
        });

        // Actualizar KPIs de cabecera
        updateKpis(mergedPlayers, mergedClans);

        // Renderizar las 3 tablas con exactamente 20 puestos oficiales
        renderTopNivel(mergedPlayers);
        renderTopWins(mergedPlayers);
        renderTopClans(mergedClans);

    } catch (e) {
        console.error('[RANKINGS ERROR]', e);
    }
}

function updateKpis(players, clans) {
    const totalUsersEl = document.getElementById('kpi-total-users');
    if (totalUsersEl) {
        totalUsersEl.textContent = '1,420';
    }
    const clansEl = document.getElementById('kpi-total-clans');
    if (clansEl) {
        clansEl.innerHTML = `<span style="color:#ffd700;">${clans.length}</span> <span style="color:#94a3b8; font-size:10px; font-weight:600;">CLANES</span>`;
    }
    const onlineEl = document.getElementById('kpi-online-users');
    if (onlineEl) {
        onlineEl.innerHTML = `<span style="color:#10b981;">34</span> <span style="color:#94a3b8; font-size:10px; font-weight:600;">ONLINE</span>`;
    }
}

function getPosBadgeHtml(pos) {
    let cls = 'pos-normal';
    if (pos === 1) cls = 'pos-1';
    else if (pos === 2) cls = 'pos-2';
    else if (pos === 3) cls = 'pos-3';
    return `<span class="pos-badge ${cls}">#${pos}</span>`;
}

function getNameColorClass(pos) {
    if (pos === 1) return 'name-top-1';
    if (pos === 2) return 'name-top-2';
    if (pos === 3) return 'name-top-3';
    return '';
}

// 1. TOP 20 NIVEL (POS | DUELISTA | NIVEL) - SIN RECUADRO, MISMO TAMAÑO QUE DUELISTA
function renderTopNivel(players) {
    const list = [...players]
        .sort((a, b) => (b.Nivel || b.nivel || 0) - (a.Nivel || a.nivel || 0))
        .slice(0, 20);

    const tbody = document.getElementById('table-body-nivel');
    if (!tbody) return;

    tbody.innerHTML = list.map((p, idx) => {
        const pos = idx + 1;
        const name = p.Username || p.username || 'Duelista';
        const lvl = p.Nivel || p.nivel || 1;
        const nameClass = getNameColorClass(pos);

        return `
            <tr>
                <td style="text-align:center;">${getPosBadgeHtml(pos)}</td>
                <td><span class="duelist-name ${nameClass}" title="${name}">${name}</span></td>
                <td style="text-align:right;"><span class="rank-stat-val val-cyan">${lvl}</span></td>
            </tr>
        `;
    }).join('');
}

// 2. TOP 20 VICTORIAS PVP (POS | DUELISTA | VICTORIAS) - SIN RECUADRO, MISMO TAMAÑO QUE DUELISTA
function renderTopWins(players) {
    const list = [...players]
        .sort((a, b) => (b.Wins || b.wins || 0) - (a.Wins || a.wins || 0))
        .slice(0, 20);

    const tbody = document.getElementById('table-body-wins');
    if (!tbody) return;

    tbody.innerHTML = list.map((p, idx) => {
        const pos = idx + 1;
        const name = p.Username || p.username || 'Duelista';
        const wins = p.Wins || p.wins || 0;
        const nameClass = getNameColorClass(pos);

        return `
            <tr>
                <td style="text-align:center;">${getPosBadgeHtml(pos)}</td>
                <td><span class="duelist-name ${nameClass}" title="${name}">${name}</span></td>
                <td style="text-align:right;"><span class="rank-stat-val val-emerald">${wins}</span></td>
            </tr>
        `;
    }).join('');
}

// 3. TOP 20 CLANES (POS | CLAN | LÍDER | MIEMBROS | COPAS) - SIN RECUADROS, MISMO TAMAÑO QUE DUELISTA
function renderTopClans(clans) {
    const list = [...clans]
        .sort((a, b) => (b.Trophies || 0) - (a.Trophies || 0))
        .slice(0, 20);

    const tbody = document.getElementById('table-body-clans');
    if (!tbody) return;

    tbody.innerHTML = list.map((c, idx) => {
        const pos = idx + 1;
        let name = c.Name || 'Clan';
        if (name.toLowerCase().includes('kaiba')) {
            name = 'Ani Dimension Elite';
        }
        let tag = c.Tag ? `[${c.Tag}]` : '';
        if (tag === '[KC]') tag = '[AD]';
        const leader = c.Leader || 'Líder';
        const members = `${c.Members || 1}/${c.MaxMembers || 50}`;
        const trophies = (c.Trophies || 0).toLocaleString();
        const nameClass = getNameColorClass(pos);

        return `
            <tr>
                <td style="text-align:center;">${getPosBadgeHtml(pos)}</td>
                <td>
                    <span class="clan-name ${nameClass}" title="${name} ${tag}">
                        ${name} <span class="clan-tag">${tag}</span>
                    </span>
                </td>
                <td><span style="color:#94a3b8; font-size:10.5px; font-weight:400;">${leader}</span></td>
                <td style="text-align:center;"><span class="rank-stat-val val-emerald">${members}</span></td>
                <td style="text-align:right;"><span class="rank-stat-val val-gold">${trophies}</span></td>
            </tr>
        `;
    }).join('');
}
