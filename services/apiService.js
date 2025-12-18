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
        const res = await axios.get(`https://api2.warera.io/trpc/${method}`, {
            params: { input: JSON.stringify(params) }
        });
        lastCall = Date.now();
        return res.data?.result?.data ?? null;
    } catch (error) {
        console.error(`Error en API ${method}:`, error.message);
        lastCall = Date.now();
        return null;
    }
}

async function getUserData(userId) {
    return apiCall('user.getById', { userId });
}

async function getCountryData(countryId) {
    return apiCall('country.getById', { countryId });
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