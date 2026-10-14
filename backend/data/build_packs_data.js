const fs = require('fs');
const path = require('path');

// Cargar todas las expansiones
const loadJson = (filename) => {
    try {
        return JSON.parse(fs.readFileSync(path.join(__dirname, filename), 'utf-8'));
    } catch(e) {
        console.warn(`[WARN] Could not load ${filename}:`, e.message);
        return [];
    }
};

const lobCards = loadJson('lob_cards_frontend.json');
const mrdCards = loadJson('mrd_cards_frontend.json');
const mrlCards = loadJson('mrl_cards_frontend.json');
const psvCards = loadJson('psv_cards_frontend.json');
const lonCards = loadJson('lon_cards_frontend.json');
const lodCards = loadJson('lod_cards_frontend.json');
const pgdCards = loadJson('pgd_cards_frontend.json');
const mfcCards = loadJson('mfc_cards_frontend.json');
const dcrCards = loadJson('dcr_cards_frontend.json');
const iocCards = loadJson('ioc_cards_frontend.json');
const astCards = loadJson('ast_cards_frontend.json');

const promoDmCards = loadJson('promo_dm_cards_frontend.json');
const godsCards = loadJson('gods_cards_frontend.json');
const drlgCards = loadJson('drlg_cards_frontend.json');

const tlmCards = loadJson('tlm_cards_frontend.json');
const crvCards = loadJson('crv_cards_frontend.json');
const eenCards = loadJson('een_cards_frontend.json');
const soiCards = loadJson('soi_cards_frontend.json');
const eojCards = loadJson('eoj_cards_frontend.json');
const potdCards = loadJson('potd_cards_frontend.json');
const cdipCards = loadJson('cdip_cards_frontend.json');
const stonCards = loadJson('ston_cards_frontend.json');
const fotbCards = loadJson('fotb_cards_frontend.json');
const taevCards = loadJson('taev_cards_frontend.json');
const glasCards = loadJson('glas_cards_frontend.json');
const ptdnCards = loadJson('ptdn_cards_frontend.json');
const lodtCards = loadJson('lodt_cards_frontend.json');

const tdgsCards = loadJson('tdgs_cards_frontend.json');
const csocCards = loadJson('csoc_cards_frontend.json');
const crmsCards = loadJson('crms_cards_frontend.json');
const rgbtCards = loadJson('rgbt_cards_frontend.json');
const anprCards = loadJson('anpr_cards_frontend.json');
const sovrCards = loadJson('sovr_cards_frontend.json');
const abpfCards = loadJson('abpf_cards_frontend.json');
const tshdCards = loadJson('tshd_cards_frontend.json');
const drevCards = loadJson('drev_cards_frontend.json');
const stblCards = loadJson('stbl_cards_frontend.json');
const storCards = loadJson('stor_cards_frontend.json');
const exvcCards = loadJson('exvc_cards_frontend.json');

