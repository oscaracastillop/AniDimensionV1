/**
 * Ani-Dimension: Modales OCG, Resolución de Cadenas LIFO, Tributos y Descarte
 */
function getActiveSocket() {
    return (typeof window !== 'undefined' && window.getSocket) 
        ? window.getSocket() 
        : (typeof window !== 'undefined' && window.socket 
            ? window.socket 
            : (typeof socket !== 'undefined' ? socket : null));
}

function getActiveDuelRoomId() {
    if (typeof window !== 'undefined' && window.currentPvpRoomId) {
        return window.currentPvpRoomId;
    }
    if (typeof currentPvpRoomId !== 'undefined' && currentPvpRoomId) {
        return currentPvpRoomId;
    }
    const state = (typeof window !== 'undefined' && window.lastDuelState) || (typeof lastDuelState !== 'undefined' ? lastDuelState : null);
    if (state && state.roomId) {
        return state.roomId;
    }
    return 'ROOM_DEMO';
}

function getLocalDuelPlayer() {
    const state = (typeof window !== 'undefined' && window.lastDuelState) || (typeof lastDuelState !== 'undefined' ? lastDuelState : null);
    if (!state) return null;
    const localKey = window.localPlayerRoleKey || 'player1';
    return state[localKey] || state.player1;
}

function getRivalDuelPlayer() {
    const state = (typeof window !== 'undefined' && window.lastDuelState) || (typeof lastDuelState !== 'undefined' ? lastDuelState : null);
    if (!state) return null;
    const rivalKey = window.rivalPlayerRoleKey || 'player2';
    return state[rivalKey] || state.player2;
}

function checkMonsterMeetsEquipCondition(equipCardData, monster) {
    if (!monster || monster.faceDown || monster.position === 'SET') return false;
    const mData = monster.card_data || monster;
    if (!mData) return false;
    const desc = (equipCardData.desc || equipCardData.description || '').toLowerCase();
    const mRace = (mData.race || monster.race || '').toLowerCase();
    const mType = (mData.type || monster.type || '').toLowerCase();
    const mAttr = (mData.attribute || monster.attribute || '').toUpperCase();

    // Comprobación rigurosa de razas específicas
    const racePatterns = [
        { req: 'warrior', match: (mRace === 'warrior' || mRace.includes('warrior') || mType.includes('warrior')) && !mRace.includes('beast-warrior') },
        { req: 'aqua', match: mRace === 'aqua' || mRace.includes('aqua') || mType.includes('aqua') },
        { req: 'beast-warrior', match: mRace === 'beast-warrior' || mRace.includes('beast-warrior') || mType.includes('beast-warrior') },
        { req: 'beast', match: (mRace === 'beast' || mRace.includes('beast') || mType.includes('beast')) && !mRace.includes('beast-warrior') && !mRace.includes('winged beast') },
        { req: 'winged beast', match: mRace === 'winged beast' || mRace.includes('winged beast') || mType.includes('winged beast') },
        { req: 'zombie', match: mRace === 'zombie' || mRace.includes('zombie') || mType.includes('zombie') },
        { req: 'spellcaster', match: mRace === 'spellcaster' || mRace.includes('spellcaster') || mType.includes('spellcaster') },
        { req: 'fiend', match: mRace === 'fiend' || mRace.includes('fiend') || mType.includes('fiend') },
        { req: 'insect', match: mRace === 'insect' || mRace.includes('insect') || mType.includes('insect') },
        { req: 'plant', match: mRace === 'plant' || mRace.includes('plant') || mType.includes('plant') },
        { req: 'fairy', match: mRace === 'fairy' || mRace.includes('fairy') || mType.includes('fairy') },
        { req: 'dragon', match: mRace === 'dragon' || mRace.includes('dragon') || mType.includes('dragon') },
        { req: 'thunder', match: mRace === 'thunder' || mRace.includes('thunder') || mType.includes('thunder') },
        { req: 'machine', match: mRace === 'machine' || mRace.includes('machine') || mType.includes('machine') },
        { req: 'dinosaur', match: mRace === 'dinosaur' || mRace.includes('dinosaur') || mType.includes('dinosaur') },
        { req: 'rock', match: mRace === 'rock' || mRace.includes('rock') || mType.includes('rock') },
        { req: 'pyro', match: mRace === 'pyro' || mRace.includes('pyro') || mType.includes('pyro') },
        { req: 'fish', match: mRace === 'fish' || mRace.includes('fish') || mType.includes('fish') },
        { req: 'sea serpent', match: mRace === 'sea serpent' || mRace.includes('sea serpent') || mType.includes('sea serpent') },
        { req: 'reptile', match: mRace === 'reptile' || mRace.includes('reptile') || mType.includes('reptile') }
    ];

    for (const p of racePatterns) {
        if (desc.includes(`equip only to a ${p.req}`) || desc.includes(`equip only to an ${p.req}`) || 
            desc.includes(`a ${p.req}-type monster equipped`) || desc.includes(`an ${p.req}-type monster equipped`)) {
            return p.match;
        }
    }

    if (desc.includes('equip only to a dark') || desc.includes('a dark monster equipped')) {
        return mAttr === 'DARK';
    }
    if (desc.includes('equip only to a light') || desc.includes('a light monster equipped')) {
        return mAttr === 'LIGHT';
    }

    return true;
}
if (typeof window !== 'undefined') window.checkMonsterMeetsEquipCondition = checkMonsterMeetsEquipCondition;

function findCardDataInDuel(cardId) {
    if (!cardId) return null;
    const numId = Number(cardId);
    if (!lastDuelState) return null;

    const pools = [
        ...(lastDuelState.player1?.hand || []),
        ...(lastDuelState.player1?.spells || []),
        ...(lastDuelState.player1?.monsters || []),
        ...(lastDuelState.player1?.graveyard || []),
        ...(lastDuelState.player2?.hand || []),
        ...(lastDuelState.player2?.spells || []),
        ...(lastDuelState.player2?.monsters || []),
        ...(lastDuelState.player2?.graveyard || [])
    ];
    if (lastDuelState.player1?.fieldSpell) pools.push(lastDuelState.player1.fieldSpell);
    if (lastDuelState.player2?.fieldSpell) pools.push(lastDuelState.player2.fieldSpell);

    for (const item of pools) {
        if (!item) continue;
        const cId = Number(item.card_id || item.id || (item.card_data && item.card_data.id) || 0);
        if (cId === numId) {
            return item.card_data || item;
        }
    }

    if (typeof window !== 'undefined') {
        if (window.allCardsData && window.allCardsData[numId]) return window.allCardsData[numId];
        if (window.cardDatabase && window.cardDatabase[numId]) return window.cardDatabase[numId];
    }
    return null;
}
if (typeof window !== 'undefined') {
    window.findCardDataInDuel = findCardDataInDuel;
    window.getCardDataById = findCardDataInDuel;
}

function isCardRequiringTarget(cardId) {
    const numId = Number(cardId);
    let cardObj = null;
    const local = getLocalDuelPlayer();
    const rival = getRivalDuelPlayer();

    if (local) {
        cardObj = (local.hand && local.hand.find(c => Number(c.id || c.card_id) === numId))
            || (local.spells && local.spells.find(s => s && Number(s.card_id) === numId))
            || (local.monsters && local.monsters.find(m => m && Number(m.card_id) === numId));
    }
    if (!cardObj && rival) {
        cardObj = (rival.spells && rival.spells.find(s => s && Number(s.card_id) === numId))
            || (rival.monsters && rival.monsters.find(m => m && Number(m.card_id) === numId));
    }

    const cd = (cardObj && (cardObj.card_data || cardObj)) || findCardDataInDuel(numId) || {};
    const isEquip = cd.race === 'Equip' || (cd.type && typeof cd.type === 'string' && cd.type.includes('Equip'));
    const isField = cd.race === 'Field' || (cd.type && typeof cd.type === 'string' && cd.type.includes('Field'));

    // REGLA OFICIAL OCG: Las cartas de equipo pueden equiparse a cualquier monstruo boca arriba en el campo (tuyo o del rival)
    if (isEquip) return 'MONSTER_ANY';
    if (isField) return null;

    // Contact Fusion & XYZ ignition effects
    if ([91998119, 99261403].includes(numId)) return 'TARGET_ANY_OPPONENT';
    if ([2111707].includes(numId)) return 'SPELL_TRAP_FACEUP';
    if ([99724761, 99728880].includes(numId)) return 'SPELL_TRAP_FACEDOWN';
    if ([25119460, 77622396].includes(numId)) return 'MONSTER_OPPONENT_FACEDOWN';

    // Monstruos de volteo o efectos conocidos
    if ([7089711, 54652250, 41392891].includes(numId)) return 'MONSTER_ANY'; // Hane-Hane, Man-Eater Bug, Penguin Soldier

    // Monstruos Unión (Y-Dragon Head y Z-Metal Tank)
    if (numId === 65622692) {
        const isAlreadyEquipped = local && local.spells && local.spells.some(s => s && Number(s.card_id || (s.card_data && s.card_data.id)) === 65622692);
        if (!isAlreadyEquipped) return 'UNION_EQUIP_Y';
    }
    if (numId === 64500000) {
        const isAlreadyEquipped = local && local.spells && local.spells.some(s => s && Number(s.card_id || (s.card_data && s.card_data.id)) === 64500000);
        if (!isAlreadyEquipped) return 'UNION_EQUIP_Z';
    }

    const desc = (cd.desc || cd.description || '').toLowerCase();
    const typeStr = (cd.type || '').toLowerCase();
    const isFlip = typeStr.includes('flip') || Boolean(cd.isFlip);

    if (isFlip) {
        if (desc.includes('destruye') || desc.includes('regresa') || desc.includes('selecciona') || 
            desc.includes('destroy') || desc.includes('return') || desc.includes('target') || desc.includes('select')) {
            if (desc.includes('spell') || desc.includes('trap') || desc.includes('mágica') || desc.includes('trampa')) {
                return 'SPELL_TRAP';
            }
            return 'MONSTER_ANY';
        }
    }

    if (desc.includes('destruye 1 magia/trampa') || desc.includes('destruye 1 carta mágica') || desc.includes('selecciona 1 magia/trampa') || desc.includes('spell/trap') ||
        desc.includes('target 1 spell') || desc.includes('target 1 trap') || desc.includes('destroy 1 spell') || desc.includes('destroy 1 trap')) {
        return 'SPELL_TRAP';
    }
    if (desc.includes('selecciona 1 monstruo') || desc.includes('destruye 1 monstruo') || desc.includes('cambia la posición') ||
        desc.includes('target 1 monster') || desc.includes('target 1 face-up monster') || desc.includes('select 1 monster') || 
        desc.includes('destroy 1 monster') || desc.includes('return it to the hand') || desc.includes('return that target to the hand') || 
        desc.includes('change the battle position') || desc.includes('target up to 2 monsters')) {
        return 'MONSTER_ANY';
    }

    return null;
}

