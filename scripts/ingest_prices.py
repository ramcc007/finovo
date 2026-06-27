"""
Daily EOD price ingestion via yfinance.
Fetches previous trading day's OHLCV for all active NSE stocks.

Schedule: GitHub Actions, daily at 16:30 IST (11:00 UTC) on weekdays.
"""

import os
import time
from datetime import date, timedelta
from supabase import create_client
import yfinance as yf
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

BATCH_SIZE = 50          # symbols per yfinance batch call
BATCH_DELAY = 2          # seconds between batches (rate limit safety)
MAX_SYMBOLS = int(os.environ.get("MAX_SYMBOLS", "5000"))


def get_active_symbols(client) -> list[str]:
    resp = client.table("companies").select("symbol").eq("is_active", True).execute()
    return [r["symbol"] for r in resp.data]


def yf_symbol(nse_symbol: str) -> str:
    return f"{nse_symbol}.NS"


def fetch_batch_prices(symbols: list[str], target_date: date) -> dict:
    yf_symbols = [yf_symbol(s) for s in symbols]
    ticker_str = " ".join(yf_symbols)

    start = target_date - timedelta(days=5)  # go back 5 days to catch holidays
    end = target_date + timedelta(days=1)

    data = yf.download(
        ticker_str,
        start=start.isoformat(),
        end=end.isoformat(),
        group_by="ticker",
        auto_adjust=True,
        progress=False,
        threads=True,
    )

    result = {}
    for nse_sym, yf_sym in zip(symbols, yf_symbols):
        try:
            if len(symbols) == 1:
                sym_data = data
            else:
                sym_data = data[yf_sym]

            if sym_data.empty:
                continue

            # Get most recent row
            row = sym_data.iloc[-1]
            row_date = sym_data.index[-1].date()

            result[nse_sym] = {
                "symbol": nse_sym,
                "date": row_date.isoformat(),
                "open": float(row["Open"]) if row["Open"] == row["Open"] else None,
                "high": float(row["High"]) if row["High"] == row["High"] else None,
                "low": float(row["Low"]) if row["Low"] == row["Low"] else None,
                "close": float(row["Close"]),
                "volume": int(row["Volume"]) if row["Volume"] == row["Volume"] else None,
            }
        except Exception:
            pass

    return result


def run():
    target_date = date.today()
    print(f"Ingesting prices for {target_date}...")

    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    symbols = get_active_symbols(client)[:MAX_SYMBOLS]
    print(f"  {len(symbols)} active symbols")

    total_upserted = 0
    batches = [symbols[i : i + BATCH_SIZE] for i in range(0, len(symbols), BATCH_SIZE)]

    for i, batch in enumerate(batches):
        print(f"  Batch {i+1}/{len(batches)} ({len(batch)} symbols)...")
        try:
            prices = fetch_batch_prices(batch, target_date)
            if prices:
                records = list(prices.values())
                client.table("prices").upsert(records, on_conflict="symbol,date").execute()
                total_upserted += len(records)

            # Also update the quotes table with latest price
            quote_records = [
                {
                    "symbol": sym,
                    "price": p["close"],
                    "open": p["open"],
                    "high": p["high"],
                    "low": p["low"],
                    "volume": p["volume"],
                    "updated_at": "now()",
                }
                for sym, p in prices.items()
            ]
            if quote_records:
                client.table("quotes").upsert(quote_records, on_conflict="symbol").execute()

        except Exception as e:
            print(f"    Error in batch: {e}")

        time.sleep(BATCH_DELAY)

    print(f"Done. Upserted {total_upserted} price records.")


if __name__ == "__main__":
    run()
