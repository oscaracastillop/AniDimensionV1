/**
 * [Passcode: 39950073] The Cheerful Coffin
 * Tipo: Normal Spell
 * Efecto: Descarta hasta 3 Cartas de Monstruo de tu mano al Cementerio.
 */
module.exports = {
    id: 39950073,
    name: "The Cheerful Coffin",
    type: "Spell Card",
    atk: 0, def: 0, level: 0, race: "Normal",
    isSpell: true,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = duelState[playerKey];
        if (!player || !player.hand) return { success: false };

        let discarded = 0;
        for (let i = player.hand.length - 1; i >= 0 && discarded < 3; i--) {
            const c = player.hand[i];
            const type = (c?.type || c?.card_data?.type || '').toLowerCase();
            if (type.includes('monster')) {
                const [removed] = player.hand.splice(i, 1);
                effectUtils.sendCardToGraveyard(duelState, playerKey, removed);
                discarded++;
            }
        }

        effectUtils.emitDuelLog(
            duelState.roomId,
            `⚰️✨ [The Cheerful Coffin] ¡${player.username} descartó ${discarded} carta(s) de monstruo al Cementerio!`,
            'spell'
        );
        return { success: true, discarded };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
