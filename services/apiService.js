const axios = require('axios');
const { delay } = require('../utils/helpers');

let lastApiCall = 0;
const MIN_API_INTERVAL = 200; // ms

async function apiCall(method, params = {}) {
    const now = Date.now();
    const wait = Math.max(0, MIN_API_INTERVAL - (now - lastApiCall));
    if (wait > 0) await delay(wait);

    lastApiCall = Date.now();

    try {
        const res = await axios.post(
            `https://api2.warera.io/trpc/${method}`,
            params
        );
        return res.data?.result?.data ?? null;
    } catch (error) {
        console.error(`Error en API ${method}:`, error.message);
        return null;
    }
}

const getUserData = (userId) =>
    apiCall('user.getById', { userId });

const getCountryData = (countryId) =>
    apiCall('country.getById', { countryId });

const getMUData = (muId) =>
    apiCall('mu.getById', { muId });

module.exports = {
    apiCall,
    getUserData,
    getCountryData,
    getMUData
};
