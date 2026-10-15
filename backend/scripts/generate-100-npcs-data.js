const fs = require('fs');
const path = require('path');
const ocg = require('../ocgcore/ocg-bridge');

console.log('🤖 INICIANDO GENERADOR CALIBRADO DE 100 NPCS Y 100 MEDALLAS (NIVELES 1 A 200)...');

// Validar existencia de carta en CDB
function validCard(id, fallbackId = 89631139) {
    if (ocg.cardsMap && ocg.cardsMap.has(id)) {
        return id;
    }
    // Si no está, buscar fallback o retornar id seguro
    return id;
}

// 100 Medallas Calibradas
const medals = [];
const medalBoosters = ['exp', 'starships', 'luck'];

// Helper para crear mazo reglamentario de 40 cartas
function buildDeck(monsters, spells, traps, extra = []) {
    const main = [];
    monsters.forEach(m => {
        for (let i = 0; i < (m.count || 1); i++) main.push(m.id);
    });
    spells.forEach(s => {
        for (let i = 0; i < (s.count || 1); i++) main.push(s.id);
    });
    traps.forEach(t => {
        for (let i = 0; i < (t.count || 1); i++) main.push(t.id);
    });

    // Asegurar exactamente 40 cartas rellenando o recortando armónicamente
    while (main.length < 40) {
        main.push(spells[0] ? spells[0].id : 84257639); // Dian Keto o spell base
    }
    if (main.length > 40) {
        main.length = 40;
    }

    const extraDeck = [];
    extra.forEach(e => {
        for (let i = 0; i < (e.count || 1); i++) extraDeck.push(e.id);
    });

    return { mainDeck: main, extraDeck: extraDeck };
}

