/**
 * Ani-Dimension: Controlador del Sistema de Clanes
 * Exploración, Fundación, Gestión de Miembros, Penalización 24h y Ficha de Perfil de Jugador
 */

let currentMyClanData = null;
let currentAllClans = [];
let activeClanTab = 'members'; // 'members', 'requests'
let selectedEmblemBase64 = null;
let userPenaltyState = { hasPenalty: false, minutesRemaining: 0 };
let topZIndex = 10000;

document.addEventListener('DOMContentLoaded', () => {
    initClansView();
});

async function initClansView() {
    updateHeaderStarships();
    initClanProfileDraggable();
    await loadClanState();
}

function updateHeaderStarships() {
    const starshipsEl = document.getElementById('clan-user-starships');
    if (starshipsEl && window.Session) {
        const stars = window.Session.getStarships();
        starshipsEl.textContent = `⭐ ${Number(stars).toLocaleString()} STARSHIPS`;
    }
}

function getCurrentUserId() {
    const u = window.Session ? window.Session.getUser() : null;
    return u ? (u.id || u.user_id || u.Id || 1) : 1;
}

function getCurrentUser() {
    return window.Session ? window.Session.getUser() : null;
}

/**
 * Carga el estado del clan: Si el usuario pertenece a uno, muestra el Dashboard; sino, la lista de exploración
 */
async function loadClanState() {
    const mainView = document.getElementById('clan-main-view');
    if (!mainView) return;

    mainView.innerHTML = `
        <div style="text-align:center; padding:50px 20px; color:#94a3b8;">
            <div style="font-family:'Orbitron', sans-serif; font-size:12px; color:#00f0ff; letter-spacing:1px;">SINCRONIZANDO CLANES Y MEMBRESÍAS...</div>
        </div>
    `;

    const userId = getCurrentUserId();

    try {
        const res = await fetch(`/api/clans/my-clan?userId=${userId}`);
        const data = await res.json();

        if (data.success && data.hasClan && data.clan) {
            currentMyClanData = data.clan;
            userPenaltyState = { hasPenalty: false, minutesRemaining: 0 };
            renderMyClanDashboard(currentMyClanData);
        } else {
            currentMyClanData = null;
            userPenaltyState = {
                hasPenalty: Boolean(data.hasPenalty),
                minutesRemaining: data.penaltyMinutesRemaining || 0
            };
            await loadClansList();
        }
    } catch (err) {
        console.error('[CLANS ERROR]', err);
        await loadClansList();
    }
}

/**
 * RENDER: VISTA EXPLORADOR DE CLANES (CUANDO EL USUARIO NO TIENE CLAN)
 */
async function loadClansList() {
    const mainView = document.getElementById('clan-main-view');
    if (!mainView) return;

    const userId = getCurrentUserId();

    try {
        const res = await fetch(`/api/clans/list?userId=${userId}`);
        const data = await res.json();
        currentAllClans = (data.success && data.clans) ? data.clans : [];
        if (data.hasPenalty !== undefined) {
            userPenaltyState = {
                hasPenalty: Boolean(data.hasPenalty),
                minutesRemaining: data.penaltyMinutesRemaining || 0
            };
        }
        renderClansExplorer(currentAllClans);
    } catch (e) {
        console.error('[LOAD CLANS LIST ERROR]', e);
        renderClansExplorer([]);
    }
}

function formatMinutesToHours(minutes) {
    if (!minutes || minutes <= 0) return '0h 0m';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
}

function renderClansExplorer(clans) {
    const mainView = document.getElementById('clan-main-view');
    if (!mainView) return;

    let penaltyBannerHtml = '';
    if (userPenaltyState.hasPenalty && userPenaltyState.minutesRemaining > 0) {
        penaltyBannerHtml = `
            <div class="clan-penalty-banner">
                <div>
                    <div class="clan-penalty-title">
                        <span>⏳</span>
                        <span>PENALIZACIÓN ACTIVA POR RETIRO DE CLAN</span>
                    </div>
                    <div class="clan-penalty-desc">
                        Has abandonado un clan recientemente. Debes esperar el tiempo reglamentario de 24 horas antes de poder fundar o unirte a otra hermandad.
                    </div>
                </div>
                <div class="clan-penalty-timer">
                    DISPONIBLE EN: ${formatMinutesToHours(userPenaltyState.minutesRemaining)}
                </div>
            </div>
        `;
    }

    mainView.innerHTML = `
        ${penaltyBannerHtml}

        <!-- HERO EXPLORADOR -->
        <div class="no-clan-hero">
            <div class="no-clan-hero-info">
                <h2>HERMANDADES Y CLANES OFICIALES</h2>
                <p>
                    Únete a un Clan para obtener bonificaciones directas de <b>+1% a +100% de EXP y StarShips</b> en todos tus duelos según el nivel del clan.
                    O funda tu propio clan oficial con escudo personalizado por <b>⭐ 50,000 StarShips</b> (máx. 30 duelistas).
                </p>
            </div>
            <button type="button" class="btn-clan-action btn-clan-create" onclick="openCreateClanModal()">
                FUNDAR UN NUEVO CLAN (⭐ 50,000)
            </button>
        </div>

        <!-- BARRA DE BÚSQUEDA / FILTRO -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
            <div style="font-family:'Orbitron', sans-serif; font-size:11px; font-weight:800; color:#00f0ff; letter-spacing:0.5px;">
                CLANES DISPONIBLES (${clans.length})
            </div>
            <input type="text" placeholder="Buscar clan por nombre o sigla..." class="form-input" style="max-width:280px; height:28px;" oninput="filterClansList(this.value)">
        </div>

        <!-- GRID DE CLANES -->
        <div id="clans-grid-container" class="clans-list-grid">
            ${clans.length === 0 ? `
                <div style="grid-column: 1/-1; text-align:center; padding:35px 20px; background:rgba(0,0,0,0.4); border:1px dashed rgba(0,240,255,0.3);">
                    <div style="font-family:'Orbitron', sans-serif; font-size:12px; color:#ffd700; font-weight:800; margin-bottom:4px;">AÚN NO HAY CLANES FUNDADOS</div>
                    <div style="font-size:10px; color:#94a3b8;">¡Sé el primer duelista en fundar una hermandad oficial de Ani-Dimension!</div>
                    <button type="button" class="btn-clan-action btn-clan-create" onclick="openCreateClanModal()" style="margin-top:12px;">
                        FUNDAR EL PRIMER CLAN
                    </button>
                </div>
            ` : clans.map(c => renderClanItemCard(c)).join('')}
        </div>
    `;
}

