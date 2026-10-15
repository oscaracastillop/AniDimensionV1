const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SLEEVES_DIR = path.resolve(__dirname, '../frontend/assets/images/sleeves');
const PLAYMATS_DIR = path.resolve(__dirname, '../frontend/assets/images/playmats');

if (!fs.existsSync(SLEEVES_DIR)) fs.mkdirSync(SLEEVES_DIR, { recursive: true });
if (!fs.existsSync(PLAYMATS_DIR)) fs.mkdirSync(PLAYMATS_DIR, { recursive: true });

// 20 SLEEVES DEFINITION
const sleevesData = [
  {
    code: "SLV-001",
    name: "Funda Dragón Blanco Cósmico",
    desc: "Reverso legendario con el Dragón Blanco de Ojos Azules y runas astrales resplandecientes.",
    price: 50000,
    currency: "STARSHIPS",
    offer: "POPULAR",
    theme: "blue_eyes",
    color1: "#00d2ff", color2: "#003366", color3: "#ffffff", accent: "#ffd700"
  },
  {
    code: "SLV-002",
    name: "Funda Maga Oscura Prismática",
    desc: "Aura mágica de pentagrama arcano y destellos estelares color magenta y turquesa.",
    price: 45000,
    currency: "STARSHIPS",
    offer: "NUEVO",
    theme: "dark_magician_girl",
    color1: "#ff2a8d", color2: "#4a0072", color3: "#00f0ff", accent: "#ffea79"
  },
  {
    code: "SLV-003",
    name: "Funda Dragón Negro Infernal",
    desc: "Llamas carmesí ardientes y la feroz mirada del Dragón Negro de Ojos Rojos.",
    price: 45000,
    currency: "STARSHIPS",
    offer: "HOLO",
    theme: "red_eyes",
    color1: "#ff1100", color2: "#1a0000", color3: "#ff7700", accent: "#ff0033"
  },
  {
    code: "SLV-004",
    name: "Funda Slifer el Dragón Celestial",
    desc: "Poder divino del Dios Egipcio Slifer con truenos carmesí y jeroglíficos dorados.",
    price: 80000,
    currency: "STARSHIPS",
    offer: "DIVINO",
    theme: "slifer",
    color1: "#e60000", color2: "#3b0000", color3: "#ffb700", accent: "#ffd700"
  },
  {
    code: "SLV-005",
    name: "Funda Obelisco el Atormentador",
    desc: "Fuerza colosal del Dios del Puño Divino con zafiro y obsidiana titánica.",
    price: 80000,
    currency: "STARSHIPS",
    offer: "DIVINO",
    theme: "obelisk",
    color1: "#0051ff", color2: "#020b24", color3: "#5ce1e6", accent: "#ffd700"
  },
  {
    code: "SLV-006",
    name: "Funda El Dragón Alado de Ra",
    desc: "Radiación solar suprema bañada en oro milenario y llamas celestiales sagradas.",
    price: 90000,
    currency: "STARSHIPS",
    offer: "DIVINO",
    theme: "ra",
    color1: "#ffd700", color2: "#4a3000", color3: "#fff59d", accent: "#ff5722"
  },
  {
    code: "SLV-007",
    name: "Funda Mago Oscuro del Caos",
    desc: "Círculo de invocación mágica violeta supremo con runas arcanas prohibidas.",
    price: 50000,
    currency: "STARSHIPS",
    offer: "ÉPICO",
    theme: "chaos_sorcerer",
    color1: "#8a2be2", color2: "#120024", color3: "#e0aaff", accent: "#00ffff"
  },
  {
    code: "SLV-008",
    name: "Funda Cyber Dragón Infinito",
    desc: "Circuito cibernético cromado con luces de neón cian y matriz cuántica de titanio.",
    price: 60000,
    currency: "STARSHIPS",
    offer: "CIBER",
    theme: "cyber_dragon",
    color1: "#00ffcc", color2: "#061826", color3: "#ffffff", accent: "#00b4d8"
  },
  {
    code: "SLV-009",
    name: "Funda HÉROE Elemental Neos",
    desc: "Destello espacial estelar con el brillo de la justicia del Espacio Neo.",
    price: 40000,
    currency: "STARSHIPS",
    offer: "DESTACADO",
    theme: "hero_neos",
    color1: "#00b4d8", color2: "#03045e", color3: "#ff006e", accent: "#ffd166"
  },
  {
    code: "SLV-010",
    name: "Funda Dragón Polvo de Estrellas",
    desc: "Lluvia de estrellas holográficas plateadas y polvo cósmico resplandeciente.",
    price: 70000,
    currency: "STARSHIPS",
    offer: "HOLO",
    theme: "stardust",
    color1: "#e0f2fe", color2: "#0c1b33", color3: "#38bdf8", accent: "#f472b6"
  },
  {
    code: "SLV-011",
    name: "Funda Dragón Caos Máximo",
    desc: "Sello de invocación de ritual de obsidiana y relámpagos azul cobalto destructor.",
    price: 65000,
    currency: "STARSHIPS",
    offer: "ÉPICO",
    theme: "chaos_max",
    color1: "#2563eb", color2: "#050814", color3: "#60a5fa", accent: "#9333ea"
  },
  {
    code: "SLV-012",
    name: "Funda Número 39: Utopía",
    desc: "Alas doradas de la esperanza con halo astral y energía Xyz resplandeciente.",
    price: 55000,
    currency: "STARSHIPS",
    offer: "XYZ",
    theme: "utopia",
    color1: "#fbbf24", color2: "#1f1401", color3: "#fef08a", accent: "#f97316"
  },
  {
    code: "SLV-013",
    name: "Funda Dragón Péndulo Ojos Anómalos",
    desc: "Escala pendular dimensional con gemas bicolores esmeralda y rubí holográfico.",
    price: 50000,
    currency: "STARSHIPS",
    offer: "PÉNDULO",
    theme: "odd_eyes",
    color1: "#ef4444", color2: "#180308", color3: "#10b981", accent: "#f59e0b"
  },
  {
    code: "SLV-014",
    name: "Funda Dragón Cortafuegos",
    desc: "Rejilla cibernética cuántica y enlaces Link en azul ultra brillante.",
    price: 55000,
    currency: "STARSHIPS",
    offer: "LINK",
    theme: "firewall",
    color1: "#06b6d4", color2: "#041421", color3: "#67e8f9", accent: "#3b82f6"
  },
  {
    code: "SLV-015",
    name: "Funda Exodia el Prohibido",
    desc: "Antiguo sello dorado de cadenas selladas del poder infinito prohibido.",
    price: 100000,
    currency: "STARSHIPS",
    offer: "LEGENDARIO",
    theme: "exodia",
    color1: "#d97706", color2: "#241002", color3: "#fde68a", accent: "#b45309"
  },
  {
    code: "SLV-016",
    name: "Funda Ojo de Anubis Milenario",
    desc: "Reliquia faraónica con el Ojo de Wadjet bañado en oro sagrado eterno.",
    price: 75000,
    currency: "STARSHIPS",
    offer: "MILENIO",
    theme: "millennium_eye",
    color1: "#f59e0b", color2: "#1c1002", color3: "#fef3c7", accent: "#d97706"
  },
  {
    code: "SLV-017",
    name: "Funda Dragón Rosa Negra",
    desc: "Pétalos de espinas carmesí y fulgor lunar de la devastación botánica.",
    price: 60000,
    currency: "STARSHIPS",
    offer: "HOLO",
    theme: "black_rose",
    color1: "#e11d48", color2: "#180208", color3: "#f43f5e", accent: "#fda4af"
  },
  {
    code: "SLV-018",
    name: "Funda Calavera Convocada",
    desc: "Trueno del inframundo y silueta ósea espectral envuelta en rayos violetas.",
    price: 45000,
    currency: "STARSHIPS",
    offer: "OSCURO",
    theme: "summoned_skull",
    color1: "#7c3aed", color2: "#0e031a", color3: "#c084fc", accent: "#a855f7"
  },
  {
    code: "SLV-019",
    name: "Funda Kuriboh Alado Astral",
    desc: "Brillo adorable de plumas celestiales con chispas de luz prisma de protección.",
    price: 35000,
    currency: "STARSHIPS",
    offer: "TIERNO",
    theme: "kuriboh",
    color1: "#38bdf8", color2: "#071b29", color3: "#fbcfe8", accent: "#fef08a"
  },
  {
    code: "SLV-020",
    name: "Funda Ani-Dimension Élite",
    desc: "Emblema oficial de campeonato Ani-Dimension con marco dimensional de campeones.",
    price: 120000,
    currency: "STARSHIPS",
    offer: "OFICIAL",
    theme: "ani_dimension",
    color1: "#00f0ff", color2: "#050914", color3: "#ff007f", accent: "#ffd700"
  }
];

