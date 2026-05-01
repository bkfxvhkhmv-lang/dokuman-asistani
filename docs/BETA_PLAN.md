# BriefPilot — Beta 100 Plan

## Sprint hedefi
100 kişiye TestFlight üzerinden BriefPilot'u dağıt.
İlk değer akışını ölç. Kırılan yerleri öğren.

**Başarı:**
60/100 açtı · 40/100 demo gördü · 20/100 anlamlı feedback verdi

---

## TestFlight "What to Test"

```
Bitte teste den Hauptablauf:

1. Öffne die App
2. Tippe auf "Demo ansehen" oder scanne ein eigenes Dokument
3. Prüfe Analyse, Aktionen und Dokument
4. Teste Export
5. Sende Feedback über "Feedback senden"

Wichtigste Frage:
Verstehst du innerhalb von 10 Sekunden, worum es geht und was als Nächstes zu tun ist?

Hinweis: BriefPilot ist eine Beta. Die App ersetzt keine Rechtsberatung.
```

---

## EAS Build

```bash
# Beta build (TestFlight)
eas build --profile testflight --platform ios

# Submit to TestFlight
eas submit --profile testflight --platform ios
```

---

## Davet Mesajı (TR)

Selam, BriefPilot'un ilk beta testini açıyoruz.

BriefPilot, Almanca mektup, fatura ve resmi belgeleri tarayıp ne olduğunu ve ne yapman gerektiğini anlatan bir belge asistanı.

Test etmek için:
1. TestFlight linkinden uygulamayı kur
2. "Demo ansehen" ile örnek belgeyi aç
3. Mümkünse gerçek bir belge tara
4. Uygulama içinden "Feedback senden" ile görüşünü gönder

**Özellikle şunu öğrenmek istiyoruz:**
Belgeyi açınca 10 saniye içinde ne yapman gerektiğini anlıyor musun?

---

## Davet Mesajı (WhatsApp — kısa, TR)

```
BriefPilot beta'sına davetlisin 🎉
Almanca mektup, fatura, Bußgeld — hepsini açıklayan bir uygulama.
TestFlight linki: [LINK]
Sadece 3 dakikan var mı? Dene ve içinden "Feedback senden" ile yaz. 🙏
```

---

## Davet Mesajı (WhatsApp — kısa, DE)

```
BriefPilot Beta ist live 🎉
Deutsche Briefe, Rechnungen, Bußgelder — verständlich erklärt.
TestFlight: [LINK]
Hast du 3 Minuten? Test gerne und schick uns Feedback direkt in der App. 🙏
```

---

## Davet Mesajı (DE)

Hi, wir starten die erste Beta von BriefPilot.

BriefPilot hilft dabei, deutsche Briefe, Rechnungen und Bescheide schneller zu verstehen.

Bitte teste:
1. App über TestFlight installieren
2. "Demo ansehen" öffnen
3. Wenn möglich ein eigenes Dokument scannen
4. Feedback direkt in der App senden

**Wichtigste Frage:**
Verstehst du innerhalb von 10 Sekunden, worum es geht und was als Nächstes zu tun ist?

---

## Tester Profili (100 kişi)

| Segment | Hedef |
|---------|-------|
| Almanya'daki Türk kullanıcı | 30 |
| Expat / İngilizce konuşan | 20 |
| Öğrenci | 15 |
| Küçük esnaf / freelancer | 15 |
| Aile içi belge takipçisi | 10 |
| Teknik / ürün feedback | 10 |

---

## Feedback Sınıflandırması

| Öncelik | Kural | Örnek |
|---------|-------|-------|
| **P0** | Kullanıcı akışı tamamlayamıyor | Scan açılmıyor, app crash, demo açılmıyor |
| **P1** | Kullanıcı değeri anlamıyor | Primary action yanlış, deadline görünmüyor |
| **P2** | UI bozuk / güven düşürüyor | Truncate, kalabalık ekran |
| **P3** | Copy / wording karışık | Almanca metin yanlış anlaşılıyor |
| **P4** | İyi fikir ama launch sonrası | Yeni entegrasyon önerileri |

---

## Ölçülen Eventler

```
beta_opened
onboarding_completed
demo_opened
scan_started
scan_completed
processing_completed
processing_failed
analyse_viewed
actions_viewed
primary_action_clicked
document_exported
feedback_opened
feedback_submitted
```

**Kural:** Event'lerde belge içeriği, IBAN, OCR text, kişisel veri YOK.

---

## Beta Checklist

### Build öncesi
- [ ] App icon var, splash düzgün
- [ ] Bundle ID doğru: `com.briefpilot.app`
- [ ] Version / build number doğru
- [ ] Camera permission text Almanca
- [ ] Demo mode çalışıyor
- [ ] Feedback button çalışıyor
- [ ] Debug UI yok (kırmızı arka plan, console log ekranı, dev menu)

### Core flow test
- [ ] Onboarding → Demo ansehen
- [ ] Demo Home → Analyse
- [ ] Analyse → Aktionen
- [ ] Aktionen → Dokument
- [ ] Dokument → Export
- [ ] Scan → Processing → Analyse
- [ ] Feedback senden

### Hata durumları
- [ ] Kamera izni reddedildi
- [ ] İnternet yok
- [ ] OCR fail
- [ ] Export fail
- [ ] Belge silme onayı

---

## Beta Rapor Şablonu

```
BriefPilot Beta 100 Report

Davet edilen:        100
Install / open:       XX
Onboarding completed: XX
Demo opened:          XX
Scan attempted:       XX
Analyse viewed:       XX
Actions viewed:       XX
Feedback submitted:   XX

Top 5 P0/P1 issue:
1.
2.
3.
4.
5.

Top 5 kullanıcı cümlesi:
1.
2.
3.
4.
5.

Launch kararı: Go / No-Go / Fix first
```
