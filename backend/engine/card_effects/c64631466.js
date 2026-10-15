/**
 * [Passcode: 64631466] Relinquished
 * Tipo: Ritual Effect Monster | Expansión: MRL
 */
module.exports = {
    id: 64631466,
    name: "Relinquished",
    type: "Ritual Effect Monster",
    atk: 0,
    def: 0,
    level: 1,
    race: "Spellcaster",
    attribute: "DARK",
    isRitual: true,
    isRelinquished: true,

    canActivate({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const oppMonsters = (duelState[oppKey]?.monsters || []).filter(m => m && !m.faceDown);
        if (oppMonsters.length === 0) return { canActivate: false, reason: "El rival no tiene monstruos boca arriba para absorber." };
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const tSlot = targetData?.target_slot !== undefined ? targetData.target_slot : 0;
        const opp = duelState[oppKey];
        const player = duelState[playerKey];
        const absorbedMon = opp?.monsters[tSlot];

        if (absorbedMon) {
            opp.monsters[tSlot] = null;
            const myRelin = (player.monsters || []).find(m => m && (m.id === 64631466 || m.card_id === 64631466));
            if (myRelin) {
                const aAtk = absorbedMon.card_data ? (absorbedMon.card_data.atk || 0) : (absorbedMon.atk || 0);
                const aDef = absorbedMon.card_data ? (absorbedMon.card_data.def || 0) : (absorbedMon.def || 0);
                myRelin.atk = aAtk;
                myRelin.def = aDef;
                myRelin.equippedRelinquishedMonster = absorbedMon;
                effectUtils.emitDuelLog(
                    duelState.roomId,
                    `👁️🌀 [${this.name}] ¡Renunciado absorbe a "${absorbedMon.card_data ? absorbedMon.card_data.name : 'Monstruo'}" del rival y adquiere ${aAtk} ATK y ${aDef} DEF!`,
                    'spell'
                );
            }
        }
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
