"use strict";

const SKILL_COSTS = [0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55];

// Stat index: 0=vida 1=ataque 2=precision 3=critChance 4=critDamage 5=armadura 6=dodge 7=comida
const SKILL_TABLES = [
  [100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200],              // vida
  [100, 125, 150, 175, 200, 225, 250, 275, 300, 325, 350],              // ataque
  [0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90, 0.95, 1.00], // precision
  [0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60], // critChance
  [1.00, 1.20, 1.40, 1.60, 1.80, 2.00, 2.20, 2.40, 2.60, 2.80, 3.00], // critDamage
  [0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60],                          // armadura pts
  [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40],                           // dodge pts
  [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],                              // comida
];

function pointsToFraction(pts) {
  if (pts <= 0) return 0;
  return (pts / ((pts + 40) / 100)) / 100;
}

function computeBuild(cfg, idx) {
  const vidaBase    = SKILL_TABLES[0][idx[0]];
  const ataqueBase  = SKILL_TABLES[1][idx[1]];
  const precision   = SKILL_TABLES[2][idx[2]];
  const critChance  = SKILL_TABLES[3][idx[3]];
  const critDamage  = SKILL_TABLES[4][idx[4]];
  const armaduraPts = SKILL_TABLES[5][idx[5]];
  const dodgePts    = SKILL_TABLES[6][idx[6]];
  const comidaBase  = SKILL_TABLES[7][idx[7]];

  const vida   = vidaBase * 1.8;
  const comida = Math.floor(comidaBase * 1.8);

  const finalArmor = pointsToFraction(armaduraPts + cfg.eqArmorPts);
  const finalDodge = pointsToFraction(dodgePts    + cfg.eqDodgePts);

  const rawPrec  = precision  + cfg.eqPrecision;
  const rawCritC = critChance + cfg.eqCritChance;

  const precOverflow  = Math.max(0, rawPrec  - 1);
  const critCOverflow = Math.max(0, rawCritC - 1);

  const finalPrec  = Math.min(rawPrec,  1);
  const finalCritC = Math.min(rawCritC, 1);
  const finalCritD = critDamage + cfg.eqCritDamage + critCOverflow * 4;
  const effAtaque  = ataqueBase + precOverflow * 100 * 4;

  const totalBase  = (effAtaque + cfg.weaponDamage) * 1.6 * cfg.bulletMult * cfg.rankMult;
  const eDmgPerHit = totalBase * (
    (1 - finalPrec) * 0.5 +
    finalPrec * (1 - finalCritC) * 1.0 +
    finalPrec * finalCritC * (1 + finalCritD)
  );

  const damageTaken   = Math.max(1, 10 * (1 - finalArmor));
  const healPerFood   = vidaBase * 0.20;
  const totalHp       = vida + comida * healPerFood;
  const effectiveDmg  = Math.max(damageTaken * (1 - finalDodge), 0.001);
  const eAttacks      = totalHp / effectiveDmg;
  const eHitsReceived = eAttacks * (1 - finalDodge);
  const avgDmg        = eDmgPerHit * eAttacks;

  const ammoCost   = eAttacks      * cfg.ammoPrice;
  const foodCost   = comida        * cfg.fishPrice;
  const weaponWear = (eAttacks     / 100) * cfg.weaponCost;
  const gearWear   = (eHitsReceived / 100) * cfg.totalGearCost;
  const totalCost  = ammoCost + foodCost + weaponWear + gearWear;
  const dmgPerGold = totalCost > 0 ? avgDmg / totalCost : avgDmg;

  let sp = 0;
  for (let s = 0; s < 8; s++) sp += SKILL_COSTS[idx[s]];

  return {
    avgDmg, eAttacks, dmgPerGold, totalCost, ammoCost, foodCost, weaponWear, gearWear,
    sp,
    vida: vidaBase, ataque: ataqueBase,
    precision, critChance, critDamage,
    armadura: armaduraPts, dodge: dodgePts, comida: comidaBase,
  };
}

