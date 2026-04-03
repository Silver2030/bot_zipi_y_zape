"use strict";

const { fetchInBatches, getUserData, getUserCompanies, getCompanyData } = require("./api");
const { apiCall } = require("./api");
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
  let allItems = [];
  let nextCursor = null;
  let page = 1;

  do {
    console.log(`📄 Obteniendo página ${page} de usuarios del país...`);
    const queryParams = { countryId, limit: 100 };
    if (nextCursor) queryParams.cursor = nextCursor;

    const usersData = await apiCall("user.getUsersByCountry", queryParams);
    if (usersData?.items) {
      allItems = allItems.concat(usersData.items);
      nextCursor = usersData.nextCursor || null;
    } else {
      nextCursor = null;
    }
    page++;
    if (nextCursor) await delay(200);
  } while (nextCursor && page < 20);

  console.log(`📊 Total usuarios del país: ${allItems.length}`);
  return { items: allItems };
}

module.exports = { fetchUsersLite, fetchCompaniesByUser, fetchCompaniesById, getCountryUsers };