function startInteractiveTargeting(mode, cardId, slotIndex = -1, fromHand = false, isChain = false, cardName = 'Carta', actionType = 'ACTIVATE', cardData = null) {
    pendingTargetAction = {
        mode: mode,
        cardId: cardId,
        slotIndex: slotIndex,
        fromHand: fromHand,
        isChain: isChain,
        cardName: cardName,
        actionType: actionType,
        cardData: cardData || findCardDataInDuel(cardId)
    };

    if (isChain) {
        if (chainTimerInterval) clearInterval(chainTimerInterval);
        const modal = document.getElementById('chain-prompt-modal');
        if (modal) modal.style.display = 'none';
    }

    const banner = document.getElementById('targeting-floating-banner');
    const icon = document.getElementById('targeting-icon');
    const title = document.getElementById('targeting-title');
    const desc = document.getElementById('targeting-desc');

    if (banner) {
        banner.style.display = 'flex';
    }

    if (mode === 'UNION_EQUIP_Y') {
        if (banner) { banner.style.borderColor = '#00f0ff'; banner.style.boxShadow = '0 0 25px rgba(0, 240, 255, 0.6)'; }
        if (icon) { icon.textContent = '⚙️🐉'; icon.style.color = '#00f0ff'; }
        if (title) { title.textContent = `SELECCIÓN DE OBJETIVO UNIÓN - Y-DRAGON HEAD`; title.style.color = '#00f0ff'; }
        if (desc) desc.textContent = `Haz clic sobre "X-Head Cannon" boca arriba en tu campo para equiparle Y-Dragon Head (+400 ATK/DEF).`;
        highlightTargets('UNION_EQUIP_Y', true);
    } else if (mode === 'UNION_EQUIP_Z') {
        if (banner) { banner.style.borderColor = '#f59e0b'; banner.style.boxShadow = '0 0 25px rgba(245, 158, 11, 0.6)'; }
        if (icon) { icon.textContent = '⚙️🛡️'; icon.style.color = '#f59e0b'; }
        if (title) { title.textContent = `SELECCIÓN DE OBJETIVO UNIÓN - Z-METAL TANK`; title.style.color = '#f59e0b'; }
        if (desc) desc.textContent = `Haz clic sobre "X-Head Cannon" o "Y-Dragon Head" boca arriba en tu campo para equiparle Z-Metal Tank (+600 ATK/DEF).`;
        highlightTargets('UNION_EQUIP_Z', true);
    } else if (mode === 'TRAP_FACEUP') {
        if (banner) { banner.style.borderColor = '#e11d48'; banner.style.boxShadow = '0 0 25px rgba(225, 29, 72, 0.6)'; }
        if (icon) { icon.textContent = '🪤'; icon.style.color = '#e11d48'; }
        if (title) { title.textContent = `SELECCIÓN DE OBJETIVO - ${cardName.toUpperCase()}`; title.style.color = '#e11d48'; }
        if (desc) desc.textContent = `Haz clic sobre 1 Carta de TRAMPA BOCA ARRIBA en el campo para destruirla.`;
        highlightTargets('TRAP_FACEUP', true);
    } else if (mode === 'MONSTER_OPPONENT_DEF') {
        if (banner) { banner.style.borderColor = '#00f0ff'; banner.style.boxShadow = '0 0 25px rgba(0, 240, 255, 0.6)'; }
        if (icon) { icon.textContent = '🛡️'; icon.style.color = '#00f0ff'; }
        if (title) { title.textContent = `SELECCIÓN DE OBJETIVO (DEFENSA) - ${cardName.toUpperCase()}`; title.style.color = '#00f0ff'; }
        if (desc) desc.textContent = `Haz clic sobre 1 monstruo del RIVAL en Posición de Defensa (DEF) para cambiarlo a Ataque.`;
        highlightTargets('MONSTER_OPPONENT_DEF', true);
    } else if (mode === 'MONSTER_OPPONENT_ATK' || mode === 'MONSTER_OPPONENT') {
        if (banner) { banner.style.borderColor = '#ff0055'; banner.style.boxShadow = '0 0 25px rgba(255, 0, 85, 0.6)'; }
        if (icon) { icon.textContent = '🎯'; icon.style.color = '#ff0055'; }
        if (title) { title.textContent = `SELECCIÓN DE OBJETIVO - ${cardName.toUpperCase()}`; title.style.color = '#ff0055'; }
        if (desc) desc.textContent = `Haz clic sobre el monstruo del rival que deseas seleccionar como objetivo de "${cardName}".`;
        highlightTargets(mode, true);
    } else if (mode === 'MONSTER_OPPONENT_FACEDOWN') {
        if (banner) { banner.style.borderColor = '#38bdf8'; banner.style.boxShadow = '0 0 25px rgba(56, 189, 248, 0.6)'; }
        if (icon) { icon.textContent = '👾'; icon.style.color = '#38bdf8'; }
        if (title) { title.textContent = `SELECCIÓN DE OBJETIVO YZ - ${cardName.toUpperCase()}`; title.style.color = '#38bdf8'; }
        if (desc) desc.textContent = `Haz clic sobre 1 monstruo BOCA ABAJO (SET) del rival para destruirlo descartando 1 carta.`;
        highlightTargets('MONSTER_OPPONENT_FACEDOWN', true);
    } else if (mode === 'TARGET_ANY_OPPONENT') {
        if (banner) { banner.style.borderColor = '#a855f7'; banner.style.boxShadow = '0 0 25px rgba(168, 85, 247, 0.6)'; }
        if (icon) { icon.textContent = '💥'; icon.style.color = '#a855f7'; }
        if (title) { title.textContent = `SELECCIÓN DE OBJETIVO XYZ - ${cardName.toUpperCase()}`; title.style.color = '#a855f7'; }
        if (desc) desc.textContent = `Haz clic sobre cualquier carta del rival en el campo para destruirla descartando 1 carta.`;
        highlightTargets('TARGET_ANY_OPPONENT', true);
    } else if (mode === 'MONSTER_ANY') {
        if (banner) { banner.style.borderColor = '#ffaa00'; banner.style.boxShadow = '0 0 25px rgba(255, 170, 0, 0.6)'; }
        if (icon) { icon.textContent = '🎯'; icon.style.color = '#ffaa00'; }
        if (title) { title.textContent = `SELECCIÓN DE OBJETIVO - ${cardName.toUpperCase()}`; title.style.color = '#ffaa00'; }
        if (desc) desc.textContent = `Haz clic sobre un monstruo en el campo para aplicar el efecto de "${cardName}".`;
        highlightTargets('MONSTER_ANY', true);
    } else if (mode === 'MONSTER_PLAYER') {
        if (banner) { banner.style.borderColor = '#00e5ff'; banner.style.boxShadow = '0 0 25px rgba(0, 229, 255, 0.6)'; }
        if (icon) { icon.textContent = '🗡️'; icon.style.color = '#00e5ff'; }
        if (title) { title.textContent = `SELECCIÓN DE OBJETIVO (EQUIPAR) - ${cardName.toUpperCase()}`; title.style.color = '#00e5ff'; }
        if (desc) desc.textContent = `Haz clic sobre tu monstruo que deseas equipar con "${cardName}".`;
        highlightTargets('MONSTER_PLAYER', true);
    } else if (mode === 'SPELL_TRAP' || mode === 'SPELL_TRAP_FACEUP' || mode === 'SPELL_TRAP_FACEDOWN') {
        if (banner) { banner.style.borderColor = '#00ff88'; banner.style.boxShadow = '0 0 25px rgba(0, 255, 136, 0.6)'; }
        if (icon) { icon.textContent = '⚡'; icon.style.color = '#00ff88'; }
        if (title) { title.textContent = `SELECCIÓN DE OBJETIVO - ${cardName.toUpperCase()}`; title.style.color = '#00ff88'; }
        if (desc) desc.textContent = `Haz clic sobre la carta Mágica o Trampa en el campo que deseas seleccionar con "${cardName}".`;
        highlightTargets(mode, true);
    }
}

