"""
Weekly fundamental data ingestion via yfinance.
Fetches financials, key stats, and ratios for all active NSE stocks.

Schedule: GitHub Actions, every Sunday at 08:00 UTC.

yfinance provides:
  ticker.info         → pe, pb, market_cap, div_yield, etc.
  ticker.financials   → annual P&L (revenue, ebitda, net_profit)
  ticker.quarterly_financials → quarterly P&L
  ticker.balance_sheet / quarterly_balance_sheet
  ticker.cashflow / quarterly_cashflow
"""

import os
import time
from datetime import date
import yfinance as yf
from curl_cffi import requests as cffi_requests
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
DELAY = 1.5          # seconds between each symbol (yfinance rate limit)
MAX_SYMBOLS = int(os.environ.get("MAX_SYMBOLS", "2000"))


def make_session():
    """yfinance via plain requests is blocked by Yahoo from datacenter IPs
    (empty responses). curl_cffi impersonates a real Chrome TLS fingerprint,
    which gets past Yahoo's bot wall."""
    return cffi_requests.Session(impersonate="chrome")


def get_active_symbols(client) -> list[str]:
    resp = client.table("companies").select("symbol").eq("is_active", True).execute()
    return [r["symbol"] for r in resp.data]


def safe_float(val) -> float | None:
    try:
        v = float(val)
        if v != v:  # NaN check
            return None
        return round(v, 4)
    except Exception:
        return None


def safe_int(val) -> int | None:
    try:
        return int(val)
    except Exception:
        return None


