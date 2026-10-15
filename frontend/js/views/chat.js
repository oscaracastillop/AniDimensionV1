/**
 * Ani-Dimension: Controlador de Chat Global & Mensajería Estilo WhatsApp
 * Soporta Canal Global OCG, Mensajería Privada 1 a 1, Eliminación y Vaciado de Mensajes,
 * Lista Dinámica de Usuarios Online en Panel Izquierdo y Eventos en Vivo de Admin.
 */

let chatSocket = null;
let currentChatUser = null;
let activeTargetUser = null; // null = Chat Global OCG; { username, id, avatar, level } = Chat Privado
let onlineUsersList = [];
let unreadCounts = new Map(); // username -> count
let currentAdminTab = 'launch';
let activeEventData = null;
let currentPinnedMessage = null;

const PINNED_COLORS = {
    CYAN: '#00F0FF',
    GOLD: '#FFD700',
    CRIMSON: '#FF0055',
    EMERALD: '#00FF88',
    PURPLE: '#B026FF'
};

/**
 * Inicialización de la Vista
 */
async function initChatView() {
    currentChatUser = window.Session ? window.Session.getUser() : null;
    if (!currentChatUser) {
        currentChatUser = { id: 1, username: 'Invitado', role: 'user', avatarActivoId: 'AVA-002', nivel: 1 };
    }

    const isAdmin = (currentChatUser.role && currentChatUser.role.toLowerCase() === 'admin') ||
                    (currentChatUser.username && currentChatUser.username.toLowerCase() === 'admin') ||
                    currentChatUser.isAdmin;

    // 1. Mostrar controles de Admin en la cabecera si aplica
    const adminActionsContainer = document.getElementById('admin-header-actions');
    const statusPill = document.getElementById('chat-status-pill');
    if (isAdmin) {
        if (adminActionsContainer) adminActionsContainer.style.display = 'flex';
        if (statusPill) {
            statusPill.classList.add('is-admin-clickable');
            statusPill.title = 'Clic para bloquear / activar el chat';
        }
        initDraggableWidget('floating-event-launcher', 'drag-header-launcher');
        initDraggableWidget('floating-pinned-manager', 'drag-header-pinned');
        initDraggableWidget('floating-prizes-history', 'drag-header-prizes');
    } else {
        if (adminActionsContainer) adminActionsContainer.style.display = 'none';
        if (statusPill) {
            statusPill.classList.remove('is-admin-clickable');
            statusPill.title = 'Estado del Chat';
        }
    }

    // 2. Conectar WebSockets
    initChatSocket();

    // 3. Cargar Usuarios Online
    await fetchOnlineUsers();
    setInterval(fetchOnlineUsers, 12000);

    // 4. Cargar Historial del Canal Inicial (Global)
    await loadConversationHistory();

    // 5. Configurar escuchadores DOM y ventanas flotantes
    setupEventListeners();
    initUserProfileDraggable();
}

/**
 * Conexión WebSockets
 */
function initChatSocket() {
    chatSocket = window.getSocket ? window.getSocket() : (window.socket || (typeof io !== 'undefined' ? io() : null));

    if (!chatSocket && typeof io !== 'undefined') {
        chatSocket = io();
    }

    if (!chatSocket) return;

    // Identificar al conectar o reconectar
    chatSocket.on('connect', () => {
        if (currentChatUser && currentChatUser.username) {
            chatSocket.emit('USER_IDENTIFY', { username: currentChatUser.username });
        }
    });

    if (currentChatUser && currentChatUser.username) {
        chatSocket.emit('USER_IDENTIFY', { username: currentChatUser.username });
    }

    // A. Actualización en tiempo real de usuarios en línea (Socket)
    chatSocket.off('ONLINE_USERS_UPDATE');
    chatSocket.on('ONLINE_USERS_UPDATE', (users) => {
        if (Array.isArray(users)) {
            onlineUsersList = users;
            renderOnlineUsersSidebar(onlineUsersList);
            // Actualizar estado en la cabecera si estamos en un chat privado
            if (activeTargetUser) {
                const updated = users.find(u => u.username.toLowerCase() === activeTargetUser.username.toLowerCase());
                if (updated) {
                    activeTargetUser.isOnline = Boolean(updated.isOnline);
                    const subEl = document.getElementById('active-chat-subtitle');
                    const dotEl = document.getElementById('active-chat-status-dot');
                    if (subEl) subEl.textContent = updated.isOnline ? 'En línea' : 'Desconectado';
                    if (dotEl) dotEl.style.background = updated.isOnline ? '#00ff88' : '#475569';
                }
            }
        }
    });

    // B. Mensajes Globales
    chatSocket.off('CHAT_BROADCAST');
    chatSocket.on('CHAT_BROADCAST', (msg) => {
        handleIncomingMessage(msg, false);
    });

    // C. Mensajes Privados
    chatSocket.off('CHAT_PRIVATE_MESSAGE');
    chatSocket.on('CHAT_PRIVATE_MESSAGE', (msg) => {
        handleIncomingMessage(msg, true);
    });

    // D. Mensaje Eliminado
    chatSocket.off('CHAT_MESSAGE_DELETED');
    chatSocket.on('CHAT_MESSAGE_DELETED', (data) => {
        if (data && data.messageId) {
            handleMessageDeletedUI(data.messageId);
        }
    });

    // D.2 Conversación Vaciada / Limpiada
    chatSocket.off('CHAT_CONVERSATION_CLEARED');
    chatSocket.on('CHAT_CONVERSATION_CLEARED', (data) => {
        if (!data) return;
        const feed = document.getElementById('chat-messages-feed');
        if (data.isGlobal && !activeTargetUser) {
            if (feed) {
                feed.innerHTML = `
                    <div class="chat-msg-row system">
                        <div class="chat-bubble">Conversación vaciada.</div>
                    </div>
                `;
            }
        } else if (!data.isGlobal && activeTargetUser && (activeTargetUser.username.toLowerCase() === (data.targetUsername || '').toLowerCase())) {
            if (feed) {
                feed.innerHTML = `
                    <div class="chat-msg-row system">
                        <div class="chat-bubble">Conversación vaciada.</div>
                    </div>
                `;
            }
        }
    });

    // E. Moderación y Eventos
    chatSocket.off('CHAT_MUTED_CHANGE');
    chatSocket.on('CHAT_MUTED_CHANGE', (data) => {
        updateChatMutedUI(data.isMuted, data.by || data.mutedBy);
    });

    chatSocket.off('CHAT_PINNED_MESSAGE');
    chatSocket.on('CHAT_PINNED_MESSAGE', (data) => {
        updatePinnedBannerUI(data.message, data.color);
    });

    chatSocket.off('EVENT_COUNTDOWN_TICK');
    chatSocket.on('EVENT_COUNTDOWN_TICK', (data) => renderEventCountdownUI(data));

    chatSocket.off('EVENT_LIVE_STARTED');
    chatSocket.on('EVENT_LIVE_STARTED', (data) => renderEventLiveChallengeUI(data));

    chatSocket.off('EVENT_WINNER_ANNOUNCED');
    chatSocket.on('EVENT_WINNER_ANNOUNCED', (data) => renderEventWinnerUI(data));

    chatSocket.off('EVENT_CANCELLED');
    chatSocket.on('EVENT_CANCELLED', () => {
        const container = document.getElementById('chat-live-event-container');
        if (container) container.style.display = 'none';
    });
}

