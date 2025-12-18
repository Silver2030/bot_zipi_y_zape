const { getUserData, getCountryData, getMUData, apiCall } = require('../services/apiService');
const { escapeMarkdownV2, delay } = require('../utils/helpers');
const pLimit = require('p-limit');

async function buscar(botQueue, chatId, searchText) {
    if (!searchText) return botQueue.sendMessage(chatId, "Ejemplo: /buscar Silver");

    try {
        const searchData = await apiCall('search.searchAnything', { searchText });
        if (!searchData?.hasData) return botQueue.sendMessage(chatId, `No hay resultados para: "${searchText}"`);

        const limit = pLimit(5);
        const categorias = [
            { key:'userIds', nombre:'👤 Usuarios', tipo:'user', datos:[] },
            { key:'muIds', nombre:'🏢 MUs', tipo:'mu', datos:[] },
            { key:'countryIds', nombre:'🇺🇳 Países', tipo:'country', datos:[] },
            { key:'regionIds', nombre:'🗺️ Regiones', tipo:'region', datos:[] }
        ];

        const obtenerDatosConNombre = async (ids, tipo) => {
            const resultados = [];
            await Promise.all(ids.map(id => limit(async() => {
                try {
                    let nombre, url;
                    switch(tipo){
                        case 'user': const u = await getUserData(id); nombre=u?.username||"Usuario Desconocido"; url=`https://app.warera.io/user/${id}`; break;
                        case 'country': const c = await getCountryData(id); nombre=c?.name||"País Desconocido"; url=`https://app.warera.io/country/${id}`; break;
                        case 'mu': const m = await getMUData(id); nombre=m?.name||"MU Desconocida"; url=`https://app.warera.io/mu/${id}`; break;
                        case 'region': const r = await apiCall('region.getById',{regionId:id}); nombre=r?.name||"Región Desconocida"; url=`https://app.warera.io/region/${id}`; break;
                    }
                    resultados.push({nombre,url,id});
                } catch(err){ 
                    console.error(err); 
                    resultados.push({nombre:`${tipo.charAt(0).toUpperCase()+tipo.slice(1)} ${id}`, url:`https://app.warera.io/${tipo}/${id}`, id});
                }
                await delay(100);
            })));
            return resultados;
        };

        for(const cat of categorias){
            if(searchData[cat.key]?.length) cat.datos=await obtenerDatosConNombre(searchData[cat.key],cat.tipo);
        }

        let mensaje=`*Resultados para:* ${escapeMarkdownV2(searchText)}\n\n`;
        categorias.forEach(({nombre, datos})=>{
            if(datos.length){
                mensaje+=`*${nombre}*\n`;
                datos.forEach(item=>{
                    mensaje+=`[${escapeMarkdownV2(item.nombre)}](${escapeMarkdownV2(item.url)}) - ${escapeMarkdownV2(item.id)}\n`;
                });
                mensaje+='\n';
            }
        });

        await botQueue.sendMessage(chatId,mensaje,{parse_mode:"MarkdownV2",disable_web_page_preview:true});

    } catch(err){
        console.error(err);
        await botQueue.sendMessage(chatId,"Error en la búsqueda.");
    }
}

module.exports={buscar};