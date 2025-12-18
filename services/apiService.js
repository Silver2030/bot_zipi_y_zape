const axios = require('axios');
const { delay } = require('../utils/helpers');

let lastCall = 0;
const MIN_DELAY = 500;

async function apiCall(method, params = {}) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;
    if (timeSinceLastCall < MIN_DELAY) {
        await delay(MIN_DELAY - timeSinceLastCall);
    }

    try {
        const url = `https://api2.warera.io/trpc/${method}?input=${encodeURIComponent(JSON.stringify(params))}`;
        const res = await axios.get(url);
        lastCall = Date.now();
        return res.data?.result?.data ?? null;
    } catch (error) {
        console.error(`Error en API ${method}:`, error.message);
        lastCall = Date.now();
        return null;
    }
}

async function getUserData(userId) {
    return apiCall('user.getUserLite', { userId });
}

async function getCountryData(countryId) {
    return apiCall('country.getCountryById', { countryId });
}

async function getMUData(muId) {
    return apiCall('mu.getById', { muId });
}

module.exports = {
    apiCall,
    getUserData,
    getCountryData,
    getMUData
};