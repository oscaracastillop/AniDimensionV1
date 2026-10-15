/**
 * Ani-Dimension: Motor de Eventos en Vivo de Chat Global
 * Incluye Algoritmo de Normalización IA de Respuestas, Enmascarado de Pistas,
 * Bloqueo/Desbloqueo Automatizado y Registro de Ganadores y Premios.
 */

const { getPool, sql } = require('../config/db');

// Estado en memoria del chat y del evento activo
let isChatMuted = false;
let mutedBy = null;
let pinnedMessage = '¡Bienvenidos al Chat Global Oficial de Ani-Dimension OCG!';
let pinnedColor = '#00F0FF';
let pinnedBy = 'Sistema';

let activeEvent = null;
let countdownTimer = null;
let ioInstance = null;

function setChatIo(io) {
    ioInstance = io;
}

function getChatIo() {
    return ioInstance;
}

/**
 * Algoritmo de Normalización Inteligente:
 * Quita tildes, símbolos, mayúsculas y normaliza espacios.
 */
function normalizeText(text) {
    if (!text || typeof text !== 'string') return '';
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos y diacríticos
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?'"¡¿!+]/g, "") // Eliminar signos de puntuación
        .replace(/\s+/g, ' ') // Espacios múltiples a 1 espacio
        .trim();
}

/**
 * Algoritmo de Enmascarado Inteligente para "Adivina la Palabra o Frase":
 * Procesa palabra por palabra revelando aproximadamente el 35-45% de las letras
 * en posiciones estratégicas alternadas para dar pistas de referencia manteniendo el resto como '_'.
 * Ejemplo: "Oscar Castillo" -> "_ s _ a _   _ _ s t _ _ _ o"
 */
function generateMaskedPrompt(phrase) {
    if (!phrase || typeof phrase !== 'string') return '';
    const clean = phrase.trim();
    if (!clean) return '';

    const words = clean.split(/\s+/);
    
    const maskedWords = words.map(word => {
        const chars = word.split('');
        const len = chars.length;

        if (len === 1) return '_';
        if (len === 2) return `_ ${chars[1]}`;

        const revealCount = Math.max(1, Math.min(len - 1, Math.round(len * 0.38)));
        const revealIndices = new Set();

        if (len <= 5) {
            revealIndices.add(1);
            if (revealCount > 1 && len >= 4) {
                revealIndices.add(3);
            }
        } else {
            const step = Math.max(2, Math.floor(len / revealCount));
            for (let i = 1; i < len; i += step) {
                if (revealIndices.size < revealCount) {
                    revealIndices.add(i);
                }
            }
            if (revealIndices.size < revealCount && len > 4) {
                revealIndices.add(len - 1);
            }
        }

        return chars.map((ch, idx) => {
            if (!/[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]/.test(ch)) {
                return ch;
            }
            return revealIndices.has(idx) ? ch : '_';
        }).join(' ');
    });

    return maskedWords.join('   ');
}

/**
 * Inicializar configuración del chat desde la BD
 */
async function loadChatSettingsFromDB() {
    try {
        const pool = await getPool();
        const res = await pool.request().query('SELECT TOP 1 * FROM dbo.ChatSettings WHERE Id = 1');
        if (res.recordset.length > 0) {
            const s = res.recordset[0];
            isChatMuted = !!s.IsMuted;
            mutedBy = s.MutedBy;
            pinnedMessage = s.PinnedMessage || '';
            pinnedColor = s.PinnedColor || '#00F0FF';
            pinnedBy = s.PinnedBy || 'Admin';
        }
    } catch (e) {
        console.warn('[CHAT SETTINGS LOAD WARNING]', e.message);
    }
}

/**
 * Cambiar estado de bloqueo del chat
 */
async function setChatMutedState(muted, byUser = 'Admin') {
    isChatMuted = !!muted;
    mutedBy = byUser;

    try {
        const pool = await getPool();
        await pool.request()
            .input('muted', sql.Bit, isChatMuted ? 1 : 0)
            .input('by', sql.VarChar(50), byUser)
            .query('UPDATE dbo.ChatSettings SET IsMuted = @muted, MutedBy = @by, UpdatedAt = GETDATE() WHERE Id = 1');
    } catch (e) {}

    if (ioInstance) {
        ioInstance.emit('CHAT_MUTED_CHANGE', {
            isMuted: isChatMuted,
            mutedBy: byUser
        });
    }

    return isChatMuted;
}

