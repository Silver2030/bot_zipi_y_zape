const { getUserData } = require('../services/apiService');
const { analizarBuild } = require('../utils/helpers');

async function hambre(botQueue, chatId, args, usuarios) {
    if (!args[0]) {
        return botQueue.sendMessage(chatId, "Ejemplo: /hambre https://app.warera.io/battle/68c5efa7d9737c88a4da826c DEFENDEMOS CON TODO", {
            disable_web_page_preview: true
        });
    }

    const urlBattle = args[0];
    const mensajeExtra = args.slice(1).join(' ');
    const menciones = [];

    for (const usuario of usuarios) {
        try {
            const userData = await getUserData(usuario.userId);
            if (!userData) continue;

            const { build } = analizarBuild(userData);

            if (build === "ECO") continue;

            const hunger = userData.skills?.hunger;
            if (hunger && hunger.currentBarValue >= 0.3 * hunger.total) {
                menciones.push(`${usuario.mention} (${userData.username})`);
            }
        } catch (error) {
            console.error(`Error con usuario ${usuario.userId}:`, error.message);
        }
    }

    if (menciones.length === 0) {
        return botQueue.sendMessage(chatId, `Nadie tiene comida`);
    }

    await botQueue.sendMessage(chatId, `${urlBattle}\n${mensajeExtra}`, { disable_web_page_preview: true });

    const chunkSize = 5;
    for (let i = 0; i < menciones.length; i += chunkSize) {
        const grupo = menciones.slice(i, i + chunkSize).join('\n');
        await botQueue.sendMessage(chatId, grupo);
    }
}

module.exports = { hambre };
