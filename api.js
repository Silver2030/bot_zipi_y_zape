"use strict";

const axios = require("axios");
const { TRPC_BASE } = require("./config");

// ─── Cache TTL ────────────────────────────────────────────────────────────────
const cache = new Map();

function cacheGet(key) {
  const x = cache.get(key);
  if (!x) return null;
  if (Date.now() > x.exp) { cache.delete(key); return null; }
  return x.value;
}

function cacheSet(key, value, ttlMs = 60_000) {
  cache.set(key, { value, exp: Date.now() + ttlMs });
}

// ─── Concurrencia limitada (fallback) ────────────────────────────────────────
async function mapLimit(items, limit, fn) {
  const ret = new Array(items.length);
  let idx = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (idx < items.length) {
      const current = idx++;
      try { ret[current] = await fn(items[current], current); }
      catch { ret[current] = null; }
    }
  });
  await Promise.all(workers);
  return ret;
}

// ─── Llamada individual ───────────────────────────────────────────────────────
async function apiCall(endpoint, params = {}) {
  const url = `${TRPC_BASE}/${endpoint}?input=${encodeURIComponent(JSON.stringify(params))}`;
  const response = await axios.get(url);
  return response.data?.result?.data;
}

// ─── Batch ────────────────────────────────────────────────────────────────────
async function apiBatchCall(requests) {
  if (!requests?.length) return [];
  const endpoints = requests.map((r) => r.endpoint).join(",");
  const input = {};
  requests.forEach((r, i) => { input[i] = r.params; });
  const url = `${TRPC_BASE}/${endpoints}?batch=1&input=${encodeURIComponent(JSON.stringify(input))}`;
  const res = await axios.get(url);
  if (!Array.isArray(res.data)) throw new Error("Batch no soportado (respuesta no-array)");
  return res.data.map((x) => x?.result?.data ?? null);
}

async function fetchInBatches({ items, batchSize = 30, pauseMs = 120, batchRequestBuilder, fallbackFn, fallbackConcurrency = 10 }) {
  const { delay } = require("./utils");
  const out = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const slice = items.slice(i, i + batchSize);
    try {
      const reqs = slice.map(batchRequestBuilder);
      out.push(...(await apiBatchCall(reqs)));
    } catch {
      out.push(...(await mapLimit(slice, fallbackConcurrency, fallbackFn)));
    }
    if (i + batchSize < items.length) await delay(pauseMs);
  }
  return out;
}

// ─── Endpoints cacheados ──────────────────────────────────────────────────────
async function getUserData(userId) {
  const key = `user:${userId}`;
  const hit = cacheGet(key);
  if (hit) return hit;
  const data = await apiCall("user.getUserLite", { userId });
  if (data) cacheSet(key, data, 60_000);
  return data;
}

async function getMUData(muId) {
  const key = `mu:${muId}`;
  const hit = cacheGet(key);
  if (hit) return hit;
  const data = await apiCall("mu.getById", { muId });
  if (data) cacheSet(key, data, 60_000);
  return data;
}

async function getCountryData(countryId) {
  const key = `country:${countryId}`;
  const hit = cacheGet(key);
  if (hit) return hit;
  const data = await apiCall("country.getCountryById", { countryId });
  if (data) cacheSet(key, data, 5 * 60_000);
  return data;
}

async function getUserCompanies(userId) {
  const key = `companiesByUser:${userId}`;
  const hit = cacheGet(key);
  if (hit) return hit;
  const data = await apiCall("company.getCompanies", { userId, perPage: 50 });
  if (data) cacheSet(key, data, 30_000);
  return data;
}

async function getCompanyData(companyId) {
  const key = `company:${companyId}`;
  const hit = cacheGet(key);
  if (hit) return hit;
  const data = await apiCall("company.getById", { companyId });
  if (data) cacheSet(key, data, 2 * 60_000);
  return data;
}

async function getAllCountries() {
  const key = "allCountries";
  const hit = cacheGet(key);
  if (hit) return hit;
  const res = await axios.get(`${TRPC_BASE}/country.getAllCountries`);
  const data = res.data?.result?.data || [];
  cacheSet(key, data, 5 * 60_000);
  return data;
}

async function getRegionsObject() {
  const key = "regionsObject";
  const hit = cacheGet(key);
  if (hit) return hit;
  const res = await axios.get(`${TRPC_BASE}/region.getRegionsObject`);
  const data = res.data?.result?.data || {};
  cacheSet(key, data, 2 * 60_000);
  return data;
}

async function getPrices() {
  const key = "itemPrices";
  const hit = cacheGet(key);
  if (hit) return hit;
  const res = await axios.get(`${TRPC_BASE}/itemTrading.getPrices`);
  const data = res.data?.result?.data || {};
  cacheSet(key, data, 30_000);
  return data;
}

module.exports = {
  apiCall, apiBatchCall, fetchInBatches,
  getUserData, getMUData, getCountryData,
  getUserCompanies, getCompanyData,
  getAllCountries, getRegionsObject, getPrices,
};