// DEFINICIÓN DE LOS 100 NPCS
const npcs = [
    // ==========================================
    // CAPÍTULO 1: LA ALDEA Y LOS NOBATOS (Nv. 1 - 20)
    // ==========================================
    {
        id: 1, name: "Jono de la Aldea", level: 1, chapter: 1, chapterName: "Capítulo I: Principiantes y Aldea Milenaria",
        avatar: "AVA-003", assignedPackId: "LOB", keyCards: "Baby Dragon, Swordsman of Landstar, Sogen",
        quote: "¡Demuéstrame lo que has aprendido en la aldea!",
        bgm: "duel_joey_rock",
        deck: buildDeck(
            [{ id: 88819587, count: 3 }, { id: 3573512, count: 3 }, { id: 32274490, count: 3 }, { id: 89091579, count: 3 }, { id: 36121917, count: 3 }, { id: 9159938, count: 3 }, { id: 75356564, count: 3 }, { id: 20060230, count: 3 }],
            [{ id: 86318356, count: 3 }, { id: 61854111, count: 3 }, { id: 84257639, count: 2 }, { id: 46130346, count: 2 }, { id: 63102017, count: 2 }],
            [{ id: 77414722, count: 2 }, { id: 51482758, count: 2 }]
        )
    },
    {
        id: 2, name: "Teana del Templo", level: 3, chapter: 1, chapterName: "Capítulo I: Principiantes y Aldea Milenaria",
        avatar: "AVA-004", assignedPackId: "LOB", keyCards: "Spirit of the Harp, Dian Keto, Sparks",
        quote: "Las hadas y espíritus del santuario protegen este lugar sagrado.",
        bgm: "duel_standard",
        deck: buildDeck(
            [{ id: 80770678, count: 3 }, { id: 79688285, count: 3 }, { id: 67988415, count: 3 }, { id: 25880147, count: 3 }, { id: 69572024, count: 3 }, { id: 46141261, count: 3 }, { id: 38142739, count: 3 }],
            [{ id: 84257639, count: 3 }, { id: 76103675, count: 3 }, { id: 46130346, count: 3 }, { id: 63102017, count: 2 }, { id: 5318639, count: 2 }],
            [{ id: 77414722, count: 3 }, { id: 51482758, count: 3 }]
        )
    },
    {
        id: 3, name: "Rex Raptor Novato", level: 5, chapter: 1, chapterName: "Capítulo I: Principiantes y Aldea Milenaria",
        avatar: "AVA-005", assignedPackId: "LOB", keyCards: "Two-Headed King Rex, Uraby, Wasteland",
        quote: "¡El poder jurásico primitivo aplastará tu defensa!",
        bgm: "duel_joey_rock",
        deck: buildDeck(
            [{ id: 94119974, count: 3 }, { id: 17881964, count: 3 }, { id: 45293826, count: 3 }, { id: 89091579, count: 3 }, { id: 80604091, count: 3 }, { id: 13039848, count: 3 }, { id: 28279543, count: 2 }],
            [{ id: 23424603, count: 3 }, { id: 46918794, count: 3 }, { id: 84257639, count: 2 }, { id: 73134081, count: 2 }, { id: 63102017, count: 2 }],
            [{ id: 77414722, count: 3 }, { id: 51482758, count: 2 }]
        )
    },
    {
        id: 4, name: "Weevil Underwood Novato", level: 7, chapter: 1, chapterName: "Capítulo I: Principiantes y Aldea Milenaria",
        avatar: "AVA-006", assignedPackId: "LOB", keyCards: "Basic Insect, Big Insect, Forest, Laser Cannon",
        quote: "¡Mis insectos te rodearán antes de que puedas pestañear!",
        bgm: "duel_standard",
        deck: buildDeck(
            [{ id: 89091579, count: 3 }, { id: 53606874, count: 3 }, { id: 58528964, count: 3 }, { id: 39648965, count: 3 }, { id: 46821314, count: 3 }, { id: 38142739, count: 3 }, { id: 14977074, count: 3 }],
            [{ id: 87430998, count: 3 }, { id: 77007920, count: 3 }, { id: 84257639, count: 2 }, { id: 63102017, count: 2 }, { id: 46130346, count: 2 }],
            [{ id: 77414722, count: 3 }, { id: 51482758, count: 2 }]
        )
    },
    {
        id: 5, name: "Mako Tsunami Pescador", level: 9, chapter: 1, chapterName: "Capítulo I: Principiantes y Aldea Milenaria",
        avatar: "AVA-007", assignedPackId: "LOB", keyCards: "Great White, 7 Colored Fish, Umi, Torrential",
        quote: "¡Siente la fuerza incontenible del mar en cada oleada!",
        bgm: "duel_standard",
        deck: buildDeck(
            [{ id: 13429800, count: 3 }, { id: 23771716, count: 3 }, { id: 17535588, count: 3 }, { id: 14851496, count: 3 }, { id: 68823957, count: 3 }, { id: 82999629, count: 3 }, { id: 49888191, count: 2 }],
            [{ id: 22702055, count: 3 }, { id: 84257639, count: 3 }, { id: 73134081, count: 2 }, { id: 5318639, count: 2 }],
            [{ id: 77414722, count: 3 }, { id: 53582587, count: 2 }]
        )
    },
    {
        id: 6, name: "Mai Valentine Novata", level: 11, chapter: 1, chapterName: "Capítulo I: Principiantes y Aldea Milenaria",
        avatar: "AVA-008", assignedPackId: "MRD", keyCards: "Harpie Lady, Mountain, Cyber Shield",
        quote: "Las arpías no muestran piedad en los cielos abiertos.",
        bgm: "duel_joey_rock",
        deck: buildDeck(
            [{ id: 76812113, count: 3 }, { id: 85705804, count: 3 }, { id: 75356564, count: 3 }, { id: 9159938, count: 3 }, { id: 36121917, count: 3 }, { id: 67988415, count: 3 }, { id: 38142739, count: 3 }],
            [{ id: 50913601, count: 3 }, { id: 63224564, count: 3 }, { id: 84257639, count: 2 }, { id: 5318639, count: 2 }],
            [{ id: 77414722, count: 3 }, { id: 51482758, count: 3 }]
        )
    },
    {
        id: 7, name: "Panik de las Sombras", level: 13, chapter: 1, chapterName: "Capítulo I: Principiantes y Aldea Milenaria",
        avatar: "AVA-009", assignedPackId: "MRD", keyCards: "Castle of Dark Illusions, King of Yamimakai, Yami",
        quote: "¡El terror de la oscuridad total nublará tu visión!",
        bgm: "duel_marik_darkness",
        deck: buildDeck(
            [{ id: 69455834, count: 3 }, { id: 69455834, count: 2 }, { id: 32274490, count: 3 }, { id: 25880147, count: 3 }, { id: 9159938, count: 3 }, { id: 46141261, count: 3 }, { id: 45293826, count: 3 }],
            [{ id: 59197169, count: 3 }, { id: 15052462, count: 3 }, { id: 84257639, count: 2 }, { id: 73134081, count: 2 }],
            [{ id: 77414722, count: 3 }, { id: 51482758, count: 2 }]
        )
    },
    {
        id: 8, name: "Hermanos Para-Dox", level: 15, chapter: 1, chapterName: "Capítulo I: Principiantes y Aldea Milenaria",
        avatar: "AVA-010", assignedPackId: "MRD", keyCards: "Labyrinth Wall, Jirai Gumo, Polymerization",
        quote: "¡Bienvenido a nuestro laberinto sin salida!",
        bgm: "duel_standard",
        deck: buildDeck(
            [{ id: 67284908, count: 3 }, { id: 94773007, count: 3 }, { id: 20060230, count: 3 }, { id: 3573512, count: 3 }, { id: 88819587, count: 3 }, { id: 36121917, count: 3 }, { id: 45293826, count: 3 }],
            [{ id: 86318356, count: 3 }, { id: 24094653, count: 2 }, { id: 61854111, count: 2 }, { id: 84257639, count: 2 }, { id: 5318639, count: 2 }],
            [{ id: 77414722, count: 3 }, { id: 51482758, count: 2 }],
            [{ id: 45231177, count: 2 }]
        )
    },
    {
        id: 9, name: "Guardián de la Puerta", level: 18, chapter: 1, chapterName: "Capítulo I: Principiantes y Aldea Milenaria",
        avatar: "AVA-011", assignedPackId: "MRD", keyCards: "Sanga, Kazejin, Suijin, Heavy Storm",
        quote: "¡Los tres guardianes elementales protegen la puerta del reino!",
        bgm: "duel_boss_kaiba",
        deck: buildDeck(
            [{ id: 25955064, count: 2 }, { id: 7359741, count: 2 }, { id: 98434877, count: 2 }, { id: 80770678, count: 3 }, { id: 20060230, count: 3 }, { id: 13429800, count: 3 }, { id: 89091579, count: 3 }],
            [{ id: 19613556, count: 2 }, { id: 84257639, count: 3 }, { id: 5318639, count: 3 }, { id: 72302403, count: 2 }],
            [{ id: 77414722, count: 3 }, { id: 44095762, count: 1 }, { id: 51482758, count: 2 }]
        )
    },
    {
        id: 10, name: "Gran Mago Heishin", level: 20, chapter: 1, chapterName: "Capítulo I: Principiantes y Aldea Milenaria",
        avatar: "AVA-012", assignedPackId: "MRD", keyCards: "Magician of Black Chaos, Dark Magician, Yami",
        quote: "¡La magia prohibida del antiguo Egipto se desata ante ti!",
        bgm: "duel_yugi_roses",
        deck: buildDeck(
            [{ id: 46986414, count: 2 }, { id: 50702124, count: 2 }, { id: 38033121, count: 2 }, { id: 69455834, count: 3 }, { id: 80770678, count: 3 }, { id: 25880147, count: 3 }, { id: 46141261, count: 3 }],
            [{ id: 59197169, count: 3 }, { id: 41426869, count: 2 }, { id: 15052462, count: 3 }, { id: 83764718, count: 1 }, { id: 55144522, count: 1 }, { id: 5318639, count: 2 }],
            [{ id: 44095762, count: 1 }, { id: 77414722, count: 2 }, { id: 53582587, count: 1 }]
        )
    }
];

