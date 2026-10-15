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
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { getPool } = require('./config/db');
const { setIo } = require('./engine/duel-state');
const { initDuelSockets } = require('./sockets/duel.socket');

const authRoutes = require('./routes/auth.routes');
const lobbyRoutes = require('./routes/lobby.routes');
const cardsRoutes = require('./routes/cards.routes');
const adminRoutes = require('./routes/admin.routes');
const eventsRoutes = require('./routes/events.routes');
const clansRoutes = require('./routes/clans.routes');
const rankingsRoutes = require('./routes/rankings.routes');
const adventureRoutes = require('./routes/adventure.routes');
const avatarsRoutes = require('./routes/avatars.routes');
const chatRoutes = require('./routes/chat.routes');
const gameRoutes = require('./routes/game.routes');
const tournamentsRoutes = require('./routes/tournaments.routes');
const subastaRoutes = require('./routes/subasta.routes');
const landingRoutes = require('./routes/landing.routes');
const audioRoutes = require('./routes/audio.routes');
const subastaController = require('./controllers/subasta.controller');
const chatEngine = require('./engine/chat-event-engine');
const { tournamentService } = require('./engine/tournament-service');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

// Registrar la instancia de IO en el estado de duelos para emitir logs y actualizaciones
setIo(io);
subastaController.setSubastaIo(io);

// Manejo seguro de excepciones no capturadas para mantener el servidor siempre activo
process.on('uncaughtException', (err) => {
    console.error('[UNCAUGHT EXCEPTION]', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('[UNHANDLED REJECTION]', reason);
});

// Middlewares globales
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir frontend y assets: Cero caché para HTML, CSS y JS (Auto-update instantáneo) y caché sólo para multimedia
const frontendPath = path.resolve(__dirname, '../frontend');
app.use(express.static(frontendPath, {
    etag: false,
    lastModified: false,
    setHeaders: (res, filePath) => {
        if (/\.(html|css|js|json)$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.setHeader('Surrogate-Control', 'no-store');
        } else if (/\.(jpg|jpeg|png|gif|svg|webp|mp3|ogg|wav|ico|woff2?|ttf)$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=86400');
        }
    }
}));

// Redirección inteligente de imágenes de cartas OCG a CDN oficial de alta disponibilidad
app.get(['/assets/images/cards/:cardId.jpg', '/assets/images/cards/:cardId.png'], (req, res) => {
    const rawId = req.params.cardId;
    if (rawId === 'placeholder' || !/^\d+$/.test(rawId)) {
        return res.sendFile(path.resolve(__dirname, '../frontend/assets/images/cards/placeholder.png'));
    }
    return res.redirect(`https://images.ygoprodeck.com/images/cards_small/${rawId}.jpg`);
});

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

// Rutas de acceso directo al juego (Saltándose la Landing Page para acceso rápido o APK)
app.get(['/play', '/game', '/app'], (req, res) => {
    res.redirect('/views/login/login.html');
});
app.get(['/adventure', '/aventura'], (req, res) => {
    res.redirect('/views/duels/npc/select-npc.html');
});

// Rutas de API REST modularizadas
app.use('/api/auth', authRoutes);
app.use('/api/user', authRoutes); // Soporte retrocompatible para /api/user/update-nick
app.use('/api/game', gameRoutes);
app.use('/api/lobby', lobbyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/subastas', subastaRoutes);
app.use('/api/clans', clansRoutes);
app.use('/api/rankings', rankingsRoutes);
app.use('/api/adventure', adventureRoutes);
app.use('/api/avatars', avatarsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/tournaments', tournamentsRoutes);
app.use('/api/landing', landingRoutes);
app.use('/api/audio', audioRoutes);
app.get('/api/landing-data', require('./controllers/landing.controller').getLandingData);
app.use('/api', cardsRoutes);

// Endpoint de prueba rápida / health check y métricas de servidor
app.get('/api/status', (req, res) => {
    let activeDuelsCount = 0;
    try {
        const duelState = require('./engine/duel-state');
        if (typeof duelState.getAllActiveRooms === 'function') {
            activeDuelsCount = Object.keys(duelState.getAllActiveRooms()).length;
        }
    } catch (e) {}

    const connectedCount = io && io.engine ? io.engine.clientsCount : 0;

    res.json({
        status: 'online',
        service: 'Ani-Dimension Modular Server',
        activeDuels: activeDuelsCount,
        connectedSockets: connectedCount,
        connectedPlayers: connectedCount,
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsageMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        timestamp: new Date().toISOString()
    });
});

// Inicializar WebSockets de Duelos y Chat
initDuelSockets(io);
chatEngine.setChatIo(io);
tournamentService.setIo(io);

// Conectar base de datos y arrancar servidor
const PORT = parseInt(process.env.PORT || '3005', 10);

server.listen(PORT, () => {
    console.log(`========================================================`);
    console.log(` 🚀 Servidor Ani-Dimension Modular ACTIVO en puerto ${PORT}`);
    console.log(` 🌐 Web: http://localhost:${PORT}`);
    console.log(` 📱 Listo para conexión Web y APK Móvil (Capacitor)`);
    console.log(`========================================================`);

    // Inicializar servicios de base de datos y OCG en segundo plano
    (async () => {
        try {
            console.log('[BOOT] Conectando a base de datos SQL Server...');
            await getPool();
            console.log('[BOOT] SQL Server listo.');

            await chatEngine.loadChatSettingsFromDB();

            const { loadCardsFromSqlServer } = require('./data/sql-card-reader');
            await loadCardsFromSqlServer();
            console.log('✅ [CORE DIMENSION] Motor nativo de duelos 100% activo y listo.');
        } catch (err) {
            console.warn('[BOOT WARNING] Base de datos no disponible de inmediato, el servidor continúa con respaldo local:', err.message);
        }
    })();
});

module.exports = { app, server, io };

