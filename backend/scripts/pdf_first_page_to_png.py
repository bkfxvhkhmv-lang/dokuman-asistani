#!/usr/bin/env python3
"""
Rasterize page 1 of a PDF to PNG (no poppler / pdf2image needed).

Install (macOS / Linux — use pip via Python, not bare ``pip``):

  python3 -m pip install pymupdf

Run:

  python3 scripts/pdf_first_page_to_png.py samples/test1.pdf -o samples/pages/test1_page1.png

From the API container:

  docker compose run --rm -v \"$PWD/samples:/app/samples\" api \\
    python3 scripts/pdf_first_page_to_png.py samples/test1.pdf -o samples/pages/test1_page1.png
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ModuleNotFoundError:  # pragma: no cover
    sys.exit(
        "PyMuPDF (import name: fitz) is not installed. From the backend folder run:\n"
        "  python3 -m pip install pymupdf\n"
        "If you see 'pip' not found, never use bare `pip` on macOS — always `python3 -m pip`.",
    )


def main() -> None:
    ap = argparse.ArgumentParser(description="PDF first page → PNG")
    ap.add_argument("pdf", type=Path, help="Input .pdf path")
    ap.add_argument(
        "-o",
        "--output",
        type=Path,
        help="Output .png path (default: <stem>_page1.png next to pdf)",
    )
    ap.add_argument(
        "--zoom",
        type=float,
        default=2.0,
        metavar="FACTOR",
        help="Raster scale (>1 = sharper, default 2)",
    )
    args = ap.parse_args()

    pdf = args.pdf.expanduser().resolve()
    if not pdf.is_file():
        raise SystemExit(f"not a file: {pdf}")

    out = args.output
    if out is None:
        out = pdf.with_name(pdf.stem + "_page1.png")
    else:
        out = out.expanduser().resolve()
    out.parent.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(pdf)
    try:
        if doc.page_count < 1:
            raise SystemExit("PDF has no pages")
        page = doc.load_page(0)
        mat = fitz.Matrix(args.zoom, args.zoom)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        pix.save(str(out))
    finally:
        doc.close()

    print(out)


if __name__ == "__main__":
    main()