// 20 PLAYMATS DEFINITION
const playmatsData = [
  {
    code: "MAT-001",
    name: "Tapete Dragón Blanco Cósmico",
    desc: "Superficie de duelo cósmica con el Dragón Blanco de Ojos Azules y vórtice dimensional.",
    price: 80000,
    currency: "STARSHIPS",
    offer: "POPULAR",
    theme: "blue_eyes_mat",
    color1: "#00b4d8", color2: "#03045e", color3: "#90e0ef", accent: "#ffd700"
  },
  {
    code: "MAT-002",
    name: "Tapete Santuario de la Maga Oscura",
    desc: "Coliseo mágico nocturno con runas estelares, orbes de energía y sellos de hechicería.",
    price: 75000,
    currency: "STARSHIPS",
    offer: "NUEVO",
    theme: "dark_magician_girl_mat",
    color1: "#d946ef", color2: "#3b0764", color3: "#06b6d4", accent: "#fef08a"
  },
  {
    code: "MAT-003",
    name: "Tapete Abismo del Dragón Negro",
    desc: "Fisura volcánica del inframundo con lava ardiente y la silueta del Dragón de Ojos Rojos.",
    price: 75000,
    currency: "STARSHIPS",
    offer: "HOLO",
    theme: "red_eyes_mat",
    color1: "#dc2626", color2: "#180202", color3: "#ea580c", accent: "#ef4444"
  },
  {
    code: "MAT-004",
    name: "Tapete Tríada de Dioses Egipcios",
    desc: "Panteón sagrado de los Tres Dioses Supremos: Slifer, Obelisco y El Dragón Alado de Ra.",
    price: 150000,
    currency: "STARSHIPS",
    offer: "DIVINO",
    theme: "gods_mat",
    color1: "#eab308", color2: "#1e1b4b", color3: "#dc2626", accent: "#2563eb"
  },
  {
    code: "MAT-005",
    name: "Tapete Ciber-Metrópolis Neo Domino",
    desc: "Pista de duelo futurista sobre rascacielos cibernéticos con autopistas de luz de neón.",
    price: 90000,
    currency: "STARSHIPS",
    offer: "CIBER",
    theme: "neo_domino_mat",
    color1: "#06b6d4", color2: "#020617", color3: "#ec4899", accent: "#38bdf8"
  },
  {
    code: "MAT-006",
    name: "Tapete Templo de los Artículos del Milenio",
    desc: "Cámara dorada egipcia con la Pirámide de la Luz y los siete artefactos ancestrales.",
    price: 100000,
    currency: "STARSHIPS",
    offer: "MILENIO",
    theme: "millennium_mat",
    color1: "#ca8a04", color2: "#1c1002", color3: "#fef08a", accent: "#d97706"
  },
  {
    code: "MAT-007",
    name: "Tapete Nebulosa Galáctica Starlight",
    desc: "Vasta constelación estelar con auroras boreales cósmicas y estrellas fugaces holográficas.",
    price: 85000,
    currency: "STARSHIPS",
    offer: "HOLO",
    theme: "starlight_mat",
    color1: "#818cf8", color2: "#09090b", color3: "#38bdf8", accent: "#f472b6"
  },
  {
    code: "MAT-008",
    name: "Tapete Ciberespacio Matrix",
    desc: "Rejilla virtual cuántica en perspectiva 3D con nodos de datos y túneles de fibra óptica.",
    price: 80000,
    currency: "STARSHIPS",
    offer: "CIBER",
    theme: "matrix_mat",
    color1: "#10b981", color2: "#022c22", color3: "#6ee7b7", accent: "#00f0ff"
  },
  {
    code: "MAT-009",
    name: "Tapete Horizonte de Rascacielos HÉROE",
    desc: "Cima de la torre de cristal al atardecer heroico con la luna llena y destellos cósmicos.",
    price: 70000,
    currency: "STARSHIPS",
    offer: "DESTACADO",
    theme: "hero_mat",
    color1: "#3b82f6", color2: "#0f172a", color3: "#f97316", accent: "#e11d48"
  },
  {
    code: "MAT-010",
    name: "Tapete Jardín de Rosas Negras",
    desc: "Jardín nocturno gótico de espinas lunares con niebla mágica y pétalos carmesí flotantes.",
    price: 85000,
    currency: "STARSHIPS",
    offer: "HOLO",
    theme: "black_rose_mat",
    color1: "#e11d48", color2: "#19030b", color3: "#f43f5e", accent: "#be185d"
  },
  {
    code: "MAT-011",
    name: "Tapete Ruinas Submarinas de Atlantis",
    desc: "Templos sumergidos en el océano con oricalco místico, corales brillantes y luz solar acuática.",
    price: 80000,
    currency: "STARSHIPS",
    offer: "ÉPICO",
    theme: "atlantis_mat",
    color1: "#0284c7", color2: "#031525", color3: "#2dd4bf", accent: "#38bdf8"
  },
  {
    code: "MAT-012",
    name: "Tapete Coliseo del Reino de las Sombras",
    desc: "Arena ancestral de piedra oscura con ojos brillantes y niebla purpúrea espectral.",
    price: 90000,
    currency: "STARSHIPS",
    offer: "OSCURO",
    theme: "shadow_realm_mat",
    color1: "#9333ea", color2: "#0f021c", color3: "#a855f7", accent: "#ec4899"
  },
  {
    code: "MAT-013",
    name: "Tapete Dimensión Péndulo Multiverso",
    desc: "Ondas gravitacionales de espacio-tiempo con esferas dimensionales y arcos celestes.",
    price: 85000,
    currency: "STARSHIPS",
    offer: "PÉNDULO",
    theme: "pendulum_mat",
    color1: "#10b981", color2: "#06130e", color3: "#ef4444", accent: "#f59e0b"
  },
  {
    code: "MAT-014",
    name: "Tapete Estadio Virtual KaibaCorp",
    desc: "Cúpula de alta tecnología de proyección holográfica con logotipos de KaibaCorp en azul láser.",
    price: 110000,
    currency: "STARSHIPS",
    offer: "KAIBA",
    theme: "kaibacorp_mat",
    color1: "#2563eb", color2: "#020817", color3: "#60a5fa", accent: "#ffffff"
  },
  {
    code: "MAT-015",
    name: "Tapete Santuario Solar del Faraón",
    desc: "Amanecer dorado sobre dunas del desierto con la Esfinge y jeroglíficos solares resplandecientes.",
    price: 95000,
    currency: "STARSHIPS",
    offer: "SOLAR",
    theme: "solar_shrine_mat",
    color1: "#f59e0b", color2: "#291602", color3: "#fde68a", accent: "#ea580c"
  },
  {
    code: "MAT-016",
    name: "Tapete Glaciar del Dragón de Hielo",
    desc: "Pico ártico con estalactitas de cristal boreal, nieve prismática y dragones helados.",
    price: 85000,
    currency: "STARSHIPS",
    offer: "HOLO",
    theme: "ice_glacier_mat",
    color1: "#38bdf8", color2: "#082136", color3: "#e0f2fe", accent: "#67e8f9"
  },
  {
    code: "MAT-017",
    name: "Tapete Bosque Místico de los Espíritus",
    desc: "Arboleda feérica encantada con luciérnagas doradas, flores luminiscentes y lagos de cristal.",
    price: 75000,
    currency: "STARSHIPS",
    offer: "MÁGICO",
    theme: "spirit_forest_mat",
    color1: "#22c55e", color2: "#051f0f", color3: "#a7f3d0", accent: "#fbbf24"
  },
  {
    code: "MAT-018",
    name: "Tapete Volcán Dragón de Magma",
    desc: "Cráter de lava incandescente con explosiones de chispas ardientes y roca ígnea fracturada.",
    price: 80000,
    currency: "STARSHIPS",
    offer: "FUEGO",
    theme: "magma_volcano_mat",
    color1: "#f97316", color2: "#1c0602", color3: "#dc2626", accent: "#fde047"
  },
  {
    code: "MAT-019",
    name: "Tapete Vórtice Dimensional Ani-Dimension",
    desc: "Campo de batalla oficial de los Grandes Torneos con portal interdimensional azul y magenta.",
    price: 130000,
    currency: "STARSHIPS",
    offer: "OFICIAL",
    theme: "ani_dimension_mat",
    color1: "#00f0ff", color2: "#030814", color3: "#ff007f", accent: "#ffd700"
  },
  {
    code: "MAT-020",
    name: "Tapete Ascensión Divina de Luz",
    desc: "Portal sagrado del Creador de la Luz con pilares de oro puro y rayos divinos infinitos.",
    price: 200000,
    currency: "STARSHIPS",
    offer: "SUPREMO",
    theme: "divine_light_mat",
    color1: "#ffd700", color2: "#1a1200", color3: "#ffffff", accent: "#ffea00"
  }
];

