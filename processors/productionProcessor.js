const axios = require('axios');
const { escapeMarkdownV2 } = require('../utils/helpers');

async function produccion(botQueue, chatId) {
    try {
        const res = await axios.get(`https://api2.warera.io/trpc/itemTrading.getPrices`);
        const data = res.data?.result?.data;
        if (!data) return botQueue.sendMessage(chatId, "No se pudieron obtener los datos de producción.");

        const limitarDecimales = (n) => Math.round(n * 100000) / 100000;

        const traducciones = { grain: "Granos", livestock: "Ganado", limestone: "Caliza", coca: "Plantas", lead: "Plomo", petroleum: "Petróleo", iron: "Hierro", fish: "Pescado", cookedFish: "Pescado Cocido", heavyAmmo: "Munición Pesada", steel: "Acero", bread: "Pan", concrete: "Hormigón", oil: "Aceite", lightAmmo: "Munición Ligera", steak: "Filete", cocain: "Pastilla", ammo: "Munición" };

        const materiasPrimas = { grain: { pp: 1 }, livestock: { pp: 20 }, limestone: { pp: 1 }, coca: { pp: 1 }, lead: { pp: 1 }, petroleum: { pp: 1 }, iron: { pp: 1 }, fish: { pp: 40 } };
        const productosManufacturados = { cookedFish: { materias: { fish: 1 }, pp: 40 }, heavyAmmo: { materias: { lead: 16 }, pp: 16 }, steel: { materias: { iron: 10 }, pp: 10 }, bread: { materias: { grain: 10 }, pp: 10 }, concrete: { materias: { limestone: 10 }, pp: 10 }, oil: { materias: { petroleum: 1 }, pp: 1 }, lightAmmo: { materias: { lead: 1 }, pp: 1 }, steak: { materias: { livestock: 1 }, pp: 20 }, cocain: { materias: { coca: 200 }, pp: 200 }, ammo: { materias: { lead: 4 }, pp: 4 } };

        const resultados = [];

        for (const [m, d] of Object.entries(materiasPrimas)) {
            const precio = data[m];
            if (precio != null) resultados.push({ nombre: traducciones[m] || m, productividad: limitarDecimales(precio/d.pp), tipo:'materia_prima' });
        }

        for (const [p, d] of Object.entries(productosManufacturados)) {
            const precioProducto = data[p];
            if (precioProducto != null) {
                let coste = 0, todas=true;
                for(const [mat, cant] of Object.entries(d.materias)){
                    if(data[mat] != null) coste += data[mat]*cant;
                    else { todas=false; break; }
                }
                if(todas) resultados.push({ nombre: traducciones[p]||p, productividad: limitarDecimales((precioProducto-coste)/d.pp), tipo:'manufacturado' });
            }
        }

        resultados.sort((a,b)=>b.productividad-a.productividad);

        let mensaje="*RANKING PRODUCTIVIDAD*\n\n";
        resultados.forEach((item,i)=>{
            const emoji = item.tipo==='materia_prima'?'⛏️':'🏭';
            mensaje += `${i+1}\\. ${emoji} *${escapeMarkdownV2(item.nombre)}*: ${escapeMarkdownV2(item.productividad.toFixed(5))} monedas/pp\n`;
        });

        await botQueue.sendMessage(chatId, mensaje, { parse_mode:'MarkdownV2' });

    } catch (err) {
        console.error("Error /produccion:", err);
        await botQueue.sendMessage(chatId, "Error al obtener los datos de producción.");
    }
}

module.exports = { produccion };
