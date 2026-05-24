"use strict";

let _bot = null;
const _threadIds = new Map();

function init(botInstance) {
  _bot = botInstance;
}

function bot() {
  if (!_bot) throw new Error("telegram.js: bot no inicializado. Llama a init(bot) primero.");
  return _bot;
}

// ─── Cola FIFO para evitar 429 ────────────────────────────────────────────────
let tgQueue = Promise.resolve();

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function extractRetryAfter(err) {
  const ra1 = err?.response?.body?.parameters?.retry_after;
  if (typeof ra1 === "number") return ra1;
  const ra2 = err?.response?.headers?.["retry-after"] ?? err?.response?.headers?.["Retry-After"];
  const n2 = Number(ra2);
  if (!Number.isNaN(n2) && n2 > 0) return n2;
  return null;
}

async function callWithRetry(fn, { maxRetries = 6 } = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      const is429 =
        err?.code === "ETELEGRAM" &&
        (err?.response?.statusCode === 429 || String(err?.message || "").includes("429"));
      if (!is429 || attempt >= maxRetries) throw err;
      const ra = extractRetryAfter(err) ?? 3;
      await sleep(ra * 1000 + 350);
      attempt++;
    }
  }
}

function enqueue(task) {
  tgQueue = tgQueue.then(task, task);
  return tgQueue;
}

// ─── Wrappers públicos ────────────────────────────────────────────────────────
function setThreadContext(chatId, threadId) {
  if (threadId) _threadIds.set(chatId, threadId);
  else _threadIds.delete(chatId);
}

function sendMessage(chatId, text, options = {}) {
  const threadId = _threadIds.get(chatId);
  const opts = threadId ? { message_thread_id: threadId, ...options } : options;
  return enqueue(() => callWithRetry(() => bot().sendMessage(chatId, text, opts)));
}

function editMessageText(text, opts) {
  return enqueue(() => callWithRetry(() => bot().editMessageText(text, opts)));
}

function deleteMessage(chatId, messageId) {
  return enqueue(() => callWithRetry(() => bot().deleteMessage(chatId, messageId)));
}

function sendDocument(chatId, document, options = {}, fileOptions = {}) {
  return enqueue(() => callWithRetry(() => bot().sendDocument(chatId, document, options, fileOptions)));
}

module.exports = { init, setThreadContext, sendMessage, editMessageText, deleteMessage, sendDocument };
