/**
 * [Passcode: 21340051] Boar Soldier
 * Tipo: Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 21340051,
    name: "Boar Soldier",
    type: "Effect Monster",
    atk: 2000,
    def: 500,
    level: 4,
    race: "Beast-Warrior",
    attribute: "EARTH",

    async onSummon(context) {
        const { duelState, playerKey, effectUtils } = context;
        const p = duelState[playerKey];
        const monCount = (p?.monsters || []).filter(m => m !== null).length;
        const boar = (p?.monsters || []).find(m => m && (m.id === 21340051 || m.card_id === 21340051));
        if (boar) {
            boar.atk = 1000;
            effectUtils.emitDuelLog(duelState.roomId, `🐗 [${this.name}] Al ser Invocado de Modo Normal, su ATK se reduce en 1000 (ATK: 1000).`, 'atk');
            if (monCount <= 1) {
                const sIdx = p.monsters.indexOf(boar);
                if (sIdx !== -1) {
                    p.monsters[sIdx] = null;
                    effectUtils.sendCardToGraveyard(duelState, boar, playerKey);
                    effectUtils.emitDuelLog(duelState.roomId, `🐗💥 [${this.name}] Destruido porque no controlas ningún otro monstruo.`, 'destroy');
                }
            }
        }
    },

    async execute(context) {
        return this.onSummon(context);
    }
};
