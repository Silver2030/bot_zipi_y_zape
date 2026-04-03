"use strict";

const tg         = require("../telegram");
const { t }      = require("../i18n");
const { getMUData } = require("../api");
const { fetchUsersLite, getCountryUsers } = require("../fetchers");
const { calcularDanyo } = require("../game");
const { HEAL_FOOD_MAP } = require("../config");
const { formatNumber, delay } = require("../utils");

async function procesarGrupoDanyo(chatId, args, tipo) {
  if (args.length < 2) {
    await tg.sendMessage(chatId, t(chatId, tipo === "pais" ? "danyo_usage_pais" : "danyo_usage_mu"), { disable_web_page_preview: true });
    return;
  }

  const id      = args[0].split("/").pop();
  const comida  = args[1].toUpperCase();
  const healFood = HEAL_FOOD_MAP[comida];

  if (!healFood) { await tg.sendMessage(chatId, t(chatId, "danyo_comida_invalid")); return; }

  try {
    let items = [];

    if (tipo === "pais") {
      items = (await getCountryUsers(id))?.items || [];
    } else {
      const muData = await getMUData(id);
      if (!muData?.members?.length) { await tg.sendMessage(chatId, t(chatId, "danyo_no_members")); return; }
      items = muData.members.map((userId) => ({ _id: userId }));
    }

    const progressMsg = await tg.sendMessage(chatId, t(chatId, "danyo_processing", items.length));
    const userIds  = items.map((x) => x._id);
    const usersData = await fetchUsersLite(userIds, { batchSize: 30 });

    const resultados = [];
    let totalActual = 0, total24h = 0;

    for (let idx = 0; idx < usersData.length; idx++) {
      const userData = usersData[idx];
      if (!userData) continue;
      const { danyoActual, danyo24h } = calcularDanyo(userData, healFood);
      totalActual += danyoActual;
      total24h    += danyo24h;
      resultados.push({ username: userData.username, userId: userData._id, danyoActual, danyo24h });
      if (idx % 25 === 0) {
        await tg.editMessageText(t(chatId, "danyo_progress", idx + 1, usersData.length), { chat_id: chatId, message_id: progressMsg.message_id });
      }
    }

    await tg.deleteMessage(chatId, progressMsg.message_id);
    resultados.sort((a, b) => b.danyoActual - a.danyoActual);

    await tg.sendMessage(chatId, t(chatId, "danyo_resumen", {
      tipo, id, comida,
      totalActual: formatNumber(Math.round(totalActual)),
      total24h:    formatNumber(Math.round(total24h)),
      count: resultados.length,
    }));

    const chunkSize = 10;
    for (let i = 0; i < resultados.length; i += chunkSize) {
      const chunk = resultados.slice(i, i + chunkSize);
      const header = t(chatId, "danyo_chunk_header", i + 1, Math.min(i + chunkSize, resultados.length));
      const body = chunk.map((u, idx2) =>
        `${i + idx2 + 1}. ${u.username}: ${formatNumber(Math.round(u.danyoActual))} (24h: ${formatNumber(Math.round(u.danyo24h))})`
      ).join("\n");
      await tg.sendMessage(chatId, header + body);
      await delay(250);
    }

  } catch (err) {
    console.error("danyo error:", err);
    await tg.sendMessage(chatId, t(chatId, "error_generic"));
  }
}

module.exports = {
  paisesdanyo: (chatId, args) => procesarGrupoDanyo(chatId, args, "pais"),
  mudanyo:     (chatId, args) => procesarGrupoDanyo(chatId, args, "mu"),
};