/**
 * Fijar / Desfijar mensaje destacado
 */
async function setPinnedMessage(message, color = '#00F0FF', byUser = 'Admin') {
    pinnedMessage = (message || '').trim();
    pinnedColor = color || '#00F0FF';
    pinnedBy = byUser;

    try {
        const pool = await getPool();
        await pool.request()
            .input('msg', sql.NVarChar(500), pinnedMessage)
            .input('col', sql.VarChar(30), pinnedColor)
            .input('by', sql.VarChar(50), byUser)
            .query('UPDATE dbo.ChatSettings SET PinnedMessage = @msg, PinnedColor = @col, PinnedBy = @by, UpdatedAt = GETDATE() WHERE Id = 1');
    } catch (e) {}

    if (ioInstance) {
        ioInstance.emit('CHAT_PINNED_MESSAGE', {
            message: pinnedMessage,
            color: pinnedColor,
            pinnedBy: byUser
        });
    }

    return { pinnedMessage, pinnedColor };
}

/**
 * Lanzar un nuevo Evento en Vivo con Cuenta Regresiva
 */
async function launchLiveEvent({ eventType, questionOrPrompt, correctAnswer, prizeText, countdownSeconds = 5, launchedBy = 'Admin' }) {
    if (countdownTimer) clearInterval(countdownTimer);

    const cleanType = (eventType || 'WORD_COMPLETION').toUpperCase();
    const prompt = (questionOrPrompt || '').trim();
    const answer = (correctAnswer || '').trim();
    const prize = (prizeText || 'Premio Sorpresa').trim();
    const countdown = Math.max(1, parseInt(countdownSeconds || 5, 10));

    let masked = null;
    if (cleanType === 'WORD_COMPLETION') {
        masked = generateMaskedPrompt(answer);
    }

    const normAnswer = normalizeText(answer);

    const pool = await getPool();
    const insertRes = await pool.request()
        .input('type', sql.VarChar(50), cleanType)
        .input('prompt', sql.NVarChar(500), prompt)
        .input('masked', sql.NVarChar(500), masked)
        .input('ans', sql.NVarChar(500), answer)
        .input('norm', sql.NVarChar(500), normAnswer)
        .input('prize', sql.NVarChar(300), prize)
        .input('sec', sql.Int, countdown)
        .query(`
            INSERT INTO dbo.ChatEvents (EventType, QuestionOrPrompt, MaskedPrompt, CorrectAnswer, NormalizedAnswer, PrizeText, LaunchCountdownSeconds, Status)
            OUTPUT INSERTED.Id
            VALUES (@type, @prompt, @masked, @ans, @norm, @prize, @sec, 'PENDING')
        `);

    const eventId = insertRes.recordset[0].Id;

    activeEvent = {
        id: eventId,
        eventType: cleanType,
        questionOrPrompt: prompt,
        maskedPrompt: masked,
        correctAnswer: answer,
        normalizedAnswer: normAnswer,
        prizeText: prize,
        status: 'PENDING',
        launchedBy: launchedBy
    };

    // 1. Bloquear previamente el chat general para que nadie escriba antes de tiempo
    await setChatMutedState(true, 'Sistema de Eventos (Cuenta Regresiva)');

    // 2. Transmitir inicio de cuenta regresiva
    let remaining = countdown;
    if (ioInstance) {
        ioInstance.emit('EVENT_COUNTDOWN_TICK', {
            eventId: eventId,
            remainingSeconds: remaining,
            eventType: cleanType,
            prize: prize
        });
    }

    countdownTimer = setInterval(async () => {
        remaining -= 1;
        if (remaining > 0) {
            if (ioInstance) {
                ioInstance.emit('EVENT_COUNTDOWN_TICK', {
                    eventId: eventId,
                    remainingSeconds: remaining,
                    eventType: cleanType,
                    prize: prize
                });
            }
        } else {
            clearInterval(countdownTimer);
            countdownTimer = null;

            // 3. Al llegar a 0: Activar evento y DESBLOQUEAR EL CHAT INSTANTÁNEAMENTE
            activeEvent.status = 'ACTIVE';
            await pool.request()
                .input('eid', sql.Int, eventId)
                .query("UPDATE dbo.ChatEvents SET Status = 'ACTIVE' WHERE Id = @eid");

            await setChatMutedState(false, 'Sistema de Eventos (Desafío en Vivo)');

            if (ioInstance) {
                ioInstance.emit('EVENT_LIVE_STARTED', {
                    eventId: eventId,
                    eventType: cleanType,
                    prompt: prompt,
                    maskedPrompt: masked,
                    prizeText: prize,
                    launchedBy: launchedBy
                });
            }
        }
    }, 1000);

    return activeEvent;
}