function cancelInteractiveTargeting() {
    const wasChain = pendingTargetAction && pendingTargetAction.isChain;
    pendingTargetAction = null;

    const banner = document.getElementById('targeting-floating-banner');
    if (banner) banner.style.display = 'none';

    highlightTargets('ALL', false);

    if (wasChain) {
        const modal = document.getElementById('chain-prompt-modal');
        if (modal) modal.style.display = 'flex';
    }
}

function highlightTargets(mode, enable) {
    if (!enable) {
        document.querySelectorAll('.trap-target-candidate, .mst-target-candidate').forEach(el => {
            el.classList.remove('trap-target-candidate');
            el.classList.remove('mst-target-candidate');
        });
        return;
    }
    if (!lastDuelState) return;

    const local = getLocalDuelPlayer();
    const rival = getRivalDuelPlayer();

    const currentCardId = pendingTargetAction ? pendingTargetAction.cardId : null;
    let currentCardData = null;
    if (currentCardId && typeof getCardDataById === 'function') {
        currentCardData = getCardDataById(currentCardId);
    }
    if (!currentCardData && pendingTargetAction && pendingTargetAction.cardData) {
        currentCardData = pendingTargetAction.cardData;
    }
    const isEquip = Boolean(currentCardData && (currentCardData.race === 'Equip' || (currentCardData.type && currentCardData.type.includes('Equip'))));

    if (mode === 'TRAP_FACEUP') {
        const checkIsFaceUpTrap = (s) => s && !s.faceDown && s.position !== 'SET' && s.card_data && (s.card_data.type?.includes('Trap') || s.card_data.race?.includes('Trap'));
        for (let i = 0; i < 5; i++) {
            if (local && local.spells && checkIsFaceUpTrap(local.spells[i])) {
                const el = document.getElementById(`p-s${i}`);
                if (el) el.classList.add('mst-target-candidate');
            }
            if (rival && rival.spells && checkIsFaceUpTrap(rival.spells[i])) {
                const el = document.getElementById(`r-s${i}`);
                if (el) el.classList.add('mst-target-candidate');
            }
        }
    } else if (mode === 'MONSTER_OPPONENT_DEF') {
        for (let i = 0; i < 5; i++) {
            const m = rival && rival.monsters && rival.monsters[i];
            if (m && m.position === 'DEF') {
                const el = document.getElementById(`r-m${i}`);
                if (el) el.classList.add('trap-target-candidate');
            }
        }
    } else if (mode === 'MONSTER_OPPONENT_FACEDOWN') {
        for (let i = 0; i < 5; i++) {
            const m = rival && rival.monsters && rival.monsters[i];
            if (m && (m.faceDown || m.position === 'SET')) {
                const el = document.getElementById(`r-m${i}`);
                if (el) el.classList.add('trap-target-candidate');
            }
        }
    } else if (mode === 'MONSTER_OPPONENT' || mode === 'MONSTER_OPPONENT_ATK' || mode === 'MONSTER_ANY' || mode === 'TARGET_ANY_OPPONENT') {
        for (let i = 0; i < 5; i++) {
            const m = rival && rival.monsters && rival.monsters[i];
            if (m) {
                if (isEquip) {
                    if (checkMonsterMeetsEquipCondition(currentCardData, m)) {
                        const el = document.getElementById(`r-m${i}`);
                        if (el) el.classList.add('trap-target-candidate');
                    }
                } else {
                    const el = document.getElementById(`r-m${i}`);
                    if (el) el.classList.add('trap-target-candidate');
                }
            }
        }
    } else if (mode === 'UNION_EQUIP_Y') {
        for (let i = 0; i < 5; i++) {
            const m = local && local.monsters && local.monsters[i];
            if (m && !m.faceDown && Number(m.card_id || (m.card_data && m.card_data.id)) === 62651957) {
                const el = document.getElementById(`p-m${i}`);
                if (el) el.classList.add('trap-target-candidate');
            }
        }
    } else if (mode === 'UNION_EQUIP_Z') {
        for (let i = 0; i < 5; i++) {
            const m = local && local.monsters && local.monsters[i];
            if (m && !m.faceDown && [62651957, 65622692].includes(Number(m.card_id || (m.card_data && m.card_data.id)))) {
                const el = document.getElementById(`p-m${i}`);
                if (el) el.classList.add('trap-target-candidate');
            }
        }
    }
    if (mode === 'MONSTER_PLAYER' || mode === 'MONSTER_ANY') {
        for (let i = 0; i < 5; i++) {
            const m = local && local.monsters && local.monsters[i];
            if (m) {
                if (isEquip) {
                    if (checkMonsterMeetsEquipCondition(currentCardData, m)) {
                        const el = document.getElementById(`p-m${i}`);
                        if (el) el.classList.add('trap-target-candidate');
                    }
                } else {
                    const el = document.getElementById(`p-m${i}`);
                    if (el) el.classList.add('trap-target-candidate');
                }
            }
        }
    }
    if (mode === 'SPELL_TRAP' || mode === 'TARGET_ANY_OPPONENT' || mode === 'SPELL_TRAP_FACEUP' || mode === 'SPELL_TRAP_FACEDOWN') {
        for (let i = 0; i < 5; i++) {
            if (mode !== 'TARGET_ANY_OPPONENT' && local && local.spells && local.spells[i]) {
                const el = document.getElementById(`p-s${i}`);
                if (el) el.classList.add('mst-target-candidate');
            }
            if (rival && rival.spells && rival.spells[i]) {
                const s = rival.spells[i];
                if (mode === 'SPELL_TRAP_FACEUP' && (s.faceDown || s.position === 'SET')) continue;
                if (mode === 'SPELL_TRAP_FACEDOWN' && (!s.faceDown && s.position !== 'SET')) continue;
                const el = document.getElementById(`r-s${i}`);
                if (el) el.classList.add('mst-target-candidate');
            }
        }
        if (mode !== 'TARGET_ANY_OPPONENT' && local && local.fieldSpell) {
            const el = document.getElementById('p-campo');
            if (el) el.classList.add('mst-target-candidate');
        }
        if (rival && rival.fieldSpell) {
            const el = document.getElementById('r-campo');
            if (el) el.classList.add('mst-target-candidate');
        }
    }
}

function activateCardDirectly(cardId, fromHand = false, slotIndex = -1, cardName = 'Carta', extraData = null) {
    const local = getLocalDuelPlayer();
    const rival = getRivalDuelPlayer();

    if (typeof checkCardActivationEligibility === 'function') {
        let cardObj = { id: cardId, card_id: cardId };
        if (!fromHand && slotIndex >= 0 && local && local.spells && local.spells[slotIndex]) {
            cardObj = local.spells[slotIndex];
        }
        const check = checkCardActivationEligibility(cardObj, fromHand ? 'HAND' : 'FIELD');
        if (!check.canActivate) {
            showRuleAlert(`⚠️ [Regla Oficial] No puedes activar "${cardName}": ${check.reason}`);
            return;
        }
    }
    const numId = Number(cardId);
    if (numId === 83764718) {
        if (typeof openRebornModal === 'function') {
            openRebornModal(fromHand, slotIndex);
            return;
        }
    }

    const targetMode = isCardRequiringTarget(cardId);
    if (targetMode) {
        startInteractiveTargeting(targetMode, cardId, slotIndex, fromHand, false, cardName, 'ACTIVATE');
        return;
    }

    const activeSocket = getActiveSocket();
    if (activeSocket) {
        const payload = {
            room_id: getActiveDuelRoomId(),
            card_id: cardId,
            slot_index: slotIndex,
            from_hand: fromHand
        };
        if (extraData) payload.target_data = extraData;
        activeSocket.emit('OCG_ACTIVATE_CARD', payload);
    }
}

function triggerMonsterEffect(slotIndex, cardId, extraData = null) {
    const local = getLocalDuelPlayer();
    const cardData = (local && local.monsters && local.monsters[slotIndex]) ? local.monsters[slotIndex].card_data : null;
    const cardName = cardData ? cardData.name : 'Monstruo';
    const targetMode = isCardRequiringTarget(cardId);
    if (targetMode) {
        startInteractiveTargeting(targetMode, cardId, slotIndex, false, false, cardName, 'MONSTER_EFFECT');
        return;
    }

    const activeSocket = getActiveSocket();
    if (activeSocket) {
        const payload = {
            room_id: getActiveDuelRoomId(),
            action_type: 'MONSTER_EFFECT',
            slot_index: slotIndex,
            card_id: cardId
        };
        if (extraData) payload.target_data = extraData;
        activeSocket.emit('CMD_ACTION', payload);
    }
}

let rebornActivationSource = { fromHand: true, slotIndex: -1 };

