/**
 * ANI-DIMENSION: CONTROLADOR DE VISTA DE SUBASTAS DE CARTAS EN VIVO (USUARIOS)
 * Soporta multi-subastas simultáneas, selector interactivo, WebSockets en tiempo real y retención de estrellas.
 */

let currentSubastaUser = null;
let activeAuctionsList = [];
let selectedAuctionId = null;
let activeAuctionData = null;
let activeAuctionBids = [];
let subastaSocket = null;
let countdownTimerInterval = null;

async function initEventosSubastaView() {
    currentSubastaUser = window.Session ? window.Session.getUser() : null;
    if (!currentSubastaUser) {
        currentSubastaUser = { id: 1, username: 'Invitado', role: 'user', starships: 0 };
    }

    updateUserBalanceDisplay(currentSubastaUser.starships || 0);

    // Inicializar Socket
    initSubastaSocket();

    // Cargar datos de las subastas activas
    await fetchActiveAuctionsData();
    setInterval(fetchActiveAuctionsData, 8000);
}

function updateUserBalanceDisplay(balance) {
    const valEl = document.getElementById('subasta-user-stars-val');
    if (valEl) {
        valEl.textContent = Number(balance).toLocaleString();
    }
}

function initSubastaSocket() {
    subastaSocket = window.getSocket ? window.getSocket() : (window.socket || (typeof io !== 'undefined' ? io() : null));
    if (!subastaSocket && typeof io !== 'undefined') {
        subastaSocket = io();
    }

    if (!subastaSocket) return;

    subastaSocket.off('SUBASTA_NUEVA_PUJA');
    subastaSocket.on('SUBASTA_NUEVA_PUJA', () => fetchActiveAuctionsData());

    subastaSocket.off('SUBASTA_FINALIZADA');
    subastaSocket.on('SUBASTA_FINALIZADA', () => fetchActiveAuctionsData());

    subastaSocket.off('SUBASTA_NUEVA_CREADA');
    subastaSocket.on('SUBASTA_NUEVA_CREADA', () => fetchActiveAuctionsData());

    subastaSocket.off('SUBASTA_UPDATED');
    subastaSocket.on('SUBASTA_UPDATED', () => fetchActiveAuctionsData());

    subastaSocket.off('SUBASTA_CANCELLED');
    subastaSocket.on('SUBASTA_CANCELLED', () => fetchActiveAuctionsData());
}

async function fetchActiveAuctionsData() {
    try {
        const url = selectedAuctionId ? `/api/subastas/active?subastaId=${selectedAuctionId}` : '/api/subastas/active';
        const res = await fetch(url);
        const data = await res.json();

        if (data.success) {
            activeAuctionsList = data.auctions || [];
            activeAuctionData = data.auction || null;
            activeAuctionBids = data.bids || [];

            if (activeAuctionsList.length > 0) {
                const stillActive = activeAuctionsList.find(a => a.Id === selectedAuctionId);
                if (!stillActive) {
                    selectedAuctionId = activeAuctionsList[0].Id;
                    activeAuctionData = activeAuctionsList[0];
                }
            } else {
                selectedAuctionId = null;
            }

            renderMultiAuctionStrip();
            renderAuctionUI();
        } else {
            renderEmptyState('No hay subastas activas en este momento.');
        }
    } catch (e) {
        console.error('[FETCH AUCTIONS ERROR]', e);
    }
}

