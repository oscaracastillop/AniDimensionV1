/**
 * Ani-Dimension: Cliente Central de WebSockets (Socket.IO)
 * Provee reconexión automática y emisión de identidad de usuario
 */
(function() {
    let socketInstance = null;

    function getSocket() {
        if (!socketInstance) {
            // Conexión dinámica: si estamos en Web usa el origen actual, si es APK usa la IP local o host configurado
            const socketUrl = window.location.origin.includes('http') && !window.location.origin.includes('capacitor://')
                ? window.location.origin
                : 'http://192.168.101.15:3005';

            socketInstance = io(socketUrl, {
                reconnection: true,
                reconnectionAttempts: Infinity,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                transports: ['websocket', 'polling']
            });

            socketInstance.on('connect', () => {
                console.log('[WEBSOCKET] Conectado al servidor Ani-Dimension (ID: ' + socketInstance.id + ')');
                
                // Identificar al usuario automáticamente
                const user = window.Session ? window.Session.getUser() : null;
                if (user && user.username) {
                    socketInstance.emit('USER_IDENTIFY', {
                        username: user.username,
                        user_id: user.id || user.user_id
                    });
                }
            });

            socketInstance.on('disconnect', (reason) => {
                console.warn('[WEBSOCKET] Desconectado:', reason);
            });

            socketInstance.on('connect_error', (err) => {
                console.error('[WEBSOCKET ERROR] Fallo de conexión:', err.message);
            });
        }
        return socketInstance;
    }

    window.getSocket = getSocket;
    window.socket = getSocket();
})();
