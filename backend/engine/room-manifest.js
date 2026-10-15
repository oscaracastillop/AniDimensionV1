/**
 * Ani-Dimension: Room Card Manifest Engine (Core Dimension V2)
 * ==============================================================================
 * Elimina la necesidad de passcodes quemados en el código de duelos.
 * Al crear cualquier sala, este módulo inspecciona los decks de ambos duelistas,
 * precarga sus módulos nativos de efecto y genera un registro optimizado
 * con todas sus capacidades reglamentarias (triggers, tipos, compatibilidad de equipo).
 * ==============================================================================
 */

const { getCardEffect } = require('./card-registry');
const { ocgCardReader } = require('../data/sql-card-reader');

class RoomCardManifest {
    constructor() {
        this.cards = new Map();
    }

    /**
     * Registra y precarga una carta en el manifiesto de la sala
     * @param {number|string} cardId 
     */
    registerCard(cardId) {
        const numId = Number(cardId || 0);
        if (!numId || this.cards.has(numId)) return;

        // 1. Obtener metadatos oficiales OCG desde SQL/Reader
        const rawData = (typeof ocgCardReader === 'function' ? ocgCardReader(numId) : null) || {};
        
        // 2. Obtener módulo nativo de efecto programado
        const effectModule = getCardEffect(numId) || null;

        const nameLower = (rawData.name || effectModule?.name || '').toLowerCase();
        const descLower = (rawData.desc || effectModule?.desc || rawData.description || '').toLowerCase();
        const typeStr = (rawData.type || effectModule?.type || '').toString().toLowerCase();
        const raceStr = (rawData.race || effectModule?.race || '').toString().toLowerCase();
        const typeCode = Number(rawData.typeCode || 0);
        const raceCode = Number(rawData.raceCode || 0);

        // 3. Extracción canónica de tipos por bitmask oficial Konami y strings
        const isMonster = (typeCode & 0x01) !== 0 || typeStr.includes('monster');
        const isSpell = (typeCode & 0x02) !== 0 || typeStr.includes('spell');
        const isTrap = (typeCode & 0x04) !== 0 || typeStr.includes('trap');

        const isContinuous = (typeCode & 0x20000) !== 0 || typeStr.includes('continuous') || raceStr.includes('continuous') || Boolean(effectModule?.isContinuous);
        const isEquip = (typeCode & 0x40000) !== 0 || typeStr.includes('equip') || raceStr.includes('equip') || Boolean(effectModule?.isEquip);
        const isField = (typeCode & 0x80000) !== 0 || typeStr.includes('field') || raceStr.includes('field') || Boolean(effectModule?.isField);
        const isQuickPlay = (typeCode & 0x10000) !== 0 || typeStr.includes('quick-play') || raceStr.includes('quick-play') || Boolean(effectModule?.isQuickPlay);
        const isCounter = (typeCode & 0x100000) !== 0 || typeStr.includes('counter') || raceStr.includes('counter') || Boolean(effectModule?.isCounter);
        const isFlip = (typeCode & 0x200000) !== 0 || typeStr.includes('flip') || raceStr.includes('flip') || Boolean(effectModule?.isFlip) || Boolean(effectModule?.onFlip);
        const isTuner = (typeCode & 0x1000) !== 0 || typeStr.includes('tuner') || Boolean(effectModule?.isTuner);
        const isFusion = (typeCode & 0x40) !== 0 || typeStr.includes('fusion') || Boolean(effectModule?.isFusion);
        const isSynchro = (typeCode & 0x2000) !== 0 || typeStr.includes('synchro') || Boolean(effectModule?.isSynchro);
        const isDragon = (raceCode & 0x2000) !== 0 || raceStr.includes('dragon') || raceStr.includes('dragón') || typeStr.includes('dragon') || Boolean(effectModule?.isDragon);
        const isToon = typeStr.includes('toon') || nameLower.includes('toon') || Boolean(effectModule?.isToon);
        const isSixSamurai = nameLower.includes('six samurai') || nameLower.includes('seis samur') || nameLower.includes('shien') || Boolean(effectModule?.isSixSamurai);

        // 4. Triggers de Trampas y Respuestas (Reactivas ante Ataque o Invocación)
        const isAttackTrap = isTrap && (
            Boolean(effectModule?.isAttackTrap) ||
            effectModule?.triggerType === 'ON_ATTACK' ||
            descLower.includes('declares an attack') ||
            descLower.includes('declara un ataque') ||
            descLower.includes('attack is declared')
        );

        const isSummonTrap = isTrap && (
            Boolean(effectModule?.isSummonTrap) ||
            effectModule?.triggerType === 'ON_SUMMON' ||
            descLower.includes('is summoned') ||
            descLower.includes('is normal or special summoned') ||
            descLower.includes('es invocado')
        );

        const isSpellTrapRemoval = (isSpell || isTrap) && (
            Boolean(effectModule?.isSpellTrapRemoval) ||
            descLower.includes('destroy 1 spell/trap') ||
            descLower.includes('destroy 1 spell or trap') ||
            descLower.includes('destruye 1 carta mágica/trampa') ||
            descLower.includes('destruye 1 magia/trampa')
        );

        const isTargetStun = (isSpell || isTrap) && (
            Boolean(effectModule?.isTargetStun) ||
            descLower.includes('cannot attack or change its battle position') ||
            descLower.includes('no puede atacar ni cambiar su posición')
        );

        // 5. Hand Traps o Efectos de Activación desde Mano
        const isHandEffect = isMonster && (
            Boolean(effectModule?.canActivateFromHand) ||
            Boolean(effectModule?.isHandTrap) ||
            Boolean(effectModule?.isHandEffect) ||
            descLower.includes('discard this card') ||
            descLower.includes('descartar esta carta') ||
            descLower.includes('send this card from your hand') ||
            descLower.includes('enviar esta carta de tu mano') ||
            [31786629, 40640057, 37742478, 97268402, 14558127, 23434538].includes(numId)
        );

        // 6. Efectos continuos de bloqueo de ataques (Swords, Jarra de Dragones)
        const isSwords = Boolean(effectModule?.isSwords) || nameLower.includes('swords of revealing light') || nameLower.includes('espadas de la luz reveladora');
        const isDragonTrap = Boolean(effectModule?.isDragonJar) || nameLower.includes('dragon capture jar') || nameLower.includes('jarra de captura de dragones');
        const isAttackBlocker = isSwords || Boolean(effectModule?.blocksAttacks) || Boolean(effectModule?.isAttackBlocker);
        const remainsOnField = Boolean(effectModule?.remainsOnField) || isContinuous || isEquip || isSwords || isDragonTrap;
        const isContactFusion = isFusion && (Boolean(effectModule?.isContactFusion) || descLower.includes('contact fusion') || descLower.includes('must first be special summoned (from your extra deck) by'));
        const isMessengerOfPeace = Boolean(effectModule?.isMessengerOfPeace) || nameLower.includes('messenger of peace') || nameLower.includes('mensajero de la paz');
        const isPolymerization = Boolean(effectModule?.isPolymerization) || nameLower.includes('polymerization') || nameLower.includes('polimerizaci');
        const isFusionGate = Boolean(effectModule?.isFusionGate) || nameLower.includes('fusion gate') || nameLower.includes('puerta de fusión');
        const canSpecialSummonSelf = Boolean(effectModule?.canSpecialSummonSelf || effectModule?.canSpecialSummon);

        // Tags tácticos y estratégicos universales
        const isDrawCard = nameLower.includes('pot of greed') || nameLower.includes('graceful charity') || descLower.includes('draw 2 cards') || descLower.includes('draw 3 cards') || Boolean(effectModule?.isDrawSpell);
        const isSpellTrapBoardWipe = nameLower.includes("harpie's feather duster") || nameLower.includes('heavy storm') || descLower.includes('destroy all spell and trap');
        const isMonsterBoardWipe = nameLower.includes('raigeki') || nameLower.includes('dark hole') || descLower.includes('destroy all monsters');
        const isMonsterRemoval = nameLower.includes('fissure') || nameLower.includes('smashing ground') || nameLower.includes('nobleman of crossout') || nameLower.includes('tribute to the doomed') || descLower.includes('destroy 1 monster');
        const isControlSteal = nameLower.includes('change of heart') || nameLower.includes('snatch steal') || descLower.includes('take control of 1');
        const isMonsterRevival = nameLower.includes('monster reborn') || nameLower.includes('premature burial') || descLower.includes('special summon 1 monster from either graveyard') || descLower.includes('special summon 1 monster from your graveyard');
        const isHandDisruption = nameLower.includes('delinquent duo') || nameLower.includes('confiscation') || nameLower.includes('forceful sentry') || descLower.includes("look at your opponent's hand");
        const isBurnSpell = isSpell && descLower.includes('inflict') && descLower.includes('damage');

        const manifestEntry = {
            id: numId,
            name: rawData.name || effectModule?.name || `Carta #${numId}`,
            data: rawData,
            module: effectModule,
            isMonster,
            isSpell,
            isTrap,
            isContinuous,
            isEquip,
            isField,
            isQuickPlay,
            isCounter,
            isFlip,
            isTuner,
            isFusion,
            isSynchro,
            isDragon,
            isToon,
            isSixSamurai,
            isAttackTrap,
            isSummonTrap,
            isSpellTrapRemoval,
            isTargetStun,
            isHandTrap: isHandEffect,
            isHandEffect,
            isSwords,
            isDragonTrap,
            isAttackBlocker,
            remainsOnField,
            isContactFusion,
            isMessengerOfPeace,
            isPolymerization,
            isFusionGate,
            canSpecialSummonSelf,
            isDrawCard,
            isSpellTrapBoardWipe,
            isMonsterBoardWipe,
            isMonsterRemoval,
            isControlSteal,
            isMonsterRevival,
            isHandDisruption,
            isBurnSpell,
            requiredRace: effectModule?.requiredRace || null,
            canEquip: effectModule?.canEquip ? effectModule.canEquip.bind(effectModule) : null,
            fusionMaterials: effectModule?.fusionMaterials || null,
            hasNativeEffect: Boolean(effectModule)
        };

        this.cards.set(numId, manifestEntry);
    }

