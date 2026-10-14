/**
 * ============================================================================
 * ANI-DIMENSION: MODAL Y ALERTAS PERSONALIZADAS (UNIFIED CYBERPUNK SYSTEM)
 * REEMPLAZO PREMIUM Y RESPONSIVO DE ALERTAS NATIVAS DEL NAVEGADOR (window.alert)
 * ============================================================================
 */
(function(window) {
    'use strict';

    /**
     * Muestra una ventana modal personalizada con estética Cyberpunk OCG
     * @param {string|object} arg1 - Título o configuración { title, message, type, confirmText, cancelText, onConfirm, onCancel }
     * @param {string} arg2 - Mensaje principal
     * @param {string} arg3 - Tipo ('success', 'error', 'warning', 'info')
     * @param {string|function} arg4 - Texto de confirmación o callback onConfirm
     * @param {function} arg5 - Callback onConfirm
     */
    window.showAniModal = function(arg1, arg2, arg3, arg4, arg5) {
        let title = 'NOTIFICACIÓN';
        let message = '';
        let type = 'info'; // 'success', 'error', 'warning', 'info'
        let confirmText = 'ENTENDIDO';
        let cancelText = 'CANCELAR';
        let onConfirm = null;
        let onCancel = null;
        let showCancel = false;

        if (typeof arg1 === 'object' && arg1 !== null) {
            title = arg1.title || title;
            message = arg1.message || message;
            type = arg1.type || type;
            confirmText = arg1.confirmText || confirmText;
            cancelText = arg1.cancelText || cancelText;
            onConfirm = arg1.onConfirm || null;
            onCancel = arg1.onCancel || null;
            showCancel = arg1.showCancel || (typeof onConfirm === 'function' && typeof onCancel === 'function');
        } else {
            if (typeof arg1 === 'string') title = arg1;
            if (typeof arg2 === 'string') message = arg2;
            if (typeof arg3 === 'string') type = arg3;
            if (typeof arg4 === 'function') {
                onConfirm = arg4;
                showCancel = true;
            } else if (typeof arg4 === 'string') {
                confirmText = arg4;
            }
            if (typeof arg5 === 'function') {
                onConfirm = arg5;
                showCancel = true;
            }
        }

        let overlay = document.getElementById('ani-custom-modal-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'ani-custom-modal-overlay';
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(2, 6, 15, 0.88); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
                z-index: 99999999; display: flex; align-items: center; justify-content: center;
                padding: 16px; box-sizing: border-box; opacity: 0; transition: opacity 0.22s ease;
            `;
            document.body.appendChild(overlay);
        }

        const isSuccess = type === 'success';
        const isError = type === 'error';
        const isWarning = type === 'warning';

        const borderCol = isSuccess ? '#10b981' : isError ? '#ef4444' : isWarning ? '#f59e0b' : '#00f0ff';
        const glowCol = isSuccess ? 'rgba(16,185,129,0.5)' : isError ? 'rgba(239,68,68,0.5)' : isWarning ? 'rgba(245,158,11,0.5)' : 'rgba(0,240,255,0.5)';
        const headerGradient = isSuccess ? 'linear-gradient(135deg, #10b981, #059669)' :
                               isError ? 'linear-gradient(135deg, #ef4444, #b91c1c)' :
                               isWarning ? 'linear-gradient(135deg, #f59e0b, #d97706)' :
                               'linear-gradient(135deg, #00f0ff, #0284c7)';
        const iconSvg = isSuccess ? `
            <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" style="width:36px; height:36px;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>` : isError ? `
            <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" style="width:36px; height:36px;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>` : isWarning ? `
            <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" style="width:36px; height:36px;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>` : `
            <svg viewBox="0 0 24 24" fill="none" stroke="#00f0ff" stroke-width="2.5" style="width:36px; height:36px;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>`;

        overlay.innerHTML = `
            <div class="ani-modal-card-box" style="
                width: 92vw; max-width: 440px;
                background: radial-gradient(circle at 50% 15%, #0d1f42 0%, #060c1c 70%, #020408 100%);
                border: 1.5px solid ${borderCol};
                border-radius: 0;
                padding: 24px 26px;
                box-sizing: border-box;
                box-shadow: 0 0 35px ${glowCol}, 0 12px 48px rgba(0,0,0,0.9);
                display: flex; flex-direction: column; gap: 14px; align-items: center; text-align: center;
                transform: scale(0.92); transition: transform 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                position: relative;
            ">
                <div style="filter: drop-shadow(0 0 12px ${glowCol}); line-height: 1;">
                    ${iconSvg}
                </div>

                <div style="font-family: 'Orbitron', sans-serif; font-size: 13px; font-weight: 900; color: #ffffff; letter-spacing: 1px; text-shadow: 0 0 10px ${borderCol}; text-transform: uppercase;">
                    ${title}
                </div>

                <div style="font-family: 'Outfit', sans-serif; font-size: 13px; color: #cbd5e1; line-height: 1.5; word-break: break-word; white-space: pre-line; max-height: 48vh; overflow-y: auto; padding: 0 4px;">
                    ${message}
                </div>

                <div style="display: flex; gap: 12px; margin-top: 6px; width: 100%; justify-content: center;">
                    ${showCancel ? `
                    <button id="ani-modal-btn-cancel" style="
                        flex: 1; max-width: 140px;
                        padding: 9px 16px;
                        font-family: 'Orbitron', sans-serif; font-size: 11px; font-weight: 700;
                        color: #cbd5e1; background: rgba(255, 255, 255, 0.08);
                        border: 1.2px solid rgba(255, 255, 255, 0.25); border-radius: 0; cursor: pointer;
                        transition: all 0.2s ease; text-transform: uppercase; letter-spacing: 0.8px;
                    ">
                        ${cancelText}
                    </button>
                    ` : ''}

                    <button id="ani-modal-btn-confirm" style="
                        flex: 1; max-width: ${showCancel ? '160px' : '220px'};
                        padding: 9px 20px;
                        font-family: 'Orbitron', sans-serif; font-size: 11px; font-weight: 800;
                        color: #020617; background: ${headerGradient};
                        border: 1.2px solid #fff; border-radius: 0; cursor: pointer;
                        box-shadow: 0 0 16px ${glowCol}; transition: all 0.2s ease; letter-spacing: 1px; text-transform: uppercase;
                    ">
                        ${confirmText}
                    </button>
                </div>
            </div>
        `;

        overlay.style.display = 'flex';
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            const card = overlay.firstElementChild;
            if (card) card.style.transform = 'scale(1)';
        });

        function closeModal() {
            overlay.style.opacity = '0';
            const card = overlay.firstElementChild;
            if (card) card.style.transform = 'scale(0.92)';
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 180);
        }

        const confirmBtn = document.getElementById('ani-modal-btn-confirm');
        if (confirmBtn) {
            confirmBtn.onclick = function() {
                closeModal();
                if (typeof onConfirm === 'function') onConfirm();
            };
            confirmBtn.focus();
        }

        const cancelBtn = document.getElementById('ani-modal-btn-cancel');
        if (cancelBtn) {
            cancelBtn.onclick = function() {
                closeModal();
                if (typeof onCancel === 'function') onCancel();
            };
        }
    };

    /**
     * Helper inteligente que detecta título, tipo e icono a partir del texto del mensaje
     */
    window.aniAlert = function(msg, title, type) {
        let detectedType = type || 'info';
        let detectedTitle = title || 'NOTIFICACIÓN';
        let str = String(msg || '');

        if (!type) {
            const lower = str.toLowerCase();
            if (str.includes('✅') || lower.includes('éxito') || lower.includes('guardado') || lower.includes('creado') || lower.includes('actualizado')) {
                detectedType = 'success';
                detectedTitle = title || 'OPERACIÓN EXITOSA';
                str = str.replace('✅', '').trim();
            } else if (str.includes('❌') || lower.includes('error') || lower.includes('cancelad') || lower.includes('falló') || lower.includes('inválid')) {
                detectedType = 'error';
                detectedTitle = title || 'NOTIFICACIÓN';
                str = str.replace('❌', '').trim();
            } else if (str.includes('⚠️') || lower.includes('atención') || lower.includes('requerid') || lower.includes('completa') || lower.includes('insuficiente') || lower.includes('límite') || lower.includes('rango')) {
                detectedType = 'warning';
                detectedTitle = title || 'AVISO';
                str = str.replace('⚠️', '').trim();
            } else {
                detectedType = 'info';
                detectedTitle = title || 'NOTIFICACIÓN';
            }
        }

        window.showAniModal(detectedTitle, str, detectedType);
    };

    /**
     * Modal de Confirmación Cyberpunk (Reemplazo de window.confirm)
     */
    window.aniConfirm = function(title, message, onConfirm, onCancel, confirmText = 'CONFIRMAR', cancelText = 'CANCELAR') {
        window.showAniModal({
            title: title || '¿ESTÁS SEGURO?',
            message: message || '',
            type: 'warning',
            confirmText: confirmText,
            cancelText: cancelText,
            showCancel: true,
            onConfirm: onConfirm,
            onCancel: onCancel
        });
    };

    /**
     * SOBRESCRITURA TOTAL DE WINDOW.ALERT PARA ERRADICAR ALERTAS FEAS DEL NAVEGADOR
     */
    window.alert = function(msg) {
        window.aniAlert(msg);
    };

})(window);