function openRebornModal(fromHand = true, slotIndex = -1) {
    if (!lastDuelState) return;
    rebornActivationSource = { fromHand, slotIndex };
    const local = getLocalDuelPlayer();
    const rival = getRivalDuelPlayer();
    const localKey = window.localPlayerRoleKey || 'player1';
    const rivalKey = window.rivalPlayerRoleKey || 'player2';

    const p1Gy = (local && local.graveyard) || [];
    const p2Gy = (rival && rival.graveyard) || [];

    const isMonster = c => {
        if (!c) return false;
        const t = (c.type || c.card_data?.type || '').toLowerCase();
        if (t.includes('spell') || t.includes('trap') || t.includes('mágica') || t.includes('trampa')) return false;
        if (t.includes('monster') || t.includes('monstruo')) return true;
        const atk = c.atk !== null && c.atk !== undefined ? c.atk : (c.card_data?.atk !== null && c.card_data?.atk !== undefined ? c.card_data.atk : null);
        return atk !== null && !isNaN(atk) && atk >= 0;
    };
    const p1Monsters = p1Gy.filter(isMonster);
    const p2Monsters = p2Gy.filter(isMonster);

    if (p1Monsters.length === 0 && p2Monsters.length === 0) {
        showRuleAlert('⚠️ [Monster Reborn] No hay monstruos en ningún Cementerio para revivir.');
        return;
    }

    const modal = document.getElementById('reborn-modal');
    const p1Count = document.getElementById('reborn-p1-count');
    const p2Count = document.getElementById('reborn-p2-count');
    const p1Grid = document.getElementById('reborn-p1-grid');
    const p2Grid = document.getElementById('reborn-p2-grid');

    if (p1Count) p1Count.textContent = p1Monsters.length;
    if (p2Count) p2Count.textContent = p2Monsters.length;

    p1Grid.innerHTML = '';
    p2Grid.innerHTML = '';

    if (p1Monsters.length === 0) {
        p1Grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:#94a3b8; padding:20px; font-size:10px;">Sin monstruos en tu Cementerio</div>`;
    } else {
        p1Gy.forEach((c, idx) => {
            if (!isMonster(c)) return;
            const cId = c.id || c.card_id;
            const el = document.createElement('div');
            el.className = 'gy-card-item';
            el.innerHTML = `
                <div class="gy-card-img" style="background-image:url('https://images.ygoprodeck.com/images/cards_small/${cId}.jpg');"></div>
                <div class="gy-card-name">${c.name || 'Monstruo'}</div>
                <div style="font-size:8px; color:var(--accent-gold);">ATK: ${c.atk} / DEF: ${c.def}</div>
            `;
            el.onclick = () => selectRebornMonster(localKey, idx);
            p1Grid.appendChild(el);
        });
    }

    if (p2Monsters.length === 0) {
        p2Grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:#94a3b8; padding:20px; font-size:10px;">Sin monstruos en Cementerio Rival</div>`;
    } else {
        p2Gy.forEach((c, idx) => {
            if (!isMonster(c)) return;
            const cId = c.id || c.card_id;
            const el = document.createElement('div');
            el.className = 'gy-card-item';
            el.innerHTML = `
                <div class="gy-card-img" style="background-image:url('https://images.ygoprodeck.com/images/cards_small/${cId}.jpg');"></div>
                <div class="gy-card-name">${c.name || 'Monstruo'}</div>
                <div style="font-size:8px; color:var(--accent-gold);">ATK: ${c.atk} / DEF: ${c.def}</div>
            `;
            el.onclick = () => selectRebornMonster(rivalKey, idx);
            p2Grid.appendChild(el);
        });
    }

    modal.style.display = 'flex';
}

function closeRebornModal() {
    const modal = document.getElementById('reborn-modal');
    if (modal) modal.style.display = 'none';
}

function selectRebornMonster(targetGy, targetIndex) {
    const gyList = (lastDuelState && lastDuelState[targetGy] && lastDuelState[targetGy].graveyard) || [];
    const selectedCard = gyList[targetIndex];
    const chosenCardId = selectedCard ? (selectedCard.id || selectedCard.card_id) : null;

    const activeSocket = getActiveSocket();
    if (activeSocket) {
        activeSocket.emit('OCG_ACTIVATE_CARD', {
            room_id: getActiveDuelRoomId(),
            card_id: 83764718,
            from_hand: Boolean(rebornActivationSource ? rebornActivationSource.fromHand : true),
            slot_index: (rebornActivationSource && rebornActivationSource.slotIndex !== undefined) ? rebornActivationSource.slotIndex : -1,
            target_data: {
                target_gy: targetGy,
                target_index: targetIndex,
                card_id: chosenCardId,
                target_card_id: chosenCardId
            }
        });
    }

    closeRebornModal();
    selectedHandCardIndex = -1;
    selectedHandCardId = null;
    highlightAvailableSlots(false, true);
}

// =========================================================================
// LÍMITE DE MANO EN END PHASE (DESCARTE OBLIGATORIO SEGÚN KONAMI OCG)
// =========================================================================
let pendingDiscardData = null;
let selectedDiscardIndices = [];

const discardSocket = getActiveSocket();
if (discardSocket) {
    discardSocket.on('OCG_PROMPT_HAND_DISCARD', (data) => {
        console.log('[OCG HAND DISCARD PROMPT]', data);
        pendingDiscardData = data;
        selectedDiscardIndices = [];
        const modal = document.getElementById('hand-discard-modal');
        const desc = document.getElementById('hand-discard-desc');
        const grid = document.getElementById('hand-discard-grid');
        const confirmBtn = document.getElementById('btn-confirm-discard');

        desc.textContent = `Tienes ${data.hand.length} cartas en la mano (límite oficial: 6). Selecciona ${data.required_count} carta(s) para descartar al Cementerio:`;
        confirmBtn.textContent = `Confirmar Descarte (0/${data.required_count})`;
        confirmBtn.disabled = true;
        grid.innerHTML = '';

        data.hand.forEach((card, idx) => {
            const cId = card.id || card.card_id;
            const div = document.createElement('div');
            div.className = 'gy-card-item discard-candidate';
            div.id = `discard-card-${idx}`;
            div.innerHTML = `
                <div class="gy-card-img" style="background-image:url('https://images.ygoprodeck.com/images/cards_small/${cId}.jpg');"></div>
                <div class="gy-card-name">${card.name || 'Carta'}</div>
            `;
            div.onclick = () => toggleDiscardCard(idx);
            grid.appendChild(div);
        });

        modal.style.display = 'flex';
    });
}

function toggleDiscardCard(idx) {
    if (!pendingDiscardData) return;
    const cardEl = document.getElementById(`discard-card-${idx}`);
    const selIdx = selectedDiscardIndices.indexOf(idx);

    if (selIdx !== -1) {
        selectedDiscardIndices.splice(selIdx, 1);
        if (cardEl) cardEl.classList.remove('discard-selected');
    } else {
        if (selectedDiscardIndices.length < pendingDiscardData.required_count) {
            selectedDiscardIndices.push(idx);
            if (cardEl) cardEl.classList.add('discard-selected');
        }
    }

    const confirmBtn = document.getElementById('btn-confirm-discard');
    confirmBtn.textContent = `Confirmar Descarte (${selectedDiscardIndices.length}/${pendingDiscardData.required_count})`;
    confirmBtn.disabled = selectedDiscardIndices.length !== pendingDiscardData.required_count;
}

function confirmHandDiscard() {
    if (!pendingDiscardData || selectedDiscardIndices.length !== pendingDiscardData.required_count) return;

    const activeSocket = getActiveSocket();
    if (activeSocket) {
        activeSocket.emit('OCG_HAND_DISCARD_RESPONSE', {
            room_id: getActiveDuelRoomId(),
            discard_indices: selectedDiscardIndices
        });
    }

    document.getElementById('hand-discard-modal').style.display = 'none';
    pendingDiscardData = null;
    selectedDiscardIndices = [];
}

// =========================================================================
// INVOCACIÓN POR FUSIÓN (POLIMERIZACIÓN / FUSION GATE / CONTACT FUSION)
// =========================================================================
let pendingFusionData = {
    selectedFusion: null,
    matchedMaterials: [],
    isFusionGate: false,
    isContactFusion: false
};

const OCG_FUSION_RECIPES = {
    45231177: [34460851, 44287299],               // Flame Swordsman: Flame Manipulator + Masaki
    6688913: [6368038, 28279543],                 // Gaia the Dragon Champion: Gaia + Curse of Dragon
    11901678: [70781052, 74677422],               // B. Skull Dragon: Summoned Skull + Red-Eyes
    54752875: [31786629, 31786629],               // Twin-Headed Thunder Dragon: Thunder Dragon + Thunder Dragon
    41462083: [71625222, 88819587],               // Thousand Dragon: Time Wizard + Baby Dragon
    89112729: [70138455, 94119974],               // Cyber Saurus: Blast Juggler + Two-Headed King Rex
    2504891: [28725004, 42431843],                // Skull Knight: Tainted Wisdom + Ancient Brain
    91998119: [62651957, 65622692, 64500000],     // XYZ-Dragon Cannon: X + Y + Z (Contact Fusion)
    99261403: [62651957, 65622692, 64500000],     // XYZ-Dragon Cannon (alias)
    2111707: [62651957, 65622692],                // XY-Dragon Cannon: X + Y (Contact Fusion)
    99724761: [62651957, 64500000],               // XZ-Tank Cannon: X + Z (Contact Fusion)
    99728880: [62651957, 64500000],               // XZ-Tank Cannon (alias)
    25119460: [65622692, 64500000],               // YZ-Tank Dragon: Y + Z (Contact Fusion - MFC ID)
    77622396: [65622692, 64500000],               // YZ-Tank Dragon (alias)
    745919: [36996508, 45231177],                 // Dark Flare Knight: Dark Magician + Flame Swordsman
    63519819: [64631466, 27125110],               // Thousand-Eyes Restrict: Relinquished + Thousand-Eyes Idol
    23995346: [89631139, 89631139, 89631139],     // Blue-Eyes Ultimate Dragon: 3x Blue-Eyes White Dragon
    62873545: [5405694, 23995346],                 // Dragon Master Knight: Black Luster Soldier + BEUD
    90660762: [64271667, 74677422]                 // Meteor B. Dragon: Meteor Dragon + Red-Eyes B. Dragon
};

