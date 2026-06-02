# Fix: P1 #5 — Detail Tab Bar Navigation Hierarchy
**Date:** 2026-06-02  
**Status:** FIXED  
**Risk:** LOW

## Problem
Detail stack-level screen'e girildiğinde bottom tab bar kapanmıyordu.
`setTabBarHidden(true)` mount'da çağrılmadığı için Tabs Navigator
arka planda yaşamaya devam ediyordu → `CustomBottomTab` görünür + tıklanabilir kalıyordu.

## Fix

**Dosya:** `src/features/detail/DetailScreen.tsx`

```tsx
// import eklendi
import { setTabBarHidden } from '@/navigation/tabBarVisibility';

// useFocusEffect genişletildi
useFocusEffect(
  useCallback(() => {
    setTabBarHidden(true);         // focus → tab bar gizle
    return () => {
      setTabBarHidden(false);      // blur/cleanup → tab bar geri getir
      void Speech.stop();          // mevcut cleanup korundu
    };
  }, []),
);
```

## Pattern Referansı
Aynı `setTabBarHidden` pattern'i `src/features/home/index.tsx` içinde
seçim modunda kullanılıyor (commit 43a12dc70). Yeni bir mekanizma değil.

## Validation
- `npx tsc --noEmit` PASS
- Detail açılınca: bottom tab bar görünmez
- Detail'den geri dönünce: bottom tab bar geri gelir
- Home/Search tab davranışı değişmez
- Android hardware back sonrası cleanup çalışır (useFocusEffect return)

## Commit
fix(nav): hide tab bar on detail screen focus
