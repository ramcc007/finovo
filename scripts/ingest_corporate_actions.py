"""
Corporate actions ingestion via NSE's public corporate-actions API.

Fetches dividends, bonuses, splits, rights issues, buybacks, and
board-meeting/AGM/EGM announcements for all tracked equities in one call,
and upserts them into the corporate_actions table.

NSE public endpoint (no auth, needs a primed session cookie like the other
NSE-backed scripts in this repo):
https://www.nseindia.com/api/corporates-corporateActions?index=equities

Schedule: GitHub Actions, daily.
"""

import os
import time
from datetime import datetime

import requests
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

NSE_BASE = "https://www.nseindia.com"
ACTIONS_URL = f"{NSE_BASE}/api/corporates-corporateActions"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.nseindia.com/",
}

# Maps NSE's free-text "purpose" field to a coarse action_type bucket used
# for filtering/icons in the UI. Falls back to "Other" for anything else
# (board meetings, AGMs, name changes, etc. still get stored with the raw
# purpose text intact).
TYPE_KEYWORDS = [
    ("Dividend", "dividend"),
    ("Bonus", "bonus"),
    ("Split", "sub-division"),
    ("Split", "split"),
    ("Rights", "rights"),
    ("Buyback", "buy back"),
    ("Buyback", "buyback"),
    ("AGM", "agm"),
    ("EGM", "egm"),
    ("Board Meeting", "board meeting"),
]


def classify(purpose: str) -> str:
    low = (purpose or "").lower()
    for label, kw in TYPE_KEYWORDS:
        if kw in low:
            return label
    return "Other"


def get_nse_session() -> requests.Session:
    session = requests.Session()
    session.headers.update(HEADERS)
    try:
        session.get(NSE_BASE, timeout=15)
    except requests.RequestException:
        pass
    time.sleep(1)
    return session


def _parse_date(raw: str | None) -> str | None:
    """NSE dates come as 'DD-Mon-YYYY' (e.g. '15-Aug-2026'); return ISO or None."""
    if not raw or not raw.strip():
        return None
    for fmt in ("%d-%b-%Y", "%d-%b-%y"):
        try:
            return datetime.strptime(raw.strip(), fmt).date().isoformat()
        except ValueError:
            continue
    return None


def fetch_actions(session: requests.Session) -> list[dict]:
    for attempt in range(3):
        try:
            resp = session.get(ACTIONS_URL, params={"index": "equities"}, timeout=30)
            if resp.status_code == 200:
                data = resp.json()
                return data if isinstance(data, list) else data.get("data", [])
            if resp.status_code in (401, 403):
                print(f"    Blocked ({resp.status_code}), re-priming session...")
                session = get_nse_session()
                continue
        except requests.RequestException as e:
            print(f"    Attempt {attempt + 1} failed: {e}")
        time.sleep(3)
    return []


def get_active_symbols(client) -> set[str]:
    symbols: set[str] = set()
    page_size, offset = 1000, 0
    while True:
        rows = (
            client.table("companies").select("symbol").eq("is_active", True)
            .range(offset, offset + page_size - 1).execute().data
        )
        if not rows:
            break
        symbols.update(r["symbol"] for r in rows)
        if len(rows) < page_size:
            break
        offset += page_size
    return symbols


def run():
    print("Connecting to Supabase...")
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    active = get_active_symbols(client)
    print(f"  {len(active)} active symbols")

    print("Fetching corporate actions from NSE...")
    session = get_nse_session()
    raw = fetch_actions(session)
    print(f"  {len(raw)} raw corporate-action rows from NSE")

    records = []
    for row in raw:
        symbol = (row.get("symbol") or "").strip().upper()
        if symbol not in active:
            continue
        purpose = (row.get("subject") or row.get("purpose") or "").strip()
        ex_date = _parse_date(row.get("exDate"))
        if not purpose:
            continue
        records.append({
            "symbol": symbol,
            "action_type": classify(purpose),
            "ex_date": ex_date,
            "record_date": _parse_date(row.get("recDate")),
            "bc_start_date": _parse_date(row.get("bcStartDate")),
            "bc_end_date": _parse_date(row.get("bcEndDate")),
            "purpose": purpose[:500],
        })

    print(f"  {len(records)} records matched to tracked companies")

    n = 0
    for i in range(0, len(records), 500):
        batch = records[i:i + 500]
        client.table("corporate_actions").upsert(
            batch, on_conflict="symbol,action_type,ex_date,purpose"
        ).execute()
        n += len(batch)
        print(f"  upserted {n}/{len(records)}")

    print(f"Done. {n} corporate action records upserted.")


if __name__ == "__main__":
    run()
