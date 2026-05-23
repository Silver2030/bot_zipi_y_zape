"use strict";
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

setInterval(async () => {
  try {
    await query("SELECT 1");
  } catch (err) {
    console.error("[db keep-alive] error:", err.message);
  }
}, 4 * 60 * 1000);

module.exports = { query };
