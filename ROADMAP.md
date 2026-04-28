# BriefPilot — Modülarizasyon & Architecture 2.0 Roadmap

Beta sonrasına ertelenen, net sınırlarla tanımlanmış bölünme planı.
Her madde bağımsız — sırası değiştirilebilir.

---

## 🟢 HIZLI KAZANIMLAR (Effort: 1 — yarım günlük iş)

### 1. AuroraBackground → Design System
```
MEVCUT:  src/features/home/index.tsx (inline component, 20 satır)
HEDEF:   src/design/components/AuroraBackground.tsx
NEDEN:   Tasarım sistemi primitive'i, Home'a özgü değil.
         Onboarding, Login, Header'da da kullanılabilir.
```

### 2. DetailScreen Animasyonları → useDetailScreenAnimations
```
MEVCUT:  src/features/detail/DetailScreen.tsx (satır 82-146)
         scrollY, mountOpacity, mountScale, tabOpacity, swipeX
         + PanResponder setup + interpolation'lar
HEDEF:   src/features/detail/hooks/useDetailScreenAnimations.ts
NEDEN:   65 satır saf animasyon mantığı. Ekrandan bağımsız,
         test edilebilir, swipe-back başka ekranlarda da lazım.
```

### 3. Action Session Manager → useActionSessionManager
```
MEVCUT:  src/features/detail/DetailScreen.tsx (satır 71-79 + 322-352)
         AppState listener + pendingActionSession state
HEDEF:   src/features/detail/hooks/useActionSessionManager.ts
NEDEN:   "Kullanıcı bankacılık uygulamasından döndü, onay ister mi?"
         akışı başlı başına bir özellik. Diğer aksiyonlara da lazım.
```

### 4. handleSmartAction Tekrarını Birleştir
```
MEVCUT:  handleSmartAction (satır 173-188)
         handleOzetAktion  (satır 267-272)
         more menu handlers (satır 232-265)
         → 3 farklı yerde aynı aksiyon routing
HEDEF:   Tek mapActionToHandler() utility
NEDEN:   Aynı mantık 3 yerde — biri değişince diğerleri unutuluyor.
```

### 5. Demo Data → Ayrı Dosya
```
MEVCUT:  src/store.tsx (satır 181-227) — 5 demo belge inline
HEDEF:   src/data/demoData.ts
NEDEN:   Store mantıkla karışık durmasın.
         Demo güncellenmesi store'a dokunmayı gerektirmesin.
```

---

## 🟡 ORTA ÖNCELİK (Effort: 2 — 1-2 günlük iş)

### 6. utils.ts → 10 Modüle Bölünme
```
MEVCUT:  src/utils.ts (960 satır, 69 fonksiyon, hepsi bir arada)

HEDEF YAPI:
  src/utils/
    formatters.ts      — tarih, tutar, metin formatlama        (~50 satır)
    search.ts          — filtreleme, sıralama, arama parsing   (~120 satır)
    documentAnalysis.ts— benzerlik, fark, graf kurma           (~150 satır)
    riskAnalysis.ts    — OCR riski, sözleşme riski, skor       (~180 satır)
    exporters.ts       — PDF, CSV dışa aktarma                 (~200 satır)
    calendar.ts        — takvim, hatırlatıcı, zamanlama        (~120 satır)
    learningRules.ts   — kural çıkarımı, uygulama             (~100 satır)
    labels.ts          — etiket önerileri                      (~40 satır)
    summary.ts         — özet üretimi                          (~80 satır)
    index.ts           — barrel re-export (geriye dönük uyumluluk)

NEDEN:   Risk analizi ≠ PDF export ≠ takvim.
         Şu an birini import etmek hepsini çekiyor.
         Her modül bağımsız test edilebilir.
NOT:     ~30 dosyada import güncellenmesi gerekir.
```

### 7. v4Api.ts → Dosya Operasyonlarını Ayır
```
MEVCUT:  src/services/v4Api.ts
         uploadDocumentV4(), downloadDocumentV4(),
         shareOriginalFile(), downloadOriginalFileToCache()
         → API çağrıları + dosya sistemi işlemleri bir arada

HEDEF:   src/services/v4FileService.ts (dosya işlemleri)
         src/services/v4Api.ts        (sadece API kontratı)

NEDEN:   API mock'u ≠ dosya sistemi mock'u.
         Profil/ayarlar ekranı da dosya export'u kullanıyor.
```

---

## 🔵 BETA SONRASI / İLERİ AŞAMA (Effort: 3)

### 8. DetailScreen Modal Stack → Ayrı Component
```
MEVCUT:  src/features/detail/DetailScreen.tsx (satır 585-880)
         15 AppSheet + 7 custom modal inline tanımlı
HEDEF:   src/features/detail/DetailModalsContainer.tsx
NEDEN:   ~300 satır modal scaffolding'i ekran mantığından ayırmak
         okunabilirliği dramatik artırır.
         Modal state zaten hook'ta — sadece render taşınacak.
```

### 9. Zod ile Runtime Validation
```
HEDEF:   API response'larına Zod schema ekle
         explainDocument(), deltaSync() öncelikli
NEDEN:   TypeScript derleme zamanında korur, runtime'da korumaz.
         Yanlış backend response sessizce crash yerine
         anlamlı hata verir.
```

### 10. tsconfig strict: noImplicitAny: true
```
HEDEF:   tsconfig.json'a "noImplicitAny": true ekle
         Kalan ~40 any cast'i temizle
NEDEN:   TypeScript'in asıl gücü buradan geliyor.
         Bunu açmadan tip güvenliği yarım kalır.
```

---

## DOKUNULMAYACAKLAR (iyi durumda)

| Alan | Durum |
|---|---|
| Design system (/src/design/) | Mükemmel — true lego pieces, circular dep yok |
| Kamera screen | Zaten split — ScanScreen → Kamerabildschirm proxy |
| store.tsx reducer (31 case) | Uygun boyut — bölmeye gerek yok |
| Services (SmartXxx) | Domain'e göre ayrılmış, iyi durumda |
| hooks/ | useHomeState, useDocumentDerived vb. zaten modüler |

---

## ÖNCE BUNLAR (Beta öncesi tamamlananlar)

✅ Store race condition (hydrated flag)
✅ useMemo async bug
✅ useLangPreference .catch()
✅ DetailScreen null guard
✅ useDocumentAI — gerçek tipler, sessiz catch'ler kaldırıldı
✅ DeltaSyncResult — SyncDocument contract tipi
✅ Onboarding (tek ekran, dil seçimi)
✅ Dil altyapısı (langConfig, useLangPreference, v4Api bağlantısı)
✅ Context-aware swipe (Löschen kaldırıldı)
