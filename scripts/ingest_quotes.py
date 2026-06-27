"""
Live quote updater via NSE unofficial API.
Fetches near-real-time prices (15 min delayed) during market hours.

Schedule: GitHub Actions, every 5 min on weekdays 09:15–15:35 IST (03:45–10:05 UTC).

NSE public endpoint (no auth needed, just needs proper headers + session cookie):
https://www.nseindia.com/api/market-status
https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050
"""

import os
import time
import requests
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

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


def run():
    print("Fetching live NSE quotes...")
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    try:
        session = get_nse_session()
    except Exception as e:
        print(f"Failed to init NSE session: {e}")
        return

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
                    "updated_at": "now()",
                }
            time.sleep(0.5)
        except Exception as e:
            print(f"  Error fetching {idx_name}: {e}")

    if all_records:
        records = list(all_records.values())
        client.table("quotes").upsert(records, on_conflict="symbol").execute()
        print(f"Updated {len(records)} quotes.")
    else:
        print("No quotes fetched.")


if __name__ == "__main__":
    run()