const INITIAL_PACKS = [
    // --- 🏛️ DUEL MONSTERS (DM) ---
    {
        id: 'LOB',
        name: 'Legend of Blue Eyes White Dragon',
        code: 'LOB',
        series: 'DM',
        active: true,
        visible: true,
        price: 500,
        offer_text: 'POPULAR 🔥',
        image: '../../assets/images/cards/89631139.jpg',
        description: 'La primera expansión legendaria de Yu-Gi-Oh! Contiene el Dragón Blanco de Ojos Azules, Mago Oscuro, las 5 piezas de Exodia, Raigeki, Monstruo Renacido y más.',
        cards_per_pack: 3,
        cards: lobCards
    },
    {
        id: 'MRD',
        name: 'Predadores Metálicos (Metal Raiders)',
        code: 'MRD',
        series: 'DM',
        active: true,
        visible: true,
        price: 1000,
        offer_text: 'EXPANSIÓN TRAMPAS',
        image: '../../assets/images/cards/25833572.jpg',
        description: 'Segunda expansión oficial OCG: Predadores Metálicos. Contiene Guardián de la Puerta, B. Skull Dragon, Suijin, Kazejin, Sanga del Trueno, Fuerza de Espejo, Juicio Solemne, Kuriboh, Sangan y más.',
        cards_per_pack: 3,
        cards: mrdCards
    },
    {
        id: 'MRL',
        name: 'Spell Ruler (Magic Ruler)',
        code: 'MRL',
        series: 'DM',
        active: true,
        visible: true,
        price: 1500,
        offer_text: 'EDICIÓN RITUAL Y TOON',
        image: '../../assets/images/cards/64631466.jpg',
        description: 'Tercera expansión oficial OCG: Magic Ruler. Contiene Renunciado (Relinquished), Dragón Toon de Ojos Azules, Mundo Toon, Tifón del Espacio Místico, Robo Oportunista, Dúo de Delincuentes, Hacha de la Desesperación, Elección Dolorosa y más.',
        cards_per_pack: 3,
        cards: mrlCards
    },
    {
        id: 'PSV',
        name: "Servidor del Faraón (Pharaoh's Servant)",
        code: 'PSV',
        series: 'DM',
        active: true,
        visible: true,
        price: 2000,
        offer_text: 'SECRETO FARAÓN',
        image: '../../assets/images/cards/77585513.jpg',
        description: "Cuarta expansión oficial OCG: Pharaoh's Servant. Introduce a Jinzo, Buster Blader, Llamada de los Condenados, Entierro Prematuro, Orden Imperial, Fuerza de Ataque de los Goblins, Límite de los Mil Ojos, Parásito Parácido y más.",
        cards_per_pack: 3,
        cards: psvCards
    },
    {
        id: 'LON',
        name: 'Laberinto de Pesadillas (Labyrinth of Nightmare)',
        code: 'LON',
        series: 'DM',
        active: true,
        visible: true,
        price: 2500,
        offer_text: 'EDICIÓN PESADILLA',
        image: '../../assets/images/cards/69140098.jpg',
        description: 'Quinta expansión oficial OCG: Labyrinth of Nightmare. Introduce a Elfo Géminis, Cilindro Mágico, Tributo Torrencial, La Bestia Enmascarada, Necrofear Oscura, Tablero del Destino, El Último Guerrero de Otro Planeta, Gelatina Reanimada y más.',
        cards_per_pack: 3,
        cards: lonCards
    },
    {
        id: 'LOD',
        name: 'El Legado de la Oscuridad (Legacy of Darkness)',
        code: 'LOD',
        series: 'DM',
        active: true,
        visible: true,
        price: 3000,
        offer_text: 'ERA SPIRIT & DRAGÓN',
        image: '../../assets/images/cards/3078576.jpg',
        description: 'Sexta expansión oficial OCG: Legacy of Darkness. Introduce a Yata-Garasu, Ha Des el Gobernante Oscuro, Dragón Tirano, Capitán Merodeador, Inyección de Hada Lily, Jarra de Fibra, Refuerzo de la Armada y Agujero Trampa Sin Fondo.',
        cards_per_pack: 3,
        cards: lodCards
    },
    {
        id: 'PGD',
        name: 'Guardián Faraónico (Pharaonic Guardian)',
        code: 'PGD',
        series: 'DM',
        active: true,
        visible: true,
        price: 3500,
        offer_text: 'ARQUETIPO FARAÓN',
        image: '../../assets/images/cards/83555666.jpg',
        description: 'Séptima expansión oficial OCG: Pharaonic Guardian. Introduce el temible Anillo de Destrucción, el arquetipo Cuidador de Tumbas (Gravekeeper), Valle de Necro, Don Zaloog, Libro de la Luna, Señor de los Vampiros, Espíritu Segador y Metamorfosis.',
        cards_per_pack: 3,
        cards: pgdCards
    },
    {
        id: 'MFC',
        name: "Magician's Force (Fuerza del Mago)",
        code: 'MFC',
        series: 'DM',
        active: true,
        visible: true,
        price: 4000,
        offer_text: 'MAGIA Y HECHICEROS',
        image: '../../assets/images/cards/38033121.jpg',
        description: "Octava expansión oficial OCG: Magician's Force. Introduce a la Chica Maga Oscura (Dark Magician Girl), Breaker el Guerrero Mágico, Paladín Oscuro, Ola Difusora, Mago del Caos y monstruos Unión.",
        cards_per_pack: 3,
        cards: mfcCards
    },
    {
        id: 'DCR',
        name: 'Crisis Oscura (Dark Crisis)',
        code: 'DCR',
        series: 'DM',
        active: true,
        visible: true,
        price: 4500,
        offer_text: 'ARQUETIPO ARCHFIEND',
        image: '../../assets/images/cards/88494661.jpg',
        description: 'Novena expansión oficial OCG: Dark Crisis. Introduce a los Archfiends del Ajedrez (Skull Archfiend of Lightning, Terrorking Archfiend), Shinato Rey de un Plano Superior, Guardián Celta Reentrenado, Ojama Trío, Vampire Lord y Juicio de Anubis.',
        cards_per_pack: 3,
        cards: dcrCards
    },
    {
        id: 'IOC',
        name: 'Invasión del Caos (Invasion of Chaos)',
        code: 'IOC',
        series: 'DM',
        active: true,
        visible: true,
        price: 5000,
        offer_text: 'EDICIÓN CAOS',
        image: '../../assets/images/cards/82301904.jpg',
        description: 'Décima expansión oficial OCG: Invasion of Chaos. Introduce a los colosos definitivos del Caos: Dragón Emperador del Caos - Enviado del Fin, Soldado del Brillo Negro - Enviado del Principio, Mago Oscuro del Caos, Hechicero del Caos, Levia-Dragón - Dédalo y Fusión de Dimensiones.',
        cards_per_pack: 3,
        cards: iocCards
    },
    {
        id: 'AST',
        name: 'Santuario Antiguo (Ancient Sanctuary)',
        code: 'AST',
        series: 'DM',
        active: true,
        visible: true,
        price: 5500,
        offer_text: 'EDICIÓN SANTUARIO',
        image: '../../assets/images/cards/56433456.jpg',
        description: 'Undécima expansión oficial OCG: Ancient Sanctuary. Culminación de la era Duel Monsters. Introduce a Zaborg el Monarca del Trueno, El Santuario en el Cielo, Agente de la Creación - Venus, Rey del Pantano, El Fin de Anubis y Dragón Blowback.',
        cards_per_pack: 3,
        cards: astCards
    },

    // --- ⭐ EDICIONES ESPECIALES DE EVENTOS ---
    {
        id: 'PROMO-DM',
        name: 'Promocionales Legendarios Duel Monsters',
        code: 'PROMO-DM',
        series: 'EVENT',
        active: true,
        visible: true,
        price: 6000,
        offer_text: 'EVENTO EXCLUSIVO ⭐',
        image: '../../assets/images/cards/10000000.jpg',
        description: 'Colección de cartas icónicas promocionales de eventos y videojuegos legendarios. Incluye a Slifer el Dragón del Cielo, Obelisco el Atormentador, El Dragón Alado de Ra, Mago Oscuro Arkana, Buster Blader alterno y cartas de colección.',
        cards_per_pack: 3,
        cards: promoDmCards
    },
    {
        id: 'GODS-EGY',
        name: 'Dioses Egipcios: El Poder de los Faraones',
        code: 'GODS-EGY',
        series: 'EVENT',
        active: true,
        visible: true,
        price: 15000,
        offer_text: 'DIOSES EGIPCIOS ⚡',
        image: '../../assets/images/cards/10000010.jpg',
        description: 'Edición Divina Oficial que contiene las tres cartas reglamentarias de los Dioses Egipcios (Slifer, Obelisk y Ra) con sus textos de efecto legal, soporte de los Dioses (God Hand Crusher, Thunderforce Attack, Blaze Cannon) y cartas divinas.',
        cards_per_pack: 3,
        cards: godsCards
    },
    {
        id: 'DRLG',
        name: 'Dragones de Leyenda (Dragons of Legend)',
        code: 'DRLG',
        series: 'EVENT',
        active: true,
        visible: true,
        price: 7000,
        offer_text: 'LEGENDARIOS 🐉🔥',
        image: '../../assets/images/cards/10000050.jpg',
        description: '¡Los Tres Dragones Legendarios de la Atlántida y el poder de los Caballeros Legendarios! Contiene El Ojo de Timaeus, La Garra de Hermos, El Colmillo de Critias, Timaeus el Caballero Legendario, Hermos, Critias, Dragón Amuleto, Mago Oscuro Chica Jinete de Dragón, Guardián Eatos y El Sello de Oricalcos.',
        cards_per_pack: 3,
        cards: drlgCards
    },

    // --- 🎓 YU-GI-OH! GX ---
    {
        id: 'TLM',
        name: 'El Milenio Perdido (The Lost Millennium)',
        code: 'TLM',
        series: 'GX',
        active: true,
        visible: true,
        price: 6000,
        offer_text: 'DEBUT GX & HÉROES 🎓⚡',
        image: '../../assets/images/cards/25366484.jpg',
        description: '¡El inicio oficial de la era Yu-Gi-Oh! GX y la Academia de Duelos! Contiene a Elemental HERO Flame Wingman, Sparkman, Burstinatrix, Clayman, Avian, Ancient Gear Golem, King of the Skull Servants, Brain Control, Hero Signal y D.D. Survivor.',
        cards_per_pack: 3,
        cards: tlmCards
    },
    {
        id: 'CRV',
        name: 'Revolución Cibernética (Cybernetic Revolution)',
        code: 'CRV',
        series: 'GX',
        active: true,
        visible: true,
        price: 6500,
        offer_text: 'DRAGÓN CIBER & HÉROES ⚙️🐉',
        image: '../../assets/images/cards/70095154.jpg',
        description: '¡La llegada del legendario Cyber Dragon y el poder de Zane Truesdale! Contiene a Cyber Dragon, Cyber Twin Dragon, Cyber End Dragon, Elemental HERO Tempest, Rampart Blaster, Power Bond, Miracle Fusion, Skyscraper y Dimension Wall.',
        cards_per_pack: 3,
        cards: crvCards
    },
    {
        id: 'EEN',
        name: 'Energía Elemental (Elemental Energy)',
        code: 'EEN',
        series: 'GX',
        active: true,
        visible: true,
        price: 7000,
        offer_text: 'HÉROES DEL BRILLO & MUNDO OSCURO ⚡🌑',
        image: '../../assets/images/cards/83965310.jpg',
        description: '¡El debut del terrorífico arquetipo Dark World (Mundo Oscuro) y los Héroes Elementales Supremos de Jaden Yuki! Incluye a Elemental HERO Shining Flare Wingman, Wildedge, Thunder Giant, Sillva, Goldd, Broww, Brron, Pot of Avarice y Ojamagic.',
        cards_per_pack: 3,
        cards: eenCards
    },
    {
        id: 'SOI',
        name: 'Sombra del Infinito (Shadow of Infinity)',
        code: 'SOI',
        series: 'GX',
        active: true,
        visible: true,
        price: 7500,
        offer_text: 'BESTIAS SAGRADAS 👁️',
        image: '../../assets/images/cards/69890967.jpg',
        description: '¡El legendario sobre de las 3 Bestias Sagradas! Despierta a Uria, Señor de las Llamas Abrasadoras, Hamon, Señor del Trueno Golpeador, y Raviel, Señor de los Fantasmas. Incluye a Demise, Rey del Armagedón, Ruin, Reina del Olvido, Treeborn Frog, Cyber Laser Dragon, Cyber Barrier Dragon, Ancient Gear Castle y Karma Cut.',
        cards_per_pack: 3,
        cards: soiCards
    },
    {
        id: 'EOJ',
        name: 'Enemigo de la Justicia (Enemy of Justice)',
        code: 'EOJ',
        series: 'GX',
        active: true,
        visible: true,
        price: 8000,
        offer_text: 'HÉROES DEL DESTINO 🕰️',
        image: '../../assets/images/cards/88820235.jpg',
        description: '¡El debut de los Héroes del Destino (Destiny HERO) y el gran poder de Aster Phoenix! Contiene a Elemental HERO Shining Phoenix Enforcer, Phoenix Enforcer, Destiny HERO Dreadmaster, Diamond Dude, Doom Lord, Clock Tower Prison, el combo H-E-R-O Flash!!, Macro Cosmos, Dimensional Fissure e Icarus Attack.',
        cards_per_pack: 3,
        cards: eojCards
    },
    {
        id: 'POTD',
        name: 'Poder del Duelista (Power of the Duelist)',
        code: 'POTD',
        series: 'GX',
        active: true,
        visible: true,
        price: 8500,
        offer_text: 'CONTACT FUSION 🌌',
        image: '../../assets/images/cards/28677304.jpg',
        description: '¡La llegada de Elemental HERO Neos y las legendarias Fusiones de Contacto del Neoespacio! Incluye a Dark Neos, Flare Neos, Aqua Neos, Chimeratech Overdragon, Overload Fusion, Future Fusion, Destiny HERO Dogma, Dasher, Ultimate Tyranno, Mausoleum of the Emperor y los Alienígenas.',
        cards_per_pack: 3,
        cards: potdCards
    },
    {
        id: 'CDIP',
        name: 'Impacto Ciberoscuro (Cyberdark Impact)',
        code: 'CDIP',
        series: 'GX',
        active: true,
        visible: true,
        price: 9000,
        offer_text: 'DRAGÓN CIBEROSCURO 🐉🌑',
        image: '../../assets/images/cards/40418351.jpg',
        description: "¡El temible poder de los Dragones Ciberoscuros de Zane Truesdale! Incluye a Cyberdark Dragon, Cyberdark Horn, Cyberdark Edge, Cyberdark Keel, Snipe Hunter, Vanity's Fiend, Vanity's Ruler, las 6 Estatuas Barrera (Barrier Statues), Instant Fusion, Cyberdark Impact! y Senet Switch.",
        cards_per_pack: 3,
        cards: cdipCards
    },
    {
        id: 'STON',
        name: 'Golpe de Neos (Strike of Neos)',
        code: 'STON',
        series: 'GX',
        active: true,
        visible: true,
        price: 9500,
        offer_text: 'GOLPE DEL NEOESPACIO 🌪️⚔️',
        image: '../../assets/images/cards/11502550.jpg',
        description: '¡El asalto aéreo del Neoespacio y el ascenso del legendario clan de Los Seis Samuráis! Contiene a Elemental HERO Air Neos, Grand Neos, Glow Neos, Neo-Spacian Grand Mole, Air Hummingbird, Great Shogun Shien, D.D. Crow, Gene-Warped Warwolf, Dark World Dealings, Advanced Ritual Art y Skyscraper 2 - Hero City.',
        cards_per_pack: 3,
        cards: stonCards
    },
    {
        id: 'FOTB',
        name: 'Fuerza del Rompedor (Force of the Breaker)',
        code: 'FOTB',
        series: 'GX',
        active: true,
        visible: true,
        price: 10000,
        offer_text: 'BESTIAS DE CRISTAL & VOLCÁNICOS 💎🌋',
        image: '../../assets/images/cards/32543380.jpg',
        description: '¡La llegada de las 7 Bestias de Cristal de Jesse Anderson y el poder explosivo de los Volcánicos de Axel Brodie! Incluye a Volcanic Doomfire, Tri-Blaze Accelerator, Crystal Beast Sapphire Pegasus, Ruby Carbuncle, Ancient City - Rainbow Ruins, Crystal Abundance, Raiza the Storm Monarch, Sky Scourge Norleras y los buscadores de cartas de campo.',
        cards_per_pack: 3,
        cards: fotbCards
    },
    {
        id: 'TAEV',
        name: 'Evolución Táctica (Tactical Evolution)',
        code: 'TAEV',
        series: 'GX',
        active: true,
        visible: true,
        price: 10500,
        offer_text: 'DRAGÓN ARCOÍRIS & GÉMINIS 🌈♊',
        image: '../../assets/images/cards/79856792.jpg',
        description: '¡La llegada del supremo Rainbow Dragon, el debut de los Monstruos Géminis y el letal veneno de las Serpientes Venenosas! Incluye a Rainbow Dragon, Vennominaga the Deity of Poisonous Snakes, Vennominon, Elemental HERO Magma Neos, Neos Alius, Darkbright, Zombie Master, Necro Gardna, Il Blud, Double Summon, Snake Rain y Venom Swamp.',
        cards_per_pack: 3,
        cards: taevCards
    },
    {
        id: 'GLAS',
        name: "Asalto del Gladiador (Gladiator's Assault)",
        code: 'GLAS',
        series: 'GX',
        active: true,
        visible: true,
        price: 11000,
        offer_text: 'BESTIAS GLADIADOR & HÉROES MALVADOS ⚔️😈',
        image: '../../assets/images/cards/17032740.jpg',
        description: '¡El coliseo de las legendarias Bestias Gladiador y la corrupción del Rey Supremo con los Héroes Malvados (Evil HERO)! Contiene a Elemental HERO Chaos Neos, Gladiator Beast Heraklinos, Laquari, Bestiari, Murmillo, Test Tiger, Evil HERO Dark Gaia, Malicious Edge, Inferno Wing, Lightning Golem, Dark Fusion, Cloudian - Eye of the Typhoon y Light/Shadow-Imprisoning Mirrors.',
        cards_per_pack: 3,
        cards: glasCards
    },
    {
        id: 'PTDN',
        name: 'Oscuridad Fantasma (Phantom Darkness)',
        code: 'PTDN',
        series: 'GX',
        active: true,
        visible: true,
        price: 11500,
        offer_text: 'DRAGÓN ARMADO OSCURO & YUBEL 🐉🌑💜',
        image: '../../assets/images/cards/65192027.jpg',
        description: '¡La era de la Oscuridad Suprema con el temible Dark Armed Dragon y la trilogía de Yubel! Incluye a Dark Armed Dragon, Yubel, Yubel - Terror Incarnate, Yubel - The Ultimate Nightmare, Rainbow Dark Dragon, Rainbow Neos, Elemental HERO Storm Neos, Super Polymerization, Allure of Darkness, Armageddon Knight, Dark Grepher, Lonefire Blossom, Gigaplant y Cyber Valley.',
        cards_per_pack: 3,
        cards: ptdnCards
    },
    {
        id: 'LODT',
        name: 'Luz de la Destrucción (Light of Destruction)',
        code: 'LODT',
        series: 'GX',
        active: true,
        visible: true,
        price: 12000,
        offer_text: 'LUMINOSOS & HONESTO ☀️🕊️🐉',
        image: '../../assets/images/cards/37742478.jpg',
        description: '¡La culminación de la era Yu-Gi-Oh! GX con el debut de los Luminosos (Lightsworn) y el poder de Honest! Contiene a Honest, Judgment Dragon, Lumina, Lyla, Ryko, Wulf, Celestia, Solar Recharge, Gladiator Beast Gyzarus, Destiny End Dragoon, Fossil Dyna Pachycephalo, Volcanic Queen, Arcana Force XXI - The World y Limit Reverse.',
        cards_per_pack: 3,
        cards: lodtCards
    },

    // --- 🏎️ YU-GI-OH! 5D'S ---
    {
        id: 'TDGS',
        name: 'La Génesis del Duelista (The Duelist Genesis)',
        code: 'TDGS',
        series: '5D',
        active: true,
        visible: true,
        price: 12500,
        offer_text: 'DRAGÓN DE POLVO DE ESTRELLAS 🌠✨',
        image: '../../assets/images/cards/44508094.jpg',
        description: "¡El inicio oficial de la era Yu-Gi-Oh! 5D's y la revolucionaria Invocación por Sincronía! Incluye al Dragón de Polvo de Estrellas (Stardust Dragon), Archidemonio Dragón Rojo (Red Dragon Archfiend), Guardián Goyo, Archidemonio Mental, Androide Mágico, Guerrero Nitro, Teleportación de Emergencia, Carga de la Caballería Ligera, Ciudad de Engranajes y Nido de Escarabajos de Aguja.",
        cards_per_pack: 3,
        cards: tdgsCards
    },
    {
        id: 'CSOC',
        name: 'Encrucijada del Caos (Crossroads of Chaos)',
        code: 'CSOC',
        series: '5D',
        active: true,
        visible: true,
        price: 13000,
        offer_text: 'DRAGÓN DE LA ROSA NEGRA 🌹💥',
        image: '../../assets/images/cards/73580471.jpg',
        description: "¡La llegada destructiva del Dragón de la Rosa Negra (Black Rose Dragon) y Akiza Izinski! Contiene a Black Rose Dragon, Plaguespreader Zombie, Turbo Warrior, Iron Chain Dragon, Doomkaiser Dragon, Revived King Ha Des, Black Garden, Mark of the Rose, Morphtronic Celfon, Treacherous Trap Hole, Gozen Match y Tytannial, Princess of Camellias.",
        cards_per_pack: 3,
        cards: csocCards
    },
    {
        id: 'CRMS',
        name: 'Crisis Carmesí (Crimson Crisis)',
        code: 'CRMS',
        series: '5D',
        active: true,
        visible: true,
        price: 13500,
        offer_text: 'ALANEGRA & MODO DE ASALTO 🦅⚡',
        image: '../../assets/images/cards/69031175.jpg',
        description: "¡El legendario debut del arquetipo Alanegra (Blackwing) de Crow Hogan y la temible evolución /Modo de Asalto (/Assault Mode)! Contiene a Blackwing Armor Master, Blackwing - Gale the Whirlwind, Bora the Spear, Sirocco the Dawn, Red Dragon Archfiend/Assault Mode, Arcanite Magician, Dark Strike Fighter, Debris Dragon, Trap Eater y Assault Mode Activate.",
        cards_per_pack: 3,
        cards: crmsCards
    },
    {
        id: 'RGBT',
        name: 'Batalla Furiosa (Raging Battle)',
        code: 'RGBT',
        series: '5D',
        active: true,
        visible: true,
        price: 14000,
        offer_text: 'DRAGÓN DE HERRAMIENTAS 🔧⚡',
        image: '../../assets/images/cards/2403771.jpg',
        description: "¡La llegada del Dragón de Herramientas (Power Tool Dragon) de Leo, los Inmortales Terrestres (Earthbound Immortals) y el poder de los Koa'ki Meiru! Contiene a Power Tool Dragon, Blackwing - Armed Wing, Blizzard, Shura, Kalut, Black Whirlwind, Deep Sea Diva, One for One, Forbidden Chalice, Trap Stun, Delta Crow - Anti Reverse, Earthbound Immortal Aslla piscu y Trident Dragion.",
        cards_per_pack: 3,
        cards: rgbtCards
    },
    {
        id: 'ANPR',
        name: 'Profecía Antigua (Ancient Prophecy)',
        code: 'ANPR',
        series: '5D',
        active: true,
        visible: true,
        price: 14500,
        offer_text: 'DRAGÓN HADA ANTIGUO 🌸🧚✨',
        image: '../../assets/images/cards/25862681.jpg',
        description: "¡La llegada del Dragón Hada Antiguo (Ancient Fairy Dragon) de Luna, los Inmortales Terrestres (Earthbound Immortals), Fortune Ladies y los Guerreros X-Saber! Contiene a Ancient Fairy Dragon, Archfiend Zombie-Skull, XX-Saber Gottoms, XX-Saber Faultroll, Blackwing - Vayu the Emblem of Honor, Fossil Dig, Solidarity, Future Visions, Skill Successor, Rekindling, White Night Dragon y Armityle the Chaos Phantasm.",
        cards_per_pack: 3,
        cards: anprCards
    },
    {
        id: 'SOVR',
        name: 'Poder del Polvo de Estrellas (Stardust Overdrive)',
        code: 'SOVR',
        series: '5D',
        active: true,
        visible: true,
        price: 15000,
        offer_text: 'DRAGÓN DE LA SALVACIÓN MAJESTUOSA 🌠✨',
        image: '../../assets/images/cards/7841112.jpg',
        description: "¡La evolución cósmica suprema con el Dragón de la Salvación Majestuosa (Majestic Star Dragon)! Contiene a Majestic Star Dragon, Quickdraw Synchron, Level Eater, Swap Frog, Gateway of the Six, Archlord Kristya, Dark Simorgh, Preparation of Rites, Gemini Spark, Black Brutdrago, Reptilianne Hydra, Divine Grace - Northwemko y Blackwing - Silverwind the Ascendant.",
        cards_per_pack: 3,
        cards: sovrCards
    },
    {
        id: 'ABPF',
        name: 'Poder Absoluto (Absolute Powerforce)',
        code: 'ABPF',
        series: '5D',
        active: true,
        visible: true,
        price: 15500,
        offer_text: 'DRAGÓN ROJO MAJESTUOSO 🔥👑💥',
        image: '../../assets/images/cards/67030233.jpg',
        description: "¡La furia demoledora del Dragón de la Ruda Resonancia Majestuoso (Majestic Red Dragon) de Jack Atlas! Contiene a Majestic Red Dragon, Battle Fader, Cards of Consonance, Fiendish Chain, XX-Saber Hyunlei, Drill Warrior, Sun Dragon Inti, Moon Dragon Quilla, Gravekeeper's Stele, Super-Nimble Mega Hamster, Cyber Dragon Zwei y Consecrated Light.",
        cards_per_pack: 3,
        cards: abpfCards
    },
    {
        id: 'TSHD',
        name: 'La Oscuridad Brillante (The Shining Darkness)',
        code: 'TSHD',
        series: '5D',
        active: true,
        visible: true,
        price: 16000,
        offer_text: 'DRAGÓN ALANEGRA & INFÉRNICOS 🪶🔥🌑',
        image: '../../assets/images/cards/9012916.jpg',
        description: "¡La llegada del Dragón de Alanegra (Black-Winged Dragon) de Crow Hogan y el poder arrollador de los Inférnicos (Infernity)! Contiene a Black-Winged Dragon, Infernity Launcher, Infernity Barrier, Infernity Doom Dragon, Infernity Mirage, Spore, Ronintoadin, Herald of Perfection, XX-Saber Darksoul, Into the Void, Chaos Trap Hole y Chaos Goddess.",
        cards_per_pack: 3,
        cards: tshdCards
    },
    {
        id: 'DREV',
        name: 'Revolución de los Duelistas (Duelist Revolution)',
        code: 'DREV',
        series: '5D',
        active: true,
        visible: true,
        price: 16500,
        offer_text: 'DRAGÓN DE CHATARRA & EFECTO VELADOR ⚙️🐉✨',
        image: '../../assets/images/cards/76774528.jpg',
        description: "¡La era revolucionaria con el temible Dragón de Chatarra (Scrap Dragon) y la mano trampa definitiva Effect Veiler! Contiene a Scrap Dragon, Effect Veiler, Dragon Knight Draco-Equiste, Pot of Duality, Solemn Warning, Naturia Bamboo Shoot, Amazoness Queen, Scrapyard, Scrapstorm, Double Cyclone, Ultimate Axon Kicker y Miracle Synchro Fusion.",
        cards_per_pack: 3,
        cards: drevCards
    },
    {
        id: 'STBL',
        name: 'Estrella del Siniestro (Starstrike Blast)',
        code: 'STBL',
        series: '5D',
        active: true,
        visible: true,
        price: 17000,
        offer_text: 'DRAGÓN DE LA ESTRELLA FUGAZ 🌠🏎️💫',
        image: '../../assets/images/cards/24696097.jpg',
        description: "¡La llegada del supremo Dragón de la Estrella Fugaz (Shooting Star Dragon), Dragón Nova Rojo (Red Nova Dragon) y la Invocación de Sincronía Acelerada! Contiene a Shooting Star Dragon, Red Nova Dragon, Formula Synchron, Tuning, Glow-Up Bulb, Vanity's Emptiness, Droll & Lock Bird, Swift Scarecrow, Scrap Twin Dragon, Karakuri Shogun mdl 00 'Burei' y Gravekeeper's Recruiter.",
        cards_per_pack: 3,
        cards: stblCards
    },
    {
        id: 'STOR',
        name: 'Tormenta de Ragnarok (Storm of Ragnarok)',
        code: 'STOR',
        series: '5D',
        active: true,
        visible: true,
        price: 17500,
        offer_text: 'DIOSES NÓRDICOS & SEIS SAMURÁIS LEGENDARIOS ⚡⚔️👑',
        image: '../../assets/images/cards/93483212.jpg',
        description: "¡El despertar de los Tres Dioses Nórdicos (Aesir) y el apogeo supremo de los Seis Samuráis Legendarios! Contiene a Odin, Father of the Aesir, Thor, Lord of the Aesir, Loki, Lord of the Aesir, Legendary Six Samurai - Shi En, Kizan, Enishi, Kageki, Maxx 'C', Forbidden Lance, Doppelwarrior, Shien's Smoke Signal, Musakani Magatama y Atomic Scrap Dragon.",
        cards_per_pack: 3,
        cards: storCards
    },
    {
        id: 'EXVC',
        name: 'Victoria Extrema (Extreme Victory)',
        code: 'EXVC',
        series: '5D',
        active: true,
        visible: true,
        price: 18000,
        offer_text: 'DRAGÓN CORRIENTE DE VIDA & GUÍA TURÍSTICA 🌿🦾🚌',
        image: '../../assets/images/cards/25165047.jpg',
        description: "¡La culminación de la era Yu-Gi-Oh! 5D's con el Dragón de la Corriente de la Vida (Life Stream Dragon), Delta Accel Synchro T.G. Halberd Cannon y la mítica Tour Guide From the Underworld! Contiene a Life Stream Dragon, T.G. Halberd Cannon, Tour Guide From the Underworld, Reborn Tengu, T.G. Wonder Magician, T.G. Blade Blaster, Junk Berserker, Safe Zone, Debunk, Resonator Call y Blue Rose Dragon.",
        cards_per_pack: 3,
        cards: exvcCards
    }
];

