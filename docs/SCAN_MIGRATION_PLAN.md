# Scan / Kamera modülü taşıma planı

**Durum (2026-04-28):** Tarama **tamamen** `src/features/scan/**` altında. **`src/screens/Kamera/` klasörü kaldırıldı.** Tab: `import { ScanScreen } from '@features/scan'` (`app/(tabs)/Kamera.tsx`). **Babel:** `babel-plugin-module-resolver` ile `alias: { '@': './src', '@core': './src/core', '@features': './src/features', '@lib': './src/lib' }` — `tsconfig` `paths` ile hizalı; **`root: ['.']` yok** — köke yanlışlıkla düşen `react` EPS `_artifacts/react-eps.eps` olarak taşındı; **`_artifacts/`** ve **`_backup/`** `.gitignore` içinde.

### Geçmiş fazlar (özet)

Önceki fazlarda: hooks, context, styles, constants, kamera-screen, tüm batch/edit UI, `EditStateMachine`, barrel, `ScannerScreen` / `Kamerabildschirm` silinmesi. Detay: git geçmişi / `_backup/*`.

### Build / alias

- **TypeScript:** `@/*`, `@core/*`, `@features/*`, `@lib/*` → `tsconfig` `paths`.
- **Metro / Babel:** `babel-plugin-module-resolver` — `@`, `@core`, `@features`, `@lib` → `tsconfig` ile aynı kökler; paket adları (`react`, `react-native`) etkilenmez.

**Not (2026):** Kod tabanında `src/**` içi relatif `from '../…'` içe aktarımları **`@/…`** ile standardize edildi. **Barrel dosyaları** (`utils/index.ts`, `store/index.tsx`, `design/components/index.ts`) alt modülleri **`./…` relative** ile re-export eder; `src/utils.ts` gibi **`@/utils` ile aynı ada sahip tekrarlayan shim dosyaları** kaldırıldı (Jest/Babel’da kısmi modül / döngü riski).

## Hedef yapı (referans)

```
src/features/scan/
├── ScanScreen.tsx
├── state/EditStateMachine.ts
├── components/ …
├── hooks/
├── context/
├── kamera-screen/
├── constants.ts, styles.ts
└── index.ts                   # barrel (ScanScreen, …)
```

### İsteğe bağlı / durum

- **Jest:** `preset: jest-expo`, `jest-expo` `tsconfig` `paths` değerlerini `moduleNameMapper` olarak birleştirir (`^@features/(.*)$` dahil); ayrı `jest.config.js` yazmaya çoğu durumda gerek yok.
- Yerel araç çıktıları **`_artifacts/`**, yedekler **`_backup/`** ile repoda tutulmasın (`/.gitignore`).
