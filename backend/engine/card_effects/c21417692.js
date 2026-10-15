module.exports = {
    id: 21417692,
    name: "Dark Elf",
    type: "Effect Monster",
    atk: 2000, def: 800, level: 4, race: "Spellcaster",

    async onAttackDeclare(context) {
        const { duelState, playerKey, effectUtils } = context;
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const currentLp = player.lp !== undefined ? player.lp : 8000;
        player.lp = Math.max(0, currentLp - 1000);
        effectUtils.emitDuelLog(duelState.roomId, `🧝‍♀️🌑 [Dark Elf] ¡Tributo de sangre mágica! Paga 1000 LP para declarar un ataque con sus 2000 ATK (LP restante: ${player.lp}).`, 'monster');
        return { success: true, lpPaid: 1000 };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onAttackDeclare({ duelState, playerKey, effectUtils });
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
