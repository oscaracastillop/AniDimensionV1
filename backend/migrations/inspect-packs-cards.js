const fs = require('fs');
const content = fs.readFileSync('./frontend/js/data/packs-data.js', 'utf8');
const idMatches = content.match(/\"card_id\":\s*(\d+)/g) || [];
const allCardIds = idMatches.map(m => parseInt(m.replace(/[^\d]/g, ''), 10));
const uniqueIds = Array.from(new Set(allCardIds));
console.log('Total pack card records:', allCardIds.length, 'Unique card IDs:', uniqueIds.length);
console.log('First 20 unique IDs:', uniqueIds.slice(0, 20));

// Also read what starter deck cards are in DEFAULT_STARTER_DECK_PASSCODES
const authController = fs.readFileSync('./backend/controllers/auth.controller.js', 'utf8');
const starterMatch = authController.match(/DEFAULT_STARTER_DECK_PASSCODES = \[([\s\S]*?)\];/);
let starterIds = [];
if (starterMatch) {
    const rawIds = starterMatch[1].match(/\d+/g) || [];
    starterIds = rawIds.map(Number);
}
console.log('Starter Deck total count:', starterIds.length, 'Unique starter IDs:', new Set(starterIds).size);
