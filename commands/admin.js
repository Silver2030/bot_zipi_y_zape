"use strict";
const db = require("../db");
const tg = require("../telegram");

async function addadmin(chatId, _args, msg) {
  try {
    const senderCheck = await db.query(
      "SELECT 1 FROM users WHERE telegram_id = $1 AND rol = 'ADMIN'",
      [String(msg.from.id)]
    );
    if (senderCheck.rowCount === 0) {
      return tg.sendMessage(chatId, "No tienes permisos para ejecutar este comando.");
    }

    const target = msg.reply_to_message?.from;
    if (!target) {
      return tg.sendMessage(chatId, "Responde al mensaje de alguien para añadirlo como admin.");
    }

    const existingCheck = await db.query(
      "SELECT 1 FROM users WHERE telegram_id = $1 AND rol = 'ADMIN'",
      [String(target.id)]
    );
    if (existingCheck.rowCount > 0) {
      const name = target.username || target.first_name;
      return tg.sendMessage(chatId, `@${name} ya es admin.`);
    }

    const username = target.username || target.first_name;
    await db.query(
      `INSERT INTO users (telegram_id, username, rol)
       VALUES ($1, $2, 'ADMIN')
       ON CONFLICT (telegram_id) DO UPDATE SET rol = 'ADMIN', username = $2`,
      [String(target.id), username]
    );

    tg.sendMessage(chatId, `✅ @${username} añadido como admin.`);
  } catch (err) {
    console.error("[addadmin]", err.message);
    tg.sendMessage(chatId, "Error interno al ejecutar el comando.");
  }
}

async function listaadmin(chatId) {
  try {
    const res = await db.query(
      "SELECT username FROM users WHERE rol = 'ADMIN' ORDER BY username"
    );
    if (res.rowCount === 0) {
      return tg.sendMessage(chatId, "No hay admins registrados.");
    }
    const lista = res.rows.map((r) => `• @${r.username}`).join("\n");
    tg.sendMessage(chatId, `Admins:\n${lista}`);
  } catch (err) {
    console.error("[listaadmin]", err.message);
    tg.sendMessage(chatId, "Error interno al ejecutar el comando.");
  }
}

module.exports = { addadmin, listaadmin };
