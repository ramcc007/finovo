"""
Bulk and block deals from NSE's daily files (nsearchives.nseindia.com/content/equities/bulk.csv and block.csv).

Each file holds the latest trading day only, so the history builds up from the day this job starts.
Safe to run twice a day: rows are unique on (date, symbol, client, side, quantity, type).

Schedule: weekdays after the close (see ingest-bulk-deals.yml).
"""

import io
import os
from datetime import datetime

import pandas as pd
import requests
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

BASE = "https://nsearchives.nseindia.com/content/equities/"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
           "Accept": "text/csv,*/*", "Referer": "https://www.nseindia.com/"}


def active_symbols(client) -> set[str]:
    out, start = set(), 0
    while True:
        rows = client.table("companies").select("symbol").eq("is_active", True).range(start, start + 999).execute().data or []
        out.update(r["symbol"] for r in rows)
        if len(rows) < 1000:
            return out
        start += 1000


def load(kind: str, active: set[str]) -> list[dict]:
    r = requests.get(f"{BASE}{kind}.csv", headers=HEADERS, timeout=30)
    if r.status_code != 200 or not r.text.strip():
        print(f"  {kind}.csv: HTTP {r.status_code}")
        return []
    df = pd.read_csv(io.StringIO(r.text), dtype=str)
    df.columns = [c.strip() for c in df.columns]
    price_col = next((c for c in df.columns if c.lower().startswith("trade price")), None)
    out = []
    for _, row in df.iterrows():
        try:
            sym = str(row["Symbol"]).strip().upper()
            if sym not in active:
                continue  # also drops the "NO RECORDS" placeholder row
            side = str(row["Buy/Sell"]).strip().upper()
            qty = int(float(str(row["Quantity Traded"]).replace(",", "")))
            if side not in ("BUY", "SELL") or qty <= 0:
                continue
            price = float(str(row[price_col]).replace(",", "")) if price_col and str(row[price_col]).strip() not in ("", "-", "nan") else None
            out.append({
                "trade_date": datetime.strptime(str(row["Date"]).strip(), "%d-%b-%Y").date().isoformat(),
                "symbol": sym, "client": str(row["Client Name"]).strip()[:200], "side": side,
                "quantity": qty, "price": price, "deal_type": kind,
            })
        except (KeyError, ValueError):
            continue
    print(f"  {kind}.csv: {len(out)} deals in tracked companies")
    return out


def main() -> int:
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    active = active_symbols(client)
    rows = load("bulk", active) + load("block", active)
    for i in range(0, len(rows), 500):
        client.table("bulk_deals").upsert(rows[i:i + 500], on_conflict="trade_date,symbol,client,side,quantity,deal_type").execute()
    print(f"Done: {len(rows)} deals written.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
