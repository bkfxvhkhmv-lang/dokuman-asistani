# App route → kaynak ekran (Expo Router)

Kanonik scan kaynağı: **`src/features/scan/**`**. `src/screens/Kamera/` kaldırıldı. **`babel-plugin-module-resolver`:** `@` / `@core` / `@features` / `@lib` kökleri `tsconfig` ile uyumlu (Metro yeniden başlat / `expo start -c`).

| Dosya | Varsayılan ekran kaynağı |
|--------|---------------------------|
| `app/(tabs)/index.tsx` | `src/features/home` |
| `app/(tabs)/Kamera.tsx` | `import { ScanScreen } from '@features/scan'` (barrel) |
| `app/(tabs)/Suche.tsx` | `src/features/search/SearchScreen` |
| `app/(tabs)/Marktplatz.tsx` | `src/features/marketplace/MarketplaceScreen` |
| `app/(tabs)/Profil.tsx` | `src/features/profile/ProfileScreen` |
| `app/detail.tsx` | `src/features/detail` |
| `app/login.tsx` | `src/features/auth` *(LoginScreen)* |
| `app/onboarding.tsx` | `src/features/onboarding` *(OnboardingScreen)* |

Son güncelleme: `app/**/*.tsx` tab ve kök girişleri **`@features/...`** import’larına hizalı (shim `src/screens/*Bildschirm*` aynı alias).
