/**
 * [Passcode: 72989439] Black Luster Soldier - Envoy of the Beginning
 * Tipo: Effect Monster
 * Dos efectos seleccionables por el usuario:
 * - Efecto 1: Desterrar 1 monstruo en el campo boca arriba (este monstruo no puede atacar este turno).
 * - Efecto 2: Si destruye un monstruo del oponente en batalla, puede declarar un segundo ataque consecutivo.
 */
module.exports = {
    id: 72989439,
    name: "Black Luster Soldier - Envoy of the Beginning",
    type: "Effect Monster",
    atk: 3000, def: 2500, level: 8, race: "Warrior",
    canSpecialSummonSelf: true,

    canSpecialSummon({ duelState, playerKey }) {
        const player = duelState[playerKey] || {};
        const gy = player.graveyard || [];
        const lightIdx = gy.findIndex(c => ((c.attribute || c.card_data?.attribute) || '').toUpperCase() === 'LIGHT');
        const darkIdx = gy.findIndex((c, i) => i !== lightIdx && ((c.attribute || c.card_data?.attribute) || '').toUpperCase() === 'DARK');
        if (lightIdx === -1 || darkIdx === -1) {
            return { canSummon: false, reason: 'Requiere desterrar 1 monstruo LUZ y 1 OSCURIDAD de tu Cementerio.' };
        }
        return { canSummon: true };
    },

    executeSpecialSummon({ duelState, playerKey, effectUtils }) {
        const player = duelState[playerKey] || {};
        const gy = player.graveyard || [];
        const lightIdx = gy.findIndex(c => ((c.attribute || c.card_data?.attribute) || '').toUpperCase() === 'LIGHT');
        const darkIdx = gy.findIndex((c, i) => i !== lightIdx && ((c.attribute || c.card_data?.attribute) || '').toUpperCase() === 'DARK');
        if (lightIdx !== -1 && darkIdx !== -1) {
            const first = Math.max(lightIdx, darkIdx);
            const second = Math.min(lightIdx, darkIdx);
            const [c1] = gy.splice(first, 1);
            const [c2] = gy.splice(second, 1);
            effectUtils.sendCardToBanished(duelState, playerKey, c1);
            effectUtils.sendCardToBanished(duelState, playerKey, c2);
            effectUtils.emitDuelLog(duelState.roomId, `🌌✨ [BLS] ¡Desterró 1 LUZ y 1 OSCURIDAD de su Cementerio!`, 'summon');
        }
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const opp = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};
        const choice = (targetData && targetData.effect_choice) || 1;

        const myMonsters = player.monsters || [];
        const selfCard = myMonsters.find(m => m && Number(m.card_id || m.id) === 72989439);

        if (choice === 1) {
            // Efecto 1: Desterrar 1 monstruo del campo
            const allMonsters = [...myMonsters, ...(opp.monsters || [])];
            let banished = null;
            const oppMonsters = opp.monsters || [];
            for (let i = 0; i < oppMonsters.length; i++) {
                if (oppMonsters[i] && !oppMonsters[i].faceDown) {
                    banished = oppMonsters[i];
                    effectUtils.sendCardToBanished(duelState, opponentKey, banished);
                    oppMonsters[i] = null;
                    break;
                }
            }
            if (selfCard) {
                selfCard.cannotAttackThisTurn = true;
            }
            effectUtils.emitDuelLog(duelState.roomId, `⚔️🌌 [BLS - Efecto 1: Caos Dimensional] ¡Destierra a '${banished ? banished.name : 'Monstruo objetivo'}' del campo! (BLS no puede atacar este turno)`, 'monster');
            return { success: true, option: 1, banished: banished ? banished.name : null };
        } else {
            // Efecto 2: Habilitar segundo ataque consecutivo
            if (selfCard) {
                selfCard.canAttackTwice = true;
            }
            effectUtils.emitDuelLog(duelState.roomId, `⚔️⚡ [BLS - Efecto 2: Furor de Batalla] ¡Habilita el poder de ataque doble si destruye a un monstruo por batalla este turno!`, 'monster');
            return { success: true, option: 2, canAttackTwice: true };
        }
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
