/**
 * [Passcode: 403847] The A. Forces
 * Tipo: Continuous Spell | Expansión: LOD
 */
module.exports = {
    id: 403847,
    name: "The A. Forces",
    type: "Continuous Spell",
    race: "Spell",
    isContinuous: true,
    remainsOnField: true,

    canActivate() { return { canActivate: true }; },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `⚔️🎖️ [The A. Forces] Magia continua activa: Todos los Guerreros ganan +200 ATK por cada Guerrero y Lanzador de Conjuros que controles.`, 'spell');
            return { success: true };
        },

    calculateStatModifiers(monster, duelState, playerKey) {
            if (!monster) return { atkMod: 0, defMod: 0 };
            const cd = monster.card_data || monster;
            const race = (cd.race || '').toLowerCase();
            if (race.includes('warrior') || race.includes('guerrero')) {
                const count = (duelState[playerKey]?.monsters || []).filter(m => {
                    if (!m) return false;
                    const r = (m.card_data?.race || m.race || '').toLowerCase();
                    return r.includes('warrior') || r.includes('spellcaster');
                }).length;
                return { atkMod: count * 200, defMod: 0 };
            }
            return { atkMod: 0, defMod: 0 };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
