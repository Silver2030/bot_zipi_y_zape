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
};

// ─── Mutex por chat para comandos pesados ─────────────────────────────────────
// Evita que dos ejecuciones paralelas del mismo comando en el mismo chat
// saturen la API o envíen mensajes duplicados.
const HEAVY_COMMANDS = new Set([
  "jugadorespais", "jugadoresmu",
  "paisesdanyo",   "mudanyo",
  "dineropais",    "dineromu",
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
