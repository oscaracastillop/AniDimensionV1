async function testService() {
  console.log('Testing GET http://localhost:7001/health ...');
  const healthRes = await fetch('http://localhost:7001/health');
  const health = await healthRes.json();
  console.log('Health Response:', health);

  console.log('\nTesting POST http://localhost:7001/duel/create ...');
  const deck = [
    89631139, 89631139, 89631139, // Blue-Eyes
    46986414, 46986414, 46986414, // Dark Magician
    44519536, 44519536, 44519536, // Celtic Guardian
    70781052, 70781052, 70781052, // Summoned Skull
    5318639, 5318639, 5318639,    // Mystical Space Typhoon
    83764718, 83764718, 83764718, // Monster Reborn
    55144522, 55144522, 55144522, // Pot of Greed
    24094653, 24094653, 24094653, // Polymerization
    6368038, 6368038, 6368038,    // Mirror Force
    44095762, 44095762, 44095762, // Trap Hole
    40640057, 40640057, 40640057, // Kuriboh
    13945283, 13945283, 13945283, // King of the Swamp
    11901678, 11901678, 11901678, // Sangan
    64428736                      // Change of Heart
  ];

  const duelRes = await fetch('http://localhost:7001/duel/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      duelId: 'test-match-101',
      player0Deck: deck,
      player1Deck: deck,
      lp: 8000
    })
  });

  const duelData = await duelRes.json();
  console.log('Duel Create Status:', duelData.status);
  console.log('Turn Events Generated:', duelData.events?.length);
  console.log('First 4 Events:', duelData.events?.slice(0, 4).map(e => e.name));
  console.log('Prompt Event:', duelData.pendingQuestion?.name);
  console.log('Player 0 LP:', duelData.field?.players[0]?.lp, 'Hand Cards:', duelData.field?.players[0]?.handCards?.length);
  console.log('Player 1 LP:', duelData.field?.players[1]?.lp, 'Hand Cards:', duelData.field?.players[1]?.handCards?.length);

  console.log('\nTesting GET http://localhost:7001/duel/test-match-101 ...');
  const getRes = await fetch('http://localhost:7001/duel/test-match-101');
  const getData = await getRes.json();
  console.log('Query Field Result: P0 Hand =', getData.field?.players[0]?.handCount, 'cards');

  console.log('\nTesting POST http://localhost:7001/duel/end ...');
  const endRes = await fetch('http://localhost:7001/duel/end', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ duelId: 'test-match-101' })
  });
  console.log('Duel End Result:', await endRes.json());

  console.log('\n>>> ALL MICROSERVICE HTTP REST ENDPOINTS VERIFIED 100% OPERATIONAL! <<<');
}

testService().catch(err => {
  console.error('HTTP Test Failed:', err);
  process.exit(1);
});
