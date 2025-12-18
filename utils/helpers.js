function escapeMarkdownV2(text) {
    if (typeof text !== 'string') {
        text = String(text);
    }
    return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

function formatNumber(num) {
    return num?.toLocaleString('es-ES') || '0';
}

function formatNumberMarkdown(num) {
    return formatNumber(num);
}

function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
}

const ExcelJS = require('exceljs');
async function generarExcelBuffer(data, sheetName = 'Sheet1') {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(sheetName);

    if(!data.length) return null;
    ws.columns = Object.keys(data[0]).map(k=>({header:k,key:k,width:20}));
    ws.addRows(data);

    const buffer = await wb.xlsx.writeBuffer();
    return buffer;
}

function analizarBuild(userData) {
    const SKILL_COSTS = [0,1,3,6,10,15,21,28,36,45,55];
    const PVP_SKILLS = ["health","hunger","attack","criticalChance","criticalDamages","armor","precision","dodge"];
    const ECO_SKILLS = ["energy","companies","entrepreneurship","production","lootChance"];

    let pvpPoints = 0, ecoPoints = 0;

    PVP_SKILLS.forEach(skill => {
        pvpPoints += SKILL_COSTS[userData.skills[skill]?.level || 0];
    });

    ECO_SKILLS.forEach(skill => {
        ecoPoints += SKILL_COSTS[userData.skills[skill]?.level || 0];
    });

    const total = pvpPoints + ecoPoints;
    const pctPvp = total ? (pvpPoints / total) * 100 : 0;

    let build = "HIBRIDA";
    if (pctPvp > 65) build = "PVP";
    else if (pctPvp < 35) build = "ECO";

    return { build, nivel: userData.leveling?.level || 0 };
}

module.exports = { 
    escapeMarkdownV2, 
    formatNumber, 
    formatNumberMarkdown, 
    delay, 
    generarExcelBuffer, 
    analizarBuild 
};
