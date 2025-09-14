const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// --- Map para manejar estados de usuario ---
// chatId -> { action: 'paisesDanyo' | 'mudanyo' | 'paisesPastilla' | 'muPastilla' }
const userState = new Map();

// --- Función para calcular daño Montecarlo ---
async function calcularDanyo(userData, healFood) {
    const atk = userData.skills.attack?.total || 0;
    const critChance = (userData.skills.criticalChance?.total || 0) / 100;
    const critDmg = (userData.skills.criticalDamages?.total || 0) / 100;
    const precision = (userData.skills.precision?.total || 0) / 100;
    const armor = (userData.skills.armor?.total || 0) / 100;
    const dodge = (userData.skills.dodge?.total || 0) / 100;

    const hpNow = (userData.skills.health?.currentBarValue || 0)
        + Math.floor(userData.skills.hunger?.currentBarValue || 0) * healFood;

    const hpRegen24h = userData.skills.health?.total * 0.1 * 24;
    const hungerRegen24h = Math.floor(userData.skills.hunger?.total * 0.1 * 24) * healFood;
    const hp24h = hpRegen24h + hungerRegen24h;

    function simular(hpTotal) {
        const simulaciones = 10000;
        let totalDanyo = 0;

        for (let i = 0; i < simulaciones; i++) {
            let hp = hpTotal;
            let dmg = 0;

            while (hp >= 10) {
                const esquiva = Math.random() < dodge;
                const coste = esquiva ? 0 : 10 * (1 - armor);
                if (hp < coste) break;
                hp -= coste;

                let base = atk;
                if (Math.random() < critChance) base *= (1 + critDmg);
                if (Math.random() >= precision) base *= 0.5;

                dmg += base;
            }
            totalDanyo += dmg;
        }

        return totalDanyo / simulaciones;
    }

    return {
        danyoActual: simular(hpNow),
        danyo24h: simular(hp24h)
    };
}

// --- Función unificada para país o MU ---
async function calcularDanyoGrupo(chatId, args, tipo = 'pais') {
    if (args.length < 2) {
        bot.sendMessage(chatId, tipo === 'pais'
            ? "Ejemplo: <ID_PAIS/ENLACE_PAIS> PESCADO"
            : "Ejemplo: <ID_MU/ENLACE_MU> PESCADO");
        return;
    }

    const id = args[0].includes('warera.io') ? args[0].split('/').pop() : args[0];
    const comida = args[1].toUpperCase();
    const healMap = { PAN: 10, FILETE: 20, PESCADO: 30 };
    const healFood = healMap[comida];

    if (!healFood) {
        bot.sendMessage(chatId, "Comida inválida. Usa PAN, FILETE o PESCADO.");
        return;
    }

    try {
        let items = [];

        if (tipo === 'pais') {
            const usersRes = await axios.get(`https://api2.warera.io/trpc/user.getUsersByCountry?input=${encodeURIComponent(JSON.stringify({ countryId: id, limit: 100 }))}`);
            items = usersRes.data?.result?.data?.items || [];
        } else {
            const muRes = await axios.get(`https://api2.warera.io/trpc/mu.getById?input=${encodeURIComponent(JSON.stringify({ muId: id }))}`);
            const muData = muRes.data?.result?.data;
            if (!muData?.members?.length) {
                bot.sendMessage(chatId, "No se encontraron miembros en esa MU.");
                return;
            }
            items = muData.members.map(userId => ({ _id: userId }));
        }

        let totalActual = 0;
        let total24h = 0;
        const resultados = [];

        for (const item of items) {
            try {
                const userRes = await axios.get(`https://api2.warera.io/trpc/user.getUserLite?input=${encodeURIComponent(JSON.stringify({ userId: item._id }))}`);
                const data = userRes.data?.result?.data;
                if (!data) continue;

                const { danyoActual, danyo24h } = await calcularDanyo(data, healFood);

                totalActual += danyoActual;
                total24h += danyo24h;

                resultados.push({
                    username: data.username,
                    userId: data._id,
                    danyoActual,
                    danyo24h
                });

            } catch (e) {
                console.error(`Error obteniendo usuario ${item._id}:`, e.message);
            }
        }

        resultados.sort((a, b) => b.danyoActual - a.danyoActual);

        const mensajeUsuarios = resultados.map(u =>
            `- ${u.username} - https://app.warera.io/user/${u.userId}\n` +
            `Daño actual: ${Math.round(u.danyoActual).toLocaleString('es-ES')}\n` +
            `Daño 24h: ${Math.round(u.danyo24h).toLocaleString('es-ES')}`
        ).join('\n\n');

        const mensajeFinal =
            `- ${tipo === 'pais' ? 'País' : 'MU'}: https://app.warera.io/${tipo}/${id}\n` +
            `- Comida usada: ${comida}\n\n` +
            `- Total de daño disponible: ${Math.round(totalActual).toLocaleString('es-ES')}\n` +
            `- Total de daño a lo largo de 24h: ${Math.round(total24h).toLocaleString('es-ES')}\n\n` +
            mensajeUsuarios;

        bot.sendMessage(chatId, mensajeFinal);

    } catch (error) {
        console.error(error);
        bot.sendMessage(chatId, "Ha ocurrido un error al procesar la acción.");
    }
}

