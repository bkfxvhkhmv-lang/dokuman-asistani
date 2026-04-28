/**
 * DocumentMemory — Her belge kendi kalıcı hafızasına sahip.
 * Chat geçmişi, kullanıcının verdiği bilgiler, yapılan aksiyonlar.
 * AsyncStorage'da belge ID'si bazında saklanır.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const keyFor = (docId: string) => `bp_doc_memory_${docId}`;

export interface MemoryMessage {
  role:      'user' | 'assistant';
  content:   string;
  timestamp: string;
}

export interface MemoryAction {
  action:    string;
  label:     string;
  timestamp: string;
}

export interface DocMemory {
  docId:       string;
  messages:    MemoryMessage[];
  actions:     MemoryAction[];
  userNotes:   string[];            // kullanıcının eklediği kısa notlar
  lastOpened:  string;
  openCount:   number;
}

const EMPTY = (docId: string): DocMemory => ({
  docId,
  messages:   [],
  actions:    [],
  userNotes:  [],
  lastOpened: new Date().toISOString(),
  openCount:  0,
});

export class DocumentMemory {

  static async load(docId: string): Promise<DocMemory> {
    try {
      const raw = await AsyncStorage.getItem(keyFor(docId));
      return raw ? { ...EMPTY(docId), ...JSON.parse(raw) } : EMPTY(docId);
    } catch {
      return EMPTY(docId);
    }
  }

  private static async save(mem: DocMemory): Promise<void> {
    try {
      await AsyncStorage.setItem(keyFor(mem.docId), JSON.stringify(mem));
    } catch {}
  }

  // ── Chat geçmişi ──────────────────────────────────────────────────────────────

  static async appendMessage(docId: string, msg: MemoryMessage): Promise<void> {
    const mem = await this.load(docId);
    mem.messages = [...mem.messages.slice(-99), msg];
    await this.save(mem);
  }

  static async getMessages(docId: string): Promise<MemoryMessage[]> {
    return (await this.load(docId)).messages;
  }

  static async clearMessages(docId: string): Promise<void> {
    const mem = await this.load(docId);
    mem.messages = [];
    await this.save(mem);
  }

  // ── Aksiyon kaydı ────────────────────────────────────────────────────────────

  static async recordAction(docId: string, action: string, label: string): Promise<void> {
    const mem = await this.load(docId);
    mem.actions = [...mem.actions.slice(-49), { action, label, timestamp: new Date().toISOString() }];
    await this.save(mem);
  }

  static async getActions(docId: string): Promise<MemoryAction[]> {
    return (await this.load(docId)).actions;
  }

  // ── Kullanıcı notları ────────────────────────────────────────────────────────

  static async addNote(docId: string, note: string): Promise<void> {
    const mem = await this.load(docId);
    mem.userNotes = [...mem.userNotes.slice(-19), note.trim()];
    await this.save(mem);
  }

  static async getNotes(docId: string): Promise<string[]> {
    return (await this.load(docId)).userNotes;
  }

  // ── Açılış takibi ────────────────────────────────────────────────────────────

  static async recordOpen(docId: string): Promise<DocMemory> {
    const mem = await this.load(docId);
    mem.openCount += 1;
    mem.lastOpened = new Date().toISOString();
    await this.save(mem);
    return mem;
  }

  // ── Chat için context özeti ───────────────────────────────────────────────────

  static async buildChatContext(docId: string): Promise<string> {
    const mem = await this.load(docId);
    const parts: string[] = [];
    if (mem.actions.length) {
      parts.push(`Kullanıcı daha önce: ${mem.actions.slice(-5).map(a => a.label).join(', ')}`);
    }
    if (mem.userNotes.length) {
      parts.push(`Kullanıcı notları: ${mem.userNotes.slice(-3).join(' | ')}`);
    }
    if (mem.openCount > 1) {
      parts.push(`Bu belge ${mem.openCount} kez açıldı.`);
    }
    return parts.join('\n');
  }

  // ── Tüm bellek sil (hesap silme) ────────────────────────────────────────────

  static async deleteAll(docIds: string[]): Promise<void> {
    await AsyncStorage.multiRemove(docIds.map(keyFor));
  }
}