function parseFusionMaterials(desc) {
    if (!desc || typeof desc !== 'string') return [];
    const matches = desc.match(/"([^"]+)"/g);
    if (matches && matches.length >= 2) {
        return matches.map(m => m.replace(/"/g, '').trim());
    }
    return [];
}

function checkCanPerformFusion(isFusionGate = false, isContactOnly = false) {
    const local = getLocalDuelPlayer();
    const rival = getRivalDuelPlayer();
    if (!local) {
        return { canFusion: false, reason: 'Estado de duelo no disponible.' };
    }

    const extraDeck = local.extraDeck || [];
    if (extraDeck.length === 0) {
        return { canFusion: false, reason: 'No tienes monstruos de Fusión en tu Extra Deck.' };
    }

    // Comprobar si Fusion Gate está activa en el campo si no se especificó
    if (!isFusionGate) {
        const p1Field = local.fieldSpell;
        const p2Field = rival && rival.fieldSpell;
        const p1FieldId = Number((p1Field && (p1Field.card_id || p1Field.id)) || 0);
        const p2FieldId = Number((p2Field && (p2Field.card_id || p2Field.id)) || 0);
        if (p1FieldId === 33550694 || p2FieldId === 33550694) {
            isFusionGate = true;
        }
    }

    const hand = local.hand || [];
    const monsters = local.monsters || [];

    const availableCards = [];
    hand.forEach((c, idx) => {
        const cId = Number(c.id || c.card_id);
        if (cId !== 24094653) {
            availableCards.push({
                card: c,
                card_id: cId,
                name: (c.name || '').toLowerCase().trim(),
                location: 'HAND',
                slotIndex: idx
            });
        }
    });

    monsters.forEach((m, idx) => {
        if (m !== null) {
            const cData = m.card_data || m;
            const cId = Number(m.card_id || cData.id);
            availableCards.push({
                card: cData,
                card_id: cId,
                name: (cData.name || '').toLowerCase().trim(),
                location: 'FIELD',
                slotIndex: idx
            });
        }
    });

    const validFusions = [];

    extraDeck.forEach((fusionCard, fIdx) => {
        const fData = fusionCard.card_data || fusionCard;
        const fusionId = Number(fData.id || fData.card_id);
        const isContact = [91998119, 99261403, 2111707, 99724761, 99728880, 25119460, 77622396].includes(fusionId);

        if (isContactOnly && !isContact) return;

        let matched = [];
        const usedIndices = new Set();
        let allFound = false;

        // 1. Chequeo por Receta Oficial OCG (IDs exactos)
        const recipeIds = OCG_FUSION_RECIPES[fusionId];
        if (recipeIds && recipeIds.length >= 2) {
            allFound = true;
            for (const reqId of recipeIds) {
                const foundIdx = availableCards.findIndex((item, i) => {
                    if (usedIndices.has(i)) return false;
                    if (isContact && item.location !== 'FIELD') return false; // Contact fusion solo materiales del campo
                    return Number(item.card_id) === Number(reqId);
                });
                if (foundIdx !== -1) {
                    usedIndices.add(foundIdx);
                    matched.push(availableCards[foundIdx]);
                } else {
                    allFound = false;
                    break;
                }
            }
        }

        // 2. Fallback por nombres parseados en la descripción
        if (!allFound) {
            matched = [];
            usedIndices.clear();
            const requiredMatNames = parseFusionMaterials(fData.desc || fData.description);
            if (requiredMatNames.length >= 2) {
                allFound = true;
                for (const reqName of requiredMatNames) {
                    const targetName = reqName.toLowerCase().trim();
                    const foundIdx = availableCards.findIndex((item, i) => {
                        if (usedIndices.has(i)) return false;
                        if (isContact && item.location !== 'FIELD') return false;
                        return item.name === targetName || item.name.includes(targetName) || targetName.includes(item.name);
                    });
                    if (foundIdx !== -1) {
                        usedIndices.add(foundIdx);
                        matched.push(availableCards[foundIdx]);
                    } else {
                        allFound = false;
                        break;
                    }
                }
            }
        }

        if (allFound && matched.length >= 2) {
            validFusions.push({
                fusionCard: fData,
                extraIndex: fIdx,
                matchedMaterials: matched,
                isContactFusion: isContact,
                isFusionGate: isFusionGate
            });
        }
    });

    if (validFusions.length === 0) {
        return { 
            canFusion: false, 
            reason: isContactOnly 
                ? 'No controlas los monstruos de material requeridos en tu campo para ninguna Fusión por Contacto (ej. X, Y, Z).'
                : (isFusionGate 
                    ? 'No tienes los materiales requeridos en tu mano o campo para invocar por Fusión con Fusion Gate.'
                    : 'No tienes los materiales requeridos en tu mano o campo para ninguna Fusión de tu Extra Deck.') 
        };
    }

    return { canFusion: true, availableFusions: validFusions };
}

function openFusionModal(validFusions, isFusionGate = false, isContactFusion = false) {
    const modal = document.getElementById('fusion-modal');
    const grid = document.getElementById('fusion-cards-grid');
    const matsContainer = document.getElementById('fusion-materials-list');
    const confirmBtn = document.getElementById('btn-confirm-fusion');
    const titleElem = document.getElementById('fusion-modal-sub');

    if (!modal || !grid) return;

    grid.innerHTML = '';
    if (matsContainer) matsContainer.innerHTML = '';
    pendingFusionData.selectedFusion = null;
    pendingFusionData.matchedMaterials = [];
    pendingFusionData.isFusionGate = isFusionGate;
    pendingFusionData.isContactFusion = isContactFusion;

    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Selecciona una Fusión';
    }

    if (titleElem) {
        const modeLabel = isContactFusion 
            ? '⚡ Invocación Especial por Contacto (Desterrando del campo):' 
            : (isFusionGate ? '🌀 Invocación por Fusión con Fusion Gate (Desterrando materiales):' : '🌀 Invocación por Fusión (Polimerización):');
        titleElem.textContent = `${modeLabel} (${validFusions.length} Monstruo(s) listo(s))`;
    }

    validFusions.forEach((item, idx) => {
        const cId = item.fusionCard.id || item.fusionCard.card_id;
        const el = document.createElement('div');
        el.className = 'gy-card-item fusion-candidate' + (idx === 0 ? ' gy-card-selected' : '');
        el.id = `fusion-opt-${idx}`;
        el.innerHTML = `
            <div class="gy-card-img" style="background-image:url('https://images.ygoprodeck.com/images/cards_small/${cId}.jpg'), url('https://images.ygoprodeck.com/images/cards/${cId}.jpg');"></div>
            <div class="gy-card-name" style="color:var(--accent-purple); font-weight:800;">${item.fusionCard.name}</div>
            <div style="font-size:8px; color:var(--accent-gold);">ATK: ${item.fusionCard.atk} / DEF: ${item.fusionCard.def}</div>
        `;
        el.onclick = () => selectFusionOption(item, idx);
        grid.appendChild(el);
    });

    if (validFusions.length > 0) {
        selectFusionOption(validFusions[0], 0);
    }

    modal.style.display = 'flex';
}

function selectFusionOption(item, idx) {
    document.querySelectorAll('.fusion-candidate').forEach(c => c.classList.remove('gy-card-selected'));
    const cardEl = document.getElementById(`fusion-opt-${idx}`);
    if (cardEl) cardEl.classList.add('gy-card-selected');

    pendingFusionData.selectedFusion = item.fusionCard;
    pendingFusionData.matchedMaterials = item.matchedMaterials;
    pendingFusionData.isContactFusion = item.isContactFusion;
    pendingFusionData.isFusionGate = item.isFusionGate;

    const matsContainer = document.getElementById('fusion-materials-list');
    const confirmBtn = document.getElementById('btn-confirm-fusion');

    if (matsContainer) {
        matsContainer.innerHTML = '';
        item.matchedMaterials.forEach(m => {
            const div = document.createElement('div');
            div.style.cssText = 'background:rgba(255,255,255,0.06); border:1px solid rgba(168,85,247,0.4); border-radius:6px; padding:6px 10px; display:flex; align-items:center; gap:8px;';
            div.innerHTML = `
                <div style="width:28px; height:40px; background-size:cover; background-position:center; border-radius:3px; background-image:url('https://images.ygoprodeck.com/images/cards_small/${m.card_id}.jpg');"></div>
                <div>
                    <div style="font-size:10px; font-weight:700; color:#ffffff;">${m.card.name || 'Material'}</div>
                    <div style="font-size:8px; color:var(--accent-cyan); font-weight:600;">Ubicación: ${m.location === 'HAND' ? '🖐️ Mano' : '⚔️ Campo (Casilla #' + (m.slotIndex + 1) + ')'}</div>
                </div>
            `;
            matsContainer.appendChild(div);
        });
    }

    if (confirmBtn) {
        confirmBtn.disabled = false;
        const btnText = item.isContactFusion 
            ? `⚡ Invocar por Contacto: ${item.fusionCard.name}` 
            : (item.isFusionGate ? `🌀 Fusion Gate: ${item.fusionCard.name}` : `🌀 Invocar por Fusión: ${item.fusionCard.name}`);
        confirmBtn.textContent = btnText;
    }
}

function closeFusionModal() {
    const modal = document.getElementById('fusion-modal');
    if (modal) modal.style.display = 'none';
    pendingFusionData.selectedFusion = null;
    pendingFusionData.matchedMaterials = [];
    pendingSynchroData.selectedSynchro = null;
    pendingSynchroData.selectedCombination = null;
    pendingSynchroData.combinations = [];
    const confirmBtn = document.getElementById('btn-confirm-fusion');
    if (confirmBtn) {
        confirmBtn.onclick = confirmFusionSummon;
        confirmBtn.style.background = 'linear-gradient(135deg, #a855f7, #6b21a8)';
        confirmBtn.style.borderColor = '#c084fc';
        confirmBtn.textContent = '🌀 Confirmar Invocación por Fusión';
    }
    const headerTitle = modal ? modal.querySelector('h3') : null;
    if (headerTitle) headerTitle.innerHTML = '🌀 Invocación por Fusión (Polimerización)';
}

