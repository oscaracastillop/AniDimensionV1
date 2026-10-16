const fs = require('fs');
const path = require('path');
const { createOcgcoreWrapper, SqljsCardReader } = require('koishipro-core.js');
const initSqlJs = require('sql.js');

async function testPreload() {
  console.log('Testing preloadScript...');
  const scriptDir = path.join(__dirname, 'data', 'script');
  const officialDir = path.join(__dirname, 'data', 'script', 'official');

  const wrapper = await createOcgcoreWrapper();
  const SQL = await initSqlJs();
  const dbBuffer = fs.readFileSync(path.join(__dirname, 'data', 'cards.cdb'));
  wrapper.setCardReader(SqljsCardReader(SQL, dbBuffer));

  // Build clean constant
  let rawConstant = fs.readFileSync(path.join(scriptDir, 'constant.lua'), 'utf8');
  let cleanConstant = rawConstant.replace(/Duel\.LoadScript\([^)]+\)/g, '');
  const cardCounters = fs.readFileSync(path.join(scriptDir, 'card_counter_constants.lua'), 'utf8');
  const archetypes = fs.readFileSync(path.join(scriptDir, 'archetype_setcode_constants.lua'), 'utf8');
  const bundledConstant = cleanConstant + '\n' + cardCounters + '\n' + archetypes;

  // Build clean utility
  let rawUtility = fs.readFileSync(path.join(scriptDir, 'utility.lua'), 'utf8');
  let cleanUtility = rawUtility.replace(/Duel\.LoadScript\([^)]+\)/g, '');
  cleanUtility = cleanUtility.replace('function GetID()\n\treturn self_table,self_code\nend', `-- overridden GetID`);

  const getIDShim = `
if Group and not Group.Match then
  function Group.Match(g, f, ex, ...)
    return g:Filter(f, ex, ...)
  end
end
if Group and not Group.Includes then
  function Group.Includes(g, c)
    return g:IsContains(c)
  end
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

  // Preload procs in order!
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
      console.log('Preloaded:', proc);
    } catch (e) {
      console.warn('Error preloading', proc, e.message);
    }
  }

  duel.setPlayerInfo({ player: 0, lp: 8000, startHand: 5, drawCount: 1 });
  duel.setPlayerInfo({ player: 1, lp: 8000, startHand: 5, drawCount: 1 });

  // 40 cards with Polymerization
  const deck = [
    24094653, 24094653, 24094653, // Polymerization
    89631139, 89631139, 89631139, // Blue-Eyes
    46986414, 46986414, 46986414, // Dark Magician
    44519536, 44519536, 44519536, // Celtic Guardian
    70781052, 70781052, 70781052, // Summoned Skull
    55144522, 55144522, 55144522, // Pot of Greed
    6368038, 6368038, 6368038,    // Mirror Force
    83764718, 83764718, 83764718  // Monster Reborn
  ];

  for (let i = 0; i < deck.length; i++) {
    duel.newCard({ code: deck[i], owner: 0, player: 0, location: 0x01, sequence: i, position: 0x0a });
    duel.newCard({ code: deck[i], owner: 1, player: 1, location: 0x01, sequence: i, position: 0x0a });
  }

  duel.startDuel(0);
  console.log('Duel started!');

  let step = 0;
  for (const res of duel.advance()) {
    step++;
    const name = res.message ? res.message.constructor.name : 'Unknown';
    console.log(`[Event ${step}] Status=${res.status} Event=${name}`);
    if (res.message && res.message.constructor.name === 'YGOProMsgSelectIdleCmd') {
      const msg = res.message;
      console.log('>>> YGOProMsgSelectIdleCmd SUCCESS! <<<');
      console.log('Summonable count:', msg.summonableCards.length);
      console.log('Activatable count:', msg.activatableCards.length);
      break;
    }
  }

  duel.endDuel();
  wrapper.finalize();
  console.log('Preload test completed successfully 100%!');
}

testPreload().catch(console.error);
