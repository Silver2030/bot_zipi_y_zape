"use strict";

const SKILL_COSTS = [0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55];

// Stat index: 0=energia 1=empresas 2=produccion 3=emprendimiento
const ECO_TABLES = [
  [30,  40,  50,  60,  70,  80,  80, 100, 110, 120, 130], // energia
  [2,   3,   4,   5,   6,   7,   8,   9,  10,  11,  12],  // empresas
  [10,  13,  16,  19,  22,  25,  28,  31,  34,  37,  40], // produccion
  [30,  35,  40,  45,  50,  55,  60,  65,  70,  75,  80], // emprendimiento
];

const HOURS_PER_DAY = 24;

function computeEco(cfg, idx) {
  const energia        = ECO_TABLES[0][idx[0]];
  const empresas       = ECO_TABLES[1][idx[1]];
  const produccion     = ECO_TABLES[2][idx[2]];
  const emprendimiento = ECO_TABLES[3][idx[3]];

  const goldPasiva  = empresas * cfg.companyLevel * HOURS_PER_DAY * cfg.gpo;
  const goldPropio  = (emprendimiento / 100) * HOURS_PER_DAY * produccion * cfg.gpo;
  const goldAjeno   = (energia / 100) * HOURS_PER_DAY * produccion * cfg.gps;
  const goldPerDay  = goldPasiva + goldPropio + goldAjeno;

  let sp = 0;
  for (let s = 0; s < 4; s++) sp += SKILL_COSTS[idx[s]];

  return { goldPerDay, goldPasiva, goldPropio, goldAjeno, energia, empresas, produccion, emprendimiento, sp };
}

function makeEcoRecurse(sp, empresasFilter, onLeaf) {
  const idx = new Int8Array(4);
  function recurse(stat, remaining) {
    if (stat === 4) {
      if (remaining === 0) onLeaf(idx);
      return;
    }
    const maxFuture = (3 - stat) * 55;
    for (let i = 0; i <= 10; i++) {
      const cost = SKILL_COSTS[i];
      if (cost > remaining) break;
      const left = remaining - cost;
      if (left > maxFuture) continue;
      if (stat === 1 && empresasFilter !== null && ECO_TABLES[1][i] !== empresasFilter) continue;
      idx[stat] = i;
      recurse(stat + 1, left);
    }
  }
  recurse(0, sp);
}

function findTopEcoBuilds(cfg, topN = 5) {
  const sp = Math.min(cfg.totalSkillPoints, 4 * 55);
  const empresasFilter = cfg.empresasFilter ?? null;

  const topByGold  = [];
  const byGoldDesc = (a, b) => b.goldPerDay - a.goldPerDay;

  makeEcoRecurse(sp, empresasFilter, (idx) => {
    const build = computeEco(cfg, idx);
    if (topByGold.length < topN) {
      topByGold.push(build);
      if (topByGold.length === topN) topByGold.sort(byGoldDesc);
    } else if (build.goldPerDay > topByGold[topN - 1].goldPerDay) {
      topByGold[topN - 1] = build;
      topByGold.sort(byGoldDesc);
    }
  });

  if (topByGold.length < topN) topByGold.sort(byGoldDesc);
  return topByGold;
}

module.exports = { findTopEcoBuilds };
