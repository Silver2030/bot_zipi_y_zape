"use strict";

const tg = require("./telegram");
const { apiCall, getCountryData, getUserData } = require("./api");
const { query } = require("./db");
const { formatNumber } = require("./utils");
const { TRACK_NOTIFY_CHAT, TRACK_NOTIFY_THREAD } = require("./config");
const { hambre } = require("./commands/misc");

const POLL_INTERVAL_MS = 5 * 1000;
const NOTIFY_OPTS = {
  parse_mode: "Markdown",
  disable_web_page_preview: true,
  message_thread_id: TRACK_NOTIFY_THREAD,
};
const HEAVY_WEAPONS = new Set(["tank", "jet"]);

// Estado en memoria por batalla — se resetea cuando cambia la ronda activa
// { battleId -> { roundId, winningSide, notifiedHitIds: Set } }
const roundState = new Map();

function getOrInitRoundState(battleId, roundId) {
  const existing = roundState.get(battleId);
  if (existing && existing.roundId === roundId) return existing;
  const fresh = { roundId, winningSide: null, lastHeavyHitAt: new Map() };
  roundState.set(battleId, fresh);
  return fresh;
}

async function resolveNames(battle) {
  if (battle.type !== "tournament" && battle.defender.country) {
    const [defData, attData] = await Promise.all([
      getCountryData(battle.defender.country),
      getCountryData(battle.attacker.country),
    ]);
    return { defName: defData?.name ?? "Defensor", attName: attData?.name ?? "Atacante" };
  }
  return { defName: "Defensor", attName: "Atacante" };
}

async function handleActiveRound(battle, row) {
  const { battleId, side } = row;
  if (!battle.currentRound) return;

  const round = await apiCall("round.getById", { roundId: battle.currentRound });
  if (!round?.isActive) return;

  const state = getOrInitRoundState(battleId, battle.currentRound);
  const { defName, attName } = await resolveNames(battle);

  // ── Detección de vuelta al marcador ────────────────────────────────────────
  const attPts = round.attacker.points;
  const defPts = round.defender.points;
  const currentWinner = attPts > defPts ? "attacker" : defPts > attPts ? "defender" : null;

  if (currentWinner !== null && currentWinner !== state.winningSide) {
    state.winningSide = currentWinner;

    const winnerName = currentWinner === "defender" ? defName : attName;
    let msg = `🔄 *¡Cambio de marcador!*\n\n`;
    msg += `📊 Va ganando: *${winnerName}*\n`;
    msg += `🛡️ ${defName}: ${defPts} pts  |  ⚔️ ${attName}: ${attPts} pts`;
    await tg.sendMessage(TRACK_NOTIFY_CHAT, msg, NOTIFY_OPTS);

    // Si nuestro bando está perdiendo, ejecutar /hambre de forma autónoma
    if (currentWinner !== side) {
      tg.setThreadContext(TRACK_NOTIFY_CHAT, TRACK_NOTIFY_THREAD);
      await hambre(TRACK_NOTIFY_CHAT, [
        `https://app.warera.io/battle/${battleId}`,
        `⚠️ NOS ESTÁN DANDO VUELTA, NECESITAMOS PEGAR`,
      ]);
    }
  }

  // ── Armas pesadas del bando enemigo ────────────────────────────────────────
  const enemySide = side === "attacker" ? "defender" : "attacker";
  const enemyHits = round[enemySide]?.lastHits ?? [];

  const HEAVY_COOLDOWN_MS = 5 * 60 * 1000;

  for (const hit of enemyHits) {
    if (!HEAVY_WEAPONS.has(hit.weapon?.code)) continue;

    const key    = `${hit.user}:${hit.weapon.code}`;
    const hitAt  = new Date(hit.hitAt).getTime();
    const lastAt = state.lastHeavyHitAt.get(key) ?? 0;
    if (Date.now() - lastAt < HEAVY_COOLDOWN_MS) continue;

    state.lastHeavyHitAt.set(key, Date.now());
    setTimeout(() => state.lastHeavyHitAt.delete(key), HEAVY_COOLDOWN_MS);

    const userData = await getUserData(hit.user).catch(() => null);
    const username = userData?.username ?? hit.user;

    await tg.sendMessage(
      TRACK_NOTIFY_CHAT,
      `⚠️ *${username}* está atacando con *${hit.weapon.code}*!`,
      NOTIFY_OPTS
    );
  }
}

