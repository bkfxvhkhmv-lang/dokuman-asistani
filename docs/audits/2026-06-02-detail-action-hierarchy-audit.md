# Audit: P2 #10 — Detail Ekranı Aksiyon Hiyerarşisi
**Date:** 2026-06-02  
**Status:** AUDIT ONLY — patch bekliyor  
**Risk:** LOW

## Aksiyon Haritası

Aksiyonlar 4 farklı yüzeyde dağılmış:

| Yüzey | İçerik |
|---|---|
| Header | Geri + "Erinnerung aktiv" badge (sağ boş) |
| Aktionen tab — ActionsPanel | Primary büyük kart (Zahlen/Einspruch/Kalender/Mail) + secondary chip'ler |
| Aktionen tab — Araçlar bölümü | 3 section: Teilen&Export / Bearbeiten / Abschließen (~10 row) |
| Dokument tab — alt bar | Edit (primary dolu buton) + Export (outline) + Löschen (küçük metin) |

Modal zinciri: ExportierenSheet, LoeschenModal, EinspruchSheet, SignaturePdfSheet, PaymentPrepareSheet, OptionsSheet vb.

## Problems Found

### HIGH — Edit aksiyonu çelişen görsel ağırlıkta
- `Dokument` tab'ında `backgroundColor: C.primary` (dolu, beyaz yazı) = primary görünüm.
- `Aktionen` tab section 2'de secondary list row = aynı aksiyon, farklı önem izlenimi.
- Referans: `DetailsPanel.tsx:231-237`

### HIGH — Löschen'in görsel güvencesi Dokument tab'ında eksik
- `Aktionen` tab'ında: hafif kırmızı arka planlı chip (`${C.danger}0D`) — var ama hafif.
- `Dokument` tab'ında: `fontSize:13, color:C.danger, paddingVertical:8` küçük metin bağlantısı — border/affordance yok.
- Referans: `DetailsPanel.tsx:252-259` vs `MoreMenuSheet.tsx:89-109`

### MEDIUM — Export iki yerde eşit ağırlıkta
- Dokument tab alt barında outline buton → ExportierenSheet.
- Aktionen tab section 1'de `menu_exportieren` row → aynı ExportierenSheet.
- Duplicate entry point, farklı discoverability.

### MEDIUM — 5 dead config key
`DetailActionsTab.tsx` SECTIONS'ta `menu_chat`, `menu_kur`, `menu_formular`, `menu_h`, `anon` tanımlı; `useDetailMoreItems.ts` bunları hiç push etmiyor. Bölümler filter(Boolean) ile temizleniyor ama bakım yükü yaratıyor.

### LOW — MoreMenuSheet kullanılmıyor
`MoreMenuSheet.tsx` tam implement edilmiş; `DetailModalsContainer`'da hiç `modal.open('mehr')` yok. Ölü component, ilerideki "..." header butonu için hazır bekliyor görünüyor.

## Minimal Fix Plan (en yüksek 3 değer)

**Fix 1 — Dokument tab Löschen'e border ekle** (HIGH değer, LOW risk)  
`DetailsPanel.tsx:252-259` — `borderWidth:1, borderColor:C.dangerBorder, borderRadius:R.md, paddingHorizontal:16` ekle. `backgroundColor` yok — mevcut tasarım kararı korunuyor.

**Fix 2 — Dokument tab Edit butonunu secondary'ye indir** (HIGH değer, LOW risk)  
`DetailsPanel.tsx:231-237` — `backgroundColor:C.bgCard, borderWidth:1, borderColor:C.border, color:C.text`. Aktionen tab'ındaki secondary row ile tutarlı olur.

**Fix 3 — Dead config temizliği** (MEDIUM değer, ZERO risk)  
`DetailActionsTab.tsx:26-41` SECTIONS'tan `menu_chat`, `menu_kur`, `menu_formular`, `menu_h`, `anon` çıkar.

## What NOT to Change
- `handleDeleteConfirm` / `handleDeleteUndo` — 3 saniyelik undo mekanizması doğru.
- `LoeschenModal` pending/confirm phase ayrımı.
- `ExportierenSheet` conditional `visible_options` filtre mantığı.
- `ActionsPanel` `inferPrimaryKey` algoritması.
- `DetailStickyTabBar` ve tab navigasyon mantığı.
- `ENABLE_RELEASE_*` feature flag'leri.
- translations.ts.

## Proposed Commit
```
fix(detail): Löschen-Border, Edit-Hierarchie und tote Section-Keys
```

## Kalan Açık İşler (bu audit kapsamı dışında)
- Export duplikasyonunu tek entry point'e indirme — daha büyük UX karar gerektirir.
- MoreMenuSheet'in kullanılıp kullanılmayacağı kararı.
