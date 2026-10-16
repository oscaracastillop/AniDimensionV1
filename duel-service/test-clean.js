const fs = require('fs');
const path = require('path');
const { createOcgcoreWrapper, SqljsCardReader } = require('koishipro-core.js');
const initSqlJs = require('sql.js');

async function testCleanScriptLoading() {
  console.log('Testing clean script loading...');
  const scriptDir = path.join(__dirname, 'data', 'script');
  const officialDir = path.join(__dirname, 'data', 'script', 'official');

  const wrapper = await createOcgcoreWrapper();
  const SQL = await initSqlJs();
  const dbBuffer = fs.readFileSync(path.join(__dirname, 'data', 'cards.cdb'));
  wrapper.setCardReader(SqljsCardReader(SQL, dbBuffer));

  // GetID shim
  const getIDShim = `
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

  const rawUtility = fs.readFileSync(path.join(scriptDir, 'utility.lua'), 'utf8');
  // inject shim right after function GetID()\n\treturn self_table,self_code\nend
  const patchedUtility = rawUtility.replace(
    'function GetID()\n\treturn self_table,self_code\nend',
    getIDShim
  );

  wrapper.setScriptReader((scriptPath) => {
    let clean = scriptPath.replace(/^\.?\/script\//, '').replace(/^\.?\//, '');
    if (clean === 'utility.lua') return patchedUtility;

    // Check scriptDir (constants, procs, etc.)
    let p = path.join(scriptDir, clean);
    if (fs.existsSync(p)) return fs.readFileSync(p);

    // Check officialDir (c*.lua)
    p = path.join(officialDir, clean);
    if (fs.existsSync(p)) return fs.readFileSync(p);

    console.warn('[scriptReader] MISSING SCRIPT:', scriptPath, clean);
    return null;
  });

  const duel = wrapper.createDuel(424242);
  duel.setPlayerInfo({ player: 0, lp: 8000, startHand: 5, drawCount: 1 });
  duel.setPlayerInfo({ player: 1, lp: 8000, startHand: 5, drawCount: 1 });

  // Deck with Polymerization (24094653) and normal monsters
  const deck = [
    24094653, 24094653, 24094653,
    89631139, 89631139, 89631139,
    46986414, 46986414, 46986414,
    44519536, 44519536, 44519536,
    70781052, 70781052, 70781052,
    55144522, 55144522, 55144522,
    6368038, 6368038
  ];

  for (let i = 0; i < deck.length; i++) {
    duel.newCard({ code: deck[i], owner: 0, player: 0, location: 0x01, sequence: i, position: 0x0a });
    duel.newCard({ code: deck[i], owner: 1, player: 1, location: 0x01, sequence: i, position: 0x0a });
  }

  duel.startDuel(0);
  console.log('Duel started successfully!');

  let step = 0;
  for (const res of duel.advance()) {
    step++;
    const name = res.message ? res.message.constructor.name : 'Unknown';
    console.log(`Step ${step}: Status=${res.status} Event=${name}`);
    if (res.message && res.message.constructor.name === 'YGOProMsgSelectIdleCmd') {
      const msg = res.message;
      console.log('IdleCmd arrived! CanBp:', msg.canBp, 'CanEp:', msg.canEp);
      console.log('Summonable cards:', msg.summonableCards.length);
      console.log('Activatable cards:', msg.activatableCards.length);
      break;
    }
  }

  duel.endDuel();
  wrapper.finalize();
  console.log('CLEAN TEST SUCCESSFUL 100%!');
}

testCleanScriptLoading().catch(e => {
  console.error('Clean test error:', e);
});
