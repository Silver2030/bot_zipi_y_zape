"use strict";

const tg = require("../telegram");
const { t } = require("../i18n");
const { getChatLang } = require("../config");
const { apiCall, getCountryData } = require("../api");
const { puntosPorTick } = require("../game");

const DATE_LOCALES = { es: "es-ES", ru: "ru-RU" };

function simularRonda({ ganadorInicial, perdedorInicial, modo }) {
  let ganador = ganadorInicial, perdedor = perdedorInicial, tiempo = 0;
  while (ganador < 300) {
    const ppt = puntosPorTick(ganador + perdedor);
    if (modo === "rapido") ganador += ppt;
    else {
      if (perdedor < 300 - ppt) perdedor += ppt;
      else ganador += ppt;
    }
    tiempo += 2;
  }
  return tiempo;
}

function formatTiempo(minutos) {
  const h  = Math.floor(minutos / 60);
  const mm = Math.round(minutos % 60);
  if (!h)  return `${mm}m`;
  if (!mm) return `${h}h`;
  return `${h}h ${mm}m`;
}

function horaFinal(minutos, dateLocale) {
  return new Date(Date.now() + minutos * 60000).toLocaleTimeString(dateLocale, {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Madrid",
  });
}

async function duracion(chatId, args) {
  if (!args.length) {
    await tg.sendMessage(chatId, t(chatId, "duracion_usage"), { disable_web_page_preview: true });
    return;
  }

  const battleId   = args[0].split("/").pop();
  const dateLocale = DATE_LOCALES[getChatLang(chatId)] ?? "es-ES";

  try {
    const battle = await apiCall("battle.getById", { battleId });
    if (!battle)          { await tg.sendMessage(chatId, t(chatId, "duracion_no_battle")); return; }
    if (!battle.isActive) { await tg.sendMessage(chatId, t(chatId, "duracion_ended"));    return; }

    const roundsToWin   = battle.roundsToWin;
    let defenderWins    = battle.defender.wonRoundsCount;
    let attackerWins    = battle.attacker.wonRoundsCount;

    const [defData, attData] = await Promise.all([
      getCountryData(battle.defender.country),
      getCountryData(battle.attacker.country),
    ]);
    const defenderCountry = defData?.name ?? t(chatId, "defensor");
    const attackerCountry = attData?.name ?? t(chatId, "atacante");

    const round = await apiCall("round.getById", { roundId: battle.currentRound });
    if (!round?.isActive) { await tg.sendMessage(chatId, t(chatId, "duracion_no_round")); return; }

    const defPoints = round.defender.points;
    const attPoints = round.attacker.points;

    const defGana = defenderWins >= attackerWins && defPoints >= attPoints;
    const ganadorRapido = defGana ? defenderCountry : attackerCountry;

    let tiempoRapido = simularRonda({ ganadorInicial: defGana ? defPoints : attPoints, perdedorInicial: defGana ? attPoints : defPoints, modo: "rapido" });
    if ((defGana ? defenderWins : attackerWins) + 1 < roundsToWin)
      tiempoRapido += simularRonda({ ganadorInicial: 0, perdedorInicial: 0, modo: "rapido" });

    let rondaGanador  = (defenderWins > 0 && attackerWins === 0) || (defenderWins === attackerWins && attPoints > defPoints) ? attPoints : defPoints;
    let rondaPerdedor = rondaGanador === defPoints ? attPoints : defPoints;

    let tiempoLento = simularRonda({ ganadorInicial: rondaGanador, perdedorInicial: rondaPerdedor, modo: "lento" });

    if (rondaGanador === defPoints) { defenderWins += 1; }
    else { attackerWins += 1; }

    const winsLento = Math.max(defenderWins, attackerWins);
    if (winsLento < roundsToWin) {
      if (defenderWins === 0 || attackerWins === 0) tiempoLento += simularRonda({ ganadorInicial: 0, perdedorInicial: 0, modo: "lento" });
      tiempoLento += simularRonda({ ganadorInicial: 0, perdedorInicial: 0, modo: "lento" });
    }

    let msg = t(chatId, "duracion_header");
    msg += t(chatId, "duracion_defender", defenderCountry, battle.defender.wonRoundsCount, defPoints);
    msg += t(chatId, "duracion_attacker", attackerCountry, battle.attacker.wonRoundsCount, attPoints);
    msg += t(chatId, "duracion_rapido");
    msg += t(chatId, "duracion_ganador", ganadorRapido);
    msg += t(chatId, "duracion_tiempo",  formatTiempo(tiempoRapido));
    msg += t(chatId, "duracion_finaliza", horaFinal(tiempoRapido, dateLocale));
    msg += "\n";
    msg += t(chatId, "duracion_lento");
    msg += t(chatId, "duracion_tiempo",  formatTiempo(tiempoLento));
    msg += t(chatId, "duracion_finaliza_nl", horaFinal(tiempoLento, dateLocale));

    await tg.sendMessage(chatId, msg, { parse_mode: "Markdown", disable_web_page_preview: true });

  } catch (err) {
    console.error("duracion error:", err);
    await tg.sendMessage(chatId, t(chatId, "error_generic"));
  }
}

module.exports = { duracion };