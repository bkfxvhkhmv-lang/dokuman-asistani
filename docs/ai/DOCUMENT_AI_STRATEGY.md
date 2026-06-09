# BriefPilot Document AI Strategy

---

## Temel Prensip

Kendi büyük dil modelimizi sıfırdan eğitmek **şu aşamada mantıklı değil.**
Pahalı, büyük miktarda etiketli veri gerektirir ve hukuki kalite riski taşır.

**En iyi yol:** OCR + deterministic extraction + RAG + guarded LLM

---

## Katmanlı Mimari

```
Katman 1 — BriefPilot OCR (bizim modelimiz)
  Tamamen lokal, belgeyi okur, %95+ doğruluk
  Output: text, confidence, fields, pages

Katman 2 — Deterministic Pipeline (mevcut)
  Field extraction (regex + ML)
  Categorization (keyword + institution match)
  Risk engine (faktörler + peer comparison)
  Summary (template + hybrid)
  Output: structured JSON, risk score

Katman 3 — RAG + Knowledge Base
  Resmi kurum kuralları (Finanzamt, Sozialamt, etc.)
  Şablon kitaplığı (Widerspruch, Einspruch, etc.)
  Kullanıcının geçmiş onaylı cevapları
  Kullanıcının belge geçmişi (izinli)

Katman 4 — LLM (hosted veya local)
  Sadece taslak üretir, kesin hukuki tavsiye vermez
  RAG context + structured prompt
  Output: draft text, cited sources

Katman 5 — User Approval Gate
  Cevap kullanıcıya gösterilir
  Kullanıcı onaylamadan gönderilmez
  Düzenleme + kaydetme akışı
```

---

## Faz Planı

### Faz 1 — Template + RAG + Hosted LLM (Şimdi)
- Şablon kitaplığı: `src/services/ai/TemplateLibrary.ts` ✅
- Ton ayarı: `src/services/ai/ToneAdjuster.ts` ✅
- Cevap üretici: `src/services/ai/ReplyGenerator.ts` ✅
- Backend: hosted LLM API (OpenAI / Anthropic) güvenli prompt ile
- Beklenti: %80+ kullanıcı memnuniyeti

### Faz 2 — User Style Memory + Approved Dataset
- Kullanıcının onayladığı taslaklar kaydedilir (izinli)
- Kurum bazlı şablonlar oluşturulur
- Kişiselleştirme: "Bu kullanıcı genellikle kısa ve resmi yazar"

### Faz 3 — LoRA / Domain Adapter
- Fine-tune küçük open-source model (Mistral 7B veya benzeri)
- Veri: anonimleştirilmiş belge → onaylı cevap çiftleri
- Hedef: Almanca resmi yazışma kalitesi
- Gereksinim: ~5,000 kaliteli örnek

### Faz 4 — On-Device Small Model (Privacy)
- Hassas belgeler için sunucuya çıkmayan model
- 1-3B parametre, quantized
- Sadece özet + soru-cevap için (taslak değil)

### Faz 5 — Voice Assistant
- Speech-to-text (Whisper veya on-device)
- Intent detection
- Document-grounded Q&A
- Text-to-speech
- "Bu belgeye göre..." → kaynaklı cevap

---

## Güvenlik & Kalite Kuralları

### Hallucination Guard
- Cevap sadece belge context'inden üretilir
- Belge dışı iddia tespit edilirse uyarı gösterilir
- "Bu bilgi belgede bulunmuyor" mesajı

### Legal Disclaimer
- Her taslak: "Bu bir yapay zeka taslağıdır. Hukuki tavsiye değildir."
- Widerspruch / Einspruch: "Avukatınıza danışmanız önerilir."
- Otomatik gönderim yok

### Kaynaklı Cevaplar
```
Soru: "Son ödeme tarihi ne zaman?"
Cevap: "15.02.2024 tarihinde ödenmesi gerekmektedir."
Kaynak: [Sayfa 1, Frist alanı: "Zahlbar bis: 15.02.2024"]
```

### Privacy
- Kullanıcı açık rıza vermeden belge içeriği üçüncü tarafa gönderilmez
- Yerel model varsa tercih edilir
- GDPR compliance: veri minimizasyonu

---

## Ne Yapmamalı

❌ Sıfırdan LLM eğitme — pahalı, riskli, veri yetersiz  
❌ OCR çıktısını filtresiz LLM'e verme — hallucination riski  
❌ Otomatik resmi belge gönderimi — hukuki risk  
❌ PII'yi sunucuya loglama — GDPR ihlali
