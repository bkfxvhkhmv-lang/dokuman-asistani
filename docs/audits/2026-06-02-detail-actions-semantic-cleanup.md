# Fix: Detail Actions Semantic Cleanup
**Date:** 2026-06-02  
**Status:** FIXED  
**Risk:** LOW

## Changes

### 1. "İmzayı kaldır" → Düzenle bölümüne taşındı
`DetailActionsTab.tsx` SECTIONS config:
- **Önce:** `menu_revert_sig` "Paylaş ve dışa aktar" bölümünde
- **Sonra:** `menu_revert_sig` "Düzenle" bölümünde

İmza kaldırma bir export/paylaşma değil, belgeyi değiştiren bir işlem. Düzenle altında semantik olarak doğru.

### 2. "Düzenle" row subtitle kaldırıldı
`useDetailMoreItems.ts`:
- **Önce:** `subtitle: t('detail.action.edit_subtitle')` — "Belge bilgilerini düzenle"
- **Sonra:** subtitle yok

Başlık zaten yeterince açıklayıcı; alt satır gereksiz tekrar.

## What Was NOT Changed
- İmza kaldırma logic/handler
- Export/share logic
- Delete logic
- translations.ts (key artık kullanılmıyor ama silinmedi)
- Layout, spacing, card size
- "E-posta" kartı, alt boşluk

## Validation
- `npx tsc --noEmit` PASS
- "Dışa Aktar" → Paylaş ve dışa aktar ✓
- "İmzayı kaldır" → Düzenle ✓
- "Düzenle" row subtitle yok ✓
- "Belgeyi sil" destructive konumda ✓
