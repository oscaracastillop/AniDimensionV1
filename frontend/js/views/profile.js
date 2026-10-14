/**
 * Ani-Dimension: Controlador de la Vista de Perfil de Duelista
 * Muestra Avatar libre, País/Bandera, Bonificaciones Totales (Globales),
 * Bonificaciones del Avatar Activo, Bonificaciones de Medallas, Bonificaciones VIP (Temporales),
 * Estadísticas de Duelos vs NPC y Duelos vs PVP.
 */

document.addEventListener('DOMContentLoaded', () => {
    if (window.Session && !window.Session.requireAuth('../login/login.html')) {
        return;
    }

    loadUserProfileData();
});

async function loadUserProfileData() {
    let user = window.Session ? window.Session.getUser() : null;

    // Si aún no hay usuario en sesión, intentar recuperar sesión de la BD directamente
    if (!user) {
        try {
            const fallbackRes = await fetch('/api/auth/me?userId=1');
            if (fallbackRes.ok) {
                const fbData = await fallbackRes.json();
                if (fbData && fbData.success && fbData.user) {
                    user = fbData.user;
                    if (window.Session) window.Session.saveUser(user);
                }
            }
        } catch (e) {}
    }

    if (!user) return;

    // Renderizado inmediato con los datos que ya tenemos para que nunca se quede en blanco
    renderProfileUI(user);

    // Reproducir música oficial de perfil
    if (window.SoundManager && typeof window.SoundManager.playBGM === 'function') {
        window.SoundManager.playBGM('profile', true);
    }

    // 1. Sincronizar cosméticos y datos desde SQL Server (aislados para que ninguno bloquee)
    try {
        if (window.AvatarsManager && typeof window.AvatarsManager.syncFromServer === 'function') {
            await window.AvatarsManager.syncFromServer();
        }
    } catch (e) { console.warn('[AVATARS SYNC NOTICE]', e); }

    try {
        if (window.PlaymatsManager && typeof window.PlaymatsManager.syncFromServer === 'function') {
            await window.PlaymatsManager.syncFromServer();
        }
    } catch (e) { console.warn('[PLAYMATS SYNC NOTICE]', e); }

    try {
        if (window.SleevesManager && typeof window.SleevesManager.syncFromServer === 'function') {
            await window.SleevesManager.syncFromServer();
        }
    } catch (e) { console.warn('[SLEEVES SYNC NOTICE]', e); }

    try {
        if (window.DeckManager && typeof window.DeckManager.syncFromServer === 'function') {
            await window.DeckManager.syncFromServer();
        }
    } catch (e) { console.warn('[DECK SYNC NOTICE]', e); }

    try {
        if (window.AdventureData && typeof window.AdventureData.syncFromServer === 'function') {
            await window.AdventureData.syncFromServer();
        }
    } catch (e) { console.warn('[ADVENTURE SYNC NOTICE]', e); }

    // 2. Normalizar ID de usuario (mapeo seguro de mock 999 o 0 hacia Admin 1)
    let uid = parseInt(user.id || user.user_id || user.Id || 1, 10);
    if (uid === 999 || isNaN(uid) || uid <= 0) uid = 1;
    const username = user.username || 'Admin';
    const query = `userId=${uid}&username=${encodeURIComponent(username)}`;

    // 3. Cargar en paralelo todos los datos reales de SQL Server (Auth, Duelos y Aventura)
    try {
        const [meRes, duelRes, advRes] = await Promise.all([
            fetch(`/api/auth/me?${query}`).then(r => r.ok ? r.json() : null).catch(() => null),
            fetch(`/api/game/duel/stats?${query}`).then(r => r.ok ? r.json() : null).catch(() => null),
            fetch(`/api/adventure/state?userId=${uid}&username=${encodeURIComponent(username)}`).then(r => r.ok ? r.json() : null).catch(() => null)
        ]);

        if (meRes && meRes.success && meRes.user) {
            user = { ...user, ...meRes.user };
        }
        if (duelRes && duelRes.success && duelRes.stats) {
            user.duelStats = duelRes.stats;
        }
        if (advRes && advRes.success) {
            user.medalsBonuses = advRes.bonuses || { exp: 0, starships: 0, luck: 0 };
            user.medalsCount = advRes.unlockedMedalsCount || 0;
            user.unlockedMedalIds = advRes.unlockedMedalIds || [];
            window.currentUserMedalIds = advRes.unlockedMedalIds || [];
        }

        if (window.Session) {
            window.Session.saveUser(user);
        }
    } catch (e) {
        console.warn('[PROFILE DATA SYNC ERROR]', e);
    }

    // 4. Renderizar UI consolidada con datos frescos de SQL Server
    renderProfileUI(user);
}

function renderProfileUI(user) {
    if (!user) return;

    // 1. Datos Principales del Duelista
    const nameEl = document.getElementById('prof-username');
    const saBadge = document.getElementById('prof-sa-badge');
    const emailEl = document.getElementById('prof-email');
    const lvlEl = document.getElementById('prof-level');
    const coinsEl = document.getElementById('prof-coins');

    if (nameEl) nameEl.textContent = user.username || 'Duelista';
    if (saBadge) saBadge.style.display = (user.isAdmin || user.role === 'admin' || (user.username && user.username.toLowerCase() === 'admin')) ? 'inline-block' : 'none';
    if (emailEl) emailEl.textContent = user.email || 'duelista@anidimension.com';
    
    const nivelVal = user.nivel || (user.stats && user.stats.level) || 1;
    const coinsVal = (window.Session && typeof window.Session.getStarships === 'function')
        ? window.Session.getStarships()
        : (user.starships !== undefined ? user.starships : ((user.balances && user.balances.coins) || 5000));
    
    if (lvlEl) lvlEl.textContent = `Nv. ${nivelVal}`;
    if (coinsEl) coinsEl.textContent = `⭐ ${parseInt(coinsVal, 10).toLocaleString()}`;

    // 1.1. Clan Oficial del Duelista
    const clanNameEl = document.getElementById('prof-clan-name');
    const clanTagBadge = document.getElementById('prof-clan-tag-badge');
    const clanName = user.ClanNombre || user.clanNombre || (user.clan && user.clan.name) || 'Sin Clan';
    const clanTag = user.ClanTag || user.clanTag || (user.clan && user.clan.tag) || '';

    if (clanNameEl) {
        if (clanName && clanName !== 'Sin Clan') {
            clanNameEl.textContent = clanTag ? `[${clanTag}] ${clanName}` : clanName;
            clanNameEl.style.color = '#00f0ff';
        } else {
            clanNameEl.textContent = 'Sin Clan';
            clanNameEl.style.color = '#94a3b8';
        }
    }

    if (clanTagBadge) {
        if (clanTag) {
            clanTagBadge.textContent = clanTag.startsWith('[') ? clanTag : `[${clanTag}]`;
            clanTagBadge.style.display = 'inline-block';
        } else {
            clanTagBadge.style.display = 'none';
        }
    }

    // 2. País y Bandera
    renderCountryDisplay(user);

    // 3. Fila de 4 Bloques: Totales, Avatar, Medallas y VIP
    renderBoostsPanels(user);

    // 4. Fila de 2 Bloques: Duelos vs NPC y Duelos vs PVP
    renderDuelsStats(user);

    // 5. Contador de Ítems en Buzón
    updateMailboxBadge();
}

function renderCountryDisplay(user) {
    const flagEl = document.getElementById('prof-flag');
    const countryEl = document.getElementById('prof-country');
    const headerFlag = document.getElementById('header-flag');
    const headerCountry = document.getElementById('header-country-name');

    const countryName = user.countryName || user.CountryName || 'Colombia';
    const flagEmoji = user.flagEmoji || user.FlagEmoji || '🇨🇴';
    const iso = (user.countryIsoCode || user.CountryIsoCode || 'CO').toLowerCase();

    const localSvg = `/assets/images/flags/${iso}.svg`;
    const localPng = `/assets/images/flags/${iso}.png`;
    const cdnPng = `https://flagcdn.com/w80/${iso}.png`;

    const flagHtml = `<img src="${localSvg}" alt="${iso.toUpperCase()}" onerror="if(this.src.indexOf('.png')===-1){this.src='${localPng}';}else if(this.src.indexOf('flagcdn')===-1){this.src='${cdnPng}';}else{this.outerHTML='<span style=\\'font-size:12px;\\'>${flagEmoji}</span>';}" style="width:16px; height:11px; object-fit:cover; display:inline-block; vertical-align:middle; margin-right:4px; border-radius:2px; box-shadow:0 0 2px rgba(0,0,0,0.6); border:1px solid rgba(255,255,255,0.2);">`;

    if (flagEl) flagEl.innerHTML = flagHtml;
    if (countryEl) countryEl.textContent = countryName;
    if (headerFlag) headerFlag.innerHTML = flagHtml;
    if (headerCountry) headerCountry.textContent = countryName;
}

