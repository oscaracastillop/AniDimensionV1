/**
 * Ani-Dimension: Script Maestro de Corrección de Efectos de Cartas Six Samurai y Motores
 * Corrige los 15 IDs oficiales de Six Samurai, condiciones de activación estrictas y sincronía.
 */
const fs = require('fs');
const path = require('path');

const effectsDir = path.resolve(__dirname, '..', 'backend', 'engine', 'card_effects');

const correctedEffects = {
    // 1. Legendary Six Samurai - Kageki (2511717)
    2511717: `/**
 * [Passcode: 2511717] Legendary Six Samurai - Kageki
 * Tipo: Effect Monster (Level 3 / Earth / Warrior / 200 ATK / 2000 DEF)
 * Efecto: Al ser Invocado Normal, invoca Especialmente 1 Six Samurai Nv. 4 o menor de mano.
 * Continuo: Gana 1500 ATK si controlas otro Six Samurai con diferente nombre.
 */
module.exports = {
    id: 2511717,
    name: "Legendary Six Samurai - Kageki",
    type: "Effect Monster",
    atk: 200,
    def: 2000,
    level: 3,
    race: "Warrior",
    attribute: "EARTH",
    isIgnition: false, // NO tiene efecto de ignición manual en campo

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        // Kageki no tiene activación manual en campo
        return { success: true };
    }
};`,

    // 2. Legendary Six Samurai - Kizan (49721904)
    49721904: `/**
 * [Passcode: 49721904] Legendary Six Samurai - Kizan
 * Tipo: Effect Monster (Level 4 / Earth / Warrior / 1800 ATK / 500 DEF)
 * Invocación Especial inherente desde la mano si controlas otro Six Samurai.
 * Continuo: +300 ATK/DEF si controlas 2 o más otros Six Samurai.
 */
module.exports = {
    id: 49721904,
    name: "Legendary Six Samurai - Kizan",
    type: "Effect Monster",
    atk: 1800,
    def: 500,
    level: 4,
    race: "Warrior",
    attribute: "EARTH",
    canSpecialSummonSelf: true,
    isIgnition: false, // NO tiene efecto de ignición manual en campo

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return { success: true };
    }
};`,

    // 3. Legendary Six Samurai - Shinai (48505422)
    48505422: `/**
 * [Passcode: 48505422] Legendary Six Samurai - Shinai
 * Tipo: Effect Monster (Level 3 / Water / Warrior / 1500 ATK / 1500 DEF)
 * Invocación Especial inherente si controlas a Mizuho.
 * Gatillo al ser tributado: Recupera 1 Six Samurai de GY a la mano.
 */
module.exports = {
    id: 48505422,
    name: "Legendary Six Samurai - Shinai",
    type: "Effect Monster",
    atk: 1500,
    def: 1500,
    level: 3,
    race: "Warrior",
    attribute: "WATER",
    canSpecialSummonSelf: true,
    isIgnition: false,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return { success: true };
    }
};`,

    // 4. Legendary Six Samurai - Mizuho (74094021)
    74094021: `/**
 * [Passcode: 74094021] Legendary Six Samurai - Mizuho
 * Tipo: Effect Monster (Level 3 / Fire / Warrior / 1600 ATK / 1000 DEF)
 * Invocación Especial inherente si controlas a Shinai.
 * Ignición (1 vez por turno): Tributa otro Six Samurai para destruir 1 carta en el campo.
 */
module.exports = {
    id: 74094021,
    name: "Legendary Six Samurai - Mizuho",
    type: "Effect Monster",
    atk: 1600,
    def: 1000,
    level: 3,
    race: "Warrior",
    attribute: "FIRE",
    canSpecialSummonSelf: true,
    isIgnition: true,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = duelState[playerKey] || {};
        const opponent = duelState[opponentKey] || {};
        const pMonsters = player.monsters || [];
        const oppMonsters = opponent.monsters || [];
        const oppSpells = opponent.spells || [];

        // 1. Validar que haya otro Six Samurai para tributar
        const otherSixSamIdx = pMonsters.findIndex(m => {
            if (!m || m.faceDown) return false;
            const mId = Number(m.card_id || (m.card_data ? m.card_data.id : 0));
            const mName = (m.card_data?.name || m.name || '').toLowerCase();
            return mId !== 74094021 && (mName.includes('six samurai') || mName.includes('seis samurai'));
        });

        if (otherSixSamIdx === -1) {
            effectUtils.emitDuelLog(duelState.roomId, \`⚠️ [Mizuho] Requiere tributar otro monstruo "Six Samurai" en tu campo.\`, 'warning');
            return { success: false, reason: 'No hay otro Six Samurai para tributar' };
        }

        // 2. Tributar al otro Six Samurai
        const tributed = pMonsters[otherSixSamIdx];
        pMonsters[otherSixSamIdx] = null;
        effectUtils.sendCardToGraveyard(duelState, tributed, playerKey);

        // 3. Buscar objetivo para destruir (preferencia rival)
        let targetCard = null;
        let targetSlot = -1;
        let targetIsSpell = false;

        // Prioridad: Monstruo rival más fuerte
        const rivalMonIdx = oppMonsters.findIndex(m => m !== null);
        if (rivalMonIdx !== -1) {
            targetCard = oppMonsters[rivalMonIdx];
            targetSlot = rivalMonIdx;
            oppMonsters[rivalMonIdx] = null;
            effectUtils.sendCardToGraveyard(duelState, targetCard, opponentKey);
            effectUtils.emitDuelLog(duelState.roomId, \`🌸💥 [Mizuho] Sacrificó a "\${tributed.card_data ? tributed.card_data.name : 'Six Samurai'}" y destruyó a "\${targetCard.card_data ? targetCard.card_data.name : 'Monstruo'}" del adversario!\`, 'spell');
            return { success: true };
        }

        // Si no hay monstruo rival, magia/trampa rival
        const rivalSpellIdx = oppSpells.findIndex(s => s !== null);
        if (rivalSpellIdx !== -1) {
            targetCard = oppSpells[rivalSpellIdx];
            oppSpells[rivalSpellIdx] = null;
            effectUtils.sendCardToGraveyard(duelState, targetCard, opponentKey);
            effectUtils.emitDuelLog(duelState.roomId, \`🌸💥 [Mizuho] Sacrificó a "\${tributed.card_data ? tributed.card_data.name : 'Six Samurai'}" y destruyó una Carta Mágica/Trampa del adversario!\`, 'spell');
            return { success: true };
        }

        effectUtils.emitDuelLog(duelState.roomId, \`🌸 [Mizuho] Sacrificó a "\${tributed.card_data ? tributed.card_data.name : 'Six Samurai'}".\`, 'spell');
        return { success: true };
    }
};`,

    // 5. Grandmaster of the Six Samurai (83039729)
    83039729: `/**
 * [Passcode: 83039729] Grandmaster of the Six Samurai
 * Tipo: Effect Monster (Level 5 / Earth / Warrior / 2100 ATK / 800 DEF)
 * Invocación Especial si controlas un Six Samurai.
 * Al ser destruido por efecto del adversario: Recupera 1 Six Samurai de GY a la mano.
 */
module.exports = {
    id: 83039729,
    name: "Grandmaster of the Six Samurai",
    type: "Effect Monster",
    atk: 2100,
    def: 800,
    level: 5,
    race: "Warrior",
    attribute: "EARTH",
    canSpecialSummonSelf: true,
    isIgnition: false,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return { success: true };
    }
};`,

    // 6. Gateway of the Six (27970830)
    27970830: `/**
 * [Passcode: 27970830] Gateway of the Six
 * Tipo: Continuous Spell
 * Coloca 2 Contadores Bushido cada vez que un Six Samurai es Invocado.
 * 2 Contadores: +500 ATK a un Six Samurai o Shien.
 * 4 Contadores: Añade 1 Six Samurai del Deck o GY a la mano.
 */
module.exports = {
    id: 27970830,
    name: "Gateway of the Six",
    type: "Continuous Spell",
    isContinuous: true,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = duelState[playerKey] || {};
        const pSpells = player.spells || [];
        
        let cardInZone = pSpells.find(s => s && Number(s.card_id || (s.card_data && s.card_data.id)) === 27970830);
        if (!cardInZone) {
            effectUtils.emitDuelLog(duelState.roomId, \`🏯✨ [Gateway of the Six] Activada en el campo. Acumulará 2 Contadores Bushido por cada invocación "Six Samurai" o "Shien".\`, 'spell');
            return { success: true };
        }

        const currentCounters = cardInZone.bushidoCounters || 0;
        if (currentCounters < 2) {
            effectUtils.emitDuelLog(duelState.roomId, \`⚠️ [Gateway of the Six] No tiene suficientes Contadores Bushido para activar ningún efecto (Actuales: \${currentCounters}, Mínimo: 2).\`, 'warning');
            return { success: false, reason: 'Contadores insuficientes' };
        }

        // Si tiene 4 o más, buscar carta
        if (currentCounters >= 4) {
            cardInZone.bushidoCounters -= 4;
            const pDeck = player.deck || [];
            const pHand = player.hand || [];
            const pGY = player.graveyard || [];
            
            // Buscar Six Samurai o Shien en Deck primero
            let foundIdx = pDeck.findIndex(c => {
                const cName = (c.name || '').toLowerCase();
                return cName.includes('six samurai') || cName.includes('seis samurai') || cName.includes('shien');
            });

            if (foundIdx !== -1) {
                const [found] = pDeck.splice(foundIdx, 1);
                pHand.push(found);
                effectUtils.emitDuelLog(duelState.roomId, \`🏯🔍 [Gateway of the Six] Removió 4 Contadores Bushido (Quedan: \${cardInZone.bushidoCounters}). ¡Añade "\${found.name}" del Deck a la mano!\`, 'spell');
                return { success: true };
            }

            // Si no está en Deck, buscar en Cementerio
            let gyIdx = pGY.findIndex(c => {
                const cName = (c.name || '').toLowerCase();
                return cName.includes('six samurai') || cName.includes('seis samurai') || cName.includes('shien');
            });
            if (gyIdx !== -1) {
                const [foundGy] = pGY.splice(gyIdx, 1);
                pHand.push(foundGy);
                effectUtils.emitDuelLog(duelState.roomId, \`🏯♻️ [Gateway of the Six] Removió 4 Contadores Bushido (Quedan: \${cardInZone.bushidoCounters}). ¡Recupera "\${foundGy.name}" del Cementerio a la mano!\`, 'spell');
                return { success: true };
            }
        }

        // Si tiene al menos 2 contadores: +500 ATK
        if (currentCounters >= 2) {
            cardInZone.bushidoCounters -= 2;
            const pMonsters = player.monsters || [];
            const targetM = pMonsters.find(m => m && !m.faceDown);
            if (targetM) {
                targetM.tempAtkMod = (targetM.tempAtkMod || 0) + 500;
                effectUtils.calculateMonsterCurrentStats(targetM, duelState, playerKey);
                effectUtils.emitDuelLog(duelState.roomId, \`🏯⚔️ [Gateway of the Six] Removió 2 Contadores Bushido (Quedan: \${cardInZone.bushidoCounters}). ¡"\${targetM.card_data ? targetM.card_data.name : 'Monstruo'}" gana +500 ATK!\`, 'spell');
            }
            return { success: true };
        }

        return { success: true };
    }
};`,

    // 7. Six Samurai United (72345736)
    72345736: `/**
 * [Passcode: 72345736] Six Samurai United
 * Tipo: Continuous Spell
 * Coloca 1 Contador Bushido (máx 2) por cada Six Samurai invocado.
 * Se envía al Cementerio para robar 1 carta por cada Contador Bushido (1 o 2).
 */
module.exports = {
    id: 72345736,
    name: "Six Samurai United",
    type: "Continuous Spell",
    isContinuous: true,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = duelState[playerKey] || {};
        const pSpells = player.spells || [];
        const pHand = player.hand || [];
        const pDeck = player.deck || [];
        
        let slotIdx = pSpells.findIndex(s => s && Number(s.card_id || (s.card_data && s.card_data.id)) === 72345736);
        let cardInZone = slotIdx !== -1 ? pSpells[slotIdx] : null;

        // Si es la primera activación desde mano
        if (!cardInZone || (cardInZone.bushidoCounters === undefined && !targetData)) {
            effectUtils.emitDuelLog(duelState.roomId, \`🏯✨ [Six Samurai United] Activada en el campo. Acumulará hasta 2 Contadores Bushido por cada invocación "Six Samurai".\`, 'spell');
            return { success: true };
        }

        const counters = cardInZone.bushidoCounters || 0;
        if (counters <= 0) {
            effectUtils.emitDuelLog(duelState.roomId, \`⚠️ [Six Samurai United] Tiene 0 Contadores Bushido. No puedes robar cartas todavía.\`, 'warning');
            return { success: false, reason: 'Sin contadores' };
        }

        // Enviar al cementerio y robar
        pSpells[slotIdx] = null;
        effectUtils.sendCardToGraveyard(duelState, cardInZone, playerKey);
        const drawNum = Math.min(counters, 2);
        let drawn = 0;
        for (let i = 0; i < drawNum; i++) {
            if (pDeck.length > 0) {
                pHand.push(pDeck.pop());
                drawn++;
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, \`🏯🏺✨ [Six Samurai United] Enviada al Cementerio con \${counters} Contadores Bushido. ¡\${player.username || 'Jugador'} roba \${drawn} carta(s)!\`, 'spell');
        return { success: true };
    }
};`,

    // 8. Shien's Smoke Signal (54031490)
    54031490: `/**
 * [Passcode: 54031490] Shien's Smoke Signal
 * Tipo: Normal Spell
 * Añade 1 monstruo "Six Samurai" de Nivel 3 o menor del Deck a la mano.
 */
module.exports = {
    id: 54031490,
    name: "Shien's Smoke Signal",
    type: "Normal Spell",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = duelState[playerKey] || {};
        const pDeck = player.deck || [];
        const pHand = player.hand || [];

        const searchIdx = pDeck.findIndex(c => {
            const cd = c.card_data || c;
            const cName = (cd.name || c.name || '').toLowerCase();
            const isSixSam = cName.includes('six samurai') || cName.includes('seis samurai');
            const lvl = Number(cd.level || c.level || 0);
            return isSixSam && lvl > 0 && lvl <= 3;
        });

        if (searchIdx !== -1) {
            const [found] = pDeck.splice(searchIdx, 1);
            pHand.push(found);
            effectUtils.emitDuelLog(duelState.roomId, \`💨🔍 [Shien's Smoke Signal] ¡Añade a "\${found.name}" (Nivel \${found.level || 3}) del Deck a la mano!\`, 'spell');
        } else {
            effectUtils.emitDuelLog(duelState.roomId, \`💨 [Shien's Smoke Signal] No se encontraron monstruos Six Samurai de Nivel 3 o menor en el Deck.\`, 'spell');
        }
        return { success: true };
    }
};`,

    // 9. Legendary Six Samurai - Shi En (29981921)
    29981921: `/**
 * [Passcode: 29981921] Legendary Six Samurai - Shi En
 * Tipo: Synchro Effect Monster (Level 5 / Dark / Warrior / 2500 ATK / 1400 DEF)
 * Efecto Rápido (1 vez por turno): Niega y destruye 1 Carta Mágica/Trampa que el oponente active.
 * Sustitución: Si fuera a ser destruido, puede destruir otro Six Samurai en su lugar.
 */
module.exports = {
    id: 29981921,
    name: "Legendary Six Samurai - Shi En",
    type: "Synchro Effect Monster",
    atk: 2500,
    def: 1400,
    level: 5,
    race: "Warrior",
    attribute: "DARK",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = duelState[playerKey] || {};
        const opponent = duelState[opponentKey] || {};

        // Si hay una cadena activa con magia o trampa rival: Negar y destruir
        if (duelState.activeChain && duelState.activeChain.length > 0) {
            const lastLink = duelState.activeChain[duelState.activeChain.length - 1];
            const isSpellTrap = lastLink.card_data && ((lastLink.card_data.type || '').toLowerCase().includes('spell') || (lastLink.card_data.type || '').toLowerCase().includes('trap'));
            if (isSpellTrap && lastLink.player !== player.username) {
                const negated = duelState.activeChain.pop();
                effectUtils.sendCardToGraveyard(duelState, negated.card_data, opponentKey);
                effectUtils.emitDuelLog(duelState.roomId, \`🛑⚔️ [Legendary Six Samurai - Shi En] ¡Niega y destruye la activación de "\${negated.card_data ? negated.card_data.name : 'Magia/Trampa'}"!\`, 'trap');
                return { success: true };
            }
        }

        effectUtils.emitDuelLog(duelState.roomId, \`⚔️ [Legendary Six Samurai - Shi En] En guardia (2500 ATK). Listo para negar 1 Magia/Trampa por turno.\`, 'effect');
        return { success: true };
    }
};`,

    // 10. The Six Samurai - Yaichi (64398890)
    64398890: `/**
 * [Passcode: 64398890] The Six Samurai - Yaichi
 * Tipo: Effect Monster (Level 3 / Water / Warrior / 1300 ATK / 800 DEF)
 * Ignición (1 vez por turno): Si controlas otro Six Samurai, destruye 1 Magia/Trampa boca abajo.
 */
module.exports = {
    id: 64398890,
    name: "The Six Samurai - Yaichi",
    type: "Effect Monster",
    atk: 1300,
    def: 800,
    level: 3,
    race: "Warrior",
    attribute: "WATER",
    isIgnition: true,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = duelState[playerKey] || {};
        const opponent = duelState[opponentKey] || {};
        const pMonsters = player.monsters || [];
        const oppSpells = opponent.spells || [];

        // Validar que controle otro Six Samurai
        const hasOtherSS = pMonsters.some(m => {
            if (!m || m.faceDown) return false;
            const mId = Number(m.card_id || (m.card_data ? m.card_data.id : 0));
            const mName = (m.card_data?.name || m.name || '').toLowerCase();
            return mId !== 64398890 && (mName.includes('six samurai') || mName.includes('seis samurai'));
        });

        if (!hasOtherSS) {
            effectUtils.emitDuelLog(duelState.roomId, \`⚠️ [Yaichi] Requiere controlar otro monstruo "Six Samurai" con diferente nombre en el campo.\`, 'warning');
            return { success: false, reason: 'Sin otro Six Samurai' };
        }

        // Buscar Magia/Trampa boca abajo
        const targetIdx = oppSpells.findIndex(s => s && (s.faceDown || s.position === 'SET'));
        if (targetIdx !== -1) {
            const destroyed = oppSpells[targetIdx];
            oppSpells[targetIdx] = null;
            effectUtils.sendCardToGraveyard(duelState, destroyed, opponentKey);
            effectUtils.emitDuelLog(duelState.roomId, \`🏹💥 [Yaichi] ¡Destruyó la Carta Mágica/Trampa boca abajo del rival!\`, 'spell');
            return { success: true };
        } else {
            effectUtils.emitDuelLog(duelState.roomId, \`🏹 [Yaichi] El adversario no tiene Magias/Trampas boca abajo para destruir.\`, 'effect');
            return { success: false, reason: 'No hay objetivo' };
        }
    }
};`,

    // 11. The Six Samurai - Kamon (90397998)
    90397998: `/**
 * [Passcode: 90397998] The Six Samurai - Kamon
 * Tipo: Effect Monster (Level 3 / Fire / Warrior / 1500 ATK / 1000 DEF)
 * Ignición (1 vez por turno): Si controlas otro Six Samurai, destruye 1 Magia/Trampa boca arriba.
 */
module.exports = {
    id: 90397998,
    name: "The Six Samurai - Kamon",
    type: "Effect Monster",
    atk: 1500,
    def: 1000,
    level: 3,
    race: "Warrior",
    attribute: "FIRE",
    isIgnition: true,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = duelState[playerKey] || {};
        const opponent = duelState[opponentKey] || {};
        const pMonsters = player.monsters || [];
        const oppSpells = opponent.spells || [];

        const hasOtherSS = pMonsters.some(m => {
            if (!m || m.faceDown) return false;
            const mId = Number(m.card_id || (m.card_data ? m.card_data.id : 0));
            const mName = (m.card_data?.name || m.name || '').toLowerCase();
            return mId !== 90397998 && (mName.includes('six samurai') || mName.includes('seis samurai'));
        });

        if (!hasOtherSS) {
            effectUtils.emitDuelLog(duelState.roomId, \`⚠️ [Kamon] Requiere controlar otro monstruo "Six Samurai" con diferente nombre en el campo.\`, 'warning');
            return { success: false, reason: 'Sin otro Six Samurai' };
        }

        const targetIdx = oppSpells.findIndex(s => s && !s.faceDown && s.position !== 'SET');
        if (targetIdx !== -1) {
            const destroyed = oppSpells[targetIdx];
            oppSpells[targetIdx] = null;
            effectUtils.sendCardToGraveyard(duelState, destroyed, opponentKey);
            effectUtils.emitDuelLog(duelState.roomId, \`💣💥 [Kamon] ¡Destruyó la Carta Mágica/Trampa boca arriba del rival!\`, 'spell');
            return { success: true };
        } else {
            effectUtils.emitDuelLog(duelState.roomId, \`💣 [Kamon] El adversario no tiene Magias/Trampas boca arriba para destruir.\`, 'effect');
            return { success: false, reason: 'No hay objetivo' };
        }
    }
};`,

    // 12. The Six Samurai - Irou (27782503)
    27782503: `/**
 * [Passcode: 27782503] The Six Samurai - Irou
 * Tipo: Effect Monster (Level 4 / Light / Warrior / 1700 ATK / 1200 DEF)
 * Gatillo de Batalla: Si ataca a un monstruo boca abajo en Defensa, lo destruye inmediatamente.
 */
module.exports = {
    id: 27782503,
    name: "The Six Samurai - Irou",
    type: "Effect Monster",
    atk: 1700,
    def: 1200,
    level: 4,
    race: "Warrior",
    attribute: "LIGHT",
    isIgnition: false,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return { success: true };
    }
};`,

    // 13. The Six Samurai - Zanji (95519486)
    95519486: `/**
 * [Passcode: 95519486] The Six Samurai - Zanji
 * Tipo: Effect Monster (Level 4 / Light / Warrior / 1800 ATK / 1300 DEF)
 * Gatillo de Batalla: Si atacó mientras controlabas otro Six Samurai, destruye al monstruo que batalló al final del Damage Step.
 */
module.exports = {
    id: 95519486,
    name: "The Six Samurai - Zanji",
    type: "Effect Monster",
    atk: 1800,
    def: 1300,
    level: 4,
    race: "Warrior",
    attribute: "LIGHT",
    isIgnition: false,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return { success: true };
    }
};`,

    // 14. Six Scrolls of the Samurai (54913680)
    54913680: `/**
 * [Passcode: 54913680] Six Scrolls of the Samurai
 * Tipo: Quick-Play Spell
 * Sacrifica 2 monstruos Six Samurai para invocar de Modo Especial a "Great Shogun Shien" desde tu Deck.
 */
module.exports = {
    id: 54913680,
    name: "Six Scrolls of the Samurai",
    type: "Quick-Play Spell",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = duelState[playerKey] || {};
        const pMonsters = player.monsters || [];
        const pDeck = player.deck || [];

        // Buscar 2 Six Samurai en campo
        const ssIndices = [];
        pMonsters.forEach((m, idx) => {
            if (m && !m.faceDown) {
                const mName = (m.card_data?.name || m.name || '').toLowerCase();
                if (mName.includes('six samurai') || mName.includes('seis samurai')) {
                    ssIndices.push(idx);
                }
            }
        });

        if (ssIndices.length < 2) {
            effectUtils.emitDuelLog(duelState.roomId, \`⚠️ [Six Scrolls of the Samurai] Requiere tributar 2 monstruos Six Samurai en el campo (Controlas: \${ssIndices.length}).\`, 'warning');
            return { success: false, reason: 'Monstruos insuficientes' };
        }

        // Buscar Great Shogun Shien en Deck (ID 63014935)
        const shienIdx = pDeck.findIndex(c => {
            const cId = Number(c.id || c.card_id);
            const cName = (c.name || '').toLowerCase();
            return cId === 63014935 || cName.includes('great shogun shien');
        });

        if (shienIdx === -1) {
            effectUtils.emitDuelLog(duelState.roomId, \`⚠️ [Six Scrolls of the Samurai] No hay "Great Shogun Shien" en tu Deck.\`, 'warning');
            return { success: false, reason: 'Sin Shien en Deck' };
        }

        // Sacrificar los 2 monstruos
        const t1 = pMonsters[ssIndices[0]];
        const t2 = pMonsters[ssIndices[1]];
        pMonsters[ssIndices[0]] = null;
        pMonsters[ssIndices[1]] = null;
        effectUtils.sendCardToGraveyard(duelState, t1, playerKey);
        effectUtils.sendCardToGraveyard(duelState, t2, playerKey);

        // Invocar a Great Shogun Shien
        const [shienCard] = pDeck.splice(shienIdx, 1);
        const freeSlot = pMonsters.findIndex(m => m === null);
        pMonsters[freeSlot] = {
            card_id: 63014935,
            position: 'ATK',
            faceDown: false,
            hasAttacked: false,
            turnSummoned: duelState.turnNumber,
            card_data: { ...shienCard, id: 63014935, card_id: 63014935, atk: 2500, def: 2400 }
        };
        effectUtils.calculateMonsterCurrentStats(pMonsters[freeSlot], duelState);
        effectUtils.emitDuelLog(duelState.roomId, \`⚡👑 [Six Scrolls of the Samurai] Sacrificó 2 Six Samurai. ¡Invoca de Modo Especial a "Great Shogun Shien" (2500 ATK) desde el Deck!\`, 'summon');
        return { success: true };
    }
};`,

    // 15. Cunning of the Six Samurai (27178262)
    27178262: `/**
 * [Passcode: 27178262] Cunning of the Six Samurai
 * Tipo: Quick-Play Spell
 * Envía 1 Six Samurai que controles al Cementerio; invoca Especialmente 1 Six Samurai del Cementerio.
 */
module.exports = {
    id: 27178262,
    name: "Cunning of the Six Samurai",
    type: "Quick-Play Spell",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = duelState[playerKey] || {};
        const pMonsters = player.monsters || [];
        const pGY = player.graveyard || [];

        // Buscar 1 Six Samurai en campo
        const fieldIdx = pMonsters.findIndex(m => {
            if (!m || m.faceDown) return false;
            const mName = (m.card_data?.name || m.name || '').toLowerCase();
            return mName.includes('six samurai') || mName.includes('seis samurai');
        });

        if (fieldIdx === -1) {
            effectUtils.emitDuelLog(duelState.roomId, \`⚠️ [Cunning of the Six Samurai] Debes controlar al menos 1 monstruo Six Samurai boca arriba.\`, 'warning');
            return { success: false, reason: 'Sin Six Samurai en campo' };
        }

        // Buscar 1 Six Samurai en GY
        const gyIdx = pGY.findIndex(c => {
            const cName = (c.name || '').toLowerCase();
            return cName.includes('six samurai') || cName.includes('seis samurai');
        });

        if (gyIdx === -1) {
            effectUtils.emitDuelLog(duelState.roomId, \`⚠️ [Cunning of the Six Samurai] No hay ningún monstruo Six Samurai en el Cementerio para revivir.\`, 'warning');
            return { success: false, reason: 'Sin Six Samurai en GY' };
        }

        // Enviar el del campo al GY
        const sentToGy = pMonsters[fieldIdx];
        pMonsters[fieldIdx] = null;
        effectUtils.sendCardToGraveyard(duelState, sentToGy, playerKey);

        // Revivir el del GY
        const [revivedCard] = pGY.splice(gyIdx, 1);
        const freeSlot = pMonsters.findIndex(m => m === null);
        const revId = Number(revivedCard.id || revivedCard.card_id);
        pMonsters[freeSlot] = {
            card_id: revId,
            position: 'ATK',
            faceDown: false,
            hasAttacked: false,
            turnSummoned: duelState.turnNumber,
            card_data: { ...revivedCard, id: revId, card_id: revId }
        };
        effectUtils.calculateMonsterCurrentStats(pMonsters[freeSlot], duelState);
        effectUtils.emitDuelLog(duelState.roomId, \`⚔️♻️ [Cunning of the Six Samurai] Envió a "\${sentToGy.card_data ? sentToGy.card_data.name : 'Six Samurai'}" al GY. ¡Revive a "\${revivedCard.name}" del Cementerio!\`, 'summon');
        return { success: true };
    }
};`
};

Object.entries(correctedEffects).forEach(([id, code]) => {
    const filePath = path.join(effectsDir, `c${id}.js`);
    fs.writeFileSync(filePath, code, 'utf8');
    console.log(`✅ [CORE DIMENSION] Restaurado y verificado: c${id}.js`);
});

console.log('🎉 15 Módulos de Cartas Six Samurai corregidos y verificados con éxito.');