function renderClanItemCard(c) {
    const isFull = (c.currentMembers || 0) >= (c.maxMembers || 30);
    const hasPendingReq = c.requestStatus === 'PENDING';
    const tagHtml = c.tag ? `<span class="clan-tag-badge">[${escapeHtml(c.tag)}]</span>` : '';
    const onlineCount = c.onlineMembers || 0;

    return `
        <div class="clan-item-box">
            <div>
                <div class="clan-item-header">
                    <img src="${c.emblemUrl || '../../assets/images/logo.png'}" onerror="this.onerror=null; this.src='../../assets/images/logo.png';" alt="${escapeHtml(c.name)}" class="clan-emblem-thumb">
                    <div style="flex-grow:1; min-width:0;">
                        <div class="clan-item-name" title="${escapeHtml(c.name)}">${escapeHtml(c.name)} ${tagHtml}</div>
                        <div style="font-size:9px; color:#94a3b8; margin-top:2px;">
                            Líder: <b style="color:#cbd5e1; cursor:pointer;" onclick="openClanUserProfile(${c.leader.id}, '${escapeHtml(c.leader.username)}')">${escapeHtml(c.leader.username)}</b>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-family:'Orbitron', sans-serif; font-size:11px; font-weight:900; color:#00f0ff;">
                            Nv. ${c.level}
                        </div>
                        <div style="font-size:8px; color:#ffd700; font-family:'Orbitron', sans-serif;">
                            +${c.bonusExpPct}% EXP
                        </div>
                    </div>
                </div>

                <div style="font-size:9.5px; color:#94a3b8; margin:6px 0; line-height:1.3; min-height:24px; word-break:break-word;">
                    ${escapeHtml(c.noticeMessage || 'Sin mensaje de líder')}
                </div>
            </div>

            <div style="border-top:1px solid rgba(255,255,255,0.08); padding-top:8px; margin-top:6px; display:flex; justify-content:space-between; align-items:center;">
                <div style="font-size:9px; color:#cbd5e1;">
                    👥 <b>${c.currentMembers}/${c.maxMembers || 30}</b>
                    <span style="color:#00ff88; margin-left:6px;">• 🟢 ${onlineCount}</span>
                </div>

                <div>
                    ${hasPendingReq ? `
                        <button type="button" class="btn-clan-action btn-table-sm" disabled style="opacity:0.7; background:rgba(255,215,0,0.15); border-color:#ffd700; color:#ffd700;">
                            SOLICITADO
                        </button>
                    ` : isFull ? `
                        <button type="button" class="btn-clan-action btn-table-sm" disabled style="opacity:0.5; border-color:#64748b; color:#64748b;">
                            LLENO
                        </button>
                    ` : `
                        <button type="button" class="btn-clan-action btn-table-sm" onclick="requestJoinClan(${c.id}, '${escapeHtml(c.name)}', ${c.minLevelReq})">
                            SOLICITAR
                        </button>
                    `}
                </div>
            </div>
        </div>
    `;
}

