/**
/**
 * Ani-Dimension: Controlador del Lobby y Matchmaking PvP
 */
var currentRoomsList = [];
var currentActiveBonus = null;
var activePvpRoom = null;
var myReadyState = false;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Validar autenticación
    if (window.Session && !window.Session.requireAuth('../../login/login.html')) return;

    const user = window.Session ? window.Session.getUser() : null;
    if (user) {
        const uName = document.getElementById('player-username-tag');
        if (uName) uName.textContent = user.username || 'Duelista';
        const uLvl = document.getElementById('player-level-tag');
        if (uLvl) uLvl.textContent = `Nv. ${user.level || user.nivel || 1}`;
    }

    if (window.AppNavbar) {
        window.AppNavbar.init('duels');
    }

    // 2. Inicializar Sockets y Listeners
    initLobbySockets();
});

function initLobbySockets() {
    const socket = window.getSocket ? window.getSocket() : (window.socket || (typeof io !== 'undefined' ? io() : null));
    if (!socket) {
        console.error('[PVP LOBBY] Socket.IO no disponible.');
        return;
    }

    const sendUserIdentify = () => {
        const user = window.Session ? window.Session.getUser() : null;
        if (user && user.username) {
            socket.emit('USER_IDENTIFY', {
                username: user.username,
                id: user.id || user.Id || 0,
                level: user.level || user.nivel || 1,
                avatar: user.avatar || user.AvatarActivoId || 'AVA-001'
            });
        }
    };

    sendUserIdentify();
    socket.on('connect', () => {
        sendUserIdentify();
        requestRoomList();
    });

    // 1. Recibir listado de salas
    socket.on('PVP_ROOM_LIST', (data) => {
        if (Array.isArray(data)) {
            currentRoomsList = data;
            currentActiveBonus = null;
        } else if (data && typeof data === 'object') {
            currentRoomsList = Array.isArray(data.rooms) ? data.rooms : [];
            currentActiveBonus = data.activeBonus || null;
        } else {
            currentRoomsList = [];
            currentActiveBonus = null;
        }
        renderBonusBanner(currentActiveBonus);
        renderRoomsTable(currentRoomsList);
    });

    // 2. Sala creada con éxito (entrar a sala de espera)
    socket.on('PVP_ROOM_CREATED', (room) => {
        activePvpRoom = room;
        showWaitingRoomView(room, true);
    });

    // 3. Sala cancelada
    socket.on('PVP_ROOM_CANCELLED', (data) => {
        const msg = data && data.message ? data.message : 'El anfitrión ha cancelado la sala de espera.';
        if (window.showAniModal) {
            window.showAniModal('SALA CANCELADA', msg, 'warning');
        } else {
            window.aniAlert(msg, 'SALA CANCELADA', 'warning');
        }
        leaveWaitingRoomLocal();
    });

    // 4. Rival ingresó a la sala
    socket.on('PVP_ROOM_JOINED', (data) => {
        if (!data || !data.room) return;
        activePvpRoom = data.room;
        showWaitingRoomView(activePvpRoom, false);
    });

    // 5. Rival abandonó la sala
    socket.on('PVP_GUEST_LEFT', (data) => {
        if (activePvpRoom) {
            activePvpRoom.guest = null;
            activePvpRoom.status = 'WAITING';
            updateWaitingRoomUI(activePvpRoom);
        }
    });

    // 6. Actualización de estado LISTO
    socket.on('PVP_READY_STATUS', (data) => {
        updateReadyBadges(data.hostReady, data.guestReady);
    });

    // 7. Cuenta regresiva para inicio de duelo
    socket.on('PVP_START_COUNTDOWN', (data) => {
        startPvpCountdown(data.seconds || 3);
    });

    // 8. Error de PvP
    socket.on('PVP_ERROR', (data) => {
        const msg = data && data.message ? data.message : 'Ocurrió un error en el emparejamiento PvP.';
        if (window.showAniModal) {
            window.showAniModal('ERROR PVP', msg, 'error');
        } else {
            window.aniAlert(msg, 'ERROR PVP', 'error');
        }
    });

    // 9. Inicio oficial del duelo (Redirigir a duel-pvp.html sincronizadamente)
    socket.on('PVP_DUEL_START_NOW', (data) => {
        console.log('[PVP] ¡Duelo iniciado! Redirigiendo a arena de combate...', data);
        setTimeout(() => {
            window.location.href = `duel-pvp.html?room=${encodeURIComponent(data.roomId)}`;
        }, 500);
    });

    // Solicitar salas iniciales
    requestRoomList();
}

