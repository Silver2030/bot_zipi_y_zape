"use strict";

const tg = require("../telegram");
const { getUserData, getPrices } = require("../api");
const { findTopBuilds } = require("../buildOptimizer");
const { formatNumber, escapeMdV1 } = require("../utils");

function extractUserId(arg) {
  return arg.split("/").pop();
}

function equipBonus(skill) {
  if (!skill) return 0;
  return (skill.weapon ?? 0) + (skill.equipment ?? 0) + (skill.overflow ?? 0) + (skill.limited ?? 0);
}

const BULLET_MULT    = { green: 1.1,         blue: 1.2,   purple: 1.4        };
const BULLET_TO_ITEM = { green: "lightAmmo",  blue: "ammo", purple: "heavyAmmo" };

// Returns true if the arg looks like a raw SP number (not a URL or userId)
function isPureNumber(arg) {
  return /^\d+$/.test(arg);
}

async function buildpvp(chatId, args) {
  if (!args.length) {
    await tg.sendMessage(
      chatId,
      "Uso:\n" +
      "• Con perfil: `/buildpvp <url_o_id> [sp] [green|blue|purple] [arma g1 g2 g3 g4 g5]`\n" +
      "• Sin perfil: `/buildpvp <sp> [green|blue|purple] [arma g1 g2 g3 g4 g5]`",
      { parse_mode: "Markdown" }
    );
    return;
  }

  // ── Determinar modo: con o sin perfil ──────────────────────────────────────
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

  // ── Parsear args restantes ─────────────────────────────────────────────────
  let bulletKey  = null;
  let weaponCost = 0;
  let gearCosts  = [0, 0, 0, 0, 0];
  const nums = [];

  for (let i = 1; i < args.length; i++) {
    const lower = args[i].toLowerCase();
    if (BULLET_MULT[lower]) {
      bulletKey = lower;
    } else {
      const normalized = args[i].replace(",", ".");
      if (/^\d+(\.\d+)?$/.test(normalized)) nums.push(parseFloat(normalized));
    }
  }

  // 6 números → arma + 5 piezas de equipo
  // 7 números (modo con perfil) → SP + arma + 5 piezas
  // 1 número (modo con perfil)  → SP
  if (!noIdMode) {
    if (nums.length >= 7) {
      customSP   = nums[0];
      weaponCost = nums[1];
      gearCosts  = nums.slice(2, 7);
    } else if (nums.length === 6) {
      weaponCost = nums[0];
      gearCosts  = nums.slice(1, 6);
    } else if (nums.length === 1) {
      customSP = nums[0];
    }
  } else {
    if (nums.length >= 6) {
      weaponCost = nums[0];
      gearCosts  = nums.slice(1, 6);
    }
  }

  // ── Obtener datos ──────────────────────────────────────────────────────────
  const [userData, prices] = await Promise.all([
    noIdMode ? Promise.resolve(null) : getUserData(userId).catch(() => null),
    getPrices().catch(() => ({})),
  ]);

  if (!noIdMode && !userData) {
    await tg.sendMessage(chatId, "No se encontró el usuario.");
    return;
  }

  const totalSP = noIdMode ? customSP : (userData.leveling?.totalSkillPoints);
  if (!totalSP) {
    await tg.sendMessage(chatId, "No se pudieron leer los skill points del usuario.");
    return;
  }

  const sp = (!noIdMode && customSP) ? customSP : totalSP;
  if (sp > 440) {
    await tg.sendMessage(chatId, "Los SP máximos posibles en PVP son 440 (8 stats × nivel 10).");
    return;
  }

  // ── Construir cfg ──────────────────────────────────────────────────────────
  const sk        = userData?.skills ?? {};
  const weaponDmg = sk.attack?.weapon ?? 0;

  const ammoItem      = bulletKey ? BULLET_TO_ITEM[bulletKey] : null;
  const ammoPrice     = ammoItem ? (prices[ammoItem] ?? 0) : 0;
  const fishPrice     = prices["fish"] ?? 0;
  const totalGearCost = gearCosts.reduce((a, b) => a + b, 0);

  const cfg = {
    totalSkillPoints: sp,
    weaponDamage:     weaponDmg,
    rankMult:         1 + (sk.attack?.militaryRankPercent ?? 0) / 100,
    bulletMult:       BULLET_MULT[bulletKey] ?? 1,
    eqPrecision:      equipBonus(sk.precision)       / 100,
    eqCritChance:     equipBonus(sk.criticalChance)  / 100,
    eqCritDamage:     equipBonus(sk.criticalDamages) / 100,
    eqArmorPts:       equipBonus(sk.armor),
    eqDodgePts:       equipBonus(sk.dodge),
    ammoPrice,
    fishPrice,
    weaponCost,
    totalGearCost,
  };

  // ── Mensaje de inicio ──────────────────────────────────────────────────────
  const username  = noIdMode ? `${sp} SP` : escapeMdV1(userData.username ?? userId);
  const spLabel   = noIdMode ? `${sp} SP`
                  : (customSP ? `${sp} SP (custom)` : `${sp} SP (total del personaje)`);
  const bulletStr = bulletKey ? `, bala ${bulletKey} (${formatNumber(ammoPrice)} g/u)` : "";
  const fishStr   = fishPrice ? `, fish ${formatNumber(fishPrice)} g/u` : "";
  const costsStr  = weaponCost
    ? `, arma ${formatNumber(weaponCost)} g | equipo ${gearCosts.map(formatNumber).join("+")} g`
    : "";

  await tg.sendMessage(
    chatId,
    `🔍 Calculando builds para *${username}* — ${spLabel}${bulletStr}${fishStr}${costsStr}...`,
    { parse_mode: "Markdown" }
  );

  // ── Calcular y mostrar ─────────────────────────────────────────────────────
  const { topByDmg, topByCost, maxDmg, hasCosts } = findTopBuilds(cfg, 5);

  if (!topByDmg.length) {
    await tg.sendMessage(chatId, "No se encontraron builds válidas.");
    return;
  }

  const buildMsg = (b, i, label) => {
    let msg = `${label} *#${i + 1}*\n`;
    msg += `⚔️ Daño: *${formatNumber(Math.round(b.avgDmg))}*`;
    if (maxDmg > 0) msg += ` _(${((b.avgDmg / maxDmg) * 100).toFixed(1)}% del máximo)_`;
    msg += ` | ${b.eAttacks.toFixed(1)} ataques\n`;
    if (hasCosts) {
      msg += `💰 Coste: *${formatNumber(Math.round(b.totalCost))} g* | *${formatNumber(Math.round(b.dmgPerGold))} dmg/g*\n`;
    }
    msg += `\n`;
    msg += `❤️ Vida *${b.vida}*  ⚔️ Ataque *${b.ataque}*\n`;
    msg += `🎯 Precisión *${Math.round(b.precision * 100)}%*  💥 Crit *${Math.round(b.critChance * 100)}%*  ×*${b.critDamage.toFixed(2)}*\n`;
    msg += `🛡️ Armadura *${b.armadura}*  🏃 Dodge *${b.dodge}*  🍽️ Comida *${b.comida}*\n`;
    msg += `💎 SP: *${b.sp}*`;
    return msg;
  };

  await tg.sendMessage(chatId, `⚔️ *Top por daño* — máx ${formatNumber(Math.round(maxDmg))}, umbral 95% (≥${formatNumber(Math.round(maxDmg * 0.95))})`, { parse_mode: "Markdown" });
  for (let i = 0; i < topByDmg.length; i++) {
    await tg.sendMessage(chatId, buildMsg(topByDmg[i], i, "🏆"), { parse_mode: "Markdown" });
  }

  if (hasCosts && topByCost.length) {
    await tg.sendMessage(chatId, `💰 *Top más baratas* — dentro del mismo umbral 95%`, { parse_mode: "Markdown" });
    for (let i = 0; i < topByCost.length; i++) {
      await tg.sendMessage(chatId, buildMsg(topByCost[i], i, "💸"), { parse_mode: "Markdown" });
    }
  }
}

module.exports = { buildpvp };