async function checkBattles() {
  let rows;
  try {
    const result = await query(
      'SELECT battleid AS "battleId", side, last_round_count FROM frente WHERE activo = true'
    );
    rows = result.rows;
  } catch (err) {
    console.error("[poller] DB error:", err.message);
    return;
  }

  for (const row of rows) {
    const { battleId, side, last_round_count } = row;

    try {
      const battle = await apiCall("battle.getById", { battleId });
      if (!battle) continue;

      const history   = battle.roundsHistory ?? [];
      const newRounds = history.slice(last_round_count);

      // ── Rondas completadas ──────────────────────────────────────────────────
      if (newRounds.length > 0) {
        const { defName, attName } = await resolveNames(battle);

        for (let i = 0; i < newRounds.length; i++) {
          const round    = newRounds[i];
          const roundNum = last_round_count + i + 1;
          const ganador  = round.wonBy === "defender" ? defName : attName;

          const defWins = history.slice(0, last_round_count + i + 1).filter((r) => r.wonBy === "defender").length;
          const attWins = history.slice(0, last_round_count + i + 1).filter((r) => r.wonBy === "attacker").length;

          let msg = `⚔️ *Ronda ${roundNum} terminada* — [ver](https://app.warera.io/battle/${battleId})\n\n`;
          msg += `🏆 Ganó: *${ganador}*\n`;
          msg += `📊 Pts: ${defName} ${round.defenderPoints} | ${attName} ${round.attackerPoints}\n`;
          msg += `💥 Daños: ${formatNumber(round.defenderDamages)} vs ${formatNumber(round.attackerDamages)}\n\n`;
          msg += `🛡️ *${defName}*: ${defWins}/${battle.roundsToWin} rondas\n`;
          msg += `⚔️ *${attName}*: ${attWins}/${battle.roundsToWin} rondas`;

          await tg.sendMessage(TRACK_NOTIFY_CHAT, msg, NOTIFY_OPTS);
        }

        await query('UPDATE frente SET last_round_count = $1 WHERE battleid = $2', [history.length, battleId]);
      }

      // ── Batalla terminada ───────────────────────────────────────────────────
      if (!battle.isActive) {
        const { defName, attName } = await resolveNames(battle);
        const ganador = battle.wonBy === "defender" ? defName : attName;

        let msg = `🏁 *Batalla terminada* — [ver](https://app.warera.io/battle/${battleId})\n\n`;
        msg += `🏆 Ganador: *${ganador}*\n`;
        msg += `🛡️ *${defName}*: ${battle.defender.wonRoundsCount}/${battle.roundsToWin} rondas\n`;
        msg += `⚔️ *${attName}*: ${battle.attacker.wonRoundsCount}/${battle.roundsToWin} rondas`;

        await tg.sendMessage(TRACK_NOTIFY_CHAT, msg, NOTIFY_OPTS);
        await query('UPDATE frente SET activo = false WHERE battleid = $1', [battleId]);
        roundState.delete(battleId);
        continue;
      }

      // ── Monitoreo de la ronda activa ────────────────────────────────────────
      await handleActiveRound(battle, row);

    } catch (err) {
      console.error(`[poller] battle ${battleId} error:`, err.message);
    }
  }
}

function start() {
  setInterval(checkBattles, POLL_INTERVAL_MS);
  console.log("✅ Poller de frentes iniciado (cada 5 seg)");
}

module.exports = { start };
