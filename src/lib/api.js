const DEFAULT_LOCAL_API_URL = 'http://127.0.0.1:8000';
const viteEnvironment = import.meta.env || {};

export function resolveApiBaseUrl(environment = {}) {
  const configured = environment.VITE_API_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  return environment.PROD ? '' : DEFAULT_LOCAL_API_URL;
}

export const API_BASE_URL = resolveApiBaseUrl(viteEnvironment);

export class ApiError extends Error {
  constructor(message, status = 0, detail = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  if (!API_BASE_URL) {
    throw new ApiError('Backend URL is not configured. Set VITE_API_BASE_URL to a browser-accessible HTTPS FastAPI origin.');
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError(`Could not reach the ApiPulse backend at ${API_BASE_URL}. Check that FastAPI is running and CORS allows this frontend origin.`);
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get('content-type') || '';
  let payload = null;
  if (contentType.includes('application/json')) {
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
  } else {
    const text = await response.text().catch(() => '');
    payload = text || null;
  }

  if (!response.ok) {
    const detail = payload && typeof payload === 'object' ? payload.detail : null;
    const message = typeof detail === 'string'
      ? detail
      : Array.isArray(detail)
        ? detail.map((item) => item.msg || item.message || JSON.stringify(item)).join(', ')
        : `Request failed (${response.status} ${response.statusText || ''})`.trim();
    throw new ApiError(message, response.status, detail);
  }

  return payload;
}

const targetPath = (targetId) => `/target/${encodeURIComponent(targetId)}`;

export const api = {
  getHealth: () => request('/'),
  getTargets: () => request('/target/'),
  getTarget: (targetId) => request(targetPath(targetId)),
  createTarget: (target) => request('/target/', { method: 'POST', body: target }),
  updateTarget: (targetId, target) => request(targetPath(targetId), { method: 'PUT', body: target }),
  deleteTarget: (targetId) => request(targetPath(targetId), { method: 'DELETE' }),
  checkTarget: (targetId) => request(`${targetPath(targetId)}/check`, { method: 'POST' }),
  getTargetHistory: async (targetId) => {
    const path = `${targetPath(targetId)}/history`;
    try {
      return await request(path);
    } catch (error) {
      // The supplied source defines this read route as POST; newer/corrected backends use GET.
      if (error instanceof ApiError && error.status === 405) {
        return request(path, { method: 'POST' });
      }
      throw error;
    }
  },
  getTargetStats: (targetId) => request(`${targetPath(targetId)}/stats`),
};