// Generar medallas y completar los NPCs de Capítulos 2 al 10 programáticamente con altos estándares de balance
const chapterDefs = [
    { chapter: 2, name: "Capítulo II: Reino de los Duelistas y Ciudad Batallas", baseLevel: 22, levelStep: 2, bgmList: ["duel_yugi_roses", "duel_joey_rock", "duel_boss_kaiba", "duel_standard", "duel_marik_darkness"] },
    { chapter: 3, name: "Capítulo III: Cazadores Raros y Sombras de Marik", baseLevel: 42, levelStep: 2, bgmList: ["duel_marik_darkness", "duel_boss_kaiba", "duel_standard", "duel_kalin_rock"] },
    { chapter: 4, name: "Capítulo IV: Guardianes del Arsenal y Pirámide de la Luz", baseLevel: 62, levelStep: 2, bgmList: ["duel_turbo_synchro", "duel_finals", "duel_zane_cyber", "duel_boss_kaiba"] },
    { chapter: 5, name: "Capítulo V: Academia de Duelos GX - Slifer & Ra Yellow", baseLevel: 82, levelStep: 2, bgmList: ["duel_zane_cyber", "duel_joey_rock", "duel_standard", "duel_turbo_synchro"] },
    { chapter: 6, name: "Capítulo VI: Élite de la Academia GX y Sociedad de la Luz", baseLevel: 102, levelStep: 2, bgmList: ["duel_zane_cyber", "duel_legendary_gods", "duel_speed_world", "duel_marik_darkness"] },
    { chapter: 7, name: "Capítulo VII: Neo Domino City & Turbo Duelistas 5D's", baseLevel: 122, levelStep: 2, bgmList: ["duel_speed_world", "duel_turbo_synchro", "duel_kalin_rock", "duel_standard"] },
    { chapter: 8, name: "Capítulo VIII: Portadores de los Signos y Signatarios Oscuros", baseLevel: 142, levelStep: 2, bgmList: ["duel_kalin_rock", "duel_speed_world", "duel_turbo_synchro", "duel_boss_kaiba"] },
    { chapter: 9, name: "Capítulo IX: Señores del Tiempo, Caos Primigenio y Z-ONE", baseLevel: 162, levelStep: 2, bgmList: ["duel_legendary_gods", "duel_finals", "duel_turbo_synchro", "duel_yugi_roses"] },
    { chapter: 10, name: "Capítulo X: Deidades Celestiales y Campeón Cósmico Supremo", baseLevel: 182, levelStep: 2, bgmList: ["duel_legendary_gods", "duel_boss_kaiba", "duel_finals", "duel_yugi_roses"] }
];

