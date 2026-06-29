"""
Historical price backfill from NSE Bhavcopy archives.

Downloads one Bhavcopy CSV per trading day going back YEARS_BACK years
and upserts OHLCV into the prices table.  Safe to re-run (upsert on
symbol+date is idempotent).  Skips dates already fully present in DB.

Usage:
  YEARS_BACK=5 python scripts/backfill_prices.py
  FROM_DATE=2021-01-01 TO_DATE=2023-12-31 python scripts/backfill_prices.py
"""

import io
import os
import time
from datetime import date, timedelta

import pandas as pd
import requests
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

YEARS_BACK = int(os.environ.get("YEARS_BACK", "5"))
FROM_DATE = os.environ.get("FROM_DATE")
TO_DATE = os.environ.get("TO_DATE")
DELAY = float(os.environ.get("DELAY", "0.8"))  # seconds between NSE requests

BHAV_URL = (
    "https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_{ddmmyyyy}.csv"
)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept": "text/csv,application/octet-stream,*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.nseindia.com/",
}


def trading_days(start: date, end: date) -> list[date]:
    """Return all weekdays between start and end inclusive."""
    days = []
    d = start
    while d <= end:
        if d.weekday() < 5:
            days.append(d)
        d += timedelta(days=1)
    return days


def get_existing_dates(client) -> set[str]:
    """Fetch distinct dates already in prices table to skip re-downloading."""
    existing: set[str] = set()
    page_size = 1000
    offset = 0
    print("  Scanning existing dates in prices table...")
    while True:
        resp = (
            client.table("prices")
            .select("date")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        rows = resp.data
        if not rows:
            break
        for r in rows:
            existing.add(r["date"])
        if len(rows) < page_size:
            break
        offset += page_size
    print(f"  Found {len(existing)} existing dates, will skip them")
    return existing


def _num(v):
    try:
        f = float(str(v).strip())
        return f if f == f else None
    except (TypeError, ValueError):
        return None


def fetch_bhavcopy(session: requests.Session, d: date) -> pd.DataFrame | None:
    url = BHAV_URL.format(ddmmyyyy=d.strftime("%d%m%Y"))
    for attempt in range(3):
        try:
            resp = session.get(url, timeout=30)
            if resp.status_code == 404:
                return None  # holiday
            if resp.status_code == 200 and resp.text.strip():
                try:
                    df = pd.read_csv(io.StringIO(resp.text))
                except Exception:
                    return None  # malformed response (HTML error page, etc.)
                df.columns = [c.strip() for c in df.columns]
                if "SYMBOL" in df.columns and len(df):
                    return df
                return None
            if resp.status_code in (403, 429):
                wait = (attempt + 1) * 10
                print(f"    Rate limited ({resp.status_code}), waiting {wait}s...")
                time.sleep(wait)
                continue
        except requests.RequestException as e:
            print(f"    {d.isoformat()} attempt {attempt+1}: {e}")
            time.sleep(5)
    return None


def run():
    print("Connecting to Supabase...")
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # Determine date range
    today = date.today()
    if FROM_DATE:
        start = date.fromisoformat(FROM_DATE)
    else:
        start = date(today.year - YEARS_BACK, today.month, today.day)
    end = date.fromisoformat(TO_DATE) if TO_DATE else today - timedelta(days=1)

    print(f"Date range: {start.isoformat()} → {end.isoformat()}")
    days = trading_days(start, end)
    print(f"  {len(days)} trading days to process")

    existing_dates = get_existing_dates(client)

    # Fetch active symbols
    resp = client.table("companies").select("symbol").eq("is_active", True).execute()
    active = {r["symbol"] for r in resp.data}
    print(f"  {len(active)} active symbols")

    session = requests.Session()
    session.headers.update(HEADERS)
    try:
        session.get("https://www.nseindia.com/", timeout=20)
    except requests.RequestException:
        pass

    done = 0
    skipped = 0
    failed = 0
    total_rows = 0

    for i, d in enumerate(days):
        iso = d.isoformat()

        if iso in existing_dates:
            skipped += 1
            continue

        df = fetch_bhavcopy(session, d)
        if df is None:
            # Market holiday or file missing
            failed += 1
            if i % 20 == 0:
                print(f"  [{i+1}/{len(days)}] {iso}: holiday/missing, skip")
            time.sleep(DELAY * 0.25)
            continue

        # Filter to EQ/BE series and tracked symbols
        df["SERIES"] = df["SERIES"].astype(str).str.strip()
        df["SYMBOL"] = df["SYMBOL"].astype(str).str.strip()
        df = df[df["SERIES"].isin(["EQ", "BE"])]
        df = df[df["SYMBOL"].isin(active)]

        records = []
        for _, row in df.iterrows():
            sym = row["SYMBOL"]
            close = _num(row.get("CLOSE_PRICE"))
            if close is None:
                continue
            records.append({
                "symbol": sym,
                "date": iso,
                "open": _num(row.get("OPEN_PRICE")),
                "high": _num(row.get("HIGH_PRICE")),
                "low": _num(row.get("LOW_PRICE")),
                "close": close,
                "volume": int(v) if (v := _num(row.get("TTL_TRD_QNTY"))) is not None else None,
            })

        if records:
            for j in range(0, len(records), 500):
                client.table("prices").upsert(
                    records[j:j+500], on_conflict="symbol,date"
                ).execute()
            total_rows += len(records)

        done += 1
        existing_dates.add(iso)

        if done % 10 == 0 or i == len(days) - 1:
            print(
                f"  [{i+1}/{len(days)}] {iso}: {len(records)} rows | "
                f"done={done} skipped={skipped} holiday={failed} total_rows={total_rows}"
            )

        time.sleep(DELAY)

    print(
        f"\nBackfill complete: {done} days loaded, {skipped} skipped (already in DB), "
        f"{failed} holidays/missing. Total rows inserted: {total_rows}"
    )


if __name__ == "__main__":
    run()
