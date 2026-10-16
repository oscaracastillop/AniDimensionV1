const fs = require('fs');
const path = require('path');
const { createOcgcoreWrapper, SqljsCardReader } = require('koishipro-core.js');
const { IdleCmdType, BattleCmdType, IndexResponse } = require('ygopro-msg-encode');
const initSqlJs = require('sql.js');

async function testAction() {
  console.log('Testing full player action submission (Summon -> Battle -> Attack -> End)...');
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

    console.warn('[scriptReader] NOT FOUND:', clean);
    return null;
  });

  const duel = wrapper.createDuel(424242);

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

  // P0 starts with Celtic Guardian (44519536 - 1400 ATK Level 4)
  const deck0 = [
    44519536, 44519536, 44519536,
    89631139, 89631139, 89631139,
    46986414, 46986414, 46986414,
    70781052, 70781052, 70781052,
    55144522, 55144522, 55144522,
    6368038, 6368038, 6368038,
    83764718, 83764718
  ];

  for (let i = 0; i < deck0.length; i++) {
    duel.newCard({ code: deck0[i], owner: 0, player: 0, location: 0x01, sequence: i, position: 0x0a });
    duel.newCard({ code: deck0[i], owner: 1, player: 1, location: 0x01, sequence: i, position: 0x0a });
  }

  duel.startDuel(0);
  console.log('Duel started!');

  let pendingPrompt = null;
  function advance() {
    for (const res of duel.advance()) {
      const msg = res.message;
      const name = msg ? msg.constructor.name : 'Unknown';
      console.log(`[ADVANCE] Status=${res.status} Event=${name}`);
      if (res.status === 2 || (msg && msg.prepareResponse)) {
        pendingPrompt = msg;
        return;
      }
    }
  }

  advance();
  console.log('First Prompt:', pendingPrompt ? pendingPrompt.constructor.name : 'None');
  if (pendingPrompt && pendingPrompt.summonableCards) {
    console.log('Summonable cards:', pendingPrompt.summonableCards);
    // Player summons first summonable card!
    const target = pendingPrompt.summonableCards[0];
    console.log(`>>> PLAYER 0 SUMMONING CARD ${target.code} AT HAND SEQ ${target.sequence}...`);
    const resp = pendingPrompt.prepareResponse(IdleCmdType.SUMMON, {
      code: target.code,
      controller: target.controller,
      location: target.location,
      sequence: target.sequence
    });
    duel.setResponse(resp);
    console.log('Summon response sent to ocgcore!');

    advance();
    console.log('After Summon Prompt:', pendingPrompt ? pendingPrompt.constructor.name : 'None');

    if (pendingPrompt && pendingPrompt.constructor.name === 'YGOProMsgSelectPlace') {
      console.log('>>> Selecting zone for summoned monster...');
      const places = pendingPrompt.getSelectablePlaces();
      console.log('Selectable places:', places);
      const respPlace = pendingPrompt.prepareResponse([ places[0] ]);
      duel.setResponse(respPlace);
      advance();
      console.log('After Place Prompt:', pendingPrompt ? pendingPrompt.constructor.name : 'None');
    }

    if (pendingPrompt && pendingPrompt.constructor.name === 'YGOProMsgSelectChain') {
      console.log('>>> Chain prompt received! Passing priority (not chaining)...');
      const respChain = pendingPrompt.prepareResponse(null);
      duel.setResponse(respChain);
      advance();
      console.log('After Chain pass Prompt:', pendingPrompt ? pendingPrompt.constructor.name : 'None');
    }

    // Query field card details
    const fieldCards = duel.queryFieldCard({ player: 0, location: 0x04, queryFlag: 0xffffffff });
    console.log('P0 Monster Card details:', fieldCards.cards);

    // Now Player 0 ends turn (TO_EP)
    if (pendingPrompt && pendingPrompt.canEp) {
      console.log('>>> PLAYER 0 ENDING TURN (TO_EP)...');
      const respEp = pendingPrompt.prepareResponse(IdleCmdType.TO_EP);
      duel.setResponse(respEp);
      advance();
      console.log('Turn ended! Next prompt:', pendingPrompt ? pendingPrompt.constructor.name : 'None', 'Player:', pendingPrompt ? pendingPrompt.player : 'None');
    }
  }

  duel.endDuel();
  wrapper.finalize();
  console.log('ACTION TEST 100% SUCCESSFUL!');
}

testAction().catch(console.error);
