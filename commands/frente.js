"use strict";

const tg = require("../telegram");
const { t } = require("../i18n");
const { apiCall, getCountryData } = require("../api");
const { fetchUsersLite } = require("../fetchers");
const { query } = require("../db");
const { formatNumber } = require("../utils");

function extractBattleId(arg) {
  return arg.split("/").pop();
}

async function addtrack(chatId, args) {
  if (args.length < 2) {
    await tg.sendMessage(chatId, t(chatId, "addtrack_usage"), { disable_web_page_preview: true });
    return;
  }

  const battleId = extractBattleId(args[0]);
  const side     = args[1].toLowerCase();

  if (side !== "attacker" && side !== "defender") {
    await tg.sendMessage(chatId, t(chatId, "addtrack_invalid_side"));
    return;
  }

  try {
    const battle = await apiCall("battle.getById", { battleId });
    if (!battle) {
      await tg.sendMessage(chatId, t(chatId, "addtrack_not_found"));
      return;
    }

    const { rows } = await query('SELECT id, activo FROM frente WHERE "battleId" = $1', [battleId]);

    if (rows.length > 0) {
      if (rows[0].activo) {
        await tg.sendMessage(chatId, t(chatId, "addtrack_already"));
        return;
      }
      await query('UPDATE frente SET activo = true, side = $2 WHERE "battleId" = $1', [battleId, side]);
    } else {
      await query(
        `INSERT INTO frente (id, "battleId", side, activo) VALUES (gen_random_uuid()::text, $1, $2, true)`,
        [battleId, side]
      );
    }

    await tg.sendMessage(chatId, t(chatId, "addtrack_added", battleId, side), { parse_mode: "Markdown" });
  } catch (err) {
    console.error("addtrack error:", err);
    await tg.sendMessage(chatId, t(chatId, "error_generic"));
  }
}

async function listtrack(chatId) {
  try {
    const { rows } = await query('SELECT * FROM frente WHERE activo = true');

    if (!rows.length) {
      await tg.sendMessage(chatId, t(chatId, "listtrack_empty"));
      return;
    }

    for (const row of rows) {
      const { battleId, side } = row;

      try {
        const [battle, ranking] = await Promise.all([
          apiCall("battle.getById", { battleId }),
          apiCall("battleRanking.getRanking", { battleId, dataType: "damage", type: "user", side }),
        ]);

        if (!battle) {
          await tg.sendMessage(chatId, t(chatId, "listtrack_error", battleId));
          continue;
        }

        let defName = t(chatId, "defensor");
        let attName = t(chatId, "atacante");

        if (battle.type !== "tournament" && battle.defender.country) {
          const [defData, attData] = await Promise.all([
            getCountryData(battle.defender.country),
            getCountryData(battle.attacker.country),
          ]);
          defName = defData?.name ?? defName;
          attName = attData?.name ?? attName;
        }

        const topRaw   = (ranking?.rankings ?? []).slice(0, 3);
        const userIds  = topRaw.map((r) => r.user);
        const usersData = userIds.length ? await fetchUsersLite(userIds) : [];
        const topPlayers = topRaw.map((r, i) => ({
          rank:     r.rank,
          username: usersData[i]?.username ?? r.user,
          value:    formatNumber(r.value),
        }));

        const estado  = battle.isActive ? "🟢" : "🔴";
        const ganador = !battle.isActive && battle.wonBy
          ? (battle.wonBy === "defender" ? defName : attName)
          : null;

        const msg = t(chatId, "listtrack_resumen", {
          estado,
          battleId,
          side,
          defName,  defWins: battle.defender.wonRoundsCount, dmgDef: formatNumber(battle.defender.damages),
          attName,  attWins: battle.attacker.wonRoundsCount, dmgAtt: formatNumber(battle.attacker.damages),
          roundsToWin: battle.roundsToWin,
          ganador,
          topPlayers,
        });

        await tg.sendMessage(chatId, msg, { parse_mode: "Markdown", disable_web_page_preview: true });
      } catch (err) {
        console.error(`listtrack ${battleId} error:`, err);
        await tg.sendMessage(chatId, t(chatId, "listtrack_error", battleId));
      }
    }
  } catch (err) {
    console.error("listtrack error:", err);
    await tg.sendMessage(chatId, t(chatId, "error_generic"));
  }
}

async function removetrack(chatId, args) {
  if (!args.length) {
    await tg.sendMessage(chatId, t(chatId, "removetrack_usage"), { disable_web_page_preview: true });
    return;
  }

  const battleId = extractBattleId(args[0]);

  try {
    const { rowCount } = await query(
      'UPDATE frente SET activo = false WHERE "battleId" = $1 AND activo = true',
      [battleId]
    );

    if (rowCount === 0) {
      await tg.sendMessage(chatId, t(chatId, "removetrack_not_found"));
      return;
    }

    await tg.sendMessage(chatId, t(chatId, "removetrack_removed", battleId));
  } catch (err) {
    console.error("removetrack error:", err);
    await tg.sendMessage(chatId, t(chatId, "error_generic"));
  }
}

module.exports = { addtrack, listtrack, removetrack };
