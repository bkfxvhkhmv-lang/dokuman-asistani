#!/usr/bin/env node
/**
 * Local Supabase auth smoke — anon key only. Never logs secrets.
 * Usage: node scripts/authSmokeSupabase.mjs
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

const results = {
  env_url: url ? 'PASS' : 'FAIL',
  env_anon: anon ? 'PASS' : 'FAIL',
  register: 'FAIL',
  login: 'FAIL',
  logout: 'FAIL',
  session_persistence: 'FAIL',
};

if (!url || !anon) {
  console.log(JSON.stringify(results, null, 2));
  process.exit(1);
}

const supabase = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const email = `bpsmoke.${Date.now()}@mailinator.com`;
const password = `Smoke_${Date.now()}_Aa1`;

try {
  const reg = await supabase.auth.signUp({ email, password });
  if (reg.error) {
    results.register = 'FAIL';
  } else if (reg.data.session) {
    results.register = 'PASS';
  } else if (reg.data.user) {
    // email confirm required — config reachable
    results.register = 'PASS';
  }

  const login = await supabase.auth.signInWithPassword({ email, password });
  if (login.error) {
    results.login = 'FAIL';
  } else if (login.data.session) {
    results.login = 'PASS';
    const uid = login.data.session.user.id;
    const sess1 = await supabase.auth.getSession();
    results.session_persistence =
      sess1.data.session?.user?.id === uid ? 'PASS' : 'FAIL';
  } else {
    results.login = 'FAIL';
  }

  await supabase.auth.signOut();
  const sess2 = await supabase.auth.getSession();
  results.logout = sess2.data.session ? 'FAIL' : 'PASS';
} catch {
  // keep FAIL defaults
}

console.log(JSON.stringify(results, null, 2));
const allPass = Object.values(results).every((v) => v === 'PASS');
process.exit(allPass ? 0 : 1);
