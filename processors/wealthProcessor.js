const { getUserData } = require('../services/apiService');
const { generarExcelBuffer, escapeMarkdownV2, formatNumberMarkdown, delay } = require('../utils/helpers');
const pLimit = require('p-limit');

async function procesarDineroGrupo(botQueue, chatId, items, tipo) {
    try {
        const resultados = [];
        let totalWealth = 0, totalFactoryWealth = 0, totalLiquidWealth = 0, totalFactories = 0;
        const limit = pLimit(5);

        await Promise.all(items.map((item,index)=>limit(async()=>{
            try{
                const userData = await getUserData(item._id);
                if(!userData) return;

                const factoryWealth = userData.factories?.reduce((a,f)=>a+f.value,0)||0;
                const liquidWealth = (userData.wealth||0)-factoryWealth;
                const factoryCount = userData.factories?.length||0;
                const disabledFactoryWealth = userData.factories?.filter(f=>f.disabled).reduce((a,f)=>a+f.value,0)||0;

                resultados.push({
                    username:userData.username,
                    userId:item._id,
                    level:userData.leveling?.level||0,
                    totalWealth:userData.wealth||0,
                    factoryWealth,
                    liquidWealth,
                    factoryCount,
                    hasDisabledFactories:disabledFactoryWealth>0
                });

                totalWealth += userData.wealth||0;
                totalFactoryWealth += factoryWealth;
                totalLiquidWealth += liquidWealth;
                totalFactories += factoryCount;

                if(index%10===0) await botQueue.sendMessage(chatId, `💰 Procesando ${index+1}/${items.length} jugadores...`);

            }catch(err){console.error(`Error usuario ${item._id}:`,err.message);}
        })));

        if(!resultados.length) return botQueue.sendMessage(chatId,"No se pudieron obtener datos.");

        resultados.sort((a,b)=>b.totalWealth-a.totalWealth);
        const playerCount = resultados.length;
        const avgWealth = totalWealth/playerCount;
        const avgFactoryWealth = totalFactoryWealth/playerCount;
        const avgLiquidWealth = totalLiquidWealth/playerCount;
        const avgFactories = totalFactories/playerCount;

        let mensaje = `💰 *DINERO ${tipo.toUpperCase()}*\n\n*Estadísticas Generales:*\n`;
        mensaje += `👥 Jugadores: ${playerCount}\n💰 Wealth total: ${formatNumberMarkdown(totalWealth)}\n🏭 Wealth Fábricas: ${formatNumberMarkdown(totalFactoryWealth)}\n💵 Dinero/Almacen: ${formatNumberMarkdown(totalLiquidWealth)}\n🔧 Nº fábricas: ${totalFactories}\n\n`;
        mensaje += `*Promedios por Jugador:*\n💰 Wealth: ${formatNumberMarkdown(avgWealth)}\n🏭 Wealth Fábricas: ${formatNumberMarkdown(avgFactoryWealth)}\n💵 Dinero/Almacen: ${formatNumberMarkdown(avgLiquidWealth)}\n🔧 ${escapeMarkdownV2(avgFactories.toFixed(1))}`;
        await botQueue.sendMessage(chatId, mensaje, { parse_mode:"MarkdownV2" });

        const excelBuffer = await generarExcelBuffer(resultados, tipo);
        await botQueue.sendDocument(chatId, excelBuffer, { filename:`dinero_${tipo}_${Date.now()}.xlsx` });

    } catch(err){
        console.error(err);
        await botQueue.sendMessage(chatId,"Error al procesar el comando.");
    }
}

module.exports = { procesarDineroGrupo };