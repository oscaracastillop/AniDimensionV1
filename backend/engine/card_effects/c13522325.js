/**
 * [Passcode: 13522325] Spirit of Flames
 * Tipo: Effect Monster | Expansión: LON
 */
module.exports = {
    id: 13522325,
    name: "Spirit of Flames",
    type: "Effect Monster",
    atk: 1700,
    def: 1000,
    level: 4,
    race: "Pyro",
    attribute: "FIRE",
    canSpecialSummonSelf: true,

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const fireInGY = (p?.graveyard || []).filter(c => ((c.attribute || c.card_data?.attribute || '').toUpperCase() === 'FIRE'));
            if (fireInGY.length < 1) return { canActivate: false, reason: "Se requiere al menos 1 monstruo de FUEGO en el Cementerio." };
            return { canActivate: true };
        },

    async onSpecialSummon(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            p.banished = p.banished || [];
            const idx = p.graveyard.findIndex(c => (c.attribute || c.card_data?.attribute || '').toUpperCase() === 'FIRE');
            if (idx !== -1) {
                p.banished.push(p.graveyard.splice(idx, 1)[0]);
            }
            effectUtils.emitDuelLog(duelState.roomId, `🔥 [Spirit of Flames] Invocada de Modo Especial desterrando 1 monstruo de FUEGO del Cementerio. Gana +300 ATK en tu Battle Phase.`, 'monster');
            return { success: true };
        },

    calculateStatModifiers(monster, duelState, playerKey) {
            if (duelState.currentPhase === 'battle' && duelState.turnPlayer === playerKey) {
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
