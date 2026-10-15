/**
 * [Passcode: 29981921] Legendary Six Samurai - Shi En
 * Tipo: Synchro Effect Monster (Level 5 / DARK / Warrior / 2500 ATK / 1400 DEF)
 * Requerimientos: 1 Warrior Tuner + 1+ non-Tuner "Six Samurai" monsters
 * Efecto Rápido (1 vez por turno): Niega y destruye 1 Carta Mágica/Trampa que el oponente active.
 * Sustitución: Si fuera a ser destruido por batalla o efecto de carta, puedes destruir otro monstruo "Six Samurai" que controles en su lugar.
 */
module.exports = {
    id: 29981921,
    name: "Legendary Six Samurai - Shi En",
    type: "Synchro Effect Monster",
    atk: 2500,
    def: 1400,
    level: 5,
    race: "Warrior",
    attribute: "DARK",
    isSynchro: true,

    synchroRequirements: {
        tunerFilter: (m) => {
            if (!m) return false;
            const cd = m.card_data || m;
            const race = (cd.race || '').toString().toLowerCase();
            const raceCode = Number(cd.raceCode || 0);
            return race.includes('warrior') || race.includes('guerrero') || Boolean(raceCode & 0x1);
        },
        nonTunerFilter: (m) => {
            if (!m) return false;
            const cd = m.card_data || m;
            const name = (cd.name || m.name || '').toString().toLowerCase();
            return name.includes('six samurai') || name.includes('seis samur');
        }
    },

    canActivate(duelState, playerKey) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        if (!player || !player.monsters) return false;
        const shiEnMon = player.monsters.find(m => m && !m.faceDown && Number(m.card_id || m.card_data?.id) === 29981921);
        if (!shiEnMon || shiEnMon.usedShiEnNegateThisTurn) return false;

        // Requiere una cadena activa con una Magia/Trampa activada por el oponente
        if (!duelState.activeChain || duelState.activeChain.length === 0) return false;
        const lastLink = duelState.activeChain[duelState.activeChain.length - 1];
        if (lastLink.player === player.username) return false;
        const cd = lastLink.card_data || {};
        const isSpellTrap = ((cd.type || '').toString().toLowerCase().includes('spell') || 
                             (cd.type || '').toString().toLowerCase().includes('trap') ||
                             (cd.type || '').toString().toLowerCase().includes('mágica') ||
                             (cd.type || '').toString().toLowerCase().includes('trampa'));
        return Boolean(isSpellTrap);
    },

    async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        const opponent = (duelState.players && duelState.players[opponentKey]) || duelState[opponentKey] || {};

        // Si hay una cadena activa con magia o trampa rival: Negar y destruir
        if (duelState.activeChain && duelState.activeChain.length > 0) {
            const lastLink = duelState.activeChain[duelState.activeChain.length - 1];
            const cd = lastLink.card_data || {};
            const isSpellTrap = ((cd.type || '').toString().toLowerCase().includes('spell') || 
                                 (cd.type || '').toString().toLowerCase().includes('trap') ||
                                 (cd.race || '').toString().toLowerCase().includes('spell') ||
                                 (cd.race || '').toString().toLowerCase().includes('trap') ||
                                 (cd.type || '').toString().toLowerCase().includes('mágica') ||
                                 (cd.type || '').toString().toLowerCase().includes('trampa'));

            if (isSpellTrap && lastLink.player !== player.username) {
                const negated = duelState.activeChain.pop();
                if (negated.card_data) {
                    effectUtils.sendCardToGraveyard(duelState, negated.card_data, opponentKey);
                    // Si estaba ocupando una casilla en el campo, liberarla
                    if (negated.slot_index !== undefined && negated.slot_index >= 0 && opponent.spells) {
                        opponent.spells[negated.slot_index] = null;
                    }
                }

                // Marcar que Shi En usó su efecto en este turno en el monstruo del campo
                if (player.monsters) {
                    const shiEnMon = player.monsters.find(m => m && Number(m.card_id || m.card_data?.id) === 29981921);
                    if (shiEnMon) shiEnMon.usedShiEnNegateThisTurn = true;
                }

                effectUtils.emitDuelLog(duelState.roomId, `🛑⚔️ [Legendary Six Samurai - Shi En] ¡Niega y destruye la activación de "${negated.card_data ? negated.card_data.name : 'Magia/Trampa'}"!`, 'trap');
                return { success: true };
            }
        }

        effectUtils.emitDuelLog(duelState.roomId, `⚔️ [Legendary Six Samurai - Shi En] En guardia (2500 ATK). Listo para negar 1 Magia/Trampa del rival.`, 'effect');
        return { success: true };
    },

    /**
     * Hook de protección por sustitución: Si Shi En va a ser destruido,
     * busca otro "Six Samurai" en el campo para destruirlo en su lugar.
     */
    canSubstituteDestruction(duelState, playerKey, shiEnMonster) {
        const player = (duelState.players && duelState.players[playerKey]) || duelState[playerKey] || {};
        if (!player || !player.monsters) return null;

        const otherSSIdx = player.monsters.findIndex((m, idx) => {
            if (!m || m === shiEnMonster) return false;
            const cd = m.card_data || {};
            const name = (cd.name || m.name || '').toLowerCase();
            return name.includes('six samurai') || name.includes('seis samur');
        });

        if (otherSSIdx !== -1) {
            return {
                substituteSlot: otherSSIdx,
                substituteMonster: player.monsters[otherSSIdx]
            };
        }
        return null;
    },

    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};