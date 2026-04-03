"use strict";

const { SKILL_COSTS, PVP_SKILLS, ECO_SKILLS } = require("./config");

// ─── Daño ─────────────────────────────────────────────────────────────────────
function calcularDanyo(userData, healFood) {
  const skills      = userData.skills;
  const atk         = skills.attack?.total || 0;
  const critChance  = (skills.criticalChance?.total || 0) / 100;
  const critDmg     = (skills.criticalDamages?.total || 0) / 100;
  const precision   = (skills.precision?.total || 0) / 100;
  const armor       = Math.min((skills.armor?.total || 0) / 100, 0.9);
  const dodge       = (skills.dodge?.total || 0) / 100;

  const hpNow      = (skills.health?.currentBarValue || 0) + Math.floor(skills.hunger?.currentBarValue || 0) * healFood;
  const hpRegen24h = skills.health?.total * 0.1 * 24;
  const hungerReg  = Math.floor(skills.hunger?.total * 0.1 * 24) * healFood;
  const hp24h      = hpRegen24h + hungerReg;

  function simularCombate(hpTotal) {
    const simulaciones = 1000;
    let totalDanyo = 0;
    for (let i = 0; i < simulaciones; i++) {
      let hp = hpTotal;
      let dmg = 0;
      let comidaRestante = Math.floor(skills.hunger?.currentBarValue || 0);
      while (hp >= 10) {
        let baseDmg = atk;
        if (Math.random() < critChance) baseDmg *= 1 + critDmg;
        if (Math.random() >= precision) baseDmg *= 0.5;
        dmg += baseDmg;
        const esquiva = Math.random() < dodge;
        if (!esquiva) {
          let damageTaken = Math.max(1, 10 * (1 - armor));
          if (hp <= damageTaken) break;
          hp -= damageTaken;
        }
        while (hp < 10 && comidaRestante > 0) { hp += healFood; comidaRestante--; }
        if (hp < 10) break;
      }
      totalDanyo += dmg;
    }
    return totalDanyo / simulaciones;
  }

  return { danyoActual: simularCombate(hpNow), danyo24h: simularCombate(hp24h) };
}

// ─── Build ────────────────────────────────────────────────────────────────────
function analizarBuild(userData) {
  let pvpPoints = 0, ecoPoints = 0;
  PVP_SKILLS.forEach((s) => (pvpPoints += SKILL_COSTS[userData.skills[s]?.level || 0]));
  ECO_SKILLS.forEach((s) => (ecoPoints += SKILL_COSTS[userData.skills[s]?.level || 0]));
  const total  = pvpPoints + ecoPoints;
  const pctPvp = total ? (pvpPoints / total) * 100 : 0;
  let build = "HIBRIDA";
  if (pctPvp > 65) build = "PVP";
  else if (pctPvp < 35) build = "ECO";
  return { build, nivel: userData.leveling?.level || 0 };
}

// ─── Pastillas ────────────────────────────────────────────────────────────────
function obtenerEstadoPastilla(userData) {
  const buffs = userData.buffs;
  if (buffs?.buffCodes?.length)   return { icono: "💊", fecha: new Date(buffs.buffEndAt) };
  if (buffs?.debuffCodes?.length) return { icono: "⛔", fecha: new Date(buffs.debuffEndAt) };
  return { icono: "", fecha: null };
}

// ─── Duración de ronda ────────────────────────────────────────────────────────
function puntosPorTick(total) {
  if (total < 100) return 1;
  if (total < 200) return 2;
  if (total < 300) return 3;
  if (total < 400) return 4;
  if (total < 500) return 5;
  return 6;
}

function duracionRondaRapida(puntosIniciales = 0, puntosRival = 0) {
  let puntos = puntosIniciales;
  let total  = puntosIniciales + puntosRival;
  let tiempo = 0;
  while (puntos < 300) {
    const ppt = puntosPorTick(total);
    puntos += ppt; total += ppt; tiempo += 2;
  }
  return tiempo;
}

function duracionRondaLenta(puntosA = 0, puntosB = 0) {
  let total  = puntosA + puntosB;
  let tiempo = 0;
  let faltan299 = 299 - Math.max(puntosA, puntosB);
  while (faltan299 > 0) {
    const ppt = puntosPorTick(total);
    faltan299 -= ppt; total += ppt; tiempo += 2;
  }
  let faltan300 = 300;
  while (faltan300 > 0) {
    const ppt = puntosPorTick(total);
    faltan300 -= ppt; total += ppt; tiempo += 2;
  }
  return tiempo;
}

// ─── Producción ───────────────────────────────────────────────────────────────
const { MATERIAS_PRIMAS, PRODUCTOS_MANUFACTURADOS } = require("./config");

function isRaw(item) { return !!MATERIAS_PRIMAS[item]; }

function calcProductivityForCountry(item, country, prices, depositsByCountry) {
  const sell = prices[item];
  if (typeof sell !== "number") return null;

  const countryBonus = country?.specializedItem === item
    ? (Number(country?.rankings?.countryProductionBonus?.value ?? country?.strategicResources?.bonuses?.productionPercent ?? 0) || 0)
    : 0;

  let depositBonus = 0, depositEnd = null, depositRegionId = null, depositRegionName = null;
  if (isRaw(item)) {
    const d = depositsByCountry.get(country._id)?.get(item);
    if (d) { depositBonus = d.bonusPercent; depositEnd = d.endsAt; depositRegionId = d.regionId; depositRegionName = d.regionName; }
  }

  const multiplier = 1 + (countryBonus + depositBonus) / 100;
  let pp = 0, cost = 0;

  if (isRaw(item)) {
    pp = MATERIAS_PRIMAS[item].pp;
  } else if (PRODUCTOS_MANUFACTURADOS[item]) {
    pp = PRODUCTOS_MANUFACTURADOS[item].pp;
    for (const [mat, qty] of Object.entries(PRODUCTOS_MANUFACTURADOS[item].materias)) {
      const p = prices[mat];
      if (typeof p !== "number") return null;
      cost += p * qty;
    }
  } else {
    return null;
  }

  return {
    countryName: country.name,
    countryCode: country.code,
    profitPerPP: ((sell - cost) * multiplier) / pp,
    countryBonus,
    depositBonus,
    depositEnd,
    depositRegionId,
    depositRegionName,
  };
}

function buildDepositsByCountry(regionsObj) {
  const now = Date.now();
  const map = new Map();
  for (const region of Object.values(regionsObj)) {
    const cId = region?.country;
    const dep  = region?.deposit;
    if (!cId || !region?._id || !region?.name) continue;
    if (!dep?.type || typeof dep?.bonusPercent !== "number" || !dep?.endsAt) continue;
    const endsAt = new Date(dep.endsAt).getTime();
    if (!endsAt || now >= endsAt) continue;
    if (!map.has(cId)) map.set(cId, new Map());
    const m = map.get(cId);
    const prev = m.get(dep.type);
    if (!prev || dep.bonusPercent > prev.bonusPercent || (dep.bonusPercent === prev.bonusPercent && endsAt < prev.endsAt)) {
      m.set(dep.type, { bonusPercent: dep.bonusPercent, endsAt, regionId: region._id, regionName: region.name });
    }
  }
  return map;
}

module.exports = {
  calcularDanyo, analizarBuild, obtenerEstadoPastilla,
  puntosPorTick, duracionRondaRapida, duracionRondaLenta,
  isRaw, calcProductivityForCountry, buildDepositsByCountry,
};
