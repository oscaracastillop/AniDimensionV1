/**
 * JS Lógica para la Tienda de Pases VIP AD
 * Ani-Dimension - SINCRONIZACIÓN 1:1 CON GERENCIA VIP Y SUSCRIPCIÓN TEMPORAL
 */

    let currentCurrencyFilter = 'ALL';

    function getUserStarshipsBalance() {
        if (window.Session && typeof window.Session.getStarships === 'function') {
            return window.Session.getStarships();
        }
        return 0;
    }

    function updateBalanceDisplay() {
        const coinEl = document.getElementById('shop-user-coins');
        if (coinEl) {
            coinEl.textContent = `⭐ ${getUserStarshipsBalance().toLocaleString()}`;
        }
    }

    function renderShopVipGrid() {
        const container = document.getElementById('shop-vip-grid-container');
        if (!container) return;

        if (typeof VipManager === 'undefined') {
            console.error('VipManager no disponible');
            return;
        }

        let passes = VipManager.getActiveVipPasses();

        if (currentCurrencyFilter === 'STARSHIPS') {
            passes = passes.filter(v => (v.currency || 'STARSHIPS') === 'STARSHIPS');
        } else if (currentCurrencyFilter === 'USD') {
            passes = passes.filter(v => (v.currency || 'STARSHIPS') === 'USD');
        }

        if (!passes || passes.length === 0) {
            container.innerHTML = `
                <div class="shop-empty-category-container">
                    <div class="shop-empty-icon" style="color:#c084fc;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:100%; height:100%;">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                    </div>
                    <div class="shop-empty-title">NO HAY PASES VIP DISPONIBLES</div>
                    <div class="shop-empty-desc">No se encontraron membresías activas con el filtro seleccionado.</div>
                </div>
            `;
            return;
        }

        let gridHtml = '';

        passes.forEach(pass => {
            const currency = pass.currency || 'STARSHIPS';
            const rawPrice = parseFloat(pass.price || 0);
            const bannerText = pass.offer_text || 'VIP';
            const days = parseInt(pass.days || 3, 10);
            const code = pass.code || '';

            const expText = parseFloat(pass.exp_boost || 0).toFixed(1);
            const starText = parseFloat(pass.starships_boost || 0).toFixed(1);
            const luckText = parseFloat(pass.luck_boost || 0).toFixed(1);

            // Determinar la temática visual según el nivel del pase (BÁSICO, BRONCE, PLATA, ORO)
            let theme = {
                borderColor: '#00f0ff',
                cardBg: 'linear-gradient(180deg, rgba(8, 26, 48, 0.95) 0%, rgba(3, 10, 22, 0.98) 100%)',
                boxShadow: '0 0 25px rgba(0, 240, 255, 0.2)',
                bannerBg: 'linear-gradient(135deg, #00f0ff, #0284c7)',
                bannerColor: '#000',
                bannerShadow: '0 0 10px rgba(0, 240, 255, 0.5)',
                artworkBg: 'radial-gradient(circle, rgba(0, 240, 255, 0.18) 0%, rgba(3, 10, 22, 0.95) 75%)',
                artBorder: 'rgba(0, 240, 255, 0.3)',
                crestColor: '#00f0ff',
                btnBg: 'linear-gradient(135deg, #00f0ff, #0284c7)',
                btnColor: '#000',
                btnBorder: '#00f0ff',
                btnShadow: '0 0 14px rgba(0, 240, 255, 0.45)',
                badgeBg: 'rgba(0, 240, 255, 0.15)',
                badgeBorder: '#00f0ff',
                badgeColor: '#00f0ff',
                crestSvg: `
                    <svg viewBox="0 0 64 64" fill="none" style="width:52px; height:52px; filter:drop-shadow(0 0 8px #00f0ff);">
                        <polygon points="32,4 58,16 58,40 32,58 6,40 6,16" stroke="#00f0ff" stroke-width="2.5" fill="rgba(0,240,255,0.08)"/>
                        <polygon points="32,12 50,21 50,38 32,50 14,38 14,21" stroke="#38bdf8" stroke-width="1.5" fill="rgba(0,240,255,0.15)"/>
                        <path d="M22 28 L28 40 L42 24" stroke="#00f0ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                `
            };

            const lowerName = (pass.name + ' ' + bannerText).toLowerCase();

            if (lowerName.includes('bronce')) {
                theme = {
                    borderColor: '#cd7f32',
                    cardBg: 'linear-gradient(180deg, rgba(46, 24, 12, 0.95) 0%, rgba(18, 10, 5, 0.98) 100%)',
                    boxShadow: '0 0 25px rgba(205, 127, 50, 0.28)',
                    bannerBg: 'linear-gradient(135deg, #d97706, #92400e)',
                    bannerColor: '#fff',
                    bannerShadow: '0 0 10px rgba(217, 119, 6, 0.5)',
                    artworkBg: 'radial-gradient(circle, rgba(205, 127, 50, 0.25) 0%, rgba(18, 10, 5, 0.95) 75%)',
                    artBorder: 'rgba(205, 127, 50, 0.35)',
                    crestColor: '#f59e0b',
                    btnBg: 'linear-gradient(135deg, #d97706, #b45309)',
                    btnColor: '#fff',
                    btnBorder: '#cd7f32',
                    btnShadow: '0 0 14px rgba(205, 127, 50, 0.45)',
                    badgeBg: 'rgba(205, 127, 50, 0.18)',
                    badgeBorder: '#cd7f32',
                    badgeColor: '#f59e0b',
                    crestSvg: `
                        <svg viewBox="0 0 64 64" fill="none" style="width:52px; height:52px; filter:drop-shadow(0 0 10px rgba(205,127,50,0.7));">
                            <polygon points="32,6 56,18 48,54 32,60 16,54 8,18" stroke="#cd7f32" stroke-width="2.5" fill="rgba(205,127,50,0.12)"/>
                            <polygon points="32,14 48,23 42,48 32,52 22,48 16,23" stroke="#f59e0b" stroke-width="1.5" fill="rgba(205,127,50,0.2)"/>
                            <text x="32" y="38" text-anchor="middle" font-family="'Orbitron', sans-serif" font-weight="900" font-size="13" fill="#fef3c7">BR</text>
                        </svg>
                    `
                };
            } else if (lowerName.includes('plata')) {
                theme = {
                    borderColor: '#cbd5e1',
                    cardBg: 'linear-gradient(180deg, rgba(28, 36, 50, 0.95) 0%, rgba(10, 15, 26, 0.98) 100%)',
                    boxShadow: '0 0 25px rgba(203, 213, 225, 0.28)',
                    bannerBg: 'linear-gradient(135deg, #f8fafc, #94a3b8)',
                    bannerColor: '#0f172a',
                    bannerShadow: '0 0 12px rgba(248, 250, 252, 0.5)',
                    artworkBg: 'radial-gradient(circle, rgba(226, 232, 240, 0.25) 0%, rgba(10, 15, 26, 0.95) 75%)',
                    artBorder: 'rgba(203, 213, 225, 0.35)',
                    crestColor: '#f1f5f9',
                    btnBg: 'linear-gradient(135deg, #f8fafc, #cbd5e1)',
                    btnColor: '#020617',
                    btnBorder: '#f1f5f9',
                    btnShadow: '0 0 14px rgba(248, 250, 252, 0.45)',
                    badgeBg: 'rgba(226, 232, 240, 0.18)',
                    badgeBorder: '#cbd5e1',
                    badgeColor: '#f8fafc',
                    crestSvg: `
                        <svg viewBox="0 0 64 64" fill="none" style="width:52px; height:52px; filter:drop-shadow(0 0 10px rgba(241,245,249,0.7));">
                            <polygon points="32,4 40,24 60,32 40,40 32,60 24,40 4,32 24,24" stroke="#f8fafc" stroke-width="2.2" fill="rgba(241,245,249,0.15)"/>
                            <polygon points="32,14 37,27 50,32 37,37 32,50 27,37 14,32 27,27" stroke="#cbd5e1" stroke-width="1.2" fill="rgba(241,245,249,0.25)"/>
                            <circle cx="32" cy="32" r="5" fill="#fff"/>
                        </svg>
                    `
                };
            } else if (lowerName.includes('oro')) {
                theme = {
                    borderColor: '#ffd700',
                    cardBg: 'linear-gradient(180deg, rgba(48, 32, 6, 0.95) 0%, rgba(20, 13, 2, 0.98) 100%)',
                    boxShadow: '0 0 30px rgba(255, 215, 0, 0.35)',
                    bannerBg: 'linear-gradient(135deg, #ffd700, #f59e0b)',
                    bannerColor: '#000',
                    bannerShadow: '0 0 14px rgba(255, 215, 0, 0.6)',
                    artworkBg: 'radial-gradient(circle, rgba(255, 215, 0, 0.28) 0%, rgba(20, 13, 2, 0.95) 75%)',
                    artBorder: 'rgba(255, 215, 0, 0.4)',
                    crestColor: '#ffd700',
                    badgeBg: 'rgba(255, 215, 0, 0.2)',
                    badgeBorder: '#ffd700',
                    badgeColor: '#ffd700',
                    crestSvg: `
                        <svg viewBox="0 0 64 64" fill="none" style="width:52px; height:52px; filter:drop-shadow(0 0 10px rgba(255,215,0,0.8));">
                            <polygon points="32,4 40,22 60,25 45,39 49,59 32,49 15,59 19,39 4,25 24,22" stroke="#ffd700" stroke-width="2.2" fill="rgba(255,215,0,0.18)"/>
                            <circle cx="32" cy="34" r="10" stroke="#f59e0b" stroke-width="1.5" fill="rgba(255,215,0,0.25)"/>
                            <polygon points="32,27 35,33 41,34 37,38 38,44 32,41 26,44 27,38 23,34 29,33" fill="#ffd700"/>
                        </svg>
                    `
                };
            }

            // Configuración de botones cyber estilizados (tipografía nítida y estilizada sin saturación de negrita)
            let btnStyle = `
                width: 100% !important;
                height: 25px !important;
                border-radius: 0 !important;
                font-family: 'Orbitron', sans-serif !important;
                font-size: 8px !important;
                font-weight: 500 !important;
                letter-spacing: 0.4px !important;
                text-transform: uppercase !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 5px !important;
                padding: 4px 8px !important;
                cursor: pointer !important;
                color: #ffffff !important;
                transition: all 0.2s ease !important;
                box-sizing: border-box !important;
            `;

            let actionBtnHtml = '';

            if (lowerName.includes('bronce')) {
                btnStyle += `background: linear-gradient(135deg, rgba(205, 127, 50, 0.25), rgba(180, 83, 9, 0.55)) !important; border: 1.2px solid #cd7f32 !important; box-shadow: 0 0 10px rgba(205, 127, 50, 0.3) !important;`;
            } else if (lowerName.includes('plata')) {
                btnStyle += `background: linear-gradient(135deg, rgba(203, 213, 225, 0.25), rgba(100, 116, 139, 0.55)) !important; border: 1.2px solid #cbd5e1 !important; box-shadow: 0 0 10px rgba(203, 213, 225, 0.3) !important;`;
            } else if (lowerName.includes('oro')) {
                btnStyle += `background: linear-gradient(135deg, rgba(255, 215, 0, 0.25), rgba(218, 165, 32, 0.55)) !important; border: 1.2px solid #ffd700 !important; box-shadow: 0 0 10px rgba(255, 215, 0, 0.3) !important;`;
            } else {
                btnStyle += `background: linear-gradient(135deg, rgba(0, 240, 255, 0.25), rgba(0, 140, 255, 0.55)) !important; border: 1.2px solid #00f0ff !important; box-shadow: 0 0 10px rgba(0, 240, 255, 0.3) !important;`;
            }

            if (currency === 'USD') {
                actionBtnHtml = `
                    <button type="button" style="${btnStyle}" onclick="window.ShopVip.buyUsd('${pass.code}')">
                        <span>Adquirir $ ${rawPrice.toFixed(2)} USD</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:10px; height:10px;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                    </button>
                `;
            } else {
                actionBtnHtml = `
                    <button type="button" style="${btnStyle}" onclick="window.ShopVip.confirmBuyStarships('${pass.code}')">
                        <span>Activar ⭐ ${rawPrice.toLocaleString()}</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:10px; height:10px;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                    </button>
                `;
            }

            gridHtml += `
                <div class="potenciador-shop-card" style="background:${theme.cardBg}; border:1.5px solid ${theme.borderColor}; box-shadow:${theme.boxShadow}; position:relative; overflow:hidden;">
                    <!-- BANNER DE OFERTA / TIER COMPLETAMENTE CENTRADO -->
                    <div style="background:${theme.bannerBg}; color:${theme.bannerColor}; box-shadow:${theme.bannerShadow}; text-align:center; font-family:'Orbitron', sans-serif; font-size:9.5px; font-weight:600; letter-spacing:0.8px; padding:4px 0; width:100%; border-bottom:1px solid rgba(0,0,0,0.3);">
                        ${bannerText}
                    </div>

                    <!-- EMBLEMA CYBER VECTORIAL Y BADGE DE DURACIÓN -->
                    <div class="pot-card-artwork" style="background:${theme.artworkBg}; border-bottom:1px solid ${theme.artBorder}; padding:14px 10px 10px 10px;">
                        <div style="margin-bottom:6px; display:flex; align-items:center; justify-content:center;">
                            ${theme.crestSvg}
                        </div>
                        <div style="font-family:'Orbitron', sans-serif; font-size:9px; font-weight:500; color:${theme.badgeColor}; background:${theme.badgeBg}; border:1px solid ${theme.badgeBorder}; padding:2.5px 8px; letter-spacing:0.4px; box-shadow:0 0 8px rgba(0,0,0,0.5);">
                            ⏳ ${days} DÍAS DE VIGENCIA
                        </div>
                    </div>

                    <!-- INFORMACIÓN DEL PASE (CENTRADA Y CON TIPOGRAFÍA NÍTIDA Y SIN NEGRITAS PESADAS) -->
                    <div class="pot-card-body" style="padding:10px 12px; background:rgba(0,0,0,0.45); text-align:center;">
                        <div style="font-family:'Orbitron', sans-serif; font-size:8.5px; color:${theme.crestColor}; font-weight:400; letter-spacing:0.4px;">${pass.code}</div>
                        <div style="font-family:'Outfit', sans-serif; font-size:12px; font-weight:500; color:#ffffff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin:3px 0 8px 0; letter-spacing:0.2px;">${pass.name}</div>

                        <!-- 3 ESTADÍSTICAS DEL PASE -->
                        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:4px; margin-bottom:10px;">
                            <div style="background:rgba(0,240,255,0.08); border:1px solid rgba(0,240,255,0.25); padding:4px 2px; text-align:center;">
                                <div style="font-size:7.5px; color:#94a3b8; font-weight:400;">EXP</div>
                                <div style="font-family:'Orbitron', sans-serif; font-size:9px; font-weight:500; color:#00f0ff;">+${expText}%</div>
                            </div>
                            <div style="background:rgba(255,215,0,0.08); border:1px solid rgba(255,215,0,0.25); padding:4px 2px; text-align:center;">
                                <div style="font-size:7.5px; color:#94a3b8; font-weight:400;">STAR</div>
                                <div style="font-family:'Orbitron', sans-serif; font-size:9px; font-weight:500; color:#ffd700;">+${starText}%</div>
                            </div>
                            <div style="background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.25); padding:4px 2px; text-align:center;">
                                <div style="font-size:7.5px; color:#94a3b8; font-weight:400;">LUCK</div>
                                <div style="font-family:'Orbitron', sans-serif; font-size:9px; font-weight:500; color:#10b981;">+${luckText}%</div>
                            </div>
                        </div>

                        <!-- BOTÓN DE ACCIÓN ESTILIZADO CON TEXTO BLANCO Y FLECHA -->
                        ${actionBtnHtml}
                    </div>
                </div>
            `;
        });

        container.innerHTML = gridHtml;
    }

    // Filtros de Moneda
    window.setVipCurrencyFilter = function (currency, btn) {
        currentCurrencyFilter = currency;
        const group = document.getElementById('filter-vip-currency-group');
        if (group) {
            group.querySelectorAll('.btn-filter-currency-pill').forEach(b => b.classList.remove('active'));
        }
        if (btn) btn.classList.add('active');
        renderShopVipGrid();
    };

    // Modal de confirmación de compra con StarShips
    function confirmBuyStarships(code) {
        const pass = window.VipManager.getVipPassByCode(code);
        if (!pass) return;

        const modal = document.getElementById('shop-vip-confirm-modal');
        const details = document.getElementById('modal-vip-buy-details');
        const confirmBtn = document.getElementById('btn-modal-vip-confirm-buy');

        if (!modal || !details || !confirmBtn) return;

        const expText = parseFloat(pass.exp_boost || 0).toFixed(1);
        const starText = parseFloat(pass.starships_boost || 0).toFixed(1);
        const luckText = parseFloat(pass.luck_boost || 0).toFixed(1);
        const price = parseFloat(pass.price || 0);
        const days = parseInt(pass.days || 3, 10);

        const currentBal = getUserStarshipsBalance();
        const currentVip = window.VipManager ? window.VipManager.getUserVipStatus() : { active: false };

        let replacementWarningHtml = '';
        if (currentVip && currentVip.active) {
            replacementWarningHtml = `
                <div style="background:rgba(239, 68, 68, 0.15); border:1.2px solid #ef4444; color:#fca5a5; padding:8px 10px; margin-bottom:12px; font-size:9.5px; text-align:left; line-height:1.4;">
                    ⚠️ <b style="color:#ef4444;">ADVERTENCIA DE REEMPLAZO:</b><br>
                    Actualmente tienes activo: <b style="color:#ffd700;">${currentVip.passName || currentVip.passCode}</b> (${currentVip.remainingFormatted} restantes).<br>
                    <span style="color:#ffffff;">Los pases VIP <b>NO son acumulables</b>. Si activas este nuevo pase, el pase actual se eliminará y se activará el nuevo pase seleccionado a partir de este momento.</span>
                </div>
            `;
        }

        details.innerHTML = `
            ${replacementWarningHtml}
            <div style="font-size:14px; font-weight:800; color:#fff; margin-bottom:4px;">${pass.name}</div>
            <div style="font-family:'Orbitron', sans-serif; font-size:10px; color:#c084fc; margin-bottom:8px;">CÓDIGO: <b>${pass.code}</b> • ⏳ <b>${days} DÍAS</b></div>
            <div style="display:flex; justify-content:center; gap:8px; margin-bottom:10px;">
                <span style="background:rgba(0,240,255,0.2); border:1px solid #00f0ff; color:#00f0ff; padding:2px 6px; font-size:9px; font-weight:800;">+${expText}% EXP</span>
                <span style="background:rgba(234,179,8,0.2); border:1px solid #eab308; color:#eab308; padding:2px 6px; font-size:9px; font-weight:800;">+${starText}% STAR</span>
                <span style="background:rgba(16,185,129,0.2); border:1px solid #10b981; color:#10b981; padding:2px 6px; font-size:9px; font-weight:800;">+${luckText}% LUCK</span>
            </div>
            <div style="font-size:12px; color:#cbd5e1;">Costo Total: <b style="color:#ffd700; font-size:13px;">⭐ ${price.toLocaleString()} StarShips</b></div>
            <div style="font-size:10px; color:#94a3b8; margin-top:4px;">Tu saldo actual: ⭐ ${currentBal.toLocaleString()}</div>
        `;

        confirmBtn.onclick = function () {
            closeVipConfirmModal();
            executeBuyStarships(pass);
        };

        modal.style.display = 'flex';
    }

    window.closeVipConfirmModal = function () {
        const modal = document.getElementById('shop-vip-confirm-modal');
        if (modal) modal.style.display = 'none';
    };

    async function executeBuyStarships(pass) {
        const price = parseFloat(pass.price || 0);
        const user = window.Session ? window.Session.getUser() : null;
        const uid = user ? (user.id || user.user_id || user.Id) : 0;

        if (!uid) {
            openNoticeModal('❌ ACCESO REQUERIDO', 'Debes iniciar sesión para adquirir pases VIP.', 'error');
            return;
        }

        const currentBal = getUserStarshipsBalance();
        if (currentBal < price) {
            openNoticeModal('❌ SALDO INSUFICIENTE', `No posees suficientes StarShips para activar este pase VIP. Requieres ⭐ ${price.toLocaleString()} y tu saldo actual es ⭐ ${currentBal.toLocaleString()}.`, 'error');
            return;
        }

        try {
            const res = await fetch('/api/game/vip/buy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': String(uid),
                    'x-session-token': window.Session.getSessionToken()
                },
                body: JSON.stringify({
                    userId: uid,
                    passCode: pass.code,
                    durationDays: parseInt(pass.days || 30, 10),
                    costStarships: price
                })
            });

            const data = await res.json();
            if (!data.success) {
                openNoticeModal('❌ ERROR EN COMPRA', data.message || 'No se pudo procesar la transacción.', 'error');
                return;
            }

            if (window.Session && data.newStarshipsBalance !== undefined) {
                const u = window.Session.getUser();
                if (u) {
                    u.starships = data.newStarshipsBalance;
                    if (data.vipUntil) u.vipUntil = data.vipUntil;
                    window.Session.saveUser(u);
                    window.Session.applyImmediateUI();
                }
            }

            updateBalanceDisplay();

            if (window.VipManager) {
                window.VipManager.activateUserVip(pass.code);
            }

            openNoticeModal(
                '¡PASE VIP ACTIVADO EXITOSAMENTE!',
                `Has activado el <b>${pass.name}</b> por <b>${pass.days} días</b>. Tus bonificaciones temporales (+${parseFloat(pass.exp_boost).toFixed(1)}% EXP, +${parseFloat(pass.starships_boost).toFixed(1)}% STAR, +${parseFloat(pass.luck_boost).toFixed(1)}% LUCK) ya están registradas y activas en la base de datos para todos tus duelos.`,
                'success'
            );

            renderShopVipGrid();
        } catch (e) {
            openNoticeModal('❌ ERROR DE CONEXIÓN', 'Ocurrió un problema de comunicación al activar el pase VIP: ' + e.message, 'error');
        }
    }

    // Redirección a instrucciones de pago para compras en Dólares USD
    function buyUsdVip(code) {
        const pass = window.VipManager ? window.VipManager.getVipPassByCode(code) : null;
        const currentVip = window.VipManager ? window.VipManager.getUserVipStatus() : { active: false };

        if (pass && currentVip && currentVip.active) {
            const modal = document.getElementById('shop-vip-confirm-modal');
            const details = document.getElementById('modal-vip-buy-details');
            const confirmBtn = document.getElementById('btn-modal-vip-confirm-buy');

            if (modal && details && confirmBtn) {
                const rawPrice = parseFloat(pass.price || 0);
                const days = parseInt(pass.days || 3, 10);
                details.innerHTML = `
                    <div style="background:rgba(239, 68, 68, 0.15); border:1.2px solid #ef4444; color:#fca5a5; padding:8px 10px; margin-bottom:12px; font-size:9.5px; text-align:left; line-height:1.4;">
                        ⚠️ <b style="color:#ef4444;">ADVERTENCIA DE REEMPLAZO:</b><br>
                        Actualmente tienes activo: <b style="color:#ffd700;">${currentVip.passName || currentVip.passCode}</b> (${currentVip.remainingFormatted} restantes).<br>
                        <span style="color:#ffffff;">Los pases VIP <b>NO son acumulables</b>. Si adquieres este nuevo pase, el pase actual se reemplazará y se activará el nuevo pase al completar la transacción.</span>
                    </div>
                    <div style="font-size:14px; font-weight:800; color:#fff; margin-bottom:4px;">${pass.name}</div>
                    <div style="font-family:'Orbitron', sans-serif; font-size:10px; color:#c084fc; margin-bottom:8px;">CÓDIGO: <b>${pass.code}</b> • ⏳ <b>${days} DÍAS</b> • <b>$ ${rawPrice.toFixed(2)} USD</b></div>
                    <div style="font-size:11px; color:#cbd5e1; margin-top:6px;">¿Deseas continuar hacia las instrucciones de pago en USD?</div>
                `;
                confirmBtn.onclick = function () {
                    closeVipConfirmModal();
                    window.location.href = `shop-pago-instrucciones.html?codigo=${encodeURIComponent(code)}`;
                };
                modal.style.display = 'flex';
                return;
            }
        }

        window.location.href = `shop-pago-instrucciones.html?codigo=${encodeURIComponent(code)}`;
    }

    function openNoticeModal(title, msg, type = 'success') {
        const modal = document.getElementById('shop-vip-notice-modal');
        const titleEl = document.getElementById('modal-vip-notice-title');
        const msgEl = document.getElementById('modal-vip-notice-msg');
        const iconEl = document.getElementById('modal-vip-notice-icon');

        if (!modal || !titleEl || !msgEl) return;

        titleEl.textContent = title;
        titleEl.style.color = type === 'error' ? '#ff4757' : '#c084fc';
        msgEl.innerHTML = msg;
        if (iconEl) {
            iconEl.textContent = type === 'error' ? '⚠️' : '👑';
        }

        modal.style.display = 'flex';
    }

    window.closeVipNoticeModal = function () {
        const modal = document.getElementById('shop-vip-notice-modal');
        if (modal) modal.style.display = 'none';
    };

    // Exportar objeto global para callbacks
    window.ShopVip = {
        buyUsd: buyUsdVip,
        confirmBuyStarships: confirmBuyStarships,
        reload: renderShopVipGrid
    };

    window.setVipCurrencyFilter = function(filter, btn) {
        currentCurrencyFilter = filter;
        if (btn && btn.parentElement) {
            btn.parentElement.querySelectorAll('.btn-filter-currency-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }
        renderShopVipGrid();
    };

    document.addEventListener('DOMContentLoaded', () => {
        updateBalanceDisplay();
        renderShopVipGrid();
    });
