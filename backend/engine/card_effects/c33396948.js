/**
 * [Passcode: 33396948] Exodia the Forbidden One (Exodia, el Prohibido)
 * Tipo: Effect Monster | Expansión: LOB
 * Descripción Oficial:
 * If you have "Right Leg of the Forbidden One", "Left Leg of the Forbidden One", 
 * "Right Arm of the Forbidden One" and "Left Arm of the Forbidden One" in addition 
 * to this card in your hand, you win the Duel.
 * 
 * Regla Oficial OCG:
 * Es una condición de victoria pasiva (Win Condition), no un efecto de ignición ni disparado.
 * No se activa manualmente por el jugador ni genera eslabón de cadena. Se comprueba 
 * automáticamente en cuanto las 5 piezas convergen en la mano.
 */
module.exports = {
    id: 33396948,
    name: "Exodia the Forbidden One",
    type: "Effect Monster",
    atk: 1000,
    def: 1000,
    level: 3,
    race: "Spellcaster",
    isExodiaPiece: true,
    isVictoryCondition: true,
    hasIgnitionEffect: false,

    // Bloquea cualquier intento de activación manual como efecto de monstruo
    canActivate({ duelState, playerKey, opponentKey }) {
        return { 
            canActivate: false, 
            reason: "El efecto de Exodia es una condición de victoria automática al reunir las 5 piezas en la mano. No se activa manualmente por orden del jugador." 
        };
    },

    // Verificación canónica de condición de victoria (Mano y/o Campo)
    checkVictoryCondition(cards) {
        if (!Array.isArray(cards) || cards.length < 5) return false;
        const EXODIA_PARTS = [
            { code: 33396948, names: ['exodia the forbidden one', 'exodia, el prohibido', 'exodia'] },
            { code: 70903634, names: ['right arm of the forbidden one', 'brazo derecho del prohibido'] },
            { code: 7902349,  names: ['left arm of the forbidden one', 'brazo izquierdo del prohibido'] },
            { code: 8124921,  names: ['right leg of the forbidden one', 'pierna derecha del prohibido'] },
            { code: 44519536, names: ['left leg of the forbidden one', 'pierna izquierda del prohibido'] }
        ];

        // Cada una de las 5 piezas debe estar presente de forma única e inequívoca
        return EXODIA_PARTS.every(part =>
            cards.some(c => {
                if (!c) return false;
                const cd = c.card_data || c;
                const cId = Number(c.card_id || cd.id || cd.card_id || 0);
                const cName = String(c.name || cd.name || '').trim().toLowerCase();
                return cId === part.code || part.names.includes(cName);
            })
        );
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        // Ejecutado automáticamente cuando se declara victoria por Exodia
        effectUtils.emitDuelLog(
            duelState.roomId, 
            `✨ ¡¡¡EXODIA, EL PROHIBIDO HA SIDO REUNIDO (MANO/CAMPO)!!! Condición de victoria instantánea cumplida.`, 
            'victory'
        );
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
