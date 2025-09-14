const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Lista de usuarios
const usuarios = [
    { userId: "686f9befee16d37c418cd087", mention: "@SilverFRE" },
    { userId: "6877c0446097872ea4988815", mention: "@LoganSS021" },
    { userId: "688955d9b9407610b5a9808d", mention: "@Daotma" },
    { userId: "688f351bd672278e5d09b3e3", mention: "@Daotma" },
    { userId: "689cb0d3d52432c932980841", mention: "@noMeLoSe" }
    // más usuarios...
];

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

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

            if (hunger && hunger.currentBarValue >= 0.7 * hunger.total) {
                // Formato: @Mencion (username)
                menciones.push(`${usuario.mention} (${username})`);
            }
        } catch (error) {
            console.error(`Error con usuario ${usuario.userId}:`, error.message);
        }
    }

    const mensajeFinal = `${urlBattle}\n${mensajeExtra}\n${menciones.join(' ')}`;
    bot.sendMessage(chatId, mensajeFinal);
});

const express = require('express');
const app = express();

// Endpoint simple para que UptimeRobot haga ping
app.get('/', (req, res) => {
    res.send('Bot alive!');
});

// Puerto 3000 (Replit automáticamente lo redirige a un puerto accesible)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
