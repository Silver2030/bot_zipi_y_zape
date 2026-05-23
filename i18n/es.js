"use strict";

module.exports = {
  // ─── Generales ──────────────────────────────────────────────────────────────
  bot_not_authorized:   "Bot no autorizado en este chat.",
  error_generic:        "Error al procesar el comando.",
  no_results:           "No hay resultados.",
  processing:           (n) => `⚙️ Procesando ${n} jugadores...`,
  processing_progress:  (i, total) => `⚙️ Procesando ${i}/${total} jugadores...`,
  generating_excel:     "📊 Generando archivo Excel...",
  excel_error:          "⚠️ No se pudo generar/enviar el archivo Excel.",

  // ─── /help ──────────────────────────────────────────────────────────────────
  help: `Comandos disponibles:

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
/perfil <ENLACE_USUARIO> - Perfil de un jugador
/guerra <ENLACE_BATALLA> - Info de una batalla
/mercado <ITEM> - Precio y órdenes de un item
/eventos - Últimos eventos del juego
/ranking <danyo/wealth/nivel/pais> - Rankings globales
/all - Menciona al grupo
/produccion - Ranking productivo`,

  // ─── /buscar ────────────────────────────────────────────────────────────────
  buscar_usage:         "Ejemplo: /buscar Silver",
  buscar_no_results:    (q) => `No hay resultados para: "${q}"`,
  buscar_error:         "Error en la búsqueda.",
  buscar_header:        (q) => `*Resultados para:* ${q}\n\n`,
  buscar_usuarios:      "👤 Usuarios",
  buscar_mus:           "🏢 MUs",
  buscar_paises:        "🇺🇳 Países",
  buscar_regiones:      "🗺️ Regiones",

  // ─── /hambre ────────────────────────────────────────────────────────────────
  hambre_usage:         "Ejemplo: /hambre https://app.warera.io/battle/XXXXXXXX DEFENDEMOS CON TODO",
  hambre_nadie:         "Nadie tiene comida",

  // ─── /jugadoresPais & /jugadoresMu ──────────────────────────────────────────
  jugadores_usage_pais: "Ejemplo: /jugadoresPais https://app.warera.io/country/6813b6d446e731854c7ac7ae",
  jugadores_usage_mu:   "Ejemplo: /jugadoresMu https://app.warera.io/mu/687cbb53fae4c9cf04340e77",
  jugadores_no_members: "No se encontraron miembros en esa MU.",
  jugadores_no_players: (tipo) => `No se encontraron jugadores en el ${tipo === "pais" ? "país" : "MU"} especificado.`,
  jugadores_no_data:    "No se pudieron procesar los datos de ningún jugador.",
  jugadores_processing: (n) => `📊 Procesando ${n} jugadores...`,
  jugadores_progress:   (i, total) => `📊 Procesando ${i}/${total} jugadores...`,
  jugadores_resumen:    ({ tipo, nombre, url, disponibles, activas, debuffs, total, pvp, hibridos, eco }) =>
    `🏛️ ${tipo === "pais" ? "PAÍS" : "MU"}: [${nombre}](${url})\n` +
    `💊 Pastillas disponibles: ${disponibles}\n` +
    `💊 Pastillas activas: ${activas}\n` +
    `⛔ Debuffs: ${debuffs}\n` +
    `👥 Total jugadores: ${total}\n` +
    `⚔️ PVP: ${pvp} | 🎯 Híbridos: ${hibridos} | 💰 ECO: ${eco}`,
  jugadores_pvp:        (i, total) => `⚔️ PVP - Parte ${i}/${total}:\n\n`,
  jugadores_hibrida:    (i, total) => `🎯 HIBRIDA - Parte ${i}/${total}:\n\n`,
  jugadores_eco:        (i, total) => `💰 ECO - Parte ${i}/${total}:\n\n`,
  jugadores_vacias:     (cats) => `📝 Categorías vacías: ${cats.join(", ")}`,
  pais_desconocido:     "País Desconocido",
  mu_sin_nombre:        "MU Sin nombre",

  // ─── /paisesDanyo & /muDanyo ────────────────────────────────────────────────
  danyo_usage_pais:     "Ejemplo: /paisesDanyo https://app.warera.io/country/683ddd2c24b5a2e114af15d9 PESCADO",
  danyo_usage_mu:       "Ejemplo: /muDanyo https://app.warera.io/mu/687cbb53fae4c9cf04340e77 PESCADO",
  danyo_comida_invalid: "Comida inválida. Usa PAN, FILETE o PESCADO.",
  danyo_no_members:     "No se encontraron miembros en esa MU.",
  danyo_processing:     (n) => `⚙️ Procesando ${n} jugadores...`,
  danyo_progress:       (i, total) => `⚙️ Procesando ${i}/${total} jugadores...`,
  danyo_resumen:        ({ tipo, id, comida, totalActual, total24h, count }) =>
    `🏛️ ${tipo === "pais" ? "País" : "MU"}: https://app.warera.io/${tipo}/${id}\n` +
    `🍖 Comida: ${comida}\n` +
    `⚔️ Daño disponible: ${totalActual}\n` +
    `🕐 Daño 24h: ${total24h}\n` +
    `👥 Jugadores: ${count}`,
  danyo_chunk_header:   (from, to) => `📊 Jugadores ${from}-${to}:\n\n`,

  // ─── /dineropais & /dineromu ─────────────────────────────────────────────────
  dinero_usage_pais:        "Ejemplo: /dineropais https://app.warera.io/country/6813b6d446e731854c7ac7ae",
  dinero_usage_mu:          "Ejemplo: /dineromu https://app.warera.io/mu/687cbb53fae4c9cf04340e77",
  dinero_no_members:        "No se encontraron miembros en esa MU.",
  dinero_no_players:        (tipo) => `No se encontraron jugadores en el ${tipo === "pais" ? "país" : "MU"} especificado.`,
  dinero_no_data:           "No se pudieron obtener datos.",
  dinero_loading:           (n) => `💰 Procesando ${n} jugadores...`,
  dinero_loading_companies: (n) => `💰 Cargando fábricas de ${n} jugadores...`,
  dinero_loading_data:      (n) => `💰 Cargando datos de ${n} fábricas...`,
  dinero_calculating:       (i, total) => `💰 Calculando ${i}/${total} jugadores...`,
  dinero_resumen:           ({ nombre, url, count, totalWealth, totalFactoryWealth, totalLiquidWealth, totalFactories, avgWealth, avgFactoryWealth, avgLiquidWealth, avgFactories }) =>
    `💰 *DINERO DE [${nombre}](${url})*\n\n` +
    `*Estadísticas Generales:*\n` +
    `👥 Jugadores: ${count}\n` +
    `💰 Wealth total: ${totalWealth} monedas\n` +
    `🏭 Wealth Fábricas: ${totalFactoryWealth} monedas\n` +
    `💵 Dinero/Almacen: ${totalLiquidWealth} monedas\n` +
    `🔧 Nº fábricas: ${totalFactories}\n\n` +
    `*Promedios por Jugador:*\n` +
    `💰 Wealth: ${avgWealth} monedas\n` +
    `🏭 Wealth Fábricas: ${avgFactoryWealth} monedas\n` +
    `💵 Dinero/Almacen: ${avgLiquidWealth} monedas\n` +
    `🔧 Nº fábricas: ${avgFactories}`,
  dinero_chunk_header:  (from, to) => `*Jugadores ${from}\\-${to}:*\n\n`,
  dinero_wealth_label:  "💰 Wealth:",
  dinero_fab_wealth:    "🏭 Fábricas:",
  dinero_liquid:        "💵 Dinero/Almacen:",
  dinero_fab_count:     (n) => `🔧 ${n} fábricas`,

  // ─── /danyosemanal ──────────────────────────────────────────────────────────
  danyosemanal_no_data: "No se pudo obtener el daño semanal.",
  danyosemanal_header:  "Daño semanal:\n\n",
  danyosemanal_media:   (n) => `\nMedia de daño: ${n}`,

  // ─── /all ───────────────────────────────────────────────────────────────────
  all_nobody: "No hay usuarios para mencionar.",

  // ─── /produccion ────────────────────────────────────────────────────────────
  produccion_no_data:   "No se pudieron obtener datos (precios/países/regiones).",
  produccion_no_results:"No hay resultados válidos para productividad.",
  produccion_header:    "*RANKING PRODUCTIVIDAD*\n\n",

  // ─── /duracion ──────────────────────────────────────────────────────────────
  duracion_usage:       "Ejemplo: /duracion https://app.warera.io/battle/XXXXXXXX",
  duracion_no_battle:   "No se pudo obtener la batalla.",
  duracion_ended:       "La batalla ya ha finalizado.",
  duracion_no_round:    "No se pudo obtener la ronda actual.",
  duracion_header:      "⏰ *DURACIÓN ESTIMADA*\n\n",
  duracion_defender:    (name, wins, pts) => `🛡️ ${name}: ${wins} rondas – ${pts} pts\n`,
  duracion_attacker:    (name, wins, pts) => `⚔️ ${name}: ${wins} rondas – ${pts} pts\n\n`,
  duracion_rapido:      "⚡ *Escenario más rápido:*\n",
  duracion_lento:       "🐌 *Escenario más lento:*\n",
  duracion_ganador:     (name) => `• Ganador: ${name}\n`,
  duracion_tiempo:      (t) => `• Tiempo: ${t}\n`,
  duracion_finaliza:    (t) => `• Finaliza: ${t}\n`,
  duracion_finaliza_nl: (t) => `• Finaliza: ${t}`,
  defensor:             "Defensor",
  atacante:             "Atacante",


  // ─── Mutex ──────────────────────────────────────────────────────────────────
  cmd_already_running: "⏳ Este comando ya está en ejecución en este chat. Espera a que termine.",

  // ─── /perfil ────────────────────────────────────────────────────────────────
  perfil_usage:    "Ejemplo: /perfil https://app.warera.io/user/XXXXXXXX",
  perfil_not_found:"Usuario no encontrado.",
  perfil_resumen:  ({ username, userId, nivel, build, weeklyDmg, totalDmg, danyoActual, wealth, pastilla }) =>
    `👤 *[${username}](https://app.warera.io/user/${userId})*\n` +
    `📊 Nivel: ${nivel} | Build: ${build}\n` +
    `⚔️ Daño semanal: ${weeklyDmg}\n` +
    `⚔️ Daño total: ${totalDmg}\n` +
    `⚔️ Daño disponible (pescado): ${danyoActual}\n` +
    `💰 Wealth: ${wealth}\n` +
    `💊 Pastilla: ${pastilla}`,

  // ─── /guerra ────────────────────────────────────────────────────────────────
  guerra_usage:   "Ejemplo: /guerra https://app.warera.io/battle/XXXXXXXX",
  guerra_resumen: ({ estado, defName, defWins, dmgDef, attName, attWins, dmgAtt, roundsToWin, ganador, battleId }) => {
    let msg = `${estado} *Batalla* — [ver](https://app.warera.io/battle/${battleId})\n\n`;
    msg += `🛡️ *${defName}*: ${defWins}/${roundsToWin} rondas | Daño: ${dmgDef}\n`;
    msg += `⚔️ *${attName}*: ${attWins}/${roundsToWin} rondas | Daño: ${dmgAtt}\n`;
    if (ganador) msg += `\n🏆 Ganador: *${ganador}*`;
    return msg;
  },

  // ─── /mercado ───────────────────────────────────────────────────────────────
  mercado_usage:     "Ejemplo: /mercado pan\nItems: pan, filete, pescado, acero, hierro...",
  mercado_not_found: (q) => `Item no encontrado: "${q}"`,
  mercado_resumen:   ({ nombre, itemCode, precio }) =>
    `🏪 *${nombre}* \(\`${itemCode}\`\)\n💰 Precio de mercado: ${precio}`,

  // ─── /eventos ───────────────────────────────────────────────────────────────
  eventos_no_data: "No hay eventos recientes.",
  eventos_header:  "📰 *Últimos eventos*",

  // ─── /gastos ────────────────────────────────────────────────────────────────
  gastos_usage: "Ejemplo: /gastos https://app.warera.io/battle/XXXXXXXX",

  // ─── /ranking ───────────────────────────────────────────────────────────────
  ranking_usage: (tipos) => `Uso: /ranking <tipo>\nTipos disponibles: ${tipos}`,

  // ─── Aliases de comandos ────────────────────────────────────────────────────
  // Mapa de: texto que escribe el usuario → nombre interno del handler
  // Incluye tanto los comandos en español como los rusos para que funcionen
  // en cualquier chat independientemente del idioma configurado.
  // ─── Aliases de comandos ────────────────────────────────────────────────────
  comandoAliases: {
    help:          "help",
    buscar:        "buscar",
    hambre:        "hambre",
    jugadorespais: "jugadorespais",
    jugadoresmu:   "jugadoresmu",
    paisesdanyo:   "paisesdanyo",
    mudanyo:       "mudanyo",
    dineropais:    "dineropais",
    dineromu:      "dineromu",
    danyosemanal:  "danyosemanal",
    duracion:      "duracion",
    all:           "all",
    produccion:    "produccion",
    perfil:        "perfil",
    guerra:        "guerra",
    mercado:       "mercado",
    eventos:       "eventos",
    ranking:       "ranking",
    gastos:        "gastos",
    id:            "id",
    status:        "status",
    addadmin:      "addadmin",
    listaadmin:    "listaadmin",
  },
};