// Helper to generate rich 2D vector holographic SVG for sleeves (Vertical 600x870)
function generateSleeveSVG(item) {
  const W = 600;
  const H = 870;
  const { color1, color2, color3, accent, name, code } = item;

  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <defs>
      <!-- Background Gradient -->
      <radialGradient id="bgGrad" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stop-color="${color1}" stop-opacity="0.9"/>
        <stop offset="60%" stop-color="${color2}" stop-opacity="1"/>
        <stop offset="100%" stop-color="#02040a" stop-opacity="1"/>
      </radialGradient>

      <!-- Holographic Foil Linear Gradient -->
      <linearGradient id="holoFoil" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color3}" stop-opacity="0.8"/>
        <stop offset="25%" stop-color="${color1}" stop-opacity="0.6"/>
        <stop offset="50%" stop-color="${accent}" stop-opacity="0.9"/>
        <stop offset="75%" stop-color="${color1}" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="${color3}" stop-opacity="0.8"/>
      </linearGradient>

      <!-- Glow Filter -->
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="8" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
      
      <filter id="strongGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="15" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>

      <!-- Holographic Hex Pattern -->
      <pattern id="hexGrid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M20 0 L40 11.5 L40 34.5 L20 46 L0 34.5 L0 11.5 Z" fill="none" stroke="${accent}" stroke-width="0.8" stroke-opacity="0.15"/>
      </pattern>

      <!-- Metallic Gold Frame Gradient -->
      <linearGradient id="goldFrame" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${accent}"/>
        <stop offset="30%" stop-color="#ffffff"/>
        <stop offset="50%" stop-color="${accent}"/>
        <stop offset="70%" stop-color="#b38700"/>
        <stop offset="100%" stop-color="${accent}"/>
      </linearGradient>
    </defs>

    <!-- Base Outer Background -->
    <rect width="${W}" height="${H}" fill="#040812"/>
    <rect x="8" y="8" width="${W - 16}" height="${H - 16}" rx="8" fill="url(#bgGrad)"/>

    <!-- Holographic Hex Matrix Overlay -->
    <rect x="8" y="8" width="${W - 16}" height="${H - 16}" rx="8" fill="url(#hexGrid)"/>

    <!-- Outer Card Foil Frame -->
    <rect x="18" y="18" width="${W - 36}" height="${H - 36}" rx="6" fill="none" stroke="url(#goldFrame)" stroke-width="3.5" filter="url(#glow)"/>
    <rect x="28" y="28" width="${W - 56}" height="${H - 56}" rx="4" fill="none" stroke="${color1}" stroke-width="1.5" stroke-opacity="0.6"/>

    <!-- Corner Sacred Runes / Ornaments -->
    <g stroke="url(#goldFrame)" stroke-width="2" fill="none">
      <!-- Top-Left -->
      <path d="M36 60 L36 36 L60 36"/>
      <circle cx="48" cy="48" r="4" fill="${accent}"/>
      <!-- Top-Right -->
      <path d="M${W-36} 60 L${W-36} 36 L${W-60} 36"/>
      <circle cx="${W-48}" cy="48" r="4" fill="${accent}"/>
      <!-- Bottom-Left -->
      <path d="M36 ${H-60} L36 ${H-36} L60 ${H-36}"/>
      <circle cx="48" cy="${H-48}" r="4" fill="${accent}"/>
      <!-- Bottom-Right -->
      <path d="M${W-36} ${H-60} L${W-36} ${H-36} L${W-60} ${H-36}"/>
      <circle cx="${W-48}" cy="${H-48}" r="4" fill="${accent}"/>
    </g>

    <!-- Central Sacred Geometric Hologram Circle -->
    <g transform="translate(${W/2}, ${H/2})">
      <!-- Outer Rotating Runes Circle -->
      <circle r="190" fill="none" stroke="url(#holoFoil)" stroke-width="2.5" stroke-dasharray="16 8" filter="url(#glow)"/>
      <circle r="165" fill="none" stroke="${color1}" stroke-width="1.5" stroke-opacity="0.7"/>
      <circle r="145" fill="none" stroke="url(#goldFrame)" stroke-width="2.5"/>

      <!-- Sacred Star / Magic Circles -->
      <polygon points="0,-140 121,70 -121,70" fill="none" stroke="url(#holoFoil)" stroke-width="2" opacity="0.8"/>
      <polygon points="0,140 121,-70 -121,-70" fill="none" stroke="url(#holoFoil)" stroke-width="2" opacity="0.8"/>
      <circle r="115" fill="none" stroke="${accent}" stroke-width="1.5" stroke-dasharray="4 4"/>

      <!-- Radial Rays -->
      <g stroke="url(#goldFrame)" stroke-width="1.5" opacity="0.6">
        <line x1="0" y1="-140" x2="0" y2="140"/>
        <line x1="-140" y1="0" x2="140" y2="0"/>
        <line x1="-100" y1="-100" x2="100" y2="100"/>
        <line x1="-100" y1="100" x2="100" y2="-100"/>
      </g>

      <!-- Center Mystic Core Sphere -->
      <circle r="65" fill="url(#bgGrad)" stroke="url(#goldFrame)" stroke-width="3" filter="url(#strongGlow)"/>
      <circle r="45" fill="none" stroke="${color3}" stroke-width="2" stroke-dasharray="8 4"/>
      
      <!-- Central Glowing Diamond Emblem -->
      <polygon points="0,-32 32,0 0,32 -32,0" fill="url(#holoFoil)" filter="url(#glow)"/>
      <circle cx="0" cy="0" r="10" fill="#ffffff" filter="url(#strongGlow)"/>
    </g>

    <!-- Header & Footer Banners -->
    <g text-anchor="middle" font-family="'Orbitron', 'Cinzel', 'Segoe UI', sans-serif">
      <!-- Top Title -->
      <rect x="${W/2 - 140}" y="65" width="280" height="32" rx="16" fill="#030814" fill-opacity="0.85" stroke="url(#goldFrame)" stroke-width="1.5"/>
      <text x="${W/2}" y="86" fill="${accent}" font-size="13" font-weight="900" letter-spacing="3">ANI-DIMENSION</text>

      <!-- Bottom Code & Holographic Seal -->
      <rect x="${W/2 - 120}" y="${H - 95}" width="240" height="28" rx="14" fill="#030814" fill-opacity="0.85" stroke="${color1}" stroke-width="1.2"/>
      <text x="${W/2}" y="${H - 77}" fill="#ffffff" font-size="11" font-weight="700" letter-spacing="2">${code} • HOLO FOIL</text>
    </g>
  </svg>
  `;
}

// Helper to generate rich 2D vector holographic SVG for playmats (Widescreen 1920x1080)
function generatePlaymatSVG(item) {
  const W = 1920;
  const H = 1080;
  const { color1, color2, color3, accent, name, code } = item;

  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <defs>
      <!-- Dual Nebula Field Gradient -->
      <radialGradient id="nebulaLeft" cx="25%" cy="50%" r="60%">
        <stop offset="0%" stop-color="${color1}" stop-opacity="0.85"/>
        <stop offset="60%" stop-color="${color2}" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="#020409" stop-opacity="1"/>
      </radialGradient>

      <radialGradient id="nebulaRight" cx="75%" cy="50%" r="60%">
        <stop offset="0%" stop-color="${color3}" stop-opacity="0.85"/>
        <stop offset="60%" stop-color="${color2}" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="#020409" stop-opacity="1"/>
      </radialGradient>

      <!-- Core Radial Explosion -->
      <radialGradient id="coreCenter" cx="50%" cy="50%" r="45%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
        <stop offset="20%" stop-color="${color1}" stop-opacity="0.75"/>
        <stop offset="60%" stop-color="${color2}" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="transparent" stop-opacity="0"/>
      </radialGradient>

      <!-- Glow Filter -->
      <filter id="matGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="10" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
      
      <filter id="hyperGlow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="25" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>

      <!-- Cyber Grid Floor in Perspective -->
      <pattern id="matGrid" width="60" height="60" patternUnits="userSpaceOnUse">
        <path d="M60 0 L0 0 0 60" fill="none" stroke="${accent}" stroke-width="0.8" stroke-opacity="0.18"/>
      </pattern>

      <linearGradient id="goldBorder" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${accent}"/>
        <stop offset="25%" stop-color="#ffffff"/>
        <stop offset="50%" stop-color="${accent}"/>
        <stop offset="75%" stop-color="${color1}"/>
        <stop offset="100%" stop-color="${accent}"/>
      </linearGradient>
    </defs>

    <!-- Background Layers -->
    <rect width="${W}" height="${H}" fill="#030611"/>
    
    <!-- Left & Right Dual Galaxy Orbs -->
    <rect width="${W}" height="${H}" fill="url(#nebulaLeft)"/>
    <rect width="${W}" height="${H}" fill="url(#nebulaRight)" style="mix-blend-mode: screen;"/>
    <rect width="${W}" height="${H}" fill="url(#coreCenter)" style="mix-blend-mode: screen;"/>

    <!-- High-Tech Cyber Grid Overlay -->
    <rect width="${W}" height="${H}" fill="url(#matGrid)"/>

    <!-- Outer Glowing Arena Border -->
    <rect x="25" y="25" width="${W - 50}" height="${H - 50}" rx="16" fill="none" stroke="url(#goldBorder)" stroke-width="4.5" filter="url(#matGlow)"/>
    <rect x="42" y="42" width="${W - 84}" height="${H - 84}" rx="12" fill="none" stroke="${color1}" stroke-width="1.8" stroke-opacity="0.5"/>

    <!-- Duel Division Center Line -->
    <line x1="60" y1="${H/2}" x2="${W - 60}" y2="${H/2}" stroke="${accent}" stroke-width="2.5" stroke-dasharray="24 12" stroke-opacity="0.75" filter="url(#matGlow)"/>

    <!-- Left & Right Tactical Field Circles -->
    <g transform="translate(420, ${H/2})">
      <circle r="220" fill="none" stroke="${color1}" stroke-width="2" stroke-opacity="0.6" stroke-dasharray="12 6"/>
      <circle r="170" fill="none" stroke="url(#goldBorder)" stroke-width="2.5" filter="url(#matGlow)"/>
      <polygon points="0,-150 130,75 -130,75" fill="none" stroke="${color3}" stroke-width="1.8" stroke-opacity="0.7"/>
      <polygon points="0,150 130,-75 -130,-75" fill="none" stroke="${color3}" stroke-width="1.8" stroke-opacity="0.7"/>
    </g>

    <g transform="translate(${W - 420}, ${H/2})">
      <circle r="220" fill="none" stroke="${color3}" stroke-width="2" stroke-opacity="0.6" stroke-dasharray="12 6"/>
      <circle r="170" fill="none" stroke="url(#goldBorder)" stroke-width="2.5" filter="url(#matGlow)"/>
      <polygon points="0,-150 130,75 -130,75" fill="none" stroke="${color1}" stroke-width="1.8" stroke-opacity="0.7"/>
      <polygon points="0,150 130,-75 -130,-75" fill="none" stroke="${color1}" stroke-width="1.8" stroke-opacity="0.7"/>
    </g>

    <!-- Central Grand Tournament Portal -->
    <g transform="translate(${W/2}, ${H/2})">
      <!-- Huge Glowing Vortex Rings -->
      <circle r="280" fill="none" stroke="url(#goldBorder)" stroke-width="3" stroke-dasharray="32 16" filter="url(#matGlow)"/>
      <circle r="230" fill="none" stroke="${color1}" stroke-width="2" stroke-opacity="0.8"/>
      <circle r="180" fill="none" stroke="${color3}" stroke-width="2.5" stroke-dasharray="8 8" filter="url(#matGlow)"/>

      <!-- Sacred Geometric Hexagram / Octagram -->
      <polygon points="0,-160 113,-113 160,0 113,113 0,160 -113,113 -160,0 -113,-113" fill="none" stroke="url(#goldBorder)" stroke-width="2.5"/>
      <circle r="110" fill="#040a1c" fill-opacity="0.85" stroke="${accent}" stroke-width="3" filter="url(#hyperGlow)"/>

      <!-- Inner Ani-Dimension Monogram -->
      <path d="M-45 40 L0 -50 L45 40 L22 40 L0 -6 L-22 40 Z" fill="url(#goldBorder)" filter="url(#matGlow)"/>
      <circle cx="0" cy="8" r="8" fill="#ffffff" filter="url(#hyperGlow)"/>
    </g>

    <!-- Top & Bottom Field Labels -->
    <g text-anchor="middle" font-family="'Orbitron', 'Cinzel', 'Segoe UI', sans-serif">
      <rect x="${W/2 - 200}" y="50" width="400" height="38" rx="19" fill="#030814" fill-opacity="0.9" stroke="url(#goldBorder)" stroke-width="1.8"/>
      <text x="${W/2}" y="75" fill="${accent}" font-size="15" font-weight="900" letter-spacing="4">ANI-DIMENSION DUEL ARENA</text>

      <rect x="${W/2 - 180}" y="${H - 85}" width="360" height="34" rx="17" fill="#030814" fill-opacity="0.9" stroke="${color1}" stroke-width="1.5"/>
      <text x="${W/2}" y="${H - 63}" fill="#ffffff" font-size="13" font-weight="700" letter-spacing="3">${code} • ${name.toUpperCase()}</text>
    </g>
  </svg>
  `;
}