const fileContent = `/**
 * ANI-DIMENSION: GESTIÓN DE SOBRES Y CATALOGO DE CARTAS OCG (DM, GX, 5D'S Y EDICIONES ESPECIALES)
 * CATÁLOGO COMPLETO DE CARTAS CON DATOS REGLAMENTARIOS DE SQL SERVER (cards.cdb) E IMÁGENES LOCALES
 */
(function(window) {
    // 1. CATÁLOGOS OFICIALES DE SOBRES CON CARTAS EMBLEMÁTICAS
    const INITIAL_PACKS = ${JSON.stringify(INITIAL_PACKS, null, 4)};

    const STORAGE_KEY_OVERRIDES = 'ad_packs_overrides_v1';
    const STORAGE_KEY_NPC_DROPS = 'ad_npc_drops_data_v1';
    const STORAGE_KEY_USER_INVENTORY = 'ad_user_inventory_v1';

    // Auto-limpieza de claves pesadas antiguas para evitar QuotaExceededError en navegadores
    try {
        ['ad_packs_data_v1', 'ad_packs_data_v2', 'ad_packs_data_v3', 'ad_packs_data_v4', 'ad_packs_data_v5', 'ad_packs_data_v6', 'ad_packs_data_v7', 'ad_packs_data_v8'].forEach(k => {
            if (typeof localStorage !== 'undefined' && localStorage.getItem(k)) {
                localStorage.removeItem(k);
            }
        });
    } catch(e) {}

    // MANEJO DE ALMACENAMIENTO LIGERO (IN-MEMORY SINGLE SOURCE OF TRUTH CON OVERRIDES ADMIN)
    let _cachedPacks = null;
    let _cardIndexMap = null;

    function buildCardIndex(packs) {
        _cardIndexMap = new Map();
        for (const pack of packs) {
            if (pack && pack.cards) {
                for (const c of pack.cards) {
                    if (c && c.card_id) {
                        _cardIndexMap.set(String(c.card_id), c);
                    }
                }
            }
        }
    }

    const PacksManager = {
        getOverrides: function() {
            try {
                if (typeof localStorage === 'undefined') return {};
                const data = localStorage.getItem(STORAGE_KEY_OVERRIDES);
                return data ? JSON.parse(data) : {};
            } catch(e) {
                return {};
            }
        },
        saveOverrides: function(overrides) {
            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(STORAGE_KEY_OVERRIDES, JSON.stringify(overrides));
                }
            } catch(e) {
                console.warn('[PacksManager] No se pudo guardar overrides en localStorage:', e.message);
            }
        },
        getPacks: function(forceRefresh = false) {
            if (_cachedPacks && !forceRefresh) {
                return _cachedPacks;
            }

            const overrides = this.getOverrides();
            const packs = INITIAL_PACKS.map(initPack => {
                const packOv = overrides[initPack.id] || {};
                const p = {
                    ...initPack,
                    active: packOv.active !== undefined ? packOv.active : initPack.active,
                    visible: packOv.visible !== undefined ? packOv.visible : (initPack.visible !== undefined ? initPack.visible : true),
                    price: packOv.price !== undefined ? packOv.price : initPack.price,
                    offer_text: packOv.offer_text !== undefined ? packOv.offer_text : initPack.offer_text,
                    series: initPack.series || (initPack.id === 'TDGS' ? '5D' : (initPack.id === 'TLM' ? 'GX' : 'DM'))
                };

                if (packOv.card_overrides && p.cards) {
                    p.cards = p.cards.map(c => {
                        const cOv = packOv.card_overrides[String(c.card_id)];
                        if (cOv) {
                            return { ...c, ...cOv };
                        }
                        return c;
                    });
                }
                return p;
            });

            _cachedPacks = packs;
            buildCardIndex(_cachedPacks);
            return _cachedPacks;
        },
        savePacks: function(packs) {
            _cachedPacks = packs;
            buildCardIndex(_cachedPacks);

            // Guardar solo el diff de overrides ligero
            const overrides = {};
            packs.forEach(p => {
                const cardOverrides = {};
                if (p.cards) {
                    p.cards.forEach(c => {
                        if (c.active === false || c.pack_drop === false || c.deck_usable === false || c.npc_drop === false) {
                            cardOverrides[String(c.card_id)] = {
                                active: c.active,
                                pack_drop: c.pack_drop,
                                deck_usable: c.deck_usable,
                                npc_drop: c.npc_drop
                            };
                        }
                    });
                }

                overrides[p.id] = {
                    active: p.active,
                    visible: p.visible,
                    price: p.price,
                    offer_text: p.offer_text,
                    card_overrides: Object.keys(cardOverrides).length > 0 ? cardOverrides : undefined
                };
            });

            this.saveOverrides(overrides);
        },
        getPackById: function(packId) {
            const packs = this.getPacks();
            return packs.find(p => p.id === packId) || null;
        },
        getCardById: function(cardId) {
            if (!_cardIndexMap) {
                this.getPacks();
            }
            if (_cardIndexMap && _cardIndexMap.has(String(cardId))) {
                return _cardIndexMap.get(String(cardId));
            }
            const packs = this.getPacks();
            for (const pack of packs) {
                const card = pack.cards.find(c => String(c.card_id) === String(cardId));
                if (card) {
                    if (_cardIndexMap) _cardIndexMap.set(String(cardId), card);
                    return card;
                }
            }
            return null;
        },
        isCardActive: function(cardId) {
            const card = this.getCardById(cardId);
            return card ? (card.active !== false) : true;
        },
        getUserInventory: function() {
            try {
                if (typeof localStorage === 'undefined') return [];
                const data = localStorage.getItem(STORAGE_KEY_USER_INVENTORY);
                if (!data) return [];
                return JSON.parse(data);
            } catch(e) {
                return [];
            }
        },
        clearUserInventory: function() {
            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(STORAGE_KEY_USER_INVENTORY, JSON.stringify([]));
                }
            } catch(e) {}
        },
        addCardToInventory: function(cardObj) {
            if (!cardObj) return;
            const cardId = String(typeof cardObj === 'object' ? (cardObj.card_id || cardObj.id) : cardObj);
            const canonicalCard = this.getCardById(cardId) || (typeof cardObj === 'object' ? cardObj : { card_id: parseInt(cardId) });
            const inv = this.getUserInventory();
            inv.push({
                card_id: parseInt(cardId) || canonicalCard.card_id,
                name: canonicalCard.name || ('Carta #' + cardId),
                rarity: canonicalCard.rarity || 'COMMON',
                type: canonicalCard.type || 'Monster',
                set: canonicalCard.set || 'PROMO',
                atk: canonicalCard.atk,
                def: canonicalCard.def,
                level: canonicalCard.level,
                attribute: canonicalCard.attribute,
                race: canonicalCard.race,
                desc: canonicalCard.desc
            });
            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(STORAGE_KEY_USER_INVENTORY, JSON.stringify(inv));
                }
            } catch(e) {}
        },
        openPack: function(packId) {
            const packs = this.getPacks();
            const pack = packs.find(p => p.id === packId);
            if (!pack || !pack.cards || pack.cards.length === 0) return null;

            const activePool = pack.cards.filter(c => c.active !== false && c.pack_drop !== false);
            if (activePool.length === 0) return null;

            const commons = activePool.filter(c => c.rarity === 'COMMON');
            const rares = activePool.filter(c => c.rarity !== 'COMMON');

            function getRandom(pool) {
                if (!pool || pool.length === 0) return activePool[Math.floor(Math.random() * activePool.length)];
                return pool[Math.floor(Math.random() * pool.length)];
            }

            const result = [];
            const count = pack.cards_per_pack || 3;
            for (let i = 0; i < count; i++) {
                if (i === count - 1 && rares.length > 0) {
                    result.push(getRandom(rares));
                } else {
                    result.push(getRandom(commons.length > 0 ? commons : activePool));
                }
            }

            result.forEach(card => this.addCardToInventory(card));
            return result;
        }
    };

    window.PacksManager = PacksManager;
})(window);
`;

const outputPath = path.resolve(__dirname, '../../frontend/js/data/packs-data.js');
fs.writeFileSync(outputPath, fileContent, 'utf-8');
console.log('✅ Compilado frontend/js/data/packs-data.js con 28 sobres oficiales (DM, GX, 5D\'s y Eventos)!');
