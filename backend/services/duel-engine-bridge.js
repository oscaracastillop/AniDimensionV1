/**
 * Ani-Dimension: Conector / Bridge hacia el Microservicio Oficial de Duelos (Project Ignis / ocgcore WASM)
 * Puerto: 7001
 */
const { spawn } = require('child_process');
const path = require('path');
const DUEL_SERVICE_URL = process.env.DUEL_SERVICE_URL || 'http://localhost:7001';

class DuelEngineBridge {
    constructor() {
        this.serviceUrl = DUEL_SERVICE_URL;
        this.isServiceAvailable = false;
        this.init();
    }

    async init() {
        await this.ensureServiceRunning();
    }

    async checkHealth() {
        try {
            const res = await fetch(`${this.serviceUrl}/health`, { signal: AbortSignal.timeout(2000) });
            const data = await res.json();
            this.isServiceAvailable = data.status === 'ok';
            if (this.isServiceAvailable) {
                console.log(`[DUEL BRIDGE] Conectado exitosamente con Árbitro Oficial Project Ignis en ${this.serviceUrl}`);
            }
            return this.isServiceAvailable;
        } catch (e) {
            this.isServiceAvailable = false;
            return false;
        }
    }

    async ensureServiceRunning() {
        if (await this.checkHealth()) return true;

        try {
            console.log('[DUEL BRIDGE] Microservicio Project Ignis fuera de línea. Iniciando automáticamente en puerto 7001...');
            const duelServiceDir = path.resolve(__dirname, '../../duel-service');
            const child = spawn(process.execPath, ['server.js'], {
                cwd: duelServiceDir,
                env: { ...process.env, PORT: '7001', DUEL_SERVICE_PORT: '7001' },
                stdio: 'inherit',
                detached: true
            });
            child.unref();

            // Esperar hasta 6 segundos a que el microservicio inicialice WASM y cards.cdb
            for (let i = 0; i < 15; i++) {
                await new Promise(r => setTimeout(r, 400));
                if (await this.checkHealth()) {
                    console.log('[DUEL BRIDGE] Microservicio Project Ignis verificado y listo.');
                    return true;
                }
            }
        } catch (e) {
            console.error('[DUEL BRIDGE] Error iniciando proceso del microservicio:', e.message);
        }
        return false;
    }

    /**
     * Inicia una sesión de duelo oficial en Project Ignis
     */
    async createDuel({ duelId, player0Deck = [], player1Deck = [], lp = 8000, startHand = 5, drawCount = 1, seed, isNpc = true }) {
        try {
            if (!this.isServiceAvailable) {
                await this.ensureServiceRunning();
            }

            const cleanP0 = (player0Deck || []).map(c => Number(typeof c === 'object' ? (c.code || c.id || c.card_id) : c)).filter(c => c > 0);
            const cleanP1 = (player1Deck || []).map(c => Number(typeof c === 'object' ? (c.code || c.id || c.card_id) : c)).filter(c => c > 0);

            const res = await fetch(`${this.serviceUrl}/duel/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    duelId,
                    player0Deck: cleanP0,
                    player1Deck: cleanP1,
                    lp,
                    startHand,
                    drawCount,
                    seed,
                    isNpc: Boolean(isNpc)
                }),
                signal: AbortSignal.timeout(8000)
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Error desconocido' }));
                throw new Error(err.error || `HTTP ${res.status}`);
            }

            return await res.json();
        } catch (err) {
            console.error(`[DUEL BRIDGE] Error creando duelo ${duelId} en Project Ignis:`, err.message);
            throw err;
        }
    }

    /**
     * Ejecuta una acción de duelo semántica en Project Ignis
     */
    async executeAction({ duelId, action }) {
        try {
            const res = await fetch(`${this.serviceUrl}/duel/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ duelId, action }),
                signal: AbortSignal.timeout(6000)
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Error desconocido' }));
                throw new Error(err.error || `HTTP ${res.status}`);
            }

