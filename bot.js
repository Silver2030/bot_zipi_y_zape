const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// ID del grupo donde quieres que funcione el bot
const GROUP_ID = -1002840225634; // <-- reemplaza con el chatId real cuando lo tengas

// Lista de usuarios
const usuarios = [
    { userId: "6877c0446097872ea4988815", mention: "@LoganSS021" },
    { userId: "688955d9b9407610b5a9808d", mention: "@Daotma" },
    { userId: "688f351bd672278e5d09b3e3", mention: "@Daotma" },
    { userId: "683f624fc6294e3b6516c78e", mention: "@JoseManuelMaCa" },
    { userId: "6840e2eefb821d5f963e6b36", mention: "@LordWark" },
    { userId: "688e2e05eda4287d4d40f1d9", mention: "@LordWark" },
    { userId: "683d9c606e2c1b9aa4448f2f", mention: "@ElYodas" },
    { userId: "686bca33b7dc5cb1d7710a47", mention: "@BZ_033" },
    { userId: "6897a6b1d286896c6760e474", mention: "@Daotma" },
    { userId: "688fc8522d7fcdd226cda5ee", mention: "@gonchiii1" },
    { userId: "682a6a132b76380956602044", mention: "@Dopillo" },
    { userId: "682bba892cae032763110f07", mention: "@Dopillo" },
    { userId: "6830b7bdec8d7fb5ea1444a0", mention: "@achtzing" },
    { userId: "683d088a0b5bc553dcd1bf17", mention: "@Xaandree" },
    { userId: "683d87d781b2e093d7ef6fbd", mention: "@CarlosMorG" },
    { userId: "683da442ca51017a7ae9ba9e", mention: "@Valthognir" },
    { userId: "683e13f6a1027da10c805af0", mention: "@Robeloxinthahouse" },
    { userId: "683f8cd86e3808e6765938f6", mention: "@blitzkriegseven" },
    { userId: "6840b9945a2ea3f4a4819680", mention: "@flashmolox" },
    { userId: "6841e93f4503de9d2a49bac2", mention: "@Mikeeeel" },
    { userId: "6849bef474cdd09ff494ddf1", mention: "@YitanRR" },
    { userId: "684aba6474cdd09ff4bdb1c9", mention: "@kesta_pasando" },
    { userId: "686be039fb337713b29e172d", mention: "@Brayanorsini" },
    { userId: "686d0bf95841fc53d8fe3e69", mention: "@Flopero" },
    { userId: "686eb3bab7dc5cb1d7e3085b", mention: "@Dopillo" },
    { userId: "686eca28c6f1851a706a304d", mention: "@bt0mas" },
    { userId: "686f9befee16d37c418cd087", mention: "@SilverFRE" },
    { userId: "6876632469f52d5b9c1271d7", mention: "@noSeQuienEsYandro" },
    { userId: "6877c0446097872ea4988815", mention: "@LoganSS021" },
    { userId: "687b345ee6f08f7066aa7aff", mention: "@noSeQuienEsSurpriseMagician" },
    { userId: "688a5b63449469e970769c28", mention: "@Oresito" },
    { userId: "68920253cb23029a760fe72a", mention: "@noSeQuienEsBaguchin" },
    { userId: "689a5f3a5c3c40f764859813", mention: "@Dopillo" },
    { userId: "689a5f94f3c7e02ba2f2b981", mention: "@Dopillo" },
    { userId: "689cb0d3d52432c932980841", mention: "@noSeQuienEsPotato" },
    { userId: "68a34a08d1c35b2e594c6ea6", mention: "@Oresito" },
    { userId: "68b4eb03ff683cdd14acf90b", mention: "@noSeQuienEsMegalomaniaa" },
    { userId: "68b6cff38cb553cbc3f79eec", mention: "@noSeQuienEsMardOuaz" }
];

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    // Solo responder si viene del grupo permitido
    if (GROUP_ID && chatId !== GROUP_ID) return; // mientras GROUP_ID sea null no filtra

    const text = msg.text;
    if (!text) return;

    // Comando /help
    if (text.startsWith('/help')) {
        const helpMessage = `
    Comandos disponibles:

    /status - Comprueba si el bot está funcionando y recuerdas a Yitan lo que es
    /hambre <URL> <MENSAJE> - Menciona a todos los jugadores que tengan un 60% o más de puntos de hambre sin usar (Muchos pings, no seais imbeciles spameandolo)
    /help - Acabas de usarlo subnormal
        `;
        bot.sendMessage(chatId, helpMessage);
        return;
    }
    
    // Comando /status
    if (text.startsWith('/status')) {
        bot.sendMessage(chatId, 'Sigo funcionando, Yitan maricón');
        return;
    }

    // Comando /hambre
    if (!text.startsWith('/hambre')) return;

    // Separar argumentos
    const args = text.split(' ');
    if (args.length < 3) {
        bot.sendMessage(chatId, "Formato: /hambre <URL> <MENSAJE>");
        return;
    }

    const urlBattle = args[1];
    const mensajeExtra = args.slice(2).join(' ');

    const menciones = [];

    // Revisar cada usuario
    for (const usuario of usuarios) {
        try {
            const input = encodeURIComponent(JSON.stringify({ userId: usuario.userId }));
            const apiUrl = `https://api2.warera.io/trpc/user.getUserLite?input=${input}`;

            const response = await axios.get(apiUrl, { headers: { 'Accept': 'application/json' } });
            const data = response.data?.result?.data;
            const hunger = data?.skills?.hunger;
            const username = data?.username;

            if (hunger && hunger.currentBarValue >= 0.6 * hunger.total) {
                menciones.push(`${usuario.mention} (${username})`);
            }
        } catch (error) {
            console.error(`Error con usuario ${usuario.userId}:`, error.message);
        }
    }

    const mensajeFinal = `${urlBattle}\n${mensajeExtra}\n${menciones.join('\n')}`;
    bot.sendMessage(chatId, mensajeFinal);
});

// --- Express para UptimeRobot ---
const app = express();
app.get('/', (req, res) => res.send('Bot alive!'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));