"""
Daily EOD price ingestion via the official NSE Bhavcopy.

yfinance is unusable from CI/datacenter IPs (Yahoo blocks them, returning
empty responses). NSE's own "security-wise full bhavdata" archive is a single
CSV containing OHLCV for every equity in one request, and is reachable from
GitHub Actions (the company seed uses the same host).

Schedule: GitHub Actions, daily at 16:30 IST (11:00 UTC) on weekdays.
"""

import io
import os
from datetime import date, timedelta

import pandas as pd
import requests
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

MAX_SYMBOLS = int(os.environ.get("MAX_SYMBOLS", "5000"))
LOOKBACK_DAYS = 10  # walk back to skip weekends/holidays

BHAV_URL = "https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_{ddmmyyyy}.csv"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept": "text/csv,application/octet-stream,*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.nseindia.com/",
}


def fetch_latest_bhavcopy() -> tuple[pd.DataFrame, date]:
    """Download the most recent available bhavcopy, walking back over holidays."""
    session = requests.Session()
    session.headers.update(HEADERS)
    # Prime cookies (NSE sets cookies on the homepage before serving archives)
    try:
        session.get("https://www.nseindia.com/", timeout=20)
    except requests.RequestException:
        pass

    for delta in range(LOOKBACK_DAYS):
        d = date.today() - timedelta(days=delta)
        if d.weekday() >= 5:  # Sat/Sun
            continue
        url = BHAV_URL.format(ddmmyyyy=d.strftime("%d%m%Y"))
        try:
            resp = session.get(url, timeout=30)
            if resp.status_code == 200 and resp.text.strip():
                df = pd.read_csv(io.StringIO(resp.text))
                df.columns = [c.strip() for c in df.columns]
                if "SYMBOL" in df.columns and len(df):
                    print(f"  Using bhavcopy for {d.isoformat()} ({len(df)} rows)")
                    return df, d
        except requests.RequestException as e:
            print(f"    {d.isoformat()}: {e}")
            continue
    raise RuntimeError("No bhavcopy found in the last %d days" % LOOKBACK_DAYS)


def get_active_symbols(client) -> set[str]:
    """Paginated fetch — a single .execute() silently truncates to PostgREST's
    default row cap, well under the ~2400 active companies."""
    symbols: set[str] = set()
    page_size = 1000
    offset = 0
    while True:
        resp = (
            client.table("companies")
            .select("symbol")
            .eq("is_active", True)
            .range(offset, offset + page_size - 1)
            .execute()
        )
        rows = resp.data
        if not rows:
            break
        symbols.update(r["symbol"] for r in rows)
        if len(rows) < page_size:
            break
        offset += page_size
    return symbols


def _num(v):
    try:
        f = float(str(v).strip())
        return f if f == f else None  # filter NaN
    except (TypeError, ValueError):
        return None


def run():
    print("Connecting to Supabase...")
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    active = get_active_symbols(client)
    print(f"  {len(active)} active symbols in DB")

    print("Fetching NSE bhavcopy...")
    df, trade_date = fetch_latest_bhavcopy()

    # Keep only regular equity series and symbols we track
    df["SERIES"] = df["SERIES"].astype(str).str.strip()
    df["SYMBOL"] = df["SYMBOL"].astype(str).str.strip()
    df = df[df["SERIES"].isin(["EQ", "BE"])]
    df = df[df["SYMBOL"].isin(active)]
    print(f"  {len(df)} rows after filtering to tracked equities")

    price_records, quote_records = [], []
    for _, row in df.iterrows():
        sym = row["SYMBOL"]
        close = _num(row.get("CLOSE_PRICE"))
        if close is None:
            continue
        prev = _num(row.get("PREV_CLOSE"))
        o = _num(row.get("OPEN_PRICE"))
        h = _num(row.get("HIGH_PRICE"))
        lo = _num(row.get("LOW_PRICE"))
        vol = _num(row.get("TTL_TRD_QNTY"))
        change = round(close - prev, 2) if prev is not None else None
        change_pct = round((change / prev) * 100, 4) if prev else None

        price_records.append({
            "symbol": sym, "date": trade_date.isoformat(),
            "open": o, "high": h, "low": lo, "close": close,
            "volume": int(vol) if vol is not None else None,
        })
        quote_records.append({
            "symbol": sym, "price": close, "change": change, "change_pct": change_pct,
            "open": o, "high": h, "low": lo, "prev_close": prev,
            "volume": int(vol) if vol is not None else None,
        })

    def upsert(table, records, conflict):
        n = 0
        for i in range(0, len(records), 500):
            batch = records[i:i + 500]
            client.table(table).upsert(batch, on_conflict=conflict).execute()
            n += len(batch)
            print(f"  {table}: upserted {n}/{len(records)}")
        return n

    print(f"Upserting {len(price_records)} prices + quotes...")
    upsert("prices", price_records, "symbol,date")
    upsert("quotes", quote_records, "symbol")
    print(f"Done. {len(price_records)} price records for {trade_date.isoformat()}.")


if __name__ == "__main__":
    run()
