"""
One-off diagnostic: verify price history depth for given symbols.

Usage: SYMBOLS=HDFCBANK,RELIANCE,TCS python scripts/diagnose_prices.py
"""

import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

SYMBOLS = [s.strip() for s in os.environ.get("SYMBOLS", "HDFCBANK").split(",") if s.strip()]


def run():
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    for symbol in SYMBOLS:
        print(f"\n=== {symbol} ===")
        cnt = (
            client.table("prices")
            .select("date", count="exact")
            .eq("symbol", symbol)
            .execute()
        )
        print(f"prices row count: {cnt.count}")

        oldest = (
            client.table("prices")
            .select("date")
            .eq("symbol", symbol)
            .order("date", desc=False)
            .limit(1)
            .execute()
        )
        newest = (
            client.table("prices")
            .select("date")
            .eq("symbol", symbol)
            .order("date", desc=True)
            .limit(1)
            .execute()
        )
        print(f"  oldest date: {oldest.data}")
        print(f"  newest date: {newest.data}")

    total = client.table("prices").select("symbol", count="exact").limit(1).execute()
    print(f"\nTotal prices rows in table: {total.count}")


if __name__ == "__main__":
    run()
