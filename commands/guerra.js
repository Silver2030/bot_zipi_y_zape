"use strict";

const tg = require("../telegram");
const { t } = require("../i18n");
const { apiCall, getCountryData } = require("../api");
const { formatNumber } = require("../utils");

async function guerra(chatId, args) {
  if (!args.length) {
    await tg.sendMessage(chatId, t(chatId, "guerra_usage"), { disable_web_page_preview: true });
    return;
  }

  const battleId = args[0].split("/").pop();

  try {
    const battle = await apiCall("battle.getById", { battleId });
    if (!battle) { await tg.sendMessage(chatId, t(chatId, "duracion_no_battle")); return; }

    const [defData, attData] = await Promise.all([
      getCountryData(battle.defender.country),
      getCountryData(battle.attacker.country),
    ]);

    const defName  = defData?.name  ?? t(chatId, "defensor");
    const attName  = attData?.name  ?? t(chatId, "atacante");
    const estado   = battle.isActive ? "🟢" : "🔴";
    const ganador  = !battle.isActive
      ? (battle.defender.wonRoundsCount >= battle.roundsToWin ? defName : attName)
      : null;

    // Ranking de daño de la batalla
    const [rankDef, rankAtt] = await Promise.all([
      apiCall("battleRanking.getRanking", { battleId, dataType: "damage", type: "country", side: "defender" }),
      apiCall("battleRanking.getRanking", { battleId, dataType: "damage", type: "country", side: "attacker" }),
    ]);

    const dmgDef = rankDef?.items?.[0]?.value ?? 0;
    const dmgAtt = rankAtt?.items?.[0]?.value ?? 0;

    const msg = t(chatId, "guerra_resumen", {
      estado,
      defName,  defWins: battle.defender.wonRoundsCount, dmgDef: formatNumber(dmgDef),
      attName,  attWins: battle.attacker.wonRoundsCount, dmgAtt: formatNumber(dmgAtt),
      roundsToWin: battle.roundsToWin,
      ganador,
      battleId,
    });

    await tg.sendMessage(chatId, msg, { parse_mode: "Markdown", disable_web_page_preview: true });

  } catch (err) {
    console.error("guerra error:", err);
    await tg.sendMessage(chatId, t(chatId, "error_generic"));
  }
}

module.exports = { guerra };
