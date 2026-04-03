"use strict";

const tg = require("../telegram");
const { t } = require("../i18n");
const { getMUData, getCountryData } = require("../api");
const { fetchUsersLite, fetchCompaniesByUser, fetchCompaniesById, getCountryUsers } = require("../fetchers");
const { escapeMarkdownV2, formatNumberMarkdown, delay, generarExcelBuffer } = require("../utils");

const CHUNK_DELAY_MS    = 900;
const ENVIAR_EN_CHAT    = true;

async function procesarDineroGrupo(chatId, args, tipo) {
  if (!args.length) {
    await tg.sendMessage(chatId, t(chatId, tipo === "pais" ? "dinero_usage_pais" : "dinero_usage_mu"), { disable_web_page_preview: true });
    return;
  }

  const id = args[0].split("/").pop();

  try {
    let items = [], nombreGrupo = "Sin nombre";
    const grupoUrl = `https://app.warera.io/${tipo}/${id}`;

    if (tipo === "pais") {
      items = (await getCountryUsers(id))?.items || [];
      try { nombreGrupo = (await getCountryData(id))?.name || t(chatId, "pais_desconocido"); }
      catch { nombreGrupo = t(chatId, "pais_desconocido"); }
    } else {
      const muData = await getMUData(id);
      if (!muData?.members?.length) { await tg.sendMessage(chatId, t(chatId, "dinero_no_members")); return; }
      items = muData.members.map((userId) => ({ _id: userId }));
      nombreGrupo = muData.name || t(chatId, "mu_sin_nombre");
    }

    if (!items.length) { await tg.sendMessage(chatId, t(chatId, "dinero_no_players", tipo)); return; }

    const progressMsg = await tg.sendMessage(chatId, t(chatId, "dinero_loading", items.length));
    const userIds = items.map((x) => x._id);
    const usersData = await fetchUsersLite(userIds, { batchSize: 30 });

    await tg.editMessageText(t(chatId, "dinero_loading_companies", userIds.length), { chat_id: chatId, message_id: progressMsg.message_id });
    const companiesByUser = await fetchCompaniesByUser(userIds, { batchSize: 20 });

    const allCompanyIds = [];
    for (const uid of userIds) allCompanyIds.push(...(companiesByUser.get(uid) || []));

    await tg.editMessageText(t(chatId, "dinero_loading_data", new Set(allCompanyIds).size), { chat_id: chatId, message_id: progressMsg.message_id });
    const companyById = await fetchCompaniesById(allCompanyIds, { batchSize: 40 });

    const resultados = [];
    let totalWealth = 0, totalFactoryWealth = 0, totalLiquidWealth = 0, totalFactories = 0;

    for (let idx = 0; idx < usersData.length; idx++) {
      const userData = usersData[idx];
      const userId   = userIds[idx];
      if (!userData) continue;

      let totalWealthValue = userData.rankings?.userWealth?.value || 0;
      const companyIds = companiesByUser.get(userId) || [];
      let factoryWealth = 0, factoryCount = 0, disabledFactoryWealth = 0;

      for (const companyId of companyIds) {
        const company = companyById.get(companyId);
        if (!company?.estimatedValue) continue;
        factoryWealth += company.estimatedValue;
        factoryCount++;
        if (company.disabledAt) disabledFactoryWealth += company.estimatedValue;
      }

      if (disabledFactoryWealth > 0) totalWealthValue += disabledFactoryWealth;
      const liquidWealth = totalWealthValue - factoryWealth;

      resultados.push({ username: userData.username, userId, level: userData.leveling?.level || 0, totalWealth: totalWealthValue, factoryWealth, liquidWealth, factoryCount, hasDisabledFactories: disabledFactoryWealth > 0 });

      totalWealth        += totalWealthValue;
      totalFactoryWealth += factoryWealth;
      totalLiquidWealth  += liquidWealth;
      totalFactories     += factoryCount;

      if (idx % 80 === 0) {
        await tg.editMessageText(t(chatId, "dinero_calculating", idx + 1, usersData.length), { chat_id: chatId, message_id: progressMsg.message_id });
      }
    }

    await tg.deleteMessage(chatId, progressMsg.message_id);
    if (!resultados.length) { await tg.sendMessage(chatId, t(chatId, "dinero_no_data")); return; }

    const count = resultados.length;
    resultados.sort((a, b) => b.totalWealth - a.totalWealth);

    const resumen = t(chatId, "dinero_resumen", {
      nombre: escapeMarkdownV2(nombreGrupo),
      url:    escapeMarkdownV2(grupoUrl),
      count,
      totalWealth:        formatNumberMarkdown(totalWealth),
      totalFactoryWealth: formatNumberMarkdown(totalFactoryWealth),
      totalLiquidWealth:  formatNumberMarkdown(totalLiquidWealth),
      totalFactories,
      avgWealth:        formatNumberMarkdown(totalWealth / count),
      avgFactoryWealth: formatNumberMarkdown(totalFactoryWealth / count),
      avgLiquidWealth:  formatNumberMarkdown(totalLiquidWealth / count),
      avgFactories:     escapeMarkdownV2((totalFactories / count).toFixed(1)),
    });

    await tg.sendMessage(chatId, resumen, { parse_mode: "MarkdownV2", disable_web_page_preview: true });

    // Excel
    try {
      const excelMsg  = await tg.sendMessage(chatId, t(chatId, "generating_excel"));
      const raw       = generarExcelBuffer(resultados, nombreGrupo);
      const buf       = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
      if (!buf.length) throw new Error("Buffer vacío");
      const fileName  = `dinero_${tipo}_${nombreGrupo.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.xlsx`;
      await tg.sendDocument(chatId, buf, {}, { filename: fileName, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      await tg.deleteMessage(chatId, excelMsg.message_id);
    } catch (err) {
      console.error("Excel error:", err?.message);
      await tg.sendMessage(chatId, t(chatId, "excel_error"));
    }

    // Lista en chat
    if (ENVIAR_EN_CHAT) {
      const chunkSize = 10;
      for (let i = 0; i < resultados.length; i += chunkSize) {
        const chunk = resultados.slice(i, i + chunkSize);
        let msg = t(chatId, "dinero_chunk_header", i + 1, Math.min(i + chunkSize, resultados.length));

        chunk.forEach((jugador, idx2) => {
          const gi  = i + idx2 + 1;
          const usr = escapeMarkdownV2(jugador.username);
          const uid = escapeMarkdownV2(jugador.userId);
          msg += `${gi}\\) ${usr}`;
          if (jugador.hasDisabledFactories) msg += ` ⚠️`;
          msg += `\nhttps://app\\.warera\\.io/user/${uid}\n`;
          msg += `${t(chatId, "dinero_wealth_label")} ${formatNumberMarkdown(jugador.totalWealth)} \\| `;
          msg += `${t(chatId, "dinero_fab_wealth")} ${formatNumberMarkdown(jugador.factoryWealth)}\n`;
          msg += `${t(chatId, "dinero_liquid")} ${formatNumberMarkdown(jugador.liquidWealth)} \\| `;
          msg += `${t(chatId, "dinero_fab_count", jugador.factoryCount)}\n\n`;
        });

        await tg.sendMessage(chatId, msg, { parse_mode: "MarkdownV2", disable_web_page_preview: true });
        await delay(CHUNK_DELAY_MS);
      }
    }

  } catch (err) {
    console.error("dinero error:", err);
    await tg.sendMessage(chatId, t(chatId, "error_generic"));
  }
}

module.exports = {
  dineropais: (chatId, args) => procesarDineroGrupo(chatId, args, "pais"),
  dineromu:   (chatId, args) => procesarDineroGrupo(chatId, args, "mu"),
};
