"""
Index membership for the /markets tabs: Sensex 30, Nifty 50, Nifty Midcap 100, Nifty Smallcap 100.

Nifty lists come from NSE's own constituent files on nsearchives.nseindia.com (reachable from CI,
same host the other ingest jobs use). BSE does not publish a file we can reach, so Sensex is read
from Wikipedia's "List of BSE SENSEX companies" and matched to our `companies` table by company name.

Safety: a list replaces the stored one only if it has the expected size (50 / 100 / 100 / 30).
Otherwise the old rows stay and the script exits non-zero so the run shows red.

Schedule: weekly, plus manual runs (see ingest-index-members.yml). Indices are reconstituted
twice a year, so weekly is plenty.
"""

import io
import os
import re
import sys

import pandas as pd
import requests
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"}

NSE_LISTS = {
    "nifty50": ("ind_nifty50list.csv", 50),
    "midcap100": ("ind_niftymidcap100list.csv", 100),
    "smallcap100": ("ind_niftysmallcap100list.csv", 100),
}
NSE_HOSTS = ["https://nsearchives.nseindia.com/content/indices/", "https://archives.nseindia.com/content/indices/"]
WIKI_URL = "https://en.wikipedia.org/wiki/List_of_BSE_SENSEX_companies"


def fetch_nse_list(filename: str) -> list[str]:
    for host in NSE_HOSTS:
        try:
            r = requests.get(host + filename, headers={**UA, "Referer": "https://www.nseindia.com/"}, timeout=30)
            if r.status_code == 200 and r.text.strip():
                df = pd.read_csv(io.StringIO(r.text))
                col = next((c for c in df.columns if c.strip().lower() == "symbol"), None)
                if col:
                    return [str(s).strip().upper() for s in df[col].dropna()]
            print(f"  {host}{filename}: HTTP {r.status_code}")
        except Exception as e:
            print(f"  {host}{filename}: {e}")
    return []


def norm(name: str) -> str:
    n = name.lower().replace("&", " and ")
    n = re.sub(r"\[.*?\]|\(.*?\)", " ", n)
    n = re.sub(r"[^a-z0-9 ]", " ", n)
    n = re.sub(r"\b(limited|ltd|corporation|corp|company|co|the|of|india|indian)\b", " ", n)
    return re.sub(r"\s+", " ", n).strip()


def fetch_all(client, table: str, cols: str) -> list[dict]:
    """The API returns at most 1000 rows per request, so page through the table."""
    out, start = [], 0
    while True:
        rows = client.table(table).select(cols).range(start, start + 999).execute().data or []
        out += rows
        if len(rows) < 1000:
            return out
        start += 1000


def all_companies(client) -> list[dict]:
    return fetch_all(client, "companies", "symbol, name")


# Short names Wikipedia uses that do not match our company names. Each symbol is checked against the
# companies table before use, so a wrong entry here is skipped, never stored.
ALIASES = {"adani ports sez": "ADANIPORTS", "hcltech": "HCLTECH", "sun pharma": "SUNPHARMA"}


def sensex_from_wikipedia(client) -> list[str]:
    try:
        html = requests.get(WIKI_URL, headers=UA, timeout=30).text
        tables = pd.read_html(io.StringIO(html))
    except Exception as e:
        print(f"  Wikipedia fetch failed: {e}")
        return []
    table = None
    for t in tables:
        cols = [str(c).lower() for c in t.columns]
        if 25 <= len(t) <= 40 and any("company" in c or "name" in c for c in cols):
            table = t
            break
    if table is None:
        print("  No Sensex-sized table found on the page.")
        return []
    col = next(c for c in table.columns if "company" in str(c).lower() or "name" in str(c).lower())
    names = [str(x) for x in table[col].dropna()]
    print(f"  Wikipedia table columns: {list(table.columns)}; {len(names)} names")
    print(table.head(4).to_string(max_colwidth=28))

    companies = all_companies(client)
    by_norm: dict[str, list[str]] = {}
    for c in companies:
        by_norm.setdefault(norm(c["name"]), []).append(c["symbol"])
    known_symbols = {c["symbol"] for c in companies}
    symbols, missing = [], []
    for nm in names:
        key = norm(nm)
        hit = by_norm.get(key)
        if not hit and ALIASES.get(key) in known_symbols:
            hit = [ALIASES[key]]
        if not hit:  # fall back to a unique prefix / containment match
            cands = [s for k, v in by_norm.items() if k and (k.startswith(key) or key.startswith(k)) for s in v]
            hit = cands if len(set(cands)) == 1 else None
        if hit:
            symbols.append(hit[0])
        else:
            missing.append(nm)
    if missing:
        print(f"  Could not match to a symbol: {missing}")
    return symbols


def replace_members(client, key: str, symbols: list[str], expected: int) -> bool:
    symbols = list(dict.fromkeys(symbols))
    if len(symbols) != expected:
        print(f"  {key}: got {len(symbols)} symbols, expected {expected}. Keeping the stored list.")
        return False
    known = {r["symbol"] for r in fetch_all(client, "quotes", "symbol")}
    absent = [s for s in symbols if s not in known]
    if absent:
        print(f"  {key}: {len(absent)} symbols have no quote row yet: {absent}")
    client.table("index_members").delete().eq("index_key", key).execute()
    client.table("index_members").insert([{"index_key": key, "symbol": s} for s in symbols]).execute()
    print(f"  {key}: stored {len(symbols)} symbols.")
    return True


def main() -> int:
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    ok = True
    for key, (filename, expected) in NSE_LISTS.items():
        print(f"{key}: NSE {filename}")
        ok &= replace_members(client, key, fetch_nse_list(filename), expected)
    print("sensex: Wikipedia list matched to our company names")
    ok &= replace_members(client, "sensex", sensex_from_wikipedia(client), 30)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
