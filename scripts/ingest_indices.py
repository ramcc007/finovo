"""
Daily index ingestion via NSE's official "ind_close_all" archive.

Like the equity Bhavcopy, NSE publishes a single CSV with the day's OHLC,
change, volume and turnover for every published index. It is served from the
same archive host (nsearchives.nseindia.com) that the price ingestion already
uses successfully from GitHub Actions, whereas the live www.nseindia.com/api
endpoints block datacenter IPs.

We keep the top N indices by traded volume plus India VIX (the volatility
index), and store them in the `indices` table for the homepage ticker.

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

TOP_N = int(os.environ.get("TOP_INDICES", "10"))
LOOKBACK_DAYS = 10

# NSE serves the index close file from a couple of archive hosts; try both.
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


def fetch_latest() -> tuple[pd.DataFrame, date]:
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
                        print(f"  Using index close for {d.isoformat()} ({len(df)} indices) from {url}")
                        return df, d
            except requests.RequestException as e:
                print(f"    {d.isoformat()} {url}: {e}")
                continue
    raise RuntimeError("No index close file found in the last %d days" % LOOKBACK_DAYS)


def _col(df: pd.DataFrame, *candidates: str) -> str | None:
    """Find the first column whose normalised name matches a candidate."""
    norm = {c.lower().replace(" ", "").replace("_", ""): c for c in df.columns}
    for cand in candidates:
        key = cand.lower().replace(" ", "").replace("_", "")
        if key in norm:
            return norm[key]
    # loose contains match
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
    df, trade_date = fetch_latest()

    name_col = _col(df, "Index Name", "IndexName", "Index")
    close_col = _col(df, "Closing Index Value", "Closing", "Close", "ClosingIndexValue")
    chg_col = _col(df, "Change(%)", "Change %", "Percent Change", "Change")
    pts_col = _col(df, "Points Change", "Points", "Net Change")
    vol_col = _col(df, "Volume", "Volume(shares)", "Traded Quantity")
    if not name_col or not close_col:
        raise RuntimeError(f"Unexpected columns: {list(df.columns)}")

    df["_name"] = df[name_col].astype(str).str.strip()
    df["_close"] = df[close_col].map(_num)
    df["_chgpct"] = df[chg_col].map(_num) if chg_col else None
    df["_pts"] = df[pts_col].map(_num) if pts_col else None
    df["_vol"] = df[vol_col].map(_num) if vol_col else 0
    df = df[df["_close"].notna()]

    df["_volrank"] = df["_vol"].fillna(0)
    df["_norm"] = df["_name"].str.lower().str.replace(r"\s+", " ", regex=True).str.strip()

    # The recognisable indices shown on Groww's indices page (broad market +
    # key sectorals). We keep these, order them by traded volume, cap at TOP_N,
    # and always pin India VIX. (A raw volume sort over all 160 NSE indices
    # surfaces obscure composite baskets like "Nifty500 Multicap 50:25:25".)
    PREFERRED = {
        "nifty 50", "nifty next 50", "nifty 100", "nifty 200", "nifty 500",
        "nifty total market", "nifty bank", "nifty financial services",
        "nifty midcap 100", "nifty midcap select", "nifty smallcap 100",
        "nifty auto", "nifty fmcg", "nifty it", "nifty pharma", "nifty metal",
        "nifty realty", "nifty energy", "nifty infrastructure",
        "nifty psu bank", "nifty private bank", "nifty oil & gas",
        "nifty consumer durables",
    }
    pref = df[df["_norm"].isin(PREFERRED)].copy()
    top = pref.sort_values("_volrank", ascending=False).head(TOP_N).copy()

    # Safety net: if NSE label drift matched too few, fall back to raw volume.
    if len(top) < 5:
        top = df.sort_values("_volrank", ascending=False).head(TOP_N).copy()

    # Always include India VIX (no volume of its own, so pinned on separately).
    vix = df[df["_norm"] == "india vix"]
    if len(vix) and not top["_norm"].eq("india vix").any():
        top = pd.concat([top, vix.head(1)])

    records = []
    for rank, (_, row) in enumerate(top.iterrows()):
        records.append({
            "symbol": row["_name"],
            "name": row["_name"],
            "last": row["_close"],
            "change": row["_pts"],
            "change_pct": row["_chgpct"],
            "volume": int(row["_vol"]) if row["_vol"] and row["_vol"] == row["_vol"] else None,
            "rank": rank,
        })

    print(f"Upserting {len(records)} indices for {trade_date.isoformat()}:")
    for r in records:
        print(f"  #{r['rank']:>2} {r['symbol']:<28} {r['last']}  ({r['change_pct']}%)  vol={r['volume']}")

    # Replace the previous snapshot so stale indices drop out of the top list.
    client.table("indices").delete().neq("symbol", "").execute()
    if records:
        client.table("indices").upsert(records, on_conflict="symbol").execute()
    print(f"Done. {len(records)} indices stored for {trade_date.isoformat()}.")


if __name__ == "__main__":
    run()
