/**
 * [Passcode: 2460565] Marauding Captain
 * Tipo: Effect Monster | Expansión: LOD
 */
module.exports = {
    id: 2460565,
    name: "Marauding Captain",
    type: "Effect Monster",
    atk: 1200,
    def: 400,
    level: 3,
    race: "Warrior",
    attribute: "EARTH",

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasL4Mon = (p?.hand || []).some(c => (c.type || '').toLowerCase().includes('monster') && (c.level || c.card_data?.level || 0) <= 4);
            if (!hasL4Mon) return { canActivate: false, reason: "No hay monstruos de Nivel 4 o menor en la mano." };
            return { canActivate: true };
        },

    async onNormalSummon(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            const hIdx = (p.hand || []).findIndex(c => (c.type || '').toLowerCase().includes('monster') && (c.level || c.card_data?.level || 0) <= 4);
            if (hIdx !== -1) {
                const mon = p.hand.splice(hIdx, 1)[0];
                const emptySlot = (p.monsters || []).findIndex(m => !m);
                if (emptySlot !== -1) {
                    mon.position = 'face-up-attack';
                    mon.currentAtk = mon.atk || mon.card_data?.atk || 0;
                    mon.currentDef = mon.def || mon.card_data?.def || 0;
                    p.monsters[emptySlot] = mon;
                    effectUtils.emitDuelLog(duelState.roomId, `⚔️🛡️ [Marauding Captain] ¡Invocación Normal exitosa! Invoca de Modo Especial a "${mon.name || mon.card_data?.name}" desde la mano. El rival no puede atacar a otros Guerreros.`, 'monster');
                }
            }
            return { success: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onNormalSummon({ duelState, playerKey, effectUtils });
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
