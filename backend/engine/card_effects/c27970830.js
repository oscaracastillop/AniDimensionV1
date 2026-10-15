/**
 * [Passcode: 27970830] Gateway of the Six
 * Tipo: Continuous Spell
 * Efecto Oficial OCG:
 * Cada vez que uno o más monstruos "Six Samurai" o "Shien" son Invocados de Modo Normal o Especial, 
 * coloca 2 Contadores Bushido en esta carta.
 * Puedes retirar Contadores Bushido de tu campo para activar estos efectos:
 * ● 2 Contadores: 1 monstruo "Six Samurai" o "Shien" boca arriba gana 500 ATK hasta el final del turno.
 * ● 4 Contadores: Añade a tu mano 1 monstruo "Six Samurai" en tu Deck o Cementerio.
 */
module.exports = {
    id: 27970830,
    name: "Gateway of the Six",
    type: "Continuous Spell",
    isContinuous: true,

    canActivate(duelState, playerKey, fromHand = false) {
        if (fromHand) return true;
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const pSpells = player.spells || [];
        const cardInZone = pSpells.find(s => s && Number(s.card_id || (s.card_data && s.card_data.id)) === 27970830);
        if (!cardInZone) return true;
        return (cardInZone.bushidoCounters || 0) >= 2;
    },

    onMonsterSummoned({ duelState, playerKey, summonedMeta, summonType, spellSlot }) {
        if (!spellSlot) return;
        spellSlot.bushidoCounters = (spellSlot.bushidoCounters || 0) + 2;
        const { emitDuelLog } = require('../duel-state');
        emitDuelLog(duelState.roomId, `🏯✨ [Gateway of the Six] ¡Coloca 2 Contadores Bushido! (Total en carta: ${spellSlot.bushidoCounters})`, 'spell');
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const pSpells = player.spells || [];
        
        let cardInZone = pSpells.find(s => s && Number(s.card_id || (s.card_data && s.card_data.id)) === 27970830);
        
        // Si la carta recién entra al campo o no tiene contadores inicializados
        if (!cardInZone || cardInZone.bushidoCounters === undefined || (link && link.from_hand)) {
            if (cardInZone && cardInZone.bushidoCounters === undefined) {
                cardInZone.bushidoCounters = 0;
            }
            effectUtils.emitDuelLog(duelState.roomId, `🏯✨ [Gateway of the Six] Activada en el campo. Acumulará 2 Contadores Bushido por cada invocación "Six Samurai" o "Shien".`, 'spell');
            return { success: true };
        }

        const currentCounters = cardInZone.bushidoCounters || 0;
        if (currentCounters < 2) {
            effectUtils.emitDuelLog(duelState.roomId, `⚠️ [Gateway of the Six] No tiene suficientes Contadores Bushido para activar ningún efecto (Actuales: ${currentCounters}, Mínimo: 2).`, 'warning');
            return { success: false, reason: 'Contadores insuficientes' };
        }

        // Si tiene 4 o más contadores, permitir buscar monstruo Six Samurai del Deck o GY
        if (currentCounters >= 4) {
            cardInZone.bushidoCounters -= 4;
            const pDeck = player.deck || [];
            const pHand = player.hand || [];
            const pGY = player.graveyard || [];
            
            // Buscar en Deck primero
            let foundIdx = pDeck.findIndex(c => {
                const cName = (c.name || '').toLowerCase();
                return cName.includes('six samurai') || cName.includes('seis samurai') || cName.includes('shien');
            });

            if (foundIdx !== -1) {
                const [found] = pDeck.splice(foundIdx, 1);
                pHand.push(found);
                effectUtils.emitDuelLog(duelState.roomId, `🏯🔍 [Gateway of the Six] Removió 4 Contadores Bushido (Quedan: ${cardInZone.bushidoCounters}). ¡Añade "${found.name}" del Deck a la mano!`, 'spell');
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
                effectUtils.emitDuelLog(duelState.roomId, `🏯♻️ [Gateway of the Six] Removió 4 Contadores Bushido (Quedan: ${cardInZone.bushidoCounters}). ¡Recupera "${foundGy.name}" del Cementerio a la mano!`, 'spell');
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
                effectUtils.emitDuelLog(duelState.roomId, `🏯⚔️ [Gateway of the Six] Removió 2 Contadores Bushido (Quedan: ${cardInZone.bushidoCounters}). ¡"${targetM.card_data ? targetM.card_data.name : 'Monstruo'}" gana +500 ATK!`, 'spell');
            }
            return { success: true };
        }

        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};