function renderBoostsPanels(user) {
    let activeAvatar = null;
    if (window.AvatarsManager) {
        activeAvatar = window.AvatarsManager.getActiveAvatar();
    }

    if (!activeAvatar) {
        activeAvatar = {
            code: 'AVA-002',
            name: 'AVA-002',
            image: '../../assets/images/avatars/AVA-002.png',
            exp_boost: 0.0,
            starships_boost: 0.0,
            luck_boost: 0.0
        };
    }

    // 1. Avatar Boosts (dbo.UserAvatars - Ligados exclusivamente al avatar activo del usuario)
    const avatarExp = parseFloat(activeAvatar.exp_boost !== undefined ? activeAvatar.exp_boost : 0);
    const avatarStar = parseFloat(activeAvatar.starships_boost !== undefined ? activeAvatar.starships_boost : 0);
    const avatarLuck = parseFloat(activeAvatar.luck_boost !== undefined ? activeAvatar.luck_boost : 0);

    // Avatar total efectivo (Los potenciadores se acumulan directamente en el avatar activo)
    const effectiveAvatarExp = avatarExp;
    const effectiveAvatarStar = avatarStar;
    const effectiveAvatarLuck = avatarLuck;

    // 2. Medals Boosts (Valores reales acumulados de dbo.UserMedals)
    const medalsExp = parseFloat(user.medalsBonuses?.exp || 0.0);
    const medalsStar = parseFloat(user.medalsBonuses?.starships || 0.0);
    const medalsLuck = parseFloat(user.medalsBonuses?.luck || 0.0);

    // 3. VIP Boosts (Temporales)
    let vipExp = 0.0;
    let vipStar = 0.0;
    let vipLuck = 0.0;
    let isVipActive = false;
    let vipTimeText = 'SIN VIP';
    let vipNoteText = '⏳ Membresía temporal por días';

    if (window.VipManager) {
        const vipStatus = window.VipManager.getUserVipStatus();
        if (vipStatus.active) {
            isVipActive = true;
            vipTimeText = `⏳ ${vipStatus.remainingFormatted}`;
            const expireDateStr = vipStatus.expiresAt ? new Date(vipStatus.expiresAt).toLocaleDateString('es-ES') : 'Activo';
            vipNoteText = `👑 <b style="color:#ffd700;">${vipStatus.passName || vipStatus.passCode}</b><br><span style="font-size:7.5px; color:#cbd5e1;">Expira: ${expireDateStr} (${vipStatus.remainingFormatted} restantes)</span>`;
            vipExp = parseFloat(vipStatus.exp_boost || 0);
            vipStar = parseFloat(vipStatus.starships_boost || 0);
            vipLuck = parseFloat(vipStatus.luck_boost || 0);
        }
        const vipUntilRaw = user?.vipUntil || user?.VipUntil;
        if (vipUntilRaw) {
            const vipDate = new Date(vipUntilRaw);
            const now = new Date();
            if (vipDate > now) {
                isVipActive = true;
                const diffMs = vipDate - now;
                const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

                vipTimeText = diffDays > 1 ? `⏳ ${diffDays} DÍAS` : `⏳ ${diffHours} HORAS`;
                vipNoteText = `👑 <b style="color:#ffd700;">Pase VIP AD</b><br><span style="font-size:7.5px; color:#cbd5e1;">Expira: ${vipDate.toLocaleDateString('es-ES')} (${vipTimeText})</span>`;

                vipExp = 10.0;
                vipStar = 10.0;
                vipLuck = 5.0;
            }
        }
    }

    // 4. Totales Globales Consolidados (Suma Avatar + Potenciadores + Medallas + VIP)
    const totalExp = (effectiveAvatarExp + medalsExp + vipExp).toFixed(1);
    const totalStar = (effectiveAvatarStar + medalsStar + vipStar).toFixed(1);
    const totalLuck = (effectiveAvatarLuck + medalsLuck + vipLuck).toFixed(1);

    // -------------------------------------------------------------
    // RENDERIZADO EN DOM
    // -------------------------------------------------------------

    // Cabecera Avatar Libre
    const heroAvatarImg = document.getElementById('prof-hero-avatar');
    const avatarImgPath = activeAvatar.image || `../../assets/images/avatars/${activeAvatar.image_code || activeAvatar.code}.png`;
    if (heroAvatarImg) {
        heroAvatarImg.src = avatarImgPath;
        heroAvatarImg.onerror = function() { this.src = '../../assets/images/avatars/AVA-002.png'; };
    }

    // Bloque 1: Bonificaciones Totales (Globales)
    const totalExpEl = document.getElementById('prof-total-exp');
    const totalStarEl = document.getElementById('prof-total-starships');
    const totalLuckEl = document.getElementById('prof-total-luck');
    if (totalExpEl) totalExpEl.textContent = `+${totalExp}%`;
    if (totalStarEl) totalStarEl.textContent = `+${totalStar}%`;
    if (totalLuckEl) totalLuckEl.textContent = `+${totalLuck}%`;

    // Bloque 2: Avatar Activo
    const activeAvatarImg = document.getElementById('prof-active-avatar-img');
    const activeAvatarCode = document.getElementById('prof-active-avatar-code');
    const activeAvatarName = document.getElementById('prof-active-avatar-name');
    const expBoostEl = document.getElementById('prof-boost-exp');
    const starBoostEl = document.getElementById('prof-boost-starships');
    const luckBoostEl = document.getElementById('prof-boost-luck');

    if (activeAvatarImg) {
        activeAvatarImg.src = avatarImgPath;
        activeAvatarImg.onerror = function() { this.src = '../../assets/images/avatars/AVA-002.png'; };
    }
    if (activeAvatarCode) activeAvatarCode.textContent = `[${activeAvatar.code}]`;
    if (activeAvatarName) activeAvatarName.textContent = activeAvatar.name || activeAvatar.code;

    if (expBoostEl) expBoostEl.textContent = `+${effectiveAvatarExp.toFixed(1)}%`;
    if (starBoostEl) starBoostEl.textContent = `+${effectiveAvatarStar.toFixed(1)}%`;
    if (luckBoostEl) luckBoostEl.textContent = `+${effectiveAvatarLuck.toFixed(1)}%`;

    // Bloque 3: Medallas
    const medalsExpEl = document.getElementById('prof-medals-exp');
    const medalsStarEl = document.getElementById('prof-medals-starships');
    const medalsLuckEl = document.getElementById('prof-medals-luck');
    const medalsCountBadgeEl = document.getElementById('prof-medals-count-badge');
    if (medalsExpEl) medalsExpEl.textContent = `+${medalsExp.toFixed(1)}%`;
    if (medalsStarEl) medalsStarEl.textContent = `+${medalsStar.toFixed(1)}%`;
    if (medalsLuckEl) medalsLuckEl.textContent = `+${medalsLuck.toFixed(1)}%`;
    const totalPossibleMedals = (window.AdventureData && window.AdventureData.MEDALS && window.AdventureData.MEDALS.length) || 193;
    if (medalsCountBadgeEl) medalsCountBadgeEl.textContent = `${user.medalsCount || 0} / ${totalPossibleMedals}`;

    // Bloque 4: VIP
    const vipBadgeEl = document.getElementById('prof-vip-time-badge');
    const vipExpEl = document.getElementById('prof-vip-exp');
    const vipStarEl = document.getElementById('prof-vip-starships');
    const vipLuckEl = document.getElementById('prof-vip-luck');
    const vipNoteEl = document.getElementById('prof-vip-status-note');

    if (vipBadgeEl) {
        vipBadgeEl.textContent = vipTimeText;
        if (isVipActive) {
            vipBadgeEl.style.background = 'rgba(234, 179, 8, 0.3)';
            vipBadgeEl.style.borderColor = '#eab308';
            vipBadgeEl.style.color = '#fff';
        } else {
            vipBadgeEl.style.background = 'rgba(255, 255, 255, 0.08)';
            vipBadgeEl.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            vipBadgeEl.style.color = '#94a3b8';
        }
    }
    if (vipExpEl) vipExpEl.textContent = `+${vipExp.toFixed(1)}%`;
    if (vipStarEl) vipStarEl.textContent = `+${vipStar.toFixed(1)}%`;
    if (vipLuckEl) vipLuckEl.textContent = `+${vipLuck.toFixed(1)}%`;
    if (vipNoteEl) vipNoteEl.innerHTML = vipNoteText;
}

function renderDuelsStats(user) {
    const stats = user.duelStats || {};
    const npc = stats.npc || {};
    const pvp = stats.pvp || {};

    // 1. Estadísticas Duelos vs NPC
    const npcTotal = parseInt(npc.totalDuels || 0, 10);
    const npcWins = parseInt(npc.wins || 0, 10);
    const npcLosses = parseInt(npc.losses || 0, 10);
    const npcWinrate = npc.winrate !== undefined ? npc.winrate : (npcTotal > 0 ? Math.round((npcWins / npcTotal) * 100) : 0);

    const npcTotalEl = document.getElementById('prof-npc-total');
    const npcWinsEl = document.getElementById('prof-npc-wins');
    const npcLossesEl = document.getElementById('prof-npc-losses');
    const npcWinrateEl = document.getElementById('prof-npc-winrate');

    if (npcTotalEl) npcTotalEl.textContent = npcTotal.toLocaleString();
    if (npcWinsEl) npcWinsEl.textContent = npcWins.toLocaleString();
    if (npcLossesEl) npcLossesEl.textContent = npcLosses.toLocaleString();
    if (npcWinrateEl) npcWinrateEl.textContent = `${npcWinrate}%`;

    // 2. Estadísticas Duelos vs PVP (Jugadores)
    const pvpTotal = parseInt(pvp.totalDuels || 0, 10);
    const pvpWins = parseInt(pvp.wins || 0, 10);
    const pvpLosses = parseInt(pvp.losses || 0, 10);
    const pvpWinrate = pvp.winrate !== undefined ? pvp.winrate : (pvpTotal > 0 ? Math.round((pvpWins / pvpTotal) * 100) : 0);

    const pvpTotalEl = document.getElementById('prof-pvp-total');
    const pvpWinsEl = document.getElementById('prof-pvp-wins');
    const pvpLossesEl = document.getElementById('prof-pvp-losses');
    const pvpWinrateEl = document.getElementById('prof-pvp-winrate');

    if (pvpTotalEl) pvpTotalEl.textContent = pvpTotal.toLocaleString();
    if (pvpWinsEl) pvpWinsEl.textContent = pvpWins.toLocaleString();
    if (pvpLossesEl) pvpLossesEl.textContent = pvpLosses.toLocaleString();
    if (pvpWinrateEl) pvpWinrateEl.textContent = `${pvpWinrate}%`;
}

// ==========================================================================
// MODAL DEDICADO: COLECCIÓN DE AVATARES Y ACTIVACIÓN
// ==========================================================================
function openAvatarsCollectionModal() {
    const modal = document.getElementById('profile-avatars-collection-modal');
    if (!modal) return;

    renderModalAvatarsGrid();
    modal.style.display = 'flex';
}

function closeAvatarsCollectionModal() {
    const modal = document.getElementById('profile-avatars-collection-modal');
    if (modal) modal.style.display = 'none';
}

