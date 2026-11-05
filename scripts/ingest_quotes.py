"""
Live quote updater via NSE unofficial API.
Fetches near-real-time prices during market hours.

Schedule: one long-running GitHub Actions job per trading day (see
.github/workflows/ingest-quotes.yml). GitHub fires busy cron schedules only a
couple of times a day, so instead of a */5 cron the job itself loops every
LOOP_INTERVAL seconds until LOOP_UNTIL (epoch seconds). Without LOOP_UNTIL it
runs LOOP_COUNT passes, which keeps manual/local runs single-shot.

Also refreshes intraday index levels (the ticker bar) from /api/allIndices,
plus Sensex from Yahoo Finance (BSE is not in NSE's feed). Without this the
`indices` table only moves once a day via the EOD archive job.

NSE public endpoints (no auth needed, just proper headers + session cookie):
https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050
https://www.nseindia.com/api/allIndices

NSE's Akamai bot-management fronts these JSON endpoints (unlike the plain
CSV archives on nsearchives.nseindia.com used by the EOD jobs) and started
404-ing every request from GitHub Actions around late June — plain `requests`
only speaks HTTP/1.1 with no browser TLS fingerprint, which datacenter-IP
bot detection flags. curl_cffi impersonates a real Chrome TLS/JA3 fingerprint
over HTTP/2, which is what community NSE scrapers use to stay reachable from
CI/cloud environments.
"""

import os
import sys
import time
from datetime import datetime, timezone
from urllib.parse import quote
from curl_cffi import requests
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

# How many fetch passes to run and how far apart to space them. Defaults keep
# the old single-shot behavior for manual/local runs.
LOOP_COUNT = max(1, int(os.environ.get("LOOP_COUNT", "1")))
LOOP_INTERVAL = max(10, int(os.environ.get("LOOP_INTERVAL", "60")))
# Epoch seconds. When set, passes continue until this time (long-running job mode).
LOOP_UNTIL = int(os.environ.get("LOOP_UNTIL", "0") or 0)

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
    """NSE requires a valid cookie from a page visit before API calls.
    impersonate="chrome124" makes curl_cffi present a genuine Chrome
    TLS/JA3 fingerprint over HTTP/2 — without it these requests get a fake
    404 from NSE's bot detection despite browser-like headers."""
    session = requests.Session(impersonate="chrome124")
    session.headers.update(HEADERS)
    session.get(NSE_BASE, timeout=10)
    time.sleep(1)
    return session


def fetch_index_quotes(session: requests.Session, index_name: str) -> list[dict]:
    # NSE rejects "+" for spaces in the index name (what a params= dict produces)
    # and answers 404; it wants the %20 form a browser sends.
    url = f"{NSE_BASE}/api/equity-stockIndices?index={quote(index_name)}"
    resp = session.get(url, timeout=15)
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


def fetch_sensex_live() -> dict | None:
    """Intraday Sensex from Yahoo Finance (^BSESN); BSE is not in NSE's feed.
    Returns last/change/change_pct or None. Never raises."""
    try:
        import yfinance as yf
        info = yf.Ticker("^BSESN").fast_info
        last = float(info.last_price or 0)
        prev = float(info.previous_close or 0)
        if not last or not prev:
            return None
        change = round(last - prev, 2)
        return {"last": last, "change": change, "change_pct": round(change / prev * 100, 2)}
    except Exception as e:
        print(f"  Sensex (yfinance) failed: {e}")
        return None


def update_index_levels(client, session) -> int:
    """Refresh last/change on the rows the daily EOD job created — matched by
    name so we never invent rows (rank/name/ordering stay owned by that job).
    Returns the number of index rows written."""
    try:
        resp = session.get(f"{NSE_BASE}/api/allIndices", timeout=15)
        resp.raise_for_status()
        live = resp.json().get("data", [])
    except Exception as e:
        print(f"  Error fetching allIndices: {e}")
        live = []

    live_by_name = {}
    for r in live:
        name = (r.get("index") or r.get("indexName") or "").strip().lower()
        if name:
            live_by_name[name] = r

    try:
        existing = client.table("indices").select("symbol, name").execute().data or []
    except Exception as e:
        print(f"  Error reading indices table: {e}")
        return 0

    now_iso = datetime.now(timezone.utc).isoformat()
    sensex = fetch_sensex_live() if any((row.get("symbol") or "").upper() == "SENSEX" for row in existing) else None
    updates = []
    for row in existing:
        if (row.get("symbol") or "").upper() == "SENSEX":
            if sensex:
                updates.append({"symbol": row["symbol"], "name": row["name"], **sensex, "updated_at": now_iso})
            continue
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
                # `name` is NOT NULL and Postgres checks that on the proposed row
                # before ON CONFLICT runs, so an upsert without it fails even for
                # rows that already exist. (This silently broke every pass.)
                "name": row["name"],
                "last": last,
                "change": round(float(change), 2) if change is not None else None,
                "change_pct": round(float(change_pct), 2) if change_pct is not None else None,
                "updated_at": now_iso,
            })
        except (TypeError, ValueError):
            continue

    if updates:
        client.table("indices").upsert(updates, on_conflict="symbol").execute()
        print(f"  Updated {len(updates)} index levels.")
    else:
        print("  No index levels matched.")
    return len(updates)


def run_once(client) -> tuple[int, int]:
    session = get_nse_session()
    quotes = update_stock_quotes(client, session)
    indices = update_index_levels(client, session)
    return quotes, indices


def run() -> tuple[int, int]:
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    total_quotes = total_indices = 0
    i = 0
    while True:
        started = time.monotonic()
        label = f"until {datetime.fromtimestamp(LOOP_UNTIL, timezone.utc):%H:%M} UTC" if LOOP_UNTIL else f"of {LOOP_COUNT}"
        print(f"Pass {i + 1} ({label}): fetching live NSE data...", flush=True)
        try:
            q, n = run_once(client)
            total_quotes += q
            total_indices += n
        except Exception as e:
            # One bad pass (cookie expiry, transient NSE block) shouldn't kill
            # the remaining passes.
            print(f"  Pass failed: {e}", flush=True)
        i += 1
        more = (time.time() + LOOP_INTERVAL < LOOP_UNTIL) if LOOP_UNTIL else (i < LOOP_COUNT)
        if not more:
            break
        elapsed = time.monotonic() - started
        time.sleep(max(0, LOOP_INTERVAL - elapsed))
    return total_quotes, total_indices


if __name__ == "__main__":
    # A run that writes nothing on every pass means an NSE endpoint is
    # blocked/changed, not a transient blip — this exact failure mode went
    # unnoticed in production for ~3 weeks because the job kept exiting 0.
    # Fail loudly so GitHub Actions surfaces it instead of masking it.
    quotes, indices = run()
    print(f"Done: {quotes} stock quotes and {indices} index levels written in total.")
    if quotes == 0 and indices == 0:
        print("Nothing was updated in any pass — treating as a failed run.")
        sys.exit(1)
    if quotes == 0:
        print("Warning: index levels updated but no stock quotes (the per-index NSE endpoint may be blocked).")
