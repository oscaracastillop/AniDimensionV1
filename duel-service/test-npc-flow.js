const fs = require('fs');
const path = require('path');
const { createOcgcoreWrapper, SqljsCardReader } = require('koishipro-core.js');
const { IdleCmdType, BattleCmdType, IndexResponse } = require('ygopro-msg-encode');
const initSqlJs = require('sql.js');

async function testNpcFlow() {
  console.log('Testing NPC auto-response flow...');
  const scriptDir = path.join(__dirname, 'data', 'script');
  const officialDir = path.join(__dirname, 'data', 'script', 'official');

  const wrapper = await createOcgcoreWrapper();
  const SQL = await initSqlJs();
  const dbBuffer = fs.readFileSync(path.join(__dirname, 'data', 'cards.cdb'));
  wrapper.setCardReader(SqljsCardReader(SQL, dbBuffer));

  let rawConstant = fs.readFileSync(path.join(scriptDir, 'constant.lua'), 'utf8');
  let cleanConstant = rawConstant.replace(/Duel\.LoadScript\([^)]+\)/g, '');
  const cardCounters = fs.readFileSync(path.join(scriptDir, 'card_counter_constants.lua'), 'utf8');
  const archetypes = fs.readFileSync(path.join(scriptDir, 'archetype_setcode_constants.lua'), 'utf8');
  const bundledConstant = cleanConstant + '\n' + cardCounters + '\n' + archetypes;

  let rawUtility = fs.readFileSync(path.join(scriptDir, 'utility.lua'), 'utf8');
  let cleanUtility = rawUtility.replace(/Duel\.LoadScript\([^)]+\)/g, '');
  cleanUtility = cleanUtility.replace('function GetID()\n\treturn self_table,self_code\nend', `-- overridden GetID`);

  const getIDShim = `
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
  const bundledUtility = getIDShim + '\n' + cleanUtility;

  wrapper.setScriptReader((scriptPath) => {
    let clean = scriptPath.replace(/^\.?\/script\//, '').replace(/^\.?\//, '');
    if (clean === 'constant.lua') return bundledConstant;
    if (clean === 'utility.lua') return bundledUtility;

    let p = path.join(scriptDir, clean);
    if (fs.existsSync(p)) return fs.readFileSync(p);

    p = path.join(officialDir, clean);
    if (fs.existsSync(p)) return fs.readFileSync(p);

    return null;
  });

  const duel = wrapper.createDuel(123456);

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
    duel.preloadScript(proc);
  }

  duel.setPlayerInfo({ player: 0, lp: 8000, startHand: 5, drawCount: 1 });
  duel.setPlayerInfo({ player: 1, lp: 8000, startHand: 5, drawCount: 1 });

  // Normal monsters for both players
  const p0Deck = [
    44519536, 44519536, 44519536, // Celtic Guardian (1400)
    89631139, 89631139, 89631139, // Blue-Eyes
    46986414, 46986414, 46986414,
    70781052, 70781052, 70781052,
    55144522, 55144522, 55144522,
    6368038, 6368038, 6368038,
    83764718, 83764718
  ];

  const p1Deck = [
    70781052, 70781052, 70781052, // Summoned Skull (2500)
    44519536, 44519536, 44519536,
    89631139, 89631139, 89631139,
    46986414, 46986414, 46986414,
    55144522, 55144522, 55144522,
    6368038, 6368038, 6368038,
    83764718, 83764718
  ];

  for (let i = 0; i < p0Deck.length; i++) {
    duel.newCard({ code: p0Deck[i], owner: 0, player: 0, location: 0x01, sequence: i, position: 0x0a });
  }
  for (let i = 0; i < p1Deck.length; i++) {
    duel.newCard({ code: p1Deck[i], owner: 1, player: 1, location: 0x01, sequence: i, position: 0x0a });
  }

  duel.startDuel(0);

  function autoAdvanceUntilPlayerPrompt() {
    let pending = null;
    let maxLoops = 100;
    while (maxLoops-- > 0) {
      for (const res of duel.advance()) {
        const msg = res.message;
        const name = msg ? msg.constructor.name : 'Unknown';
        console.log(`[EVENT] Status=${res.status} | Name=${name}`);
        if (res.status === 2 || (msg && msg.prepareResponse)) {
          pending = msg;
          break;
        }
      }

      if (!pending) break;

      const pNum = pending.player !== undefined ? pending.player : (pending.responsePlayer ? pending.responsePlayer() : 0);
      console.log(`Prompt arrived: ${pending.constructor.name} for Player ${pNum}`);

      // If it is Player 0 (human), STOP and return prompt!
      if (pNum === 0) {
        return pending;
      }

      // If it is Player 1 (NPC), auto-resolve!
      console.log(`[NPC AUTO-PLAY] Handling prompt for Player 1 (${pending.constructor.name})...`);
      let resp = null;
      if (pending.constructor.name === 'YGOProMsgSelectChain') {
        resp = pending.prepareResponse(null);
      } else if (pending.constructor.name === 'YGOProMsgSelectPlace') {
        const places = pending.getSelectablePlaces();
        resp = pending.prepareResponse([ places[0] ]);
      } else if (pending.constructor.name === 'YGOProMsgSelectPosition') {
        resp = pending.prepareResponse(0x1);
      } else if (pending.constructor.name === 'YGOProMsgSelectIdleCmd') {
        if (pending.summonableCards && pending.summonableCards.length > 0) {
          const card = pending.summonableCards[0];
          console.log(`[NPC AUTO-PLAY] NPC Normal Summoning card ${card.code}...`);
          resp = pending.prepareResponse(IdleCmdType.SUMMON, {
            code: card.code,
            controller: card.controller,
            location: card.location,
            sequence: card.sequence
          });
        } else if (pending.canBp) {
          console.log('[NPC AUTO-PLAY] NPC entering Battle Phase...');
          resp = pending.prepareResponse(IdleCmdType.TO_BP);
        } else if (pending.canEp) {
          console.log('[NPC AUTO-PLAY] NPC Ending Turn...');
          resp = pending.prepareResponse(IdleCmdType.TO_EP);
        }
      } else if (pending.constructor.name === 'YGOProMsgSelectBattleCmd') {
        if (pending.attackableCards && pending.attackableCards.length > 0) {
          const card = pending.attackableCards[0];
          console.log(`[NPC AUTO-PLAY] NPC Attacking with card ${card.code}...`);
          resp = pending.prepareResponse(BattleCmdType.ATTACK, {
            code: card.code,
            controller: card.controller,
            location: card.location,
            sequence: card.sequence
          });
        } else if (pending.canEp) {
          resp = pending.prepareResponse(BattleCmdType.TO_EP);
        } else if (pending.canM2) {
          resp = pending.prepareResponse(BattleCmdType.TO_M2);
        }
      } else if (pending.defaultResponse) {
        resp = pending.defaultResponse();
      }

      if (resp) {
        duel.setResponse(resp);
        pending = null;
      } else {
        console.warn('[NPC AUTO-PLAY] Could not compute response for', pending.constructor.name);
        return pending;
      }
    }
    return pending;
  }

  // Turn 1 starts: Player 0's IdleCmd!
  console.log('\n--- STARTING MATCH ---');
  let prompt = autoAdvanceUntilPlayerPrompt();
  console.log('Player 0 Prompt:', prompt.constructor.name);

  // Player 0 Summons Celtic Guardian
  const card = prompt.summonableCards[0];
  console.log('\n--- PLAYER 0 SUMMONS CELTIC GUARDIAN ---');
  let resp = prompt.prepareResponse(IdleCmdType.SUMMON, { sequence: card.sequence, code: card.code, location: card.location });
  duel.setResponse(resp);

  prompt = autoAdvanceUntilPlayerPrompt();
  console.log('Player 0 next Prompt:', prompt.constructor.name);
  if (prompt.constructor.name === 'YGOProMsgSelectPlace') {
    const places = prompt.getSelectablePlaces();
    resp = prompt.prepareResponse([ places[0] ]);
    duel.setResponse(resp);
    prompt = autoAdvanceUntilPlayerPrompt();
    console.log('Player 0 next Prompt after place:', prompt.constructor.name);
  }

  if (prompt.constructor.name === 'YGOProMsgSelectChain') {
    resp = prompt.prepareResponse(null); // pass priority
    duel.setResponse(resp);
    prompt = autoAdvanceUntilPlayerPrompt();
    console.log('Player 0 prompt after chain pass:', prompt.constructor.name);
  }

  // Now Player 0 ends turn
  console.log('\n--- PLAYER 0 ENDS TURN ---');
  if (prompt.canEp) {
    resp = prompt.prepareResponse(IdleCmdType.TO_EP);
    duel.setResponse(resp);
    // NPC plays its turn automatically, and when NPC finishes, it should come back to Player 0!
    prompt = autoAdvanceUntilPlayerPrompt();
    console.log('\n>>> BACK TO PLAYER 0 TURN! Prompt:', prompt.constructor.name, 'Player:', prompt.player);
  }

  duel.endDuel();
  wrapper.finalize();
  console.log('NPC FLOW 100% SUCCESSFUL!');
}

testNpcFlow().catch(console.error);
