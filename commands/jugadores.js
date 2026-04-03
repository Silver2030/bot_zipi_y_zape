"use strict";

const tg        = require("../telegram");
const { t }     = require("../i18n");
const { getMUData, getCountryData } = require("../api");
const { fetchUsersLite }            = require("../fetchers");
const { getCountryUsers }           = require("../fetchers");
const { analizarBuild, obtenerEstadoPastilla } = require("../game");
const { delay }  = require("../utils");
const { getChatUsuarios } = require("../config");

function dividirEnChunks(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
  return chunks;
}

async function procesarJugadoresGrupo(chatId, args, tipo) {
  if (!args.length) {
    await tg.sendMessage(chatId, t(chatId, tipo === "pais" ? "jugadores_usage_pais" : "jugadores_usage_mu"), { disable_web_page_preview: true });
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
      if (!muData?.members?.length) { await tg.sendMessage(chatId, t(chatId, "jugadores_no_members")); return; }
      items = muData.members.map((userId) => ({ _id: userId }));
      nombreGrupo = muData.name || t(chatId, "mu_sin_nombre");
    }

    if (!items.length) { await tg.sendMessage(chatId, t(chatId, "jugadores_no_players", tipo)); return; }

    const progressMsg = await tg.sendMessage(chatId, t(chatId, "jugadores_processing", items.length));
    const userIds = items.map((x) => x._id);
    const usersData = await fetchUsersLite(userIds, { batchSize: 30 });

    const procesados = [];
    for (let idx = 0; idx < usersData.length; idx++) {
      const userData = usersData[idx];
      if (!userData) continue;
      const { build, nivel }  = analizarBuild(userData);
      const { icono, fecha }  = obtenerEstadoPastilla(userData);
      procesados.push({ username: userData.username, _id: userData._id, icono, fecha, build, nivel });
      if (idx % 30 === 0) {
        await tg.editMessageText(t(chatId, "jugadores_progress", idx + 1, usersData.length), { chat_id: chatId, message_id: progressMsg.message_id });
      }
    }

    await tg.deleteMessage(chatId, progressMsg.message_id);
    if (!procesados.length) { await tg.sendMessage(chatId, t(chatId, "jugadores_no_data")); return; }

    const pvp      = procesados.filter((u) => u.build === "PVP").sort((a, b) => b.nivel - a.nivel);
    const hibridos = procesados.filter((u) => u.build === "HIBRIDA").sort((a, b) => b.nivel - a.nivel);
    const eco      = procesados.filter((u) => u.build === "ECO").sort((a, b) => b.nivel - a.nivel);

    const resumen = t(chatId, "jugadores_resumen", {
      tipo, nombre: nombreGrupo, url: grupoUrl,
      disponibles: procesados.filter((u) => u.icono === "").length,
      activas:     procesados.filter((u) => u.icono === "💊").length,
      debuffs:     procesados.filter((u) => u.icono === "⛔").length,
      total: procesados.length, pvp: pvp.length, hibridos: hibridos.length, eco: eco.length,
    });
    await tg.sendMessage(chatId, resumen, { parse_mode: "Markdown", disable_web_page_preview: true });
    await delay(300);

    const fmt = (u) => {
      let line = `${u.nivel}) [${u.username}](https://app.warera.io/user/${u._id})`;
      if (u.icono) line += ` ${u.icono}`;
      if (u.fecha) line += ` ${u.fecha.toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}`;
      return line;
    };

    for (const [grupo, labelFn] of [[pvp, "jugadores_pvp"], [hibridos, "jugadores_hibrida"], [eco, "jugadores_eco"]]) {
      if (!grupo.length) continue;
      const chunks = dividirEnChunks(grupo, 50);
      for (let i = 0; i < chunks.length; i++) {
        const msg = t(chatId, labelFn, i + 1, chunks.length) + chunks[i].map(fmt).join("\n");
        await tg.sendMessage(chatId, msg, { parse_mode: "Markdown", disable_web_page_preview: true });
        await delay(200);
      }
    }

    const vacias = [];
    if (!pvp.length) vacias.push("PVP");
    if (!hibridos.length) vacias.push("Híbridos");
    if (!eco.length) vacias.push("ECO");
    if (vacias.length) await tg.sendMessage(chatId, t(chatId, "jugadores_vacias", vacias));

  } catch (err) {
    console.error("jugadores error:", err);
    await tg.sendMessage(chatId, t(chatId, "error_generic"));
  }
}

module.exports = {
  jugadorespais: (chatId, args) => procesarJugadoresGrupo(chatId, args, "pais"),
  jugadoresmu:   (chatId, args) => procesarJugadoresGrupo(chatId, args, "mu"),
};
