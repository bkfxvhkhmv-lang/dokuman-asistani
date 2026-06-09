"""
PII worker — detects personally identifiable information in raw text.
Placeholder: extend with a real NER model (spaCy / Presidio) for GDPR compliance.
"""
import re
from app.workers.celery_app import celery_app
import structlog

log = structlog.get_logger()

IBAN_RE   = re.compile(r'\b[A-Z]{2}\d{2}[\dA-Z]{11,30}\b')
EMAIL_RE  = re.compile(r'\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b')
PHONE_RE  = re.compile(r'(\+?\d[\d\s\-().]{7,}\d)')


@celery_app.task(name="app.workers.pii_worker.scan_pii", bind=True)
def scan_pii(self, doc_id: str, roh_text: str) -> dict:
    log.info("pii.scan_start", doc_id=doc_id)
    findings: list[dict] = []

    for m in IBAN_RE.finditer(roh_text):
        findings.append({"type": "iban", "value": m.group(), "start": m.start()})
    for m in EMAIL_RE.finditer(roh_text):
        findings.append({"type": "email", "value": m.group(), "start": m.start()})
    for m in PHONE_RE.finditer(roh_text):
        val = m.group().strip()
        if len(re.sub(r'\D', '', val)) >= 7:
            findings.append({"type": "phone", "value": val, "start": m.start()})

    log.info("pii.scan_done", doc_id=doc_id, count=len(findings))
    return {"doc_id": doc_id, "findings": findings}
