#!/usr/bin/env node
/**
 * Prod öncesi: EXPO_PUBLIC_SUPABASE_URL yüklüyken extra.supabaseUrl dolu mu doğrular.
 *
 *   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co npm run verify:supabase-extra
 *
 * .env kullanıyorsan: aynı kabukta `export $(grep -v '^#' .env | xargs)` veya `set -a; source .env; set +a`
 * (Linux/macOS) ile env’i yükle sonra bu script’i çalıştır.
 */
const { execSync } = require('child_process');
const path = require('path');

process.chdir(path.join(__dirname, '..'));

let out;
try {
  out = execSync('npx expo config --json', {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (e) {
  console.error('[verify] `npx expo config --json` başarısız:', e.message);
  process.exit(1);
}

let cfg;
try {
  cfg = JSON.parse(out);
} catch {
  console.error('[verify] expo config çıktısı JSON değil');
  process.exit(1);
}

const urlRaw = cfg.extra?.supabaseUrl ?? cfg.expo?.extra?.supabaseUrl;
const url = typeof urlRaw === 'string' ? urlRaw.trim() : '';

if (!url) {
  console.error(`[verify] extra.supabaseUrl boş — frontend env hattı eksik.
  Örn: EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co npm run verify:supabase-extra`);
  process.exit(1);
}

if (!/^https:\/\/.+/i.test(url)) {
  console.warn('[verify] Uyarı: Supabase kök URL için https:// önerilir:', url);
}

console.log('[verify] OK  extra.supabaseUrl =', url);
process.exit(0);
