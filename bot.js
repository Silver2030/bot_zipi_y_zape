const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// ID del grupo donde quieres que funcione el bot
const GROUP_ID = null; // <-- reemplaza con el chatId real cuando lo tengas

// Lista de usuarios
const usuarios = [
    { userId: "6877c0446097872ea4988815", mention: "@LoganSS021" },
    { userId: "688955d9b9407610b5a9808d", mention: "@Daotma" },
    // ... resto de usuarios
];

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    // Solo responder si viene del grupo permitido
    if (GROUP_ID && chatId !== GROUP_ID) return; // mientras GROUP_ID sea undefined no filtra

    const text = msg.text;
    if (!text || !text.startsWith('/hambre')) return;

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

            if (hunger && hunger.currentBarValue >= 0.7 * hunger.total) {
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

// Opcional: imprime todos los chatIds para ayudarte a encontrar tu grupo
bot.on('message', (msg) => {
    console.log("Mensaje recibido en chatId:", msg.chat.id);
});