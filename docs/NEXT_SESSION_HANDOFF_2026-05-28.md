# Devir Notu — 2026-05-28

**Bu dosyayı yeni oturumun ilk 60 saniyesinde oku. Sonra sil veya arşivle.**
Amacı: önceki oturumu yeniden türetmek değil, yanlış yöne sapmadan devam etmek.

---

## 1. İlk Okunacak Dosyalar (bu sırayla)

```
1. docs/NEXT_SESSION_HANDOFF_2026-05-28.md  ← şu an okuyorsun
2. docs/BRIEFPILOT_MRT.md                   ← tek otorite; protokol + karar tarihi
3. docs/RELEASE_SNAPSHOT_2026-05-28.md      ← anlık durum tablosu
4. git log --oneline -10                    ← son commit durumu
5. git status                               ← working tree temiz mi?
```

Chat geçmişine güvenme. Repo dokümanlarına güven.

---

## 2. Mutlak Çalışma Protokolü

Bu kurallar her oturumda geçerlidir. İstisna yok.

- **Her yanıt "Görüşüm:" ile başlar** — herhangi bir tool çağrısından önce. Tek satır bile olsa.
- **Onay almadan kod yazma.** Plan göster, kullanıcı onayladıktan sonra yaz.
- **Bir seferde tek akış.** Paralel dal açma.
- **MRT'yi okumadan tek satır kod yok.**
- **Her commit sonrası MRT'yi güncelle** — Bölüm 5 (commit log) ve Bölüm 6 (açık sorunlar).
- **Yeni feature başlatma.** Sıra: smoke → TestFlight prep → P3 polish → feature.
- **Büyük refactor teklif etme.** Kullanıcı sormadan Button System, PDF split, i18n overhaul önerme.

---

## 3. Şu Anki Durum (2026-05-28 akşamı itibarıyla)

### Kapananlar ✅
- P0 core smoke tamamlandı
- PDF viewer (in-app `react-native-pdf`) çalışıyor
- Preview tap → `DocumentPagesViewer` fullscreen çalışıyor
- X / Share butonları safe area'da PASS
- Gutschrift → Zahlung CTA yok PASS
- OCR result: "In Dokumente speichern" primary, Excel secondary PASS
- Camera scan → Dokument tab (ozet) açılıyor PASS
- Export P1 (OR-bug fix) + P2 (copy polish) kapandı
- Excel V7 backend-side accepted as Steuerberater-readable V1 (31/31 test PASS)
- Professional UI Reset büyük P1/P2 tamamlandı (aşağıda liste)
- Layout / Safe-Area final pass kapandı

### Professional UI Reset — Tamamlanan Maddeler
| Madde | Commit |
|-------|--------|
| OCR ekranı teknik dil temizliği | `b919b6e` |
| HomeTriage sıfır sayaçlar gizlendi | `821532cb2` |
| Home duplicate all-clear kaldırıldı | `2ecf63ac2` |
| Ähnliche Dokumente kaldırıldı | `1f86909d2` |
| Überblick duplicate footer kaldırıldı | `a7c50f8f5` |
| Erledigen duplicate next-step kaldırıldı | `5f86e8009` |
| SmartActionsPanel collapsed default | `54b9760` |
| Erledigt pill → MoreMenu | `54b9760` |
| Home emoji → Phosphor icon | `d6ce83b` |
| OCR/KI/Server teknik copy temizliği | `060fec3`, `5106c25`, `994db2b` |
| OCR download secondary outlined | `5663b6a` |
| Layout hardcoded padding → dynamic | `40d402cb` |

### Onaylanmamış (device smoke gerekiyor) ⬜
- Batch export (selectedIds parametresi)
- Export ekranı son öğe CTA'nın üzerinde görünüyor mu?
- Vorlesen (native TTS)
- Delete / Undo

---

## 4. Son Önemli Commitler

```
a93b04715  docs(release): add May 28 readiness snapshot
40d402cb2  fix(layout): replace hardcoded safe-area padding leftovers
23f39a7fa  chore(mrt): close P2 modal KI wording batch
994db2b22  fix(copy): simplify modal and secondary AI wording
5106c25    fix(copy): simplify analysis wording in summary and actions
060fec3    fix(copy): remove technical processing wording from detail
d6ce83b    refactor(home): remove emoji from core home UI
5663b6a    fix(ui): make OCR download action secondary
b919b6e    fix(copy): remove technical OCR and AI wording
54b9760    refactor(detail): reduce secondary action noise
c3793a6    fix(export): run selected batch export options independently
4655b5f    fix(export): clarify export option labels and excel copy
c45d23bc5  fix(ocr-result): make save primary action before export
```

---

## 5. Açık Kararlar / Bekleyenler

### Önce bunlar (sırayla)
1. `ios/project.pbxproj` commit edilmeli — native rebuild (`react-native-pdf`) değişikliği; TestFlight öncesi zorunlu.
2. `build_device.sh` untracked — local path içeriyor; `.gitignore`'a ekle veya commit et, karar ver.
3. Final device smoke — 4 onaylanmamış madde (bkz. §3).
4. TestFlight prep — build number artır, `eas build --platform ios --profile preview`.

### P3 Backlog (smoke + TestFlight sonrasına)
- Button System `AppButton` migration — geniş, riskli, ertelendi
- SmartRiskPanel expanded factors — emoji hâlâ var (collapsed by default, P3)
- ExportBildschirm inline comment cleanup
- DATEV EXTF export (flag `ENABLE_RELEASE_DATEV_EXPORT` kapalı)
- PDF split/merge UI (altyapı var, UI yok)
- Cloud voice note → transcript
- Deeper i18n / localization audit
- Detail Excel availability — `Dokument` tipinde `ocrJobId` yok, backend TTL bilinmiyor

---

## 6. Yapılmayacaklar

Bunları kullanıcı açıkça istemeden başlatma:

- Yeni feature
- PDF split UI
- App-side Excel generator (mobil üretmiyor, sadece download ediyor)
- `ExportierenSheet`'e Excel ekleme — `job_id` persist edilmemiş
- Button System migration
- Büyük redesign / layout overhaul
- Emoji / konfeti / animasyonlu UI ekleme
- DATEV label veya Accountable-compatible claim

---

## 7. Bir Sonraki Tek Doğru Adım

```
1. git status → working tree temiz mi?
2. docs/RELEASE_SNAPSHOT_2026-05-28.md oku → zaten var, yeniden oluşturma.
3. docs/BRIEFPILOT_MRT.md oku.
4. ios/project.pbxproj durumunu kullanıcıya sor: "commit mi, gitignore mi?"
5. Final device smoke checklist sun — kullanıcı onaylarsa liste:
   □ PDF fullscreen (X/Share safe area)
   □ Image fullscreen (zoom)
   □ Gutschrift → Zahlung CTA yok
   □ Export single
   □ Export batch (selectedIds)
   □ OCR result: save primary, Excel secondary
   □ Home: emoji yok (Phosphor icon)
   □ Safe area tüm ekranlar
6. Smoke PASS → TestFlight prep konuş.
```

---

## 8. Kapanış Raporu Formatı

Her oturum sonunda (veya limit yaklaşınca) bu formatla raporla:

```
git status
git log --oneline -5
---
Açık blocker: var / yok
Sıradaki tek adım: [tek cümle]
```

---

*Bu dosya tek kullanımlık. Okundu, anlaşıldı → arşivle veya sil.*
*Oluşturulma: 2026-05-28 — Professional UI Reset sprint sonu.*
