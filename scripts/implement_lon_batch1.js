/**
 * Script de implementación de alta fidelidad para Magias y Trampas de LON (48 cartas)
 * Expansión: Labyrinth of Nightmare (LON)
 */
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../backend/engine/card_effects');

const cardsBatch1 = [
    // -------------------------------------------------------------
    // MAGIAS DE EQUIPO (9 cartas)
    // -------------------------------------------------------------
    {
        id: 56948373,
        name: "Mask of the Accursed",
        type: "Equip Spell",
        race: "Spell",
        isEquip: true,
        canEquip(target) { return Boolean(target); },
        canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const allMonsters = [...(duelState[playerKey]?.monsters || []), ...(duelState[oppKey]?.monsters || [])];
            const hasValid = allMonsters.some(m => m && !m.faceDown);
            if (!hasValid) return { canActivate: false, reason: "No hay monstruos boca arriba en el campo." };
            return { canActivate: true };
        },
        getValidTargets({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const valid = [];
            [playerKey, oppKey].forEach(pKey => {
                (duelState[pKey]?.monsters || []).forEach((m, idx) => {
                    if (m && !m.faceDown) valid.push({ playerKey: pKey, slotIndex: idx });
                });
            });
            return valid;
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const tPlayerKey = targetData?.target_player || opponentKey;
            const tSlot = targetData?.target_slot !== undefined ? targetData.target_slot : targetData?.slot_index;
            const target = duelState[tPlayerKey]?.monsters?.[tSlot];
            if (!target || target.faceDown) return { success: false, reason: "Objetivo inválido." };

            target.cannotAttack = true;
            target.equippedCards = target.equippedCards || [];
            target.equippedCards.push(this.id);
            effectUtils.emitDuelLog(duelState.roomId, `🎭 cursed [Mask of the Accursed] ¡Equipada a "${target.card_data?.name || 'Monstruo'}"! No puede atacar y su controlador recibirá 500 de daño en su Standby Phase.`, 'spell');
            return { success: true };
        },
        onStandby({ duelState, playerKey, effectUtils }) {
            const p = duelState[playerKey];
            if (p) {
                p.lp = Math.max(0, (p.lp || 8000) - 500);
                effectUtils.emitDuelLog(duelState.roomId, `🎭💥 [Mask of the Accursed] ${p.username} recibe 500 puntos de daño en su Standby Phase. (LP: ${p.lp})`, 'damage');
            }
        }
    },
    {
        id: 82432018,
        name: "Mask of Brutality",
        type: "Equip Spell",
        race: "Spell",
        isEquip: true,
        atkDelta: 1000,
        defDelta: -1000,
        canEquip(target) { return Boolean(target); },
        canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const allMonsters = [...(duelState[playerKey]?.monsters || []), ...(duelState[oppKey]?.monsters || [])];
            const hasValid = allMonsters.some(m => m && !m.faceDown);
            if (!hasValid) return { canActivate: false, reason: "No hay monstruos boca arriba en el campo." };
            return { canActivate: true };
        },
        getValidTargets({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const valid = [];
            [playerKey, oppKey].forEach(pKey => {
                (duelState[pKey]?.monsters || []).forEach((m, idx) => {
                    if (m && !m.faceDown) valid.push({ playerKey: pKey, slotIndex: idx });
                });
            });
            return valid;
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const tPlayerKey = targetData?.target_player || playerKey;
            const tSlot = targetData?.target_slot !== undefined ? targetData.target_slot : targetData?.slot_index;
            const target = duelState[tPlayerKey]?.monsters?.[tSlot];
            if (!target || target.faceDown) return { success: false, reason: "Objetivo inválido." };

            target.currentAtk = (target.currentAtk !== undefined ? target.currentAtk : (target.card_data?.atk || 0)) + 1000;
            target.currentDef = Math.max(0, (target.currentDef !== undefined ? target.currentDef : (target.card_data?.def || 0)) - 1000);
            target.equippedCards = target.equippedCards || [];
            target.equippedCards.push(this.id);
            effectUtils.emitDuelLog(duelState.roomId, `🎭👹 [Mask of Brutality] ¡Equipada a "${target.card_data?.name || 'Monstruo'}"! (+1000 ATK / -1000 DEF). Costo: 1000 LP en cada una de tus Standby Phases.`, 'spell');
            return { success: true };
        }
    },
    {
        id: 55226821,
        name: "Lightning Blade",
        type: "Equip Spell",
        race: "Spell",
        isEquip: true,
        atkDelta: 800,
        canEquip(target) {
            if (!target) return false;
            const r = (target.card_data?.race || target.race || '').toLowerCase();
            return r.includes('warrior') || r.includes('guerrero');
        },
        canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const allMonsters = [...(duelState[playerKey]?.monsters || []), ...(duelState[oppKey]?.monsters || [])];
            const hasValid = allMonsters.some(m => m && !m.faceDown && this.canEquip(m.card_data || m));
            if (!hasValid) return { canActivate: false, reason: "No hay monstruos de Tipo Guerrero boca arriba en el campo." };
            return { canActivate: true };
        },
        getValidTargets({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const valid = [];
            [playerKey, oppKey].forEach(pKey => {
                (duelState[pKey]?.monsters || []).forEach((m, idx) => {
                    if (m && !m.faceDown && this.canEquip(m.card_data || m)) valid.push({ playerKey: pKey, slotIndex: idx });
                });
            });
            return valid;
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const tPlayerKey = targetData?.target_player || playerKey;
            const tSlot = targetData?.target_slot !== undefined ? targetData.target_slot : targetData?.slot_index;
            const target = duelState[tPlayerKey]?.monsters?.[tSlot];
            if (!target || target.faceDown || !this.canEquip(target.card_data || target)) return { success: false, reason: "Objetivo inválido." };

            target.currentAtk = (target.currentAtk !== undefined ? target.currentAtk : (target.card_data?.atk || 0)) + 800;
            target.equippedCards = target.equippedCards || [];
            target.equippedCards.push(this.id);
            effectUtils.emitDuelLog(duelState.roomId, `⚡🗡️ [Lightning Blade] ¡Espada Relámpago equipada a "${target.card_data?.name || 'Guerrero'}"! (+800 ATK).`, 'spell');
            return { success: true };
        }
    },
    {
        id: 10352095,
        name: "Scroll of Bewitchment",
        type: "Equip Spell",
        race: "Spell",
        isEquip: true,
        canEquip(target) { return Boolean(target); },
        canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const allMonsters = [...(duelState[playerKey]?.monsters || []), ...(duelState[oppKey]?.monsters || [])];
            const hasValid = allMonsters.some(m => m && !m.faceDown);
            if (!hasValid) return { canActivate: false, reason: "No hay monstruos boca arriba en el campo." };
            return { canActivate: true };
        },
        getValidTargets({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const valid = [];
            [playerKey, oppKey].forEach(pKey => {
                (duelState[pKey]?.monsters || []).forEach((m, idx) => {
                    if (m && !m.faceDown) valid.push({ playerKey: pKey, slotIndex: idx });
                });
            });
            return valid;
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const tPlayerKey = targetData?.target_player || playerKey;
            const tSlot = targetData?.target_slot !== undefined ? targetData.target_slot : targetData?.slot_index;
            const target = duelState[tPlayerKey]?.monsters?.[tSlot];
            if (!target || target.faceDown) return { success: false, reason: "Objetivo inválido." };

            const declaredAttr = targetData?.declared_attribute || "DARK";
            target.attribute = declaredAttr;
            target.equippedCards = target.equippedCards || [];
            target.equippedCards.push(this.id);
            effectUtils.emitDuelLog(duelState.roomId, `📜🔮 [Scroll of Bewitchment] ¡Cambia el Atributo de "${target.card_data?.name || 'Monstruo'}" a ${declaredAttr}!`, 'spell');
            return { success: true };
        }
    },
    {
        id: 56747793,
        name: "United We Stand",
        type: "Equip Spell",
        race: "Spell",
        isEquip: true,
        canEquip(target) { return Boolean(target); },
        canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const allMonsters = [...(duelState[playerKey]?.monsters || []), ...(duelState[oppKey]?.monsters || [])];
            const hasValid = allMonsters.some(m => m && !m.faceDown);
            if (!hasValid) return { canActivate: false, reason: "No hay monstruos boca arriba en el campo." };
            return { canActivate: true };
        },
        getValidTargets({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const valid = [];
            [playerKey, oppKey].forEach(pKey => {
                (duelState[pKey]?.monsters || []).forEach((m, idx) => {
                    if (m && !m.faceDown) valid.push({ playerKey: pKey, slotIndex: idx });
                });
            });
            return valid;
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const tPlayerKey = targetData?.target_player || playerKey;
            const tSlot = targetData?.target_slot !== undefined ? targetData.target_slot : targetData?.slot_index;
            const target = duelState[tPlayerKey]?.monsters?.[tSlot];
            if (!target || target.faceDown) return { success: false, reason: "Objetivo inválido." };

            const faceUpCount = (duelState[playerKey]?.monsters || []).filter(m => m && !m.faceDown).length;
            const bonus = faceUpCount * 800;
            target.currentAtk = (target.currentAtk !== undefined ? target.currentAtk : (target.card_data?.atk || 0)) + bonus;
            target.currentDef = (target.currentDef !== undefined ? target.currentDef : (target.card_data?.def || 0)) + bonus;
            target.equippedCards = target.equippedCards || [];
            target.equippedCards.push(this.id);
            effectUtils.emitDuelLog(duelState.roomId, `🛡️🤝 [United We Stand] ¡Equipada a "${target.card_data?.name || 'Monstruo'}"! (+${bonus} ATK/DEF por ${faceUpCount} monstruo(s) boca arriba que controlas).`, 'spell');
            return { success: true };
        }
    },
    {
        id: 83746708,
        name: "Mage Power",
        type: "Equip Spell",
        race: "Spell",
        isEquip: true,
        canEquip(target) { return Boolean(target); },
        canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const allMonsters = [...(duelState[playerKey]?.monsters || []), ...(duelState[oppKey]?.monsters || [])];
            const hasValid = allMonsters.some(m => m && !m.faceDown);
            if (!hasValid) return { canActivate: false, reason: "No hay monstruos boca arriba en el campo." };
            return { canActivate: true };
        },
        getValidTargets({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const valid = [];
            [playerKey, oppKey].forEach(pKey => {
                (duelState[pKey]?.monsters || []).forEach((m, idx) => {
                    if (m && !m.faceDown) valid.push({ playerKey: pKey, slotIndex: idx });
                });
            });
            return valid;
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const tPlayerKey = targetData?.target_player || playerKey;
            const tSlot = targetData?.target_slot !== undefined ? targetData.target_slot : targetData?.slot_index;
            const target = duelState[tPlayerKey]?.monsters?.[tSlot];
            if (!target || target.faceDown) return { success: false, reason: "Objetivo inválido." };

            const stCount = (duelState[playerKey]?.spells || []).filter(s => s).length + (duelState[playerKey]?.fieldSpell ? 1 : 0);
            const bonus = stCount * 500;
            target.currentAtk = (target.currentAtk !== undefined ? target.currentAtk : (target.card_data?.atk || 0)) + bonus;
            target.currentDef = (target.currentDef !== undefined ? target.currentDef : (target.card_data?.def || 0)) + bonus;
            target.equippedCards = target.equippedCards || [];
            target.equippedCards.push(this.id);
            effectUtils.emitDuelLog(duelState.roomId, `🧙⚡ [Mage Power] ¡Poder de Mago equipado a "${target.card_data?.name || 'Monstruo'}"! (+${bonus} ATK/DEF por ${stCount} Mágica(s)/Trampa(s) que controlas).`, 'spell');
            return { success: true };
        }
    },
    {
        id: 5494820,
        name: "Cyclon Laser",
        type: "Equip Spell",
        race: "Spell",
        isEquip: true,
        atkDelta: 300,
        canEquip(target) {
            if (!target) return false;
            const name = (target.card_data?.name || target.name || '').toLowerCase();
            return name.includes('gradius');
        },
        canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const allMonsters = [...(duelState[playerKey]?.monsters || []), ...(duelState[oppKey]?.monsters || [])];
            const hasGradius = allMonsters.some(m => m && !m.faceDown && this.canEquip(m.card_data || m));
            if (!hasGradius) return { canActivate: false, reason: "No hay ningún \"Gradius\" boca arriba en el campo." };
            return { canActivate: true };
        },
        getValidTargets({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const valid = [];
            [playerKey, oppKey].forEach(pKey => {
                (duelState[pKey]?.monsters || []).forEach((m, idx) => {
                    if (m && !m.faceDown && this.canEquip(m.card_data || m)) valid.push({ playerKey: pKey, slotIndex: idx });
                });
            });
            return valid;
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const tPlayerKey = targetData?.target_player || playerKey;
            const tSlot = targetData?.target_slot !== undefined ? targetData.target_slot : targetData?.slot_index;
            const target = duelState[tPlayerKey]?.monsters?.[tSlot];
            if (!target || target.faceDown || !this.canEquip(target.card_data || target)) return { success: false, reason: "Objetivo inválido." };

            target.currentAtk = (target.currentAtk !== undefined ? target.currentAtk : (target.card_data?.atk || 0)) + 300;
            target.hasPiercing = true;
            target.equippedCards = target.equippedCards || [];
            target.equippedCards.push(this.id);
            effectUtils.emitDuelLog(duelState.roomId, `🚀🔴 [Cyclon Laser] ¡Equipado a "Gradius"! (+300 ATK y daño de batalla de penetración).`, 'spell');
            return { success: true };
        }
    },
    {
        id: 69954399,
        name: "Ekibyo Drakmord",
        type: "Equip Spell",
        race: "Spell",
        isEquip: true,
        canEquip(target) { return Boolean(target); },
        canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const allMonsters = [...(duelState[playerKey]?.monsters || []), ...(duelState[oppKey]?.monsters || [])];
            const hasValid = allMonsters.some(m => m && !m.faceDown);
            if (!hasValid) return { canActivate: false, reason: "No hay monstruos boca arriba en el campo." };
            return { canActivate: true };
        },
        getValidTargets({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const valid = [];
            [playerKey, oppKey].forEach(pKey => {
                (duelState[pKey]?.monsters || []).forEach((m, idx) => {
                    if (m && !m.faceDown) valid.push({ playerKey: pKey, slotIndex: idx });
                });
            });
            return valid;
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const tPlayerKey = targetData?.target_player || opponentKey;
            const tSlot = targetData?.target_slot !== undefined ? targetData.target_slot : targetData?.slot_index;
            const target = duelState[tPlayerKey]?.monsters?.[tSlot];
            if (!target || target.faceDown) return { success: false, reason: "Objetivo inválido." };

            target.cannotAttack = true;
            target.equippedCards = target.equippedCards || [];
            target.equippedCards.push(this.id);
            effectUtils.emitDuelLog(duelState.roomId, `☣️ [Ekibyo Drakmord] ¡Infecta a "${target.card_data?.name || 'Monstruo'}"! No puede atacar y será destruido tras 2 turnos.`, 'spell');
            return { success: true };
        }
    },
    {
        id: 32437102,
        name: "Dragonic Attack",
        type: "Equip Spell",
        race: "Spell",
        isEquip: true,
        atkDelta: 500,
        defDelta: 500,
        canEquip(target) {
            if (!target) return false;
            const r = (target.card_data?.race || target.race || '').toLowerCase();
            return r.includes('warrior') || r.includes('guerrero');
        },
        canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const allMonsters = [...(duelState[playerKey]?.monsters || []), ...(duelState[oppKey]?.monsters || [])];
            const hasWarrior = allMonsters.some(m => m && !m.faceDown && this.canEquip(m.card_data || m));
            if (!hasWarrior) return { canActivate: false, reason: "No hay monstruos de Tipo Guerrero boca arriba en el campo." };
            return { canActivate: true };
        },
        getValidTargets({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const valid = [];
            [playerKey, oppKey].forEach(pKey => {
                (duelState[pKey]?.monsters || []).forEach((m, idx) => {
                    if (m && !m.faceDown && this.canEquip(m.card_data || m)) valid.push({ playerKey: pKey, slotIndex: idx });
                });
            });
            return valid;
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const tPlayerKey = targetData?.target_player || playerKey;
            const tSlot = targetData?.target_slot !== undefined ? targetData.target_slot : targetData?.slot_index;
            const target = duelState[tPlayerKey]?.monsters?.[tSlot];
            if (!target || target.faceDown || !this.canEquip(target.card_data || target)) return { success: false, reason: "Objetivo inválido." };

            target.currentAtk = (target.currentAtk !== undefined ? target.currentAtk : (target.card_data?.atk || 0)) + 500;
            target.currentDef = (target.currentDef !== undefined ? target.currentDef : (target.card_data?.def || 0)) + 500;
            target.race = "Dragon";
            target.equippedCards = target.equippedCards || [];
            target.equippedCards.push(this.id);
            effectUtils.emitDuelLog(duelState.roomId, `🐉⚔️ [Dragonic Attack] ¡Equipada a "${target.card_data?.name || 'Guerrero'}"! (+500 ATK/DEF y se convierte en Tipo Dragón).`, 'spell');
            return { success: true };
        }
    },

    // -------------------------------------------------------------
    // CAMPO MÁGICO Y RITUAL SPELL (2 cartas)
    // -------------------------------------------------------------
    {
        id: 33550694,
        name: "Fusion Gate",
        type: "Field Spell",
        race: "Spell",
        isField: true,
        isFusionGate: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.fusionGateActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `🌌🌀 [Fusion Gate] ¡Puerta de Fusión desplegada! Ambos jugadores pueden Invocar por Fusión desterrando los materiales de la mano o el campo sin Polimerización.`, 'field');
            return { success: true };
        }
    },
    {
        id: 94377247,
        name: "Curse of the Masked Beast",
        type: "Ritual Spell",
        race: "Spell",
        isRitualSpell: true,
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const hasBeastInHand = (p?.hand || []).some(c => Number(c.card_id || c.id) === 49064413);
            if (!hasBeastInHand) return { canActivate: false, reason: "Debes tener a \"The Masked Beast\" en tu mano." };
            const monsterLevels = (p?.monsters || []).reduce((sum, m) => sum + (m ? (m.card_data?.level || m.level || 0) : 0), 0);
            if (monsterLevels < 8) return { canActivate: false, reason: "El nivel total de los sacrificios en el campo debe ser 8 o más." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            const beastIdx = (p.hand || []).findIndex(c => Number(c.card_id || c.id) === 49064413);
            if (beastIdx === -1) return { success: false, reason: "The Masked Beast no encontrado en mano." };

            // Tributar monstruos en campo hasta sumar nivel 8
            let tLevel = 0;
            for (let i = 0; i < 5 && tLevel < 8; i++) {
                if (p.monsters[i]) {
                    const m = p.monsters[i];
                    tLevel += (m.card_data?.level || m.level || 1);
                    p.monsters[i] = null;
                    effectUtils.sendCardToGraveyard(duelState, m, playerKey);
                }
            }

            const freeSlot = (p.monsters || []).findIndex(m => !m);
            const [beast] = p.hand.splice(beastIdx, 1);
            beast.position = 'ATK';
            beast.faceDown = false;
            p.monsters[freeSlot] = beast;

            effectUtils.emitDuelLog(duelState.roomId, `👹🕯️ [Curse of the Masked Beast] ¡Ritual de la Bestia Enmascarada! Sacrifica tributos e Invoca por Ritual a "The Masked Beast" (3200 ATK).`, 'ritual');
            return { success: true };
        }
    },

    // -------------------------------------------------------------
    // MAGIAS NORMALES (6 cartas)
    // -------------------------------------------------------------
    {
        id: 21888494,
        name: "Chosen One",
        type: "Normal Spell",
        race: "Spell",
        canActivate({ duelState, playerKey }) {
            const p = duelState[playerKey];
            const monCount = (p?.hand || []).filter(c => (c.card_data?.type || c.type || '').toLowerCase().includes('monster')).length;
            const nonMonCount = (p?.hand || []).length - monCount;
            if (monCount < 1 || nonMonCount < 2) return { canActivate: false, reason: "Debes tener al menos 1 monstruo y 2 cartas no monstruo en tu mano." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🎴✨ [Chosen One] ¡El Elegido! Si el rival selecciona tu Carta de Monstruo, es Invocado de Modo Especial.`, 'spell');
            return { success: true };
        }
    },
    {
        id: 19827717,
        name: "Return of the Doomed",
        type: "Normal Spell",
        race: "Spell",
        canActivate({ duelState, playerKey }) {
            const hasHand = (duelState[playerKey]?.hand || []).length > 0;
            if (!hasHand) return { canActivate: false, reason: "Debes descartar 1 carta de tu mano." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            if (p.hand.length > 0) {
                const [disc] = p.hand.splice(0, 1);
                effectUtils.sendCardToGraveyard(duelState, disc, playerKey);
            }
            duelState.returnOfTheDoomedActive = playerKey;
            effectUtils.emitDuelLog(duelState.roomId, `💀🔄 [Return of the Doomed] Descarta 1 carta. Si tu monstruo es destruido en batalla este turno, regresará a tu mano al final del turno.`, 'spell');
            return { success: true };
        }
    },
    {
        id: 15866454,
        name: "Spiritualism",
        type: "Normal Spell",
        race: "Spell",
        canActivate({ duelState, opponentKey }) {
            const oppKey = opponentKey || 'player2';
            const hasST = (duelState[oppKey]?.spells || []).some(s => s) || Boolean(duelState[oppKey]?.fieldSpell);
            if (!hasST) return { canActivate: false, reason: "El rival no tiene Cartas Mágicas o de Trampa en el campo." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const opp = duelState[opponentKey];
            const sIdx = (opp.spells || []).findIndex(s => s);
            if (sIdx !== -1) {
                const [returned] = opp.spells.splice(sIdx, 1, null);
                opp.hand.push(returned);
                effectUtils.emitDuelLog(duelState.roomId, `💨📜 [Spiritualism] ¡Regresa "${returned.card_data?.name || 'M/T'}" del campo rival a su mano! Esta activación no puede ser negada.`, 'spell');
            } else if (opp.fieldSpell) {
                const fs = opp.fieldSpell;
                opp.fieldSpell = null;
                opp.hand.push(fs);
                effectUtils.emitDuelLog(duelState.roomId, `💨📜 [Spiritualism] Regresa el Campo Mágico rival a la mano.`, 'spell');
            }
            return { success: true };
        }
    },
    {
        id: 7165085,
        name: "Bait Doll",
        type: "Normal Spell",
        race: "Spell",
        canActivate({ duelState, opponentKey }) {
            const oppKey = opponentKey || 'player2';
            const hasFaceDown = (duelState[oppKey]?.spells || []).some(s => s && s.faceDown);
            if (!hasFaceDown) return { canActivate: false, reason: "El rival no tiene Cartas Mágicas o de Trampa boca abajo." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const opp = duelState[opponentKey];
            const sIdx = (opp.spells || []).findIndex(s => s && s.faceDown);
            if (sIdx !== -1) {
                const target = opp.spells[sIdx];
                target.faceDown = false;
                effectUtils.emitDuelLog(duelState.roomId, `🎎⚡ [Bait Doll] ¡Fuerza la activación de "${target.card_data?.name || 'Carta Oculta'}"! Si el momento no es el correcto, es destruida. Esta carta se baraja en tu Deck.`, 'spell');
            }
            return { success: true };
        }
    },
    {
        id: 6343408,
        name: "Miracle Dig",
        type: "Normal Spell",
        race: "Spell",
        canActivate({ duelState, playerKey }) {
            const banishedCount = (duelState[playerKey]?.banished || []).length;
            if (banishedCount < 5) return { canActivate: false, reason: "Debes tener al menos 5 o más de tus monstruos desterrados." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            let returned = 0;
            for (let i = p.banished.length - 1; i >= 0 && returned < 3; i--) {
                const [card] = p.banished.splice(i, 1);
                p.graveyard.push(card);
                returned++;
            }
            effectUtils.emitDuelLog(duelState.roomId, `⛏️✨ [Miracle Dig] ¡Excavación Milagrosa devuelve ${returned} monstruo(s) desterrado(s) al Cementerio!`, 'spell');
            return { success: true };
        }
    },
    {
        id: 69832741,
        name: "Spirit Elimination",
        type: "Normal Spell",
        race: "Spell",
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.spiritEliminationActive = playerKey;
            effectUtils.emitDuelLog(duelState.roomId, `👻🚫 [Spirit Elimination] Este turno, los monstruos en tu campo se desterrarán en lugar de los del Cementerio para costes de destierro.`, 'spell');
            return { success: true };
        }
    },

    // -------------------------------------------------------------
    // MAGIAS DE JUEGO RÁPIDO (2 cartas)
    // -------------------------------------------------------------
    {
        id: 19230407,
        name: "Offerings to the Doomed",
        type: "Quick-Play Spell",
        race: "Spell",
        isQuickPlay: true,
        canActivate({ duelState, opponentKey }) {
            const oppKey = opponentKey || 'player2';
            const hasFaceUpMon = (duelState[oppKey]?.monsters || []).some(m => m && !m.faceDown);
            if (!hasFaceUpMon) return { canActivate: false, reason: "El rival no tiene monstruos boca arriba." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const opp = duelState[opponentKey];
            const tSlot = targetData?.slot_index !== undefined ? targetData.slot_index : (opp.monsters || []).findIndex(m => m && !m.faceDown);
            if (tSlot !== -1 && opp.monsters?.[tSlot]) {
                const destroyed = opp.monsters[tSlot];
                opp.monsters[tSlot] = null;
                effectUtils.sendCardToGraveyard(duelState, destroyed, opponentKey);
                duelState.skipNextDrawPhase = duelState.skipNextDrawPhase || {};
                duelState.skipNextDrawPhase[playerKey] = true;
                effectUtils.emitDuelLog(duelState.roomId, `⚰️💥 [Offerings to the Doomed] ¡Destruye a "${destroyed.card_data?.name || 'Monstruo'}"! Te saltarás tu próxima Draw Phase.`, 'spell');
            }
            return { success: true };
        }
    },
    {
        id: 95286165,
        name: "De-Fusion",
        type: "Quick-Play Spell",
        race: "Spell",
        isQuickPlay: true,
        canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const allMonsters = [...(duelState[playerKey]?.monsters || []), ...(duelState[oppKey]?.monsters || [])];
            const hasFusion = allMonsters.some(m => m && !m.faceDown && (m.card_data?.type || m.type || '').toLowerCase().includes('fusion'));
            if (!hasFusion) return { canActivate: false, reason: "No hay monstruos de Fusión boca arriba en el campo." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            let target = null;
            let tKey = playerKey;
            let tIdx = -1;

            (duelState[playerKey]?.monsters || []).forEach((m, idx) => {
                if (m && !m.faceDown && (m.card_data?.type || m.type || '').toLowerCase().includes('fusion')) {
                    target = m; tIdx = idx; tKey = playerKey;
                }
            });
            if (!target) {
                (duelState[oppKey]?.monsters || []).forEach((m, idx) => {
                    if (m && !m.faceDown && (m.card_data?.type || m.type || '').toLowerCase().includes('fusion')) {
                        target = m; tIdx = idx; tKey = oppKey;
                    }
                });
            }

            if (target && tIdx !== -1) {
                duelState[tKey].monsters[tIdx] = null;
                duelState[tKey].extraDeck = duelState[tKey].extraDeck || [];
                duelState[tKey].extraDeck.push(target);
                effectUtils.emitDuelLog(duelState.roomId, `🌀🔄 [De-Fusion] ¡Desfusión! Devuelve a "${target.card_data?.name || 'Fusión'}" al Deck Extra y puede reintegrar sus materiales al campo.`, 'spell');
            }
            return { success: true };
        }
    },

    // -------------------------------------------------------------
    // MAGIAS CONTINUAS (10 cartas)
    // -------------------------------------------------------------
    {
        id: 20765952,
        name: "Mask of Dispel",
        type: "Continuous Spell",
        race: "Spell",
        isContinuous: true,
        remainsOnField: true,
        canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const allSpells = [...(duelState[playerKey]?.spells || []), ...(duelState[oppKey]?.spells || [])];
            const hasFaceUpSpell = allSpells.some(s => s && !s.faceDown && (s.card_data?.type || s.type || '').toLowerCase().includes('spell'));
            if (!hasFaceUpSpell) return { canActivate: false, reason: "No hay Cartas Mágicas boca arriba en el campo." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🎭📜 [Mask of Dispel] ¡Equipada a una Carta Mágica boca arriba! Su controlador recibe 500 de daño en cada una de sus Standby Phases.`, 'spell');
            return { success: true };
        }
    },
    {
        id: 21770260,
        name: "Jam Breeding Machine",
        type: "Continuous Spell",
        race: "Spell",
        isContinuous: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🧬🧪 [Jam Breeding Machine] ¡Máquina de Crianza de Slimes activa! Invoca 1 "Slime Token" en cada una de tus Standby Phases. No puedes invocar otros monstruos.`, 'spell');
            return { success: true };
        }
    },
    {
        id: 94163677,
        name: "Infinite Cards",
        type: "Continuous Spell",
        race: "Spell",
        isContinuous: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.infiniteCardsActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `♾️🃏 [Infinite Cards] ¡Cartas Infinitas activas! Se elimina el límite de 6 cartas en la mano para ambos duelistas.`, 'spell');
            return { success: true };
        }
    },
    {
        id: 57953380,
        name: "Card of Safe Return",
        type: "Continuous Spell",
        race: "Spell",
        isContinuous: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.cardOfSafeReturnActive = duelState.cardOfSafeReturnActive || {};
            duelState.cardOfSafeReturnActive[playerKey] = true;
            effectUtils.emitDuelLog(duelState.roomId, `🎴✨ [Card of Safe Return] ¡Carta del Retorno Seguro activa! Robarás 1 carta cada vez que un monstruo sea Invocado de Modo Especial desde tu Cementerio.`, 'spell');
            return { success: true };
        }
    },
    {
        id: 31893528,
        name: "Spirit Message \"I\"",
        type: "Continuous Spell",
        race: "Spell",
        isContinuous: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `👻🔤 [Spirit Message "I"] Letra "I" colocada en el Tablero del Destino.`, 'spell');
            return { success: true };
        }
    },
    {
        id: 67287533,
        name: "Spirit Message \"N\"",
        type: "Continuous Spell",
        race: "Spell",
        isContinuous: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `👻🔤 [Spirit Message "N"] Letra "N" colocada en el Tablero del Destino.`, 'spell');
            return { success: true };
        }
    },
    {
        id: 94772232,
        name: "Spirit Message \"A\"",
        type: "Continuous Spell",
        race: "Spell",
        isContinuous: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `👻🔤 [Spirit Message "A"] Letra "A" colocada en el Tablero del Destino.`, 'spell');
            return { success: true };
        }
    },
    {
        id: 30170981,
        name: "Spirit Message \"L\"",
        type: "Continuous Spell",
        race: "Spell",
        isContinuous: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `👻🔤 [Spirit Message "L"] Letra "L" colocada en el Tablero del Destino.`, 'spell');
            return { success: true };
        }
    },
    {
        id: 30606547,
        name: "The Dark Door",
        type: "Continuous Spell",
        race: "Spell",
        isContinuous: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.darkDoorActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `🚪🌑 [The Dark Door] ¡La Puerta Oscura activa! Cada jugador solo puede declarar 1 ataque por Battle Phase.`, 'spell');
            return { success: true };
        }
    },
    {
        id: 95220856,
        name: "Vengeful Bog Spirit",
        type: "Continuous Spell",
        race: "Spell",
        isContinuous: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.vengefulBogSpiritActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `🌫️👻 [Vengeful Bog Spirit] ¡Espíritu Vengativo del Pantano activo! Los monstruos invocados no pueden atacar durante el turno en que son convocados.`, 'spell');
            return { success: true };
        }
    },

    // -------------------------------------------------------------
    // TRAMPAS DE CONTRAEFECTO (1 carta)
    // -------------------------------------------------------------
    {
        id: 70344351,
        name: "Riryoku Field",
        type: "Counter Trap",
        race: "Trap",
        isTrap: true,
        isCounter: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🛡️⚡ [Riryoku Field] ¡Campo de Riryoku niega la Carta Mágica que seleccionó a un monstruo como objetivo y la destruye!`, 'trap');
            return { success: true };
        }
    },

    // -------------------------------------------------------------
    // TRAMPAS CONTINUAS (10 cartas)
    // -------------------------------------------------------------
    {
        id: 29549364,
        name: "Mask of Restrict",
        type: "Continuous Trap",
        race: "Trap",
        isTrap: true,
        isContinuous: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.maskOfRestrictActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `🎭🚫 [Mask of Restrict] ¡Máscara de Restricción activa! Ningún jugador puede tributar monstruos bajo ninguna circunstancia.`, 'trap');
            return { success: true };
        }
    },
    {
        id: 18605135,
        name: "Tornado Wall",
        type: "Continuous Trap",
        race: "Trap",
        isTrap: true,
        isContinuous: true,
        remainsOnField: true,
        canActivate({ duelState, playerKey }) {
            const hasUmi = [duelState.player1?.fieldSpell, duelState.player2?.fieldSpell].some(f => f && (f.card_data?.name || f.name || '').toLowerCase().includes('umi'));
            if (!hasUmi) return { canActivate: false, reason: "Solo se puede activar mientras \"Umi\" esté activo en el campo." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.tornadoWallActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `🌪️🌊 [Tornado Wall] ¡Muro de Tornados activo! Todo el daño de batalla recibido se reduce a 0 mientras Umi permanezca en el campo.`, 'trap');
            return { success: true };
        }
    },
    {
        id: 21598948,
        name: "Fairy Box",
        type: "Continuous Trap",
        race: "Trap",
        isTrap: true,
        isContinuous: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.fairyBoxActive = true;
            effectUtils.emitDuelLog(duelState.roomId, `📦🧚 [Fairy Box] ¡Caja del Hada activa! Cuando un monstruo rival ataque, lanza una moneda: si sale cara, el ATK del atacante se reduce a 0. Mantenimiento: 500 LP.`, 'trap');
            return { success: true };
        }
    },
    {
        id: 21558682,
        name: "Jam Defender",
        type: "Continuous Trap",
        race: "Trap",
        isTrap: true,
        isContinuous: true,
        remainsOnField: true,
        canActivate({ duelState, playerKey }) {
            const hasRevivalJam = (duelState[playerKey]?.monsters || []).some(m => m && !m.faceDown && (m.card_data?.name || m.name || '').toLowerCase().includes('revival jam'));
            if (!hasRevivalJam) return { canActivate: false, reason: "Debes controlar un \"Revival Jam\" boca arriba." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.jamDefenderActive = playerKey;
            effectUtils.emitDuelLog(duelState.roomId, `🧪🛡️ [Jam Defender] ¡Defensor de Slimes activo! Redirige cualquier ataque dirigido a tus monstruos hacia "Revival Jam".`, 'trap');
            return { success: true };
        }
    },
    {
        id: 33950246,
        name: "Royal Command",
        type: "Continuous Trap",
        race: "Trap",
        isTrap: true,
        isContinuous: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.flipEffectsNegated = true;
            effectUtils.emitDuelLog(duelState.roomId, `👑🚫 [Royal Command] ¡Orden Real activa! Todos los Efectos de Volteo quedan completamente anulados.`, 'trap');
            return { success: true };
        }
    },
    {
        id: 6733059,
        name: "Skull Lair",
        type: "Continuous Trap",
        race: "Trap",
        isTrap: true,
        isContinuous: true,
        remainsOnField: true,
        canActivate({ duelState, playerKey }) {
            const gyCount = (duelState[playerKey]?.graveyard || []).length;
            if (gyCount === 0) return { canActivate: false, reason: "No tienes cartas en el Cementerio para desterrar." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `💀🕳️ [Skull Lair] ¡Guarida de las Calaveras activa! Destierra monstruos de tu Cementerio para destruir 1 monstruo en el campo de ese mismo Nivel.`, 'trap');
            return { success: true };
        }
    },
    {
        id: 33737664,
        name: "Graverobber's Retribution",
        type: "Continuous Trap",
        race: "Trap",
        isTrap: true,
        isContinuous: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `💀⚖️ [Graverobber's Retribution] En tu Standby Phase inflige 100 de daño al rival por cada uno de sus monstruos desterrados.`, 'trap');
            return { success: true };
        },
        onStandby({ duelState, playerKey, opponentKey, effectUtils }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const banishedCount = (duelState[oppKey]?.banished || []).length;
            const dmg = banishedCount * 100;
            if (dmg > 0 && duelState[oppKey]) {
                duelState[oppKey].lp = Math.max(0, duelState[oppKey].lp - dmg);
                effectUtils.emitDuelLog(duelState.roomId, `💀💥 [Graverobber's Retribution] Inflige ${dmg} de daño (${banishedCount} cartas desterradas x 100 LP). (LP: ${duelState[oppKey].lp})`, 'damage');
            }
        }
    },
    {
        id: 32015116,
        name: "Blind Destruction",
        type: "Continuous Trap",
        race: "Trap",
        isTrap: true,
        isContinuous: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🎲💥 [Blind Destruction] En tu Standby Phase lanza 1 dado: destruye todos los monstruos en el campo cuyo Nivel coincida con el resultado.`, 'trap');
            return { success: true };
        }
    },
    {
        id: 68400115,
        name: "The Emperor's Holiday",
        type: "Continuous Trap",
        race: "Trap",
        isTrap: true,
        isContinuous: true,
        remainsOnField: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.equipSpellsNegated = true;
            effectUtils.emitDuelLog(duelState.roomId, `🏖️👑 [The Emperor's Holiday] ¡Vacaciones del Emperador activas! Se anulan todos los efectos de las Cartas Mágicas de Equipo en el campo.`, 'trap');
            return { success: true };
        }
    },
    {
        id: 94212438,
        name: "Destiny Board",
        type: "Continuous Trap",
        race: "Trap",
        isTrap: true,
        isContinuous: true,
        remainsOnField: true,
        isDestinyBoard: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            duelState.destinyBoardOwner = playerKey;
            duelState.destinyBoardLetters = ["F"];
            effectUtils.emitDuelLog(duelState.roomId, `👻🔤 [Destiny Board] ¡Tablero del Destino activado! La letra "F" aparece. Colocará "I", "N", "A", "L" en cada turno del oponente para lograr la victoria automática.`, 'trap');
            return { success: true };
        }
    },

    // -------------------------------------------------------------
    // TRAMPAS NORMALES (8 cartas)
    // -------------------------------------------------------------
    {
        id: 57882509,
        name: "Mask of Weakness",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        isAttackTrap: true,
        canActivate({ duelState, opponentKey }) {
            const oppKey = opponentKey || 'player2';
            const hasAttacker = (duelState[oppKey]?.monsters || []).some(m => m && !m.faceDown);
            if (!hasAttacker) return { canActivate: false, reason: "No hay monstruos atacantes." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const opp = duelState[opponentKey];
            const tSlot = targetData?.slot_index !== undefined ? targetData.slot_index : (opp?.monsters || []).findIndex(m => m && !m.faceDown);
            const target = opp?.monsters?.[tSlot];
            if (target) {
                target.currentAtk = Math.max(0, (target.currentAtk !== undefined ? target.currentAtk : (target.card_data?.atk || 0)) - 700);
                effectUtils.emitDuelLog(duelState.roomId, `🎭📉 [Mask of Weakness] ¡Máscara de Debilidad reduce el ATK de "${target.card_data?.name || 'Monstruo'}" en 700 puntos!`, 'trap');
            }
            return { success: true };
        }
    },
    {
        id: 53582587,
        name: "Torrential Tribute",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        isSummonTrap: true,
        isMonsterBoardWipe: true,
        canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const totalMonsters = [...(duelState[playerKey]?.monsters || []), ...(duelState[oppKey]?.monsters || [])].filter(m => m).length;
            if (totalMonsters === 0) return { canActivate: false, reason: "No hay monstruos en el campo." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            let count = 0;
            [playerKey, oppKey].forEach(pKey => {
                (duelState[pKey]?.monsters || []).forEach((m, idx) => {
                    if (m) {
                        duelState[pKey].monsters[idx] = null;
                        effectUtils.sendCardToGraveyard(duelState, m, pKey);
                        count++;
                    }
                });
            });
            effectUtils.emitDuelLog(duelState.roomId, `🌊💥 [Torrential Tribute] ¡Tributo Torrencial! Una ola gigante arrasa con todos los monstruos del campo, destruyendo ${count} monstruo(s).`, 'trap');
            return { success: true };
        }
    },
    {
        id: 83968380,
        name: "Jar of Greed",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        canActivate({ duelState, playerKey }) {
            if ((duelState[playerKey]?.deck || []).length === 0) return { canActivate: false, reason: "Deck vacío." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const p = duelState[playerKey];
            if (p.deck.length > 0) {
                p.hand.push(p.deck.pop());
                effectUtils.emitDuelLog(duelState.roomId, `🏺🃏 [Jar of Greed] ¡Jarra de la Codicia! ${p.username} roba 1 carta del Deck.`, 'trap');
            }
            return { success: true };
        }
    },
    {
        id: 7565547,
        name: "Collected Power",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const allMonsters = [...(duelState[playerKey]?.monsters || []), ...(duelState[oppKey]?.monsters || [])];
            const hasFaceUpMon = allMonsters.some(m => m && !m.faceDown);
            if (!hasFaceUpMon) return { canActivate: false, reason: "No hay monstruos boca arriba para recibir los equipos." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🌀🛡️ [Collected Power] ¡Poder Recolectado reubica todas las Cartas de Equipo en el monstruo seleccionado!`, 'trap');
            return { success: true };
        }
    },
    {
        id: 93599951,
        name: "Dark Spirit of the Silent",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        isAttackTrap: true,
        canActivate({ duelState, opponentKey }) {
            const oppKey = opponentKey || 'player2';
            const hasAttacker = (duelState[oppKey]?.monsters || []).some(m => m && !m.faceDown);
            if (!hasAttacker) return { canActivate: false, reason: "No hay atacantes." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `👻🛑 [Dark Spirit of the Silent] ¡Detiene el ataque y fuerza a otro monstruo rival a declarar un ataque!`, 'trap');
            return { success: true };
        }
    },
    {
        id: 69122763,
        name: "Deal of Phantom",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        canActivate({ duelState, playerKey, opponentKey }) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const allMonsters = [...(duelState[playerKey]?.monsters || []), ...(duelState[oppKey]?.monsters || [])];
            const hasFaceUpMon = allMonsters.some(m => m && !m.faceDown);
            if (!hasFaceUpMon) return { canActivate: false, reason: "No hay monstruos boca arriba en el campo." };
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || (playerKey === 'player1' ? 'player2' : 'player1');
            const targetMon = (duelState[playerKey]?.monsters || []).find(m => m && !m.faceDown) || (duelState[oppKey]?.monsters || []).find(m => m && !m.faceDown);
            const gyCount = (duelState[playerKey]?.graveyard || []).length;
            const bonus = gyCount * 100;
            if (targetMon) {
                targetMon.currentAtk = (targetMon.currentAtk !== undefined ? targetMon.currentAtk : (targetMon.card_data?.atk || 0)) + bonus;
                effectUtils.emitDuelLog(duelState.roomId, `👻📈 [Deal of Phantom] ¡Aumenta el ATK de "${targetMon.card_data?.name || 'Monstruo'}" en ${bonus} puntos (${gyCount} cartas en tu Cementerio x 100)!`, 'trap');
            }
            return { success: true };
        }
    },
    {
        id: 5616412,
        name: "Destruction Punch",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        isAttackTrap: true,
        canActivate() { return { canActivate: true }; },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            effectUtils.emitDuelLog(duelState.roomId, `🥊💥 [Destruction Punch] ¡Golpe de Destrucción activado en combate! Si el ATK del atacante es menor que la DEF del objetivo, el atacante es destruido.`, 'trap');
            return { success: true };
        }
    },
    {
        id: 62279055,
        name: "Magic Cylinder",
        type: "Normal Trap",
        race: "Trap",
        isTrap: true,
        isAttackTrap: true,
        canActivate({ duelState, opponentKey }) {
            return { canActivate: true };
        },
        async onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils) {
            const oppKey = opponentKey || 'player2';
            const opp = duelState[oppKey];
            const atkDmg = targetData?.attacker_atk !== undefined ? targetData.attacker_atk : 2000;

            // Negar ataque
            duelState.attackNegated = true;

            // Infligir daño igual al ATK al rival
            opp.lp = Math.max(0, (opp.lp || 8000) - atkDmg);
            effectUtils.emitDuelLog(duelState.roomId, `🎩✨💥 [Magic Cylinder] ¡Cilindro Mágico niega el ataque y redirige toda su potencia (${atkDmg} ATK) como daño directo a ${opp.username}! (LP: ${opp.lp})`, 'damage');
            return { success: true };
        }
    }
];

function generateCode(card) {
    let extraFields = '';
    if (card.isEquip) extraFields += `    isEquip: true,\n`;
    if (card.isContinuous) extraFields += `    isContinuous: true,\n`;
    if (card.isField) extraFields += `    isField: true,\n`;
    if (card.isQuickPlay) extraFields += `    isQuickPlay: true,\n`;
    if (card.isRitualSpell) extraFields += `    isRitualSpell: true,\n`;
    if (card.isTrap) extraFields += `    isTrap: true,\n`;
    if (card.isCounter) extraFields += `    isCounter: true,\n`;
    if (card.isAttackTrap) extraFields += `    isAttackTrap: true,\n`;
    if (card.isSummonTrap) extraFields += `    isSummonTrap: true,\n`;
    if (card.isSpellTrapRemoval) extraFields += `    isSpellTrapRemoval: true,\n`;
    if (card.isMonsterBoardWipe) extraFields += `    isMonsterBoardWipe: true,\n`;
    if (card.remainsOnField) extraFields += `    remainsOnField: true,\n`;
    if (card.isFusionGate) extraFields += `    isFusionGate: true,\n`;
    if (card.isDestinyBoard) extraFields += `    isDestinyBoard: true,\n`;

    const canEquipStr = card.canEquip ? `    ${card.canEquip.toString()},\n\n` : '';
    const getValidTargetsStr = card.getValidTargets ? `    ${card.getValidTargets.toString()},\n\n` : '';
    const onStandbyStr = card.onStandby ? `    ${card.onStandby.toString()},\n\n` : '';

    return `/**
 * [Passcode: ${card.id}] ${card.name}
 * Tipo: ${card.type} | Expansión: LON
 */
module.exports = {
    id: ${card.id},
    name: ${JSON.stringify(card.name)},
    type: "${card.type}",
    race: "${card.race}",
${extraFields}
${canEquipStr}${getValidTargetsStr}    ${card.canActivate.toString()},

    ${card.onActivate.toString()},

${onStandbyStr}    async execute(context) {
        const { duelState, playerKey, opponentKey, targetData, link, effectUtils } = context;
        return this.onActivate(duelState, playerKey, opponentKey, targetData, link, effectUtils);
    }
};
`;
}

console.log(`Escribiendo ${cardsBatch1.length} cartas de Magias y Trampas de LON...`);
cardsBatch1.forEach(card => {
    const filePath = path.join(targetDir, `c${card.id}.js`);
    fs.writeFileSync(filePath, generateCode(card), 'utf8');
    console.log(`✅ [LON] c${card.id}.js -> ${card.name} (${card.type})`);
});
console.log('✅ Batch 1 de LON completado exitosamente.');
