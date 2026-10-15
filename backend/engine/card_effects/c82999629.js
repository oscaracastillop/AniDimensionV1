/**
 * [Passcode: 82999629] Umiiruka
 * Tipo: Field Spell | Expansión: MRL
 */
module.exports = {
    id: 82999629,
    name: "Umiiruka",
    type: "Field Spell",
    race: "Field",
    isField: true,
    targetAttribute: "WATER",

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

        effectUtils.emitDuelLog(duelState.roomId, `🌐✨ [${this.name}] ¡El Campo Mágico "Umiiruka" se despliega en todo el terreno de duelo! (Monstruos de AGUA ganan 500 ATK y pierden 400 DEF)`, 'field');
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
