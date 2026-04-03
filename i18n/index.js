"use strict";

const { getChatLang } = require("../config");

const locales = {
  es: require("./es"),
  ru: require("./ru"),
};

/**
 * Devuelve el texto traducido para el chatId dado.
 * Si la clave es una función la llama con ...args.
 *
 * Uso:
 *   t(chatId, "error_generic")
 *   t(chatId, "processing", 42)
 *   t(chatId, "danyo_resumen", { tipo, id, ... })
 */
function t(chatId, key, ...args) {
  const lang   = getChatLang(chatId);
  const locale = locales[lang] ?? locales.es;
  const entry  = locale[key] ?? locales.es[key];

  if (entry === undefined) {
    console.warn(`[i18n] Clave no encontrada: "${key}" (lang: ${lang})`);
    return key;
  }

  return typeof entry === "function" ? entry(...args) : entry;
}

/**
 * Resuelve el comando que escribió el usuario al nombre interno del handler.
 * Busca primero en el locale del chat, luego en el español como fallback.
 *
 * Ejemplo:
 *   resolveCmd(chatId, "igroki")    → "jugadorespais"
 *   resolveCmd(chatId, "duracion")  → "duracion"
 *   resolveCmd(chatId, "desconocido") → null
 */
function resolveCmd(chatId, rawCmd) {
  const lang    = getChatLang(chatId);
  const locale  = locales[lang] ?? locales.es;
  const aliases = locale.comandoAliases ?? locales.es.comandoAliases ?? {};
  // también buscar en español como red de seguridad
  const esAliases = locales.es.comandoAliases ?? {};
  return aliases[rawCmd] ?? esAliases[rawCmd] ?? null;
}

module.exports = { t, resolveCmd };