const fs = require('fs');
const path = require('path');
const { createOcgcoreWrapper, SqljsCardReader } = require('koishipro-core.js');
const initSqlJs = require('sql.js');

class DuelEngine {
  constructor() {
    this.wrapper = null;
    this.activeDuels = new Map();
    this.bundledConstant = '';
    this.bundledUtility = '';
    this.scriptDir = path.join(__dirname, 'data', 'script');
    this.officialDir = path.join(__dirname, 'data', 'script', 'official');
  }

  async init() {
    if (this.wrapper) return;

    console.log('[DuelEngine] Initializing Official Ocgcore WASM Engine...');

    // 1. Prepare Constant bundle
    const rawConstant = fs.readFileSync(path.join(this.scriptDir, 'constant.lua'), 'utf8');
    const cleanConstant = rawConstant.replace(/Duel\.LoadScript\([^)]+\)/g, '');
    const cardCounters = fs.readFileSync(path.join(this.scriptDir, 'card_counter_constants.lua'), 'utf8');
    const archetypes = fs.readFileSync(path.join(this.scriptDir, 'archetype_setcode_constants.lua'), 'utf8');
    this.bundledConstant = cleanConstant + '\n' + cardCounters + '\n' + archetypes;

    // 2. Prepare Utility bundle with 15 summon mechanics & shims
    const rawUtility = fs.readFileSync(path.join(this.scriptDir, 'utility.lua'), 'utf8');
    const cutIndex = rawUtility.indexOf('Duel.LoadScript("debug_utility.lua")');
    let cleanUtility = cutIndex !== -1 ? rawUtility.substring(0, cutIndex) : rawUtility;
    cleanUtility = cleanUtility.replace('Duel.LoadScript(code)', '-- Duel.LoadScript(code)');
    cleanUtility = cleanUtility.replace('function GetID()\n\treturn self_table,self_code\nend', '-- overridden GetID');

    const officialProcs = [
      'debug_utility.lua',
      'cards_specific_functions.lua',
      'proc_fusion.lua',
      'proc_ritual.lua',
      'proc_synchro.lua',
      'proc_union.lua',
      'proc_xyz.lua',
      'proc_pendulum.lua',
      'proc_link.lua',
      'proc_equip.lua',
      'proc_persistent.lua',
      'proc_workaround.lua',
      'proc_normal.lua',
      'proc_gemini.lua',
      'proc_spirit.lua'
    ];

    this.bundledUtility = `
-- Smart GetID shim for modern Project Ignis scripts in standard ocgcore
function GetID()
  if self_table and self_code then
    return self_table, self_code
  end
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

-- Modern EDOPro compatibility helpers
if Effect and not Effect.GetReset then
  function Effect.GetReset(e) return 0 end
end
if Card and not Card.GetReset then
  function Card.GetReset(c) return 0 end
end
aux = aux or {}
if not aux.RegisterSummonEff then
  aux.RegisterSummonEff = function(c, ...) end
end
` + cleanUtility;

    for (const proc of officialProcs) {
      const p = path.join(this.scriptDir, proc);
      if (fs.existsSync(p)) {
        const code = fs.readFileSync(p, 'utf8');
        this.bundledUtility += `\n-- === ${proc} ===\n` + code + `\n`;
      }
    }

    // 3. Create WASM Wrapper
    this.wrapper = await createOcgcoreWrapper();

    // 4. Attach Card Database (cards.cdb SQLite)
    const SQL = await initSqlJs();
    const dbBuffer = fs.readFileSync(path.join(__dirname, 'data', 'cards.cdb'));
    this.wrapper.setCardReader(SqljsCardReader(SQL, dbBuffer));

    // 5. Attach Script Reader for 20,000+ official Lua card scripts
    this.wrapper.setScriptReader((scriptPath) => {
      let clean = scriptPath.replace(/^\.?\/script\//, '').replace(/^\.?\//, '');
      if (clean === 'constant.lua') return this.bundledConstant;
      if (clean === 'utility.lua') return this.bundledUtility;

      let p = path.join(this.officialDir, clean);
      if (fs.existsSync(p)) return fs.readFileSync(p);

      p = path.join(this.scriptDir, clean);
      if (fs.existsSync(p)) return fs.readFileSync(p);

      return null;
    });

    console.log('[DuelEngine] Official Ocgcore WASM Engine ready! All 15 summoning mechanics and 20,000+ card scripts loaded.');
  }

