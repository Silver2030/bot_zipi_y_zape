const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

const { TelegramQueue } = require('./utils/telegramQueue');

const { duracion } = require('./processors/durationProcessor');
const { buscar } = require('./processors/searchProcessor');
const { hambre } = require('./processors/hungerProcessor');
const { procesarDineroGrupo, procesarJugadoresGrupo, procesarGrupoDanyo } = require('./processors/groupProcessors');
const { produccion } = require('./processors/productionProcessor');
const { all } = require('./processors/allProcessor');
const { danyoSemanal } = require('./processors/weeklyDamageProcessor');
const { delay } = require('./utils/helpers');

const TOKEN_TELEGRAM = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(TOKEN_TELEGRAM, { polling: true });
const botQueue = new TelegramQueue(bot, 500);

const allowedChats = [process.env.GROUP_ID, process.env.GROUP_PRUEBAS_ID, process.env.CHAT_ID].filter(id => id);
const usuarios = [
    { userId: "686f9befee16d37c418cd087", mention: "@SilverFRE" },
    { userId: "686eefe3ee16d37c417a0e59", mention: "@lodensy" },
    { userId: "68386302a484755f062b16a8", mention: "@GaryRr" },
    { userId: "68703ddf37ff51dd0dc590d0", mention: "@TowDl" },
    { userId: "68f8f5ad5dc34ed689e1784c", mention: "@maromaromero" },
    { userId: "686bca33b7dc5cb1d7710a47", mention: "@BZ_033" },
    { userId: "68979dcdd2bf43cdb31abb9f", mention: "@XBrotherX" },
    { userId: "69264c4ccc751d7f45f2f8f4", mention: "@Kaiado" },
];

let commandQueue = Promise.resolve();
const COMMAND_DELAY = 300;

const comandos = {
    help: async (chatId) => {
        const mensaje = `Comandos disponibles:
/buscar <TEXTO>
/hambre <ENLACE_GUERRA> <MENSAJE>
/jugadoresPais <ID_PAIS>
/jugadoresMu <ID_MU>
/paisesDanyo <ID_PAIS> <COMIDA>
/muDanyo <ID_MU> <COMIDA>
/dineropais <ID_PAIS>
/dineromu <ID_MU>
/danyosemanal
/duracion <GUERRA>
/all
/produccion`;
        await botQueue.sendMessage(chatId, mensaje);
    },
    buscar: async (chatId, args) => buscar(botQueue, chatId, args.join(' ')),
    hambre: async (chatId, args) => hambre(botQueue, chatId, args),
    jugadorespais: async (chatId, args) => procesarJugadoresGrupo(botQueue, chatId, args, 'pais'),
    jugadoresmu: async (chatId, args) => procesarJugadoresGrupo(botQueue, chatId, args, 'mu'),
    paisesdanyo: async (chatId, args) => procesarGrupoDanyo(botQueue, chatId, args, 'pais'),
    mudanyo: async (chatId, args) => procesarGrupoDanyo(botQueue, chatId, args, 'mu'),
    dineropais: async (chatId, args) => procesarDineroGrupo(botQueue, chatId, args, 'pais'),
    dineromu: async (chatId, args) => procesarDineroGrupo(botQueue, chatId, args, 'mu'),
    danyosemanal: async (chatId) => danyoSemanal(botQueue, chatId, usuarios),
    produccion: async (chatId) => produccion(botQueue, chatId),
    duracion: async (chatId, args) => duracion(botQueue, chatId, args[0]),
    all: async (chatId) => all(botQueue, chatId, usuarios),
};

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const fromUser = msg.from ? `${msg.from.username || msg.from.first_name} (${msg.from.id})` : 'Unknown';

    console.log(`[${new Date().toISOString()}] ${fromUser} -> ${chatId}: ${text}`);

    if (!text?.startsWith('/')) return;

    if (allowedChats.length && !allowedChats.includes(chatId)) {
        await botQueue.sendMessage(chatId, 'Bot no autorizado en este chat.');
        return;
    }

    const [cmdRaw, ...args] = text.slice(1).split(' ');
    const cmd = cmdRaw.split('@')[0].toLowerCase();

    if (comandos[cmd]) {
        commandQueue = commandQueue
            .then(() => comandos[cmd](chatId, args))
            .catch(err => {
                console.error(`Error en comando /${cmd}:`, err);
            })
            .then(() => delay(COMMAND_DELAY));

        await commandQueue;
    }
});

const app = express();
app.get('/', (req, res) => res.send('Bot activo'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
