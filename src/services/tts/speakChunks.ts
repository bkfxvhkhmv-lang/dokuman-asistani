import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';

const DEFAULT_CHUNK = 520;

function hardSplit(s: string, maxLength: number): string[] {
  const out: string[] = [];
  let rest = s.trim();
  while (rest.length > maxLength) {
    const head = rest.slice(0, maxLength);
    const ws = head.lastIndexOf(' ');
    const takeLen = ws > maxLength >> 2 ? ws : head.length;
    const take = rest.slice(0, takeLen);
    out.push(take.trim());
    rest = rest.slice(take.length).trim();
  }
  if (rest) out.push(rest);
  return out;
}

/** Cümle sınırlarına göre bloklar; gerekiyorsa kelime sınırında böler. */
export function splitTextIntoSpeechChunks(raw: string, maxLength = DEFAULT_CHUNK): string[] {
  const text = raw.replace(/\r\n/g, '\n').trim();
  if (!text) return [];

  const paragraphs = text.split(/\n+/).filter(Boolean);
  const sentences: string[] = [];
  for (const p of paragraphs) {
    const subs = p.split(/(?<=[.!?…])\s+/).filter(Boolean);
    sentences.push(...subs.map(s => s.trim()).filter(Boolean));
  }
  if (sentences.length === 0) return hardSplit(text, maxLength);

  const chunks: string[] = [];
  let current = '';

  for (let s of sentences) {
    if (s.length > maxLength) {
      if (current.trim()) {
        chunks.push(current.trim());
        current = '';
      }
      chunks.push(...hardSplit(s, maxLength));
      continue;
    }
    const merged = current ? `${current} ${s}` : s;
    if (merged.length > maxLength) {
      if (current.trim()) chunks.push(current.trim());
      current = s;
    } else {
      current = merged;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export interface SpeakChunksOptions {
  language: string;
  rate?: number;
  cancelledRef?: { current: boolean };
  /** Dışarıdan mevcut chunk promise'ini anında resolve etmek için kullanılır. */
  interruptRef?: { current: (() => void) | null };
}

/**
 * Blok sırayla okunur; `cancelledRef.current === true` veya `Speech.stop()` sonra döngü biter.
 * `interruptRef` ile mevcut chunk anında durdurulabilir (race condition olmadan).
 */
export async function speakChunksSequentially(
  chunks: string[],
  opts: SpeakChunksOptions,
): Promise<void> {
  const { language, rate = 0.9, cancelledRef, interruptRef } = opts;

  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false });
  } catch {}

  await Speech.stop();

  for (const chunk of chunks) {
    if (cancelledRef?.current) break;
    const c = chunk.trim();
    if (!c) continue;

    await new Promise<void>(resolve => {
      const finish = () => {
        if (interruptRef) interruptRef.current = null;
        resolve();
      };
      if (interruptRef) interruptRef.current = finish;

      Speech.speak(c, {
        language,
        rate,
        onDone: finish,
        onStopped: finish,
        onError: finish,
      });
    });

    if (cancelledRef?.current) break;
  }

  if (interruptRef) interruptRef.current = null;
}

export async function stopAllSpeech(): Promise<void> {
  await Speech.stop();
}
