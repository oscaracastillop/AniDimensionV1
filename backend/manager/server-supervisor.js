/**
 * ==============================================================================
 * ANI-DIMENSION: SERVER SUPERVISOR & CONTROL PANEL ENGINE (PORT 3007)
 * ==============================================================================
 * Orquestador independiente desacoplado del juego:
 * - Supervisa el proceso Node.js del juego (backend/server.js en puerto 3006).
 * - Supervisa Caddy SSL (puertos 80/443 -> 3006).
 * - Realiza backups nativos de SQL Server sin detener el servidor.
 * - Emite logs en tiempo real vía SSE.
 * - Muestra métricas de CPU, RAM, jugadores conectados y duelos activos.
 * ==============================================================================
 */
const http = require('http');
const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn, exec } = require('child_process');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const SUPERVISOR_PORT = parseInt(process.env.SUPERVISOR_PORT || '3007', 10);
const GAME_PORT = parseInt(process.env.PORT || '3006', 10);

const app = express();
app.use(express.json());
app.use(express.static(path.resolve(__dirname, 'public')));

let gameProcess = null;
let caddyProcess = null;
let gameStatus = 'OFFLINE'; // 'STARTING', 'ONLINE', 'STOPPING', 'OFFLINE'
let caddyStatus = 'OFFLINE'; // 'ONLINE', 'OFFLINE', 'NOT_INSTALLED'
let serverStartedAt = null;

// Búfer circular de logs para la consola
const MAX_LOG_LINES = 500;
const logHistory = [];
const sseClients = new Set();

const LOG_FILE = path.resolve(__dirname, '../../logs/server_supervisor.log');

function appendLog(source, message, type = 'info') {
    const timeStr = new Date().toLocaleTimeString();
    const entry = {
        time: timeStr,
        source: source.toUpperCase(),
        text: message.trim(),
        type: type // 'info', 'success', 'warning', 'error', 'socket', 'duel', 'db'
    };

    logHistory.push(entry);
    if (logHistory.length > MAX_LOG_LINES) {
        logHistory.shift();
    }

    // Guardar en archivo plano para consumo por el .exe y auditoría
    try {
        fs.appendFileSync(LOG_FILE, `[${timeStr}] [${entry.source}] ${entry.text}\n`, 'utf8');
    } catch (e) {}

    // Notificar a todos los navegadores / dashboards conectados por SSE
    const payload = `data: ${JSON.stringify(entry)}\n\n`;
    for (const client of sseClients) {
        client.write(payload);
    }
}

function killProcessOnPort(port) {
    return new Promise((resolve) => {
        if (process.platform === 'win32') {
            exec(`netstat -ano | findstr :${port}`, (err, stdout) => {
                if (!stdout) return resolve();
                const lines = stdout.trim().split('\n');
                const pids = new Set();
                for (const line of lines) {
                    if (line.includes('LISTENING')) {
                        const parts = line.trim().split(/\s+/);
                        const pid = parseInt(parts[parts.length - 1], 10);
                        if (pid && !isNaN(pid) && pid !== process.pid) {
                            pids.add(pid);
                        }
                    }
                }
                if (pids.size === 0) return resolve();
                let pending = pids.size;
                pids.forEach((pid) => {
                    exec(`taskkill /PID ${pid} /F /T`, () => {
                        pending--;
                        if (pending <= 0) setTimeout(resolve, 600);
                    });
                });
            });
        } else {
            exec(`fuser -k ${port}/tcp`, () => resolve());
        }
    });
}

