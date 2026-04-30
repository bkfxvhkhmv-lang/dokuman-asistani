from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
import structlog

from app.config import get_settings
from app.database import init_db
from app.api import health, documents, analysis, search, share, marketplace

log = structlog.get_logger()
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("startup.begin")
    await init_db()
    log.info("startup.db_ready")
    yield
    log.info("shutdown")


app = FastAPI(
    title="BriefPilot API",
    version="0.1.0",
    docs_url="/docs" if settings.environment == "development" else None,
    redoc_url=None,
    lifespan=lifespan,
)

# CORS — mobile app origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus metrics
Instrumentator().instrument(app).expose(app, endpoint="/metrics")

_V4_PREFIX = "/api/v4"

# ── Mobile / v4 client: API_BASE ends with …/api/v4 ─────────────────────────
app.include_router(health.router, prefix=_V4_PREFIX)
app.include_router(documents.router, prefix=_V4_PREFIX)
app.include_router(documents.sync_alias_router, prefix=_V4_PREFIX)
app.include_router(analysis.router, prefix=_V4_PREFIX)
app.include_router(search.router, prefix=_V4_PREFIX)
app.include_router(share.router, prefix=_V4_PREFIX)
app.include_router(marketplace.router, prefix=_V4_PREFIX)

# Legacy / direct paths (unchanged)
app.include_router(health.router)
app.include_router(documents.router)
app.include_router(documents.sync_alias_router)
app.include_router(analysis.router)
app.include_router(search.router)
app.include_router(share.router)
app.include_router(marketplace.router)