function renderModalAvatarsGrid() {
    const grid = document.getElementById('modal-avatars-grid');
    const countEl = document.getElementById('modal-owned-count');
    if (!grid) return;

    const ownedCodes = window.AvatarsManager ? window.AvatarsManager.getUserAvatars() : ['AVA-002'];
    const activeCode = window.AvatarsManager ? window.AvatarsManager.getActiveAvatarCode() : 'AVA-002';

    if (countEl) {
        countEl.textContent = `Posees: ${ownedCodes.length} ${ownedCodes.length === 1 ? 'avatar' : 'avatares'}`;
    }

    grid.innerHTML = ownedCodes.map(code => {
        const avatarObj = window.AvatarsManager ? window.AvatarsManager.getAvatarByCode(code) : null;
        const name = avatarObj?.name || code;
        const imgPath = avatarObj?.image || `../../assets/images/avatars/${avatarObj?.image_code || code}.png`;
        const exp = parseFloat(avatarObj?.exp_boost || 0).toFixed(1);
        const star = parseFloat(avatarObj?.starships_boost || 0).toFixed(1);
        const luck = parseFloat(avatarObj?.luck_boost || 0).toFixed(1);
        const isActive = (code === activeCode);
        const isCustomBadge = avatarObj?.is_custom || avatarObj?.is_gift ? `<span style="display:inline-block; font-size:7px; color:#ffd700; background:rgba(255,215,0,0.15); border:1px solid rgba(255,215,0,0.3); padding:1px 4px; margin-top:2px;">EXCLUSIVO</span>` : '';

        return `
            <div class="avatar-owned-card ${isActive ? 'active-avatar-item' : ''}">
                <img src="${imgPath}" alt="${name}" class="avatar-owned-img" onerror="this.src='../../assets/images/avatars/AVA-002.png'">
                <div class="avatar-owned-code" title="${name}">${name}</div>
                ${isCustomBadge}
                <div class="avatar-owned-boosts">
                    <span style="color:#00f0ff;">+${exp}% EXP</span> • 
                    <span style="color:#ffd700;">+${star}% ⭐</span><br>
                    <span style="color:#10b981;">+${luck}% Suerte</span>
                </div>
                ${isActive ? `
                    <button type="button" class="btn-activate-avatar btn-is-active" disabled>
                        ✓ EN USO
                    </button>
                ` : `
                    <button type="button" class="btn-activate-avatar btn-can-activate" onclick="activateUserAvatar('${code}')">
                        ACTIVAR
                    </button>
                `}
            </div>
        `;
    }).join('');
}

async function activateUserAvatar(code) {
    if (!window.AvatarsManager) return;

    try {
        const success = await window.AvatarsManager.setActiveAvatar(code);
        if (success) {
            const user = window.Session ? window.Session.getUser() : null;
            if (user) {
                user.avatarActivoId = code;
                user.AvatarActivoId = code;
                user.avatar = code;
                window.Session.saveUser(user);
            }

            if (typeof window.AvatarsManager.syncFromServer === 'function') {
                await window.AvatarsManager.syncFromServer(true);
            }

            renderBoostsPanels(user);
            renderModalAvatarsGrid();
            updateMailboxTargetBadge();
            openProfileNoticeModal('AVATAR ACTIVADO', `Has activado exitosamente el avatar [${code}].`, true);
        } else {
            openProfileNoticeModal('ERROR AL ACTIVAR', 'No se pudo activar el avatar seleccionado en la base de datos.', false);
        }
    } catch (err) {
        console.error('[ACTIVATE AVATAR ERROR]', err);
        openProfileNoticeModal('ERROR', 'Error al conectar con la base de datos: ' + err.message, false);
    }
}

window.activateUserAvatar = activateUserAvatar;
window.renderModalAvatarsGrid = renderModalAvatarsGrid;

// ==========================================================================
// GESTIÓN DEL BUZÓN / BAÚL DE RECOMPENSAS Y CONSUMO DE POTENCIADORES
// ==========================================================================

let pendingConsumeItemId = null;
let cachedServerGifts = [];

async function fetchServerMailbox() {
    const user = window.Session ? window.Session.getUser() : null;
    if (!user) return [];

    const uid = user.id || user.user_id || user.Id;
    const username = user.username || '';
    if (!uid && !username) return [];

    const query = uid ? `userId=${uid}` : `username=${encodeURIComponent(username)}`;
    try {
        const res = await fetch(`/api/admin/mailbox?${query}`);
        if (!res.ok) return [];
        const data = await res.json();
        if (data && data.success && Array.isArray(data.gifts)) {
            cachedServerGifts = data.gifts;
            return data.gifts;
        }
    } catch (e) {
        console.warn('[MAILBOX FETCH NOTICE]', e);
    }
    return cachedServerGifts || [];
}

async function updateMailboxBadge() {
    const badge = document.getElementById('prof-mailbox-badge');
    if (!badge) return;

    const serverGifts = await fetchServerMailbox();
    const totalCount = serverGifts.length;

    badge.textContent = totalCount;
    badge.style.display = totalCount > 0 ? 'inline-block' : 'none';
}

function updateMailboxTargetBadge() {
    const targetBadge = document.getElementById('mailbox-target-avatar-badge');
    if (!targetBadge) return;

    let activeAvatar = null;
    if (window.AvatarsManager) {
        activeAvatar = window.AvatarsManager.getActiveAvatar();
    }
    const name = activeAvatar ? (activeAvatar.name || activeAvatar.code) : 'AVA-002';
    targetBadge.textContent = `🎯 Activo: ${name}`;
}

async function openMailboxModal() {
    const modal = document.getElementById('profile-mailbox-modal');
    if (!modal) return;

    updateMailboxTargetBadge();
    modal.style.display = 'flex';
    await renderMailboxGrid();
}

function closeMailboxModal() {
    const modal = document.getElementById('profile-mailbox-modal');
    if (modal) modal.style.display = 'none';
}

