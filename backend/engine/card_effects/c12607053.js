/**
 * [Passcode: 12607053] Waboku (Waboku)
 * Tipo: Normal Trap | Expansión: LOB / MRD / SRL
 * Descripción Oficial:
 * You take no battle damage from your opponent's monsters this turn. 
 * Your monsters cannot be destroyed by battle this turn.
 */
module.exports = {
    id: 12607053,
    name: "Waboku",
    type: "Trap Card",
    race: "Trap",
    isTrap: true,
    isAttackTrap: true,

    canActivate({ duelState, playerKey, opponentKey }) {
        if (!duelState || !duelState[playerKey]) {
            return { canActivate: false, reason: "Estado de duelo no válido." };
        }
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const currentTurn = duelState.turnNumber || 1;

        // 1. Efecto residual modular de turno (Arquitectura Konami OCG)
        // Todo daño de combate a 0 y monstruos protegidos de destrucción SOLO durante este turno
        duelState.turnLingeringEffects = duelState.turnLingeringEffects || [];
        duelState.turnLingeringEffects.push({
            cardId: 12607053,
            cardName: "Waboku",
            targetPlayer: playerKey,
            activeTurn: currentTurn,
            preventsBattleDamage: true,
            preventsBattleDestruction: true,
            protectionReason: "Waboku"
        });

        // 2. Marcar monstruos del jugador en el turno actual
        const playerObj = duelState[playerKey];
        if (playerObj) {
            playerObj.wabokuActiveTurn = currentTurn;
            (playerObj.monsters || []).forEach(m => {
                if (m) {
                    m.isBattleProtectedTurn = currentTurn;
                }
            });
        }

        effectUtils.emitDuelLog(
            duelState.roomId,
            `🕊️🛡️ [Waboku] ¡Activada por ${playerObj?.username || playerKey}! Todo el daño de batalla se reduce a 0 y sus monstruos no pueden ser destruidos en combate durante este turno.`,
            'trap'
        );
        return { success: true };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
