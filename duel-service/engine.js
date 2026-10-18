const fs = require('fs');
const path = require('path');
const { createOcgcoreWrapper, SqljsCardReader } = require('koishipro-core.js');
const { IdleCmdType, BattleCmdType, IndexResponse } = require('ygopro-msg-encode');
const initSqlJs = require('sql.js');

class DuelEngine {
  constructor() {
    this.wrapper = null;
    this.sqlDb = null;
    this.activeDuels = new Map();
    this.bundledConstant = '';
    this.bundledUtility = '';
    this.scriptDir = path.join(__dirname, 'data', 'script');
    this.officialDir = path.join(__dirname, 'data', 'script', 'official');
  }

  async init() {
    if (this.wrapper) return;

    console.log('[DuelEngine] Initializing Official Project Ignis / Ocgcore WASM Engine...');

    // 1. Prepare Constant bundle
    const rawConstant = fs.readFileSync(path.join(this.scriptDir, 'constant.lua'), 'utf8');
    const cleanConstant = rawConstant.replace(/Duel\.LoadScript\([^)]+\)/g, '');
    const cardCounters = fs.readFileSync(path.join(this.scriptDir, 'card_counter_constants.lua'), 'utf8');
    const archetypes = fs.readFileSync(path.join(this.scriptDir, 'archetype_setcode_constants.lua'), 'utf8');
    this.bundledConstant = cleanConstant + '\n' + cardCounters + '\n' + archetypes;

