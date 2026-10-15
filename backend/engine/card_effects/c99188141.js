/**
 * [Passcode: 99188141] Chaos Sorcerer
 * Tipo: Effect Monster
 * Invocación Especial: Desterrar 1 monstruo LUZ y 1 OSCURIDAD del Cementerio.
 * Efecto: Una vez por turno, destierra 1 monstruo boca arriba en el campo (este monstruo no puede atacar este turno).
 */
module.exports = {
    id: 99188141,
    name: "Chaos Sorcerer",
    type: "Effect Monster",
    atk: 2300, def: 2000, level: 6, race: "Spellcaster",
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
        }
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const opp = duelState[opponentKey] || {};
        const player = duelState[playerKey] || {};
        const oppMonsters = opp.monsters || [];

        let banished = null;
        for (let i = 0; i < oppMonsters.length; i++) {
            if (oppMonsters[i] && !oppMonsters[i].faceDown) {
                banished = oppMonsters[i];
                effectUtils.sendCardToBanished(duelState, opponentKey, banished);
                oppMonsters[i] = null;
                break;
            }
        }

        const selfCard = (player.monsters || []).find(m => m && Number(m.card_id || m.id) === 99188141);
        if (selfCard) {
            selfCard.cannotAttackThisTurn = true;
        }

        effectUtils.emitDuelLog(
            duelState.roomId,
            `🔮🌌 [Chaos Sorcerer] ¡Destierra a '${banished ? (banished.name || banished.card_data?.name) : 'monstruo'}' del campo! (No puede atacar este turno)`,
            'monster'
        );
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
