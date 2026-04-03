"use strict";

const XLSX = require("xlsx");

function escapeMarkdownV2(text) {
  if (typeof text !== "string") text = String(text);
  return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, "\\$1");
}

function formatNumber(num) {
  return Number(num).toLocaleString("es-ES");
}

function formatNumberMarkdown(num) {
  return escapeMarkdownV2(formatNumber(num));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDateShort(ts) {
  if (!ts) return null;
  return new Date(ts).toLocaleString("es-ES", {
    timeZone: "Europe/Madrid",
    year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
}

function generarExcelBuffer(resultados, nombreGrupo) {
  const workbook = XLSX.utils.book_new();

  const datos = [[
    "Ranking","Name","Url","Level","Companies",
    "Wealth","Companies Wealth","Player Wealth","Factory Disabled",
  ]];

  resultados.forEach((jugador, index) => {
    datos.push([
      index + 1,
      jugador.username,
      `https://app.warera.io/user/${jugador.userId}`,
      jugador.level ?? "N/A",
      jugador.factoryCount ?? 0,
      Number(jugador.totalWealth ?? 0),
      Number(jugador.factoryWealth ?? 0),
      Number(jugador.liquidWealth ?? 0),
      jugador.hasDisabledFactories ? "Yes" : "No",
    ]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(datos);
  worksheet["!cols"] = [
    {wch:10},{wch:20},{wch:40},{wch:8},{wch:12},
    {wch:15},{wch:18},{wch:15},{wch:15},
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, "Datos");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

module.exports = {
  escapeMarkdownV2,
  formatNumber,
  formatNumberMarkdown,
  delay,
  formatDateShort,
  generarExcelBuffer,
};
