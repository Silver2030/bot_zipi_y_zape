/**
 * BOT WARERA - versión optimizada con:
 * ✅ tRPC batch requests (si el backend lo soporta)
 * ✅ fallback automático a concurrencia limitada si batch no funciona
 * ✅ caché en memoria (TTL) para user/company/country/mu
 *
 * Copy-paste tal cual.
 */

const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const express = require("express");
const XLSX = require("xlsx");

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// --- Configuraciones y constantes ---
const GROUP_ID = -1003341630162;
const GROUP_PRUEBAS_ID = -1003246477704;
const CHAT_ID = 696082291;

const HEAL_FOOD_MAP = { PAN: 10, FILETE: 20, PESCADO: 30 };
const SKILL_COSTS = [0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55];
const PVP_SKILLS = ["health", "hunger", "attack", "criticalChance", "criticalDamages", "armor", "precision", "dodge"];
const ECO_SKILLS = ["energy", "companies", "entrepreneurship", "production", "lootChance"];

const usuarios = [
  { userId: "686f9befee16d37c418cd087", mention: "@SilverFRE" },
  { userId: "686eefe3ee16d37c417a0e59", mention: "@lodensy" },
  { userId: "68386302a484755f062b16a8", mention: "@GaryRr" },
  { userId: "68703ddf37ff51dd0dc590d0", mention: "@TowDl" },
  { userId: "68f8f5ad5dc34ed689e1784c", mention: "@maromaromero" },
  { userId: "686bca33b7dc5cb1d7710a47", mention: "@BZ_033" },
  { userId: "68979dcdd2bf43cdb31abb9f", mention: "@XBrotherX" },
  { userId: "69264c4ccc751d7f45f2f8f4", mention: "@Kaiado" },
];

// -------------------------
// Utilidades
// -------------------------
function escapeMarkdownV2(text) {
  if (typeof text !== "string") text = String(text);
  return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, "\\$1");
}
function formatNumber(num) {
  return num.toLocaleString("es-ES");
}
function formatNumberMarkdown(num) {
  const formatted = num.toLocaleString("es-ES");
  return escapeMarkdownV2(formatted);
}
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// -------------------------
// Cache simple con TTL
// -------------------------
const cache = new Map(); // key -> { value, exp }
function cacheGet(key) {
  const x = cache.get(key);
  if (!x) return null;
  if (Date.now() > x.exp) {
    cache.delete(key);
    return null;
  }
  return x.value;
}
function cacheSet(key, value, ttlMs = 60_000) {
  cache.set(key, { value, exp: Date.now() + ttlMs });
}

// -------------------------
// Concurrencia limitada (fallback si no hay batch)
// -------------------------
async function mapLimit(items, limit, fn) {
  const ret = new Array(items.length);
  let idx = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (idx < items.length) {
      const current = idx++;
      try {
        ret[current] = await fn(items[current], current);
      } catch {
        ret[current] = null;
      }
    }
  });

  await Promise.all(workers);
  return ret;
}

// -------------------------
// API Helpers (con batch)
// -------------------------
const TRPC_BASE = "https://api2.warera.io/trpc";

/**
 * Llamada normal
 */
async function apiCall(endpoint, params) {
  const url = `${TRPC_BASE}/${endpoint}?input=${encodeURIComponent(JSON.stringify(params))}`;
  const response = await axios.get(url);
  return response.data?.result?.data;
}

/**
 * Batch (tRPC):
 * GET /trpc/ep1,ep2,ep3?batch=1&input={"0":{...},"1":{...}}
 * Devuelve array con data en el mismo orden.
 *
 * Si el backend no soporta batch, lanza error y el caller hace fallback.
 */
async function apiBatchCall(requests) {
  if (!requests?.length) return [];

  const endpoints = requests.map((r) => r.endpoint).join(",");
  const input = {};
  requests.forEach((r, i) => {
    input[i] = r.params;
  });

  const url = `${TRPC_BASE}/${endpoints}?batch=1&input=${encodeURIComponent(JSON.stringify(input))}`;
  const res = await axios.get(url);

  // tRPC batch suele responder con array: [{result:{data}}, {result:{data}}, ...] o [{error}, ...]
  if (!Array.isArray(res.data)) {
    throw new Error("Batch no soportado (respuesta no-array)");
  }

  return res.data.map((x) => x?.result?.data ?? null);
}

/**
 * Helper genérico: intenta batch por chunks y si falla usa mapLimit
 */
async function fetchInBatches({
  items,
  batchSize = 30,
  pauseMs = 120,
  batchRequestBuilder, // (sliceItem) => { endpoint, params }
  fallbackFn, // async (sliceItem) => data
  fallbackConcurrency = 10,
}) {
  const out = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const slice = items.slice(i, i + batchSize);

    // Intento batch
    try {
      const reqs = slice.map(batchRequestBuilder);
      const batchRes = await apiBatchCall(reqs);
      out.push(...batchRes);
    } catch (e) {
      // Fallback a concurrencia limitada
      const fallbackRes = await mapLimit(slice, fallbackConcurrency, fallbackFn);
      out.push(...fallbackRes);
    }

    if (i + batchSize < items.length) await delay(pauseMs);
  }

  return out;
}

// -------------------------
// Endpoints específicos (con cache)
// -------------------------
async function getUserData(userId) {
  const key = `user:${userId}`;
  const hit = cacheGet(key);
  if (hit) return hit;
  const data = await apiCall("user.getUserLite", { userId });
  if (data) cacheSet(key, data, 60_000);
  return data;
}

async function getMUData(muId) {
  const key = `mu:${muId}`;
  const hit = cacheGet(key);
  if (hit) return hit;
  const data = await apiCall("mu.getById", { muId });
  if (data) cacheSet(key, data, 60_000);
  return data;
}

async function getCountryData(countryId) {
  const key = `country:${countryId}`;
  const hit = cacheGet(key);
  if (hit) return hit;
  const data = await apiCall("country.getCountryById", { countryId });
  if (data) cacheSet(key, data, 5 * 60_000);
  return data;
}

async function getUserCompanies(userId) {
  // Ojo: esto puede variar mucho, TTL corto
  const key = `companiesByUser:${userId}`;
  const hit = cacheGet(key);
  if (hit) return hit;
  const data = await apiCall("company.getCompanies", { userId, perPage: 50 });
  if (data) cacheSet(key, data, 30_000);
  return data;
}

async function getCompanyData(companyId) {
  const key = `company:${companyId}`;
  const hit = cacheGet(key);
  if (hit) return hit;
  const data = await apiCall("company.getById", { companyId });
  if (data) cacheSet(key, data, 2 * 60_000);
  return data;
}

async function getBattleRanking(battleId, dataType, type, side) {
  return apiCall("battleRanking.getRanking", { battleId, dataType, type, side });
}

// -------------------------
// Batch fetchers concretos
// -------------------------
async function fetchUsersLite(userIds, { batchSize = 30 } = {}) {
  return fetchInBatches({
    items: userIds,
    batchSize,
    pauseMs: 120,
    batchRequestBuilder: (userId) => ({ endpoint: "user.getUserLite", params: { userId } }),
    fallbackFn: (userId) => getUserData(userId),
    fallbackConcurrency: 10,
  });
}

