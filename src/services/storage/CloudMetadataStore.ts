import type { Dokument } from '@/store';

export type SyncResult = { uploaded: number; downloaded: number; conflicts: number };

const DEFAULT_BASE_URL = 'https://api.briefpilot.app';
const TIMEOUT_MS = 10000;

type HttpMethode = 'GET' | 'POST' | 'PUT' | 'DELETE';

function warte(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function istDokument(wert: unknown): wert is Dokument {
  return typeof wert === 'object' && wert !== null && typeof (wert as { id?: unknown }).id === 'string';
}

function istDokumentArray(wert: unknown): wert is Dokument[] {
  return Array.isArray(wert) && wert.every(istDokument);
}

export class CloudMetadataStore {
  constructor(
    private baseUrl: string = DEFAULT_BASE_URL,
    private getToken: () => string | null = () => null,
  ) {}

  private async request<T>(
    pfad: string,
    methode: HttpMethode,
    body?: unknown,
    retry = true,
  ): Promise<{ ok: boolean; status: number; data: T | null }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const token = this.getToken();
      const response = await fetch(`${this.baseUrl}${pfad}`, {
        method: methode,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });

      if (response.status === 401 && retry) {
        this.getToken();
        return this.request<T>(pfad, methode, body, false);
      }

      if (response.status === 429 && retry) {
        await warte(2000);
        return this.request<T>(pfad, methode, body, false);
      }

      const text = await response.text();
      const data = text ? (JSON.parse(text) as T) : null;

      return { ok: response.ok, status: response.status, data };
    } catch (err) {
      // Structured logging — no sensitive data (token, body content) exposed
      const category =
        err instanceof DOMException && err.name === 'AbortError' ? 'timeout' :
        err instanceof TypeError ? 'network' : 'unknown';
      if (__DEV__) {
        console.warn(`[CloudMetadataStore] ${methode} ${pfad} failed [${category}]`, err instanceof Error ? err.message : String(err));
      }
      return { ok: false, status: 0, data: null };
    } finally {
      clearTimeout(timeout);
    }
  }

  async save(dok: Dokument): Promise<void> {
    await this.request<unknown>(`/api/v1/documents/${encodeURIComponent(dok.id)}`, 'PUT', dok);
  }

  async load(id: string): Promise<Dokument | null> {
    const result = await this.request<unknown>(`/api/v1/documents/${encodeURIComponent(id)}`, 'GET');
    return result.ok && istDokument(result.data) ? result.data : null;
  }

  async loadAll(): Promise<Dokument[]> {
    const result = await this.request<unknown>('/api/v1/documents', 'GET');
    return result.ok && istDokumentArray(result.data) ? result.data : [];
  }

  async delete(id: string): Promise<void> {
    await this.request<unknown>(`/api/v1/documents/${encodeURIComponent(id)}`, 'DELETE');
  }

  async sync(localDocs: Dokument[]): Promise<SyncResult> {
    try {
      const remoteDocs = await this.loadAll();
      const remoteMap = new Map(remoteDocs.map((dok) => [dok.id, dok]));
      let uploaded = 0;
      let downloaded = 0;
      let conflicts = 0;

      for (const lokalesDok of localDocs) {
        const remoteDok = remoteMap.get(lokalesDok.id);
        if (!remoteDok) {
          await this.save(lokalesDok);
          uploaded += 1;
          continue;
        }

        if (remoteDok.datum !== lokalesDok.datum || remoteDok.titel !== lokalesDok.titel) {
          conflicts += 1;
        }
      }

      const localIds = new Set(localDocs.map((dok) => dok.id));
      for (const remoteDok of remoteDocs) {
        if (!localIds.has(remoteDok.id)) {
          downloaded += 1;
        }
      }

      return { uploaded, downloaded, conflicts };
    } catch {
      return { uploaded: 0, downloaded: 0, conflicts: 0 };
    }
  }
}
