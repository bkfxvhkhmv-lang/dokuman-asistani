/**
 * UISoundService — micro UI sounds via expo-av.
 *
 * Sounds are generated as inline base64 WAV (8kHz, 8-bit mono, ~15ms).
 * No external audio assets needed.
 *
 * Falls back silently if expo-av is unavailable or audio session fails.
 */

import * as Haptics from 'expo-haptics';

// ── Minimal WAV builder ──────────────────────────────────────────────────────

function buildWav(samples: Uint8Array, sampleRate = 8000): string {
  const dataLen   = samples.length;
  const totalLen  = 44 + dataLen;
  const buf       = new ArrayBuffer(totalLen);
  const view      = new DataView(buf);

  const setStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  const setU16 = (o: number, v: number) => view.setUint16(o, v, true);
  const setU32 = (o: number, v: number) => view.setUint32(o, v, true);

  // RIFF header
  setStr(0, 'RIFF');  setU32(4, totalLen - 8);
  setStr(8, 'WAVE');
  setStr(12, 'fmt '); setU32(16, 16);
  setU16(20, 1);      // PCM
  setU16(22, 1);      // mono
  setU32(24, sampleRate);
  setU32(28, sampleRate * 1);
  setU16(32, 1);      // block align
  setU16(34, 8);      // bits per sample
  setStr(36, 'data'); setU32(40, dataLen);

  for (let i = 0; i < dataLen; i++) view.setUint8(44 + i, samples[i]);

  // ArrayBuffer → base64
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  // btoa is available in Hermes (RN 0.64+) and modern JSC
  return typeof btoa === 'function' ? btoa(binary) : '';
}

// ── Sound profiles ──────────────────────────────────────────────────────────

function makeTick(): string {
  // 15ms @ 8kHz = 120 samples — short 1.2kHz sine burst with fast decay
  const n = 120;
  const samples = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const t     = i / 8000;
    const env   = Math.exp(-t * 280);                           // decay envelope
    const sine  = Math.sin(2 * Math.PI * 1200 * t);            // 1.2 kHz
    samples[i]  = Math.round(127 + 55 * sine * env);
  }
  return buildWav(samples);
}

function makeSuccess(): string {
  // 30ms @ 8kHz — two-tone "ding" (800Hz + 1600Hz) with smooth fade
  const n = 240;
  const samples = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const t    = i / 8000;
    const env  = Math.exp(-t * 120);
    const tone = Math.sin(2 * Math.PI * 800  * t) * 0.6
               + Math.sin(2 * Math.PI * 1600 * t) * 0.4;
    samples[i] = Math.round(127 + 48 * tone * env);
  }
  return buildWav(samples);
}

// ── Lazy Sound loader ───────────────────────────────────────────────────────

interface SoundEntry {
  b64:    string;
  object: any;  // expo-av Sound
}

const _cache: Map<string, SoundEntry> = new Map();
let _Audio: any = null;

async function getAudio() {
  if (_Audio) return _Audio;
  try {
    const av = await import('expo-av');
    _Audio = av.Audio;
  } catch { /* expo-av unavailable */ }
  return _Audio;
}

async function loadSound(key: string, b64: string): Promise<any | null> {
  const existing = _cache.get(key);
  if (existing?.object) return existing.object;

  const Audio = await getAudio();
  if (!Audio) return null;

  try {
    const { sound } = await Audio.Sound.createAsync(
      { uri: `data:audio/wav;base64,${b64}` },
      { volume: 0.35, shouldPlay: false },
    );
    _cache.set(key, { b64, object: sound });
    return sound;
  } catch { return null; }
}

// ── Lazily-generated WAV data ───────────────────────────────────────────────

let _tickB64:    string | null = null;
let _successB64: string | null = null;

function getTickB64(): string {
  if (!_tickB64) _tickB64 = makeTick();
  return _tickB64;
}

function getSuccessB64(): string {
  if (!_successB64) _successB64 = makeSuccess();
  return _successB64;
}

// ── Quiet hours (20:00–08:00) — mute audio, keep haptics ───────────────────

function isQuietHours(): boolean {
  const h = new Date().getHours();
  return h >= 20 || h < 8;
}

// ── Public API ───────────────────────────────────────────────────────────────

export const UISoundService = {
  async tick() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isQuietHours()) return;
    const sound = await loadSound('tick', getTickB64());
    try { await sound?.replayAsync(); } catch {}
  },

  async success() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (isQuietHours()) return;
    const sound = await loadSound('success', getSuccessB64());
    try { await sound?.replayAsync(); } catch {}
  },

  /**
   * Dismiss — modal swipe-down, drawer close.
   * Haptic only (sub-perceptual visual events don't need audio).
   */
  dismiss() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  /**
   * Error — validation fail, network error.
   */
  error() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },
};