async function fetchCompaniesByUser(userIds, { batchSize = 20 } = {}) {
  const res = await fetchInBatches({
    items: userIds,
    batchSize,
    pauseMs: 150,
    batchRequestBuilder: (userId) => ({ endpoint: "company.getCompanies", params: { userId, perPage: 50 } }),
    fallbackFn: (userId) => getUserCompanies(userId),
    fallbackConcurrency: 8,
  });

  // Map userId -> items[]
  const map = new Map();
  userIds.forEach((uid, idx) => {
    map.set(uid, res[idx]?.items || []);
  });
  return map;
}

async function fetchCompaniesById(companyIds, { batchSize = 40 } = {}) {
  const unique = [...new Set(companyIds.filter(Boolean))];

  const res = await fetchInBatches({
    items: unique,
    batchSize,
    pauseMs: 150,
    batchRequestBuilder: (companyId) => ({ endpoint: "company.getById", params: { companyId } }),
    fallbackFn: (companyId) => getCompanyData(companyId),
    fallbackConcurrency: 10,
  });

  const map = new Map();
  unique.forEach((cid, idx) => map.set(cid, res[idx] || null));
  return map;
}

// -------------------------
// Paginación país (igual que antes, pero con delays suaves)
// -------------------------
async function getCountryUsers(countryId) {
  let allItems = [];
  let nextCursor = null;
  let page = 1;

  do {
    console.log(`📄 Obteniendo página ${page} de usuarios del país...`);

    const queryParams = { countryId, limit: 100 };
    if (nextCursor) {
      queryParams.cursor = nextCursor;
      console.log(`🔁 Usando cursor: ${nextCursor}`);
    }

    const usersData = await apiCall("user.getUsersByCountry", queryParams);
    if (usersData?.items) {
      allItems = allItems.concat(usersData.items);
      nextCursor = usersData.nextCursor || null;
      console.log(`✅ Página ${page}: ${usersData.items.length} usuarios, nextCursor: ${nextCursor ? "Sí" : "No"}`);
    } else {
      nextCursor = null;
    }

    page++;
    if (nextCursor) await delay(200);
  } while (nextCursor && page < 20);

  console.log(`📊 Total de usuarios obtenidos del país: ${allItems.length}`);
  return { items: allItems };
}

// -------------------------
// Duración rondas (igual que antes)
// -------------------------
function puntosPorTick(total) {
  if (total < 100) return 1;
  if (total < 200) return 2;
  if (total < 300) return 3;
  if (total < 400) return 4;
  if (total < 500) return 5;
  return 6;
}
function duracionRondaRapida(puntosIniciales = 0, puntosRival = 0) {
  let puntos = puntosIniciales;
  let total = puntosIniciales + puntosRival;
  let tiempo = 0;

  while (puntos < 300) {
    const ppt = puntosPorTick(total);
    puntos += ppt;
    total += ppt;
    tiempo += 2;
  }
  return tiempo;
}
function duracionRondaLenta(puntosA = 0, puntosB = 0) {
  let total = puntosA + puntosB;
  let tiempo = 0;

  let faltan299 = 299 - Math.max(puntosA, puntosB);
  while (faltan299 > 0) {
    const ppt = puntosPorTick(total);
    faltan299 -= ppt;
    total += ppt;
    tiempo += 2;
  }

  let faltan300 = 300;
  while (faltan300 > 0) {
    const ppt = puntosPorTick(total);
    faltan300 -= ppt;
    total += ppt;
    tiempo += 2;
  }

  return tiempo;
}

// -------------------------
// Excel (igual que antes)
// -------------------------
function generarExcelBuffer(resultados, nombreGrupo) {
  const workbook = XLSX.utils.book_new();

  const datos = [["Ranking", "Name", "Url", "Level", "Companies", "Wealth", "Companies Wealth", "Player Wealth", "Factory Disabled"]];

  resultados.forEach((jugador, index) => {
    datos.push([
      index + 1,
      jugador.username,
      `https://app.warera.io/user/${jugador.userId}`,
      jugador.level || "N/A",
      jugador.factoryCount,
      jugador.totalWealth,
      jugador.factoryWealth,
      jugador.liquidWealth,
      jugador.hasDisabledFactories ? "Yes" : "No",
    ]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(datos);
  const range = XLSX.utils.decode_range(worksheet["!ref"]);

  const headerColor = { rgb: "4F81BD" };
  const evenRowColor = { rgb: "DCE6F1" };
  const oddRowColor = { rgb: "F2F2F2" };

  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cell_ref = XLSX.utils.encode_cell({ c: C, r: R });
      if (!worksheet[cell_ref]) continue;

      if (!worksheet[cell_ref].s) worksheet[cell_ref].s = {};

      if (R === 0) {
        worksheet[cell_ref].s.fill = { fgColor: headerColor };
        worksheet[cell_ref].s.font = { bold: true, color: { rgb: "FFFFFF" } };
      } else {
        worksheet[cell_ref].s.fill = { fgColor: R % 2 === 0 ? evenRowColor : oddRowColor };
      }

      worksheet[cell_ref].s.border = {
        top: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } },
      };

      worksheet[cell_ref].s.alignment = { horizontal: "center", vertical: "center" };
    }
  }

  worksheet["!cols"] = [
    { wch: 10 },
    { wch: 20 },
    { wch: 40 },
    { wch: 8 },
    { wch: 12 },
    { wch: 15 },
    { wch: 18 },
    { wch: 15 },
    { wch: 15 },
  ];

  worksheet["!autofilter"] = { ref: "A1:I1" };
  XLSX.utils.book_append_sheet(workbook, worksheet, "Datos");

  const excelBuffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
    bookSST: false,
    compression: false,
    cellStyles: true,
  });

  return excelBuffer;
}

// -------------------------
// Daño (igual que antes; si quieres más velocidad, te lo dejo igual por compatibilidad)
// -------------------------
function calcularDanyo(userData, healFood) {
  const skills = userData.skills;
  const atk = skills.attack?.total || 0;
  const critChance = (skills.criticalChance?.total || 0) / 100;
  const critDmg = (skills.criticalDamages?.total || 0) / 100;
  const precision = (skills.precision?.total || 0) / 100;
  const armor = Math.min((skills.armor?.total || 0) / 100, 0.9);
  const dodge = (skills.dodge?.total || 0) / 100;

  const hpNow = (skills.health?.currentBarValue || 0) + Math.floor(skills.hunger?.currentBarValue || 0) * healFood;
  const hpRegen24h = skills.health?.total * 0.1 * 24;
  const hungerRegen24h = Math.floor(skills.hunger?.total * 0.1 * 24) * healFood;
  const hp24h = hpRegen24h + hungerRegen24h;

  function simularCombate(hpTotal) {
    const simulaciones = 10000;
    let totalDanyo = 0;

    for (let i = 0; i < simulaciones; i++) {
      let hp = hpTotal;
      let dmg = 0;
      let comidaRestante = Math.floor(skills.hunger?.currentBarValue || 0);

      while (hp >= 10) {
        let baseDmg = atk;
        if (Math.random() < critChance) baseDmg *= 1 + critDmg;
        if (Math.random() >= precision) baseDmg *= 0.5;

        dmg += baseDmg;

        const esquiva = Math.random() < dodge;
        if (!esquiva) {
          let damageTaken = 10 * (1 - armor);
          damageTaken = Math.max(1, damageTaken);
          if (hp <= damageTaken) break;
          hp -= damageTaken;
        }

        while (hp < 10 && comidaRestante > 0) {
          hp += healFood;
          comidaRestante -= 1;
        }

        if (hp < 10) break;
      }
      totalDanyo += dmg;
    }
    return totalDanyo / simulaciones;
  }

  return {
    danyoActual: simularCombate(hpNow),
    danyo24h: simularCombate(hp24h),
  };
}

