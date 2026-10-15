/**
 * [Passcode: 83764718] Monster Reborn (Monstruo Renacido)
 * Tipo: Normal Spell | Expansión: LOB
 * Descripción Oficial: Target 1 monster in either GY; Special Summon it.
 */
module.exports = {
    id: 83764718,
    name: "Monster Reborn",
    type: "Normal Spell",
    race: "Spell",
    isMonsterRevival: true,

    canActivate({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const p = duelState[playerKey];
        const emptySlots = (p?.monsters || []).filter(m => m === null).length;
        if (emptySlots === 0) {
            return { canActivate: false, reason: "No tienes casillas libres en tu Zona de Monstruos." };
        }

        const isMonster = (c) => {
            if (!c) return false;
            const cd = c.card_data || c;
            const t = (cd.type || c.type || '').toLowerCase();
            return !t.includes('spell') && !t.includes('trap') && (t.includes('monster') || (cd.atk !== null && cd.atk !== undefined));
        };

        const p1HasMon = (duelState.player1?.graveyard || []).some(isMonster);
        const p2HasMon = (duelState.player2?.graveyard || []).some(isMonster);

        if (!p1HasMon && !p2HasMon) {
            return { canActivate: false, reason: "No hay monstruos en ningún Cementerio para revivir." };
        }
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const player = duelState[playerKey];
        const isMonster = (c) => {
            if (!c) return false;
            const cd = c.card_data || c;
            const t = (cd.type || c.type || '').toLowerCase();
            return !t.includes('spell') && !t.includes('trap') && (t.includes('monster') || (cd.atk !== null && cd.atk !== undefined));
        };

        let targetCardId = Number(targetData?.target_card_id || targetData?.cardId || targetData?.card_id || 0);
        let foundCard = null;
        let sourceKey = playerKey;

        const gyOrder = targetData?.target_gy 
            ? [targetData.target_gy, targetData.target_gy === 'player1' ? 'player2' : 'player1'] 
            : [playerKey, oppKey];

        for (const pk of gyOrder) {
            if (foundCard) break;
            const gy = duelState[pk]?.graveyard;
            if (!gy) continue;

            let idx = -1;
            if (targetCardId > 0) {
                idx = gy.findIndex(c => Number(c.id || c.card_id) === targetCardId && isMonster(c));
            }
            if (idx === -1 && !targetCardId) {
                // Si es NPC o no se especificó ID, tomar el monstruo con mayor ATK
                let maxAtk = -1;
                gy.forEach((c, i) => {
                    if (isMonster(c)) {
                        const atk = Number(c.atk !== undefined ? c.atk : (c.card_data?.atk || 0));
                        if (atk > maxAtk) {
                            maxAtk = atk;
                            idx = i;
                        }
                    }
                });
            }

            if (idx !== -1) {
                foundCard = gy.splice(idx, 1)[0];
                sourceKey = pk;
            }
        }

        if (foundCard) {
            const emptySlot = player.monsters.findIndex(m => m === null);
            if (emptySlot !== -1) {
                const cId = Number(foundCard.id || foundCard.card_id);
                const cData = (typeof effectUtils.ocgCardReader === 'function' ? effectUtils.ocgCardReader(cId) : null) || foundCard.card_data || foundCard;

                player.monsters[emptySlot] = {
                    card_id: cId,
                    position: 'ATK',
                    faceDown: false,
                    hasAttacked: false,
                    turnSummoned: duelState.turnNumber,
                    hasChangedPosition: false,
                    originalOwner: sourceKey,
                    card_data: { ...cData, id: cId, card_id: cId, originalOwner: sourceKey }
                };

                effectUtils.calculateMonsterCurrentStats(player.monsters[emptySlot], duelState, playerKey);
                const ownerNote = (sourceKey !== playerKey) ? " del Cementerio del adversario" : " de su Cementerio";
                effectUtils.emitDuelLog(
                    duelState.roomId, 
                    `✨💀 [Monster Reborn] ¡"${cData.name || 'Monstruo'}" es revivido${ownerNote} en el campo de batalla!`, 
                    'spell'
                );
                return { success: true, revivedMonster: player.monsters[emptySlot] };
            }
        }

        return { success: false, reason: "No se pudo seleccionar un monstruo válido del Cementerio." };
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