/**
 * Consultar lista de usuarios online desde el servidor
 */
async function fetchOnlineUsers() {
    try {
        const res = await fetch('/api/chat/online-users');
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
            onlineUsersList = data.users;
            renderOnlineUsersSidebar(onlineUsersList);
        }
    } catch (e) {
        console.warn('[FETCH ONLINE USERS ERROR]', e);
    }
}

/**
 * Obtener información de tier VIP con estrellas según código
 * VIP Oro (VIP-004): 3 estrellas ★★★
 * VIP Plata (VIP-003): 2 estrellas ★★
 * VIP Bronce (VIP-002): 1 estrella ★
 * VIP Básico / Normal comprado por estrellas (VIP-001): 0 estrellas, sin distintivo, usuario normal
 */
function getVipTierInfo(vCode, isVipActive) {
    if (!isVipActive) return null;
    const code = (vCode || '').toUpperCase().trim();

    // VIP Oro (VIP-004 o GOLD / ORO) -> 3 Estrellas
    if (code === 'VIP-004' || code.includes('GOLD') || code.includes('ORO')) {
        return {
            tier: 'gold',
            stars: '★★★',
            label: 'VIP ★★★',
            fullLabel: 'VIP ★★★',
            badgeHtml: '<span class="chat-bubble-tag-vip">VIP ★★★</span>',
            sidebarBadgeHtml: '<span class="chat-sidebar-vip-badge gold">VIP ★★★</span>',
            bubbleClass: 'is-vip-gold',
            nameClass: 'is-vip-gold'
        };
    }
    // VIP Plata (VIP-003 o SILVER / PLATA) -> 2 Estrellas
    if (code === 'VIP-003' || code.includes('SILVER') || code.includes('PLATA')) {
        return {
            tier: 'silver',
            stars: '★★',
            label: 'VIP ★★',
            fullLabel: 'VIP ★★',
            badgeHtml: '<span class="chat-bubble-tag-vip">VIP ★★</span>',
            sidebarBadgeHtml: '<span class="chat-sidebar-vip-badge silver">VIP ★★</span>',
            bubbleClass: 'is-vip-silver',
            nameClass: 'is-vip-silver'
        };
    }
    // VIP Bronce (VIP-002 o BRONZE / BRONCE) -> 1 Estrella
    if (code === 'VIP-002' || code.includes('BRONZE') || code.includes('BRONCE')) {
        return {
            tier: 'bronze',
            stars: '★',
            label: 'VIP ★',
            fullLabel: 'VIP ★',
            badgeHtml: '<span class="chat-bubble-tag-vip">VIP ★</span>',
            sidebarBadgeHtml: '<span class="chat-sidebar-vip-badge bronze">VIP ★</span>',
            bubbleClass: 'is-vip-bronze',
            nameClass: 'is-vip-bronze'
        };
    }
    // VIP Normal / Básico comprado por estrellas (VIP-001 o BASIC) -> SIN DISTINCIÓN
    return null;
}

/**
 * Renderizar la lista de usuarios online en el panel izquierdo (WhatsApp Sidebar)
 */
function renderOnlineUsersSidebar(users) {
    const container = document.getElementById('dynamic-online-users-container');
    const countBadge = document.getElementById('online-users-count');
    if (!container) return;

    const myUsername = (currentChatUser?.username || '').toLowerCase();
    
    // Filtrar al propio usuario e invitados
    const otherUsers = users.filter(u => {
        const uname = (u.username || '').toLowerCase();
        return uname !== myUsername && uname !== 'invitado' && uname !== '';
    });

    // Ordenar: primero Administradores, luego online (isOnline = true), luego nivel descendente
    otherUsers.sort((a, b) => {
        const aIsAdm = !!a.isAdmin || (a.username || '').toLowerCase() === 'admin';
        const bIsAdm = !!b.isAdmin || (b.username || '').toLowerCase() === 'admin';
        if (aIsAdm !== bIsAdm) {
            return aIsAdm ? -1 : 1;
        }
        if (a.isOnline === b.isOnline) {
            return (b.nivel || 1) - (a.nivel || 1);
        }
        return a.isOnline ? -1 : 1;
    });

    const onlineCount = otherUsers.filter(u => u.isOnline).length;
    if (countBadge) countBadge.textContent = onlineCount;

    container.innerHTML = '';

    if (otherUsers.length === 0) {
        container.innerHTML = `<div style="padding:15px; text-align:center; font-size:11.5px; color:#64748b;">No hay otros jugadores registrados</div>`;
        return;
    }

    otherUsers.forEach(user => {
        const isSelected = activeTargetUser && activeTargetUser.username.toLowerCase() === user.username.toLowerCase();
        const isAdm = !!user.isAdmin || (user.username || '').toLowerCase() === 'admin';
        const isVipActive = !isAdm && Boolean(user.isVip || user.IsVip || (user.vipUntil && new Date(user.vipUntil) > new Date()) || (user.username && user.username.toLowerCase() === 'sofia'));
        const vipTier = getVipTierInfo(user.vipCode || (isVipActive ? 'VIP-004' : null), isVipActive);
        const unread = unreadCounts.get(user.username.toLowerCase()) || 0;
        const avatarCode = (user.avatar || 'AVA-001').toLowerCase();
        const avatarImg = `/assets/images/avatars/${avatarCode}.png`;

        const item = document.createElement('div');
        const contactClass = isAdm ? 'is-admin-contact' : (vipTier ? `is-vip-contact is-vip-${vipTier.tier}` : '');
        item.className = `chat-contact-item ${contactClass} ${isSelected ? 'active' : ''}`;
        item.id = `contact-user-${user.username.toLowerCase()}`;
        item.onclick = () => selectChatTarget(user);

        let nameHtml = '';
        if (isAdm) {
            nameHtml = `<span class="chat-contact-name admin-highlight">${escapeHtml(user.username)} <span class="chat-sidebar-admin-badge">ADMIN ★★★★★</span></span>`;
        } else if (vipTier) {
            nameHtml = `<span class="chat-contact-name vip-highlight">${escapeHtml(user.username)} ${vipTier.sidebarBadgeHtml}</span>`;
        } else {
            nameHtml = `<span class="chat-contact-name">${escapeHtml(user.username)}</span>`;
        }

        let previewText = '';
        if (isAdm) {
            previewText = user.isOnline ? 'Administrador • En línea' : 'Administrador • Desconectado';
        } else if (vipTier) {
            previewText = user.isOnline ? `${vipTier.label} • En línea` : `${vipTier.label} • Desconectado`;
        } else {
            previewText = user.isOnline ? 'En línea • Toca para chatear' : 'Desconectado';
        }

        const avatarBoxClass = isAdm ? 'is-admin' : (vipTier ? 'is-vip' : '');

        item.innerHTML = `
            <div class="chat-contact-avatar-box ${avatarBoxClass}">
                <img src="${avatarImg}" class="chat-contact-avatar-img" onerror="this.src='/assets/images/avatars/ava-002.png'" alt="${user.username}">
                <div class="chat-online-badge ${user.isOnline ? '' : 'offline'}"></div>
            </div>
            <div class="chat-contact-info">
                <div class="chat-contact-top">
                    ${nameHtml}
                    <span class="chat-contact-time">Nv. ${user.nivel || 1}</span>
                </div>
                <div class="chat-contact-preview" id="preview-${user.username.toLowerCase()}" style="${isAdm ? 'color:#fef08a;' : (isVipActive ? 'color:#38bdf8;' : '')}">
                    ${previewText}
                </div>
            </div>
            <span class="chat-unread-badge" id="badge-${user.username.toLowerCase()}" style="${unread > 0 ? '' : 'display:none;'}">${unread}</span>
        `;

        container.appendChild(item);
    });
}

