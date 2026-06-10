#!/usr/bin/env node
/**
 * Pixel 9 Pro scanner AC-1..AC-7 smoke helper (best-effort automation).
 * Captures screenshots + UI dumps under qa-artifacts/scanner-lifecycle/
 */
import { execSync, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Device & coordinate defaults are Pixel 9 Pro specific.
// Override serial via ADB_DEVICE env var; tap coordinates may need adjustment on other devices.
const DEVICE = process.env.ADB_DEVICE ?? '53271FDAP001ER';
const PKG = 'com.briefpilot.app';
const OUT = join(process.cwd(), 'qa-artifacts/scanner-lifecycle');
const LOG = join(OUT, 'logs', 'logcat.txt');

mkdirSync(join(OUT, 'logs'), { recursive: true });

const results = [];

function adb(...args) {
  return execSync(['adb', '-s', DEVICE, ...args].join(' '), { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
}

function sleep(ms) {
  execSync(`sleep ${(ms / 1000).toFixed(2)}`, { stdio: 'ignore' });
}

function shot(id) {
  const path = join(OUT, `${id}.png`);
  adb(`exec-out screencap -p > "${path}"`);
  return path;
}

function dump(id) {
  adb('shell uiautomator dump /sdcard/ui.xml');
  const local = join(OUT, 'logs', `${id}.xml`);
  adb(`pull /sdcard/ui.xml "${local}"`);
  return local;
}

function parseBounds(text) {
  const xml = readFileSync(text === 'last' ? join(OUT, 'logs', '_last.xml') : text, 'utf8');
  writeFileSync(join(OUT, 'logs', '_last.xml'), xml);
  return xml;
}

function findNode(xml, { text, contains, desc }) {
  const re = /<node[^>]*>/g;
  let m;
  while ((m = re.exec(xml))) {
    const node = m[0];
    const t = /text="([^"]*)"/.exec(node)?.[1] ?? '';
    const d = /content-desc="([^"]*)"/.exec(node)?.[1] ?? '';
    const b = /bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(node);
    if (!b) continue;
    const hit =
      (text && t === text) ||
      (contains && (t.includes(contains) || d.includes(contains))) ||
      (desc && d === desc);
    if (hit) {
      const x = Math.floor((+b[1] + +b[3]) / 2);
      const y = Math.floor((+b[2] + +b[4]) / 2);
      return { x, y, text: t || d, bounds: b[0] };
    }
  }
  return null;
}

function tap(x, y) {
  adb(`shell input tap ${x} ${y}`);
}

function tapText(label, { contains = false } = {}) {
  const xmlPath = dump('tap-search');
  const xml = parseBounds(xmlPath);
  const node = findNode(xml, contains ? { contains: label } : { text: label });
  if (!node) return false;
  tap(node.x, node.y);
  return true;
}

function back() {
  adb('shell input keyevent 4');
}

function launchApp() {
  adb('shell am force-stop ' + PKG);
  sleep(800);
  adb(`shell monkey -p ${PKG} -c android.intent.category.LAUNCHER 1`);
  sleep(3500);
}

function dismissCompatDialog() {
  for (let i = 0; i < 3; i++) {
    const xmlPath = dump('compat-check');
    const xml = parseBounds(xmlPath);
    const ok = findNode(xml, { text: 'OK' }) ?? findNode(xml, { contains: 'Kompatibilität' });
    if (findNode(xml, { text: 'OK' })) {
      tapText('OK');
      sleep(1200);
      return true;
    }
    if (findNode(xml, { contains: 'Dokument importieren' }) || findNode(xml, { contains: 'Dokument scannen' })) {
      return false;
    }
    sleep(500);
  }
  return false;
}

function goScanTab() {
  // Center FAB tab — coordinate fallback for Pixel 9 Pro (~540, ~2200)
  if (!tapText('Scan', { contains: true })) {
    tap(540, 2220);
  }
  sleep(2000);
}

function onUploadScreen() {
  const xmlPath = dump('upload-check');
  const xml = parseBounds(xmlPath);
  return !!(
    findNode(xml, { contains: 'Dokument scannen' }) ||
    findNode(xml, { contains: 'Neues Dokument analysieren' }) ||
    findNode(xml, { contains: 'Dokument importieren' })
  );
}

function record(ac, pass, note, screenshot) {
  results.push({ ac, pass, note, screenshot });
  writeFileSync(join(OUT, 'results.json'), JSON.stringify(results, null, 2));
  console.log(`${ac}: ${pass ? 'PASS' : 'FAIL'} — ${note}${screenshot ? ` (${screenshot})` : ''}`);
  if (!pass) {
    try {
      execSync(`adb -s ${DEVICE} logcat -d -t 200 > "${LOG}"`, { stdio: 'ignore' });
    } catch {}
    process.exitCode = 1;
    throw new Error(`Stopped at ${ac}`);
  }
}

try {
  execSync(`adb -s ${DEVICE} reverse tcp:8081 tcp:8081`, { stdio: 'ignore' });
  adb('logcat -c');

  launchApp();
  dismissCompatDialog();
  goScanTab();

  if (!onUploadScreen()) {
    shot('00-not-on-upload');
    record('SETUP', false, 'Could not reach Scan/Upload screen', join(OUT, '00-not-on-upload.png'));
  }
  shot('00-baseline-upload');
  console.log('SETUP: on Upload screen');

  // AC-1
  tapText('Dokument scannen', { contains: true }) || tap(540, 900);
  sleep(2500);
  shot('ac1-scanner-open');
  back();
  sleep(2000);
  shot('ac1-after-back');
  record('AC-1', onUploadScreen(), onUploadScreen() ? 'Upload box visible after hardware back' : 'Upload box not detected', join(OUT, 'ac1-after-back.png'));

  // AC-2 — open scanner again, back as OS dismiss proxy
  tapText('Dokument scannen', { contains: true }) || tap(540, 900);
  sleep(2500);
  back();
  sleep(2000);
  shot('ac2-after-dismiss');
  record('AC-2', onUploadScreen(), 'OS dismiss via BACK proxy (ML Kit close not isolated)', join(OUT, 'ac2-after-dismiss.png'));

  // AC-5
  tapText('Datei auswählen', { contains: true }) || tap(270, 1200);
  sleep(2000);
  back();
  sleep(1500);
  shot('ac5-after-file-cancel');
  record('AC-5', onUploadScreen(), 'After file picker back/cancel', join(OUT, 'ac5-after-file-cancel.png'));

  // AC-6
  tapText('Aus Fotos', { contains: true }) || tap(810, 1200);
  sleep(2000);
  back();
  sleep(1500);
  shot('ac6-after-photo-cancel');
  record('AC-6', onUploadScreen(), 'After photo library back/cancel', join(OUT, 'ac6-after-photo-cancel.png'));

  console.log('AC-3, AC-4, AC-7, S8 require manual ML Kit capture / OCR wait — marked BLOCKED in results');

  results.push(
    { ac: 'AC-3', pass: null, note: 'MANUAL/BLOCKED — requires live scan + OCR wait + lock observation', screenshot: null },
    { ac: 'AC-4', pass: null, note: 'MANUAL/BLOCKED — requires active OCR job', screenshot: null },
    { ac: 'AC-7', pass: null, note: 'MANUAL/BLOCKED — requires completed OCR result card', screenshot: null },
    { ac: 'S8', pass: null, note: 'MANUAL/BLOCKED — requires end-to-end OCR save', screenshot: null },
  );
  writeFileSync(join(OUT, 'results.json'), JSON.stringify(results, null, 2));
} catch (e) {
  console.error(e.message);
}
