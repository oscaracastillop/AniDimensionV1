/**
 * ANI-DIMENSION: MOTOR CENTRAL DE AUDITORÍA, REPLAY Y TEXT LOGS DE DUELOS
 * Registra el 100% de los eventos, paquetes y validaciones de cada partida en archivos de texto
 * estructurados para detección de fraudes, análisis de jugadas y auditoría de torneos.
 */
const fs = require('fs');
const path = require('path');

const LOGS_BASE_DIR = path.resolve(__dirname, '../logs');
const DUELS_LOGS_DIR = path.join(LOGS_BASE_DIR, 'duels');
const ERRORS_LOGS_DIR = path.join(LOGS_BASE_DIR, 'errors');
const AUDIT_LOGS_DIR = path.join(LOGS_BASE_DIR, 'audit');

// Asegurar directorios base
[LOGS_BASE_DIR, DUELS_LOGS_DIR, ERRORS_LOGS_DIR, AUDIT_LOGS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        try {
            fs.mkdirSync(dir, { recursive: true });
        } catch (e) {}
    }
});

// Mapa en memoria de streams / rutas de log por sala activa
const activeDuelLogFiles = new Map();

function getFormattedDate(date = new Date()) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function getFormattedTime(date = new Date()) {
    return date.toISOString();
}

/**
 * Iniciar el archivo de log dedicado para un duelo
 */
function initDuelLog(roomId, p1Name = 'Player1', p2Name = 'Player2', duelMetadata = {}) {
    try {
        const dateFolder = getFormattedDate();
        const dayDir = path.join(DUELS_LOGS_DIR, dateFolder);
        if (!fs.existsSync(dayDir)) {
            fs.mkdirSync(dayDir, { recursive: true });
        }

        const safeP1 = (p1Name || 'P1').replace(/[^a-zA-Z0-9_-]/g, '_');
        const safeP2 = (p2Name || 'P2').replace(/[^a-zA-Z0-9_-]/g, '_');
        const safeRoom = (roomId || 'ROOM').replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `duel_${safeRoom}_${safeP1}_vs_${safeP2}.log`;
        const fullPath = path.join(dayDir, filename);
        const relativePath = `logs/duels/${dateFolder}/${filename}`;

        const header = [
            `================================================================================`,
            `ANI-DIMENSION OCG DUEL AUDIT LOG - TEXT REPLAY SYSTEM`,
            `================================================================================`,
            `Room ID       : ${roomId}`,
            `Player 1 (Host): ${p1Name}`,
            `Player 2 (Rival): ${p2Name}`,
            `Started At    : ${new Date().toISOString()}`,
            `Duel Mode     : ${duelMetadata.isPvp ? 'PvP Online' : (duelMetadata.isAdventure ? 'Adventure NPC' : 'Demo / Training')}`,
            `Tournament ID : ${duelMetadata.tournamentId || 'N/A'}`,
            `Initial LP    : P1=8000 | P2=8000`,
            `Deck Size     : P1=${duelMetadata.p1DeckCount || 40} cards | P2=${duelMetadata.p2DeckCount || 40} cards`,
            `================================================================================\n`
        ].join('\n');

        fs.writeFileSync(fullPath, header, { encoding: 'utf8' });
        activeDuelLogFiles.set(roomId, {
            fullPath,
            relativePath,
            roomId,
            p1Name,
            p2Name,
            startTime: Date.now()
        });

        return relativePath;
    } catch (err) {
        console.error(`[DUEL LOGGER ERROR] No se pudo inicializar log para sala ${roomId}:`, err);
        return null;
    }
}

/**
 * Registrar un evento o jugada en el log del duelo
 */
function logDuelEvent(roomId, { turnNumber, phase, p1Lp, p2Lp, type, message, metadata, player }) {
    try {
        const timeStr = getFormattedTime();
        let logData = activeDuelLogFiles.get(roomId);

        // Si el archivo no fue inicializado explícitamente, crearlo sobre la marcha
        if (!logData) {
            initDuelLog(roomId, 'Player1', 'Player2', {});
            logData = activeDuelLogFiles.get(roomId);
        }

        if (!logData) return;

        const playerTag = player ? ` [PLAYER:${player}]` : '';
        const phaseTag = phase ? ` [${phase}]` : '';
        const turnTag = (turnNumber !== undefined && turnNumber !== null) ? ` [T:${turnNumber}]` : '';
        const lpTag = (p1Lp !== undefined && p2Lp !== undefined) ? ` [LP:${p1Lp}/${p2Lp}]` : '';
        const metaStr = metadata ? ` | META: ${JSON.stringify(metadata)}` : '';

        const line = `[${timeStr}]${turnTag}${phaseTag}${lpTag}${playerTag} [${(type || 'INFO').toUpperCase()}] ${message}${metaStr}\n`;

        fs.appendFile(logData.fullPath, line, 'utf8', () => {});
    } catch (err) {
        // Fallo silencioso en logging para no interrumpir el flujo de la partida
    }
}

/**
 * Registrar una infracción de seguridad o intento de fraude
 */
