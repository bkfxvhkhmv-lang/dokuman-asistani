# BriefPilot — Sprint Roadmap

Sprint sırası: 1 → 2 → 3 → 4 → 5 → 6
Her sprint bir öncekinin üzerine kuruludur.

---

## Sprint 1 — Güven temizliği ✅ TAMAMLANDI
Temel TypeScript, design system, store mimarisi.

---

## Sprint 2 — Processing, Fallback, Classification, Mapping

**Başarı cümlesi:** Belge eklendiğinde BriefPilot ya anlamlı bir Analyse sonucu gösterir ya da kullanıcıya neyi elle kontrol etmesi gerektiğini açıkça söyler.

### Altyapı (kodda hazır)
- `DocumentProcessingState` tipi → `src/features/detail/constants/documentStatus.ts`
- `DocumentType` modeli → `src/features/detail/constants/documentTypeUi.ts`
- `DocumentStatus` (urgent/open/needs_review/done) → `documentStatus.ts`
- `getPrimaryAction()` type-based mapping → `actionMapping.ts`
- `NO_LEGAL_ADVICE_DISCLAIMER` → `actionMapping.ts`
- `ERROR_COPY` standart hata metinleri → `documentStatus.ts`
- `PROCESSING_TIMEOUT_MS` = 8 saniye → `documentStatus.ts`

### Yapılacaklar
- [ ] ProcessingScreen: tek mesaj `KI erkennt Daten...`, 8 sn sonra fallback
- [ ] OCR kapalıyken mock/fallback akışı
- [ ] `computeDocumentStatus()` → HomeScreen urgent count bağlantısı
- [ ] AI sparkle (✦) — otomatik çıkarılan alanlarda göster
- [ ] Confidence badge: `Sehr sicher / Bitte prüfen / Unklar`
- [ ] `ERROR_COPY` → tüm OCR/upload/export hata mesajlarını normalize et
- [ ] Required fields kuralları → `needs_review` tetikleme

### Tasarım kuralları
- Processing ekranında 1 mesaj — sonsuz döngü yok
- 8 sn aşılırsa fallback: `Felder prüfen / Trotzdem weiter / Neu scannen`
- `failed` = belge kayboldu değil, fallback ver
- OCR kapalıyken ekranda `null/undefined/pending` görünmez

---

## Sprint 3 — Scanner ve Belge Ekleme Deneyimi

**Başarı cümlesi:** Kullanıcı belgeyi kamera veya galeriden ekler, okunabilir hale getirir ve Analyse ekranına sorunsuz geçer.

### Yapılacaklar
- [ ] Kamera UI: siyah bg, beyaz frame, yeşil detected corners, büyük shutter
- [ ] Galeri akışı birinci sınıf vatandaş — kamera izni olmadan çalışır
- [ ] Permission denied → `Galerie öffnen / Einstellungen öffnen`
- [ ] EditView tool sırası: `Optimieren | Zuschneiden | Drehen | Anpassen`
- [ ] Optimize modları: `Original | Auto | S/W | Farbe` (default: Auto)
- [ ] Manual crop / perspective correction → köşe noktaları sürüklenebilir
- [ ] `Weiter → Processing → Analyse` geçişi deterministik
- [ ] Hata olursa belge kaybolmaz — lokal önce kaydet

### Kamera UI standardı
- Arka plan: `#000000`
- Belge frame: beyaz
- Detected corners: yeşil
- Capture button: büyük beyaz daire
- No debug UI

### Scanner test matrisi (Sprint 3 sonu)
1. İyi ışıkta fatura
2. Düşük ışıkta belge
3. Yamuk çekilmiş belge
4. Gölgeli belge
5. Galeriden foto
6. Kamera izni reddedildi
7. Capture → review → back
8. Review → Weiter → Analyse
9. Rotate edilmiş belge
10. Crop edilmiş belge

---

## Sprint 4 — Analyse, Aktionen, Dokument Ürün Kalbi

**Başarı cümlesi:** Kullanıcı belgeyi açtığında ne olduğunu, riskini ve şimdi ne yapması gerektiğini 10 saniyede anlar.

### Yapılacaklar

#### Analyse tab
- [ ] Layout: VorgangStatus → KI-Zusammenfassung → Situation → Handlung → Frist → Risiko
- [ ] Summary toggle: `1 Satz | 3 Punkte | Detail`
- [ ] Risk section: `Hoch/Mittel/Niedrig` → `Diese Woche handeln / Frist im Blick / Keine akute Aktion`
- [ ] AI sparkle (✦) sadece otomatik alanlar
- [ ] OCR confidence badge

#### Aktionen tab (altyapı HAZIR → UI iyileştirme)
- [x] Primary action card: `getPrimaryAction(typ)` kullanılıyor
- [x] `NO_LEGAL_ADVICE_DISCLAIMER` → einspruch action altında
- [ ] Quick actions max 2
- [ ] Reminder section: `Frist: 14. Mai [+ Setzen]`
- [ ] `Weitere Werkzeuge` accordion: kapalı başlar
- [ ] Zahlung vorbereiten ekranı: IBAN kopyala + Verwendungszweck kopyala

#### Dokument tab
- [ ] Belge önizleme büyük
- [ ] Felder: Typ ✦ / Absender ✦ / Datum ✦ / Betrag ✦ / Frist ✦ / Status
- [ ] Edit fields → status yeniden hesaplanır
- [ ] `[Bearbeiten] [Exportieren]` sticky footer

#### Genel
- [ ] Erledigt loop → Home urgent count azalır
- [ ] Delete confirmation dialog
- [ ] No legal advice copy: `prüfen/vorbereiten/erkennen` — asla `garantiert/einlegen`

### No-Legal-Advice kuralları
| Kullanılacak | Yasak |
|---|---|
| prüfen | garantiert |
| vorbereiten | rechtssicher |
| erkennen | muss |
| vorschlagen | automatisch einlegen |
| Entwurf | offiziell |

---

## Sprint 5 — App Store Materyalleri ✅ TAMAMLANDI
Bkz. `docs/APP_STORE_MATERIALS.md`

---

## Sprint 6 — Beta 100 ✅ TAMAMLANDI
Bkz. `docs/BETA_PLAN.md`

**Tamamlananlar:**
- EAS testflight profili
- 7 demo belge + `isDemo` flag + Demo badge
- RESET_DEMO action
- Demo zurücksetzen butonu (Settings)
- BetaAnalytics servisi (privacy-safe, device-only)
- FeedbackModal (kategori + ekran seçici + metin + email + metadata)
- Analytics wire-up: demo_opened, onboarding_completed, analyse_viewed, actions_viewed
- app.json camera permission text (DE) + buildNumber
- APP_STORE_MATERIALS.md: TR açıklama + What's New v4.0.0
- BETA_PLAN.md: WhatsApp kısa davet mesajları (TR + DE)