function confirmFusionSummon() {
    if (!pendingFusionData.selectedFusion || !pendingFusionData.matchedMaterials || pendingFusionData.matchedMaterials.length < 2) return;

    const fusionId = pendingFusionData.selectedFusion.id || pendingFusionData.selectedFusion.card_id;

    const activeSocket = getActiveSocket();
    if (activeSocket) {
        activeSocket.emit('CMD_ACTION', {
            room_id: getActiveDuelRoomId(),
            action_type: 'FUSION_SUMMON',
            fusion_card_id: fusionId,
            contact_fusion: pendingFusionData.isContactFusion,
            fusion_type: pendingFusionData.isFusionGate ? 'FUSION_GATE' : 'POLYMERIZATION',
            materials: pendingFusionData.matchedMaterials.map(m => ({
                location: m.location,
                slot_index: m.slotIndex,
                card_id: m.card_id
            }))
        });
    }

    closeFusionModal();
    selectedHandCardIndex = -1;
    selectedHandCardId = null;
    highlightAvailableSlots(false, true);
}

// =========================================================================
// SISTEMA DE INVOCACIÓN POR SINCRONÍA (SYNCHRO SUMMON - 5D's REGLAS KONAMI)
// =========================================================================
let pendingSynchroData = {
    selectedSynchro: null,
    selectedCombination: null,
    combinations: []
};

function checkCanPerformSynchro(synchroCard) {
    const state = (typeof window !== 'undefined' && window.lastDuelState) || (typeof lastDuelState !== 'undefined' ? lastDuelState : null);
    if (!state) return { canSynchro: false, reason: 'Estado de duelo no disponible.' };
    const local = getLocalDuelPlayer();
    if (!local || !local.monsters) return { canSynchro: false, reason: 'No controlas monstruos en el campo.' };

    const synchroData = synchroCard.card_data || synchroCard;
    const targetLevel = Number(synchroData.level || synchroCard.level || 0);
    const synchroId = Number(synchroCard.id || synchroCard.card_id || synchroData.id || 0);
    const isShiEn = synchroId === 29981921;

    // Obtener monstruos boca arriba en el campo del jugador local
    const fieldMonsters = [];
    local.monsters.forEach((m, slotIndex) => {
        if (m && !m.faceDown) {
            const cd = m.card_data || {};
            const monType = (cd.type || '').toLowerCase();
            const isTuner = monType.includes('tuner') || (cd.typeCode && (cd.typeCode & 0x1000)) || [1498130].includes(Number(m.card_id || cd.id));
            const lvl = m.currentLevel !== undefined ? m.currentLevel : (cd.level || 1);
            const mRace = (cd.race || '').toLowerCase();
            const mName = (cd.name || '').toLowerCase();
            const isWarrior = mRace.includes('warrior') || (cd.raceCode && (cd.raceCode & 0x1));
            const isSixSam = mName.includes('six samurai') || mName.includes('seis samur');
            fieldMonsters.push({
                slotIndex,
                card_id: Number(m.card_id || cd.id),
                name: cd.name || `Monstruo #${slotIndex + 1}`,
                level: lvl,
                isTuner,
                isWarrior,
                isSixSam,
                card: cd
            });
        }
    });

    const tuners = fieldMonsters.filter(m => {
        if (!m.isTuner) return false;
        if (isShiEn && !m.isWarrior) return false;
        return true;
    });

    const nonTuners = fieldMonsters.filter(m => {
        if (m.isTuner) return false;
        if (isShiEn && !m.isSixSam) return false;
        return true;
    });

    if (tuners.length === 0) {
        return { 
            canSynchro: false, 
            reason: isShiEn 
                ? 'Legendary Six Samurai - Shi En requiere 1 Monstruo Cantante de Tipo Guerrero (como "Kagemusha of the Six Samurai") boca arriba en el campo.' 
                : 'No controlas ningún Monstruo Cantante (Tuner) boca arriba en tu campo.' 
        };
    }

    if (nonTuners.length === 0) {
        return { 
            canSynchro: false, 
            reason: isShiEn 
                ? 'Legendary Six Samurai - Shi En requiere al menos 1 Monstruo No-Cantante "Seis Samuráis" boca arriba en el campo.' 
                : 'No controlas ningún Monstruo No-Cantante boca arriba en tu campo.' 
        };
    }

    const validCombinations = [];

    function findNonTunerCombos(availNonTuners, targetSum, currentCombo = [], startIdx = 0) {
        let results = [];
        for (let i = startIdx; i < availNonTuners.length; i++) {
            const nt = availNonTuners[i];
            const newCombo = [...currentCombo, nt];
            const sum = newCombo.reduce((acc, c) => acc + c.level, 0);
            if (sum === targetSum) {
                results.push(newCombo);
            } else if (sum < targetSum) {
                const deeper = findNonTunerCombos(availNonTuners, targetSum, newCombo, i + 1);
                if (deeper.length > 0) results.push(...deeper);
            }
        }
        return results;
    }

    tuners.forEach(tuner => {
        const neededNonTunerLvl = targetLevel - tuner.level;
        if (neededNonTunerLvl > 0) {
            const availNT = nonTuners.filter(nt => nt.slotIndex !== tuner.slotIndex);
            const combos = findNonTunerCombos(availNT, neededNonTunerLvl);
            combos.forEach(ntList => {
                validCombinations.push({
                    tuner,
                    nonTuners: ntList,
                    allMaterials: [tuner, ...ntList],
                    slots: [tuner.slotIndex, ...ntList.map(n => n.slotIndex)],
                    totalLevel: targetLevel
                });
            });
        }
    });

    if (validCombinations.length === 0) {
        return { 
            canSynchro: false, 
            reason: `No hay combinación de Cantante + No-Cantantes en tu campo cuyos niveles sumen exactamente ${targetLevel} (Nivel de "${synchroData.name || synchroCard.name}").` 
        };
    }

    return { canSynchro: true, combinations: validCombinations };
}

function openSynchroModal(synchroCard, combinations) {
    const modal = document.getElementById('fusion-modal');
    const grid = document.getElementById('fusion-cards-grid');
    const matsContainer = document.getElementById('fusion-materials-list');
    const confirmBtn = document.getElementById('btn-confirm-fusion');
    const titleElem = document.getElementById('fusion-modal-sub');
    const headerTitle = modal ? modal.querySelector('h3') : null;

    if (!modal || !grid) return;

    pendingSynchroData.selectedSynchro = synchroCard;
    pendingSynchroData.combinations = combinations;
    pendingSynchroData.selectedCombination = combinations[0];

    if (headerTitle) headerTitle.innerHTML = '⚡🌠 Invocación por Sincronía (Core Dimension 5D\'s)';
    const sData = synchroCard.card_data || synchroCard;
    if (titleElem) {
        titleElem.textContent = `Sintonizando materiales en el campo para invocar a ${sData.name} (Nivel ${sData.level}):`;
    }

    const cId = Number(synchroCard.id || synchroCard.card_id || sData.id);
    grid.innerHTML = `
        <div class="gy-card-item gy-card-selected" style="border: 2px solid #38bdf8; box-shadow: 0 0 15px rgba(56, 189, 248, 0.5);">
            <div class="gy-card-img" style="background-image:url('https://images.ygoprodeck.com/images/cards_small/${cId}.jpg'), url('https://images.ygoprodeck.com/images/cards/${cId}.jpg');"></div>
            <div class="gy-card-name" style="color:#38bdf8; font-weight:800;">${sData.name}</div>
            <div style="font-size:8px; color:var(--accent-gold);">★ Nivel ${sData.level} | ${sData.atk} ATK / ${sData.def} DEF</div>
        </div>
    `;

    renderSynchroMaterials(combinations[0]);

    if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.style.background = 'linear-gradient(135deg, #0284c7, #0369a1)';
        confirmBtn.style.borderColor = '#38bdf8';
        confirmBtn.textContent = `⚡🌠 Invocar por Sincronía a ${sData.name}`;
        confirmBtn.onclick = confirmSynchroSummon;
    }

    modal.style.display = 'flex';
}

function renderSynchroMaterials(combo) {
    const matsContainer = document.getElementById('fusion-materials-list');
    if (!matsContainer || !combo) return;

    matsContainer.innerHTML = '';

    // Tuner
    const tunerDiv = document.createElement('div');
    tunerDiv.style.cssText = 'background:rgba(2,132,199,0.15); border:1px solid #38bdf8; border-radius:6px; padding:6px 10px; display:flex; align-items:center; gap:8px;';
    tunerDiv.innerHTML = `
        <div style="width:28px; height:40px; background-size:cover; background-position:center; border-radius:3px; background-image:url('https://images.ygoprodeck.com/images/cards_small/${combo.tuner.card_id}.jpg');"></div>
        <div>
            <div style="font-size:10px; font-weight:700; color:#ffffff;">${combo.tuner.name}</div>
            <div style="font-size:8px; color:#38bdf8; font-weight:700;">🎵 Cantante (Tuner) ★ Nivel ${combo.tuner.level} (Casilla #${combo.tuner.slotIndex + 1})</div>
        </div>
    `;
    matsContainer.appendChild(tunerDiv);

    // Non-tuners
    combo.nonTuners.forEach(nt => {
        const ntDiv = document.createElement('div');
        ntDiv.style.cssText = 'background:rgba(255,255,255,0.06); border:1px solid rgba(168,85,247,0.4); border-radius:6px; padding:6px 10px; display:flex; align-items:center; gap:8px;';
        ntDiv.innerHTML = `
            <div style="width:28px; height:40px; background-size:cover; background-position:center; border-radius:3px; background-image:url('https://images.ygoprodeck.com/images/cards_small/${nt.card_id}.jpg');"></div>
            <div>
                <div style="font-size:10px; font-weight:700; color:#ffffff;">${nt.name}</div>
                <div style="font-size:8px; color:var(--accent-cyan); font-weight:700;">⚔️ No-Cantante ★ Nivel ${nt.level} (Casilla #${nt.slotIndex + 1})</div>
            </div>
        `;
        matsContainer.appendChild(ntDiv);
    });
}

