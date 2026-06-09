from celery import Celery
from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "briefpilot",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "app.workers.ocr_worker",
        "app.workers.decision_worker",
        "app.workers.summary_worker",
        "app.workers.pii_worker",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_routes={
        "app.workers.ocr_worker.*":      {"queue": "ocr"},
        "app.workers.decision_worker.*": {"queue": "ai"},
        "app.workers.summary_worker.*":  {"queue": "ai"},
        "app.workers.pii_worker.*":      {"queue": "ai"},
    },
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)
