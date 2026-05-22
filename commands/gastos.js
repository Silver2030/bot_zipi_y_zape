"use strict";

const tg = require("../telegram");
const { t } = require("../i18n");
const { apiCall } = require("../api");
const { fetchUsersLite } = require("../fetchers");
const { delay } = require("../utils");

const SKILL_ABBR = {
  attack:          "atk",
  criticalChance:  "cc",
  criticalDamages: "cd",
  armor:           "arm",
  precision:       "prec",
  dodge:           "dodge",
  health:          "hp",
  hunger:          "hunger",
};

function formatSkills(skills = {}) {
  return Object.entries(skills)
    .map(([k, v]) => `${SKILL_ABBR[k] ?? k}: ${v}`)
    .join(", ");
}

async function fetchBrokenDuringBattle(userId, battleStart) {
  const broken = [];
  let cursor = "";
  let done = false;

  while (!done) {
    const data = await apiCall("transaction.getPaginatedTransactions", {
      userId,
      transactionType: "dismantleItem",
      limit: 100,
      cursor,
    });

    const items = data?.items ?? [];
    if (!items.length) break;

    for (const tx of items) {
      if (new Date(tx.createdAt) < battleStart) { done = true; break; }
      if (tx.item?.state === 0) broken.push(tx.item);
    }

    if (!done) {
      cursor = data?.nextCursor ?? null;
      if (!cursor) done = true;
      else await delay(100);
    }
  }

  return broken;
}

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

    const usersData   = await fetchUsersLite(allUserIds, { batchSize: 30 });
    const usernameMap = new Map();
    allUserIds.forEach((id, idx) => {
      if (usersData[idx]) usernameMap.set(id, usersData[idx].username ?? id);
    });

    // Fetch broken items sequentially to avoid hammering the API
    const brokenMap = new Map();
    for (const userId of allUserIds) {
      const broken = await fetchBrokenDuringBattle(userId, battleStart);
      if (broken.length) brokenMap.set(userId, broken);
      await delay(200);
    }

    const battleUrl = `https://app.warera.io/battle/${battleId}`;
    const lines = [`💸 *Gastos en batalla* — [ver](${battleUrl})\n`];

    for (const [label, userIds, emoji] of [
      ["ATACANTES", attackerIds, "⚔️"],
      ["DEFENSORES", defenderIds, "🛡️"],
    ]) {
      const withItems = userIds.filter((id) => brokenMap.has(id));
      if (!withItems.length) continue;

      lines.push(`${emoji} *${label}:*`);
      for (const userId of withItems) {
        const username   = usernameMap.get(userId) ?? userId;
        const items      = brokenMap.get(userId);
        const profileUrl = `https://app.warera.io/user/${userId}`;
        lines.push(`👤 [${username}](${profileUrl}) — ${items.length} item(s) roto(s):`);
        for (const item of items) {
          const skills = formatSkills(item.skills);
          lines.push(`  • ${item.code}${skills ? ` (${skills})` : ""}`);
        }
      }
      lines.push("");
    }

    if (lines.length <= 2) {
      lines.push("✅ No se rompieron items durante esta batalla.");
    }

    // Send in chunks of ≤4000 chars
    const MAX = 4000;
    let chunk = "";
    for (const line of lines) {
      const seg = line + "\n";
      if (chunk.length + seg.length > MAX) {
        await tg.sendMessage(chatId, chunk.trimEnd(), { parse_mode: "Markdown", disable_web_page_preview: true });
        chunk = "";
        await delay(300);
      }
      chunk += seg;
    }
    if (chunk.trim()) {
      await tg.sendMessage(chatId, chunk.trimEnd(), { parse_mode: "Markdown", disable_web_page_preview: true });
    }

  } catch (err) {
    console.error("gastos error:", err);
    await tg.sendMessage(chatId, t(chatId, "error_generic"));
  }
}

module.exports = { gastos };