    /**
     * Obtiene los metadatos y módulo precargado de una carta
     * @param {number|string} cardId 
     * @returns {Object|null}
     */
    get(cardId) {
        const numId = Number(cardId || 0);
        if (!this.cards.has(numId)) {
            this.registerCard(numId);
        }
        return this.cards.get(numId) || null;
    }
}

/**
 * Escanea y precarga todas las cartas de los mazos de una sala de duelo
 * @param {Object} duelState 
 */
function initializeRoomManifest(duelState) {
    if (!duelState) return null;

    const manifest = new RoomCardManifest();

    const collectIdsFromPlayer = (p) => {
        if (!p) return;
        const scanList = [
            ...(p.deck || []),
            ...(p.extraDeck || []),
            ...(p.hand || [])
        ];
        scanList.forEach(c => {
            const id = Number(c?.card_id || c?.id || c || 0);
            if (id > 0) manifest.registerCard(id);
        });
    };

    collectIdsFromPlayer(duelState.player1);
    collectIdsFromPlayer(duelState.player2);

    duelState.manifest = manifest;
    console.log(`[ROOM MANIFEST] Precargadas exitosamente ${manifest.cards.size} cartas únicas en memoria para sala ${duelState.roomId}.`);
    return manifest;
}

const defaultFallbackManifest = new RoomCardManifest();

/**
 * Acceso directo seguro al manifiesto de una sala
 */
function getRoomManifest(duelStateOrRoomId) {
    if (!duelStateOrRoomId) return defaultFallbackManifest;
    let state = duelStateOrRoomId;
    if (typeof duelStateOrRoomId === 'string') {
        try {
            const { duelRooms } = require('./duel-state');
            state = duelRooms ? duelRooms.get(duelStateOrRoomId) : null;
        } catch (_) {
            state = null;
        }
    }
    if (!state) return defaultFallbackManifest;
    if (!state.manifest) {
        return initializeRoomManifest(state);
    }
    return state.manifest;
}

module.exports = {
    RoomCardManifest,
    initializeRoomManifest,
    getRoomManifest
};
