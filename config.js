"use strict";

// ─── Configuración por canal ──────────────────────────────────────────────────
const CHATS = {
  [-1003341630162]: {
    lang: "es",
    usuarios: [
      { userId: "686f9befee16d37c418cd087", mention: "@SilverFRE" },
      { userId: "686eefe3ee16d37c417a0e59", mention: "@lodensy" },
      { userId: "68386302a484755f062b16a8", mention: "@GaryRr" },
      { userId: "68703ddf37ff51dd0dc590d0", mention: "@TowDl" },
      { userId: "68f8f5ad5dc34ed689e1784c", mention: "@maromaromero" },
      { userId: "686bca33b7dc5cb1d7710a47", mention: "@BZ_033" },
      { userId: "68979dcdd2bf43cdb31abb9f", mention: "@XBrotherX" },
      { userId: "69264c4ccc751d7f45f2f8f4", mention: "@Kaiado" },
    ],
  },
  [-1003246477704]: {
    lang: "es",
    usuarios: [
      { userId: "686f9befee16d37c418cd087", mention: "@SilverFRE" },
    ],
  },
  [696082291]: {
    lang: "ru",
    usuarios: [
      { userId: "686f9befee16d37c418cd087", mention: "@SilverFRE" },
    ],
  },
  // Canal ruso — descomenta cuando tengas el chatId:
  // [-1001234567890]: {
  //   lang: "ru",
  //   usuarios: [
  //     { userId: "XXXXXXXXXXXXXXXXXXXXXXXX", mention: "@usuario_ru" },
  //   ],
  // },
};

const ALLOWED_CHATS = Object.keys(CHATS).map(Number);

function getChatConfig(chatId)   { return CHATS[chatId] ?? null; }
function getChatLang(chatId)     { return CHATS[chatId]?.lang ?? "es"; }
function getChatUsuarios(chatId) { return CHATS[chatId]?.usuarios ?? []; }

// ─── Mecánicas del juego ─────────────────────────────────────────────────────
const HEAL_FOOD_MAP = { PAN: 10, FILETE: 20, PESCADO: 30 };
const SKILL_COSTS   = [0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55];
const PVP_SKILLS    = ["health","hunger","attack","criticalChance","criticalDamages","armor","precision","dodge"];
const ECO_SKILLS    = ["energy","companies","entrepreneurship","production","lootChance"];

// ─── Items de producción ─────────────────────────────────────────────────────
const CONTROL_ITEMS = [
  "cookedFish","heavyAmmo","steel","bread","grain","limestone","coca",
  "concrete","oil","lightAmmo","steak","livestock","cocain","lead",
  "fish","petroleum","ammo","iron",
];

const TRADUCCIONES = {
  grain: "Granos", livestock: "Ganado", limestone: "Caliza",
  coca: "Plantas", lead: "Plomo", petroleum: "Petróleo",
  iron: "Hierro", fish: "Pescado", cookedFish: "Pescado Cocido",
  heavyAmmo: "Munición Pesada", steel: "Acero", bread: "Pan",
  concrete: "Hormigón", oil: "Aceite", lightAmmo: "Munición Ligera",
  steak: "Filete", cocain: "Pastilla", ammo: "Munición",
};

const MATERIAS_PRIMAS = {
  grain:{pp:1}, livestock:{pp:20}, limestone:{pp:1}, coca:{pp:1},
  lead:{pp:1},  petroleum:{pp:1},  iron:{pp:1},      fish:{pp:40},
};

const PRODUCTOS_MANUFACTURADOS = {
  cookedFish:{ materias:{fish:1},       pp:40  },
  heavyAmmo: { materias:{lead:16},      pp:16  },
  steel:     { materias:{iron:10},      pp:10  },
  bread:     { materias:{grain:10},     pp:10  },
  concrete:  { materias:{limestone:10}, pp:10  },
  oil:       { materias:{petroleum:1},  pp:1   },
  lightAmmo: { materias:{lead:1},       pp:1   },
  steak:     { materias:{livestock:1},  pp:20  },
  cocain:    { materias:{coca:200},     pp:200 },
  ammo:      { materias:{lead:4},       pp:4   },
};

// ─── API ─────────────────────────────────────────────────────────────────────
const TRPC_BASE = "https://api2.warera.io/trpc";

// ─── Configuración de comandos ────────────────────────────────────────────────
const DINERO_ENVIAR_EN_CHAT = true;
const DINERO_CHUNK_DELAY_MS = 900;
const DANYO_CHUNK_SIZE      = 10;
const JUGADORES_CHUNK_SIZE  = 50;

// ─── Un único module.exports ──────────────────────────────────────────────────
module.exports = {
  CHATS, ALLOWED_CHATS,
  getChatConfig, getChatLang, getChatUsuarios,
  HEAL_FOOD_MAP, SKILL_COSTS, PVP_SKILLS, ECO_SKILLS,
  CONTROL_ITEMS, TRADUCCIONES, MATERIAS_PRIMAS, PRODUCTOS_MANUFACTURADOS,
  TRPC_BASE,
  DINERO_ENVIAR_EN_CHAT, DINERO_CHUNK_DELAY_MS,
  DANYO_CHUNK_SIZE, JUGADORES_CHUNK_SIZE,
};