/**
 * ANI-DIMENSION: MODAL Y NOTIFICACIONES PERSONALIZADAS
 * REEMPLAZO PREMIUM Y RESPONSIVO DE ALERTAS NATIVAS DEL NAVEGADOR
 * SOPORTA TANTO PARÁMETROS OBJETOS { title, message, type } COMO PARÁMETROS POSICIONALES (title, message, type)
 */
(function(window) {
    window.showAniModal = function(arg1, arg2, arg3, arg4, arg5) {
        let title = 'NOTIFICACIÓN';
        let message = '';
        let type = 'info'; // 'success', 'error', 'warning', 'info'
        let confirmText = 'Aceptar';
        let onConfirm = null;

        if (typeof arg1 === 'object' && arg1 !== null) {
            title = arg1.title || title;
            message = arg1.message || message;
            type = arg1.type || type;
            confirmText = arg1.confirmText || confirmText;
            onConfirm = arg1.onConfirm || null;
        } else {
            if (typeof arg1 === 'string') title = arg1;
            if (typeof arg2 === 'string') message = arg2;
            if (typeof arg3 === 'string') type = arg3;
            if (typeof arg4 === 'function') {
                onConfirm = arg4;
            } else if (typeof arg4 === 'string') {
                confirmText = arg4;
            }
            if (typeof arg5 === 'function') onConfirm = arg5;
        }

        let overlay = document.getElementById('ani-custom-modal-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'ani-custom-modal-overlay';
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(2, 6, 15, 0.88); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
                z-index: 999999; display: flex; align-items: center; justify-content: center;
                padding: 16px; box-sizing: border-box; opacity: 0; transition: opacity 0.25s ease;
            `;
            document.body.appendChild(overlay);
        }

        const isSuccess = type === 'success';
        const isError = type === 'error';
        const isWarning = type === 'warning';

        const borderCol = isSuccess ? '#10b981' : isError ? '#ef4444' : isWarning ? '#f59e0b' : '#00f0ff';
        const glowCol = isSuccess ? 'rgba(16,185,129,0.5)' : isError ? 'rgba(239,68,68,0.5)' : isWarning ? 'rgba(245,158,11,0.5)' : 'rgba(0,240,255,0.5)';
        const icon = isSuccess ? '✅' : isError ? '❌' : isWarning ? '⚠️' : 'ℹ️';

        overlay.innerHTML = `
            <div class="ani-modal-card-box" style="
                width: 90vw; max-width: 420px;
                background: radial-gradient(circle at 50% 25%, #0d1f42 0%, #050b18 70%, #020408 100%);
                border: 1.5px solid ${borderCol};
                border-radius: 12px;
                padding: 22px 24px;
                box-sizing: border-box;
                box-shadow: 0 0 30px ${glowCol}, 0 10px 40px rgba(0,0,0,0.85);
                display: flex; flex-direction: column; gap: 12px; align-items: center; text-align: center;
                transform: scale(0.88); transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            ">
                <div style="font-size: 32px; filter: drop-shadow(0 0 10px ${glowCol}); line-height: 1;">
                    ${icon}
                </div>

                <div style="font-family: 'Orbitron', sans-serif; font-size: 13.5px; font-weight: 900; color: #ffffff; letter-spacing: 0.5px; text-shadow: 0 0 10px ${borderCol}; text-transform: uppercase;">
                    ${title}
                </div>

                <div style="font-family: 'Outfit', sans-serif; font-size: 12px; color: #cbd5e1; line-height: 1.45; word-break: break-word; white-space: pre-line;">
                    ${message}
                </div>

                <div style="display: flex; gap: 10px; margin-top: 6px; width: 100%; justify-content: center;">
                    ${onConfirm ? `
                    <button id="ani-modal-btn-cancel" style="
                        padding: 7px 18px;
                        font-family: 'Orbitron', sans-serif; font-size: 10px; font-weight: 800;
                        color: #cbd5e1; background: rgba(15, 23, 42, 0.9);
                        border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 6px; cursor: pointer;
                        transition: all 0.2s ease;
                    ">Cancelar</button>
                    ` : ''}

                    <button id="ani-modal-btn-confirm" style="
                        padding: 7px 24px;
                        font-family: 'Orbitron', sans-serif; font-size: 10px; font-weight: 900;
                        color: #ffffff; background: linear-gradient(90deg, ${borderCol}, ${isSuccess ? '#059669' : isError ? '#dc2626' : '#d97706'});
                        border: none; border-radius: 6px; cursor: pointer;
                        box-shadow: 0 0 14px ${glowCol}; transition: all 0.2s ease; letter-spacing: 0.5px;
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

        const confirmBtn = document.getElementById('ani-modal-btn-confirm');
        confirmBtn.onclick = function() {
            closeModal();
            if (typeof onConfirm === 'function') onConfirm();
        };

        const cancelBtn = document.getElementById('ani-modal-btn-cancel');
        if (cancelBtn) {
            cancelBtn.onclick = function() {
                closeModal();
            };
        }

        function closeModal() {
            overlay.style.opacity = '0';
            const card = overlay.firstElementChild;
            if (card) card.style.transform = 'scale(0.88)';
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 200);
        }
    };

    window.aniAlert = function(msg, title = 'INFORMACIÓN', type = 'info') {
        window.showAniModal(title, msg, type);
    };
})(window);
