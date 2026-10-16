/**
 * Ani-Dimension: Controlador de Acciones del Jugador (Invocaciones, Fases, Batalla)
 */
var currentUser = window.currentUser || (window.Session && window.Session.getUser()) || { id: 1, username: 'Admin' };
var isAttackTargetingMode = false;

function safeInspectCardById(cardId) {
    if (typeof window !== 'undefined' && typeof window.inspectCardById === 'function' && window.inspectCardById !== safeInspectCardById) {
        try { window.inspectCardById(cardId); } catch (e) {}
    } else if (typeof inspectCardById === 'function' && inspectCardById !== safeInspectCardById) {
        try { inspectCardById(cardId); } catch (e) {}
    }
}
if (typeof window !== 'undefined' && typeof window.inspectCardById !== 'function') {
    window.inspectCardById = safeInspectCardById;
}
if (typeof inspectCardById === 'undefined') {
    var inspectCardById = safeInspectCardById;
}

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
    const state = window.lastDuelState || (typeof lastDuelState !== 'undefined' ? lastDuelState : null);
    if (!state) return null;
    const localKey = window.localPlayerRoleKey || 'player1';
    return state[localKey] || state.player1;
}

function getRivalDuelPlayer() {
    const state = window.lastDuelState || (typeof lastDuelState !== 'undefined' ? lastDuelState : null);
    if (!state) return null;
    const rivalKey = window.rivalPlayerRoleKey || 'player2';
    return state[rivalKey] || state.player2;
}

function isPlayerTurnActive() {
    const state = window.lastDuelState || (typeof lastDuelState !== 'undefined' ? lastDuelState : null);
    if (!state) return true;
    if (!state.turnPlayer) return true;

    const myUser = (window.Session && window.Session.getUser && window.Session.getUser()) || window.currentUser;
    const myUsername = (myUser && myUser.username) ? String(myUser.username).trim() : '';

    const localKey = window.localPlayerRoleKey || 'player1';
    const localPlayer = state[localKey] || state.player1;
    const rivalKey = window.rivalPlayerRoleKey || 'player2';
    const rivalPlayer = state[rivalKey] || state.player2;

    const turnPlayerLower = String(state.turnPlayer || '').trim().toLowerCase();

    // 1. Si coincide con el username del usuario en sesión
    if (myUsername && turnPlayerLower === myUsername.toLowerCase()) return true;

    // 2. Si coincide con el username del jugador local en el estado
    if (localPlayer && localPlayer.username && turnPlayerLower === String(localPlayer.username).trim().toLowerCase()) return true;

    // 3. En duelos vs NPC, si el rival es el NPC y el turnPlayer no es el NPC, es el turno del jugador local
    const isNpcDuel = !window.location.pathname.includes('pvp') || Boolean(state.player2 && state.player2.npcId);
    if (isNpcDuel) {
        const npcNameLower = (rivalPlayer && rivalPlayer.username ? String(rivalPlayer.username).trim() : '').toLowerCase();
        if (npcNameLower && turnPlayerLower !== npcNameLower) {
            return true;
        }
        if (!npcNameLower && localKey === 'player1') {
            return true;
        }
    }

    return false;
}

// Catálogo de recetas de Fusión OCG oficiales de todas las expansiones
const FUSION_RECIPES = {
    45231177: [34460851, 44287299], // Flame Swordsman: Flame Manipulator + Masaki
    58528964: [32274490, 40826495], // Flame Ghost: Skull Servant + Dissolverock
    17881964: [53293545, 75356564], // Darkfire Dragon: Firegrass + Petit Dragon
    37421579: [36121917, 96851799], // Charubin the Fire Knight: Monster Egg + Hinotama Soul
    70681994: [15480588, 33064647], // Dragoness the Wicked Knight: Armored Lizard + One-Eyed Shield Dragon
    95952802: [90357090, 43500484], // Flower Wolf: Silver Fang + Darkworld Thorns
    66889139: [6368038, 28279543],  // Gaia the Dragon Champion: Gaia + Curse of Dragon
    1641882:  [38142739, 30451366], // Fusionist: Petit Angel + Mystical Sheep #2
    54541900: [56342351, 92731455], // Karbonala Warrior: M-Warrior #1 + M-Warrior #2
    9293977:  [29172562, 55444629], // Metal Dragon: Steel Ogre Grotto #1 + Lesser Dragon
    23995346: [89631139, 89631139, 89631139], // Blue-Eyes Ultimate Dragon: 3x Blue-Eyes White Dragon
    11901678: [70781052, 1621203],  // B. Skull Dragon: Summoned Skull + Red-Eyes B. Dragon
    90660762: [99267150, 1621203],  // Meteor B. Dragon: Meteor Dragon + Red-Eyes B. Dragon
    54719828: [31709826, 31709826], // Twin-Headed Thunder Dragon: 2x Thunder Dragon
    63519819: [41420027, 64631466], // Thousand-Eyes Restrict: Relinquished + Thousand-Eyes Idol
    74157028: [70095154, 70095154], // Cyber Twin Dragon: 2x Cyber Dragon
    51828629: [45895206, 5628232],  // Giltia the D. Knight
    94905343: [38942059, 30113682], // Rabid Horseman: Battle Ox + Mystic Horseman
    89127526: [40814987, 88819587], // Cyber Saurus
    74701381: [83678828, 47922711], // Punished Eagle
    2504891:  [88279736, 13429800], // Skull Knight
    96890582: [39131963, 7670928],  // Dark Balter the Terrible
    49868263: [42035044, 91559748], // Ryu Senshi
    2971090:  [7892346, 50259460],  // Fiend Skull Dragon
    53527835: [78010363, 14851496], // Sanwitch
    85637910: [53724621, 6588580],  // Reaper on the Nightmare
    13722870: [46986414, 45231177], // Dark Flare Knight
    90140980: [1249315, 79335209, 42941114], // Ojama King
    13756293: [78984772, 88472456], // King Dragun
    27134689: [87801965, 22609617], // Master of Oz
    87717231: [81480460, 46970027], // Gatling Dragon
    67371383: [68516705, 75889523], // Amphibian Beast
    25655502: [85639257, 52040212], // Bickuribox
    15237615: [403847, 56342351],   // Empress Judge
    56907389: [7670542, 60883831],  // Musician King
    28593363: [2181725, 49771608],  // Deepsea Shark
    19066538: [14851496, 68516705], // Roaring Ocean Snake
    95194279: [95744531, 23075566], // Kwagar Hercules
    9653271:  [43230671, 2863439],  // Kaminari Attack
    33691040: [80516004, 87322377], // Pragtical
    99551425: [87564352, 99173029], // Labyrinth Tank
    32355828: [68516705, 32274490], // Skelgon
    3366982:  [64428736, 33950246], // Alligator's Sword Dragon
    21175632: [57935010, 6564655],  // Saint Joan
    4818389:  [5818798, 77207191]   // Chimera the Flying Mythical Beast
};

// Catálogo de Magias de Ritual OCG y Monstruos requeridos
const RITUAL_RECIPES = {
    55761792: { monsterId: 5405694, minStars: 8, name: 'Soldado del Brillo Negro (Black Luster Soldier)' },
    60365591: { monsterId: 82301904, minStars: 8, name: 'Shinato, Rey de un Plano Superior' },
    41426869: { monsterId: 64631466, minStars: 1, name: 'Renunciado (Relinquished)' },
    6920770:  { monsterId: 97642679, minStars: 8, name: 'Dark Master - Zorc' },
    43694075: { monsterId: 25833572, minStars: 7, name: 'Guardián Calavera (Skull Guardian)' },
    94377247: { monsterId: 49064413, minStars: 8, name: 'La Bestia Enmascarada (The Masked Beast)' },
    43417563: { monsterId: 4849037, minStars: 6, name: 'Danza de Espadas (Performance of Sword)' },
    80811661: { monsterId: 30243662, minStars: 6, name: 'Hamburguesa Hambrienta (Hungry Burger)' },
    76806714: { monsterId: 91782589, minStars: 8, name: 'Tortuga Cangrejo (Crab Turtle)' },
    39399268: { monsterId: 40267580, minStars: 7, name: 'Chakra' },
    78577570: { monsterId: 61236371, minStars: 7, name: 'Garma Sword' },
    54539105: { monsterId: 33951077, minStars: 7, name: 'Súper León de Guerra (Super War-Lion)' },
    81933259: { monsterId: 10202894, minStars: 6, name: "Espejo del Demonio (Fiend's Mirror)" },
    31066283: { monsterId: 99721536, minStars: 6, name: 'Dokurorider' },
    77454922: { monsterId: 62337484, minStars: 7, name: 'Ballena Fortaleza (Fortress Whale)' },
    41182875: { monsterId: 41190105, minStars: 8, name: 'Escarabajo Jabalina (Javelin Beetle)' },
    81756897: { monsterId: 69123138, minStars: 8, name: 'Zera The Mant' },
    76792184: { monsterId: 46411259, minStars: 7, name: 'Reshef, el Ser Oscuro (Reshef the Dark Being)' }
};

