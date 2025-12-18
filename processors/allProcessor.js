const { delay } = require('../utils/helpers');

async function all(botQueue, chatId, usuarios){
    try{
        const mencionesUnicas=[...new Set(usuarios.map(u=>u.mention))];
        if(!mencionesUnicas.length) return botQueue.sendMessage(chatId,"No hay usuarios para mencionar.");

        const chunkSize=5;
        for(let i=0;i<mencionesUnicas.length;i+=chunkSize){
            const grupo=mencionesUnicas.slice(i,i+chunkSize).join('\n');
            await botQueue.sendMessage(chatId,grupo);
            await delay(300);
        }
    }catch(err){
        console.error(err);
        await botQueue.sendMessage(chatId,"Error al enviar menciones.");
    }
}

module.exports={all};