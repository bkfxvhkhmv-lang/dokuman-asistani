# Android 8.0 — Functional PASS + Visual/Product WARN Audit

**Tarih:** 2026-06-06  
**Cihaz:** Pixel 9 Pro — Android 15 (wireless ADB + Metro)  
**Build:** 8.0 internal, v4.0.0, Expo SDK 54, New Architecture + Hermes  
**Kaynak:** Screen recording frame-by-frame VQA (0.5fps, 156 frame, frames 001–109 incelendi)  
**Durum:** Docs only — no commit until reviewed  
**Update 2026-06-06:** OCR result compact redesign visual gate PASSED. Android scanner dismiss/resume lifecycle is NO-GO. 8.1 limited beta remains BLOCKED until scanner lifecycle is verified clean on device.

---

## 1. Executive Verdict

| Build | Karar | Ne anlama geliyor |
|-------|-------|-------------------|
| **Android 8.0 internal** | ⚠️ **PASS with WARN** | Core akışlar cihazda çalışıyor. Visual/product kalite sorunları mevcut. Yalnızca dahili test için kabul edilebilir. |
| **8.1 limited beta** | 🔴 **BLOCKED** | Aşağıdaki P0/P1 kalemler kapatılmadan hiçbir harici kullanıcıya dağıtım yapılamaz. |
| **Public rollout** | 🔴 **NOT READY** | Hukuki inceleme, visual/product backlog ve beta doğrulaması tamamlanmadan geçilemez. |

> **Functional PASS does not mean production-ready visual quality.**  
> Bu audit her iki gerçeği aynı belgede ayrı tutar.

### Önemli kısıtlar (tüm build'ler için geçerli)

- Reply Assistant **production-ready değil.** 8.0 internal'da dev akışı gözlemlendi; DEV etiketleri, template ID'leri ve kapsamı henüz beta'ya uygun değil.
- Android 8.0 **yalnızca dahili testtir.** Herhangi bir harici kullanıcıya, TestFlight veya Play Store'a dağıtım yapılamaz.
- Public rollout için tarih verilmemiştir ve bu audit'te verilmeyecektir.

---

## 2. Functional PASS Findings

Her kalem Pixel 9 Pro'da frame-by-frame VQA ile doğrulandı. Crash, blank screen veya broken navigation gözlemlenmedi.