function renderBonusBanner(bonus) {
    const banner = document.getElementById('lobby-active-bonus-banner');
    if (!banner) return;

    if (bonus && bonus.isActive) {
        banner.style.display = 'flex';
        banner.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:22px;">🔥</span>
                <div>
                    <div style="font-family:'Orbitron', sans-serif; font-size:11.5px; font-weight:900; color:#ffd700; letter-spacing:0.5px;">
                        ${bonus.title.toUpperCase()}
                    </div>
                    <div style="font-size:10px; color:#e2e8f0; margin-top:1px;">
                        ${bonus.description || 'Bonus activo en todas las salas de combate'} • <b style="color:#00f0ff;">+${bonus.expBonusPct}% EXP</b> y <b style="color:#ffd700;">+${bonus.starshipsBonusPct}% Starships</b>
                    </div>
                </div>
            </div>
            <span style="background:rgba(0,0,0,0.5); border:1px solid #f59e0b; color:#ffd700; padding:3px 8px; font-size:9px; font-family:'Orbitron', sans-serif; font-weight:800; border-radius:4px;">
                🔥 SALAS MULTIPLICADAS
            </span>
        `;
    } else {
        banner.style.display = 'none';
    }
}

function requestRoomList() {
    const socket = window.getSocket ? window.getSocket() : (window.socket || null);
    if (socket) {
        socket.emit('PVP_GET_ROOMS');
    }
}

function renderRoomsTable(rooms) {
    const grid = document.getElementById('pvp-rooms-grid') || document.getElementById('pvp-rooms-tbody');
    const emptyBox = document.getElementById('empty-rooms-state');
    const countTag = document.getElementById('rooms-count-tag');

    if (countTag) countTag.innerHTML = `Salas Activas: <b>${rooms.length}</b>`;

    if (!grid) return;

    if (!rooms || rooms.length === 0) {
        grid.innerHTML = '';
        if (emptyBox) emptyBox.style.display = 'block';
        return;
    }

    if (emptyBox) emptyBox.style.display = 'none';

    const currentUser = window.Session && window.Session.getUser() ? window.Session.getUser() : null;
    const myLevel = currentUser ? (currentUser.level || currentUser.nivel || 1) : 1;

    grid.innerHTML = rooms.map(r => {
        const isWaiting = r.status === 'WAITING';
        const isDueling = r.status === 'DUELING';
        const isLevelEligible = myLevel >= r.minLevel && myLevel <= r.maxLevel;
        const isMyRoom = currentUser && r.host.username === currentUser.username;
        const isHostAdmin = Boolean(r.host && (r.host.isAdmin || (r.host.username && r.host.username.toLowerCase() === 'admin')));
        const isGuestAdmin = Boolean(r.guest && (r.guest.isAdmin || (r.guest.username && r.guest.username.toLowerCase() === 'admin')));
        const isAdminRoom = Boolean(r.hasAdmin || isHostAdmin || isGuestAdmin);

        const hasBonus = Boolean(r.hasBonus || (currentActiveBonus && currentActiveBonus.isActive));
        const bonusData = r.bonusInfo || currentActiveBonus;
        const bonusStyle = bonusData && bonusData.specialRoomStyle ? `style-${bonusData.specialRoomStyle}` : 'style-fire';

        let statusHtml = '';
        if (isWaiting) {
            statusHtml = `<span class="status-badge waiting">🟢 Esperando</span>`;
        } else if (isDueling) {
            statusHtml = `<span class="status-badge dueling">⚔️ En Duelo</span>`;
        } else {
            statusHtml = `<span class="status-badge ready">🟡 Preparando</span>`;
        }

        const lockIcon = r.hasPassword ? '🔒 Con Clave' : '🔓 Libre';

        let actionBtn = '';
        if (isMyRoom) {
            actionBtn = `<button class="btn-card-action btn-my-room" onclick="reenterMyRoom('${r.id}')">👑 MI SALA</button>`;
        } else if (isWaiting && isLevelEligible) {
            const btnClass = isAdminRoom ? 'btn-join-admin' : 'btn-join-regular';
            actionBtn = `<button class="btn-card-action ${btnClass}" onclick="attemptJoinRoom('${r.id}', ${r.hasPassword}, ${r.minLevel}, ${r.maxLevel})">${r.hasPassword ? '🔒 INGRESAR' : '⚔️ INGRESAR'}</button>`;
        } else if (isWaiting && !isLevelEligible) {
            actionBtn = `<button class="btn-card-action btn-disabled" title="Tu nivel (${myLevel}) está fuera del rango (${r.minLevel}-${r.maxLevel})">⛔ NIVEL INVÁLIDO</button>`;
        } else {
            actionBtn = `<button class="btn-card-action btn-disabled" disabled>⚔️ EN DUELO</button>`;
        }

        const roomNumberDisplay = r.roomNumber ? `Sala #${r.roomNumber}` : 'Sala PvP';
        let titleDisplay = r.name || `Sala de ${r.host.username}`;
        if (titleDisplay.toLowerCase().startsWith('sala de ')) {
            titleDisplay = `${roomNumberDisplay} • ${titleDisplay.slice(8)}`;
        } else if (!titleDisplay.toLowerCase().includes('sala')) {
            titleDisplay = `${roomNumberDisplay} • ${titleDisplay}`;
        }

        const avatarCode = r.host.avatar || 'AVA-001';
        const avatarSrc = avatarCode.startsWith('http') || avatarCode.startsWith('/') ? avatarCode : `../../../assets/images/avatars/${avatarCode}.png`;

        let cardClass = 'pvp-room-card';
        if (isAdminRoom) cardClass += ' admin-room-card';
        if (hasBonus) cardClass += ` bonus-room-card ${bonusStyle}`;

        let bonusBadgeHtml = '';
        if (hasBonus && bonusData) {
            let bonusText = '🔥 BONUS';
            if (bonusData.expBonusPct > 0 && bonusData.starshipsBonusPct > 0) {
                bonusText = `🔥 +${bonusData.expBonusPct}% EXP | +${bonusData.starshipsBonusPct}% ★`;
            } else if (bonusData.expBonusPct > 0) {
                bonusText = `🔥 +${bonusData.expBonusPct}% EXP`;
            } else if (bonusData.starshipsBonusPct > 0) {
                bonusText = `🔥 +${bonusData.starshipsBonusPct}% ★`;
            }
            bonusBadgeHtml = `<span class="room-card-bonus-badge">${bonusText}</span>`;
        }

        return `
            <div class="${cardClass}" id="card-room-${r.id}">
                ${isAdminRoom ? '<div class="room-card-admin-badge">👑 SALA ADMIN</div>' : ''}
                
                <div class="card-header-row">
                    <span class="room-lock-pill ${r.hasPassword ? 'locked' : 'unlocked'}">${lockIcon}</span>
                    <div>
                        ${statusHtml}
                    </div>
                </div>

                <div class="room-card-title" title="${titleDisplay}">
                    ${titleDisplay}
                </div>

                <div class="room-host-row">
                    <img src="${avatarSrc}" 
                         class="room-host-avatar ${isAdminRoom ? 'admin-avatar-glow' : ''}" 
                         onerror="this.onerror=null; this.src='../../../assets/images/avatars/AVA-001.png';">
                    <div class="room-host-info">
                        <div class="room-host-name ${isAdminRoom ? 'admin-name-glow' : ''}">
                            ${r.host.username} ${isAdminRoom ? '<span style="color:#ffd700; font-size:11px;">👑</span>' : ''}
                        </div>
                        <div class="room-host-level">Nv. ${r.host.level || 1}</div>
                    </div>
                </div>

                <div class="room-card-meta">
                    <span class="lvl-range-badge">🎯 Nv. ${r.minLevel} - ${r.maxLevel}</span>
                    ${bonusBadgeHtml}
                </div>

                <div class="room-card-action">
                    ${actionBtn}
                </div>
            </div>
        `;
    }).join('');
}

