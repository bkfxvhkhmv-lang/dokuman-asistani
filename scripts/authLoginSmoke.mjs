#!/usr/bin/env node
/**
 * Login-only Supabase smoke (Dashboard Add user + auto confirm).
 * Reads AUTH_SMOKE_EMAIL / AUTH_SMOKE_PASSWORD from .env.development — never logs values.
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env.development');

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i <= 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env) || !process.env[k]) process.env[k] = v;
  }
}

loadEnv(envPath);

const url = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
const anon = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
const email = (process.env.AUTH_SMOKE_EMAIL ?? '').trim();
const password = (process.env.AUTH_SMOKE_PASSWORD ?? '').trim();

const results = {
  env_supabase: url && anon ? 'PASS' : 'FAIL',
  env_smoke_creds: email && password ? 'PASS' : 'FAIL',
  signInWithPassword: 'FAIL',
  session_token: 'FAIL',
  saveTokens_bridge: 'FAIL',
  logout: 'FAIL',
  session_persistence: 'FAIL',
};

if (!url || !anon || !email || !password) {
  console.log(JSON.stringify(results, null, 2));
  process.exit(1);
}

const supabase = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function looksLikeJwt(s) {
  return typeof s === 'string' && s.split('.').length === 3 && s.length > 20;
}

try {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    results.signInWithPassword = 'FAIL';
  } else if (data.session) {
    results.signInWithPassword = 'PASS';
    const { access_token, refresh_token, user } = data.session;
    results.session_token = looksLikeJwt(access_token) ? 'PASS' : 'FAIL';

    // Mirrors authService.loginUser → saveTokens + setSupabaseAccessToken inputs
    const tokens = {
      access_token,
      refresh_token,
      user_id: user?.id,
      email: user?.email,
    };
    results.saveTokens_bridge =
      looksLikeJwt(tokens.access_token) &&
      !!tokens.refresh_token &&
      !!tokens.user_id &&
      !!tokens.email
        ? 'PASS'
        : 'FAIL';

    const uid = user.id;
    const sess1 = await supabase.auth.getSession();
    results.session_persistence =
      sess1.data.session?.user?.id === uid ? 'PASS' : 'FAIL';

    await supabase.auth.signOut();
    const sess2 = await supabase.auth.getSession();
    results.logout = sess2.data.session ? 'FAIL' : 'PASS';
  }
} catch {
  /* keep FAIL */
}

console.log(JSON.stringify(results, null, 2));
const loginChain = [
  'env_supabase',
  'env_smoke_creds',
  'signInWithPassword',
  'session_token',
  'saveTokens_bridge',
  'logout',
  'session_persistence',
].every((k) => results[k] === 'PASS');
process.exit(loginChain ? 0 : 1);