| # | Fonksiyon | Gözlem |
|---|-----------|--------|
| 1 | **App Lock Screen** | "Ihre Dokumente sind geschützt / Entsperren" — 3 farklı tetiklemede (analiz sonrası, Drive'dan dönüş, arka plandan dönüş) doğru çalışıyor |
| 2 | **OCR Pre-flight Modal** | "Scan aufgenommen / Bereit zur Analyse" — görüntü seçiminden analize geçiş doğru |
| 3 | **OCR Analiz Progress** | 4 adımlı stepper, yeşil checkmark'lar, thumbnail üzerinde animasyonlu tarama çizgisi — stabil |
| 4 | **OCR Sonuç Veri Çıkarımı** | "Formular · 18.05.2026 · 20 Felder · 2 Tabellen · 66 Zeilen" — yapılandırılmış metadata doğru render ediliyor |
| 5 | **OcrMvpUploadBox UX fix** | "Neues Dokument analysieren" başlığı + "Scannen, Datei auswählen oder Foto importieren." — cihazda onaylandı |
| 6 | **Kayıt / Reset Durumu** | "Gespeichert" + "Dokument öffnen" CTA + "Neue Analyse" dim state — kayıt akışı doğru |
| 7 | **Belge Detay 3-Tab** | Überblick / Erledigen / Dokument navigasyonu — tab switch hızı ve state korunması doğru |
| 8 | **Amber Hinweis Sistemi** | "Absender bitte prüfen" + "Bitte diesen Wert prüfen" — belirsiz alanlarda doğru tetikleniyor |
| 9 | **Edit Guard Dialog** | "Änderungen verwerfen? / ABBRECHEN / VERWERFEN" — kazara geri gidişi önlüyor |
| 10 | **TTS / Vorlesen** | "Volltext anhören" + "Kritische Punkte anhören" — bölüm render ediliyor |
| 11 | **E-İmza tam akışı** | Çiz → PDF'e yerleştir (mavi tutamaçlarla taşı/yeniden boyutlandır) → PDF viewer → Android share sheet — uçtan uca çalışıyor |
| 12 | **"Unterschrift entfernen" koşullu görünüm** | Yalnızca imza yerleştirildikten sonra Erledigen sekmesinde görünüyor — doğru state yönetimi |
| 13 | **Google Drive Upload Dialog** | "In Drive hochladen" — PDF thumbnail, Speicherort, doğru Google hesabı — functional |
| 14 | **Ayarlar / Profil / Demo Reset** | 7 dil bayrağı ✓, Deutsch seçili ✓, togglelar çalışıyor ✓, Demo zurücksetzen → 2→15 belge ✓ |
| 15 | **"Erweitert · Profi-Optionen"** | Accordion açılıyor, "Regelmarkt öffnen / Regeln & Automatisierungen" görünüyor |
| 16 | **Liste Aciliyet Renk Kodu** | Kırmızı <7 gün / Turuncu 7–20 / Gri 20+ — HEUTE WICHTIG istatistik kartları ile tutarlı |
| 17 | **Sync Göstergesi** | "Synchronisierung läuft..." pilü görünüyor, tamamlanınca kayboluyor — doğru lifecycle |
| 18 | **Reply Assistant — dev akışı** | Şablon seçimi → form doldurma → draft üretimi (§ 49 Abs. 1 OWiG atıflı) → "Entwurf kopieren" → yeşil "✓ Kopiert" feedback — dev build'de uçtan uca çalışıyor. **Not: bu akış production-ready değil; bkz. Bölüm 3 P0.** |
| 19 | **Yasal Uyarı Zinciri** | Amber Hinweis + "Kein Rechtsrat" pill + alt bilgi + "Anwalt oder Verbraucherzentrale" — Reply Assistant boyunca tutarlı |

---

## 3. Visual / Product WARN Findings — 8.1 Beta Blockers

Aşağıdaki kalemler functional olarak çalışıyor; ancak beta dağıtımı veya public release için blocker niteliğindedir.

| Öncelik | Alan | Sorun |
|---------|------|-------|
| **P0 — beta blocker** | **Reply Assistant DEV etiketleri** | "[DEV] Vorlagenkandidaten", "[DEV] Antrag auf Akteneinsicht", "[DEV] Entwurfsvorschau" başlıkları + dahili şablon ID'leri (`bussgeld_akten_einsicht_009`, `risk: high`, `match: category`) harici bir kullanıcıya görünür durumda. Bu build ayırt etmeden herhangi bir external dağıtımda gösterilir. Beta öncesi kesinlikle kaldırılmalı. |
| **P1 — beta blocker** | **Datenschutz / Privacy copy DSGVO riski** | "Deine Daten bleiben auf deinem Gerät" ifadesi yanıltıcı — OCR analizi belge içeriğini harici API sunucusuna gönderiyor. Bu copy hukuki incelemeden geçmeden ve güncellenmeden herhangi bir kullanıcıya gösterilemez. |
| **P1 — beta blocker** | **ABSENDER / Briefkopf çıkarım tutarsızlığı** | "Gemeinschaftspraxis Djam Dudi/Peter alm" ham OCR metninde mevcut; TEL/FAX doğru çıkarılıyor. Ancak ABSENDER alanı "Unbekannt" kalıyor. Amber uyarı doğru tetikleniyor, ama bilgi hâlâ yanlış. Kullanıcıya yanlış bilgi vermek "Unbekannt" göstermekten daha kötüdür — bu yapısal çıkarım borcu 8.1'de kapanmalı. |
| **P1 ✅ visual gate PASSED** | **OCR result ekran hierarchy** | Compact redesign patch tamamlandı (2026-06-06): static review PASS, tsc PASS, scanner entry PASS. Cihazda smoke doğrulaması henüz tamamlanmadı — kalem bağımsız olarak izlenmeye devam ediyor. |
| **P1 — beta blocker** | **Language screen: debug warning + CTA safe-area kesintisi** | Açılışta "Open debugger to view warnings" dev toast görünüyor. Aynı ekranda dil seçim CTA'sı safe-area dışına taşıyor — beta kullanıcısında hem güven hem erişilebilirlik sorunu. |
| **P1 — beta blocker** | **Keyboard / safe-area form usability** | Reply Assistant form alanları klavye açıldığında görünüm alanına gömülüyor; "Schließen" butonu klavye arkasında kaybolabiliyor. Doğrulama cihazda tamamlanmadı — beta öncesi scroll/avoidance davranışı onaylanmalı. |
| **P1 — NO-GO blocker** | **Android scanner dismiss/resume lifecycle** | Android kamera görünümünden geri dönüş veya iptal siyah ekran ya da belirsiz UI state üretebiliyor. Tarama sırasında veya analiz başlamadan önce ekran kilidi tetiklenebiliyor. `takePhotoWithScanner()` Android'de `takePhoto()` (plain ImagePicker) olarak fall-back yapıyor; camera session suspend/resume Android Activity lifecycle'ıyla tam uyumlu değil. OCR result ekranından scanner açılıyor (PASS), ancak dismiss/resume dönüş yolu cihazda NO-GO: siyah ekran ve ekran kilidi gözlemlendi. 8.1 limited beta başlamadan AC-1..AC-7 doğrulaması zorunlu. |
| **P2** | **PDF dosya adı umlaut eksik** | `Behorden_Amt_18-05-2026_unterschreiben.pdf` — "Behorden" yerine "Behörden". Liste görünümünde doğru; export pipeline'da sanitization bozuluyor. |
| **P2** | **OCR metin kalitesi — alan sınırı** | "Vertragsarktstenbe Unverschrift des Arztes" — karmaşık alan düzeninde model sınırı. Backend/OCR pipeline'a dokunulmadan çözülmez; 8.1 için izleme. |
| **P2** | **Badge / chip yoğunluğu** | Liste kartlarında DEMO + deadline renk badge'i + amber "Angaben prüfen" badge'i üst üste biniyor; görsel gürültü. |

---

## 4. Kritik Ayrım

> **Functional PASS does not mean production-ready visual quality.**

| Gözlem | Functional | Visual/Product |
|--------|-----------|----------------|
| PDF imzala/paylaş akışı | ✅ PASS — uçtan uca çalışıyor | ⚠️ WARN — imza yerleştirme sonrası visual guidance zayıf |
| Reply Assistant draft üretimi | ✅ PASS — § 49 Abs. 1 OWiG atıflı draft oluşturuyor | 🔴 P0 — "[DEV]" etiketleri ve ID'ler beta'da kabul edilemez |
| Amber Hinweis sistemi | ✅ PASS — belirsiz alanlarda doğru tetikleniyor | ⚠️ P1 — ABSENDER uyarısı doğru, ama bilgi hâlâ "Unbekannt" |
| OCR sonuç ekranı | ✅ PASS — veri çıkarımı çalışıyor | ✅ visual gate PASSED — compact redesign patch tamamlandı (2026-06-06); cihaz smoke bekleniyor |
| Android scanner lifecycle | 🔴 NO-GO — camera dismiss/back siyah ekran veya belirsiz state; ekran kilidi tetiklenebiliyor | 🔴 NO-GO — 8.1 limited beta blocker; cihazda AC-1..AC-7 doğrulaması zorunlu |

---

## 5. 8.1 Beta Geçişi için Kapatılması Gereken Kalemler

Aşağıdakiler kapatılmadan 8.1 limited beta başlatılamaz:

1. **[P0] Reply Assistant DEV etiket ve ID sızdırma** — build-time strip veya feature flag ile kaldır
2. **[P1] Datenschutz popup copy** — DSGVO-compliant metin + hukuki onay zorunlu
3. **[P1] ABSENDER structured extraction** — ham OCR'dan kuruluş adı pipeline'ı
4. **[P1 ✅ visual gate PASSED] OCR result ekran compact redesign** — static review + tsc PASS; done state'de full upload box gösterilmiyor, compact new-analysis block aktif; cihaz smoke bekleniyor
5. **[P1] Language screen debug toast + CTA safe-area** — beta build'de dev overlay bastır, CTA konumunu düzelt
6. **[P1] Reply Assistant keyboard / safe-area** — form scroll ve Schließen görünürlüğünü cihazda doğrula
7. **[P1 NO-GO] Android scanner dismiss/resume lifecycle** — camera dismiss/back → siyah ekran veya belirsiz state; ekran kilidi tarama/OCR sırasında tetiklenebiliyor; AC-1..AC-7 doğrulaması olmadan 8.1 dağıtımı yapılamaz
8. **[P2] PDF export dosya adı umlaut** — filename sanitization pipeline
9. **[P2] Belge detay action grouping** — "Schnelle Aktionen" / "Weitere Aktionen" / "Abschließen" şeması
10. **Visual QA checklist** — her 8.x release'den önce bu audit formatında gözden geçirme zorunlu

---

## 6. Final Verdict

| Build | Karar | Gerekçe |
|-------|-------|---------|
| **8.0 Android internal** | ⚠️ PASS with WARN | Core akışlar çalışıyor, functional P0 blocker yok. Yalnızca dahili test için kabul edilebilir. Harici dağıtım, TestFlight veya Play Store için kullanılamaz. |
| **8.1 limited beta** | 🔴 BLOCKED | P1 NO-GO: Android scanner dismiss/resume lifecycle (siyah ekran, ekran kilidi — AC-1..AC-7 zorunlu). P0: [DEV] label disiplin. P1: Datenschutz copy, ABSENDER extraction, OCR result redesign (visual gate PASSED; cihaz smoke bekleniyor), Language screen, Keyboard/safe-area. Bunlar kapatılmadan dağıtım yapılamaz. |
| **Public rollout** | 🔴 NOT READY | Hukuki inceleme (privacy copy), beta doğrulaması ve visual/product backlog tamamlanmadan geçilemez. Tarih verilmemiştir. |

---

*Bu audit frame-by-frame VQA gözlemine dayanır (Pixel 9 Pro, Android 15, build 8.0 internal, 2026-06-06).*  
*Commit edilmedi — review ve onay bekleniyor.*