// -------------------------
// Build / pastillas (igual que antes)
// -------------------------
function analizarBuild(userData) {
  let pvpPoints = 0,
    ecoPoints = 0;

  PVP_SKILLS.forEach((skill) => (pvpPoints += SKILL_COSTS[userData.skills[skill]?.level || 0]));
  ECO_SKILLS.forEach((skill) => (ecoPoints += SKILL_COSTS[userData.skills[skill]?.level || 0]));

  const total = pvpPoints + ecoPoints;
  const pctPvp = total ? (pvpPoints / total) * 100 : 0;

  let build = "HIBRIDA";
  if (pctPvp > 65) build = "PVP";
  else if (pctPvp < 35) build = "ECO";

  return { build, nivel: userData.leveling?.level || 0 };
}
function obtenerEstadoPastilla(userData) {
  const buffs = userData.buffs;
  if (buffs?.buffCodes?.length) return { icono: "💊", fecha: new Date(buffs.buffEndAt) };
  if (buffs?.debuffCodes?.length) return { icono: "⛔", fecha: new Date(buffs.debuffEndAt) };
  return { icono: "", fecha: null };
}

// -------------------------
// Procesamiento grupos (OPTIMIZADO)
// -------------------------
async function procesarGrupoDanyo(chatId, args, tipo) {
  if (args.length < 2) {
    const ejemplo =
      tipo === "pais"
        ? "/paisesDanyo https://app.warera.io/country/683ddd2c24b5a2e114af15d9 PESCADO"
        : "/muDanyo https://app.warera.io/mu/687cbb53fae4c9cf04340e77 PESCADO";
    tgSendMessageSafe(chatId, `Ejemplo: ${ejemplo}`, { parse_mode: "Markdown", disable_web_page_preview: true });
    return;
  }

  const id = args[0].split("/").pop();
  const comida = args[1].toUpperCase();
  const healFood = HEAL_FOOD_MAP[comida];

  if (!healFood) {
    tgSendMessageSafe(chatId, "Comida inválida. Usa PAN, FILETE o PESCADO.");
    return;
  }

  try {
    let items = [];

    if (tipo === "pais") {
      const countryData = await getCountryUsers(id);
      items = countryData?.items || [];
    } else {
      const muData = await getMUData(id);
      if (!muData?.members?.length) {
        tgSendMessageSafe(chatId, "No se encontraron miembros en esa MU.");
        return;
      }
      items = muData.members.map((userId) => ({ _id: userId }));
    }

    const progressMsg = await tgSendMessageSafe(chatId, `⚙️ Procesando ${items.length} jugadores...`);

    const userIds = items.map((x) => x._id);
    const usersData = await fetchUsersLite(userIds, { batchSize: 30 });

    const resultados = [];
    let totalActual = 0;
    let total24h = 0;

    for (let idx = 0; idx < usersData.length; idx++) {
      const userData = usersData[idx];
      if (!userData) continue;

      const { danyoActual, danyo24h } = calcularDanyo(userData, healFood);
      totalActual += danyoActual;
      total24h += danyo24h;

      resultados.push({
        username: userData.username,
        userId: userData._id,
        danyoActual,
        danyo24h,
      });

      if (idx % 25 === 0) {
        await tgEditMessageTextSafe(`⚙️ Procesando ${idx + 1}/${usersData.length} jugadores...`, {
          chat_id: chatId,
          message_id: progressMsg.message_id,
        });
      }
    }

    await tgDeleteMessageSafe(chatId, progressMsg.message_id);

    resultados.sort((a, b) => b.danyoActual - a.danyoActual);

    const mensajeResumen = [
      `🏛️ ${tipo === "pais" ? "País" : "MU"}: https://app.warera.io/${tipo}/${id}`,
      `🍖 Comida: ${comida}`,
      `⚔️ Daño disponible: ${Math.round(totalActual).toLocaleString("es-ES")}`,
      `🕐 Daño 24h: ${Math.round(total24h).toLocaleString("es-ES")}`,
      `👥 Jugadores: ${resultados.length}`,
    ].join("\n");

    await tgSendMessageSafe(chatId, mensajeResumen);

    const chunkSize = 10;
    for (let i = 0; i < resultados.length; i += chunkSize) {
      const chunk = resultados.slice(i, i + chunkSize);
      const mensajeChunk = chunk
        .map((u, index) => {
          const globalIndex = i + index + 1;
          return `${globalIndex}. ${u.username}: ${Math.round(u.danyoActual).toLocaleString("es-ES")} (24h: ${Math.round(u.danyo24h).toLocaleString("es-ES")})`;
        })
        .join("\n");

      const header = `📊 Jugadores ${i + 1}-${Math.min(i + chunkSize, resultados.length)}:\n\n`;
      await tgSendMessageSafe(chatId, header + mensajeChunk);
      await delay(250);
    }
  } catch (error) {
    console.error(error?.message || error);
    tgSendMessageSafe(chatId, "Error al procesar el comando.");
  }
}

