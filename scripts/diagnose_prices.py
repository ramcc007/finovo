"""
One-off diagnostic: why does HDFCBANK (and possibly others) show no
historical price data on the chart despite the backfill reporting success.

Usage: SYMBOLS=HDFCBANK,RELIANCE python scripts/diagnose_prices.py
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

        comp = client.table("companies").select("*").eq("symbol", symbol).execute()
        print(f"companies rows: {len(comp.data)}")
        if comp.data:
            print(f"  is_active={comp.data[0].get('is_active')!r} sector={comp.data[0].get('sector')!r}")
        else:
            print("  NOT FOUND in companies table")

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

        # Also check for symbol variants (whitespace, case)
        like = (
            client.table("companies")
            .select("symbol")
            .ilike("symbol", f"%{symbol}%")
            .execute()
        )
        print(f"  companies symbols matching ilike '%{symbol}%': {[r['symbol'] for r in like.data]}")

    # Total prices rows in table, and how many distinct symbols
    total = client.table("prices").select("symbol", count="exact").limit(1).execute()
    print(f"\nTotal prices rows in table: {total.count}")

    active = client.table("companies").select("symbol", count="exact").eq("is_active", True).execute()
    print(f"Total active companies: {active.count}")


if __name__ == "__main__":
    run()
