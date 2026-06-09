# Scanner State Snapshot — 2026-05-10
## Aktif commit: 15b570da6  (branch: restore-2026-05-04-night)

---

## Bu Oturumda Yapılan Kalıcı Değişiklikler

### 1. Live pre-resize KALDIRILDI (commit 028fc973c)
- 1080px frame 480px'e pre-resize ediliyordu → corner coords ~4× küçük, conf=0 her zaman
- Fix: `yPlane.copyTo(gray)` — full-res frame pipeline'a geçiyor

### 2. sLastStableResult KALDIRILDI (028fc973c)
- İlk miss'te eski sonucu döndürüyordu → doğrudan ghost polygon kaynağı
- Fix: tamamen kaldırıldı

### 3. edgeSupportScore (028fc973c)
- `computeEdgeSupport()`: 4 kenarda 12'şer nokta, 3×3 komşuluk hit kontrolü
- Formula: `0.70 × avgSideRate + 0.30 × worstSideRate`
- Gate: `< 0.45` → REJECT (live mode)
- Kalibrasyon: gerçek belge min 0.488, ghost max 0.406

### 4. Streak ≥ 2 + timer no-roll (028fc973c)
- `consecutiveLivePassCount >= 2` → ghost tek-frame PASS'ları engeller
- Countdown 600ms ilk kayıpta başlar, her FAIL'de roll etmez

### 5. RETR_LIST + sideLengthConsistency + yeni rank (243100ca9)
- `RETR_EXTERNAL → RETR_LIST`: nested contour'larda belge bulunabilir
- `sideLengthConsistency < 0.50` (live) / `< 0.35` (still) → reject trapezoidal artifacts
- CandidateRank: edgeSupport × 0.35 başa geçti, border penalty tiered (×0.45/0.65/0.88)

### 6. minAreaRect still path edgeSupport gate (243100ca9)
- `rectEdgeSupport < 0.35` → skip — laptop frame güçlü rect'leri engellenir

### 7. Line-assisted candidate generation (15b570da6) ← YENİ
- Contour path conf < 0.65 ürettiğinde devreye girer
- `generateLineCandidates()`: HoughLinesP → h/v gruplama → kesişim → edgeSupport validasyonu
- Top-5 en uzun h + top-5 v çizgi → max 5×C(5,2)=50 kandidat (pratik: ~10-20)
- 0.85× confidence penalty (contour'dan biraz daha az hassas)
- Aynı `candidateLooksLikeDocument` filtresi uygulanıyor

---

## Mevcut Parametreler

### Native (BriefPilotOpenCVHelper.mm)
| Parametre              | Değer                    |
|------------------------|--------------------------|
| CLAHE clip             | 2.0, tile 8×8            |
| Bilateral filter       | d=9, σColor=75, σSpace=75|
| Canny thresholds       | 20 / 70                  |
| MorphClose             | 3×3 RECT                 |
| edgeSupport gate       | 0.45 (live)              |
| sideLengthConsistency  | ≥ 0.50 live / ≥ 0.35 still |
| HoughLinesP minLen     | 15% of min(W,H)          |
| HoughLinesP threshold  | 30 votes                 |
| Line candidate penalty | 0.85×                    |

### sortCorners Versiyonu
Centroid-angle sort — `atan2(y - centroidY, x - centroidX)`

### TypeScript Gates
| Gate              | CONFIDENCE | AREA_MIN | AREA_MAX | ANGLE_MIN | CENTER | ASPECT |
|-------------------|-----------|----------|----------|-----------|--------|--------|
| LIVE_GATE         | 0.50      | 0.08     | 0.97     | 0.40      | 0.20   | 0.20   |
| COMMIT_GATE       | 0.60      | 0.09     | 0.93     | 0.56      | 0.30   | 0.35   |
| CAPTURE_GATE      | 0.35      | 0.01     | 1.00     | 0.40      | 0.20   | 0.20   |
| LAST_GOOD         | 0.45      | 0.08     | —        | 0.55      | —      | —      |
| COMMIT_MOTION_MIN | 0.50      | —        | —        | —         | —      | —      |

---

## Test Sonuçları (15b570da6 üzerinde)

| Senaryo            | Durum        | Not                                           |
|--------------------|-------------|-----------------------------------------------|
| Gri zemin A4       | ✓ İyi        | Referans senaryo — regresyon yok              |
| Mermer masa        | ~ %80        | Line-assisted path ile iyileşti               |
| Siyah zemin        | ✗ Zayıf      | Köşelere yapışamıyor, kayıyor                 |
| Zarf (envelope)    | ✗ Kötü       | A4 aspect'ine göre ayarlamaya çalışıyor       |
| Beyaz zemin        | ✗ Kötü       | Düşük kontrast — contour oluşmuyor            |
| Capture (yamuk)    | ? Test edilmedi | `[ScannerCapture] warp=` logu eklendi       |

---

## Sonraki Oturum İçin Öncelikler

1. **Screen capture ile log al** — `[ScannerCapture]`, `[ScannerLive]` satırları
   - Siyah zeminde köşe kaymalarının kaynağını anlamak
   - Envelope'un hangi skorlarda takıldığını görmek
   - `source=`, `edgeSupp=`, köşe koordinatları

2. **Beyaz zemin** — Contour hiç oluşmuyorsa:
   - HoughLinesP threshold'unu düşür (30 → 20) veya minLen'i azalt
   - Veya CLAHE clip'i artır (2.0 → 3.0) sadece düşük-kontrast senaryolar için

3. **Envelope / non-A4** — `aspectScore` A4'e mi kalibre edilmiş?
   - `candidateLooksLikeDocument` live: `r.aspectScore < 0.35` gate
   - Aspect score hesabını kontrol et — geniş yelpaze mi yoksa A4-only mi?

4. **Siyah zemin köşe stabilitesi** — Line candidate kenar noktaları mı kayıyor?
   - Line path'te `consecutiveLivePassCount` hâlâ ≥ 2 gerektiriyor
   - Belki line-sourced candidates için streak = 1 yeterli?

5. **Yamuk capture** — Yakalanan fotoğrafları kontrol et
   - `[ScannerCapture] corners TL=... TR=... BR=... BL=...` değerleri
   - `warp=video` ise VIDEO_FRAME_W/H = 1080/1920 doğru mu?

---

## Tehlikeli Değişiklikler (geri alındı — tekrar deneme)
- `morphOpen(3×3)`: Canny'den gelen 1px belge kenarlarını siliyor → polygon kaybolur
- `Canny (40/120)`: Düşük kontrast belge kenarlarını kaçırıyor → beyaz zemin bozulur
- `bilateral sigma 100`: Düşük kontrast gradient'leri siliyor → beyaz zemin bozulur
- `GaussianBlur(5×5) after bilateral`: Fark yaratmadı, zayıf gradient senaryolarında risk
- `Hard border reject (bHits ≥ 3)`: Büyük belgeler kısmen frame'in dışındaysa yanlış reject

## Commit Geçmişi
```
15b570da6  feat: line-assisted candidate generation (HoughLinesP fallback)
fa9ab8ea7  fix: remove morphOpen — erased 1px document edges
85e0ac849  fix: revert Canny to 20/70
243100ca9  fix: RETR_LIST + sideLengthConsistency + edgeSupport ranking
028fc973c  fix: live detector root cause + edgeSupport scoring (480px fix)
```
