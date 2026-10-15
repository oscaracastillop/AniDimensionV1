/**
 * [Passcode: 86099788] The Last Warrior from Another Planet
 * Tipo: Fusion Effect Monster | Expansión: LON
 */
module.exports = {
    id: 86099788,
    name: "The Last Warrior from Another Planet",
    type: "Fusion Effect Monster",
    atk: 2350,
    def: 2300,
    level: 7,
    race: "Warrior",
    attribute: "EARTH",
    isFusion: true,
    fusionMaterials: [88472456,71466592],
    preventsAllSummons: true,

    canActivate() { return { canActivate: false, reason: "Efecto continuo/disparado pasivo." }; },

    async onSpecialSummon(context) {
            const { duelState, playerKey, effectUtils } = context;
            const p = duelState[playerKey];
            if (!p || !p.monsters) return { success: true };
            let destroyed = 0;
            p.monsters.forEach((m, idx) => {
                if (m && Number(m.card_id || m.card_data?.id) !== 86099788) {
                    effectUtils.sendCardToGraveyard(duelState, m, playerKey);
                    p.monsters[idx] = null;
                    destroyed++;
                }
            });
            effectUtils.emitDuelLog(duelState.roomId, `⚔️ [The Last Warrior from Another Planet] ¡Al ser Invocado de Modo Especial, destruye ${destroyed} otros monstruos de su controlador! Ningún jugador puede Invocar monstruos.`, 'monster');
            return { success: true };
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
