/**
 * [Passcode: 31709826] Revival Jam
 * Tipo: Effect Monster | Expansión: LON
 */
module.exports = {
    id: 31709826,
    name: "Revival Jam",
    type: "Effect Monster",
    atk: 1500,
    def: 500,
    level: 4,
    race: "Aqua",
    attribute: "WATER",
    canReviveOnBattleDestroy: true,

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            if ((p?.lifePoints || 0) <= 1000) return { canActivate: false, reason: "Se requieren más de 1000 LP." };
            return { canActivate: true };
        },

    async onDestroyedByBattle(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            if (p && p.lifePoints > 1000) {
                p.lifePoints -= 1000;
                p.pendingRevivalJam = true;
                effectUtils.emitDuelLog(duelState.roomId, `🧪 [Revival Jam] ¡Paga 1000 LP (LP: ${p.lifePoints})! Se Invocará de Modo Especial en Posición de Defensa durante la próxima Standby Phase.`, 'monster');
            }
            return { success: true };
        },

    async onStandbyPhase(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            if (p && p.pendingRevivalJam) {
                const jamIdx = (p.graveyard || []).findIndex(c => Number(c.id || c.card_id) === 31709826);
                const emptySlot = (p.monsters || []).findIndex(m => !m);
                if (jamIdx !== -1 && emptySlot !== -1) {
                    const jam = p.graveyard.splice(jamIdx, 1)[0];
                    jam.position = 'face-up-defense';
                    jam.currentAtk = jam.atk || 1500;
                    jam.currentDef = jam.def || 500;
                    p.monsters[emptySlot] = jam;
                    p.pendingRevivalJam = false;
                    effectUtils.emitDuelLog(duelState.roomId, `🧪✨ [Revival Jam] ¡Revive en Posición de Defensa durante la Standby Phase!`, 'monster');
                }
            }
            return { success: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onDestroyedByBattle({ duelState, playerKey, effectUtils });
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
