const cardCache = new Map();
/**
 * Ani-Dimension: Base Local de Respaldo y Caché de Cartas
 * Incluye motor de consulta a db.ygoprodeck.com API y fallback local
 */

const LOCAL_CARDS = {
    89631139: {
        id: 89631139,
        name: "Blue-Eyes White Dragon",
        type: "Normal Monster",
        race: "Dragon",
        attribute: "LIGHT",
        level: 8,
        atk: 3000,
        def: 2500,
        archetype: "Blue-Eyes",
        desc: "Este dragón legendario es un poderoso motor de destrucción. Virtualmente invencible, muy pocos han enfrentado a esta impresionante criatura y vivido para contarlo.",
        image_url: "https://images.ygoprodeck.com/images/cards/89631139.jpg"
    },
    46986414: {
        id: 46986414,
        name: "Dark Magician",
        type: "Normal Monster",
        race: "Spellcaster",
        attribute: "DARK",
        level: 7,
        atk: 2500,
        def: 2100,
        archetype: "Dark Magician",
        desc: "El mago definitivo en cuanto al ataque y la defensa.",
        image_url: "https://images.ygoprodeck.com/images/cards/46986414.jpg"
    },
    70781052: {
        id: 70781052,
        name: "Summoned Skull",
        type: "Normal Monster",
        race: "Fiend",
        attribute: "DARK",
        level: 6,
        atk: 2500,
        def: 1200,
        archetype: "Archfiend",
        desc: "Un demonio con poderes oscuros para confundir al enemigo. Entre los monstruos de tipo demonio, este presume de una fuerza considerable.",
        image_url: "https://images.ygoprodeck.com/images/cards/70781052.jpg"
    },
    74677422: {
        id: 74677422,
        name: "Red-Eyes Black Dragon",
        type: "Normal Monster",
        race: "Dragon",
        attribute: "DARK",
        level: 7,
        atk: 2400,
        def: 2000,
        archetype: "Red-Eyes",
        desc: "Un dragón feroz con un ataque letal.",
        image_url: "https://images.ygoprodeck.com/images/cards/74677422.jpg"
    },
    91152256: {
        id: 91152256,
        name: "Celtic Guardian",
        type: "Normal Monster",
        race: "Warrior",
        attribute: "EARTH",
        level: 4,
        atk: 1400,
        def: 1200,
        archetype: "Celtic Guard",
        desc: "Un elfo guerrero que blande una espada con una rapidez deslumbrante.",
        image_url: "https://images.ygoprodeck.com/images/cards/91152256.jpg"
    },
    78193831: {
        id: 78193831,
        name: "Buster Blader",
        type: "Effect Monster",
        race: "Warrior",
        attribute: "EARTH",
        level: 7,
        atk: 2600,
        def: 2300,
        archetype: "Buster Blader",
        desc: "Gana 500 ATK por cada monstruo Dragón que controle tu adversario o esté en su Cementerio.",
        image_url: "https://images.ygoprodeck.com/images/cards/78193831.jpg"
    },
    40640057: {
        id: 40640057,
        name: "Kuriboh",
        type: "Effect Monster",
        race: "Fiend",
        attribute: "DARK",
        level: 1,
        atk: 300,
        def: 200,
        archetype: "Kuriboh",
        desc: "Durante el cálculo de daño: puedes descartar esta carta; no recibes daño de batalla de esta batalla.",
        image_url: "https://images.ygoprodeck.com/images/cards/40640057.jpg"
    },
    71625222: {
        id: 71625222,
        name: "Time Wizard",
        type: "Effect Monster",
        race: "Spellcaster",
        attribute: "LIGHT",
        level: 2,
        atk: 500,
        def: 400,
        archetype: null,
        desc: "Una vez por turno: puedes lanzar una moneda y elegir cara o cruz. Si aciertas: destruye todos los monstruos que controle tu adversario.",
        image_url: "https://images.ygoprodeck.com/images/cards/71625222.jpg"
    },
    18807109: {
        id: 18807109,
        name: "Spellbinding Circle",
        type: "Trap Card",
        race: "Continuous",
        attribute: "TRAP",
        level: 0,
        atk: null,
        def: null,
        archetype: null,
        desc: "Activa esta carta seleccionando 1 monstruo que controle tu adversario; ese monstruo no puede atacar ni cambiar su posición de batalla.",
        image_url: "https://images.ygoprodeck.com/images/cards/18807109.jpg"
    },
    44519536: {
        id: 44519536,
        name: "Left Leg of the Forbidden One",
        type: "Normal Monster",
        race: "Spellcaster",
        attribute: "DARK",
        level: 1,
        atk: 200,
        def: 300,
        archetype: "Exodia",
        desc: "Una pierna izquierda prohibida sellada por magia. El que rompa este sello obtendrá un poder infinito.",
        image_url: "https://images.ygoprodeck.com/images/cards/44519536.jpg"
    },
    44095762: {
        id: 44095762,
        name: "Mirror Force",
        type: "Trap Card",
        race: "Normal",
        attribute: "TRAP",
        level: 0,
        atk: null,
        def: null,
        archetype: "Mirror Force",
        desc: "Cuando un monstruo del adversario declara un ataque: destruye todos los monstruos en Posición de Ataque que controle tu adversario.",
        image_url: "https://images.ygoprodeck.com/images/cards/44095762.jpg"
    },
    83764718: {
        id: 83764718,
        name: "Monster Reborn",
        type: "Spell Card",
        race: "Normal",
        attribute: "SPELL",
        level: 0,
        atk: null,
        def: null,
        archetype: null,
        desc: "Selecciona 1 monstruo en cualquier Cementerio; Invócalo de Modo Especial.",
        image_url: "https://images.ygoprodeck.com/images/cards/83764718.jpg"
    },
    12580477: {
        id: 12580477,
        name: "Raigeki",
        type: "Spell Card",
        race: "Normal",
        attribute: "SPELL",
        level: 0,
        atk: null,
        def: null,
        archetype: null,
        desc: "Destruye todos los monstruos que controle tu adversario.",
        image_url: "https://images.ygoprodeck.com/images/cards/12580477.jpg"
    },
    55144522: {
        id: 55144522,
        name: "Pot of Greed",
        type: "Spell Card",
        race: "Normal",
        attribute: "SPELL",
        level: 0,
        atk: null,
        def: null,
        archetype: "Greed",
        desc: "Roba 2 cartas de tu Deck.",
        image_url: "https://images.ygoprodeck.com/images/cards/55144522.jpg"
    },
    53129443: {
        id: 53129443,
        name: "Dark Hole",
        type: "Spell Card",
        race: "Normal",
        attribute: "SPELL",
        level: 0,
        atk: null,
        def: null,
        archetype: "Hole",
        desc: "Destruye todos los monstruos en el Campo.",
        image_url: "https://images.ygoprodeck.com/images/cards/53129443.jpg"
    },
    5318639: {
        id: 5318639,
        name: "Mystical Space Typhoon",
        type: "Spell Card",
        race: "Quick-Play",
        attribute: "SPELL",
        level: 0,
        atk: null,
        def: null,
        archetype: null,
        desc: "Selecciona 1 carta Mágica/Trampa en el Campo; destrúyela.",
        image_url: "https://images.ygoprodeck.com/images/cards/5318639.jpg"
    },
    59197169: {
        id: 59197169,
        name: "Yami",
        type: "Spell Card",
        race: "Field",
        attribute: "SPELL",
        level: 0,
        atk: null,
        def: null,
        archetype: null,
        desc: "Aumenta el ATK y DEF de todos los monstruos Tipo Lanzador de Conjuros y Demonio en 200 puntos, y disminuye el ATK y DEF de monstruos Tipo Hada en 200 puntos.",
        image_url: "https://images.ygoprodeck.com/images/cards/59197169.jpg"
    },
    11091375: {
        id: 11091375,
        name: "Luster Dragon",
        type: "Normal Monster",
        race: "Dragon",
        attribute: "WIND",
        level: 4,
        atk: 1900,
        def: 1600,
        archetype: null,
        desc: "Un hermoso dragón cubierto de zafiros. No le gusta luchar, pero tiene una gran capacidad de ataque.",
        image_url: "https://images.ygoprodeck.com/images/cards/11091375.jpg"
    },
    79814787: {
        id: 79814787,
        name: "The White Stone of Legend",
        type: "Tuner Monster",
        race: "Dragon",
        attribute: "LIGHT",
        level: 1,
        atk: 300,
        def: 250,
        archetype: "Blue-Eyes",
        desc: "Si esta carta es enviada al Cementerio: añade a tu mano 1 'Blue-Eyes White Dragon' desde tu Deck.",
        image_url: "https://images.ygoprodeck.com/images/cards/79814787.jpg"
    },
    17655904: {
        id: 17655904,
        name: "Burst Stream of Destruction",
        type: "Spell Card",
        race: "Normal",
        attribute: "SPELL",
        level: 0,
        atk: null,
        def: null,
        archetype: "Blue-Eyes",
        desc: "Si controlas un 'Blue-Eyes White Dragon': destruye todos los monstruos que controle tu adversario.",
        image_url: "https://images.ygoprodeck.com/images/cards/17655904.jpg"
    },
    38033121: {
        id: 38033121,
        name: "Dark Magician Girl",
        type: "Effect Monster",
        race: "Spellcaster",
        attribute: "DARK",
        level: 6,
        atk: 2000,
        def: 1700,
        archetype: "Dark Magician",
        desc: "Gana 300 ATK por cada 'Dark Magician' o 'Magician of Black Chaos' en el Cementerio de cualquier jugador.",
        image_url: "https://images.ygoprodeck.com/images/cards/38033121.jpg"
    },
    7084129: {
        id: 7084129,
        name: "Magician's Rod",
        type: "Effect Monster",
        race: "Spellcaster",
        attribute: "DARK",
        level: 3,
        atk: 1600,
        def: 100,
        archetype: "Dark Magician",
        desc: "Cuando esta carta es Invocada de Modo Normal: puedes añadir a tu mano 1 Mágica/Trampa en tu Deck que mencione 'Dark Magician'.",
        image_url: "https://images.ygoprodeck.com/images/cards/7084129.jpg"
    },
    47222536: {
        id: 47222536,
        name: "Dark Magical Circle",
        type: "Spell Card",
        race: "Continuous",
        attribute: "SPELL",
        level: 0,
        atk: null,
        def: null,
        archetype: "Dark Magician",
        desc: "Cuando esta carta es activada: mira las 3 cartas superiores de tu Deck. Si Invocas de Modo Normal o Especial 'Dark Magician': selecciona 1 carta que controle tu adversario; destiérrala.",
        image_url: "https://images.ygoprodeck.com/images/cards/47222536.jpg"
    },
    7922915: {
        id: 7922915,
        name: "Magician Navigation",
        type: "Trap Card",
        race: "Normal",
        attribute: "TRAP",
        level: 0,
        atk: null,
        def: null,
        archetype: "Dark Magician",
        desc: "Invoca de Modo Especial 1 'Dark Magician' desde tu mano, y luego Invoca de Modo Especial 1 monstruo Lanzador de Conjuros de Nivel 7 o menor desde tu Deck.",
        image_url: "https://images.ygoprodeck.com/images/cards/7922915.jpg"
    },
    62279055: {
        id: 62279055,
        name: "Magic Cylinder",
        type: "Trap Card",
        race: "Normal",
        attribute: "TRAP",
        level: 0,
        atk: null,
        def: null,
        archetype: null,
        desc: "Cuando un monstruo de tu adversario declara un ataque: selecciona el monstruo atacante; niega el ataque y, si lo haces, inflige daño a tu adversario igual a su ATK.",
        image_url: "https://images.ygoprodeck.com/images/cards/62279055.jpg"
    },
    14558127: {
        id: 14558127,
        name: "Ash Blossom & Joyous Spring",
        type: "Tuner Monster",
        race: "Zombie",
        attribute: "FIRE",
        level: 3,
        atk: 0,
        def: 1800,
        archetype: null,
        desc: "Cuando es activada una carta o efecto que incluye un efecto para añadir una carta del Deck a la mano: puedes descartar esta carta; niega ese efecto.",
        image_url: "https://images.ygoprodeck.com/images/cards/14558127.jpg"
    },
    23434538: {
        id: 23434538,
        name: "Maxx \"C\"",
        type: "Effect Monster",
        race: "Insect",
        attribute: "EARTH",
        level: 2,
        atk: 500,
        def: 200,
        archetype: null,
        desc: "Durante el turno de cualquier jugador: puedes mandar esta carta al Cementerio; cada vez que tu adversario Invoque un monstruo de Modo Especial, roba 1 carta.",
        image_url: "https://images.ygoprodeck.com/images/cards/23434538.jpg"
    },
    41420027: {
        id: 41420027,
        name: "Solemn Judgment",
        type: "Trap Card",
        race: "Counter",
        attribute: "TRAP",
        level: 0,
        atk: null,
        def: null,
        archetype: "Solemn",
        desc: "Paga la mitad de tus LP; niega una Invocación o la activación de una Mágica/Trampa y destrúyela.",
        image_url: "https://images.ygoprodeck.com/images/cards/41420027.jpg"
    },
    23995346: {
        id: 23995346,
        name: "Blue-Eyes Ultimate Dragon",
        type: "Fusion Monster",
        race: "Dragon",
        attribute: "LIGHT",
        level: 12,
        atk: 4500,
        def: 3800,
        archetype: "Blue-Eyes",
        desc: "\"Blue-Eyes White Dragon\" + \"Blue-Eyes White Dragon\" + \"Blue-Eyes White Dragon\"",
        image_url: "https://images.ygoprodeck.com/images/cards/23995346.jpg"
    },
    98502113: {
        id: 98502113,
        name: "Dark Paladin",
        type: "Fusion Monster",
        race: "Spellcaster",
        attribute: "DARK",
        level: 8,
        atk: 2900,
        def: 2400,
        archetype: "Dark Magician",
        desc: "\"Dark Magician\" + \"Buster Blader\". Debe ser Invocado por Fusión. Gana 500 ATK por cada monstruo Dragón en el Campo o en cualquier Cementerio.",
        image_url: "https://images.ygoprodeck.com/images/cards/98502113.jpg"
    },
    45231177: {
        id: 45231177,
        name: "Flame Swordsman",
        type: "Fusion Monster",
        race: "Warrior",
        attribute: "FIRE",
        level: 5,
        atk: 1800,
        def: 1600,
        archetype: null,
        desc: "\"Flame Manipulator\" + \"Masaki the Legendary Swordsman\"",
        image_url: "https://images.ygoprodeck.com/images/cards/45231177.jpg"
    },
    63519819: {
        id: 63519819,
        name: "Thousand-Eyes Restrict",
        type: "Fusion Monster",
        race: "Spellcaster",
        attribute: "DARK",
        level: 1,
        atk: 0,
        def: 0,
        archetype: "Eyes Restrict",
        desc: "\"Relinquished\" + \"Thousand-Eyes Idol\". Otros monstruos en el campo no pueden cambiar sus posiciones de batalla o atacar.",
        image_url: "https://images.ygoprodeck.com/images/cards/63519819.jpg"
    },
    11901678: {
        id: 11901678,
        name: "B. Skull Dragon",
        type: "Fusion Monster",
        race: "Dragon",
        attribute: "DARK",
        level: 9,
        atk: 3200,
        def: 2500,
        archetype: "Red-Eyes",
        desc: "\"Summoned Skull\" + \"Red-Eyes Black Dragon\"",
        image_url: "https://images.ygoprodeck.com/images/cards/11901678.jpg"
    },
    66889139: {
        id: 66889139,
        name: "Gaia the Dragon Champion",
        type: "Fusion Monster",
        race: "Dragon",
        attribute: "WIND",
        level: 7,
        atk: 2600,
        def: 2100,
        archetype: "Gaia The Fierce Knight",
        desc: "\"Gaia The Fierce Knight\" + \"Curse of Dragon\"",
        image_url: "https://images.ygoprodeck.com/images/cards/66889139.jpg"
    },
    1546123: {
        id: 1546123,
        name: "Cyber End Dragon",
        type: "Fusion Monster",
        race: "Machine",
        attribute: "LIGHT",
        level: 10,
        atk: 4000,
        def: 2800,
        archetype: "Cyber Dragon",
        desc: "\"Cyber Dragon\" + \"Cyber Dragon\" + \"Cyber Dragon\". Durante una batalla contra un monstruo en Posición de Defensa, inflige daño de batalla penetrante.",
        image_url: "https://images.ygoprodeck.com/images/cards/1546123.jpg"
    },
    35809262: {
        id: 35809262,
        name: "Elemental HERO Flame Wingman",
        type: "Fusion Monster",
        race: "Warrior",
        attribute: "WIND",
        level: 6,
        atk: 2100,
        def: 1200,
        archetype: "Elemental HERO",
        desc: "\"Elemental HERO Avian\" + \"Elemental HERO Burstinatrix\". Debe ser Invocado por Fusión. Cuando esta carta destruye un monstruo en batalla y lo manda al Cementerio: inflige daño a tu adversario igual al ATK de ese monstruo.",
        image_url: "https://images.ygoprodeck.com/images/cards/35809262.jpg"
    },
    25366484: {
        id: 25366484,
        name: "Elemental HERO Shining Flare Wingman",
        type: "Fusion Monster",
        race: "Warrior",
        attribute: "LIGHT",
        level: 8,
        atk: 2500,
        def: 2100,
        archetype: "Elemental HERO",
        desc: "\"Elemental HERO Flame Wingman\" + \"Elemental HERO Sparkman\". Debe ser Invocado por Fusión. Gana 300 ATK por cada carta \"Elemental HERO\" en tu Cementerio.",
        image_url: "https://images.ygoprodeck.com/images/cards/25366484.jpg"
    },
    99267150: {
        id: 99267150,
        name: "Five-Headed Dragon",
        type: "Fusion Monster",
        race: "Dragon",
        attribute: "DARK",
        level: 12,
        atk: 5000,
        def: 5000,
        archetype: null,
        desc: "5 monstruos Dragón. Debe ser Invocado por Fusión. No puede ser destruido en batalla con monstruos de OSCURIDAD, TIERRA, AGUA, FUEGO o VIENTO.",
        image_url: "https://images.ygoprodeck.com/images/cards/99267150.jpg"
    },
    4796100: {
        id: 4796100,
        name: "Chimera the Flying Mythical Beast",
        type: "Fusion Monster",
        race: "Beast",
        attribute: "WIND",
        level: 6,
        atk: 2100,
        def: 1800,
        archetype: null,
        desc: "\"Gazelle the King of Mythical Beasts\" + \"Berfomet\".",
        image_url: "https://images.ygoprodeck.com/images/cards/4796100.jpg"
    },
    62873545: {
        id: 62873545,
        name: "Dragon Master Knight",
        type: "Fusion Monster",
        race: "Dragon",
        attribute: "LIGHT",
        level: 12,
        atk: 5000,
        def: 5000,
        archetype: "Blue-Eyes",
        desc: "\"Black Luster Soldier\" + \"Blue-Eyes Ultimate Dragon\". Debe ser Invocado por Fusión. Esta carta gana 500 ATK por cada monstruo Dragón que controles excepto esta carta.",
        image_url: "https://images.ygoprodeck.com/images/cards/62873545.jpg"
    },
    13722870: {
        id: 13722870,
        name: "Dark Flare Knight",
        type: "Fusion Monster",
        race: "Warrior",
        attribute: "DARK",
        level: 6,
        atk: 2200,
        def: 800,
        archetype: null,
        desc: "\"Dark Magician\" + \"Flame Swordsman\". Cualquier daño de batalla que reciba el controlador de esta carta en batallas que involucren a esta carta se convierte en 0.",
        image_url: "https://images.ygoprodeck.com/images/cards/13722870.jpg"
    },
    3366982: {
        id: 3366982,
        name: "Alligator's Sword Dragon",
        type: "Fusion Monster",
        race: "Dragon",
        attribute: "WIND",
        level: 5,
        atk: 1700,
        def: 1500,
        archetype: null,
        desc: "\"Baby Dragon\" + \"Alligator's Sword\". Puede atacar directamente si el oponente solo controla monstruos de TIERRA, AGUA o FUEGO.",
        image_url: "https://images.ygoprodeck.com/images/cards/3366982.jpg"
    },
    44508094: {
        id: 44508094,
        name: "Stardust Dragon",
        type: "Synchro Monster",
        race: "Dragon",
        attribute: "WIND",
        level: 8,
        atk: 2500,
        def: 2000,
        archetype: "Stardust",
        desc: "1 Cantante + 1+ monstruos no Cantantes. Cuando es activada una carta o efecto que fuera a destruir una o más cartas en el Campo (Efecto Rápido): puedes Sacrificar esta carta; niega la activación y, si lo haces, destrúyela.",
        image_url: "https://images.ygoprodeck.com/images/cards/44508094.jpg"
    },
    70902743: {
        id: 70902743,
        name: "Red Dragon Archfiend",
        type: "Synchro Monster",
        race: "Dragon",
        attribute: "DARK",
        level: 8,
        atk: 3000,
        def: 2000,
        archetype: "Archfiend",
        desc: "1 Cantante + 1+ monstruos no Cantantes. Después del cálculo de daño, si esta carta ataca a un monstruo en Posición de Defensa de tu adversario: destruye todos los monstruos en Posición de Defensa de tu adversario.",
        image_url: "https://images.ygoprodeck.com/images/cards/70902743.jpg"
    },
    74586817: {
        id: 74586817,
        name: "PSY-Framelord Omega",
        type: "Synchro Monster",
        race: "Psychic",
        attribute: "LIGHT",
        level: 8,
        atk: 2800,
        def: 2200,
        archetype: "PSY-Frame",
        desc: "1 Cantante + 1+ monstruos no Cantantes. Una vez por turno, durante la Main Phase (Efecto Rápido): puedes desterrar tanto esta carta boca arriba en el Campo como 1 carta al azar de la mano de tu adversario, boca arriba, hasta tu próxima Standby Phase.",
        image_url: "https://images.ygoprodeck.com/images/cards/74586817.jpg"
    },
    84013237: {
        id: 84013237,
        name: "Number 39: Utopia",
        type: "XYZ Monster",
        race: "Warrior",
        attribute: "LIGHT",
        level: 4,
        atk: 2500,
        def: 2000,
        archetype: "Utopia",
        desc: "2 monstruos de Nivel 4. Cuando un monstruo declara un ataque: puedes desacoplar 1 material de esta carta; niega el ataque.",
        image_url: "https://images.ygoprodeck.com/images/cards/84013237.jpg"
    },
    1861629: {
        id: 1861629,
        name: "Decode Talker",
        type: "Link Monster",
        race: "Cyberse",
        attribute: "DARK",
        level: 3,
        atk: 2300,
        def: null,
        archetype: "Code Talker",
        desc: "2+ Monstruos de Efecto. Gana 500 ATK por cada monstruo al que apunte.",
        image_url: "https://images.ygoprodeck.com/images/cards/1861629.jpg"
    },
    41999284: {
        id: 41999284,
        name: "Linkuriboh",
        type: "Link Monster",
        race: "Cyberse",
        attribute: "DARK",
        level: 1,
        atk: 300,
        def: null,
        archetype: "Kuriboh",
        desc: "1 Monstruo de Nivel 1. Cuando un monstruo de tu adversario declara un ataque: puedes Sacrificar esta carta; cambia el ATK de ese monstruo del adversario a 0 hasta el final de este turno.",
        image_url: "https://images.ygoprodeck.com/images/cards/41999284.jpg"
    },
    // --- CARTAS DECK INICIAL PARA NUEVOS JUGADORES Y NPC NIVEL 1 ---
    32274490: { id: 32274490, name: "Skull Servant", type: "Normal Monster", race: "Zombie", attribute: "DARK", level: 1, atk: 300, def: 200, desc: "A skeleton monster that can be found almost anywhere.", image_url: "https://images.ygoprodeck.com/images/cards/32274490.jpg" },
    76103675: { id: 76103675, name: "Sparks", type: "Spell Card", race: "Normal", attribute: "SPELL", level: 0, atk: null, def: null, desc: "Inflicts 200 points of damage to your opponent's Life Points.", image_url: "https://images.ygoprodeck.com/images/cards/76103675.jpg" },
    80813021: { id: 80813021, name: "Torike", type: "Normal Monster", race: "Beast", attribute: "EARTH", level: 3, atk: 1200, def: 600, desc: "Small monster that charges with its horn.", image_url: "https://images.ygoprodeck.com/images/cards/80813021.jpg" },
    53293545: { id: 53293545, name: "Firegrass", type: "Normal Monster", race: "Plant", attribute: "EARTH", level: 2, atk: 700, def: 600, desc: "A fire-breathing plant.", image_url: "https://images.ygoprodeck.com/images/cards/53293545.jpg" },
    89091579: { id: 89091579, name: "Basic Insect", type: "Normal Monster", race: "Insect", attribute: "EARTH", level: 2, atk: 500, def: 700, desc: "Usually found in bushes, weak individually.", image_url: "https://images.ygoprodeck.com/images/cards/89091579.jpg" },
    44511922: { id: 44511922, name: "Monster Egg", type: "Normal Monster", race: "Warrior", attribute: "EARTH", level: 3, atk: 600, def: 900, desc: "A warrior hidden inside an eggshell.", image_url: "https://images.ygoprodeck.com/images/cards/44511922.jpg" },
    61854111: { id: 61854111, name: "Silver Fang", type: "Normal Monster", race: "Beast", attribute: "EARTH", level: 3, atk: 1200, def: 800, desc: "A snow-white wolf.", image_url: "https://images.ygoprodeck.com/images/cards/61854111.jpg" },
    53186394: { id: 53186394, name: "Hitotsu-Me Giant", type: "Normal Monster", race: "Beast-Warrior", attribute: "EARTH", level: 4, atk: 1200, def: 1000, desc: "A one-eyed giant.", image_url: "https://images.ygoprodeck.com/images/cards/53186394.jpg" },
    32452818: { id: 32452818, name: "Beaver Warrior", type: "Normal Monster", race: "Beast-Warrior", attribute: "EARTH", level: 4, atk: 1200, def: 1500, desc: "Small creature with high defense.", image_url: "https://images.ygoprodeck.com/images/cards/32452818.jpg" },
    12130383: { id: 12130383, name: "Shamros", type: "Normal Monster", race: "Beast", attribute: "EARTH", level: 2, atk: 500, def: 600, desc: "A small creature that attacks in packs.", image_url: "https://images.ygoprodeck.com/images/cards/12130383.jpg" },
    23153713: { id: 23153713, name: "Tomozaurus", type: "Normal Monster", race: "Dinosaur", attribute: "EARTH", level: 2, atk: 500, def: 400, desc: "Small dinosaur.", image_url: "https://images.ygoprodeck.com/images/cards/23153713.jpg" },
    57305373: { id: 57305373, name: "Two-Mouth Darkruler", type: "Normal Monster", race: "Dinosaur", attribute: "EARTH", level: 3, atk: 900, def: 700, desc: "A dinosaur with two mouths.", image_url: "https://images.ygoprodeck.com/images/cards/57305373.jpg" },
    75356564: { id: 75356564, name: "Petit Dragon", type: "Normal Monster", race: "Dragon", attribute: "WIND", level: 2, atk: 600, def: 700, desc: "A small dragon with fire breath.", image_url: "https://images.ygoprodeck.com/images/cards/75356564.jpg" },
    56260110: { id: 56260110, name: "Hard Armor", type: "Normal Monster", race: "Warrior", attribute: "EARTH", level: 3, atk: 300, def: 1200, desc: "A living armor.", image_url: "https://images.ygoprodeck.com/images/cards/56260110.jpg" },
    30113682: { id: 30113682, name: "Sonic Maid", type: "Normal Monster", race: "Warrior", attribute: "EARTH", level: 3, atk: 1200, def: 900, desc: "A maiden whose song breaks sound barriers.", image_url: "https://images.ygoprodeck.com/images/cards/30113682.jpg" },
    26414145: { id: 26414145, name: "Kurama", type: "Normal Monster", race: "Winged Beast", attribute: "WIND", level: 3, atk: 800, def: 800, desc: "A bird with razor-sharp claws.", image_url: "https://images.ygoprodeck.com/images/cards/26414145.jpg" },
    56784842: { id: 56784842, name: "Tyhone", type: "Normal Monster", race: "Winged Beast", attribute: "WIND", level: 4, atk: 1200, def: 1400, desc: "A monstrous bird.", image_url: "https://images.ygoprodeck.com/images/cards/56784842.jpg" },
    65240321: { id: 65240321, name: "Dark King of the Abyss", type: "Normal Monster", race: "Fiend", attribute: "DARK", level: 3, atk: 1200, def: 800, desc: "It rules the underworld.", image_url: "https://images.ygoprodeck.com/images/cards/65240321.jpg" },
    15480588: { id: 15480588, name: "Fiend Reflection #2", type: "Normal Monster", race: "Winged Beast", attribute: "LIGHT", level: 4, atk: 1100, def: 1400, desc: "A bird monster that summons illusions.", image_url: "https://images.ygoprodeck.com/images/cards/15480588.jpg" },
    17535588: { id: 17535588, name: "Armored Starfish", type: "Normal Monster", race: "Aqua", attribute: "WATER", level: 4, atk: 850, def: 1400, desc: "A starfish with a solid armor shell.", image_url: "https://images.ygoprodeck.com/images/cards/17535588.jpg" },
    86318356: { id: 86318356, name: "Aqua Madoor", type: "Normal Monster", race: "Spellcaster", attribute: "WATER", level: 4, atk: 1200, def: 2000, desc: "A wizard that controls water.", image_url: "https://images.ygoprodeck.com/images/cards/86318356.jpg" },
    52252775: { id: 52252775, name: "Wicked Dragon with the Ersatz Head", type: "Normal Monster", race: "Dragon", attribute: "WIND", level: 3, atk: 900, def: 900, desc: "A two-headed dragon.", image_url: "https://images.ygoprodeck.com/images/cards/52252775.jpg" },
    94773007: { id: 94773007, name: "Hinotama Soul", type: "Normal Monster", race: "Pyro", attribute: "FIRE", level: 2, atk: 600, def: 500, desc: "An intensely burning soul of flame.", image_url: "https://images.ygoprodeck.com/images/cards/94773007.jpg" },
    13599884: { id: 13599884, name: "Steel Scorpion", type: "Normal Monster", race: "Insect", attribute: "EARTH", level: 1, atk: 250, def: 300, desc: "A scorpion made of steel.", image_url: "https://images.ygoprodeck.com/images/cards/13599884.jpg" },
    80770678: { id: 80770678, name: "Spirit of the Harp", type: "Normal Monster", race: "Fairy", attribute: "LIGHT", level: 4, atk: 800, def: 2000, desc: "A spirit that plays a soothing harp.", image_url: "https://images.ygoprodeck.com/images/cards/80770678.jpg" },
    43500484: { id: 43500484, name: "Dark World Thorns", type: "Normal Monster", race: "Plant", attribute: "EARTH", level: 3, atk: 1200, def: 900, desc: "Thorny vines.", image_url: "https://images.ygoprodeck.com/images/cards/43500484.jpg" },
    48512411: { id: 48512411, name: "Drooling Lizard", type: "Normal Monster", race: "Reptile", attribute: "EARTH", level: 3, atk: 900, def: 800, desc: "A lizard whose saliva melts armor.", image_url: "https://images.ygoprodeck.com/images/cards/48512411.jpg" },
    23424603: { id: 23424603, name: "Meda Bat", type: "Normal Monster", race: "Fiend", attribute: "DARK", level: 2, atk: 800, def: 400, desc: "An explosive bat.", image_url: "https://images.ygoprodeck.com/images/cards/23424603.jpg" },
    12040182: { id: 12040182, name: "Final Flame", type: "Spell Card", race: "Normal", attribute: "SPELL", level: 0, atk: null, def: null, desc: "Inflicts 600 points of damage to your opponent's Life Points.", image_url: "https://images.ygoprodeck.com/images/cards/12040182.jpg" },
    46130346: { id: 46130346, name: "Hinotama", type: "Spell Card", race: "Normal", attribute: "SPELL", level: 0, atk: null, def: null, desc: "Inflicts 500 points of damage to your opponent's Life Points.", image_url: "https://images.ygoprodeck.com/images/cards/46130346.jpg" },
    63102017: { id: 63102017, name: "Stop Defense", type: "Spell Card", race: "Normal", attribute: "SPELL", level: 0, atk: null, def: null, desc: "Changes an opponent's monster to Attack Position.", image_url: "https://images.ygoprodeck.com/images/cards/63102017.jpg" },
    95638658: { id: 95638658, name: "Remove Trap", type: "Spell Card", race: "Normal", attribute: "SPELL", level: 0, atk: null, def: null, desc: "Destroys a face-up trap card.", image_url: "https://images.ygoprodeck.com/images/cards/95638658.jpg" },
    50045229: { id: 50045229, name: "Dragon Capture Jar", type: "Trap Card", race: "Continuous", attribute: "TRAP", level: 0, atk: null, def: null, desc: "Changes all Dragon-Type monsters to Defense Position.", image_url: "https://images.ygoprodeck.com/images/cards/50045229.jpg" }
};