function checkCardActivationEligibility(cardObj, location = 'HAND') {
    if (!cardObj || !lastDuelState) return { canActivate: false, reason: 'Estado de duelo no disponible' };
    const numId = Number(cardObj.id || cardObj.card_id || cardObj);
    const cd = cardObj.card_data || cardObj;

    const typeNum = Number(cd.typeCode || (typeof cd.type === 'number' ? cd.type : 0));
    const typeStr = typeof cd.type === 'string' ? cd.type : '';
    const raceStr = typeof cd.race === 'string' ? cd.race : '';
    const attrStr = typeof cd.attribute === 'string' ? cd.attribute.toUpperCase() : '';

    const isSpell = (typeNum & 0x2) !== 0 || typeStr.includes('Spell') || attrStr === 'SPELL' || raceStr === 'Spell';
    const isTrap = (typeNum & 0x4) !== 0 || typeStr.includes('Trap') || attrStr === 'TRAP' || raceStr === 'Trap';
    const isQuickPlay = (typeNum & 0x10000) !== 0 || raceStr === 'Quick-Play' || typeStr.includes('Quick-Play');
    const isEquip = (typeNum & 0x40000) !== 0 || raceStr === 'Equip' || typeStr.includes('Equip') || Boolean(cd.isEquip);
    const isField = (typeNum & 0x80000) !== 0 || raceStr === 'Field' || typeStr.includes('Field') || Boolean(cd.isField);
    const isRitualSpell = (typeNum & 0x80) !== 0 || raceStr === 'Ritual' || typeStr.includes('Ritual') || Boolean(RITUAL_RECIPES[numId]);

    const localPlayer = getLocalDuelPlayer();
    const rivalPlayer = getRivalDuelPlayer();
    const isMyTurn = typeof isPlayerTurnActive === 'function' ? isPlayerTurnActive() : true;

    // 0. REGLA OFICIAL OCG: Las cartas mágicas normales, de campo, equipo y continuas se activan en Main Phase 1 o 2
    const curPhase = lastDuelState.phase || 'MAIN_1';
    if (curPhase !== 'MAIN_1' && curPhase !== 'MAIN_2') {
        if (!isTrap && !isQuickPlay && !cardObj.isHandEffect && numId !== 40640057) {
            return { canActivate: false, reason: `Las cartas mágicas solo pueden activarse en Main Phase 1 o 2 (Fase actual: ${curPhase}).` };
        }
    }

    // 1. REGLA OFICIAL OCG: Las cartas de Trampa NUNCA pueden activarse directamente desde la mano
    if (location === 'HAND' && isTrap) {
        return { canActivate: false, reason: 'Las Cartas Trampa deben colocarse (SET) boca abajo en el campo primero.' };
    }

    // 2. REGLA OFICIAL OCG: En el campo, las Trampas NO pueden activarse en el mismo turno en que fueron colocadas
    if (location === 'FIELD' && isTrap) {
        if (cardObj.turnSet === lastDuelState.turnNumber && isMyTurn) {
            return { canActivate: false, reason: 'Las Cartas Trampa no pueden activarse en el mismo turno en que fueron colocadas (SET).' };
        }
    }

    // 3. REGLA OFICIAL OCG: Durante el turno del rival solo se permiten Trampas, Mágicas de Juego Rápido y Efectos de Mano
    if (!isMyTurn) {
        if (!isTrap && !isQuickPlay && !cardObj.isHandEffect && numId !== 40640057) {
            return { canActivate: false, reason: 'Solo puedes activar Cartas de Trampa o Mágicas de Juego Rápido durante el turno del rival.' };
        }
    }

    // 4. Cartas de Equipo: Requiere al menos un monstruo boca arriba COMPATIBLE en el campo (propio o rival)
    if (isEquip) {
        const allFieldMonsters = [
            ...((localPlayer && localPlayer.monsters) || []),
            ...((rivalPlayer && rivalPlayer.monsters) || [])
        ];
        const checkFn = (typeof checkMonsterMeetsEquipCondition === 'function') 
            ? checkMonsterMeetsEquipCondition 
            : (typeof window !== 'undefined' && window.checkMonsterMeetsEquipCondition) 
                ? window.checkMonsterMeetsEquipCondition 
                : null;
        
        const hasCompatibleMonster = allFieldMonsters.some(m => {
            if (!m || m.faceDown || m.position === 'SET') return false;
            if (checkFn) return checkFn(cd, m);
            return true;
        });

        if (!hasCompatibleMonster) {
            return { 
                canActivate: false, 
                reason: `No hay ningún monstruo boca arriba compatible en el campo para equipar "${cd.name || 'esta carta'}".` 
            };
        }
    }

    // 5. Monstruos Unión (Y-Dragon Head y Z-Metal Tank)
    if (numId === 65622692) {
        const isEquippedInSpells = localPlayer && localPlayer.spells && localPlayer.spells.some(s => s && Number(s.card_id || (s.card_data && s.card_data.id)) === 65622692);
        if (isEquippedInSpells) {
            const hasFreeMon = localPlayer && localPlayer.monsters && localPlayer.monsters.some(m => m === null);
            if (!hasFreeMon) return { canActivate: false, reason: 'No tienes casillas de monstruo libres para desequipar a Y-Dragon Head.' };
        } else {
            const hasTargetX = localPlayer && localPlayer.monsters && localPlayer.monsters.some(m => m && !m.faceDown && Number(m.card_id || (m.card_data && m.card_data.id)) === 62651957);
            if (!hasTargetX) return { canActivate: false, reason: 'No controlas ningún "X-Head Cannon" boca arriba para equiparle Y-Dragon Head.' };
            const hasFreeSpell = localPlayer && localPlayer.spells && localPlayer.spells.some(s => s === null);
            if (!hasFreeSpell) return { canActivate: false, reason: 'No tienes casillas de Magia/Trampa libres para colocar la carta de equipo.' };
        }
    }
    if (numId === 64500000) {
        const isEquippedInSpells = localPlayer && localPlayer.spells && localPlayer.spells.some(s => s && Number(s.card_id || (s.card_data && s.card_data.id)) === 64500000);
        if (isEquippedInSpells) {
            const hasFreeMon = localPlayer && localPlayer.monsters && localPlayer.monsters.some(m => m === null);
            if (!hasFreeMon) return { canActivate: false, reason: 'No tienes casillas de monstruo libres para desequipar a Z-Metal Tank.' };
        } else {
            const hasTargetXY = localPlayer && localPlayer.monsters && localPlayer.monsters.some(m => m && !m.faceDown && [62651957, 65622692].includes(Number(m.card_id || (m.card_data && m.card_data.id))));
            if (!hasTargetXY) return { canActivate: false, reason: 'No controlas ningún "X-Head Cannon" ni "Y-Dragon Head" boca arriba para equiparle Z-Metal Tank.' };
            const hasFreeSpell = localPlayer && localPlayer.spells && localPlayer.spells.some(s => s === null);
            if (!hasFreeSpell) return { canActivate: false, reason: 'No tienes casillas de Magia/Trampa libres para colocar la carta de equipo.' };
        }
    }

    // 6. Fusiones de Contacto Ignición (XZ, YZ, XY, XYZ)
    if ([99724761, 99728880].includes(numId)) {
        if (!localPlayer || !localPlayer.hand || localPlayer.hand.length === 0) {
            return { canActivate: false, reason: 'Debes tener al menos 1 carta en tu mano para descartar como costo.' };
        }
        const hasFacedownST = rivalPlayer && rivalPlayer.spells && rivalPlayer.spells.some(s => s && (s.faceDown || s.position === 'SET'));
        if (!hasFacedownST) {
            return { canActivate: false, reason: 'El adversario no tiene Cartas Mágicas o de Trampa boca abajo (SET).' };
        }
    }
    if ([25119460, 77622396].includes(numId)) {
        if (!localPlayer || !localPlayer.hand || localPlayer.hand.length === 0) {
            return { canActivate: false, reason: 'Debes tener al menos 1 carta en tu mano para descartar como costo.' };
        }
        const hasFacedownMon = rivalPlayer && rivalPlayer.monsters && rivalPlayer.monsters.some(m => m && (m.faceDown || m.position === 'SET'));
        if (!hasFacedownMon) {
            return { canActivate: false, reason: 'El adversario no tiene Monstruos boca abajo (SET).' };
        }
    }
    if (numId === 2111707) {
        if (!localPlayer || !localPlayer.hand || localPlayer.hand.length === 0) {
            return { canActivate: false, reason: 'Debes tener al menos 1 carta en tu mano para descartar como costo.' };
        }
        const hasFaceupST = (rivalPlayer && rivalPlayer.spells && rivalPlayer.spells.some(s => s && !s.faceDown && s.position !== 'SET')) || (rivalPlayer && rivalPlayer.fieldSpell);
        if (!hasFaceupST) {
            return { canActivate: false, reason: 'El adversario no tiene Cartas Mágicas o de Trampa boca arriba.' };
        }
    }
    if ([91998119, 99261403].includes(numId)) {
        if (!localPlayer || !localPlayer.hand || localPlayer.hand.length === 0) {
            return { canActivate: false, reason: 'Debes tener al menos 1 carta en tu mano para descartar como costo.' };
        }
        const hasAnyCard = (rivalPlayer && rivalPlayer.monsters && rivalPlayer.monsters.some(m => m !== null)) 
            || (rivalPlayer && rivalPlayer.spells && rivalPlayer.spells.some(s => s !== null)) 
            || (rivalPlayer && rivalPlayer.fieldSpell);
        if (!hasAnyCard) {
            return { canActivate: false, reason: 'El adversario no controla ninguna carta en el campo.' };
        }
    }

    // 7. Cartas Mágicas / Trampas de los Seis Samuráis
    // Gateway of the Six (27970830): en campo requiere al menos 2 contadores de Bushido
    if (numId === 27970830 && location === 'FIELD') {
        const counters = Number(cardObj.bushidoCounters || (cardObj.card_data && cardObj.card_data.bushidoCounters) || 0);
        if (counters < 2) {
            return { canActivate: false, reason: 'Puerta de los Seis Samuráis requiere al menos 2 Contadores de Bushido para activar cualquiera de sus efectos.' };
        }
    }
    // Six Samurai United (72345736): en campo requiere al menos 1 contador de Bushido
    if (numId === 72345736 && location === 'FIELD') {
        const counters = Number(cardObj.bushidoCounters || (cardObj.card_data && cardObj.card_data.bushidoCounters) || 0);
        if (counters < 1) {
            return { canActivate: false, reason: 'Unidos a los Seis Samuráis requiere al menos 1 Contador de Bushido para enviar al Cementerio y robar.' };
        }
    }
    // Six Scrolls of the Samurai (54913680): en campo requiere al menos 2 contadores de Bushido
    if (numId === 54913680 && location === 'FIELD') {
        const counters = Number(cardObj.bushidoCounters || (cardObj.card_data && cardObj.card_data.bushidoCounters) || 0);
        if (counters < 2) {
            return { canActivate: false, reason: 'Pergaminos de los Seis Samuráis requiere al menos 2 Contadores de Bushido.' };
        }
    }
    // Cunning of the Six Samurai (27178262): requiere 1 Six Samurai en tu campo y 1 Six Samurai en GY
    if (numId === 27178262) {
        const hasSixSamField = localPlayer && localPlayer.monsters && localPlayer.monsters.some(m => m && !m.faceDown && ((m.card_data?.name || '').toLowerCase().includes('six samurai') || (m.card_data?.name || '').toLowerCase().includes('seis samur')));
        const hasSixSamGY = [...((localPlayer && localPlayer.graveyard) || []), ...((rivalPlayer && rivalPlayer.graveyard) || [])].some(c => c && ((c.name || c.card_data?.name || '').toLowerCase().includes('six samurai') || (c.name || c.card_data?.name || '').toLowerCase().includes('seis samur')));
        if (!hasSixSamField) {
            return { canActivate: false, reason: 'Astucia de los Seis Samuráis requiere enviar al Cementerio 1 monstruo "Seis Samuráis" boca arriba que controles.' };
        }
        if (!hasSixSamGY) {
            return { canActivate: false, reason: 'Astucia de los Seis Samuráis requiere al menos 1 "Seis Samuráis" en cualquier Cementerio para revivir.' };
        }
    }

    // =========================================================================
    // REGLAS GENERALIZADAS DE REQUISITOS DE ACTIVACIÓN OCG
    // Si la carta no cumple sus condiciones/costos/objetivos, NO se permite activar
    // =========================================================================
    const descLower = (cd.desc || cd.description || '').toLowerCase();
    const myMonsters = (localPlayer && localPlayer.monsters) || [];
    const rivalMonsters = (rivalPlayer && rivalPlayer.monsters) || [];
    const mySpells = (localPlayer && localPlayer.spells) || [];
    const rivalSpells = (rivalPlayer && rivalPlayer.spells) || [];
    const myGy = (localPlayer && localPlayer.graveyard) || [];
    const rivalGy = (rivalPlayer && rivalPlayer.graveyard) || [];
    const myHand = (localPlayer && localPlayer.hand) || [];
    const myLp = Number(localPlayer && localPlayer.lp !== undefined ? localPlayer.lp : 8000);

    // 8. Contra-Trampas (Counter Trap): en campo requieren responder a una cadena
    const isCounterTrap = (typeNum & 0x100000) !== 0 || raceStr === 'Counter' || typeStr.includes('Counter');
    if (location === 'FIELD' && isCounterTrap) {
        const isChainPrompt = typeof isChainWindowActive === 'function' && isChainWindowActive();
        if (!isChainPrompt && !lastDuelState.currentChain && !lastDuelState.isChaining) {
            return { canActivate: false, reason: 'Las Contra-Trampas solo pueden activarse en respuesta a una activación de carta o efecto (Cadena).' };
        }
    }

    // 9. Costos de Descarte desde Mano
    const requiresDiscard1 = descLower.includes('discard 1 card') || descLower.includes('descarta 1 carta') || descLower.includes('send 1 card from your hand') || [79759861, 77414722, 2111707, 33184167].includes(numId);
    if (requiresDiscard1) {
        const minCardsNeeded = location === 'HAND' ? 2 : 1;
        if (myHand.length < minCardsNeeded) {
            return { canActivate: false, reason: 'Debes tener al menos 1 carta en tu mano para descartar como costo.' };
        }
    }
    const requiresDiscard2 = descLower.includes('discard 2 cards') || descLower.includes('descarta 2 cartas');
    if (requiresDiscard2) {
        const minCardsNeeded = location === 'HAND' ? 3 : 2;
        if (myHand.length < minCardsNeeded) {
            return { canActivate: false, reason: 'Debes tener al menos 2 cartas en tu mano para descartar como costo.' };
        }
    }
    const requiresDiscard5 = descLower.includes('discard 5 cards') || numId === 18591904;
    if (requiresDiscard5) {
        const minCardsNeeded = location === 'HAND' ? 6 : 5;
        if (myHand.length < minCardsNeeded) {
            return { canActivate: false, reason: 'Debes tener al menos 5 cartas en tu mano para descartar como costo.' };
        }
    }

    // 10. Costos de Life Points
    if (descLower.includes('pay 1000') || [3819470, 44763025, 17375316].includes(numId)) {
        if (myLp <= 1000) return { canActivate: false, reason: 'No tienes suficientes Life Points para pagar el costo de 1000 LP.' };
    }
    if (descLower.includes('pay 2000') || [23557835, 79575620].includes(numId)) {
        if (myLp <= 2000) return { canActivate: false, reason: 'No tienes suficientes Life Points para pagar el costo de 2000 LP.' };
    }
    if (descLower.includes('pay 800') || numId === 70828912) {
        if (myLp <= 800) return { canActivate: false, reason: 'No tienes suficientes Life Points para pagar el costo de 800 LP.' };
    }
    if (descLower.includes('pay half') || numId === 41420027) {
        if (myLp <= 1) return { canActivate: false, reason: 'No tienes suficientes Life Points.' };
    }

    // 11. Requisito de Monstruos Rivales en Campo
    const targetsOpponentMonster = descLower.includes('destroy 1 monster your opponent controls') ||
        descLower.includes('destroy all monsters your opponent controls') ||
        descLower.includes('destruye todos los monstruos en posición de ataque') ||
        descLower.includes('face-up monster your opponent controls with the lowest atk') ||
        descLower.includes('face-up monster with the highest def') ||
        descLower.includes('take control of 1 monster your opponent controls') ||
        [66788016, 12580477, 44095762, 97168727, 4031928, 25880422, 63102017].includes(numId);

    if (targetsOpponentMonster) {
        const oppMonsterCount = rivalMonsters.filter(m => m !== null).length;
        if (oppMonsterCount === 0) {
            return { canActivate: false, reason: 'El adversario no controla ningún monstruo en el campo para ser objetivo.' };
        }

        // Monstruos en Ataque
        if ((descLower.includes('attack position') || numId === 44095762 || numId === 25880422) && !descLower.includes('change to face-up attack')) {
            const hasAtkMonster = rivalMonsters.some(m => m && m.position === 'ATK' && !m.faceDown);
            if (!hasAtkMonster) {
                return { canActivate: false, reason: 'El adversario no controla monstruos en Posición de Ataque boca arriba.' };
            }
        }
        // Monstruos en Defensa
        if ((descLower.includes('defense position') || numId === 63102017) && (descLower.includes('change') || descLower.includes('destroy 1 defense'))) {
            const hasDefMonster = rivalMonsters.some(m => m && (m.position === 'DEF' || m.position === 'SET' || m.faceDown === true));
            if (!hasDefMonster) {
                return { canActivate: false, reason: 'El adversario no controla monstruos en Posición de Defensa.' };
            }
        }
    }

    // 12. Requisito de Magias / Trampas en Campo
    const targetsSpellTrap = (descLower.includes('destroy 1 spell') || descLower.includes('destroy 1 trap') || descLower.includes('destroy all spell') || [19159413, 51482758, 19613556, 42703248].includes(numId)) && !descLower.includes('monster');
    if (targetsSpellTrap) {
        const anySpellOnField = [...mySpells, ...rivalSpells].some(s => s !== null && s !== cardObj) || (localPlayer && localPlayer.fieldSpell) || (rivalPlayer && rivalPlayer.fieldSpell);
        if (!anySpellOnField) {
            return { canActivate: false, reason: 'No hay Cartas Mágicas o de Trampa en el campo para seleccionar como objetivo.' };
        }
    }

    // 13. Requisito de Monstruos / Cartas en Cementerio
    const targetsGraveyard = descLower.includes('target 1 monster in your graveyard') ||
        descLower.includes('special summon 1 monster from your graveyard') ||
        descLower.includes('special summon 1 monster from either player\'s graveyard') ||
        [83764718, 70828912, 97077563, 43434803, 31560081, 28933734, 5758500, 82542267].includes(numId);

    if (targetsGraveyard) {
        const isMonsterCardSafe = (c) => {
            if (!c) return false;
            const tCode = Number(c.type || (c.card_data && c.card_data.type) || 0);
            if ((tCode & 0x1) !== 0) return true;
            const tStr = typeof c.type === 'string' ? c.type : (c.card_data && typeof c.card_data.type === 'string' ? c.card_data.type : '');
            return tStr.includes('Monster') || c.atk !== undefined || (c.card_data && c.card_data.atk !== undefined);
        };
        const anyMonsterInGy = [...myGy, ...rivalGy].some(isMonsterCardSafe);
        const anyCardInGy = [...myGy, ...rivalGy].length > 0;
        if (!anyCardInGy) {
            return { canActivate: false, reason: 'No hay cartas en los Cementerios para seleccionar como objetivo.' };
        }
        if (numId === 83764718 || numId === 70828912 || numId === 43434803) {
            if (!anyMonsterInGy) {
                return { canActivate: false, reason: 'No hay monstruos en ningún Cementerio para Invocar de Modo Especial.' };
            }
        }
        if (numId === 82542267) {
            const oppMonsterInGy = rivalGy.some(isMonsterCardSafe);
            if (!oppMonsterInGy) {
                return { canActivate: false, reason: 'No hay monstruos en el Cementerio del adversario para desterrar con "Gravedigger Ghoul".' };
            }
        }
    }

    // 13.5 Requisito de Efecto de Mano de Dragón de Trueno
    if (numId === 31786629) {
        const myDeck = (localPlayer && localPlayer.deck) || [];
        const hasCopy = myDeck.some(c => Number(c.card_id || c.id || (c.card_data && c.card_data.id)) === 31786629);
        if (!hasCopy) {
            return { canActivate: false, reason: 'No quedan copias de "Dragón de Trueno" en tu Deck para buscar.' };
        }
    }

    // 14. Requisito de Tributo Propio (Share the Pain, etc.)
    if (numId === 56830749) { // Share the Pain
        const myMonCount = myMonsters.filter(m => m !== null).length;
        const oppMonCount = rivalMonsters.filter(m => m !== null).length;
        if (myMonCount === 0 || oppMonCount === 0) {
            return { canActivate: false, reason: 'Ambos jugadores deben controlar al menos 1 monstruo para activar "Compartir el Dolor".' };
        }
    }

    // 15. Requisito de Cartas en Deck (Pot of Greed, etc.)
    if (numId === 55144522 || (descLower.includes('draw 2 cards') && !descLower.includes('during your next'))) {
        const deckCount = (localPlayer && localPlayer.deck) ? localPlayer.deck.length : 0;
        if (deckCount < 2) {
            return { canActivate: false, reason: 'Tu Deck no tiene suficientes cartas para robar 2 cartas.' };
        }
    }

    // 16. Dragon's Gunfire (55991637): Requiere controlar al menos 1 monstruo Dragón boca arriba
    if (numId === 55991637) {
        const hasDragon = myMonsters.some(m => {
            if (!m || m.faceDown) return false;
            const cd = m.card_data || m;
            const race = (cd.race || '').toLowerCase();
            const raceCode = Number(cd.raceCode || 0);
            return (raceCode & 0x2000) !== 0 || race.includes('dragon') || race.includes('dragón');
        });
        if (!hasDragon) {
            return { canActivate: false, reason: 'Debes controlar al menos 1 monstruo de Tipo Dragón boca arriba en el campo.' };
        }
    }

    // 17. Pyramid Energy (76754619): Requiere controlar al menos 1 monstruo boca arriba
    if (numId === 76754619) {
        const hasFaceupMon = myMonsters.some(m => m && !m.faceDown);
        if (!hasFaceupMon) {
            return { canActivate: false, reason: 'Debes controlar al menos 1 monstruo boca arriba en tu campo para aplicar la energía.' };
        }
    }

    // 18. Six Strike - Triple Impact (81426505): Requiere al menos 3 monstruos "Six Samurai" boca arriba
    if (numId === 81426505) {
        const sixSamCount = myMonsters.filter(m => m && !m.faceDown && ((m.card_data?.name || m.name || '').toLowerCase().includes('six samurai') || (m.card_data?.name || m.name || '').toLowerCase().includes('seis samur'))).length;
        if (sixSamCount < 3) {
            return { canActivate: false, reason: 'Debes controlar al menos 3 monstruos "Seis Samuráis" boca arriba en el campo.' };
        }
    }

    // 19. Gladiator Taming (9780364): Requiere al menos 1 monstruo "Gladiator Beast" boca arriba en el campo
    if (numId === 9780364) {
        const allMons = [...myMonsters, ...rivalMonsters];
        const hasGladBeast = allMons.some(m => m && !m.faceDown && ((m.card_data?.name || m.name || '').toLowerCase().includes('gladiator beast') || (m.card_data?.name || m.name || '').toLowerCase().includes('bestia gladiad')));
        if (!hasGladBeast) {
            return { canActivate: false, reason: 'Debe haber al menos 1 monstruo "Bestia Gladiador" boca arriba en el campo.' };
        }
    }

    // 20. Contact with the Aquamirror (10925955): Requiere al menos 1 monstruo de AGUA en Cementerio
    if (numId === 10925955) {
        const hasWaterGY = (localPlayer && localPlayer.graveyard) ? localPlayer.graveyard.some(c => c && (
            c.attribute === 'WATER' || 
            c.attributeCode === 0x2 || 
            c.card_data?.attribute === 'WATER' || 
            (c.card_data?.desc || '').toLowerCase().includes('water')
        )) : false;
        if (!hasWaterGY) {
            return { canActivate: false, reason: 'Debes tener al menos 1 monstruo de AGUA en tu Cementerio.' };
        }
    }

    // 21. Vylon Matter (41858121): Requiere al menos 1 Carta Mágica de Equipo en Cementerio
    if (numId === 41858121) {
        const hasEquipGY = (localPlayer && localPlayer.graveyard) ? localPlayer.graveyard.some(c => c && (
            (c.type && c.type.includes('Equip')) || 
            (c.card_data?.type && c.card_data.type.includes('Equip')) || 
            c.isEquip
        )) : false;
        if (!hasEquipGY) {
            return { canActivate: false, reason: 'Debes tener al menos 1 Carta Mágica de Equipo en tu Cementerio.' };
        }
    }

    // 22. Six Strike - Thunder Blast (23212990): Requiere que el oponente controle al menos 1 carta
    if (numId === 23212990) {
        const oppCards = [...rivalMonsters, ...(rivalPlayer?.spells || [])].filter(c => c !== null);
        if (oppCards.length === 0) {
            return { canActivate: false, reason: 'El oponente debe controlar al menos 1 carta en su campo.' };
        }
    }

    // 23. Half or Nothing (15552258): Requiere Battle Phase y monstruos rivales
    if (numId === 15552258) {
        const phase = lastDuelState ? (lastDuelState.phase || '').toUpperCase() : '';
        const oppHasMons = rivalMonsters.some(m => m !== null);
        if (phase !== 'BATTLE' || !oppHasMons) {
            return { canActivate: false, reason: 'Solo se puede activar durante la Battle Phase del adversario mientras controle monstruos.' };
        }
    }

    // 24. Changing Destiny (24673894): Requiere Battle Phase y ataque declarado
    if (numId === 24673894) {
        const phase = lastDuelState ? (lastDuelState.phase || '').toUpperCase() : '';
        const oppHasAtk = rivalMonsters.some(m => m && m.position === 'ATK' && !m.faceDown);
        if (phase !== 'BATTLE' || !oppHasAtk) {
            return { canActivate: false, reason: 'Solo se puede activar cuando un monstruo del adversario declara un ataque.' };
        }
    }

    // 25. Kunai with Chain (37390589): Requiere monstruo propio boca arriba o ataque rival
    if (numId === 37390589) {
        const hasMyFaceup = myMonsters.some(m => m && !m.faceDown);
        const oppHasAtk = rivalMonsters.some(m => m && m.position === 'ATK' && !m.faceDown);
        if (!hasMyFaceup && !oppHasAtk) {
            return { canActivate: false, reason: 'Debes controlar al menos 1 monstruo boca arriba o haber un ataque declarado.' };
        }
    }

    // 26. Polymerization (24094653): Requiere tener monstruos de Fusión en Extra Deck y materiales disponibles
    if (numId === 24094653) {
        const fusionCheck = typeof window.checkCanPerformFusion === 'function' 
            ? window.checkCanPerformFusion(false) 
            : (typeof checkCanPerformFusion === 'function' ? checkCanPerformFusion(false) : null);
        if (fusionCheck && !fusionCheck.canFusion) {
            return { canActivate: false, reason: fusionCheck.reason || 'No tienes los materiales necesarios o monstruos de Fusión en tu Extra Deck.' };
        }
    }

    // 27. Card Destruction (72892473): Al menos 1 jugador debe tener cartas en mano y ambos tener suficientes en Deck
    if (numId === 72892473) {
        const p1HandDiscard = location === 'HAND' ? (myHand.length - 1) : myHand.length;
        const p2HandDiscard = (rivalPlayer && rivalPlayer.hand) ? rivalPlayer.hand.length : 0;
        if (p1HandDiscard <= 0 && p2HandDiscard <= 0) {
            return { canActivate: false, reason: 'Ningún jugador tiene cartas en su mano para descartar.' };
        }
        const p1DeckCount = (localPlayer && localPlayer.deck) ? localPlayer.deck.length : (localPlayer && localPlayer.mainDeckCount !== undefined ? localPlayer.mainDeckCount : 99);
        const p2DeckCount = (rivalPlayer && rivalPlayer.deck) ? rivalPlayer.deck.length : (rivalPlayer && rivalPlayer.mainDeckCount !== undefined ? rivalPlayer.mainDeckCount : 99);
        if (p1HandDiscard > p1DeckCount || p2HandDiscard > p2DeckCount) {
            return { canActivate: false, reason: 'Un jugador no tiene suficientes cartas en su Deck para robar.' };
        }
    }

    // 28. Gravedigger Ghoul (82542267): Requiere al menos 1 monstruo en el Cementerio del rival
    if (numId === 82542267) {
        const oppMonInGY = (rivalPlayer && rivalPlayer.graveyard) ? rivalPlayer.graveyard.some(c => {
            if (!c) return false;
            const tCode = Number(c.type || (c.card_data && c.card_data.type) || 0);
            if ((tCode & 0x1) !== 0) return true;
            const tStr = typeof c.type === 'string' ? c.type.toLowerCase() : '';
            return tStr.includes('monster') || (c.atk !== undefined && c.atk !== null);
        }) : false;
        if (!oppMonInGY) {
            return { canActivate: false, reason: 'El Cementerio de tu adversario no contiene ninguna Carta de Monstruo.' };
        }
    }

    return { canActivate: true };
}