// ==============================================================================
// GESTIÓN DEL SERVIDOR DE JUEGO (NODE.JS)
// ==============================================================================
async function startGameServer() {
    appendLog('SUPERVISOR', `Iniciando Servidor Ani-Dimension en puerto ${GAME_PORT}...`, 'info');
    gameStatus = 'STARTING';

    // Garantizar que ningún proceso huérfano esté ocupando el puerto
    await killProcessOnPort(GAME_PORT);

    const projectRoot = path.resolve(__dirname, '../../');
    const serverScript = path.resolve(projectRoot, 'backend/server.js');

    gameProcess = spawn('node', [serverScript], {
        cwd: projectRoot,
        env: { ...process.env, PORT: String(GAME_PORT) }
    });

    serverStartedAt = Date.now();

    gameProcess.stdout.on('data', (data) => {
        const text = data.toString();
        const lines = text.split('\n');
        for (const line of lines) {
            if (!line.trim()) continue;
            let type = 'info';
            if (line.includes('ACTIVO') || line.includes('listo') || line.includes('exitosa')) type = 'success';
            if (line.includes('[SOCKET]') || line.includes('DUELO') || line.includes('DUEL')) type = 'duel';
            if (line.includes('[DB]') || line.includes('SQL')) type = 'db';
            if (line.includes('WARN') || line.includes('Alerta')) type = 'warning';
            if (line.includes('ERR') || line.includes('ERROR')) type = 'error';

            if (line.includes('Servidor Ani-Dimension Modular ACTIVO')) {
                gameStatus = 'ONLINE';
            }
            appendLog('GAME', line, type);
        }
    });

    gameProcess.stderr.on('data', (data) => {
        const text = data.toString();
        const lines = text.split('\n');
        for (const line of lines) {
            if (!line.trim()) continue;
            appendLog('GAME_ERR', line, 'error');
        }
    });

    gameProcess.on('close', (code) => {
        appendLog('SUPERVISOR', `El servidor se ha detenido (código ${code}).`, 'warning');
        gameProcess = null;
        gameStatus = 'OFFLINE';
        serverStartedAt = null;
    });

    gameProcess.on('error', (err) => {
        appendLog('SUPERVISOR', `Error al iniciar proceso Node: ${err.message}`, 'error');
        gameProcess = null;
        gameStatus = 'OFFLINE';
    });
}

async function stopGameServer() {
    gameStatus = 'STOPPING';
    appendLog('SUPERVISOR', 'Deteniendo el servidor de juego y liberando el puerto...', 'warning');

    if (gameProcess) {
        try { gameProcess.kill('SIGKILL'); } catch (e) {}
        gameProcess = null;
    }

    await killProcessOnPort(GAME_PORT);

    gameStatus = 'OFFLINE';
    serverStartedAt = null;
    appendLog('SUPERVISOR', `Servidor detenido completamente y puerto ${GAME_PORT} liberado.`, 'success');
}

// ==============================================================================
// GESTIÓN DE CADDY REVERSE PROXY & SSL
// ==============================================================================
function startCaddy() {
    const projectRoot = path.resolve(__dirname, '../../');
    const caddyfilePath = path.resolve(projectRoot, 'Caddyfile');

    if (!fs.existsSync(caddyfilePath)) {
        appendLog('CADDY', 'No se encontró archivo Caddyfile. SSL Caddy no iniciado.', 'warning');
        caddyStatus = 'OFFLINE';
        return;
    }

    // Verificar si Caddy está instalado en el sistema
    exec('caddy version', (err, stdout) => {
        if (err) {
            appendLog('CADDY', 'Caddy no está instalado en el sistema PATH. El servidor opera en HTTP estándar.', 'info');
            caddyStatus = 'NOT_INSTALLED';
            return;
        }

        appendLog('CADDY', `Caddy detectado (${stdout.trim()}). Iniciando Proxy SSL...`, 'info');
        caddyProcess = spawn('caddy', ['run', '--config', caddyfilePath], {
            cwd: projectRoot
        });

        caddyStatus = 'ONLINE';

        caddyProcess.stdout.on('data', (d) => {
            appendLog('CADDY', d.toString(), 'info');
        });
        caddyProcess.stderr.on('data', (d) => {
            appendLog('CADDY', d.toString(), 'info');
        });
        caddyProcess.on('close', () => {
            caddyStatus = 'OFFLINE';
            caddyProcess = null;
            appendLog('CADDY', 'Caddy detenido.', 'warning');
        });
    });
}

function stopCaddy() {
    if (caddyProcess) {
        if (process.platform === 'win32') {
            exec(`taskkill /pid ${caddyProcess.pid} /T /F`, () => {});
        } else {
            caddyProcess.kill();
        }
        caddyProcess = null;
        caddyStatus = 'OFFLINE';
    }
}