function filterClansList(query) {
    const q = (query || '').toLowerCase().trim();
    const container = document.getElementById('clans-grid-container');
    if (!container) return;

    const filtered = currentAllClans.filter(c => 
        (c.name && c.name.toLowerCase().includes(q)) || 
        (c.tag && c.tag.toLowerCase().includes(q)) ||
        (c.leader && c.leader.username && c.leader.username.toLowerCase().includes(q))
    );

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align:center; padding:25px; color:#94a3b8; font-size:10px;">
                No se encontraron clanes que coincidan con "<b>${escapeHtml(query)}</b>".
            </div>
        `;
    } else {
        container.innerHTML = filtered.map(c => renderClanItemCard(c)).join('');
    }
}

/**
 * ENVIAR SOLICITUD DE INGRESO
 */
async function requestJoinClan(clanId, clanName, minLvl) {
    const user = getCurrentUser();
    const playerLvl = user ? (user.nivel || user.Nivel || 1) : 1;

    if (playerLvl < minLvl) {
        if (window.showAniModal) {
            window.showAniModal('RESTRICCIÓN DE NIVEL', `No cumples con el nivel mínimo requerido (Nv. ${minLvl}). Tu nivel actual es Nv. ${playerLvl}.`, 'warning');
        } else {
            window.aniAlert(`No cumples con el nivel mínimo requerido (Nv. ${minLvl}). Tu nivel actual es Nv. ${playerLvl}.`, 'RESTRICCIÓN DE NIVEL', 'warning');
        }
        return;
    }

    try {
        const res = await fetch(`/api/clans/${clanId}/join-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: getCurrentUserId() })
        });
        const data = await res.json();

        if (data.success) {
            if (window.showAniModal) {
                window.showAniModal('SOLICITUD ENVIADA', data.message || 'Solicitud enviada con éxito', 'success');
            } else {
                window.aniAlert(data.message || 'Solicitud enviada con éxito', 'SOLICITUD ENVIADA', 'success');
            }
            await loadClansList();
        } else {
            if (window.showAniModal) {
                window.showAniModal('NO SE PUDO ENVIAR', data.message || 'Error al enviar solicitud', 'error');
            } else {
                window.aniAlert(data.message || 'Error al enviar solicitud', 'NO SE PUDO ENVIAR', 'error');
            }
        }
    } catch (e) {
        console.error('Error enviando solicitud:', e);
    }
}

/**
 * RENDER: DASHBOARD OFICIAL "MI CLAN"
 */
function renderMyClanDashboard(clan) {
    const mainView = document.getElementById('clan-main-view');
    if (!mainView) return;

    const isLeader = clan.myRole === 'Lider';
    const isColider = clan.myRole === 'Colider';
    const canManage = isLeader || isColider;

    const expProgressPct = clan.nextLevelExp > 0 ? Math.min(100, Math.floor((clan.exp / clan.nextLevelExp) * 100)) : 0;
    const tagHtml = clan.tag ? `<span class="clan-tag-badge">[${escapeHtml(clan.tag)}]</span>` : '';
    const onlineCount = clan.onlineMembersCount || clan.members.filter(m => m.isOnline).length;
    const totalCount = clan.totalMembersCount || clan.members.length;

    mainView.innerHTML = `
        <!-- HERO CABECERA DEL CLAN -->
        <div class="my-clan-hero">
            <div class="my-clan-hero-left">
                <img src="${clan.emblemUrl || '../../assets/images/logo.png'}" onerror="this.onerror=null; this.src='../../assets/images/logo.png';" alt="${escapeHtml(clan.name)}" class="my-clan-emblem-lg">
                <div>
                    <h2 class="my-clan-hero-title">
                        ${escapeHtml(clan.name)} ${tagHtml}
                    </h2>
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                        <span class="member-role-badge ${clan.myRole === 'Lider' ? 'role-lider' : (clan.myRole === 'Colider' ? 'role-colider' : 'role-miembro')}">
                            ${clan.myRole === 'Lider' ? 'LÍDER FUNDADOR' : (clan.myRole === 'Colider' ? 'COLÍDER' : 'MIEMBRO')}
                        </span>
                        <span style="font-size:9.5px; color:#94a3b8;">
                            🏆 Copas de Liga: <b style="color:#00f0ff;">${Number(clan.trophies || 0).toLocaleString()}</b>
                        </span>
                        <span style="font-size:9.5px; color:#94a3b8;">
                            👥 Miembros: <b style="color:#10b981;">${totalCount}/${clan.maxMembers || 30}</b>
                        </span>
                        <span style="font-size:9.5px; color:#00ff88;">
                            🟢 <b>${onlineCount} Conectados</b>
                        </span>
                    </div>

                    <!-- BARRA DE EXPERIENCIA DEL CLAN -->
                    <div class="clan-exp-bar-container">
                        <div class="clan-exp-bar-track">
                            <div class="clan-exp-bar-fill" style="width:${expProgressPct}%;"></div>
                        </div>
                        <div class="clan-exp-text">
                            <span style="color:#00f0ff; font-weight:800;">NIVEL DE CLAN ${clan.level} / 100</span>
                            <span style="color:#cbd5e1;">${Number(clan.exp || 0).toLocaleString()} / ${Number(clan.nextLevelExp || 1000).toLocaleString()} EXP (${expProgressPct}%)</span>
                        </div>
                    </div>
                </div>
            </div>

            <div style="display:flex; flex-direction:row; gap:8px; align-items:center; flex-wrap:wrap;">
                ${canManage ? `
                    <button type="button" class="btn-clan-action" onclick="openEditClanModal()">
                        CONFIGURACIÓN
                    </button>
                ` : ''}
                <button type="button" onclick="promptLeaveClan()" class="btn-clan-action btn-danger">
                    ${isLeader && clan.members.length === 1 ? 'DISOLVER CLAN' : 'ABANDONAR CLAN'}
                </button>
            </div>
        </div>

        <!-- FILA MODULAR: BONIFICADORES EN LÍNEA + TABLÓN DE ANUNCIOS DEL LÍDER -->
        <div class="clan-mid-row">
            
            <!-- BLOQUES DE BONIFICACIONES (SIN ICONOS TACKY) -->
            <div class="clan-bonuses-group">
                <div class="clan-stat-block cyan">
                    <span class="clan-stat-lbl">BONUS EXP DUELOS</span>
                    <span class="clan-stat-val" style="color:#00f0ff;">+${clan.bonusExpPct}%</span>
                </div>
                <div class="clan-stat-block gold">
                    <span class="clan-stat-lbl">BONUS STARSHIPS</span>
                    <span class="clan-stat-val" style="color:#ffd700;">+${clan.bonusStarshipsPct}%</span>
                </div>
                <div class="clan-stat-block emerald">
                    <span class="clan-stat-lbl">NIVEL MÁXIMO</span>
                    <span class="clan-stat-val" style="color:#10b981;">Nv. 100</span>
                </div>
            </div>

            <!-- TABLÓN DE ANUNCIOS DEL LÍDER -->
            <div class="clan-notice-card">
                <div class="clan-notice-header">
                    <span class="clan-notice-title">TABLÓN DE ANUNCIOS DEL LÍDER</span>
                    ${canManage ? `
                        <button type="button" onclick="openEditClanModal()" style="background:transparent; border:none; color:#00f0ff; font-size:9px; cursor:pointer; font-weight:800; font-family:'Orbitron', sans-serif;">
                            EDITAR
                        </button>
                    ` : ''}
                </div>
                <div class="clan-notice-body">
                    ${escapeHtml(clan.noticeMessage || '¡Bienvenidos al clan oficial de Ani-Dimension! Participa en duelos diarios para aportar EXP a nuestra hermandad.')}
                </div>
            </div>
        </div>

        <!-- PESTAÑAS DE NAVEGACIÓN DENTRO DEL CLAN -->
        <div class="clan-tabs-bar">
            <button type="button" class="clan-tab-btn ${activeClanTab === 'members' ? 'active' : ''}" onclick="switchClanTab('members')">
                MIEMBROS (${totalCount}/30 • 🟢 ${onlineCount} EN LÍNEA)
            </button>
            ${canManage ? `
                <button type="button" class="clan-tab-btn ${activeClanTab === 'requests' ? 'active' : ''}" onclick="switchClanTab('requests')">
                    SOLICITUDES PENDIENTES (${clan.pendingRequests ? clan.pendingRequests.length : 0})
                </button>
            ` : ''}
        </div>

        <!-- CONTENIDO DE LA PESTAÑA ACTIVA -->
        <div id="clan-tab-content">
            ${activeClanTab === 'requests' && canManage ? renderClanRequestsTab(clan) : renderClanMembersTab(clan)}
        </div>
    `;
}

