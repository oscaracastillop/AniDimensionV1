/**
 * [Passcode: 72302403] Swords of Revealing Light (Espadas de la Luz Reveladora)
 * Tipo: Normal Spell | Expansión: LOB / MRD / SRL
 * Descripción Oficial:
 * After this card's activation, it remains on the field, but you must destroy it during 
 * the End Phase of your opponent's 3rd turn. When this card is activated: If your opponent 
 * controls a face-down monster, flip all monsters they control face-up. While this card 
 * is face-up on the field, your opponent's monsters cannot declare an attack.
 */
module.exports = {
    id: 72302403,
    name: "Swords of Revealing Light",
    type: "Normal Spell",
    race: "Spell",
    isSwords: true,
    isAttackBlocker: true,
    remainsOnField: true,

    canActivate({ duelState, playerKey, opponentKey }) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const pObj = duelState[playerKey];
        if (!pObj) return { canActivate: false, reason: "Estado de jugador no encontrado." };
        return { canActivate: true };
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
        const pObj = duelState[playerKey];
        const oppObj = duelState[oppKey];

        // 1. Revelar todos los monstruos boca abajo del oponente
        let revealedCount = 0;
        const oppMonsters = oppObj?.monsters || [];
        for (let idx = 0; idx < oppMonsters.length; idx++) {
            const m = oppMonsters[idx];
            if (m && m.faceDown) {
                m.faceDown = false;
                revealedCount++;

                // Activar efectos de volteo si aplica (regla oficial Konami)
                const mId = Number(m.card_id || (m.card_data && m.card_data.id) || 0);
                const manifest = (effectUtils && typeof effectUtils.getRoomManifest === 'function') 
                    ? effectUtils.getRoomManifest(duelState.roomId) 
                    : null;
                const mMeta = manifest ? manifest.get(mId) : null;
                if (mMeta && mMeta.module && typeof mMeta.module.onFlip === 'function') {
                    try {
                        await mMeta.module.onFlip({
                            duelState,
                            playerKey: oppKey,
                            opponentKey: playerKey,
                            targetData: { slot_index: idx },
                            link: { card_data: m.card_data || m },
                            effectUtils,
                            isFlip: true
                        });
                    } catch (e) {
                        console.error(`[Swords of Revealing Light] Error ejecutando efecto de volteo en casilla ${idx}:`, e);
                    }
                }
            }
        }

        // 2. Localizar y anclar la carta activa en la zona de Magia/Trampa para permanencia continua
        let sIdx = (link && link.slot_index !== undefined && link.slot_index >= 0) ? link.slot_index : -1;
        if (sIdx === -1 && pObj && pObj.spells) {
            sIdx = pObj.spells.findIndex(s => s && Number(s.card_id || (s.card_data && s.card_data.id)) === this.id);
        }

        if (sIdx !== -1 && pObj && pObj.spells && pObj.spells[sIdx]) {
            const spellSlot = pObj.spells[sIdx];
            spellSlot.faceDown = false;
            spellSlot.position = 'ACT';
            spellSlot.turnCounter = 0;
            spellSlot.swordsActive = true;
            spellSlot.isAttackBlocker = true;
            spellSlot.swordsOwner = playerKey;
            spellSlot.remainsOnField = true;
        }

        // 3. Registrar banderas activas a nivel de estado del duelo
        duelState.swordsActive = true;
        duelState.swordsActivePlayers = duelState.swordsActivePlayers || {};
        duelState.swordsActivePlayers[playerKey] = true;
        if (pObj) pObj.hasSwordsActive = true;

        const revMsg = revealedCount > 0 
            ? ` ¡Revela ${revealedCount} monstruo(s) boca abajo del oponente!` 
            : '';
        effectUtils.emitDuelLog(
            duelState.roomId,
            `⚔️✨ [Swords of Revealing Light] ¡Espadas de Luz descienden e iluminan el campo!${revMsg} Los monstruos del rival no pueden declarar ataques durante 3 turnos.`,
            'spell'
        );

        return { success: true, revealedCount };
    },

    onOpponentTurnEnd({ duelState, playerKey, spellSlot, slotIndex, effectUtils }) {
        if (!spellSlot || !spellSlot.swordsActive) return;
        spellSlot.turnCounter = (spellSlot.turnCounter || 0) + 1;
        effectUtils.emitDuelLog(
            duelState.roomId,
            `⚔️✨ [Espadas de la Luz Reveladora] Turno ${spellSlot.turnCounter}/3 del oponente completado.`,
            'spell'
        );

        if (spellSlot.turnCounter >= 3) {
            effectUtils.sendCardToGraveyard(duelState, spellSlot, playerKey);
            if (duelState[playerKey] && duelState[playerKey].spells) {
                duelState[playerKey].spells[slotIndex] = null;
            }
            if (duelState[playerKey]) duelState[playerKey].hasSwordsActive = false;
            effectUtils.emitDuelLog(
                duelState.roomId,
                `⚔️💥 [Espadas de la Luz Reveladora] Han transcurrido 3 turnos del oponente. Las Espadas son destruidas y van al Cementerio.`,
                'spell'
            );
        }
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
