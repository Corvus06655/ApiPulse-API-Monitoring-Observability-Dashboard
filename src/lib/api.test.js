import test from 'node:test';
import assert from 'node:assert/strict';
import { api, API_BASE_URL, ApiError, resolveApiBaseUrl, setAccessToken, clearAccessToken } from './api.js';

function jsonResponse(status, value) {
  return new Response(value === null ? null : JSON.stringify(value), {
    status,
    headers: value === null ? {} : { 'Content-Type': 'application/json' },
  });
}

function stubFetch(t, handler) {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => handler(String(url), options);
  t.after(() => { globalThis.fetch = original; });
}

test('uses localhost only for development and never as an implicit production API', () => {
  assert.equal(resolveApiBaseUrl({ DEV: true }), 'http://127.0.0.1:8000');
  assert.equal(resolveApiBaseUrl({ PROD: true }), '');
  assert.equal(resolveApiBaseUrl({ PROD: true, VITE_API_BASE_URL: ' https://api.example.com/ ' }), 'https://api.example.com');
});

test('uses configured backend base URL and GET /health for health', async (t) => {
  let call;
  stubFetch(t, async (url, options) => { call = { url, options }; return jsonResponse(200, { status: 'running' }); });
  assert.deepEqual(await api.getHealth(), { status: 'running' });
  assert.equal(call.url, `${API_BASE_URL}/health`);
  assert.equal(call.options.method, 'GET');
});

test('lists targets with GET /target/', async (t) => {
  let call;
  stubFetch(t, async (url, options) => { call = { url, options }; return jsonResponse(200, []); });
  assert.deepEqual(await api.getTargets(), []);
  assert.equal(call.url, `${API_BASE_URL}/target/`);
  assert.equal(call.options.method, 'GET');
});

test('creates and updates target JSON using POST and PUT', async (t) => {
  const calls = [];
  stubFetch(t, async (url, options) => { calls.push({ url, options }); return jsonResponse(200, { id: 4 }); });
  await api.createTarget({ name: 'Payments', url: 'https://pay.example' });
  await api.updateTarget(4, { name: 'Billing', url: 'https://billing.example' });
  assert.equal(calls[0].url, `${API_BASE_URL}/target/`);
  assert.equal(calls[0].options.method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].options.body), { name: 'Payments', url: 'https://pay.example' });
  assert.equal(calls[1].url, `${API_BASE_URL}/target/4`);
  assert.equal(calls[1].options.method, 'PUT');
  assert.deepEqual(JSON.parse(calls[1].options.body), { name: 'Billing', url: 'https://billing.example' });
});

test('gets target details and statistics with GET', async (t) => {
  const calls = [];
  stubFetch(t, async (url, options) => { calls.push({ url, options }); return jsonResponse(200, { id: 8 }); });
  await api.getTarget(8);
  await api.getTargetStats(8);
  assert.deepEqual(calls.map(({ url, options }) => [url, options.method]), [
    [`${API_BASE_URL}/target/8`, 'GET'],
    [`${API_BASE_URL}/target/8/stats`, 'GET'],
  ]);
});

test('runs a manual check with POST and deletes with DELETE', async (t) => {
  const calls = [];
  stubFetch(t, async (url, options) => {
    calls.push({ url, options });
    return options.method === 'DELETE' ? new Response(null, { status: 204 }) : jsonResponse(200, { is_healthy: true });
  });
  assert.deepEqual(await api.checkTarget(3), { is_healthy: true });
  assert.equal(await api.deleteTarget(3), null);
  assert.deepEqual(calls.map(({ url, options }) => [url, options.method]), [
    [`${API_BASE_URL}/target/3/check`, 'POST'],
    [`${API_BASE_URL}/target/3`, 'DELETE'],
  ]);
});

test('reads history from documented GET route when available', async (t) => {
  let call;
  stubFetch(t, async (url, options) => { call = { url, options }; return jsonResponse(200, { history: [] }); });
  assert.deepEqual(await api.getTargetHistory(5), { history: [] });
  assert.equal(call.url, `${API_BASE_URL}/target/5/history`);
  assert.equal(call.options.method, 'GET');
});

test('falls back to the supplied backend POST history method on 405', async (t) => {
  const calls = [];
  stubFetch(t, async (url, options) => {
    calls.push({ url, options });
    return options.method === 'GET' ? jsonResponse(405, { detail: 'Method Not Allowed' }) : jsonResponse(200, { history: [] });
  });
  assert.deepEqual(await api.getTargetHistory(5), { history: [] });
  assert.deepEqual(calls.map(({ url, options }) => [url, options.method]), [
    [`${API_BASE_URL}/target/5/history`, 'GET'],
    [`${API_BASE_URL}/target/5/history`, 'POST'],
  ]);
});

test('turns FastAPI JSON detail into a readable ApiError', async (t) => {
  stubFetch(t, async () => jsonResponse(404, { detail: 'Target not found' }));
  await assert.rejects(api.getTarget(999), (error) => error instanceof ApiError && error.status === 404 && error.message === 'Target not found');
});


test('login sends JSON credentials without an auth header', async (t) => {
  let call;
  stubFetch(t, async (url, options) => { call = { url, options }; return jsonResponse(200, { access_token: 'signed-token', token_type: 'bearer' }); });
  const result = await api.login({ email: 'person@example.com', password: 'Password123!' });
  assert.equal(call.url, API_BASE_URL + '/auth/login');
  assert.equal(call.options.method, 'POST');
  assert.deepEqual(JSON.parse(call.options.body), { email: 'person@example.com', password: 'Password123!' });
  assert.equal(call.options.headers.Authorization, undefined);
  assert.equal(result.access_token, 'signed-token');
});

test('attaches the session token to protected requests', async (t) => {
  const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const values = new Map();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { sessionStorage: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  } } });
  t.after(() => {
    clearAccessToken();
    if (originalWindowDescriptor) Object.defineProperty(globalThis, 'window', originalWindowDescriptor);
    else delete globalThis.window;
  });
  setAccessToken('signed-token');
  let call;
  stubFetch(t, async (url, options) => { call = { url, options }; return jsonResponse(200, { email: 'person@example.com' }); });
  await api.getCurrentUser();
  assert.equal(call.url, API_BASE_URL + '/auth/me');
  assert.equal(call.options.headers.Authorization, 'Bearer signed-token');
});