// ==============================================================================
// BACKUP NATIVO DE BASE DE DATOS SQL SERVER
// ==============================================================================
async function executeDbBackup() {
    appendLog('BACKUP', 'Generando respaldo nativo (.bak) de AniDimensionDB...', 'info');
    try {
        const { getPool } = require('../config/db');
        const pool = await getPool();
        const projectRoot = path.resolve(__dirname, '../../');
        const backupsDir = path.resolve(projectRoot, 'backups');
        if (!fs.existsSync(backupsDir)) {
            fs.mkdirSync(backupsDir, { recursive: true });
        }

        // Obtener ruta de datos nativa con permisos garantizados para SQL Server
        const pathRes = await pool.request().query("SELECT SERVERPROPERTY('InstanceDefaultDataPath') as data_path");
        const dataPath = pathRes.recordset[0].data_path;

        const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const fileName = `AniDimensionDB_Backup_${dateStr}.bak`;
        const sqlTargetFile = path.join(dataPath, fileName);
        const localTargetFile = path.join(backupsDir, fileName);

        await pool.request().query(`
            BACKUP DATABASE [AniDimensionDB] 
            TO DISK = N'${sqlTargetFile.replace(/'/g, "''")}'
            WITH FORMAT, INIT, NAME = N'AniDimensionDB-Full Backup', STATS = 10
        `);

        // Copiar a la carpeta de backups del proyecto
        if (fs.existsSync(sqlTargetFile)) {
            fs.copyFileSync(sqlTargetFile, localTargetFile);
        }

        appendLog('BACKUP', `✅ Respaldo generado con éxito: ${fileName}`, 'success');
        return { success: true, file: fileName, fullPath: localTargetFile };
    } catch (err) {
        appendLog('BACKUP', `❌ Error al generar respaldo: ${err.message}`, 'error');
        return { success: false, error: err.message };
    }
}

// Endpoint para obtener historial de logs recientes (usado por el .exe y herramientas externas)
app.get('/api/supervisor/logs', (req, res) => {
    res.json({ logs: logHistory });
});

// Stream de Logs en Vivo (SSE) con Heartbeat Keep-Alive anti-desconexión
app.get('/api/supervisor/logs/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (res.flushHeaders) res.flushHeaders();

    // Enviar historial inicial acumulado
    res.write(`data: ${JSON.stringify({ type: 'INIT_HISTORY', history: logHistory })}\n\n`);

    sseClients.add(res);

    // Heartbeat cada 12 segundos para mantener el túnel HTTP abierto permanentemente
    const pingTimer = setInterval(() => {
        try {
            res.write(': ping\n\n');
        } catch (e) {
            clearInterval(pingTimer);
        }
    }, 12000);

    req.on('close', () => {
        clearInterval(pingTimer);
        sseClients.delete(res);
    });
});

// Estado Integral del Servidor, Métricas y Máquina
app.get('/api/supervisor/status', async (req, res) => {
    let gameMetrics = { activeDuels: 0, connectedSockets: 0 };
    try {
        const response = await fetch(`http://127.0.0.1:${GAME_PORT}/api/status`);
        if (response.ok) {
            const data = await response.json();
            gameMetrics = data;
            if (gameStatus !== 'STARTING') {
                gameStatus = 'ONLINE';
            }
        } else {
            if (!gameProcess) gameStatus = 'OFFLINE';
        }
    } catch (e) {
        if (!gameProcess) gameStatus = 'OFFLINE';
    }

    const totalMem = Math.round(os.totalmem() / 1024 / 1024);
    const freeMem = Math.round(os.freemem() / 1024 / 1024);
    const usedMem = totalMem - freeMem;
    const cpuCores = os.cpus().length;

    res.json({
        gameStatus,
        caddyStatus,
        gamePort: GAME_PORT,
        supervisorPort: SUPERVISOR_PORT,
        uptimeSeconds: serverStartedAt ? Math.floor((Date.now() - serverStartedAt) / 1000) : 0,
        activeDuels: gameMetrics.activeDuels || 0,
        connectedSockets: gameMetrics.connectedSockets || 0,
        system: {
            totalMemMb: totalMem,
            usedMemMb: usedMem,
            freeMemMb: freeMem,
            cpuCores: cpuCores,
            osPlatform: os.platform(),
            hostName: os.hostname()
        }
    });
});

