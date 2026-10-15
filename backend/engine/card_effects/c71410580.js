/**
 * [Passcode: 71410580] Breaker the Magical Warrior
 * Tipo: Effect Monster
 * Efecto: Si es Invocado de Modo Normal: Coloca 1 Contador Mágico en esta carta (gana 300 ATK por cada uno).
 * Puedes remover 1 Contador Mágico para destruir 1 Carta Mágica/Trampa en el campo.
 */
module.exports = {
    id: 71410580,
    name: "Breaker the Magical Warrior",
    type: "Effect Monster",
    atk: 1600, def: 1000, level: 4, race: "Spellcaster",

    onSummon({ duelState, playerKey, monster, summonType, effectUtils }) {
        if (summonType === 'NORMAL' && monster && !monster.spellCounters) {
            monster.spellCounters = 1;
            monster.permanentAtkMod = (monster.permanentAtkMod || 0) + 300;
            effectUtils.emitDuelLog(duelState.roomId, `🔮 [Breaker the Magical Warrior] ¡Coloca 1 Contador Mágico al ser Invocado de Modo Normal (+300 ATK)!`, 'effect');
        }
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = duelState[playerKey] || {};
        const opp = duelState[opponentKey] || {};
        const breaker = (player.monsters || []).find(m => m && Number(m.card_id || m.id) === 71410580 && m.spellCounters > 0);

        if (!breaker) {
            return { success: false, reason: 'No tiene contadores mágicos disponibles.' };
        }

        breaker.spellCounters = Math.max(0, breaker.spellCounters - 1);
        breaker.permanentAtkMod = Math.max(0, (breaker.permanentAtkMod || 0) - 300);

        // Destruir 1 magia/trampa del adversario
        let destroyed = false;
        if (opp.fieldSpell) {
            const fs = opp.fieldSpell;
            opp.fieldSpell = null;
            effectUtils.sendCardToGraveyard(duelState, opponentKey, fs);
            destroyed = true;
            effectUtils.emitDuelLog(duelState.roomId, `🔮💥 [Breaker the Magical Warrior] ¡Removió 1 Contador Mágico y destruyó la Carta de Campo rival!`, 'effect');
        } else if (opp.spells) {
            const sIdx = opp.spells.findIndex(s => s !== null);
            if (sIdx !== -1) {
                const sp = opp.spells[sIdx];
                opp.spells[sIdx] = null;
                effectUtils.sendCardToGraveyard(duelState, opponentKey, sp);
                destroyed = true;
                effectUtils.emitDuelLog(duelState.roomId, `🔮💥 [Breaker the Magical Warrior] ¡Removió 1 Contador Mágico y destruyó una Carta Mágica/Trampa rival en casilla #${sIdx + 1}!`, 'effect');
            }
        }

        return { success: destroyed };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