async function procesarJugadoresGrupo(chatId, args, tipo) {
  if (args.length < 1) {
    const ejemplo =
      tipo === "pais"
        ? "/jugadoresPais https://app.warera.io/country/6813b6d446e731854c7ac7ae"
        : "/jugadoresMu https://app.warera.io/mu/687cbb53fae4c9cf04340e77";
    tgSendMessageSafe(chatId, `Ejemplo: ${ejemplo}`, { parse_mode: "Markdown", disable_web_page_preview: true });
    return;
  }

  const id = args[0].split("/").pop();

  try {
    let items = [];
    let nombreGrupo = "Sin nombre";
    let grupoUrl = `https://app.warera.io/${tipo}/${id}`;

    if (tipo === "pais") {
      const countryData = await getCountryUsers(id);
      items = countryData?.items || [];
      try {
        const countryInfo = await getCountryData(id);
        nombreGrupo = countryInfo?.name || "País Desconocido";
      } catch {
        nombreGrupo = "País Desconocido";
      }
    } else {
      const muData = await getMUData(id);
      if (!muData?.members?.length) {
        tgSendMessageSafe(chatId, "No se encontraron miembros en esa MU.");
        return;
      }
      items = muData.members.map((userId) => ({ _id: userId }));
      nombreGrupo = muData.name || "MU Sin nombre";
    }

    if (!items.length) {
      tgSendMessageSafe(chatId, `No se encontraron jugadores en el ${tipo === "pais" ? "país" : "MU"} especificado.`);
      return;
    }

    const progressMsg = await tgSendMessageSafe(chatId, `📊 Procesando ${items.length} jugadores...`);

    const userIds = items.map((x) => x._id);
    const usersData = await fetchUsersLite(userIds, { batchSize: 30 });

    const usuariosProcesados = [];

    for (let idx = 0; idx < usersData.length; idx++) {
      const userData = usersData[idx];
      if (!userData) continue;

      const { build, nivel } = analizarBuild(userData);
      const { icono, fecha } = obtenerEstadoPastilla(userData);

      usuariosProcesados.push({
        username: userData.username,
        _id: userData._id,
        icono,
        fecha,
        build,
        nivel,
      });

      if (idx % 30 === 0) {
        await tgEditMessageTextSafe(`📊 Procesando ${idx + 1}/${usersData.length} jugadores...`, {
          chat_id: chatId,
          message_id: progressMsg.message_id,
        });
      }
    }

    await tgDeleteMessageSafe(chatId, progressMsg.message_id);

    if (!usuariosProcesados.length) {
      tgSendMessageSafe(chatId, "No se pudieron procesar los datos de ningún jugador.");
      return;
    }

    const pvp = usuariosProcesados.filter((u) => u.build === "PVP").sort((a, b) => b.nivel - a.nivel);
    const hibridos = usuariosProcesados.filter((u) => u.build === "HIBRIDA").sort((a, b) => b.nivel - a.nivel);
    const eco = usuariosProcesados.filter((u) => u.build === "ECO").sort((a, b) => b.nivel - a.nivel);

    const disponibles = usuariosProcesados.filter((u) => u.icono === "").length;
    const activas = usuariosProcesados.filter((u) => u.icono === "💊").length;
    const debuffs = usuariosProcesados.filter((u) => u.icono === "⛔").length;

    function dividirEnChunks(array, chunkSize) {
      const chunks = [];
      for (let i = 0; i < array.length; i += chunkSize) chunks.push(array.slice(i, i + chunkSize));
      return chunks;
    }

    const mensajeResumen = [
      `🏛️ ${tipo === "pais" ? "PAÍS" : "MU"}: [${nombreGrupo}](${grupoUrl})`,
      `💊 Pastillas disponibles: ${disponibles}`,
      `💊 Pastillas activas: ${activas}`,
      `⛔ Debuffs: ${debuffs}`,
      `👥 Total jugadores: ${usuariosProcesados.length}`,
      `⚔️ PVP: ${pvp.length} | 🎯 Híbridos: ${hibridos.length} | 💰 ECO: ${eco.length}`,
    ].join("\n");

    await tgSendMessageSafe(chatId, mensajeResumen, { parse_mode: "Markdown", disable_web_page_preview: true });
    await delay(300);

    const formatUsuarioSimple = (u) => {
      let line = `${u.nivel}) [${u.username}](https://app.warera.io/user/${u._id})`;
      if (u.icono) line += ` ${u.icono}`;
      if (u.fecha) line += ` ${u.fecha.toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}`;
      return line;
    };

    if (pvp.length) {
      const chunks = dividirEnChunks(pvp, 50);
      for (let i = 0; i < chunks.length; i++) {
        const msg = `⚔️ PVP - Parte ${i + 1}/${chunks.length}:\n\n` + chunks[i].map(formatUsuarioSimple).join("\n");
        await tgSendMessageSafe(chatId, msg, { parse_mode: "Markdown", disable_web_page_preview: true });
        await delay(200);
      }
    }

    if (hibridos.length) {
      const chunks = dividirEnChunks(hibridos, 50);
      for (let i = 0; i < chunks.length; i++) {
        const msg = `🎯 HIBRIDA - Parte ${i + 1}/${chunks.length}:\n\n` + chunks[i].map(formatUsuarioSimple).join("\n");
        await tgSendMessageSafe(chatId, msg, { parse_mode: "Markdown", disable_web_page_preview: true });
        await delay(200);
      }
    }

    if (eco.length) {
      const chunks = dividirEnChunks(eco, 50);
      for (let i = 0; i < chunks.length; i++) {
        const msg = `💰 ECO - Parte ${i + 1}/${chunks.length}:\n\n` + chunks[i].map(formatUsuarioSimple).join("\n");
        await tgSendMessageSafe(chatId, msg, { parse_mode: "Markdown", disable_web_page_preview: true });
        await delay(200);
      }
    }

    const categoriasVacias = [];
    if (!pvp.length) categoriasVacias.push("PVP");
    if (!hibridos.length) categoriasVacias.push("Híbridos");
    if (!eco.length) categoriasVacias.push("ECO");
    if (categoriasVacias.length) await tgSendMessageSafe(chatId, `📝 Categorías vacías: ${categoriasVacias.join(", ")}`);
  } catch (error) {
    console.error(`Error en procesarJugadoresGrupo:`, error);
    tgSendMessageSafe(chatId, "Error al procesar el comando.");
  }
}

