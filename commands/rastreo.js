"use strict";

const tg = require("../telegram");
const { t } = require("../i18n");
const { query } = require("../db");
const { getUserFull, getMUData, getCountryData } = require("../api");
const { fetchUsersLite, getCountryUsers } = require("../fetchers");
const { PUBLIC_BASE_URL } = require("../config");
const { mapToken } = require("../web");

async function isAdmin(telegramId) {
  const res = await query("SELECT 1 FROM users WHERE telegram_id = $1 AND rol = 'ADMIN'", [String(telegramId)]);
  return res.rowCount > 0;
}

function extractId(arg) {
  return arg.split("/").pop();
}

// ─── Escritura en BD ───────────────────────────────────────────────────────

async function upsertTrackedBulk(chatId, users, sourceType, sourceId, sourceLabel) {
  if (!users.length) return 0;
  const userIds   = users.map((u) => u.userId);
  const usernames = users.map((u) => u.username || u.userId);

  await query(
    `INSERT INTO tracked_players (chat_id, user_id, username)
     SELECT $1, u.uid, u.uname
     FROM UNNEST($2::text[], $3::text[]) AS u(uid, uname)
     ON CONFLICT (chat_id, user_id) DO UPDATE SET username = EXCLUDED.username`,
    [chatId, userIds, usernames]
  );

  const { rowCount } = await query(
    `INSERT INTO tracked_sources (chat_id, user_id, source_type, source_id, source_label)
     SELECT $1, u.uid, $4, $5, $6
     FROM UNNEST($2::text[]) AS u(uid)
     ON CONFLICT (chat_id, user_id, source_type, source_id) DO NOTHING`,
    [chatId, userIds, sourceType, sourceId, sourceLabel]
  );
  return rowCount;
}

async function removeTrackedBySource(chatId, sourceType, sourceId) {
  const removedSources = await query(
    "DELETE FROM tracked_sources WHERE chat_id = $1 AND source_type = $2 AND source_id = $3",
    [chatId, sourceType, sourceId]
  );
  const removedPlayers = await query(
    `DELETE FROM tracked_players tp
     WHERE tp.chat_id = $1
       AND NOT EXISTS (
         SELECT 1 FROM tracked_sources ts WHERE ts.chat_id = tp.chat_id AND ts.user_id = tp.user_id
       )`,
    [chatId]
  );
  return { sourcesRemoved: removedSources.rowCount, playersRemoved: removedPlayers.rowCount };
}

async function removeTrackedIndividual(chatId, userId) {
  const removedSources = await query(
    "DELETE FROM tracked_sources WHERE chat_id = $1 AND user_id = $2 AND source_type = 'individual' AND source_id = ''",
    [chatId, userId]
  );
  const removedPlayers = await query(
    `DELETE FROM tracked_players tp
     WHERE tp.chat_id = $1 AND tp.user_id = $2
       AND NOT EXISTS (
         SELECT 1 FROM tracked_sources ts WHERE ts.chat_id = tp.chat_id AND ts.user_id = tp.user_id
       )`,
    [chatId, userId]
  );
  return { sourcesRemoved: removedSources.rowCount, playersRemoved: removedPlayers.rowCount };
}

// ─── Añadir individual ──────────────────────────────────────────────────────

async function rastrear(chatId, args, msg) {
  if (!(await isAdmin(msg.from.id))) return tg.sendMessage(chatId, t(chatId, "no_permisos"));
  if (!args.length) return tg.sendMessage(chatId, t(chatId, "rastrear_usage"), { disable_web_page_preview: true });

  const userId = extractId(args[0]);
  try {
    const userData = await getUserFull(userId);
    if (!userData) return tg.sendMessage(chatId, t(chatId, "rastreo_user_not_found"));

    await upsertTrackedBulk(chatId, [{ userId: userData._id, username: userData.username }], "individual", "", null);
    await tg.sendMessage(chatId, t(chatId, "rastrear_added", userData.username));
  } catch (err) {
    console.error("rastrear error:", err);
    await tg.sendMessage(chatId, t(chatId, "error_generic"));
  }
}

// ─── Añadir por MU / país ────────────────────────────────────────────────────

async function rastrearGrupo(chatId, args, msg, tipo) {
  if (!(await isAdmin(msg.from.id))) return tg.sendMessage(chatId, t(chatId, "no_permisos"));
  if (!args.length) {
    return tg.sendMessage(chatId, t(chatId, tipo === "mu" ? "rastrearmu_usage" : "rastrearpais_usage"), { disable_web_page_preview: true });
  }

  const id = extractId(args[0]);
  try {
    let userIds = [], nombreGrupo;

    if (tipo === "mu") {
      const muData = await getMUData(id);
      if (!muData?.members?.length) return tg.sendMessage(chatId, t(chatId, "jugadores_no_members"));
      userIds = muData.members;
      nombreGrupo = muData.name || t(chatId, "mu_sin_nombre");
    } else {
      const items = (await getCountryUsers(id))?.items || [];
      userIds = items.map((x) => x._id);
      nombreGrupo = (await getCountryData(id))?.name || t(chatId, "pais_desconocido");
    }

    if (!userIds.length) return tg.sendMessage(chatId, t(chatId, "jugadores_no_players", tipo));

    const progressMsg = await tg.sendMessage(chatId, t(chatId, "jugadores_processing", userIds.length));
    const usersData = await fetchUsersLite(userIds);
    await tg.deleteMessage(chatId, progressMsg.message_id);

    const validUsers = usersData
      .map((u, i) => (u ? { userId: u._id, username: u.username } : { userId: userIds[i], username: userIds[i] }));

    const added = await upsertTrackedBulk(chatId, validUsers, tipo, id, nombreGrupo);
    await tg.sendMessage(chatId, t(chatId, "rastrear_grupo_added", { tipo, nombre: nombreGrupo, total: validUsers.length, nuevos: added }), { parse_mode: "Markdown" });
  } catch (err) {
    console.error("rastrearGrupo error:", err);
    await tg.sendMessage(chatId, t(chatId, "error_generic"));
  }
}

