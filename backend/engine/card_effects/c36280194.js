/**
 * [Passcode: 36280194] Backup Soldier
 * Tipo: Normal Trap | Expansión: PSV
 */
module.exports = {
    id: 36280194,
    name: "Backup Soldier",
    type: "Normal Trap",
    race: "Trap",
    isTrap: true,

    canActivate({ duelState, playerKey }) {
            const gy = duelState[playerKey]?.graveyard || [];
            if (gy.length < 5) return { canActivate: false, reason: "Debes tener al menos 5 o más cartas en tu Cementerio." };
            const validCount = gy.filter(c => {
                const ct = (c.card_data?.type || c.type || '').toLowerCase();
                const atk = c.card_data?.atk !== undefined ? c.card_data.atk : (c.atk || 0);
                return ct.includes('normal') && atk <= 1500;
            }).length;
            if (validCount === 0) return { canActivate: false, reason: "No hay monstruos normales de 1500 o menos ATK en el Cementerio." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const retrieved = [];
            for (let i = p.graveyard.length - 1; i >= 0 && retrieved.length < 3; i--) {
                const c = p.graveyard[i];
                const ct = (c.card_data?.type || c.type || '').toLowerCase();
                const atk = c.card_data?.atk !== undefined ? c.card_data.atk : (c.atk || 0);
                if (ct.includes('normal') && atk <= 1500) {
                    p.graveyard.splice(i, 1);
                    p.hand.push(c);
                    retrieved.push(c.card_data?.name || c.name);
                }
            }
            effectUtils.emitDuelLog(duelState.roomId, `🛡️🎴 [Backup Soldier] Añade ${retrieved.length} monstruo(s) normal(es) desde el Cementerio a la mano: ${retrieved.join(', ')}.`, 'trap');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