function confirmSynchroSummon() {
    if (!pendingSynchroData.selectedSynchro || !pendingSynchroData.selectedCombination) return;

    const synchroCard = pendingSynchroData.selectedSynchro;
    const synchroId = Number(synchroCard.id || synchroCard.card_id || (synchroCard.card_data && synchroCard.card_data.id));
    const activeSocket = getActiveSocket();

    if (activeSocket) {
        activeSocket.emit('CMD_ACTION', {
            room_id: getActiveDuelRoomId(),
            action_type: 'SYNCHRO_SUMMON',
            synchro_card_id: synchroId,
            material_slots: pendingSynchroData.selectedCombination.slots,
            position: 'ATTACK'
        });
    }

    closeFusionModal();
    selectedHandCardIndex = -1;
    selectedHandCardId = null;
    highlightAvailableSlots(false, true);
}

// Exportar globalmente para duel-actions y duel-ui
if (typeof window !== 'undefined') {
    window.checkCanPerformFusion = checkCanPerformFusion;
    window.openFusionModal = openFusionModal;
    window.closeFusionModal = closeFusionModal;
    window.confirmFusionSummon = confirmFusionSummon;
    window.checkCanPerformSynchro = checkCanPerformSynchro;
    window.openSynchroModal = openSynchroModal;
    window.confirmSynchroSummon = confirmSynchroSummon;
}

        function activateCardFromHand(cardId, extraData = null) {
            const numId = Number(cardId);
            if (numId === 83764718) {
                if (typeof openRebornModal === 'function') {
                    openRebornModal(true, -1);
                    selectedHandCardIndex = -1;
                    selectedHandCardId = null;
                    highlightAvailableSlots(false, true);
                    return;
                }
            }
            const local = getLocalDuelPlayer();
            const rival = getRivalDuelPlayer();

            const targetMode = isCardRequiringTarget(cardId);
            if (targetMode) {
                let cardName = 'Carta';
                if (local && local.hand) {
                    const c = local.hand.find(h => Number(h.id || h.card_id) === Number(cardId));
                    if (c) cardName = c.name;
                }
                startInteractiveTargeting(targetMode, cardId, -1, true, false, cardName);
                selectedHandCardIndex = -1;
                selectedHandCardId = null;
                highlightAvailableSlots(false, true);
                return;
            }

            const activeSocket = getActiveSocket();
            if (activeSocket) {
                const payload = {
                    room_id: getActiveDuelRoomId(),
                    card_id: cardId,
                    from_hand: true
                };
                if (extraData) payload.target_data = extraData;
                activeSocket.emit('OCG_ACTIVATE_CARD', payload);
            }
            selectedHandCardIndex = -1;
            selectedHandCardId = null;
            highlightAvailableSlots(false, true);
        }

        // =========================================================================
        // INTERACCIÓN CON CASILLAS DEL TABLERO (0..4)
        // =========================================================================

        const chainSocket = getActiveSocket();
        if (chainSocket) {
            chainSocket.on('OCG_PROMPT_CHAIN', (data) => {
                console.log('[OCG CHAIN PROMPT]', data);
                
                const myUsername = (window.currentUser && window.currentUser.username) 
                    || (window.Session && window.Session.getUser() && window.Session.getUser().username) 
                    || '';
                if (data && data.target_player && myUsername && data.target_player.toLowerCase() !== myUsername.toLowerCase()) {
                    console.log(`[OCG CHAIN] Ventana de cadena dirigida a ${data.target_player}, ignorando en cliente ${myUsername}.`);
                    return;
                }

                // Si el jugador no tiene cartas elegibles para encadenar, pasar prioridad automáticamente sin modal intrusivo
                if (!data.allowed_cards || data.allowed_cards.length === 0) {
                    console.log('[OCG CHAIN] Sin cartas elegibles. Pasando prioridad automáticamente.');
                    respondChainPass();
                    return;
                }

                const modal = document.getElementById('chain-prompt-modal');
                const linkElem = document.getElementById('chain-link-num');
                const timerTag = document.getElementById('chain-timer-num');
                const timerBar = document.getElementById('chain-timer-bar');
                const promptText = document.getElementById('chain-prompt-text');
                const allowedCardsContainer = document.getElementById('chain-allowed-cards');

                if (linkElem) linkElem.textContent = data.chain_link || 1;
                if (promptText) promptText.textContent = data.message || '¿Deseas activar una carta o efecto en respuesta?';
                if (allowedCardsContainer) allowedCardsContainer.innerHTML = '';

                // Mostrar cartas que el jugador puede encadenar
                data.allowed_cards.forEach(card => {
                    const cardDiv = document.createElement('div');
                    cardDiv.className = 'chain-card-item';
                    cardDiv.style.backgroundImage = `url('https://images.ygoprodeck.com/images/cards_small/${card.card_id}.jpg')`;
                    cardDiv.innerHTML = `<div class="item-title">${card.name}</div>`;
                    cardDiv.onclick = () => {
                        respondChainCard(card.card_id, card.slot_index, card.location === 'HAND');
                    };
                    if (allowedCardsContainer) allowedCardsContainer.appendChild(cardDiv);
                });

                if (modal) modal.style.display = 'flex';

                // Temporizador animado de 8s
                let timeLeft = Math.floor((data.timeout || 8000) / 1000);
                if (timerTag) timerTag.textContent = `${timeLeft}s`;
                if (timerBar) timerBar.style.width = '100%';

                if (chainTimerInterval) clearInterval(chainTimerInterval);
                const totalMs = data.timeout || 8000;
                const startMs = Date.now();

                chainTimerInterval = setInterval(() => {
                    const elapsed = Date.now() - startMs;
                    const remainingRatio = Math.max(0, 1 - (elapsed / totalMs));
                    if (timerBar) timerBar.style.width = `${remainingRatio * 100}%`;
                    if (timerTag) timerTag.textContent = `${Math.ceil((totalMs - elapsed) / 1000)}s`;

                    if (elapsed >= totalMs) {
                        clearInterval(chainTimerInterval);
                        if (modal) modal.style.display = 'none';
                    }
                }, 100);
            });
        }

        function respondChainPass() {
            if (chainTimerInterval) clearInterval(chainTimerInterval);
            const modal = document.getElementById('chain-prompt-modal');
            if (modal) modal.style.display = 'none';
            const activeSocket = getActiveSocket();
            const myUsername = (window.currentUser && window.currentUser.username) 
                || (window.Session && window.Session.getUser() && window.Session.getUser().username) 
                || '';
            if (activeSocket) {
                activeSocket.emit('OCG_CHAIN_RESPONSE', {
                    room_id: getActiveDuelRoomId(),
                    player_name: myUsername,
                    action: 'PASS'
                });
            }
        }

        function respondChainCard(cardId, slotIndex, fromHand) {
            const local = getLocalDuelPlayer();
            const targetMode = isCardRequiringTarget(cardId);
            if (targetMode) {
                let cardName = 'Carta';
                if (fromHand && local && local.hand) {
                    const c = local.hand.find(h => (h.id || h.card_id) === cardId);
                    if (c) cardName = c.name;
                } else if (!fromHand && local && local.spells && local.spells[slotIndex]) {
                    const s = local.spells[slotIndex];
                    if (s && s.card_data) cardName = s.card_data.name;
                }
                startInteractiveTargeting(targetMode, cardId, slotIndex, fromHand, true, cardName);
                return;
            }

            if (chainTimerInterval) clearInterval(chainTimerInterval);
            const modal = document.getElementById('chain-prompt-modal');
            if (modal) modal.style.display = 'none';
            const activeSocket = getActiveSocket();
            const myUsername = (window.currentUser && window.currentUser.username) 
                || (window.Session && window.Session.getUser() && window.Session.getUser().username) 
                || '';
            if (activeSocket) {
                activeSocket.emit('OCG_CHAIN_RESPONSE', {
                    room_id: getActiveDuelRoomId(),
                    player_name: myUsername,
                    action: 'CHAIN',
                    card_id: cardId,
                    slot_index: slotIndex,
                    from_hand: fromHand
                });
            }
        }

        // =========================================================================
        // MOTOR DE SELECCIÓN DE SACRIFICIOS (TRIBUTOS OCG) - VISUAL E INTUITIVO
        // =========================================================================
        function initiateTributeFlow(cardId, cardName, level, tributesNeeded, position = 'ATK', preselectedSlot = -1) {
            const local = getLocalDuelPlayer();
            if (!local) return;
            const controlledSlots = [];
            for (let i = 0; i < 5; i++) {
                if (local.monsters && local.monsters[i]) controlledSlots.push(i);
            }

            if (controlledSlots.length < tributesNeeded) {
                showRuleAlert(`⚠️ [Regla Oficial Konami] "${cardName}" es Nivel ${level} y requiere ${tributesNeeded} sacrificio(s) en el campo. Actualmente solo controlas ${controlledSlots.length} monstruo(s).`);
                return;
            }

            openTributeModal(cardId, cardName, level, tributesNeeded, position, preselectedSlot);
        }

        function openTributeModal(cardId, cardName, level, tributesNeeded, position = 'ATK', preselectedSlot = -1) {
            console.log('[OPEN TRIBUTE MODAL]', { cardId, cardName, level, tributesNeeded, position, preselectedSlot });
            const local = getLocalDuelPlayer();
            const isDef = position === 'DEF';
            pendingTributeData = {
                card_id: cardId,
                card_name: cardName,
                level: level,
                required_count: tributesNeeded,
                position: isDef ? 'DEF' : 'ATK',
                target_slot: preselectedSlot >= 0 ? preselectedSlot : 0
            };
            selectedTributeSlots = [];
            if (preselectedSlot >= 0 && local && local.monsters && local.monsters[preselectedSlot]) {
                selectedTributeSlots.push(preselectedSlot);
            }

            const modal = document.getElementById('tribute-modal');
            const titleElem = document.getElementById('tribute-modal-title');
            const descElem = document.getElementById('tribute-modal-desc');

            if (titleElem) {
                titleElem.textContent = isDef 
                    ? `COLOCACIÓN POR SACRIFICIO: ${cardName.toUpperCase()} (Nv. ${level})`
                    : `INVOCACIÓN POR SACRIFICIO: ${cardName.toUpperCase()} (Nv. ${level})`;
            }
            if (descElem) {
                descElem.textContent = isDef
                    ? `Selecciona ${tributesNeeded} monstruo(s) en tu campo para tributar y colocar a "${cardName}" en Posición de Defensa:`
                    : `Selecciona ${tributesNeeded} monstruo(s) en tu campo para tributar e invocar a "${cardName}" en Posición de Ataque:`;
            }

            renderTributeModalMonsters();
            updateTributeButtonsState();

            if (modal) modal.style.display = 'flex';
        }

        function renderTributeModalMonsters() {
            const gridElem = document.getElementById('tribute-monsters-grid');
            const local = getLocalDuelPlayer();
            if (!gridElem || !local) return;
            gridElem.innerHTML = '';

            let countMonsters = 0;
            for (let i = 0; i < 5; i++) {
                const m = local.monsters ? local.monsters[i] : null;
                if (!m) continue;
                countMonsters++;
                const isSelected = selectedTributeSlots.includes(i);
                const cData = m.card_data || {};
                const cId = m.card_id || (cData ? (cData.id || cData.card_id) : 0);
                const cImg = `https://images.ygoprodeck.com/images/cards_small/${cId}.jpg`;
                const curAtk = m.currentAtk !== undefined ? m.currentAtk : (cData.atk || 0);

                const cardDiv = document.createElement('div');
                cardDiv.className = `tribute-card-choice ${isSelected ? 'selected-tribute' : ''}`;
                cardDiv.onclick = (e) => {
                    if (e) e.stopPropagation();
                    toggleTributeSlotModal(i);
                };
                cardDiv.innerHTML = `
                    <div class="tribute-card-img" style="background-image:url('${cImg}')"></div>
                    <div class="tribute-card-name">${cData.name || 'Monstruo'}</div>
                    <div class="tribute-card-atk">ATK: ${curAtk} | #${i + 1}</div>
                    ${isSelected ? `<div class="tribute-card-badge">TRIBUTO</div>` : ''}
                `;
                gridElem.appendChild(cardDiv);
            }

            if (countMonsters === 0) {
                gridElem.innerHTML = '<div style="color:#94a3b8; font-size:11px; padding:20px;">No controlas monstruos en tu campo para tributar.</div>';
            }
        }

        function toggleTributeSlotModal(slotIndex) {
            if (!pendingTributeData) return;
            const idx = selectedTributeSlots.indexOf(slotIndex);
            if (idx !== -1) {
                selectedTributeSlots.splice(idx, 1);
            } else {
                if (selectedTributeSlots.length < pendingTributeData.required_count) {
                    selectedTributeSlots.push(slotIndex);
                } else if (pendingTributeData.required_count === 1) {
                    selectedTributeSlots = [slotIndex];
                }
            }
            renderTributeModalMonsters();
            updateTributeButtonsState();
        }

        function updateTributeButtonsState() {
            if (!pendingTributeData) return;
            const isReady = selectedTributeSlots.length === pendingTributeData.required_count;
            const isDef = pendingTributeData.position === 'DEF';
            const badge = document.getElementById('tribute-status-badge');
            const btnConfirm = document.getElementById('btn-tribute-confirm');
            const btnAtk = document.getElementById('btn-tribute-atk');
            const btnDef = document.getElementById('btn-tribute-def');

            if (badge) {
                badge.textContent = `Seleccionados: ${selectedTributeSlots.length} / ${pendingTributeData.required_count}`;
                badge.style.color = isReady ? '#00ff88' : 'var(--accent-gold)';
            }
            if (btnConfirm) {
                btnConfirm.textContent = isDef ? 'Confirmar Colocación (DEF)' : 'Confirmar Invocación (ATK)';
                btnConfirm.disabled = !isReady;
            }
            if (btnAtk) {
                btnAtk.disabled = !isReady;
                btnAtk.style.display = isDef ? 'none' : 'inline-flex';
            }
            if (btnDef) {
                btnDef.disabled = !isReady;
                btnDef.style.display = isDef ? 'inline-flex' : 'none';
            }
        }

        function executeTributeSummon(position = null) {
            if (!pendingTributeData || selectedTributeSlots.length !== pendingTributeData.required_count) return;

            const finalPos = position || pendingTributeData.position || 'ATK';
            const targetSlot = pendingTributeData.target_slot !== undefined && pendingTributeData.target_slot >= 0
                ? pendingTributeData.target_slot
                : selectedTributeSlots[0];

            const activeSocket = window.getSocket ? window.getSocket() : (window.socket || (typeof socket !== 'undefined' ? socket : null));
            if (activeSocket) {
                activeSocket.emit('OCG_TRIBUTE_RESPONSE', {
                    room_id: getActiveDuelRoomId(),
                    card_id: pendingTributeData.card_id,
                    tribute_slots: selectedTributeSlots,
                    target_slot: targetSlot,
                    position: finalPos
                });
            }

            cancelTributeSelection();
            if (typeof selectedHandCardIndex !== 'undefined') selectedHandCardIndex = -1;
            if (typeof selectedHandCardId !== 'undefined') selectedHandCardId = null;
            if (typeof highlightAvailableSlots === 'function') highlightAvailableSlots(false, false);
            document.querySelectorAll('.hand-card').forEach(c => c.classList.remove('selected-hand'));
        }

        const activeSocket = window.getSocket ? window.getSocket() : (window.socket || (typeof socket !== 'undefined' ? socket : null));
        if (activeSocket) {
            activeSocket.on('OCG_PROMPT_TRIBUTE', (data) => {
                console.log('[OCG TRIBUTE PROMPT]', data);
                openTributeModal(data.card_id, data.card_name, data.level, data.required_count, data.position || 'ATK', data.target_slot !== undefined ? data.target_slot : -1);
            });
        }

        function toggleTributeSlot(slotIndex) {
            toggleTributeSlotModal(slotIndex);
        }

        function confirmTributeSelection() {
            executeTributeSummon('ATK');
        }

        function cancelTributeSelection() {
            pendingTributeData = null;
            selectedTributeSlots = [];
            const modal = document.getElementById('tribute-modal');
            if (modal) modal.style.display = 'none';
            const banner = document.getElementById('tribute-banner');
            if (banner) banner.style.display = 'none';
            for (let i = 0; i < 5; i++) {
                const slot = document.getElementById(`p-m${i}`);
                if (slot) {
                    slot.classList.remove('slot-droppable');
                    slot.classList.remove('slot-targeted');
                }
            }
        }

        // =========================================================================
        // VISOR E INSPECTOR FLOTANTE NO BLOQUEANTE (EXTRA DECK, CEMENTERIO, DESTIERRO)
        // =========================================================================

        // Exportaciones globales para eventos HTML
        if (typeof respondChainPass !== 'undefined') window.respondChainPass = respondChainPass;
        if (typeof respondChainCard !== 'undefined') window.respondChainCard = respondChainCard;
        if (typeof confirmTributeSelection !== 'undefined') window.confirmTributeSelection = confirmTributeSelection;
        if (typeof cancelTributeSelection !== 'undefined') window.cancelTributeSelection = cancelTributeSelection;
        if (typeof confirmHandDiscard !== 'undefined') window.confirmHandDiscard = confirmHandDiscard;
        if (typeof cancelInteractiveTargeting !== 'undefined') window.cancelInteractiveTargeting = cancelInteractiveTargeting;
        if (typeof closeRebornModal !== 'undefined') window.closeRebornModal = closeRebornModal;
        if (typeof openTributeModal !== 'undefined') window.openTributeModal = openTributeModal;
        if (typeof toggleTributeSlotModal !== 'undefined') window.toggleTributeSlotModal = toggleTributeSlotModal;
        if (typeof executeTributeSummon !== 'undefined') window.executeTributeSummon = executeTributeSummon;
        if (typeof initiateTributeFlow !== 'undefined') window.initiateTributeFlow = initiateTributeFlow;
        if (typeof activateCardFromHand !== 'undefined') window.activateCardFromHand = activateCardFromHand;
        if (typeof activateCardDirectly !== 'undefined') window.activateCardDirectly = activateCardDirectly;