async function procesarDineroGrupo(chatId, args, tipo) {
  const ENVIAR_LISTA_EN_CHAT = true;
  const CHUNK_DELAY_MS = 900;

  if (args.length < 1) {
    const ejemplo =
      tipo === "pais"
        ? "/dineropais https://app.warera.io/country/6813b6d446e731854c7ac7ae"
        : "/dineromu https://app.warera.io/mu/687cbb53fae4c9cf04340e77";
    await tgSendMessageSafe(chatId, `Ejemplo: ${ejemplo}`, { parse_mode: "Markdown", disable_web_page_preview: true });
    return;
  }

  const id = args[0].split("/").pop();

  try {
    let items = [];
    let nombreGrupo = "Sin nombre";
    let grupoUrl = `https://app.warera.io/${tipo}/${id}`;

    if (tipo === "pais") {
      const countryData = await getCountryUsers(id);
      items = countryData?.items || [];
      try {
        const countryInfo = await getCountryData(id);
        nombreGrupo = countryInfo?.name || "País Desconocido";
      } catch {
        nombreGrupo = "País Desconocido";
      }
    } else {
      const muData = await getMUData(id);
      if (!muData?.members?.length) {
        await tgSendMessageSafe(chatId, "No se encontraron miembros en esa MU.");
        return;
      }
      items = muData.members.map((userId) => ({ _id: userId }));
      nombreGrupo = muData.name || "MU Sin nombre";
    }

    if (!items.length) {
      await tgSendMessageSafe(chatId, `No se encontraron jugadores en el ${tipo === "pais" ? "país" : "MU"} especificado.`);
      return;
    }

    const progressMsg = await tgSendMessageSafe(chatId, `💰 Procesando ${items.length} jugadores...`);

    // 1) Batch usuarios
    const userIds = items.map((x) => x._id);
    const usersData = await fetchUsersLite(userIds, { batchSize: 30 });

    // 2) Batch company.getCompanies por usuario
    await tgEditMessageTextSafe(`💰 Cargando fábricas de ${userIds.length} jugadores...`, {
      chat_id: chatId,
      message_id: progressMsg.message_id,
    });
    const companiesByUser = await fetchCompaniesByUser(userIds, { batchSize: 20 });

    // 3) Batch company.getById para TODAS las empresas únicas
    const allCompanyIds = [];
    for (const uid of userIds) {
      const ids = companiesByUser.get(uid) || [];
      allCompanyIds.push(...ids);
    }

    await tgEditMessageTextSafe(`💰 Cargando datos de ${new Set(allCompanyIds).size} fábricas...`, {
      chat_id: chatId,
      message_id: progressMsg.message_id,
    });
    const companyById = await fetchCompaniesById(allCompanyIds, { batchSize: 40 });

    // 4) Calcular
    const resultados = [];
    let totalWealth = 0;
    let totalFactoryWealth = 0;
    let totalLiquidWealth = 0;
    let totalFactories = 0;

    for (let idx = 0; idx < usersData.length; idx++) {
      const userData = usersData[idx];
      const userId = userIds[idx];
      if (!userData) continue;

      let totalWealthValue = userData.rankings?.userWealth?.value || 0;

      const companyIds = companiesByUser.get(userId) || [];
      let factoryWealth = 0;
      let factoryCount = 0;
      let disabledFactoryWealth = 0;

      for (const companyId of companyIds) {
        const companyData = companyById.get(companyId);
        if (!companyData?.estimatedValue) continue;

        factoryWealth += companyData.estimatedValue;
        factoryCount++;

        if (companyData.disabledAt) disabledFactoryWealth += companyData.estimatedValue;
      }

      if (disabledFactoryWealth > 0) totalWealthValue += disabledFactoryWealth;

      const liquidWealth = totalWealthValue - factoryWealth;

      resultados.push({
        username: userData.username,
        userId: userId,
        level: userData.leveling?.level || 0,
        totalWealth: totalWealthValue,
        factoryWealth,
        liquidWealth,
        factoryCount,
        hasDisabledFactories: disabledFactoryWealth > 0,
      });

      totalWealth += totalWealthValue;
      totalFactoryWealth += factoryWealth;
      totalLiquidWealth += liquidWealth;
      totalFactories += factoryCount;

      // menos edits para evitar 429
      if (idx % 80 === 0) {
        await tgEditMessageTextSafe(`💰 Calculando ${idx + 1}/${usersData.length} jugadores...`, {
          chat_id: chatId,
          message_id: progressMsg.message_id,
        });
      }
    }

    await tgDeleteMessageSafe(chatId, progressMsg.message_id);

    if (!resultados.length) {
      await tgSendMessageSafe(chatId, "No se pudieron obtener datos.");
      return;
    }

    const playerCount = resultados.length;
    const avgWealth = totalWealth / playerCount;
    const avgFactoryWealth = totalFactoryWealth / playerCount;
    const avgLiquidWealth = totalLiquidWealth / playerCount;
    const avgFactories = totalFactories / playerCount;

    resultados.sort((a, b) => b.totalWealth - a.totalWealth);

    let mensajePrincipal = `💰 *DINERO DE [${escapeMarkdownV2(nombreGrupo)}](${escapeMarkdownV2(grupoUrl)})*\n\n`;
    mensajePrincipal += `*Estadísticas Generales:*\n`;
    mensajePrincipal += `👥 Jugadores: ${playerCount}\n`;
    mensajePrincipal += `💰 Wealth total: ${formatNumberMarkdown(totalWealth)} monedas\n`;
    mensajePrincipal += `🏭 Wealth Fábricas: ${formatNumberMarkdown(totalFactoryWealth)} monedas\n`;
    mensajePrincipal += `💵 Dinero/Almacen: ${formatNumberMarkdown(totalLiquidWealth)} monedas\n`;
    mensajePrincipal += `🔧 Nº fábricas: ${totalFactories}\n\n`;
    mensajePrincipal += `*Promedios por Jugador:*\n`;
    mensajePrincipal += `💰 Wealth: ${formatNumberMarkdown(avgWealth)} monedas\n`;
    mensajePrincipal += `🏭 Wealth Fábricas: ${formatNumberMarkdown(avgFactoryWealth)} monedas\n`;
    mensajePrincipal += `💵 Dinero/Almacen: ${formatNumberMarkdown(avgLiquidWealth)} monedas\n`;
    mensajePrincipal += `🔧 Nº fábricas: ${escapeMarkdownV2(avgFactories.toFixed(1))}`;

    await tgSendMessageSafe(chatId, mensajePrincipal, { parse_mode: "MarkdownV2", disable_web_page_preview: true });

    // Excel (✅ envío correcto como documento)
    try {
    const progressExcelMsg = await tgSendMessageSafe(chatId, `📊 Generando archivo Excel...`);

    const excelBuffer = generarExcelBuffer(resultados, nombreGrupo);
    const nombreArchivo = `dinero_${tipo}_${nombreGrupo.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.xlsx`;

    // ✅ Así lo detecta como archivo real
    const file = {
        source: excelBuffer,
        filename: nombreArchivo,
    };

    await tgSendDocumentSafe(
        chatId,
        file,
        {}, // opciones del mensaje (caption etc.)
        { contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" } // fileOptions
    );

    await tgDeleteMessageSafe(chatId, progressExcelMsg.message_id);
    } catch (error) {
    console.error("Error generando/enviando Excel:", error?.message || error);
    await tgSendMessageSafe(chatId, "⚠️ No se pudo generar/enviar el archivo Excel.");
    }


    // Lista en chunks (opcional)
    if (ENVIAR_LISTA_EN_CHAT) {
      const chunkSize = 10;
      for (let i = 0; i < resultados.length; i += chunkSize) {
        const chunk = resultados.slice(i, i + chunkSize);
        let mensajeChunk = `*Jugadores ${i + 1}\\-${Math.min(i + chunkSize, resultados.length)}:*\n\n`;

        chunk.forEach((jugador, index) => {
          const globalIndex = i + index + 1;
          const usernameEscapado = escapeMarkdownV2(jugador.username);
          const userIdEscapado = escapeMarkdownV2(jugador.userId);

          mensajeChunk += `${globalIndex}\\) ${usernameEscapado}`;
          if (jugador.hasDisabledFactories) mensajeChunk += ` ⚠️`;
          mensajeChunk += `\nhttps://app\\.warera\\.io/user/${userIdEscapado}\n`;
          mensajeChunk += `💰 Wealth: ${formatNumberMarkdown(jugador.totalWealth)} \\| `;
          mensajeChunk += `🏭 Fábricas: ${formatNumberMarkdown(jugador.factoryWealth)}\n`;
          mensajeChunk += `💵 Dinero/Almacen: ${formatNumberMarkdown(jugador.liquidWealth)} \\| `;
          mensajeChunk += `🔧 ${jugador.factoryCount} fábricas\n\n`;
        });

        await tgSendMessageSafe(chatId, mensajeChunk, { parse_mode: "MarkdownV2", disable_web_page_preview: true });
        await delay(CHUNK_DELAY_MS);
      }
    }
  } catch (error) {
    console.error(`Error en procesarDineroGrupo (${tipo}):`, error);
    await tgSendMessageSafe(chatId, "Error al procesar el comando.");
  }
}

// -------------------------
// Telegram rate-limit safe wrapper (cola + retry 429)
// -------------------------
let tgQueue = Promise.resolve();

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function extractRetryAfterSeconds(err) {
  const ra1 = err?.response?.body?.parameters?.retry_after;
  if (typeof ra1 === "number") return ra1;

  const ra2 = err?.response?.headers?.["retry-after"] ?? err?.response?.headers?.["Retry-After"];
  const n2 = Number(ra2);
  if (!Number.isNaN(n2) && n2 > 0) return n2;

  return null;
}

async function tgCallWithRetry(fn, { maxRetries = 6 } = {}) {
  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (err) {
      const is429 =
        err?.code === "ETELEGRAM" &&
        (err?.response?.statusCode === 429 || String(err?.message || "").includes("429"));

      if (!is429 || attempt >= maxRetries) throw err;

      const ra = extractRetryAfterSeconds(err) ?? 3;
      await sleep(ra * 1000 + 350);
      attempt++;
    }
  }
}

