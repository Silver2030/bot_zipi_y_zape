"use strict";
const { query } = require("./db");

async function init() {
  await query(`
    CREATE TABLE IF NOT EXISTS admins (
      user_id   BIGINT NOT NULL,
      chat_id   BIGINT NOT NULL,
      PRIMARY KEY (user_id, chat_id)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS tracked_battles (
      id          SERIAL PRIMARY KEY,
      battle_id   TEXT NOT NULL,
      side        TEXT NOT NULL,
      chat_id     BIGINT NOT NULL,
      last_status TEXT,
      UNIQUE (battle_id, chat_id)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id          SERIAL PRIMARY KEY,
      telegram_id TEXT UNIQUE,
      username    TEXT,
      rol         TEXT
    )
  `);

  console.log("✅ Tablas creadas");
  process.exit(0);
}

init().catch(console.error);