function filterRoomsTable() {
    const searchVal = (document.getElementById('room-search-input')?.value || '').toLowerCase().trim();
    if (!searchVal) {
        renderRoomsTable(currentRoomsList);
        return;
    }
    const filtered = currentRoomsList.filter(r => 
        r.name.toLowerCase().includes(searchVal) ||
        r.host.username.toLowerCase().includes(searchVal) ||
        r.id.toLowerCase().includes(searchVal) ||
        `sala #${r.roomNumber || 1}`.includes(searchVal) ||
        `#${r.roomNumber || 1}`.includes(searchVal) ||
        `sala ${r.roomNumber || 1}`.includes(searchVal) ||
        String(r.roomNumber || '').includes(searchVal)
    );
    renderRoomsTable(filtered);
}

// Ventana Flotante de Crear Sala (Formato Horizontal)
function toggleFloatingCreateBar(forceState) {
    const bar = document.getElementById('floating-create-bar');
    if (!bar) return;
    if (forceState !== undefined) {
        bar.style.display = forceState ? 'block' : 'none';
    } else {
        bar.style.display = bar.style.display === 'none' ? 'block' : 'none';
    }

    if (bar.style.display === 'block') {
        const nameInput = document.getElementById('room-name-input');
        if (nameInput) {
            const user = window.Session ? window.Session.getUser() : null;
            nameInput.value = user ? `Sala de ${user.username}` : 'Sala de Duelo';
            nameInput.focus();
        }
    }
}

