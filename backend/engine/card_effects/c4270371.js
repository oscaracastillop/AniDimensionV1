/**
 * [Passcode: 4270371] Giant Trunade
 * Tipo: Normal Spell
 * Efecto: Regresa todas las Cartas Mágicas y de Trampa en el campo a las manos de sus dueños.
 */
module.exports = {
    id: 4270371,
    name: "Giant Trunade",
    type: "Spell Card",
    atk: 0, def: 0, level: 0, race: "Normal",
    isSpell: true,

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        let returned = 0;
        ['player1', 'player2'].forEach(pKey => {
            const p = duelState[pKey];
            if (!p) return;

            if (p.fieldSpell) {
                p.hand.push(p.fieldSpell);
                p.fieldSpell = null;
                returned++;
            }

            for (let i = 0; i < 5; i++) {
                if (p.spells[i]) {
                    p.hand.push(p.spells[i]);
                    p.spells[i] = null;
                    returned++;
                }
            }
        });

        effectUtils.emitDuelLog(
            duelState.roomId,
            `🌪️🖐️ [Giant Trunade] ¡Un poderoso vendaval regresó todas las (${returned}) Cartas Mágicas y de Trampa del campo a la mano!`,
            'spell'
        );
        return { success: true, returned };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