function tgEnqueue(task) {
  tgQueue = tgQueue.then(task, task);
  return tgQueue;
}

function tgSendMessageSafe(chatId, text, options = {}) {
  return tgEnqueue(() => tgCallWithRetry(() => bot.sendMessage(chatId, text, options)));
}

function tgEditMessageTextSafe(text, opts) {
  return tgEnqueue(() => tgCallWithRetry(() => bot.editMessageText(text, opts)));
}

function tgDeleteMessageSafe(chatId, messageId) {
  return tgEnqueue(() => tgCallWithRetry(() => bot.deleteMessage(chatId, messageId)));
}

function tgSendDocumentSafe(chatId, document, options = {}, fileOptions = {}) {
  return tgEnqueue(() => tgCallWithRetry(() => bot.sendDocument(chatId, document, options, fileOptions)));
}

// -------------------------
// Comandos
// -------------------------
const comandos = {
  help: (chatId) => {
    const mensaje = `Comandos disponibles:

/buscar <TEXTO> - Busca enlaces en el juego
/hambre <ENLACE_GUERRA> <MENSAJE> - Menciona jugadores con hambre
/jugadoresPais <ID_PAIS> - Builds y pastillas del país
/jugadoresMu <ID_MU> - Builds y pastillas de la MU
/paisesDanyo <ID_PAIS> <COMIDA> - Daño disponible del país
/muDanyo <ID_MU> <COMIDA> - Daño disponible de la MU
/dineropais <ID_PAIS> - Riqueza del país
/dineromu <ID_MU> - Riqueza de la MU
/danyosemanal - Ranking de daño semanal
/duracion <GUERRA> - Duración restante de una guerra
/all - Menciona al grupo
/produccion - Ranking productivo`;
    tgSendMessageSafe(chatId, mensaje);
  },

  buscar: async (chatId, args) => {
    if (args.length < 1) {
      tgSendMessageSafe(chatId, "Ejemplo: /buscar Silver");
      return;
    }

    const searchText = args.join(" ");

    try {
      const searchData = await apiCall("search.searchAnything", { searchText });

      if (!searchData?.hasData) {
        tgSendMessageSafe(chatId, `No hay resultados para: "${searchText}"`);
        return;
      }

      let mensaje = `*Resultados para:* ${escapeMarkdownV2(searchText)}\n\n`;

      const obtenerDatosConNombre = async (ids, tipo) => {
        // Optimización: intentamos batch según el tipo
        // user/country/mu/region tienen endpoints distintos, así que hacemos por categoría
        const resultados = [];

        for (const id of ids) {
          try {
            let nombre, url;
            switch (tipo) {
              case "user": {
                const userData = await getUserData(id);
                nombre = userData?.username || "Usuario Desconocido";
                url = `https://app.warera.io/user/${id}`;
                break;
              }
              case "country": {
                const countryData = await getCountryData(id);
                nombre = countryData?.name || "País Desconocido";
                url = `https://app.warera.io/country/${id}`;
                break;
              }
              case "mu": {
                const muData = await getMUData(id);
                nombre = muData?.name || "MU Desconocida";
                url = `https://app.warera.io/mu/${id}`;
                break;
              }
              case "region": {
                const regionData = await apiCall("region.getById", { regionId: id });
                nombre = regionData?.name || "Región Desconocida";
                url = `https://app.warera.io/region/${id}`;
                break;
              }
            }

            if (nombre && url) resultados.push({ nombre, url, id });
          } catch (error) {
            console.error(`Error obteniendo datos de ${tipo} ${id}:`, error.message);
            resultados.push({ nombre: `${tipo} ${id}`, url: `https://app.warera.io/${tipo}/${id}`, id });
          }

          await delay(60);
        }

        return resultados;
      };

      const categorias = [
        { key: "userIds", nombre: "👤 Usuarios", tipo: "user", datos: [] },
        { key: "muIds", nombre: "🏢 MUs", tipo: "mu", datos: [] },
        { key: "countryIds", nombre: "🇺🇳 Países", tipo: "country", datos: [] },
        { key: "regionIds", nombre: "🗺️ Regiones", tipo: "region", datos: [] },
      ];

      for (const categoria of categorias) {
        if (searchData[categoria.key]?.length) {
          categoria.datos = await obtenerDatosConNombre(searchData[categoria.key], categoria.tipo);
        }
      }

      categorias.forEach(({ nombre, datos }) => {
        if (datos.length > 0) {
          mensaje += `*${nombre}*\n`;
          datos.forEach((item) => {
            const nombreEscapado = escapeMarkdownV2(item.nombre);
            const urlEscapada = escapeMarkdownV2(item.url);
            const idEscapado = escapeMarkdownV2(item.id);
            mensaje += `[${nombreEscapado}](${urlEscapada}) \\- ${idEscapado}\n`;
          });
          mensaje += `\n`;
        }
      });

      await tgSendMessageSafe(chatId, mensaje, { parse_mode: "MarkdownV2", disable_web_page_preview: true });
    } catch (error) {
      console.error("Error en /buscar:", error);
      tgSendMessageSafe(chatId, "Error en la búsqueda.");
    }
  },

  hambre: async (chatId, args) => {
    if (!args[0]) {
      tgSendMessageSafe(chatId, "Ejemplo: /hambre https://app.warera.io/battle/XXXXXXXX DEFENDEMOS CON TODO", {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      });
      return;
    }

    const urlBattle = args[0];
    const mensajeExtra = args.slice(1).join(" ");
    const menciones = [];

    // Optimización: batch users de la lista fija "usuarios"
    const ids = usuarios.map((u) => u.userId);
    const usersData = await fetchUsersLite(ids, { batchSize: 30 });

    for (let i = 0; i < usuarios.length; i++) {
      const uMeta = usuarios[i];
      const userData = usersData[i];
      if (!userData) continue;

      const { build } = analizarBuild(userData);
      if (build === "ECO") continue;

      const hunger = userData.skills?.hunger;
      if (hunger && hunger.currentBarValue >= 0.3 * hunger.total) {
        menciones.push(`${uMeta.mention} (${userData.username})`);
      }
    }

    if (!menciones.length) {
      tgSendMessageSafe(chatId, `Nadie tiene comida`);
      return;
    }

    await tgSendMessageSafe(chatId, `${urlBattle}\n${mensajeExtra}`, { disable_web_page_preview: true });

    const chunkSize = 5;
    for (let i = 0; i < menciones.length; i += chunkSize) {
      const grupo = menciones.slice(i, i + chunkSize).join("\n");
      await tgSendMessageSafe(chatId, grupo);
      await delay(400);
    }
  },

  jugadorespais: async (chatId, args) => procesarJugadoresGrupo(chatId, args, "pais"),
  jugadoresmu: async (chatId, args) => procesarJugadoresGrupo(chatId, args, "mu"),
  paisesdanyo: async (chatId, args) => procesarGrupoDanyo(chatId, args, "pais"),
  mudanyo: async (chatId, args) => procesarGrupoDanyo(chatId, args, "mu"),
  dineropais: async (chatId, args) => procesarDineroGrupo(chatId, args, "pais"),
  dineromu: async (chatId, args) => procesarDineroGrupo(chatId, args, "mu"),

  danyosemanal: async (chatId) => {
    try {
      // Batch de users de la lista fija
      const ids = usuarios.map((u) => u.userId);
      const usersData = await fetchUsersLite(ids, { batchSize: 30 });

      const resultados = [];
      for (const userData of usersData) {
        if (!userData) continue;
        const weeklyDamage = userData.rankings?.weeklyUserDamages?.value ?? 0;
        resultados.push({ username: userData.username, weeklyDamage });
      }

      if (!resultados.length) {
        tgSendMessageSafe(chatId, "No se pudo obtener el daño semanal.");
        return;
      }

      resultados.sort((a, b) => b.weeklyDamage - a.weeklyDamage);
      const totalDamage = resultados.reduce((sum, r) => sum + r.weeklyDamage, 0);
      const media = Math.round(totalDamage / resultados.length);

      const lista = resultados.map((r, i) => `${i + 1}) ${r.username}: ${formatNumber(r.weeklyDamage)}`).join("\n");
      const mensajeFinal = `Daño semanal:\n\n${lista}\n\nMedia de daño: ${formatNumber(media)}`;

      tgSendMessageSafe(chatId, mensajeFinal);
    } catch (error) {
      console.error("Error en /danyoSemanal:", error);
      tgSendMessageSafe(chatId, "Error al obtener daños semanales.");
    }
  },

  all: async (chatId) => {
    try {
      const mencionesUnicas = [...new Set(usuarios.map((usuario) => usuario.mention))];
      if (!mencionesUnicas.length) {
        tgSendMessageSafe(chatId, "No hay usuarios para mencionar.");
        return;
      }

      const chunkSize = 5;
      for (let i = 0; i < mencionesUnicas.length; i += chunkSize) {
        const grupo = mencionesUnicas.slice(i, i + chunkSize).join("\n");
        await tgSendMessageSafe(chatId, grupo);
        if (i + chunkSize < mencionesUnicas.length) await delay(250);
      }
    } catch (error) {
      console.error("Error en /all:", error);
      tgSendMessageSafe(chatId, "Error al enviar menciones.");
    }
  },

  produccion: async (chatId) => {
    try {
      const productionRes = await axios.get(`https://api2.warera.io/trpc/itemTrading.getPrices`);
      const productionData = productionRes.data?.result?.data;

      if (!productionData) {
        tgSendMessageSafe(chatId, "No se pudieron obtener los datos de producción.");
        return;
      }

      function limitarDecimales(num) {
        return Math.round(num * 100000) / 100000;
      }

      const traducciones = {
        grain: "Granos",
        livestock: "Ganado",
        limestone: "Caliza",
        coca: "Plantas",
        lead: "Plomo",
        petroleum: "Petróleo",
        iron: "Hierro",
        fish: "Pescado",
        cookedFish: "Pescado Cocido",
        heavyAmmo: "Munición Pesada",
        steel: "Acero",
        bread: "Pan",
        concrete: "Hormigón",
        oil: "Aceite",
        lightAmmo: "Munición Ligera",
        steak: "Filete",
        cocain: "Pastilla",
        ammo: "Munición",
      };

      const materiasPrimas = {
        grain: { pp: 1 },
        livestock: { pp: 20 },
        limestone: { pp: 1 },
        coca: { pp: 1 },
        lead: { pp: 1 },
        petroleum: { pp: 1 },
        iron: { pp: 1 },
        fish: { pp: 40 },
      };

      const productosManufacturados = {
        cookedFish: { materias: { fish: 1 }, pp: 40 },
        heavyAmmo: { materias: { lead: 16 }, pp: 16 },
        steel: { materias: { iron: 10 }, pp: 10 },
        bread: { materias: { grain: 10 }, pp: 10 },
        concrete: { materias: { limestone: 10 }, pp: 10 },
        oil: { materias: { petroleum: 1 }, pp: 1 },
        lightAmmo: { materias: { lead: 1 }, pp: 1 },
        steak: { materias: { livestock: 1 }, pp: 20 },
        cocain: { materias: { coca: 200 }, pp: 200 },
        ammo: { materias: { lead: 4 }, pp: 4 },
      };

      const resultados = [];

      for (const [material, datos] of Object.entries(materiasPrimas)) {
        const precioVenta = productionData[material];
        if (precioVenta !== undefined && precioVenta !== null) {
          const productividad = limitarDecimales(precioVenta / datos.pp);
          resultados.push({ nombre: material, nombreDisplay: traducciones[material] || material, productividad, tipo: "materia_prima" });
        }
      }

      for (const [producto, datos] of Object.entries(productosManufacturados)) {
        const precioVentaProducto = productionData[producto];
        if (precioVentaProducto !== undefined && precioVentaProducto !== null) {
          let costeMateriasPrimas = 0;
          let todas = true;

          for (const [materia, cantidad] of Object.entries(datos.materias)) {
            const precioVentaMateria = productionData[materia];
            if (precioVentaMateria !== undefined && precioVentaMateria !== null) costeMateriasPrimas += precioVentaMateria * cantidad;
            else {
              todas = false;
              break;
            }
          }

          if (todas) {
            const productividad = limitarDecimales((precioVentaProducto - costeMateriasPrimas) / datos.pp);
            resultados.push({ nombre: producto, nombreDisplay: traducciones[producto] || producto, productividad, tipo: "manufacturado" });
          }
        }
      }

      const resultadosValidos = resultados.filter((item) => item.productividad !== undefined && item.productividad !== null && !isNaN(item.productividad));
      resultadosValidos.sort((a, b) => b.productividad - a.productividad);

      let mensaje = "*RANKING PRODUCTIVIDAD*\n\n";
      resultadosValidos.forEach((item, index) => {
        const emoji = item.tipo === "materia_prima" ? "⛏️" : "🏭";
        const nombreEscapado = escapeMarkdownV2(item.nombreDisplay);
        const productividadEscapada = escapeMarkdownV2(item.productividad.toFixed(5));
        mensaje += `${index + 1}\\. ${emoji} *${nombreEscapado}*: ${productividadEscapada} monedas/pp\n`;
      });

      tgSendMessageSafe(chatId, mensaje, { parse_mode: "MarkdownV2" });
    } catch (error) {
      console.error("Error en comando /produccion:", error);
      tgSendMessageSafe(chatId, "Error al obtener los datos de producción.");
    }
  },

  duracion: async (chatId, args) => {
    if (args.length < 1) {
      return tgSendMessageSafe(chatId, "Ejemplo: /duracion https://app.warera.io/battle/XXXXXXXX", { disable_web_page_preview: true });
    }

    const battleId = args[0].split("/").pop();

    try {
      const battle = await apiCall("battle.getById", { battleId });
      if (!battle) return tgSendMessageSafe(chatId, "No se pudo obtener la batalla.");
      if (!battle.isActive) return tgSendMessageSafe(chatId, "La batalla ya ha finalizado.");

      const roundsToWin = battle.roundsToWin;
      let defenderWins = battle.defender.wonRoundsCount;
      let attackerWins = battle.attacker.wonRoundsCount;

      // Optimización: país defensor y atacante en paralelo
      const [defData, attData] = await Promise.all([
        getCountryData(battle.defender.country),
        getCountryData(battle.attacker.country),
      ]);
      const defenderCountry = defData?.name ?? "Defensor";
      const attackerCountry = attData?.name ?? "Atacante";

      const round = await apiCall("round.getById", { roundId: battle.currentRound });
      if (!round || !round.isActive) return tgSendMessageSafe(chatId, "No se pudo obtener la ronda actual.");

      const defPoints = round.defender.points;
      const attPoints = round.attacker.points;

      let msg = `⏰ *DURACIÓN ESTIMADA*\n\n`;
      msg += `🛡️ ${defenderCountry}: ${defenderWins} rondas – ${defPoints} pts\n`;
      msg += `⚔️ ${attackerCountry}: ${attackerWins} rondas – ${attPoints} pts\n\n`;

      function simularRonda({ ganadorInicial, perdedorInicial, modo }) {
        let ganador = ganadorInicial;
        let perdedor = perdedorInicial;
        let tiempo = 0;

        while (ganador < 300) {
          const total = ganador + perdedor;
          const ppt = puntosPorTick(total);

          if (modo === "rapido") {
            ganador += ppt;
          } else {
            if (perdedor < 300 - ppt) perdedor += ppt;
            else ganador += ppt;
          }

          tiempo += 2;
        }
        return tiempo;
      }

      const defensorVaGanando = defenderWins >= attackerWins && defPoints >= attPoints;
      const ganadorRapido = defensorVaGanando ? defenderCountry : attackerCountry;

      let tiempoRapido = simularRonda({
        ganadorInicial: defensorVaGanando ? defPoints : attPoints,
        perdedorInicial: defensorVaGanando ? attPoints : defPoints,
        modo: "rapido",
      });

      const winsTrasRondaRapida = (defensorVaGanando ? defenderWins : attackerWins) + 1;
      if (winsTrasRondaRapida < roundsToWin) tiempoRapido += simularRonda({ ganadorInicial: 0, perdedorInicial: 0, modo: "rapido" });

      let tiempoLento = 0;
      let rondaActualGanador;
      if ((defenderWins > 0 && attackerWins === 0) || (defenderWins === attackerWins && attPoints > defPoints)) {
        rondaActualGanador = attPoints;
      } else {
        rondaActualGanador = defPoints;
      }

      let rondaActualPerdedor = rondaActualGanador === defPoints ? attPoints : defPoints;

      tiempoLento += simularRonda({
        ganadorInicial: rondaActualGanador,
        perdedorInicial: rondaActualPerdedor,
        modo: "lento",
      });

      let winsTrasRondaLenta;
      if (rondaActualGanador === defPoints) {
        defenderWins += 1;
        winsTrasRondaLenta = defenderWins;
      } else {
        attackerWins += 1;
        winsTrasRondaLenta = attackerWins;
      }

      if (winsTrasRondaLenta < roundsToWin) {
        if (defenderWins === 0 || attackerWins === 0) tiempoLento += simularRonda({ perdedorInicial: 0, ganadorInicial: 0, modo: "lento" });
        tiempoLento += simularRonda({ ganadorInicial: 0, perdedorInicial: 0, modo: "lento" });
      }

      const formatTiempo = (m) => {
        const h = Math.floor(m / 60);
        const mm = Math.round(m % 60);
        if (!h) return `${mm}m`;
        if (!mm) return `${h}h`;
        return `${h}h ${mm}m`;
      };

      const horaFinal = (min) =>
        new Date(Date.now() + min * 60000).toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Europe/Madrid",
        });

      msg += `⚡ *Escenario más rápido:*\n`;
      msg += `• Ganador: ${ganadorRapido}\n`;
      msg += `• Tiempo: ${formatTiempo(tiempoRapido)}\n`;
      msg += `• Finaliza: ${horaFinal(tiempoRapido)}\n\n`;

      msg += `🐌 *Escenario más lento:*\n`;
      msg += `• Tiempo: ${formatTiempo(tiempoLento)}\n`;
      msg += `• Finaliza: ${horaFinal(tiempoLento)}`;

      await tgSendMessageSafe(chatId, msg, { parse_mode: "Markdown", disable_web_page_preview: true });
    } catch (err) {
      console.error("/duracion error:", err);
      tgSendMessageSafe(chatId, "Error calculando la duración.");
    }
  },
};

