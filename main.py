"""Backward-compatible shim for historic imports.

All deployment logic now lives in ``backend/main.py``. This module simply
re-exports the FastAPI ``app`` and delegates ``main()`` so existing tooling
continues to work while encouraging the separated folder structure.
"""

from backend.main import app, main as _backend_main

__all__ = ["app"]


def main() -> None:  # pragma: no cover - thin wrapper
    _backend_main()


if __name__ == "__main__":  # pragma: no cover
    main()
