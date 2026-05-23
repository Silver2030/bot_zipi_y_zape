"use strict";

const TelegramBot = require("node-telegram-bot-api");
const express     = require("express");
const tg          = require("./telegram");
const { ALLOWED_CHATS, getChatConfig } = require("./config");
const { t, resolveCmd } = require("./i18n");

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("TELEGRAM_BOT_TOKEN no definido");

const bot = new TelegramBot(token, { polling: true });
tg.init(bot);

// ─── Comandos por scope (un set por canal) ────────────────────────────────────
const COMMANDS = {
  es: [
    { command: "help",          description: "Muestra todos los comandos disponibles" },
    { command: "all",           description: "Menciona a todo el grupo" },
    { command: "produccion",    description: "Ranking de productividad" },
    { command: "buscar",        description: "Busca usuarios, países, MUs..." },
    { command: "hambre",        description: "<enlace_guerra> <mensaje>" },
    { command: "jugadorespais", description: "<enlace_pais/id_pais>" },
    { command: "jugadoresmu",   description: "<enlace_mu/id_mu>" },
    { command: "paisesdanyo",   description: "<enlace_pais/id_pais> <comida>" },
    { command: "mudanyo",       description: "<enlace_mu/id_mu> <comida>" },
    { command: "danyosemanal",  description: "Ranking de daño de la semana" },
    { command: "dineropais",    description: "<enlace_pais/id_pais>" },
    { command: "dineromu",      description: "<enlace_mu/id_mu>" },
    { command: "duracion",      description: "<enlace_batalla/id_batalla>" },
    { command: "perfil",        description: "<enlace_usuario/id_usuario>" },
    { command: "guerra",        description: "<enlace_batalla/id_batalla>" },
    { command: "mercado",       description: "<nombre_item>" },
    { command: "eventos",       description: "Últimos eventos del juego" },
    { command: "ranking",       description: "<danyo/wealth/nivel/pais>" },
    { command: "gastos",        description: "<enlace_batalla/id_batalla>" },
  ],
  ru: [
    { command: "help",          description: "Показать все доступные команды" },
    { command: "vse",           description: "Упомянуть всю группу" },
    { command: "proizvodstvo",  description: "Рейтинг производительности" },
    { command: "poisk",         description: "Поиск игроков, стран, ВЕ..." },
    { command: "golod",         description: "<ссылка_битвы> <сообщение>" },
    { command: "igroki",        description: "<ссылка_страны/id_страны>" },
    { command: "igrokilmu",     description: "<ссылка_ве/id_ве>" },
    { command: "uronstrana",    description: "<ссылка_страны/id_страны> <еда>" },
    { command: "uronmu",        description: "<ссылка_ве/id_ве> <еда>" },
    { command: "uronnedeli",    description: "Рейтинг урона за неделю" },
    { command: "dengistrana",   description: "<ссылка_страны/id_страны>" },
    { command: "dengimu",       description: "<ссылка_ве/id_ве>" },
    { command: "vremya",        description: "<ссылка_битвы/id_битвы>" },
    { command: "profil",        description: "<ссылка_игрока/id_игрока>" },
    { command: "bitva",         description: "<ссылка_битвы/id_битвы>" },
    { command: "rynok",         description: "<название_товара>" },
    { command: "sobytiya",      description: "Последние события игры" },
    { command: "reiting",       description: "<danyo/wealth/nivel/pais>" },
    { command: "gastos",        description: "<ссылка_битвы/id_битвы>" },
  ],
};

async function registerCommands() {
  const { CHATS } = require("./config");

  for (const [chatId, config] of Object.entries(CHATS)) {
    const commands = COMMANDS[config.lang] ?? COMMANDS.es;
    try {
      await bot.setMyCommands(commands, {
        scope: { type: "chat", chat_id: Number(chatId) },
      });
      console.log(`✅ Comandos registrados para chat ${chatId} (${config.lang})`);
    } catch (err) {
      console.error(`❌ Error registrando comandos para chat ${chatId}:`, err?.message);
    }
  }
}

registerCommands();

// ─── Handlers ─────────────────────────────────────────────────────────────────
const handlers = {
  ...require("./commands/misc"),
  ...require("./commands/jugadores"),
  ...require("./commands/danyo"),
  ...require("./commands/dinero"),
  ...require("./commands/batalla"),
  ...require("./commands/produccion"),
  ...require("./commands/perfil"),
  ...require("./commands/guerra"),
  ...require("./commands/mercado"),
  ...require("./commands/eventos"),
  ...require("./commands/ranking"),
  ...require("./commands/gastos"),
};

// ─── Mutex por chat para comandos pesados ─────────────────────────────────────
// Evita que dos ejecuciones paralelas del mismo comando en el mismo chat
// saturen la API o envíen mensajes duplicados.
const HEAVY_COMMANDS = new Set([
  "jugadorespais", "jugadoresmu",
  "paisesdanyo",   "mudanyo",
  "dineropais",    "dineromu",
  "gastos",
]);

const chatLocks = new Map(); // chatId → Set de handlers en ejecución

function isLocked(chatId, handlerName) {
  return chatLocks.get(chatId)?.has(handlerName) ?? false;
}

function lock(chatId, handlerName) {
  if (!chatLocks.has(chatId)) chatLocks.set(chatId, new Set());
  chatLocks.get(chatId).add(handlerName);
}

function unlock(chatId, handlerName) {
  chatLocks.get(chatId)?.delete(handlerName);
}

// ─── Listener principal ───────────────────────────────────────────────────────
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text   = msg.text;
  const from   = msg.from ? `${msg.from.username || msg.from.first_name} (${msg.from.id})` : "Unknown";

  console.log(`[${new Date().toISOString()}] ${from} → chat ${chatId}: ${text ?? "(no text)"}`);

  // Easter egg
  if (text) {
    const palabras = text.toLowerCase().split(/\s+/);
    if (["otto", "oto", "oton", "otón"].some((v) => palabras.includes(v))) {
      tg.sendMessage(chatId, "Putero");
    }
  }

  if (msg.from?.id === 5072276449 && Math.random() < 0.5) {
    tg.sendMessage(chatId, "@Dopillo fetichista de pies");
  }
  if (msg.from?.id === 5969574492 && Math.random() < 0.5) {
    tg.sendMessage(chatId, "@lodensy peruano tiraflechas quitale la proteccion al maricon");
  }

  if (!text?.startsWith("/")) return;

  if (!getChatConfig(chatId)) {
    tg.sendMessage(chatId, t(chatId, "bot_not_authorized"));
    return;
  }

  const [cmdRaw, ...args] = text.slice(1).split(" ");
  const cmdLower    = cmdRaw.split("@")[0].toLowerCase();
  const handlerName = resolveCmd(chatId, cmdLower);

  if (!handlerName || !handlers[handlerName]) return;

  // Mutex para comandos pesados
  if (HEAVY_COMMANDS.has(handlerName)) {
    if (isLocked(chatId, handlerName)) {
      await tg.sendMessage(chatId, t(chatId, "cmd_already_running"));
      return;
    }
    lock(chatId, handlerName);
    try {
      await handlers[handlerName](chatId, args);
    } finally {
      unlock(chatId, handlerName);
    }
  } else {
    await handlers[handlerName](chatId, args);
  }
});

// ─── Express ──────────────────────────────────────────────────────────────────
const app  = express();
app.get("/", (_, res) => res.send("Bot activo"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));