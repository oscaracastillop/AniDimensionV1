/**
 * [Passcode: 40133511] Bazoo the Soul-Eater
 * Tipo: Effect Monster | Expansión: LON
 */
module.exports = {
    id: 40133511,
    name: "Bazoo the Soul-Eater",
    type: "Effect Monster",
    atk: 1600,
    def: 900,
    level: 4,
    race: "Beast",
    attribute: "EARTH",

    canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const gyMonsters = (p?.graveyard || []).filter(c => (c.type || '').toLowerCase().includes('monster'));
            if (gyMonsters.length === 0) return { canActivate: false, reason: "No hay monstruos en tu Cementerio para desterrar." };
            return { canActivate: true };
        },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            p.banished = p.banished || [];
            let banishedCount = 0;
            for (let i = p.graveyard.length - 1; i >= 0 && banishedCount < 3; i--) {
                const c = p.graveyard[i];
                if (c && (c.type || '').toLowerCase().includes('monster')) {
                    const removed = p.graveyard.splice(i, 1)[0];
                    p.banished.push(removed);
                    banishedCount++;
                }
            }

            const boost = banishedCount * 300;
            const selfSlot = (p.monsters || []).findIndex(m => m && Number(m.card_id || m.card_data?.id) === 40133511);
            if (selfSlot !== -1 && p.monsters[selfSlot]) {
                const self = p.monsters[selfSlot];
                self.currentAtk = (self.currentAtk !== undefined ? self.currentAtk : 1600) + boost;
            }

            effectUtils.emitDuelLog(duelState.roomId, `🦁💀 [Bazoo the Soul-Eater] Destierra ${banishedCount} monstruos de su Cementerio y gana +${boost} ATK hasta el final del turno rival.`, 'monster');
            return { success: true };
        },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        if (context.isFlip && typeof this.onFlip === 'function') {
            return this.onFlip(context);
        }
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
