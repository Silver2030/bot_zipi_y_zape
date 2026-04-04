"use strict";

module.exports = {
  // ─── Generales ──────────────────────────────────────────────────────────────
  bot_not_authorized:   "Бот не авторизован в этом чате.",
  error_generic:        "Ошибка при обработке команды.",
  no_results:           "Результаты не найдены.",
  processing:           (n) => `⚙️ Обработка ${n} игроков...`,
  processing_progress:  (i, total) => `⚙️ Обработка ${i}/${total} игроков...`,
  generating_excel:     "📊 Генерация файла Excel...",
  excel_error:          "⚠️ Не удалось создать/отправить файл Excel.",

  // ─── /help ──────────────────────────────────────────────────────────────────
  help: `Доступные команды:

/poisk <ТЕКСТ> - Поиск в игре
/golod <ССЫЛКА> <СООБЩЕНИЕ> - Упомянуть голодных игроков
/igroki <ID_СТРАНЫ> - Билды и таблетки страны
/igrokilmu <ID_ВЕ> - Билды и таблетки ВЕ
/uronStrana <ID_СТРАНЫ> <ЕДА> - Доступный урон страны
/uronMu <ID_ВЕ> <ЕДА> - Доступный урон ВЕ
/dengiStrana <ID_СТРАНЫ> - Богатство страны
/dengiMu <ID_ВЕ> - Богатство ВЕ
/uronNedeli - Рейтинг недельного урона
/vremya <БИТВА> - Оставшееся время битвы
/profil <ССЫЛКА_ИГРОКА> - Профиль игрока
/bitva <ССЫЛКА_БИТВЫ> - Информация о битве
/rynok <ТОВАР> - Цена и заявки на товар
/sobytiya - Последние события игры
/reiting <danyo/wealth/nivel/pais> - Глобальные рейтинги
/vse - Упомянуть всех в группе
/proizvodstvo - Рейтинг производительности`,

  // ─── /buscar / /poisk ───────────────────────────────────────────────────────
  buscar_usage:         "Пример: /poisk Silver",
  buscar_no_results:    (q) => `Результаты для "${q}" не найдены.`,
  buscar_error:         "Ошибка поиска.",
  buscar_header:        (q) => `*Результаты для:* ${q}\n\n`,
  buscar_usuarios:      "👤 Пользователи",
  buscar_mus:           "🏢 ВЕ",
  buscar_paises:        "🇺🇳 Страны",
  buscar_regiones:      "🗺️ Регионы",

  // ─── /hambre / /golod ───────────────────────────────────────────────────────
  hambre_usage:         "Пример: /golod https://app.warera.io/battle/XXXXXXXX ЗАЩИЩАЕМ ВСЕ",
  hambre_nadie:         "Ни у кого нет еды",

  // ─── /igroki & /igrokilmu ───────────────────────────────────────────────────
  jugadores_usage_pais: "Пример: /igroki https://app.warera.io/country/6813b6d446e731854c7ac7ae",
  jugadores_usage_mu:   "Пример: /igrokilmu https://app.warera.io/mu/687cbb53fae4c9cf04340e77",
  jugadores_no_members: "Участники ВЕ не найдены.",
  jugadores_no_players: (tipo) => `Игроки в ${tipo === "pais" ? "стране" : "ВЕ"} не найдены.`,
  jugadores_no_data:    "Не удалось обработать данные ни одного игрока.",
  jugadores_processing: (n) => `📊 Обработка ${n} игроков...`,
  jugadores_progress:   (i, total) => `📊 Обработка ${i}/${total} игроков...`,
  jugadores_resumen:    ({ tipo, nombre, url, disponibles, activas, debuffs, total, pvp, hibridos, eco }) =>
    `🏛️ ${tipo === "pais" ? "СТРАНА" : "ВЕ"}: [${nombre}](${url})\n` +
    `💊 Таблетки доступны: ${disponibles}\n` +
    `💊 Таблетки активны: ${activas}\n` +
    `⛔ Дебаффы: ${debuffs}\n` +
    `👥 Всего игроков: ${total}\n` +
    `⚔️ PVP: ${pvp} | 🎯 Гибриды: ${hibridos} | 💰 ECO: ${eco}`,
  jugadores_pvp:        (i, total) => `⚔️ PVP - Часть ${i}/${total}:\n\n`,
  jugadores_hibrida:    (i, total) => `🎯 ГИБРИД - Часть ${i}/${total}:\n\n`,
  jugadores_eco:        (i, total) => `💰 ECO - Часть ${i}/${total}:\n\n`,
  jugadores_vacias:     (cats) => `📝 Пустые категории: ${cats.join(", ")}`,
  pais_desconocido:     "Неизвестная страна",
  mu_sin_nombre:        "ВЕ без названия",

  // ─── /uronStrana & /uronMu ──────────────────────────────────────────────────
  danyo_usage_pais:     "Пример: /uronStrana https://app.warera.io/country/683ddd2c24b5a2e114af15d9 PESCADO",
  danyo_usage_mu:       "Пример: /uronMu https://app.warera.io/mu/687cbb53fae4c9cf04340e77 PESCADO",
  danyo_comida_invalid: "Неверная еда. Используй PAN, FILETE или PESCADO.",
  danyo_no_members:     "Участники ВЕ не найдены.",
  danyo_processing:     (n) => `⚙️ Обработка ${n} игроков...`,
  danyo_progress:       (i, total) => `⚙️ Обработка ${i}/${total} игроков...`,
  danyo_resumen:        ({ tipo, id, comida, totalActual, total24h, count }) =>
    `🏛️ ${tipo === "pais" ? "Страна" : "ВЕ"}: https://app.warera.io/${tipo}/${id}\n` +
    `🍖 Еда: ${comida}\n` +
    `⚔️ Доступный урон: ${totalActual}\n` +
    `🕐 Урон за 24ч: ${total24h}\n` +
    `👥 Игроков: ${count}`,
  danyo_chunk_header:   (from, to) => `📊 Игроки ${from}-${to}:\n\n`,

  // ─── /dengiStrana & /dengiMu ────────────────────────────────────────────────
  dinero_usage_pais:        "Пример: /dengiStrana https://app.warera.io/country/6813b6d446e731854c7ac7ae",
  dinero_usage_mu:          "Пример: /dengiMu https://app.warera.io/mu/687cbb53fae4c9cf04340e77",
  dinero_no_members:        "Участники ВЕ не найдены.",
  dinero_no_players:        (tipo) => `Игроки в ${tipo === "pais" ? "стране" : "ВЕ"} не найдены.`,
  dinero_no_data:           "Не удалось получить данные.",
  dinero_loading:           (n) => `💰 Обработка ${n} игроков...`,
  dinero_loading_companies: (n) => `💰 Загрузка фабрик ${n} игроков...`,
  dinero_loading_data:      (n) => `💰 Загрузка данных ${n} фабрик...`,
  dinero_calculating:       (i, total) => `💰 Расчёт ${i}/${total} игроков...`,
  dinero_resumen:           ({ nombre, url, count, totalWealth, totalFactoryWealth, totalLiquidWealth, totalFactories, avgWealth, avgFactoryWealth, avgLiquidWealth, avgFactories }) =>
    `💰 *БОГАТСТВО [${nombre}](${url})*\n\n` +
    `*Общая статистика:*\n` +
    `👥 Игроков: ${count}\n` +
    `💰 Всего богатства: ${totalWealth} монет\n` +
    `🏭 Богатство фабрик: ${totalFactoryWealth} монет\n` +
    `💵 Деньги/Склад: ${totalLiquidWealth} монет\n` +
    `🔧 Кол-во фабрик: ${totalFactories}\n\n` +
    `*Среднее на игрока:*\n` +
    `💰 Богатство: ${avgWealth} монет\n` +
    `🏭 Богатство фабрик: ${avgFactoryWealth} монет\n` +
    `💵 Деньги/Склад: ${avgLiquidWealth} монет\n` +
    `🔧 Кол-во фабрик: ${avgFactories}`,
  dinero_chunk_header:  (from, to) => `*Игроки ${from}\\-${to}:*\n\n`,
  dinero_wealth_label:  "💰 Богатство:",
  dinero_fab_wealth:    "🏭 Фабрики:",
  dinero_liquid:        "💵 Деньги/Склад:",
  dinero_fab_count:     (n) => `🔧 ${n} фабрик`,

  // ─── /uronNedeli ────────────────────────────────────────────────────────────
  danyosemanal_no_data: "Не удалось получить недельный урон.",
  danyosemanal_header:  "Урон за неделю:\n\n",
  danyosemanal_media:   (n) => `\nСредний урон: ${n}`,

  // ─── /vse ───────────────────────────────────────────────────────────────────
  all_nobody: "Нет пользователей для упоминания.",

  // ─── /proizvodstvo ──────────────────────────────────────────────────────────
  produccion_no_data:    "Не удалось получить данные (цены/страны/регионы).",
  produccion_no_results: "Нет валидных результатов по производительности.",
  produccion_header:     "*РЕЙТИНГ ПРОИЗВОДИТЕЛЬНОСТИ*\n\n",

  // ─── /vremya ────────────────────────────────────────────────────────────────
  duracion_usage:       "Пример: /vremya https://app.warera.io/battle/XXXXXXXX",
  duracion_no_battle:   "Не удалось получить данные о битве.",
  duracion_ended:       "Битва уже завершена.",
  duracion_no_round:    "Не удалось получить данные о текущем раунде.",
  duracion_header:      "⏰ *РАСЧЁТНАЯ ПРОДОЛЖИТЕЛЬНОСТЬ*\n\n",
  duracion_defender:    (name, wins, pts) => `🛡️ ${name}: ${wins} раундов – ${pts} очков\n`,
  duracion_attacker:    (name, wins, pts) => `⚔️ ${name}: ${wins} раундов – ${pts} очков\n\n`,
  duracion_rapido:      "⚡ *Быстрый сценарий:*\n",
  duracion_lento:       "🐌 *Медленный сценарий:*\n",
  duracion_ganador:     (name) => `• Победитель: ${name}\n`,
  duracion_tiempo:      (t) => `• Время: ${t}\n`,
  duracion_finaliza:    (t) => `• Завершится: ${t}\n`,
  duracion_finaliza_nl: (t) => `• Завершится: ${t}`,
  defensor:             "Защитник",
  atacante:             "Атакующий",


  // ─── Mutex ──────────────────────────────────────────────────────────────────
  cmd_already_running: "⏳ Эта команда уже выполняется в этом чате. Подождите.",

  // ─── /perfil / /profil ──────────────────────────────────────────────────────
  perfil_usage:    "Пример: /profil https://app.warera.io/user/XXXXXXXX",
  perfil_not_found:"Пользователь не найден.",
  perfil_resumen:  ({ username, userId, nivel, build, weeklyDmg, totalDmg, danyoActual, wealth, pastilla }) =>
    `👤 *[${username}](https://app.warera.io/user/${userId})*\n` +
    `📊 Уровень: ${nivel} | Билд: ${build}\n` +
    `⚔️ Урон за неделю: ${weeklyDmg}\n` +
    `⚔️ Общий урон: ${totalDmg}\n` +
    `⚔️ Доступный урон (рыба): ${danyoActual}\n` +
    `💰 Богатство: ${wealth}\n` +
    `💊 Таблетка: ${pastilla}`,

  // ─── /guerra / /bitva ───────────────────────────────────────────────────────
  guerra_usage:   "Пример: /bitva https://app.warera.io/battle/XXXXXXXX",
  guerra_resumen: ({ estado, defName, defWins, dmgDef, attName, attWins, dmgAtt, roundsToWin, ganador, battleId }) => {
    let msg = `${estado} *Битва* — [смотреть](https://app.warera.io/battle/${battleId})\n\n`;
    msg += `🛡️ *${defName}*: ${defWins}/${roundsToWin} раундов | Урон: ${dmgDef}\n`;
    msg += `⚔️ *${attName}*: ${attWins}/${roundsToWin} раундов | Урон: ${dmgAtt}\n`;
    if (ganador) msg += `\n🏆 Победитель: *${ganador}*`;
    return msg;
  },

  // ─── /mercado / /rynok ──────────────────────────────────────────────────────
  mercado_usage:     "Пример: /rynok hleb\nТовары: hleb, steik, ryba, stal, zhelezo...",
  mercado_not_found: (q) => `Товар не найден: "${q}"`,
  mercado_resumen:   ({ nombre, itemCode, precio }) =>
    `🏪 *${nombre}* (\`${itemCode}\`)\n💰 Рыночная цена: ${precio}`,

  // ─── /eventos / /sobytiya ───────────────────────────────────────────────────
  eventos_no_data: "Недавних событий нет.",
  eventos_header:  "📰 *Последние события*",

  // ─── /ranking / /reiting ────────────────────────────────────────────────────
  ranking_usage: (tipos) => `Использование: /reiting <тип>\nДоступные типы: ${tipos}`,

  // ─── Aliases de comandos (ruso) ─────────────────────────────────────────────
  // Mapa de: texto que escribe el usuario → nombre interno del handler
  comandoAliases: {
    // Comandos rusos
    poisk:         "buscar",
    golod:         "hambre",
    igroki:        "jugadorespais",
    igrokilmu:     "jugadoresmu",
    uronstrana:    "paisesdanyo",
    uronmu:        "mudanyo",
    dengistrana:   "dineropais",
    dengimu:       "dineromu",
    uronNedeli:    "danyosemanal",
    uronNedeli2:   "danyosemanal",  // alias lowercase
    vremia:        "duracion",
    vremya:        "duracion",
    vse:           "all",
    proizvodstvo:  "produccion",
    // También aceptar los comandos en español en el canal ruso
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
    // Nuevos comandos
    perfil:        "perfil",
    profil:        "perfil",
    guerra:        "guerra",
    bitva:         "guerra",
    mercado:       "mercado",
    rynok:         "mercado",
    eventos:       "eventos",
    sobytiya:      "eventos",
    ranking:       "ranking",
    reiting:       "ranking",
    id:            "id",
    status:        "status",
  },
};
