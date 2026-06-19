#!/usr/bin/env python3
"""
AI Usage Cost Report — run inside api container:

  python scripts/ai_usage_report.py --since today
  python scripts/ai_usage_report.py --since 24h
  python scripts/ai_usage_report.py --since 7d
  python scripts/ai_usage_report.py --since 30d
  python scripts/ai_usage_report.py --since today > /tmp/ai_cost_today.txt

No PII, no prompts, no raw OCR text is printed.
"""
from __future__ import annotations

import argparse
import os
import sys

# Ensure the repo root (/app inside container) is on the path regardless of cwd
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from datetime import datetime, timedelta, timezone
from typing import Any

SINCE_MAP = {
    "today": "today",
    "24h":   "24h",
    "7d":    "7d",
    "30d":   "30d",
}


def _parse_since(since: str) -> datetime:
    now = datetime.now(timezone.utc)
    if since == "today":
        return now.replace(hour=0, minute=0, second=0, microsecond=0)
    if since == "24h":
        return now - timedelta(hours=24)
    if since == "7d":
        return now - timedelta(days=7)
    if since == "30d":
        return now - timedelta(days=30)
    raise ValueError(f"Unknown --since value: {since!r}. Use: today, 24h, 7d, 30d")


def _period_label(since: str, since_dt: datetime) -> str:
    if since == "today":
        return f"today ({since_dt.strftime('%Y-%m-%d')} UTC)"
    return f"last {since} (since {since_dt.strftime('%Y-%m-%d %H:%M')} UTC)"


def _fmt_cost(val: Any) -> str:
    if val is None:
        return "(unknown)"
    try:
        f = float(val)
        if f == 0:
            return "$0.00"
        if f < 0.000001:
            return f"${f:.10f}"
        return f"${f:.6f}"
    except (TypeError, ValueError):
        return str(val)


def _fmt_tokens(val: Any) -> str:
    if val is None:
        return "—"
    try:
        return f"{int(val):,}"
    except (TypeError, ValueError):
        return str(val)


def _doc_prefix(doc_id: Any) -> str:
    if not doc_id:
        return "—"
    s = str(doc_id)
    return s[:8] + "…" if len(s) > 8 else s


def run(since: str, limit: int) -> None:
    from sqlalchemy import create_engine, text
    from app.config import get_settings

    url = get_settings().database_url.replace("+asyncpg", "+psycopg2")
    engine = create_engine(url, pool_pre_ping=True)

    since_dt = _parse_since(since)
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    with engine.connect() as conn:

        # ── Totals ────────────────────────────────────────────────────────────
        totals = conn.execute(text("""
            SELECT
                COUNT(*)                               AS calls,
                SUM(input_tokens)                      AS input_tokens,
                SUM(output_tokens)                     AS output_tokens,
                SUM(total_tokens)                      AS total_tokens,
                SUM(estimated_cost_usd)                AS cost_usd,
                SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) AS failures
            FROM ai_usage_events
            WHERE created_at >= :since
        """), {"since": since_dt}).fetchone()

        # ── By feature / route / provider / model ────────────────────────────
        by_route = conn.execute(text("""
            SELECT feature, route, provider, model,
                   COUNT(*)              AS calls,
                   SUM(total_tokens)     AS total_tokens,
                   SUM(estimated_cost_usd) AS cost_usd
            FROM ai_usage_events
            WHERE created_at >= :since
            GROUP BY feature, route, provider, model
            ORDER BY cost_usd DESC NULLS LAST
        """), {"since": since_dt}).fetchall()

        # ── Hourly summary ────────────────────────────────────────────────────
        hourly = conn.execute(text("""
            SELECT date_trunc('hour', created_at) AS hour,
                   COUNT(*)                        AS calls,
                   SUM(total_tokens)               AS total_tokens,
                   SUM(estimated_cost_usd)         AS cost_usd
            FROM ai_usage_events
            WHERE created_at >= :since
            GROUP BY 1
            ORDER BY 1 DESC
            LIMIT 48
        """), {"since": since_dt}).fetchall()

        # ── Recent events ─────────────────────────────────────────────────────
        recent = conn.execute(text("""
            SELECT created_at, feature, route, provider, model,
                   document_id, total_tokens, estimated_cost_usd,
                   success, error_type
            FROM ai_usage_events
            WHERE created_at >= :since
            ORDER BY created_at DESC
            LIMIT :lim
        """), {"since": since_dt, "lim": limit}).fetchall()

    engine.dispose()

    # ── Print ─────────────────────────────────────────────────────────────────
    sep  = "─" * 60
    sep2 = "═" * 60

    print(sep2)
    print("  AI USAGE COST REPORT")
    print(sep2)
    print(f"  Period      : {_period_label(since, since_dt)}")
    print(f"  Generated   : {generated_at}")
    print()

    # Totals
    print("TOTAL")
    print(sep)
    if totals and totals[0]:
        print(f"  Calls           : {int(totals[0]):,}")
        print(f"  Input tokens    : {_fmt_tokens(totals[1])}")
        print(f"  Output tokens   : {_fmt_tokens(totals[2])}")
        print(f"  Total tokens    : {_fmt_tokens(totals[3])}")
        print(f"  Estimated cost  : {_fmt_cost(totals[4])}")
        print(f"  Failures        : {int(totals[5] or 0):,}")
    else:
        print("  No data for this period.")
    print()

    # By route
    print("BY FEATURE / ROUTE / PROVIDER / MODEL")
    print(sep)
    if by_route:
        for row in by_route:
            print(f"  {row[0]} / {row[1]} / {row[2]} / {row[3] or '—'}")
            print(f"    Calls       : {int(row[4]):,}")
            print(f"    Tokens      : {_fmt_tokens(row[5])}")
            print(f"    Cost        : {_fmt_cost(row[6])}")
            print()
    else:
        print("  No data.\n")

    # Hourly
    print("HOURLY SUMMARY")
    print(sep)
    if hourly:
        print(f"  {'Hour (UTC)':<20} {'Calls':>6} {'Tokens':>10} {'Cost':>12}")
        print(f"  {'-'*20} {'-'*6} {'-'*10} {'-'*12}")
        for row in hourly:
            h = row[0].strftime("%Y-%m-%d %H:00") if row[0] else "—"
            print(f"  {h:<20} {int(row[1]):>6,} {_fmt_tokens(row[2]):>10} {_fmt_cost(row[3]):>12}")
    else:
        print("  No data.")
    print()

    # Recent events
    print(f"RECENT EVENTS (last {limit})")
    print(sep)
    if recent:
        for row in recent:
            ts      = row[0].strftime("%Y-%m-%d %H:%M") if row[0] else "—"
            status  = "OK" if row[8] else f"FAIL({row[9] or '?'})"
            cost    = _fmt_cost(row[7])
            tokens  = _fmt_tokens(row[6])
            doc     = _doc_prefix(row[5])
            print(f"  {ts}  {row[1]}/{row[2]}  {row[4] or '—'}  doc={doc}  {tokens} tok  {cost}  {status}")
    else:
        print("  No events.")
    print()
    print(sep2)


def main() -> None:
    parser = argparse.ArgumentParser(description="AI usage cost report from ai_usage_events.")
    parser.add_argument(
        "--since",
        default="today",
        choices=list(SINCE_MAP),
        help="Time window: today | 24h | 7d | 30d  (default: today)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=20,
        help="Max recent events to show (default: 20)",
    )
    args = parser.parse_args()

    try:
        run(args.since, args.limit)
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
