import * as FileSystem from 'expo-file-system/legacy';

export function base64ToUint8(b64: string): Uint8Array {
  const raw = ((b64.includes(',') ? b64.split(',').pop() : b64) ?? '').trim();
  if (!raw.length) return new Uint8Array(0);

  if (typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(raw);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Node ortamında (test/Jest)
  const Buf = typeof Buffer !== 'undefined' ? Buffer : null;
  if (!Buf) return new Uint8Array(0);
  return new Uint8Array(Buf.from(raw, 'base64'));
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return globalThis.btoa(s);
}

export async function readUriBytes(uri: string): Promise<Uint8Array> {
  const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  return base64ToUint8(b64);
}

export async function writePdfBytes(uri: string, bytes: Uint8Array): Promise<void> {
  await FileSystem.writeAsStringAsync(uri, uint8ArrayToBase64(bytes), {
    encoding: FileSystem.EncodingType.Base64,
  });
}
