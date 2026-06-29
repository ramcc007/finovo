"""
Daily index ingestion via NSE's official "ind_close_all" archive + BSE Sensex.

Stores exactly 10 headline indices in the user-specified display order.
Sensex (BSE) is fetched via yfinance since it is not in NSE's index file.
NSE indices come from nsearchives.nseindia.com (CI-reachable).

Schedule: GitHub Actions, daily after market close on weekdays.
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

LOOKBACK_DAYS = 10

URL_TEMPLATES = [
    "https://nsearchives.nseindia.com/content/indices/ind_close_all_{ddmmyyyy}.csv",
    "https://archives.nseindia.com/content/indices/ind_close_all_{ddmmyyyy}.csv",
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept": "text/csv,application/octet-stream,*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.nseindia.com/",
}

# Exact display order. Tuples of (normalised match key, fallback display name).
# Sensex is missing from NSE's file — handled separately.
NSE_PINNED = [
    ("nifty 50",           "Nifty 50"),
    ("nifty bank",         "Nifty Bank"),
    ("nifty it",           "Nifty IT"),
    ("nifty midcap 100",   "Nifty Midcap 100"),
    ("nifty smallcap 100", "Nifty Smallcap 100"),
    ("nifty next 50",      "Nifty Next 50"),
    ("india vix",          "India VIX"),
    ("nifty total market", "Nifty Total Market"),
    ("nifty energy",       "Nifty Energy"),
]
# Sensex slot sits at rank 1 (between Nifty 50 and Nifty Bank).
SENSEX_RANK = 1


def fetch_nse() -> tuple[pd.DataFrame, date]:
    session = requests.Session()
    session.headers.update(HEADERS)
    try:
        session.get("https://www.nseindia.com/", timeout=20)
    except requests.RequestException:
        pass

    for delta in range(LOOKBACK_DAYS):
        d = date.today() - timedelta(days=delta)
        if d.weekday() >= 5:
            continue
        ddmmyyyy = d.strftime("%d%m%Y")
        for tmpl in URL_TEMPLATES:
            url = tmpl.format(ddmmyyyy=ddmmyyyy)
            try:
                resp = session.get(url, timeout=30)
                if resp.status_code == 200 and resp.text.strip():
                    df = pd.read_csv(io.StringIO(resp.text))
                    df.columns = [c.strip() for c in df.columns]
                    if len(df) and any("Index" in c for c in df.columns):
                        print(f"  NSE index file: {d.isoformat()} ({len(df)} rows) from {url}")
                        return df, d
            except requests.RequestException as e:
                print(f"    {d.isoformat()} {url}: {e}")
    raise RuntimeError("No NSE index close file found in the last %d days" % LOOKBACK_DAYS)


def fetch_sensex() -> dict | None:
    """Try yfinance for BSE Sensex (^BSESN). Returns a partial record or None."""
    try:
        import yfinance as yf
        ticker = yf.Ticker("^BSESN")
        hist = ticker.history(period="5d")
        if hist.empty:
            return None
        last_row = hist.iloc[-1]
        prev_close = hist["Close"].iloc[-2] if len(hist) >= 2 else None
        close = float(last_row["Close"])
        pts = round(close - float(prev_close), 2) if prev_close is not None else None
        pct = round((pts / float(prev_close)) * 100, 2) if pts is not None and prev_close else None
        print(f"  Sensex (yfinance): {close}  pts={pts}  pct={pct}%")
        return {"symbol": "SENSEX", "name": "Sensex", "last": close, "change": pts, "change_pct": pct, "volume": None}
    except Exception as e:
        print(f"  Sensex fetch failed: {e}")
        return None


def _col(df: pd.DataFrame, *candidates: str) -> str | None:
    norm = {c.lower().replace(" ", "").replace("_", ""): c for c in df.columns}
    for cand in candidates:
        key = cand.lower().replace(" ", "").replace("_", "")
        if key in norm:
            return norm[key]
    for cand in candidates:
        key = cand.lower().replace(" ", "")
        for nk, original in norm.items():
            if key in nk:
                return original
    return None


def _num(v):
    try:
        f = float(str(v).replace(",", "").strip())
        return f if f == f else None
    except (TypeError, ValueError):
        return None


def run():
    print("Connecting to Supabase...")
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    print("Fetching NSE index close file...")
    df, trade_date = fetch_nse()

    name_col = _col(df, "Index Name", "IndexName", "Index")
    close_col = _col(df, "Closing Index Value", "Closing", "Close", "ClosingIndexValue")
    chg_col   = _col(df, "Change(%)", "Change %", "Percent Change", "Change")
    pts_col   = _col(df, "Points Change", "Points", "Net Change")
    vol_col   = _col(df, "Volume", "Volume(shares)", "Traded Quantity")
    if not name_col or not close_col:
        raise RuntimeError(f"Unexpected columns: {list(df.columns)}")

    df["_norm"]   = df[name_col].astype(str).str.strip().str.lower().str.replace(r"\s+", " ", regex=True)
    df["_close"]  = df[close_col].map(_num)
    df["_chgpct"] = df[chg_col].map(_num) if chg_col else None
    df["_pts"]    = df[pts_col].map(_num) if pts_col else None
    df["_vol"]    = df[vol_col].map(_num) if vol_col else 0
    df["_name"]   = df[name_col].astype(str).str.strip()
    df = df[df["_close"].notna()]

    # Build NSE records in pinned order.
    nse_records: list[dict] = []
    for norm_key, fallback_name in NSE_PINNED:
        match = df[df["_norm"] == norm_key]
        if match.empty:
            # Loose contains match.
            match = df[df["_norm"].str.contains(norm_key, na=False)]
        if match.empty:
            print(f"  WARNING: '{norm_key}' not found in NSE file — skipped")
            continue
        row = match.iloc[0]
        nse_records.append({
            "symbol":     row["_name"],
            "name":       row["_name"],
            "last":       row["_close"],
            "change":     row["_pts"],
            "change_pct": row["_chgpct"],
            "volume":     int(row["_vol"]) if row["_vol"] and row["_vol"] == row["_vol"] else None,
        })

    # Fetch Sensex and splice it in at SENSEX_RANK.
    print("Fetching BSE Sensex...")
    sensex = fetch_sensex()

    # Assign ranks: Nifty 50 = 0, Sensex = 1 (if available), rest shift.
    records: list[dict] = []
    nse_iter = iter(nse_records)
    rank = 0

    # Slot 0: first NSE entry (Nifty 50)
    first = next(nse_iter, None)
    if first:
        first["rank"] = rank
        records.append(first)
        rank += 1

    # Slot 1: Sensex (if fetched)
    if sensex:
        sensex["rank"] = rank
        records.append(sensex)
        rank += 1

    # Remaining NSE entries
    for rec in nse_iter:
        rec["rank"] = rank
        records.append(rec)
        rank += 1

    print(f"Upserting {len(records)} indices for {trade_date.isoformat()}:")
    for r in records:
        print(f"  #{r['rank']:>2}  {r['name']:<28}  {r['last']}  ({r['change_pct']}%)")

    client.table("indices").delete().neq("symbol", "").execute()
    if records:
        client.table("indices").upsert(records, on_conflict="symbol").execute()
    print(f"Done. {len(records)} indices stored for {trade_date.isoformat()}.")


if __name__ == "__main__":
    run()
