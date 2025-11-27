const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');
const XLSX = require('xlsx');

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// --- Configuraciones y constantes ---
const GROUP_ID = -1002840225634;
const GROUP_PRUEBAS_ID = -1003246477704;
const CHAT_ID = 696082291;

const HEAL_FOOD_MAP = { PAN: 10, FILETE: 20, PESCADO: 30 };
const SKILL_COSTS = [0,1,3,6,10,15,21,28,36,45,55];
const PVP_SKILLS = ["health","hunger","attack","criticalChance","criticalDamages","armor","precision","dodge"];
const ECO_SKILLS = ["energy","companies","entrepreneurship","production","lootChance"];

const usuarios = [
    { userId: "686f9befee16d37c418cd087", mention: "@SilverFRE" },
    { userId: "686eefe3ee16d37c417a0e59", mention: "@lodensy" },
    { userId: "683d088a0b5bc553dcd1bf17", mention: "@Xaandree" },
    { userId: "688a5b63449469e970769c28", mention: "@Oresito" },
    { userId: "683f8cd86e3808e6765938f6", mention: "@blitzkriegseven" },
    { userId: "683e13f6a1027da10c805af0", mention: "@Robeloxinthahouse" },
    { userId: "68386302a484755f062b16a8", mention: "@GaryRr" },
    { userId: "68703ddf37ff51dd0dc590d0", mention: "@TowDl" },
    { userId: "6841e93f4503de9d2a49bac2", mention: "@Mikeeeel" },
    { userId: "6849bef474cdd09ff494ddf1", mention: "@YitanRR" },
    { userId: "68f8f5ad5dc34ed689e1784c", mention: "@maromaromero" },
    { userId: "6830b7bdec8d7fb5ea1444a0", mention: "@achtzing" },
    { userId: "683d87d781b2e093d7ef6fbd", mention: "@CarlosMorG" },
    { userId: "68b43bcaa297b1be001db43b", mention: "@Sharp_1313" },
    { userId: "686eca28c6f1851a706a304d", mention: "@bt0mas" },
    { userId: "686bca33b7dc5cb1d7710a47", mention: "@BZ_033" },
    { userId: "6840e2eefb821d5f963e6b36", mention: "@LordWark" },
    { userId: "688e2e05eda4287d4d40f1d9", mention: "@LordWark" },
    { userId: "68fff9bd7c1583c2c84af9c5", mention: "@Savior3444" },
    { userId: "68fff805ce2953e2e62f2032", mention: "@Cruzado_Antifascista" },
    { userId: "68979dcdd2bf43cdb31abb9f", mention: "@XBrotherX" },
    { userId: "683d9c606e2c1b9aa4448f2f", mention: "@ElYodas" },
    { userId: "688fc8522d7fcdd226cda5ee", mention: "@gonchiii1" },
    { userId: "6877c0446097872ea4988815", mention: "@AliceProtectorR" },
    { userId: "68fa132511af9654175f1070", mention: "@SaikoRR" },
    { userId: "686d0bf95841fc53d8fe3e69", mention: "@Flopero" },
    { userId: "6840b9945a2ea3f4a4819680", mention: "@flashmolox" },
    { userId: "684aba6474cdd09ff4bdb1c9", mention: "@kesta_pasando" },
    { userId: "68a090bcae3c1ce846baba17", mention: "@Atero3D" },
    { userId: "683f624fc6294e3b6516c78e", mention: "@JoseManuelMaCa" },
    { userId: "688fd7fe2d7fcdd226d90dbb", mention: "@Dafuju22" },
    { userId: "68a34a08d1c35b2e594c6ea6", mention: "@GosvagRR" },
    { userId: "681ac8c17c71edf800cbef7a", mention: "@KyrosRR" },
    { userId: "682a6a132b76380956602044", mention: "@Dopillo" },
    { userId: "682bba892cae032763110f07", mention: "@redbull001" },
    { userId: "683da442ca51017a7ae9ba9e", mention: "@Valthognir" },
    { userId: "6838b4ab0d8cd8e990e918bf", mention: "@Abyssomniscience" }
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

// --- Funciones de utilidad ---
function escapeMarkdownV2(text) {
    if (typeof text !== 'string') {
        text = String(text);
    }
    return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

function formatNumber(num) {
    return num.toLocaleString('es-ES');
}

function formatNumberMarkdown(num) {
    // Formatear el número y luego escaparlo para MarkdownV2
    const formatted = num.toLocaleString('es-ES');
    return escapeMarkdownV2(formatted);
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// --- API Helpers ---
async function apiCall(endpoint, params) {
    const url = `https://api2.warera.io/trpc/${endpoint}?input=${encodeURIComponent(JSON.stringify(params))}`;
    const response = await axios.get(url);
    return response.data?.result?.data;
}

async function getUserData(userId) {
    return apiCall('user.getUserLite', { userId });
}

async function getCountryUsers(countryId) {
    let allItems = [];
    let nextCursor = null;
    let page = 1;

    do {
        console.log(`📄 Obteniendo página ${page} de usuarios del país...`);
        
        const queryParams = { countryId, limit: 100 };
        if (nextCursor) {
            queryParams.cursor = nextCursor;
            console.log(`🔁 Usando cursor: ${nextCursor}`);
        }

        const usersData = await apiCall('user.getUsersByCountry', queryParams);
        if (usersData?.items) {
            allItems = allItems.concat(usersData.items);
            nextCursor = usersData.nextCursor || null;
            console.log(`✅ Página ${page}: ${usersData.items.length} usuarios, nextCursor: ${nextCursor ? 'Sí' : 'No'}`);
        } else {
            nextCursor = null;
        }

        page++;
        if (nextCursor) await delay(200);

    } while (nextCursor && page < 20); // Límite de seguridad de 20 páginas (2000 usuarios)

    console.log(`📊 Total de usuarios obtenidos del país: ${allItems.length}`);
    return { items: allItems };
}

async function getMUData(muId) {
    return apiCall('mu.getById', { muId });
}

async function getCountryData(countryId) {
    return apiCall('country.getCountryById', { countryId });
}

async function getUserCompanies(userId) {
    return apiCall('company.getCompanies', { userId, perPage: 50 });
}

async function getCompanyData(companyId) {
    return apiCall('company.getById', { companyId });
}

async function getBattleRanking(battleId, dataType, type, side) {
    return apiCall('battleRanking.getRanking', { battleId, dataType, type, side });
}

// --- Función para generar archivo Excel como Buffer ---
function generarExcelBuffer(resultados, nombreGrupo) {
    // Crear un nuevo workbook
    const workbook = XLSX.utils.book_new();
    
    // Preparar los datos para la hoja
    const datos = [
        // Encabezados (9 columnas para coincidir con los datos)
        ['Ranking', 'Name', 'Url', 'Level', 'Companies', 'Wealth', 'Companies Wealth', 'Player Wealth', 'Factory Disabled']
    ];
    
    // Agregar los datos de cada jugador
    resultados.forEach((jugador, index) => {
        datos.push([
            index + 1,
            jugador.username,
            `https://app.warera.io/user/${jugador.userId}`,
            jugador.level || 'N/A',
            jugador.factoryCount,
            jugador.totalWealth,
            jugador.factoryWealth,
            jugador.liquidWealth,
            jugador.hasDisabledFactories ? 'Yes' : 'No'
        ]);
    });
    
    // Crear la hoja de cálculo
    const worksheet = XLSX.utils.aoa_to_sheet(datos);
    
    // Aplicar estilos con la aproximación de xlsx
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    
    // Colores en formato hexadecimal
    const headerColor = { rgb: "4F81BD" }; // Azul
    const evenRowColor = { rgb: "DCE6F1" }; // Azul claro
    const oddRowColor = { rgb: "F2F2F2" };  // Gris claro
    
    for (let R = range.s.r; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
            const cell_address = { c: C, r: R };
            const cell_ref = XLSX.utils.encode_cell(cell_address);
            
            if (!worksheet[cell_ref]) continue;
            
            // Inicializar estilo si no existe
            if (!worksheet[cell_ref].s) {
                worksheet[cell_ref].s = {};
            }
            
            // Aplicar colores según la fila
            if (R === 0) {
                // Encabezados - azul
                worksheet[cell_ref].s.fill = { fgColor: headerColor };
                worksheet[cell_ref].s.font = { bold: true, color: { rgb: "FFFFFF" } };
            } else {
                // Filas de datos - colores alternos
                if (R % 2 === 0) {
                    // Filas pares - azul claro
                    worksheet[cell_ref].s.fill = { fgColor: evenRowColor };
                } else {
                    // Filas impares - gris claro
                    worksheet[cell_ref].s.fill = { fgColor: oddRowColor };
                }
            }
            
            // Aplicar bordes básicos
            worksheet[cell_ref].s.border = {
                top: { style: "thin", color: { rgb: "000000" } },
                left: { style: "thin", color: { rgb: "000000" } },
                bottom: { style: "thin", color: { rgb: "000000" } },
                right: { style: "thin", color: { rgb: "000000" } }
            };
            
            // ALINEACIÓN CENTRADA PARA TODAS LAS CELDAS
            worksheet[cell_ref].s.alignment = { 
                horizontal: "center", 
                vertical: "center" 
            };
        }
    }
    
    // Ajustar anchos de columnas (9 columnas)
    const colWidths = [
        { wch: 10 },  // Ranking
        { wch: 20 },  // Name
        { wch: 40 },  // Url
        { wch: 8 },   // Level
        { wch: 12 },  // Companies
        { wch: 15 },  // Wealth
        { wch: 18 },  // Companies Wealth
        { wch: 15 },  // Player Wealth
        { wch: 15 }   // Factory Disabled
    ];
    
    worksheet['!cols'] = colWidths;
    
    // Agregar filtros automáticos (9 columnas A-I)
    worksheet['!autofilter'] = { ref: "A1:I1" };
    
    // Agregar la hoja al workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');
    
    // Opciones de escritura para mejor compatibilidad
    const excelBuffer = XLSX.write(workbook, { 
        type: 'buffer', 
        bookType: 'xlsx',
        bookSST: false,
        compression: false,
        cellStyles: true
    });
    
    return excelBuffer;
}

// --- Núcleo de cálculo de daño ---
function calcularDanyo(userData, healFood) {
    const skills = userData.skills;
    const atk = skills.attack?.total || 0;
    const critChance = (skills.criticalChance?.total || 0) / 100;
    const critDmg = (skills.criticalDamages?.total || 0) / 100;
    const precision = (skills.precision?.total || 0) / 100;
    const armor = Math.min((skills.armor?.total || 0) / 100, 0.9);
    const dodge = (skills.dodge?.total || 0) / 100;

    const hpNow = (skills.health?.currentBarValue || 0) + Math.floor(skills.hunger?.currentBarValue || 0) * healFood;
    const hpRegen24h = skills.health?.total * 0.1 * 24;
    const hungerRegen24h = Math.floor(skills.hunger?.total * 0.1 * 24) * healFood;
    const hp24h = hpRegen24h + hungerRegen24h;

    function simularCombate(hpTotal) {
        const simulaciones = 10000;
        let totalDanyo = 0;

        for (let i = 0; i < simulaciones; i++) {
            let hp = hpTotal;
            let dmg = 0;
            let comidaRestante = Math.floor(skills.hunger?.currentBarValue || 0);

            while (hp >= 10) {
                let baseDmg = atk;
                if (Math.random() < critChance) baseDmg *= (1 + critDmg);
                if (Math.random() >= precision) baseDmg *= 0.5;
                
                dmg += baseDmg;

                const esquiva = Math.random() < dodge;
                if (!esquiva) {
                    let damageTaken = 10 * (1 - armor);
                    damageTaken = Math.max(1, damageTaken);
                    if (hp <= damageTaken) break;
                    hp -= damageTaken;
                }

                while (hp < 10 && comidaRestante > 0) {
                    hp += healFood;
                    comidaRestante -= 1;
                }

                if (hp < 10) break;
            }
            totalDanyo += dmg;
        }
        return totalDanyo / simulaciones;
    }

    return {
        danyoActual: simularCombate(hpNow),
        danyo24h: simularCombate(hp24h)
    };
}

// --- Análisis de builds ---
function analizarBuild(userData) {
    let pvpPoints = 0, ecoPoints = 0;
    
    PVP_SKILLS.forEach(skill => pvpPoints += SKILL_COSTS[userData.skills[skill]?.level || 0]);
    ECO_SKILLS.forEach(skill => ecoPoints += SKILL_COSTS[userData.skills[skill]?.level || 0]);

    const total = pvpPoints + ecoPoints;
    const pctPvp = total ? (pvpPoints / total) * 100 : 0;

    let build = "HIBRIDA";
    if (pctPvp > 65) build = "PVP";
    else if (pctPvp < 35) build = "ECO";

    return { build, nivel: userData.leveling?.level || 0 };
}

function obtenerEstadoPastilla(userData) {
    const buffs = userData.buffs;
    if (buffs?.buffCodes?.length) {
        return { icono: "💊", fecha: new Date(buffs.buffEndAt) };
    }
    if (buffs?.debuffCodes?.length) {
        return { icono: "⛔", fecha: new Date(buffs.debuffEndAt) };
    }
    return { icono: "", fecha: null };
}

// --- Procesamiento de grupos ---
async function procesarGrupoDanyo(chatId, args, tipo) {
    if (args.length < 2) {
        const ejemplo = tipo === 'pais' 
            ? "/paisesDanyo https://app.warera.io/country/683ddd2c24b5a2e114af15d9 PESCADO"
            : "/muDanyo https://app.warera.io/mu/687cbb53fae4c9cf04340e77 PESCADO";
        bot.sendMessage(chatId, `Ejemplo: ${ejemplo}`,{ 
            parse_mode: "Markdown",
            disable_web_page_preview: true 
        });
        return;
    }

    const id = args[0].split('/').pop();
    const comida = args[1].toUpperCase();
    const healFood = HEAL_FOOD_MAP[comida];

    if (!healFood) {
        bot.sendMessage(chatId, "Comida inválida. Usa PAN, FILETE o PESCADO.");
        return;
    }

    try {
        let items = [];
        
        if (tipo === 'pais') {
            const countryData = await getCountryUsers(id);
            items = countryData?.items || [];
        } else {
            const muData = await getMUData(id);
            if (!muData?.members?.length) {
                bot.sendMessage(chatId, "No se encontraron miembros en esa MU.");
                return;
            }
            items = muData.members.map(userId => ({ _id: userId }));
        }

        // Mensaje de progreso
        const progressMsg = await bot.sendMessage(chatId, `⚙️ Procesando ${items.length} jugadores...`);

        const resultados = [];
        let totalActual = 0;
        let total24h = 0;

        for (const [index, item] of items.entries()) {
            try {
                const userData = await getUserData(item._id);
                if (!userData) continue;

                const { danyoActual, danyo24h } = calcularDanyo(userData, healFood);
                totalActual += danyoActual;
                total24h += danyo24h;

                resultados.push({
                    username: userData.username,
                    userId: userData._id,
                    danyoActual,
                    danyo24h
                });

                // Actualizar progreso cada 10 jugadores
                if (index % 10 === 0) {
                    await bot.editMessageText(`⚙️ Procesando ${index + 1}/${items.length} jugadores...`, {
                        chat_id: chatId,
                        message_id: progressMsg.message_id
                    });
                }
            } catch (error) {
                console.error(`Error usuario ${item._id}:`, error.message);
            }
        }

        // Eliminar mensaje de progreso
        await bot.deleteMessage(chatId, progressMsg.message_id);

        resultados.sort((a, b) => b.danyoActual - a.danyoActual);

        // Mensaje principal MUY resumido
        const mensajeResumen = [
            `🏛️ ${tipo === 'pais' ? 'País' : 'MU'}: https://app.warera.io/${tipo}/${id}`,
            `🍖 Comida: ${comida}`,
            `⚔️ Daño disponible: ${Math.round(totalActual).toLocaleString('es-ES')}`,
            `🕐 Daño 24h: ${Math.round(total24h).toLocaleString('es-ES')}`,
            `👥 Jugadores: ${resultados.length}`
        ].join('\n');

        await bot.sendMessage(chatId, mensajeResumen);

        // Dividir en chunks más pequeños para evitar límite
        const chunkSize = 10; // Reducido a 8 por mensaje
        for (let i = 0; i < resultados.length; i += chunkSize) {
            const chunk = resultados.slice(i, i + chunkSize);
            
            const mensajeChunk = chunk.map((u, index) => {
                const globalIndex = i + index + 1;
                return `${globalIndex}. ${u.username}: ${Math.round(u.danyoActual).toLocaleString('es-ES')} (24h: ${Math.round(u.danyo24h).toLocaleString('es-ES')})`;
            }).join('\n');

            const header = `📊 Jugadores ${i + 1}-${Math.min(i + chunkSize, resultados.length)}:\n\n`;
            
            await bot.sendMessage(chatId, header + mensajeChunk);
            await delay(300); // Pequeña pausa entre mensajes
        }

    } catch (error) {
        console.error(error);
        bot.sendMessage(chatId, "Error al procesar el comando.");
    }
}

async function procesarJugadoresGrupo(chatId, args, tipo) {
    if (args.length < 1) {
        const ejemplo = tipo === 'pais' 
            ? "/jugadoresPais https://app.warera.io/country/6813b6d446e731854c7ac7ae"
            : "/jugadoresMu https://app.warera.io/mu/687cbb53fae4c9cf04340e77";
        bot.sendMessage(chatId, `Ejemplo: ${ejemplo}`,{ 
            parse_mode: "Markdown",
            disable_web_page_preview: true 
        });
        return;
    }

    const id = args[0].split('/').pop();
    
    try {
        let items = [];
        let nombreGrupo = "Sin nombre";
        let grupoUrl = `https://app.warera.io/${tipo}/${id}`;

        if (tipo === 'pais') {
            const countryData = await getCountryUsers(id);
            items = countryData?.items || [];
            
            try {
                const countryInfo = await getCountryData(id);
                nombreGrupo = countryInfo?.name || "País Desconocido";
            } catch (error) {
                console.error(`No se pudo obtener nombre del país ${id}:`, error.message);
                nombreGrupo = "País Desconocido";
            }
        } else {
            const muData = await getMUData(id);
            if (!muData?.members?.length) {
                bot.sendMessage(chatId, "No se encontraron miembros en esa MU.");
                return;
            }
            items = muData.members.map(userId => ({ _id: userId }));
            nombreGrupo = muData.name || "MU Sin nombre";
        }
        

        if (items.length === 0) {
            bot.sendMessage(chatId, `No se encontraron jugadores en el ${tipo === 'pais' ? 'país' : 'MU'} especificado.`);
            return;
        }

        // Mensaje de progreso (sin Markdown para evitar problemas)
        const progressMsg = await bot.sendMessage(chatId, `📊 Procesando ${items.length} jugadores...`);

        const usuarios = [];

        for (const [index, item] of items.entries()) {
            try {
                const userData = await getUserData(item._id);
                if (!userData) continue;

                const { build, nivel } = analizarBuild(userData);
                const { icono, fecha } = obtenerEstadoPastilla(userData);

                usuarios.push({
                    username: userData.username,
                    _id: userData._id,
                    icono,
                    fecha,
                    build,
                    nivel
                });

                // Actualizar progreso cada 20 jugadores
                if (index % 20 === 0) {
                    await bot.editMessageText(`📊 Procesando ${index + 1}/${items.length} jugadores...`, {
                        chat_id: chatId,
                        message_id: progressMsg.message_id
                    });
                }
            } catch (error) {
                console.error(`Error procesando usuario ${item._id}:`, error.message);
            }
        }

        // Eliminar mensaje de progreso
        await bot.deleteMessage(chatId, progressMsg.message_id);

        if (usuarios.length === 0) {
            bot.sendMessage(chatId, "No se pudieron procesar los datos de ningún jugador.");
            return;
        }

        const pvp = usuarios.filter(u => u.build === "PVP").sort((a, b) => b.nivel - a.nivel);
        const hibridos = usuarios.filter(u => u.build === "HIBRIDA").sort((a, b) => b.nivel - a.nivel);
        const eco = usuarios.filter(u => u.build === "ECO").sort((a, b) => b.nivel - a.nivel);

        const disponibles = usuarios.filter(u => u.icono === "").length;
        const activas = usuarios.filter(u => u.icono === "💊").length;
        const debuffs = usuarios.filter(u => u.icono === "⛔").length;

        // Función para dividir arrays en chunks
        function dividirEnChunks(array, chunkSize) {
            const chunks = [];
            for (let i = 0; i < array.length; i += chunkSize) {
                chunks.push(array.slice(i, i + chunkSize));
            }
            return chunks;
        }
        
        // Mensaje de resumen inicial CON Markdown
        const mensajeResumen = [
            `🏛️ ${tipo === 'pais' ? 'PAÍS' : 'MU'}: [${nombreGrupo}](${grupoUrl})`,
            `💊 Pastillas disponibles: ${disponibles}`,
            `💊 Pastillas activas: ${activas}`,
            `⛔ Debuffs: ${debuffs}`,
            `👥 Total jugadores: ${usuarios.length}`,
            `⚔️ PVP: ${pvp.length} | 🎯 Híbridos: ${hibridos.length} | 💰 ECO: ${eco.length}`
        ].join('\n');

        await bot.sendMessage(chatId, mensajeResumen, { 
            parse_mode: "Markdown",
            disable_web_page_preview: true 
        });
        await delay(500);

        // Función para formatear usuario - VERSIÓN SIMPLIFICADA
        const formatUsuarioSimple = u => {
            let line = `${u.nivel}) [${u.username}](https://app.warera.io/user/${u._id})`;
            if (u.icono) line += ` ${u.icono}`;
            if (u.fecha) line += ` ${u.fecha.toLocaleString('es-ES',{timeZone:'Europe/Madrid'})}`;
            return line;
        };

        // Enviar PVP en chunks si hay muchos
        if (pvp.length > 0) {
            const pvpChunks = dividirEnChunks(pvp, 50);
            for (let i = 0; i < pvpChunks.length; i++) {
                const chunk = pvpChunks[i];
                let mensajePVP = `⚔️ PVP - Parte ${i + 1}/${pvpChunks.length}:\n\n`;
                mensajePVP += chunk.map(formatUsuarioSimple).join('\n');
                await bot.sendMessage(chatId, mensajePVP, { 
                    parse_mode: "Markdown",
                    disable_web_page_preview: true 
                });
                await delay(300);
            }
        }

        // Enviar Híbridos en chunks si hay muchos
        if (hibridos.length > 0) {
            const hibridosChunks = dividirEnChunks(hibridos, 50);
            for (let i = 0; i < hibridosChunks.length; i++) {
                const chunk = hibridosChunks[i];
                let mensajeHibridos = `🎯 HIBRIDA - Parte ${i + 1}/${hibridosChunks.length}:\n\n`;
                mensajeHibridos += chunk.map(formatUsuarioSimple).join('\n');
                await bot.sendMessage(chatId, mensajeHibridos, { 
                    parse_mode: "Markdown",
                    disable_web_page_preview: true 
                });
                await delay(300);
            }
        }

        // Enviar ECO en chunks si hay muchos
        if (eco.length > 0) {
            const ecoChunks = dividirEnChunks(eco, 50);
            for (let i = 0; i < ecoChunks.length; i++) {
                const chunk = ecoChunks[i];
                let mensajeECO = `💰 ECO - Parte ${i + 1}/${ecoChunks.length}:\n\n`;
                mensajeECO += chunk.map(formatUsuarioSimple).join('\n');
                await bot.sendMessage(chatId, mensajeECO, { 
                    parse_mode: "Markdown",
                    disable_web_page_preview: true 
                });
                await delay(300);
            }
        }

        // Mensaje final si no hay jugadores en alguna categoría (sin Markdown)
        const categoriasVacias = [];
        if (pvp.length === 0) categoriasVacias.push("PVP");
        if (hibridos.length === 0) categoriasVacias.push("Híbridos");
        if (eco.length === 0) categoriasVacias.push("ECO");

        if (categoriasVacias.length > 0) {
            await bot.sendMessage(chatId, `📝 Categorías vacías: ${categoriasVacias.join(', ')}`);
        }

    } catch (error) {
        console.error(`Error en procesarJugadoresGrupo:`, error);
        bot.sendMessage(chatId, "Error al procesar el comando.");
    }
}

async function procesarDineroGrupo(chatId, args, tipo) {
    if (args.length < 1) {
        const ejemplo = tipo === 'pais' 
            ? "/dineropais https://app.warera.io/country/6813b6d446e731854c7ac7ae"
            : "/dineromu https://app.warera.io/mu/687cbb53fae4c9cf04340e77";
        bot.sendMessage(chatId, `Ejemplo: ${ejemplo}`,{ 
            parse_mode: "Markdown",
            disable_web_page_preview: true 
        });
        return;
    }

    const id = args[0].split('/').pop();
    
    try {
        let items = [];
        let nombreGrupo = "Sin nombre";
        let grupoUrl = `https://app.warera.io/${tipo}/${id}`;

        if (tipo === 'pais') {
            const countryData = await getCountryUsers(id);
            items = countryData?.items || [];
            
            try {
                const countryInfo = await getCountryData(id);
                nombreGrupo = countryInfo?.name || "País Desconocido";
            } catch (error) {
                console.error(`No se pudo obtener nombre del país ${id}:`, error.message);
                nombreGrupo = "País Desconocido";
            }
        } else {
            const muData = await getMUData(id);
            if (!muData?.members?.length) {
                bot.sendMessage(chatId, "No se encontraron miembros en esa MU.");
                return;
            }
            items = muData.members.map(userId => ({ _id: userId }));
            nombreGrupo = muData.name || "MU Sin nombre";
        }

        if (items.length === 0) {
            bot.sendMessage(chatId, `No se encontraron jugadores en el ${tipo === 'pais' ? 'país' : 'MU'} especificado.`);
            return;
        }

        // Mensaje de progreso
        const progressMsg = await bot.sendMessage(chatId, `💰 Procesando ${items.length} jugadores...`);

        const resultados = [];
        let totalWealth = 0;
        let totalFactoryWealth = 0;
        let totalLiquidWealth = 0;
        let totalFactories = 0;

        for (const [index, item] of items.entries()) {
            try {
                const userData = await getUserData(item._id);
                if (!userData) continue;

                let totalWealthValue = userData.rankings?.userWealth?.value || 0;
                let factoryWealth = 0;
                let factoryCount = 0;
                let disabledFactoryWealth = 0;

                try {
                    const companiesData = await getUserCompanies(item._id);
                    const companyIds = companiesData?.items || [];

                    for (const companyId of companyIds) {
                        try {
                            const companyData = await getCompanyData(companyId);
                            if (companyData?.estimatedValue) {
                                if (companyData.disabledAt) {
                                    disabledFactoryWealth += companyData.estimatedValue;
                                }
                                factoryWealth += companyData.estimatedValue;
                                factoryCount++;
                            }
                        } catch (error) {
                            console.error(`Error fábrica ${companyId}:`, error.message);
                        }
                    }

                    if (disabledFactoryWealth > 0) {
                        totalWealthValue += disabledFactoryWealth;
                    }
                } catch (error) {
                    console.error(`Error fábricas usuario ${item._id}:`, error.message);
                }

                const liquidWealth = totalWealthValue - factoryWealth;

                resultados.push({
                    username: userData.username,
                    userId: item._id,
                    level: userData.leveling?.level || 0, // <-- AGREGAR ESTA LÍNEA
                    totalWealth: totalWealthValue,
                    factoryWealth,
                    liquidWealth,
                    factoryCount,
                    hasDisabledFactories: disabledFactoryWealth > 0
                });

                totalWealth += totalWealthValue;
                totalFactoryWealth += factoryWealth;
                totalLiquidWealth += liquidWealth;
                totalFactories += factoryCount;

                // Actualizar progreso cada 10 usuarios
                if (index % 10 === 0) {
                    await bot.editMessageText(`💰 Procesando ${index + 1}/${items.length} jugadores...`, {
                        chat_id: chatId,
                        message_id: progressMsg.message_id
                    });
                }

            } catch (error) {
                console.error(`Error procesando usuario ${item._id}:`, error.message);
            }
        }

        // Eliminar mensaje de progreso
        await bot.deleteMessage(chatId, progressMsg.message_id);

        if (resultados.length === 0) {
            bot.sendMessage(chatId, "No se pudieron obtener datos.");
            return;
        }

        const playerCount = resultados.length;
        const avgWealth = totalWealth / playerCount;
        const avgFactoryWealth = totalFactoryWealth / playerCount;
        const avgLiquidWealth = totalLiquidWealth / playerCount;
        const avgFactories = totalFactories / playerCount;

        resultados.sort((a, b) => b.totalWealth - a.totalWealth);

        // Mensaje principal
        let mensajePrincipal = `💰 *DINERO DE [${escapeMarkdownV2(nombreGrupo)}](${escapeMarkdownV2(grupoUrl)})*\n\n`;
        mensajePrincipal += `*Estadísticas Generales:*\n`;
        mensajePrincipal += `👥 Jugadores: ${playerCount}\n`;
        mensajePrincipal += `💰 Wealth total: ${formatNumberMarkdown(totalWealth)} monedas\n`;
        mensajePrincipal += `🏭 Wealth Fábricas: ${formatNumberMarkdown(totalFactoryWealth)} monedas\n`;
        mensajePrincipal += `💵 Dinero/Almacen: ${formatNumberMarkdown(totalLiquidWealth)} monedas\n`;
        mensajePrincipal += `🔧 Nº fábricas: ${totalFactories}\n\n`;
        mensajePrincipal += `*Promedios por Jugador:*\n`;
        mensajePrincipal += `💰 Wealth: ${formatNumberMarkdown(avgWealth)} monedas\n`;
        mensajePrincipal += `🏭 Wealth Fábricas: ${formatNumberMarkdown(avgFactoryWealth)} monedas\n`;
        mensajePrincipal += `💵 Dinero/Almacen: ${formatNumberMarkdown(avgLiquidWealth)} monedas\n`;
        mensajePrincipal += `🔧 Nº fábricas: ${escapeMarkdownV2(avgFactories.toFixed(1))}`;

        await bot.sendMessage(chatId, mensajePrincipal, { 
            parse_mode: "MarkdownV2",
            disable_web_page_preview: true 
        });

        // Generar y enviar archivo Excel
        try {
            const progressExcelMsg = await bot.sendMessage(chatId, `📊 Generando archivo Excel...`);
            
            const excelBuffer = generarExcelBuffer(resultados, nombreGrupo);
            const nombreArchivo = `dinero_${tipo}_${nombreGrupo.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.xlsx`;
            
            // Enviar el archivo Excel
            await bot.sendDocument(chatId, excelBuffer, {}, {
                filename: nombreArchivo,
                contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            
            // Eliminar mensaje de progreso del Excel
            await bot.deleteMessage(chatId, progressExcelMsg.message_id);
            
        } catch (error) {
            console.error('Error generando Excel:', error);
            await bot.sendMessage(chatId, '⚠️ No se pudo generar el archivo Excel, pero aquí están los datos:');
        }

        // Enviar lista de jugadores en chunks (opcional - puedes quitarlo si prefieres solo el Excel)
        const chunkSize = 10;
        for (let i = 0; i < resultados.length; i += chunkSize) {
            const chunk = resultados.slice(i, i + chunkSize);
            let mensajeChunk = `*Jugadores ${i + 1}\\-${Math.min(i + chunkSize, resultados.length)}:*\n\n`;
            
            chunk.forEach((jugador, index) => {
                const globalIndex = i + index + 1;
                const usernameEscapado = escapeMarkdownV2(jugador.username);
                const userIdEscapado = escapeMarkdownV2(jugador.userId);
                
                mensajeChunk += `${globalIndex}\\) ${usernameEscapado}`;
                if (jugador.hasDisabledFactories) mensajeChunk += ` ⚠️`;
                mensajeChunk += `\nhttps://app\\.warera\\.io/user/${userIdEscapado}\n`;
                mensajeChunk += `💰 Wealth: ${formatNumberMarkdown(jugador.totalWealth)} \\| `;
                mensajeChunk += `🏭 Fábricas: ${formatNumberMarkdown(jugador.factoryWealth)}\n`;
                mensajeChunk += `💵 Dinero/Almacen: ${formatNumberMarkdown(jugador.liquidWealth)} \\| `;
                mensajeChunk += `🔧 ${jugador.factoryCount} fábricas\n\n`;
            });

            await bot.sendMessage(chatId, mensajeChunk, { 
                parse_mode: "MarkdownV2",
                disable_web_page_preview: true 
            });
            await delay(500);
        }

    } catch (error) {
        console.error(`Error en procesarDineroGrupo (${tipo}):`, error);
        bot.sendMessage(chatId, "Error al procesar el comando.");
    }
}
 
// --- Comandos ---
const comandos = {
    help: (chatId) => {
        const mensaje = `Comandos disponibles:

/buscar <TEXTO> - Busca enlaces en el juego
/hambre <ENLACE_GUERRA> <MENSAJE> - Menciona jugadores con hambre
/jugadoresPais <ID_PAIS> - Builds y pastillas del país
/jugadoresMu <ID_MU> - Builds y pastillas de la MU
/paisesDanyo <ID_PAIS> <COMIDA> - Daño disponible del país
/muDanyo <ID_MU> <COMIDA> - Daño disponible de la MU
/dineropais <ID_PAIS> - Riqueza del país
/dineromu <ID_MU> - Riqueza de la MU
/danyosemanal - Ranking de daño semanal
/guerras <GUERRA> - Daño en conflictos
/all - Menciona al grupo
/produccion - Ranking productivo`;
        bot.sendMessage(chatId, mensaje);
    },

    buscar: async (chatId, args) => {
        if (args.length < 1) {
            bot.sendMessage(chatId, "Ejemplo: /buscar Silver");
            return;
        }

        const searchText = args.join(' ');
        
        try {
            const searchData = await apiCall('search.searchAnything', { searchText });
            
            if (!searchData?.hasData) {
                bot.sendMessage(chatId, `No hay resultados para: "${searchText}"`);
                return;
            }

            let mensaje = `*Resultados para:* ${escapeMarkdownV2(searchText)}\n\n`;
            
            // Función para obtener datos con manejo de errores
            const obtenerDatosConNombre = async (ids, tipo) => {
                const resultados = [];
                
                for (const id of ids) {
                    try {
                        let nombre, url;
                        
                        switch (tipo) {
                            case 'user':
                                const userData = await getUserData(id);
                                nombre = userData?.username || "Usuario Desconocido";
                                url = `https://app.warera.io/user/${id}`;
                                break;
                            case 'country':
                                const countryData = await getCountryData(id);
                                nombre = countryData?.name || "País Desconocido";
                                url = `https://app.warera.io/country/${id}`;
                                break;
                            case 'mu':
                                const muData = await getMUData(id);
                                nombre = muData?.name || "MU Desconocida";
                                url = `https://app.warera.io/mu/${id}`;
                                break;
                            case 'region':
                                const regionData = await apiCall('region.getById', { regionId: id });
                                nombre = regionData?.name || "Región Desconocida";
                                url = `https://app.warera.io/region/${id}`;
                                break;
                        }
                        
                        if (nombre && url) {
                            resultados.push({ nombre, url, id });
                        }
                    } catch (error) {
                        console.error(`Error obteniendo datos de ${tipo} ${id}:`, error.message);
                        // En caso de error, mostrar solo el ID
                        resultados.push({ 
                            nombre: `${tipo.charAt(0).toUpperCase() + tipo.slice(1)} ${id}`, 
                            url: `https://app.warera.io/${tipo}/${id}`,
                            id 
                        });
                    }
                    
                    // Pequeña pausa para no saturar la API
                    await delay(100);
                }
                
                return resultados;
            };

            const categorias = [
                { 
                    key: 'userIds', 
                    nombre: '👤 Usuarios', 
                    tipo: 'user',
                    datos: []
                },
                { 
                    key: 'muIds', 
                    nombre: '🏢 MUs', 
                    tipo: 'mu',
                    datos: []
                },
                { 
                    key: 'countryIds', 
                    nombre: '🇺🇳 Países', 
                    tipo: 'country',
                    datos: []
                },
                { 
                    key: 'regionIds', 
                    nombre: '🗺️ Regiones', 
                    tipo: 'region',
                    datos: []
                }
            ];

            // Obtener datos para cada categoría que tenga resultados
            for (const categoria of categorias) {
                if (searchData[categoria.key]?.length) {
                    console.log(`Obteniendo datos para ${categoria.nombre}...`);
                    categoria.datos = await obtenerDatosConNombre(searchData[categoria.key], categoria.tipo);
                }
            }

            // Construir mensaje con los datos obtenidos
            categorias.forEach(({ nombre, datos }) => {
                if (datos.length > 0) {
                    mensaje += `*${nombre}*\n`;
                    datos.forEach(item => {
                        const nombreEscapado = escapeMarkdownV2(item.nombre);
                        const urlEscapada = escapeMarkdownV2(item.url);
                        const idEscapado = escapeMarkdownV2(item.id);
                        
                        mensaje += `[${nombreEscapado}](${urlEscapada}) \\- ${idEscapado}\n`;
                    });
                    mensaje += `\n`;
                }
            });

            await bot.sendMessage(chatId, mensaje, { 
                parse_mode: "MarkdownV2",
                disable_web_page_preview: true 
            });

        } catch (error) {
            console.error("Error en /buscar:", error);
            bot.sendMessage(chatId, "Error en la búsqueda.");
        }
    },

    hambre: async (chatId, args) => {
        if (!args[0] || !args[1]) {
            bot.sendMessage(chatId, "Ejemplo: /hambre https://app.warera.io/battle/68c5efa7d9737c88a4da826c DEFENDEMOS CON TODO",{ 
                parse_mode: "Markdown",
                disable_web_page_preview: true 
            });
            return;
        }

        const urlBattle = args[0];
        const mensajeExtra = args.slice(1).join(' ');
        const menciones = [];

        for (const usuario of usuarios) {
            try {
                const userData = await getUserData(usuario.userId);
                if (!userData) continue;

                const debuffs = userData.buffs?.debuffCodes || [];
                if (debuffs.includes("cocain")) continue;

                const hunger = userData.skills?.hunger;
                if (hunger && hunger.currentBarValue >= 0.3 * hunger.total) {
                    menciones.push(`${usuario.mention} (${userData.username})`);
                }
            } catch (error) {
                console.error(`Error con usuario ${usuario.userId}:`, error.message);
            }
        }

        if (menciones.length === 0) {
            bot.sendMessage(chatId, `${urlBattle}\n${mensajeExtra}\n\nNadie necesita comer 🍞`);
            return;
        }

        await bot.sendMessage(chatId, `${urlBattle}\n${mensajeExtra}`);

        const chunkSize = 5;
        for (let i = 0; i < menciones.length; i += chunkSize) {
            const grupo = menciones.slice(i, i + chunkSize).join('\n');
            await bot.sendMessage(chatId, grupo);
            await delay(500);
        }
    },

    jugadorespais: async (chatId, args) => {
        procesarJugadoresGrupo(chatId, args, 'pais');
    },

    jugadoresmu: async (chatId, args) => {
        procesarJugadoresGrupo(chatId, args, 'mu');
    },

    paisesdanyo: async (chatId, args) => {
        procesarGrupoDanyo(chatId, args, 'pais');
    },

    mudanyo: async (chatId, args) => {
        procesarGrupoDanyo(chatId, args, 'mu');
    },

    danyosemanal: async (chatId) => {
        try {
            const resultados = [];

            for (const usuario of usuarios) {
                try {
                    const userData = await getUserData(usuario.userId);
                    if (!userData) continue;

                    const weeklyDamage = userData.rankings?.weeklyUserDamages?.value ?? 0;
                    resultados.push({ 
                        username: userData.username, 
                        weeklyDamage 
                    });
                } catch (error) {
                    console.error(`Error con usuario ${usuario.userId}:`, error.message);
                }
            }

            if (resultados.length === 0) {
                bot.sendMessage(chatId, "No se pudo obtener el daño semanal.");
                return;
            }

            resultados.sort((a, b) => b.weeklyDamage - a.weeklyDamage);
            const totalDamage = resultados.reduce((sum, r) => sum + r.weeklyDamage, 0);
            const media = Math.round(totalDamage / resultados.length);

            const lista = resultados
                .map((r, i) => `${i + 1}) ${r.username}: ${formatNumber(r.weeklyDamage)}`)
                .join('\n');

            const mensajeFinal = `Daño semanal:\n\n${lista}\n\nMedia de daño: ${formatNumber(media)}`;
            bot.sendMessage(chatId, mensajeFinal);
        } catch (error) {
            console.error("Error en /danyoSemanal:", error);
            bot.sendMessage(chatId, "Error al obtener daños semanales.");
        }
    },

    all: async (chatId) => {
        try {
            const mencionesUnicas = [...new Set(usuarios.map(usuario => usuario.mention))];
            
            if (mencionesUnicas.length === 0) {
                bot.sendMessage(chatId, "No hay usuarios para mencionar.");
                return;
            }

            const chunkSize = 5;
            for (let i = 0; i < mencionesUnicas.length; i += chunkSize) {
                const grupo = mencionesUnicas.slice(i, i + chunkSize).join('\n');
                await bot.sendMessage(chatId, grupo);
                if (i + chunkSize < mencionesUnicas.length) await delay(300);
            }
        } catch (error) {
            console.error("Error en /all:", error);
            bot.sendMessage(chatId, "Error al enviar menciones.");
        }
    },

    dineropais: async (chatId, args) => {
        procesarDineroGrupo(chatId, args, 'pais');
    },

    dineromu: async (chatId, args) => {
        procesarDineroGrupo(chatId, args, 'mu');
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
                const rankings = await getBattleRanking(
                    guerra.battleId, 
                    "damage", 
                    "country", 
                    guerra.side
                );

                let resumenBatalla = {
                    battleId: guerra.battleId,
                    link: `https://app.warera.io/battle/${guerra.battleId}`,
                    valores: {}
                };

                for (const r of rankings || []) {
                    if (paises[r.country]) {
                        totales[paises[r.country]] += r.value;
                        resumenBatalla.valores[paises[r.country]] = r.value;
                    }
                }

                detalle.push(resumenBatalla);

            } catch (error) {
                console.error(`Error en batalla ${guerra.battleId}:`, error.message);
            }
        }

        const totalConjunto = Object.values(totales).reduce((a, b) => a + b, 0);

        let mensaje = `📊 *Resultados de la guerra: ${guerraNombre}*\n\n`;
        mensaje += `🇲🇾 MALASYA: ${formatNumber(totales.MALASYA)}\n`;
        mensaje += `🇱🇦 LAOS: ${formatNumber(totales.LAOS)}\n`;
        mensaje += `🇷🇺 RUSIA: ${formatNumber(totales.RUSIA)}\n`;
        mensaje += `\n🧮 *Total combinado:* ${formatNumber(totalConjunto)}\n\n`;
        mensaje += `📋 *Detalle por batalla:*\n`;

        detalle.forEach((b, i) => {
            mensaje += `\n${i + 1}) ${b.link}\n`;
            for (const [pais, dmg] of Object.entries(b.valores)) {
                mensaje += `   - ${pais}: ${formatNumber(dmg)}\n`;
            }
        });

        bot.sendMessage(chatId, mensaje,{ 
            parse_mode: "Markdown",
            disable_web_page_preview: true 
        });
    },

    produccion: async (chatId) => {
        try {
            const productionRes = await axios.get(`https://api2.warera.io/trpc/itemTrading.getPrices`);
            const productionData = productionRes.data?.result?.data;

            if (!productionData) {
                bot.sendMessage(chatId, "No se pudieron obtener los datos de producción.");
                return;
            }

            function limitarDecimales(num) {
                return Math.round(num * 100000) / 100000;
            }

            const traducciones = {
                // Materias primas
                grain: "Granos",
                livestock: "Ganado", 
                limestone: "Caliza",
                coca: "Plantas",
                lead: "Plomo",
                petroleum: "Petróleo",
                iron: "Hierro",
                fish: "Pescado",
                
                // Productos manufacturados
                cookedFish: "Pescado Cocido",
                heavyAmmo: "Munición Pesada",
                steel: "Acero",
                bread: "Pan",
                concrete: "Hormigón",
                oil: "Aceite",
                lightAmmo: "Munición Ligera",
                steak: "Filete",
                cocain: "Pastilla",
                ammo: "Munición"
            };

            const materiasPrimas = {
                grain: { pp: 1 },
                livestock: { pp: 20 },
                limestone: { pp: 1 },
                coca: { pp: 1 },
                lead: { pp: 1 },
                petroleum: { pp: 1 },
                iron: { pp: 1 },
                fish: { pp: 40 }
            };

            const productosManufacturados = {
                cookedFish: { materias: { fish: 1 }, pp: 40 },
                heavyAmmo: { materias: { lead: 16 }, pp: 16 },
                steel: { materias: { iron: 10 }, pp: 10 },
                bread: { materias: { grain: 10 }, pp: 10 },
                concrete: { materias: { limestone: 10 }, pp: 10 },
                oil: { materias: { petroleum: 1 }, pp: 1 },
                lightAmmo: { materias: { lead: 1 }, pp: 1 },
                steak: { materias: { livestock: 1 }, pp: 20 },
                cocain: { materias: { coca: 200 }, pp: 200 },
                ammo: { materias: { lead: 4 }, pp: 4 }
            };

            const resultados = [];

            // Calcular productividad para materias primas
            for (const [material, datos] of Object.entries(materiasPrimas)) {
                const precioVenta = productionData[material];
                if (precioVenta !== undefined && precioVenta !== null) {
                    const productividad = limitarDecimales(precioVenta / datos.pp);
                    resultados.push({
                        nombre: material,
                        nombreDisplay: traducciones[material] || material,
                        productividad: productividad,
                        tipo: 'materia_prima'
                    });
                }
            }

            // Calcular productividad para productos manufacturados
            for (const [producto, datos] of Object.entries(productosManufacturados)) {
                const precioVentaProducto = productionData[producto];
                if (precioVentaProducto !== undefined && precioVentaProducto !== null) {
                    let costeMateriasPrimas = 0;
                    let todasLasMateriasDisponibles = true;
                    
                    for (const [materia, cantidad] of Object.entries(datos.materias)) {
                        const precioVentaMateria = productionData[materia];
                        if (precioVentaMateria !== undefined && precioVentaMateria !== null) {
                            costeMateriasPrimas += (precioVentaMateria * cantidad);
                        } else {
                            todasLasMateriasDisponibles = false;
                            break;
                        }
                    }

                    if (todasLasMateriasDisponibles) {
                        const productividad = limitarDecimales((precioVentaProducto - costeMateriasPrimas) / datos.pp);
                        
                        resultados.push({
                            nombre: producto,
                            nombreDisplay: traducciones[producto] || producto,
                            productividad: productividad,
                            tipo: 'manufacturado'
                        });
                    }
                }
            } 

            const resultadosValidos = resultados.filter(item => 
                item.productividad !== undefined && 
                item.productividad !== null && 
                !isNaN(item.productividad)
            );
            
            resultadosValidos.sort((a, b) => b.productividad - a.productividad);

            let mensaje = "*RANKING PRODUCTIVIDAD*\n\n";

            resultadosValidos.forEach((item, index) => {
                const emoji = item.tipo === 'materia_prima' ? '⛏️' : '🏭';
                const nombreEscapado = escapeMarkdownV2(item.nombreDisplay);
                const productividadEscapada = escapeMarkdownV2(item.productividad.toFixed(5));
                
                mensaje += `${index + 1}\\. ${emoji} *${nombreEscapado}*: ${productividadEscapada} monedas/pp\n`;
            });

            bot.sendMessage(chatId, mensaje, { parse_mode: "MarkdownV2" });

        } catch (error) {
            console.error("Error en comando /produccion:", error);
            bot.sendMessage(chatId, "Error al obtener los datos de producción.");
        }
    },
    
    duracion: async (chatId, args) => {
        if (args.length < 1) {
            bot.sendMessage(chatId, "Ejemplo: /duracion https://app.warera.io/battle/6924dddcd9075fc1dbbaf2f9", {
                parse_mode: "Markdown",
                disable_web_page_preview: true
            });
            return;
        }

        const battleId = args[0].split('/').pop();
        
        try {
            // Obtener datos de la batalla
            const battleData = await apiCall('battle.getById', { battleId });
            if (!battleData) {
                bot.sendMessage(chatId, "No se pudo obtener la batalla.");
                return;
            }

            const attackerWins = battleData.attacker.wonRoundsCount;
            const defenderWins = battleData.defender.wonRoundsCount;
            const roundsToWin = battleData.roundsToWin;
            const currentRoundId = battleData.currentRound;
            const isActive = battleData.isActive;

            if (!isActive) {
                bot.sendMessage(chatId, "Esta batalla ya ha finalizado.");
                return;
            }

            // Obtener datos de la ronda actual
            const roundData = await apiCall('round.getById', { roundId: currentRoundId });
            if (!roundData) {
                bot.sendMessage(chatId, "No se pudo obtener la ronda actual.");
                return;
            }

            const attackerPoints = roundData.attacker.points;
            const defenderPoints = roundData.defender.points;
            const totalPoints = attackerPoints + defenderPoints;
            const actualTickPoints = roundData.live.actualTickPoints;
            const nextTickAt = new Date(roundData.live.nextTickAt);

            // Función para calcular puntos por tick basado en puntos totales
            function getPuntosPorTick(puntosTotales) {
                const nivel = Math.floor(puntosTotales / 100);
                return Math.min(nivel + 1, 6);
            }

            // Función para calcular tiempo para que un bando alcance X puntos desde Y puntos
            function calcularTiempoParaPuntos(puntosIniciales, puntosObjetivo, puntosTotalesIniciales) {
                if (puntosIniciales >= puntosObjetivo) return 0;
                
                let tiempo = 0;
                let puntosActuales = puntosIniciales;
                let puntosTotales = puntosTotalesIniciales;

                while (puntosActuales < puntosObjetivo) {
                    const puntosTick = getPuntosPorTick(puntosTotales);
                    puntosActuales += puntosTick;
                    puntosTotales += puntosTick;
                    tiempo += 2;
                    
                    if (puntosActuales >= puntosObjetivo) break;
                }

                return tiempo;
            }

            // Función para calcular una ronda completa en escenario RÁPIDO
            function calcularRondaRapida(puntosInicialesGanador, puntosTotalesIniciales) {
                return calcularTiempoParaPuntos(puntosInicialesGanador, 300, puntosTotalesIniciales);
            }

            // Función para calcular una ronda completa en escenario LENTO desde 0
            function calcularRondaLentaDesdeCero() {
                // Perdedor llega a 299 puntos desde 0
                let tiempoPerdedor = 0;
                let puntosPerdedor = 0;
                let puntosTotales = 0;
                
                while (puntosPerdedor < 299) {
                    const puntosTick = getPuntosPorTick(puntosTotales);
                    puntosPerdedor += puntosTick;
                    puntosTotales += puntosTick;
                    tiempoPerdedor += 2;
                }
                
                // Ganador llega a 300 puntos desde 0 (con los puntos totales acumulados)
                let tiempoGanador = 0;
                let puntosGanador = 0;
                
                while (puntosGanador < 300) {
                    const puntosTick = getPuntosPorTick(puntosTotales);
                    puntosGanador += puntosTick;
                    puntosTotales += puntosTick;
                    tiempoGanador += 2;
                }
                
                return Math.max(tiempoPerdedor, tiempoGanador);
            }

            // Función para calcular una ronda completa en escenario LENTO
            function calcularRondaLenta(puntosInicialesGanador, puntosInicialesPerdedor, puntosTotalesIniciales) {
                // Tiempo para que el perdedor llegue a 299
                const tiempoPerdedor = calcularTiempoParaPuntos(puntosInicialesPerdedor, 299, puntosTotalesIniciales);
                
                // Puntos totales cuando el perdedor llega a 299
                let puntosTotalesCuandoPerdedor299 = puntosTotalesIniciales;
                let puntosPerdedorTemp = puntosInicialesPerdedor;
                while (puntosPerdedorTemp < 299) {
                    const puntosTick = getPuntosPorTick(puntosTotalesCuandoPerdedor299);
                    puntosPerdedorTemp += puntosTick;
                    puntosTotalesCuandoPerdedor299 += puntosTick;
                }
                
                // Tiempo para que el ganador llegue a 300 desde donde está
                const tiempoGanador = calcularTiempoParaPuntos(puntosInicialesGanador, 300, puntosTotalesCuandoPerdedor299);
                
                // El tiempo total es el máximo entre ambos
                return Math.max(tiempoPerdedor, tiempoGanador);
            }

            // Calcular escenarios CORREGIDOS
            function calcularEscenarios() {
                const ganadorActual = attackerPoints > defenderPoints ? "Atacante" : "Defensor";
                const perdedorActual = ganadorActual === "Atacante" ? "Defensor" : "Atacante";
                
                function calcularEscenarioRapido() {
                    let tiempoTotal = 0;
                    const puntosGanadorActual = ganadorActual === "Atacante" ? attackerPoints : defenderPoints;
                    
                    // Ronda 1: Actual (rápida)
                    tiempoTotal += calcularRondaRapida(puntosGanadorActual, totalPoints);
                    
                    // Ronda 2: Nueva desde 0 (rápida)
                    tiempoTotal += calcularRondaRapida(0, 0);
                    
                    return tiempoTotal;
                }
                
                // En calcularEscenarios():
                function calcularEscenarioLento() {
                    let tiempoTotal = 0;
                    const puntosGanadorActual = ganadorActual === "Atacante" ? attackerPoints : defenderPoints;
                    const puntosPerdedorActual = perdedorActual === "Atacante" ? attackerPoints : defenderPoints;
                    
                    // Ronda 1: Actual (lenta)
                    tiempoTotal += calcularRondaLenta(puntosGanadorActual, puntosPerdedorActual, totalPoints);
                    
                    // Ronda 2: Nueva desde 0 (lenta)
                    tiempoTotal += calcularRondaLentaDesdeCero();
                    
                    // Ronda 3: Nueva desde 0 (lenta) - ¡TODAS las rondas lentas en escenario más lento!
                    tiempoTotal += calcularRondaLentaDesdeCero();
                    
                    return tiempoTotal;
                }

                return {
                    rapido: { tiempo: calcularEscenarioRapido(), ganador: ganadorActual },
                    lento: { tiempo: calcularEscenarioLento(), ganador: ganadorActual }
                };
            }

            const escenarios = calcularEscenarios();

            // Función para formatear tiempo
            function formatearTiempo(minutos) {
                const horas = Math.floor(minutos / 60);
                const mins = minutos % 60;
                if (horas === 0) return `${mins}m`;
                return `${horas}h ${mins}m`;
            }

            function calcularHoraFinalizacion(minutosExtra) {
                const ahora = new Date();
                const finalizacion = new Date(ahora.getTime() + minutosExtra * 60000);
                return finalizacion.toLocaleTimeString('es-ES', {
                    timeZone: 'Europe/Madrid',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });
            }

            const ganadorActual = attackerPoints > defenderPoints ? "Atacante" : 
                                defenderPoints > attackerPoints ? "Defensor" : "Empate";

            const puntosParaGanarAtacante = 300 - attackerPoints;
            const puntosParaGanarDefensor = 300 - defenderPoints;

            // Construir mensaje
            let mensaje = `⏰ *DURACIÓN ESTIMADA DE LA BATALLA*\n\n`;
            mensaje += `🔗 [Batalla](https://app.warera.io/battle/${battleId})\n\n`;
            mensaje += `📊 *Estado actual:*\n`;
            mensaje += `⚔️ Atacante: ${attackerWins} rondas - ${attackerPoints} puntos\n`;
            mensaje += `🛡️ Defensor: ${defenderWins} rondas - ${defenderPoints} puntos\n`;
            mensaje += `🎯 Rondas para ganar: ${roundsToWin}\n`;
            mensaje += `👑 Lleva ventaja: ${ganadorActual}\n\n`;
            mensaje += `📈 *Puntos por tick actual:* ${actualTickPoints} (total: ${totalPoints} pts)\n\n`;
            mensaje += `🎯 *Puntos para ganar ronda:*\n`;
            mensaje += `• Atacante necesita: ${puntosParaGanarAtacante} puntos\n`;
            mensaje += `• Defensor necesita: ${puntosParaGanarDefensor} puntos\n\n`;
            mensaje += `⚡ *Escenario más rápido (2-0):*\n`;
            mensaje += `• Ganador: ${escenarios.rapido.ganador}\n`;
            mensaje += `• Tiempo: ${formatearTiempo(escenarios.rapido.tiempo)}\n`;
            mensaje += `• Finaliza: ${calcularHoraFinalizacion(escenarios.rapido.tiempo)}\n\n`;
            mensaje += `🐌 *Escenario más lento (2-1):*\n`;
            mensaje += `• Ganador: ${escenarios.lento.ganador}\n`;
            mensaje += `• Tiempo: ${formatearTiempo(escenarios.lento.tiempo)}\n`;
            mensaje += `• Finaliza: ${calcularHoraFinalizacion(escenarios.lento.tiempo)}\n\n`;
            mensaje += `⏱️ *Próximo tick:* ${nextTickAt.toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid' })}`;

            await bot.sendMessage(chatId, mensaje, {
                parse_mode: "Markdown",
                disable_web_page_preview: true
            });

        } catch (error) {
            console.error("Error en /duracion:", error);
            bot.sendMessage(chatId, "Error al calcular la duración de la batalla.");
        }
    }
};

// --- Listener principal ---
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    const allowedChats = [GROUP_ID, GROUP_PRUEBAS_ID, CHAT_ID].filter(id => id);
    if (allowedChats.length > 0 && !allowedChats.includes(chatId)) {
        return;
    }

    if (text) {
        const palabras = text.toLowerCase().split(/\s+/);
        const variantesOtto = ['otto', 'oto', 'oton', 'otón'];
        if (variantesOtto.some(variant => palabras.includes(variant))) {
            bot.sendMessage(chatId, 'Putero');
        }
    }

    if (!text?.startsWith('/')) return;

    const [cmdRaw, ...args] = text.slice(1).split(' ');
    const cmd = cmdRaw.split('@')[0].toLowerCase();

    if (comandos[cmd]) {
        await comandos[cmd](chatId, args);
    }
});

// --- Servidor Express ---
const app = express();
app.get('/', (req, res) => res.send('Bot activo'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));