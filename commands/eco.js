"use strict";

const tg = require("../telegram");
const { getUserData, getPrices, getAllCountries, getRegionsObject } = require("../api");
const { isRaw, calcProductivityForCountry, buildDepositsByCountry } = require("../game");
const { findTopEcoBuilds } = require("../ecoOptimizer");
const { formatNumber, escapeMdV1 } = require("../utils");
const { CONTROL_ITEMS, PRODUCTOS_MANUFACTURADOS } = require("../config");

function extractUserId(arg) {
  return arg.split("/").pop();
}

function isPureNumber(arg) {
  return /^\d+$/.test(arg);
}

async function fetchGpo() {
  const [prices, countriesArr, regionsObj] = await Promise.all([
    getPrices(), getAllCountries(), getRegionsObject(),
  ]);
  if (!prices || !countriesArr?.length || !regionsObj) return null;

  const depositsByCountry = buildDepositsByCountry(regionsObj);
  const countries = countriesArr.filter((c) => c && c._id && c.name && c.code);

  let bestGpo = null;
  for (const item of CONTROL_ITEMS) {
    if (typeof prices[item] !== "number") continue;
    if (!isRaw(item) && !PRODUCTOS_MANUFACTURADOS[item]) continue;
    for (const c of countries) {
      const r = calcProductivityForCountry(item, c, prices, depositsByCountry);
      if (!r || r.depositBonus > 0) continue;
      if (!bestGpo || r.profitPerPP > bestGpo) bestGpo = r.profitPerPP;
    }
  }
  return bestGpo;
}