/**
 * Filtrar usuarios en la barra de búsqueda de WhatsApp
 */
function filterOnlineUsers(term) {
    const query = (term || '').toLowerCase().trim();
    if (!query) {
        renderOnlineUsersSidebar(onlineUsersList);
        return;
    }

    const filtered = onlineUsersList.filter(u => 
        (u.username || '').toLowerCase().includes(query)
    );
    renderOnlineUsersSidebar(filtered);
}

/**
 * Seleccionar el canal activo: Global o Chat Privado con un Usuario
 */
async function selectChatTarget(userOrNull) {
    activeTargetUser = userOrNull; // null = Global

    // 1. Actualizar clases de selección en la barra lateral
    document.querySelectorAll('.chat-contact-item').forEach(el => el.classList.remove('active'));
    
    if (!activeTargetUser) {
        // Canal Global
        const globalEl = document.getElementById('channel-global-item');
        if (globalEl) globalEl.classList.add('active');

        // Limpiar contador no leídos de global
        const globalBadge = document.getElementById('global-unread-badge');
        if (globalBadge) globalBadge.style.display = 'none';

        // Actualizar Cabecera Activa
        document.getElementById('active-chat-title').textContent = 'Chat Global';
        document.getElementById('active-chat-subtitle').textContent = 'Canal público oficial • Todos los duelistas';
        document.getElementById('active-chat-avatar').src = '/assets/images/avatars/ava-002.png';
        document.getElementById('chat-input-text').placeholder = 'Escribe un mensaje en el Chat Global...';
    } else {
        // Chat Privado con Usuario
        const userEl = document.getElementById(`contact-user-${activeTargetUser.username.toLowerCase()}`);
        if (userEl) userEl.classList.add('active');

        // Limpiar contador no leídos para este usuario
        unreadCounts.set(activeTargetUser.username.toLowerCase(), 0);
        const badge = document.getElementById(`badge-${activeTargetUser.username.toLowerCase()}`);
        if (badge) badge.style.display = 'none';

        // Actualizar Cabecera Activa (Solo 'En línea' o 'Desconectado', sin nivel)
        document.getElementById('active-chat-title').textContent = `@${activeTargetUser.username}`;
        const isOnline = Boolean(activeTargetUser.isOnline);
        document.getElementById('active-chat-subtitle').textContent = isOnline ? 'En línea' : 'Desconectado';
        const avaCode = (activeTargetUser.avatar || 'AVA-001').toLowerCase();
        document.getElementById('active-chat-avatar').src = `/assets/images/avatars/${avaCode}.png`;
        document.getElementById('chat-input-text').placeholder = `Mensaje privado a @${activeTargetUser.username}...`;
    }

    // 2. Cargar historial de la conversación seleccionada
    await loadConversationHistory();
}

/**
 * Cargar historial de la conversación actual desde la base de datos (Stored Procedure)
 */
async function loadConversationHistory() {
    const feed = document.getElementById('chat-messages-feed');
    if (!feed) return;

    feed.innerHTML = '<div style="text-align:center; padding:20px; color:#64748b; font-size:12px;">Cargando mensajes...</div>';

    try {
        const myId = currentChatUser?.id || 1;
        let url = `/api/chat/history?userId=${myId}`;
        if (activeTargetUser && activeTargetUser.username) {
            url += `&targetUsername=${encodeURIComponent(activeTargetUser.username)}`;
        }

        const res = await fetch(url);
        const data = await res.json();

        feed.innerHTML = '';

        if (data.success) {
            const messages = data.messages || [];
            if (messages.length === 0) {
                feed.innerHTML = `
                    <div class="chat-msg-row system">
                        <div class="chat-bubble">
                            ${activeTargetUser ? `Inicia una conversación privada con @${escapeHtml(activeTargetUser.username)}` : '¡Bienvenido al Chat Global! Sé respetuoso y disfruta los duelos.'}
                        </div>
                    </div>
                `;
            } else {
                messages.forEach(m => renderMessageBubble(m));
                feed.scrollTop = feed.scrollHeight;
            }

            if (data.chatState && !activeTargetUser) {
                updateChatMutedUI(data.chatState.isChatMuted, data.chatState.mutedBy);
                updatePinnedBannerUI(data.chatState.pinnedMessage, data.chatState.pinnedColor);
                if (data.chatState.activeEvent && data.chatState.activeEvent.status === 'ACTIVE') {
                    renderEventLiveChallengeUI(data.chatState.activeEvent);
                }
            }
        }
    } catch (err) {
        console.error('[LOAD CONVERSATION ERROR]', err);
        feed.innerHTML = '<div style="text-align:center; padding:20px; color:#ff0055;">Error al cargar mensajes.</div>';
    }
}

/**
 * Renderizar una burbuja de mensaje estilo WhatsApp
 */