// ─── Quitar individual ───────────────────────────────────────────────────────

async function quitarrastreo(chatId, args, msg) {
  if (!(await isAdmin(msg.from.id))) return tg.sendMessage(chatId, t(chatId, "no_permisos"));
  if (!args.length) return tg.sendMessage(chatId, t(chatId, "quitarrastreo_usage"), { disable_web_page_preview: true });

  const userId = extractId(args[0]);
  try {
    const { sourcesRemoved, playersRemoved } = await removeTrackedIndividual(chatId, userId);
    if (!sourcesRemoved) return tg.sendMessage(chatId, t(chatId, "quitarrastreo_not_found"));

    await tg.sendMessage(chatId, t(chatId, playersRemoved ? "quitarrastreo_removed" : "quitarrastreo_removed_pero_sigue", userId));
  } catch (err) {
    console.error("quitarrastreo error:", err);
    await tg.sendMessage(chatId, t(chatId, "error_generic"));
  }
}

// ─── Quitar por MU / país ────────────────────────────────────────────────────

async function quitarrastreoGrupo(chatId, args, msg, tipo) {
  if (!(await isAdmin(msg.from.id))) return tg.sendMessage(chatId, t(chatId, "no_permisos"));
  if (!args.length) {
    return tg.sendMessage(chatId, t(chatId, tipo === "mu" ? "quitarrastreomu_usage" : "quitarrastreopais_usage"), { disable_web_page_preview: true });
  }

  const id = extractId(args[0]);
  try {
    const { sourcesRemoved, playersRemoved } = await removeTrackedBySource(chatId, tipo, id);
    if (!sourcesRemoved) return tg.sendMessage(chatId, t(chatId, "quitarrastreo_not_found"));
    await tg.sendMessage(chatId, t(chatId, "quitarrastreo_grupo_removed", { tipo, sourcesRemoved, playersRemoved }));
  } catch (err) {
    console.error("quitarrastreoGrupo error:", err);
    await tg.sendMessage(chatId, t(chatId, "error_generic"));
  }
}

// ─── Listado ─────────────────────────────────────────────────────────────────

async function rastreados(chatId) {
  try {
    const { rows } = await query(
      `SELECT tp.user_id, tp.username,
              COALESCE(array_agg(DISTINCT ts.source_label) FILTER (WHERE ts.source_label IS NOT NULL), '{}') AS grupos
       FROM tracked_players tp
       LEFT JOIN tracked_sources ts ON ts.chat_id = tp.chat_id AND ts.user_id = tp.user_id
       WHERE tp.chat_id = $1
       GROUP BY tp.user_id, tp.username
       ORDER BY tp.username`,
      [chatId]
    );

    if (!rows.length) return tg.sendMessage(chatId, t(chatId, "rastreados_empty"));

    const lineas = rows.map((r) => {
      const grupos = r.grupos.length ? ` _(${r.grupos.join(", ")})_` : "";
      return `• [${r.username}](https://app.warera.io/user/${r.user_id})${grupos}`;
    });

    await tg.sendMessage(chatId, t(chatId, "rastreados_resumen", rows.length) + "\n" + lineas.join("\n"), {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });
  } catch (err) {
    console.error("rastreados error:", err);
    await tg.sendMessage(chatId, t(chatId, "error_generic"));
  }
}

// ─── Enlace al mapa ──────────────────────────────────────────────────────────

async function mapa(chatId) {
  if (!PUBLIC_BASE_URL) {
    return tg.sendMessage(chatId, t(chatId, "mapa_no_public_url"));
  }
  const token = mapToken(String(chatId));
  const url   = `${PUBLIC_BASE_URL.replace(/\/$/, "")}/map?chatId=${encodeURIComponent(chatId)}&token=${token}`;
  await tg.sendMessage(chatId, t(chatId, "mapa_link", url), { disable_web_page_preview: false });
}

module.exports = {
  rastrear,
  rastrearmu:   (chatId, args, msg) => rastrearGrupo(chatId, args, msg, "mu"),
  rastrearpais: (chatId, args, msg) => rastrearGrupo(chatId, args, msg, "pais"),
  quitarrastreo,
  quitarrastreomu:   (chatId, args, msg) => quitarrastreoGrupo(chatId, args, msg, "mu"),
  quitarrastreopais: (chatId, args, msg) => quitarrastreoGrupo(chatId, args, msg, "pais"),
  rastreados,
  mapa,
};