async function buildeco(chatId, args) {
  if (!args.length) {
    await tg.sendMessage(
      chatId,
      "Uso:\n" +
      "• Con perfil: `/buildeco <url_o_id> <company_level> <gps> [empresas]`\n" +
      "• Sin perfil: `/buildeco <sp> <company_level> <gps> [empresas]`\n\n" +
      "`company_level`: nivel de fábrica (1-7)\n" +
      "`gps`: oro por unidad de producción al trabajar en fab. ajena\n" +
      "`empresas`: filtro opcional, número exacto de fábricas (2-12)",
      { parse_mode: "Markdown" }
    );
    return;
  }

  // ── Determinar modo ────────────────────────────────────────────────────────
  let noIdMode = false;
  let userId   = null;
  let customSP = null;

  if (isPureNumber(args[0])) {
    noIdMode = true;
    customSP = parseInt(args[0], 10);
    if (customSP <= 0 || customSP > 440) {
      await tg.sendMessage(chatId, "Los SP deben estar entre 1 y 440.");
      return;
    }
  } else {
    userId = extractUserId(args[0]);
  }

  // ── Parsear números restantes ──────────────────────────────────────────────
  const nums = [];
  for (let i = 1; i < args.length; i++) {
    const norm = args[i].replace(",", ".");
    if (/^\d+(\.\d+)?$/.test(norm)) nums.push(parseFloat(norm));
  }

  let companyLevel   = null;
  let gps            = null;
  let empresasFilter = null;

  if (noIdMode) {
    // nums: company_level  gps  [empresas]
    if (nums.length < 2) {
      await tg.sendMessage(chatId, "Indica company_level y gps. Ej: `/buildeco 172 6 0.128`", { parse_mode: "Markdown" });
      return;
    }
    companyLevel = Math.round(nums[0]);
    gps          = nums[1];
    if (nums.length >= 3) empresasFilter = Math.round(nums[2]);
  } else {
    // ID mode: if first number > 7, treat as SP override → sp company_level gps [empresas]
    //          otherwise → company_level gps [empresas]
    if (nums.length < 2) {
      await tg.sendMessage(chatId, "Indica company_level y gps. Ej: `/buildeco <url> 6 0.128`", { parse_mode: "Markdown" });
      return;
    }
    if (nums[0] > 7) {
      customSP     = Math.round(nums[0]);
      companyLevel = Math.round(nums[1]);
      gps          = nums[2] ?? null;
      if (nums.length >= 4) empresasFilter = Math.round(nums[3]);
    } else {
      companyLevel = Math.round(nums[0]);
      gps          = nums[1];
      if (nums.length >= 3) empresasFilter = Math.round(nums[2]);
    }
  }

  if (!gps && gps !== 0) {
    await tg.sendMessage(chatId, "Falta el parámetro gps.");
    return;
  }
  if (companyLevel < 1 || companyLevel > 7) {
    await tg.sendMessage(chatId, "El company_level debe ser entre 1 y 7.");
    return;
  }
  if (empresasFilter !== null && (empresasFilter < 2 || empresasFilter > 12)) {
    await tg.sendMessage(chatId, "El filtro de empresas debe estar entre 2 y 12.");
    return;
  }

  // ── Obtener datos ──────────────────────────────────────────────────────────
  const [userData, gpo] = await Promise.all([
    noIdMode ? Promise.resolve(null) : getUserData(userId).catch(() => null),
    fetchGpo(),
  ]);

  if (!noIdMode && !userData) {
    await tg.sendMessage(chatId, "No se encontró el usuario.");
    return;
  }
  if (!gpo) {
    await tg.sendMessage(chatId, "No se pudo obtener el gpo desde /produccion.");
    return;
  }

  const totalSP = noIdMode ? customSP : userData.leveling?.totalSkillPoints;
  if (!totalSP) {
    await tg.sendMessage(chatId, "No se pudieron leer los skill points del usuario.");
    return;
  }

  const sp       = (!noIdMode && customSP) ? customSP : totalSP;
  const effSP    = Math.min(sp, 4 * 55);
  const spCapped = effSP < sp;

  const cfg = { totalSkillPoints: effSP, companyLevel, gpo, gps, empresasFilter };

  // ── Mensaje de inicio ──────────────────────────────────────────────────────
  const username     = noIdMode ? `${sp} SP` : escapeMdV1(userData.username ?? userId);
  const spLabel      = noIdMode ? `${sp} SP`
                     : (customSP ? `${sp} SP (custom)` : `${sp} SP (total)`);
  const capNote      = spCapped ? ` → usando ${effSP} SP (máx eco)` : "";
  const empresasNote = empresasFilter !== null ? `, filtro ${empresasFilter} fábs` : "";

  await tg.sendMessage(
    chatId,
    `🏭 Calculando eco builds para *${username}* — ${spLabel}${capNote}, fab. nv${companyLevel}, gps ${gps}, gpo ${gpo.toFixed(5)} (auto)${empresasNote}...`,
    { parse_mode: "Markdown" }
  );

  // ── Calcular y mostrar ─────────────────────────────────────────────────────
  const topBuilds = findTopEcoBuilds(cfg, 1);

  if (!topBuilds.length) {
    await tg.sendMessage(chatId, "No se encontraron builds válidas. Prueba con otros parámetros.");
    return;
  }

  const b   = topBuilds[0];
  const fmt = (n) => formatNumber(+n.toFixed(2));
  let msg   = `🏆 *Mejor build eco*\n`;
  msg += `💰 Oro/día: *${fmt(b.goldPerDay)} g*\n`;
  msg += `  📦 Pasivo ${fmt(b.goldPasiva)} | 🔨 Propio ${fmt(b.goldPropio)} | 👷 Ajeno ${fmt(b.goldAjeno)}\n`;
  msg += `\n`;
  msg += `⚡ Energía *${b.energia}*  🏭 Empresas *${b.empresas}*\n`;
  msg += `⚙️ Producción *${b.produccion}*  💡 Emprendimiento *${b.emprendimiento}*\n`;
  msg += `💎 SP: *${b.sp}*`;
  await tg.sendMessage(chatId, msg, { parse_mode: "Markdown" });
}

module.exports = { buildeco };
