// Determina la URL base de la API según el dominio del frontend:
// - vault.eirl.pe → llamada directa a apivault.eirl.pe (mismo dominio raíz, cookies OK)
// - vault.idema.edu.pe → usa rewrites de Next.js (proxy, evita cookies cross-domain)
// - localhost → usa NEXT_PUBLIC_API_URL o localhost:8000
function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'vault.eirl.pe') {
      return 'https://apivault.eirl.pe';
    }
    if (host === 'localhost' || host === '127.0.0.1') {
      return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    }
    // Cualquier otro dominio (vault.idema.edu.pe, etc.) → rewrites del mismo dominio
    return '';
  }
  return process.env.NEXT_PUBLIC_API_URL || '';
}

const API_URL = getApiBaseUrl();

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

interface ApiError {
  status: number;
  data: unknown;
}

let isRefreshing = false;

async function tryRefreshToken(): Promise<boolean> {
  if (isRefreshing) return false;
  isRefreshing = true;
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh/`, {
      method: 'POST',
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    isRefreshing = false;
  }
}

export async function api<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const config: RequestInit = {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  let response = await fetch(`${API_URL}${endpoint}`, config);

  // Token expirado — intentar renovar y reintentar una vez
  if (response.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      response = await fetch(`${API_URL}${endpoint}`, config);
    } else {
      window.location.href = '/login';
      throw { status: 401, data: {} } as ApiError;
    }
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw { status: response.status, data } as ApiError;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}
