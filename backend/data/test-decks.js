/**
 * Ani-Dimension: Generador de Mazos de Prueba (Player & NPC Tiers)
 */
const { fetchCardData, cardCache, LOCAL_CARDS } = require('./cards.data');
const { ocgCardReader } = require('./sql-card-reader');

// ============================================================================
// 1. STARTER DECK (MAZO INICIAL POR DEFECTO PARA NUEVOS JUGADORES Y NPC NIVEL 1)
// Monstruos con ATK <= 1000 + Magias de Equipo + Magias de Campo + Magias/Trampas
// ============================================================================
const STARTER_DECK_PASSCODES = [
    // Monstruos Normales y Efecto (ATK <= 1000)
    32274490, 32274490, 32274490, // Skull Servant x3 (300 ATK / Zombie)
    53293545, 53293545,           // Firegrass x2 (700 ATK / Plant)
    89091579, 89091579,           // Basic Insect x2 (500 ATK / Insect)
    36121917, 36121917,           // Monster Egg x2 (600 ATK / Warrior)
    9159938,  9159938,            // Dark Gray x2 (800 ATK / Beast)
    57305373, 57305373,           // Two-Mouth Darkruler x2 (900 ATK / Dinosaur)
    75356564, 75356564, 75356564, // Petit Dragon x3 (600 ATK / Dragon)
    20060230, 20060230,           // Hard Armor x2 (300 ATK / Warrior)
    85705804, 85705804,           // Kurama x2 (800 ATK / Winged Beast)
    17535588,                     // Armored Starfish (850 ATK / Aqua)
    33064647,                     // One-Eyed Shield Dragon (700 ATK / Dragon)
    96851799,                     // Hinotama Soul (600 ATK / Pyro)
    56283725,                     // Kumootoko (700 ATK / Insect)
    80770678,                     // Spirit of the Harp (800 ATK / Fairy)
    16353197,                     // Drooling Lizard (900 ATK / Reptile)
    76211194,                     // Meda Bat (800 ATK / Fiend)

    // Magias de Campo
    59197169,                     // Yami (+200 ATK Spellcaster/Fiend, -200 Fairy)
    86318356,                     // Sogen (+200 ATK Warrior/Beast-Warrior)
    50913601,                     // Mountain (+200 ATK Dragon/Winged Beast/Thunder)
    87430998,                     // Forest (+200 ATK Insect/Beast/Plant/Beast-Warrior)
    22702055,                     // Umi (+200 ATK Fish/Sea Serpent/Thunder/Aqua)
    23424603,                     // Wasteland (+200 ATK Dinosaur/Zombie/Rock)

    // Magias de Equipo
    15052462,                     // Book of Secret Arts (+300 ATK/DEF Spellcaster)
    61854111,                     // Legendary Sword (+300 ATK Warrior)
    37120512,                     // Sword of Dark Destruction (+400 ATK Dark, -200 DEF)
    77027445,                     // Beast Fangs (+300 ATK/DEF Beast)
    37820550,                     // Violet Crystal (+300 ATK/DEF Zombie)

    // Magias y Trampas de Apoyo
    76103675,                     // Sparks (50 daño)
    46130346,                     // Hinotama (500 daño)
    73134081,                     // Final Flame (600 daño)
    63102017,                     // Stop Defense
    51482758,                     // Remove Trap
    50045299                      // Dragon Capture Jar
];

// ============================================================================
// 2. NPC NIVEL 5 (INTERMEDIO): Monstruos 1200 - 1500 ATK (Sobres LOB)
// ============================================================================
const NPC_LVL5_DECK_PASSCODES = [
    90357090, 90357090,           // Silver Fang (1200 ATK)
    76184692, 76184692,           // Hitotsu-Me Giant (1200 ATK)
    32452818, 32452818,           // Beaver Warrior (1200 ATK)
    72842870, 72842870,           // Tyhone (1200 ATK)
    53375573, 53375573,           // Dark King of the Abyss (1200 ATK)
    44287299, 44287299,           // Masaki the Legendary Swordsman (1100 ATK)
    2863439,  2863439,            // Fiend Reflection #2 (1100 ATK)
    43500484, 43500484,           // Dark World Thorns (1200 ATK)
    85639257, 85639257,           // Aqua Madoor (1200 ATK / 2000 DEF)
    91152256, 91152256,           // Celtic Guardian (1400 ATK)
    41392891, 41392891,           // Feral Imp (1300 ATK)
    87796900, 87796900,           // Winged Dragon, Guardian of the Fortress #1 (1400 ATK)
    15480588, 15480588,           // Armored Lizard (1500 ATK)
    1784619,  1784619,            // Uraby (1500 ATK)
    67724379,                     // Koumori Dragon (1500 ATK)
    
    // Magias y Trampas LOB
    66788016, 66788016,           // Fissure x2
    4206964,  4206964,            // Trap Hole x2
    12607053, 12607053,           // Waboku x2
    17814387, 17814387,           // Reinforcements x2
    25880147, 25880147,           // Ookazi x2 (800 Daño)
    98700941                      // De-Spell
];