function handleCreateRoomSubmit(event) {
    event.preventDefault();
    const socket = window.getSocket ? window.getSocket() : (window.socket || null);
    if (!socket) return;

    const name = document.getElementById('room-name-input').value.trim();
    const minLvl = parseInt(document.getElementById('room-min-lvl-input').value, 10) || 1;
    const maxLvl = parseInt(document.getElementById('room-max-lvl-input').value, 10) || 50;
    const password = document.getElementById('room-pass-input').value.trim();

    if (minLvl > maxLvl) {
        if (window.showAniModal) {
            window.showAniModal('RANGO INVÁLIDO', 'El nivel mínimo permitido no puede ser superior al nivel máximo.', 'warning');
        } else {
            window.aniAlert('El nivel mínimo no puede ser superior al nivel máximo.', 'RANGO INVÁLIDO', 'warning');
        }
        return;
    }

    // Obtener mazo del jugador
    let userDeck = null;
    if (window.DeckManager && typeof window.DeckManager.getDeck === 'function') {
        userDeck = window.DeckManager.getDeck();
    }

    const user = window.Session ? window.Session.getUser() : null;

    socket.emit('PVP_CREATE_ROOM', {
        name: name,
        min_level: minLvl,
        max_level: maxLvl,
        password: password,
        player_deck: userDeck,
        username: user ? user.username : null,
        user_id: user ? (user.id || user.Id) : null,
        avatar: user ? (user.avatar || user.AvatarActivoId) : null
    });

    toggleFloatingCreateBar(false);
}