function renderMessageBubble(msg) {
    const feed = document.getElementById('chat-messages-feed');
    if (!feed) return;

    // Los mensajes eliminados no deben mostrarse en la visión del usuario
    const isDeleted = Boolean(msg.is_deleted || msg.IsDeleted || msg.isDeleted);
    if (isDeleted) return;

    const myUsername = (currentChatUser?.username || '').toLowerCase();
    const sender = (msg.username || msg.Username || 'Duelista');
    const isSentByMe = (sender.toLowerCase() === myUsername);
    const isAdmin = !!msg.is_admin || !!msg.IsAdmin || (sender.toLowerCase() === 'admin');
    const isVipActive = !isAdmin && Boolean(msg.is_vip || msg.IsVip || (msg.vipUntil && new Date(msg.vipUntil) > new Date()) || (sender.toLowerCase() === 'sofia'));
    const vipCode = msg.vip_code || msg.VipCode || (isVipActive ? 'VIP-004' : null);
    const vipTier = getVipTierInfo(vipCode, isVipActive);
    const msgId = msg.id || msg.Id;
    const text = msg.mensaje || msg.Message || '';
    const dateStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (msg.CreatedAt ? new Date(msg.CreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

    const row = document.createElement('div');
    row.className = `chat-msg-row ${isSentByMe ? 'outgoing' : 'incoming'}`;
    row.id = `chat-msg-${msgId}`;

    let senderPrefix = '';
    if (!isSentByMe && !activeTargetUser) {
        // En canal global mostrar nombre (sin negrita) y estatus con estrellas como texto plano puro (sin ningún contenedor ni caja)
        if (isAdmin) {
            senderPrefix = `<span class="chat-bubble-sender is-admin" onclick="openChatUserProfile(${msg.user_id || msg.UserId || 0}, '${escapeHtml(sender)}')">${escapeHtml(sender)}</span> ADMIN ★★★★★<span class="chat-bubble-colon">:</span> `;
        } else if (vipTier) {
            senderPrefix = `<span class="chat-bubble-sender ${vipTier.nameClass}" onclick="openChatUserProfile(${msg.user_id || msg.UserId || 0}, '${escapeHtml(sender)}')">${escapeHtml(sender)}</span> ${vipTier.label}<span class="chat-bubble-colon">:</span> `;
        } else {
            senderPrefix = `<span class="chat-bubble-sender" onclick="openChatUserProfile(${msg.user_id || msg.UserId || 0}, '${escapeHtml(sender)}')">${escapeHtml(sender)}</span><span class="chat-bubble-colon">:</span> `;
        }
    } else if (!isSentByMe && activeTargetUser) {
        // En chat privado mostrar prefijo con nombre sin negrita y estatus en texto plano puro
        const senderClass = isAdmin ? 'is-admin' : (vipTier ? vipTier.nameClass : '');
        const tag = isAdmin ? ' ADMIN ★★★★★' : (vipTier ? ` ${vipTier.label}` : '');
        senderPrefix = `<span class="chat-bubble-sender ${senderClass}" onclick="openChatUserProfile(${msg.user_id || msg.UserId || 0}, '${escapeHtml(sender)}')">${escapeHtml(sender)}</span>${tag}<span class="chat-bubble-colon">:</span> `;
    }

    // Distinción de fondo del contenedor según sea Admin o tipo de VIP (Oro 3★, Plata 2★, Bronce 1★, o normal)
    let bubbleClass = 'chat-bubble';
    if (isAdmin) {
        bubbleClass += ' is-admin-msg';
    } else if (vipTier) {
        bubbleClass += ` ${vipTier.bubbleClass}`;
    }

    // Botón de eliminar para el autor o admin
    const canDelete = isSentByMe || currentChatUser.isAdmin || myUsername === 'admin';
    const deleteBtn = canDelete ? `
        <div class="chat-bubble-actions">
            <button type="button" class="btn-msg-delete" onclick="requestDeleteChatMessage(${msgId})" title="Eliminar mensaje">✕</button>
        </div>
    ` : '';

    // Si el mensaje es de Admin, la letra debe ser cursiva (font-style: italic)
    const adminTextStyle = isAdmin ? 'font-style:italic;' : '';
    const adminTextClass = isAdmin ? 'admin-text' : '';

    row.innerHTML = `
        <div class="${bubbleClass}">
            ${deleteBtn}
            <span class="chat-bubble-body">
                ${senderPrefix}
                <span class="chat-bubble-text ${adminTextClass}" id="msg-text-${msgId}" style="${adminTextStyle}">${escapeHtml(text)}</span>
                <span class="chat-bubble-footer">
                    <span class="chat-bubble-time">${dateStr}</span>
                    ${isSentByMe ? '<span class="chat-bubble-check">✓✓</span>' : ''}
                </span>
            </span>
        </div>
    `;

    feed.appendChild(row);
}

/**
 * Manejar mensaje entrante en tiempo real (Socket)
 */
function handleIncomingMessage(msg, isPrivate) {
    const myUsername = (currentChatUser?.username || '').toLowerCase();
    const sender = (msg.username || msg.Username || '').toLowerCase();
    const target = (msg.target_username || msg.TargetUsername || '').toLowerCase();
    const textSnippet = msg.mensaje || msg.Message || '';

    if (!isPrivate) {
        // Mensaje del canal Global
        if (!activeTargetUser) {
            renderMessageBubble(msg);
            const feed = document.getElementById('chat-messages-feed');
            if (feed) feed.scrollTop = feed.scrollHeight;
        } else {
            // Incrementar badge de canal global
            const badge = document.getElementById('global-unread-badge');
            if (badge) {
                const cur = parseInt(badge.textContent || '0', 10) + 1;
                badge.textContent = cur;
                badge.style.display = 'inline-block';
            }
        }
        const gTime = document.getElementById('global-last-time');
        const gPrev = document.getElementById('global-last-msg');
        if (gTime) gTime.textContent = 'Ahora';
        if (gPrev) gPrev.textContent = `${msg.username}: ${textSnippet.slice(0, 26)}`;
    } else {
        // Mensaje Privado
        const otherParty = (sender === myUsername) ? target : sender;
        const isCurrentConversation = activeTargetUser && activeTargetUser.username.toLowerCase() === otherParty;

        if (isCurrentConversation) {
            renderMessageBubble(msg);
            const feed = document.getElementById('chat-messages-feed');
            if (feed) feed.scrollTop = feed.scrollHeight;
        } else {
            // Incrementar contador de no leídos para ese usuario
            const cur = (unreadCounts.get(otherParty) || 0) + 1;
            unreadCounts.set(otherParty, cur);
            const badge = document.getElementById(`badge-${otherParty}`);
            if (badge) {
                badge.textContent = cur;
                badge.style.display = 'inline-block';
            }
        }

        const previewEl = document.getElementById(`preview-${otherParty}`);
        if (previewEl) {
            previewEl.textContent = textSnippet.slice(0, 30);
            previewEl.style.color = '#fff';
        }
    }
}

/**
 * Enviar mensaje (Global o Privado)
 */
function sendChatMessage() {
    const input = document.getElementById('chat-input-text');
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    const u = currentChatUser || {};
    const uid = u.id || 1;
    const username = u.username || 'Duelista';
    const avatar = u.avatarActivoId || 'AVA-002';
    const isAdmin = Boolean(u.isAdmin || (u.role && u.role.toLowerCase() === 'admin') || (username.toLowerCase() === 'admin'));

    if (activeTargetUser) {
        // Mensaje Privado a activeTargetUser
        const privatePayload = {
            userId: uid,
            username: username,
            avatar: avatar,
            level: u.nivel || 1,
            message: `/w @${activeTargetUser.username} ${text}`,
            isAdmin: isAdmin,
            isPrivate: true,
            targetUsername: activeTargetUser.username
        };
        if (chatSocket) chatSocket.emit('CHAT_MESSAGE', privatePayload);
    } else {
        // Mensaje Global
        const globalPayload = {
            userId: uid,
            username: username,
            avatar: avatar,
            level: u.nivel || 1,
            message: text,
            isAdmin: isAdmin,
            textColor: isAdmin ? '#FFD700' : '#FFFFFF'
        };
        if (chatSocket) chatSocket.emit('CHAT_MESSAGE', globalPayload);
    }

    input.value = '';
    input.focus();
}

/**
 * Solicitar eliminación de un mensaje
 */
function requestDeleteChatMessage(messageId) {
    const doDelete = async () => {
        if (chatSocket) {
            chatSocket.emit('CHAT_DELETE_MESSAGE', { messageId });
        } else {
            try {
                await fetch(`/api/chat/message/${messageId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: currentChatUser?.id || 1, isAdmin: currentChatUser?.isAdmin || false })
                });
            } catch(e) {}
        }
    };

    if (window.aniConfirm) {
        window.aniConfirm('ELIMINAR MENSAJE', '¿Deseas eliminar este mensaje?', doDelete);
    } else {
        doDelete();
    }
}

/**
 * Actualizar mensaje eliminado en la UI (se elimina de la visión del usuario)
 */
function handleMessageDeletedUI(messageId) {
    const rowEl = document.getElementById(`chat-msg-${messageId}`);
    if (rowEl) {
        rowEl.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        rowEl.style.opacity = '0';
        rowEl.style.transform = 'scale(0.95)';
        setTimeout(() => {
            if (rowEl) rowEl.remove();
        }, 200);
    }
}

/**
 * Limpiar / Vaciar conversación actual (soft delete en BD)
 */
function clearCurrentChatConversation() {
    const doClear = async () => {
        const targetName = activeTargetUser ? activeTargetUser.username : null;
        
        if (chatSocket) {
            chatSocket.emit('CHAT_CLEAR_CONVERSATION', { targetUsername: targetName || null });
        }

        try {
            await fetch('/api/chat/clear-conversation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentChatUser?.id || 1, targetUsername: targetName || null })
            });
        } catch(e) {
            console.error('Error al vaciar conversación:', e);
        }

        const feed = document.getElementById('chat-messages-feed');
        if (feed) {
            feed.innerHTML = `
                <div class="chat-msg-row system">
                    <div class="chat-bubble">Conversación vaciada.</div>
                </div>
            `;
        }
    };

    if (window.aniConfirm) {
        window.aniConfirm('VACIAR CHAT', '¿Deseas vaciar todos los mensajes de esta conversación?', doClear);
    } else {
        doClear();
    }
}

/**
 * Ver ficha de perfil del usuario de la conversación activa
 */
function inspectCurrentChatUserProfile() {
    if (activeTargetUser) {
        openChatUserProfile(activeTargetUser.id || 0, activeTargetUser.username);
    }
}

/**
 * Configuración de Escuchadores DOM
 */
function setupEventListeners() {
    const input = document.getElementById('chat-input-text');
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendChatMessage();
            }
        });
    }
}

/**
 * Abrir perfil del usuario activo al dar click en la cabecera
 */
function inspectCurrentChatUserProfile() {
    if (activeTargetUser && activeTargetUser.username) {
        openChatUserProfile(activeTargetUser.id, activeTargetUser.username);
    } else if (currentChatUser && currentChatUser.username && currentChatUser.username !== 'Invitado') {
        openChatUserProfile(currentChatUser.id, currentChatUser.username);
    }
}

/**
 * Ver Perfil de Jugador en Tarjeta Flotante (Con datos completos del SP dbo.sp_ObtenerDetallePerfilUsuario)
 */
async function openChatUserProfile(userId, username) {
    const widget = document.getElementById('chat-user-floating-widget');
    if (!widget) return;

    widget.style.display = 'block';
    widget.style.zIndex = ++topZIndex;
    document.getElementById('cup-username').textContent = username || 'Duelista';

    try {
        const res = await fetch(`/api/chat/user-profile/${encodeURIComponent(username || userId)}`);
        const data = await res.json();
        if (data.success && data.profile) {
            const p = data.profile;
            
            // 1. Identidad y País con Bandera (Imagen de BD / CDN)
            document.getElementById('cup-username').textContent = p.username || username;
            document.getElementById('cup-country-name').textContent = p.countryName || 'Internacional';
            
            const flagEl = document.getElementById('cup-country-flag-img');
            const iso = (p.countryIsoCode || 'CO').toLowerCase();
            const flagUrl = p.flagSvgUrl || `https://flagcdn.com/w80/${iso}.png`;
            if (flagEl) {
                flagEl.src = flagUrl;
                flagEl.onerror = () => { flagEl.src = `https://flagcdn.com/w80/${iso}.png`; };
                flagEl.style.display = 'inline-block';
            }

            // 2. Avatar y Estado
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

            // 3. Insignias y Tipo de VIP
            const lvl = p.nivel || p.level || 1;
            document.getElementById('cup-level-badge').textContent = `Nv. ${lvl}`;
            
            const vipBadge = document.getElementById('cup-vip-badge');
            if (vipBadge) {
                const isUserVip = Boolean(p.isVip || (p.vipUntil && new Date(p.vipUntil) > new Date()) || ((p.username || username || '').toLowerCase() === 'sofia'));
                const vCode = p.vipCode || (isUserVip ? 'VIP-004' : null);
                const vipTier = getVipTierInfo(vCode, isUserVip);
                if (vipTier) {
                    vipBadge.textContent = vipTier.fullLabel;
                    vipBadge.className = `chat-user-badge ${vipTier.tier}`;
                    vipBadge.style.display = 'inline-block';
                } else {
                    vipBadge.style.display = 'none';
                }
            }

            const adminBadge = document.getElementById('cup-admin-badge');
            if (adminBadge) {
                adminBadge.textContent = 'ADMIN ★★★★★';
                adminBadge.style.display = p.isAdmin ? 'inline-block' : 'none';
            }

            // 4. Progresión de Experiencia (Barra Elegante)
            const curExp = parseInt(p.exp || p.experiencia || 0, 10);
            const reqExp = (window.ProgressionClient && window.ProgressionClient.getExpRequiredForNextLevel)
                ? window.ProgressionClient.getExpRequiredForNextLevel(lvl)
                : (lvl * 250);
            const expPct = (window.ProgressionClient && window.ProgressionClient.getProgressPercent)
                ? window.ProgressionClient.getProgressPercent(lvl, curExp)
                : Math.min(100, Math.round((curExp / Math.max(1, reqExp)) * 100));

            const fillEl = document.getElementById('cup-exp-fill');
            if (fillEl) fillEl.style.width = `${expPct}%`;

            const expTextEl = document.getElementById('cup-exp-text');
            if (expTextEl) {
                expTextEl.textContent = (lvl >= 500) ? 'NIVEL MÁXIMO (500)' : `${curExp.toLocaleString()} / ${reqExp.toLocaleString()} EXP (${expPct}%)`;
            }

            // 5. Starships
            document.getElementById('cup-stat-starships').textContent = `${Number(p.starships || 0).toLocaleString()} ★`;

            // 6. Estadísticas de Duelos NPC y PVP
            document.getElementById('cup-npc-duels').textContent = p.stats?.npc?.totalDuels || 0;
            document.getElementById('cup-npc-wins').textContent = p.stats?.npc?.wins || 0;
            document.getElementById('cup-npc-losses').textContent = p.stats?.npc?.losses || 0;
            document.getElementById('cup-npc-wr').textContent = p.stats?.npc?.winRate || '0.0%';

            document.getElementById('cup-pvp-duels').textContent = p.stats?.pvp?.totalDuels || 0;
            document.getElementById('cup-pvp-wins').textContent = p.stats?.pvp?.wins || 0;
            document.getElementById('cup-pvp-losses').textContent = p.stats?.pvp?.losses || 0;
            document.getElementById('cup-pvp-wr').textContent = p.stats?.pvp?.winRate || '0.0%';

            // 7. Bonificaciones
            document.getElementById('cup-boost-exp').textContent = `+${p.boosts?.totalExp || p.boosts?.avatarExp || 0}%`;
            document.getElementById('cup-boost-star').textContent = `+${p.boosts?.totalStarships || p.boosts?.avatarStar || 0}%`;
            document.getElementById('cup-boost-luck').textContent = `+${p.boosts?.totalLuck || p.boosts?.avatarLuck || 0}%`;
        }
    } catch(e) {
        console.warn('[PROFILE LOAD ERROR]', e);
    }
}

function closeChatUserProfile() {
    const widget = document.getElementById('chat-user-floating-widget');
    if (widget) widget.style.display = 'none';
}

function initUserProfileDraggable() {
    const widget = document.getElementById('chat-user-floating-widget');
    const header = document.getElementById('chat-user-card-drag-header');
    if (!widget || !header) return;

    let isDragging = false, startX, startY, initLeft, initTop;

    header.onmousedown = (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = widget.getBoundingClientRect();
        initLeft = rect.left;
        initTop = rect.top;
        document.onmousemove = onMouseMove;
        document.onmouseup = onMouseUp;
    };

    function onMouseMove(e) {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        widget.style.left = `${Math.max(10, initLeft + dx)}px`;
        widget.style.top = `${Math.max(10, initTop + dy)}px`;
        widget.style.right = 'auto';
    }

    function onMouseUp() {
        isDragging = false;
        document.onmousemove = null;
        document.onmouseup = null;
    }
}

function startWhisperToCurrentUser() {
    const username = document.getElementById('cup-username').textContent.trim();
    closeChatUserProfile();
    if (username && username !== currentChatUser.username) {
        selectChatTarget({ username, id: 0, avatar: 'AVA-001', nivel: 1 });
    }
}

/**
 * ====================================================================
 * GESTIÓN DE VENTANAS FLOTANTES DE ADMINISTRADOR (INDEPENDIENTES Y NO MODALES)
 * ====================================================================
 */
let topZIndex = 1100;

/**
 * Abrir / Cerrar una ventana flotante específica
 */
function toggleFloatingWidget(widgetId) {
    const el = document.getElementById(widgetId);
    if (!el) return;
    const isHidden = (el.style.display === 'none' || !el.style.display);
    if (isHidden) {
        el.style.display = 'flex';
        el.style.zIndex = ++topZIndex;
        // Si es el historial de premios, refrescar datos automáticamente
        if (widgetId === 'floating-prizes-history') {
            loadEventsHistoryAdmin();
        }
    } else {
        el.style.display = 'none';
    }
}

/**
 * Minimizar / Expandir el contenido de una ventana flotante
 */
function toggleFloatingWidgetMinimize(widgetId) {
    const el = document.getElementById(widgetId);
    if (!el) return;
    const body = el.querySelector('.admin-floating-body');
    if (body) {
        const isHidden = body.style.display === 'none';
        body.style.display = isHidden ? 'block' : 'none';
    }
}

/**
 * Inicializar funcionalidad arrastrable (Draggable) para cualquier ventana flotante
 */
function initDraggableWidget(widgetId, headerId) {
    const widget = document.getElementById(widgetId);
    const header = document.getElementById(headerId);
    if (!widget || !header) return;

    let isDragging = false, startX, startY, initLeft, initTop;

    header.onmousedown = (e) => {
        // Traer la ventana al frente
        widget.style.zIndex = ++topZIndex;
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;

        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = widget.getBoundingClientRect();
        initLeft = rect.left;
        initTop = rect.top;
        document.onmousemove = onMouseMove;
        document.onmouseup = onMouseUp;
    };

    widget.onmousedown = () => {
        widget.style.zIndex = ++topZIndex;
    };

    function onMouseMove(e) {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const newLeft = Math.max(10, Math.min(window.innerWidth - widget.offsetWidth - 10, initLeft + dx));
        const newTop = Math.max(10, Math.min(window.innerHeight - 50, initTop + dy));
        widget.style.left = `${newLeft}px`;
        widget.style.top = `${newTop}px`;
        widget.style.right = 'auto';
    }

    function onMouseUp() {
        isDragging = false;
        document.onmousemove = null;
        document.onmouseup = null;
    }
}

/**
 * Cambio de Tipo de Evento en el Lanzador
 */
function onAdminEventTypeChange() {
    const type = document.getElementById('admin-event-type').value;
    const isWord = (type === 'WORD_COMPLETION' || type === 'GUESS_WORD');
    document.getElementById('admin-group-guess-word').style.display = isWord ? 'block' : 'none';
    document.getElementById('admin-group-trivia').style.display = (type === 'TRIVIA') ? 'block' : 'none';
}

/**
 * Algoritmo de Enmascarado Inteligente para el Frontend
 * Refleja exactamente el algoritmo del servidor
 */
function generateMaskedPrompt(phrase) {
    if (!phrase || typeof phrase !== 'string') return '';
    const clean = phrase.trim();
    if (!clean) return '';

    const words = clean.split(/\s+/);
    
    const maskedWords = words.map(word => {
        const chars = word.split('');
        const len = chars.length;

        if (len === 1) return '_';
        if (len === 2) return `_ ${chars[1]}`;

        const revealCount = Math.max(1, Math.min(len - 1, Math.round(len * 0.38)));
        const revealIndices = new Set();

        if (len <= 5) {
            revealIndices.add(1);
            if (revealCount > 1 && len >= 4) {
                revealIndices.add(3);
            }
        } else {
            const step = Math.max(2, Math.floor(len / revealCount));
            for (let i = 1; i < len; i += step) {
                if (revealIndices.size < revealCount) {
                    revealIndices.add(i);
                }
            }
            if (revealIndices.size < revealCount && len > 4) {
                revealIndices.add(len - 1);
            }
        }

        return chars.map((ch, idx) => {
            if (!/[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]/.test(ch)) {
                return ch;
            }
            return revealIndices.has(idx) ? ch : '_';
        }).join(' ');
    });

    return maskedWords.join('   ');
}

/**
 * Previsualización dinámica de la Palabra o Frase en tiempo real
 */
function updateHangmanPreview() {
    const ans = (document.getElementById('admin-event-answer').value || '').trim();
    const box = document.getElementById('admin-hangman-preview');
    if (!ans) {
        box.textContent = '_ _ _ _   _ _ _ _ _ _ _ _';
        return;
    }
    box.textContent = generateMaskedPrompt(ans);
}

/**
 * Lanzar Evento en Vivo (Sin campo de título, directo con Tipo y Palabra/Pregunta)
 */
async function launchLiveEventAdmin() {
    const type = document.getElementById('admin-event-type').value;
    const prizeText = (document.getElementById('admin-event-prize-text').value || '').trim() || '5,000 Starships + 2,500 EXP';
    const countdown = parseInt(document.getElementById('admin-event-countdown').value, 10) || 5;

    let answer = '';
    let question = '';

    if (type === 'WORD_COMPLETION' || type === 'GUESS_WORD') {
        answer = document.getElementById('admin-event-answer').value.trim();
        if (!answer) {
            if (window.aniAlert) window.aniAlert('Por favor especifica la palabra o frase a adivinar.', 'warning', 'CAMPO REQUERIDO');
            return;
        }
        question = '¡Completa la palabra o frase oculta!';
    } else {
        question = document.getElementById('admin-event-question').value.trim();
        answer = document.getElementById('admin-trivia-answer').value.trim();
        if (!question || !answer) {
            if (window.aniAlert) window.aniAlert('Por favor completa la pregunta y la respuesta de la trivia.', 'warning', 'CAMPOS REQUERIDOS');
            return;
        }
    }

    try {
        const res = await fetch('/api/chat/events/launch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                eventType: (type === 'WORD_COMPLETION' || type === 'GUESS_WORD') ? 'WORD_COMPLETION' : 'TRIVIA',
                correctAnswer: answer,
                questionOrPrompt: question,
                prizeText: prizeText,
                countdownSeconds: countdown,
                launchedBy: currentChatUser?.username || 'Admin'
            })
        });
        const data = await res.json();
        if (!data.success) {
            if (window.aniAlert) window.aniAlert(data.message || 'Error al iniciar evento.', 'error', 'ERROR AL LANZAR');
        } else {
            toggleFloatingWidget('floating-event-launcher');
        }
    } catch(e) {
        if (window.aniAlert) window.aniAlert('Error al lanzar evento.', 'error', 'ERROR');
    }
}

/**
 * Cancelar Evento Activo
 */
function cancelLiveEventAdmin() {
    const doCancel = async () => {
        try {
            await fetch('/api/chat/events/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cancelledBy: currentChatUser?.username || 'Admin' })
            });
        } catch(e) {}
    };

    if (window.aniConfirm) {
        window.aniConfirm('CANCELAR EVENTO', '¿Deseas cancelar el evento activo actualmente?', doCancel);
    } else {
        doCancel();
    }
}