/**
 * Evalúa cada mensaje del chat en tiempo real contra el evento activo
 */
async function evaluateMessageForActiveEvent(userId, username, userMessage) {
    if (!activeEvent || activeEvent.status !== 'ACTIVE') return null;

    const normInput = normalizeText(userMessage);
    if (!normInput) return null;

    // Verificar si la respuesta es exacta según el algoritmo normalizado
    if (normInput === activeEvent.normalizedAnswer) {
        // ¡¡¡HAY GANADOR!!!
        const eventCopy = { ...activeEvent };
        activeEvent.status = 'COMPLETED';
        const completedEvent = activeEvent;
        activeEvent = null;

        // 1. Bloquear instantáneamente el chat
        await setChatMutedState(true, `Fin de Ronda (Ganador: ${username})`);

        // 2. Persistir en Base de Datos
        try {
            const pool = await getPool();
            await pool.request()
                .input('eid', sql.Int, eventCopy.id)
                .input('uid', sql.Int, userId || 1)
                .input('uname', sql.VarChar(50), username)
                .input('msg', sql.NVarChar(500), userMessage)
                .query(`
                    UPDATE dbo.ChatEvents 
                    SET Status = 'COMPLETED',
                        WinnerUserId = @uid,
                        WinnerUsername = @uname,
                        WinnerMessage = @msg,
                        CompletedAt = GETDATE()
                    WHERE Id = @eid
                `);
        } catch (dbE) {
            console.error('[EVENT DB SAVE ERROR]', dbE);
        }

        // 3. Transmitir anuncio oficial de Ganador
        if (ioInstance) {
            ioInstance.emit('EVENT_WINNER_ANNOUNCED', {
                eventId: eventCopy.id,
                eventType: eventCopy.eventType,
                winner: username,
                winnerUserId: userId,
                correctAnswer: eventCopy.correctAnswer,
                prizeText: eventCopy.prizeText,
                winningMessage: userMessage
            });
        }

        return {
            isWinner: true,
            winner: username,
            event: eventCopy
        };
    }

    return null;
}

/**
 * Cancelar evento en vivo
 */
async function cancelActiveEvent(byUser = 'Admin') {
    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }

    if (activeEvent) {
        try {
            const pool = await getPool();
            await pool.request()
                .input('eid', sql.Int, activeEvent.id)
                .query("UPDATE dbo.ChatEvents SET Status = 'CANCELLED' WHERE Id = @eid");
        } catch (e) {}

        activeEvent = null;
    }

    await setChatMutedState(false, byUser);

    if (ioInstance) {
        ioInstance.emit('EVENT_CANCELLED', { cancelledBy: byUser });
    }

    return true;
}

module.exports = {
    setChatIo,
    getChatIo,
    normalizeText,
    generateMaskedPrompt,
    loadChatSettingsFromDB,
    getChatState: () => ({ isChatMuted, mutedBy, pinnedMessage, pinnedColor, pinnedBy, activeEvent }),
    setChatMutedState,
    setPinnedMessage,
    launchLiveEvent,
    evaluateMessageForActiveEvent,
    cancelActiveEvent
};
