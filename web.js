"use strict";

const path   = require("path");
const crypto = require("crypto");
const { getRegionsObject, getAllCountries } = require("./api");
const { fetchUsersFull } = require("./fetchers");
const { query } = require("./db");
const { getChatConfig, MAP_TOKEN_SECRET } = require("./config");

function mapToken(chatId) {
  return crypto.createHmac("sha256", MAP_TOKEN_SECRET).update(String(chatId)).digest("hex").slice(0, 16);
}

function registerWebRoutes(app) {
  app.get("/map", (_req, res) => {
    res.sendFile(path.join(__dirname, "web", "map.html"));
  });

  // Metadatos de todas las regiones del juego (posición, país, población).
  app.get("/api/map/regions", async (_req, res) => {
    try {
      const [regions, countries] = await Promise.all([getRegionsObject(), getAllCountries()]);
      const countryMap = {};
      (countries || []).forEach((c) => {
        countryMap[c._id] = { name: c.name, scheme: c.scheme || null, mapAccent: c.mapAccent || null };
      });

      const out = Object.values(regions || {}).map((r) => ({
        id: r._id,
        name: r.name,
        mainCity: r.mainCity,
        country: r.country,
        countryName: countryMap[r.country]?.name || null,
        countryScheme: countryMap[r.country]?.scheme || null,
        countryMapAccent: countryMap[r.country]?.mapAccent || null,
        countryCode: r.countryCode,
        position: r.position, // [lng, lat]
        isCapital: !!r.isCapital,
        population: r.population ?? 0,
        residents: r.residents ?? 0,
      }));

      res.json({ regions: out });
    } catch (err) {
      console.error("[web] /api/map/regions:", err.message);
      res.status(502).json({ error: "warera_api_error" });
    }
  });

  // Jugadores rastreados de un chat, con su ubicación actual y su residencia.
  app.get("/api/map/tracked", async (req, res) => {
    const chatId = req.query.chatId ? String(req.query.chatId) : null;
    const token  = req.query.token ? String(req.query.token) : null;

    if (!chatId || !token || token !== mapToken(chatId)) {
      return res.status(403).json({ error: "forbidden" });
    }
    if (!getChatConfig(chatId)) {
      return res.status(404).json({ error: "chat_not_found" });
    }

    try {
      const { rows } = await query(
        "SELECT user_id, username FROM tracked_players WHERE chat_id = $1 ORDER BY username",
        [chatId]
      );
      if (!rows.length) return res.json({ players: [] });

      const usersData = await fetchUsersFull(rows.map((r) => r.user_id));

      const players = rows.map((r, i) => {
        const u = usersData[i];
        return {
          userId: r.user_id,
          username: u?.username || r.username || r.user_id,
          locationRegionId: u?.location || null,
          homeRegionId: u?.region || null,
          level: u?.leveling?.level ?? null,
        };
      });

      res.json({ players });
    } catch (err) {
      console.error("[web] /api/map/tracked:", err.message);
      res.status(502).json({ error: "warera_api_error" });
    }
  });
}

module.exports = { registerWebRoutes, mapToken };
