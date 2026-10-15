/**
 * [Passcode: 76305638] The Rock Spirit
 * Tipo: Effect Monster | Expansión: LON
 */
module.exports = {
    id: 76305638,
    name: "The Rock Spirit",
    type: "Effect Monster",
    atk: 1700,
    def: 1000,
    level: 4,
    race: "Rock",
    attribute: "EARTH",
    canSpecialSummonSelf: true,

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const earthInGY = (p?.graveyard || []).filter(c => ((c.attribute || c.card_data?.attribute || '').toUpperCase() === 'EARTH'));
            if (earthInGY.length < 1) return { canActivate: false, reason: "Se requiere al menos 1 monstruo de TIERRA en el Cementerio." };
            return { canActivate: true };
        },

    async onSpecialSummon(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            p.banished = p.banished || [];
            const idx = p.graveyard.findIndex(c => (c.attribute || c.card_data?.attribute || '').toUpperCase() === 'EARTH');
            if (idx !== -1) {
                p.banished.push(p.graveyard.splice(idx, 1)[0]);
            }
            effectUtils.emitDuelLog(duelState.roomId, `🪨 [The Rock Spirit] Invocada de Modo Especial desterrando 1 monstruo de TIERRA del Cementerio. Gana +300 ATK durante la Battle Phase rival.`, 'monster');
            return { success: true };
        },

    calculateStatModifiers(monster, duelState, playerKey) {
            if (duelState.currentPhase === 'battle' && duelState.turnPlayer !== playerKey) {
                return { atkMod: 300, defMod: 0 };
            }
            return { atkMod: 0, defMod: 0 };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            return this.onSpecialSummon({ duelState, playerKey, effectUtils });
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
