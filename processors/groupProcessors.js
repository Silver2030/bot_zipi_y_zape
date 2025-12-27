const { getUserData, apiCall } = require('../services/apiService');
const { escapeMarkdownV2, formatNumberMarkdown, generarExcelBuffer, delay, extraerId } = require('../utils/helpers');

async function procesarJugadoresGrupo(botQueue, chatId, args, tipo) {
    if (!args[0]) {
        return botQueue.sendMessage(chatId, `Falta ID de ${tipo}`);
    }

    const grupoId = extraerId(args[0]);
    let usuarios;

    if (tipo === 'pais') {
        usuarios = await apiCall('user.getUsersByCountry', { countryId: grupoId });
    } else {
        usuarios = await apiCall('mu.getById', { muId: grupoId });
    }

    if (!usuarios) {
        return botQueue.sendMessage(chatId, `No se encontraron usuarios en este ${tipo}`);
    }
    
    const resultados = [];
    if (tipo === 'pais') {
        for (const usuario of usuarios.items) {
            try {
                const userData = await getUserData(usuario._id);
                if (!userData) continue;

                resultados.push({
                    username: userData.username,
                    userId: usuario._id,
                    level: userData.leveling?.level || 0
                });
            } catch (err) {
                console.error(`Error procesando usuario ${usuario._id}:`, err.message);
            }
        }
    } else {
        for (const usuario of usuarios.members) {
            try {
                const userData = await getUserData(usuario);
                if (!userData) continue;

                resultados.push({
                    username: userData.username,
                    userId: usuario,
                    level: userData.leveling?.level || 0
                });
            } catch (err) {
                console.error(`Error procesando usuario ${usuario._id}:`, err.message);
            }
        }
    }

    const chunkSize = 10;
    for (let i = 0; i < resultados.length; i += chunkSize) {
        const chunk = resultados.slice(i, i + chunkSize);
        let mensaje = `*Jugadores ${i + 1}\\-${Math.min(i + chunkSize, resultados.length)}:*\n\n`;
        chunk.forEach((jugador, index) => {
            const idx = i + index + 1;
            mensaje += `${escapeMarkdownV2(`${idx})`)} ${escapeMarkdownV2(jugador.username)}\n`;
        });

        await botQueue.sendMessage(chatId,mensaje, { parse_mode: "MarkdownV2", disable_web_page_preview: true });
        await delay(500);
    }
}

async function procesarDineroGrupo(botQueue, chatId, args, tipo) {
    if (!args[0]) {
        return botQueue.sendMessage(chatId,`Falta ID de ${tipo}`);
    }

    const grupoId = args[0];
    const items = await apiCall(tipo === 'pais' ? 'country.getUsers' : 'mu.getUsers', { id: grupoId });

    if (!items?.length) {
        return botQueue.sendMessage(chatId,`No se encontraron usuarios en este ${tipo}`);
    }

    const resultados = [];
    let totalWealth = 0, totalFactoryWealth = 0, totalLiquidWealth = 0, totalFactories = 0;

    for (const [index, item] of items.entries()) {
        try {
            const userData = await getUserData(item._id);
            if (!userData) continue;

            const factoryWealth = userData.factories?.reduce((a, f) => a + (f.wealth || 0), 0) || 0;
            const totalWealthValue = (userData.money || 0) + factoryWealth;
            const liquidWealth = totalWealthValue - factoryWealth;

            resultados.push({
                username: userData.username,
                userId: item._id,
                level: userData.leveling?.level || 0,
                totalWealth: totalWealthValue,
                factoryWealth,
                liquidWealth,
                factoryCount: userData.factories?.length || 0
            });

            totalWealth += totalWealthValue;
            totalFactoryWealth += factoryWealth;
            totalLiquidWealth += liquidWealth;
            totalFactories += userData.factories?.length || 0;

            if (index % 10 === 0) {
                await botQueue.sendMessage(chatId,`💰 Procesando ${index + 1}/${items.length} jugadores...`);
            }

        } catch (error) {
            console.error(`Error procesando usuario ${item._id}:`, error.message);
        }
    }

    resultados.sort((a, b) => b.totalWealth - a.totalWealth);
    const playerCount = resultados.length;
    const avgWealth = totalWealth / playerCount;
    const avgFactoryWealth = totalFactoryWealth / playerCount;
    const avgLiquidWealth = totalLiquidWealth / playerCount;
    const avgFactories = totalFactories / playerCount;

    let mensajePrincipal = `💰 *DINERO DEL ${tipo.toUpperCase()}*\n\n`;
    mensajePrincipal += `👥 Jugadores: ${playerCount}\n💰 Total: ${formatNumberMarkdown(totalWealth)} monedas\n`;
    mensajePrincipal += `🏭 Wealth fábricas: ${formatNumberMarkdown(totalFactoryWealth)}\n`;
    mensajePrincipal += `💵 Dinero/Almacen: ${formatNumberMarkdown(totalLiquidWealth)}\n`;
    mensajePrincipal += `🔧 Nº fábricas: ${totalFactories}\n\n`;
    mensajePrincipal += `*Promedios por jugador:*\n`;
    mensajePrincipal += `💰 Wealth: ${formatNumberMarkdown(avgWealth)}\n🏭 Fábricas: ${formatNumberMarkdown(avgFactoryWealth)}\n`;
    mensajePrincipal += `💵 Dinero/Almacen: ${formatNumberMarkdown(avgLiquidWealth)}\n🔧 ${avgFactories.toFixed(1)} fábricas`;

    await botQueue.sendMessage(chatId,mensajePrincipal, { parse_mode: "MarkdownV2" });

    try {
        const excelBuffer = await generarExcelBuffer(resultados, `${tipo}_${Date.now()}`);
        await botQueue.sendDocument(excelBuffer, { filename: `dinero_${tipo}_${Date.now()}.xlsx` });
    } catch (error) {
        console.error('Error generando Excel:', error);
        await botQueue.sendMessage(chatId,'⚠️ No se pudo generar el archivo Excel, pero aquí están los datos:');
    }
}

async function procesarGrupoDanyo(botQueue, chatId, args, tipo) {
    if (!args[0]) return botQueue.sendMessage(chatId, `Falta ID de ${tipo}`);

    const grupoId = args[0];
    const usuarios = await apiCall(tipo === 'pais' ? 'country.getUsers' : 'mu.getUsers', { id: grupoId });

    if (!usuarios?.length) return botQueue.sendMessage(chatId, `No se encontraron usuarios en este ${tipo}`);

    const resultados = [];

    for (const usuario of usuarios) {
        try {
            const userData = await getUserData(usuario._id);
            if (!userData) continue;
            const damage = userData.rankings?.weeklyUserDamages?.value || 0;

            resultados.push({ username: userData.username, damage });
        } catch (error) {
            console.error(`Error procesando usuario ${usuario._id}:`, error.message);
        }
    }

    resultados.sort((a, b) => b.damage - a.damage);

    let mensaje = `💥 *DAÑO DEL ${tipo.toUpperCase()}*\n\n`;
    resultados.forEach((r, i) => {
        mensaje += `${i + 1}) ${escapeMarkdownV2(r.username)}: ${formatNumberMarkdown(r.damage)}\n`;
    });

    await botQueue.sendMessage(chatId, mensaje, { parse_mode: "MarkdownV2" });
}

module.exports = { procesarJugadoresGrupo, procesarDineroGrupo, procesarGrupoDanyo };