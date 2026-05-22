"use strict";

const XLSX = require("xlsx");
const tg   = require("../telegram");
const { t } = require("../i18n");
const { apiCall, apiBatchCall } = require("../api");
const { fetchUsersLite } = require("../fetchers");
const { delay } = require("../utils");
const { WARERA_API_KEY } = require("../config");

const AUTH_HEADERS = { "x-api-key": WARERA_API_KEY };

// ─── Costes por item (oro) ────────────────────────────────────────────────────
const ITEM_COSTS = {
  helmet1: 1.3, helmet2: 3.9, helmet3: 15,  helmet4: 42,  helmet5: 115, helmet6: 370,
  gloves1: 1.3, gloves2: 3.9, gloves3: 15,  gloves4: 61,  gloves5: 141, gloves6: 400,
  boots1:  1.3, boots2:  3.9, boots3:  15,  boots4:  61,  boots5:  155, boots6:  420,
  pants1:  1.3, pants2:  3.9, pants3:  15,  pants4:  40,  pants5:  110, pants6:  340,
  chest1:  1.3, chest2:  3.9, chest3:  15,  chest4:  40,  chest5:  110, chest6:  335,
  knife:   1.3, gun:     3.9, rifle:   13,  sniper:  50,  tank:    155, jet:     420,
};

// ─── Raridades (mayor → menor) ────────────────────────────────────────────────
const RARITIES = [
  { key: "Mítico",      emoji: "🔴", match: (c) => /6$/.test(c) || c === "jet"    },
  { key: "Legendario",  emoji: "🟠", match: (c) => /5$/.test(c) || c === "tank"   },
  { key: "Épico",       emoji: "🟣", match: (c) => /4$/.test(c) || c === "sniper" },
  { key: "Raro",        emoji: "🔵", match: (c) => /3$/.test(c) || c === "rifle"  },
  { key: "Poco Común",  emoji: "🟢", match: (c) => /2$/.test(c) || c === "gun"    },
  { key: "Común",       emoji: "⚪", match: (c) => /1$/.test(c) || c === "knife"  },
];

function getItemCost(code) { return ITEM_COSTS[code] ?? 0; }
function getRarityKey(code) { return RARITIES.find((r) => r.match(code))?.key ?? null; }
function round1(n) { return Math.round(n * 10) / 10; }
function fmtGold(n) {
  return Number(round1(n)).toLocaleString("es-ES", { maximumFractionDigits: 1 });
}

// ─── Stats por usuario ────────────────────────────────────────────────────────
function buildStats(userId, username, items) {
  const rarityStats = Object.fromEntries(RARITIES.map((r) => [r.key, { count: 0, gold: 0 }]));
  let totalGold = 0;
  for (const item of items) {
    const cost = getItemCost(item.code);
    const rKey = getRarityKey(item.code);
    totalGold += cost;
    if (rKey) {
      rarityStats[rKey].count++;
      rarityStats[rKey].gold = round1(rarityStats[rKey].gold + cost);
    }
  }
  return { userId, username, totalItems: items.length, totalGold: round1(totalGold), rarityStats };
}

// ─── Fetch transactions (batch por rondas) ────────────────────────────────────
async function fetchAllBrokenDuringBattle(userIds, battleStart) {
  const brokenMap      = new Map(userIds.map((id) => [id, []]));
  const pendingCursors = new Map(userIds.map((id) => [id, ""]));

  while (pendingCursors.size > 0) {
    const batch    = [...pendingCursors.entries()].slice(0, 100);
    const requests = batch.map(([userId, cursor]) => ({
      endpoint: "transaction.getPaginatedTransactions",
      params:   { userId, transactionType: "dismantleItem", limit: 100, cursor },
    }));

    const results = await apiBatchCall(requests, AUTH_HEADERS);

    for (let i = 0; i < batch.length; i++) {
      const [userId] = batch[i];
      const data     = results[i];
      const items    = data?.items ?? [];

      let reachedPast = false;
      for (const tx of items) {
        if (new Date(tx.createdAt) < battleStart) { reachedPast = true; break; }
        if (tx.item?.state === 0) brokenMap.get(userId).push(tx.item);
      }

      if (reachedPast || !data?.nextCursor) pendingCursors.delete(userId);
      else pendingCursors.set(userId, data.nextCursor);
    }

    if (pendingCursors.size > 0) await delay(120);
  }

  return brokenMap;
}