            return await res.json();
        } catch (err) {
            console.error(`[DUEL BRIDGE] Error ejecutando acción en ${duelId}:`, err.message);
            throw err;
        }
    }

    /**
     * Envía respuesta raw de bajo nivel
     */
    async submitResponse({ duelId, response }) {
        try {
            const res = await fetch(`${this.serviceUrl}/duel/response`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ duelId, response }),
                signal: AbortSignal.timeout(5000)
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Error desconocido' }));
                throw new Error(err.error || `HTTP ${res.status}`);
            }

            return await res.json();
        } catch (err) {
            console.error(`[DUEL BRIDGE] Error enviando respuesta a ${duelId}:`, err.message);
            throw err;
        }
    }

    /**
     * Consulta el estado del campo en el árbitro
     */
    async getFieldState(duelId) {
        try {
            const res = await fetch(`${this.serviceUrl}/duel/${encodeURIComponent(duelId)}`, {
                signal: AbortSignal.timeout(4000)
            });

            if (!res.ok) return null;
            return await res.json();
        } catch (err) {
            console.error(`[DUEL BRIDGE] Error consultando campo de ${duelId}:`, err.message);
            return null;
        }
    }

    /**
     * Termina el duelo en el microservicio
     */
    async endDuel(duelId) {
        try {
            const res = await fetch(`${this.serviceUrl}/duel/end`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ duelId }),
                signal: AbortSignal.timeout(3000)
            });

            if (!res.ok) return null;
            return await res.json();
        } catch (err) {
            console.warn(`[DUEL BRIDGE] Error finalizando duelo ${duelId}:`, err.message);
            return null;
        }
    }

    /**
     * Sincroniza el estado local de Ani Dimension con la respuesta del motor oficial Ignis
     */
    syncStateFromIgnis(duelState, ignisRes) {
        if (!duelState || !ignisRes) return;
        const f = ignisRes.field;
        if (!f) return;

        const p0 = f.players ? f.players[0] : f.player0;
        const p1 = f.players ? f.players[1] : f.player1;

        if (p0 && duelState.player1) {
            if (typeof p0.lp === 'number') duelState.player1.lp = p0.lp;
            if (typeof p0.deckCount === 'number') duelState.player1.mainDeckCount = p0.deckCount;
            if (Array.isArray(p0.monsters)) duelState.player1.monsters = p0.monsters;
            if (Array.isArray(p0.spells)) duelState.player1.spells = p0.spells;
            if (Array.isArray(p0.hand)) duelState.player1.hand = p0.hand;
            if (Array.isArray(p0.graveyard)) duelState.player1.graveyard = p0.graveyard;
            if (Array.isArray(p0.banished)) duelState.player1.banished = p0.banished;
            if (Array.isArray(p0.extraDeck)) duelState.player1.extraDeck = p0.extraDeck;
            if (typeof p0.extraCount === 'number') duelState.player1.extraDeckCount = p0.extraCount;
        }

        if (p1 && duelState.player2) {
            if (typeof p1.lp === 'number') duelState.player2.lp = p1.lp;
            if (typeof p1.deckCount === 'number') duelState.player2.mainDeckCount = p1.deckCount;
            if (Array.isArray(p1.monsters)) duelState.player2.monsters = p1.monsters;
            if (Array.isArray(p1.spells)) duelState.player2.spells = p1.spells;
            if (Array.isArray(p1.hand)) duelState.player2.hand = p1.hand;
            if (Array.isArray(p1.graveyard)) duelState.player2.graveyard = p1.graveyard;
            if (Array.isArray(p1.banished)) duelState.player2.banished = p1.banished;
            if (Array.isArray(p1.extraDeck)) duelState.player2.extraDeck = p1.extraDeck;
            if (typeof p1.extraCount === 'number') duelState.player2.extraDeckCount = p1.extraCount;
        }

        if (ignisRes.phase) {
            duelState.phase = ignisRes.phase;
        }
        if (ignisRes.playerTurn !== undefined) {
            duelState.turnPlayer = ignisRes.playerTurn === 0 
                ? duelState.player1.username 
                : duelState.player2.username;
        }
        if (ignisRes.turn !== undefined && ignisRes.turn > 0) {
            duelState.turnNumber = ignisRes.turn;
        }
        if (ignisRes.pendingPrompt !== undefined) {
            duelState.pendingPrompt = ignisRes.pendingPrompt;
            if (ignisRes.pendingPrompt && ignisRes.pendingPrompt.promptType === 'IDLE_CMD') {
                const canSummon = Boolean(ignisRes.pendingPrompt.summonableCards?.length > 0 || ignisRes.pendingPrompt.msetableCards?.length > 0);
                if (!canSummon) {
                    if (duelState.player1) duelState.player1.normalSummonUsed = true;
                    duelState.normalSummonUsed = true;
                }
            }
        }
        if (Array.isArray(ignisRes.events)) {
            const hasNewTurn = ignisRes.events.some(e => e.name === 'YGOProMsgNewTurn');
            if (hasNewTurn) {
                if (duelState.player1) duelState.player1.normalSummonUsed = false;
                if (duelState.player2) duelState.player2.normalSummonUsed = false;
                duelState.normalSummonUsed = false;
            }
        }
    }
}

const duelBridge = new DuelEngineBridge();
module.exports = duelBridge;
module.exports.syncStateFromIgnis = duelBridge.syncStateFromIgnis.bind(duelBridge);