function switchClanTab(tab) {
    activeClanTab = tab;
    if (currentMyClanData) {
        renderMyClanDashboard(currentMyClanData);
    }
}

/**
 * PESTAÑA: LISTADO DE MIEMBROS (MÁXIMO 30) CON CLIC PARA VER PERFIL Y ESTADO ONLINE
 */
function renderClanMembersTab(clan) {
    const isLeader = clan.myRole === 'Lider';
    const isColider = clan.myRole === 'Colider';
    const myUid = getCurrentUserId();

    return `
        <div class="clan-members-table-wrap">
            <table class="clan-members-table">
                <thead>
                    <tr>
                        <th style="width:35px; text-align:center;">#</th>
                        <th>DUELISTA</th>
                        <th>RANGO</th>
                        <th style="text-align:center;">NIVEL</th>
                        <th style="text-align:right;">EXP APORTADA</th>
                        ${isLeader || isColider ? '<th style="text-align:center;">ACCIONES</th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${clan.members.map((m, idx) => {
                        const isMe = m.userId === myUid;
                        const roleBadge = m.role === 'Lider' 
                            ? '<span class="member-role-badge role-lider">LÍDER</span>' 
                            : (m.role === 'Colider' 
                                ? '<span class="member-role-badge role-colider">COLÍDER</span>' 
                                : '<span class="member-role-badge role-miembro">MIEMBRO</span>');

                        return `
                            <tr onclick="openClanUserProfile(${m.userId}, '${escapeHtml(m.username)}')">
                                <td style="text-align:center; color:#94a3b8; font-family:'Orbitron', sans-serif;">${idx + 1}</td>
                                <td>
                                    <div style="display:flex; align-items:center; gap:8px;">
                                        <div style="position:relative; width:28px; height:28px; flex-shrink:0;">
                                            <img src="../../assets/images/avatars/${m.avatar || 'AVA-002'}.png" onerror="this.onerror=null; this.src='../../assets/images/avatars/AVA-002.png';" style="width:28px; height:28px; border-radius:0; object-fit:contain; border:1px solid rgba(0,240,255,0.4);">
                                        </div>
                                        <div>
                                            <div style="font-weight:700; color:#fff; font-size:11px; display:flex; align-items:center; gap:4px;">
                                                <span class="clan-user-status-dot ${m.isOnline ? '' : 'offline'}" title="${m.isOnline ? 'En Línea' : 'Desconectado'}"></span>
                                                <span>${escapeHtml(m.username)}</span>
                                                ${isMe ? '<span style="color:#00f0ff; font-size:8.5px;">(Tú)</span>' : ''}
                                            </div>
                                            <div style="font-size:8px; color:#94a3b8;">${m.countryFlag || '🌐'} ${escapeHtml(m.countryName || 'Mundial')}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>${roleBadge}</td>
                                <td style="text-align:center; font-family:'Orbitron', sans-serif; font-weight:800; color:#00f0ff;">
                                    Nv. ${m.level}
                                </td>
                                <td style="text-align:right; font-family:'Orbitron', sans-serif; font-weight:700; color:#ffd700;">
                                    +${Number(m.contributedExp || 0).toLocaleString()} EXP
                                </td>
                                ${isLeader || isColider ? `
                                    <td style="text-align:center;" onclick="event.stopPropagation();">
                                        ${!isMe ? `
                                            <div style="display:flex; gap:4px; justify-content:center;">
                                                ${isLeader && m.role === 'Miembro' ? `
                                                    <button type="button" class="btn-clan-action btn-table-sm" onclick="changeMemberRole(${clan.id}, ${m.userId}, 'Colider', '${escapeHtml(m.username)}')">
                                                        PROMOVER
                                                    </button>
                                                ` : isLeader && m.role === 'Colider' ? `
                                                    <button type="button" class="btn-clan-action btn-table-sm" style="border-color:#94a3b8; color:#94a3b8;" onclick="changeMemberRole(${clan.id}, ${m.userId}, 'Miembro', '${escapeHtml(m.username)}')">
                                                        DEGRADAR
                                                    </button>
                                                ` : ''}
                                                ${(isLeader && m.role !== 'Lider') || (isColider && m.role === 'Miembro') ? `
                                                    <button type="button" class="btn-clan-action btn-table-sm btn-danger" onclick="kickClanMember(${clan.id}, ${m.userId}, '${escapeHtml(m.username)}')">
                                                        EXPULSAR
                                                    </button>
                                                ` : ''}
                                            </div>
                                        ` : '<span style="color:#64748b; font-size:9px;">—</span>'}
                                    </td>
                                ` : ''}
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * PESTAÑA: SOLICITUDES PENDIENTES
 */
function renderClanRequestsTab(clan) {
    const reqs = clan.pendingRequests || [];

    if (reqs.length === 0) {
        return `
            <div style="text-align:center; padding:30px; background:rgba(0,0,0,0.3); border:1px dashed rgba(0,240,255,0.2);">
                <div style="font-family:'Orbitron', sans-serif; font-size:11px; color:#cbd5e1;">NO HAY SOLICITUDES PENDIENTES</div>
            </div>
        `;
    }

    return `
        <div class="clans-list-grid">
            ${reqs.map(r => `
                <div class="clan-item-box" style="padding:10px;">
                    <div style="display:flex; align-items:center; justify-content:space-between; cursor:pointer;" onclick="openClanUserProfile(${r.userId}, '${escapeHtml(r.username)}')">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <img src="../../assets/images/avatars/${r.avatar || 'AVA-002'}.png" onerror="this.onerror=null; this.src='../../assets/images/avatars/AVA-002.png';" style="width:30px; height:30px; border-radius:0; object-fit:contain; border:1px solid #00f0ff;">
                            <div>
                                <div style="font-family:'Orbitron', sans-serif; font-size:11px; font-weight:800; color:#fff;">
                                    ${escapeHtml(r.username)}
                                </div>
                                <div style="font-size:8.5px; color:#94a3b8;">
                                    ${r.countryFlag || '🌐'} Nivel ${r.level}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style="display:flex; gap:6px; margin-top:8px;">
                        <button type="button" class="btn-clan-action btn-table-sm" style="flex:1; background:linear-gradient(90deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.3)); border-color:#34d399; color:#34d399;" onclick="handleRequestAction(${clan.id}, ${r.userId}, 'ACCEPT')">
                            ACEPTAR
                        </button>
                        <button type="button" class="btn-clan-action btn-table-sm btn-danger" style="flex:1;" onclick="handleRequestAction(${clan.id}, ${r.userId}, 'REJECT')">
                            RECHAZAR
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * MODAL: CREAR CLAN
 */
function openCreateClanModal() {
    if (userPenaltyState.hasPenalty && userPenaltyState.minutesRemaining > 0) {
        const remaining = formatMinutesToHours(userPenaltyState.minutesRemaining);
        if (window.showAniModal) {
            window.showAniModal('PENALIZACIÓN ACTIVA', `Tienes una penalización activa por retiro de clan. Podrás fundar o unirte a un clan en ${remaining}.`, 'warning');
        } else {
            window.aniAlert(`Tienes una penalización activa por retiro de clan. Podrás fundar o unirte a un clan en ${remaining}.`, 'PENALIZACIÓN ACTIVA', 'warning');
        }
        return;
    }

    const starships = window.Session ? window.Session.getStarships() : 0;
    if (starships < 50000) {
        const msg = `Se requieren 50,000 StarShips para fundar un Clan oficial. Tu saldo actual es ⭐ ${Number(starships).toLocaleString()}.`;
        if (window.showAniModal) {
            window.showAniModal('SALDO INSUFICIENTE', msg, 'warning');
        } else {
            window.aniAlert(msg, 'SALDO INSUFICIENTE', 'warning');
        }
        return;
    }

    const modal = document.getElementById('create-clan-modal');
    if (modal) modal.style.display = 'flex';
}

function closeCreateClanModal() {
    const modal = document.getElementById('create-clan-modal');
    if (modal) modal.style.display = 'none';
}

function updateClanNameCounter(input) {
    const counter = document.getElementById('clan-name-counter');
    if (counter && input) {
        input.value = input.value.replace(/[^a-zA-Z0-9]/g, '');
        counter.textContent = `${input.value.length}/15`;
    }
}

function previewClanEmblem(input) {
    const preview = document.getElementById('clan-emblem-preview');
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            if (preview) preview.src = e.target.result;
            selectedEmblemBase64 = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

async function handleCreateClanSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-create-clan');
    if (btn) btn.disabled = true;

    const name = document.getElementById('clan-input-name').value.trim();
    const tag = document.getElementById('clan-input-tag').value.trim();
    const minLvl = parseInt(document.getElementById('clan-input-minlvl').value || 1, 10);
    const notice = document.getElementById('clan-input-notice').value.trim();
    const fileInput = document.getElementById('clan-input-emblem');

    const formData = new FormData();
    formData.append('userId', getCurrentUserId());
    formData.append('name', name);
    formData.append('tag', tag);
    formData.append('minLevelReq', minLvl);
    formData.append('noticeMessage', notice);

    if (fileInput && fileInput.files && fileInput.files[0]) {
        formData.append('emblem', fileInput.files[0]);
    } else if (selectedEmblemBase64) {
        formData.append('emblemBase64', selectedEmblemBase64);
    }

    try {
        const res = await fetch('/api/clans/create', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();

        if (data.success) {
            if (window.Session && data.remainingStarships !== undefined) {
                const u = window.Session.getUser();
                if (u) {
                    u.starships = data.remainingStarships;
                    window.Session.saveUser(u);
                    window.Session.applyImmediateUI();
                }
                updateHeaderStarships();
            }
            closeCreateClanModal();
            if (window.showAniModal) {
                window.showAniModal('CLAN FUNDADO', data.message || '¡Clan fundado exitosamente!', 'success');
            } else {
                window.aniAlert(data.message || '¡Clan fundado exitosamente!', 'CLAN FUNDADO', 'success');
            }
            await loadClanState();
        } else {
            if (window.showAniModal) {
                window.showAniModal('ERROR AL CREAR', data.message || 'Error al crear clan', 'error');
            } else {
                window.aniAlert(data.message || 'Error al crear clan', 'ERROR AL CREAR', 'error');
            }
        }
    } catch (err) {
        console.error('Error creando clan:', err);
    } finally {
        if (btn) btn.disabled = false;
    }
}

/**
 * MODAL: EDITAR CONFIGURACIÓN DEL CLAN
 */
function openEditClanModal() {
    if (!currentMyClanData) return;
    const modal = document.getElementById('edit-clan-modal');
    if (!modal) return;

    document.getElementById('edit-clan-notice').value = cleanText(currentMyClanData.noticeMessage || '');
    document.getElementById('edit-clan-minlvl').value = currentMyClanData.minLevelReq || 1;
    document.getElementById('edit-clan-tag').value = currentMyClanData.tag || '';

    modal.style.display = 'flex';
}

function closeEditClanModal() {
    const modal = document.getElementById('edit-clan-modal');
    if (modal) modal.style.display = 'none';
}

async function handleEditClanSubmit(e) {
    e.preventDefault();
    if (!currentMyClanData) return;

    const notice = document.getElementById('edit-clan-notice').value.trim();
    const minLvl = parseInt(document.getElementById('edit-clan-minlvl').value || 1, 10);
    const tag = document.getElementById('edit-clan-tag').value.trim();

    try {
        const res = await fetch(`/api/clans/${currentMyClanData.id}/update-config`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: getCurrentUserId(),
                noticeMessage: notice,
                minLevelReq: minLvl,
                tag
            })
        });
        const data = await res.json();

        if (data.success) {
            closeEditClanModal();
            if (window.showAniModal) {
                window.showAniModal('ACTUALIZADO', 'Configuración del clan actualizada correctamente.', 'success');
            } else {
                window.aniAlert('Configuración del clan actualizada correctamente.', 'ACTUALIZADO', 'success');
            }
            await loadClanState();
        } else {
            if (window.showAniModal) {
                window.showAniModal('ERROR AL ACTUALIZAR', data.message || 'Error al actualizar', 'error');
            } else {
                window.aniAlert(data.message || 'Error al actualizar', 'ERROR AL ACTUALIZAR', 'error');
            }
        }
    } catch (err) {
        console.error('Error actualizando clan:', err);
    }
}

