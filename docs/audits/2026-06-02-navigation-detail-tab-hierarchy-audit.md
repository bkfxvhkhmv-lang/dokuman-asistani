# Audit: P1 #5 — Detail Back + Tab Bar Navigation Hiyerarşisi
**Date:** 2026-06-02  
**Status:** AUDIT — fix hazır, onay bekliyor  
**Severity:** MEDIUM  
**Store blocker:** HAYIR  
**Fix riski:** LOW

---

## Route Hiyerarşisi

```
RootLayout (Stack)
├─ (tabs)        ← Tab Navigator (CustomBottomTab)
│  ├─ index      (Home)
│  ├─ suche      (Search)
│  ├─ kamera     (Scan)
│  └─ profil     (Settings)
├─ detail        ← STACK SCREEN (app/_layout.tsx:65-73)
├─ einstellungen
└─ profil
```

`/detail` stack-level screen olarak tanımlı. Ama **tab bar kapanmıyor.**

---

## Kök Neden

`setTabBarHidden(true)` DetailScreen mount'ında çağrılmıyor. Tabs Navigator arka planda yaşamaya devam ediyor → `CustomBottomTab` hâlâ render ediliyor.

`DetailScreen.tsx:44` → `useContext(BottomTabBarHeightContext)` okuyor, tab bar için padding hesaplıyor — bu da tab bar'ın orada olduğunu varsayıyor.

```
┌──────────────────────┐
│ DetailHeader (Zurück)│  ← Stack geri butonu
├──────────────────────┤
│ DetailStickyTabBar   │  ← İç tab'lar (Özet/Analiz/Eylem/Dok.)
├──────────────────────┤
│ İçerik               │  ← ~56px tab için padding alıyor
├──────────────────────┤
│ CustomBottomTab      │  ← GEREKSIZ — ama görünür ve tıklanabilir
└──────────────────────┘
```

---

## Entry Point Matrisi

| Giriş | Route | Back Davranışı | Tab Bar |
|---|---|---|---|
| Home → Detail | /(tabs) → /detail | ← Zurück → /(tabs) | GÖRÜNÜR (yanlış) |
| Search → Detail | /(tabs) → /detail | ← Zurück → /(tabs) | GÖRÜNÜR (yanlış) |
| Notif/deep link → Detail | ? → /detail | safeBack fallback | GÖRÜNÜR (yanlış) |

Tüm entry point'lerde tutarlı sorun.

**safeBack.ts:** `router.back()` → başarısız olursa `router.replace('/(tabs)/index')`. Yani back her zaman güvenli.

**Android hardware back:** `BackHandler` hook'u yok → Expo Router'ın default back davranışı devreye giriyor (stack pop). Çalışıyor, ama tab bar hâlâ görünür.

---

## Kullanıcı Etkisi

**Gerçek sorunlar:**
1. Tab bar detail'de tıklanabilir → detail'den beklenmedik çıkış riski
2. ~56px ekran alanı boşa gidiyor
3. İki navigation mekanizması aynı anda (back buton + tab bar) → kullanıcı kafa karışıklığı

**Gerçek sorun olmayan:**
- Back butonu doğru çalışıyor
- Tab bar tıklaması crash üretmiyor
- Core workflow'lar tamamlanabiliyor

---

## Minimal Fix — 3-5 satır, LOW risk

`setTabBarHidden` pattern Home screen'de zaten var (commit 43a12dc70). Aynı pattern Detail için:

**`src/features/detail/DetailScreen.tsx` — mevcut useFocusEffect'e ekle:**
```tsx
useFocusEffect(
  useCallback(() => {
    setTabBarHidden(true);     // ← ekle
    return () => {
      setTabBarHidden(false);  // ← ekle
      Speech.stop();           // mevcut
    };
  }, []),
);
```

**Import:** `import { setTabBarHidden } from '@/navigation/tabBarVisibility';` (zaten var)

Başka dosyaya dokunmaya gerek yok.

---

## Do-Nothing Seçeneği

**Teknik olarak:** Güvenli — app çalışmaya devam eder.  
**Pratikte:** Tavsiye edilmez — görsel kalite sorunu, kopyalanabilir anti-pattern.

---

## Karar

Fix trivial, risk düşük, pattern kanıtlanmış. Uygulanması önerilir.

**Proposed commit:**
```
fix(navigation): hide tab bar when detail screen is active
```
