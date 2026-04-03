"use strict";

const tg = require("../telegram");
const { t } = require("../i18n");
const { apiCall, getUserData, getCountryData, getMUData } = require("../api");
const { fetchUsersLite } = require("../fetchers");
const { analizarBuild } = require("../game");
const { getChatUsuarios } = require("../config");
const { escapeMarkdownV2, formatNumber, delay } = require("../utils");

// ── /help ─────────────────────────────────────────────────────────────────────
function help(chatId) {
  return tg.sendMessage(chatId, t(chatId, "help"));
}

// ── /buscar ───────────────────────────────────────────────────────────────────
async function buscar(chatId, args) {
  if (!args.length) { await tg.sendMessage(chatId, t(chatId, "buscar_usage")); return; }

  const searchText = args.join(" ");
  try {
    const searchData = await apiCall("search.searchAnything", { searchText });
    if (!searchData?.hasData) { await tg.sendMessage(chatId, t(chatId, "buscar_no_results", searchText)); return; }

    const obtener = async (ids, tipo) => {
      const resultados = [];
      for (const id of ids) {
        try {
          let nombre, url;
          if (tipo === "user")    { const d = await getUserData(id);                                   nombre = d?.username || "?";         url = `https://app.warera.io/user/${id}`; }
          if (tipo === "country") { const d = await getCountryData(id);                                nombre = d?.name    || "?";          url = `https://app.warera.io/country/${id}`; }
          if (tipo === "mu")      { const d = await getMUData(id);                                     nombre = d?.name    || "?";          url = `https://app.warera.io/mu/${id}`; }
          if (tipo === "region")  { const d = await apiCall("region.getById", { regionId: id });       nombre = d?.name    || "?";          url = `https://app.warera.io/region/${id}`; }
          if (nombre && url) resultados.push({ nombre, url, id });
        } catch { resultados.push({ nombre: `${tipo} ${id}`, url: `https://app.warera.io/${tipo}/${id}`, id }); }
        await delay(60);
      }
      return resultados;
    };

    const categorias = [
      { key: "userIds",    label: t(chatId, "buscar_usuarios"), tipo: "user" },
      { key: "muIds",      label: t(chatId, "buscar_mus"),      tipo: "mu" },
      { key: "countryIds", label: t(chatId, "buscar_paises"),   tipo: "country" },
      { key: "regionIds",  label: t(chatId, "buscar_regiones"), tipo: "region" },
    ];

    for (const cat of categorias) {
      if (searchData[cat.key]?.length) cat.datos = await obtener(searchData[cat.key], cat.tipo);
    }

    let msg = t(chatId, "buscar_header", escapeMarkdownV2(searchText));
    for (const { label, datos = [] } of categorias) {
      if (!datos.length) continue;
      msg += `*${label}*\n`;
      datos.forEach(({ nombre, url, id }) => {
        msg += `[${escapeMarkdownV2(nombre)}](${escapeMarkdownV2(url)}) \\- ${escapeMarkdownV2(id)}\n`;
      });
      msg += "\n";
    }

    await tg.sendMessage(chatId, msg, { parse_mode: "MarkdownV2", disable_web_page_preview: true });

  } catch (err) {
    console.error("buscar error:", err);
    await tg.sendMessage(chatId, t(chatId, "buscar_error"));
  }
}