    // 2. Prepare Utility bundle with Project Ignis / EDOPro shims
    const rawUtility = fs.readFileSync(path.join(this.scriptDir, 'utility.lua'), 'utf8');
    let cleanUtility = rawUtility.replace(/Duel\.LoadScript\([^)]+\)/g, '');
    cleanUtility = cleanUtility.replace('function GetID()\n\treturn self_table,self_code\nend', `-- overridden GetID`);

    const edoproCompatibilityShims = `
if Group and not Group.Match then
  function Group.Match(g, f, ex, ...) return g:Filter(f, ex, ...) end
end
if Group and not Group.Includes then
  function Group.Includes(g, c) return g:IsContains(c) end
end
if Effect and not Effect.GetReset then
  function Effect.GetReset(e) return 0, 0 end
end
if Card and not Card.GetReset then
  function Card.GetReset(c) return 0, 0 end
end
if Duel and not Duel.GetPlayerEffect then
  function Duel.GetPlayerEffect(p, code)
    local eff = Duel.IsPlayerAffectedByEffect(p, code)
    if eff then return eff end
    return nil
  end
end
function GetID()
  if self_table and self_code then return self_table, self_code end
  local info = debug.getinfo(2, "S")
  if info and info.source then
    local code = info.source:match("c(%d+)%.lua")
    if code then
      local id = tonumber(code)
      _G["c" .. id] = _G["c" .. id] or {}
      self_table = _G["c" .. id]
      self_code = id
      return self_table, self_code
    end
  end
  return self_table, self_code
end
`;
    this.bundledUtility = edoproCompatibilityShims + '\n' + cleanUtility;

    // 3. Create WASM Wrapper
    this.wrapper = await createOcgcoreWrapper();

    // 4. Attach Card Database (cards.cdb SQLite)
    const SQL = await initSqlJs();
    const dbBuffer = fs.readFileSync(path.join(__dirname, 'data', 'cards.cdb'));
    this.sqlDb = new SQL.Database(dbBuffer);
    this.wrapper.setCardReader(SqljsCardReader(SQL, dbBuffer));

    // 5. Attach Script Reader
    this.wrapper.setScriptReader((scriptPath) => {
      let clean = scriptPath.replace(/^\.?\/script\//, '').replace(/^\.?\//, '');
      if (clean === 'constant.lua') return this.bundledConstant;
      if (clean === 'utility.lua') return this.bundledUtility;

      let p = path.join(this.scriptDir, clean);
      if (fs.existsSync(p)) return fs.readFileSync(p);

      p = path.join(this.officialDir, clean);
      if (fs.existsSync(p)) return fs.readFileSync(p);

      return null;
    });

    console.log('[DuelEngine] Official Project Ignis engine online with 20,000+ scripts.');
  }

  getCardDetails(code) {
    if (!code || !this.sqlDb) return null;
    try {
      const stmt = this.sqlDb.prepare("SELECT d.id, d.atk, d.def, d.level, d.type, d.race, d.attribute, t.name, t.desc FROM datas d JOIN texts t ON d.id = t.id WHERE d.id = :id");
      stmt.bind({ ':id': Number(code) });
      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return {
          id: row.id,
          code: row.id,
          name: row.name,
          desc: row.desc,
          atk: row.atk,
          def: row.def,
          level: (row.level & 0xff),
          type: row.type,
          isMonster: (row.type & 0x1) !== 0,
          isSpell: (row.type & 0x2) !== 0,
          isTrap: (row.type & 0x4) !== 0,
          image: `/assets/images/cards/${row.id}.jpg`
        };
      }
      stmt.free();
    } catch (e) {
      // ignore sql lookup errors
    }
    return {
      id: code,
      code: code,
      name: `Card #${code}`,
      desc: '',
      atk: 0,
      def: 0,
      level: 1,
      isMonster: true,
      image: `/assets/images/cards/${code}.jpg`
    };
  }

  createDuel({ duelId, player0Deck = [], player1Deck = [], lp = 8000, startHand = 5, drawCount = 1, seed = 424242, isNpc = true }) {
    if (this.activeDuels.has(duelId)) {
      this.endDuel(duelId);
    }

    const duel = this.wrapper.createDuel(seed);

    // Preload all procedure scripts
    const procsToPreload = [
      './script/debug_utility.lua',
      './script/cards_specific_functions.lua',
      './script/proc_fusion.lua',
      './script/proc_fusion_spell.lua',
      './script/proc_ritual.lua',
      './script/proc_synchro.lua',
      './script/proc_union.lua',
      './script/proc_xyz.lua',
      './script/proc_pendulum.lua',
      './script/proc_link.lua',
      './script/proc_equip.lua',
      './script/proc_persistent.lua',
      './script/proc_workaround.lua',
      './script/proc_normal.lua',
      './script/proc_gemini.lua',
      './script/proc_spirit.lua',
      './script/deprecated_functions.lua'
    ];

    for (const proc of procsToPreload) {
      try {
        duel.preloadScript(proc);
      } catch (e) {}
    }

    duel.setPlayerInfo({ player: 0, lp, startHand, drawCount });
    duel.setPlayerInfo({ player: 1, lp, startHand, drawCount });

    const LOCATION_DECK = 0x01;
    const POS_FACEDOWN = 0x0a;

    for (let i = 0; i < player0Deck.length; i++) {
      duel.newCard({
        code: Number(player0Deck[i]),
        owner: 0,
        player: 0,
        location: LOCATION_DECK,
        sequence: i,
        position: POS_FACEDOWN
      });
    }

    for (let i = 0; i < player1Deck.length; i++) {
      duel.newCard({
        code: Number(player1Deck[i]),
        owner: 1,
        player: 1,
        location: LOCATION_DECK,
        sequence: i,
        position: POS_FACEDOWN
      });
    }

    duel.startDuel(0);

    const session = {
      duelId,
      duel,
      isNpc: Boolean(isNpc),
      turn: 1,
      turnPlayer: 0,
      phase: 'DRAW',
      isGameOver: false,
      winner: null,
      pendingQuestion: null,
      rawPrompt: null,
      logs: []
    };

    this.activeDuels.set(duelId, session);

    // Advance until first human prompt
    const events = this.advanceUntilHumanPrompt(duelId);

    return {
      success: true,
      duelId,
      status: 'active',
      isNpc: session.isNpc,
      phase: session.phase,
      turn: session.turn,
      turnPlayer: session.turnPlayer,
      playerTurn: session.turnPlayer,
      events,
      logs: session.logs.splice(0),
      pendingPrompt: session.pendingQuestion,
      field: this.getFieldState(duelId)
    };
  }

  advanceUntilHumanPrompt(duelId) {
    const session = this.activeDuels.get(duelId);
    if (!session) throw new Error(`Duel ${duelId} not found`);

    const events = [];
    let maxCycles = 150;

    while (maxCycles-- > 0 && !session.isGameOver) {
      let promptMsg = null;

      for (const res of session.duel.advance()) {
        const msg = res.message;
        const name = msg ? msg.constructor.name : 'Unknown';

        // Track phases and turns
        if (name === 'YGOProMsgNewTurn') {
          session.turn++;
          session.turnPlayer = msg.player ?? 0;
          session.phase = 'DRAW';
          session.logs.push(`🔄 Turno ${session.turn}: Jugador ${session.turnPlayer === 0 ? 'Tú' : 'Rival'}`);
        } else if (name === 'YGOProMsgNewPhase') {
          const pCode = msg.phase;
          // Phase mapping: 0x01: DRAW, 0x02: STANDBY, 0x04: MAIN1, 0x08: BATTLE, 0x10: MAIN2, 0x20: END
          if (pCode === 0x01) session.phase = 'DRAW';
          else if (pCode === 0x02) session.phase = 'STANDBY';
          else if (pCode === 0x04) session.phase = 'MAIN_1';
          else if (pCode === 0x08) session.phase = 'BATTLE';
          else if (pCode === 0x10) session.phase = 'MAIN_2';
          else if (pCode === 0x20) session.phase = 'END';
          session.logs.push(`📍 Fase: ${session.phase}`);
        } else if (name === 'YGOProMsgWin') {
          session.isGameOver = true;
          session.winner = msg.player;
          session.logs.push(`🏆 ¡Duelo finalizado! Ganador: Jugador ${msg.player}`);
        } else if (name === 'YGOProMsgSummoned') {
          session.logs.push(`⚔️ ¡Monstruo invocado con éxito al campo!`);
        } else if (name === 'YGOProMsgDamage') {
          session.logs.push(`💥 Daño recibido: ${msg.val} LP por Jugador ${msg.player}`);
        }

        events.push({
          name,
          status: res.status,
          payload: msg ? { ...msg } : null
        });

        if (res.status === 2 || (msg && msg.prepareResponse)) {
          promptMsg = msg;
          break;
        }
      }

      if (!promptMsg || session.isGameOver) {
        session.pendingQuestion = null;
        session.rawPrompt = null;
        break;
      }

      const pNum = promptMsg.player !== undefined ? promptMsg.player : (promptMsg.responsePlayer ? promptMsg.responsePlayer() : 0);

      // If it's Player 0 (or PvP where prompt is returned to controller):
      if (!session.isNpc || pNum === 0) {
        session.rawPrompt = promptMsg;
        session.pendingQuestion = this.formatSemanticPrompt(promptMsg);
        break;
      }

      // NPC AUTO-PLAY for Player 1:
      const npcResp = this.computeNpcResponse(promptMsg);
      if (npcResp) {
        session.duel.setResponse(npcResp);
      } else {
        // If NPC can't answer, format for fallback
        session.rawPrompt = promptMsg;
        session.pendingQuestion = this.formatSemanticPrompt(promptMsg);
        break;
      }
    }

    return events;
  }

  computeNpcResponse(prompt) {
    if (!prompt) return null;
    const name = prompt.constructor.name;

    try {
      if (name === 'YGOProMsgSelectChain') {
        return prompt.prepareResponse(null);
      }
      if (name === 'YGOProMsgSelectPlace') {
        const places = prompt.getSelectablePlaces();
        return prompt.prepareResponse([ places[0] ]);
      }
      if (name === 'YGOProMsgSelectPosition') {
        return prompt.prepareResponse(0x1); // Attack
      }
      if (name === 'YGOProMsgSelectIdleCmd') {
        if (prompt.spSummonableCards && prompt.spSummonableCards.length > 0) {
          return prompt.prepareResponse(IdleCmdType.SPSUMMON, IndexResponse(0));
        }
        if (prompt.summonableCards && prompt.summonableCards.length > 0) {
          return prompt.prepareResponse(IdleCmdType.SUMMON, IndexResponse(0));
        }
        if (prompt.msetableCards && prompt.msetableCards.length > 0) {
          return prompt.prepareResponse(IdleCmdType.MSET, IndexResponse(0));
        }
        if (prompt.activatableCards && prompt.activatableCards.length > 0) {
          return prompt.prepareResponse(IdleCmdType.ACTIVATE, IndexResponse(0));
        }
        if (prompt.canBp) {
          return prompt.prepareResponse(IdleCmdType.TO_BP);
        }
        if (prompt.canEp) {
          return prompt.prepareResponse(IdleCmdType.TO_EP);
        }
      }
      if (name === 'YGOProMsgSelectBattleCmd') {
        if (prompt.attackableCards && prompt.attackableCards.length > 0) {
          return prompt.prepareResponse(BattleCmdType.ATTACK, IndexResponse(0));
        }
        if (prompt.canEp) {
          return prompt.prepareResponse(BattleCmdType.TO_EP);
        }
        if (prompt.canM2) {
          return prompt.prepareResponse(BattleCmdType.TO_M2);
        }
      }
      if (name === 'YGOProMsgSelectOption') {
        return prompt.prepareResponse(IndexResponse(0));
      }
      if (name === 'YGOProMsgSelectUnselectCard') {
        if (prompt.finishable || prompt.cancelable) {
          return prompt.prepareResponse(null);
        }
        if (prompt.cards && prompt.cards.length > 0) {
          return prompt.prepareResponse(IndexResponse(0));
        }
      }
      if (name === 'YGOProMsgSelectCard' || name === 'YGOProMsgSelectTribute' || name === 'YGOProMsgSelectSum') {
        if (prompt.cards && prompt.cards.length > 0) {
          return prompt.prepareResponse([ IndexResponse(0) ]);
        }
      }
      if (prompt.defaultResponse) {
        return prompt.defaultResponse();
      }
    } catch (e) {
      console.warn('[computeNpcResponse error]', e.message);
    }
    return null;
  }

  formatSemanticPrompt(prompt) {
    if (!prompt) return null;
    const name = prompt.constructor.name;
    const pNum = prompt.player !== undefined ? prompt.player : (prompt.responsePlayer ? prompt.responsePlayer() : 0);

    const base = {
      type: name,
      player: pNum,
      rawName: name,
      promptType: 'UNKNOWN',
      title: 'ACCIÓN REQUERIDA',
      description: 'El árbitro oficial espera tu decisión.',
      canBp: false,
      canM2: false,
      canEp: false,
      canPass: false,
      summonableCards: [],
      spSummonableCards: [],
      reposableCards: [],
      msetableCards: [],
      ssetableCards: [],
      activatableCards: [],
      attackableCards: [],
      selectablePlaces: [],
      selectableCards: [],
      options: [],
      numbers: []
    };

    if (name === 'YGOProMsgSelectIdleCmd') {
      base.promptType = 'IDLE_CMD';
      base.title = 'TU TURNO (MAIN PHASE)';
      base.description = 'Puedes Invocar, Invocación Especial, Colocar cartas, Activar efectos o cambiar de Fase.';
      base.canBp = Boolean(prompt.canBp);
      base.canEp = Boolean(prompt.canEp);

      base.summonableCards = (prompt.summonableCards || []).map(c => ({
        ...this.getCardDetails(c.code),
        sequence: c.sequence,
        location: c.location,
        controller: c.controller
      }));

      base.spSummonableCards = (prompt.spSummonableCards || []).map(c => ({
        ...this.getCardDetails(c.code),
        sequence: c.sequence,
        location: c.location,
        controller: c.controller
      }));

      base.reposableCards = (prompt.reposableCards || []).map(c => ({
        ...this.getCardDetails(c.code),
        sequence: c.sequence,
        location: c.location,
        controller: c.controller
      }));

      base.msetableCards = (prompt.msetableCards || []).map(c => ({
        ...this.getCardDetails(c.code),
        sequence: c.sequence,
        location: c.location,
        controller: c.controller
      }));

      base.ssetableCards = (prompt.ssetableCards || []).map(c => ({
        ...this.getCardDetails(c.code),
        sequence: c.sequence,
        location: c.location,
        controller: c.controller
      }));

      base.activatableCards = (prompt.activatableCards || []).map(c => ({
        ...this.getCardDetails(c.code),
        sequence: c.sequence,
        location: c.location,
        controller: c.controller,
        desc: c.desc
      }));
    } else if (name === 'YGOProMsgSelectBattleCmd') {
      base.promptType = 'BATTLE_CMD';
      base.title = 'FASE DE BATALLA (BATTLE PHASE)';
      base.description = 'Selecciona un monstruo para atacar o cambia de Fase.';
      base.canM2 = Boolean(prompt.canM2);
      base.canEp = Boolean(prompt.canEp);

      base.attackableCards = (prompt.attackableCards || []).map(c => ({
        ...this.getCardDetails(c.code),
        sequence: c.sequence,
        location: c.location,
        controller: c.controller,
        directAttack: Boolean(c.directAttack)
      }));

      base.activatableCards = (prompt.activatableCards || []).map(c => ({
        ...this.getCardDetails(c.code),
        sequence: c.sequence,
        location: c.location,
        controller: c.controller,
        desc: c.desc
      }));
    } else if (name === 'YGOProMsgSelectChain') {
      base.promptType = 'SELECT_CHAIN';
      base.title = 'VENTANA DE CADENA OFICIAL';
      base.description = '¿Deseas activar una carta o efecto rápido en respuesta?';
      base.canPass = true;

      base.activatableCards = (prompt.chains || []).map(c => ({
        ...this.getCardDetails(c.code),
        sequence: c.sequence,
        location: c.location,
        controller: c.controller,
        desc: c.desc
      }));
    } else if (name === 'YGOProMsgSelectPlace') {
      base.promptType = 'SELECT_PLACE';
      base.title = 'SELECCIÓN DE ZONA EN EL CAMPO';
      base.description = 'Elige la casilla del campo donde colocar la carta.';
      base.selectablePlaces = prompt.getSelectablePlaces();
    } else if (name === 'YGOProMsgSelectCard' || name === 'YGOProMsgSelectTribute') {
      base.promptType = name === 'YGOProMsgSelectTribute' ? 'SELECT_TRIBUTE' : 'SELECT_CARD';
      base.title = name === 'YGOProMsgSelectTribute' ? 'SACRIFICIO REQUERIDO' : 'SELECCIONA CARTAS';
      base.description = `Selecciona entre ${prompt.min} y ${prompt.max} carta(s).`;
      base.canPass = Boolean(prompt.cancelable);
      base.selectableCards = (prompt.cards || []).map(c => ({
        ...this.getCardDetails(c.code),
        sequence: c.sequence,
        location: c.location,
        controller: c.controller
      }));
    } else if (name === 'YGOProMsgSelectPosition') {
      base.promptType = 'SELECT_POSITION';
      base.title = 'POSICIÓN DE COMBATE';
      base.description = 'Elige posición de ataque o defensa.';
      base.positions = prompt.positions;
    } else if (name === 'YGOProMsgSelectYesno' || name === 'YGOProMsgSelectEffectyn') {
      base.promptType = 'SELECT_YESNO';
      base.title = 'CONFIRMACIÓN DE EFECTO';
      base.description = '¿Deseas activar el efecto de esta carta?';
    } else if (name === 'YGOProMsgSelectOption') {
      base.promptType = 'SELECT_OPTION';
      base.title = 'SELECCIONA UNA OPCIÓN';
      base.description = 'Elige una de las opciones del efecto.';
      base.options = (prompt.options || []).map((opt, idx) => ({ index: idx, desc: opt }));
    } else if (name === 'YGOProMsgSelectUnselectCard') {
      base.promptType = 'SELECT_UNSELECT_CARD';
      base.title = 'SELECCIÓN DE MATERIALES';
      base.description = 'Selecciona una carta o confirma la selección.';
      base.finishable = Boolean(prompt.finishable);
      base.cancelable = Boolean(prompt.cancelable);
      base.canPass = Boolean(prompt.finishable || prompt.cancelable);
      base.selectableCards = (prompt.cards || []).map(c => ({
        ...this.getCardDetails(c.code),
        sequence: c.sequence,
        location: c.location,
        controller: c.controller
      }));
    } else if (name === 'YGOProMsgSelectSum') {
      base.promptType = 'SELECT_SUM';
      base.title = 'SELECCIÓN POR NIVEL / RANGO';
      base.description = `Selecciona cartas requeridas (requisito: ${prompt.acc || 0}).`;
      base.selectableCards = (prompt.cards || []).map(c => ({
        ...this.getCardDetails(c.code),
        sequence: c.sequence,
        location: c.location,
        controller: c.controller
      }));
    } else if (name === 'YGOProMsgAnnounceNumber') {
      base.promptType = 'ANNOUNCE_NUMBER';
      base.title = 'DECLARAR NÚMERO';
      base.description = 'Selecciona un número.';
      base.numbers = prompt.numbers || [];
    } else if (name === 'YGOProMsgAnnounceCard') {
      base.promptType = 'ANNOUNCE_CARD';
      base.title = 'DECLARAR CARTA';
      base.description = 'Declara el nombre o código de la carta.';
    }

    return base;
  }

  executeAction(duelId, action) {
    const session = this.activeDuels.get(duelId);
    if (!session) throw new Error(`Duel ${duelId} not found`);
    const prompt = session.rawPrompt;
    if (!prompt) throw new Error('No pending prompt in duel engine');

    const actionType = (action.type || action.action_type || '').toUpperCase();
    console.log(`[DuelEngine] Executing action: ${actionType} for duel ${duelId}`);

    let resp = null;
    const name = prompt.constructor.name;

    if (actionType === 'SUMMON' && name === 'YGOProMsgSelectIdleCmd') {
      const code = action.code ? Number(action.code) : undefined;
      const seq = action.sequence !== undefined ? Number(action.sequence) : undefined;
      let matchIdx = -1;
      if (prompt.summonableCards && Array.isArray(prompt.summonableCards)) {
        if (code) matchIdx = prompt.summonableCards.findIndex(c => Number(c.code) === code);
        if (matchIdx === -1 && seq !== undefined) matchIdx = prompt.summonableCards.findIndex(c => Number(c.sequence) === seq);
        if (matchIdx === -1 && prompt.summonableCards.length === 1) matchIdx = 0;
      }
      if (matchIdx !== -1) {
        resp = prompt.prepareResponse(IdleCmdType.SUMMON, IndexResponse(matchIdx));
      } else {
        resp = prompt.prepareResponse(IdleCmdType.SUMMON, { sequence: seq !== undefined ? seq : 0, code });
      }
    } else if ((actionType === 'SPSUMMON' || actionType === 'SPECIAL_SUMMON' || actionType === 'SYNCHRO_SUMMON') && name === 'YGOProMsgSelectIdleCmd') {
      const seq = action.sequence !== undefined ? Number(action.sequence) : undefined;
      const code = action.code ? Number(action.code) : undefined;
      let matchIdx = -1;
      if (prompt.spSummonableCards && Array.isArray(prompt.spSummonableCards)) {
        if (code) matchIdx = prompt.spSummonableCards.findIndex(c => Number(c.code) === code);
        if (matchIdx === -1 && seq !== undefined) matchIdx = prompt.spSummonableCards.findIndex(c => Number(c.sequence) === seq);
        if (matchIdx === -1 && prompt.spSummonableCards.length === 1) matchIdx = 0;
      }
      if (matchIdx !== -1) {
        resp = prompt.prepareResponse(IdleCmdType.SPSUMMON, IndexResponse(matchIdx));
      } else {
        resp = prompt.prepareResponse(IdleCmdType.SPSUMMON, { sequence: seq !== undefined ? seq : 0, code });
      }
    } else if ((actionType === 'REPOS' || actionType === 'CHANGE_POSITION') && name === 'YGOProMsgSelectIdleCmd') {
      const code = action.code ? Number(action.code) : undefined;
      const seq = action.sequence !== undefined ? Number(action.sequence) : undefined;
      let matchIdx = -1;
      if (prompt.reposableCards && Array.isArray(prompt.reposableCards)) {
        if (code) matchIdx = prompt.reposableCards.findIndex(c => Number(c.code) === code);
        if (matchIdx === -1 && seq !== undefined) matchIdx = prompt.reposableCards.findIndex(c => Number(c.sequence) === seq);
        if (matchIdx === -1 && prompt.reposableCards.length === 1) matchIdx = 0;
      }
      if (matchIdx !== -1) {
        resp = prompt.prepareResponse(IdleCmdType.REPOS, IndexResponse(matchIdx));
      } else {
        resp = prompt.prepareResponse(IdleCmdType.REPOS, { sequence: seq !== undefined ? seq : 0 });
      }
    } else if (actionType === 'MSET' && name === 'YGOProMsgSelectIdleCmd') {
      const code = action.code ? Number(action.code) : undefined;
      const seq = action.sequence !== undefined ? Number(action.sequence) : undefined;
      let matchIdx = -1;
      if (prompt.msetableCards && Array.isArray(prompt.msetableCards)) {
        if (code) matchIdx = prompt.msetableCards.findIndex(c => Number(c.code) === code);
        if (matchIdx === -1 && seq !== undefined) matchIdx = prompt.msetableCards.findIndex(c => Number(c.sequence) === seq);
        if (matchIdx === -1 && prompt.msetableCards.length === 1) matchIdx = 0;
      }
      if (matchIdx !== -1) {
        resp = prompt.prepareResponse(IdleCmdType.MSET, IndexResponse(matchIdx));
      } else {
        resp = prompt.prepareResponse(IdleCmdType.MSET, { sequence: seq !== undefined ? seq : 0 });
      }
    } else if (actionType === 'SSET' && name === 'YGOProMsgSelectIdleCmd') {
      const code = action.code ? Number(action.code) : undefined;
      const seq = action.sequence !== undefined ? Number(action.sequence) : undefined;
      let matchIdx = -1;
      if (prompt.ssetableCards && Array.isArray(prompt.ssetableCards)) {
        if (code) matchIdx = prompt.ssetableCards.findIndex(c => Number(c.code) === code);
        if (matchIdx === -1 && seq !== undefined) matchIdx = prompt.ssetableCards.findIndex(c => Number(c.sequence) === seq);
        if (matchIdx === -1 && prompt.ssetableCards.length === 1) matchIdx = 0;
      }
      if (matchIdx !== -1) {
        resp = prompt.prepareResponse(IdleCmdType.SSET, IndexResponse(matchIdx));
      } else {
        resp = prompt.prepareResponse(IdleCmdType.SSET, { sequence: seq !== undefined ? seq : 0 });
      }
    } else if (actionType === 'ACTIVATE') {
      const code = action.code ? Number(action.code) : undefined;
      const seq = action.sequence !== undefined ? Number(action.sequence) : undefined;
      if (name === 'YGOProMsgSelectIdleCmd') {
        let matchIdx = -1;
        if (prompt.activatableCards && Array.isArray(prompt.activatableCards)) {
          if (code) matchIdx = prompt.activatableCards.findIndex(c => Number(c.code) === code);
          if (matchIdx === -1 && seq !== undefined) matchIdx = prompt.activatableCards.findIndex(c => Number(c.sequence) === seq);
          if (matchIdx === -1 && prompt.activatableCards.length === 1) matchIdx = 0;
        }
        if (matchIdx !== -1) {
          resp = prompt.prepareResponse(IdleCmdType.ACTIVATE, IndexResponse(matchIdx));
        } else {
          resp = prompt.prepareResponse(IdleCmdType.ACTIVATE, { sequence: seq !== undefined ? seq : 0, desc: action.desc });
        }
      } else if (name === 'YGOProMsgSelectBattleCmd') {
        let matchIdx = -1;
        if (prompt.activatableCards && Array.isArray(prompt.activatableCards)) {
          if (code) matchIdx = prompt.activatableCards.findIndex(c => Number(c.code) === code);
          if (matchIdx === -1 && seq !== undefined) matchIdx = prompt.activatableCards.findIndex(c => Number(c.sequence) === seq);
          if (matchIdx === -1 && prompt.activatableCards.length === 1) matchIdx = 0;
        }
        if (matchIdx !== -1) {
          resp = prompt.prepareResponse(BattleCmdType.ACTIVATE, IndexResponse(matchIdx));
        } else {
          resp = prompt.prepareResponse(BattleCmdType.ACTIVATE, { sequence: seq !== undefined ? seq : 0, desc: action.desc });
        }
      }
    } else if (actionType === 'ATTACK' && name === 'YGOProMsgSelectBattleCmd') {
      const seq = action.attackerSeq !== undefined ? Number(action.attackerSeq) : (action.sequence !== undefined ? Number(action.sequence) : undefined);
      const code = action.code ? Number(action.code) : undefined;
      let matchIdx = -1;
      if (prompt.attackableCards && Array.isArray(prompt.attackableCards)) {
        if (code) matchIdx = prompt.attackableCards.findIndex(c => Number(c.code) === code);
        if (matchIdx === -1 && seq !== undefined) matchIdx = prompt.attackableCards.findIndex(c => Number(c.sequence) === seq);
        if (matchIdx === -1 && prompt.attackableCards.length === 1) matchIdx = 0;
      }
      if (matchIdx !== -1) {
        resp = prompt.prepareResponse(BattleCmdType.ATTACK, IndexResponse(matchIdx));
      } else {
        resp = prompt.prepareResponse(BattleCmdType.ATTACK, { sequence: seq !== undefined ? seq : 0 });
      }
    } else if (actionType === 'CHANGE_PHASE' || actionType === 'PHASE_CHANGE') {
      const target = (action.targetPhase || action.phase || '').toUpperCase();
      if (name === 'YGOProMsgSelectIdleCmd') {
        if ((target.includes('BATTLE') || target === 'BP') && prompt.canBp) {
          resp = prompt.prepareResponse(IdleCmdType.TO_BP);
        } else if (prompt.canEp) {
          resp = prompt.prepareResponse(IdleCmdType.TO_EP);
        } else if (prompt.canBp) {
          resp = prompt.prepareResponse(IdleCmdType.TO_BP);
        }
      } else if (name === 'YGOProMsgSelectBattleCmd') {
        if ((target.includes('MAIN') || target === 'M2') && prompt.canM2) {
          resp = prompt.prepareResponse(BattleCmdType.TO_M2);
        } else if (prompt.canEp) {
          resp = prompt.prepareResponse(BattleCmdType.TO_EP);
        } else if (prompt.canM2) {
          resp = prompt.prepareResponse(BattleCmdType.TO_M2);
        }
      }
    } else if (actionType === 'PASS_CHAIN' || actionType === 'CHAIN_PASS') {
      if (name === 'YGOProMsgSelectChain') {
        resp = prompt.prepareResponse(null);
      }
    } else if (actionType === 'CHAIN_ACTIVATE' && name === 'YGOProMsgSelectChain') {
      const seq = action.sequence !== undefined ? Number(action.sequence) : undefined;
      const code = action.code ? Number(action.code) : undefined;
      let matchIdx = -1;
      if (prompt.chains && Array.isArray(prompt.chains)) {
        if (code) matchIdx = prompt.chains.findIndex(c => Number(c.code) === code);
        if (matchIdx === -1 && seq !== undefined) matchIdx = prompt.chains.findIndex(c => Number(c.sequence) === seq);
        if (matchIdx === -1 && prompt.chains.length === 1) matchIdx = 0;
      }
      if (matchIdx !== -1) {
        resp = prompt.prepareResponse(IndexResponse(matchIdx));
      } else {
        resp = prompt.prepareResponse({ sequence: seq !== undefined ? seq : 0, desc: action.desc });
      }
    } else if (actionType === 'SELECT_PLACE' && name === 'YGOProMsgSelectPlace') {
      const places = prompt.getSelectablePlaces();
      let chosen = places[0];
      if (action.sequence !== undefined) {
        const found = places.find(p => p.sequence === Number(action.sequence));
        if (found) chosen = found;
      }
      resp = prompt.prepareResponse([ chosen ]);
    } else if (actionType === 'SELECT_CARDS' || actionType === 'SELECT_TRIBUTE') {
      if (action.cards === null || action.cancel || action.pass) {
        resp = prompt.prepareResponse(null);
      } else if (Array.isArray(action.indices)) {
        resp = prompt.prepareResponse(action.indices.map(i => IndexResponse(Number(i))));
      } else if (Array.isArray(action.cards)) {
        const respList = [];
        for (const item of action.cards) {
          if (typeof item === 'number') {
            const idx = prompt.cards ? prompt.cards.findIndex(c => Number(c.code) === item) : -1;
            if (idx !== -1) respList.push(IndexResponse(idx));
            else respList.push({ code: item });
          } else if (item && typeof item === 'object') {
            if (item.index !== undefined) respList.push(IndexResponse(Number(item.index)));
            else respList.push(item);
          }
        }
        resp = prompt.prepareResponse(respList.length > 0 ? respList : null);
      } else {
        resp = prompt.prepareResponse(null);
      }
    } else if (actionType === 'SELECT_UNSELECT_CARD' || actionType === 'FINISH_SELECT') {
      if (action.finish || action.cancel || action.cards === null || action.pass) {
        resp = prompt.prepareResponse(null);
      } else if (action.index !== undefined) {
        resp = prompt.prepareResponse(IndexResponse(Number(action.index)));
      } else if (action.code) {
        const idx = prompt.cards ? prompt.cards.findIndex(c => Number(c.code) === Number(action.code)) : -1;
        if (idx !== -1) {
          resp = prompt.prepareResponse(IndexResponse(idx));
        } else {
          resp = prompt.prepareResponse({ code: Number(action.code), sequence: action.sequence !== undefined ? Number(action.sequence) : undefined });
        }
      } else {
        resp = prompt.prepareResponse(null);
      }
    } else if (actionType === 'SELECT_SUM') {
      if (Array.isArray(action.indices)) {
        resp = prompt.prepareResponse(action.indices.map(i => IndexResponse(Number(i))));
      } else if (Array.isArray(action.cards)) {
        resp = prompt.prepareResponse(action.cards);
      }
    } else if (actionType === 'SELECT_OPTION') {
      const idx = action.index !== undefined ? Number(action.index) : (action.option !== undefined ? Number(action.option) : 0);
      resp = prompt.prepareResponse(IndexResponse(idx));
    } else if (actionType === 'ANNOUNCE_NUMBER') {
      const num = action.number !== undefined ? Number(action.number) : 0;
      resp = prompt.prepareResponse(IndexResponse(num));
    } else if (actionType === 'ANNOUNCE_CARD') {
      const code = action.code !== undefined ? Number(action.code) : 0;
      resp = prompt.prepareResponse(code);
    } else if (actionType === 'SELECT_POSITION' && name === 'YGOProMsgSelectPosition') {
      resp = prompt.prepareResponse(Number(action.position || 0x1));
    } else if (actionType === 'YESNO') {
      resp = prompt.prepareResponse(Boolean(action.answer));
    }

    // Fallback: If no custom action matched or default response applicable
    if (!resp && prompt.defaultResponse) {
      resp = prompt.defaultResponse();
    }

    if (!resp) {
      throw new Error(`Acción ${actionType} no aplicable al mensaje actual (${name})`);
    }

    session.duel.setResponse(resp);
    session.pendingQuestion = null;
    session.rawPrompt = null;

    // Advance engine
    const events = this.advanceUntilHumanPrompt(duelId);

    // Auto-resolve select place if player summoned and next prompt is select place:
    if (session.rawPrompt && session.rawPrompt.constructor.name === 'YGOProMsgSelectPlace') {
      const places = session.rawPrompt.getSelectablePlaces();
      const autoPlaceResp = session.rawPrompt.prepareResponse([ places[0] ]);
      session.duel.setResponse(autoPlaceResp);
      session.pendingQuestion = null;
      session.rawPrompt = null;
      events.push(...this.advanceUntilHumanPrompt(duelId));
    }

    return {
      success: true,
      duelId,
      status: session.isGameOver ? 'finished' : 'active',
      winner: session.winner,
      turn: session.turn,
      turnPlayer: session.turnPlayer,
      playerTurn: session.turnPlayer,
      phase: session.phase,
      events,
      logs: session.logs.splice(0),
      pendingPrompt: session.pendingQuestion,
      field: this.getFieldState(duelId)
    };
  }

  submitResponse(duelId, responseIntOrBytes) {
    const session = this.activeDuels.get(duelId);
    if (!session) throw new Error(`Duel ${duelId} not found`);

    if (typeof responseIntOrBytes === 'number') {
      session.duel.setResponseInt(responseIntOrBytes);
    } else {
      session.duel.setResponse(responseIntOrBytes);
    }

    session.pendingQuestion = null;
    session.rawPrompt = null;
    const events = this.advanceUntilHumanPrompt(duelId);

    return {
      duelId,
      status: session.isGameOver ? 'finished' : 'active',
      winner: session.winner,
      turn: session.turn,
      turnPlayer: session.turnPlayer,
      phase: session.phase,
      events,
      logs: session.logs.splice(0),
      pendingPrompt: session.pendingQuestion,
      field: this.getFieldState(duelId)
    };
  }

  getFieldState(duelId) {
    const session = this.activeDuels.get(duelId);
    if (!session) throw new Error(`Duel ${duelId} not found`);

    const info = session.duel.queryFieldInfo();
    const p0Info = info.field?.players?.[0];
    const p1Info = info.field?.players?.[1];

    // Query field cards
    const p0MonstersQuery = session.duel.queryFieldCard({ player: 0, location: 0x04, queryFlag: 0xffffffff });
    const p1MonstersQuery = session.duel.queryFieldCard({ player: 1, location: 0x04, queryFlag: 0xffffffff });
    const p0SpellsQuery = session.duel.queryFieldCard({ player: 0, location: 0x08, queryFlag: 0xffffffff });
    const p1SpellsQuery = session.duel.queryFieldCard({ player: 1, location: 0x08, queryFlag: 0xffffffff });
    const p0HandQuery = session.duel.queryFieldCard({ player: 0, location: 0x02, queryFlag: 0xffffffff });
    const p1HandQuery = session.duel.queryFieldCard({ player: 1, location: 0x02, queryFlag: 0xffffffff });
    const p0GraveQuery = session.duel.queryFieldCard({ player: 0, location: 0x10, queryFlag: 0xffffffff });
    const p1GraveQuery = session.duel.queryFieldCard({ player: 1, location: 0x10, queryFlag: 0xffffffff });
    const p0BanishedQuery = session.duel.queryFieldCard({ player: 0, location: 0x20, queryFlag: 0xffffffff });
    const p1BanishedQuery = session.duel.queryFieldCard({ player: 1, location: 0x20, queryFlag: 0xffffffff });
    const p0ExtraQuery = session.duel.queryFieldCard({ player: 0, location: 0x40, queryFlag: 0xffffffff });
    const p1ExtraQuery = session.duel.queryFieldCard({ player: 1, location: 0x40, queryFlag: 0xffffffff });

    const formatMonsters = (cards = []) => {
      const list = [];
      for (let i = 0; i < 5; i++) {
        const c = cards[i];
        if (c && !c.empty && c.code > 0) {
          const det = this.getCardDetails(c.code);
          const isFaceDown = (c.position & 0xa) !== 0; // POS_FACEDOWN
          const isDef = (c.position & 0xc) !== 0; // POS_DEFENSE
          list.push({
            sequence: i,
            slot_index: i,
            code: isFaceDown ? 0 : c.code,
            card_id: isFaceDown ? 0 : c.code,
            id: isFaceDown ? 0 : c.code,
            name: isFaceDown ? 'Carta Oculta' : det.name,
            attack: c.attack,
            defense: c.defense,
            currentAtk: c.attack,
            currentDef: c.defense,
            originalAtk: det.atk,
            originalDef: det.def,
            level: c.level,
            position: isDef ? 'DEF' : 'ATK',
            faceDown: isFaceDown,
            card_data: {
              id: c.code,
              name: det.name,
              atk: c.attack,
              def: c.defense,
              level: c.level,
              type: det.isMonster ? 'Monster' : 'Unknown',
              desc: det.desc
            },
            image: isFaceDown ? '/assets/card_back.jpg' : det.image,
            image_url: isFaceDown ? '/assets/card_back.jpg' : det.image
          });
        } else {
          list.push(null);
        }
      }
      return list;
    };

    const formatSpells = (cards = []) => {
      const list = [];
      for (let i = 0; i < 5; i++) {
        const c = cards[i];
        if (c && !c.empty && c.code > 0) {
          const det = this.getCardDetails(c.code);
          const isFaceDown = (c.position & 0xa) !== 0;
          list.push({
            sequence: i,
            slot_index: i,
            code: isFaceDown ? 0 : c.code,
            card_id: isFaceDown ? 0 : c.code,
            id: isFaceDown ? 0 : c.code,
            name: isFaceDown ? 'Carta Oculta' : det.name,
            position: isFaceDown ? 'SET' : 'ACT',
            faceDown: isFaceDown,
            card_data: {
              id: c.code,
              name: det.name,
              type: det.isSpell ? 'Spell Card' : det.isTrap ? 'Trap Card' : 'Spell/Trap',
              desc: det.desc
            },
            image: isFaceDown ? '/assets/card_back.jpg' : det.image,
            image_url: isFaceDown ? '/assets/card_back.jpg' : det.image
          });
        } else {
          list.push(null);
        }
      }
      return list;
    };

    const formatCardList = (cards = []) => {
      return (cards || []).filter(c => c && !c.empty && c.code > 0).map((c, idx) => {
        const det = this.getCardDetails(c.code);
        return {
          sequence: c.sequence !== undefined ? c.sequence : idx,
          code: c.code,
          card_id: c.code,
          id: c.code,
          name: det.name,
          desc: det.desc,
          atk: det.atk,
          def: det.def,
          currentAtk: det.atk,
          currentDef: det.def,
          level: det.level,
          isMonster: det.isMonster,
          isSpell: det.isSpell,
          isTrap: det.isTrap,
          card_data: {
            id: c.code,
            name: det.name,
            atk: det.atk,
            def: det.def,
            level: det.level,
            desc: det.desc,
            type: det.isMonster ? 'Normal Monster' : det.isSpell ? 'Spell Card' : 'Trap Card'
          },
          image: det.image,
          image_url: det.image
        };
      });
    };

    return {
      turn: session.turn,
      turnPlayer: session.turnPlayer,
      phase: session.phase,
      isGameOver: session.isGameOver,
      winner: session.winner,
      players: [
        {
          id: 0,
          lp: p0Info?.lp ?? 8000,
          deckCount: p0Info?.deckCount ?? 0,
          handCount: p0Info?.handCount ?? 0,
          hand: formatCardList(p0HandQuery?.cards),
          monsters: formatMonsters(p0MonstersQuery?.cards),
          spells: formatSpells(p0SpellsQuery?.cards),
          graveyard: formatCardList(p0GraveQuery?.cards),
          banished: formatCardList(p0BanishedQuery?.cards),
          extraDeck: formatCardList(p0ExtraQuery?.cards),
          graveCount: p0Info?.graveCount ?? 0,
          removedCount: p0Info?.removedCount ?? 0,
          extraCount: p0Info?.extraCount ?? (p0ExtraQuery?.cards?.length || 0)
        },
        {
          id: 1,
          lp: p1Info?.lp ?? 8000,
          deckCount: p1Info?.deckCount ?? 0,
          handCount: p1Info?.handCount ?? 0,
          hand: formatCardList(p1HandQuery?.cards),
          monsters: formatMonsters(p1MonstersQuery?.cards),
          spells: formatSpells(p1SpellsQuery?.cards),
          graveyard: formatCardList(p1GraveQuery?.cards),
          banished: formatCardList(p1BanishedQuery?.cards),
          extraDeck: formatCardList(p1ExtraQuery?.cards),
          graveCount: p1Info?.graveCount ?? 0,
          removedCount: p1Info?.removedCount ?? 0,
          extraCount: p1Info?.extraCount ?? (p1ExtraQuery?.cards?.length || 0)
        }
      ]
    };
  }

  endDuel(duelId) {
    const session = this.activeDuels.get(duelId);
    if (session) {
      try {
        session.duel.endDuel();
      } catch (e) {}
      this.activeDuels.delete(duelId);
    }
    return { duelId, status: 'ended' };
  }
}

const engine = new DuelEngine();
module.exports = engine;
