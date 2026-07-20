"""
Live quote updater via NSE unofficial API.
Fetches near-real-time prices (15 min delayed by the exchange) during market hours.

Schedule: GitHub Actions, every 5 min on weekdays 09:15–15:35 IST (03:45–10:05 UTC).
Each run loops LOOP_COUNT times at ~LOOP_INTERVAL seconds, so with the 5-min cron
and LOOP_COUNT=4 the effective data freshness is ~60–75s at zero infra cost.

Also refreshes intraday index levels (the ticker bar) from /api/allIndices —
without this the `indices` table only moves once a day via the EOD archive job.

NSE public endpoints (no auth needed, just proper headers + session cookie):
https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050
https://www.nseindia.com/api/allIndices
"""

import os
import sys
import time
from datetime import datetime, timezone
import requests
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

# How many fetch passes to run and how far apart to space them. Defaults keep
# the old single-shot behavior for manual/local runs.
LOOP_COUNT = max(1, int(os.environ.get("LOOP_COUNT", "1")))
LOOP_INTERVAL = max(10, int(os.environ.get("LOOP_INTERVAL", "60")))

NSE_BASE = "https://www.nseindia.com"
NSE_INDICES = [
    "NIFTY 50",
    "NIFTY NEXT 50",
    "NIFTY MIDCAP 150",
    "NIFTY SMALLCAP 250",
    "NIFTY BANK",
    "NIFTY IT",
    "NIFTY PHARMA",
    "NIFTY AUTO",
    "NIFTY FMCG",
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://www.nseindia.com/",
}


def get_nse_session() -> requests.Session:
    """NSE requires a valid cookie from a page visit before API calls."""
    session = requests.Session()
    session.headers.update(HEADERS)
    session.get(NSE_BASE, timeout=10)
    time.sleep(1)
    return session


def fetch_index_quotes(session: requests.Session, index_name: str) -> list[dict]:
    url = f"{NSE_BASE}/api/equity-stockIndices"
    resp = session.get(url, params={"index": index_name}, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    return data.get("data", [])


def update_stock_quotes(client, session) -> int:
    now_iso = datetime.now(timezone.utc).isoformat()
    all_records = {}
    for idx_name in NSE_INDICES:
        try:
            stocks = fetch_index_quotes(session, idx_name)
            for s in stocks:
                symbol = s.get("symbol", "")
                if not symbol or symbol in ("NIFTY 50", "NIFTY BANK", "Total"):
                    continue

                price = float(s.get("lastPrice", 0) or 0)
                prev = float(s.get("previousClose", price) or price)
                change = round(price - prev, 2)
                change_pct = round((change / prev) * 100, 4) if prev else 0

                all_records[symbol] = {
                    "symbol": symbol,
                    "price": price,
                    "change": change,
                    "change_pct": change_pct,
                    "open": float(s.get("open", price) or price),
                    "high": float(s.get("dayHigh", price) or price),
                    "low": float(s.get("dayLow", price) or price),
                    "prev_close": prev,
                    "volume": int(s.get("totalTradedVolume", 0) or 0),
                    "updated_at": now_iso,
                }
            time.sleep(0.5)
        except Exception as e:
            print(f"  Error fetching {idx_name}: {e}")

    if all_records:
        records = list(all_records.values())
        client.table("quotes").upsert(records, on_conflict="symbol").execute()
        print(f"  Updated {len(records)} quotes.")
    else:
        print("  No quotes fetched.")
    return len(all_records)


def update_index_levels(client, session) -> None:
    """Refresh last/change on the rows the daily EOD job created — matched by
    name so we never invent rows (rank/name/ordering stay owned by that job).
    Sensex is BSE-only (not in NSE's feed) and keeps its EOD value."""
    try:
        resp = session.get(f"{NSE_BASE}/api/allIndices", timeout=15)
        resp.raise_for_status()
        live = resp.json().get("data", [])
    except Exception as e:
        print(f"  Error fetching allIndices: {e}")
        return

    live_by_name = {}
    for r in live:
        name = (r.get("index") or r.get("indexName") or "").strip().lower()
        if name:
            live_by_name[name] = r

    try:
        existing = client.table("indices").select("symbol, name").execute().data or []
    except Exception as e:
        print(f"  Error reading indices table: {e}")
        return

    updates = []
    for row in existing:
        name = (row.get("name") or "").strip().lower()
        r = live_by_name.get(name)
        if not r:
            continue
        try:
            last = float(r.get("last") or 0)
            if not last:
                continue
            change = r.get("variation")
            change_pct = r.get("percentChange")
            updates.append({
                "symbol": row["symbol"],
                "last": last,
                "change": round(float(change), 2) if change is not None else None,
                "change_pct": round(float(change_pct), 2) if change_pct is not None else None,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
        except (TypeError, ValueError):
            continue

    if updates:
        client.table("indices").upsert(updates, on_conflict="symbol").execute()
        print(f"  Updated {len(updates)} index levels.")
    else:
        print("  No index levels matched.")


def run_once(client) -> int:
    session = get_nse_session()
    updated = update_stock_quotes(client, session)
    update_index_levels(client, session)
    return updated


def run() -> int:
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    total_updated = 0
    for i in range(LOOP_COUNT):
        started = time.monotonic()
        print(f"Pass {i + 1}/{LOOP_COUNT}: fetching live NSE data...")
        try:
            total_updated += run_once(client)
        except Exception as e:
            # One bad pass (cookie expiry, transient NSE block) shouldn't kill
            # the remaining passes.
            print(f"  Pass failed: {e}")
        if i + 1 < LOOP_COUNT:
            elapsed = time.monotonic() - started
            time.sleep(max(0, LOOP_INTERVAL - elapsed))
    return total_updated


if __name__ == "__main__":
    # A run that fetches zero quotes on every pass means the NSE endpoint is
    # blocked/changed, not a transient blip — this exact failure mode went
    # unnoticed in production for ~3 weeks because the job kept exiting 0.
    # Fail loudly so GitHub Actions surfaces it instead of masking it.
    if run() == 0:
        print("No quotes were updated in any pass — treating as a failed run.")
        sys.exit(1)
