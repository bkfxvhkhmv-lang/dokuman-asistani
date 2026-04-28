/**
 * InstitutionBehaviorModel
 * Her kurum (absender) için davranış istatistiklerini öğrenir ve saklar.
 * AsyncStorage'da JSON olarak tutulur; uygulama kapatılsa da kaybolmaz.
 *
 * Örnek: "Finanzamt → ort. 28 gün frist, genelde Steuerbescheid, hoch risk"
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORE_KEY = 'bp_institution_model_v1';

// ── Tipler ────────────────────────────────────────────────────────────────────

export interface InstitutionProfile {
  absender: string;
  totalDocs: number;
  avgFristDays: number | null;
  typFreq:   Record<string, number>;
  risikoFreq: Record<string, number>;
  actionFreq: Record<string, number>;
  avgBetrag:  number | null;
  lastSeen:   string;
}

export interface InstitutionSuggestion {
  avgFristText: string | null;
  likelyTyp:   string | null;
  likelyRisiko: string | null;
  likelyActions: string[];
  avgBetragText: string | null;
  confidence:   'high' | 'medium' | 'low';
  totalDocs:    number;
}

type ModelStore = Record<string, InstitutionProfile>;

// ── Yardımcılar ───────────────────────────────────────────────────────────────

function topKey(freq: Record<string, number>): string | null {
  const entries = Object.entries(freq);
  if (!entries.length) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

function topKeys(freq: Record<string, number>, minCount = 1): string[] {
  return Object.entries(freq)
    .filter(([, count]) => count >= minCount)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
}

function normalizeAbsender(raw: string): string {
  return raw.trim().toLowerCase().slice(0, 60);
}

function fristDays(dok: Record<string, any>): number | null {
  if (!dok.frist || !dok.datum) return null;
  const ms = new Date(dok.frist).getTime() - new Date(dok.datum).getTime();
  if (isNaN(ms) || ms < 0) return null;
  return Math.round(ms / 86_400_000);
}

// ── Sınıf ─────────────────────────────────────────────────────────────────────

export class InstitutionBehaviorModel {

  // ── Kalıcı mağaza ────────────────────────────────────────────────────────────

  private static async load(): Promise<ModelStore> {
    try {
      const raw = await AsyncStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private static async save(store: ModelStore): Promise<void> {
    try {
      await AsyncStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch {}
  }

  // ── Öğrenme ──────────────────────────────────────────────────────────────────

  static async learn(dok: Record<string, any>): Promise<void> {
    if (!dok.absender) return;
    const key = normalizeAbsender(dok.absender);
    const store = await this.load();

    const prev: InstitutionProfile = store[key] ?? {
      absender:    dok.absender,
      totalDocs:   0,
      avgFristDays: null,
      typFreq:     {},
      risikoFreq:  {},
      actionFreq:  {},
      avgBetrag:   null,
      lastSeen:    new Date().toISOString(),
    };

    // Belge sayısı
    prev.totalDocs += 1;

    // Ortalama frist
    const days = fristDays(dok);
    if (days !== null) {
      prev.avgFristDays = prev.avgFristDays === null
        ? days
        : Math.round((prev.avgFristDays * (prev.totalDocs - 1) + days) / prev.totalDocs);
    }

    // Tip frekansı
    if (dok.typ) {
      prev.typFreq[dok.typ] = (prev.typFreq[dok.typ] ?? 0) + 1;
    }

    // Risk frekansı
    if (dok.risiko) {
      prev.risikoFreq[dok.risiko] = (prev.risikoFreq[dok.risiko] ?? 0) + 1;
    }

    // Aksiyon frekansı
    (dok.aktionen ?? []).forEach((a: string) => {
      prev.actionFreq[a] = (prev.actionFreq[a] ?? 0) + 1;
    });

    // Ortalama tutar
    if (dok.betrag && dok.betrag > 0) {
      prev.avgBetrag = prev.avgBetrag === null
        ? dok.betrag
        : Math.round(((prev.avgBetrag * (prev.totalDocs - 1) + dok.betrag) / prev.totalDocs) * 100) / 100;
    }

    prev.lastSeen = new Date().toISOString();
    store[key] = prev;
    await this.save(store);
  }

  // ── Profil okuma ─────────────────────────────────────────────────────────────

  static async getProfile(absender: string): Promise<InstitutionProfile | null> {
    const store = await this.load();
    return store[normalizeAbsender(absender)] ?? null;
  }

  // ── Öneri üretme ─────────────────────────────────────────────────────────────

  static async getSuggestion(absender: string): Promise<InstitutionSuggestion | null> {
    const profile = await this.getProfile(absender);
    if (!profile || profile.totalDocs < 1) return null;

    const confidence: InstitutionSuggestion['confidence'] =
      profile.totalDocs >= 5 ? 'high' :
      profile.totalDocs >= 2 ? 'medium' : 'low';

    return {
      avgFristText: profile.avgFristDays !== null
        ? `${profile.avgFristDays} Tage`
        : null,
      likelyTyp:    topKey(profile.typFreq),
      likelyRisiko: topKey(profile.risikoFreq),
      likelyActions: topKeys(profile.actionFreq),
      avgBetragText: profile.avgBetrag !== null
        ? `${profile.avgBetrag.toFixed(2)} €`
        : null,
      confidence,
      totalDocs: profile.totalDocs,
    };
  }

  // ── Tüm profiller ────────────────────────────────────────────────────────────

  static async getAllProfiles(): Promise<InstitutionProfile[]> {
    const store = await this.load();
    return Object.values(store).sort((a, b) => b.totalDocs - a.totalDocs);
  }

  // ── İstatistiklerden açıklama cümlesi üret ───────────────────────────────────

  static async describeInstitution(absender: string): Promise<string | null> {
    const sug = await this.getSuggestion(absender);
    if (!sug) return null;

    const parts: string[] = [];
    if (sug.likelyTyp)    parts.push(`genellikle ${sug.likelyTyp}`);
    if (sug.avgFristText) parts.push(`ort. ${sug.avgFristText} Frist`);
    if (sug.likelyRisiko === 'hoch')   parts.push('yüksek risk');
    if (sug.likelyRisiko === 'mittel') parts.push('orta risk');
    if (sug.avgBetragText) parts.push(`ort. ${sug.avgBetragText}`);

    const conf = sug.confidence === 'high' ? `(${sug.totalDocs} belgeden)` : '';
    return parts.join(' · ') + (conf ? ` ${conf}` : '');
  }

  // ── Sıfırla ──────────────────────────────────────────────────────────────────

  static async reset(): Promise<void> {
    await AsyncStorage.removeItem(STORE_KEY);
  }
}