// ─── Excel ────────────────────────────────────────────────────────────────────
function buildExcel(attackerStats, defenderStats) {
  const wb = XLSX.utils.book_new();

  const headers = [
    "Bando", "Pos.", "Usuario", "URL", "Total Items", "Total Oro",
    ...RARITIES.flatMap((r) => [`${r.key} (items)`, `${r.key} (oro)`]),
  ];

  const rows = [headers];
  for (const [label, statsList] of [["Atacante", attackerStats], ["Defensor", defenderStats]]) {
    [...statsList]
      .sort((a, b) => b.totalGold - a.totalGold)
      .forEach((s, idx) => {
        rows.push([
          label, idx + 1, s.username,
          `https://app.warera.io/user/${s.userId}`,
          s.totalItems, s.totalGold,
          ...RARITIES.flatMap((r) => [s.rarityStats[r.key].count, s.rarityStats[r.key].gold]),
        ]);
      });
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [
    { wch: 10 }, { wch: 5 }, { wch: 25 }, { wch: 42 }, { wch: 12 }, { wch: 12 },
    ...RARITIES.flatMap(() => [{ wch: 16 }, { wch: 12 }]),
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Gastos");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

// ─── Mensaje Telegram (top 3 por bando) ──────────────────────────────────────
const MEDALS = ["🥇", "🥈", "🥉"];

function buildTelegramMsg(battleUrl, attackerStats, defenderStats) {
  let msg = `💸 *Gastos en batalla* — [ver](${battleUrl})\n`;

  for (const [label, stats, emoji] of [
    ["ATACANTES", attackerStats, "⚔️"],
    ["DEFENSORES", defenderStats, "🛡️"],
  ]) {
    const top3 = [...stats].sort((a, b) => b.totalGold - a.totalGold).slice(0, 3);
    if (!top3.length) continue;

    msg += `\n${emoji} *${label} — Top 3:*\n`;
    for (let i = 0; i < top3.length; i++) {
      const s   = top3[i];
      const url = `https://app.warera.io/user/${s.userId}`;
      msg += `${MEDALS[i]} [${s.username}](${url}) — *${fmtGold(s.totalGold)} oro* (${s.totalItems} items)\n`;

      const cats = RARITIES
        .filter((r) => s.rarityStats[r.key].count > 0)
        .map((r) => `${r.emoji} ×${s.rarityStats[r.key].count} ${r.key} (${fmtGold(s.rarityStats[r.key].gold)})`);
      if (cats.length) msg += `  ${cats.join(" | ")}\n`;
    }
  }

  return msg;
}

// ─── Handler principal ────────────────────────────────────────────────────────
async function gastos(chatId, args) {
  if (!args.length) {
    await tg.sendMessage(chatId, t(chatId, "gastos_usage"), { disable_web_page_preview: true });
    return;
  }

  const battleId = args[0].split("/").pop();

  try {
    const battle = await apiCall("battle.getById", { battleId });
    if (!battle) { await tg.sendMessage(chatId, t(chatId, "duracion_no_battle")); return; }

    const battleStart = new Date(battle.createdAt);

    const [rankAtt, rankDef] = await Promise.all([
      apiCall("battleRanking.getRanking", { battleId, dataType: "damage", type: "user", side: "attacker" }),
      apiCall("battleRanking.getRanking", { battleId, dataType: "damage", type: "user", side: "defender" }),
    ]);

    const attackerIds = (rankAtt?.rankings ?? []).map((r) => r.user).filter(Boolean);
    const defenderIds = (rankDef?.rankings ?? []).map((r) => r.user).filter(Boolean);
    const allUserIds  = [...new Set([...attackerIds, ...defenderIds])];

    if (!allUserIds.length) { await tg.sendMessage(chatId, t(chatId, "no_results")); return; }

    const usersData   = await fetchUsersLite(allUserIds, { batchSize: 100 });
    const usernameMap = new Map();
    allUserIds.forEach((id, idx) => {
      if (usersData[idx]) usernameMap.set(id, usersData[idx].username ?? id);
    });

    const brokenMap = await fetchAllBrokenDuringBattle(allUserIds, battleStart);

    const attackerStats = attackerIds.map((id) =>
      buildStats(id, usernameMap.get(id) ?? id, brokenMap.get(id) ?? [])
    );
    const defenderStats = defenderIds.map((id) =>
      buildStats(id, usernameMap.get(id) ?? id, brokenMap.get(id) ?? [])
    );

    const battleUrl = `https://app.warera.io/battle/${battleId}`;

    const excelBuffer = buildExcel(attackerStats, defenderStats);
    await tg.sendDocument(
      chatId, excelBuffer,
      { caption: `💸 Gastos batalla — [ver](${battleUrl})`, parse_mode: "Markdown" },
      { filename: `gastos_${battleId}.xlsx`, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
    );

    const msg = buildTelegramMsg(battleUrl, attackerStats, defenderStats);
    await tg.sendMessage(chatId, msg, { parse_mode: "Markdown", disable_web_page_preview: true });

  } catch (err) {
    console.error("gastos error:", err);
    await tg.sendMessage(chatId, t(chatId, "error_generic"));
  }
}

module.exports = { gastos };
