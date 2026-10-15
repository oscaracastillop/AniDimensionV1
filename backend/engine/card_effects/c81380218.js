/**
 * [Passcode: 81380218] Chorus of Sanctuary
 * Tipo: Field Spell | Expansión: MRL
 */
module.exports = {
    id: 81380218,
    name: "Chorus of Sanctuary",
    type: "Field Spell",
    race: "Field",
    isField: true,
    targetAttribute: "ALL",

    canActivate({ duelState, playerKey }) {
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const p = duelState[playerKey];
        p.fieldSpell = { id: this.id, name: this.name, type: this.type, targetAttribute: this.targetAttribute };

        // Recalcular estadísticas para todos los monstruos de ambos campos
        ['player1', 'player2'].forEach(pk => {
            (duelState[pk]?.monsters || []).forEach(m => {
                if (m) effectUtils.calculateMonsterCurrentStats(m, duelState, pk);
            });
        });

        effectUtils.emitDuelLog(duelState.roomId, `🌐✨ [${this.name}] ¡El Campo Mágico "Chorus of Sanctuary" se despliega en todo el terreno de duelo! (Todos los monstruos en Posición de Defensa ganan 500 DEF)`, 'field');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
