# BriefPilot UI Governance

## Zorunlu Kurallar

Her yeni ekran ve component, aşağıdaki kurallara uymak zorundadır.
İhlaller PR review'da reddedilir.

---

## Component Kullanım Zorunlulukları

| Durum | Kullanılacak | Yasak |
|---|---|---|
| Ekran section container | `AppSurface` | `<View style={{ backgroundColor: ... }}>` |
| Veri/içerik kartı | `AppCard` | `<View style={{ borderRadius: 16, ... }}>` |
| Liste satırı | `AppListRow` | `<TouchableOpacity style={{ flexDirection: 'row'... }}>` |
| Text input | `AppInput` | `<TextInput style={...} />` |
| Buton | `AppButton` | `<TouchableOpacity style={{ backgroundColor: primary... }}>` |
| Chip/tag/filtre | `AppChip` | `<TouchableOpacity style={{ borderRadius: 999... }}>` |
| Icon button | `AppIconButton` | `<TouchableOpacity><Icon .../></TouchableOpacity>` |
| Header / navbar | `AppBar` | Özel `<View>` header |
| Bottom sheet / modal | `AppSheet` | `<Modal>` + özel `<View>` |
| Bildirim mesajı | `AppToast` | Inline renkli `<View><Text>` |

---

## Token Kullanım Zorunlulukları

```js
// ✅ DOĞRU
import { useTheme } from '../ThemeContext';
const { Colors, Shadow, S, R } = useTheme();

padding: S.md          // 12
borderRadius: R.lg     // 16
...Shadow.sm           // shadow token

// ❌ YANLIŞ — hard-coded değerler
padding: 12
borderRadius: 16
shadowColor: '#000', shadowOpacity: 0.1, ...
```

### Spacing tokens (S)
| Token | Değer | Kullanım |
|---|---|---|
| `S.xs` | 4 | icon gap, tight spacing |
| `S.sm` | 8 | between related elements |
| `S.md` | 12 | standard padding |
| `S.lg` | 16 | section padding |
| `S.xl` | 20 | large gap |
| `S.xxl` | 24 | modal padding |
| `S.xxxl` | 32 | screen-level spacing |

### Radius tokens (R)
| Token | Değer | Kullanım |
|---|---|---|
| `R.sm` | 8 | chips inner, badges |
| `R.md` | 12 | inputs, small cards |
| `R.lg` | 16 | cards, buttons, surfaces |
| `R.xl` | 20 | modals, large surfaces |
| `R.xxl` | 24 | sheet tops |
| `R.full` | 999 | pills, fully rounded |

### Shadow tokens (Shadow)
| Token | Ne zaman |
|---|---|
| `Shadow.sm` | Cards, surfaces — subtle lift |
| `Shadow.md` | Floating toasts, overlays |
| `Shadow.lg` | Primary CTA buttons — primary-tinted |

---

## activeOpacity Standardı

```js
// Primary / CTA buttons → 0.88
// Secondary buttons, list rows → 0.75
// Chips, segment tabs → 0.82
// Link text, ghost → 0.72
// Backdrop (sheet close) → 1
```

---

## Typography Ritmi

```js
// DesignTypography token'ları kullan
import { DesignTypography } from '../design/tokens';

// Eyebrow header (section başlıkları)
fontSize: 10, fontWeight: '700', letterSpacing: 0.8

// Label (input label, metadata)
fontSize: 12, fontWeight: '600', letterSpacing: 0.1

// Body
fontSize: 14, fontWeight: '400', lineHeight: 20

// Title (modal başlıkları)
fontSize: 18, fontWeight: '700', letterSpacing: -0.2

// Display (büyük rakamlar)
fontSize: 32, fontWeight: '800', letterSpacing: -0.6
```

---

## Component Anatomy

### AppSurface — ekran section container
```jsx
<AppSurface>              // elevated=true, padding=16, radius=16
  <AppListRow label="..." icon="gear" accessory="chevron" onPress={...} />
  <AppListRow label="..." icon="bell" />
</AppSurface>
```

### AppCard — veri kartı
```jsx
<AppCard radius={14} padding={12}>
  <Text>...</Text>
</AppCard>
```

### AppListRow — liste satırı
```jsx
<AppListRow
  icon="gear"
  iconColor={Colors.primary}
  label="Ayarlar"
  sublabel="Hesap ve güvenlik"
  accessory="chevron"
  onPress={() => router.push('/settings')}
/>
<AppListRow
  icon="trash"
  iconColor={Colors.danger}
  label="Hesabı Sil"
  danger
  onPress={handleDelete}
/>
```