// Unirse a sala de duelo
function attemptJoinRoom(roomId, hasPassword, minLevel, maxLevel) {
    const currentUser = window.Session && window.Session.getUser() ? window.Session.getUser() : null;
    const myLevel = currentUser ? (currentUser.level || currentUser.nivel || 1) : 1;

    if (myLevel < minLevel || myLevel > maxLevel) {
        const msg = `Tu nivel actual (Nv. ${myLevel}) no cumple con el rango requerido para esta sala (Nv. ${minLevel} - Nv. ${maxLevel}).`;
        if (window.showAniModal) {
            window.showAniModal('RESTRICCIÓN DE NIVEL', msg, 'warning');
        } else {
            window.aniAlert(msg, 'RESTRICCIÓN DE NIVEL', 'warning');
        }
        return;
    }

    if (hasPassword) {
        openPasswordPrompt(roomId);
        return;
    }

    executeJoinRoom(roomId, '');
}

function openPasswordPrompt(roomId) {
    const bar = document.getElementById('floating-password-bar');
    const targetInput = document.getElementById('pass-target-room-id');
    const passInput = document.getElementById('room-join-pass-input');
    if (bar && targetInput) {
        targetInput.value = roomId;
        if (passInput) passInput.value = '';
        bar.style.display = 'block';
        if (passInput) passInput.focus();
    }
}

function closePasswordPrompt() {
    const bar = document.getElementById('floating-password-bar');
    if (bar) bar.style.display = 'none';
}

function handlePasswordSubmit(event) {
    event.preventDefault();
    const roomId = document.getElementById('pass-target-room-id').value;
    const pass = document.getElementById('room-join-pass-input').value.trim();
    closePasswordPrompt();
    executeJoinRoom(roomId, pass);
}

function executeJoinRoom(roomId, password) {
    const socket = window.getSocket ? window.getSocket() : (window.socket || null);
    if (!socket) return;

    let userDeck = null;
    if (window.DeckManager && typeof window.DeckManager.getDeck === 'function') {
        userDeck = window.DeckManager.getDeck();
    }

    const user = window.Session ? window.Session.getUser() : null;
    const currentUserName = user ? user.username : (window.Session ? window.Session.getUsername() : 'Invitado');
    const currentAvatar = user ? (user.avatarActivoId || user.avatar || 'AVA-002') : 'AVA-002';

    socket.emit('PVP_JOIN_ROOM', {
        room_id: roomId,
        username: currentUserName,
        avatar: currentAvatar,
        password: password,
        player_deck: userDeck
    });
}

function reenterMyRoom(roomId) {
    const room = currentRoomsList.find(r => r.id === roomId);
    if (room) {
        activePvpRoom = room;
        showWaitingRoomView(room, true);
    }
}

// Sala de Espera UI
function showWaitingRoomView(room, isHost) {
    const tableView = document.getElementById('pvp-lobby-table-view');
    const waitView = document.getElementById('pvp-waiting-room-view');
    if (tableView) tableView.style.display = 'none';
    if (waitView) waitView.style.display = 'flex';

    updateWaitingRoomUI(room);
}

