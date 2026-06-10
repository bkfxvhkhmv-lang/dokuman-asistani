#!/usr/bin/env node
/**
 * Creates AUTH_SMOKE user when signUp quota allows; never logs secrets.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
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

function setEnvKeys(path, updates) {
  let lines = existsSync(path) ? readFileSync(path, 'utf8').split('\n') : [];
  const keys = new Set(Object.keys(updates));
  const kept = [];
  for (const line of lines) {
    const t = line.trim();
    if (t && !t.startsWith('#') && t.includes('=')) {
      const k = t.split('=')[0].trim();
      if (keys.has(k)) continue;
    }
    kept.push(line);
  }
  while (kept.length && kept[kept.length - 1] === '') kept.pop();
  for (const [k, v] of Object.entries(updates)) kept.push(`${k}=${v}`);
  writeFileSync(path, kept.join('\n') + '\n');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

loadEnv(envPath);
const url = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
const anon = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
let email = (process.env.AUTH_SMOKE_EMAIL ?? '').trim();
let password = (process.env.AUTH_SMOKE_PASSWORD ?? '').trim();

if (email && password) {
  console.log(JSON.stringify({ setup: 'SKIP', reason: 'AUTH_SMOKE already set' }));
  process.exit(0);
}

if (!url || !anon) {
  console.log(JSON.stringify({ setup: 'FAIL', reason: 'missing supabase env' }));
  process.exit(1);
}

const supabase = createClient(url, anon, { auth: { persistSession: false } });
const maxAttempts = Number(process.env.AUTH_SMOKE_SETUP_ATTEMPTS ?? 20);
const delayMs = Number(process.env.AUTH_SMOKE_SETUP_DELAY_MS ?? 180_000);

email = `bpsmoke.${randomUUID()}@example.com`;
password = `Smoke_${randomUUID().slice(0, 12)}_Aa1`;

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  const reg = await supabase.auth.signUp({ email, password });
  if (!reg.error && reg.data.session) {
    setEnvKeys(envPath, { AUTH_SMOKE_EMAIL: email, AUTH_SMOKE_PASSWORD: password });
    console.log(JSON.stringify({ setup: 'PASS', attempt, session: true }));
    process.exit(0);
  }
  const msg = reg.error?.message ?? 'no session';
  if (msg.includes('rate limit') && attempt < maxAttempts) {
    console.log(JSON.stringify({ setup: 'WAIT', attempt, reason: 'email rate limit', next_retry_sec: delayMs / 1000 }));
    await sleep(delayMs);
    continue;
  }
  console.log(JSON.stringify({ setup: 'FAIL', attempt, reason: msg }));
  process.exit(1);
}
