const DEFAULT_LOCAL_API_URL = 'http://127.0.0.1:8000';
const TOKEN_KEY = 'apipulse_access_token';
const viteEnvironment = import.meta.env || {};

export function resolveApiBaseUrl(environment = {}) {
  let configured = environment.VITE_API_BASE_URL?.trim();
  if (configured) {
    while (configured.endsWith('/')) configured = configured.slice(0, -1);
    return configured;
  }
  return environment.PROD ? '' : DEFAULT_LOCAL_API_URL;
}
export const API_BASE_URL = resolveApiBaseUrl(viteEnvironment);

export function getAccessToken() {
  try { return typeof window === 'undefined' ? null : window.sessionStorage.getItem(TOKEN_KEY); }
  catch { return null; }
}
export function setAccessToken(token) {
  try {
    if (typeof window === 'undefined') return;
    if (token) window.sessionStorage.setItem(TOKEN_KEY, token);
    else window.sessionStorage.removeItem(TOKEN_KEY);
  } catch { /* browser policy may prevent session storage */ }
}
export function clearAccessToken() { setAccessToken(null); }

export class ApiError extends Error {
  constructor(message, status = 0, detail = null) {
    super(message); this.name = 'ApiError'; this.status = status; this.detail = detail;
  }
}

async function request(path, { method = 'GET', body, signal, auth = true } = {}) {
  if (!API_BASE_URL) throw new ApiError('Backend URL is not configured. Set VITE_API_BASE_URL to a browser-accessible HTTPS FastAPI origin.');

  const headers = { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) };
  const token = auth ? getAccessToken() : null;
  if (token) headers.Authorization = 'Bearer ' + token;

  let response;
  try {
    response = await fetch(API_BASE_URL + path, {
      method, signal, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('Could not reach the ApiPulse backend at ' + API_BASE_URL + '. Check that FastAPI is running and CORS allows this frontend origin.');
  }

  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') || '';
  let payload = null;
  if (contentType.includes('application/json')) {
    try { payload = await response.json(); } catch { payload = null; }
  } else {
    payload = (await response.text().catch(() => '')) || null;
  }

  if (!response.ok) {
    const detail = payload && typeof payload === 'object' ? payload.detail : null;
    const message = typeof detail === 'string'
      ? detail
      : Array.isArray(detail)
        ? detail.map((item) => item.msg || item.message || JSON.stringify(item)).join(', ')
        : ('Request failed (' + response.status + ' ' + (response.statusText || '') + ')').trim();
    if (response.status === 401 && path !== '/auth/login' && path !== '/auth/register') {
      clearAccessToken();
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new Event('apipulse:unauthorized'));
      }
    }
    throw new ApiError(message, response.status, detail);
  }
  return payload;
}

const targetPath = (targetId) => '/target/' + encodeURIComponent(targetId);
export const api = {
  getHealth: () => request('/health'),
  registerUser: (user) => request('/auth/register', { method: 'POST', body: user, auth: false }),
  login: (user) => request('/auth/login', { method: 'POST', body: user, auth: false }),
  getCurrentUser: () => request('/auth/me'),
  getTargets: () => request('/target/'),
  getTarget: (targetId) => request(targetPath(targetId)),
  createTarget: (target) => request('/target/', { method: 'POST', body: target }),
  updateTarget: (targetId, target) => request(targetPath(targetId), { method: 'PUT', body: target }),
  deleteTarget: (targetId) => request(targetPath(targetId), { method: 'DELETE' }),
  checkTarget: (targetId) => request(targetPath(targetId) + '/check', { method: 'POST' }),
  getTargetHistory: async (targetId) => {
    const path = targetPath(targetId) + '/history';
    try { return await request(path); }
    catch (error) {
      if (error instanceof ApiError && error.status === 405) return request(path, { method: 'POST' });
      throw error;
    }
  },
  getTargetStats: (targetId) => request(targetPath(targetId) + '/stats'),
};
