"use strict";

const tg = require("../telegram");
const { t } = require("../i18n");
const { apiCall, getPrices } = require("../api");
const { formatNumber, escapeMarkdownV2 } = require("../utils");
const { TRADUCCIONES } = require("../config");

// Mapa inverso: nombre en minúsculas → itemCode
const NOMBRE_A_CODE = Object.entries(TRADUCCIONES).reduce((acc, [code, nombre]) => {
  acc[nombre.toLowerCase()] = code;
  acc[code.toLowerCase()]   = code;
  return acc;
}, {});

async function mercado(chatId, args) {
  if (!args.length) {
    await tg.sendMessage(chatId, t(chatId, "mercado_usage"));
    return;
  }

  const query    = args.join(" ").toLowerCase();
  const itemCode = NOMBRE_A_CODE[query];

  if (!itemCode) {
    await tg.sendMessage(chatId, t(chatId, "mercado_not_found", args.join(" ")));
    return;
  }

  try {
    const [prices, ordersData] = await Promise.all([
      getPrices(),
      apiCall("tradingOrder.getTopOrders", { itemCode, limit: 5 }),
    ]);

    const precio    = prices[itemCode];
    const nombre    = TRADUCCIONES[itemCode] || itemCode;
    const ordenes   = ordersData ?? [];

    const buyOrders  = ordenes.filter((o) => o.type === "buy").slice(0, 5);
    const sellOrders = ordenes.filter((o) => o.type === "sell").slice(0, 5);

    const fmtOrder = (o) => `${formatNumber(o.price)} × ${formatNumber(o.quantity)}`;

    let msg = t(chatId, "mercado_resumen", {
      nombre,
      itemCode,
      precio: typeof precio === "number" ? formatNumber(precio) : "—",
    });

    if (sellOrders.length) {
      msg += `\n\n📉 *Venta:*\n` + sellOrders.map(fmtOrder).join("\n");
    }
    if (buyOrders.length) {
      msg += `\n\n📈 *Compra:*\n` + buyOrders.map(fmtOrder).join("\n");
    }

    await tg.sendMessage(chatId, msg, { parse_mode: "Markdown", disable_web_page_preview: true });

  } catch (err) {
    console.error("mercado error:", err);
    await tg.sendMessage(chatId, t(chatId, "error_generic"));
  }
}

module.exports = { mercado };
