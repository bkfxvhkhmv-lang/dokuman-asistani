# Smoke Known Issues — 2026-06-03

## Android: E-Mail akışı beyaz ekran
- Status: **OPEN / NEEDS REPRO**
- Platform: Android (Pixel 9 Pro)
- Akış: Belge → E-Mail aksiyonu → mail gönder → BriefPilot'a dön → confirmation sheet → Kaydet → beyaz ekran
- Tekrarlanabilirlik: Bir kez gözlemlendi, ikinci denemede çıkmadı
- Log: `[APPSHEET_GUARD] forced unmount after close timeout` öncesinde mevcut
- Root cause: bilinmiyor, timing/modal state race condition şüpheli
- Aksiyon: Release öncesi ayrı smoke oturumunda log açık tekrar test edilecek

---

## iOS: Signed PDF fullscreen freeze
- Status: **CLOSED**
- Platform: iOS (iPhone)
- Akış: PDF imzala → Dokument tab → Vollbild / preview tap → ekran donuyor
- Fixed by: `00346b6bb` — `fix(viewer): defer pdf unmount to prevent scroll freeze after close`
- Validation: iOS physical device confirmed
  - Vollbild açılıyor ✓
  - Close sonrası Dokument tab scroll donmuyor ✓
  - Actions (Export, Edit, Delete) çalışıyor ✓