/**
 * Bloquear / Desbloquear Chat General (Clic Directo en Cabecera o API)
 */
let isCurrentChatMuted = false;

function onHeaderStatusPillClick() {
    const isAdmin = Boolean(currentChatUser && (
        (currentChatUser.role && currentChatUser.role.toLowerCase() === 'admin') ||
        (currentChatUser.username && currentChatUser.username.toLowerCase() === 'admin') ||
        currentChatUser.isAdmin
    ));
    if (!isAdmin) return;
    toggleChatMuteAdmin();
}

async function toggleChatMuteAdmin() {
    const nextMuteState = !isCurrentChatMuted;
    try {
        await fetch('/api/chat/mute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isMuted: nextMuteState, by: currentChatUser?.username || 'Admin' })
        });
    } catch(e) {
        console.warn('[TOGGLE MUTE ERROR]', e);
    }
}

function updateChatMutedUI(isMuted, by) {
    isCurrentChatMuted = Boolean(isMuted);
    const pill = document.getElementById('chat-status-pill');
    const lbl = document.getElementById('chat-status-label');

    if (isCurrentChatMuted) {
        if (pill) pill.classList.add('is-muted');
        if (lbl) lbl.textContent = 'CHAT BLOQUEADO';
    } else {
        if (pill) pill.classList.remove('is-muted');
        if (lbl) lbl.textContent = 'EN VIVO';
    }
}