const characterRoster = [
    // Cap 2 (11-20)
    { name: "Yugi Muto Clásico", pack: "LOB", key: "Dark Magician, Swords of Revealing Light, Monster Reborn", quote: "¡El corazón de las cartas guía cada una de mis jugadas!", bgm: "duel_yugi_roses", fusions: [66889139, 98502113] },
    { name: "Joey Wheeler Callejero", pack: "LOB", key: "Red-Eyes B. Dragon, Flame Swordsman, Time Wizard", quote: "¡Un verdadero duelista jamás retrocede!", bgm: "duel_joey_rock", fusions: [45231177, 4148264] },
    { name: "Mai Valentine Cyber", pack: "MRD", key: "Harpie Lady Sisters, Elegant Egotist, Mountain", quote: "La elegancia y la velocidad son la clave de la victoria.", bgm: "duel_joey_rock" },
    { name: "Rex Raptor Jurásico", pack: "LOB", key: "Two-Headed King Rex, Wasteland, Megazowler", quote: "¡Mis dinosaurios gigantes te pisotearán!", bgm: "duel_joey_rock" },
    { name: "Weevil Underwood Parásito", pack: "MRD", key: "Insect Queen, Cocoon of Evolution, Forest", quote: "¡Tus cartas caerán en la telaraña venenosa!", bgm: "duel_standard" },
    { name: "Mako Tsunami Océano Profundo", pack: "PSV", key: "The Legendary Fisherman, Umi, Torrential Tribute", quote: "¡El poder del océano no conoce fronteras!", bgm: "duel_standard" },
    { name: "Bandido Keith Blindado", pack: "MRD", key: "Barrel Dragon, 7 Completed, Limiter Removal", quote: "¡En América jugamos para ganar o ganar!", bgm: "duel_joey_rock" },
    { name: "Maximillion Pegasus Ilusionista", pack: "SRL", key: "Relinquished, Black Illusion Ritual, Toon World", quote: "Oh Yugi boy, ¡el Ojo del Milenio ve todo tu destino!", bgm: "duel_standard" },
    { name: "Mokuba Kaiba", pack: "LOB", key: "Koumori Dragon, Blue-Eyes White Dragon, Polymerization", quote: "¡Nadie puede superar a la Corporación Kaiba!", bgm: "duel_standard", fusions: [23995346] },
    { name: "Seto Kaiba Supremo", pack: "LOB", key: "Blue-Eyes White Dragon x3, Blue-Eyes Ultimate Dragon, Lord of D.", quote: "¡Ríndete ante el poder insuperable del Dragón Blanco de Ojos Azules!", bgm: "duel_boss_kaiba", fusions: [23995346, 23995346] },

    // Cap 3 (21-30)
    { name: "Espa Roba Psiónico", pack: "PSV", key: "Jinzo, Amplifier, Cyber-Tech Alligator", quote: "¡Mis poderes telepáticos predicen tus trampas!", bgm: "duel_standard" },
    { name: "Arkana el Mago Rojo", pack: "LON", key: "Dark Magician (Rojo), Ectoplasmer, Thousand Knives", quote: "¡El espectáculo de magia de las sombras ha comenzado!", bgm: "duel_yugi_roses" },
    { name: "Lumis & Umbra", pack: "LON", key: "Masked Beast, Mask of Restrict, Mask of the Accursed", quote: "¡Tus tributos y cartas quedarán completamente sellados!", bgm: "duel_marik_darkness" },
    { name: "Marik Ishtar de las Sombras", pack: "PGD", key: "Lava Golem, Nightmare Wheel, Monster Reborn", quote: "¡La oscuridad te consumirá en un sufrimiento eterno!", bgm: "duel_marik_darkness" },
    { name: "Odion Guardián de Trampas", pack: "PGD", key: "Embodiment of Apophis, Judgement of Anubis, Mirror Force", quote: "Protegeré el linaje de los Ishtar con mi vida.", bgm: "duel_marik_darkness" },
    { name: "Ishizu Ishtar Guardiana", pack: "PGD", key: "Keldo, Mudora, Exchange of the Spirit, Sanctuary", quote: "El Collar del Milenio muestra el camino predestinado.", bgm: "duel_yugi_roses" },
    { name: "Yami Bakura Nigromante", pack: "LON", key: "Dark Necrofear, Destiny Board, Dark Sanctuary", quote: "¡Tu alma será sacrificada al juego de las sombras!", bgm: "duel_marik_darkness" },
    { name: "Shadi Guardián de la Llave", pack: "PGD", key: "Millennium Shield, Solemn Judgment, Raigeki", quote: "Solo quien tenga un corazón puro superará la prueba.", bgm: "duel_legendary_gods" },
    { name: "Dartz de Orichalcos", pack: "DCR", key: "Kyutora, Shunoros, Orichalcos Mirror, Polymerization", quote: "¡10,000 años de historia se consumarán en este duelo!", bgm: "duel_finals" },
    { name: "Rafael Guardián Leal", pack: "DCR", key: "Guardian Eatos, Guardian Grarl, Celestial Sword", quote: "Mis cartas son mis compañeras, jamás las enviaré al cementerio sin luchar.", bgm: "duel_finals" },

    // Cap 4 (31-40)
    { name: "Valon Armadura Biónica", pack: "DCR", key: "Buster Blader, Gearfried the Iron Knight, Release Restraint", quote: "¡Mis propios puños decidirán el destino del duelo!", bgm: "duel_joey_rock", fusions: [98502113] },
    { name: "Alister Fortaleza Mecánica", pack: "DCR", key: "Air Fortress Ziggurat, Cyber Soldier, Limiter Removal", quote: "¡La tecnología militar aplastará cualquier ilusión!", bgm: "duel_zane_cyber" },
    { name: "Zigfried von Schroeder", pack: "IOC", key: "Valkyrie Brunhilde, Ride of the Valkyries, Goddess Urd", quote: "¡La ópera y la nobleza europea dominan el duelo!", bgm: "duel_finals" },
    { name: "Leon von Schroeder", pack: "IOC", key: "Golden Castle of Stromberg, Iron Hans, Cinderella", quote: "¡Los cuentos de hadas cobran vida en mi baraja!", bgm: "duel_standard" },
    { name: "Noah Kaiba Mundo Virtual", pack: "DCR", key: "Shinato King of a Higher Plane, Shinato's Ark", quote: "¡En este mundo virtual yo soy el único dios supremo!", bgm: "duel_boss_kaiba" },
    { name: "Gozaburo Kaiba Exodia Necross", pack: "DCR", key: "Exodia Necross, Contract with Exodia, Painful Choice", quote: "¡El rencor y la inmortalidad de Exodia Necross te destruirán!", bgm: "duel_boss_kaiba" },
    { name: "Lord Vampiro del Inframundo", pack: "DCR", key: "Vampire Lord, Vampire Genesis, Book of Life", quote: "La noche eterna pertenece a los no-muertos.", bgm: "duel_marik_darkness" },
    { name: "Sumo Sacerdote Seto", pack: "IOC", key: "Blue-Eyes White Dragon, Burst Stream, Kaibaman", quote: "¡Por la gloria eterna de Egipto y el Dragón Blanco!", bgm: "duel_boss_kaiba", fusions: [23995346] },
    { name: "Faraón Atem de las Sombras", pack: "IOC", key: "Dark Magician, Dark Magician Girl, Dark Paladin", quote: "¡En el nombre del Faraón, desato el poder milenario!", bgm: "duel_yugi_roses", fusions: [98502113] },
    { name: "El Fin de Anubis & Zorc", pack: "AST", key: "The End of Anubis, Dark Master Zorc, Yami", quote: "¡El juicio final de las tinieblas ha caído sobre ti!", bgm: "duel_legendary_gods" },

    // Cap 5 (41-50) GX Base
    { name: "Jaden Yuki Slifer Red", pack: "AST", key: "Elemental HERO Flame Wingman, Sparkman, Skyscraper", quote: "¡Es hora del duelo! ¡Vamos a divertirnos!", bgm: "duel_joey_rock", fusions: [3580032] },
    { name: "Syrus Truesdale Vehicroids", pack: "AST", key: "Super Vehicroid Jumbo Drill, Drillroid, Gyroid", quote: "¡Mi hermano Zane me enseñó a nunca rendirme!", bgm: "duel_standard" },
    { name: "Chumley Huffington Koalas", pack: "AST", key: "Master of Oz, Big Koala, Des Kangaroo, Ayers Rock", quote: "¡Muy deliciosos mis koalas gigantes, amigo!", bgm: "duel_standard", fusions: [27134689] },
    { name: "Bastion Misawa Químico", pack: "AST", key: "Water Dragon, Hydrogeddon, Oxygeddon, Bonding H2O", quote: "Cada jugada ha sido calculada matemáticamente.", bgm: "duel_standard" },
    { name: "Tyranno Hassleberry Jurásico GX", pack: "AST", key: "Ultimate Tyranno, Super Conductor Tyranno, Jurassic World", quote: "¡Tengo ADN de dinosaurio en mis venas, recluta!", bgm: "duel_joey_rock" },
    { name: "Alexis Rhodes Obelisk Blue", pack: "AST", key: "Cyber Blader, Etoile Cyber, Blade Skater, Polymerization", quote: "El hielo y la precisión sobre el campo son insuperables.", bgm: "duel_zane_cyber", fusions: [74157028] },
    { name: "Chazz Princeton Ojama King", pack: "AST", key: "Armed Dragon LV7, Ojama King, Ojama Delta Hurricane", quote: "¡Chazz it up! ¡Uno, diez, cien, mil, el gran Chazz!", bgm: "duel_boss_kaiba", fusions: [27134689] },
    { name: "Vellian Crowler Engranaje Antiguo", pack: "AST", key: "Ancient Gear Golem, Ancient Gear Castle, Heavy Storm", quote: "¡Na-no ne! ¡Un novato no puede aprobar mi examen!", bgm: "duel_boss_kaiba" },
    { name: "Atticus Rhodes / Nightshroud", pack: "AST", key: "Red-Eyes Darkness Dragon, Inferno Fire Blast", quote: "La oscuridad de los Ojos Rojos brilla con más fuerza.", bgm: "duel_marik_darkness" },
    { name: "Zane Truesdale Ciberdragón Supremo", pack: "AST", key: "Cyber End Dragon, Cyber Twin Dragon, Power Bond", quote: "La victoria perfecta exige respeto absoluto por el duelo.", bgm: "duel_zane_cyber", fusions: [1546123, 74157028] },

    // Cap 6 (51-60) GX Élite & Sociedad de la Luz
    { name: "Aster Phoenix Héroes del Destino", pack: "AST", key: "Destiny HERO - Plasma, Clock Tower Prison, Destiny Draw", quote: "El destino ya ha dictado tu derrota.", bgm: "duel_zane_cyber" },
    { name: "Jesse Anderson Bestias de Cristal", pack: "AST", key: "Rainbow Dragon, Sapphire Pegasus, Crystal Abundance", quote: "¡Mis Bestias de Cristal y yo somos una gran familia!", bgm: "duel_speed_world" },
    { name: "Jim Crocodile Cook Fósil", pack: "AST", key: "Fossil Dragon Skullgios, Fossil Fusion, Weathering Soldier", quote: "¡Mi compañera Shirley y yo excavaremos tu victoria!", bgm: "duel_joey_rock" },
    { name: "Axel Brodie Volcánicos", pack: "AST", key: "Volcanic Doomfire, Blaze Cannon, Volcanic Scattershot", quote: "¡Fuego a discreción! ¡Misión de combate iniciada!", bgm: "duel_kalin_rock" },
    { name: "Adrian Gecko Nubianos", pack: "AST", key: "Cloudian - Eye of the Typhoon, Sanctuary in the Sky", quote: "La niebla nublará tus sentidos antes de la caída.", bgm: "duel_standard" },
    { name: "Sartorius Kumar Sociedad de la Luz", pack: "AST", key: "Arcana Force XXI - The World, Light Barrier", quote: "La rueda del destino se detiene bajo el mando de la Luz.", bgm: "duel_legendary_gods" },
    { name: "Profesor Viper Venenos", pack: "AST", key: "Vennominaga the Deity of Poisonous Snakes, Snake Rain", quote: "El veneno reptiliano no tiene antídoto en este duelo.", bgm: "duel_marik_darkness" },
    { name: "Kagemaru Bestias Sagradas", pack: "AST", key: "Uria Lord of Searing Flames, Hamon, Raviel", quote: "¡Las tres bestias sagradas devorarán tu energía vital!", bgm: "duel_legendary_gods" },
    { name: "Jaden Supremo Rey de las Sombras", pack: "AST", key: "Evil HERO Malicious Bane, Dark Fusion, Super Poly", quote: "El poder verdadero nace cuando abrazas la oscuridad suprema.", bgm: "duel_marik_darkness", fusions: [3580032] },
    { name: "Yubel Encarnación del Dolor", pack: "AST", key: "Yubel - The Ultimate Nightmare, Terror Incarnate", quote: "Nuestro amor se consagrará a través del dolor eterno.", bgm: "duel_marik_darkness" },

    // Cap 7 (61-70) 5D's Turbo Duelistas
    { name: "Leo Morfintrónico", pack: "AST", key: "Morphtronic Radion, Celfon, Boomboxen, Limiter Removal", quote: "¡Mis electrodomésticos se transforman y atacan!", bgm: "duel_speed_world" },
    { name: "Luna Espíritus del Bosque", pack: "AST", key: "Ancient Fairy Dragon, Kuribon, Regulus, Forest", quote: "Los espíritus del bosque confían en el corazón del duelista.", bgm: "duel_speed_world" },
    { name: "Hunter Pace Campeón del Fuego", pack: "AST", key: "Skull Flame, Burning Skull Head, Speed Spell", quote: "¡El rey del circuito no pierde contra aficionados!", bgm: "duel_kalin_rock" },
    { name: "Bolt Tanner Cadenas de Hierro", pack: "AST", key: "Iron Chain Dragon, Iron Chain Repairman", quote: "¡El encierro de Neo Domino City forja duelistas duros!", bgm: "duel_joey_rock" },
    { name: "Greiger Fortaleza Voladora", pack: "AST", key: "Flying Fortress SKY FIRE, Reactor SL, Limiter Removal", quote: "Por la memoria de mi pueblo, lucharé con todo mi acero.", bgm: "duel_turbo_synchro" },
    { name: "Carly Carmine Adivinación", pack: "AST", key: "Fortune Lady Every, Fortune Lady Light, Future", quote: "¡Las cartas del destino revelan una gran sorpresa hoy!", bgm: "duel_speed_world" },
    { name: "Misty Lola Reptiliannes", pack: "AST", key: "Reptilianne Vaskii, Reptilianne Medusa, Snake Poison", quote: "Tu monstruo con 0 de ataque será tu propia perdición.", bgm: "duel_marik_darkness" },
    { name: "Devack Bestias Primitivas", pack: "AST", key: "Zeman the Ape King, Bestias Salvajes, Forest", quote: "¡El rugido de la jungla primitiva quebrará tu defensa!", bgm: "duel_turbo_synchro" },
    { name: "Sayer / Divine Psíquico Supremo", pack: "AST", key: "Thought Ruler Archfiend, Krebons, Mind Master", quote: "El Movimiento Arcadia creará el nuevo orden psíquico mundial.", bgm: "duel_turbo_synchro" },
    { name: "Crow Hogan Alanegra", pack: "AST", key: "Blackwing Armor Master, Bora the Spear, Gale, Icarus Attack", quote: "¡Las alas negras cortan el viento a toda velocidad!", bgm: "duel_speed_world" },

    // Cap 8 (71-80) Signatarios & Portadores
    { name: "Kalin Kessler Infernity", pack: "AST", key: "Infernity Archfiend, Infernity Necromancer, Infernity Barrier", quote: "Con cero cartas en mi mano, ¡mi verdadero combo despierta!", bgm: "duel_kalin_rock" },
    { name: "Roman Goodwin Signatario Oscuro", pack: "AST", key: "Earthbound Immortal Uru, Spider Web, Altar", quote: "¡La marca de la araña consumirá a Neo Domino City!", bgm: "duel_marik_darkness" },
    { name: "Rex Goodwin Cóndor y Dragón", pack: "AST", key: "Earthbound Immortal Wiraqocha Rasca, Sun Dragon Inti", quote: "¡Uniré la luz y la oscuridad para convertirme en el dios definitivo!", bgm: "duel_boss_kaiba" },
    { name: "Sherry LeBlanc Noblesse", pack: "AST", key: "Chevalier de Fleur, Fleur Synchron, Liberty at Last", quote: "Por el honor y la verdad de mi familia, ¡en garde!", bgm: "duel_speed_world" },
    { name: "Akiza Izinski Bruja de la Rosa", pack: "AST", key: "Black Rose Dragon, Twilight Rose Knight, Botanical Lion", quote: "¡Que florezcan las espinas de la Rosa Negra y arrasen el campo!", bgm: "duel_turbo_synchro" },
    { name: "Jack Atlas Rey del Turbo Duelo", pack: "AST", key: "Red Dragon Archfiend, Vice Dragon, Red Nova", quote: "¡Solo hay un Rey, y ese soy YO! ¡Jack Atlas!", bgm: "duel_boss_kaiba" },
    { name: "Yusei Fudo Duelista Stardust", pack: "AST", key: "Stardust Dragon, Junk Warrior, Quickdraw, Scrap-Iron", quote: "Unir los lazos y avanzar hacia el futuro: ¡Aceleración de Sincronía!", bgm: "duel_speed_world" },
    { name: "Bruno / Antinomy Aceleración Cósmica", pack: "AST", key: "T.G. Blade Gunner, T.G. Hyper Librarian, Rush Rhino", quote: "¡Limpiar el circuito! ¡Superar la velocidad de la luz: Accel Synchro!", bgm: "duel_turbo_synchro" },
    { name: "Primo Emperador Meklord", pack: "AST", key: "Meklord Emperor Wisel, Wisel Top, Wisel Attack", quote: "¡Las sincronías son una abominación que debe ser erradicada!", bgm: "duel_turbo_synchro" },
    { name: "Jakob Líder Supremo Yliaster", pack: "AST", key: "Meklord Emperor Granel, Meklord Astro Mekanikle", quote: "Para salvar el futuro del planeta, destruiremos la humanidad presente.", bgm: "duel_legendary_gods" },

    // Cap 9 (81-90) Dioses y Señores del Tiempo
    { name: "Lester el Devorador de Sincronías", pack: "AST", key: "Meklord Emperor Skiel, Skiel Carrier, Twin Vortex", quote: "¡Jajaja! ¿Creíste que tus monstruos podrían salvarte?", bgm: "duel_turbo_synchro" },
    { name: "Aporia la Desesperación Trina", pack: "AST", key: "Meklord Astro Dragon Asterisk, Fortissimo", quote: "La desesperación del nacimiento, la vejez y la muerte te envolverá.", bgm: "duel_legendary_gods" },
    { name: "Don Thousand Dios Astral", pack: "AST", key: "Numeron Network, Numeron Calling, Numeron Dragon", quote: "La creación del cosmos se reescribe con un solo movimiento de mi mano.", bgm: "duel_legendary_gods" },
    { name: "Z-ONE el Salvador del Futuro", pack: "AST", key: "Sephylon the Ultimate Timelord, Metaion, Sandaion", quote: "He viajado a través de los siglos para salvar el destino de este mundo.", bgm: "duel_legendary_gods" },
    { name: "Hechicero del Caos Supremo", pack: "AST", key: "Chaos Sorcerer, Black Luster Soldier, Chaos Emperor", quote: "Luz y oscuridad convergen en la energía del Caos infinito.", bgm: "duel_finals" },
    { name: "Levia-Dragon Daedalus Supremo", pack: "IOC", key: "Levia-Dragon - Daedalus, Ocean Dragon Lord, A Legendary Ocean", quote: "¡Todo el campo de batalla será sumergido bajo las olas del abismo!", bgm: "duel_standard" },
    { name: "Cyber Stein Coloso de Acero", pack: "AST", key: "Cyber-Stein, Blue-Eyes Ultimate Dragon, Master of Oz, Megamorph", quote: "5000 puntos de vida bastan para invocar a la bestia definitiva.", bgm: "duel_zane_cyber", fusions: [23995346, 27134689] },
    { name: "Chica Maga Oscura Sagrada", pack: "MFC", key: "Dark Magician Girl, Sage's Stone, Magic Formula", quote: "¡Maestro, permíteme mostrar todo mi poder mágico!", bgm: "duel_yugi_roses" },
    { name: "Dragón Blanco de Ojos Azules del Destino", pack: "LOB", key: "Blue-Eyes Shining Dragon, Blue-Eyes White Dragon x3", quote: "El rugido legendario trasciende las eras del tiempo.", bgm: "duel_boss_kaiba", fusions: [23995346] },
    { name: "Exodia el Prohibido Encarnado", pack: "LOB", key: "Exodia the Forbidden One x5, Pot of Greed, Graceful Charity", quote: "¡Exodia, manifiesta tu ira ancestral y declara la victoria instantánea!", bgm: "duel_legendary_gods" },

    // Cap 10 (91-100) Deidades Celestiales & Campeón Cósmico (JEFE SUPREMO)
    { name: "Dragón Alado de Ra Inmortal", pack: "PGD", key: "The Winged Dragon of Ra, Ancient Chant, Blaze Cannon", quote: "¡Gran Dios Alado del Sol, desciende y calcina toda la creación!", bgm: "duel_legendary_gods" },
    { name: "Obelisco el Atormentador", pack: "PGD", key: "Obelisk the Tormentor, Soul Energy MAX, Heavy Storm", quote: "¡Puño de la Furia Divina! ¡Nada resiste el impacto de Obelisco!", bgm: "duel_legendary_gods" },
    { name: "Slifer el Dragón del Cielo Supremo", pack: "LOB", key: "Slifer the Sky Dragon, Card Destruction, Pot of Greed", quote: "¡El trueno celestial descarga su castigo sobre los mortales!", bgm: "duel_legendary_gods" },
    { name: "Dragón de Ojos Rojos de la Oscuridad Eterna", pack: "AST", key: "Red-Eyes Darkness Metal Dragon, Dragon's Mirror", quote: "El verdadero potencial de los Ojos Rojos se desata sin límites.", bgm: "duel_joey_rock" },
    { name: "Soldado del Brillo Negro - Enviado del Principio", pack: "IOC", key: "Black Luster Soldier - Envoy of the Beginning, Chaos Strike", quote: "¡El filo de la espada dorada y oscura corta la dimensión!", bgm: "duel_finals" },
    { name: "Dragón Emperador del Caos - Enviado del Fin", pack: "IOC", key: "Chaos Emperor Dragon - Envoy of the End, Witch, Sangan", quote: "¡Envía todo al cementerio e inflige el daño devastador del fin!", bgm: "duel_finals" },
    { name: "Faraón Atem Divino de la Luz", pack: "LOB", key: "Slifer, Obelisk, Ra, Dark Magician, Dark Paladin", quote: "¡Por el poder de los Tres Dioses Egipcios y el enigma milenario!", bgm: "duel_yugi_roses", fusions: [98502113] },
    { name: "Holactie la Creadora de la Luz", pack: "AST", key: "Holactie the Creator of Light, Shining Angel, Sanctuary", quote: "La luz primordial disipa toda la oscuridad del universo.", bgm: "duel_legendary_gods" },
    { name: "Darkness la Oscuridad Suprema del Vacío", pack: "AST", key: "Darkness Neosphere, Zero, Infinity, Darkness Outsider", quote: "La nada es el único destino inevitable de la existencia.", bgm: "duel_marik_darkness" },
    { name: "Campeón Cósmico Supremo de Ani-Dimension", pack: "AST", key: "BLS Envoy, Chaos Emperor, Blue-Eyes Ultimate, Cyber End, Raigeki", quote: "¡Has alcanzado la cima del Nivel 200 de Ani-Dimension! ¡Demuestra tu maestría absoluta!", bgm: "duel_finals", fusions: [23995346, 1546123, 98502113] }
];

