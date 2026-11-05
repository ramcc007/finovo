"""
Delivery percentage history from NSE's security-wise bhavdata archive.

The daily price job now stores delivery quantity and percentage; this fills the days before it did.
It re-writes each day's price row with the same OHLCV plus the delivery columns, so it is safe to re-run.

Env: DAYS (calendar days back, default 120).
"""

import io
import os
import time
from datetime import date, timedelta

import pandas as pd
import requests
from supabase import create_client
from dotenv import load_dotenv

from ingest_prices import BHAV_URL, HEADERS, _num, get_active_symbols

load_dotenv()

DAYS = int(os.environ.get("DAYS", "120") or 120)


def main() -> int:
    client = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])
    active = get_active_symbols(client)
    session = requests.Session()
    session.headers.update(HEADERS)
    try:
        session.get("https://www.nseindia.com/", timeout=20)
    except requests.RequestException:
        pass

    days_done = rows_total = 0
    for delta in range(1, DAYS + 1):
        d = date.today() - timedelta(days=delta)
        if d.weekday() >= 5:
            continue
        try:
            r = session.get(BHAV_URL.format(ddmmyyyy=d.strftime("%d%m%Y")), timeout=40)
            if r.status_code != 200 or not r.text.strip():
                continue  # holiday or not published
            df = pd.read_csv(io.StringIO(r.text))
            df.columns = [c.strip() for c in df.columns]
            df["SERIES"] = df["SERIES"].astype(str).str.strip()
            df["SYMBOL"] = df["SYMBOL"].astype(str).str.strip()
            df = df[df["SERIES"].isin(["EQ", "BE"]) & df["SYMBOL"].isin(active)]
            recs = []
            for _, row in df.iterrows():
                close = _num(row.get("CLOSE_PRICE"))
                if close is None:
                    continue
                vol, dq, dp = _num(row.get("TTL_TRD_QNTY")), _num(row.get("DELIV_QTY")), _num(row.get("DELIV_PER"))
                recs.append({
                    "symbol": row["SYMBOL"], "date": d.isoformat(),
                    "open": _num(row.get("OPEN_PRICE")), "high": _num(row.get("HIGH_PRICE")), "low": _num(row.get("LOW_PRICE")), "close": close,
                    "volume": int(vol) if vol is not None else None,
                    "delivery_qty": int(dq) if dq is not None else None,
                    "delivery_pct": dp if dp is not None and 0 <= dp <= 100 else None,
                })
            for i in range(0, len(recs), 500):
                client.table("prices").upsert(recs[i:i + 500], on_conflict="symbol,date").execute()
            days_done += 1
            rows_total += len(recs)
            print(f"  {d.isoformat()}: {len(recs)} rows", flush=True)
        except Exception as e:
            print(f"  {d.isoformat()}: {e}", flush=True)
        time.sleep(0.5)
    print(f"Done: {days_done} trading days, {rows_total} rows.", flush=True)
    return 0 if days_done else 1


if __name__ == "__main__":
    raise SystemExit(main())
