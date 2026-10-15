/**
 * [Passcode: 19613556] Heavy Storm
 * Tipo: Normal Spell
 */
module.exports = {
    id: 19613556,
    name: "Heavy Storm",
    type: "Normal Spell",
    race: "Spell",
    isSpellTrapBoardWipe: true,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        
        let count = 0;
        [playerKey, opponentKey].forEach(pk => {
            (duelState[pk]?.spells || []).forEach((s, idx) => {
                if (s) {
                    duelState[pk].spells[idx] = null;
                    effectUtils.sendCardToGraveyard(duelState, s, pk);
                    count++;
                }
            });
            if (duelState[pk]?.fieldSpell) {
                const fs = duelState[pk].fieldSpell;
                duelState[pk].fieldSpell = null;
                effectUtils.sendCardToGraveyard(duelState, fs, pk);
                count++;
            }
        });
        effectUtils.emitDuelLog(duelState.roomId, `🌪️💥 [Heavy Storm] ¡Una tormenta devastadora barre todas las cartas Mágicas y de Trampa (${count} destruidas)!`, 'spell');
        return { success: true, count };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
