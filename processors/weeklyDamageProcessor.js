const { getUserData } = require('../services/apiService');
const { formatNumber } = require('../utils/helpers');

async function danyoSemanal(botQueue, chatId, usuarios) {
    try {
        const resultados = [];

        for (const usuario of usuarios) {
            try {
                const userData = await getUserData(usuario.userId);
                if (!userData) continue;

                const weeklyDamage =
                    userData.rankings?.weeklyUserDamages?.value ?? 0;

                resultados.push({
                    username: userData.username,
                    weeklyDamage
                });

            } catch (err) {
                console.error(
                    `Error con usuario ${usuario.userId}:`,
                    err.message
                );
            }
        }

        if (!resultados.length) {
            return botQueue.sendMessage(
                chatId,
                "No se pudo obtener el daño semanal."
            );
        }

        resultados.sort((a, b) => b.weeklyDamage - a.weeklyDamage);

        const totalDamage = resultados.reduce(
            (sum, r) => sum + r.weeklyDamage,
            0
        );

        const media = Math.round(totalDamage / resultados.length);

        const lista = resultados
            .map(
                (r, i) =>
                    `${i + 1}) ${r.username}: ${formatNumber(r.weeklyDamage)}`
            )
            .join('\n');

        const mensajeFinal =
            `💥 *DAÑO SEMANAL*\n\n` +
            `${lista}\n\n` +
            `📊 Media de daño: ${formatNumber(media)}`;

        await botQueue.sendMessage(chatId, mensajeFinal, {
            parse_mode: "Markdown"
        });

    } catch (error) {
        console.error("Error en weeklyDamageProcessor:", error);
        await botQueue.sendMessage(
            chatId,
            "Error al obtener daños semanales."
        );
    }
}

module.exports = { danyoSemanal };