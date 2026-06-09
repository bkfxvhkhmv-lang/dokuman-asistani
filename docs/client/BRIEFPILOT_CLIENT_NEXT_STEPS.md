# BriefPilot Client — Next Steps

---

## Tamamlanan Kritik Fix'ler ✅

- UTC date offset → `analyseText.ts` düzeltildi
- German amount parser → `parseGermanAmount()` eklendi
- betrag type guard → NaN cascade önlendi
- BackgroundSyncEngine race condition → promise lock eklendi
- ConflictResolver JSON equality → semantic compare
- institutionMatch confidence → hesaplamalı (95/72/40)
- OCR confidence null-safe → fallback 50
- Search 500 char limit → kaldırıldı (full text)
- Peer comparison min threshold → min 5 doküman
- Çeviri sistemi → sharing/calendar/forms hardcoded → t()

---

## Doğrulanacaklar

- [ ] OCR confidence null-safe fix her yerde çalışıyor mu?
- [ ] Search full-text index performans testi yapıldı mı?
- [ ] Cloud sync race condition gerçek cihazda test edildi mi?
- [ ] ConflictResolver field merge doğru mu? Edge case'ler?

---

## Yapılacaklar (Öncelik Sırası)

### 1. PDF Multipage Page-Aware Extraction
**Mevcut durum:** Tüm sayfalar tek blob'a düşüyor.

Hedef yapı:
```typescript
interface VisionResult {
  fullText: string;
  confidence: number;
  pages: Array<{
    pageNumber: number;
    text: string;
    confidence: number;
  }>;
  entityBoxes: EntityBox[];
}
```

Çıkarım logic: field extraction hangi sayfadan geldiğini takip etmeli.

---

### 2. Document Q&A — UI Akışı

```
Kullanıcı belgeyi açar
  → "Bu belge hakkında soru sor" alanı görünür
  → Kullanıcı yazar: "Bu faturayı ne zaman ödemeliyim?"
  → POST /documents/:id/ask
  → Cevap + kaynak gösterilir:
     "Son ödeme tarihi 15.02.2024 (Sayfa 1, Frist alanı)"
  → Kullanıcı "Takvime ekle" diyebilir
```

Privacy notu: Belge metni açık rıza olmadan üçüncü parti LLM'e gönderilmez.

---

### 3. Draft Reply — UI Akışı

```
"Taslak Cevap Oluştur" butonu
  → Ton seçimi: Resmi | Kısa | Detaylı | İtiraz | Ödeme planı
  → POST /documents/:id/draft-reply { intent, tone }
  → Taslak gösterilir
  → Kullanıcı düzenler
  → "Kopyala" veya "E-posta uygulamasında aç"
  → Disclaimer: "Bu bir taslaktır. Göndermeden önce kontrol edin."
```

---

### 4. CloudMetadataStore Structured Logging

Mevcut fix sadece `__DEV__` modunda log ediyor.
Production'da Sentry veya CloudWatch entegrasyonu gerekli:
```typescript
// TODO: production error reporting
captureException(new Error(`CloudSync [${category}] ${pfad}`));
```

---

## Kalan TODO'lar (Düşük Öncelik)

- PDF multipage context (büyük refactor, ayrı sprint)
- institutionMatch fuzzy matching (Levenshtein distance)
- Smart Search full-text index (Fuse.js veya MiniSearch)
- Peer comparison statistical confidence interval
