import * as SecureStore from 'expo-secure-store';
import { API_BASE } from '../config';

const BASE         = API_BASE;
const ACCESS_KEY   = 'bp_access_token';
const REFRESH_KEY  = 'bp_refresh_token';
const USER_KEY     = 'bp_user';

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  user_id?: string;
  email?: string;
}

export interface StoredUser {
  id: string;
  email: string;
}

export interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

let _onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(fn: () => void): void {
  _onSessionExpired = fn;
}

// ── Central interceptor hooks (#11/#15) ──────────────────────────────────────
// Request interceptors run before every authFetch call.
// Response interceptors run after (with raw Response + status).

type RequestInterceptor  = (url: string, options: RequestOptions) => void;
type ResponseInterceptor = (url: string, status: number, ok: boolean) => void;

const _reqInterceptors:  RequestInterceptor[]  = [];
const _resInterceptors:  ResponseInterceptor[] = [];

export function addRequestInterceptor(fn: RequestInterceptor):  () => void {
  _reqInterceptors.push(fn);
  return () => { const i = _reqInterceptors.indexOf(fn); if (i >= 0) _reqInterceptors.splice(i, 1); };
}
export function addResponseInterceptor(fn: ResponseInterceptor): () => void {
  _resInterceptors.push(fn);
  return () => { const i = _resInterceptors.indexOf(fn); if (i >= 0) _resInterceptors.splice(i, 1); };
}

// ── Central API adapter (#11) ─────────────────────────────────────────────────
// All UI layers call this (via v4Api.req() → authFetch) so any cross-cutting
// concern (logging, error normalisation, metrics) has one entry point.

export interface ApiError {
  status:  number;
  message: string;
  detail?: unknown;
}

export function isApiError(err: unknown): err is ApiError {
  return typeof err === 'object' && err !== null && 'status' in err;
}

export async function saveTokens({ access_token, refresh_token, user_id, email }: AuthTokens): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, access_token),
    refresh_token ? SecureStore.setItemAsync(REFRESH_KEY, refresh_token) : Promise.resolve(),
    SecureStore.setItemAsync(USER_KEY, JSON.stringify({ id: user_id, email })),
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_KEY);
}

export async function getStoredUser(): Promise<StoredUser | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
  ]);
}

async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || `Fehler ${res.status}`);
  return data as T;
}

export async function registerUser(email: string, password: string): Promise<AuthTokens> {
  const data = await post<AuthTokens>('/auth/register', { email, password });
  await saveTokens(data);
  return data;
}

export async function loginUser(email: string, password: string): Promise<AuthTokens> {
  const data = await post<AuthTokens>('/auth/login', { email, password });
  await saveTokens(data);
  return data;
}

// Mutex: a single in-flight refresh promise shared across all concurrent callers.
// Without this, N requests expiring simultaneously all race to refresh and
// the first one wins while the others all get a fresh token from the same old refresh_token — causing chaos.
let _refreshInFlight: Promise<AuthTokens> | null = null;

export async function refreshTokens(): Promise<AuthTokens> {
  if (_refreshInFlight) return _refreshInFlight;   // piggyback on the in-flight request
  _refreshInFlight = (async () => {
    const refresh_token = await SecureStore.getItemAsync(REFRESH_KEY);
    if (!refresh_token) throw new Error('Kein Refresh-Token');
    const data = await post<AuthTokens>('/auth/refresh', { refresh_token });
    await saveTokens(data);
    return data;
  })().finally(() => { _refreshInFlight = null; });
  return _refreshInFlight;
}

export async function forgotPassword(email: string): Promise<unknown> {
  return post('/auth/forgot-password', { email });
}

export async function resetPassword(reset_token: string, new_password: string): Promise<void> {
  const res = await fetch(`${BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reset_token, new_password }),
  });
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Fehler ${res.status}`);
  }
}

export async function logoutUser(): Promise<void> {
  const token = await getAccessToken();
  if (token) {
    fetch(`${BASE}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null);
  }
  await clearTokens();
}

// ── Concurrency semaphore (#20) — max 6 parallel requests ────────────────────
const MAX_CONCURRENT = 6;
let   _active        = 0;
const _queue: Array<() => void> = [];

function _acquire(): Promise<void> {
  if (_active < MAX_CONCURRENT) { _active++; return Promise.resolve(); }
  return new Promise(resolve => _queue.push(resolve));
}
function _release(): void {
  _active--;
  const next = _queue.shift();
  if (next) { _active++; next(); }
}

export async function authFetch(url: string, options: RequestOptions = {}): Promise<Response> {
  // Run request interceptors (#15)
  _reqInterceptors.forEach(fn => fn(url, options));

  await _acquire();

  let token = await getAccessToken();

  const doRequest = (t: string | null) => fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${t}` },
  });

  let res = await doRequest(token);

  // Run response interceptors (#15)
  _resInterceptors.forEach(fn => fn(url, res.status, res.ok));

  if (res.status === 401) {
    try {
      const refreshed = await refreshTokens();
      token = refreshed.access_token;
      res = await doRequest(token);
    } catch {
      await clearTokens();
      _release();
      if (_onSessionExpired) _onSessionExpired();
      throw new Error('SESSION_EXPIRED');
    }
  }
  _release();
  return res;
}
