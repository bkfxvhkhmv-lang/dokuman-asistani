# Scanner State Snapshot — 2026-05-10
## Git commit: 028fc973c  (branch: restore-2026-05-04-night)

---

## Kritik Düzeltmeler (Bu Committe)

### 1. Live pre-resize KALDIRILDI
- **Eski (kırık):** `detectCornersInPixelBuffer` 1080px frame'i 480px'e küçültüyordu.
  Pipeline'ın iç `scale` değeri sadece kendi resize adımını (örn. 480→400) düzeltiyordu,
  1920→480 küçültmesini değil. Sonuç: köşe koordinatları ~4× küçük, alan ~16× düşük → conf=0.000 her zaman.
- **Fix:** `yPlane.copyTo(gray)` — full-res frame doğrudan pipeline'a geçiyor.
- **Dosya:** `ios/BriefPilot/BriefPilotOpenCVHelper.mm` → `detectCornersInPixelBuffer`

### 2. sLastStableResult KALDIRILDI
- **Eski (kırık):** `static DocumentCornerResult *sLastStableResult` — ilk miss'te eski yüksek kaliteli
  sonucu döndürüyordu. Doğrudan "hayalet polygon" (ghost) kaynağıydı.
- **Fix:** Tamamen kaldırıldı. Pipeline artık her frame'i bağımsız değerlendiriyor.

### 3. edgeSupportScore eklendi
- `computeEdgeSupport()`: quad'ın 4 kenarı boyunca 12'şer nokta örnekliyor,
  3×3 komşulukta edge map hit'i kontrol ediyor.
  Formula: `0.70 × avgSideRate + 0.30 × worstSideRate`
- **Gate (native, live mode):** `edgeSupportScore < 0.45f` → REJECT
  Kalibrasyon: gerçek belge (kararlı) min 0.488, hareket/ghost max 0.406 — gap=0.082
- **Ranking'e katılım (native):**
  ```
  rank = confidence×0.35 + edgeSupportScore×0.25 + areaScore×0.25 + aspectScore×0.10 + centerScore×0.05
  ```

### 4. Streak ≥ 2 (TS tarafı)
- `consecutiveLivePassCount >= 2` şartı — izole tek-frame ghost PASS'ların
  `edges_detected` emit etmesini önler.
- **Dosya:** `src/modules/scanner/engine/CameraEngine.ts` satır ~466-469

### 5. Timer no-roll fix
- Countdown 600ms, ilk kayıp anında başlıyor.
  Her FAIL event'inde timer sıfırlanmıyordu (rolled); şimdi sabit.
- **Dosya:** `src/hooks/useScanner.ts`

---

## Mevcut Eşikler

### Native (BriefPilotOpenCVHelper.mm)
| Parametre            | Değer      |
|----------------------|------------|
| Canny thresholds     | 20 / 70    |
| edgeSupport gate     | 0.45       |
| Multi-scale widths   | 400 / 600 / 900 px |
| Bilateral filter     | d=9, σ=75  |

### sortCorners Versiyonu
Centroid-angle sort (v2) — `atan2(y - centroidY, x - centroidX)` ile sıralıyor.
Sum/diff yaklaşımına göre duplicate-corner failure'ları daha az.
**Dosya:** `ios/BriefPilot/BriefPilotOpenCVHelper.mm` satır 38–65

### TypeScript Gates
| Gate         | CONFIDENCE_MIN | AREA_MIN | AREA_MAX | ANGLE_MIN | CENTER_MIN | ASPECT_MIN |
|--------------|---------------|----------|----------|-----------|------------|------------|
| LIVE_GATE    | 0.50          | 0.08     | 0.97     | 0.40      | 0.20       | 0.20       |
| COMMIT_GATE  | 0.60          | 0.09     | 0.93     | 0.56      | 0.30       | 0.35       |
| CAPTURE_GATE | 0.35          | 0.01     | 1.00     | 0.40      | 0.20       | 0.20       |
| LAST_GOOD    | 0.45          | 0.08     | —        | 0.55      | —          | —          |
| COMMIT_MOTION_MIN | 0.50    | —        | —        | —         | —          | —          |

---

## Şu An Çalışan Senaryolar ✓

- **A4 — gri/beyaz düz zemin:** Çok iyi detection, köşeler kararlı, edgeSupp 0.60–1.00
- **Renkli belge — düz/açık zemin:** İyi detection
- **Polygon overlay:** Gösteriyor (streak≥2 fix sonrası)
- **Auto-capture countdown:** Başlıyor (480px fix sonrası conf düzeldi)

## Hâlâ Sorunlu Senaryolar ✗

- **Mermer masa:** Canny (20/70) mermer damarlarını da edge sayıyor → edge map kirli
  → findContours yanlış contour seçiyor → detection kararsız
- **Siyah laptop üzeri:** Laptop frame'i güçlü rect yapısı oluşturuyor,
  detector gerçek belge yerine laptop kenarlarına kayabiliyor
- **RETR_EXTERNAL limiti:** Arka plan gürültüsü hakim olduğunda dış contour kaçabiliyor
- **Yamuk (skewed) fotoğraflar:** `correctPerspective` / `PerspectiveCorrector.remapToPhotoSpace()`
  test edilmedi — `VIDEO_FRAME_W=1080` ile gerçek `bufferW/H` eşleşmesi kontrol edilmeli

---

## Sonraki Adımlar

1. **Mermer/dark background:** Canny eşiği (20/70) → (40/120) denemesi
   veya `buildEdgeMap`'e bilateral öncesi adaptive histogram clamp eklenmesi
2. **RETR_EXTERNAL → RETR_LIST + alan filtresi:** Daha güçlü contour seçimi
3. **Yamuk test:** Gri zeminde capture alıp skew kontrolü
4. **prevRawCorners timing fix (CameraEngine.ts):** `this.prevRawCorners = corners`
   satırını `checkDisplayGeometry` kontrolünden SONRAYA al (tartışıldı, henüz implement edilmedi)

---

## Değişen Dosyalar (commit 028fc973c)
- `ios/BriefPilot/BriefPilotOpenCVHelper.h` — edgeSupportScore property
- `ios/BriefPilot/BriefPilotOpenCVHelper.mm` — 480px fix + computeEdgeSupport + sLastStableResult kaldırma + gate 0.45
- `ios/LiveScanner/BriefPilotLiveScannerView.swift` — edgeSupportScore event body'e eklendi
- `src/hooks/useScanner.ts` — timer no-roll fix
- `src/modules/scanner/engine/CameraEngine.ts` — edgeSupp log + consecutive streak
- `src/modules/scanner/engine/LiveScanBridge.ts` — edgeSupportScore parsing
- `src/modules/scanner/types.ts` — edgeSupportScore DocumentCorners'a eklendi
