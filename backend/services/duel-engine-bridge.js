/**
 * Ani-Dimension: Conector / Bridge hacia el Microservicio Oficial de Duelos (Project Ignis / ocgcore WASM)
 * Puerto: 7001
 */
const DUEL_SERVICE_URL = process.env.DUEL_SERVICE_URL || 'http://localhost:7001';

class DuelEngineBridge {
    constructor() {
        this.serviceUrl = DUEL_SERVICE_URL;
        this.isServiceAvailable = false;
        this.checkHealth();
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
            console.warn(`[DUEL BRIDGE] Microservicio en ${this.serviceUrl} no responde: ${e.message}`);
            return false;
        }
    }

    /**
     * Inicia una sesión de duelo oficial en Project Ignis
     */
    async createDuel({ duelId, player0Deck = [], player1Deck = [], lp = 8000, startHand = 5, drawCount = 1, seed }) {
        try {
            // Extraer códigos numéricos limpios para ambas barajas
            const cleanP0 = player0Deck.map(c => Number(typeof c === 'object' ? (c.code || c.id || c.card_id) : c)).filter(c => c > 0);
            const cleanP1 = player1Deck.map(c => Number(typeof c === 'object' ? (c.code || c.id || c.card_id) : c)).filter(c => c > 0);

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
                    seed
                }),
                signal: AbortSignal.timeout(6000)
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
     * Envía respuesta / acción del jugador al árbitro
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
                signal: AbortSignal.timeout(3000)
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
}

const duelBridge = new DuelEngineBridge();
module.exports = duelBridge;
