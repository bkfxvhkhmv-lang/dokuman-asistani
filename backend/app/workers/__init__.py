"""Background worker package — tasks live in submodule modules."""

from importlib import import_module


def __getattr__(name: str):
    """Lazy submodules — keeps `unittest.mock.patch('app.workers.ocr_worker...')` resolveable."""
    if name == "ocr_worker":
        return import_module("app.workers.ocr_worker")
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


__all__ = ["ocr_worker"]