/**
 * ====================================================================
 * GESTIÓN DE MENSAJES FIJADOS (HASTA 3 MENSAJES CON COLOR PERSONALIZADO)
 * ====================================================================
 */
let pinSlotColors = {
    1: '#00F0FF',
    2: '#FFD700',
    3: '#00FF88'
};

function selectSlotColor(slotIndex, colorHex, el) {
    pinSlotColors[slotIndex] = colorHex;
    const palette = document.getElementById(`pin-color-palette-${slotIndex}`);
    if (palette) {
        palette.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
    }
    if (el) el.classList.add('active');
}

/**
 * Guardar y fijar mensajes configurados (hasta 3 en 1 sola línea)
 */
async function savePinnedMessagesAdmin() {
    const msg1 = (document.getElementById('admin-pin-input-1')?.value || '').trim();
    const msg2 = (document.getElementById('admin-pin-input-2')?.value || '').trim();
    const msg3 = (document.getElementById('admin-pin-input-3')?.value || '').trim();

    const items = [];
    if (msg1) items.push({ text: msg1, color: pinSlotColors[1] || '#00F0FF' });
    if (msg2) items.push({ text: msg2, color: pinSlotColors[2] || '#FFD700' });
    if (msg3) items.push({ text: msg3, color: pinSlotColors[3] || '#00FF88' });

    if (items.length === 0) {
        await clearPinnedMessagesAdmin();
        return;
    }

    try {
        await fetch('/api/chat/pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: JSON.stringify(items),
                color: items[0].color || '#00F0FF',
                by: currentChatUser?.username || 'Admin'
            })
        });
        toggleFloatingWidget('floating-pinned-manager');
    } catch(e) {
        console.warn('[PIN ERROR]', e);
    }
}