function canActivateMonsterEffectOnField(monsterObj) {
    if (!monsterObj || monsterObj.faceDown) return { canActivate: false, reason: 'El monstruo está boca abajo.' };
    if (monsterObj.hasUsedEffect) return { canActivate: false, reason: 'Ya has usado el efecto de este monstruo en este turno.' };
    const curState = (typeof window !== 'undefined' && window.lastDuelState) || (typeof lastDuelState !== 'undefined' ? lastDuelState : null);
    if (!curState) return { canActivate: false, reason: 'Estado de duelo no disponible.' };

    const phase = curState.phase || 'MAIN_1';
    if (phase !== 'MAIN_1' && phase !== 'MAIN_2') {
        return { canActivate: false, reason: `Los efectos de monstruo de ignición solo pueden activarse durante la Main Phase 1 o 2 (Fase actual: ${phase}).` };
    }

    const isMyTurn = typeof isPlayerTurnActive === 'function' ? isPlayerTurnActive() : true;
    if (!isMyTurn) {
        return { canActivate: false, reason: 'Solo puedes activar efectos de ignición durante tu propio turno.' };
    }

    const cardData = monsterObj.card_data || {};
    const numId = Number(monsterObj.card_id || cardData.id || 0);
    const type = (cardData.type || '').toLowerCase();

    // 1. Si es Normal o no tiene efecto
    if (type.includes('normal') && !type.includes('effect')) {
        return { canActivate: false, reason: 'Los monstruos normales no tienen efectos activables.' };
    }

    // 2. Monstruos sin ignición manual en campo (Flip, Continuos, Gatillos o pasivos)
    if (cardData.hasIgnitionEffect === false || cardData.isVictoryCondition || cardData.isContinuous || cardData.isPassive) {
        return { canActivate: false, reason: 'Este monstruo no posee un efecto de ignición manual en campo.' };
    }

    if (type.includes('flip')) {
        return { canActivate: false, reason: 'Los efectos de volteo se activan automáticamente al voltear el monstruo.' };
    }

    if (type.includes('continuous') || type.includes('pasivo') || type.includes('passive')) {
        return { canActivate: false, reason: 'Los efectos continuos se aplican de forma pasiva en el campo.' };
    }

    // Regla Oficial Konami OCG: Un monstruo en campo SOLO posee efecto de ignición si se declara explícitamente
    const hasIgnition = cardData.hasIgnitionEffect === true || (Array.isArray(cardData.effectOptions) && cardData.effectOptions.length > 0);
    if (!hasIgnition) {
        return { canActivate: false, reason: 'El efecto de esta carta es continuo o pasivo y no se activa manualmente.' };
    }

    // Si el módulo de la carta define una verificación de activación personalizada, respetarla
    if (typeof cardData.canActivate === 'function') {
        const customCheck = cardData.canActivate({ duelState: curState, playerKey: isMyTurn ? 'player1' : 'player2' });
        if (customCheck && customCheck.canActivate === false) {
            return customCheck;
        }
    }

    return { canActivate: true };
}

function setSummonMode(mode) {
    currentSummonMode = mode;
    const btnAtk = document.getElementById('btn-mode-atk');
    const btnDef = document.getElementById('btn-mode-def');
    if (btnAtk && btnDef) {
        if (mode === 'ATK') {
            btnAtk.style.borderColor = '#00f0ff';
            btnAtk.style.background = 'rgba(0, 240, 255, 0.28)';
            btnDef.style.borderColor = 'rgba(255, 215, 0, 0.35)';
            btnDef.style.background = 'rgba(255, 215, 0, 0.12)';
        } else {
            btnDef.style.borderColor = '#ffd700';
            btnDef.style.background = 'rgba(255, 215, 0, 0.28)';
            btnAtk.style.borderColor = 'rgba(0, 240, 255, 0.35)';
            btnAtk.style.background = 'rgba(0, 240, 255, 0.12)';
        }
    }
}

