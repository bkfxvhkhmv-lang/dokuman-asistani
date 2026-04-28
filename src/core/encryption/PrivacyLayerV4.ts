/**
 * PrivacyLayerV4 — AES-256-GCM field-level encryption
 * Cihaz yerel anahtarı SecureStore'da JWK olarak saklanır.
 * Format: base64( 12-byte IV || AES-GCM ciphertext+authTag )
 */
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const KEY_STORE_KEY = 'bp_local_enc_key_v2';

// ── Anahtar yönetimi ─────────────────────────────────────────────────────────

async function getOrCreateCryptoKey(): Promise<CryptoKey> {
  const stored = await SecureStore.getItemAsync(KEY_STORE_KEY);

  if (stored) {
    const jwk: JsonWebKey = JSON.parse(stored);
    return crypto.subtle.importKey('jwk', jwk, { name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
      'decrypt',
    ]);
  }

  // Yeni anahtar üret
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
  const jwk = await crypto.subtle.exportKey('jwk', key);
  await SecureStore.setItemAsync(KEY_STORE_KEY, JSON.stringify(jwk));
  return key;
}

// ── Yardımcılar ───────────────────────────────────────────────────────────────

function bufToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function base64ToBuf(b64: string): Uint8Array {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf;
}

// ── Ana sınıf ─────────────────────────────────────────────────────────────────

export class PrivacyLayerV4 {
  /** Metni AES-256-GCM ile şifreler. Döner: base64(iv || ciphertext+tag) */
  static async encryptField(plaintext: string): Promise<string> {
    const key = await getOrCreateCryptoKey();
    const iv  = await Crypto.getRandomBytesAsync(12);          // 96-bit GCM IV
    const encoded = new TextEncoder().encode(plaintext);

    const cipherBuf = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded,
    );

    // iv (12 byte) + ciphertext+tag → tek buffer
    const combined = new Uint8Array(12 + cipherBuf.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(cipherBuf), 12);
    return bufToBase64(combined.buffer);
  }

  /** base64(iv||ciphertext+tag) → düz metin */
  static async decryptField(ciphertext: string): Promise<string> {
    const key     = await getOrCreateCryptoKey();
    const combined = base64ToBuf(ciphertext);
    const iv       = combined.slice(0, 12);
    const data     = combined.slice(12);

    const plainBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data,
    );
    return new TextDecoder().decode(plainBuf);
  }

  /** SHA-256 hash — arama indeksi için (şifre değil) */
  static async hashField(value: string): Promise<string> {
    return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
  }

  /**
   * Çoklu alan şifreleme — tek anahtar yüklemesiyle batch işlem.
   * { key: value } → { key: encryptedBase64 }
   */
  static async encryptFields(fields: Record<string, string>): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    await Promise.all(
      Object.entries(fields).map(async ([k, v]) => {
        result[k] = await this.encryptField(v);
      }),
    );
    return result;
  }

  static async decryptFields(fields: Record<string, string>): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    await Promise.all(
      Object.entries(fields).map(async ([k, v]) => {
        try {
          result[k] = await this.decryptField(v);
        } catch {
          result[k] = v; // bozulmuş veri → ham hali döndür
        }
      }),
    );
    return result;
  }

  /** Cihaz anahtarını sil (hesap silme / logout) */
  static async clearLocalKey(): Promise<void> {
    await SecureStore.deleteItemAsync(KEY_STORE_KEY);
  }
}