// ── /hambre ───────────────────────────────────────────────────────────────────
async function hambre(chatId, args) {
  if (!args[0]) { await tg.sendMessage(chatId, t(chatId, "hambre_usage"), { disable_web_page_preview: true }); return; }

  const urlBattle   = args[0];
  const mensajeExtra = args.slice(1).join(" ");
  const usuarios    = getChatUsuarios(chatId);
  const menciones   = [];

  const usersData = await fetchUsersLite(usuarios.map((u) => u.userId), { batchSize: 30 });

  for (let i = 0; i < usuarios.length; i++) {
    const userData = usersData[i];
    if (!userData) continue;
    const { build } = analizarBuild(userData);
    if (build === "ECO") continue;
    const hunger = userData.skills?.hunger;
    if (hunger && hunger.currentBarValue >= 0.3 * hunger.total) {
      menciones.push(`${usuarios[i].mention} (${userData.username})`);
    }
  }

  if (!menciones.length) { await tg.sendMessage(chatId, t(chatId, "hambre_nadie")); return; }

  await tg.sendMessage(chatId, `${urlBattle}\n${mensajeExtra}`, { disable_web_page_preview: true });
  for (let i = 0; i < menciones.length; i += 5) {
    await tg.sendMessage(chatId, menciones.slice(i, i + 5).join("\n"));
    await delay(400);
  }
}

// ── /danyosemanal ─────────────────────────────────────────────────────────────
async function danyosemanal(chatId) {
  try {
    const usuarios  = getChatUsuarios(chatId);
    const usersData = await fetchUsersLite(usuarios.map((u) => u.userId), { batchSize: 30 });

    const resultados = usersData
      .filter(Boolean)
      .map((d) => ({ username: d.username, weeklyDamage: d.rankings?.weeklyUserDamages?.value ?? 0 }))
      .sort((a, b) => b.weeklyDamage - a.weeklyDamage);

    if (!resultados.length) { await tg.sendMessage(chatId, t(chatId, "danyosemanal_no_data")); return; }

    const total = resultados.reduce((s, r) => s + r.weeklyDamage, 0);
    const media = Math.round(total / resultados.length);

    const lista = resultados.map((r, i) => `${i + 1}) ${r.username}: ${formatNumber(r.weeklyDamage)}`).join("\n");
    await tg.sendMessage(chatId, t(chatId, "danyosemanal_header") + lista + t(chatId, "danyosemanal_media", formatNumber(media)));

  } catch (err) {
    console.error("danyosemanal error:", err);
    await tg.sendMessage(chatId, t(chatId, "error_generic"));
  }
}

// ── /all ──────────────────────────────────────────────────────────────────────
async function all(chatId) {
  try {
    const usuarios = getChatUsuarios(chatId);
    const unicas   = [...new Set(usuarios.map((u) => u.mention))];
    if (!unicas.length) { await tg.sendMessage(chatId, t(chatId, "all_nobody")); return; }
    for (let i = 0; i < unicas.length; i += 5) {
      await tg.sendMessage(chatId, unicas.slice(i, i + 5).join("\n"));
      if (i + 5 < unicas.length) await delay(250);
    }
  } catch (err) {
    console.error("all error:", err);
    await tg.sendMessage(chatId, t(chatId, "error_generic"));
  }
}

module.exports = { help, buscar, hambre, danyosemanal, all };

// ── /id ───────────────────────────────────────────────────────────────────────
async function id(chatId) {
  await tg.sendMessage(chatId, `Chat ID: \`${chatId}\``, { parse_mode: "Markdown" });
}

// ── /status (solo admin) ──────────────────────────────────────────────────────
async function status(chatId) {
  const { getCacheSize } = require("../api");
  const { CHAT_ID }      = require("../config");

  if (chatId !== CHAT_ID) return; // solo el admin

  const uptime  = process.uptime();
  const h       = Math.floor(uptime / 3600);
  const m       = Math.floor((uptime % 3600) / 60);
  const s       = Math.floor(uptime % 60);
  const mem     = process.memoryUsage();
  const mbUsed  = (mem.heapUsed / 1024 / 1024).toFixed(1);
  const mbTotal = (mem.heapTotal / 1024 / 1024).toFixed(1);

  const msg = `*Status del bot*\n\n` +
    `⏱ Uptime: ${h}h ${m}m ${s}s\n` +
    `💾 Memoria: ${mbUsed} MB / ${mbTotal} MB\n` +
    `📦 Caché: ${getCacheSize()} entradas`;

  await tg.sendMessage(chatId, msg, { parse_mode: "Markdown" });
}

module.exports = { ...module.exports, id, status };