async function buildAllCosmetics() {
  console.log("Iniciando generación de 20 Fundas y 20 Tapetes Holográficos...");

  // 1. GENERATE 20 SLEEVES
  const finalSleevesDB = [];
  for (let i = 0; i < sleevesData.length; i++) {
    const item = sleevesData[i];
    const fileName = `${item.code}.png`;
    const destPath = path.join(SLEEVES_DIR, fileName);

    // Keep existing SLV-001 digital art if present and only generate others, or generate crisp vector foil
    if (item.code === "SLV-001" && fs.existsSync(destPath)) {
      console.log(`Preservando SLV-001 (Dragon Blanco HD digital art existente).`);
    } else {
      const svg = generateSleeveSVG(item);
      await sharp(Buffer.from(svg))
        .png({ quality: 95, compressionLevel: 8 })
        .toFile(destPath);
      console.log(`Generada Funda: ${item.code} (${item.name}) -> ${fileName}`);
    }

    finalSleevesDB.push({
      code: item.code,
      name: item.name,
      description: item.desc,
      price: item.price,
      currency: item.currency,
      image: `/assets/images/sleeves/${fileName}`,
      offer_text: item.offer,
      active: true
    });
  }

  // 2. GENERATE 20 PLAYMATS
  const finalPlaymatsDB = [];
  for (let i = 0; i < playmatsData.length; i++) {
    const item = playmatsData[i];
    const fileName = `${item.code}.jpg`;
    const destPath = path.join(PLAYMATS_DIR, fileName);

    if (item.code === "MAT-001" && fs.existsSync(destPath)) {
      console.log(`Preservando MAT-001 (Tapete Dragon Blanco HD existente).`);
    } else {
      const svg = generatePlaymatSVG(item);
      await sharp(Buffer.from(svg))
        .jpeg({ quality: 92, mozjpeg: true })
        .toFile(destPath);
      console.log(`Generado Tapete: ${item.code} (${item.name}) -> ${fileName}`);
    }

    finalPlaymatsDB.push({
      code: item.code,
      name: item.name,
      description: item.desc,
      price: item.price,
      currency: item.currency,
      image: `/assets/images/playmats/${fileName}`,
      offer_text: item.offer,
      active: true
    });
  }

  // 3. WRITE DATABASES
  const sleevesDBPath = path.resolve(__dirname, '../backend/data/sleeves_db.json');
  const playmatsDBPath = path.resolve(__dirname, '../backend/data/playmats_db.json');

  fs.writeFileSync(sleevesDBPath, JSON.stringify(finalSleevesDB, null, 2), 'utf-8');
  fs.writeFileSync(playmatsDBPath, JSON.stringify(finalPlaymatsDB, null, 2), 'utf-8');

  console.log("¡Éxito! 20 Fundas y 20 Tapetes registrados exitosamente en la base de datos.");
}

buildAllCosmetics().catch(err => {
  console.error("Error generando cosméticos:", err);
});