/**
 * Quitar todos los mensajes fijados
 */
async function clearPinnedMessagesAdmin() {
    try {
        await fetch('/api/chat/pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: '', color: '#00F0FF', by: currentChatUser?.username || 'Admin' })
        });
        const i1 = document.getElementById('admin-pin-input-1');
        const i2 = document.getElementById('admin-pin-input-2');
        const i3 = document.getElementById('admin-pin-input-3');
        if (i1) i1.value = '';
        if (i2) i2.value = '';
        if (i3) i3.value = '';
    } catch(e) {}
}

/**
 * Renderizar mensajes fijados en el banner superior (1 sola línea, sin iconos, sin negrita)
 */
function updatePinnedBannerUI(message, color) {
    const banner = document.getElementById('chat-pinned-banner');
    const container = document.getElementById('chat-pinned-container');
    if (!banner || !container) return;

    let items = [];
    if (message && typeof message === 'string' && message.trim() !== '') {
        try {
            const parsed = JSON.parse(message);
            if (Array.isArray(parsed)) {
                items = parsed.filter(x => x && x.text && String(x.text).trim() !== '');
            } else if (parsed && parsed.text) {
                items = [parsed];
            }
        } catch(e) {
            items = [{ text: message, color: color || '#00F0FF' }];
        }
    }

    if (items.length === 0) {
        banner.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    banner.style.display = 'flex';
    container.innerHTML = items.map(it => {
        const safeText = escapeHtml(it.text);
        const safeCol = it.color || color || '#00F0FF';
        return `<span class="chat-pinned-item" style="color:${safeCol};">${safeText}</span>`;
    }).join('<span class="chat-pinned-sep">|</span>');

    // Sincronizar los campos del modal de fijados para que el admin vea lo actual
    const i1 = document.getElementById('admin-pin-input-1');
    const i2 = document.getElementById('admin-pin-input-2');
    const i3 = document.getElementById('admin-pin-input-3');
    if (items[0] && i1 && !i1.value) {
        i1.value = items[0].text;
        const dot1 = document.querySelector(`#pin-color-palette-1 [data-color="${items[0].color || '#00F0FF'}"]`);
        if (dot1) selectSlotColor(1, items[0].color || '#00F0FF', dot1);
    }
    if (items[1] && i2 && !i2.value) {
        i2.value = items[1].text;
        const dot2 = document.querySelector(`#pin-color-palette-2 [data-color="${items[1].color || '#FFD700'}"]`);
        if (dot2) selectSlotColor(2, items[1].color || '#FFD700', dot2);
    }
    if (items[2] && i3 && !i3.value) {
        i3.value = items[2].text;
        const dot3 = document.querySelector(`#pin-color-palette-3 [data-color="${items[2].color || '#00FF88'}"]`);
        if (dot3) selectSlotColor(3, items[2].color || '#00FF88', dot3);
    }
}

function renderEventCountdownUI(data) {
    const container = document.getElementById('chat-live-event-container');
    if (!container) return;
    const isTrivia = (data.eventType === 'TRIVIA');
    const typeLabel = isTrivia ? 'TRIVIA' : 'ADIVINA LA PALABRA O FRASE';

    container.style.display = 'block';
    container.innerHTML = `
        <div class="chat-live-event-banner">
            <span class="chat-event-inline-title">PRÓXIMO EVENTO: ${escapeHtml(typeLabel)}</span>
            <span class="chat-event-inline-sep">|</span>
            <span class="chat-event-inline-countdown">Iniciando en ${data.remainingSeconds || data.secondsRemaining || 0}s</span>
            <span class="chat-event-inline-sep">|</span>
            <span class="chat-event-inline-prize">Premio: <span>${escapeHtml(data.prize || '5,000 Starships + 2,500 EXP')}</span></span>
        </div>
    `;
}

function renderEventLiveChallengeUI(data) {
    const container = document.getElementById('chat-live-event-container');
    if (!container) return;
    const isTrivia = (data.eventType === 'TRIVIA');
    const typeLabel = isTrivia ? 'TRIVIA' : 'ADIVINA LA PALABRA O FRASE';

    container.style.display = 'block';
    container.innerHTML = `
        <div class="chat-live-event-banner">
            <span class="chat-event-inline-title">EVENTO EN VIVO: ${escapeHtml(typeLabel)}</span>
            <span class="chat-event-inline-sep">|</span>
            ${isTrivia 
                ? `<span class="chat-event-inline-trivia">${escapeHtml(data.prompt || data.questionOrPrompt || data.questionText || '')}</span>`
                : `<span class="chat-event-inline-word">${escapeHtml(data.maskedPrompt || data.maskedPhrase || '')}</span>`
            }
            <span class="chat-event-inline-sep">|</span>
            <span class="chat-event-inline-prize">Premio: <span>${escapeHtml(data.prizeText || 'Premio Especial')}</span></span>
        </div>
    `;
}

function renderEventWinnerUI(data) {
    const container = document.getElementById('chat-live-event-container');
    if (!container) return;
    const winnerName = data.winner || data.winnerUsername || 'Duelista';
    const answerText = data.correctAnswer || data.answer || '';

    container.style.display = 'block';
    container.innerHTML = `
        <div class="chat-live-event-banner winner">
            <span class="chat-event-inline-title" style="color:#00ff88;">EVENTO FINALIZADO</span>
            <span class="chat-event-inline-sep">|</span>
            <span class="chat-event-inline-winner">@${escapeHtml(winnerName)} acertó: "${escapeHtml(answerText)}"</span>
            <span class="chat-event-inline-sep">|</span>
            <span class="chat-event-inline-prize">Premio: <span>${escapeHtml(data.prizeText || 'Entregado')}</span></span>
        </div>
    `;
    setTimeout(() => {
        container.style.display = 'none';
    }, 10000);
}

/**
 * Cargar y Renderizar Historial de Premios en Tabla Espaciosa
 */
async function loadEventsHistoryAdmin() {
    const tbody = document.getElementById('admin-prizes-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:18px; color:#94a3b8;">Cargando historial de premios...</td></tr>';
    try {
        const res = await fetch('/api/chat/events/history');
        const data = await res.json();
        if (data.success && data.events) {
            if (data.events.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:18px; color:#94a3b8;">No hay eventos registrados aún.</td></tr>';
                return;
            }
            tbody.innerHTML = data.events.map(ev => {
                const isDelivered = (ev.PrizeStatus === 'DELIVERED');
                const dateStr = ev.CreatedAt ? new Date(ev.CreatedAt).toLocaleDateString([], { hour: '2-digit', minute: '2-digit' }) : '-';
                const winnerText = ev.WinnerUsername ? `@${escapeHtml(ev.WinnerUsername)}` : '<span style="color:#64748b;">Sin ganador</span>';
                return `
                <tr>
                    <td style="color:#64748b; font-size:10px; white-space:nowrap;">${dateStr}</td>
                    <td style="color:#f1f5f9; font-size:10.5px;">${escapeHtml(ev.QuestionOrPrompt || ev.Title || ev.EventType || 'Desafío')}</td>
                    <td style="color:#e2e8f0; font-size:10.5px; font-weight:500;">${winnerText}</td>
                    <td style="color:#ffd700; font-size:10.5px; font-weight:500;">${escapeHtml(ev.PrizeText || '5,000 Starships')}</td>
                    <td style="text-align:center;">
                        <span class="prizes-badge ${isDelivered ? 'delivered' : 'pending'}">
                            ${isDelivered ? 'ENTREGADO' : 'PENDIENTE'}
                        </span>
                    </td>
                    <td style="text-align:center;">
                        <button type="button" class="btn-prize-action ${isDelivered ? 'btn-prize-pending' : 'btn-prize-deliver'}" onclick="togglePrizeDeliveryAdmin(${ev.Id}, '${ev.PrizeStatus}')">
                            ${isDelivered ? 'PENDIENTE' : 'ENTREGAR'}
                        </button>
                    </td>
                </tr>
            `;
            }).join('');
        }
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:18px; color:#f43f5e;">Error al cargar historial.</td></tr>';
    }
}

/**
 * Alternar Entrega de Premio
 */
async function togglePrizeDeliveryAdmin(eventId, currentStatus) {
    try {
        await fetch('/api/chat/events/toggle-delivery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventId, prizeStatus: (currentStatus === 'DELIVERED') ? 'PENDING' : 'DELIVERED' })
        });
        loadEventsHistoryAdmin();
    } catch(e) {}
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
