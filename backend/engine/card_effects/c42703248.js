/**
 * [Passcode: 42703248] Giant Trunade
 * Tipo: Normal Spell | Expansión: MRL
 */
module.exports = {
    id: 42703248,
    name: "Giant Trunade",
    type: "Normal Spell",
    race: "Spell",
    isSpellTrapBoardWipe: true,

    canActivate({ duelState, playerKey }) {
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        let returned = 0;
        ['player1', 'player2'].forEach(pk => {
            const p = duelState[pk];
            if (p) {
                for (let i = 0; i < 5; i++) {
                    if (p.spells[i]) {
                        p.hand.push(p.spells[i]);
                        p.spells[i] = null;
                        returned++;
                    }
                }
                if (p.fieldSpell) {
                    p.hand.push(p.fieldSpell);
                    p.fieldSpell = null;
                    returned++;
                }
            }
        });
        effectUtils.emitDuelLog(duelState.roomId, `🌪️✨ [${this.name}] ¡Tornado Gigante regresa ${returned} carta(s) Mágica(s)/Trampa(s) del campo a la mano!`, 'spell');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
