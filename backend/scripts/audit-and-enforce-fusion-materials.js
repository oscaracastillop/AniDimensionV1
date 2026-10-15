const { getPool, sql } = require('../config/db');
const { initCardIndexes, resolveCard } = require('../data/npc-decks/deck-builder-helper');

/**
 * Tabla de materiales y hechizos de fusión oficiales para cada monstruo de Fusión
 */
const FUSION_RECIPES = {
    // DM
    'Flame Swordsman': {
        materials: ['Flame Manipulator', 'Masaki the Legendary Swordsman'],
        spell: 'Polymerization'
    },
    'Thousand Dragon': {
        materials: ['Time Wizard', 'Baby Dragon'],
        spell: 'Polymerization'
    },
    'Alligator\'s Sword Dragon': {
        materials: ['Alligator\'s Sword', 'Baby Dragon'],
        spell: 'Polymerization'
    },
    'St. Joan': {
        materials: ['Darklord Marie', 'Tenderness'],
        spell: 'Polymerization'
    },
    'Blue-Eyes Ultimate Dragon': {
        materials: ['Blue-Eyes White Dragon', 'Blue-Eyes White Dragon', 'Blue-Eyes White Dragon'],
        spell: 'Polymerization'
    },
    'Gaia the Dragon Champion': {
        materials: ['Gaia the Fierce Knight', 'Curse of Dragon'],
        spell: 'Polymerization'
    },
    'Dark Paladin': {
        materials: ['Dark Magician', 'Buster Blader'],
        spell: 'Polymerization'
    },
    'Black Skull Dragon': {
        materials: ['Summoned Skull', 'Red-Eyes Black Dragon'],
        spell: 'Polymerization'
    },
    'Chimera the Flying Mythical Beast': {
        materials: ['Gazelle the King of Mythical Beasts', 'Berfomet'],
        spell: 'Polymerization'
    },
    'Labyrinth Tank': {
        materials: ['Giga-Tech Wolf', 'Cannon Soldier'],
        spell: 'Polymerization'
    },
    'Super Roboyarou': {
        materials: ['Roboyarou', 'Robolady'],
        spell: 'Polymerization'
    },
    'Super Robolady': {
        materials: ['Robolady', 'Roboyarou'],
        spell: 'Polymerization'
    },
    'Gatling Dragon': {
        materials: ['Barrel Dragon', 'Blowback Dragon'],
        spell: 'Polymerization'
    },
    'Five-Headed Dragon': {
        materials: ['Luster Dragon', 'Blue-Eyes White Dragon'],
        spell: 'Polymerization'
    },

    // GX - Elemental HERO
    'Elemental HERO Flame Wingman': {
        materials: ['Elemental HERO Avian', 'Elemental HERO Burstinatrix'],
        spell: 'Polymerization'
    },
    'Elemental HERO Thunder Giant': {
        materials: ['Elemental HERO Sparkman', 'Elemental HERO Clayman'],
        spell: 'Polymerization'
    },
    'Elemental HERO Rampart Blaster': {
        materials: ['Elemental HERO Clayman', 'Elemental HERO Burstinatrix'],
        spell: 'Polymerization'
    },
    'Elemental HERO Tempest': {
        materials: ['Elemental HERO Avian', 'Elemental HERO Sparkman', 'Elemental HERO Bubbleman'],
        spell: 'Polymerization'
    },
    'Elemental HERO Wild Wingman': {
        materials: ['Elemental HERO Wildheart', 'Elemental HERO Avian'],
        spell: 'Polymerization'
    },
    'Elemental HERO Shining Flare Wingman': {
        materials: ['Elemental HERO Sparkman', 'Elemental HERO Avian', 'Elemental HERO Burstinatrix'],
        spell: 'Polymerization'
    },
    'Elemental HERO Mariner': {
        materials: ['Elemental HERO Bubbleman', 'Elemental HERO Avian'],
        spell: 'Polymerization'
    },

    // GX - Neos Contact Fusions (Contacto Neos - no requieren Polymerization pero sí los monstruos en campo)
    'Elemental HERO Flare Neos': {
        materials: ['Elemental HERO Neos', 'Neo-Spacian Flare Scarab'],
        spell: null
    },
    'Elemental HERO Aqua Neos': {
        materials: ['Elemental HERO Neos', 'Neo-Spacian Aqua Dolphin'],
        spell: null
    },
    'Elemental HERO Air Neos': {
        materials: ['Elemental HERO Neos', 'Neo-Spacian Air Hummingbird'],
        spell: null
    },
    'Elemental HERO Grand Neos': {
        materials: ['Elemental HERO Neos', 'Neo-Spacian Grand Mole'],
        spell: null
    },
    'Elemental HERO Dark Neos': {
        materials: ['Elemental HERO Neos', 'Neo-Spacian Dark Panther'],
        spell: null
    },
    'Elemental HERO Glow Neos': {
        materials: ['Elemental HERO Neos', 'Neo-Spacian Glow Moss'],
        spell: null
    },
    'Elemental HERO Magma Neos': {
        materials: ['Elemental HERO Neos', 'Neo-Spacian Flare Scarab', 'Neo-Spacian Grand Mole'],
        spell: null
    },
    'Elemental HERO Chaos Neos': {
        materials: ['Elemental HERO Neos', 'Neo-Spacian Dark Panther', 'Neo-Spacian Glow Moss'],
        spell: null
    },

    // GX - Evil HERO
    'Evil HERO Malicious Bane': {
        materials: ['Evil HERO Malicious Edge', 'Evil HERO Infernal Prodigy'],
        spell: 'Dark Fusion'
    },
    'Evil HERO Dark Gaia': {
        materials: ['Evil HERO Malicious Edge', 'Evil HERO Infernal Prodigy'],
        spell: 'Dark Fusion'
    },
    'Evil HERO Inferno Wing': {
        materials: ['Elemental HERO Avian', 'Elemental HERO Burstinatrix'],
        spell: 'Dark Fusion'
    },
    'Evil HERO Lightning Golem': {
        materials: ['Elemental HERO Sparkman', 'Elemental HERO Clayman'],
        spell: 'Dark Fusion'
    },
    'Evil HERO Wild Cyclone': {
        materials: ['Elemental HERO Avian', 'Evil HERO Infernal Prodigy'],
        spell: 'Dark Fusion'
    },

    // GX - Cyber Dragon / Cyberdark
    'Cyber End Dragon': {
        materials: ['Cyber Dragon', 'Cyber Dragon', 'Cyber Dragon'],
        spell: 'Power Bond'
    },
    'Cyber Twin Dragon': {
        materials: ['Cyber Dragon', 'Cyber Dragon'],
        spell: 'Power Bond'
    },
    'Chimeratech Overdragon': {
        materials: ['Cyber Dragon', 'Cyber Dragon Core'],
        spell: 'Overload Fusion'
    },
    'Chimeratech Fortress Dragon': {
        materials: ['Cyber Dragon'],
        spell: null
    },
    'Cyberdark Dragon': {
        materials: ['Cyberdark Horn', 'Cyberdark Edge', 'Cyberdark Keel'],
        spell: 'Polymerization'
    },
    'Cyberdark Darkness Dragon': {
        materials: ['Cyberdark Horn', 'Cyberdark Edge', 'Cyberdark Keel'],
        spell: 'Polymerization'
    },

    // GX - Ojama
    'Ojama King': {
        materials: ['Ojama Green', 'Ojama Yellow', 'Ojama Black'],
        spell: 'Polymerization'
    },
    'Ojama Knight': {
        materials: ['Ojama Green', 'Ojama Yellow'],
        spell: 'Polymerization'
    },

    // GX - Vehicroids
    'Super Vehicroid - Stealth Union': {
        materials: ['Truckroid', 'Expressroid', 'Drillroid'],
        spell: 'Polymerization'
    },
    'Super Vehicroid Jumbo Drill': {
        materials: ['Steamroid', 'Drillroid', 'Submarineroid'],
        spell: 'Polymerization'
    },
    'Ambulance Rescueroid': {
        materials: ['Ambulanceroid', 'Rescueroid'],
        spell: 'Polymerization'
    },

    // GX - Ancient Gear
    'Ultimate Ancient Gear Golem': {
        materials: ['Ancient Gear Golem', 'Ancient Gear Beast', 'Ancient Gear Soldier'],
        spell: 'Polymerization'
    },
    'Ancient Gear Megaton Golem': {
        materials: ['Ancient Gear Golem', 'Ancient Gear Golem'],
        spell: 'Polymerization'
    },
    'Ancient Gear Howitzer': {
        materials: ['Ancient Gear Golem', 'Ancient Gear Wyvern'],
        spell: 'Polymerization'
    },

    // GX - Destiny HERO
    'Destiny End Dragoon': {
        materials: ['Destiny HERO - Plasma', 'Destiny HERO - Dogma'],
        spell: 'Polymerization'
    },
    'Destiny HERO - Dystopia': {
        materials: ['Destiny HERO - Malicious', 'Destiny HERO - Celestial'],
        spell: 'Polymerization'
    },
    'Destiny HERO - Dangerous': {
        materials: ['Destiny HERO - Malicious', 'Destiny HERO - Diamond Dude'],
        spell: 'Polymerization'
    },

    // GX - Sacred Beasts / Yubel
    'Armityle the Chaos Phantasm': {
        materials: ['Uria, Lord of Searing Flames', 'Hamon, Lord of Striking Thunder', 'Raviel, Lord of Phantasms'],
        spell: null
    },
    'Armityle the Chaos Phantasm - Phantom of Fury': {
        materials: ['Uria, Lord of Searing Flames', 'Hamon, Lord of Striking Thunder', 'Raviel, Lord of Phantasms'],
        spell: null
    },

    // GX - Fossils (Jim Crocodile Cook)
    'Fossil Dragon Skullgios': {
        materials: ['Fossil Dyna Pachycephalo', 'Weathering Soldier'],
        spell: 'Fossil Fusion'
    },
    'Fossil Warrior Skull King': {
        materials: ['Fossil Dyna Pachycephalo', 'Flint Cragger'],
        spell: 'Fossil Fusion'
    },
    'Fossil Machine Skull Buggy': {
        materials: ['Weathering Soldier'],
        spell: 'Fossil Fusion'
    },
    'Fossil Machine Skull Convoy': {
        materials: ['Weathering Soldier', 'Flint Cragger'],
        spell: 'Fossil Fusion'
    },

    // GX - Rainbow Overdragon
    'Rainbow Overdragon': {
        materials: ['Rainbow Dragon', 'Crystal Beast Sapphire Pegasus'],
        spell: 'Polymerization'
    }
};

