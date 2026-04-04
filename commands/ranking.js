"use strict";

const tg = require("../telegram");
const { t } = require("../i18n");
const { apiCall } = require("../api");
const { escapeMarkdownV2, formatNumberMarkdown } = require("../utils");

const TIPOS_VALIDOS = {
  danyo:    { key: "weeklyUserDamages",    label: "⚔️ Daño semanal" },
  daño:     { key: "weeklyUserDamages",    label: "⚔️ Daño semanal" },
  semanal:  { key: "weeklyUserDamages",    label: "⚔️ Daño semanal" },
  total:    { key: "userDamages",          label: "⚔️ Daño total" },
  wealth:   { key: "userWealth",           label: "💰 Riqueza" },
  riqueza:  { key: "userWealth",           label: "💰 Riqueza" },
  nivel:    { key: "userLevel",            label: "📈 Nivel" },
  level:    { key: "userLevel",            label: "📈 Nivel" },
  pais:     { key: "weeklyCountryDamages", label: "🌍 Daño semanal por país" },
  country:  { key: "weeklyCountryDamages", label: "🌍 Daño semanal por país" },
};

async function ranking(chatId, args) {
  const tipoArg = (args[0] ?? "danyo").toLowerCase();
  const config  = TIPOS_VALIDOS[tipoArg];

  if (!config) {
    const tipos = Object.keys(TIPOS_VALIDOS).filter((_, i) => i % 2 === 0).join(", ");
    await tg.sendMessage(chatId, t(chatId, "ranking_usage", tipos));
    return;
  }

  try {
    const data  = await apiCall("ranking.getRanking", { rankingType: config.key });
    const items = data?.items ?? data ?? [];

    if (!items.length) { await tg.sendMessage(chatId, t(chatId, "no_results")); return; }

    console.log("[ranking] primer item:", JSON.stringify(items[0], null, 2));

    const top10 = items.slice(0, 10);
    let msg = `*${escapeMarkdownV2(config.label)}*\n\n`;
    top10.forEach((item, i) => {
      const nombre = escapeMarkdownV2(item.username ?? item.name ?? item.countryName ?? "?");
      const valor  = formatNumberMarkdown(item.value ?? item.damage ?? 0);
      msg += `${i + 1}\\. ${nombre}: ${valor}\n`;
    });

    await tg.sendMessage(chatId, msg, { parse_mode: "MarkdownV2" });

  } catch (err) {
    console.error("ranking error:", err);
    await tg.sendMessage(chatId, t(chatId, "error_generic"));
  }
}

module.exports = { ranking };
