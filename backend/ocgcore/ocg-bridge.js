/**
 * Ani-Dimension: Puente de Integración Nativa OCG (OcgCore Bridge)
 * Conecta el servidor Node.js y Socket.IO con el motor nativo de duelos OCG,
 * delegando la ejecución de reglas, cadenas y efectos al motor oficial.
 */

const path = require('path');
const fs = require('fs');
const { ocgCardReader } = require('../data/sql-card-reader');

class OcgCoreBridge {
    constructor(roomId, player1Name, player2Name, player1Sleeve = 'default_sleeve', firstPlayer = 'player1') {
        this.roomId = roomId;
        this.player1Name = player1Name;
        this.player2Name = player2Name || 'NPC Principiante (Nv. 1)';
        this.player1Sleeve = player1Sleeve;
        this.firstPlayer = firstPlayer;
        this.turnNumber = 1;
        this.phase = 'MAIN_1';
        this.turnPlayer = firstPlayer === 'player2' ? this.player2Name : this.player1Name;
        
        // Pila de Cadenas LIFO Oficiales
        this.activeChain = [];
        this.pendingAction = null;
        this.chainWindowActive = false;
        
        // Registros de Duelo OCG
        this.duelLogs = [];

        // Inicializar Estado de Juego en Memoria
        this.state = this.createInitialDuelState();
    }

    /**
     * Inicializa la memoria del tablero para ambos jugadores
     */
    createInitialDuelState() {
        return {
            roomId: this.roomId,
            turnPlayer: this.turnPlayer,
            phase: 'MAIN_1',
            turnNumber: 1,
            firstPlayer: this.firstPlayer,
            normalSummonUsed: false,
            activeChain: [],
            chainWindowActive: false,
            pendingAction: null,
            duelLogs: [
                {
                    message: `⚔️ ¡Comienza el Duelo Oficial Konami OCG! ${this.turnPlayer} inicia de primeras (Turno 1: sin ataques).`,
                    type: "system",
                    timestamp: Date.now()
                }
            ],
            extraMonsterZones: [null, null],
            player1: {
                username: this.player1Name,
                lp: 8000,
                sleeve: this.player1Sleeve,
                mat: 'default_mat',
                deck: [],
                mainDeckCount: 0,
                extraDeck: [],
                extraDeckCount: 0,
                graveyard: [],
                banished: [],
                fieldSpell: null,
                monsters: Array(5).fill(null),
                spells: Array(5).fill(null),
                hand: []
            },
            player2: {
                username: this.player2Name,
                lp: 8000,
                sleeve: 'yugi_sleeve',
                mat: 'kaiba_mat',
                deck: [],
                mainDeckCount: 0,
                extraDeck: [],
                extraDeckCount: 0,
                graveyard: [],
                banished: [],
                fieldSpell: null,
                monsters: Array(5).fill(null),
                spells: Array(5).fill(null),
                hand: []
            }
        };
    }

    /**
     * Carga e hidrata los mazos de ambos jugadores invocando al `ocgCardReader`
     */
    setupDecks(player1DeckData, player2DeckData) {
        const hydrateCard = (passcode, ownerKey) => {
            const cardData = ocgCardReader(passcode);
            return {
                id: parseInt(passcode, 10),
                card_id: parseInt(passcode, 10),
                name: cardData ? cardData.name : `Carta #${passcode}`,
                type: cardData ? cardData.type : 'Normal Monster',
                race: cardData ? cardData.race : 'Warrior',
                attribute: cardData ? cardData.attribute : 'EARTH',
                level: cardData ? cardData.level : 4,
                atk: cardData ? cardData.atk : 1000,
                def: cardData ? cardData.def : 1000,
                desc: cardData ? cardData.desc : '',
                image_url: `../../../assets/images/cards/${passcode}.jpg`,
                originalOwner: ownerKey
            };
        };

        // Main Deck & Extra Deck del Jugador 1
        if (player1DeckData && Array.isArray(player1DeckData.mainDeck) && player1DeckData.mainDeck.length >= 40) {
            this.state.player1.deck = player1DeckData.mainDeck.map(c => hydrateCard(typeof c === 'object' ? (c.card_id || c.id) : c, 'player1'));
            if (Array.isArray(player1DeckData.extraDeck)) {
                this.state.player1.extraDeck = player1DeckData.extraDeck.map(c => hydrateCard(typeof c === 'object' ? (c.card_id || c.id) : c, 'player1'));
            }
        }

        // Main Deck del NPC / Rival (40 cartas del sobre LOB)
        if (player2DeckData && Array.isArray(player2DeckData.mainDeck)) {
            this.state.player2.deck = player2DeckData.mainDeck.map(c => hydrateCard(typeof c === 'object' ? (c.card_id || c.id) : c, 'player2'));
        }

        // Mezcla inicial Fisher-Yates de los mazos
        this.shuffle(this.state.player1.deck);
        this.shuffle(this.state.player2.deck);

        // Robar mano inicial reglamentaria de 5 cartas
        this.state.player1.hand = this.state.player1.deck.splice(0, 5);
        this.state.player2.hand = this.state.player2.deck.splice(0, 5);

        this.state.player1.mainDeckCount = this.state.player1.deck.length;
        this.state.player2.mainDeckCount = this.state.player2.deck.length;
        this.state.player1.extraDeckCount = this.state.player1.extraDeck.length;
        this.state.player2.extraDeckCount = this.state.player2.extraDeck.length;

        console.log(`[OCG BRIDGE] Duelo #${this.roomId} inicializado. P1 Hand: ${this.state.player1.hand.length}, P2 Hand: ${this.state.player2.hand.length}`);
        return this.state;
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * Retorna el contenido del script oficial Lua c<id>.lua para una carta
     */
    static getCardScript(cardId) {
        const numericId = parseInt(cardId, 10);
        const fileName = `c${numericId}.lua`;
        const officialPath = path.join(__dirname, 'scripts', 'official', fileName);
        if (fs.existsSync(officialPath)) {
            return fs.readFileSync(officialPath, 'utf-8');
        }
        const rootPath = path.join(__dirname, 'scripts', fileName);
        if (fs.existsSync(rootPath)) {
            return fs.readFileSync(rootPath, 'utf-8');
        }
        return null;
    }

    /**
     * Emitir mensaje de log reglamentario al historial de duelo
     */
    addLog(message, category = 'system') {
        const logEntry = { message, type: category, timestamp: Date.now() };
        this.state.duelLogs.push(logEntry);
        if (this.state.duelLogs.length > 80) this.state.duelLogs.shift();
        return logEntry;
    }
}

module.exports = OcgCoreBridge;

