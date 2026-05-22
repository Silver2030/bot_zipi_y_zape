"use strict";

const axios = require("axios");
const { TRPC_BASE } = require("./config");
const { delay } = require("./utils");

// ─── Caché LRU con TTL ────────────────────────────────────────────────────────
const CACHE_MAX = 500; // máximo de entradas simultáneas

class LRUCache {
  constructor(max) {
    this.max  = max;
    this.map  = new Map(); // key → { value, exp }
  }

  get(key) {
    const x = this.map.get(key);
    if (!x) return null;
    if (Date.now() > x.exp) { this.map.delete(key); return null; }
    // mover al final (más reciente)
    this.map.delete(key);
    this.map.set(key, x);
    return x.value;
  }

  set(key, value, ttlMs = 60_000) {
    if (this.map.has(key)) this.map.delete(key);
    else if (this.map.size >= this.max) {
      // eliminar el más antiguo (primer elemento)
      this.map.delete(this.map.keys().next().value);
    }
    this.map.set(key, { value, exp: Date.now() + ttlMs });
  }

  delete(key) { this.map.delete(key); }
  get size()  { return this.map.size; }
}

const cache = new LRUCache(CACHE_MAX);

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
async function apiCall(endpoint, params = {}, headers = {}) {
  const url = `${TRPC_BASE}/${endpoint}?input=${encodeURIComponent(JSON.stringify(params))}`;
  const response = await axios.get(url, { headers });
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
  const out = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const slice = items.slice(i, i + batchSize);
    try {
      out.push(...(await apiBatchCall(slice.map(batchRequestBuilder))));
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
  const hit = cache.get(key);
  if (hit) return hit;
  const data = await apiCall("user.getUserLite", { userId });
  if (data) cache.set(key, data, 60_000);
  return data;
}

async function getMUData(muId) {
  const key = `mu:${muId}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const data = await apiCall("mu.getById", { muId });
  if (data) cache.set(key, data, 60_000);
  return data;
}

async function getCountryData(countryId) {
  const key = `country:${countryId}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const data = await apiCall("country.getCountryById", { countryId });
  if (data) cache.set(key, data, 5 * 60_000);
  return data;
}

async function getUserCompanies(userId) {
  const key = `companiesByUser:${userId}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const data = await apiCall("company.getCompanies", { userId, perPage: 50 });
  if (data) cache.set(key, data, 30_000);
  return data;
}

async function getCompanyData(companyId) {
  const key = `company:${companyId}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const data = await apiCall("company.getById", { companyId });
  if (data) cache.set(key, data, 2 * 60_000);
  return data;
}

async function getAllCountries() {
  const key = "allCountries";
  const hit = cache.get(key);
  if (hit) return hit;
  const res  = await axios.get(`${TRPC_BASE}/country.getAllCountries`);
  const data = res.data?.result?.data || [];
  cache.set(key, data, 5 * 60_000);
  return data;
}

async function getRegionsObject() {
  const key = "regionsObject";
  const hit = cache.get(key);
  if (hit) return hit;
  const res  = await axios.get(`${TRPC_BASE}/region.getRegionsObject`);
  const data = res.data?.result?.data || {};
  cache.set(key, data, 2 * 60_000);
  return data;
}

async function getPrices() {
  const key = "itemPrices";
  const hit = cache.get(key);
  if (hit) return hit;
  const res  = await axios.get(`${TRPC_BASE}/itemTrading.getPrices`);
  const data = res.data?.result?.data || {};
  cache.set(key, data, 30_000);
  return data;
}

// Exponer tamaño de caché para /status
function getCacheSize() { return cache.size; }

module.exports = {
  apiCall, apiBatchCall, fetchInBatches,
  getUserData, getMUData, getCountryData,
  getUserCompanies, getCompanyData,
  getAllCountries, getRegionsObject, getPrices,
  getCacheSize,
};