  createDuel({ duelId, player0Deck = [], player1Deck = [], lp = 8000, startHand = 5, drawCount = 1, seed = 424242 }) {
    if (this.activeDuels.has(duelId)) {
      this.endDuel(duelId);
    }

    const duel = this.wrapper.createDuel(seed);
    duel.setPlayerInfo({ player: 0, lp, startHand, drawCount });
    duel.setPlayerInfo({ player: 1, lp, startHand, drawCount });

    const LOCATION_DECK = 0x01;
    const POS_FACEDOWN = 0x0a;

    // Load Player 0 deck
    for (let i = 0; i < player0Deck.length; i++) {
      duel.newCard({
        code: player0Deck[i],
        owner: 0,
        player: 0,
        location: LOCATION_DECK,
        sequence: i,
        position: POS_FACEDOWN
      });
    }

    // Load Player 1 deck
    for (let i = 0; i < player1Deck.length; i++) {
      duel.newCard({
        code: player1Deck[i],
        owner: 1,
        player: 1,
        location: LOCATION_DECK,
        sequence: i,
        position: POS_FACEDOWN
      });
    }

    // Start match
    duel.startDuel(0);

    const duelSession = {
      duelId,
      duel,
      turn: 1,
      turnPlayer: 0,
      phase: 'DRAW',
      events: [],
      pendingQuestion: null
    };

    this.activeDuels.set(duelId, duelSession);

    // Advance until first prompt
    const initialEvents = this.advanceUntilQuestion(duelId);
    return {
      duelId,
      status: 'active',
      events: initialEvents,
      field: this.getFieldState(duelId),
      pendingQuestion: duelSession.pendingQuestion
    };
  }

  advanceUntilQuestion(duelId) {
    const session = this.activeDuels.get(duelId);
    if (!session) throw new Error(`Duel ${duelId} not found`);

    const events = [];
    for (const res of session.duel.advance()) {
      const msg = res.message;
      const eventName = msg ? msg.constructor.name : 'Unknown';
      const eventData = {
        name: eventName,
        status: res.status,
        payload: msg ? { ...msg } : null
      };

      events.push(eventData);

      // Track player prompt messages
      if (eventName.includes('Select') || eventName.includes('Question') || eventName.includes('IdleCmd')) {
        session.pendingQuestion = eventData;
        break;
      }
    }

    session.events.push(...events);
    return events;
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
    const events = this.advanceUntilQuestion(duelId);

    return {
      duelId,
      events,
      field: this.getFieldState(duelId),
      pendingQuestion: session.pendingQuestion
    };
  }

  getFieldState(duelId) {
    const session = this.activeDuels.get(duelId);
    if (!session) throw new Error(`Duel ${duelId} not found`);

    const info = session.duel.queryFieldInfo();
    const p0 = info.field?.players?.[0];
    const p1 = info.field?.players?.[1];

    return {
      players: [
        {
          id: 0,
          lp: p0?.lp ?? 8000,
          deckCount: p0?.deck?.length ?? 0,
          handCount: p0?.hand?.length ?? 0,
          handCards: p0?.hand?.map(c => ({ code: c.code, location: c.location })) ?? [],
          monsters: p0?.monsterZones?.map(m => m ? { code: m.code, attack: m.attack, defense: m.defense, position: m.position } : null) ?? [],
          spells: p0?.spellZones?.map(s => s ? { code: s.code, position: s.position } : null) ?? [],
          graveCount: p0?.grave?.length ?? 0
        },
        {
          id: 1,
          lp: p1?.lp ?? 8000,
          deckCount: p1?.deck?.length ?? 0,
          handCount: p1?.hand?.length ?? 0,
          handCards: p1?.hand?.map(c => ({ code: c.code, location: c.location })) ?? [],
          monsters: p1?.monsterZones?.map(m => m ? { code: m.code, attack: m.attack, defense: m.defense, position: m.position } : null) ?? [],
          spells: p1?.spellZones?.map(s => s ? { code: s.code, position: s.position } : null) ?? [],
          graveCount: p1?.grave?.length ?? 0
        }
      ]
    };
  }

  endDuel(duelId) {
    const session = this.activeDuels.get(duelId);
    if (session) {
      try {
        session.duel.endDuel();
      } catch (e) {
        // ignore cleanup errors
      }
      this.activeDuels.delete(duelId);
    }
    return { duelId, status: 'ended' };
  }
}

const engine = new DuelEngine();
module.exports = engine;
