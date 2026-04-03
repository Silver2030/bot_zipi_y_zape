"use strict";

const TelegramBot = require("node-telegram-bot-api");
const express     = require("express");
const tg          = require("./telegram");
const { ALLOWED_CHATS, getChatConfig } = require("./config");
const { t, resolveCmd } = require("./i18n");

// ─── Bot ──────────────────────────────────────────────────────────────────────
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
};

// ─── Listener principal ───────────────────────────────────────────────────────
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text   = msg.text;
  const from   = msg.from ? `${msg.from.username || msg.from.first_name} (${msg.from.id})` : "Unknown";

  console.log(`[${new Date().toISOString()}] ${from} → chat ${chatId}: ${text ?? "(no text)"}`);

  // Easter egg independiente del idioma
  if (text) {
    const palabras = text.toLowerCase().split(/\s+/);
    if (["otto", "oto", "oton", "otón"].some((v) => palabras.includes(v))) {
      tg.sendMessage(chatId, "Putero");
    }
  }

  if (!text?.startsWith("/")) return;

  // Verificar que el chat está autorizado
  if (!getChatConfig(chatId)) {
    tg.sendMessage(chatId, t(chatId, "bot_not_authorized"));
    return;
  }

  // Extraer comando raw (sin /, sin @bot, en minúsculas)
  const [cmdRaw, ...args] = text.slice(1).split(" ");
  const cmdLower = cmdRaw.split("@")[0].toLowerCase();

  // Resolver alias → nombre interno del handler
  const handlerName = resolveCmd(chatId, cmdLower);
  if (handlerName && handlers[handlerName]) {
    await handlers[handlerName](chatId, args);
  }
});

// ─── Express (Railway necesita un puerto abierto) ─────────────────────────────
const app  = express();
app.get("/", (_, res) => res.send("Bot activo"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));