// Acciones de Control
app.post('/api/supervisor/action', async (req, res) => {
    const { action } = req.body;

    if (action === 'start') {
        await startGameServer();
        startCaddy();
        return res.json({ success: true, message: 'Comando de inicio enviado.' });
    }

    if (action === 'stop') {
        await stopGameServer();
        stopCaddy();
        return res.json({ success: true, message: 'Comando de detención enviado.' });
    }

    if (action === 'restart') {
        appendLog('SUPERVISOR', 'Reiniciando el servidor de juego...', 'warning');
        await stopGameServer();
        await startGameServer();
        return res.json({ success: true, message: 'Servidor reiniciado con éxito.' });
    }

    if (action === 'backup') {
        const result = await executeDbBackup();
        return res.json(result);
    }

    if (action === 'launch_browser') {
        const targetUrl = `http://localhost:${GAME_PORT}/views/lobby/lobby.html`;
        if (process.platform === 'win32') {
            exec(`start "" "${targetUrl}"`);
        } else {
            exec(`xdg-open "${targetUrl}"`);
        }
        return res.json({ success: true });
    }

    res.status(400).json({ error: 'Acción no válida' });
});

// ==============================================================================
// AUDITORÍA DE REPORTES DE BUGS EN DUELOS (PARA ANÁLISIS EN ANTIGRAVITY)
// ==============================================================================
function getReportedBugs() {
    const bugsLogFile = path.resolve(__dirname, '../../logs/reported_duel_bugs.log');
    if (!fs.existsSync(bugsLogFile)) return [];
    try {
        const content = fs.readFileSync(bugsLogFile, 'utf8');
        const lines = content.split('\n').filter(l => l.trim().length > 0);
        return lines.map((line, idx) => {
            const timeMatch = line.match(/^\[(.*?)\]/);
            const roomMatch = line.match(/\[ROOM:\s*(.*?)\]/);
            const reporterMatch = line.match(/@([a-zA-Z0-9_\-]+):/);
            const noteMatch = line.match(/"(.*?)"/);
            const turnMatch = line.match(/Turno:\s*#?(\d+)/i);
            const phaseMatch = line.match(/Fase:\s*([a-zA-Z0-9_]+)/i);

            return {
                id: `bug_${idx + 1}`,
                rawIndex: idx + 1,
                timestamp: timeMatch ? timeMatch[1] : new Date().toISOString(),
                room: roomMatch ? roomMatch[1] : 'SALA',
                reporter: reporterMatch ? reporterMatch[1] : 'Jugador',
                description: noteMatch ? noteMatch[1] : line,
                turn: turnMatch ? parseInt(turnMatch[1], 10) : 1,
                phase: phaseMatch ? phaseMatch[1] : 'MAIN',
                rawLine: line
            };
        }).reverse();
    } catch (e) {
        return [];
    }
}

app.get('/api/supervisor/bug-reports', (req, res) => {
    const bugs = getReportedBugs();
    res.json({ success: true, count: bugs.length, reports: bugs });
});

// ==============================================================================
// INICIALIZACIÓN DEL SUPERVISOR
// ==============================================================================
const server = http.createServer(app);

server.listen(SUPERVISOR_PORT, () => {
    console.log(`================================================================`);
    console.log(` 🛡️  ANI-DIMENSION SERVER SUPERVISOR (TIPO MU-SERVER) ONLINE`);
    console.log(` 🖥️  Panel de Control GUI: http://localhost:${SUPERVISOR_PORT}`);
    console.log(` 🎮  Puerto del Servidor de Juego: ${GAME_PORT}`);
    console.log(`================================================================`);

    // Iniciar automáticamente el servidor del juego y Caddy al arrancar el supervisor
    startGameServer();
    startCaddy();
});
