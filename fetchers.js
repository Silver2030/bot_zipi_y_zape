"use strict";

const { fetchInBatches, getUserData, getUserCompanies, getCompanyData, apiCall } = require("./api");
const { delay } = require("./utils");

async function fetchUsersLite(userIds, { batchSize = 30 } = {}) {
  return fetchInBatches({
    items: userIds,
    batchSize,
    pauseMs: 120,
    batchRequestBuilder: (userId) => ({ endpoint: "user.getUserLite", params: { userId } }),
    fallbackFn: (userId) => getUserData(userId),
    fallbackConcurrency: 10,
  });
}

async function fetchCompaniesByUser(userIds, { batchSize = 20 } = {}) {
  const res = await fetchInBatches({
    items: userIds,
    batchSize,
    pauseMs: 150,
    batchRequestBuilder: (userId) => ({ endpoint: "company.getCompanies", params: { userId, perPage: 50 } }),
    fallbackFn: (userId) => getUserCompanies(userId),
    fallbackConcurrency: 8,
  });
  const map = new Map();
  userIds.forEach((uid, idx) => { map.set(uid, res[idx]?.items || []); });
  return map;
}

async function fetchCompaniesById(companyIds, { batchSize = 40 } = {}) {
  const unique = [...new Set(companyIds.filter(Boolean))];
  if (!unique.length) return new Map();
  const res = await fetchInBatches({
    items: unique,
    batchSize,
    pauseMs: 150,
    batchRequestBuilder: (companyId) => ({ endpoint: "company.getById", params: { companyId } }),
    fallbackFn: (companyId) => getCompanyData(companyId),
    fallbackConcurrency: 10,
  });
  const map = new Map();
  unique.forEach((cid, idx) => map.set(cid, res[idx] || null));
  return map;
}

async function getCountryUsers(countryId) {
  let allItems  = [];
  let nextCursor = null;
  let page      = 1;
  const MAX_PAGES = 50;

  do {
    console.log(`📄 Página ${page} de usuarios del país...`);
    const params = { countryId, limit: 100 };
    if (nextCursor) params.cursor = nextCursor;

    try {
      const data = await apiCall("user.getUsersByCountry", params);
      if (data?.items?.length) {
        allItems   = allItems.concat(data.items);
        nextCursor = data.nextCursor || null;
      } else {
        nextCursor = null;
      }
    } catch (err) {
      console.error(`❌ Error en página ${page} de usuarios del país:`, err?.message);
      nextCursor = null; // parar para no quedar en bucle infinito
    }

    page++;
    if (nextCursor) await delay(200);
  } while (nextCursor && page <= MAX_PAGES);

  console.log(`📊 Total usuarios del país: ${allItems.length}`);
  return { items: allItems };
}

module.exports = { fetchUsersLite, fetchCompaniesByUser, fetchCompaniesById, getCountryUsers };