/**
 * GESTIONAR SOLICITUD (ACEPTAR / RECHAZAR)
 */
async function handleRequestAction(clanId, targetUserId, action) {
    try {
        const res = await fetch(`/api/clans/${clanId}/handle-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                adminUserId: getCurrentUserId(),
                targetUserId,
                action
            })
        });
        const data = await res.json();

        if (data.success) {
            if (window.showAniModal) window.showAniModal('SOLICITUD PROCESADA', data.message, 'success');
            await loadClanState();
        } else {
            if (window.showAniModal) window.showAniModal('ERROR', data.message || 'Error al gestionar solicitud', 'error');
        }
    } catch (e) {
        console.error('Error al responder solicitud:', e);
    }
}

/**
 * CAMBIAR RANGO DE MIEMBRO (PROMOVER / DEGRADAR)
 */
async function changeMemberRole(clanId, targetUserId, newRole, username) {
    const confirmMsg = `¿Deseas cambiar el rango de "${username}" a ${newRole}?`;
    
    const proceed = window.aniConfirm ? await window.aniConfirm(confirmMsg) : confirm(confirmMsg);
    if (!proceed) return;

    try {
        const res = await fetch(`/api/clans/${clanId}/role`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                leaderUserId: getCurrentUserId(),
                targetUserId,
                newRole
            })
        });
        const data = await res.json();

        if (data.success) {
            if (window.showAniModal) window.showAniModal('RANGO ACTUALIZADO', data.message, 'success');
            await loadClanState();
        } else {
            if (window.showAniModal) window.showAniModal('ERROR', data.message || 'Error al cambiar rango', 'error');
        }
    } catch (e) {
        console.error('Error al cambiar rango:', e);
    }
}

/**
 * EXPULSAR MIEMBRO (Aplica penalización 24h)
 */
async function kickClanMember(clanId, targetUserId, username) {
    const confirmMsg = `¿Estás seguro de que deseas expulsar a "${username}" del clan? Al ser expulsado, tendrá una penalización de 24 horas antes de poder entrar a otro clan.`;
    const proceed = window.aniConfirm ? await window.aniConfirm(confirmMsg) : confirm(confirmMsg);
    if (!proceed) return;

    try {
        const res = await fetch(`/api/clans/${clanId}/kick`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                adminUserId: getCurrentUserId(),
                targetUserId
            })
        });
        const data = await res.json();

        if (data.success) {
            if (window.showAniModal) window.showAniModal('MIEMBRO EXPULSADO', data.message, 'success');
            await loadClanState();
        } else {
            if (window.showAniModal) window.showAniModal('ERROR AL EXPULSAR', data.message || 'Error al expulsar', 'error');
        }
    } catch (e) {
        console.error('Error expulsando miembro:', e);
    }
}

/**
 * ABANDONAR / DISOLVER CLAN (Con Penalización de 24 horas)
 */
async function promptLeaveClan() {
    if (!currentMyClanData) return;
    const isLeader = currentMyClanData.myRole === 'Lider';
    const isOnlyMember = currentMyClanData.members.length === 1;

    if (isLeader && !isOnlyMember) {
        const msg = 'Como Líder Fundador, debes transferir el liderazgo a otro miembro antes de salir del clan.';
        if (window.showAniModal) window.showAniModal('LIDERAZGO REQUERIDO', msg, 'warning');
        else alert(msg);
        return;
    }

    let confirmMsg = '¿Estás seguro de que deseas abandonar este clan? Se te aplicará una penalización reglamentaria de 24 horas antes de poder fundar o unirte a otro clan.';
    if (isLeader && isOnlyMember) {
        confirmMsg = 'Eres el único miembro. Si abandonas el clan, será DISUELTO PERMANENTEMENTE y se te aplicará una penalización de 24 horas. ¿Deseas continuar?';
    }

    const proceed = window.aniConfirm ? await window.aniConfirm(confirmMsg) : confirm(confirmMsg);
    if (!proceed) return;

    try {
        const res = await fetch(`/api/clans/${currentMyClanData.id}/leave`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: getCurrentUserId() })
        });
        const data = await res.json();

        if (data.success) {
            if (window.showAniModal) {
                window.showAniModal('RETIRADO DEL CLAN', data.message, 'warning');
            } else {
                window.aniAlert(data.message, 'RETIRADO DEL CLAN', 'warning');
            }
            currentMyClanData = null;
            await loadClanState();
        } else {
            if (window.showAniModal) {
                window.showAniModal('ERROR AL SALIR', data.message || 'Error al salir del clan', 'error');
            } else {
                window.aniAlert(data.message || 'Error al salir del clan', 'ERROR AL SALIR', 'error');
            }
        }
    } catch (e) {
        console.error('Error al abandonar clan:', e);
    }
}

/**
 * =========================================================================
 * FICHA DE PERFIL DE JUGADOR (SP dbo.sp_ObtenerDetallePerfilUsuario)
 * =========================================================================
 */
async function openClanUserProfile(userId, username) {
    const widget = document.getElementById('clan-user-floating-widget');
    if (!widget) return;

    widget.style.display = 'block';
    widget.style.zIndex = ++topZIndex;
    document.getElementById('cup-username').textContent = username || 'Duelista';

    try {
        const res = await fetch(`/api/chat/user-profile/${encodeURIComponent(username || userId)}`);
        const data = await res.json();
        if (data.success && data.profile) {
            const p = data.profile;
            
            // 1. Identidad y Bandera
            document.getElementById('cup-username').textContent = p.username || username;
            document.getElementById('cup-country-name').textContent = p.countryName || 'Internacional';
            
            const flagEl = document.getElementById('cup-country-flag-img');
            const iso = (p.countryIsoCode || 'UN').toLowerCase();
            const flagUrl = `https://flagcdn.com/w80/${iso}.png`;
            if (flagEl) {
                flagEl.src = flagUrl;
                flagEl.onerror = () => { flagEl.style.display = 'none'; };
                flagEl.style.display = 'inline-block';
            }

            // 2. Avatar y Estado Online
            const avaImg = p.avatarImage || `/assets/images/avatars/${(p.avatar || 'ava-002').toLowerCase()}.png`;
            const avaEl = document.getElementById('cup-avatar-img');
            if (avaEl) {
                avaEl.src = avaImg;
                avaEl.onerror = () => { avaEl.src = '/assets/images/avatars/ava-002.png'; };
            }

            const dotEl = document.getElementById('cup-online-dot');
            if (dotEl) {
                dotEl.className = `chat-user-status-dot ${p.isOnline ? '' : 'offline'}`;
            }

            // 3. Insignias
            const lvl = p.nivel || p.level || 1;
            document.getElementById('cup-level-badge').textContent = `Nv. ${lvl}`;
            
            const vipBadge = document.getElementById('cup-vip-badge');
            if (vipBadge) {
                const isUserVip = Boolean(p.isVip || (p.vipUntil && new Date(p.vipUntil) > new Date()));
                if (isUserVip) {
                    vipBadge.textContent = 'VIP OFICIAL';
                    vipBadge.className = 'chat-user-badge gold';
                    vipBadge.style.display = 'inline-block';
                } else {
                    vipBadge.style.display = 'none';
                }
            }

            const adminBadge = document.getElementById('cup-admin-badge');
            if (adminBadge) {
                adminBadge.textContent = 'ADMIN';
                adminBadge.style.display = p.isAdmin ? 'inline-block' : 'none';
            }

            // 4. Progresión de Experiencia
            const curExp = parseInt(p.exp || p.experiencia || 0, 10);
            const reqExp = lvl * 250;
            const expPct = Math.min(100, Math.round((curExp / Math.max(1, reqExp)) * 100));

            const fillEl = document.getElementById('cup-exp-fill');
            if (fillEl) fillEl.style.width = `${expPct}%`;

            const expTextEl = document.getElementById('cup-exp-text');
            if (expTextEl) {
                expTextEl.textContent = `${curExp.toLocaleString()} / ${reqExp.toLocaleString()} EXP (${expPct}%)`;
            }

            // 5. Starships
            document.getElementById('cup-stat-starships').textContent = `${Number(p.starships || 0).toLocaleString()} ★`;

            // 6. Estadísticas de Duelos
            document.getElementById('cup-npc-duels').textContent = p.stats?.npc?.totalDuels || 0;
            document.getElementById('cup-npc-wins').textContent = p.stats?.npc?.wins || 0;
            document.getElementById('cup-npc-losses').textContent = p.stats?.npc?.losses || 0;
            document.getElementById('cup-npc-wr').textContent = p.stats?.npc?.winRate || '0.0%';

            document.getElementById('cup-pvp-duels').textContent = p.stats?.pvp?.totalDuels || 0;
            document.getElementById('cup-pvp-wins').textContent = p.stats?.pvp?.wins || 0;
            document.getElementById('cup-pvp-losses').textContent = p.stats?.pvp?.losses || 0;
            document.getElementById('cup-pvp-wr').textContent = p.stats?.pvp?.winRate || '0.0%';

            // 7. Bonificaciones
            document.getElementById('cup-boost-exp').textContent = `+${p.boosts?.exp || 0}%`;
            document.getElementById('cup-boost-star').textContent = `+${p.boosts?.starships || 0}%`;
            document.getElementById('cup-boost-luck').textContent = `+${p.boosts?.luck || 0}%`;
        }
    } catch(err) {
        console.error('[OPEN CLAN USER PROFILE ERROR]', err);
    }
}

