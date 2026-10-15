/**
 * [Passcode: 83887306] Two-Pronged Attack (Ataque de Dos Puntas)
 * Tipo: Normal Trap | Expansión: LOB
 * Descripción Oficial: Select and destroy 2 monsters on your side of the field and 1 monster on your opponent's side of the field.
 */
module.exports = {
    id: 83887306,
    name: "Two-Pronged Attack",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const myMons = (duelState[playerKey]?.monsters || []).filter(m => m !== null).length;
        const oppMons = (duelState[oppKey]?.monsters || []).filter(m => m !== null).length;

        if (myMons < 2) {
            return { canActivate: false, reason: "Debes controlar al menos 2 monstruos para destruirlos como objetivo." };
        }
        if (oppMons < 1) {
            return { canActivate: false, reason: "Tu adversario debe controlar al menos 1 monstruo." };
        }
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const p = duelState[playerKey];
        const opp = duelState[oppKey];

        const mySlots = [];
        for (let i = 0; i < 5; i++) {
            if (p.monsters[i]) mySlots.push(i);
            if (mySlots.length === 2) break;
        }

        const oppSlot = opp.monsters.findIndex(m => m !== null);

        if (mySlots.length === 2 && oppSlot !== -1) {
            const oppMon = opp.monsters[oppSlot];
            effectUtils.sendCardToGraveyard(duelState, oppMon, oppKey);
            opp.monsters[oppSlot] = null;

            mySlots.forEach(s => {
                const myMon = p.monsters[s];
                effectUtils.sendCardToGraveyard(duelState, myMon, playerKey);
                p.monsters[s] = null;
            });

            effectUtils.emitDuelLog(
                duelState.roomId,
                `⚔️💥 [Two-Pronged Attack] ¡Destruyes 2 de tus monstruos para eliminar a 1 monstruo enemigo!`,
                'trap'
            );
            return { success: true };
        }

        return { success: false, reason: "Objetivos insuficientes en el campo." };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