// -------------------------
// Listener principal
// -------------------------
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const messageId = msg.message_id;
  const fromUser = msg.from ? `${msg.from.username || msg.from.first_name} (${msg.from.id})` : "Unknown";

  console.log("=== MENSAJE RECIBIDO ===");
  console.log("📅 Hora:", new Date().toISOString());
  console.log("💬 Message ID:", messageId);
  console.log("👤 De:", fromUser);
  console.log("🏠 Chat ID:", chatId);
  console.log("🔧 Tipo Chat:", msg.chat.type);
  console.log("📝 Título Chat:", msg.chat.title || "Private Chat");
  console.log("📄 Texto:", text ? `"${text}"` : "NO TEXT");
  console.log("📎 Tiene adjuntos:", !!msg.document || !!msg.photo || !!msg.sticker || !!msg.video);
  console.log("========================");

  const allowedChats = [GROUP_ID, GROUP_PRUEBAS_ID, CHAT_ID].filter((id) => id);

  if (text) {
    const palabras = text.toLowerCase().split(/\s+/);
    const variantesOtto = ["otto", "oto", "oton", "otón"];
    if (variantesOtto.some((variant) => palabras.includes(variant))) {
      tgSendMessageSafe(chatId, "Putero");
    }
  }

  if (!text?.startsWith("/")) return;

  if (allowedChats.length > 0 && !allowedChats.includes(chatId)) {
    tgSendMessageSafe(chatId, "Bot no autorizado en este chat.");
    return;
  }

  const [cmdRaw, ...args] = text.slice(1).split(" ");
  const cmd = cmdRaw.split("@")[0].toLowerCase();

  if (comandos[cmd]) {
    await comandos[cmd](chatId, args);
  }
});

// -------------------------
// Servidor Express
// -------------------------
const app = express();
app.get("/", (req, res) => res.send("Bot activo"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));