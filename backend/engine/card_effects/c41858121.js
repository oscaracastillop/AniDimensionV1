/**
 * [Passcode: 41858121] Vylon Matter
 * Tipo: Normal Spell
 * Arquetipo: Vylon (HA05 / DT)
 * Efecto OCG:
 * Selecciona 3 Cartas Mágicas de Equipo en tu Cementerio; barájalas en el Deck, después aplica 1 de estos efectos:
 * ● Destruye 1 carta que controle tu adversario.
 * ● Roba 1 carta.
 * ● Envía al Cementerio 1 carta al azar de la mano de tu adversario.
 */
module.exports = {
    id: 41858121,
    name: "Vylon Matter",
    type: "Normal Spell",
    atk: 0,
    def: 0,
    level: 0,
    race: "General",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const opponent = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const pGY = player.graveyard || [];
        const pDeck = player.deck || [];
        const pHand = player.hand || [];
        const oppHand = opponent.hand || [];
        const oppMonsters = opponent.monsters || [];
        const oppSpells = opponent.spells || [];

        // Buscar Magias de Equipo en Cementerio
        const equipCards = [];
        for (let i = pGY.length - 1; i >= 0; i--) {
            const card = pGY[i];
            const isEquip = card && ((card.type && card.type.includes('Equip')) || (card.card_data?.type && card.card_data.type.includes('Equip')) || card.isEquip);
            if (isEquip) {
                equipCards.push(pGY.splice(i, 1)[0]);
                if (equipCards.length === 3) break;
            }
        }

        // Si no hay 3, también devolver las que haya (o mínimo las encontradas)
        equipCards.forEach(c => pDeck.push(c.card_data || c));
        // Barajar
        for (let i = pDeck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pDeck[i], pDeck[j]] = [pDeck[j], pDeck[i]];
        }
        effectUtils.emitDuelLog(duelState.roomId, `🌀 [Vylon Matter] Se barajaron ${equipCards.length} Cartas de Equipo del Cementerio al Deck.`, 'deck');

        const choice = (targetData && targetData.effect_choice) ? Number(targetData.effect_choice) : 2;

        if (choice === 1) {
            // Opción 1: Destruir 1 carta del adversario
            let destroyed = false;
            let targetIdx = (targetData && typeof targetData.target_slot === 'number') ? targetData.target_slot : -1;
            if (targetIdx >= 0 && oppMonsters[targetIdx]) {
                const mon = oppMonsters[targetIdx];
                oppMonsters[targetIdx] = null;
                effectUtils.sendCardToGraveyard(duelState, mon.card_data || mon, opponentKey);
                effectUtils.emitDuelLog(duelState.roomId, `💥 [Vylon Matter] ¡Opción 1: Destruyó al monstruo rival "${mon.card_data?.name || mon.name}"!`, 'destruction');
                destroyed = true;
            } else {
                for (let i = 0; i < oppMonsters.length; i++) {
                    if (oppMonsters[i]) {
                        const mon = oppMonsters[i];
                        oppMonsters[i] = null;
                        effectUtils.sendCardToGraveyard(duelState, mon.card_data || mon, opponentKey);
                        effectUtils.emitDuelLog(duelState.roomId, `💥 [Vylon Matter] ¡Opción 1: Destruyó al monstruo rival "${mon.card_data?.name || mon.name}"!`, 'destruction');
                        destroyed = true;
                        break;
                    }
                }
            }
            if (!destroyed) {
                for (let i = 0; i < oppSpells.length; i++) {
                    if (oppSpells[i]) {
                        const sp = oppSpells[i];
                        oppSpells[i] = null;
                        effectUtils.sendCardToGraveyard(duelState, sp.card_data || sp, opponentKey);
                        effectUtils.emitDuelLog(duelState.roomId, `💥 [Vylon Matter] ¡Opción 1: Destruyó la magia/trampa rival "${sp.card_data?.name || sp.name}"!`, 'destruction');
                        break;
                    }
                }
            }
        } else if (choice === 2) {
            // Opción 2: Robar 1 carta
            if (pDeck.length > 0) {
                const drawn = pDeck.shift();
                pHand.push(drawn);
                effectUtils.emitDuelLog(duelState.roomId, `🃏 [Vylon Matter] ¡Opción 2: Robó 1 carta del Deck!`, 'draw');
            }
        } else if (choice === 3) {
            // Opción 3: Descartar 1 carta al azar de la mano rival
            if (oppHand.length > 0) {
                const randIdx = Math.floor(Math.random() * oppHand.length);
                const [discarded] = oppHand.splice(randIdx, 1);
                effectUtils.sendCardToGraveyard(duelState, discarded.card_data || discarded, opponentKey);
                effectUtils.emitDuelLog(duelState.roomId, `🎯 [Vylon Matter] ¡Opción 3: Descartó al azar "${discarded.card_data?.name || discarded.name || 'Carta'}" de la mano del oponente!`, 'discard');
            }
        }

        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
