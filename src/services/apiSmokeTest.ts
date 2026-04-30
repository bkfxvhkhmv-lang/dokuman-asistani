/**
 * Backend V1 doğrulama — geliştirici menüsünden veya tek seferlik diag çağrısı.
 * Üretim koduna bağlamak zorunlu değil.
 */
import { uploadDocumentV4Safe } from '@/services/v4FileService';
import { createShareLink, getHealthStatus } from '@/services/v4-api';

export interface SmokeResultOk<T> {
  ok: true;
  data: T;
}
export interface SmokeResultErr {
  ok: false;
  error: string;
}
export type SmokeResult<T> = SmokeResultOk<T> | SmokeResultErr;

/** Auth gerekmez; API_BASE/health uygunluğu. */
export async function runApiHealthSmoke(): Promise<SmokeResult<unknown>> {
  try {
    const data = await getHealthStatus();
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message ?? String(e) };
  }
}

/** Bearer (BriefPilot veya Supabase JWT) gerektirir: POST /documents smoke. */
export async function runUploadSmokeTest(fileUri: string, filename = 'smoke.bin'): Promise<SmokeResult<{ id?: string }>> {
  try {
    const doc = await uploadDocumentV4Safe(fileUri, filename);
    return { ok: true, data: doc };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message ?? String(e) };
  }
}

/** Bearer + dokId: POST /share/:id smoke. */
export async function runShareSmokeTest(docId: string, ttl = '24h'): Promise<SmokeResult<unknown>> {
  try {
    const link = await createShareLink(docId, ttl, 0);
    return { ok: true, data: link };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message ?? String(e) };
  }
}
