/**
 * [Passcode: 39910367] Magical Citadel of Endymion
 * Tipo: Field Spell
 * Efecto: Cada vez que se active una Carta Mágica, coloca 1 Contador Mágico en esta carta.
 */
module.exports = {
    id: 39910367,
    name: "Magical Citadel of Endymion",
    type: "Field Spell Card",
    atk: 0, def: 0, level: 0, race: "Normal",
    isField: true,

    onSpellActivated({ duelState, fieldSlot, effectUtils }) {
        if (fieldSlot) {
            fieldSlot.spellCounters = (fieldSlot.spellCounters || 0) + 1;
            effectUtils.emitDuelLog(duelState.roomId, `🏛️✨ [Magical Citadel of Endymion] ¡Gana 1 Contador Mágico por activación de Magia! (Total: ${fieldSlot.spellCounters})`, 'spell');
        }
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        effectUtils.emitDuelLog(duelState.roomId, `🏛️ [Magical Citadel of Endymion] ¡Ciudadela Mágica activada en el Campo!`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