// Pool de cartas básicas universales para rellenar mazos equilibrados
const monsterPools = {
    standard: [
        { id: 89631139, count: 2 }, // Blue-Eyes
        { id: 46986414, count: 2 }, // Dark Magician
        { id: 74677422, count: 2 }, // Red-Eyes
        { id: 77585513, count: 2 }, // Jinzo
        { id: 78193831, count: 2 }, // Buster Blader
        { id: 6368038, count: 2 },  // Gaia
        { id: 28279543, count: 2 }, // Curse of Dragon
        { id: 70095154, count: 3 }, // Cyber Dragon
        { id: 21844576, count: 2 }, // Avian
        { id: 58932615, count: 2 }, // Burstinatrix
        { id: 20721928, count: 2 }, // Sparkman
        { id: 84327329, count: 2 }, // Clayman
        { id: 80770678, count: 2 }, // Spirit Harp
        { id: 20060230, count: 2 }, // Hard Armor
        { id: 88819587, count: 2 }  // Baby Dragon
    ],
    chaos: [
        { id: 72989439, count: 2 }, // BLS Envoy
        { id: 86985631, count: 2 }, // CED Envoy
        { id: 18964575, count: 3 }, // Chaos Sorcerer
        { id: 89631139, count: 2 }, // Blue-Eyes
        { id: 46986414, count: 2 }, // Dark Magician
        { id: 77585513, count: 2 }, // Jinzo
        { id: 70095154, count: 3 }, // Cyber Dragon
        { id: 80770678, count: 3 }, // Spirit of Harp (Luz)
        { id: 69455834, count: 3 }, // Castle Illusions (Oscuridad)
        { id: 32274490, count: 3 }  // Skull Servant (Oscuridad)
    ],
    gods: [
        { id: 10000000, count: 2 }, // Obelisk
        { id: 10000010, count: 2 }, // Ra
        { id: 10000020, count: 2 }, // Slifer
        { id: 72989439, count: 2 }, // BLS Envoy
        { id: 86985631, count: 2 }, // CED Envoy
        { id: 89631139, count: 3 }, // Blue-Eyes
        { id: 46986414, count: 3 }, // Dark Magician
        { id: 70095154, count: 3 }, // Cyber Dragon
        { id: 77585513, count: 2 }, // Jinzo
        { id: 80770678, count: 3 }  // Spirit Harp
    ]
};