async function renderMailboxGrid() {
    const container = document.getElementById('mailbox-items-container');
    if (!container) return;

    container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:30px; color:#00f0ff; font-size:10.5px; font-family:'Orbitron',sans-serif;">⏳ Consultando buzón satelital...</div>`;

    const serverGifts = await fetchServerMailbox();

    const clearAllBtn = document.getElementById('btn-clear-all-mailbox');
    if (clearAllBtn) {
        clearAllBtn.style.display = serverGifts.length > 0 ? 'inline-block' : 'none';
    }

    if (serverGifts.length === 0) {
        container.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:40px 20px; background:rgba(0,0,0,0.3); border:1px dashed rgba(245,158,11,0.3);">
                <div style="font-size:36px; margin-bottom:10px;">📭</div>
                <div style="font-family:'Orbitron', sans-serif; font-size:11px; font-weight:800; color:#ffd700; margin-bottom:5px;">TU BUZÓN ESTÁ VACÍO</div>
                <div style="font-size:9.5px; color:#94a3b8; max-width:320px; margin:0 auto 15px auto; line-height:1.4;">
                    Adquiere potenciadores en la Tienda o espera recompensas y compensaciones de la administración para recibirlos aquí.
                </div>
                <a href="../shop/shop-potenciadores.html" style="display:inline-block; padding:6px 14px; background:rgba(0,240,255,0.15); border:1px solid #00f0ff; color:#00f0ff; font-family:'Orbitron', sans-serif; font-size:8.5px; font-weight:800; text-decoration:none;">
                    IR A LA TIENDA DE POTENCIADORES →
                </a>
            </div>
        `;
        return;
    }

    let cardsHtml = '';

    // 1. REGALOS DEL SERVIDOR (ADMINISTRATION GIFTS / COMPENSATION)
    serverGifts.forEach(gift => {
        const type = (gift.giftType || 'STARSHIPS').toUpperCase();
        const payload = gift.payload || {};
        const createdStr = gift.createdAt ? new Date(gift.createdAt).toLocaleDateString('es-ES') : 'Hoy';
        const sender = gift.sender || 'Administración';
        const isGlobalBadge = gift.isGlobal ? `<span style="font-size:7.5px; color:#ffd700; background:rgba(255,215,0,0.15); border:1px solid rgba(255,215,0,0.4); padding:1px 4px;">GLOBAL</span>` : `<span style="font-size:7.5px; color:#00f0ff; background:rgba(0,240,255,0.15); border:1px solid rgba(0,240,255,0.4); padding:1px 4px;">EXCLUSIVO</span>`;
        const cleanTitle = (gift.title || 'Recompensa').replace(/'/g, "\\'");

        if (type === 'STARSHIPS') {
            const amount = parseInt(payload.amount || 0, 10);
            cardsHtml += `
                <div class="mailbox-item-card" style="border-left-color:#ffd700; background:linear-gradient(135deg, rgba(20,20,30,0.9), rgba(255,215,0,0.06));">
                    <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0;">
                        <div class="mailbox-item-icon-box" style="border-color:#ffd700; box-shadow:0 0 10px rgba(255,215,0,0.4);">
                            <span style="font-size:18px;">⭐</span>
                        </div>
                        <div class="mailbox-item-info">
                            <div style="display:flex; align-items:center; gap:6px; margin-bottom:2px;">
                                <div class="mailbox-item-name" style="color:#ffd700;">${gift.title || 'Recompensa de StarShips'}</div>
                                ${isGlobalBadge}
                            </div>
                            <div style="font-size:9px; color:#cbd5e1; margin-bottom:3px; line-height:1.3;">${gift.description || 'Envío de monedas por administración.'}</div>
                            <div class="mailbox-item-meta">
                                <span class="mailbox-type-tag mailbox-type-starships">+${amount.toLocaleString()} ⭐ StarShips</span>
                                <span style="color:#64748b; font-size:8px;">De: ${sender} • ${createdStr}</span>
                            </div>
                        </div>
                    </div>
                    <div style="flex-shrink:0; display:flex; align-items:center; gap:5px;">
                        <button type="button" class="btn-discard-boost" onclick="promptDiscardItem(${gift.id}, true, '${cleanTitle}')" title="Descartar este premio">
                            🗑️ DESCARTAR
                        </button>
                        <button type="button" class="btn-consume-boost" onclick="claimServerGift(${gift.id})">
                            RECLAMAR
                        </button>
                    </div>
                </div>
            `;
        } else if (type === 'CARD') {
            const cardName = payload.cardName || `Carta #${payload.cardId}`;
            const copies = payload.copies || 1;
            const imgPath = payload.cardImage || `https://images.ygoprodeck.com/images/cards_small/${payload.cardId}.jpg`;

            cardsHtml += `
                <div class="mailbox-item-card" style="border-left-color:#00f0ff; background:linear-gradient(135deg, rgba(20,20,30,0.9), rgba(0,240,255,0.06));">
                    <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0;">
                        <div class="mailbox-item-icon-box" style="border-color:#00f0ff; width:38px; height:48px; border-radius:0; overflow:hidden; padding:0;">
                            <img src="${imgPath}" alt="${cardName}" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none'; this.parentElement.innerHTML='🎴';">
                        </div>
                        <div class="mailbox-item-info">
                            <div style="display:flex; align-items:center; gap:6px; margin-bottom:2px;">
                                <div class="mailbox-item-name" style="color:#00f0ff;">${gift.title || cardName}</div>
                                ${isGlobalBadge}
                            </div>
                            <div style="font-size:9px; color:#cbd5e1; margin-bottom:3px; line-height:1.3;">${gift.description || 'Carta enviada como recompensa.'}</div>
                            <div class="mailbox-item-meta">
                                <span class="mailbox-type-tag mailbox-type-exp" style="border-color:#00f0ff; color:#00f0ff;">🎴 ${cardName} x${copies}</span>
                                <span style="color:#64748b; font-size:8px;">De: ${sender} • ${createdStr}</span>
                            </div>
                        </div>
                    </div>
                    <div style="flex-shrink:0; display:flex; align-items:center; gap:5px;">
                        <button type="button" class="btn-discard-boost" onclick="promptDiscardItem(${gift.id}, true, '${cleanTitle}')" title="Descartar este premio">
                            🗑️ DESCARTAR
                        </button>
                        <button type="button" class="btn-consume-boost" onclick="claimServerGift(${gift.id})">
                            RECLAMAR
                        </button>
                    </div>
                </div>
            `;
        } else if (type === 'POTENCIADOR') {
            const potName = payload.name || payload.code || 'Potenciador';
            const potType = (payload.type || 'EXP').toUpperCase();
            const boostVal = parseFloat(payload.boost_value !== undefined ? payload.boost_value : (payload.value || 0)).toFixed(1);
            let typeColor = potType === 'STARSHIPS' ? '#ffd700' : (potType === 'SUERTE' ? '#10b981' : '#00f0ff');
            let typeIcon = potType === 'STARSHIPS' ? '⭐' : (potType === 'SUERTE' ? '🍀' : '⚡');

            cardsHtml += `
                <div class="mailbox-item-card" style="border-left-color:${typeColor}; background:linear-gradient(135deg, rgba(20,20,30,0.92), ${typeColor}15);">
                    <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0;">
                        <div class="mailbox-item-icon-box" style="border-color:${typeColor}; box-shadow:0 0 10px ${typeColor}40;">
                            <span style="font-size:18px;">${typeIcon}</span>
                        </div>
                        <div class="mailbox-item-info">
                            <div style="display:flex; align-items:center; gap:6px; margin-bottom:2px;">
                                <div class="mailbox-item-name" style="color:${typeColor};">${gift.title || potName}</div>
                                ${isGlobalBadge}
                            </div>
                            <div style="font-size:9px; color:#cbd5e1; margin-bottom:3px; line-height:1.3;">${gift.description || 'Potenciador cósmico oficial.'}</div>
                            <div class="mailbox-item-meta">
                                <span class="mailbox-type-tag" style="border-color:${typeColor}; color:${typeColor};">+${boostVal}% ${potType} (${payload.code || 'POT'})</span>
                                <span style="color:#64748b; font-size:8px;">De: ${sender} • ${createdStr}</span>
                            </div>
                        </div>
                    </div>
                    <div style="flex-shrink:0; display:flex; align-items:center; gap:5px;">
                        <button type="button" class="btn-discard-boost" onclick="promptDiscardItem(${gift.id}, true, '${cleanTitle}')" title="Descartar este premio">
                            🗑️ DESCARTAR
                        </button>
                        <button type="button" class="btn-consume-boost" onclick="promptConsumeBooster(${gift.id})" style="border-color:${typeColor}; color:${typeColor}; font-weight:800;">
                            ACTIVAR
                        </button>
                    </div>
                </div>
            `;
        } else if (type === 'AVATAR') {
            const avName = payload.name || 'Avatar Exclusivo';
            const imgCode = payload.image_code || payload.code || 'AVA-003';
            const avImg = payload.image || `../../assets/images/avatars/${imgCode}.png`;
            const exp = parseFloat(payload.exp_boost || 0).toFixed(1);
            const star = parseFloat(payload.starships_boost || 0).toFixed(1);
            const luck = parseFloat(payload.luck_boost || 0).toFixed(1);

            cardsHtml += `
                <div class="mailbox-item-card" style="border-left-color:#c084fc; background:linear-gradient(135deg, rgba(20,20,30,0.9), rgba(192,132,252,0.08));">
                    <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0;">
                        <div class="mailbox-item-icon-box" style="border-color:#c084fc; width:40px; height:40px; border-radius:0; overflow:hidden; padding:0;">
                            <img src="${avImg}" alt="${avName}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='../../assets/images/avatars/AVA-002.png'">
                        </div>
                        <div class="mailbox-item-info">
                            <div style="display:flex; align-items:center; gap:6px; margin-bottom:2px;">
                                <div class="mailbox-item-name" style="color:#c084fc;">${gift.title || `Avatar: ${avName}`}</div>
                                ${isGlobalBadge}
                            </div>
                            <div style="font-size:9px; color:#cbd5e1; margin-bottom:3px; line-height:1.3;">${gift.description || 'Desbloqueo de avatar para tu colección.'}</div>
                            <div class="mailbox-item-meta">
                                <span class="mailbox-type-tag" style="border-color:#c084fc; color:#c084fc;">👤 ${avName} (+${exp}% EXP, +${star}% ⭐, +${luck}% 🍀)</span>
                                <span style="color:#64748b; font-size:8px;">De: ${sender} • ${createdStr}</span>
                            </div>
                        </div>
                    </div>
                    <div style="flex-shrink:0; display:flex; align-items:center; gap:5px;">
                        <button type="button" class="btn-discard-boost" onclick="promptDiscardItem(${gift.id}, true, '${cleanTitle}')" title="Descartar este premio">
                            🗑️ DESCARTAR
                        </button>
                        <button type="button" class="btn-consume-boost" onclick="claimServerGift(${gift.id})">
                            DESBLOQUEAR
                        </button>
                    </div>
                </div>
            `;
        } else if (type === 'VIP') {
            const vDays = parseInt(payload.days || payload.durationDays || 30, 10);
            const vName = payload.name || `Pase VIP (${vDays} Días)`;
            const exp = parseFloat(payload.exp_boost !== undefined ? payload.exp_boost : 100).toFixed(1);
            const star = parseFloat(payload.starships_boost !== undefined ? payload.starships_boost : 100).toFixed(1);
            const luck = parseFloat(payload.luck_boost !== undefined ? payload.luck_boost : 15).toFixed(1);

            cardsHtml += `
                <div class="mailbox-item-card" style="border-left-color:#ffd700; background:linear-gradient(135deg, rgba(20,20,30,0.9), rgba(255,215,0,0.08));">
                    <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0;">
                        <div class="mailbox-item-icon-box" style="border-color:#ffd700; box-shadow:0 0 10px rgba(255,215,0,0.4);">
                            <span style="font-size:18px;">💎</span>
                        </div>
                        <div class="mailbox-item-info">
                            <div style="display:flex; align-items:center; gap:6px; margin-bottom:2px;">
                                <div class="mailbox-item-name" style="color:#ffd700;">${gift.title || `Membresía VIP: ${vName}`}</div>
                                ${isGlobalBadge}
                            </div>
                            <div style="font-size:9px; color:#cbd5e1; margin-bottom:3px; line-height:1.3;">${gift.description || `Pase VIP con duración de ${vDays} días y bonificadores multiplicadores de duelo.`}</div>
                            <div class="mailbox-item-meta">
                                <span class="mailbox-type-tag" style="border-color:#ffd700; color:#ffd700;">💎 VIP ${vDays} DÍAS (+${exp}% EXP, +${star}% ⭐, +${luck}% 🍀)</span>
                                <span style="color:#64748b; font-size:8px;">De: ${sender} • ${createdStr}</span>
                            </div>
                        </div>
                    </div>
                    <div style="flex-shrink:0; display:flex; align-items:center; gap:5px;">
                        <button type="button" class="btn-discard-boost" onclick="promptDiscardItem(${gift.id}, true, '${cleanTitle}')" title="Descartar este premio">
                            🗑️ DESCARTAR
                        </button>
                        <button type="button" class="btn-consume-boost" onclick="claimServerGift(${gift.id})" style="background:linear-gradient(135deg, #ffd700, #f59e0b); color:#000; font-weight:900;">
                            ACTIVAR VIP
                        </button>
                    </div>
                </div>
            `;
        } else if (type === 'SLEEVE') {
            const sName = payload.name || payload.sleeve_code || payload.code || 'Funda Especial';
            const sCode = payload.sleeve_code || payload.code || 'SLV-001';
            const sImg = payload.image || `../../assets/images/sleeves/${sCode}.png`;

            cardsHtml += `
                <div class="mailbox-item-card" style="border-left-color:#eab308; background:linear-gradient(135deg, rgba(20,20,30,0.9), rgba(234,179,8,0.08));">
                    <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0;">
                        <div class="mailbox-item-icon-box" style="border-color:#eab308; width:38px; height:48px; border-radius:0; overflow:hidden; padding:0;">
                            <img src="${sImg}" alt="${sName}" style="width:100%; height:100%; object-fit:cover;" onerror="this.parentElement.innerHTML='🎴';">
                        </div>
                        <div class="mailbox-item-info">
                            <div style="display:flex; align-items:center; gap:6px; margin-bottom:2px;">
                                <div class="mailbox-item-name" style="color:#eab308;">${gift.title || `Funda: ${sName}`}</div>
                                ${isGlobalBadge}
                            </div>
                            <div style="font-size:9px; color:#cbd5e1; margin-bottom:3px; line-height:1.3;">${gift.description || 'Funda protectora para tus cartas.'}</div>
                            <div class="mailbox-item-meta">
                                <span class="mailbox-type-tag" style="border-color:#eab308; color:#eab308;">🎴 FUNDA (${sCode})</span>
                                <span style="color:#64748b; font-size:8px;">De: ${sender} • ${createdStr}</span>
                            </div>
                        </div>
                    </div>
                    <div style="flex-shrink:0; display:flex; align-items:center; gap:5px;">
                        <button type="button" class="btn-discard-boost" onclick="promptDiscardItem(${gift.id}, true, '${cleanTitle}')" title="Descartar este premio">
                            🗑️ DESCARTAR
                        </button>
                        <button type="button" class="btn-consume-boost" onclick="claimServerGift(${gift.id})">
                            DESBLOQUEAR
                        </button>
                    </div>
                </div>
            `;
        } else if (type === 'PLAYMAT') {
            const mName = payload.name || payload.playmat_code || payload.code || 'Tapete de Duelo';
            const mCode = payload.playmat_code || payload.code || 'MAT-001';

            cardsHtml += `
                <div class="mailbox-item-card" style="border-left-color:#06b6d4; background:linear-gradient(135deg, rgba(20,20,30,0.9), rgba(6,182,212,0.08));">
                    <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0;">
                        <div class="mailbox-item-icon-box" style="border-color:#06b6d4; box-shadow:0 0 10px rgba(6,182,212,0.4);">
                            <span style="font-size:18px;">🛡️</span>
                        </div>
                        <div class="mailbox-item-info">
                            <div style="display:flex; align-items:center; gap:6px; margin-bottom:2px;">
                                <div class="mailbox-item-name" style="color:#06b6d4;">${gift.title || `Tapete: ${mName}`}</div>
                                ${isGlobalBadge}
                            </div>
                            <div style="font-size:9px; color:#cbd5e1; margin-bottom:3px; line-height:1.3;">${gift.description || 'Tapete de combate para el campo reglamentario.'}</div>
                            <div class="mailbox-item-meta">
                                <span class="mailbox-type-tag" style="border-color:#06b6d4; color:#06b6d4;">🛡️ TAPETE (${mCode})</span>
                                <span style="color:#64748b; font-size:8px;">De: ${sender} • ${createdStr}</span>
                            </div>
                        </div>
                    </div>
                    <div style="flex-shrink:0; display:flex; align-items:center; gap:5px;">
                        <button type="button" class="btn-discard-boost" onclick="promptDiscardItem(${gift.id}, true, '${cleanTitle}')" title="Descartar este premio">
                            🗑️ DESCARTAR
                        </button>
                        <button type="button" class="btn-consume-boost" onclick="claimServerGift(${gift.id})">
                            DESBLOQUEAR
                        </button>
                    </div>
                </div>
            `;
        } else if (type === 'MEDAL') {
            const medName = payload.name || payload.medal_code || payload.code || 'Medalla de Honor';
            const medCode = payload.medal_code || payload.code || 'MED-001';

            cardsHtml += `
                <div class="mailbox-item-card" style="border-left-color:#38bdf8; background:linear-gradient(135deg, rgba(20,20,30,0.9), rgba(56,189,248,0.08));">
                    <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0;">
                        <div class="mailbox-item-icon-box" style="border-color:#38bdf8; box-shadow:0 0 10px rgba(56,189,248,0.4);">
                            <span style="font-size:18px;">🎖️</span>
                        </div>
                        <div class="mailbox-item-info">
                            <div style="display:flex; align-items:center; gap:6px; margin-bottom:2px;">
                                <div class="mailbox-item-name" style="color:#38bdf8;">${gift.title || `Medalla: ${medName}`}</div>
                                ${isGlobalBadge}
                            </div>
                            <div style="font-size:9px; color:#cbd5e1; margin-bottom:3px; line-height:1.3;">${gift.description || 'Medalla honorífica de aventura y logros.'}</div>
                            <div class="mailbox-item-meta">
                                <span class="mailbox-type-tag" style="border-color:#38bdf8; color:#38bdf8;">🎖️ MEDALLA (${medCode})</span>
                                <span style="color:#64748b; font-size:8px;">De: ${sender} • ${createdStr}</span>
                            </div>
                        </div>
                    </div>
                    <div style="flex-shrink:0; display:flex; align-items:center; gap:5px;">
                        <button type="button" class="btn-discard-boost" onclick="promptDiscardItem(${gift.id}, true, '${cleanTitle}')" title="Descartar este premio">
                            🗑️ DESCARTAR
                        </button>
                        <button type="button" class="btn-consume-boost" onclick="claimServerGift(${gift.id})">
                            RECLAMAR
                        </button>
                    </div>
                </div>
            `;
        } else {
            // Regalo genérico / fallback para cualquier tipo personalizado
            cardsHtml += `
                <div class="mailbox-item-card" style="border-left-color:#00f0ff; background:linear-gradient(135deg, rgba(20,20,30,0.9), rgba(0,240,255,0.08));">
                    <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0;">
                        <div class="mailbox-item-icon-box" style="border-color:#00f0ff; box-shadow:0 0 10px rgba(0,240,255,0.4);">
                            <span style="font-size:18px;">🎁</span>
                        </div>
                        <div class="mailbox-item-info">
                            <div style="display:flex; align-items:center; gap:6px; margin-bottom:2px;">
                                <div class="mailbox-item-name" style="color:#00f0ff;">${gift.title || 'Recompensa Especial'}</div>
                                ${isGlobalBadge}
                            </div>
                            <div style="font-size:9px; color:#cbd5e1; margin-bottom:3px; line-height:1.3;">${gift.description || 'Recompensa especial enviada a tu buzón.'}</div>
                            <div class="mailbox-item-meta">
                                <span class="mailbox-type-tag" style="border-color:#00f0ff; color:#00f0ff;">🎁 ${type}</span>
                                <span style="color:#64748b; font-size:8px;">De: ${sender} • ${createdStr}</span>
                            </div>
                        </div>
                    </div>
                    <div style="flex-shrink:0; display:flex; align-items:center; gap:5px;">
                        <button type="button" class="btn-discard-boost" onclick="promptDiscardItem(${gift.id}, true, '${cleanTitle}')" title="Descartar este premio">
                            🗑️ DESCARTAR
                        </button>
                        <button type="button" class="btn-consume-boost" onclick="claimServerGift(${gift.id})">
                            RECLAMAR
                        </button>
                    </div>
                </div>
            `;
        }
    });

    container.innerHTML = cardsHtml;
}

