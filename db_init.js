"use strict";
const { query } = require("./db");

async function init() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id          SERIAL PRIMARY KEY,
      telegram_id TEXT UNIQUE,
      username    TEXT,
      rol         TEXT
    )
  `);

  // ─── Rastreo de jugadores (mapa) ─────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS tracked_players (
      chat_id   BIGINT NOT NULL,
      user_id   TEXT NOT NULL,
      username  TEXT,
      added_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (chat_id, user_id)
    )
  `);

  // Origen(es) por los que un jugador está rastreado en un chat.
  // source_type = 'individual' | 'mu' | 'pais'. source_id = '' para individual,
  // para que la UNIQUE funcione (NULL no es único en Postgres).
  await query(`
    CREATE TABLE IF NOT EXISTS tracked_sources (
      id           SERIAL PRIMARY KEY,
      chat_id      BIGINT NOT NULL,
      user_id      TEXT NOT NULL,
      source_type  TEXT NOT NULL CHECK (source_type IN ('individual','mu','pais')),
      source_id    TEXT NOT NULL DEFAULT '',
      source_label TEXT,
      added_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (chat_id, user_id, source_type, source_id)
    )
  `);

  console.log("✅ Tablas creadas");
  process.exit(0);
}

init().catch(console.error);