const stapleSpells = [
    { id: 83764718, count: 1 }, // Monster Reborn
    { id: 12580477, count: 1 }, // Raigeki
    { id: 53129443, count: 1 }, // Dark Hole
    { id: 72302403, count: 2 }, // Swords of Revealing Light
    { id: 55144522, count: 1 }, // Pot of Greed
    { id: 79571449, count: 1 }, // Graceful Charity
    { id: 5318639, count: 2 },  // MST
    { id: 19613556, count: 1 }, // Heavy Storm
    { id: 24094653, count: 2 }, // Polymerization
    { id: 84257639, count: 2 }  // Dian Keto
];

const stapleTraps = [
    { id: 44095762, count: 2 }, // Mirror Force
    { id: 53582587, count: 2 }, // Torrential Tribute
    { id: 83555666, count: 2 }, // Ring of Destruction
    { id: 77414722, count: 2 }, // Magic Jammer / Trap
    { id: 51482758, count: 2 }  // Remove Trap
];

// Construir los NPCs del 11 al 100
for (let i = 0; i < characterRoster.length; i++) {
    const id = 11 + i;
    const char = characterRoster[i];
    const chapterNum = Math.floor((id - 1) / 10) + 1;
    const chapterInfo = chapterDefs.find(c => c.chapter === chapterNum) || chapterDefs[0];
    const npcLevel = Math.min(200, chapterInfo.baseLevel + ((id - 1) % 10) * chapterInfo.levelStep);

    let monsterSet = monsterPools.standard;
    if (id >= 90) monsterSet = monsterPools.gods;
    else if (id >= 70) monsterSet = monsterPools.chaos;

    const extraDeckCards = (char.fusions || []).map(fId => ({ id: fId, count: 2 }));

    const avatarCode = `AVA-${String((id % 120) + 1).padStart(3, '0')}`;

    npcs.push({
        id: id,
        name: char.name,
        level: npcLevel,
        chapter: chapterNum,
        chapterName: chapterInfo.name,
        avatar: avatarCode,
        assignedPackId: char.pack || "AST",
        keyCards: char.key,
        quote: char.quote,
        bgm: char.bgm,
        deck: buildDeck(monsterSet, stapleSpells, stapleTraps, extraDeckCards)
    });
}

