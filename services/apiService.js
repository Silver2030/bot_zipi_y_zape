const axios = require('axios');
const { apiQueue } = require('./apiQueue');

async function apiCall(method, params = {}) {
    return apiQueue.add(async () => {
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
    });
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
