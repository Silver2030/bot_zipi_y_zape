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
    const build = userData.build || userData.skills?.build || "UNKNOWN";
    return { build };
}

module.exports = { 
    escapeMarkdownV2, 
    formatNumber, 
    formatNumberMarkdown, 
    delay, 
    generarExcelBuffer, 
    analizarBuild 
};