let pendingDiscardData = null;

function promptDiscardItem(itemId, isServerGift, itemName) {
    pendingDiscardData = { itemId, isServerGift, itemName, isClearAll: false };
    const modal = document.getElementById('profile-discard-confirm-modal');
    const detailsEl = document.getElementById('discard-item-details');
    if (detailsEl) {
        detailsEl.innerHTML = `
            <div style="font-family:'Orbitron', sans-serif; font-size:11px; font-weight:800; color:#ef4444; margin-bottom:4px;">
                ${itemName}
            </div>
            <div style="font-size:9.5px; color:#cbd5e1;">
                ${isServerGift ? '🎁 Regalo / Recompensa de Administración' : '⚡ Potenciador en Baúl'}
            </div>
        `;
    }
    const confirmBtn = document.getElementById('btn-confirm-discard-boost');
    if (confirmBtn) {
        confirmBtn.onclick = executeDiscardItem;
    }
    if (modal) modal.style.display = 'flex';
}

function closeDiscardConfirmModal() {
    pendingDiscardData = null;
    const modal = document.getElementById('profile-discard-confirm-modal');
    if (modal) modal.style.display = 'none';
}

async function executeDiscardItem() {
    if (!pendingDiscardData) return;
    const { itemId, isServerGift, itemName, isClearAll } = pendingDiscardData;
    closeDiscardConfirmModal();

    if (isClearAll) {
        await executeClearAllMailbox();
        return;
    }

    if (isServerGift) {
        const user = window.Session ? window.Session.getUser() : null;
        const uid = user ? (user.id || user.user_id || user.Id) : null;
        const username = user ? user.username : '';

        try {
            const response = await fetch('/api/admin/mailbox/discard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ giftId: itemId, userId: uid, username })
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                openProfileNoticeModal('ERROR AL DESCARTAR', data.message || 'No fue posible descartar el premio.', false);
                return;
            }
        } catch (err) {
            console.error('[DISCARD GIFT ERROR]', err);
            openProfileNoticeModal('ERROR DE CONEXIÓN', 'No se pudo conectar con el servidor: ' + err.message, false);
            return;
        }
    } else {
        if (window.PotenciadoresManager) {
            window.PotenciadoresManager.discardMailboxItem(itemId);
        }
    }

    await renderMailboxGrid();
    await updateMailboxBadge();

    openProfileNoticeModal('PREMIO DESCARTADO', `El premio "${itemName}" ha sido descartado y ya no ocupará espacio en tu buzón.`, true);
}

function promptClearAllMailbox() {
    pendingDiscardData = { isClearAll: true };
    const modal = document.getElementById('profile-discard-confirm-modal');
    const detailsEl = document.getElementById('discard-item-details');
    if (detailsEl) {
        detailsEl.innerHTML = `
            <div style="font-family:'Orbitron', sans-serif; font-size:11.5px; font-weight:900; color:#ef4444; margin-bottom:4px;">
                VACIAR TODO EL BUZÓN
            </div>
            <div style="font-size:9.5px; color:#cbd5e1;">
                Se eliminarán permanentemente todos los premios, potenciadores y regalos pendientes de tu buzón.
            </div>
        `;
    }
    const confirmBtn = document.getElementById('btn-confirm-discard-boost');
    if (confirmBtn) {
        confirmBtn.onclick = executeDiscardItem;
    }
    if (modal) modal.style.display = 'flex';
}

async function executeClearAllMailbox() {
    // 1. Limpiar local
    if (window.PotenciadoresManager) {
        window.PotenciadoresManager.clearUserMailbox();
    }

    // 2. Descartar todos los regalos del servidor para este usuario
    const user = window.Session ? window.Session.getUser() : null;
    const uid = user ? (user.id || user.user_id || user.Id) : null;
    const username = user ? user.username : '';

    if (cachedServerGifts && cachedServerGifts.length > 0) {
        for (const gift of cachedServerGifts) {
            try {
                await fetch('/api/admin/mailbox/discard', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ giftId: gift.id, userId: uid, username })
                });
            } catch (e) {}
        }
    }

    await renderMailboxGrid();
    await updateMailboxBadge();

    openProfileNoticeModal('BUZÓN VACIADO', 'Todos los premios del buzón han sido descartados correctamente.', true);
}

