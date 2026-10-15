const express = require('express');
const cors = require('cors');
const engine = require('./engine');

const app = express();
const PORT = process.env.PORT || 7001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Ani Dimension Official Yu-Gi-Oh! Duel Microservice',
    engine: 'Project Ignis / ocgcore WebAssembly (official rules referee)',
    port: PORT,
    activeDuels: engine.activeDuels.size
  });
});

// Create and initialize a duel
app.post('/duel/create', (req, res) => {
  try {
    const { duelId, player0Deck, player1Deck, lp, startHand, drawCount, seed } = req.body;
    if (!duelId) {
      return res.status(400).json({ error: 'duelId is required' });
    }
    const result = engine.createDuel({
      duelId,
      player0Deck: player0Deck || [],
      player1Deck: player1Deck || [],
      lp: lp || 8000,
      startHand: startHand || 5,
      drawCount: drawCount || 1,
      seed: seed || Math.floor(Math.random() * 1000000)
    });
    res.json(result);
  } catch (err) {
    console.error('Error creating duel:', err);
    res.status(500).json({ error: err.message });
  }
});

// Submit a player response/action (e.g., card selection, command, chain decision)
app.post('/duel/response', (req, res) => {
  try {
    const { duelId, response } = req.body;
    if (!duelId) return res.status(400).json({ error: 'duelId is required' });
    if (response === undefined) return res.status(400).json({ error: 'response value is required' });

    const result = engine.submitResponse(duelId, response);
    res.json(result);
  } catch (err) {
    console.error('Error submitting response:', err);
    res.status(500).json({ error: err.message });
  }
});

// Query field state
app.get('/duel/:duelId', (req, res) => {
  try {
    const { duelId } = req.params;
    const field = engine.getFieldState(duelId);
    res.json({ duelId, field });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// Terminate a duel
app.post('/duel/end', (req, res) => {
  try {
    const { duelId } = req.body;
    const result = engine.endDuel(duelId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
async function start() {
  await engine.init();
  app.listen(PORT, () => {
    console.log(`========================================================`);
    console.log(`  OFFICIAL YU-GI-OH! DUEL MICROSERVICE ONLINE (PORT ${PORT})`);
    console.log(`  Powered by Project Ignis / ocgcore WebAssembly`);
    console.log(`========================================================`);
  });
}

start().catch(err => {
  console.error('Failed to start Duel Microservice:', err);
  process.exit(1);
});
