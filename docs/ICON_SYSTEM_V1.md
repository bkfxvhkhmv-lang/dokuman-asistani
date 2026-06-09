# BriefPilot — Icon System V1

## Kural: Kullanıcıya Görünen Alanda Emoji Yok

Emoji sadece `__DEV__` log'larında, yorum satırlarında ve **izin listesindeki istisnalarda** kullanılabilir.

Gerekçe: Bir Bußgeldbescheid veya Mahnung belgesiyle ilgilenen kullanıcı için 🚀 veya 🤖 görsel tonu yanlış kurar. Icon = anlam + renk + ağırlık. Emoji = platform bağımlı, erişilebilirlik sorunu, marka tutarsızlığı.

---

## Icon Family: Phosphor (tek family)

Proje `phosphor-react-native` kullanır. `Icon` component'i (`src/components/Icon/`) phosphorMap üzerinden çalışır.

**Kurallar:**
- Tüm ikonlar `<Icon name="..." />` ile çağrılır
- `weight` default: `regular` — vurgu için `bold`, tonal için `fill`
- Ionicons kalıntıları temizlenir (phosphorMap'te alias var, doğrudan import yok)
- Yeni ikon eklenecekse önce phosphorMap'e alias eklenir, sonra kullanılır

---

## 1. Doküman Tipi İkon Listesi

`src/features/detail/constants/documentTypeUi.ts` — single source of truth.

| Tip | Icon name | Renk tonu | Notlar |
|-----|-----------|-----------|--------|
| Mahnung | `warning-circle` | danger | Kırmızı, acil his |
| Bußgeldbescheid | `seal-warning` | danger | Resmi yaptırım |
| Steuerbescheid | `bank` | warning | Finans/resmi |
| Rechnung | `receipt` | primary | Nötr iş belgesi |
| Versicherung | `shield-check` | success | Koruma |
| Terminbestätigung | `calendar-check` | success | Tamamlanan |
| Vertrag | `file-text` | primary | Resmi metin |
| Sonstiges | `file` | textSecondary | Fallback |

**Mevcut durum:** ✅ Bu tablo zaten kod ile eşleşiyor. Değişiklik yok.

---

## 2. Aksiyon İkon Listesi

Hedef: ActionsPanel, MoreMenuSheet, SmartActionsService emoji → Phosphor ikon.

| Aksiyon | Şu an (emoji) | Hedef (Phosphor) | Phosphor adı |
|---------|--------------|-----------------|--------------|
| zahlen / Bezahlen | 💶 | ikon | `currency-eur` |
| einspruch / Einspruch | ✍️ | ikon | `pencil-line` |
| kalender / Kalender | 📅 | ikon | `calendar-blank` |
| mail / E-Mail | 📧 | ikon | `envelope` |
| review / Prüfen | 🧐 | ikon | `magnifying-glass` |
| ai / Verstehen | 🧠 | ikon | `sparkle` |
| erledigt / Erledigt | ✅ | ikon | `check-circle` |
| chat | 💬 | ikon | `chat-circle` |
| antwort / E-Mail öffnen | ✉️ | ikon | `envelope-open` |
| formular | 📋 | ikon | `clipboard-text` |
| pdf export | 📄 | ikon | `file-pdf` |
| teilen | 📤 | ikon | `export` |
| sicher teilen | 🔗 | ikon | `lock-key` |
| original teilen | 📎 | ikon | `paperclip` |
| bearbeiten | 📝 | ikon | `pencil-simple` |
| als offen markieren | ↩️ | ikon | `arrow-counter-clockwise` |
| partner | 🤝 | ikon | `users` |
| kündigen | ✂️ | ikon | `scissors` |
| verlängern | 🔄 | ikon | `arrows-clockwise` |
| aufgabe hinzufügen | ✅ | ikon | `plus-circle` |
| verknüpfte dokumente | 🔗 | ikon | `link` |
| archivieren | 📁 | ikon | `folder` |
| signatur PDF | ✒️ | ikon | `pen-nib` |
| ausgaben übersicht | 📊 | ikon | `chart-bar` |
| behörden | 🏛️ | ikon | `buildings` |
| hilfe | 🆘 | ikon | `lifebuoy` |
| datenschutz / anon | 🙈 🕵️ | ikon | `eye-slash` |
| löschen | 🗑️ | ikon | `trash` |

**Migration notu:** phosphorMap'te eksik olanlar önce eklenir, sonra kod tarafı güncellenir.

---

## 3. Durum ve Risk İkon Listesi

| Anlam | Şu an | Hedef | Phosphor adı |
|-------|-------|-------|--------------|
| Dringend / yüksek risk | 🚨 (string) | ikon | `warning` (danger tone) |
| Frist heute | 🔴 (string) | ikon | `clock` (danger tone) |
| Mittel risk | 🟠 (string) | ikon | `clock` (warning tone) |
| Niedrig risk | 🟢 (string) | ikon | `check-circle` (success tone) |
| Stabil trend | → | metin | `arrow-right` veya metin kalır |
| Risiko steigt | ↑ | metin | `arrow-up` veya metin kalır |
| Risiko sinkt | ↓ | metin | `arrow-down` veya metin kalır |
| Lokal/Offline | • (nokta) | dot component | renkli View nokta, ikon değil |
| KI-Analyse aktif | 🤖 | ikon | `sparkle` |
| OCR uyarısı | ⚠️ | ikon | `warning` (warning tone) |
| Pflichtfeld eksik | ⚠️ | ikon | `warning` (danger tone) |

---

## 4. Scanner / Edit İkon Listesi

Kamera UI şu an büyük ölçüde temiz. Korunacak ve referans alınacak:

| Bileşen | Element | Mevcut | Durum |
|---------|---------|--------|-------|
| CameraView | Shutter | Beyaz daire, native-like | ✅ Koru |
| CameraView | Flash toggle | `camera-slash` / `lightning` | ✅ Koru |
| CameraView | Kapat | `close` (X) | ✅ Koru |
| CameraView | Galerie | `image` | ✅ Koru |
| EditView | Filter presets | Metin etiket | ✅ Koru |
| EditView | Rotate | `↺` (unicode) | → `arrow-counter-clockwise` |
| EditView | + / − sayfa | belirsiz etiket | → `plus` / `minus` + tooltip |
| ProcessingView | Scan animasyonu | SVG custom | ✅ Koru |

---

## 5. Korunacak İstisnalar (emoji kalabilir)

Bu alanlar release'de kullanıcıya görünmez veya içerik üretiminin parçasıdır:

| Konum | Emoji | Gerekçe |
|-------|-------|---------|
| `__DEV__` log satırları | her türlü | Kullanıcı görmez |
| AI-generated bullet text | 🗂️ 💡 🚀 | Backend output — UI değil |
| `factors.ts` içindeki icon field | 📅 🚨 🔴 | Risk panel string render, badge değil |
| Demo verisi `zusammenfassung` | – | Değişmez |

---

## 6. Migration Sırası

Küçük, bağımsız commit'ler. Her seferinde TS 0 kontrolü.

### Faz 1 — phosphorMap genişlet
Eksik ikonları `phosphorMap.ts`'e ekle:
`currency-eur`, `pencil-line`, `check-circle`, `chat-circle`, `envelope-open`, `clipboard-text`, `file-pdf`, `lock-key`, `scissors`, `arrows-clockwise`, `plus-circle`, `link`, `pen-nib`, `lifebuoy`, `buildings`, `eye-slash`

Commit: `feat(icons): extend phosphorMap for action icon migration`

### Faz 2 — ActionsPanel emoji → ikon
`ACTION_META` içindeki 7 emoji → phosphor.
Commit: `fix(icons): replace emoji in ActionsPanel action metadata`

### Faz 3 — MoreMenuSheet / useDetailMoreItems emoji → ikon
Commit: `fix(icons): replace emoji in MoreMenu item definitions`

### Faz 4 — SmartActionsService emoji → ikon
Commit: `fix(icons): replace emoji in SmartActionsService`

### Faz 5 — AutoFillReviewModal / SmartSummaryCard header emoji
`🤖 KI-Erkennung prüfen` başlığı ve `🤖 Zusammenfassung` başlığı.
Commit: `fix(icons): replace robot emoji in modal and summary headers`

### Faz 6 — Factors risk icon strings → ikon render
`factors.ts` içindeki string icon field'ları ya kaldırılır ya da RiskPanel'de ikon olarak render edilir.
Commit: `fix(icons): render risk factor icons via Icon component`

### Faz 7 — Son tarama
Tüm kaynak dosyalarda emoji grepi, kaçan var mı kontrol.
Commit: `chore(icons): verify no stray emoji in release UI surfaces`

---

## Hedef Durum

- Kullanıcıya görünen her ikon: Phosphor, tutarlı ağırlık, tema rengi
- Emoji: sadece dev log, AI output content, ve factor string field'ları
- `Icon` component tek giriş noktası
- `phosphorMap.ts` tüm alias'ları barındırır
- `documentTypeUi.ts` doküman tipi ikonları için single source of truth
