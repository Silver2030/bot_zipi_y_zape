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

function escapeMarkdownV2(text) {
    return text.replace(/([_\*\[\]\(\)~`>#+\-=|{}.!])/g, '\\$1');
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
    { userId: "686d0bf95841fc53d8fe3e69", mention: "@Flopero" },
    { userId: "686eca28c6f1851a706a304d", mention: "@bt0mas" },
    { userId: "686f9befee16d37c418cd087", mention: "@SilverFRE" },
    { userId: "6876632469f52d5b9c1271d7", mention: "@noSeQuienEsYandro" },
    { userId: "6877c0446097872ea4988815", mention: "@LoganSS021" },
    { userId: "687b345ee6f08f7066aa7aff", mention: "@noSeQuienEsSurpriseMagician" },
    { userId: "68920253cb23029a760fe72a", mention: "@noSeQuienEsBaguchin" },
    { userId: "689cb0d3d52432c932980841", mention: "@noSeQuienEsPotato" },
    { userId: "68b4eb03ff683cdd14acf90b", mention: "@noSeQuienEsMegalomaniaa" },
    { userId: "68b6cff38cb553cbc3f79eec", mention: "@noSeQuienEsMardOuaz" },
    { userId: "68386302a484755f062b16a8", mention: "@GaryRr" },
    { userId: "68703ddf37ff51dd0dc590d0", mention: "@GaryRr" }
];

const guerraMundial1 = [
    { battleId: "68efed40fe26838752f28497", side: "defender"},
    { battleId: "68efee41abec61b8dc799afd", side: "defender"},
    { battleId: "68efee9a98e7755e2edca072", side: "defender"},
    { battleId: "68f09045645874ebe739570f", side: "defender"},
    { battleId: "68f0e3643c18466b083963ce", side: "attacker"},
    { battleId: "68f20597af94346601d21ef9", side: "attacker"},
    { battleId: "68f22fce9f257966ebcfa3c2", side: "attacker"},
    { battleId: "68f363b18159a0ed537801ae", side: "attacker"},
    { battleId: "68f3f6a6a25ce856fa0f5560", side: "attacker"},
    { battleId: "68f4b46ab0106c54a1ea2ae7", side: "attacker"},
    { battleId: "68f5eed122a4934adaf24933", side: "attacker"},
    { battleId: "68f4fdc36d91d9804c07d39e", side: "attacker"},
    { battleId: "68f60312dd4b0abd59dc2866", side: "attacker"},
    { battleId: "68f6b2ea701c3ead28394f8f", side: "defender"},
    { battleId: "68f690e8a321e114eab68c10", side: "defender"},
    { battleId: "68f69714a7f3608cd8e2ca91", side: "defender"},
    { battleId: "68f69500f090bc2fa6b600ab", side: "attacker"},
    { battleId: "68f7bd8c62096761ad1aec29", side: "attacker"},
    { battleId: "68f76b2a06b8db7fa05d134e", side: "attacker"},
    { battleId: "68f7bd321de52f0c8b371e8c", side: "attacker"},
    { battleId: "68f7efb6cddfe69e25581573", side: "defender"},
    { battleId: "68f7797208396b899dcefe2f", side: "attacker"},
    { battleId: "68f892fec8e25cced354623b", side: "attacker"},
    { battleId: "68f9413ac8e25cced3b27a7d", side: "defender"},
    { battleId: "68fa62cac9db35d148f617d1", side: "defender"},
    { battleId: "68faa01db2f23c1a85449598", side: "attacker"},
    { battleId: "68fb582f9f81af5c571c4f35", side: "defender"},
    { battleId: "68fb81281e6dc00c9dbd9d74", side: "defender"},
    { battleId: "68fc42687bc5e95d023e46f0", side: "attacker"},
    { battleId: "68fccc007bc5e95d02581b2d", side: "attacker"},
    { battleId: "68fd106e8831416ea7d761a3", side: "defender"}
]

// --- Comandos del bot ---
const comandos = {
    help: (chatId) => {
        const helpMessage = 
`Comandos disponibles:

/hambre <ENLACE_GUERRA> <MENSAJE>
Menciona a todos los jugadores que tengan un 60% o más de puntos de hambre sin usar. (Muchos pings, no seais imbeciles spameandolo)

/jugadoresPais <ID_PAIS/ENLACE_PAIS>
Muestra las builds de los jugadores de un pais y sus pastillas

/muPastilla <ID_MU/MU> <FILTRO>
Muestra el estado de las pastillas de una mu

/paisesDanyo <ID_PAIS/ENLACE_PAIS> <FILTRO>
Muestra el daño disponible de un pais y el que puede hacer a lo largo de 24h (Sin buffos y son aproximaciones)

/muDanyo <ID_MU/MU> <FILTRO>
Muestra el daño disponible de una mu y el que puede hacer a lo largo de 24h (Sin buffos y son aproximaciones)

/danyosemanal
Muestra el ranking de daño de esta semana de los players registrados

/guerras <GUERRA>
Muestra el daño realizado a lo largo de un conflicto`;
        bot.sendMessage(chatId, helpMessage);
    },
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

        // --- Enviar mensajes por partes ---
        if (menciones.length === 0) {
            bot.sendMessage(chatId, `${urlBattle}\n${mensajeExtra}\n\nNadie necesita comer 🍞`);
            return;
        }

        // Mensaje principal (sin menciones)
        await bot.sendMessage(chatId, `${urlBattle}\n${mensajeExtra}`);

        // Enviar menciones en bloques de 5
        const chunkSize = 5;
        for (let i = 0; i < menciones.length; i += chunkSize) {
            const grupo = menciones.slice(i, i + chunkSize).join('\n');
            await bot.sendMessage(chatId, grupo);
            await new Promise(res => setTimeout(res, 500)); // pequeña pausa para no saturar Telegram
        }
    },
    jugadorespais: async (chatId, args) => {
        if (args.length < 1) {
            bot.sendMessage(chatId, "Ejemplo: /jugadorespais https://app.warera.io/country/6813b6d446e731854c7ac7ae");
            return;
        }

        let countryId = args[0].includes('warera.io') 
            ? args[0].split('/').pop() 
            : args[0];

        const costes = [0,1,3,6,10,15,21,28,36,45,55];
        const skillsPvp = ["health","hunger","attack","criticalChance","criticalDamages","armor","precision","dodge"];
        const skillsEco = ["energy","companies","entrepreneurship","production","lootChance"];

        function escapeMarkdownV2(text) {
            return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
        }

        try {
            const usersRes = await axios.get(`https://api2.warera.io/trpc/user.getUsersByCountry?input=${encodeURIComponent(JSON.stringify({countryId, limit:100}))}`);
            const items = usersRes.data?.result?.data?.items || [];

            const usuarios = [];

            for (const item of items) {
                try {
                    const userRes = await axios.get(`https://api2.warera.io/trpc/user.getUserLite?input=${encodeURIComponent(JSON.stringify({userId:item._id}))}`);
                    const data = userRes.data?.result?.data;
                    if (!data) continue;

                    // Estado pastilla
                    let icono = "";
                    let fecha = null;

                    if (data.buffs?.buffCodes?.length) {
                        icono = "💊";
                        fecha = new Date(data.buffs.buffEndAt);
                    } else if (data.buffs?.debuffCodes?.length) {
                        icono = "⛔";
                        fecha = new Date(data.buffs.debuffEndAt);
                    }

                    // Puntos gastados
                    let pvpPoints = 0, ecoPoints = 0;
                    skillsPvp.forEach(s => pvpPoints += costes[data.skills[s]?.level || 0]);
                    skillsEco.forEach(s => ecoPoints += costes[data.skills[s]?.level || 0]);

                    const total = pvpPoints + ecoPoints;
                    const pctPvp = total ? (pvpPoints / total) * 100 : 0;
                    const pctEco = total ? (ecoPoints / total) * 100 : 0;

                    let build = "HIBRIDA";
                    if (pctPvp > 65) build = "PVP";
                    else if (pctEco > 65) build = "ECO";

                    usuarios.push({
                        username: data.username,
                        _id: data._id,
                        icono,
                        fecha,
                        build
                    });

                } catch (e) { console.error(e.message); }
            }

            // Separación por build
            const pvp = usuarios.filter(u => u.build === "PVP");
            const hibridos = usuarios.filter(u => u.build === "HIBRIDA");
            const eco = usuarios.filter(u => u.build === "ECO");

            // Contadores pastillas
            const disponibles = usuarios.filter(u => u.icono === "").length;
            const activas = usuarios.filter(u => u.icono === "💊").length;
            const debuffs = usuarios.filter(u => u.icono === "⛔").length;

            // Función para formatear cada usuario
            const format = u => {
                let line = `[${escapeMarkdownV2(u.username)}](https://app.warera.io/user/${u._id})`;
                if (u.icono) line += ` ${escapeMarkdownV2(u.icono)}`;
                if (u.fecha) line += ` ${escapeMarkdownV2(u.fecha.toLocaleString('es-ES',{timeZone:'Europe/Madrid'}))}`;
                return line;
            };

            // Construir mensaje completo
            let mensaje = `*${escapeMarkdownV2("PASTILLAS")}*\nDisponibles: ${disponibles}, Activas: ${activas}, Debuff: ${debuffs}\n\n`;

            mensaje += `*${escapeMarkdownV2("PVP")} (${pvp.length})*\n`;
            mensaje += pvp.length ? pvp.map(format).join('\n') : "(ninguno)";
            mensaje += `\n\n`;

            mensaje += `*${escapeMarkdownV2("HIBRIDA")} (${hibridos.length})*\n`;
            mensaje += hibridos.length ? hibridos.map(format).join('\n') : "(ninguno)";
            mensaje += `\n\n`;

            mensaje += `*${escapeMarkdownV2("ECO")} (${eco.length})*\n`;
            mensaje += eco.length ? eco.map(format).join('\n') : "(ninguno)";

            bot.sendMessage(chatId, mensaje, { parse_mode: "MarkdownV2" });

        } catch (error) {
            console.error(error);
            bot.sendMessage(chatId, "Ha ocurrido un error al procesar el comando.");
        }
    },
    mupastilla: async (chatId, args) => {
            if (args.length < 1) {
                bot.sendMessage(chatId, "Ejemplo: /jugadorespais https://app.warera.io/country/683ddd2c24b5a2e114af15d9");
                return;
            }

            let countryId = args[0].includes('warera.io') 
                ? args[0].split('/').pop() 
                : args[0];

            const costes = [0,1,3,6,10,15,21,28,36,45,55];
            const skillsPvp = ["health","hunger","attack","criticalChance","criticalDamages","armor","precision","dodge"];
            const skillsEco = ["energy","companies","entrepreneurship","production","lootChance"];

            try {
                const usersRes = await axios.get(`https://api2.warera.io/trpc/user.getUsersByCountry?input=${encodeURIComponent(JSON.stringify({countryId, limit:100}))}`);
                const items = usersRes.data?.result?.data?.items || [];

                const usuarios = [];

                for (const item of items) {
                    try {
                        const userRes = await axios.get(`https://api2.warera.io/trpc/user.getUserLite?input=${encodeURIComponent(JSON.stringify({userId:item._id}))}`);
                        const data = userRes.data?.result?.data;
                        if (!data) continue;

                        // Estado pastilla
                        let icono = "";
                        let fecha = null;

                        if (data.buffs?.buffCodes?.length) {
                            icono = "💊";
                            fecha = new Date(data.buffs.buffEndAt);
                        } else if (data.buffs?.debuffCodes?.length) {
                            icono = "⛔";
                            fecha = new Date(data.buffs.debuffEndAt);
                        }

                        // Puntos gastados
                        let pvpPoints = 0, ecoPoints = 0;
                        skillsPvp.forEach(s => pvpPoints += costes[data.skills[s]?.level || 0]);
                        skillsEco.forEach(s => ecoPoints += costes[data.skills[s]?.level || 0]);

                        const total = pvpPoints + ecoPoints;
                        const pctPvp = total ? (pvpPoints / total) * 100 : 0;
                        const pctEco = total ? (ecoPoints / total) * 100 : 0;

                        let build = "HIBRIDA";
                        if (pctPvp > 65) build = "PVP";
                        else if (pctEco > 65) build = "ECO";

                        usuarios.push({
                            username: data.username,
                            _id: data._id,
                            icono,
                            fecha,
                            build
                        });

                    } catch (e) { console.error(e.message); }
                }

                // Separación por build
                const pvp = usuarios.filter(u => u.build === "PVP");
                const hibridos = usuarios.filter(u => u.build === "HIBRIDA");
                const eco = usuarios.filter(u => u.build === "ECO");

                // Contadores pastillas
                const disponibles = usuarios.filter(u => u.icono === "").length;
                const activas = usuarios.filter(u => u.icono === "💊").length;
                const debuffs = usuarios.filter(u => u.icono === "⛔").length;

                // Línea usuario con hipervínculo escapando MarkdownV2
                const format = u => {
                    let line = `[${escapeMarkdownV2(u.username)}](https://app.warera.io/user/${u._id})`;
                    if (u.icono) line += ` ${escapeMarkdownV2(u.icono)}`;
                    if (u.fecha) line += ` ${escapeMarkdownV2(u.fecha.toLocaleString('es-ES',{timeZone:'Europe/Madrid'}))}`;
                    return line;
                };

                let mensaje = `*${escapeMarkdownV2("PASTILLAS")}*\nDisponibles: ${disponibles}, Activas: ${activas}, Debuff: ${debuffs}\n\n`;

                mensaje += `*${escapeMarkdownV2("PVP")}* (${pvp.length})\n`;
                mensaje += pvp.length ? pvp.map(format).join('\n') : "(ninguno)";
                mensaje += `\n\n`;

                mensaje += `*${escapeMarkdownV2("HIBRIDA")}* (${hibridos.length})\n`;
                mensaje += hibridos.length ? hibridos.map(format).join('\n') : "(ninguno)";
                mensaje += `\n\n`;

                mensaje += `*${escapeMarkdownV2("ECO")}* (${eco.length})\n`;
                mensaje += eco.length ? eco.map(format).join('\n') : "(ninguno)";

                bot.sendMessage(chatId, mensaje, { parse_mode: "MarkdownV2" });

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
    },
    guerras: async (chatId, args) => {
        if (!args[0]) {
            bot.sendMessage(chatId, "Ejemplo: /guerras primeraMundial");
            return;
        }

        const guerraNombre = args[0].toLowerCase();
        let guerrasSeleccionadas;

        if (guerraNombre === "primeramundial") {
            guerrasSeleccionadas = guerraMundial1;
        } else {
            bot.sendMessage(chatId, "Guerra no reconocida. Guerras disponibles: primeraMundial");
            return;
        }

        const paises = {
            "683ddd2c24b5a2e114af15d9": "MALASYA",
            "683ddd2c24b5a2e114af15cd": "LAOS",
            "6813b6d546e731854c7ac868": "RUSIA"
        };

        const totales = { MALASYA: 0, LAOS: 0, RUSIA: 0 };
        const detalle = [];

        for (const guerra of guerrasSeleccionadas) {
            try {
                // 🔹 Construimos la URL exactamente como la API la requiere
                const inputJson = JSON.stringify({
                    battleId: guerra.battleId,
                    dataType: "damage",
                    type: "country",
                    side: guerra.side
                });

                const url = `https://api2.warera.io/trpc/battleRanking.getRanking?input=${inputJson}`;
                const res = await axios.get(url);

                const rankings = res.data?.result?.data?.rankings || [];

                let resumenBatalla = {
                    battleId: guerra.battleId,
                    link: `https://app.warera.io/battle/${guerra.battleId}`,
                    valores: {}
                };

                for (const r of rankings) {
                    if (paises[r.country]) {
                        totales[paises[r.country]] += r.value;
                        resumenBatalla.valores[paises[r.country]] = r.value;
                    }
                }

                detalle.push(resumenBatalla);

            } catch (e) {
                console.error(`❌ Error en batalla ${guerra.battleId}:`, e.message);
            }
        }

        const totalConjunto = Object.values(totales).reduce((a, b) => a + b, 0);

        let mensaje = `📊 *Resultados de la guerra: ${guerraNombre}*\n\n`;

        mensaje += `🇲🇾 MALASYA: ${totales.MALASYA.toLocaleString('es-ES')}\n`;
        mensaje += `🇱🇦 LAOS: ${totales.LAOS.toLocaleString('es-ES')}\n`;
        mensaje += `🇷🇺 RUSIA: ${totales.RUSIA.toLocaleString('es-ES')}\n`;
        mensaje += `\n🧮 *Total combinado:* ${totalConjunto.toLocaleString('es-ES')}\n\n`;

        mensaje += `📋 *Detalle por batalla:*\n`;
        detalle.forEach((b, i) => {
            mensaje += `\n${i + 1}) ${b.link}\n`;
            for (const [pais, dmg] of Object.entries(b.valores)) {
                mensaje += `   - ${pais}: ${dmg.toLocaleString('es-ES')}\n`;
            }
        });

        bot.sendMessage(chatId, mensaje, { parse_mode: "Markdown" });
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
