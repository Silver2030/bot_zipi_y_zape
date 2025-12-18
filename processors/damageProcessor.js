const { getUserData } = require('../services/apiService');
const { formatNumber, delay } = require('../utils/helpers');

async function danyoSemanal(botQueue, chatId, usuarios) {
    try {
        const resultados = [];

        for (let i = 0; i < usuarios.length; i++) {
            const u = usuarios[i];
            try {
                const data = await getUserData(u.userId);
                if (data) {
                    resultados.push({
                        username: data.username,
                        weeklyDamage: data.rankings?.weeklyUserDamages?.value || 0
                    });
                }
            } catch (e) {
                console.error(`Error usuario ${u.userId}:`, e);
            }

            await delay(100);
        }

        if (!resultados.length) return botQueue.sendMessage(chatId, "No se pudo obtener el daño semanal.");

        resultados.sort((a, b) => b.weeklyDamage - a.weeklyDamage);
        const totalDamage = resultados.reduce((s, r) => s + r.weeklyDamage, 0);
        const media = Math.round(totalDamage / resultados.length);

        let mensaje = `Daño semanal:\n\n${resultados.map((r, i) => `${i + 1}) ${r.username}: ${formatNumber(r.weeklyDamage)}`).join('\n')}\n\nMedia: ${formatNumber(media)}`;
        await botQueue.sendMessage(chatId, mensaje);

    } catch (err) {
        console.error(err);
        await botQueue.sendMessage(chatId, "Error al obtener daños semanales.");
    }
}

module.exports = { danyoSemanal };