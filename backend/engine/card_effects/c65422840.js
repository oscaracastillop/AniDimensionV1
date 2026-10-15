/**
 * [Passcode: 65422840] Shutendoji
 * Tipo: Effect Monster (Zombie, Level 4, ATK 1500, DEF 800)
 * Expansión: SOVR
 * Efecto OCG: Una vez por turno, activa 1 de estos efectos:
 * 1: Desterra 2 monstruos Zombi de tu GY; roba 1 carta.
 * 2: Selecciona 1 de tus monstruos Zombi desterrados; colócalo en la parte superior de tu Deck.
 */
module.exports = {
    id: 65422840,
    name: "Shutendoji",
    type: "Effect Monster",
    atk: 1500,
    def: 800,
    level: 4,
    race: "Zombie",

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const choice = (targetData && targetData.effect_choice) ? Number(targetData.effect_choice) : 1;

        if (choice === 1) {
            // Desterrar 2 Zombis del Cementerio
            const gy = player.graveyard || [];
            const zombieIndices = [];
            gy.forEach((c, idx) => {
                const race = (c.race || c.card_data?.race || '').toLowerCase();
                const raceCode = Number(c.raceCode || c.card_data?.raceCode || 0);
                if (race.includes('zombie') || race.includes('zombi') || (raceCode & 0x10)) {
                    zombieIndices.push(idx);
                }
            });

            if (zombieIndices.length < 2) {
                return { success: false, reason: 'Debes tener al menos 2 monstruos Zombi en tu Cementerio para desterrar.' };
            }

            // Desterrar los dos primeros encontrados (de atrás hacia adelante)
            const ban1 = gy.splice(zombieIndices[zombieIndices.length - 1], 1)[0];
            const ban2 = gy.splice(zombieIndices[zombieIndices.length - 2], 1)[0];
            effectUtils.sendCardToBanished(duelState, ban1, playerKey);
            effectUtils.sendCardToBanished(duelState, ban2, playerKey);

            // Robar 1 carta
            player.deck = player.deck || [];
            player.hand = player.hand || [];
            let drawn = 0;
            if (player.deck.length > 0) {
                player.hand.push(player.deck.pop());
                drawn++;
            }
            effectUtils.emitDuelLog(duelState.roomId, `👹🍶 [${this.name}] ¡Desterró 2 Zombis de su Cementerio y robó 1 carta!`, 'draw');
            return { success: true, choice: 1, drawn };
        } else {
            // Devolver 1 Zombi desterrado al Deck superior
            const banished = player.banished || [];
            const banishedZombieIdx = banished.findIndex(c => {
                const race = (c.race || c.card_data?.race || '').toLowerCase();
                const raceCode = Number(c.raceCode || c.card_data?.raceCode || 0);
                return race.includes('zombie') || race.includes('zombi') || (raceCode & 0x10);
            });

            if (banishedZombieIdx === -1) {
                return { success: false, reason: 'No tienes ningún monstruo Zombi desterrado.' };
            }

            const retrieved = banished.splice(banishedZombieIdx, 1)[0];
            player.deck = player.deck || [];
            player.deck.push(retrieved); // parte superior del deck
            effectUtils.emitDuelLog(duelState.roomId, `👹🍶 [${this.name}] ¡Colocó a '${retrieved.name || 'Zombi'}' desde la zona desterrada en la parte superior de su Deck!`, 'effect');
            return { success: true, choice: 2, returnedCard: retrieved.name };
        }
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
