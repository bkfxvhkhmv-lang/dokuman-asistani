from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str = "postgresql+asyncpg://bp:bp_secret@localhost:5432/briefpilot"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # MinIO
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin123"
    minio_bucket: str = "briefpilot-docs"
    minio_secure: bool = False

    # Auth
    secret_key: str = "change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    #: Supabase project URL — JWKS = `{supabase_url}/auth/v1/.well-known/jwks.json`.
    #: Reads SUPABASE_URL or common frontend Expo prefixes accidentally pasted server-side.
    supabase_url: str = Field(
        default="",
        validation_alias=AliasChoices(
            "SUPABASE_URL",
            "EXPO_PUBLIC_SUPABASE_URL",
            "NEXT_PUBLIC_SUPABASE_URL",
        ),
    )
    #: Override JWKS URL (default: {supabase_url}/auth/v1/.well-known/jwks.json)
    supabase_jwks_url: str = ""
    #: Optional explicit `iss` override (else derived from supabase_url + /auth/v1).
    supabase_jwt_issuer: str = ""
    #: Legacy / Previous signing: HS256 symmetric secret (Dashboard → Legacy JWT secret).
    supabase_jwt_secret: str = ""
    #: Default audience claim for Supabase access tokens (`authenticated` unless customized).
    supabase_jwt_audience: str = "authenticated"
    #: Verify `aud`; set false only if legacy tokens omit audience.
    supabase_verify_audience: bool = True
    #: Verify JWT `iss` against project (requires `SUPABASE_URL` / issuer config).
    supabase_verify_issuer: bool = Field(
        default=False,
        validation_alias=AliasChoices("SUPABASE_VERIFY_ISSUER"),
    )
    #: Full base URL pasted into Freigabe-Links (mobile / deep link host).
    share_public_base_url: str = "https://share.briefpilot.de"

    # LLM
    llm_provider: str = "openai"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-haiku-4-5-20251001"
    #: When true, decision_worker logs parser vs LLM comparison; does not change document_meta.
    extraction_shadow_mode: bool = Field(
        default=False,
        validation_alias=AliasChoices("EXTRACTION_SHADOW_MODE"),
    )

    # OCR
    #: Master switch: skip worker/inline OCR on upload when false (documents stay pending, no document_texts).
    ocr_enabled: bool = Field(default=True, validation_alias=AliasChoices("OCR_ENABLED"))
    ocr_lang: str = "de"
    #: PaddleOCR pipeline, e.g. PP-OCRv4 (lighter RAM) or empty for library default (often PP-OCRv5 server on v3).
    ocr_pipeline_version: str = Field(
        default="",
        validation_alias=AliasChoices("OCR_PIPELINE_VERSION"),
    )
    ocr_use_gpu: bool = False
    #: Longest RGB side (px); larger uploads are shrunk before Paddle (OOM / slowdown). Set 0 to disable.
    ocr_max_image_side: int = Field(
        default=4096,
        validation_alias=AliasChoices("OCR_MAX_IMAGE_SIDE"),
    )
    #: Paddle runs in a child process when PROCESS_OCR_INLINE_DEV=1 (sec); avoids killing uvicorn on native crash.
    ocr_subprocess_timeout_sec: float = Field(
        default=600.0,
        validation_alias=AliasChoices("OCR_SUBPROCESS_TIMEOUT_SEC"),
    )
    #: If true (development only), run OCR synchronously in the API via a thread pool so Celery worker is optional.
    process_ocr_inline_dev: bool = Field(
        default=False,
        validation_alias=AliasChoices("PROCESS_OCR_INLINE_DEV"),
    )

    # App
    environment: str = "development"
    log_level: str = "INFO"
    cors_origins: list[str] = ["http://localhost:8081"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
