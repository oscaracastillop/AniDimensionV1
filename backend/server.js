/**
 * ============================================================================
 * ANI-DIMENSION: SERVIDOR CENTRAL MODULAR (NODE.JS + MSSQL + SOCKET.IO)
 * ============================================================================
 */
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { Server } = require('socket.io');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const { getPool } = require('./config/db');
const { setIo } = require('./engine/duel-state');
const { initDuelSockets } = require('./sockets/duel.socket');

const authRoutes = require('./routes/auth.routes');
const lobbyRoutes = require('./routes/lobby.routes');
const cardsRoutes = require('./routes/cards.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Registrar la instancia de IO en el estado de duelos para emitir logs y actualizaciones
setIo(io);

// Manejo seguro de excepciones no capturadas para mantener el servidor siempre activo
process.on('uncaughtException', (err) => {
    console.error('[UNCAUGHT EXCEPTION]', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('[UNHANDLED REJECTION]', reason);
});

// Middlewares globales
app.use(cors({ origin: '*' }));
app.use(express.json());

// Servir frontend y assets estáticos
const frontendPath = path.resolve(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Endpoint de descarga de APK (servido directamente desde la raíz C:\Users\oscar.castillo\Videos\Ani Dimension)
app.get(['/download/AniDimension.apk', '/download/AniDimension-Duelo.apk', '/download', '/downloads/AniDimension.apk', '/downloads/AniDimension-Duelo.apk'], (req, res) => {
    let apkPath = path.resolve(__dirname, '../AniDimension.apk');
    if (!fs.existsSync(apkPath)) {
        apkPath = path.resolve(__dirname, '../AniDimension-Duelo.apk');
    }
    if (fs.existsSync(apkPath)) {
        res.download(apkPath, 'AniDimension.apk');
    } else {
        res.status(404).send('APK en proceso de compilación.');
    }
});

// Rutas de API REST modularizadas
app.use('/api/auth', authRoutes);
app.use('/api/user', authRoutes); // Soporte retrocompatible para /api/user/update-nick
app.use('/api/lobby', lobbyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', cardsRoutes);

// Endpoint de prueba rápida / health check
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        service: 'Ani-Dimension Modular Server',
        timestamp: new Date().toISOString()
    });
});

// Inicializar WebSockets de Duelos y Chat
initDuelSockets(io);

// Conectar base de datos y arrancar servidor
const PORT = parseInt(process.env.PORT || '3005', 10);

async function startServer() {
    try {
        console.log('[BOOT] Conectando a base de datos SQL Server...');
        await getPool();
        console.log('[BOOT] SQL Server listo.');

        const { loadCardsFromSqlServer } = require('./data/sql-card-reader');
        await loadCardsFromSqlServer();

        const { ocgLuaRunner } = require('./ocgcore/lua-runner');
        await ocgLuaRunner.init();
    } catch (err) {
        console.warn('[BOOT WARNING] Base de datos no disponible de inmediato, el servidor continuará con respaldo local:', err.message);
    }

    server.listen(PORT, () => {
        console.log(`========================================================`);
        console.log(` 🚀 Servidor Ani-Dimension Modular ACTIVO en puerto ${PORT}`);
        console.log(` 🌐 Web: http://localhost:${PORT}`);
        console.log(` 📱 Listo para conexión Web y APK Móvil (Capacitor)`);
        console.log(`========================================================`);
    });
}

startServer();

module.exports = { app, server, io };