### AppInput — metin girişi
```jsx
// Standart
<AppInput label="E-Mail" icon="envelope" value={email} onChangeText={setEmail} />

// Şifre
<AppInput label="Passwort" secure value={password} onChangeText={setPassword} />

// Arama
<AppInput variant="search" value={query} onChangeText={setQuery} onClear={clearQuery} />

// Hata durumu
<AppInput label="E-Mail" error="Ungültige E-Mail-Adresse" value={email} ... />
```

### AppButton — buton
```jsx
// Primary CTA
<AppButton label="Speichern" onPress={handleSave} />

// Icon ile
<AppButton label="Exportieren" icon="download" variant="secondary" onPress={...} />

// Yükleme durumu
<AppButton label="Laden..." loading={isLoading} onPress={...} />

// Tehlikeli aksiyon
<AppButton label="Löschen" variant="danger" onPress={handleDelete} />
```

### AppSheet — bottom sheet
```jsx
<AppSheet visible={open} onClose={() => setOpen(false)} title="Filtern">
  <AppListRow ... />
</AppSheet>
```

---

## Anti-Pattern Listesi

```jsx
// ❌ Raw TextInput
<TextInput style={{ borderWidth: 1, borderRadius: 12, ... }} />
// ✅ AppInput

// ❌ Inline buton
<TouchableOpacity style={{ backgroundColor: Colors.primary, borderRadius: 16, padding: 14 }}>
  <Text style={{ color: '#fff' }}>Speichern</Text>
</TouchableOpacity>
// ✅ AppButton label="Speichern"

// ❌ Hard-coded shadow
shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }
// ✅ ...Shadow.sm

// ❌ Hard-coded renk
backgroundColor: '#EEEDFE'
// ✅ backgroundColor: Colors.primaryLight

// ❌ Hard-coded padding
padding: 16
// ✅ padding: S.lg

// ❌ Özel section container
<View style={{ backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, ...Shadow.sm }}>
// ✅ <AppSurface>

// ❌ Özel list row
<TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
  <Icon name="gear" /><Text>Ayarlar</Text><Icon name="chevron-forward" />
</TouchableOpacity>
// ✅ <AppListRow icon="gear" label="Ayarlar" accessory="chevron" onPress={...} />
```

---

## Yeni Ekran Checklist

Yeni bir ekran yazarken şu soruları sor:

- [ ] Tüm `<TextInput>` → `AppInput` ile mi değiştirildi?
- [ ] Tüm primary/secondary butonlar → `AppButton` mü?
- [ ] Tüm section container'lar → `AppSurface` mı?
- [ ] Tüm list satırları → `AppListRow` mü?
- [ ] `padding: <sayı>` yerine `padding: S.lg` gibi token mı kullanılıyor?
- [ ] `borderRadius: <sayı>` yerine `R.lg` gibi token mı?
- [ ] `shadowColor: '#000'...` yerine `...Shadow.sm/md/lg` mi?
- [ ] `activeOpacity` değeri standart listede mi (0.88 / 0.82 / 0.75 / 0.72)?
- [ ] Renk değerleri `Colors.*` token'ından mı geliyor?
- [ ] `import { Ionicons }` veya `import { MaterialIcons }` yok mu?

---

## Design System Dosya Haritası

```
src/design/
├── tokens.js           ← DesignColors, DesignTypography, DesignSpacing...
├── motion.js           ← Motion.fast/normal/slow/spring
├── GOVERNANCE.md       ← Bu dosya
└── components/
    ├── index.js        ← Tüm export'lar buradan
    ├── AppBar.js       ← Header / navbar
    ├── AppButton.js    ← Buton (primary, secondary, danger, ghost)
    ├── AppCard.js      ← Veri kartı
    ├── AppChip.js      ← Chip / tag / filtre pill
    ├── AppIconButton.js← Icon-only yuvarlak buton
    ├── AppInput.js     ← Text input (default, search, underline)
    ├── AppListRow.js   ← Liste satırı
    ├── AppSheet.js     ← Bottom sheet
    ├── AppStatCard.js  ← İstatistik kartı (header stripe + büyük sayı)
    ├── AppSurface.js   ← Ekran section container
    └── AppToast.js     ← Bildirim/durum mesajı
```
