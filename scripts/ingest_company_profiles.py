"""
Company profiles (business summary, website, employees, head office, key officers) from Yahoo Finance.

Runs largest companies first and skips symbols refreshed in the last PROFILE_MAX_AGE_DAYS days, so a
weekly run keeps the big names current and works its way down the list.

Env: SUPABASE_URL, SUPABASE_SERVICE_KEY; MAX_SYMBOLS (default 600); PROFILE_MAX_AGE_DAYS (default 30).
"""

import os
import time
from datetime import datetime, timedelta, timezone

import yfinance as yf
from curl_cffi import requests as cffi_requests
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
MAX_SYMBOLS = int(os.environ.get("MAX_SYMBOLS", "600") or 600)
MAX_AGE_DAYS = int(os.environ.get("PROFILE_MAX_AGE_DAYS", "30") or 30)
DELAY = 1.2


def fetch_all(client, table: str, cols: str, order: str | None = None, desc: bool = False) -> list[dict]:
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


def clean(text: str | None, limit: int) -> str | None:
    if not text:
        return None
    t = " ".join(str(text).split())
    return t[:limit] if t else None


def main() -> int:
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    ranked = [r["symbol"] for r in fetch_all(client, "screener_view", "symbol, market_cap", "market_cap", True) if r.get("market_cap")]
    fresh_after = (datetime.now(timezone.utc) - timedelta(days=MAX_AGE_DAYS)).isoformat()
    done = {r["symbol"] for r in fetch_all(client, "company_profiles", "symbol, updated_at") if (r.get("updated_at") or "") > fresh_after}
    todo = [s for s in ranked if s not in done][:MAX_SYMBOLS]
    print(f"{len(ranked)} ranked companies, {len(done)} fresh, fetching {len(todo)}.", flush=True)

    session = cffi_requests.Session(impersonate="chrome")
    ok = failed = 0
    for i, sym in enumerate(todo, 1):
        try:
            info = yf.Ticker(f"{sym}.NS", session=session).info or {}
            summary = clean(info.get("longBusinessSummary"), 2500)
            if not summary and not info.get("website"):
                raise ValueError("no profile fields")
            officers = []
            for o in (info.get("companyOfficers") or [])[:4]:
                name, title = clean(o.get("name"), 80), clean(o.get("title"), 90)
                if name:
                    officers.append({"name": name, "title": title})
            emp = info.get("fullTimeEmployees")
            client.table("company_profiles").upsert({
                "symbol": sym,
                "summary": summary,
                "website": clean(info.get("website"), 200),
                "employees": int(emp) if isinstance(emp, (int, float)) and emp > 0 else None,
                "city": clean(info.get("city"), 60),
                "state": clean(info.get("state"), 60),
                "country": clean(info.get("country"), 60),
                "officers": officers,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }, on_conflict="symbol").execute()
            ok += 1
        except Exception as e:
            failed += 1
            if failed <= 10:
                print(f"  {sym}: {e}", flush=True)
        if i % 50 == 0:
            print(f"  {i}/{len(todo)} (stored {ok}, failed {failed})", flush=True)
        time.sleep(DELAY)
    print(f"Done: stored {ok}, failed {failed}.", flush=True)
    return 0 if ok > 0 or not todo else 1


if __name__ == "__main__":
    raise SystemExit(main())