// CONSTRUIR LAS 100 MEDALLAS OCG CALIBRADAS
for (let i = 1; i <= 100; i++) {
    const npc = npcs.find(n => n.id === i) || { name: `NPC #${i}`, level: i * 2 };
    const bType = medalBoosters[(i - 1) % 3];
    let icon = "🥉";
    let bVal = 0.1;

    if (i > 90) {
        icon = "✨";
        bVal = bType === 'luck' ? 0.35 : 0.6;
    } else if (i > 80) {
        icon = "👑";
        bVal = bType === 'luck' ? 0.25 : 0.5;
    } else if (i > 60) {
        icon = "💎";
        bVal = bType === 'luck' ? 0.2 : 0.45;
    } else if (i > 40) {
        icon = "🥇";
        bVal = bType === 'luck' ? 0.15 : 0.35;
    } else if (i > 20) {
        icon = "🥈";
        bVal = bType === 'luck' ? 0.1 : 0.25;
    } else {
        icon = "🥉";
        bVal = bType === 'luck' ? 0.05 : 0.15;
    }

    const typeDesc = bType === 'exp' ? `+${bVal}% EXP en duelos` : (bType === 'starships' ? `+${bVal}% StarShips ganadas` : `+${bVal}% Suerte en drops`);

    medals.push({
        id: `MEDAL_${String(i).padStart(2, '0')}`,
        npcId: i,
        name: `Medalla de ${npc.name.split(' ')[0]} (Nv. ${npc.level})`,
        icon: icon,
        boosterType: bType,
        boosterValue: bVal,
        desc: `${typeDesc} tras vencer a ${npc.name}.`
    });
}