function highlightAvailableSlots(enable, isMonsterCard, isFieldSpell = false) {
    const local = getLocalDuelPlayer();
    if (!local) return;
    for (let i = 0; i < 5; i++) {
        const slotM = document.getElementById(`p-m${i}`);
        if (slotM) {
            if (enable && isMonsterCard && (!local.monsters || !local.monsters[i])) {
                slotM.classList.add('slot-droppable');
            } else {
                slotM.classList.remove('slot-droppable');
            }
        }
        const slotS = document.getElementById(`p-s${i}`);
        if (slotS) {
            if (enable && !isMonsterCard && !isFieldSpell && (!local.spells || !local.spells[i])) {
                slotS.classList.add('slot-droppable');
            } else {
                slotS.classList.remove('slot-droppable');
            }
        }
    }
    const slotCampo = document.getElementById('p-campo');
    if (slotCampo) {
        if (enable && isFieldSpell) {
            slotCampo.classList.add('slot-droppable');
        } else {
            slotCampo.classList.remove('slot-droppable');
        }
    }
}
if (typeof window !== 'undefined') window.canActivateMonsterEffectOnField = canActivateMonsterEffectOnField;

        // =========================================================================
        // MENÚ CONTEXTUAL DINÁMICO DE ACCIONES
        // =========================================================================
        function showContextMenu(e, title, actions) {
            const menu = document.getElementById('context-action-menu');
            const titleElem = document.getElementById('context-menu-title');
            const btnsContainer = document.getElementById('context-menu-buttons');
            if (!menu || !titleElem || !btnsContainer) return;

            titleElem.textContent = title;
            btnsContainer.innerHTML = '';

            actions.forEach(act => {
                const btn = document.createElement('button');
                btn.className = 'context-btn';
                btn.textContent = act.label;
                btn.onclick = (event) => {
                    if (event) event.stopPropagation();
                    hideContextMenu();
                    act.onClick();
                };
                btnsContainer.appendChild(btn);
            });

            // Posicionamiento inteligente sobre la carta clickeada
            const clientX = (e && typeof e.clientX === 'number') ? e.clientX : (window.innerWidth / 2 - 80);
            const clientY = (e && typeof e.clientY === 'number') ? e.clientY : (window.innerHeight / 2 - 50);

            const estimatedHeight = actions.length * 34 + 35;
            let topPos = clientY - estimatedHeight - 12;
            if (topPos < 10) {
                topPos = Math.min(clientY + 12, window.innerHeight - estimatedHeight - 10);
            }
            const leftPos = Math.max(10, Math.min(clientX - 50, window.innerWidth - 220));

            menu.style.left = `${leftPos}px`;
            menu.style.top = `${topPos}px`;
            menu.style.zIndex = '999999';
            menu.style.display = 'flex';
        }

        function hideContextMenu() {
            const menu = document.getElementById('context-action-menu');
            if (menu) menu.style.display = 'none';
        }

        document.addEventListener('click', () => hideContextMenu());

        // =========================================================================
        // SELECCIÓN LIBRE DE MANO & MENÚ CONTEXTUAL DE ACCIÓN
        // =========================================================================
        function selectHandCard(index, cardId, event = null) {
            selectedHandCardIndex = index;
            selectedHandCardId = cardId;

            // Iluminar la carta seleccionada en la mano con contorno dorado
            document.querySelectorAll('.hand-card').forEach((c, idx) => {
                if (idx === index) c.classList.add('selected-hand');
                else c.classList.remove('selected-hand');
            });

            const localPlayer = getLocalDuelPlayer();
            const rivalPlayer = getRivalDuelPlayer();
            const cardObj = localPlayer && localPlayer.hand 
                ? ((cardId ? localPlayer.hand.find(c => c && Number(c.id || c.card_id || (c.card_data && c.card_data.id)) === Number(cardId)) : null) || localPlayer.hand[index]) 
                : null;
            if (cardObj && localPlayer && localPlayer.hand) {
                const foundIdx = localPlayer.hand.indexOf(cardObj);
                if (foundIdx !== -1) selectedHandCardIndex = foundIdx;
            }
            const cd = (cardObj && (cardObj.card_data || cardObj)) || {};
            const typeNum = Number(cd.typeCode || (typeof cd.type === 'number' ? cd.type : 0));
            const typeStr = typeof cd.type === 'string' ? cd.type : (typeof cardObj?.type === 'string' ? cardObj.type : '');
            const raceStr = typeof cd.race === 'string' ? cd.race : (typeof cardObj?.race === 'string' ? cardObj.race : '');
            const attrStr = typeof cd.attribute === 'string' ? cd.attribute.toUpperCase() : '';

            const isSpell = (typeNum & 0x2) !== 0 || typeStr.includes('Spell') || attrStr === 'SPELL' || raceStr === 'Spell';
            const isTrap = (typeNum & 0x4) !== 0 || typeStr.includes('Trap') || attrStr === 'TRAP' || raceStr === 'Trap';
            const isMonsterCard = !isSpell && !isTrap;
            const isEquip = (typeNum & 0x40000) !== 0 || raceStr === 'Equip' || typeStr.includes('Equip') || Boolean(cd.isEquip);
            const isFieldSpell = (typeNum & 0x80000) !== 0 || raceStr === 'Field' || typeStr.includes('Field') || Boolean(cd.isField);

            if (isSpell || isTrap) {
                currentSummonMode = 'DEF';
            } else {
                currentSummonMode = 'ATK';
            }

            const state = window.lastDuelState || (typeof lastDuelState !== 'undefined' ? lastDuelState : null);
            const myUsername = (window.Session && window.Session.getUser() && window.Session.getUser().username) 
                || (window.currentUser && window.currentUser.username) 
                || (localPlayer ? localPlayer.username : 'Admin');
            const isMyTurn = isPlayerTurnActive();

            const currentPhase = (state && state.phase) ? state.phase.toUpperCase() : 'MAIN_1';
            const isMainPhase = currentPhase === 'MAIN_1' || currentPhase === 'MAIN_2' || currentPhase === 'M1' || currentPhase === 'M2';

            if (isMyTurn && isMainPhase) {
                highlightAvailableSlots(true, isMonsterCard, isFieldSpell);
            }

            // Si es turno del rival o fase no válida, solo inspecciona la carta
            if (!isMyTurn) {
                showRuleAlert('⚠️ [Turno del Rival] Solo puedes inspeccionar cartas. Los controles de juego están bloqueados.');
                return;
            }

            if (!isMainPhase) {
                showRuleAlert(`⚠️ [Regla Oficial] Solo puedes realizar jugadas de invocación/colocación durante la Main Phase 1 o 2 (Fase actual: ${state ? state.phase : 'N/A'}).`);
                return;
            }

            // Si hay evento de ratón, abrir menú contextual
            if (event) {
                event.stopPropagation();
                const cardName = cardObj ? cardObj.name : `Carta #${cardId}`;
                const numId = Number(cardId || (cardObj && (cardObj.card_id || cardObj.id)) || 0);

                if (window.currentDuelPrompt) {
                    const prompt = window.currentDuelPrompt;
                    const cSeq = (cardObj && cardObj.sequence !== undefined) ? cardObj.sequence : index;
                    const cCode = Number(cardId || (cardObj && (cardObj.card_id || cardObj.id || cardObj.code)) || 0);

                    const isSummonable = prompt.summonableCards && prompt.summonableCards.some(sc => (cSeq >= 0 && sc.sequence === cSeq) || sc.code === cCode);
                    const isMSetable = prompt.msetableCards && prompt.msetableCards.some(sc => (cSeq >= 0 && sc.sequence === cSeq) || sc.code === cCode);
                    const isSSetable = prompt.ssetableCards && prompt.ssetableCards.some(sc => (cSeq >= 0 && sc.sequence === cSeq) || sc.code === cCode);
                    const isActivatable = prompt.activatableCards && prompt.activatableCards.some(sc => (cSeq >= 0 && sc.sequence === cSeq) || sc.code === cCode);

                    const promptActions = [];
                    if (isSummonable) {
                        promptActions.push({
                            label: '⚔️ Invocar (Normal Summon)',
                            onClick: () => {
                                const activeSocket = getActiveSocket();
                                if (activeSocket) {
                                    activeSocket.emit('CLIENT_SUMMON', {
                                        room_id: getActiveDuelRoomId(),
                                        player_name: myUsername,
                                        card_id: cCode,
                                        sequence: cSeq,
                                        slot_index: 0,
                                        position: 'ATK'
                                    });
                                }
                            }
                        });
                    }
                    if (isMSetable) {
                        promptActions.push({
                            label: '🛡️ Colocar Monstruo (Set)',
                            onClick: () => {
                                const activeSocket = getActiveSocket();
                                if (activeSocket) {
                                    activeSocket.emit('CLIENT_SET', {
                                        room_id: getActiveDuelRoomId(),
                                        player_name: myUsername,
                                        card_id: cCode,
                                        sequence: cSeq,
                                        slot_index: 0,
                                        position: 'DEF'
                                    });
                                }
                            }
                        });
                    }
                    if (isSSetable) {
                        promptActions.push({
                            label: '🛡️ Colocar Carta (Set)',
                            onClick: () => {
                                const activeSocket = getActiveSocket();
                                if (activeSocket) {
                                    activeSocket.emit('CLIENT_SET', {
                                        room_id: getActiveDuelRoomId(),
                                        player_name: myUsername,
                                        card_id: cCode,
                                        sequence: cSeq,
                                        slot_index: 0,
                                        is_spell_trap: true,
                                        position: 'DEF'
                                    });
                                }
                            }
                        });
                    }
                    if (isActivatable) {
                        const actCard = prompt.activatableCards.find(sc => (cSeq >= 0 && sc.sequence === cSeq) || sc.code === cCode);
                        promptActions.push({
                            label: '⚡ Activar Efecto',
                            onClick: () => {
                                const activeSocket = getActiveSocket();
                                if (activeSocket) {
                                    activeSocket.emit('OCG_ACTIVATE_CARD', {
                                        room_id: getActiveDuelRoomId(),
                                        player_name: myUsername,
                                        card_id: cCode,
                                        sequence: cSeq,
                                        slot_index: cSeq,
                                        from_hand: true,
                                        desc: actCard ? actCard.desc : undefined
                                    });
                                }
                            }
                        });
                    }

                    if (promptActions.length > 0) {
                        promptActions.push({
                            label: 'ℹ️ Ver Detalles',
                            onClick: () => {
                                if (typeof inspectCardById === 'function') inspectCardById(cCode);
                            }
                        });
                        return showContextMenu(event, `${cardObj ? cardObj.name : 'Carta'} (Mano)`, promptActions);
                    }
                }

                const actions = [];

                if (isMonsterCard) {
                    const isFlip = Boolean(cardObj && cardObj.type && (cardObj.type.includes('Flip') || cardObj.race === 'Flip'));
                    const isNormal = Boolean(cardObj && cardObj.type && cardObj.type.includes('Normal') && !cardObj.type.includes('Effect'));
                    const mDescLower = (cardObj && (cardObj.desc || cardObj.description) ? (cardObj.desc || cardObj.description) : '').toLowerCase();
                    const isThunderDragon = (numId === 31786629);
                    const isHandMonster = Boolean(cardObj && (cardObj.isHandEffect || cardObj.hasHandEffect)) || isThunderDragon || mDescLower.includes('discard this card') || mDescLower.includes('descartar esta carta');

                    if (!isFlip && !isNormal && isHandMonster) {
                        actions.push({
                            label: isThunderDragon ? `⚡ Activar Efecto (Descartar y buscar 2 Dragones de Trueno)` : `⚡ Activar Efecto (${cardObj ? cardObj.name : 'Mano'})`,
                            onClick: () => activateCardFromHand(cardId)
                        });
                    }

                    if (cardObj && (cardObj.isSpecialSummonOnly || cardObj.specialSummonType)) {
                        actions.push({
                            label: `🚪⚡ Invocación Especial (${cardObj.name})`,
                            onClick: () => {
                                const activeSocket = getActiveSocket();
                                if (activeSocket) {
                                    activeSocket.emit('CLIENT_SUMMON', {
                                        action_type: 'SPECIAL_SUMMON_EFFECT',
                                        room_id: getActiveDuelRoomId(),
                                        player_name: myUsername,
                                        card_id: numId
                                    });
                                }
                            }
                        });
                        return showContextMenu(event, `${cardName} (Mano)`, actions);
                    }

                    // =========================================================================
                    // DETECCIÓN DE CONDICIÓN DE INVOCACIÓN ESPECIAL DESDE MANO (SPECIAL SUMMON)
                    // =========================================================================
                    const descLower = (cardObj && (cardObj.desc || cardObj.description) ? (cardObj.desc || cardObj.description) : '').toLowerCase();
                    const cannotNormalSummon = descLower.includes('cannot be normal summoned') || descLower.includes('no puede ser invocada de modo normal') || [72989439, 99188141, 65192027, 25833572].includes(numId);

                    const localP = getLocalDuelPlayer();
                    const rivalP = getRivalDuelPlayer();
                    const myMonsters = (localP && localP.monsters) || [];
                    const rivalMonsters = (rivalP && rivalP.monsters) || [];
                    const myGy = (localP && localP.graveyard) || [];

                    const myMonsterCount = myMonsters.filter(m => m !== null).length;
                    const rivalMonsterCount = rivalMonsters.filter(m => m !== null).length;

                    let canSpecialSummon = false;
                    let specialSummonLabel = '✨ Invocación Especial';

                    // 1. Elder of the Six Samurai (61737116) y Cyber Dragon (70095154)
                    if ((numId === 61737116 || numId === 70095154 || descLower.includes('opponent controls a monster and you control no monsters') || descLower.includes('adversario controla un monstruo y tú no controlas ninguno')) && myMonsterCount === 0 && rivalMonsterCount >= 1) {
                        canSpecialSummon = true;
                        specialSummonLabel = numId === 61737116 ? '🌸✨ Invocación Especial (Anciano de los Seis Samuráis)' : '⚡✨ Invocación Especial (Ciber Dragón)';
                    }
                    // 1.1 Great Shogun Shien (63176202): Controlas 2 o más Seis Samuráis boca arriba
                    else if (numId === 63176202 || (descLower.includes('six samurai') && (descLower.includes('control 2 or more') || descLower.includes('controlas 2 o más')))) {
                        const sixSamCount = myMonsters.filter(m => m && !m.faceDown && ((m.card_data?.name || '').toLowerCase().includes('six samurai') || (m.card_data?.name || '').toLowerCase().includes('seis samur'))).length;
                        if (sixSamCount >= 2) {
                            canSpecialSummon = true;
                            specialSummonLabel = '🔥⚔️ Invocación Especial (Gran Shogun Shien)';
                        }
                    }
                    // 2. Grandmaster of the Six Samurai (83039727 / 83039729): Controlas 1 Six Samurai boca arriba y no controlas otro Gran Maestro
                    else if (numId === 83039727 || numId === 83039729) {
                        const hasSixSam = myMonsters.some(m => m && !m.faceDown && ((m.card_data?.name || '').toLowerCase().includes('six samurai') || (m.card_data?.name || '').toLowerCase().includes('seis samur')));
                        const alreadyControlsGrandmaster = myMonsters.some(m => m && !m.faceDown && (Number(m.card_id || m.card_data?.id) === 83039727 || Number(m.card_id || m.card_data?.id) === 83039729));
                        if (hasSixSam && !alreadyControlsGrandmaster) {
                            canSpecialSummon = true;
                            specialSummonLabel = '🏯✨ Invocación Especial (Gran Maestro)';
                        }
                    }
                    // 2.1 Legendary Six Samurai - Kizan (49721904): Controlas otro Six Samurai boca arriba con nombre diferente
                    else if (numId === 49721904) {
                        const hasOtherSixSam = myMonsters.some(m => m && !m.faceDown && Number(m.card_id || m.card_data?.id) !== 49721904 && ((m.card_data?.name || '').toLowerCase().includes('six samurai') || (m.card_data?.name || '').toLowerCase().includes('seis samur')));
                        if (hasOtherSixSam) {
                            canSpecialSummon = true;
                            specialSummonLabel = '⚡✨ Invocación Especial (Kizan)';
                        }
                    }
                    // 2.2 Legendary Six Samurai - Shinai (48505422): Controlas a Mizuho boca arriba
                    else if (numId === 48505422) {
                        const hasMizuho = myMonsters.some(m => m && !m.faceDown && Number(m.card_id || m.card_data?.id) === 74094021);
                        if (hasMizuho) {
                            canSpecialSummon = true;
                            specialSummonLabel = '✨ Invocación Especial (Shinai - Mizuho en campo)';
                        }
                    }
                    // 2.3 Legendary Six Samurai - Mizuho (74094021): Controlas a Shinai boca arriba
                    else if (numId === 74094021) {
                        const hasShinai = myMonsters.some(m => m && !m.faceDown && Number(m.card_id || m.card_data?.id) === 48505422);
                        if (hasShinai) {
                            canSpecialSummon = true;
                            specialSummonLabel = '✨ Invocación Especial (Mizuho - Shinai en campo)';
                        }
                    }
                    // 3. BLS (72989439) / Chaos Sorcerer (99188141): 1 LUZ + 1 OSCURIDAD en GY
                    else if ([72989439, 99188141].includes(numId)) {
                        const hasLight = myGy.some(c => ((c.attribute || (c.card_data && c.card_data.attribute)) || '').toUpperCase() === 'LIGHT');
                        const hasDark = myGy.some(c => ((c.attribute || (c.card_data && c.card_data.attribute)) || '').toUpperCase() === 'DARK');
                        if (hasLight && hasDark) {
                            canSpecialSummon = true;
                            specialSummonLabel = '🌌✨ Invocación Especial Caos (1 LUZ + 1 OSCURIDAD en GY)';
                        }
                    }
                    // 4. Dark Armed Dragon (65192027): Exactamente 3 OSCURIDAD en GY
                    else if (numId === 65192027) {
                        const darkCount = myGy.filter(c => ((c.attribute || (c.card_data && c.card_data.attribute)) || '').toUpperCase() === 'DARK').length;
                        if (darkCount === 3) {
                            canSpecialSummon = true;
                            specialSummonLabel = '🐉✨ Invocación Especial (Exactamente 3 OSCURIDAD en GY)';
                        }
                    }
                    // 5. The Fiend Megacyber (66362965): Rival tiene >= 2 monstruos más que tú
                    else if (numId === 66362965 && rivalMonsterCount >= myMonsterCount + 2) {
                        canSpecialSummon = true;
                        specialSummonLabel = '😈✨ Invocación Especial (El Megaciber Demoniaco)';
                    }
                    // 6. Elementales (Silpheed, Gigantes, Garuda, Aqua Spirit, Inferno)
                    else if ([73001017, 47606319, 12800777, 40418351, 1435851].includes(numId)) {
                        const attrMap = { 73001017: 'WIND', 47606319: 'EARTH', 12800777: 'WIND', 40418351: 'WATER', 1435851: 'FIRE' };
                        const reqAttr = attrMap[numId];
                        const hasReq = myGy.some(c => ((c.attribute || (c.card_data && c.card_data.attribute)) || '').toUpperCase() === reqAttr);
                        if (hasReq) {
                            canSpecialSummon = true;
                            specialSummonLabel = `🌪️✨ Invocación Especial (Desterrar 1 ${reqAttr} de GY)`;
                        }
                    }
                    // 7. Monstruos genéricos con Invocación Especial inherente
                    else if (cardObj?.canSpecialSummon || (![83039727, 83039729, 49721904, 48505422, 74094021].includes(numId) && (descLower.includes('you can special summon this card') || descLower.includes('puedes invocar esta carta de modo especial')))) {
                        canSpecialSummon = true;
                        specialSummonLabel = `✨ Invocación Especial (${cardName})`;
                    }

                    if (canSpecialSummon) {
                        actions.push({
                            label: specialSummonLabel,
                            onClick: () => {
                                const emptySlot = localP && localP.monsters ? localP.monsters.findIndex(m => m === null) : -1;
                                if (emptySlot === -1) {
                                    showRuleAlert('⚠️ No tienes casillas de monstruo libres en tu campo.');
                                    return;
                                }
                                const activeSocket = getActiveSocket();
                                if (activeSocket) {
                                    activeSocket.emit('CLIENT_SUMMON', {
                                        action_type: 'SPECIAL_SUMMON',
                                        room_id: getActiveDuelRoomId(),
                                        player_name: myUsername,
                                        card_id: cardId,
                                        slot_index: emptySlot,
                                        position: 'ATK'
                                    });
                                }
                            }
                        });
                    }

                    if (cannotNormalSummon && !canSpecialSummon) {
                        actions.push({
                            label: '⚠️ No se cumplen los requisitos de Invocación Especial',
                            onClick: () => {
                                showRuleAlert(`⚠️ [Regla Oficial] "${cardObj ? cardObj.name : 'Monstruo'}" no puede ser Invocado de Modo Normal ni Colocado. Debes cumplir sus condiciones de Invocación Especial.`);
                            }
                        });
                        return showContextMenu(event, `${cardName} (Mano)`, actions);
                    }

                    const level = cardObj ? (cardObj.level || 0) : 0;
                    const tributesNeeded = level >= 7 ? 2 : (level >= 5 ? 1 : 0);
                    const atkLabel = tributesNeeded === 0 
                        ? 'Invocar Normal (ATK)' 
                        : (tributesNeeded === 1 ? 'Invocar por Sacrificio (1 Tributo - ATK)' : 'Invocar por Sacrificio (2 Tributos - ATK)');
                    const defLabel = tributesNeeded === 0 
                        ? 'Colocar en Defensa (SET)' 
                        : (tributesNeeded === 1 ? 'Colocar por Sacrificio (1 Tributo - SET)' : 'Colocar por Sacrificio (2 Tributos - SET)');

                    const normalSummonAlreadyUsed = Boolean(state && state.normalSummonUsed);
                    if (!cannotNormalSummon) {
                        if (normalSummonAlreadyUsed) {
                            actions.push({
                                label: '⛔ Invocación Normal ya utilizada este turno (Límite: 1)',
                                onClick: () => {
                                    showRuleAlert('⚠️ [Regla Oficial Konami] Ya has realizado tu Invocación Normal / Colocación de este turno (límite 1 por turno). Solo se permiten Invocaciones Especiales.');
                                }
                            });
                        } else {
                            actions.push({
                                label: atkLabel,
                                onClick: () => {
                                    setSummonMode('ATK');
                                    if (tributesNeeded > 0) {
                                        initiateTributeFlow(cardId, cardName, level, tributesNeeded, 'ATK');
                                    } else {
                                        const localP = getLocalDuelPlayer();
                                        const emptySlot = localP && localP.monsters ? localP.monsters.findIndex(m => m === null) : -1;
                                        if (emptySlot !== -1) {
                                            const activeSocket = getActiveSocket();
                                            if (activeSocket) {
                                                activeSocket.emit('CLIENT_SUMMON', {
                                                    room_id: getActiveDuelRoomId(),
                                                    player_name: myUsername,
                                                    card_id: cardId,
                                                    slot_index: emptySlot,
                                                    zone_type: 'P_M',
                                                    position: 'ATK'
                                                });
                                            }
                                            selectedHandCardIndex = -1;
                                            selectedHandCardId = null;
                                            highlightAvailableSlots(false, false);
                                            document.querySelectorAll('.hand-card').forEach(c => c.classList.remove('selected-hand'));
                                        } else {
                                            showRuleAlert('⚠️ [Zona Llena] No tienes casillas libres en la Zona de Monstruos (Límite: 5).');
                                        }
                                    }
                                }
                            });
                            actions.push({
                                label: defLabel,
                                onClick: () => {
                                    setSummonMode('DEF');
                                    if (tributesNeeded > 0) {
                                        initiateTributeFlow(cardId, cardName, level, tributesNeeded, 'DEF');
                                    } else {
                                        const localP = getLocalDuelPlayer();
                                        const emptySlot = localP && localP.monsters ? localP.monsters.findIndex(m => m === null) : -1;
                                        if (emptySlot !== -1) {
                                            const activeSocket = getActiveSocket();
                                            if (activeSocket) {
                                                activeSocket.emit('CLIENT_SET', {
                                                    room_id: getActiveDuelRoomId(),
                                                    player_name: myUsername,
                                                    card_id: cardId,
                                                    slot_index: emptySlot,
                                                    zone_type: 'P_M',
                                                    position: 'DEF'
                                                });
                                            }
                                            selectedHandCardIndex = -1;
                                            selectedHandCardId = null;
                                            highlightAvailableSlots(false, false);
                                            document.querySelectorAll('.hand-card').forEach(c => c.classList.remove('selected-hand'));
                                        } else {
                                            showRuleAlert('⚠️ [Zona Llena] No tienes casillas libres en la Zona de Monstruos (Límite: 5).');
                                        }
                                    }
                                }
                            });
                        }
                    }

                    actions.push({
                        label: 'Info Carta',
                        onClick: () => {
                            if (typeof showCardInfoFloating === 'function') {
                                showCardInfoFloating(cardObj || cardId);
                            }
                        }
                    });
                } else if (isSpell) {
                    const isFieldSpell = cardObj && (cardObj.race === 'Field' || (cardObj.type && cardObj.type.includes('Field')));
                    const check = checkCardActivationEligibility(cardObj, 'HAND');
                    
                    if (check.canActivate) {
                        // Selección modal para cartas con múltiples efectos
                        if (numId === 98045062) { // Enemy Controller
                            const oppMonsters = rivalPlayer && rivalPlayer.monsters ? rivalPlayer.monsters.filter(m => m && !m.faceDown) : [];
                            const myMonsters = localPlayer && localPlayer.monsters ? localPlayer.monsters.filter(m => m !== null) : [];
                            if (oppMonsters.length > 0) {
                                actions.push({
                                    label: '🎮 Opción 1: Cambiar Posición de Monstruo Rival',
                                    onClick: () => activateCardFromHand(cardId, { effect_choice: 1 })
                                });
                            }
                            if (oppMonsters.length > 0 && myMonsters.length > 0) {
                                actions.push({
                                    label: '🎮 Opción 2: Sacrificar Aliado y Tomar Control',
                                    onClick: () => activateCardFromHand(cardId, { effect_choice: 2 })
                                });
                            }
                        } else if (numId === 8842266) { // Poison of the Old Man
                            actions.push({
                                label: '💖 Opción 1: Recuperar 1200 LP',
                                onClick: () => activateCardFromHand(cardId, { effect_choice: 1 })
                            });
                            actions.push({
                                label: '🔥 Opción 2: Infligir 800 Daño al Rival',
                                onClick: () => activateCardFromHand(cardId, { effect_choice: 2 })
                            });
                        } else if (numId === 55991637) { // Dragon's Gunfire
                            actions.push({
                                label: '🔥 Opción 1: Infligir 800 Daño al Rival',
                                onClick: () => activateCardFromHand(cardId, { effect_choice: 1 })
                            });
                            const oppDefMonsters = rivalPlayer && rivalPlayer.monsters ? rivalPlayer.monsters.filter(m => m && Number(m.def !== undefined ? m.def : (m.currentDef || 0)) <= 800) : [];
                            if (oppDefMonsters.length > 0) {
                                actions.push({
                                    label: '💥 Opción 2: Destruir Monstruo Rival (DEF ≤ 800)',
                                    onClick: () => activateCardFromHand(cardId, { effect_choice: 2 })
                                });
                            }
                        } else if (numId === 76754619) { // Pyramid Energy
                            actions.push({
                                label: '⚔️ Opción 1: +200 ATK a todos tus monstruos',
                                onClick: () => activateCardFromHand(cardId, { effect_choice: 1 })
                            });
                            actions.push({
                                label: '🛡️ Opción 2: +500 DEF a todos tus monstruos',
                                onClick: () => activateCardFromHand(cardId, { effect_choice: 2 })
                            });
                        } else if (numId === 81426505) { // Six Strike - Triple Impact
                            actions.push({
                                label: '⚔️ Opción 1: Destruir Monstruos Boca Arriba Rivales',
                                onClick: () => activateCardFromHand(cardId, { effect_choice: 1 })
                            });
                            actions.push({
                                label: '✨ Opción 2: Destruir Magias/Trampas Boca Arriba Rivales',
                                onClick: () => activateCardFromHand(cardId, { effect_choice: 2 })
                            });
                            actions.push({
                                label: '🔒 Opción 3: Destruir Todas las Cartas Boca Abajo (SET)',
                                onClick: () => activateCardFromHand(cardId, { effect_choice: 3 })
                            });
                        } else if (numId === 9780364) { // Gladiator Taming
                            actions.push({
                                label: '🔄 Opción 1: Cambiar Posición de Monstruo Rival',
                                onClick: () => activateCardFromHand(cardId, { effect_choice: 1 })
                            });
                            const oppGladBeast = rivalPlayer && rivalPlayer.monsters ? rivalPlayer.monsters.some(m => m && !m.faceDown && ((m.card_data?.name || m.name || '').toLowerCase().includes('gladiator beast') || (m.card_data?.name || m.name || '').toLowerCase().includes('bestia gladiad'))) : false;
                            if (oppGladBeast) {
                                actions.push({
                                    label: '👑 Opción 2: Tomar Control de Bestia Gladiador Rival',
                                    onClick: () => activateCardFromHand(cardId, { effect_choice: 2 })
                                });
                            }
                        } else if (numId === 10925955) { // Contact with the Aquamirror
                            actions.push({
                                label: '💧 Opción 1: Añadir Monstruo de AGUA del GY a la Mano',
                                onClick: () => activateCardFromHand(cardId, { effect_choice: 1 })
                            });
                            actions.push({
                                label: '💧 Opción 2: Barajar Monstruo de AGUA del GY en el Deck',
                                onClick: () => activateCardFromHand(cardId, { effect_choice: 2 })
                            });
                        } else if (numId === 41858121) { // Vylon Matter
                            actions.push({
                                label: '🌀 Opción 1: Destruir 1 Carta del Oponente',
                                onClick: () => activateCardFromHand(cardId, { effect_choice: 1 })
                            });
                            actions.push({
                                label: '🃏 Opción 2: Robar 1 Carta del Deck',
                                onClick: () => activateCardFromHand(cardId, { effect_choice: 2 })
                            });
                            actions.push({
                                label: '🎯 Opción 3: Descartar 1 Carta al Azar de Mano Rival',
                                onClick: () => activateCardFromHand(cardId, { effect_choice: 3 })
                            });
                        } else if (isFieldSpell) {
                            actions.push({
                                label: '🌌 Activar Campo Mágico',
                                onClick: () => activateCardFromHand(cardId)
                            });
                        } else if (isEquip) {
                            actions.push({
                                label: '⚔️ Equipar a un Monstruo',
                                onClick: () => activateCardFromHand(cardId)
                            });
                        } else {
                            actions.push({
                                label: '✨ Activar Efecto',
                                onClick: () => activateCardFromHand(cardId)
                            });
                        }
                    }
                    actions.push({
                        label: isFieldSpell ? 'Colocar Campo Boca Abajo (SET)' : 'Colocar Boca Abajo (SET)',
                        onClick: () => {
                            setSummonMode('DEF');
                            const activeSocket = getActiveSocket();
                            if (isFieldSpell) {
                                if (activeSocket) {
                                    activeSocket.emit('CLIENT_SET', {
                                        room_id: getActiveDuelRoomId(),
                                        player_name: myUsername,
                                        card_id: cardId,
                                        slot_index: 0,
                                        zone_type: 'P_CAMPO',
                                        position: 'DEF'
                                    });
                                }
                                selectedHandCardIndex = -1;
                                selectedHandCardId = null;
                                highlightAvailableSlots(false, false, false);
                                document.querySelectorAll('.hand-card').forEach(c => c.classList.remove('selected-hand'));
                            } else {
                                const localP = getLocalDuelPlayer();
                                const emptySlot = localP && localP.spells ? localP.spells.findIndex(s => s === null) : -1;
                                if (emptySlot !== -1) {
                                    if (activeSocket) {
                                        activeSocket.emit('CLIENT_SET', {
                                            room_id: getActiveDuelRoomId(),
                                            player_name: myUsername,
                                            card_id: cardId,
                                            slot_index: emptySlot,
                                            zone_type: 'P_S',
                                            position: 'DEF'
                                        });
                                    }
                                    selectedHandCardIndex = -1;
                                    selectedHandCardId = null;
                                    highlightAvailableSlots(false, false);
                                    document.querySelectorAll('.hand-card').forEach(c => c.classList.remove('selected-hand'));
                                } else {
                                    showRuleAlert('⚠️ [Zona Llena] No tienes casillas libres en la Zona de Magias y Trampas.');
                                }
                            }
                        }
                    });
                    actions.push({
                        label: 'Info Carta',
                        onClick: () => {
                            if (typeof showCardInfoFloating === 'function') {
                                showCardInfoFloating(cardObj || cardId);
                            }
                        }
                    });
                } else if (isTrap) {
                    actions.push({
                        label: 'Colocar Boca Abajo (SET)',
                        onClick: () => {
                            setSummonMode('DEF');
                            const localP = getLocalDuelPlayer();
                            const emptySlot = localP && localP.spells ? localP.spells.findIndex(s => s === null) : -1;
                            if (emptySlot !== -1) {
                                const activeSocket = getActiveSocket();
                                if (activeSocket) {
                                    activeSocket.emit('CLIENT_SET', {
                                        room_id: getActiveDuelRoomId(),
                                        player_name: myUsername,
                                        card_id: cardId,
                                        slot_index: emptySlot,
                                        zone_type: 'P_S',
                                        position: 'DEF'
                                    });
                                }
                                selectedHandCardIndex = -1;
                                selectedHandCardId = null;
                                highlightAvailableSlots(false, false);
                                document.querySelectorAll('.hand-card').forEach(c => c.classList.remove('selected-hand'));
                            } else {
                                showRuleAlert('⚠️ [Zona Llena] No tienes casillas libres en la Zona de Magias y Trampas.');
                            }
                        }
                    });
                    actions.push({
                        label: 'Info Carta',
                        onClick: () => {
                            if (typeof showCardInfoFloating === 'function') {
                                showCardInfoFloating(cardObj || cardId);
                            }
                        }
                    });
                }

                showContextMenu(event, cardName, actions);
            }
        }

        // =========================================================================
        // CONTROL UNIFICADO DE SELECCIÓN DE OBJETIVOS (MAGIAS, TRAMPAS Y CADENAS OCG)
        // =========================================================================
        let pendingTargetAction = null; // { mode, cardId, slotIndex, fromHand, isChain, cardName }

        function onSlotClick(zoneType, slotIndex, event = null) {
            if (event) {
                event.stopPropagation();
            }

            const localPlayer = getLocalDuelPlayer();
            const rivalPlayer = getRivalDuelPlayer();
            const localKey = window.localPlayerRoleKey || 'player1';
            const rivalKey = window.rivalPlayerRoleKey || 'player2';

            // GESTIÓN DE SELECCIÓN DE OBJETIVOS INTERACTIVOS (OCG OFICIAL: TRAMPAS, MAGIAS Y EFECTOS)
            if (pendingTargetAction) {
                if (pendingTargetAction.mode === 'MONSTER_OPPONENT_DEF') {
                    const isOpponentSlot = (zoneType === 'R_M');
                    if (!isOpponentSlot) {
                        showRuleAlert('⚠️ [Regla Oficial OCG - Parar la Defensa] Debes seleccionar un monstruo en el campo del oponente.');
                        return;
                    }
                    const targetMonster = rivalPlayer && rivalPlayer.monsters ? rivalPlayer.monsters[slotIndex] : null;
                    if (!targetMonster) {
                        showRuleAlert('⚠️ [Regla Oficial OCG] No hay un monstruo en esa casilla.');
                        return;
                    }
                    const isDefPosition = targetMonster.position === 'DEF' || targetMonster.position === 'SET' || targetMonster.faceDown === true;
                    if (!isDefPosition) {
                        showRuleAlert('⚠️ [Regla Oficial OCG - Parar la Defensa] Solo puedes seleccionar monstruos que estén en Posición de Defensa (boca arriba o boca abajo). Esta carta no puede seleccionar monstruos en Posición de Ataque.');
                        return;
                    }

                    const targetName = targetMonster.card_data ? targetMonster.card_data.name : `Monstruo #${slotIndex + 1}`;
                    const targetData = {
                        slot_index: slotIndex,
                        target_slot: slotIndex,
                        target_player: rivalKey,
                        source_slot: pendingTargetAction.slotIndex
                    };

                    const activeSocket = getActiveSocket();
                    if (activeSocket) {
                        activeSocket.emit('OCG_ACTIVATE_CARD', {
                            room_id: getActiveDuelRoomId(),
                            card_id: pendingTargetAction.cardId,
                            slot_index: pendingTargetAction.slotIndex,
                            from_hand: pendingTargetAction.fromHand,
                            target_data: targetData
                        });
                    }

                    showRuleAlert(`🎯 ¡Objetivo en Defensa seleccionado: ${targetName} (Rival, casilla #${slotIndex + 1})!`);
                    cancelInteractiveTargeting();
                    return;
                } else if (pendingTargetAction.mode === 'MONSTER_OPPONENT' || pendingTargetAction.mode === 'MONSTER_PLAYER' || pendingTargetAction.mode === 'MONSTER_ANY' || pendingTargetAction.mode === 'UNION_EQUIP_Y' || pendingTargetAction.mode === 'UNION_EQUIP_Z') {
                    const isOpponentSlot = (zoneType === 'R_M');
                    const isPlayerSlot = (zoneType === 'P_M');
                    let targetPlayer = null;
                    let targetMonster = null;

                    if (isOpponentSlot && (pendingTargetAction.mode === 'MONSTER_OPPONENT' || pendingTargetAction.mode === 'MONSTER_ANY')) {
                        if (rivalPlayer && rivalPlayer.monsters && rivalPlayer.monsters[slotIndex]) {
                            targetPlayer = rivalKey;
                            targetMonster = rivalPlayer.monsters[slotIndex];
                        }
                    } else if (isPlayerSlot && (pendingTargetAction.mode === 'MONSTER_PLAYER' || pendingTargetAction.mode === 'MONSTER_ANY' || pendingTargetAction.mode === 'UNION_EQUIP_Y' || pendingTargetAction.mode === 'UNION_EQUIP_Z')) {
                        if (localPlayer && localPlayer.monsters && localPlayer.monsters[slotIndex]) {
                            targetPlayer = localKey;
                            targetMonster = localPlayer.monsters[slotIndex];
                        }
                    }

                    if (targetPlayer && targetMonster) {
                        const activeEquipCard = (typeof getCardDataById === 'function') ? getCardDataById(pendingTargetAction.cardId) : null;
                        const isEquipAction = activeEquipCard && (activeEquipCard.race === 'Equip' || (activeEquipCard.type && activeEquipCard.type.includes('Equip')));
                        const checkFn = (typeof checkMonsterMeetsEquipCondition === 'function') 
                            ? checkMonsterMeetsEquipCondition 
                            : (typeof window !== 'undefined' && window.checkMonsterMeetsEquipCondition) 
                                ? window.checkMonsterMeetsEquipCondition 
                                : null;
                        if (isEquipAction && checkFn && !checkFn(activeEquipCard, targetMonster)) {
                            showRuleAlert(`⚠️ "${activeEquipCard.name}" no es compatible con "${targetMonster.card_data ? targetMonster.card_data.name : 'Monstruo'}". Selecciona un monstruo del tipo requerido.`);
                            return;
                        }
                        const targetName = targetMonster.card_data ? targetMonster.card_data.name : `Monstruo #${slotIndex + 1}`;
                        const targetData = {
                            slot_index: slotIndex,
                            target_slot: slotIndex,
                            target_player: targetPlayer,
                            source_slot: pendingTargetAction.slotIndex
                        };

                        const activeSocket = getActiveSocket();
                        if (activeSocket) {
                            if (pendingTargetAction.isChain) {
                                activeSocket.emit('OCG_CHAIN_RESPONSE', {
                                    room_id: getActiveDuelRoomId(),
                                    action: 'CHAIN',
                                    card_id: pendingTargetAction.cardId,
                                    slot_index: pendingTargetAction.slotIndex,
                                    from_hand: pendingTargetAction.fromHand,
                                    target_data: targetData
                                });
                            } else if (pendingTargetAction.actionType === 'CHANGE_POS') {
                                activeSocket.emit('CMD_ACTION', {
                                    room_id: getActiveDuelRoomId(),
                                    action_type: 'CHANGE_POS',
                                    slot_index: pendingTargetAction.slotIndex,
                                    target_data: targetData
                                });
                            } else if (pendingTargetAction.actionType === 'MONSTER_EFFECT') {
                                activeSocket.emit('CMD_ACTION', {
                                    room_id: getActiveDuelRoomId(),
                                    action_type: 'MONSTER_EFFECT',
                                    slot_index: pendingTargetAction.slotIndex,
                                    card_id: pendingTargetAction.cardId,
                                    target_data: targetData
                                });
                            } else {
                                activeSocket.emit('OCG_ACTIVATE_CARD', {
                                    room_id: getActiveDuelRoomId(),
                                    card_id: pendingTargetAction.cardId,
                                    slot_index: pendingTargetAction.slotIndex,
                                    from_hand: pendingTargetAction.fromHand,
                                    target_data: targetData
                                });
                            }
                        }
                        showRuleAlert(`🎯 ¡Objetivo seleccionado: ${targetName} (${targetPlayer === rivalKey ? 'Rival' : 'Tu campo'}, casilla #${slotIndex + 1})!`);
                        cancelInteractiveTargeting();
                        return;
                    } else {
                        showRuleAlert('⚠️ [Selección de Objetivo] Selecciona un monstruo válido.');
                        return;
                    }
                } else if (pendingTargetAction.mode === 'TRAP_FACEUP') {
                    let targetPlayer = null;
                    let targetName = 'Carta de Trampa';
                    let isTrap = false;

                    if (zoneType === 'P_S' && localPlayer && localPlayer.spells && localPlayer.spells[slotIndex]) {
                        const sCard = localPlayer.spells[slotIndex];
                        const isSet = sCard.faceDown === true || sCard.position === 'SET';
                        const cd = sCard.card_data || {};
                        isTrap = !isSet && ((cd.type && cd.type.includes('Trap')) || (cd.race && cd.race.includes('Trap')));
                        if (isTrap) {
                            targetPlayer = localKey;
                            targetName = cd.name || 'Trampa';
                        }
                    } else if (zoneType === 'R_S' && rivalPlayer && rivalPlayer.spells && rivalPlayer.spells[slotIndex]) {
                        const sCard = rivalPlayer.spells[slotIndex];
                        const isSet = sCard.faceDown === true || sCard.position === 'SET';
                        const cd = sCard.card_data || {};
                        isTrap = !isSet && ((cd.type && cd.type.includes('Trap')) || (cd.race && cd.race.includes('Trap')));
                        if (isTrap) {
                            targetPlayer = rivalKey;
                            targetName = cd.name || 'Trampa Rival';
                        }
                    }

                    if (targetPlayer && isTrap) {
                        const targetData = {
                            target_player: targetPlayer,
                            target_slot: slotIndex,
                            source_slot: pendingTargetAction.slotIndex
                        };
                        const activeSocket = getActiveSocket();
                        if (activeSocket) {
                            activeSocket.emit('OCG_ACTIVATE_CARD', {
                                room_id: getActiveDuelRoomId(),
                                card_id: pendingTargetAction.cardId,
                                slot_index: pendingTargetAction.slotIndex,
                                from_hand: pendingTargetAction.fromHand,
                                target_data: targetData
                            });
                        }
                        showRuleAlert(`🪤 ¡Objetivo de Trampa seleccionado: ${targetName}!`);
                        cancelInteractiveTargeting();
                        return;
                    } else {
                        showRuleAlert('⚠️ [Remover Trampa] Solo puedes seleccionar como objetivo Cartas de TRAMPA BOCA ARRIBA en el campo (no Magias ni cartas boca abajo).');
                        return;
                    }
                } else if (pendingTargetAction.mode === 'TARGET_ANY_OPPONENT') {
                    let targetPlayer = rivalKey;
                    let isSpellTrap = (zoneType === 'R_S' || zoneType === 'R_CAMPO');
                    let targetName = 'Carta Rival';
                    let valid = false;

                    if (zoneType === 'R_M' && rivalPlayer && rivalPlayer.monsters && rivalPlayer.monsters[slotIndex]) {
                        valid = true;
                        targetName = rivalPlayer.monsters[slotIndex].card_data?.name || 'Monstruo Rival';
                    } else if (zoneType === 'R_S' && rivalPlayer && rivalPlayer.spells && rivalPlayer.spells[slotIndex]) {
                        valid = true;
                        targetName = rivalPlayer.spells[slotIndex].card_data?.name || 'Magia/Trampa Rival';
                    } else if (zoneType === 'R_CAMPO' && rivalPlayer && rivalPlayer.fieldSpell) {
                        valid = true;
                        targetName = rivalPlayer.fieldSpell.card_data?.name || 'Campo Rival';
                    }

                    if (valid) {
                        const targetData = {
                            target_player: targetPlayer,
                            target_slot: slotIndex,
                            is_spell_trap: isSpellTrap,
                            source_slot: pendingTargetAction.slotIndex
                        };
                        const activeSocket = getActiveSocket();
                        if (activeSocket) {
                            activeSocket.emit('CMD_ACTION', {
                                room_id: getActiveDuelRoomId(),
                                action_type: 'MONSTER_EFFECT',
                                slot_index: pendingTargetAction.slotIndex,
                                card_id: pendingTargetAction.cardId,
                                target_data: targetData
                            });
                        }
                        showRuleAlert(`💥 ¡Objetivo XYZ seleccionado: ${targetName}!`);
                        cancelInteractiveTargeting();
                        return;
                    } else {
                        showRuleAlert('⚠️ [Efecto XYZ] Selecciona una carta válida que controle tu oponente.');
                        return;
                    }
                } else if (pendingTargetAction.mode === 'SPELL_TRAP' || pendingTargetAction.mode === 'SPELL_TRAP_FACEUP' || pendingTargetAction.mode === 'SPELL_TRAP_FACEDOWN') {
                    let targetPlayer = null;
                    let isField = false;
                    let targetName = 'Carta Mágica/Trampa';

                    if (zoneType === 'P_S' && localPlayer && localPlayer.spells && localPlayer.spells[slotIndex]) {
                        targetPlayer = localKey;
                        targetName = localPlayer.spells[slotIndex].card_data ? localPlayer.spells[slotIndex].card_data.name : 'Magia/Trampa';
                    } else if (zoneType === 'R_S' && rivalPlayer && rivalPlayer.spells && rivalPlayer.spells[slotIndex]) {
                        targetPlayer = rivalKey;
                        targetName = rivalPlayer.spells[slotIndex].card_data ? rivalPlayer.spells[slotIndex].card_data.name : 'Magia/Trampa';
                    } else if (zoneType === 'P_CAMPO' && localPlayer && localPlayer.fieldSpell) {
                        targetPlayer = localKey;
                        isField = true;
                        targetName = localPlayer.fieldSpell.card_data ? localPlayer.fieldSpell.card_data.name : 'Campo';
                    } else if (zoneType === 'R_CAMPO' && rivalPlayer && rivalPlayer.fieldSpell) {
                        targetPlayer = rivalKey;
                        isField = true;
                        targetName = rivalPlayer.fieldSpell.card_data ? rivalPlayer.fieldSpell.card_data.name : 'Campo';
                    }

                    if (targetPlayer) {
                        const targetData = {
                            target_player: targetPlayer,
                            target_slot: slotIndex,
                            slot_index: slotIndex,
                            is_spell_trap: true,
                            is_field_spell: isField,
                            source_slot: pendingTargetAction.slotIndex
                        };

                        const activeSocket = getActiveSocket();
                        if (activeSocket) {
                            if (pendingTargetAction.isChain) {
                                activeSocket.emit('OCG_CHAIN_RESPONSE', {
                                    room_id: getActiveDuelRoomId(),
                                    action: 'CHAIN',
                                    card_id: pendingTargetAction.cardId,
                                    slot_index: pendingTargetAction.slotIndex,
                                    from_hand: pendingTargetAction.fromHand,
                                    target_data: targetData
                                });
                            } else if (pendingTargetAction.actionType === 'CHANGE_POS') {
                                activeSocket.emit('CMD_ACTION', {
                                    room_id: getActiveDuelRoomId(),
                                    action_type: 'CHANGE_POS',
                                    slot_index: pendingTargetAction.slotIndex,
                                    target_data: targetData
                                });
                            } else if (pendingTargetAction.actionType === 'MONSTER_EFFECT') {
                                activeSocket.emit('CMD_ACTION', {
                                    room_id: getActiveDuelRoomId(),
                                    action_type: 'MONSTER_EFFECT',
                                    slot_index: pendingTargetAction.slotIndex,
                                    card_id: pendingTargetAction.cardId,
                                    target_data: targetData
                                });
                            } else {
                                activeSocket.emit('OCG_ACTIVATE_CARD', {
                                    room_id: getActiveDuelRoomId(),
                                    card_id: pendingTargetAction.cardId,
                                    slot_index: pendingTargetAction.slotIndex,
                                    from_hand: pendingTargetAction.fromHand,
                                    target_data: targetData
                                });
                            }
                        }
                        showRuleAlert(`🌪️ ¡Objetivo seleccionado: ${targetName}!`);
                        cancelInteractiveTargeting();
                        return;
                    } else {
                        showRuleAlert('⚠️ [Selección de Objetivo] Selecciona una carta Mágica, Trampa o de Campo válida.');
                        return;
                    }
                }
            }

            document.querySelectorAll('.field-slot').forEach(el => el.classList.remove('slot-targeted'));

            // MODO ESPECTADOR: Permitir únicamente inspeccionar cartas sin interactuar
            if (window.isSpectatorMode) {
                if (zoneType === 'P_M' || zoneType === 'R_M') {
                    if (typeof inspectMonsterSlot === 'function') {
                        inspectMonsterSlot(zoneType === 'P_M' ? 'player1' : 'player2', slotIndex);
                    }
                } else if (zoneType === 'P_S' || zoneType === 'R_S') {
                    if (typeof inspectSpellSlot === 'function') {
                        inspectSpellSlot(zoneType === 'P_S' ? 'player1' : 'player2', slotIndex);
                    }
                }
                return;
            }

            const state = (typeof window !== 'undefined' && window.lastDuelState) || (typeof lastDuelState !== 'undefined' ? lastDuelState : null);
            const myUsername = (window.Session && window.Session.getUser() && window.Session.getUser().username) 
                || (window.currentUser && window.currentUser.username) 
                || (localPlayer ? localPlayer.username : 'Admin');
            const isMyTurn = isPlayerTurnActive();

            // Si es turno del rival: el jugador puede inspeccionar o activar Trampas y Mágicas Rápidas
            if (!isMyTurn) {
                if (zoneType === 'P_M' && localPlayer && localPlayer.monsters && localPlayer.monsters[slotIndex]) {
                    const mObj = localPlayer.monsters[slotIndex];
                    inspectMonsterSlot(localKey, slotIndex);
                    if (event) {
                        event.stopPropagation();
                        showContextMenu(event, mObj.card_data ? mObj.card_data.name : 'Monstruo', [
                            {
                                label: 'ℹ️ Info Carta',
                                onClick: () => {
                                    if (typeof showCardInfoFloating === 'function') {
                                        showCardInfoFloating(mObj.card_data || mObj.card_id);
                                    }
                                }
                            }
                        ]);
                    }
                    return;
                } else if (zoneType === 'R_M' && rivalPlayer && rivalPlayer.monsters && rivalPlayer.monsters[slotIndex]) {
                    const rMon = rivalPlayer.monsters[slotIndex];
                    if (!rMon.faceDown) {
                        inspectMonsterSlot(rivalKey, slotIndex);
                        if (event) {
                            event.stopPropagation();
                            showContextMenu(event, rMon.card_data ? rMon.card_data.name : 'Monstruo Rival', [
                                {
                                    label: 'ℹ️ Info Carta',
                                    onClick: () => {
                                        if (typeof showCardInfoFloating === 'function') {
                                            showCardInfoFloating(rMon.card_data || rMon.card_id);
                                        }
                                    }
                                }
                            ]);
                        }
                    } else {
                        showRuleAlert('⚠️ [Monstruo Oculto] El monstruo del rival está en Posición de Defensa boca abajo.');
                    }
                    return;
                } else if (zoneType === 'P_S' && localPlayer && localPlayer.spells && localPlayer.spells[slotIndex]) {
                    const sObj = localPlayer.spells[slotIndex];
                    inspectCardById(sObj.card_id);

                    const cardData = sObj.card_data || {};
                    const isTrap = cardData.type && cardData.type.includes('Trap');
                    const isQuickPlay = cardData.race === 'Quick-Play' || (cardData.type && cardData.type.includes('Quick-Play'));
                    const isFaceDown = sObj.faceDown === true || sObj.position === 'SET';
                    const actions = [];

                    // REGLA OFICIAL OCG: Las cartas de Trampa y Mágicas Rápidas colocadas boca abajo PUEDEN activarse durante el turno del rival
                    if ((isTrap || isQuickPlay) && isFaceDown) {
                        actions.push({
                            label: '⚡ Activar Carta (Respuesta OCG)',
                            onClick: () => {
                                activateCardDirectly(sObj.card_id, false, slotIndex, cardData.name || 'Carta');
                            }
                        });
                    }

                    actions.push({
                        label: 'ℹ️ Info Carta',
                        onClick: () => {
                            if (typeof showCardInfoFloating === 'function') {
                                showCardInfoFloating(cardData || sObj.card_id);
                            }
                        }
                    });

                    if (event) {
                        event.stopPropagation();
                        showContextMenu(event, cardData.name || 'Magia / Trampa', actions);
                    }
                    return;
                } else if (zoneType === 'R_S' && rivalPlayer && rivalPlayer.spells && rivalPlayer.spells[slotIndex]) {
                    const sObj = rivalPlayer.spells[slotIndex];
                    if (!sObj.faceDown) {
                        inspectCardById(sObj.card_id);
                        if (event) {
                            event.stopPropagation();
                            showContextMenu(event, sObj.card_data ? sObj.card_data.name : 'Magia/Trampa Rival', [
                                {
                                    label: 'ℹ️ Info Carta',
                                    onClick: () => {
                                        if (typeof showCardInfoFloating === 'function') {
                                            showCardInfoFloating(sObj.card_data || sObj.card_id);
                                        }
                                    }
                                }
                            ]);
                        }
                    } else {
                        showRuleAlert('⚠️ [Carta Oculta] La carta del rival está boca abajo.');
                    }
                    return;
                } else if (zoneType === 'R_CAMPO' && rivalPlayer && rivalPlayer.fieldSpell) {
                    const fObj = rivalPlayer.fieldSpell;
                    inspectCardById(fObj.card_id || fObj.id);
                    if (event) {
                        event.stopPropagation();
                        showContextMenu(event, fObj.card_data ? fObj.card_data.name : 'Campo Rival', [
                            {
                                label: 'ℹ️ Info Carta',
                                onClick: () => {
                                    if (typeof showCardInfoFloating === 'function') {
                                        showCardInfoFloating(fObj.card_data || fObj.card_id || fObj.id);
                                    }
                                }
                            }
                        ]);
                    }
                    return;
                } else if (zoneType === 'P_CAMPO' && localPlayer && localPlayer.fieldSpell) {
                    const fObj = localPlayer.fieldSpell;
                    inspectCardById(fObj.card_id || fObj.id);
                    if (event) {
                        event.stopPropagation();
                        showContextMenu(event, fObj.card_data ? fObj.card_data.name : 'Tu Campo', [
                            {
                                label: 'ℹ️ Info Carta',
                                onClick: () => {
                                    if (typeof showCardInfoFloating === 'function') {
                                        showCardInfoFloating(fObj.card_data || fObj.card_id || fObj.id);
                                    }
                                }
                            }
                        ]);
                    }
                    return;
                }
                showRuleAlert('⚠️ [Turno del Rival] Solo puedes activar Trampas o Mágicas de Juego Rápido en respuesta.');
                return;
            }

            // 0. Si estamos en Modo de Selección de Tributos
            if (pendingTributeData && zoneType === 'P_M') {
                toggleTributeSlot(slotIndex);
                return;
            }

            // 1. FLUJO DE INVOCACIÓN DINÁMICA (Mano -> Casilla Libre 0..4 o Campo)
            if ((zoneType === 'P_M' || zoneType === 'P_S' || zoneType === 'P_CAMPO') && selectedHandCardId !== null) {
                const state = window.lastDuelState || (typeof lastDuelState !== 'undefined' ? lastDuelState : null);
                const currentPhase = (state && state.phase) ? state.phase.toUpperCase() : 'MAIN_1';
                const isMainPhase = currentPhase === 'MAIN_1' || currentPhase === 'MAIN_2' || currentPhase === 'M1' || currentPhase === 'M2';

                if (!isMainPhase) {
                    showRuleAlert(`⚠️ [Regla Oficial] Solo puedes invocar o colocar cartas durante la Main Phase 1 o 2 (Fase actual: ${state ? state.phase : 'N/A'}).`);
                    return;
                }

                let isMonsterCard = true;
                let handCard = null;
                if (localPlayer && localPlayer.hand) {
                    handCard = localPlayer.hand.find(card => Number(card.id || card.card_id) === Number(selectedHandCardId));
                    if (handCard && handCard.type) isMonsterCard = handCard.type.includes('Monster');
                }

                const cd = (handCard && (handCard.card_data || handCard)) || {};
                const typeNum = Number(cd.typeCode || (typeof cd.type === 'number' ? cd.type : 0));
                const typeStr = typeof cd.type === 'string' ? cd.type : (typeof handCard?.type === 'string' ? handCard.type : '');
                const raceStr = typeof cd.race === 'string' ? cd.race : (typeof handCard?.race === 'string' ? handCard.race : '');
                const isFieldSpell = (typeNum & 0x80000) !== 0 || raceStr === 'Field' || typeStr.includes('Field') || Boolean(cd.isField);

                if (zoneType === 'P_CAMPO') {
                    if (!isFieldSpell) {
                        showRuleAlert('⚠️ [Zona de Campo] Solo puedes colocar o activar Cartas Mágicas de Campo en esta ranura.');
                        return;
                    }
                    const activeSocket = getActiveSocket();
                    if (currentSummonMode === 'DEF') {
                        if (activeSocket) {
                            activeSocket.emit('CLIENT_SET', {
                                room_id: getActiveDuelRoomId(),
                                player_name: myUsername,
                                card_id: selectedHandCardId,
                                slot_index: 0,
                                zone_type: 'P_CAMPO',
                                position: 'DEF'
                            });
                        }
                    } else {
                        activateCardFromHand(selectedHandCardId);
                    }
                    selectedHandCardIndex = -1;
                    selectedHandCardId = null;
                    highlightAvailableSlots(false, false, false);
                    document.querySelectorAll('.hand-card').forEach(c => c.classList.remove('selected-hand'));
                    return;
                }

                if ((zoneType === 'P_M' || zoneType === 'R_M') && !isMonsterCard) {
                    const isEquipSpell = handCard && (handCard.race === 'Equip' || (handCard.type && handCard.type.includes('Equip')));
                    const targetPlayerKey = (zoneType === 'P_M') ? localKey : rivalKey;
                    const targetPlayerObj = (zoneType === 'P_M') ? localPlayer : rivalPlayer;
                    const targetMonster = targetPlayerObj && targetPlayerObj.monsters ? targetPlayerObj.monsters[slotIndex] : null;

                    if (isEquipSpell && targetMonster) {
                        if (targetMonster.faceDown) {
                            showRuleAlert('⚠️ Las cartas de equipo solo pueden equiparse a monstruos boca arriba en el campo.');
                            return;
                        }
                        const checkFn = (typeof checkMonsterMeetsEquipCondition === 'function') 
                            ? checkMonsterMeetsEquipCondition 
                            : (typeof window !== 'undefined' && window.checkMonsterMeetsEquipCondition) 
                                ? window.checkMonsterMeetsEquipCondition 
                                : null;
                        if (checkFn && !checkFn(handCard, targetMonster)) {
                            showRuleAlert(`⚠️ "${handCard.name}" no es compatible con "${targetMonster.card_data ? targetMonster.card_data.name : 'Monstruo'}". Selecciona un monstruo del tipo requerido.`);
                            return;
                        }
                        const activeSocket = getActiveSocket();
                        if (activeSocket) {
                            activeSocket.emit('OCG_ACTIVATE_CARD', {
                                room_id: getActiveDuelRoomId(),
                                card_id: selectedHandCardId,
                                slot_index: -1,
                                from_hand: true,
                                target_data: {
                                    slot_index: slotIndex,
                                    target_slot: slotIndex,
                                    target_player: targetPlayerKey
                                }
                            });
                        }
                        showRuleAlert(`⚔️ Equipando "${handCard.name}" a "${targetMonster.card_data ? targetMonster.card_data.name : 'Monstruo'}"...`);
                        selectedHandCardIndex = -1;
                        selectedHandCardId = null;
                        document.querySelectorAll('.hand-card').forEach(c => c.classList.remove('selected-hand'));
                        highlightAvailableSlots(false, false);
                        return;
                    } else if (localPlayer && localPlayer.monsters && localPlayer.monsters[slotIndex]) {
                        selectedHandCardIndex = -1;
                        selectedHandCardId = null;
                        document.querySelectorAll('.hand-card').forEach(c => c.classList.remove('selected-hand'));
                        highlightAvailableSlots(false, false);
                    } else {
                        showRuleAlert('⚠️ [Regla Oficial] Las cartas Mágicas y de Trampa deben colocarse en la Zona de Magias y Trampas (Fila Inferior).');
                        return;
                    }
                }

                if (zoneType === 'P_S' && isMonsterCard) {
                    if (localPlayer && localPlayer.spells && localPlayer.spells[slotIndex]) {
                        selectedHandCardIndex = -1;
                        selectedHandCardId = null;
                        document.querySelectorAll('.hand-card').forEach(c => c.classList.remove('selected-hand'));
                        highlightAvailableSlots(false, false);
                    } else {
                        showRuleAlert('⚠️ [Regla Oficial] Los monstruos solo pueden invocarse en la Zona de Monstruos (Fila Central).');
                        return;
                    }
                }

                // Invocación Normal o Invocación por Sacrificio (Nivel 5+):
                if (zoneType === 'P_M' && isMonsterCard && handCard) {
                    if (state && state.normalSummonUsed) {
                        showRuleAlert('⚠️ [Regla Oficial Konami] Ya has realizado tu Invocación Normal / Colocación de este turno (límite 1 por turno). Solo puedes Invocar de Modo Especial.');
                        selectedHandCardIndex = -1;
                        selectedHandCardId = null;
                        document.querySelectorAll('.hand-card').forEach(c => c.classList.remove('selected-hand'));
                        highlightAvailableSlots(false, false);
                        return;
                    }
                    const level = handCard.level || 0;
                    const tributesNeeded = level >= 7 ? 2 : (level >= 5 ? 1 : 0);
                    if (tributesNeeded === 0 && localPlayer && localPlayer.monsters && localPlayer.monsters[slotIndex]) {
                        // Ranura ocupada y no requiere tributo: cambiar foco al monstruo en campo
                        selectedHandCardIndex = -1;
                        selectedHandCardId = null;
                        document.querySelectorAll('.hand-card').forEach(c => c.classList.remove('selected-hand'));
                        highlightAvailableSlots(false, false);
                    } else if (tributesNeeded > 0) {
                        const controlledSlots = [];
                        for (let i = 0; i < 5; i++) {
                            if (localPlayer && localPlayer.monsters && localPlayer.monsters[i]) controlledSlots.push(i);
                        }

                        if (controlledSlots.length < tributesNeeded) {
                            showRuleAlert(`⚠️ [Regla Oficial Konami] "${handCard.name}" es Nivel ${level} y requiere ${tributesNeeded} sacrificio(s) en el campo. Actualmente solo controlas ${controlledSlots.length} monstruo(s).`);
                            return;
                        }

                        if (tributesNeeded === 1 && localPlayer && localPlayer.monsters && localPlayer.monsters[slotIndex]) {
                            const sacrificedMonster = localPlayer.monsters[slotIndex];
                            const sacrificedName = sacrificedMonster.card_data ? sacrificedMonster.card_data.name : `Monstruo #${slotIndex + 1}`;
                            showRuleAlert(`⭐ [Sacrificio Directo] Tributando a "${sacrificedName}" para invocar a "${handCard.name}"...`);

                            const actionEvent = currentSummonMode === 'DEF' ? 'CLIENT_SET' : 'CLIENT_SUMMON';
                            const activeSocket = getActiveSocket();
                            if (activeSocket) {
                                activeSocket.emit(actionEvent, {
                                    room_id: getActiveDuelRoomId(),
                                    player_name: myUsername,
                                    card_id: selectedHandCardId,
                                    slot_index: slotIndex,
                                    tribute_slots: [slotIndex],
                                    position: currentSummonMode || 'ATK'
                                });
                            }

                            selectedHandCardIndex = -1;
                            selectedHandCardId = null;
                            document.querySelectorAll('.hand-card').forEach(c => c.classList.remove('selected-hand'));
                            highlightAvailableSlots(false, true);
                            return;
                        }

                        const preselected = localPlayer && localPlayer.monsters && localPlayer.monsters[slotIndex] ? slotIndex : -1;
                        if (typeof openTributeModal === 'function') {
                            openTributeModal(selectedHandCardId, handCard.name || 'Monstruo', level, tributesNeeded, currentSummonMode, preselected);
                        } else if (typeof initiateTributeFlow === 'function') {
                            initiateTributeFlow(selectedHandCardId, handCard.name || 'Monstruo', level, tributesNeeded, currentSummonMode, preselected);
                        }
                        return;
                    }
                }

                if (selectedHandCardId !== null) {
                    const targetSlotElem = document.getElementById(zoneType === 'P_M' ? `p-m${slotIndex}` : `p-s${slotIndex}`);
                    if (targetSlotElem) targetSlotElem.classList.add('slot-targeted');

                    const actionEvent = (!isMonsterCard || currentSummonMode === 'DEF') ? 'CLIENT_SET' : 'CLIENT_SUMMON';
                    const positionChosen = (!isMonsterCard || currentSummonMode === 'DEF') ? 'DEF' : 'ATK';

                    const activeSocket = getActiveSocket();
                    if (activeSocket) {
                        activeSocket.emit(actionEvent, {
                            room_id: getActiveDuelRoomId(),
                            player_name: myUsername,
                            card_id: selectedHandCardId,
                            slot_index: slotIndex,
                            zone_type: zoneType,
                            position: positionChosen
                        });
                    }

                    selectedHandCardIndex = -1;
                    selectedHandCardId = null;
                    document.querySelectorAll('.hand-card').forEach(c => c.classList.remove('selected-hand'));
                    highlightAvailableSlots(false, true);
                    return;
                }
            }

            // 2. SELECCIÓN DE MONSTRUO PROPIO EN CAMPO
            if (zoneType === 'P_M') {
                selectedAttackerSlot = slotIndex;
                const slotElem = document.getElementById(`p-m${slotIndex}`);
                if (slotElem) slotElem.classList.add('slot-targeted');

                const monsterObj = localPlayer && localPlayer.monsters ? localPlayer.monsters[slotIndex] : null;
                if (monsterObj) {
                    inspectMonsterSlot(localKey, slotIndex);

                    if (event) {
                        event.stopPropagation();
                        const actions = [];
                        const cardData = monsterObj.card_data || {};
                        const isEffectMonster = (cardData.type && cardData.type.includes('Effect'));

                        // 1. Activar Efecto de Monstruo (Regla OCG: En Main Phase 1 o 2, boca arriba y cumpliendo requerimientos)
                        if (((state && (state.phase === 'MAIN_1' || state.phase === 'MAIN_2')) || !state) && !monsterObj.faceDown && isEffectMonster) {
                            const monCheck = canActivateMonsterEffectOnField(monsterObj);
                            if (monCheck.canActivate) {
                                if (cardData.effectOptions && Array.isArray(cardData.effectOptions)) {
                                    cardData.effectOptions.forEach(opt => {
                                        actions.push({
                                            label: opt.label || '✨ Activar Efecto',
                                            onClick: () => triggerMonsterEffect(slotIndex, monsterObj.card_id, { effect_choice: opt.choice })
                                        });
                                    });
                                } else {
                                    actions.push({
                                        label: `✨ Activar Efecto (${cardData.name})`,
                                        onClick: () => triggerMonsterEffect(slotIndex, monsterObj.card_id)
                                    });
                                }
                            }
                        }

                        // 2. Cambiar Posición de Batalla (Reglas Oficiales Konami OCG)
                        if ((state && (state.phase === 'MAIN_1' || state.phase === 'MAIN_2')) || !state) {
                            const isSummonedThisTurn = monsterObj.turnSummoned === (state ? state.turnNumber : 1);
                            const hasAttackedThisTurn = !!monsterObj.hasAttacked;
                            const isTrapped = !!monsterObj.isTrapped || (monsterObj.attachedEffects && monsterObj.attachedEffects.some(e => e.effect_type === 'CANNOT_ATTACK'));
                            const hasChangedPosThisTurn = !!monsterObj.hasChangedPosition;
                            const cd = cardData || monsterObj.card_data || {};
                            const r = (cd.race || monsterObj.race || '').toLowerCase();
                            const t = (cd.type || monsterObj.type || '').toLowerCase();
                            const n = (cd.name || monsterObj.name || '').toLowerCase();
                            const raceCode = Number(cd.raceCode || monsterObj.raceCode || 0);
                            const isDragon = ((raceCode & 0x2000) !== 0) || r === 'dragon' || r.includes('dragon') || t.includes('dragon') || n.includes('dragon') || n.includes('dragón');
                            const isDragonJarActive = [...((localPlayer && localPlayer.spells) || []), ...((rivalPlayer && rivalPlayer.spells) || [])].some(s => s && s.card_data && s.card_data.name && s.card_data.name.includes('Jarra') && !s.faceDown && s.position !== 'SET');

                            if (isDragonJarActive && isDragon && (monsterObj.position === 'DEF' || monsterObj.faceDown)) {
                                actions.push({
                                    label: '🏺 Atrapado en la Jarra (DEF)',
                                    onClick: () => showRuleAlert('⚠️ [Jarra de Captura de Dragones] Los monstruos Dragón están sellados en Posición de Defensa y no pueden cambiar a Modo de Ataque mientras la Jarra esté activa.')
                                });
                            } else if (isTrapped) {
                                actions.push({
                                    label: 'Posición Bloqueada (Atrapado)',
                                    onClick: () => showRuleAlert('⚠️ [Regla Oficial OCG] Este monstruo está atrapado por Círculo Atador de Hechizos y no puede cambiar su posición de batalla.')
                                });
                            } else if (isSummonedThisTurn) {
                                actions.push({
                                    label: 'Invocado Este Turno (No cambiable)',
                                    onClick: () => showRuleAlert('⚠️ [Regla Oficial OCG] No puedes cambiar manualmente la posición de este monstruo en el turno en que fue invocado. (Sí puedes declarar ataque durante la Battle Phase).')
                                });
                            } else if (hasAttackedThisTurn) {
                                actions.push({
                                    label: 'Ya Atacó (No cambiable)',
                                    onClick: () => showRuleAlert('⚠️ [Regla Oficial OCG] Un monstruo que declaró un ataque este turno no puede cambiar su posición de batalla.')
                                });
                            } else if (hasChangedPosThisTurn) {
                                actions.push({
                                    label: 'Ya Cambió Posición (1 por turno)',
                                    onClick: () => showRuleAlert('⚠️ [Regla Oficial OCG] Cada monstruo solo puede cambiar manualmente de posición una vez por turno.')
                                });
                            } else {
                                const isFlipSummon = (monsterObj.position === 'DEF' && monsterObj.faceDown);
                                const nextPosLabel = isFlipSummon 
                                    ? 'Invocación por Volteo (ATK)' 
                                    : (monsterObj.position === 'ATK' ? 'Cambiar a Defensa (DEF)' : 'Cambiar a Ataque (ATK)');
                                actions.push({
                                    label: nextPosLabel,
                                    onClick: () => {
                                        if (isFlipSummon) {
                                            const flipId = monsterObj.card_id || (cardData ? cardData.id : 0);
                                            const targetMode = isCardRequiringTarget(flipId);
                                            if (targetMode) {
                                                startInteractiveTargeting(targetMode, flipId, slotIndex, false, false, cardData.name || 'Monstruo', 'CHANGE_POS');
                                                return;
                                            }
                                        }
                                        triggerChangePos();
                                    }
                                });
                            }
                        }

                        // 3. Declarar Ataque
                        const rivalHasSwordsActive = rivalPlayer && rivalPlayer.spells && rivalPlayer.spells.some(s => s && s.card_data && s.card_data.name && s.card_data.name.includes('Espadas') && !s.faceDown);

                        if (lastDuelState.phase === 'BATTLE') {
                            if (rivalHasSwordsActive) {
                                actions.push({
                                    label: '⚔️ Bloqueado por Espadas (No puede atacar)',
                                    onClick: () => showRuleAlert('⚠️ [Espadas de la Luz Reveladora] No puedes declarar ataques mientras las Espadas de la Luz Reveladora del oponente permanezcan activas en el campo.')
                                });
                            } else if (monsterObj.position !== 'ATK') {
                                actions.push({
                                    label: 'En Defensa (No puede atacar)',
                                    onClick: () => showRuleAlert('⚠️ [Regla Oficial] Un monstruo en Posición de Defensa no puede declarar ataque.')
                                });
                            } else if (monsterObj.hasAttacked) {
                                actions.push({
                                    label: 'Ya Atacó este Turno',
                                    onClick: () => showRuleAlert('⚠️ [Regla Oficial] Este monstruo ya ha declarado su ataque en este turno.')
                                });
                            } else {
                                selectedAttackerSlot = slotIndex;
                                triggerAttack();
                                return;
                            }
                        } else if (lastDuelState.phase === 'MAIN_1') {
                            if (lastDuelState.turnNumber === 1) {
                                actions.push({
                                    label: '🚫 Batalla no disponible (Turno 1)',
                                    onClick: () => showRuleAlert('⚠️ [Regla Oficial Konami] El primer jugador no puede entrar a la Battle Phase ni declarar ataques en el Turno 1 del duelo.')
                                });
                            } else if (monsterObj.position === 'ATK' && !monsterObj.hasAttacked) {
                                if (rivalHasSwordsActive) {
                                    actions.push({
                                        label: '⚔️ Ataques Bloqueados por Espadas',
                                        onClick: () => showRuleAlert('⚠️ [Espadas de la Luz Reveladora] Las Espadas de la Luz Reveladora del rival impiden declarar ataques.')
                                    });
                                } else {
                                    actions.push({
                                        label: 'Ir a Battle Phase y Atacar',
                                        onClick: () => {
                                            advanceToPhase('BATTLE');
                                            selectedAttackerSlot = slotIndex;
                                            triggerAttack();
                                        }
                                    });
                                }
                            }
                        }

                        actions.push({
                            label: 'Info Carta',
                            onClick: () => {
                                if (typeof showCardInfoFloating === 'function') {
                                    showCardInfoFloating(cardData || monsterObj.card_id);
                                }
                            }
                        });

                        if (actions.length > 0) {
                            showContextMenu(event, cardData.name || 'Monstruo', actions);
                        }
                    }
                }
            }
            // 3. SELECCIÓN DE OBJETIVO RIVAL EN CAMPO
            else if (zoneType === 'R_M') {
                const rMonster = rivalPlayer && rivalPlayer.monsters ? rivalPlayer.monsters[slotIndex] : null;
                
                // Si estamos en modo de selección de objetivo de ataque activo o en Battle Phase con atacante seleccionado:
                if ((isAttackTargetingMode || (lastDuelState && lastDuelState.phase === 'BATTLE')) && selectedAttackerSlot >= 0 && rMonster) {
                    executeAttack(selectedAttackerSlot, slotIndex);
                    return;
                }

                selectedRivalTargetSlot = slotIndex;
                const rivalSlotElem = document.getElementById(`r-m${slotIndex}`);
                if (rivalSlotElem) rivalSlotElem.classList.add('slot-targeted');

                if (rMonster) {
                    inspectMonsterSlot(rivalKey, slotIndex);

                    if (event) {
                        event.stopPropagation();
                        const actions = [];
                        const cardData = rMonster.card_data || {};

                        // Opción de Atacar si estamos en Battle Phase con atacante seleccionado
                        if (lastDuelState && lastDuelState.phase === 'BATTLE' && selectedAttackerSlot >= 0 && localPlayer && localPlayer.monsters && localPlayer.monsters[selectedAttackerSlot]) {
                            actions.push({
                                label: 'Atacar a este Monstruo',
                                onClick: () => executeAttack(selectedAttackerSlot, slotIndex)
                            });
                        }

                        // Info Carta disponible para monstruos boca arriba del rival
                        if (!rMonster.faceDown) {
                            actions.push({
                                label: 'Info Carta',
                                onClick: () => {
                                    if (typeof showCardInfoFloating === 'function') {
                                        showCardInfoFloating(cardData || rMonster.card_id);
                                    }
                                }
                            });
                        }

                        if (actions.length > 0) {
                            showContextMenu(event, !rMonster.faceDown && cardData.name ? cardData.name : 'Monstruo Rival', actions);
                        } else if (rMonster.faceDown) {
                            showRuleAlert('⚠️ [Monstruo Oculto] El monstruo del rival está en Posición de Defensa boca abajo.');
                        }
                    }
                }
            } 
            // 4. MAGIAS / TRAMPAS PROPIAS EN CAMPO
            else if (zoneType === 'P_S') {
                const sObj = localPlayer && localPlayer.spells ? localPlayer.spells[slotIndex] : null;
                if (sObj) {
                    inspectCardById(sObj.card_id);
                    const isFaceDown = sObj.faceDown === true || sObj.position === 'SET';

                    if (event) {
                        event.stopPropagation();
                        const actions = [];
                        if (isFaceDown) {
                            const check = checkCardActivationEligibility(sObj, 'FIELD');
                            if (check.canActivate) {
                                const sNumId = Number(sObj.card_id || (sObj.card_data && sObj.card_data.id) || 0);
                                if (sNumId === 98045062) { // Enemy Controller
                                    const oppMonsters = rivalPlayer && rivalPlayer.monsters ? rivalPlayer.monsters.filter(m => m && !m.faceDown) : [];
                                    const myMonsters = localPlayer && localPlayer.monsters ? localPlayer.monsters.filter(m => m !== null) : [];
                                    if (oppMonsters.length > 0) {
                                        actions.push({
                                            label: '🎮 Opción 1: Cambiar Posición de Monstruo Rival',
                                            onClick: () => activateCardDirectly(sObj.card_id, false, slotIndex, 'Enemy Controller', { effect_choice: 1 })
                                        });
                                    }
                                    if (oppMonsters.length > 0 && myMonsters.length > 0) {
                                        actions.push({
                                            label: '🎮 Opción 2: Sacrificar Aliado y Tomar Control',
                                            onClick: () => activateCardDirectly(sObj.card_id, false, slotIndex, 'Enemy Controller', { effect_choice: 2 })
                                        });
                                    }
                                } else if (sNumId === 8842266) { // Poison of the Old Man
                                    actions.push({
                                        label: '💖 Opción 1: Recuperar 1200 LP',
                                        onClick: () => activateCardDirectly(sObj.card_id, false, slotIndex, 'Poison of the Old Man', { effect_choice: 1 })
                                    });
                                    actions.push({
                                        label: '🔥 Opción 2: Infligir 800 Daño al Rival',
                                        onClick: () => activateCardDirectly(sObj.card_id, false, slotIndex, 'Poison of the Old Man', { effect_choice: 2 })
                                    });
                                } else if (sNumId === 55991637) { // Dragon's Gunfire
                                    actions.push({
                                        label: '🔥 Opción 1: Infligir 800 Daño al Rival',
                                        onClick: () => activateCardDirectly(sObj.card_id, false, slotIndex, "Dragon's Gunfire", { effect_choice: 1 })
                                    });
                                    const oppDefMonsters = rivalPlayer && rivalPlayer.monsters ? rivalPlayer.monsters.filter(m => m && Number(m.def !== undefined ? m.def : (m.currentDef || 0)) <= 800) : [];
                                    if (oppDefMonsters.length > 0) {
                                        actions.push({
                                            label: '💥 Opción 2: Destruir Monstruo Rival (DEF ≤ 800)',
                                            onClick: () => activateCardDirectly(sObj.card_id, false, slotIndex, "Dragon's Gunfire", { effect_choice: 2 })
                                        });
                                    }
                                } else if (sNumId === 76754619) { // Pyramid Energy
                                    actions.push({
                                        label: '⚔️ Opción 1: +200 ATK a todos tus monstruos',
                                        onClick: () => activateCardDirectly(sObj.card_id, false, slotIndex, 'Pyramid Energy', { effect_choice: 1 })
                                    });
                                    actions.push({
                                        label: '🛡️ Opción 2: +500 DEF a todos tus monstruos',
                                        onClick: () => activateCardDirectly(sObj.card_id, false, slotIndex, 'Pyramid Energy', { effect_choice: 2 })
                                    });
                                } else if (sNumId === 81426505) { // Six Strike - Triple Impact
                                    actions.push({
                                        label: '⚔️ Opción 1: Destruir Monstruos Boca Arriba Rivales',
                                        onClick: () => activateCardDirectly(sObj.card_id, false, slotIndex, 'Six Strike - Triple Impact', { effect_choice: 1 })
                                    });
                                    actions.push({
                                        label: '✨ Opción 2: Destruir Magias/Trampas Boca Arriba Rivales',
                                        onClick: () => activateCardDirectly(sObj.card_id, false, slotIndex, 'Six Strike - Triple Impact', { effect_choice: 2 })
                                    });
                                    actions.push({
                                        label: '🔒 Opción 3: Destruir Todas las Cartas Boca Abajo (SET)',
                                        onClick: () => activateCardDirectly(sObj.card_id, false, slotIndex, 'Six Strike - Triple Impact', { effect_choice: 3 })
                                    });
                                } else if (sNumId === 9780364) { // Gladiator Taming
                                    actions.push({
                                        label: '🔄 Opción 1: Cambiar Posición de Monstruo Rival',
                                        onClick: () => activateCardDirectly(sObj.card_id, false, slotIndex, 'Gladiator Taming', { effect_choice: 1 })
                                    });
                                    const oppGladBeast = rivalPlayer && rivalPlayer.monsters ? rivalPlayer.monsters.some(m => m && !m.faceDown && ((m.card_data?.name || m.name || '').toLowerCase().includes('gladiator beast') || (m.card_data?.name || m.name || '').toLowerCase().includes('bestia gladiad'))) : false;
                                    if (oppGladBeast) {
                                        actions.push({
                                            label: '👑 Opción 2: Tomar Control de Bestia Gladiador Rival',
                                            onClick: () => activateCardDirectly(sObj.card_id, false, slotIndex, 'Gladiator Taming', { effect_choice: 2 })
                                        });
                                    }
                                } else if (sNumId === 23212990) { // Six Strike - Thunder Blast
                                    actions.push({
                                        label: '⚡ Opción 1: Destruir 1 Monstruo Rival',
                                        onClick: () => activateCardDirectly(sObj.card_id, false, slotIndex, 'Six Strike - Thunder Blast', { effect_choice: 1 })
                                    });
                                    actions.push({
                                        label: '⚡ Opción 2: Devolver 1 Carta Rival a la Mano',
                                        onClick: () => activateCardDirectly(sObj.card_id, false, slotIndex, 'Six Strike - Thunder Blast', { effect_choice: 2 })
                                    });
                                } else if (sNumId === 37390589) { // Kunai with Chain
                                    actions.push({
                                        label: '🛡️ Opción 1: Cambiar Atacante Rival a Posición de Defensa',
                                        onClick: () => activateCardDirectly(sObj.card_id, false, slotIndex, 'Kunai with Chain', { effect_choice: 1 })
                                    });
                                    actions.push({
                                        label: '⚔️ Opción 2: Equipar y Aumentar +500 ATK',
                                        onClick: () => activateCardDirectly(sObj.card_id, false, slotIndex, 'Kunai with Chain', { effect_choice: 2 })
                                    });
                                } else if (sNumId === 15552258) { // Half or Nothing
                                    actions.push({
                                        label: '⚖️ Opción 1: Reducir ATK Rival a la Mitad',
                                        onClick: () => activateCardDirectly(sObj.card_id, false, slotIndex, 'Half or Nothing', { effect_choice: 1 })
                                    });
                                    actions.push({
                                        label: '🛑 Opción 2: Finalizar la Battle Phase',
                                        onClick: () => activateCardDirectly(sObj.card_id, false, slotIndex, 'Half or Nothing', { effect_choice: 2 })
                                    });
                                } else if (sNumId === 24673894) { // Changing Destiny
                                    actions.push({
                                        label: '🛡️ Opción 1: Negar Ataque e Infligir Daño (Mitad ATK)',
                                        onClick: () => activateCardDirectly(sObj.card_id, false, slotIndex, 'Changing Destiny', { effect_choice: 1 })
                                    });
                                    actions.push({
                                        label: '✨ Opción 2: Negar Ataque y Oponente Gana LP (ATK)',
                                        onClick: () => activateCardDirectly(sObj.card_id, false, slotIndex, 'Changing Destiny', { effect_choice: 2 })
                                    });
                                } else {
                                    actions.push({
                                        label: '✨ Activar Carta / Efecto',
                                        onClick: () => {
                                            activateCardDirectly(sObj.card_id, false, slotIndex, sObj.card_data ? sObj.card_data.name : 'Magia/Trampa');
                                        }
                                    });
                                }
                            }
                        } else {
                            // CARTA BOCA ARRIBA EN ZONA DE MAGIA/TRAMPA
                            const cData = sObj.card_data || {};
                            const cId = Number(sObj.card_id || cData.id || 0);
                            const isUnionMonster = sObj.isUnionEquip || [65622692, 64500000, 74364659, 12472242, 30068120, 21417692, 93220025, 40048328].includes(cId) || ((cData.type || '').includes('Union')) || ((cData.desc || '').includes('Special Summon this card') && (cData.desc || '').includes('equip'));

                            if (isUnionMonster && isMyTurn && (lastDuelState.phase === 'MAIN_1' || lastDuelState.phase === 'MAIN_2')) {
                                actions.push({
                                    label: `⚙️ Desequipar e Invocar Especial (${cData.name || 'Unión'})`,
                                    onClick: () => {
                                        const activeSocket = getActiveSocket();
                                        if (activeSocket) {
                                            activeSocket.emit('OCG_ACTIVATE_CARD', {
                                                room_id: getActiveDuelRoomId(),
                                                card_id: cId,
                                                slot_index: slotIndex,
                                                from_hand: false,
                                                target_data: {
                                                    slot_index: slotIndex,
                                                    source_slot: slotIndex
                                                }
                                            });
                                        }
                                    }
                                });
                            } else if (isMyTurn && (lastDuelState.phase === 'MAIN_1' || lastDuelState.phase === 'MAIN_2')) {
                                // Magias continuas / Cartas con contadores / Efectos manuales: SOLO si tienen efecto de ignición modular y cumplen requisitos
                                const isFieldIgnitionCard = Boolean(cData.hasIgnitionEffect || cData.hasFieldEffect) || (sObj.bushidoCounters > 0) || (sObj.spellCounters > 0);
                                const fieldCheck = checkCardActivationEligibility(sObj, 'FIELD');
                                if (isFieldIgnitionCard && fieldCheck.canActivate) {
                                    actions.push({
                                        label: `✨ Activar Efecto (${cData.name || 'Carta'})`,
                                        onClick: () => {
                                            activateCardDirectly(sObj.card_id, false, slotIndex, cData.name || 'Carta');
                                        }
                                    });
                                }
                            }
                        }
                        actions.push({
                            label: 'ℹ️ Info Carta',
                            onClick: () => {
                                if (typeof showCardInfoFloating === 'function') {
                                    showCardInfoFloating(sObj.card_data || sObj.card_id);
                                }
                            }
                        });
                        showContextMenu(event, sObj.card_data ? sObj.card_data.name : 'Magia/Trampa', actions);
                    }
                }
            }
            // 5. MAGIAS / TRAMPAS DEL RIVAL EN CAMPO
            else if (zoneType === 'R_S') {
                const sObj = rivalPlayer && rivalPlayer.spells ? rivalPlayer.spells[slotIndex] : null;
                if (sObj) {
                    if (!sObj.faceDown) {
                        inspectCardById(sObj.card_id);
                        if (event) {
                            event.stopPropagation();
                            showContextMenu(event, sObj.card_data ? sObj.card_data.name : 'Magia/Trampa Rival', [
                                {
                                    label: 'ℹ️ Info Carta',
                                    onClick: () => {
                                        if (typeof showCardInfoFloating === 'function') {
                                            showCardInfoFloating(sObj.card_data || sObj.card_id);
                                        }
                                    }
                                }
                            ]);
                        }
                    } else {
                        showRuleAlert('⚠️ [Carta Oculta] La carta del rival está boca abajo.');
                    }
                }
            }
            // 6. CAMPO MÁGICO PROPIO
            else if (zoneType === 'P_CAMPO') {
                const fObj = localPlayer && localPlayer.fieldSpell ? localPlayer.fieldSpell : null;
                if (fObj) {
                    inspectCardById(fObj.card_id || fObj.id);
                    if (event) {
                        event.stopPropagation();
                        const isSet = fObj.faceDown || fObj.position === 'SET';
                        if (isFusionGate && !isSet && isMyTurn && (lastDuelState.phase === 'MAIN_1' || lastDuelState.phase === 'MAIN_2')) {
                            actions.push({
                                label: '🌀 Invocar por Fusión (Fusion Gate)',
                                onClick: () => {
                                    const check = typeof window.checkCanPerformFusion === 'function' ? window.checkCanPerformFusion(true) : checkCanPerformFusion(true);
                                    if (!check.canFusion) {
                                        showRuleAlert(`⚠️ [Fusion Gate] ${check.reason || 'No tienes materiales en mano/campo para invocar por Fusión.'}`);
                                        return;
                                    }
                                    if (typeof window.openFusionModal === 'function') {
                                        window.openFusionModal(check.availableFusions, true, false);
                                    }
                                }
                            });
                        } else if (isMyTurn && (lastDuelState.phase === 'MAIN_1' || lastDuelState.phase === 'MAIN_2')) {
                            if (isSet) {
                                actions.push({
                                    label: '🌌 Activar Campo Mágico (Voltear)',
                                    onClick: () => {
                                        activateCardDirectly(fObj.card_id || fObj.id, false, -1, fObj.card_data?.name || fObj.name || 'Campo');
                                    }
                                });
                            } else if (fObj.card_data?.hasIgnitionEffect || fObj.hasIgnitionEffect) {
                                actions.push({
                                    label: `✨ Activar Efecto de Campo (${fObj.card_data?.name || fObj.name || 'Campo'})`,
                                    onClick: () => {
                                        activateCardDirectly(fObj.card_id || fObj.id, false, -1, fObj.card_data?.name || fObj.name || 'Campo');
                                    }
                                });
                            }
                        }
                        actions.push({
                            label: 'ℹ️ Info Carta',
                            onClick: () => {
                                if (typeof showCardInfoFloating === 'function') {
                                    showCardInfoFloating(fObj.card_data || fObj.card_id || fObj.id);
                                }
                            }
                        });
                        showContextMenu(event, fObj.card_data ? fObj.card_data.name : 'Tu Campo', actions);
                    }
                }
            }
            // 7. CAMPO MÁGICO RIVAL
            else if (zoneType === 'R_CAMPO') {
                const fObj = rivalPlayer && rivalPlayer.fieldSpell ? rivalPlayer.fieldSpell : null;
                if (fObj) {
                    inspectCardById(fObj.card_id || fObj.id);
                    if (event) {
                        event.stopPropagation();
                        const isFusionGate = Number(fObj.card_id || fObj.id) === 33550694;
                        const actions = [];
                        if (isFusionGate && isMyTurn && (lastDuelState.phase === 'MAIN_1' || lastDuelState.phase === 'MAIN_2')) {
                            actions.push({
                                label: '🌀 Invocar por Fusión (Fusion Gate)',
                                onClick: () => {
                                    const check = typeof window.checkCanPerformFusion === 'function' ? window.checkCanPerformFusion(true) : checkCanPerformFusion(true);
                                    if (!check.canFusion) {
                                        showRuleAlert(`⚠️ [Fusion Gate] ${check.reason || 'No tienes materiales en mano/campo para invocar por Fusión.'}`);
                                        return;
                                    }
                                    if (typeof window.openFusionModal === 'function') {
                                        window.openFusionModal(check.availableFusions, true, false);
                                    }
                                }
                            });
                        }
                        actions.push({
                            label: 'ℹ️ Info Carta',
                            onClick: () => {
                                if (typeof showCardInfoFloating === 'function') {
                                    showCardInfoFloating(fObj.card_data || fObj.card_id || fObj.id);
                                }
                            }
                        });
                        showContextMenu(event, fObj.card_data ? fObj.card_data.name : 'Campo Rival', actions);
                    }
                }
            }
        }

        // =========================================================================
        // MOTOR DE CADENAS BIDIRECCIONAL ("A LA INVERSA")
        // =========================================================================

        function triggerChangePos() {
            const activeSocket = getActiveSocket();
            if (activeSocket) {
                activeSocket.emit('CMD_ACTION', {
                    room_id: getActiveDuelRoomId(),
                    action_type: 'CHANGE_POS',
                    slot_index: selectedAttackerSlot
                });
            }
        }

        function triggerAttack() {
            if (!lastDuelState) return;
            if (lastDuelState.turnNumber === 1) {
                showRuleAlert('⚠️ [Regla Oficial Konami] El primer jugador no puede declarar ataques en el Turno 1 del duelo.');
                return;
            }
            if (lastDuelState.phase !== 'BATTLE') {
                showRuleAlert('⚠️ [Regla Oficial] No puedes atacar durante la fase actual. Pasa primero a la BATTLE PHASE.');
                return;
            }

            const local = getLocalDuelPlayer();
            const rival = getRivalDuelPlayer();

            const rivalHasSwords = rival && rival.spells && rival.spells.some(s => s && s.card_data && s.card_data.name && s.card_data.name.includes('Espadas') && !s.faceDown);
            if (rivalHasSwords) {
                showRuleAlert('⚠️ [Espadas de la Luz Reveladora] No puedes declarar ataques mientras las Espadas de la Luz Reveladora del oponente permanezcan activas en el campo.');
                return;
            }

            if (selectedAttackerSlot < 0 || !local || !local.monsters || !local.monsters[selectedAttackerSlot]) {
                showRuleAlert('⚠️ Selecciona un monstruo en tu campo para atacar.');
                return;
            }

            const attMonster = local.monsters[selectedAttackerSlot];
            if (attMonster.hasAttacked) {
                showRuleAlert('⚠️ [Regla Oficial] Este monstruo ya atacó durante este turno.');
                return;
            }

            selectedRivalTargetSlot = -1; // Resetear siempre cualquier objetivo residual anterior

            const rivalHasMonsters = rival && rival.monsters && rival.monsters.some(m => m !== null);
            if (rivalHasMonsters) {
                isAttackTargetingMode = true;
                // Limpiar resaltados previos y marcar ranuras rivales válidas
                document.querySelectorAll('.field-slot').forEach(el => {
                    el.classList.remove('slot-targeted');
                    el.classList.remove('slot-attack-target');
                });
                for (let i = 0; i < 5; i++) {
                    const rSlot = document.getElementById(`r-m${i}`);
                    if (rSlot && rival.monsters && rival.monsters[i]) {
                        rSlot.classList.add('slot-attack-target');
                    }
                }
                const attName = attMonster && attMonster.card_data ? attMonster.card_data.name : 'Monstruo';
                showRuleAlert(`⚔️ [${attName}] Haz clic en el monstruo rival al que deseas declarar ataque.`);
            } else {
                // Ataque directo si el rival no controla monstruos
                executeAttack(selectedAttackerSlot, -1);
            }
        }

        function triggerDirectAttack() {
            executeAttack(selectedAttackerSlot, -1);
        }

        function executeAttack(attackerSlot, targetSlot) {
            isAttackTargetingMode = false;
            selectedRivalTargetSlot = -1;
            document.querySelectorAll('.field-slot').forEach(el => {
                el.classList.remove('slot-targeted');
                el.classList.remove('slot-attack-target');
            });

            if (attackerSlot === undefined || attackerSlot < 0) {
                showRuleAlert('⚠️ Primero selecciona un monstruo atacante en tu campo.');
                return;
            }
            const activeSocket = getActiveSocket();
            const myUsername = (window.currentUser && window.currentUser.username) 
                || (window.Session && window.Session.getUser() && window.Session.getUser().username) 
                || '';
            if (activeSocket) {
                activeSocket.emit('CLIENT_ATTACK', {
                    room_id: getActiveDuelRoomId(),
                    player_name: myUsername,
                    attacker_slot: attackerSlot,
                    target_slot: targetSlot
                });
            }
        }

        function sendAction(actionType) {
            const activeSocket = getActiveSocket();
            if (activeSocket) {
                activeSocket.emit('CMD_ACTION', {
                    room_id: getActiveDuelRoomId(),
                    action_type: actionType,
                    slot_index: selectedAttackerSlot,
                    card_id: selectedHandCardId
                });
            }
        }

        function showRuleAlert(msg) {
            const banner = document.getElementById('rule-alert-banner');
            if (banner) {
                banner.textContent = msg;
                banner.style.display = 'block';
                setTimeout(() => banner.style.display = 'none', 3500);
            }
        }

        function bindDuelActionsSocketEvents() {
            const actionSocket = getActiveSocket();
            if (!actionSocket) {
                setTimeout(bindDuelActionsSocketEvents, 200);
                return;
            }
            actionSocket.off('ACTION_ERROR');
            actionSocket.on('ACTION_ERROR', (data) => {
                showRuleAlert(data.message || 'Error en la acción solicitada.');
                isAttackTargetingMode = false;
                window.isAttackTargetingMode = false;
                if (typeof cancelInteractiveTargeting === 'function') cancelInteractiveTargeting();
                selectedHandCardIndex = -1;
                selectedHandCardId = null;
                document.querySelectorAll('.hand-card').forEach(c => c.classList.remove('selected-hand'));
                if (typeof highlightAvailableSlots === 'function') highlightAvailableSlots(false, false);
            });

            actionSocket.off('CHAIN_START');
            actionSocket.on('CHAIN_START', (data) => {
                const banner = document.getElementById('trap-chain-banner');
                if (banner) {
                    banner.textContent = data.message || '¡Cadena activada!';
                    banner.style.display = 'block';
                    setTimeout(() => banner.style.display = 'none', 4500);
                }
            });
        }
        bindDuelActionsSocketEvents();
        if (typeof window !== 'undefined') {
            window.bindDuelActionsSocketEvents = bindDuelActionsSocketEvents;
        }

        // =========================================================================
        // MOTOR DE CONTROL Y NAVEGACIÓN DE FASES OFICIALES (KONAMI OCG/TCG)
        // =========================================================================

        // Exportaciones globales para eventos HTML
        window.selectHandCard = selectHandCard;
        window.onSlotClick = onSlotClick;
        window.setSummonMode = setSummonMode;
        window.triggerChangePos = triggerChangePos;
        window.triggerAttack = triggerAttack;
        window.triggerDirectAttack = triggerDirectAttack;
        window.executeAttack = executeAttack;
        window.sendAction = sendAction;
        if (typeof activateCardDirectly !== 'undefined') window.activateCardDirectly = activateCardDirectly;
        if (typeof performTributeSummon !== 'undefined') window.performTributeSummon = performTributeSummon;
        if (typeof showContextMenu !== 'undefined') window.showContextMenu = showContextMenu;
        if (typeof hideContextMenu !== 'undefined') window.hideContextMenu = hideContextMenu;
        if (typeof showRuleAlert !== 'undefined') window.showRuleAlert = showRuleAlert;