// ============================================================================
// 3. NPC NIVEL 10 (AVANZADO): Monstruos 1200 - 2000 ATK (Sobres LOB + MRD)
// ============================================================================
const NPC_LVL10_DECK_PASSCODES = [
    97590747, 97590747, 97590747, // La Jinn the Mystical Genie of the Lamp x3 (1800 ATK)
    23771716, 23771716, 23771716, // 7 Colored Fish x3 (1800 ATK)
    5053103,  5053103,            // Battle Ox x2 (1700 ATK)
    50930991, 50930991,           // Neo the Magical Swordsman x2 (1700 ATK)
    91996584, 91996584,           // Whiptail Crow x2 (1650 ATK)
    13429800, 13429800,           // Great White x2 (1600 ATK)
    24611934,                     // Ryu-Kishin Powered (1600 ATK)
    91152256, 91152256,           // Celtic Guardian x2 (1400 ATK)
    30113682,                     // Judge Man (2200 ATK / 1 Sacrificio)
    78010363,                     // Witch of the Black Forest (1100 ATK / Efecto)
    26202165,                     // Sangan (1000 ATK / Efecto)
    31560017,                     // Magician of Faith (300 ATK / Flip)
    54652250, 54652250,           // Man-Eater Bug x2 (450 ATK / Flip)
    33508719,                     // Morphing Jar (700 ATK / Flip)

    // Magias y Trampas Potentes LOB + MRD
    53129443,                     // Dark Hole
    12580477,                     // Raigeki
    83764718,                     // Monster Reborn
    4031928,                      // Change of Heart
    72302403,                     // Swords of Revealing Light
    55144522,                     // Pot of Greed
    19613556,                     // Heavy Storm
    66788016,                     // Fissure
    79759861,                     // Tribute to the Doomed
    44095762,                     // Mirror Force
    4206964,  4206964,            // Trap Hole x2
    12607053,                     // Waboku
    88279707                      // Robbin' Goblin
];

// ============================================================================
// 4. NPC NIVEL 15 (MAESTRO / EXPERTO): Monstruos 1200 - 2500 ATK + FUSIONES (LOB + MRD)
// ============================================================================
const NPC_LVL15_DECK_PASSCODES = [
    // Monstruos Principales y Materiales de Fusión
    74677422,                     // Red-Eyes Black Dragon (2400 ATK)
    70781052, 70781052,           // Summoned Skull x2 (2500 ATK / 1 Sacrificio)
    89631139,                     // Blue-Eyes White Dragon (3000 ATK / 2 Sacrificios)
    6368038,                      // Gaia The Fierce Knight (2300 ATK)
    28279543,                     // Curse of Dragon (2000 ATK)
    88819587, 88819587,           // Baby Dragon x2 (1200 ATK)
    71625222, 71625222,           // Time Wizard x2 (500 ATK / Efecto)
    31786629, 31786629,           // Thunder Dragon x2 (1600 ATK / Efecto)
    97590747, 97590747,           // La Jinn the Mystical Genie of the Lamp x2 (1800 ATK)
    23771716, 23771716,           // 7 Colored Fish x2 (1800 ATK)
    5053103,  5053103,            // Battle Ox x2 (1700 ATK)
    78010363,                     // Witch of the Black Forest (Efecto Búsqueda)
    26202165,                     // Sangan (Efecto Búsqueda)
    31560017,                     // Magician of Faith (Recuperar Magia)
    13122975,                     // Mask of Darkness (Recuperar Trampa)
    54652250, 54652250,           // Man-Eater Bug x2 (Destruir Monstruo)

    // Magias de Fusión, Campo y Control (MRD + LOB)
    24094653, 24094653,           // Polymerization x2
    83764718,                     // Monster Reborn
    12580477,                     // Raigeki
    53129443,                     // Dark Hole
    4031928,                      // Change of Heart
    55144522,                     // Pot of Greed
    72302403,                     // Swords of Revealing Light
    19613556,                     // Heavy Storm
    59197169,                     // Yami (Campo)
    50913601,                     // Mountain (Campo)
    65169794,                     // Black Pendant (Equipo +500 ATK)

    // Trampas de Respuesta y Negación
    44095762,                     // Mirror Force
    77414722,                     // Magic Jammer (Negar Magia)
    38199696,                     // Seven Tools of the Bandit (Negar Trampa)
    41420027,                     // Solemn Judgment (Negar Invocación/Efecto)
    98069388,                     // Horn of Heaven (Tributar para negar Invocación)
    4206964                       // Trap Hole
];