// Cargar cartas locales en caché garantizando estandarización total de id, card_id e imagen local
Object.keys(LOCAL_CARDS).forEach(key => {
    const numericId = parseInt(key, 10);
    const card = LOCAL_CARDS[key];
    card.id = numericId;
    card.card_id = numericId;
    card.image_url = `../../../assets/images/cards/${numericId}.jpg`;
    cardCache.set(numericId, card);
});

/**
 * Función Asíncrona para Obtener Datos Reales de Carta SINCRONIZADA
 */
async function fetchCardData(cardId) {
    const id = parseInt(cardId, 10);
    if (isNaN(id) || !id) return null;

    if (cardCache.has(id)) {
        const cached = cardCache.get(id);
        cached.id = id;
        cached.card_id = id;
        cached.image_url = `../../../assets/images/cards/${id}.jpg`;
        return cached;
    }

    try {
        const response = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?id=${id}`);
        if (response.ok) {
            const data = await response.json();
            if (data.data && data.data.length > 0) {
                const c = data.data[0];
                const cardObj = {
                    id: id,
                    card_id: id,
                    name: c.name,
                    type: c.type,
                    race: c.race || 'Carta',
                    attribute: c.attribute || (c.type.includes('Spell') ? 'SPELL' : 'TRAP'),
                    level: c.level || c.rank || 0,
                    atk: c.atk !== undefined ? c.atk : null,
                    def: c.def !== undefined ? c.def : null,
                    archetype: c.archetype || null,
                    desc: c.desc || 'Sin descripción disponible.',
                    image_url: `../../../assets/images/cards/${id}.jpg`
                };
                cardCache.set(id, cardObj);
                return cardObj;
            }
        }
    } catch (err) {
        console.error(`[API YGO] Consulta remota fallida para #${id}, usando respaldo local.`);
    }

    const base = LOCAL_CARDS[id] || {
        id: id,
        card_id: id,
        name: `Carta #${id}`,
        type: "Normal Monster",
        race: "Warrior",
        attribute: "EARTH",
        level: 4,
        atk: 1000,
        def: 1000,
        archetype: "General",
        desc: `Datos registrados para el ID ${id}.`,
        image_url: `../../../assets/images/cards/${id}.jpg`
    };

    base.id = id;
    base.card_id = id;
    base.image_url = `../../../assets/images/cards/${id}.jpg`;
    cardCache.set(id, base);
    return base;
}



module.exports = {
    LOCAL_CARDS,
    cardCache,
    fetchCardData
};
