/**
 * UserBehaviorModel
 * Kullanıcının belge etkileşimlerini öğrenir: hangi kurumlar önemli,
 * hangi aksiyonlar sık kullanılıyor, arama alışkanlıkları.
 *
 * Veri: AsyncStorage, cihaz yerel, GDPR uyumlu.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORE_KEY = 'bp_user_behavior_v1';

// ── Tipler ────────────────────────────────────────────────────────────────────

export interface UserBehaviorStore {
  openDelays:       number[];           // belge yükleme → ilk açılış (ms)
  actionFreq:       Record<string, number>;
  institutionFreq:  Record<string, number>;  // absender → kaç kez etkileşim
  typFreq:          Record<string, number>;
  searchQueries:    string[];           // son 50 sorgu
  quickOpenDocIds:  string[];           // 5 dk içinde açılan belgeler
  totalOpens:       number;
  lastUpdated:      string;
}

export interface UserInsights {
  avgOpenDelayHours: number | null;
  topInstitutions:   string[];
  topActions:        string[];
  topDocTypes:       string[];
  recentSearches:    string[];
  engagementLevel:   'high' | 'medium' | 'low';
}

// ── Yardımcı ─────────────────────────────────────────────────────────────────

function topNKeys(freq: Record<string, number>, n: number): string[] {
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

const EMPTY_STORE: UserBehaviorStore = {
  openDelays:      [],
  actionFreq:      {},
  institutionFreq: {},
  typFreq:         {},
  searchQueries:   [],
  quickOpenDocIds: [],
  totalOpens:      0,
  lastUpdated:     new Date().toISOString(),
};

// ── Sınıf ─────────────────────────────────────────────────────────────────────

export class UserBehaviorModel {

  private static async load(): Promise<UserBehaviorStore> {
    try {
      const raw = await AsyncStorage.getItem(STORE_KEY);
      return raw ? { ...EMPTY_STORE, ...JSON.parse(raw) } : { ...EMPTY_STORE };
    } catch {
      return { ...EMPTY_STORE };
    }
  }

  private static async save(store: UserBehaviorStore): Promise<void> {
    store.lastUpdated = new Date().toISOString();
    try {
      await AsyncStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch {}
  }

  // ── Belge açılışı ────────────────────────────────────────────────────────────

  static async recordOpen(dok: Record<string, any>): Promise<void> {
    const store = await this.load();
    store.totalOpens += 1;

    if (dok.datum) {
      const delay = Date.now() - new Date(dok.datum).getTime();
      if (delay >= 0) {
        store.openDelays = [...store.openDelays.slice(-99), delay];
        if (delay < 5 * 60 * 1000) {
          store.quickOpenDocIds = [...store.quickOpenDocIds.slice(-49), dok.id];
        }
      }
    }

    if (dok.absender) {
      const key = dok.absender.slice(0, 60);
      store.institutionFreq[key] = (store.institutionFreq[key] ?? 0) + 1;
    }

    if (dok.typ) {
      store.typFreq[dok.typ] = (store.typFreq[dok.typ] ?? 0) + 1;
    }

    await this.save(store);
  }

  // ── Aksiyon kaydı ────────────────────────────────────────────────────────────

  static async recordAction(action: string): Promise<void> {
    const store = await this.load();
    store.actionFreq[action] = (store.actionFreq[action] ?? 0) + 1;
    await this.save(store);
  }

  // ── Arama kaydı ──────────────────────────────────────────────────────────────

  static async recordSearch(query: string): Promise<void> {
    if (!query.trim() || query.length < 2) return;
    const store = await this.load();
    store.searchQueries = [...store.searchQueries.slice(-49), query.trim()];
    await this.save(store);
  }

  // ── Arama skoru kişiselleştirme ──────────────────────────────────────────────

  static async personalizeScore(dok: Record<string, any>, baseScore: number): Promise<number> {
    const store = await this.load();
    let boost = 0;

    if (dok.absender) {
      const freq = store.institutionFreq[dok.absender.slice(0, 60)] ?? 0;
      boost += Math.min(freq * 0.05, 0.3);
    }

    if (dok.typ) {
      const freq = store.typFreq[dok.typ] ?? 0;
      boost += Math.min(freq * 0.02, 0.15);
    }

    if (dok.id && store.quickOpenDocIds.includes(dok.id)) {
      boost += 0.2;
    }

    return Math.round((baseScore * (1 + boost)) * 100) / 100;
  }

  // ── Kullanıcı içgörüleri ─────────────────────────────────────────────────────

  static async getInsights(): Promise<UserInsights> {
    const store = await this.load();

    const avgOpenDelay = store.openDelays.length
      ? store.openDelays.reduce((a, b) => a + b, 0) / store.openDelays.length / 3_600_000
      : null;

    const engagementLevel: UserInsights['engagementLevel'] =
      store.totalOpens >= 50 ? 'high' :
      store.totalOpens >= 10 ? 'medium' : 'low';

    return {
      avgOpenDelayHours: avgOpenDelay !== null ? Math.round(avgOpenDelay * 10) / 10 : null,
      topInstitutions:   topNKeys(store.institutionFreq, 5),
      topActions:        topNKeys(store.actionFreq, 5),
      topDocTypes:       topNKeys(store.typFreq, 5),
      recentSearches:    store.searchQueries.slice(-10).reverse(),
      engagementLevel,
    };
  }

  // ── Öneri: kullanıcıya uygun risk eşiği ─────────────────────────────────────

  static async suggestedRiskThreshold(): Promise<'hoch' | 'mittel' | 'niedrig'> {
    const store = await this.load();
    const topActions = topNKeys(store.actionFreq, 3);
    if (topActions.includes('einspruch') || topActions.includes('zahlen')) return 'hoch';
    if (topActions.includes('kalender')) return 'mittel';
    return 'niedrig';
  }

  static async reset(): Promise<void> {
    await AsyncStorage.removeItem(STORE_KEY);
  }
}
