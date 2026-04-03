"use strict";

// ─── Configuración por canal ──────────────────────────────────────────────────
// Cada entrada define el idioma y los usuarios de ese chat.
// Para añadir un canal nuevo: añade una entrada con su chatId real.
//
// lang:     código de idioma → debe existir en i18n/es.js, i18n/ru.js, etc.
// usuarios: lista de jugadores de ese canal (userId de WarEra + mention de Telegram)

const CHATS = {
  // Canal hispano principal
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

  // Canal de pruebas (español)
  [-1003246477704]: {
    lang: "es",
    usuarios: [
      { userId: "686f9befee16d37c418cd087", mention: "@SilverFRE" },
    ],
  },

  // Chat privado del admin
  [696082291]: {
    lang: "es",
    usuarios: [
      { userId: "686f9befee16d37c418cd087", mention: "@SilverFRE" },
    ],
  },

  // ── Canal ruso (rellena los datos cuando lo tengas) ──────────────────────
  // [-1001234567890]: {
  //   lang: "ru",
  //   usuarios: [
  //     { userId: "XXXXXXXXXXXXXXXXXXXXXXXX", mention: "@usuario_ru" },
  //   ],
  // },
};

// IDs permitidos (se calculan automáticamente a partir de CHATS)
const ALLOWED_CHATS = Object.keys(CHATS).map(Number);

function getChatConfig(chatId) { return CHATS[chatId] ?? null; }
function getChatLang(chatId)   { return CHATS[chatId]?.lang ?? "es"; }
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

const TRPC_BASE = "https://api2.warera.io/trpc";

module.exports = {
  CHATS, ALLOWED_CHATS,
  getChatConfig, getChatLang, getChatUsuarios,
  HEAL_FOOD_MAP, SKILL_COSTS, PVP_SKILLS, ECO_SKILLS,
  CONTROL_ITEMS, MATERIAS_PRIMAS, PRODUCTOS_MANUFACTURADOS,
  TRPC_BASE,
};

// ─── Configuración de comandos ────────────────────────────────────────────────
const DINERO_ENVIAR_EN_CHAT = true;   // si false, solo manda el Excel
const DINERO_CHUNK_DELAY_MS = 900;    // ms entre chunks de la lista de jugadores
const DANYO_CHUNK_SIZE      = 10;     // jugadores por mensaje en /paisesDanyo
const JUGADORES_CHUNK_SIZE  = 50;     // jugadores por mensaje en /jugadoresPais

module.exports = {
  ...module.exports,
  DINERO_ENVIAR_EN_CHAT,
  DINERO_CHUNK_DELAY_MS,
  DANYO_CHUNK_SIZE,
  JUGADORES_CHUNK_SIZE,
};
