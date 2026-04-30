import { authFetch } from '@/services/authService';
import { API_BASE } from '@/config';

export const BASE = API_BASE;

type HttpMethod = 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH';

const DEFAULT_TIMEOUT_MS = 15_000;

export async function req<T = unknown>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  isForm = false,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const opts: RequestInit & { headers: Record<string, string> } = {
    method,
    headers: {},
    signal: controller.signal,
  };
  if (body) {
    if (isForm) {
      opts.body = body as FormData;
    } else {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }

  try {
    const res = await authFetch(`${BASE}${path}`, opts);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`V4 API ${res.status}: ${err}`);
    }
    return res.json() as Promise<T>;
  } catch (err: any) {
    if (err?.name === 'AbortError') throw new Error(`V4 API timeout after ${timeoutMs}ms: ${path}`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