// Pasada 1: solo calcula avgDmg para encontrar el máximo (sin construir el objeto completo)
function quickDmg(cfg, idx) {
  const vidaBase    = SKILL_TABLES[0][idx[0]];
  const ataqueBase  = SKILL_TABLES[1][idx[1]];
  const precision   = SKILL_TABLES[2][idx[2]];
  const critChance  = SKILL_TABLES[3][idx[3]];
  const critDamage  = SKILL_TABLES[4][idx[4]];
  const armaduraPts = SKILL_TABLES[5][idx[5]];
  const dodgePts    = SKILL_TABLES[6][idx[6]];
  const comidaBase  = SKILL_TABLES[7][idx[7]];

  const vida   = vidaBase * 1.8;
  const comida = Math.floor(comidaBase * 1.8);

  const finalArmor = pointsToFraction(armaduraPts + cfg.eqArmorPts);
  const finalDodge = pointsToFraction(dodgePts    + cfg.eqDodgePts);

  const rawPrec  = precision  + cfg.eqPrecision;
  const rawCritC = critChance + cfg.eqCritChance;

  const precOverflow  = Math.max(0, rawPrec  - 1);
  const critCOverflow = Math.max(0, rawCritC - 1);

  const finalPrec  = Math.min(rawPrec,  1);
  const finalCritC = Math.min(rawCritC, 1);
  const finalCritD = critDamage + cfg.eqCritDamage + critCOverflow * 4;
  const effAtaque  = ataqueBase + precOverflow * 100 * 4;

  const totalBase  = (effAtaque + cfg.weaponDamage) * 1.6 * cfg.bulletMult * cfg.rankMult;
  const eDmgPerHit = totalBase * (
    (1 - finalPrec) * 0.5 +
    finalPrec * (1 - finalCritC) * 1.0 +
    finalPrec * finalCritC * (1 + finalCritD)
  );

  const damageTaken  = Math.max(1, 10 * (1 - finalArmor));
  const healPerFood  = vidaBase * 0.20;
  const totalHp      = vida + comida * healPerFood;
  const effectiveDmg = Math.max(damageTaken * (1 - finalDodge), 0.001);

  return eDmgPerHit * (totalHp / effectiveDmg);
}

function makeRecurse(sp, onLeaf) {
  const idx = new Int8Array(8);
  function recurse(stat, remaining) {
    if (stat === 8) {
      if (remaining === 0) onLeaf(idx);
      return;
    }
    const maxFuture = (7 - stat) * 55;
    for (let i = 0; i <= 10; i++) {
      const cost = SKILL_COSTS[i];
      if (cost > remaining) break;
      const left = remaining - cost;
      if (left > maxFuture) continue;
      idx[stat] = i;
      recurse(stat + 1, left);
    }
  }
  recurse(0, sp);
}

function insertSorted(arr, item, maxLen, cmp) {
  if (arr.length < maxLen) {
    arr.push(item);
    if (arr.length === maxLen) arr.sort(cmp);
  } else if (cmp(item, arr[maxLen - 1]) < 0) {
    arr[maxLen - 1] = item;
    arr.sort(cmp);
  }
}

// Devuelve { topByDmg, topByCost, maxDmg }
// topByDmg: top 5 por daño entre builds con avgDmg >= maxDmg * 0.95
// topByCost: top 5 más baratas entre las mismas builds
function findTopBuilds(cfg, topN = 5) {
  const sp = cfg.totalSkillPoints;
  const hasCosts = cfg.ammoPrice > 0 || cfg.fishPrice > 0 || cfg.weaponCost > 0 || cfg.totalGearCost > 0;

  // Pasada 1: encontrar el daño máximo
  let maxDmg = 0;
  makeRecurse(sp, (idx) => {
    const d = quickDmg(cfg, idx);
    if (d > maxDmg) maxDmg = d;
  });

  const threshold = maxDmg * 0.95;

  // Pasada 2: recoger top 5 por daño y top 5 por coste dentro del umbral
  const topByDmg  = [];
  const topByCost = [];

  const byDmgDesc  = (a, b) => b.avgDmg   - a.avgDmg;
  const byCostAsc  = (a, b) => a.totalCost - b.totalCost;

  makeRecurse(sp, (idx) => {
    const build = computeBuild(cfg, idx);
    if (build.avgDmg < threshold) return;

    insertSorted(topByDmg,  build, topN, byDmgDesc);
    if (hasCosts) insertSorted(topByCost, build, topN, byCostAsc);
  });

  if (topByDmg.length  < topN) topByDmg.sort(byDmgDesc);
  if (topByCost.length < topN) topByCost.sort(byCostAsc);

  return { topByDmg, topByCost, maxDmg, hasCosts };
}

module.exports = { findTopBuilds };
