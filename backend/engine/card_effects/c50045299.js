/**
 * [Passcode: 50045299] Dragon Capture Jar (Jarra de Captura de Dragones)
 * Tipo: Continuous Trap | Expansión: LOB
 * Descripción Oficial: Change all face-up Dragon monsters on the field to Defense Position, also they cannot change their battle positions.
 */
module.exports = {
    id: 50045299,
    name: "Dragon Capture Jar",
    type: "Continuous Trap",
    race: "Trap",
    isTrap: true,
    isContinuous: true,
    isDragonTrap: true,
    remainsOnField: true,

    canActivate({ duelState, playerKey, opponentKey }) {
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        let dragonsTrapped = 0;
        ['player1', 'player2'].forEach(pk => {
            (duelState[pk]?.monsters || []).forEach(m => {
                if (m && !m.faceDown) {
                    const cd = m.card_data || m;
                    const r = (cd.race || m.race || '').toLowerCase();
                    const isDragon = r.includes('dragon') || r.includes('dragón') || (Number(cd.raceCode || 0) & 0x2000);
                    if (isDragon) {
                        m.position = 'DEF';
                        m.isTrapped = true;
                        dragonsTrapped++;
                    }
                }
            });
        });

        effectUtils.emitDuelLog(
            duelState.roomId,
            `🏺🐉 [Dragon Capture Jar] ¡La Jarra mágica sella a todos los Dragones en Modo Defensa (${dragonsTrapped} atrapados)!`,
            'trap'
        );
        return { success: true, dragonsTrapped };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
