"use strict";

const tg = require("../telegram");
const { t } = require("../i18n");
const { getPrices, getAllCountries, getRegionsObject } = require("../api");
const { isRaw, calcProductivityForCountry, buildDepositsByCountry } = require("../game");
const { escapeMarkdownV2 } = require("../utils");
const { CONTROL_ITEMS, TRADUCCIONES, MATERIAS_PRIMAS, PRODUCTOS_MANUFACTURADOS } = require("../config");
const { formatDateShort } = require("../utils");

async function produccion(chatId) {
  try {
    const [prices, countriesArr, regionsObj] = await Promise.all([getPrices(), getAllCountries(), getRegionsObject()]);

    if (!prices || !countriesArr?.length || !regionsObj) {
      return tg.sendMessage(chatId, t(chatId, "produccion_no_data"));
    }

    const depositsByCountry = buildDepositsByCountry(regionsObj);
    const countries = countriesArr.filter((c) => c && c._id && c.name && c.code);

    const bestByItem = [];
    for (const item of CONTROL_ITEMS) {
      if (typeof prices[item] !== "number") continue;
      if (!isRaw(item) && !PRODUCTOS_MANUFACTURADOS[item]) continue;
      let best = null;
      for (const c of countries) {
        const r = calcProductivityForCountry(item, c, prices, depositsByCountry);
        if (!r) continue;
        if (!best || r.profitPerPP > best.profitPerPP) best = r;
      }
      if (best) bestByItem.push({ item, ...best });
    }

    if (!bestByItem.length) return tg.sendMessage(chatId, t(chatId, "produccion_no_results"));

    bestByItem.sort((a, b) => b.profitPerPP - a.profitPerPP);

    const fmt5 = (n) => (Math.round(n * 100000) / 100000).toFixed(5);

    let msg = t(chatId, "produccion_header");
    for (let i = 0; i < bestByItem.length; i++) {
      const x     = bestByItem[i];
      const name  = TRADUCCIONES[x.item] || x.item;
      const emoji = isRaw(x.item) ? "⛏️" : "🏭";
      msg += `${escapeMarkdownV2(`${i + 1}. ${emoji} ${name}: ${fmt5(x.profitPerPP)} monedas/pp · ${x.countryName}`)}\n`;
      if (x.depositBonus && x.depositEnd && x.depositRegionName) {
        msg += `${escapeMarkdownV2(`${formatDateShort(x.depositEnd)} · ${x.depositRegionName}`)}\n`;
      }
    }

    await tg.sendMessage(chatId, msg, { parse_mode: "MarkdownV2", disable_web_page_preview: true });

  } catch (err) {
    console.error("produccion error:", err);
    await tg.sendMessage(chatId, t(chatId, "error_generic"));
  }
}

module.exports = { produccion };