function logSecurityAlert(roomId, player, violationType, details = {}) {
    try {
        const timeStr = getFormattedTime();
        const dateFolder = getFormattedDate();
        const alertLine = `[${timeStr}] [SECURITY ALERT] [ROOM:${roomId}] [PLAYER:${player}] [VIOLATION:${violationType}] Details: ${JSON.stringify(details)}\n`;

        // 1. Escribir en el log del duelo
        const logData = activeDuelLogFiles.get(roomId);
        if (logData) {
            fs.appendFileSync(logData.fullPath, `\n🚨 >>> ${alertLine}\n`, { encoding: 'utf8' });
        }

        // 2. Escribir en el log central de auditoría y trampas
        const auditFile = path.join(AUDIT_LOGS_DIR, `security_audit_${dateFolder}.log`);
        fs.appendFileSync(auditFile, alertLine, { encoding: 'utf8' });

        console.warn(`[SECURITY AUDIT] 🚨 ${alertLine}`);
    } catch (err) {}
}

/**
 * Registrar un error o excepción de ejecución de duelo
 */
function logDuelError(roomId, errorType, error, context = {}) {
    try {
        const timeStr = getFormattedTime();
        const dateFolder = getFormattedDate();
        const errLine = `[${timeStr}] [ERROR:${errorType}] [ROOM:${roomId}] Message: ${error ? (error.message || error) : 'Unknown'} | Stack: ${error?.stack || 'N/A'} | Context: ${JSON.stringify(context)}\n`;

        // 1. Escribir en log del duelo
        const logData = activeDuelLogFiles.get(roomId);
        if (logData) {
            fs.appendFileSync(logData.fullPath, `\n⚠️ >>> ${errLine}\n`, { encoding: 'utf8' });
        }

        // 2. Escribir en log central diario de errores
        const errorsFile = path.join(ERRORS_LOGS_DIR, `errors_${dateFolder}.log`);
        fs.appendFileSync(errorsFile, errLine, { encoding: 'utf8' });
    } catch (e) {}
}

/**
 * Finalizar el log del duelo con resumen de estadísticas y resultados
 */
function finalizeDuelLog(roomId, winner, reason, stats = {}) {
    try {
        const logData = activeDuelLogFiles.get(roomId);
        if (!logData) return null;

        const durationSec = Math.round((Date.now() - logData.startTime) / 1000);
        const footer = [
            `\n================================================================================`,
            `DUEL CONCLUSION & FINAL AUDIT SUMMARY`,
            `================================================================================`,
            `Winner        : ${winner || 'DRAW / NONE'}`,
            `Reason        : ${reason || 'GAME_OVER'}`,
            `Total Duration: ${durationSec} seconds`,
            `Final LP      : P1=${stats.p1Lp !== undefined ? stats.p1Lp : 'N/A'} | P2=${stats.p2Lp !== undefined ? stats.p2Lp : 'N/A'}`,
            `Turns Played  : ${stats.turnsPlayed || 'N/A'}`,
            `Rewards P1    : Starships=${stats.p1Starships || 0}, Exp=${stats.p1Exp || 0}`,
            `Rewards P2    : Starships=${stats.p2Starships || 0}, Exp=${stats.p2Exp || 0}`,
            `Log Completed : ${new Date().toISOString()}`,
            `================================================================================\n`
        ].join('\n');

        fs.appendFileSync(logData.fullPath, footer, { encoding: 'utf8' });
        const relativePath = logData.relativePath;
        activeDuelLogFiles.delete(roomId);

        return relativePath;
    } catch (err) {
        console.error(`[DUEL LOGGER ERROR] No se pudo finalizar log de sala ${roomId}:`, err);
        return null;
    }
}

/**
 * Obtener la ruta relativa del log de una sala activa
 */
function getDuelLogPath(roomId) {
    const logData = activeDuelLogFiles.get(roomId);
    return logData ? logData.relativePath : null;
}

/**
 * Listar todos los logs de duelos para auditoría administrativa
 */
function listDuelLogs(dateFilter = null) {
    try {
        const targetDate = dateFilter || getFormattedDate();
        const dayDir = path.join(DUELS_LOGS_DIR, targetDate);
        if (!fs.existsSync(dayDir)) return [];

        const files = fs.readdirSync(dayDir).filter(f => f.endsWith('.log'));
        return files.map(file => {
            const fullPath = path.join(dayDir, file);
            const stats = fs.statSync(fullPath);
            return {
                filename: file,
                date: targetDate,
                relativePath: `logs/duels/${targetDate}/${file}`,
                sizeBytes: stats.size,
                lastModified: stats.mtime
            };
        }).sort((a, b) => b.lastModified - a.lastModified);
    } catch (e) {
        return [];
    }
}

/**
 * Leer el contenido de un log específico
 */
function readDuelLogContent(relativePath) {
    try {
        const fullPath = path.resolve(LOGS_BASE_DIR, '..', relativePath);
        if (fs.existsSync(fullPath)) {
            return fs.readFileSync(fullPath, 'utf8');
        }
        return null;
    } catch (e) {
        return null;
    }
}

module.exports = {
    initDuelLog,
    logDuelEvent,
    logSecurityAlert,
    logDuelError,
    finalizeDuelLog,
    getDuelLogPath,
    listDuelLogs,
    readDuelLogContent
};
