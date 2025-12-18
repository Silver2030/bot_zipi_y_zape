const { getCountryData, apiCall } = require('../services/apiService');

function puntosPorTick(total) {
    if (total < 100) return 1;
    if (total < 200) return 2;
    if (total < 300) return 3;
    if (total < 400) return 4;
    if (total < 500) return 5;
    return 6;
}

async function duracion(botQueue, chatId, args) {
    if (!args[0]) {
        return botQueue.add(() => botQueue.bot.sendMessage(chatId, "Ejemplo: /duracion https://app.warera.io/battle/XXXXXXXX", { disable_web_page_preview: true }));
    }

    const battleId = args[0].split("/").pop();

    try {
        const battle = await apiCall("battle.getById", { battleId });
        if (!battle) return botQueue.add(() => botQueue.bot.sendMessage(chatId, "No se pudo obtener la batalla."));
        if (!battle.isActive) return botQueue.add(() => botQueue.bot.sendMessage(chatId, "La batalla ya ha finalizado."));

        const roundsToWin = battle.roundsToWin;
        let defenderWins = battle.defender.wonRoundsCount;
        let attackerWins = battle.attacker.wonRoundsCount;

        const defenderCountry = (await getCountryData(battle.defender.country))?.name ?? "Defensor";
        const attackerCountry = (await getCountryData(battle.attacker.country))?.name ?? "Atacante";

        const round = await apiCall("round.getById", { roundId: battle.currentRound });
        if (!round || !round.isActive) return botQueue.add(() => botQueue.bot.sendMessage(chatId, "No se pudo obtener la ronda actual."));

        const defPoints = round.defender.points;
        const attPoints = round.attacker.points;

        let msg = `⏰ *DURACIÓN ESTIMADA*\n\n`;
        msg += `🛡️ ${defenderCountry}: ${defenderWins} rondas – ${defPoints} pts\n`;
        msg += `⚔️ ${attackerCountry}: ${attackerWins} rondas – ${attPoints} pts\n\n`;

        function simularRonda({ ganadorInicial, perdedorInicial, modo }) {
            let ganador = ganadorInicial;
            let perdedor = perdedorInicial;
            let tiempo = 0;

            while (ganador < 300) {
                const total = ganador + perdedor;
                const ppt = puntosPorTick(total);

                if (modo === "rapido") {
                    ganador += ppt;
                } else {
                    if (perdedor < 300 - ppt) {
                        perdedor += ppt;
                    } else {
                        ganador += ppt;
                    }
                }

                tiempo += 2;
            }

            return tiempo;
        }

        const defensorVaGanando = defenderWins >= attackerWins && defPoints >= attPoints;
        const ganadorRapido = defensorVaGanando ? defenderCountry : attackerCountry;

        let tiempoRapido = simularRonda({
            ganadorInicial: defensorVaGanando ? defPoints : attPoints,
            perdedorInicial: defensorVaGanando ? attPoints : defPoints,
            modo: "rapido"
        });

        const winsTrasRondaRapida = defensorVaGanando ? defenderWins + 1 : attackerWins + 1;
        if (winsTrasRondaRapida < roundsToWin) {
            tiempoRapido += simularRonda({ ganadorInicial: 0, perdedorInicial: 0, modo: "rapido" });
        }

        let tiempoLento = 0;
        let rondaActualGanador;
        if ((defenderWins > 0 && attackerWins === 0) || (defenderWins === attackerWins && attPoints > defPoints)) {
            rondaActualGanador = attPoints;
        } else {
            rondaActualGanador = defPoints;
        }

        let rondaActualPerdedor = rondaActualGanador === defPoints ? attPoints : defPoints;

        tiempoLento += simularRonda({
            ganadorInicial: rondaActualGanador,
            perdedorInicial: rondaActualPerdedor,
            modo: "lento"
        });

        let winsTrasRondaLenta;
        if (rondaActualGanador === defPoints) {
            defenderWins += 1;
            winsTrasRondaLenta = defenderWins;
        } else {
            attackerWins += 1;
            winsTrasRondaLenta = attackerWins;
        }

        if (winsTrasRondaLenta < roundsToWin) {
            if (defenderWins === 0 || attackerWins === 0) {
                tiempoLento += simularRonda({ ganadorInicial: 0, perdedorInicial: 0, modo: "lento" });
            }
            tiempoLento += simularRonda({ ganadorInicial: 0, perdedorInicial: 0, modo: "lento" });
        }

        const formatTiempo = (m) => {
            const h = Math.floor(m / 60);
            const mm = Math.round(m % 60);
            if (!h) return `${mm}m`;
            if (!mm) return `${h}h`;
            return `${h}h ${mm}m`;
        };

        const horaFinal = (min) =>
            new Date(Date.now() + min * 60000).toLocaleTimeString("es-ES", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
                timeZone: "Europe/Madrid"
            });

        msg += `⚡ *Escenario más rápido:*\n`;
        msg += `• Ganador: ${ganadorRapido}\n`;
        msg += `• Tiempo: ${formatTiempo(tiempoRapido)}\n`;
        msg += `• Finaliza: ${horaFinal(tiempoRapido)}\n\n`;

        msg += `🐌 *Escenario más lento:*\n`;
        msg += `• Tiempo: ${formatTiempo(tiempoLento)}\n`;
        msg += `• Finaliza: ${horaFinal(tiempoLento)}`;

        await botQueue.add(() => botQueue.bot.sendMessage(chatId, msg, { parse_mode: "Markdown", disable_web_page_preview: true }));

    } catch (err) {
        console.error("/duracion error:", err);
        await botQueue.add(() => botQueue.bot.sendMessage(chatId, "Error calculando la duración."));
    }
}

module.exports = { duracion };
