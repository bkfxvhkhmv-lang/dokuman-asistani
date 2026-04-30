
RULES = [
    {
        "id": "bussgeld-basic",
        "name": "Bußgeld erkennen & Frist setzen",
        "description": "Erkennt Bußgelder, Fristen und Beträge automatisch.",
        "category": "Recht",
        "installed": False,
        "rating": 4.8,
        "downloads": 1200,
    },
    {
        "id": "rechnung-auto",
        "name": "Rechnung automatisch verarbeiten",
        "description": "Findet Betrag, IBAN und Zahlungsziel.",
        "category": "Finanzen",
        "installed": False,
        "rating": 4.7,
        "downloads": 980,
    },
    {
        "id": "versicherung-check",
        "name": "Versicherung prüfen",
        "description": "Erkennt Policen und wichtige Fristen.",
        "category": "Versicherung",
        "installed": False,
        "rating": 4.6,
        "downloads": 720,
    },
]

"""Regel-Marktplatz Stub — echte Liste folgt eigenem Release; Clients erwarten keinen 404."""

from typing import Any

from fastapi import APIRouter

router = APIRouter(prefix="/marketplace", tags=["marketplace"])


@router.get("/rules")
async def list_rules(
    category: str | None = None,
    tag: str | None = None,
    q: str | None = None,
    limit: int = 40,
) -> dict[str, Any]:
    """Leerer Katalog bis Regelverwaltung aktiv ist."""
    return {"rules": RULES}


@router.post("/rules/{rule_id}/install")
async def install_rule(rule_id: str, body: dict[str, Any] | None = None) -> dict[str, bool]:
    return {"ok": True}


@router.delete("/rules/{rule_id}/install")
async def uninstall_rule(rule_id: str) -> dict[str, bool]:
    return {"ok": True}


@router.post("/rules/{rule_id}/rate")
async def rate_rule(rule_id: str, body: dict[str, Any]) -> dict[str, bool]:
    return {"ok": True}