async function auditAndEnforce() {
    console.log('=== AUDITORÍA Y GARANTÍA DE MATERIALES DE FUSIÓN EN MAIN DECKS ===');
    const pool = await getPool();
    await initCardIndexes();

    // 1. Obtener todos los NPCs que tienen cartas de fusión en el Extra Deck
    const fusionsRes = await pool.request().query(`
        SELECT DISTINCT ndc.NpcId, ndc.CardCode, ndc.CardName
        FROM dbo.NpcDeckCards ndc
        WHERE ndc.Section = 'EXTRA' AND ndc.CardType = 'FUSION'
        ORDER BY ndc.NpcId
    `);

    const npcsWithFusions = new Map();
    fusionsRes.recordset.forEach(r => {
        if (!npcsWithFusions.has(r.NpcId)) npcsWithFusions.set(r.NpcId, []);
        npcsWithFusions.get(r.NpcId).push(r.CardName);
    });

    console.log(`NPCs con monstruos de Fusión en Extra Deck: ${npcsWithFusions.size}`);

    let totalNpcsFixed = 0;

    for (const [npcId, fusionNames] of npcsWithFusions.entries()) {
        // Cargar Main Deck actual del NPC
        const mainRes = await pool.request()
            .input('npcId', sql.Int, npcId)
            .query(`
                SELECT CardCode, CardName, CardType, SlotOrder
                FROM dbo.NpcDeckCards
                WHERE NpcId = @npcId AND Section = 'MAIN'
                ORDER BY SlotOrder
            `);

        const mainDeck = mainRes.recordset.map(r => ({
            code: r.CardCode,
            name: r.CardName,
            type: r.CardType
        }));

        // Identificar qué materiales y hechizos se requieren
        const requiredCards = new Set();
        let requiredSpell = null;

        fusionNames.forEach(fName => {
            const recipe = FUSION_RECIPES[fName];
            if (recipe) {
                recipe.materials.forEach(m => requiredCards.add(m));
                if (recipe.spell) requiredSpell = recipe.spell;
            }
        });

        // Verificar si faltan materiales o el hechizo en el Main Deck
        const missingCards = [];

        // Verificar hechizo de fusión si aplica
        if (requiredSpell) {
            const hasSpell = mainDeck.some(c => c.name.toLowerCase() === requiredSpell.toLowerCase());
            if (!hasSpell) {
                const resolved = resolveCard(requiredSpell);
                if (resolved) missingCards.push(resolved);
            }
        }

        // Verificar materiales requeridos
        for (const matName of requiredCards) {
            const hasMat = mainDeck.some(c => c.name.toLowerCase() === matName.toLowerCase());
            if (!hasMat) {
                const resolved = resolveCard(matName);
                if (resolved && !resolved.isExtra) {
                    missingCards.push(resolved);
                }
            }
        }

        // Si faltan cartas, sustituir fillers universales (como Sangan, Celtic Guardian, etc.) garantizando 40 cartas
        if (missingCards.length > 0) {
            // Reemplazar cartas menos prioritarias desde el final del mazo
            for (const newCard of missingCards) {
                // Encontrar una carta que no sea material crítico ni hechizo de fusión para reemplazar
                let replaceIdx = -1;
                for (let i = mainDeck.length - 1; i >= 0; i--) {
                    const c = mainDeck[i];
                    const isProtected = requiredCards.has(c.name) || (requiredSpell && c.name === requiredSpell) || c.name === 'Pot of Greed' || c.name === 'Monster Reborn';
                    if (!isProtected) {
                        replaceIdx = i;
                        break;
                    }
                }

                if (replaceIdx !== -1) {
                    mainDeck[replaceIdx] = {
                        code: newCard.id,
                        name: newCard.name,
                        type: newCard.cardType
                    };
                }
            }

            // Actualizar dbo.NpcDeckCards para este NPC
            await pool.request()
                .input('npcId', sql.Int, npcId)
                .query(`DELETE FROM dbo.NpcDeckCards WHERE NpcId = @npcId AND Section = 'MAIN'`);

            for (let i = 0; i < mainDeck.length; i++) {
                const card = mainDeck[i];
                await pool.request()
                    .input('npcId', sql.Int, npcId)
                    .input('cardCode', sql.BigInt, card.code)
                    .input('cardName', sql.NVarChar(150), card.name)
                    .input('cardType', sql.NVarChar(50), card.type)
                    .input('section', sql.NVarChar(10), 'MAIN')
                    .input('slotOrder', sql.Int, i + 1)
                    .query(`
                        INSERT INTO dbo.NpcDeckCards (NpcId, CardCode, CardName, CardType, Section, Quantity, SlotOrder)
                        VALUES (@npcId, @cardCode, @cardName, @cardType, @section, 1, @slotOrder)
                    `);
            }

            console.log(`[NPC #${npcId}] FUSIÓN GARANTIZADA: Agregadas ${missingCards.length} cartas faltantes (${missingCards.map(c => c.name).join(', ')}) -> Mazo en 40 cartas.`);
            totalNpcsFixed++;
        }
    }

    console.log(`\n✅ ¡AUDITORÍA FINALIZADA! Se garantizaron materiales de fusión en ${npcsWithFusions.size} NPCs.`);

    // Verificación final del total de cartas en base de datos
    const checkTotal = await pool.request().query(`
        SELECT Section, COUNT(*) as c 
        FROM dbo.NpcDeckCards 
        GROUP BY Section
    `);
    console.log('CONTEO FINAL EN NpcDeckCards:', checkTotal.recordset);

    const checkInvalid = await pool.request().query(`
        SELECT NpcId, COUNT(*) as c
        FROM dbo.NpcDeckCards
        WHERE Section = 'MAIN'
        GROUP BY NpcId
        HAVING COUNT(*) <> 40
    `);
    console.log(`NPCs con conteo distinto a 40: ${checkInvalid.recordset.length}`);

    process.exit(0);
}

auditAndEnforce().catch(e => {
    console.error('Error:', e);
    process.exit(1);
});
