const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// GROUP ID: -1002840225634 CHAT ID: 696082291
const GROUP_ID = -1002840225634;
const GROUP_PRUEBAS_ID = -1002840225634;
const CHAT_ID = 696082291;

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

// --- Comandos del bot ---
const comandos = {
    help: (chatId) => {
        const helpMessage = 
`Comandos disponibles:

/help
Acabas de usarlo subnormal

/status
Comprueba si el bot está funcionando y recuerda a Yitan lo que es

/hambre <URL> <MENSAJE>
Menciona a todos los jugadores que tengan un 60% o más de puntos de hambre sin usar. (Muchos pings, no seais imbeciles spameandolo)

/paisesPastilla <ID/ENLACE> <FILTRO>
Muestra usuarios de un país y estado de la pastilla
FILTROS:
- ACTIVAS: Muestra aquellos con la pastilla en activo
- DEBUFF: Muestra aquellos con la pastilla en debuff
- DISPONIBLES: Muestra aquellos con la pastilla disponible para usar
- TODAS: Muestra todas las opciones`;
        bot.sendMessage(chatId, helpMessage);
    },
    status: (chatId) => bot.sendMessage(chatId, 'Sigo funcionando, Yitan maricón'),
    hambre: async (chatId, args) => {
        if (!args[0] || !args[1]) {
            bot.sendMessage(chatId, "Formato: /hambre <URL> <MENSAJE>");
            return;
        }

        const urlBattle = args[0];
        const mensajeExtra = args.slice(1).join(' ');
        const menciones = [];

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
    },
    paisesPastilla: async (chatId, args) => {
        if (args.length < 2) {
            bot.sendMessage(chatId, "Formato: /paisesPastilla <ID/ENLACE> <ACTIVAS/DEBUFF/DISPONIBLES/TODAS>");
            return;
        }

        let countryId = args[0].includes('warera.io') 
            ? args[0].split('/').pop() 
            : args[0];

        const filtro = args[1].toUpperCase();

        try {
            // Obtener usuarios del país
            const usersRes = await axios.get(`https://api2.warera.io/trpc/user.getUsersByCountry?input=${encodeURIComponent(JSON.stringify({countryId, limit:100}))}`);
            const items = usersRes.data?.result?.data?.items || [];

            const usuariosFiltrados = [];

            for (const item of items) {
                try {
                    const userRes = await axios.get(`https://api2.warera.io/trpc/user.getUserLite?input=${encodeURIComponent(JSON.stringify({userId:item._id}))}`);
                    const data = userRes.data?.result?.data;
                    if (!data) continue;

                    let estado = 'disponible';
                    let fecha = null;

                    if (data.buffs?.buffCodes?.length) {
                        estado = 'activa';
                        fecha = new Date(data.buffs.buffEndAt);
                    } else if (data.buffs?.debuffCodes?.length) {
                        estado = 'debuff';
                        fecha = new Date(data.buffs.debuffEndAt);
                    }

                    usuariosFiltrados.push({
                        username: data.username,
                        _id: data._id,
                        estado,
                        fecha
                    });
                } catch (e) {
                    console.error(`Error obteniendo usuario ${item._id}:`, e.message);
                }
            }

            // Separar por estado
            const disponibles = usuariosFiltrados.filter(u => u.estado === 'disponible');
            const activos = usuariosFiltrados.filter(u => u.estado === 'activa');
            const debuffs = usuariosFiltrados.filter(u => u.estado === 'debuff');

            // Función para formatear
            const formatear = (u) => {
                const base = `${u.username} - https://app.warera.io/user/${u._id}`;
                if (u.estado === 'activa') {
                    return `${base}\nPastilla: activa hasta ${u.fecha.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`;
                } else if (u.estado === 'debuff') {
                    return `${base}\nPastilla: debuff hasta ${u.fecha.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`;
                } else {
                    return `${base}\nPastilla: disponible`;
                }
            };

            let mensajeFinal = '';

            if (filtro === 'TODAS') {
                mensajeFinal += `Disponibles: ${disponibles.length}, Activas: ${activos.length}, Debuff: ${debuffs.length}\n\n`;
                mensajeFinal += [...disponibles, ...activos, ...debuffs].map(formatear).join('\n\n');
            } else if (filtro === 'DISPONIBLES') {
                mensajeFinal += `Disponibles: ${disponibles.length}\n\n`;
                mensajeFinal += disponibles.map(formatear).join('\n\n');
            } else if (filtro === 'ACTIVAS') {
                mensajeFinal += `Activas: ${activos.length}\n\n`;
                mensajeFinal += activos.map(formatear).join('\n\n');
            } else if (filtro === 'DEBUFF') {
                mensajeFinal += `Debuff: ${debuffs.length}\n\n`;
                mensajeFinal += debuffs.map(formatear).join('\n\n');
            } else {
                mensajeFinal = "Filtro no válido. Usa ACTIVAS, DEBUFF, DISPONIBLES o TODAS.";
            }

            bot.sendMessage(chatId, mensajeFinal);

        } catch (error) {
            console.error(error);
            bot.sendMessage(chatId, "Ha ocurrido un error al procesar el comando.");
        }
    }
};

// --- Listener principal ---
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    console.log(`Mensaje recibido en chatId: ${chatId} | Texto: ${msg.text}`);

    // Filtrar por grupo o chat permitido
    if (GROUP_ID && chatId !== GROUP_ID && chatId !== GROUP_PRUEBAS_ID && chatId !== CHAT_ID) return;

    const text = msg.text;
    if (!text || !text.startsWith('/')) return;

    const [cmd, ...args] = text.slice(1).split(' ');

    if (comandos[cmd]) {
        await comandos[cmd](chatId, args);
    }
});

// --- Express para UptimeRobot ---
const app = express();
app.get('/', (req, res) => res.send('Bot alive!'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