async function claimServerGift(giftId) {
    const user = window.Session ? window.Session.getUser() : null;
    if (!user) {
        openProfileNoticeModal('SESIÓN REQUERIDA', 'Debes iniciar sesión para reclamar regalos.', false);
        return;
    }

    const uid = user.id || user.user_id || user.Id;
    const username = user.username || '';

    try {
        const response = await fetch('/api/admin/mailbox/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ giftId, userId: uid, username })
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            openProfileNoticeModal('ERROR AL RECLAMAR', data.message || 'No fue posible reclamar el regalo.', false);
            return;
        }

        const giftType = data.giftType;
        const payload = data.payload || {};

        // 1. Sincronizar en cliente según el tipo de regalo
        if (giftType === 'STARSHIPS') {
            const addAmount = parseInt(payload.amount || 0, 10);
            if (window.Session) {
                if (data.newStarships !== null && data.newStarships !== undefined) {
                    window.Session.setStarships(data.newStarships);
                } else if (typeof window.Session.addStarships === 'function') {
                    window.Session.addStarships(addAmount);
                }
            }
            const coinsEl = document.getElementById('prof-coins');
            if (coinsEl && window.Session) {
                coinsEl.textContent = `⭐ ${parseInt(window.Session.getStarships(), 10).toLocaleString()}`;
            }
        } else if (giftType === 'CARD') {
            const copies = parseInt(payload.copies || 1, 10);
            if (window.PacksManager && typeof window.PacksManager.addCardToInventory === 'function') {
                for (let i = 0; i < copies; i++) {
                    window.PacksManager.addCardToInventory({
                        card_id: payload.cardId,
                        name: payload.cardName,
                        rarity: payload.rarity || 'COMMON',
                        type: payload.cardType || 'Monster',
                        atk: payload.atk,
                        def: payload.def
                    });
                }
            }
            if (window.PacksManager && typeof window.PacksManager.getUserInventoryAsync === 'function') {
                try { await window.PacksManager.getUserInventoryAsync(); } catch (e) {}
            }
            if (window.DeckManager && typeof window.DeckManager.syncFromServer === 'function') {
                try { await window.DeckManager.syncFromServer(); } catch (e) {}
            }
        } else if (giftType === 'POTENCIADOR') {
            if (data.stats) {
                if (data.stats.bonusExp !== undefined) user.bonusExp = data.stats.bonusExp;
                if (data.stats.bonusStarships !== undefined) user.bonusStarships = data.stats.bonusStarships;
                if (data.stats.bonusSuerte !== undefined) user.bonusSuerte = data.stats.bonusSuerte;
                if (window.Session) window.Session.saveUser(user);
            }
            if (window.AvatarsManager && typeof window.AvatarsManager.syncFromServer === 'function') {
                await window.AvatarsManager.syncFromServer(true);
            }
            if (window.PotenciadoresManager && typeof window.PotenciadoresManager.init === 'function') {
                await window.PotenciadoresManager.init();
            }
        } else if (giftType === 'AVATAR') {
            const avCode = (payload.code || payload.avatar_code || payload.image_code || payload.avatarId || payload.id || 'AVA-002').toString().toUpperCase().trim();
            if (window.AvatarsManager) {
                if (typeof window.AvatarsManager.addCustomUserAvatar === 'function') {
                    window.AvatarsManager.addCustomUserAvatar({
                        code: avCode,
                        avatar_code: avCode,
                        name: payload.name || avCode,
                        image: payload.image || `../../assets/images/avatars/${avCode}.png`,
                        image_code: avCode,
                        exp_boost: parseFloat(payload.exp_boost !== undefined ? payload.exp_boost : (payload.exp || 0)),
                        starships_boost: parseFloat(payload.starships_boost !== undefined ? payload.starships_boost : (payload.star || 0)),
                        luck_boost: parseFloat(payload.luck_boost !== undefined ? payload.luck_boost : (payload.luck || 0)),
                        is_custom: true,
                        is_gift: true
                    });
                }
                if (typeof window.AvatarsManager.addUserAvatar === 'function') {
                    window.AvatarsManager.addUserAvatar(avCode);
                }
                if (typeof window.AvatarsManager.syncFromServer === 'function') {
                    await window.AvatarsManager.syncFromServer();
                }
            }
        } else if (giftType === 'VIP') {
            const vCode = (payload.vip_code || payload.code || 'VIP-004').toString().toUpperCase().trim();
            const vDays = parseInt(payload.days || payload.durationDays || 30, 10);
            if (window.VipManager && typeof window.VipManager.activateUserVip === 'function') {
                window.VipManager.activateUserVip(vCode, {
                    days: vDays,
                    name: payload.name || `Pase VIP (${vDays} Días)`,
                    exp_boost: parseFloat(payload.exp_boost !== undefined ? payload.exp_boost : 100),
                    starships_boost: parseFloat(payload.starships_boost !== undefined ? payload.starships_boost : 100),
                    luck_boost: parseFloat(payload.luck_boost !== undefined ? payload.luck_boost : 15)
                });
            }
            if (user) {
                const now = new Date();
                const currentVip = user.vipUntil ? new Date(user.vipUntil) : now;
                const baseTime = currentVip > now ? currentVip : now;
                baseTime.setDate(baseTime.getDate() + vDays);
                user.vipUntil = baseTime.toISOString();
                if (window.Session) {
                    window.Session.saveUser(user);
                }
            }
        } else if (giftType === 'SLEEVE') {
            const sleeveCode = (payload.sleeve_code || payload.code || 'SLV-001').toString().toUpperCase().trim();
            if (window.SleevesManager && typeof window.SleevesManager.addUserSleeve === 'function') {
                window.SleevesManager.addUserSleeve(sleeveCode);
            }
        } else if (giftType === 'PLAYMAT') {
            const matCode = (payload.playmat_code || payload.code || 'MAT-001').toString().toUpperCase().trim();
            if (window.PlaymatsManager && typeof window.PlaymatsManager.addUserPlaymat === 'function') {
                window.PlaymatsManager.addUserPlaymat(matCode);
            }
        } else if (giftType === 'MEDAL') {
            if (uid) {
                try {
                    const advRes = await fetch(`/api/adventure/state?userId=${uid}`);
                    const advData = await advRes.json();
                    if (advData && advData.success) {
                        user.medalsBonuses = advData.bonuses || { exp: 0, starships: 0, luck: 0 };
                        user.medalsCount = advData.unlockedMedalsCount || 0;
                        user.unlockedMedalIds = advData.unlockedMedalIds || [];
                        window.currentUserMedalIds = advData.unlockedMedalIds || [];
                    }
                } catch (e) {}
            }
        }

        // Recargar información completa de perfil
        if (typeof loadUserProfileData === 'function') {
            await loadUserProfileData();
        } else if (typeof loadProfileData === 'function') {
            await loadProfileData();
        }

        // Actualizar UI
        await renderMailboxGrid();
        await updateMailboxBadge();

        let noticeTitle = '¡REGALO RECLAMADO!';
        let noticeIcon = '🎁';

        const upperType = (giftType || '').toUpperCase().trim();
        if (upperType === 'STARSHIPS' || upperType === 'ESTRELLAS') {
            noticeTitle = '¡STARSHIPS RECIBIDAS!';
            noticeIcon = '⭐';
        } else if (upperType === 'CARD') {
            noticeTitle = '¡CARTA EN TU BAÚL!';
            noticeIcon = '🃏';
        } else if (upperType === 'POTENCIADOR') {
            noticeTitle = '¡POTENCIADOR APLICADO!';
            noticeIcon = '⚡';
        } else if (upperType === 'AVATAR') {
            noticeTitle = '¡AVATAR DESBLOQUEADO!';
            noticeIcon = '👤';
        } else if (upperType === 'VIP') {
            noticeTitle = '¡MEMBRESÍA VIP ACTIVADA!';
            noticeIcon = '💎';
        } else if (upperType === 'PLAYMAT') {
            noticeTitle = '¡TAPETE DE DUELO OBTENIDO!';
            noticeIcon = '⚔️';
        } else if (upperType === 'SLEEVE') {
            noticeTitle = '¡FUNDA PARA CARTAS OBTENIDA!';
            noticeIcon = '🛡️';
        } else if (upperType === 'MEDAL') {
            noticeTitle = '¡MEDALLA HONORÍFICA OBTENIDA!';
            noticeIcon = '🎖️';
        }

        openProfileNoticeModal(noticeTitle, data.message || 'El regalo ha ingresado satisfactoriamente a tu cuenta e inventario.', true, noticeIcon);

    } catch (error) {
        console.error('[CLAIM SERVER GIFT ERROR]', error);
        openProfileNoticeModal('ERROR DE CONEXIÓN', 'Ocurrió un error al contactar al servidor: ' + error.message, false);
    }
}

