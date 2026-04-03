"use strict";

const tg = require("../telegram");
const { t } = require("../i18n");
const { apiCall } = require("../api");
const { formatDateShort } = require("../utils");

const EMOJIS = {
  warDeclared:                "⚔️",
  battleOpened:               "🔥",
  battleEnded:                "🏁",
  peace_agreement:            "🕊️",
  peaceMade:                  "🕊️",
  newPresident:               "👑",
  regionTransfer:             "🗺️",
  regionLiberated:            "🗺️",
  countryMoneyTransfer:       "💸",
  depositDiscovered:          "⛏️",
  depositDepleted:            "⛏️",
  systemRevolt:               "🔥",
  bankruptcy:                 "💸",
  allianceFormed:             "🤝",
  allianceBroken:             "💔",
  strategicResourcesReshuffled:"🔄",
  resistanceIncreased:        "📈",
  resistanceDecreased:        "📉",
  revolutionStarted:          "🔥",
  revolutionEnded:            "🏁",
  financedRevolt:             "💰",
};

async function eventos(chatId, args) {
  // Argumento opcional: ID o enlace de país para filtrar
  const countryId = args[0] ? args[0].split("/").pop() : undefined;
  const limit     = 10;

  try {
    const params = { limit };
    if (countryId) params.countryId = countryId;

    const data = await apiCall("event.getEventsPaginated", params);
    const items = data?.items ?? [];

    if (!items.length) {
      await tg.sendMessage(chatId, t(chatId, "eventos_no_data"));
      return;
    }

    let msg = t(chatId, "eventos_header") + "\n";
    for (const ev of items) {
      const emoji = EMOJIS[ev.type] ?? "📌";
      const fecha = formatDateShort(ev.createdAt) ?? "";
      msg += `${emoji} \`${ev.type}\` — ${fecha}\n`;
    }

    await tg.sendMessage(chatId, msg, { parse_mode: "Markdown" });

  } catch (err) {
    console.error("eventos error:", err);
    await tg.sendMessage(chatId, t(chatId, "error_generic"));
  }
}

module.exports = { eventos };
