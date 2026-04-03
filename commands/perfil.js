"use strict";

const tg = require("../telegram");
const { t } = require("../i18n");
const { apiCall } = require("../api");
const { analizarBuild, calcularDanyo } = require("../game");
const { formatNumber, escapeMarkdownV2 } = require("../utils");
const { HEAL_FOOD_MAP } = require("../config");

async function perfil(chatId, args) {
  if (!args.length) {
    await tg.sendMessage(chatId, t(chatId, "perfil_usage"), { disable_web_page_preview: true });
    return;
  }

  const userId = args[0].split("/").pop();

  try {
    const userData = await apiCall("user.getUserLite", { userId });
    if (!userData) { await tg.sendMessage(chatId, t(chatId, "perfil_not_found")); return; }

    const { build, nivel }      = analizarBuild(userData);
    const weeklyDmg             = userData.rankings?.weeklyUserDamages?.value ?? 0;
    const totalDmg              = userData.rankings?.userDamages?.value ?? 0;
    const wealth                = userData.rankings?.userWealth?.value ?? 0;
    const buffs                 = userData.buffs;
    const tienePastilla         = buffs?.buffCodes?.length > 0;
    const tieneDebuff           = buffs?.debuffCodes?.length > 0;

    // Daño con PESCADO como referencia
    const { danyoActual } = calcularDanyo(userData, HEAL_FOOD_MAP.PESCADO);

    const buildEmoji = { PVP: "⚔️", HIBRIDA: "🎯", ECO: "💰" }[build] ?? "❓";
    let pastillaStr = "—";
    if (tienePastilla) pastillaStr = `💊 activa hasta ${new Date(buffs.buffEndAt).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}`;
    else if (tieneDebuff) pastillaStr = `⛔ debuff hasta ${new Date(buffs.debuffEndAt).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}`;

    const msg = t(chatId, "perfil_resumen", {
      username:    userData.username,
      userId,
      nivel,
      build:       `${buildEmoji} ${build}`,
      weeklyDmg:   formatNumber(weeklyDmg),
      totalDmg:    formatNumber(totalDmg),
      danyoActual: formatNumber(Math.round(danyoActual)),
      wealth:      formatNumber(wealth),
      pastilla:    pastillaStr,
    });

    await tg.sendMessage(chatId, msg, { parse_mode: "Markdown", disable_web_page_preview: true });

  } catch (err) {
    console.error("perfil error:", err);
    await tg.sendMessage(chatId, t(chatId, "error_generic"));
  }
}

module.exports = { perfil };
