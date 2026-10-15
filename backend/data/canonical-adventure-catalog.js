/**
 * ============================================================================
 * ANI-DIMENSION: 12 ERAS & 125 DUELISTAS CANÓNICOS OFICIALES (CATÁLOGO MAESTRO)
 * ============================================================================
 */

const { NPCS_DM } = require('./npcs-dm');
const { NPCS_GX } = require('./npcs-gx');
const { NPCS_5DS } = require('./npcs-5ds');

const ERAS = [
    { id: 1, code: 'ERA_01_DOMINO', series: 'Yu-Gi-Oh! Clásico', title: 'Inicios en Ciudad Domino', subtitle: 'El despertar del Rompecabezas del Milenio y los primeros duelos', desc: 'Acompaña a Yugi y sus amigos en los primeros desafíos callejeros de Domino.', icon: '🏙️', bgTheme: 'era-bg-domino', levelRange: 'Nv. 4 - 20', assignedPack: 'LOB' },
    { id: 2, code: 'ERA_02_KINGDOM', series: 'Yu-Gi-Oh! Clásico', title: 'El Reino de los Duelistas', subtitle: 'El torneo insular de Maximillion Pegasus y el Ojo Milenario', desc: 'Enfréntate a los mejores duelistas en la isla de Pegasus para rescatar al abuelo.', icon: '🏰', bgTheme: 'era-bg-kingdom', levelRange: 'Nv. 22 - 40', assignedPack: 'MRD' },
    { id: 3, code: 'ERA_03_BATTLE_CITY', series: 'Yu-Gi-Oh! Clásico', title: 'Ciudad Batallas: Preliminares', subtitle: 'El torneo con Disco de Duelo y la cacería de los Cazadores Raros', desc: 'Duelos de apuesta por las cartas localizadoras y los Dioses Egipcios.', icon: '🏙️', bgTheme: 'era-bg-battlecity', levelRange: 'Nv. 44 - 80', assignedPack: 'PSV' },
    { id: 4, code: 'ERA_04_VIRTUAL', series: 'Yu-Gi-Oh! Clásico', title: 'Dirigible Kaiba & Mundo Virtual', subtitle: 'La trampa digital de Noah Kaiba y los Cinco Grandes', desc: 'Sobrevive a las reglas de Monstruo Maestro en el ciberespacio de Noah.', icon: '💾', bgTheme: 'era-bg-virtual', levelRange: 'Nv. 85 - 125', assignedPack: 'LON' },
    { id: 5, code: 'ERA_05_TOWER', series: 'Yu-Gi-Oh! Clásico', title: 'Torre de Duelo KaibaCorp', subtitle: 'Semifinales y Gran Final en la cúspide de Alcatraz', desc: 'El choque trascendental entre los Tres Dioses Egipcios y el Modo Fénix.', icon: '🗼', bgTheme: 'era-bg-tower', levelRange: 'Nv. 128 - 140', assignedPack: 'GODS-EGY' },
    { id: 6, code: 'ERA_06_ORICHALCOS', series: 'Yu-Gi-Oh! Clásico', title: 'El Despertar del Orichalcos', subtitle: 'Dartz, los Tres Dragones Legendarios y el Gran Leviatán', desc: 'Lucha contra el poder de la Atlántida para salvar las almas de los duelistas.', icon: '🔱', bgTheme: 'era-bg-orichalcos', levelRange: 'Nv. 144 - 185', assignedPack: 'DRLG' },
    { id: 7, code: 'ERA_07_EGYPT', series: 'Yu-Gi-Oh! Clásico', title: 'Mundo de las Memorias & Antiguo Egipto', subtitle: 'El RPG Milenario, los Sacerdotes y el Duelo Ceremonial', desc: 'Revive el reinado del Faraón Atem y el enfrentamiento final con Zorc.', icon: '🏺', bgTheme: 'era-bg-egypt', levelRange: 'Nv. 190 - 225', assignedPack: 'PROMO-DM' },
    { id: 8, code: 'ERA_08_GX_ACADEMY', series: 'Yu-Gi-Oh! GX', title: 'Academia de Duelos: Año 1', subtitle: 'Jaden Yuki, los Caballeros de las Sombras y las Bestias Sagradas', desc: 'Duelos juveniles en la isla volcánica de la Academia de Duelos.', icon: '🎓', bgTheme: 'era-bg-gx-academy', levelRange: 'Nv. 230 - 272', assignedPack: 'TLM' },
    { id: 9, code: 'ERA_09_GX_SOCIETY', series: 'Yu-Gi-Oh! GX', title: 'Sociedad de la Luz & Torneo GX', subtitle: 'Sartorius Kumar, la Fuerza Arcana y la Luz de la Ruina', desc: 'Detén el lavado de cerebro de la Sociedad de la Luz en el Torneo Genex.', icon: '☀️', bgTheme: 'era-bg-gx-society', levelRange: 'Nv. 276 - 325', assignedPack: 'POTD' },
    { id: 10, code: 'ERA_10_GX_DARK', series: 'Yu-Gi-Oh! GX', title: 'Dimensión Oscura & El Rey Supremo', subtitle: 'El ascenso de Haou Judai, Jesse corrupto y Yubel', desc: 'Viaja entre dimensiones para rescatar a tus amigos del dolor de Yubel.', icon: '🌌', bgTheme: 'era-bg-gx-dark', levelRange: 'Nv. 330 - 375', assignedPack: 'GLAS' },
    { id: 11, code: 'ERA_11_5DS_DOMINO', series: "Yu-Gi-Oh! 5D's", title: 'Neo Domino & Portadores Oscuros', subtitle: 'Yusei Fudo, Inmortales Terrestres y la marca del Dragón Carmesí', desc: 'Turbo Duelos de alta velocidad para sellar el Inframundo.', icon: '🏍️', bgTheme: 'era-bg-5ds-domino', levelRange: 'Nv. 380 - 425', assignedPack: 'TDGS' },
    { id: 12, code: 'ERA_12_5DS_WRGP', series: "Yu-Gi-Oh! 5D's", title: 'Grand Prix WRGP & Abismo Z-ONE', subtitle: 'Los Dioses Nórdicos, Emperadores Meklord y los Señores del Tiempo', desc: 'La batalla final por el futuro de la humanidad contra Ark Cradle.', icon: '⚡', bgTheme: 'era-bg-5ds-wrgp', levelRange: 'Nv. 430 - 500', assignedPack: 'EXVC' }
];

const CANON_NPCS = [...NPCS_DM, ...NPCS_GX, ...NPCS_5DS];

module.exports = { ERAS, CANON_NPCS };
