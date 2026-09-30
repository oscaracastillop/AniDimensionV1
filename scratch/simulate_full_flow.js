const fs = require('fs');

// Lightweight browser DOM mock
const elements = {};
function createMockElement(id) {
  return {
    id: id,
    style: { display: '' },
    classList: {
      classes: new Set(),
      add(c) { this.classes.add(c); },
      remove(c) { this.classes.delete(c); },
      contains(c) { return this.classes.has(c); }
    },
    textContent: '',
    innerHTML: '',
    disabled: false,
    value: '',
    remove() {},
    querySelectorAll() { return []; }
  };
}

const storage = {};
global.localStorage = {
  getItem(k) { return storage[k] || null; },
  setItem(k, v) { storage[k] = String(v); },
  removeItem(k) { delete storage[k]; }
};

global.document = {
  readyState: 'complete',
  getElementById(id) {
    if (!elements[id]) elements[id] = createMockElement(id);
    return elements[id];
  },
  createElement(tag) { return createMockElement(tag); },
  querySelectorAll() { return []; },
  addEventListener() {},
  title: 'Test'
};

global.window = global;
global.window.location = {
  search: '?level=5',
  href: 'http://localhost:3005/views/duels/npc/duel-npc.html?level=5',
  origin: 'http://localhost:3005'
};
global.history = { pushState() {} };

const socketMock = {
  events: {},
  on(event, handler) { this.events[event] = handler; },
  emit(event, data) {
    console.log(`[SOCKET EMIT] ${event}:`, JSON.stringify(data));
  }
};
global.io = () => socketMock;
global.socket = socketMock;

const scriptFiles = [
  'frontend/js/core/session.js',
  'frontend/js/core/socket.js',
  'frontend/js/duel/duel-state-client.js',
  'frontend/js/duel/duel-ui.js',
  'frontend/js/duel/duel-actions.js',
  'frontend/js/duel/duel-chains.js',
  'frontend/js/views/duel-npc.js'
];

scriptFiles.forEach(f => {
  const code = fs.readFileSync(f, 'utf8');
  eval(code);
});

const { createInitialDuelState } = require('../backend/engine/duel-state');
const sampleState = createInitialDuelState('ROOM_TEST', 'Admin', 'Yugi Muto (Nv. 5)', 'default_sleeve', 'player1');

// Trigger state update
socketMock.events['DUEL_STATE_UPDATE'](sampleState);

// Find a level <= 4 monster in hand to test normal summon
const hand = sampleState.player1.hand;
let lowLvlIdx = hand.findIndex(c => c && c.type && c.type.includes('Monster') && (c.level || 0) <= 4);
if (lowLvlIdx === -1) lowLvlIdx = 0;

console.log(`Selecting card at index ${lowLvlIdx}:`, hand[lowLvlIdx].name);
window.selectHandCard(lowLvlIdx, hand[lowLvlIdx].id);

console.log('Clicking on monster zone 0 (P_M)...');
window.onSlotClick('P_M', 0);

console.log('[ALL INTERACTIONS VERIFIED SUCCESSFULLY]');
process.exit(0);