function renderMultiAuctionStrip() {
    const stripContainer = document.getElementById('subasta-active-strip-container');
    const strip = document.getElementById('subasta-active-strip');
    const countBadge = document.getElementById('subasta-active-badge-count');

    if (!stripContainer || !strip) return;

    if (activeAuctionsList.length <= 1) {
        stripContainer.style.display = 'none';
        return;
    }

    stripContainer.style.display = 'block';
    if (countBadge) countBadge.textContent = activeAuctionsList.length;

    strip.innerHTML = activeAuctionsList.map(a => {
        const isSelected = (selectedAuctionId === a.Id);
        const secs = a.SecondsRemaining || 0;
        const mins = Math.ceil(secs / 60);

        return `
            <div class="subasta-strip-item ${isSelected ? 'active' : ''}" onclick="selectActiveAuction(${a.Id})">
                <img src="${a.ImageUrl || `https://images.ygoprodeck.com/images/cards_small/${a.CardCode}.jpg`}" onerror="this.onerror=null; this.src='/assets/images/cards/ava-002.png';">
                <div>
                    <div class="subasta-strip-name">${escapeHtml(a.CardName)}</div>
                    <div style="display:flex; gap:8px; align-items:center;">
                        <span class="subasta-strip-price">⭐ ${Number(a.CurrentPrice).toLocaleString()}</span>
                        <span class="subasta-strip-timer">⏳ ${mins}m</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function selectActiveAuction(auctionId) {
    selectedAuctionId = auctionId;
    fetchActiveAuctionsData();
}

function renderAuctionUI() {
    const container = document.getElementById('subasta-container');
    if (!container) return;

    if (!activeAuctionData || (activeAuctionsList.length === 0 && activeAuctionData.Status !== 'ACTIVE')) {
        renderNoActiveAuctionsState(activeAuctionData);
        return;
    }

    const a = activeAuctionData;
    const isFinished = a.Status === 'FINISHED' || a.Status === 'CANCELLED' || (a.Status === 'ACTIVE' && a.SecondsRemaining !== undefined && a.SecondsRemaining <= 0);
    const minIncrement = a.MinBidIncrement || 50;
    const currentPrice = a.CurrentPrice || a.InitialPrice;
    const nextMinBid = a.HighestBidderId ? (currentPrice + minIncrement) : currentPrice;
    const highestBidder = a.HighestBidderUsername || 'Sin ofertas todavía';
    const isMeHighest = currentSubastaUser && a.HighestBidderUsername && (currentSubastaUser.username.toLowerCase() === a.HighestBidderUsername.toLowerCase());

    const rarityCol = a.CardRarity === 'SECRET_RARE' ? '#ec4899' : a.CardRarity === 'ULTRA_RARE' ? '#ffd700' : a.CardRarity === 'SUPER_RARE' ? '#00f0ff' : '#94a3b8';
    const imgUrl = a.ImageUrl || `https://images.ygoprodeck.com/images/cards_small/${a.CardCode}.jpg`;

    let bidsHtml = '';
    if (activeAuctionBids.length === 0) {
        bidsHtml = `<div style="text-align:center; padding:15px; color:#64748b; font-size:10px;">Aún no se han realizado ofertas. ¡Sé el primer postor!</div>`;
    } else {
        bidsHtml = activeAuctionBids.map((b, idx) => {
            const isTop = (idx === 0);
            const statusClass = b.Status ? b.Status.toLowerCase() : 'held';
            const statusText = b.Status === 'WON' ? '🏆 GANADOR' : (b.Status === 'REFUNDED' ? 'REINTEGRADO' : 'RETENIDO');
            const isMyBid = currentSubastaUser && b.Username && (currentSubastaUser.username.toLowerCase() === b.Username.toLowerCase());

            return `
                <div class="subasta-bid-row ${isTop ? 'is-highest' : ''}">
                    <div class="subasta-bid-user">
                        <span>${isTop ? '👑' : '👤'}</span>
                        <span style="${isMyBid ? 'color:#00f0ff; font-weight:700;' : ''}">${escapeHtml(b.Username)} ${isMyBid ? '(Tú)' : ''}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span class="subasta-bid-amount">⭐ ${Number(b.BidAmount).toLocaleString()}</span>
                        <span class="subasta-bid-status ${statusClass}">${statusText}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    container.innerHTML = `
        <div class="subasta-main-layout">
            
            <!-- COLUMNA IZQUIERDA: CARTA EN SUBASTA -->
            <div class="subasta-card-display">
                <span class="subasta-card-rarity-pill" style="border-color:${rarityCol}; color:${rarityCol};">
                    ${a.CardRarity || 'ULTRA_RARE'}
                </span>
                
                <div class="subasta-card-name">${escapeHtml(a.CardName)}</div>
                <div class="subasta-card-meta">Código OCG: #${a.CardCode} • ${escapeHtml(a.CardType || 'Monster')}</div>

                <div class="subasta-card-img-wrap">
                    <img src="${imgUrl}" onerror="this.onerror=null; this.src='https://images.ygoprodeck.com/images/cards/${a.CardCode}.jpg';" class="subasta-card-img" alt="${a.CardName}">
                </div>

                <div style="font-size:9.5px; color:#94a3b8; text-align:center; margin-top:4px;">
                    Subasta ID: <b>#${a.Id}</b> • Creador: <b>${escapeHtml(a.CreatedBy || 'Admin')}</b>
                </div>
            </div>

            <!-- COLUMNA DERECHA: ESTADO, TIEMPO, PUJA E HISTORIAL -->
            <div class="subasta-details-panel">
                
                <!-- ESTADO Y CONTADORES -->
                <div class="subasta-status-card">
                    <div class="subasta-stat-item">
                        <span class="subasta-stat-label">PRECIO ACTUAL</span>
                        <span class="subasta-stat-value gold">⭐ ${Number(currentPrice).toLocaleString()}</span>
                    </div>

                    <div class="subasta-stat-item">
                        <span class="subasta-stat-label">MÁXIMO POSTOR</span>
                        <span class="subasta-stat-value ${isMeHighest ? 'cyan' : ''}" style="font-size:12.5px;">
                            ${escapeHtml(highestBidder)} ${isMeHighest ? '🌟 (Tú)' : ''}
                        </span>
                    </div>

                    <div class="subasta-stat-item">
                        <span class="subasta-stat-label">TIEMPO RESTANTE</span>
                        <span class="subasta-stat-value timer" id="subasta-timer-val">
                            ${isFinished ? 'FINALIZADA' : 'CALCULANDO...'}
                        </span>
                    </div>
                </div>

                <!-- CAJA DE ACCIÓN PARA PUJAR -->
                ${!isFinished ? `
                    <div class="subasta-bidding-box">
                        <div class="subasta-bidding-title">
                            <span>REALIZAR UNA PUJA</span>
                            <span style="font-size:9px; color:#94a3b8;">Mínimo permitido: <b>⭐ ${Number(nextMinBid).toLocaleString()}</b></span>
                        </div>

                        <div class="subasta-input-row">
                            <input type="number" id="subasta-bid-input" class="subasta-bid-input" value="${nextMinBid}" min="${nextMinBid}" step="${minIncrement}" placeholder="Estrellas a pujar">
                            <button type="button" class="btn-bid-submit" id="btn-submit-bid" onclick="onPlaceBidClick()">
                                CONFIRMAR PUJA
                            </button>
                        </div>

                        <div class="subasta-quick-bids">
                            <span style="font-size:9px; color:#94a3b8; margin-right:4px; align-self:center;">Pujas rápidas:</span>
                            <button class="btn-quick-bid" onclick="setQuickBid(${nextMinBid})">Mínima (⭐ ${Number(nextMinBid).toLocaleString()})</button>
                            <button class="btn-quick-bid" onclick="setQuickBid(${nextMinBid + minIncrement})">+⭐ ${minIncrement}</button>
                            <button class="btn-quick-bid" onclick="setQuickBid(${nextMinBid + (minIncrement * 2)})">+⭐ ${minIncrement * 2}</button>
                            <button class="btn-quick-bid" onclick="setQuickBid(${nextMinBid + (minIncrement * 5)})">+⭐ ${minIncrement * 5}</button>
                        </div>

                        <div class="subasta-escrow-note">
                            ℹ️ Al enviar la puja, el sistema retendrá inmediatamente <b>⭐ <span id="held-stars-preview">${Number(nextMinBid).toLocaleString()}</span></b> de tu saldo. Si otro jugador supera tu oferta, se te reintegrarán automáticamente.
                        </div>
                    </div>
                ` : `
                    <div class="subasta-bidding-box" style="border-color:rgba(255,215,0,0.4); background:rgba(255,215,0,0.05);">
                        <div style="text-align:center; padding:8px;">
                            <div style="font-family:'Orbitron',sans-serif; font-size:12px; color:#ffd700; font-weight:800; margin-bottom:4px;">
                                🏆 SUBASTA FINALIZADA
                            </div>
                            <div style="font-size:11px; color:#ffffff;">
                                Ganador oficial: <b>${escapeHtml(highestBidder)}</b> por <b>⭐ ${Number(currentPrice).toLocaleString()}</b>
                            </div>
                            <div style="font-size:9.5px; color:#00ff88; margin-top:2px;">
                                La carta ha sido transferida directamente a su Buzón de Recompensas.
                            </div>
                        </div>
                    </div>
                `}

                <!-- HISTORIAL DE OFERTAS EN VIVO -->
                <div class="subasta-history-card">
                    <div class="subasta-history-title">
                        <span>HISTORIAL DE OFERTAS (${activeAuctionBids.length})</span>
                        <span style="font-size:8.5px; color:#00ff88;">• EN VIVO</span>
                    </div>

                    <div class="subasta-bids-list">
                        ${bidsHtml}
                    </div>
                </div>

            </div>
        </div>
    `;

    // Iniciar temporizador usando tiempo seguro del servidor
    if (!isFinished) {
        startCountdown(a.EndsAtMs, a.SecondsRemaining);
    }

    const inputEl = document.getElementById('subasta-bid-input');
    if (inputEl) {
        inputEl.addEventListener('input', () => {
            const previewEl = document.getElementById('held-stars-preview');
            if (previewEl) {
                const val = parseInt(inputEl.value, 10) || 0;
                previewEl.textContent = Number(val).toLocaleString();
            }
        });
    }
}

function setQuickBid(val) {
    const inputEl = document.getElementById('subasta-bid-input');
    const previewEl = document.getElementById('held-stars-preview');
    if (inputEl) {
        inputEl.value = val;
        if (previewEl) previewEl.textContent = Number(val).toLocaleString();
    }
}

function startCountdown(endsAtMs, secondsRemaining) {
    if (countdownTimerInterval) clearInterval(countdownTimerInterval);

    const safeSecs = (secondsRemaining !== undefined && secondsRemaining !== null && secondsRemaining > 0) 
        ? secondsRemaining 
        : 0;

    const targetMs = (safeSecs > 0)
        ? (Date.now() + (safeSecs * 1000))
        : (endsAtMs || Date.now());

    function tick() {
        const now = Date.now();
        const diff = targetMs - now;

        const timerEl = document.getElementById('subasta-timer-val');
        if (!timerEl) return;

        if (diff <= 0) {
            timerEl.textContent = 'FINALIZADA';
            timerEl.style.color = '#ff0055';
            clearInterval(countdownTimerInterval);
            setTimeout(fetchActiveAuctionsData, 2500);
            return;
        }

        const totalSecs = Math.floor(diff / 1000);
        const days = Math.floor(totalSecs / 86400);
        const hours = Math.floor((totalSecs % 86400) / 3600);
        const minutes = Math.floor((totalSecs % 3600) / 60);
        const seconds = totalSecs % 60;

        let display = '';
        if (days > 0) {
            display = `${days}d ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        } else {
            display = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }

        timerEl.textContent = display;
    }

    tick();
    countdownTimerInterval = setInterval(tick, 1000);
}

function renderNoActiveAuctionsState(lastAuction) {
    const container = document.getElementById('subasta-container');
    if (!container) return;

    let lastHtml = '';
    if (lastAuction) {
        lastHtml = `
            <div style="margin-top:20px; background:rgba(15,23,42,0.85); border:1px solid rgba(255,215,0,0.35); border-radius:8px; padding:16px 20px; text-align:left; max-width:520px; margin-left:auto; margin-right:auto; box-shadow:0 6px 20px rgba(0,0,0,0.5);">
                <div style="font-family:'Orbitron',sans-serif; font-size:10px; font-weight:800; color:#ffd700; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
                    <span>🏆</span> ÚLTIMA SUBASTA FINALIZADA
                </div>
                <div style="display:flex; align-items:center; gap:14px;">
                    <img src="${lastAuction.ImageUrl || `https://images.ygoprodeck.com/images/cards_small/${lastAuction.CardCode}.jpg`}" onerror="this.onerror=null; this.src='/assets/card_back.jpg';" style="width:44px; height:64px; object-fit:cover; border-radius:4px; border:1px solid #ffd700;">
                    <div>
                        <div style="font-weight:700; font-size:13px; color:#fff;">${escapeHtml(lastAuction.CardName)}</div>
                        <div style="font-size:10.5px; color:#94a3b8; margin:3px 0;">Ganador Oficial: <b style="color:#00ff88;">${escapeHtml(lastAuction.HighestBidderUsername || 'Sin ofertas')}</b></div>
                        <div style="font-size:11.5px; color:#ffd700; font-family:'Orbitron',sans-serif; font-weight:700;">⭐ ${Number(lastAuction.CurrentPrice || lastAuction.InitialPrice).toLocaleString()} Estrellas</div>
                    </div>
                </div>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="subasta-empty-state" style="padding:48px 20px; text-align:center;">
            <div style="font-size:42px; margin-bottom:12px;">⚖️</div>
            <div style="font-family:'Orbitron',sans-serif; font-size:15px; font-weight:800; color:#00f0ff; letter-spacing:0.8px;">
                NO HAY SUBASTAS EN VIVO EN ESTE MOMENTO
            </div>
            <div style="font-size:12px; color:#94a3b8; max-width:480px; margin:10px auto 0 auto; line-height:1.5;">
                Las subastas de cartas son eventos temporales exclusivos. El Administrador publicará nuevas cartas próximamente. ¡Mantén tus estrellas listas!
            </div>
            ${lastHtml}
        </div>
    `;
}

function showSubastaUserToast(message, type = 'info') {
    let toast = document.getElementById('subasta-user-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'subasta-user-toast';
        toast.className = 'subasta-toast';
        document.body.appendChild(toast);
    }
    toast.className = `subasta-toast ${type} show`;
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;

    if (window._subastaUserToastTimeout) clearTimeout(window._subastaUserToastTimeout);
    window._subastaUserToastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

async function onPlaceBidClick() {
    const inputEl = document.getElementById('subasta-bid-input');
    const btn = document.getElementById('btn-submit-bid');
    if (!inputEl || !activeAuctionData) return;

    const amount = parseInt(inputEl.value, 10);
    if (!amount || isNaN(amount) || amount <= 0) {
        showSubastaUserToast('Ingresa una cantidad válida de estrellas.', 'warning');
        return;
    }

    const minIncrement = activeAuctionData.MinBidIncrement || 50;
    const currentPrice = activeAuctionData.CurrentPrice || activeAuctionData.InitialPrice;
    const nextMinBid = activeAuctionData.HighestBidderId ? (currentPrice + minIncrement) : currentPrice;

    if (amount < nextMinBid) {
        showSubastaUserToast(`La puja mínima debe ser de al menos ⭐ ${Number(nextMinBid).toLocaleString()}`, 'warning');
        return;
    }

    try {
        if (btn) btn.disabled = true;

        const res = await fetch('/api/subastas/bid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subastaId: activeAuctionData.Id,
                userId: currentSubastaUser.id,
                username: currentSubastaUser.username,
                bidAmount: amount
            })
        });

        const data = await res.json();

        if (data.success) {
            showSubastaUserToast(data.message || '¡Puja registrada exitosamente!', 'success');
            if (data.newBalance !== undefined) {
                currentSubastaUser.starships = data.newBalance;
                if (window.Session) window.Session.setUser(currentSubastaUser);
                updateUserBalanceDisplay(data.newBalance);
            }
            await fetchActiveAuctionsData();
        } else {
            showSubastaUserToast(data.message || 'No se pudo registrar la puja.', 'error');
        }
    } catch (e) {
        console.error('[BID ERROR]', e);
        showSubastaUserToast('Error de conexión al procesar la puja.', 'error');
    } finally {
        if (btn) btn.disabled = false;
    }
}

function renderEmptyState(message) {
    const container = document.getElementById('subasta-container');
    if (container) {
        container.innerHTML = `
            <div class="subasta-empty-state">
                <div style="font-size:26px; margin-bottom:8px;">⚖️</div>
                <div>${escapeHtml(message)}</div>
            </div>
        `;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