function promptConsumeBooster(itemId) {
    let gift = null;
    if (Array.isArray(cachedServerGifts)) {
        gift = cachedServerGifts.find(g => g.id === itemId);
    }
    if (!gift && window.PotenciadoresManager) {
        const localMailbox = window.PotenciadoresManager.getUserMailbox();
        gift = localMailbox.find(m => m.id === itemId);
    }
    if (!gift) {
        claimServerGift(itemId);
        return;
    }

    const payload = gift.payload || {};
    const potName = gift.title || payload.name || 'Potenciador de Duelo';
    const potCode = payload.code || 'POT';
    const potType = (payload.type || 'EXP').toUpperCase();
    const boostVal = parseFloat(payload.boost_value || payload.value || 0);

    let activeAvatar = null;
    if (window.AvatarsManager) {
        activeAvatar = window.AvatarsManager.getActiveAvatar();
    }
    if (!activeAvatar) {
        activeAvatar = {
            code: 'AVA-002',
            name: 'Duelista Iniciado',
            image: '../../assets/images/avatars/AVA-002.png',
            exp_boost: 0.0,
            starships_boost: 0.0,
            luck_boost: 0.0
        };
    }

    const avatarName = activeAvatar.name || activeAvatar.code;
    const avatarCode = (activeAvatar.code || 'AVA-002').toUpperCase().trim();
    const avatarImg = activeAvatar.image || `../../assets/images/avatars/${avatarCode}.png`;

    let statKey = 'exp_boost';
    let statLabel = 'EXP';
    let maxCap = 300.0;
    let typeColor = '#00f0ff';
    let typeIcon = '⚡';

    if (potType === 'STARSHIPS' || potType === 'ESTRELLAS') {
        statKey = 'starships_boost';
        statLabel = 'StarShips';
        maxCap = 300.0;
        typeColor = '#ffd700';
        typeIcon = '⭐';
    } else if (potType === 'SUERTE' || potType === 'LUCK') {
        statKey = 'luck_boost';
        statLabel = 'Suerte';
        maxCap = 100.0;
        typeColor = '#10b981';
        typeIcon = '🍀';
    }

    const currentBoostVal = parseFloat(activeAvatar[statKey] || 0);
    const potentialVal = currentBoostVal + boostVal;
    const isAlreadyMax = currentBoostVal >= maxCap;
    const exceedsMax = potentialVal > maxCap;
    const needed = Math.max(0, maxCap - currentBoostVal).toFixed(2);

    pendingConsumeItemId = itemId;

    const detailsEl = document.getElementById('confirm-item-details');
    const btnConfirm = document.getElementById('btn-confirm-apply-boost');

    if (detailsEl) {
        let statusAlertHtml = '';

        if (isAlreadyMax) {
            statusAlertHtml = `
                <div style="background:rgba(239,68,68,0.2); border:1px solid #ef4444; color:#ff6b81; padding:8px 10px; margin-top:10px; font-weight:800; font-size:10px; text-align:center;">
                    ⛔ LÍMITE ALCANZADO: Tu avatar activo <b>${avatarCode}</b> ya tiene el tope máximo de ${maxCap.toFixed(1)}% en ${statLabel}.
                </div>
            `;
        } else if (exceedsMax) {
            statusAlertHtml = `
                <div style="background:rgba(245,158,11,0.2); border:1px solid #f59e0b; color:#fbbf24; padding:8px 10px; margin-top:10px; font-size:9.5px; line-height:1.4;">
                    ⛔ <b>NO SE PUEDE APLICAR (+${boostVal.toFixed(1)}%):</b> Superaría el tope de <b>${maxCap.toFixed(1)}%</b> en ${statLabel} (alcanzaría ${potentialVal.toFixed(1)}%).<br>
                    Tu avatar activo <b>[${avatarCode}]</b> tiene <b>+${currentBoostVal.toFixed(1)}%</b> y le falta <b>exactamente +${needed}%</b> para completarlo.<br>
                    👉 <i>Debes consumir un potenciador de exactamente +${needed}% para alcanzar el tope de la estadística.</i>
                </div>
            `;
        } else {
            statusAlertHtml = `
                <div style="background:rgba(16,185,129,0.15); border:1px solid #10b981; color:#34d399; padding:8px 10px; margin-top:10px; font-size:9.5px; text-align:center;">
                    ✅ <b>COMPATIBLE:</b> La estadística pasará de <b>+${currentBoostVal.toFixed(1)}%</b> a <b style="color:#ffd700;">+${potentialVal.toFixed(1)}%</b> (Tope: ${maxCap.toFixed(1)}%).
                </div>
            `;
        }

        detailsEl.innerHTML = `
            <!-- TARJETA DEL AVATAR ACTIVO RECEPTOR -->
            <div style="display:flex; align-items:center; gap:12px; background:rgba(0,240,255,0.08); border:1.5px solid #00f0ff; padding:10px; margin-bottom:10px;">
                <div style="width:48px; height:48px; border:1.5px solid #00f0ff; flex-shrink:0; overflow:hidden; background:#000;">
                    <img src="${avatarImg}" alt="${avatarName}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='../../assets/images/avatars/AVA-002.png'">
                </div>
                <div style="flex:1; min-width:0;">
                    <div style="display:flex; align-items:center; gap:6px; margin-bottom:2px;">
                        <span style="font-family:'Orbitron',sans-serif; font-size:11px; font-weight:900; color:#00f0ff;">${avatarName}</span>
                        <span style="font-size:8.5px; font-weight:900; color:#ffd700; background:rgba(255,215,0,0.15); border:1px solid #ffd700; padding:1px 5px;">[${avatarCode}]</span>
                    </div>
                    <div style="font-size:8px; color:#22c55e; font-weight:800; letter-spacing:0.5px; text-transform:uppercase;">
                        🎯 AVATAR ACTIVO SELECCIONADO (RECEPTOR)
                    </div>
                    <div style="font-size:8.5px; color:#cbd5e1; margin-top:2px;">
                        Estadística actual: <b style="color:#fff;">+${currentBoostVal.toFixed(1)}%</b> de ${statLabel} (Tope máx: ${maxCap.toFixed(1)}%)
                    </div>
                </div>
            </div>

            <!-- DETALLES DEL POTENCIADOR A CONSUMIR -->
            <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); padding:8px 10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <span style="color:#fff; font-weight:800; font-size:10.5px;">${typeIcon} ${potName}</span>
                    <span style="color:${typeColor}; font-weight:900; font-size:11px; font-family:'Orbitron',sans-serif;">+${boostVal.toFixed(1)}% ${statLabel}</span>
                </div>
                <div style="font-size:8.5px; color:#94a3b8;">
                    Código: <b>${potCode}</b> • Se ligará al avatar <b>[${avatarCode}]</b> permanentemente.
                </div>
            </div>

            ${statusAlertHtml}
        `;
    }

    if (btnConfirm) {
        if (isAlreadyMax || exceedsMax) {
            btnConfirm.disabled = true;
            btnConfirm.style.opacity = '0.4';
            btnConfirm.style.cursor = 'not-allowed';
            btnConfirm.style.background = '#475569';
            btnConfirm.style.borderColor = '#64748b';
            btnConfirm.style.color = '#94a3b8';
            btnConfirm.textContent = isAlreadyMax ? 'TOPE MÁXIMO ALCANZADO' : 'LÍMITE SUPERADO (BLOQUEADO)';
            btnConfirm.onclick = null;
        } else {
            btnConfirm.disabled = false;
            btnConfirm.style.opacity = '1';
            btnConfirm.style.cursor = 'pointer';
            btnConfirm.style.background = '#ffd700';
            btnConfirm.style.borderColor = '#ffd700';
            btnConfirm.style.color = '#000';
            btnConfirm.textContent = `CONFIRMAR Y APLICAR A [${avatarCode}]`;
            btnConfirm.onclick = () => {
                closeConsumeConfirmModal();
                claimServerGift(itemId);
            };
        }
    }

    const confirmModal = document.getElementById('profile-consume-confirm-modal');
    if (confirmModal) confirmModal.style.display = 'flex';
}

function closeConsumeConfirmModal() {
    const confirmModal = document.getElementById('profile-consume-confirm-modal');
    if (confirmModal) confirmModal.style.display = 'none';
    pendingConsumeItemId = null;
}

function openProfileNoticeModal(title, msg, isSuccess = true, customIcon = null) {
    const modal = document.getElementById('profile-notice-modal');
    const titleEl = document.getElementById('prof-notice-title');
    const msgEl = document.getElementById('prof-notice-msg');
    const iconEl = document.getElementById('prof-notice-icon');

    if (!modal) return;

    if (titleEl) {
        titleEl.textContent = title;
        titleEl.style.color = isSuccess ? '#00f0ff' : '#ff4757';
    }
    if (msgEl) msgEl.innerHTML = msg;
    if (iconEl) iconEl.textContent = customIcon || (isSuccess ? '⚡' : '⚠️');

    modal.style.display = 'flex';
}

function closeProfileNoticeModal() {
    const modal = document.getElementById('profile-notice-modal');
    if (modal) modal.style.display = 'none';
}

/**
 * ============================================================================
 * COLECCIÓN DE TAPETES DE DUELO (MODAL PERFIL)
 * ============================================================================
 */
function openTapetesCollectionModal() {
    const modal = document.getElementById('profile-tapetes-collection-modal');
    const grid = document.getElementById('modal-tapetes-grid');
    const countEl = document.getElementById('modal-tapetes-owned-count');

    if (!modal || !grid || !window.PlaymatsManager) return;

    const allTapetes = window.PlaymatsManager.getPlaymats();
    const ownedCodes = window.PlaymatsManager.getUserPlaymats();
    const activeCode = window.PlaymatsManager.getActivePlaymatCode();

    if (countEl) {
        countEl.textContent = `Posees: ${ownedCodes.length}`;
    }

    if (ownedCodes.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align:center; padding:30px; color:#94a3b8;">
                <div style="font-size:11px; font-weight:700; color:#fff; margin-bottom:6px;">AÚN NO POSEES TAPETES</div>
                <div style="font-size:9.5px; margin-bottom:12px;">Visita la Tienda de Tapetes para conseguir superficies de duelo cósmicas vitalicias.</div>
                <a href="../shop/shop-tapetes.html" class="btn-act-sm btn-act-activate" style="text-decoration:none; display:inline-flex; align-items:center;">IR A LA TIENDA DE TAPETES</a>
            </div>
        `;
    } else {
        grid.innerHTML = ownedCodes.map(code => {
            const tap = window.PlaymatsManager.getPlaymatByCode(code) || { code, name: code, image: `/assets/images/playmats/${code}.jpg` };
            const isActive = (activeCode === code);

            return `
                <div style="background:linear-gradient(180deg, #0e172a 0%, #060a14 100%); border:1.5px solid ${isActive ? '#00f0ff' : 'rgba(0,240,255,0.3)'}; border-radius:8px; padding:10px; text-align:center; position:relative; ${isActive ? 'box-shadow: 0 0 15px rgba(0,240,255,0.4);' : ''}">
                    <div style="font-family:'Orbitron', sans-serif; font-size:9px; font-weight:700; color:var(--accent-cyan); text-align:left; margin-bottom:4px;">
                        ${tap.code}
                    </div>
                    <div style="width:100%; height:85px; border-radius:4px; overflow:hidden; border:1px solid rgba(0,240,255,0.3); background:#000; margin-bottom:6px;">
                        <img src="${tap.image}" alt="${tap.name}" style="width:100%; height:100%; object-fit:cover;" onerror="this.onerror=null; this.src='/assets/images/logo.png';">
                    </div>
                    <div style="font-size:11px; font-weight:800; color:#fff; line-height:1.2; margin-bottom:8px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                        ${tap.name}
                    </div>
                    ${isActive ? `
                        <button type="button" class="btn-act-sm btn-act-inactivate" style="width:100%; height:26px; font-size:9px;" onclick="deactivateTapeteFromProfile()">
                            DESACTIVAR
                        </button>
                    ` : `
                        <button type="button" class="btn-act-sm btn-act-activate" style="width:100%; height:26px; font-size:9px;" onclick="equipTapeteFromProfile('${tap.code}')">
                            EQUIPAR TAPETE
                        </button>
                    `}
                </div>
            `;
        }).join('');
    }

    modal.style.display = 'flex';
}

function closeTapetesCollectionModal() {
    const modal = document.getElementById('profile-tapetes-collection-modal');
    if (modal) modal.style.display = 'none';
}

function equipTapeteFromProfile(code) {
    if (!window.PlaymatsManager) return;
    window.PlaymatsManager.setActivePlaymat(code);
    openTapetesCollectionModal();
    openProfileNoticeModal('TAPETE EQUIPADO', `Has activado el tapete <b>${code}</b> para tus duelos.`);
}

function deactivateTapeteFromProfile() {
    if (!window.PlaymatsManager) return;
    window.PlaymatsManager.setActivePlaymat('');
    openTapetesCollectionModal();
    openProfileNoticeModal('TAPETE DESACTIVADO', 'Has retirado tu tapete activo. Tu campo se mostrará con el fondo traslúcido por defecto.');
}

/**
 * ============================================================================
 * COLECCIÓN DE FUNDAS Y REVERSOS (MODAL PERFIL)
 * ============================================================================
 */
function openFundasCollectionModal() {
    const modal = document.getElementById('profile-fundas-collection-modal');
    const grid = document.getElementById('modal-fundas-grid');
    const countEl = document.getElementById('modal-fundas-owned-count');

    if (!modal || !grid || !window.SleevesManager) return;

    const allSleeves = window.SleevesManager.getSleeves();
    const ownedCodes = window.SleevesManager.getUserSleeves();
    const activeCode = window.SleevesManager.getActiveSleeveCode();

    if (countEl) {
        countEl.textContent = `Posees: ${ownedCodes.length}`;
    }

    if (ownedCodes.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align:center; padding:30px; color:#94a3b8;">
                <div style="font-size:11px; font-weight:700; color:#fff; margin-bottom:6px;">AÚN NO POSEES FUNDAS</div>
                <div style="font-size:9.5px; margin-bottom:12px;">Visita la Tienda de Fundas para conseguir protectores de cartas cósmicos vitalicios.</div>
                <a href="../shop/shop-fundas.html" class="btn-act-sm btn-act-activate" style="text-decoration:none; display:inline-flex; align-items:center;">IR A LA TIENDA DE FUNDAS</a>
            </div>
        `;
    } else {
        grid.innerHTML = ownedCodes.map(code => {
            const slv = window.SleevesManager.getSleeveByCode(code) || { code, name: code, image: `/assets/images/sleeves/${code}.png` };
            const isActive = (activeCode === code);

            return `
                <div style="background:linear-gradient(180deg, #0e172a 0%, #060a14 100%); border:1.5px solid ${isActive ? '#c084fc' : 'rgba(168,85,247,0.3)'}; border-radius:8px; padding:10px; text-align:center; position:relative; ${isActive ? 'box-shadow: 0 0 15px rgba(168,85,247,0.4);' : ''}">
                    <div style="font-family:'Orbitron', sans-serif; font-size:9px; font-weight:700; color:#c084fc; text-align:left; margin-bottom:4px;">
                        ${slv.code}
                    </div>
                    <div style="width:100%; height:95px; display:flex; align-items:center; justify-content:center; border-radius:4px; overflow:hidden; border:1px solid rgba(168,85,247,0.3); background:#000; margin-bottom:6px;">
                        <img src="${slv.image}" alt="${slv.name}" style="height:100%; width:auto; max-width:65px; object-fit:contain;" onerror="this.onerror=null; this.src='/assets/card_back.jpg';">
                    </div>
                    <div style="font-size:11px; font-weight:800; color:#fff; line-height:1.2; margin-bottom:8px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                        ${slv.name}
                    </div>
                    ${isActive ? `
                        <button type="button" class="btn-act-sm btn-act-inactivate" style="width:100%; height:26px; font-size:9px;" onclick="deactivateSleeveFromProfile()">
                            DESACTIVAR
                        </button>
                    ` : `
                        <button type="button" class="btn-act-sm btn-act-activate" style="width:100%; height:26px; font-size:9px;" onclick="equipSleeveFromProfile('${slv.code}')">
                            EQUIPAR FUNDA
                        </button>
                    `}
                </div>
            `;
        }).join('');
    }

    modal.style.display = 'flex';
}

