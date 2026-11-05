"""
Quarterly shareholding pattern from NSE: promoter and public holding from the shareholding master,
foreign (FII/FPI) and domestic (DII) institutions, and pledged shares from each quarter's XBRL filing.

Env: MAX_SYMBOLS (default 300, largest by market cap first), QUARTERS (default 4), MAX_AGE_DAYS (default 20,
skip companies refreshed recently). Quarter labels are period-end months, e.g. 2026-09.
"""

import os
import re
import time
from datetime import datetime, timedelta, timezone

from curl_cffi import requests as cffi
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
MAX_SYMBOLS = int(os.environ.get("MAX_SYMBOLS", "300") or 300)
QUARTERS = int(os.environ.get("QUARTERS", "4") or 4)
MAX_AGE_DAYS = int(os.environ.get("MAX_AGE_DAYS", "20") or 20)

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept": "*/*", "Accept-Language": "en-US,en;q=0.9", "Referer": "https://www.nseindia.com/"}


def fetch_all(client, table, cols, order=None, desc=False):
    out, start = [], 0
    while True:
        q = client.table(table).select(cols)
        if order:
            q = q.order(order, desc=desc)
        rows = q.range(start, start + 999).execute().data or []
        out += rows
        if len(rows) < 1000:
            return out
        start += 1000


def new_session():
    s = cffi.Session(impersonate="chrome124")
    s.headers.update(UA)
    s.get("https://www.nseindia.com/", timeout=20)
    time.sleep(1)
    return s


def pct(v):
    try:
        x = float(str(v).replace(",", ""))
    except (TypeError, ValueError):
        return None
    return round(x, 2) if 0 <= x <= 100 else None


def period_label(raw: str):
    for fmt in ("%d-%b-%Y", "%d-%m-%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(raw.strip().title(), fmt).strftime("%Y-%m")
        except ValueError:
            continue
    return None


def facts(xml: str) -> dict:
    """contextRef -> percentage (0-100) for ShareholdingAsAPercentageOfTotalNumberOfShares facts."""
    out = {}
    for ctx, val in re.findall(r"<[\w\-]+:ShareholdingAsAPercentageOfTotalNumberOfShares[^>]*contextRef=\"([^\"]+)\"[^>]*>([^<]*)<", xml):
        try:
            out[ctx] = float(val) * 100
        except ValueError:
            pass
    return out


def pledge_pct(xml: str, promoter: float | None):
    """Pledged / encumbered share of promoter holding, if the filing reports it as a percentage of total shares."""
    vals = []
    for name, ctx, val in re.findall(r"<[\w\-]+:([\w]*(?:Pledge|Encumber)[\w]*(?:Percentage|Percent)[\w]*)[^>]*contextRef=\"([^\"]+)\"[^>]*>([^<]*)<", xml):
        if "Promoter" in ctx or "Promoter" in name:
            try:
                vals.append(float(val) * 100)
            except ValueError:
                pass
    return round(max(vals), 2) if vals else None


def institutions(f: dict):
    fii = f.get("InstitutionsForeign_ContextI")
    if fii is None:
        parts = [f.get(k) for k in ("InstitutionsForeignPortfolioInvestorCategoryOne_ContextI", "InstitutionsForeignPortfolioInvestorCategoryTwo_ContextI") if f.get(k) is not None]
        fii = sum(parts) if parts else None
    return fii, f.get("InstitutionsDomestic_ContextI")


def fetch_rows(s, sym: str) -> list[dict]:
    r = s.get(f"https://www.nseindia.com/api/corporate-share-holdings-master?index=equities&symbol={sym}", timeout=25)
    if r.status_code != 200:
        raise RuntimeError(f"HTTP {r.status_code}")
    data = r.json()
    if not isinstance(data, list) or not data:
        raise RuntimeError("no data")
    rows = []
    for q in data[:QUARTERS]:
        label = period_label(str(q.get("date") or ""))
        promoter, public = pct(q.get("pr_and_prgrp")), pct(q.get("public_val"))
        if not label or promoter is None or any(r["quarter"] == label for r in rows):
            continue  # NSE lists revised filings too; keep the newest one per quarter
        fii = dii = pledge = None
        link = q.get("xbrl")
        if link and str(link).startswith("http"):
            try:
                x = s.get(link, timeout=40)
                if x.status_code == 200:
                    fii, dii = institutions(facts(x.text))
                    pledge = pledge_pct(x.text, promoter)
            except Exception:
                pass
            time.sleep(0.4)
        rows.append({
            "symbol": sym, "quarter": label, "promoter_pct": promoter,
            "fii_pct": round(fii, 2) if fii is not None else None,
            "dii_pct": round(dii, 2) if dii is not None else None,
            "public_pct": public, "pledge_pct": pledge,
        })
    return rows


def main() -> int:
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    ranked = [r["symbol"] for r in fetch_all(client, "screener_view", "symbol, market_cap", "market_cap", True) if r.get("market_cap")]
    cutoff = (datetime.now(timezone.utc) - timedelta(days=MAX_AGE_DAYS)).isoformat()
    recent = {r["symbol"] for r in fetch_all(client, "shareholding", "symbol, created_at") if (r.get("created_at") or "") > cutoff}
    todo = [s for s in ranked if s not in recent][:MAX_SYMBOLS]
    print(f"{len(ranked)} ranked, {len(recent)} recent, fetching {len(todo)}.", flush=True)

    s = new_session()
    ok = failed = rows_total = pledge_seen = 0
    for i, sym in enumerate(todo, 1):
        rows, err = [], None
        for attempt in (1, 2, 3):
            try:
                rows = fetch_rows(s, sym)
                err = None
                break
            except Exception as e:
                err = e
                # NSE drops long-lived connections (HTTP/2 resets, 401/403): start a fresh session and try again.
                time.sleep(3 * attempt)
                try:
                    s = new_session()
                except Exception:
                    pass
        if rows:
            try:
                client.table("shareholding").upsert(rows, on_conflict="symbol,quarter").execute()
                rows_total += len(rows)
                pledge_seen += sum(1 for r in rows if r["pledge_pct"] is not None)
                ok += 1
            except Exception as e:
                failed += 1
                print(f"  {sym}: save failed: {e}", flush=True)
        else:
            failed += 1
            print(f"  {sym}: {err or 'no usable rows'}", flush=True)
        if i % 50 == 0:
            try:
                s = new_session()  # refresh proactively before NSE does it for us
            except Exception:
                pass
        time.sleep(0.8)
        if i % 25 == 0:
            print(f"  {i}/{len(todo)}  ok={ok} failed={failed} rows={rows_total}", flush=True)
    print(f"Done: {ok} companies, {rows_total} rows, {failed} failed, pledge reported in {pledge_seen} filings.")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