function closeClanUserProfile() {
    const widget = document.getElementById('clan-user-floating-widget');
    if (widget) widget.style.display = 'none';
}

function initClanProfileDraggable() {
    const widget = document.getElementById('clan-user-floating-widget');
    const header = document.getElementById('clan-user-card-drag-header');
    if (!widget || !header) return;

    let isDragging = false;
    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;

    header.onmousedown = (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = widget.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        widget.style.right = 'auto';
        widget.style.left = `${initialLeft}px`;
        widget.style.top = `${initialTop}px`;
        document.onmousemove = onDragMove;
        document.onmouseup = onDragEnd;
    };

    function onDragMove(e) {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        widget.style.left = `${initialLeft + dx}px`;
        widget.style.top = `${initialTop + dy}px`;
    }

    function onDragEnd() {
        isDragging = false;
        document.onmousemove = null;
        document.onmouseup = null;
    }
}

function cleanText(str) {
    if (!str) return '';
    return String(str)
        .replace(/Â¡/g, '¡')
        .replace(/Â¿/g, '¿')
        .replace(/Ã“/g, 'Ó')
        .replace(/Ã¡/g, 'á')
        .replace(/Ã©/g, 'é')
        .replace(/Ã­/g, 'í')
        .replace(/Ã³/g, 'ó')
        .replace(/Ãº/g, 'ú')
        .replace(/Ã±/g, 'ñ')
        .replace(/ðŸ‡¨ðŸ‡´/g, '🇨🇴')
        .replace(/ðŸ”¥/g, '🔥');
}

function escapeHtml(str) {
    if (!str) return '';
    return cleanText(String(str))
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

window.openCreateClanModal = openCreateClanModal;
window.closeCreateClanModal = closeCreateClanModal;
window.updateClanNameCounter = updateClanNameCounter;
window.previewClanEmblem = previewClanEmblem;
window.handleCreateClanSubmit = handleCreateClanSubmit;
window.openEditClanModal = openEditClanModal;
window.closeEditClanModal = closeEditClanModal;
window.handleEditClanSubmit = handleEditClanSubmit;
window.requestJoinClan = requestJoinClan;
window.handleRequestAction = handleRequestAction;
window.changeMemberRole = changeMemberRole;
window.kickClanMember = kickClanMember;
window.promptLeaveClan = promptLeaveClan;
window.switchClanTab = switchClanTab;
window.filterClansList = filterClansList;
window.openClanUserProfile = openClanUserProfile;
window.closeClanUserProfile = closeClanUserProfile;