function updateWaitingRoomUI(room) {
    if (!room) return;
    const titleEl = document.getElementById('wait-room-name');
    if (titleEl) {
        const roomNum = room.roomNumber ? `Sala #${room.roomNumber} - ` : '';
        titleEl.textContent = `${roomNum}${room.name}`;
    }

    const metaEl = document.getElementById('wait-room-meta');
    if (metaEl) {
        const passText = room.hasPassword ? '🔒 Con Contraseña' : '🔓 Pública';
        metaEl.textContent = `Rango Nivel: Nv. ${room.minLevel} - Nv. ${room.maxLevel} • ${passText}`;
    }

    // Host
    const hName = document.getElementById('wait-host-name');
    if (hName) hName.textContent = room.host.username;
    const hLvl = document.getElementById('wait-host-level');
    if (hLvl) hLvl.textContent = `Nivel ${room.host.level}`;
    const hAva = document.getElementById('wait-host-avatar');
    if (hAva) hAva.src = `../../../assets/images/avatars/${room.host.avatar || 'AVA-001'}.png`;

    // Guest
    const gSlot = document.getElementById('guest-slot-container');
    const gName = document.getElementById('wait-guest-name');
    const gLvl = document.getElementById('wait-guest-level');
    const gAva = document.getElementById('wait-guest-avatar');
    const statusText = document.getElementById('wait-status-text');
    const actionsBox = document.getElementById('wait-actions-box');

    if (room.guest) {
        if (gName) { gName.textContent = room.guest.username; gName.style.color = '#fff'; }
        if (gLvl) gLvl.textContent = `Nivel ${room.guest.level}`;
        if (gAva) {
            gAva.src = `../../../assets/images/avatars/${room.guest.avatar || 'AVA-002'}.png`;
            gAva.style.filter = 'none';
        }
        if (statusText) statusText.textContent = '¡RIVAL CONECTADO! CONFIRMEN PARA INICIAR';
        if (actionsBox) actionsBox.style.display = 'block';
    } else {
        if (gName) { gName.textContent = 'Buscando rival...'; gName.style.color = '#94a3b8'; }
        if (gLvl) gLvl.textContent = '--';
        if (gAva) {
            gAva.src = `../../../assets/images/avatars/AVA-002.png`;
            gAva.style.filter = 'grayscale(0.8)';
        }
        if (statusText) statusText.textContent = 'ESPERANDO A QUE UN OPONENTE INGRESE...';
        if (actionsBox) actionsBox.style.display = 'none';
    }

    updateReadyBadges(room.host.ready, room.guest ? room.guest.ready : false);
}

function updateReadyBadges(hostReady, guestReady) {
    const hTag = document.getElementById('wait-host-ready-tag');
    if (hTag) {
        hTag.className = `slot-ready-indicator ${hostReady ? 'ready' : 'pending'}`;
        hTag.textContent = hostReady ? 'LISTO' : 'ESPERANDO';
    }
    const gTag = document.getElementById('wait-guest-ready-tag');
    if (gTag) {
        gTag.className = `slot-ready-indicator ${guestReady ? 'ready' : 'pending'}`;
        gTag.textContent = guestReady ? 'LISTO' : 'ESPERANDO';
    }
}

function toggleReadyState() {
    const socket = window.getSocket ? window.getSocket() : (window.socket || null);
    if (!socket || !activePvpRoom) return;

    myReadyState = !myReadyState;
    const btn = document.getElementById('btn-accept-pvp');
    if (btn) {
        btn.textContent = myReadyState ? '✅ ¡LISTO! (ESPERANDO AL RIVAL)' : '✅ ACEPTAR Y LISTO';
        btn.style.background = myReadyState ? 'linear-gradient(135deg, #00f0ff, #0984e3)' : 'linear-gradient(135deg, #10b981, #059669)';
    }

    socket.emit('PVP_SET_READY', {
        room_id: activePvpRoom.id,
        ready: myReadyState
    });
}

function cancelWaitingRoom() {
    const socket = window.getSocket ? window.getSocket() : (window.socket || null);
    if (socket && activePvpRoom) {
        socket.emit('PVP_LEAVE_ROOM', { room_id: activePvpRoom.id });
    }
    leaveWaitingRoomLocal();
}

function leaveWaitingRoomLocal() {
    activePvpRoom = null;
    myReadyState = false;
    const tableView = document.getElementById('pvp-lobby-table-view');
    const waitView = document.getElementById('pvp-waiting-room-view');
    if (tableView) tableView.style.display = 'block';
    if (waitView) waitView.style.display = 'none';
    requestRoomList();
}

function startPvpCountdown(seconds) {
    const overlay = document.getElementById('wait-countdown-overlay');
    const numEl = document.getElementById('countdown-num');
    if (!overlay || !numEl) return;

    overlay.style.display = 'flex';
    let current = seconds;
    numEl.textContent = current;

    const interval = setInterval(() => {
        current--;
        if (current <= 0) {
            clearInterval(interval);
            numEl.textContent = '⚔️';
        } else {
            numEl.textContent = current;
        }
    }, 1000);
}
