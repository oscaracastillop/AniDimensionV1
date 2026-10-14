/**
 * Ani-Dimension: Controlador de la Vista Dedicada de Rankings (3 Secciones Top 15 + KPIs)
 */

document.addEventListener('DOMContentLoaded', () => {
    // Identificar socket para registrar presencia en tiempo real
    try {
        const socket = window.getSocket ? window.getSocket() : (window.socket || null);
        const user = window.Session && window.Session.getUser() ? window.Session.getUser() : null;
        if (socket && user) {
            socket.emit('USER_IDENTIFY', {
                user_id: user.id,
                username: user.username,
                avatar: user.avatarActivoId || user.avatar || 'AVA-001'
            });
        }
    } catch (e) {}

    loadRankingsData();

    // Auto-refrescar cada 30 segundos
    setInterval(loadRankingsData, 30000);
});

async function loadRankingsData() {
    try {
        let topNivel = [];
        let topWins = [];
        let topClans = [];
        let kpis = { totalUsers: 0, totalClans: 0, onlineUsers: 1 };

        try {
            const res = await fetch('/api/rankings');
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    topNivel = data.topNivel || [];
                    topWins = data.topWins || [];
                    topClans = data.topClans || [];
                    kpis = data.kpis || kpis;
                }
            }
        } catch (e) {
            console.warn('[RANKINGS] Fallo al consultar /api/rankings:', e);
        }

        // Si no obtuvo por API dedicado, intentar /api/lobby/content
        if (topNivel.length === 0) {
            try {
                const res = await fetch('/api/lobby/content');
                if (res.ok) {
                    const data = await res.json();
                    topNivel = data.playerRankings || [];
                    topWins = data.playerRankings || [];
                    topClans = data.clanRankings || [];
                }
            } catch (e) {}
        }

        // Actualizar KPIs de cabecera con datos reales de la base de datos
        updateKpis(kpis);

        // Renderizar las 3 tablas oficiales
        renderTopNivel(topNivel);
        renderTopWins(topWins);
        renderTopClans(topClans);

    } catch (e) {
        console.error('[RANKINGS ERROR]', e);
    }
}

function updateKpis(kpis) {
    const totalUsersEl = document.getElementById('kpi-total-users');
    if (totalUsersEl) {
        totalUsersEl.textContent = (kpis.totalUsers || 0).toLocaleString();
    }
    const clansEl = document.getElementById('kpi-total-clans');
    if (clansEl) {
        clansEl.innerHTML = `<span style="color:#ffd700;">${(kpis.totalClans || 0).toLocaleString()}</span> <span style="color:#94a3b8; font-size:10px; font-weight:600;">CLANES</span>`;
    }
    const onlineEl = document.getElementById('kpi-online-users');
    if (onlineEl) {
        onlineEl.innerHTML = `<span style="color:#10b981;">${(kpis.onlineUsers || 1).toLocaleString()}</span> <span style="color:#94a3b8; font-size:10px; font-weight:600;">ONLINE</span>`;
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
        const isOnline = Boolean(p.isOnline);

        return `
            <tr>
                <td style="text-align:center;">${getPosBadgeHtml(pos)}</td>
                <td>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span class="duelist-name ${nameClass}" title="${name}">${name}</span>
                        ${isOnline ? `<span style="display:inline-block; width:6px; height:6px; background:#10b981; border-radius:50%; box-shadow:0 0 6px #10b981;" title="En Línea Ahora"></span>` : ''}
                    </div>
                </td>
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
        const isOnline = Boolean(p.isOnline);

        return `
            <tr>
                <td style="text-align:center;">${getPosBadgeHtml(pos)}</td>
                <td>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span class="duelist-name ${nameClass}" title="${name}">${name}</span>
                        ${isOnline ? `<span style="display:inline-block; width:6px; height:6px; background:#10b981; border-radius:50%; box-shadow:0 0 6px #10b981;" title="En Línea Ahora"></span>` : ''}
                    </div>
                </td>
                <td style="text-align:right;"><span class="rank-stat-val val-emerald">${wins}</span></td>
            </tr>
        `;
    }).join('');
}

// 3. TOP 20 CLANES (POS | CLAN | LÍDER | MIEMBROS | NIVEL) - SIN RECUADROS, MISMO TAMAÑO QUE DUELISTA
function renderTopClans(clans) {
    const list = [...clans]
        .sort((a, b) => {
            const lvlDiff = (b.Level || b.level || 1) - (a.Level || a.level || 1);
            if (lvlDiff !== 0) return lvlDiff;
            return (b.Exp || b.exp || 0) - (a.Exp || a.exp || 0);
        })
        .slice(0, 20);

    const tbody = document.getElementById('table-body-clans');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:20px;">Sin clanes registrados</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map((c, idx) => {
        const pos = idx + 1;
        let name = c.Name || c.name || 'Clan';
        let tag = c.Tag || c.tag ? `[${c.Tag || c.tag}]` : '';
        const leader = c.Leader || c.leader || 'Líder';
        const members = `${c.Members !== undefined ? c.Members : (c.currentMembers || 1)}/${c.MaxMembers || c.maxMembers || 30}`;
        const level = c.Level || c.level || 1;
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
                <td style="text-align:right;"><span class="rank-stat-val val-cyan">Nv. ${level}</span></td>
            </tr>
        `;
    }).join('');
}