def ingest_one(client, symbol: str, session):
    ticker = yf.Ticker(f"{symbol}.NS", session=session)

    # ── RATIOS from ticker.info ──────────────────────────────
    info = ticker.info or {}
    if not info or info.get("trailingPE") is None and info.get("marketCap") is None and info.get("currentPrice") is None:
        # Empty payload => Yahoo blocked/threw nothing useful; skip this symbol
        raise ValueError("empty info payload")

    ratio_record = {
        "symbol": symbol,
        "date": date.today().isoformat(),
        "pe": safe_float(info.get("trailingPE")),
        "pb": safe_float(info.get("priceToBook")),
        "price_to_sales": safe_float(info.get("priceToSalesTrailing12Months")),
        "dividend_yield": safe_float(
            (info.get("dividendYield") or 0) * 100
        ),
        "peg_ratio": safe_float(info.get("pegRatio")),
        "roe": safe_float(
            (info.get("returnOnEquity") or 0) * 100
        ),
        "net_margin": safe_float(
            (info.get("profitMargins") or 0) * 100
        ),
        "operating_margin": safe_float(
            (info.get("operatingMargins") or 0) * 100
        ),
        "debt_to_equity": safe_float(
            (info.get("debtToEquity") or 0) / 100
        ),
        "current_ratio": safe_float(info.get("currentRatio")),
        "quick_ratio": safe_float(info.get("quickRatio")),
        "market_cap": safe_float(
            (info.get("marketCap") or 0) / 1e7  # convert to Crores
        ),
        "week_high_52": safe_float(info.get("fiftyTwoWeekHigh")),
        "week_low_52": safe_float(info.get("fiftyTwoWeekLow")),
        "price": safe_float(info.get("currentPrice") or info.get("regularMarketPrice")),
        "revenue_growth_1y": safe_float(
            (info.get("revenueGrowth") or 0) * 100
        ),
        "eps_growth_1y": safe_float(
            (info.get("earningsGrowth") or 0) * 100
        ),
    }

    client.table("ratios").upsert(
        ratio_record, on_conflict="symbol,date"
    ).execute()

    # ── ANNUAL FINANCIALS ────────────────────────────────────
    try:
        fin = ticker.financials  # columns = dates, rows = metrics
        bs = ticker.balance_sheet
        cf = ticker.cashflow

        for col in fin.columns:
            period = col.strftime("%Y-%m")
            rev = safe_float(fin.loc["Total Revenue", col]) if "Total Revenue" in fin.index else None
            gp = safe_float(fin.loc["Gross Profit", col]) if "Gross Profit" in fin.index else None
            ebitda = safe_float(fin.loc["EBITDA", col]) if "EBITDA" in fin.index else None
            np_ = safe_float(fin.loc["Net Income", col]) if "Net Income" in fin.index else None
            eps = safe_float(fin.loc["Basic EPS", col]) if "Basic EPS" in fin.index else None

            # Balance sheet for same period
            te = ta = td = cash = bvps = None
            if bs is not None and col in bs.columns:
                ta = safe_float(bs.loc["Total Assets", col]) if "Total Assets" in bs.index else None
                te = safe_float(bs.loc["Stockholders Equity", col]) if "Stockholders Equity" in bs.index else None
                td = safe_float(bs.loc["Total Debt", col]) if "Total Debt" in bs.index else None
                cash = safe_float(bs.loc["Cash And Cash Equivalents", col]) if "Cash And Cash Equivalents" in bs.index else None

            # Cash flow
            ocf = icf = fcf_ = ffcf = None
            if cf is not None and col in cf.columns:
                ocf = safe_float(cf.loc["Operating Cash Flow", col]) if "Operating Cash Flow" in cf.index else None
                icf = safe_float(cf.loc["Investing Cash Flow", col]) if "Investing Cash Flow" in cf.index else None
                ffcf = safe_float(cf.loc["Financing Cash Flow", col]) if "Financing Cash Flow" in cf.index else None
                fcf_ = safe_float(cf.loc["Free Cash Flow", col]) if "Free Cash Flow" in cf.index else None

            # Convert to Crores (yfinance gives values in currency units)
            def to_cr(v): return round(v / 1e7, 2) if v else None

            record = {
                "symbol": symbol,
                "period": period,
                "period_type": "annual",
                "revenue": to_cr(rev),
                "gross_profit": to_cr(gp),
                "ebitda": to_cr(ebitda),
                "net_profit": to_cr(np_),
                "eps": eps,
                "total_assets": to_cr(ta),
                "total_equity": to_cr(te),
                "total_debt": to_cr(td),
                "cash": to_cr(cash),
                "operating_cashflow": to_cr(ocf),
                "investing_cashflow": to_cr(icf),
                "financing_cashflow": to_cr(ffcf),
                "free_cashflow": to_cr(fcf_),
            }
            client.table("fundamentals").upsert(
                record, on_conflict="symbol,period,period_type"
            ).execute()
    except Exception as e:
        print(f"    Annual financials error for {symbol}: {e}")

    # ── QUARTERLY FINANCIALS ─────────────────────────────────
    try:
        qfin = ticker.quarterly_financials
        for col in qfin.columns[:8]:  # last 8 quarters
            period = col.strftime("%YQ%q") if hasattr(col, 'strftime') else str(col)[:7]
            rev = safe_float(qfin.loc["Total Revenue", col]) if "Total Revenue" in qfin.index else None
            np_ = safe_float(qfin.loc["Net Income", col]) if "Net Income" in qfin.index else None
            eps = safe_float(qfin.loc["Basic EPS", col]) if "Basic EPS" in qfin.index else None
            ebitda = safe_float(qfin.loc["EBITDA", col]) if "EBITDA" in qfin.index else None

            def to_cr(v): return round(v / 1e7, 2) if v else None

            record = {
                "symbol": symbol,
                "period": period,
                "period_type": "quarterly",
                "revenue": to_cr(rev),
                "ebitda": to_cr(ebitda),
                "net_profit": to_cr(np_),
                "eps": eps,
            }
            client.table("fundamentals").upsert(
                record, on_conflict="symbol,period,period_type"
            ).execute()
    except Exception as e:
        print(f"    Quarterly financials error for {symbol}: {e}")


def run():
    print("Starting fundamental ingestion...")
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    symbols = get_active_symbols(client)[:MAX_SYMBOLS]
    print(f"  {len(symbols)} symbols to process")

    session = make_session()
    success = error = 0
    for i, symbol in enumerate(symbols):
        try:
            ingest_one(client, symbol, session)
            success += 1
            if (i + 1) % 50 == 0:
                print(f"  [{i+1}/{len(symbols)}] {success} ok, {error} errors")
        except Exception as e:
            error += 1
            if error <= 10 or (i + 1) % 50 == 0:
                print(f"  Error [{symbol}]: {e}")
        time.sleep(DELAY)

    print(f"Done. {success} success, {error} errors.")


if __name__ == "__main__":
    run()
