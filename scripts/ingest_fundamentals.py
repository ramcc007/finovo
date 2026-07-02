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
# Default must exceed the ~2400 active companies — the old cap of 2000
# permanently excluded the last ~394 symbols from every ratios ingestion.
MAX_SYMBOLS = int(os.environ.get("MAX_SYMBOLS", "5000"))

# yfinance GICS-style sector → our canonical sector labels
# (same label set as scripts/ingest_companies.py INDUSTRY_MAP values).
YF_SECTOR_MAP = {
    "Financial Services": "Banking",
    "Technology": "IT",
    "Communication Services": "Telecom",
    "Consumer Defensive": "FMCG",
    "Consumer Cyclical": "Consumer",
    "Healthcare": "Pharma",
    "Industrials": "Capital Goods",
    "Basic Materials": "Chemicals",
    "Energy": "Oil & Gas",
    "Utilities": "Power",
    "Real Estate": "Realty",
}


def make_session():
    """yfinance via plain requests is blocked by Yahoo from datacenter IPs
    (empty responses). curl_cffi impersonates a real Chrome TLS fingerprint,
    which gets past Yahoo's bot wall."""
    return cffi_requests.Session(impersonate="chrome")


def get_active_symbols(client) -> list[str]:
    """Paginated fetch — a single .execute() silently truncates to PostgREST's
    default row cap, well under the ~2400 active companies."""
    symbols: list[str] = []
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
        symbols.extend(r["symbol"] for r in rows)
        if len(rows) < page_size:
            break
        offset += page_size
    return symbols


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


def scaled(val, factor: float) -> float | None:
    """Scale a raw yfinance value, propagating missing data as None.

    The previous `(info.get(...) or 0) * factor` pattern silently stored 0
    for every symbol where yfinance omitted the field, so unknown ROE/debt/
    growth showed up as a hard 0 in the UI and polluted screens (e.g. banks
    with missing debtToEquity matched the "Debt-Free" filter)."""
    f = safe_float(val)
    return round(f * factor, 4) if f is not None else None


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
        # yfinance now returns dividendYield already as a percentage
        # (e.g. 1.63 means 1.63%), not a fraction — do not multiply by 100.
        "dividend_yield": safe_float(info.get("dividendYield")),
        "peg_ratio": safe_float(info.get("pegRatio")),
        "roe": scaled(info.get("returnOnEquity"), 100),
        "net_margin": scaled(info.get("profitMargins"), 100),
        "operating_margin": scaled(info.get("operatingMargins"), 100),
        "debt_to_equity": scaled(info.get("debtToEquity"), 0.01),
        "current_ratio": safe_float(info.get("currentRatio")),
        "quick_ratio": safe_float(info.get("quickRatio")),
        "market_cap": scaled(info.get("marketCap"), 1e-7),  # convert to Crores
        "week_high_52": safe_float(info.get("fiftyTwoWeekHigh")),
        "week_low_52": safe_float(info.get("fiftyTwoWeekLow")),
        "price": safe_float(info.get("currentPrice") or info.get("regularMarketPrice")),
        "revenue_growth_1y": scaled(info.get("revenueGrowth"), 100),
        # yfinance has no distinct "net profit growth" field; earningsGrowth
        # (trailing YoY EPS growth) is the closest proxy and is what backs
        # both eps_growth_1y and profit_growth_1y here. Previously this
        # column was never written, so it was permanently null for every
        # symbol regardless of how many times ingestion ran.
        "profit_growth_1y": scaled(info.get("earningsGrowth"), 100),
        "eps_growth_1y": scaled(info.get("earningsGrowth"), 100),
    }

    client.table("ratios").upsert(
        ratio_record, on_conflict="symbol,date"
    ).execute()

    # ── SECTOR BACKFILL ──────────────────────────────────────
    # NSE index files only classify the top ~500 stocks, leaving ~80% of
    # companies as 'Other' and invisible to the sector filter. Use
    # yfinance's GICS-style sector as a fallback for those.
    yf_sector = YF_SECTOR_MAP.get(str(info.get("sector") or "").strip())
    if yf_sector:
        try:
            comp = (
                client.table("companies").select("sector")
                .eq("symbol", symbol).limit(1).execute().data
            )
            if comp and comp[0].get("sector") in (None, "", "Other"):
                client.table("companies").update(
                    {"sector": yf_sector}
                ).eq("symbol", symbol).execute()
        except Exception:
            pass  # classification is best-effort; never fail the ingest

    # ── ANNUAL FINANCIALS ────────────────────────────────────
    try:
        fin = ticker.financials  # columns = dates, rows = metrics
        bs = ticker.balance_sheet
        cf = ticker.cashflow

        # ROCE = EBIT / capital employed (total assets − current liabilities).
        # yfinance's info dict has no ROCE field, so this column had been
        # 100% null since launch. Computed from the latest annual statements.
        try:
            latest = fin.columns[0]
            ebit = safe_float(fin.loc["EBIT", latest]) if "EBIT" in fin.index else None
            ta_ = bs.loc["Total Assets", latest] if bs is not None and "Total Assets" in bs.index and latest in bs.columns else None
            cl_ = bs.loc["Current Liabilities", latest] if bs is not None and "Current Liabilities" in bs.index and latest in bs.columns else None
            ta_, cl_ = safe_float(ta_), safe_float(cl_)
            if ebit is not None and ta_ and cl_ is not None and (ta_ - cl_) > 0:
                client.table("ratios").update(
                    {"roce": round(ebit / (ta_ - cl_) * 100, 4)}
                ).eq("symbol", symbol).eq("date", ratio_record["date"]).execute()
        except Exception:
            pass

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
            if error <= 5 or (i + 1) % 50 == 0:
                print(f"  Error [{symbol}]: {e}")
        time.sleep(DELAY)

    print(f"Done. {success} success, {error} errors.")


if __name__ == "__main__":
    run()
