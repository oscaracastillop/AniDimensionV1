module.exports = {
    id: 29155212,
    name: "Pumpking the King of Ghosts",
    type: "Effect Monster",
    atk: 1800, def: 2000, level: 6, race: "Zombie",

    async onStandbyPhase(context) {
        const { duelState, playerKey, effectUtils } = context;
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const monsters = player.monsters || [];
        let buffedCount = 0;
        for (const m of monsters) {
            if (m && m.race === 'Zombie') {
                m.atk = (m.atk || 0) + 100;
                m.def = (m.def || 0) + 100;
                buffedCount++;
            }
        }
        effectUtils.emitDuelLog(duelState.roomId, `🎃👻 [Pumpking the King of Ghosts] ¡El Rey Calabaza potencia con +100 ATK/DEF a todos los Zombis en la Standby Phase (${buffedCount} potenciados)!`, 'monster');
        return { success: true, buffedCount };
    },
    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        return this.onStandbyPhase({ duelState, playerKey, effectUtils });
    },
    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
