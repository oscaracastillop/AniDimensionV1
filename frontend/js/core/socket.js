/**
 * Ani-Dimension: Cliente Central de WebSockets (Socket.IO) & Monitor de Estado de Conexión
 * Provee reconexión automática resiliente, barra de estado y protección contra caídas de red.
 * Desarrollado por Oscar Castillo. Todos los derechos reservados.
 */
(function() {
    let socketInstance = null;

    // Eliminar cualquier barra flotante global residual si existe
    function ensureConnectionStatusBar() {
        if (typeof document === 'undefined') return null;
        const bar = document.getElementById('ad-global-connection-bar');
        if (bar) bar.remove();
        return null;
    }

    function updateConnectionStatus(state, message) {
        const indicator = document.getElementById('ad-conn-indicator');
        const text = document.getElementById('ad-conn-text');
        if (!indicator && !text) return;

        if (state === 'connected') {
            if (indicator) {
                indicator.style.background = '#10b981';
                indicator.style.boxShadow = '0 0 8px #10b981';
            }
            if (text) {
                text.style.color = '#10b981';
                text.textContent = message || 'Servidor central de Ani-Dimension conectado';
            }
        } else if (state === 'connecting') {
            if (indicator) {
                indicator.style.background = '#00f0ff';
                indicator.style.boxShadow = '0 0 8px #00f0ff';
            }
            if (text) {
                text.style.color = '#00f0ff';
                text.textContent = message || 'Conectando al servidor central...';
            }
        } else {
            if (indicator) {
                indicator.style.background = '#ef4444';
                indicator.style.boxShadow = '0 0 8px #ef4444';
            }
            if (text) {
                text.style.color = '#f87171';
                text.textContent = message || 'Reconectando con el servidor...';
            }
        }
    }

    function getSocket() {
        if (!socketInstance) {
            // Conexión dinámica inteligente y segura (sin exponer IP fija)
            const socketUrl = (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin.startsWith('http') && !window.location.origin.includes('localhost') && !window.location.origin.includes('capacitor://'))
                ? window.location.origin
                : (typeof window !== 'undefined' && window.location.origin.includes('localhost') ? window.location.origin : '');

            if (typeof io === 'undefined') {
                console.warn('[SOCKET] Socket.IO no cargado en este documento.');
                return null;
            }

            updateConnectionStatus('connecting', 'Conectando al servidor central de Ani-Dimension...');

            socketInstance = io(socketUrl || undefined, {
                reconnection: true,
                reconnectionAttempts: Infinity,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 4000,
                timeout: 10000,
                transports: ['websocket', 'polling']
            });

            socketInstance.on('connect', () => {
                console.log('[WEBSOCKET] Conectado al servidor central de Ani-Dimension.');
                updateConnectionStatus('connected', 'Servidor central de Ani-Dimension conectado');
                
                // Identificar al usuario automáticamente si está logueado
                const user = window.Session ? window.Session.getUser() : null;
                if (user && user.username) {
                    socketInstance.emit('USER_IDENTIFY', {
                        username: user.username,
                        user_id: user.id || user.user_id
                    });
                }
            });

            socketInstance.on('disconnect', (reason) => {
                console.warn('[WEBSOCKET] Desconectado del servidor:', reason);
                updateConnectionStatus('disconnected', 'Reconectando con el servidor central de Ani-Dimension...');
            });

            socketInstance.on('connect_error', () => {
                updateConnectionStatus('disconnected', 'Estableciendo enlace con el servidor central de Ani-Dimension...');
            });
        }
        return socketInstance;
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                ensureConnectionStatusBar();
            });
        } else {
            ensureConnectionStatusBar();
        }
    }

    window.getSocket = getSocket;
    if (typeof io !== 'undefined') {
        window.socket = getSocket();
    }
})();