function closeFundasCollectionModal() {
    const modal = document.getElementById('profile-fundas-collection-modal');
    if (modal) modal.style.display = 'none';
}

function equipSleeveFromProfile(code) {
    if (!window.SleevesManager) return;
    window.SleevesManager.setActiveSleeve(code);
    openFundasCollectionModal();
    openProfileNoticeModal('FUNDA EQUIPADA', `Has activado la funda <b>${code}</b> para el reverso de tus cartas.`);
}

function deactivateSleeveFromProfile() {
    if (!window.SleevesManager) return;
    window.SleevesManager.setActiveSleeve('');
    openFundasCollectionModal();
    openProfileNoticeModal('FUNDA DESACTIVADA', 'Has retirado tu funda activa. Se mostrará el reverso oficial por defecto.');
}

// =========================================================================
// MODAL DE MEDALLAS OCG OBTENIDAS EN MODO AVENTURA (PERMANENTES)
// =========================================================================
let currentProfileMedalsFilter = 'all';

async function openProfileMedalsModal() {
    const modal = document.getElementById('profile-medals-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    if (window.AdventureData && typeof window.AdventureData.syncFromServer === 'function') {
        try {
            await window.AdventureData.syncFromServer();
        } catch (e) {}
    }
    renderProfileMedalsGrid();
}

function closeProfileMedalsModal() {
    const modal = document.getElementById('profile-medals-modal');
    if (modal) modal.style.display = 'none';
}

function filterProfileMedals(type) {
    currentProfileMedalsFilter = type;
    const btns = document.querySelectorAll('.medal-filter-pill');
    btns.forEach(b => {
        b.classList.toggle('active', b.dataset.type === type);
    });
    renderProfileMedalsGrid();
}

function renderProfileMedalsGrid() {
    const container = document.getElementById('modal-medals-grid');
    const countEl = document.getElementById('modal-medals-owned-count');
    if (!container) return;

    const user = window.Session ? window.Session.getUser() : null;
    const unlockedList = (window.currentUserMedalIds && Array.isArray(window.currentUserMedalIds))
        ? window.currentUserMedalIds
        : ((user && Array.isArray(user.unlockedMedalIds)) ? user.unlockedMedalIds : []);
    
    // Normalizar a strings minúsculas para matching exacto e insensible a mayúsculas
    const unlockedSet = new Set(unlockedList.map(x => String(x).toLowerCase().trim()));

    const allMedals = (window.AdventureData && Array.isArray(window.AdventureData.MEDALS)) ? window.AdventureData.MEDALS : [];

    // Helper robusto: verifica coincidencia por ID de medalla (MEDAL_001), número de medalla (1) o ID del NPC
    const isMedalUnlocked = (m) => {
        if (!m) return false;
        if (m.id && unlockedSet.has(String(m.id).toLowerCase().trim())) return true;
        if (m.Id && (unlockedSet.has(String(m.Id).toLowerCase().trim()) || unlockedSet.has(`medal_${String(m.Id).padStart(3, '0')}`))) return true;
        if (m.MedalCode && unlockedSet.has(String(m.MedalCode).toLowerCase().trim())) return true;
        if (m.npcId && (unlockedSet.has(String(m.npcId).toLowerCase().trim()) || unlockedSet.has(`medal_${String(m.npcId).padStart(3, '0')}`))) return true;
        if (m.NpcId && (unlockedSet.has(String(m.NpcId).toLowerCase().trim()) || unlockedSet.has(`medal_${String(m.NpcId).padStart(3, '0')}`))) return true;
        return false;
    };

    const totalOwned = allMedals.filter(m => isMedalUnlocked(m)).length;
    if (countEl) countEl.textContent = `${totalOwned} / ${allMedals.length || 193} Medallas Obtenidas`;

    const filtered = allMedals.filter(m => {
        const isUnlocked = isMedalUnlocked(m);
        if (currentProfileMedalsFilter === 'unlocked') return isUnlocked;
        if (currentProfileMedalsFilter === 'exp') return m.boosterType === 'exp';
        if (currentProfileMedalsFilter === 'starships') return m.boosterType === 'starships';
        if (currentProfileMedalsFilter === 'luck') return m.boosterType === 'luck';
        return true;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:30px; color:#94a3b8; font-size:11px;">No hay medallas para este filtro.</div>`;
        return;
    }

    container.innerHTML = filtered.map(m => {
        const isUnlocked = isMedalUnlocked(m);
        let boosterText = '';
        if (m.boosterType === 'exp') boosterText = `+${m.boosterValue}% ⚡ EXP`;
        else if (m.boosterType === 'starships') boosterText = `+${m.boosterValue}% ⭐ StarShips`;
        else if (m.boosterType === 'luck') boosterText = `+${m.boosterValue}% 🍀 Suerte`;

        return `
            <div class="prof-medal-card ${isUnlocked ? 'unlocked' : 'locked'}">
                <div style="font-size:24px; width:40px; height:40px; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.5); border-radius:6px; border:1px solid rgba(255,255,255,0.1); flex-shrink:0;">
                    ${isUnlocked ? m.icon : '🔒'}
                </div>
                <div style="flex:1; min-width:0;">
                    <div style="font-family:'Orbitron', sans-serif; font-size:10px; font-weight:800; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        ${m.name}
                    </div>
                    <div style="font-size:9.5px; font-weight:900; color:#ffd700; font-family:'Orbitron', sans-serif;">
                        ${boosterText}
                    </div>
                    <div style="font-size:8px; color:#94a3b8; line-height:1.2; margin-top:2px;">
                        ${m.desc}
                    </div>
                    <div style="font-size:7.5px; margin-top:3px; color:${isUnlocked ? '#10b981' : '#ef4444'}; font-weight:800; font-family:'Orbitron', sans-serif;">
                        ${isUnlocked ? '✓ ACTIVA Y PERMANENTE' : `BLOQUEADA (Vence al NPC #${m.npcId || m.NpcId})`}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

window.openAvatarsCollectionModal = openAvatarsCollectionModal;
window.closeAvatarsCollectionModal = closeAvatarsCollectionModal;
window.activateUserAvatar = activateUserAvatar;
window.openTapetesCollectionModal = openTapetesCollectionModal;
window.closeTapetesCollectionModal = closeTapetesCollectionModal;
window.equipTapeteFromProfile = equipTapeteFromProfile;
window.deactivateTapeteFromProfile = deactivateTapeteFromProfile;
window.openFundasCollectionModal = openFundasCollectionModal;
window.closeFundasCollectionModal = closeFundasCollectionModal;
window.equipSleeveFromProfile = equipSleeveFromProfile;
window.deactivateSleeveFromProfile = deactivateSleeveFromProfile;
window.openMailboxModal = openMailboxModal;
window.closeMailboxModal = closeMailboxModal;
window.renderMailboxGrid = renderMailboxGrid;
window.claimServerGift = claimServerGift;
window.fetchServerMailbox = fetchServerMailbox;
window.promptConsumeBooster = promptConsumeBooster;
window.closeConsumeConfirmModal = closeConsumeConfirmModal;
window.openProfileNoticeModal = openProfileNoticeModal;
window.closeProfileNoticeModal = closeProfileNoticeModal;
window.openProfileMedalsModal = openProfileMedalsModal;
window.closeProfileMedalsModal = closeProfileMedalsModal;
window.filterProfileMedals = filterProfileMedals;
window.renderProfileMedalsGrid = renderProfileMedalsGrid;




