/**
 * [Passcode: 77527210] Soul of Purity and Light
 * Tipo: Effect Monster | Expansión: LON
 */
module.exports = {
    id: 77527210,
    name: "Soul of Purity and Light",
    type: "Effect Monster",
    atk: 2000,
    def: 1800,
    level: 6,
    race: "Fairy",
    attribute: "LIGHT",
    canSpecialSummonSelf: true,

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const lightInGY = (p?.graveyard || []).filter(c => ((c.attribute || c.card_data?.attribute || '').toUpperCase() === 'LIGHT'));
            if (lightInGY.length < 2) return { canActivate: false, reason: "Se requieren al menos 2 monstruos de LUZ en el Cementerio." };
            return { canActivate: true };
        },

    async onSpecialSummon(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            p.banished = p.banished || [];
            let banished = 0;
            for (let i = p.graveyard.length - 1; i >= 0 && banished < 2; i--) {
                const c = p.graveyard[i];
                if ((c.attribute || c.card_data?.attribute || '').toUpperCase() === 'LIGHT') {
                    p.banished.push(p.graveyard.splice(i, 1)[0]);
                    banished++;
                }
            }
            effectUtils.emitDuelLog(duelState.roomId, `🕊️✨ [Soul of Purity and Light] Invocada de Modo Especial desterrando 2 monstruos de LUZ del Cementerio. Reduce el ATK del rival en 300 durante su Battle Phase.`, 'monster');
            return { success: true };
        },

    calculateOpponentStatModifiers(monster, duelState, playerKey) {
            if (duelState.currentPhase === 'battle' && duelState.turnPlayer !== playerKey) {
                return { atkMod: -300, defMod: 0 };
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