// --- Comandos que no necesitan argumentos ---
const comandosRapidos = {
    help: (chatId) => {
        bot.sendMessage(chatId, "Comandos disponibles: \n- Menú principal: /menu");
    },
    status: (chatId) => bot.sendMessage(chatId, "Bot activo y funcionando")
};

// --- Botón principal / menú ---
bot.onText(/\/menu/, async (msg) => {
    const chatId = msg.chat.id;

    const options = {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'País: Daño', callback_data: 'paisesDanyo' }],
                [{ text: 'MU: Daño', callback_data: 'mudanyo' }],
                [{ text: 'País: Pastilla', callback_data: 'paisesPastilla' }],
                [{ text: 'MU: Pastilla', callback_data: 'muPastilla' }],
                [{ text: 'Status', callback_data: 'status' }],
                [{ text: 'Help', callback_data: 'help' }],
            ]
        }
    };

    await bot.sendMessage(chatId, 'Selecciona una opción del menú:', options);
});

// --- Manejar botones ---
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    await bot.answerCallbackQuery(callbackQuery.id);

    // Botones rápidos
    if (data === 'status' || data === 'help') {
        if (comandosRapidos[data]) comandosRapidos[data](chatId);
        return;
    }

    // Para botones que necesitan argumentos
    bot.sendMessage(chatId, `Has seleccionado ${data}. Ahora envía los argumentos necesarios separados por espacio.`);
    userState.set(chatId, { action: data });
});

// --- Manejar mensajes según estado ---
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;

    if (userState.has(chatId)) {
        const state = userState.get(chatId);
        const args = text.split(' ');

        switch (state.action) {
            case 'paisesDanyo':
                await calcularDanyoGrupo(chatId, args, 'pais');
                break;
            case 'mudanyo':
                await calcularDanyoGrupo(chatId, args, 'mu');
                break;
            case 'paisesPastilla':
                await comandos.paisespastilla(chatId, args);
                break;
            case 'muPastilla':
                await comandos.mupastilla(chatId, args);
                break;
        }

        userState.delete(chatId); // Limpiar estado
        return;
    }

    // Mensajes que empiezan con / siguen el flujo anterior
    if (text.startsWith('/')) {
        const [cmdRaw, ...args] = text.slice(1).split(' ');
        const cmd = cmdRaw.toLowerCase();

        if (comandosRapidos[cmd]) comandosRapidos[cmd](chatId);
    }
});

// --- Express para uptime ---
const app = express();
app.get('/', (req, res) => res.send('Bot alive!'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));