// EXTRA DECK PARA NPC NIVEL 15 (MONSTRUOS DE FUSIÓN OFICIALES LOB & MRD)
const NPC_LVL15_EXTRA_DECK = [
    11901678,                     // B. Skull Dragon (3200 ATK / Red-Eyes + Summoned Skull)
    41462083,                     // Thousand Dragon (2400 ATK / Time Wizard + Baby Dragon)
    66889139,                     // Gaia the Dragon Champion (2600 ATK / Gaia + Curse of Dragon)
    54752875,                     // Twin-Headed Thunder Dragon (2800 ATK / Thunder Dragon + Thunder Dragon)
    45231177                      // Flame Swordsman (1800 ATK)
];

function hydrateCardObject(rawCard, ownerKey = 'player1') {
    const cardId = parseInt(typeof rawCard === 'object' ? (rawCard.card_id || rawCard.id) : rawCard, 10);
    const dbCard = ocgCardReader(cardId);
    const base = dbCard || cardCache.get(cardId) || LOCAL_CARDS[cardId] || {
        id: cardId,
        card_id: cardId,
        name: (typeof rawCard === 'object' && rawCard.name) ? rawCard.name : `Carta #${cardId}`,
        type: (typeof rawCard === 'object' && rawCard.type) ? rawCard.type : "Normal Monster",
        race: (typeof rawCard === 'object' && rawCard.race) ? rawCard.race : "Warrior",
        attribute: (typeof rawCard === 'object' && rawCard.attribute) ? rawCard.attribute : "EARTH",
        level: (typeof rawCard === 'object' && rawCard.level) ? rawCard.level : 4,
        atk: (typeof rawCard === 'object' && rawCard.atk !== undefined) ? rawCard.atk : 1000,
        def: (typeof rawCard === 'object' && rawCard.def !== undefined) ? rawCard.def : 1000,
        desc: (typeof rawCard === 'object' && rawCard.desc) ? rawCard.desc : ''
    };

    return {
        ...base,
        id: cardId,
        card_id: cardId,
        image_url: `../../../assets/images/cards/${cardId}.jpg`,
        originalOwner: ownerKey
    };
}

function generateDeckFromList(passcodeList, ownerKey = 'player1') {
    const deck = passcodeList.map(cardId => hydrateCardObject(cardId, ownerKey));
    // Barajado Fisher-Yates
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function generateSampleDeck(ownerKey = 'player1', level = 1) {
    if (level === 5) return generateDeckFromList(NPC_LVL5_DECK_PASSCODES, ownerKey);
    if (level === 10) return generateDeckFromList(NPC_LVL10_DECK_PASSCODES, ownerKey);
    if (level === 15) return generateDeckFromList(NPC_LVL15_DECK_PASSCODES, ownerKey);
    return generateDeckFromList(STARTER_DECK_PASSCODES, ownerKey);
}

function generateSampleExtraDeck(ownerKey = 'player1', level = 1) {
    if (level >= 15) {
        return NPC_LVL15_EXTRA_DECK.map(cardId => hydrateCardObject(cardId, ownerKey));
    }
    return [];
}

module.exports = {
    STARTER_DECK_PASSCODES,
    NPC_LVL5_DECK_PASSCODES,
    NPC_LVL10_DECK_PASSCODES,
    NPC_LVL15_DECK_PASSCODES,
    NPC_LVL15_EXTRA_DECK,
    hydrateCardObject,
    generateSampleDeck,
    generateSampleExtraDeck
};
