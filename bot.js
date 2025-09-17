const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

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
            ? "Ejemplo: /paisesDanyo https://app.warera.io/country/683ddd2c24b5a2e114af15d9 PESCADO"
            : "Ejemplo: /muDanyo https://app.warera.io/mu/687cbb53fae4c9cf04340e77 PESCADO");
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
        bot.sendMessage(chatId, "Ha ocurrido un error al procesar el comando.");
    }
}

// GROUP ID: -1002840225634 CHAT ID: 696082291
const GROUP_ID = -1002840225634;
const GROUP_PRUEBAS_ID = -4981907547;
const CHAT_ID = 696082291;

// Lista de usuarios
const usuarios = [
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
    { userId: "68b6cff38cb553cbc3f79eec", mention: "@noSeQuienEsMardOuaz" },
    { userId: "68386302a484755f062b16a8", mention: "@GaryRr" },
    { userId: "68703ddf37ff51dd0dc590d0", mention: "@GaryRr" }
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

/hambre <ENLACE_GUERRA> <MENSAJE>
Menciona a todos los jugadores que tengan un 60% o más de puntos de hambre sin usar. (Muchos pings, no seais imbeciles spameandolo)
EJEMPLO: /hambre https://app.warera.io/battle/68c5efa7d9737c88a4da826c DEFENDEMOS CON TODO

/paisesPastilla <ID_PAIS/ENLACE_PAIS> <FILTRO>
Muestra el estado de las pastillas de un pais
FILTROS:
- ACTIVAS: Muestra aquellos con la pastilla en activo
- DEBUFF: Muestra aquellos con la pastilla en debuff
- DISPONIBLES: Muestra aquellos con la pastilla disponible para usar
- TODAS: Muestra todas las opciones
EJEMPLO: /paisesPastilla https://app.warera.io/country/683ddd2c24b5a2e114af15d9 TODAS

/muPastilla <ID_MU/MU> <FILTRO>
Muestra el estado de las pastillas de una mu
FILTROS:
- ACTIVAS: Muestra aquellos con la pastilla en activo
- DEBUFF: Muestra aquellos con la pastilla en debuff
- DISPONIBLES: Muestra aquellos con la pastilla disponible para usar
- TODAS: Muestra todas las opciones
EJEMPLO: /muPastilla https://app.warera.io/country/687cbb53fae4c9cf04340e77 TODAS

/paisesDanyo <ID_PAIS/ENLACE_PAIS> <FILTRO>
Muestra el daño disponible de un pais y el que puede hacer a lo largo de 24h (Sin buffos y son aproximaciones)
FILTROS:
- PAN: Se supone un caso en el que todos usaran pan para recuperar hp
- FILETE: Se supone un caso en el que todos usaran filetes para recuperar hp
- PESCADO: Se supone un caso en el que todos usaran pescado para recuperar hp
EJEMPLO: /paisesDanyo https://app.warera.io/country/683ddd2c24b5a2e114af15d9 PESCADO

/muDanyo <ID_MU/MU> <FILTRO>
Muestra el daño disponible de una mu y el que puede hacer a lo largo de 24h (Sin buffos y son aproximaciones)
FILTROS:
- PAN: Se supone un caso en el que todos usaran pan para recuperar hp
- FILETE: Se supone un caso en el que todos usaran filetes para recuperar hp
- PESCADO: Se supone un caso en el que todos usaran pescado para recuperar hp
EJEMPLO: /muDanyo https://app.warera.io/mu/687cbb53fae4c9cf04340e77 PAN

/danyosemanal
Muestra el ranking de daño de esta semana de los players registrados`;
        bot.sendMessage(chatId, helpMessage);
    },
    status: (chatId) => bot.sendMessage(chatId, 'Sigo funcionando, Yitan maricón'),
    hambre: async (chatId, args) => {
    if (!args[0] || !args[1]) {
        bot.sendMessage(chatId, "Ejemplo: /hambre https://app.warera.io/battle/68c5efa7d9737c88a4da826c DEFENDEMOS CON TODO");
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
            if (!data) continue;

            const hunger = data?.skills?.hunger;
            const username = data?.username;
            const debuffs = data?.buffs?.debuffCodes || [];

            // No mencionar si tiene debuff "cocain"
            if (debuffs.includes("cocain")) {
                console.log(`Excluido ${username} (${usuario.userId}) por debuff de cocain`);
                continue;
            }

            // Validar hambre ≥ 30%
            if (hunger && hunger.currentBarValue >= 0.3 * hunger.total) {
                menciones.push(`${usuario.mention} (${username})`);
            }
        } catch (error) {
            console.error(`Error con usuario ${usuario.userId}:`, error.message);
        }
    }

    const mensajeFinal = `${urlBattle}\n${mensajeExtra}\n${menciones.join('\n')}`;
    bot.sendMessage(chatId, mensajeFinal);
    },
    paisespastilla: async (chatId, args) => {
    if (args.length < 2) {
        bot.sendMessage(chatId, "Ejemplo: /paisesPastilla https://app.warera.io/country/683ddd2c24b5a2e114af15d9 TODAS");
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
        const activos = usuariosFiltrados.filter(u => u.estado === 'activa').sort((a,b) => a.fecha - b.fecha);
        const debuffs = usuariosFiltrados.filter(u => u.estado === 'debuff').sort((a,b) => a.fecha - b.fecha);

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
    },

    mupastilla: async (chatId, args) => {
        if (args.length < 2) {
            bot.sendMessage(chatId, "Ejemplo: /muPastilla https://app.warera.io/country/687cbb53fae4c9cf04340e77 TODAS");
            return;
        }

        let muId = args[0].includes('warera.io')
            ? args[0].split('/').pop()
            : args[0];

        const filtro = args[1] ? args[1].toUpperCase() : "TODAS";

        try {
            const muRes = await axios.get(`https://api2.warera.io/trpc/mu.getById?input=${encodeURIComponent(JSON.stringify({ muId }))}`);
            const muData = muRes.data?.result?.data;

            if (!muData || !muData.members?.length) {
                bot.sendMessage(chatId, "No se encontraron miembros en esa MU.");
                return;
            }

            const usuariosFiltrados = [];

            for (const userId of muData.members) {
                try {
                    const userRes = await axios.get(`https://api2.warera.io/trpc/user.getUserLite?input=${encodeURIComponent(JSON.stringify({userId}))}`);
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
                    console.error(`Error obteniendo usuario ${userId}:`, e.message);
                }
            }

            const disponibles = usuariosFiltrados.filter(u => u.estado === 'disponible');
            const activos = usuariosFiltrados.filter(u => u.estado === 'activa').sort((a,b) => a.fecha - b.fecha);
            const debuffs = usuariosFiltrados.filter(u => u.estado === 'debuff').sort((a,b) => a.fecha - b.fecha);

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
        },
        paisesdanyo: async (chatId, args) => {
            calcularDanyoGrupo(chatId, args, 'pais');
        },
        mudanyo: async (chatId, args) => {
            calcularDanyoGrupo(chatId, args, 'mu');
        },
        danyosemanal: async (chatId) => {
        try {
            const resultados = [];

            for (const usuario of usuarios) {
                try {
                    const input = encodeURIComponent(JSON.stringify({ userId: usuario.userId }));
                    const apiUrl = `https://api2.warera.io/trpc/user.getUserLite?input=${input}`;
                    const response = await axios.get(apiUrl, { headers: { 'Accept': 'application/json' } });
                    const data = response.data?.result?.data;
                    if (!data) continue;

                    const username = data.username;
                    const weeklyDamage = data.rankings?.weeklyUserDamages?.value ?? 0;

                    resultados.push({ username, weeklyDamage });
                } catch (error) {
                    console.error(`Error con usuario ${usuario.userId}:`, error.message);
                }
            }

            if (resultados.length === 0) {
                bot.sendMessage(chatId, "No se pudo obtener el daño semanal de ningún jugador.");
                return;
            }

            // Ordenar de mayor a menor daño
            resultados.sort((a, b) => b.weeklyDamage - a.weeklyDamage);

            // Calcular la media
            const totalDamage = resultados.reduce((sum, r) => sum + r.weeklyDamage, 0);
            const media = Math.round(totalDamage / resultados.length);

            // Formatear salida numerada
            const lista = resultados
                .map((r, i) => `${i + 1}) ${r.username}: ${r.weeklyDamage.toLocaleString('es-ES')}`)
                .join('\n');

            const mensajeFinal = `Daño semanal:\n\n${lista}\n\nMedia de daño: ${media.toLocaleString('es-ES')}`;
            bot.sendMessage(chatId, mensajeFinal);
        } catch (error) {
            console.error("Error en /danyoSemanal:", error.message);
            bot.sendMessage(chatId, "Error al obtener los daños semanales.");
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

    const [cmdRaw, ...args] = text.slice(1).split(' ');
    const cmd = cmdRaw.split('@')[0].toLowerCase();


    if (comandos[cmd]) {
        await comandos[cmd](chatId, args);
    }
});

// --- Express para UptimeRobot ---
const app = express();
app.get('/', (req, res) => res.send('Bot alive!'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
