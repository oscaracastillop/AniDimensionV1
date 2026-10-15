/**
 * [Passcode: 29401950] Bottomless Trap Hole
 * Tipo: Normal Trap | Expansión: LOD
 */
module.exports = {
    id: 29401950,
    name: "Bottomless Trap Hole",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,
    isSummonTrap: true,

    canActivate({ duelState, opponentKey }) {
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const opp = duelState[oppKey];
            const targetMon = (opp.monsters || []).find(m => m && (m.currentAtk || m.card_data?.atk || 0) >= 1500);
            if (targetMon) {
                const idx = opp.monsters.indexOf(targetMon);
                opp.monsters[idx] = null;
                opp.banished = opp.banished || [];
                opp.banished.push(targetMon);
                effectUtils.emitDuelLog(duelState.roomId, `🕳️💥 [Bottomless Trap Hole] Destruye y destierra a "${targetMon.name || targetMon.card_data?.name}".`, 'trap');
            }
            return { success: true };
        },

    async onSummonResponse(context) {
            const { duelState, opponentKey, summonedMonster, slotIndex, effectUtils } = context;
            const opp = duelState[opponentKey];
            if (summonedMonster) {
                const atk = summonedMonster.currentAtk !== undefined ? summonedMonster.currentAtk : (summonedMonster.card_data?.atk || 0);
                if (atk >= 1500) {
                    opp.monsters[slotIndex] = null;
                    opp.banished = opp.banished || [];
                    opp.banished.push(summonedMonster);
                    effectUtils.emitDuelLog(duelState.roomId, `🕳️💥 [Bottomless Trap Hole] ¡Cae en el Agujero Trampa Sin Fondo! Destruye y destierra a "${summonedMonster.name || summonedMonster.card_data?.name}" (ATK: ${atk} >= 1500).`, 'trap');
                    return { success: true, destroyed: true, banished: true };
                }
            }
            return { success: false };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
