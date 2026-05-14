# BriefPilot OCR Backend Integration Plan

---

## Model Yönetimi

Model dosyaları Git'ten değil **artifact registry**'den alınır.

```bash
# Deployment sırasında:
sha256sum -c artifacts/checksums.sha256
tar -xzf model.tar.gz -C /opt/briefpilot/models/
```

---

## Environment Variables

```env
OCR_MODEL_DIR=/opt/briefpilot/models/current
OCR_DICT_PATH=/opt/briefpilot/models/current/dict/german_dict.txt
OCR_DEVICE=gpu                 # gpu | cpu
OCR_MAX_TEXT_LENGTH=50
OCR_IMAGE_WIDTH=480
OCR_BATCH_SIZE=1               # inference için
OCR_MODEL_VERSION=v6_w480_len50
```

---

## API Endpoints

### POST /ocr/recognize
Tek görüntü veya PDF sayfası için OCR.

**Request:**
```json
{
  "image_base64": "...",
  "page_number": 1,
  "document_id": "optional"
}
```

**Response:**
```json
{
  "text": "Rechnung vom 15.12.2023...",
  "confidence": 94.7,
  "words": [
    { "text": "Rechnung", "bbox": [x,y,w,h], "confidence": 98.2 }
  ],
  "model_version": "v6_w480_len50",
  "warnings": []
}
```

---

### POST /documents/analyze
Belge analizi (OCR + field extraction + risk).

**Response:**
```json
{
  "text": "...",
  "confidence": 94.7,
  "pages": [
    { "page_number": 1, "text": "...", "confidence": 96.1 }
  ],
  "fields": {
    "absender": "Finanzamt München",
    "betrag": 1250.00,
    "frist": "2024-02-15",
    "aktenzeichen": "12/345/67890"
  },
  "risk": { "level": "hoch", "score": 78 },
  "warnings": ["Frist in 7 Tagen"],
  "model_version": "v6_w480_len50"
}
```

---

### POST /documents/:id/ask
Belge hakkında soru-cevap.

**Request:**
```json
{ "question": "Was ist der Betrag dieser Rechnung?" }
```

**Response:**
```json
{
  "answer": "Der Betrag beträgt 1.250,00 EUR.",
  "sources": [
    { "page": 1, "field": "betrag", "excerpt": "Gesamtbetrag: 1.250,00 EUR" }
  ],
  "confidence": "high",
  "disclaimer": "Diese Antwort basiert ausschließlich auf dem Dokumentinhalt."
}
```

---

### POST /documents/:id/draft-reply
Taslak cevap üretimi.

**Request:**
```json
{
  "intent": "widerspruch",
  "tone": "formell"
}
```

**Response:**
```json
{
  "subject": "Widerspruch gegen Bescheid vom 15.12.2023",
  "body": "Sehr geehrte Damen und Herren,\n\nIch widerspreche...",
  "template": "widerspruch",
  "disclaimer": "Dieses Schreiben ist ein Entwurf. Bitte vor dem Versand prüfen.",
  "model_version": "template_v1"
}
```

---

### GET /ocr/health

```json
{
  "model_loaded": true,
  "model_version": "v6_w480_len50",
  "device": "gpu",
  "dict_hash": "58ecc207...",
  "dict_size": 96,
  "uptime_seconds": 3600
}
```

---

## Response Headers

```
X-BriefPilot-OCR-Model: v6_w480_len50
X-BriefPilot-OCR-Confidence: 94.7
```

---

## Güvenlik Notları

- OCR modeli tamamen lokal çalışır — belge içeriği dışarı çıkmaz.
- Soru-cevap için LLM kullanılıyorsa kullanıcı açık rıza vermiş olmalı.
- Taslak cevap "draft" olarak sunulur, otomatik gönderilmez.
- PII içeren field'lar (IBAN, Steuer-ID) response'ta maskeleme seçeneği.