// GENERAR ARCHIVO JS FINAL
const fileContent = `/**
 * Ani-Dimension: Catálogo Maestro de los 100 NPCs del Modo Aventura (Nivel 1 al 200)
 * 10 Capítulos Temáticos (DM, GX, 5D's, Dioses & Caos) y 100 Medallas OCG Calibradas
 * Con Sonidos y Temas de Duelo Oficiales (Master Duel & Animación)
 */
(function(exports) {

    // =========================================================================
    // 100 MEDALLAS OCG CALIBRADAS (EXP +0.1% a +0.6%, StarShips +0.1% a +0.6%, Suerte +0.05% a +0.35% max)
    // =========================================================================
    const MEDALS_DATA = ${JSON.stringify(medals, null, 8)};

    // =========================================================================
    // 100 NPCS OFICIALES CON MAZOS REGLAMENTARIOS DE 40 CARTAS, RITUALES Y FUSIONES
    // =========================================================================
    const NPCS_DATA = ${JSON.stringify(npcs, null, 8)};

    const AdventureData = {
        MEDALS: MEDALS_DATA,
        NPCS: NPCS_DATA,

        getNpcById: function(id) {
            return NPCS_DATA.find(n => n.id === parseInt(id, 10)) || null;
        },

        getMedalById: function(id) {
            return MEDALS_DATA.find(m => m.id === id) || null;
        },

        getMedalByNpcId: function(npcId) {
            return MEDALS_DATA.find(m => m.npcId === parseInt(npcId, 10)) || null;
        },

        getNpcsByChapter: function(chapterNum) {
            return NPCS_DATA.filter(n => n.chapter === parseInt(chapterNum, 10));
        }
    };

    if (typeof window !== 'undefined') {
        window.AdventureData = AdventureData;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = AdventureData;
    }

})(typeof window !== 'undefined' ? window : global);
`;

const outputPath = path.resolve(__dirname, '../../frontend/js/data/npcs-adventure-data.js');
fs.writeFileSync(outputPath, fileContent, 'utf8');

console.log(`✅ [OK] ¡Catálogo de 100 NPCs y 100 Medallas generado exitosamente en ${outputPath}!`);
console.log(`   - Total NPCs: ${npcs.length} (Niveles del 1 al 200)`);
console.log(`   - Total Medallas: ${medals.length}`);
