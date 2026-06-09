"""
MinIO / S3 object storage service.
"""
from io import BytesIO
import minio
from minio.error import S3Error
import structlog
from app.config import get_settings

log = structlog.get_logger()
settings = get_settings()

_client: minio.Minio | None = None


def get_minio() -> minio.Minio:
    global _client
    if _client is None:
        _client = minio.Minio(
            settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_secure,
        )
        _ensure_bucket(_client)
    return _client


def _ensure_bucket(client: minio.Minio) -> None:
    if not client.bucket_exists(settings.minio_bucket):
        client.make_bucket(settings.minio_bucket)
        log.info("minio.bucket_created", bucket=settings.minio_bucket)


async def upload_file(data: bytes, object_key: str, content_type: str = "application/octet-stream") -> str:
    client = get_minio()
    client.put_object(
        settings.minio_bucket,
        object_key,
        BytesIO(data),
        length=len(data),
        content_type=content_type,
    )
    log.info("storage.uploaded", key=object_key, size=len(data))
    return object_key


async def download_file(object_key: str) -> bytes:
    client = get_minio()
    response = client.get_object(settings.minio_bucket, object_key)
    data = response.read()
    response.close()
    return data


async def delete_file(object_key: str) -> None:
    client = get_minio()
    client.remove_object(settings.minio_bucket, object_key)
    log.info("storage.deleted", key=object_key)


def get_presigned_url(object_key: str, expires_seconds: int = 3600) -> str:
    from datetime import timedelta
    client = get_minio()
    return client.presigned_get_object(
        settings.minio_bucket,
        object_key,
        expires=timedelta(seconds=expires_seconds),
    )
