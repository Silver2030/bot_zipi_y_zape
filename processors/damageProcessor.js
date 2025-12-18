const { getUserData } = require('../services/apiService');
const { formatNumber } = require('../utils/helpers');

async function danyoSemanal(botQueue, chatId, usuarios){
    try{
        const resultados=[];
        const limit=pLimit(5);

        await Promise.all(usuarios.map(u=>limit(async()=>{
            try{
                const data=await getUserData(u.userId);
                if(data) resultados.push({username:data.username, weeklyDamage:data.rankings?.weeklyUserDamages?.value||0});
            }catch(e){console.error(e);}
        })));

        if(!resultados.length) return botQueue.sendMessage(chatId,"No se pudo obtener el daño semanal.");

        resultados.sort((a,b)=>b.weeklyDamage-a.weeklyDamage);
        const totalDamage=resultados.reduce((s,r)=>s+r.weeklyDamage,0);
        const media=Math.round(totalDamage/resultados.length);

        let mensaje=`Daño semanal:\n\n${resultados.map((r,i)=>`${i+1}) ${r.username}: ${formatNumber(r.weeklyDamage)}`).join('\n')}\n\nMedia: ${formatNumber(media)}`;
        await botQueue.sendMessage(chatId,mensaje);
    }catch(err){
        console.error(err);
        await botQueue.sendMessage(chatId,"Error al obtener daños semanales.");
    }
}

module.exports = { danyoSemanal };