"""
One-off production data audit (run via .github/workflows/diagnose.yml).

Reports:
  1. Zero-vs-null counts for every key screener_view stat column
     (missing yfinance data used to be stored as 0 — this measures the damage)
  2. Sector label distribution in companies (validates the UI dropdown)
  3. Result count + sample rows for each pre-built screen's filters
  4. Freshness: latest prices date, quotes row count
  5. Price-history depth for a few benchmark symbols
"""

import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

SYMBOLS = [s.strip() for s in os.environ.get("SYMBOLS", "HDFCBANK,RELIANCE,TCS").split(",") if s.strip()]

STAT_COLS = [
    "price", "market_cap", "pe", "pb", "roe", "roce", "net_margin",
    "operating_margin", "debt_to_equity", "dividend_yield",
    "revenue_growth_1y", "profit_growth_1y", "eps_growth_1y",
    "week_high_52", "week_low_52", "promoter_pct", "pledge_pct", "change_pct",
]

SCREENS = {
    "High Quality Compounders (ROE>=20, D/E<=0.5)": [("roe", "gte", 20), ("debt_to_equity", "lte", 0.5)],
    "Value Picks (PE<=15, PB<=2, ROE>=15)": [("pe", "lte", 15), ("pb", "lte", 2), ("roe", "gte", 15)],
    "Dividend Stars (DY>=3, D/E<=1)": [("dividend_yield", "gte", 3), ("debt_to_equity", "lte", 1)],
    "Debt-Free (D/E<=0)": [("debt_to_equity", "lte", 0)],
}


def count_where(client, build):
    q = client.table("screener_view").select("symbol", count="exact")
    q = build(q)
    return q.limit(1).execute().count


def run():
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    total = count_where(client, lambda q: q)
    print(f"=== screener_view total rows: {total} ===\n")

    print("=== 1. Zero vs null counts per stat column ===")
    print(f"{'column':<20} {'zeros':>7} {'nulls':>7} {'nonzero':>8}")
    for col in STAT_COLS:
        zeros = count_where(client, lambda q, c=col: q.eq(c, 0))
        nulls = count_where(client, lambda q, c=col: q.is_(c, "null"))
        print(f"{col:<20} {zeros:>7} {nulls:>7} {total - zeros - nulls:>8}")

    print("\n=== 2. Sector distribution (companies, is_active=true) ===")
    sectors: dict[str, int] = {}
    offset, page = 0, 1000
    while True:
        rows = (
            client.table("companies").select("sector").eq("is_active", True)
            .range(offset, offset + page - 1).execute().data
        )
        if not rows:
            break
        for r in rows:
            key = r["sector"] or "(null)"
            sectors[key] = sectors.get(key, 0) + 1
        if len(rows) < page:
            break
        offset += page
    for name, n in sorted(sectors.items(), key=lambda kv: -kv[1]):
        print(f"  {name:<20} {n}")

    print("\n=== 3. Pre-built screen result counts + samples ===")
    for name, conds in SCREENS.items():
        def build(q, cs=conds):
            for col, op, val in cs:
                q = getattr(q, op)(col, val)
            return q
        n = count_where(client, build)
        sample_q = client.table("screener_view").select(
            "symbol,price,pe,pb,roe,debt_to_equity,dividend_yield,market_cap"
        )
        sample_q = build(sample_q)
        sample = sample_q.order("market_cap", desc=True, nullsfirst=False).limit(5).execute().data
        print(f"\n  {name}: {n} matches")
        for s in sample:
            print(f"    {s}")

    print("\n=== 4. Freshness ===")
    latest = client.table("prices").select("date").order("date", desc=True).limit(1).execute().data
    print(f"  latest prices date: {latest}")
    quotes_n = client.table("quotes").select("symbol", count="exact").limit(1).execute().count
    print(f"  quotes rows: {quotes_n}")

    print("\n=== 5. Benchmark symbols ===")
    for symbol in SYMBOLS:
        cnt = client.table("prices").select("date", count="exact").eq("symbol", symbol).limit(1).execute().count
        newest = client.table("prices").select("date,close").eq("symbol", symbol).order("date", desc=True).limit(1).execute().data
        quote = client.table("quotes").select("price,change_pct").eq("symbol", symbol).execute().data
        view = client.table("screener_view").select("price,pe,roe,debt_to_equity,market_cap,sector").eq("symbol", symbol).execute().data
        print(f"  {symbol}: {cnt} price rows, newest={newest}, quote={quote}, view={view}")


if __name__ == "__main__":
    run()
