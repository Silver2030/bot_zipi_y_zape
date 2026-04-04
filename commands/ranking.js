"use strict";

const tg = require("../telegram");
const { t } = require("../i18n");
const { apiCall, getAllCountries } = require("../api");
const { fetchUsersLite } = require("../fetchers");
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

    const top10 = items.slice(0, 10);
    const esCountry = config.key === "weeklyCountryDamages";

    // Resolver nombres
    let nombreMap = new Map();
    if (esCountry) {
      const countries = await getAllCountries();
      countries.forEach((c) => nombreMap.set(c._id, c.name));
    } else {
      const userIds  = top10.map((x) => x.user).filter(Boolean);
      const usersData = await fetchUsersLite(userIds, { batchSize: 30 });
      userIds.forEach((id, idx) => { if (usersData[idx]) nombreMap.set(id, usersData[idx].username); });
    }

    let msg = `*${escapeMarkdownV2(config.label)}*\n\n`;
    top10.forEach((item, i) => {
      const id     = esCountry ? item.country : item.user;
      const nombre = escapeMarkdownV2(nombreMap.get(id) ?? "?");
      const valor  = formatNumberMarkdown(item.value ?? 0);
      msg += `${i + 1}\\. ${nombre}: ${valor}\n`;
    });

    await tg.sendMessage(chatId, msg, { parse_mode: "MarkdownV2" });

  } catch (err) {
    console.error("ranking error:", err);
    await tg.sendMessage(chatId, t(chatId, "error_generic"));
  }
}

module.exports = { ranking };
