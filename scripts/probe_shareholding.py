"""
One-off probe: which free sources for shareholding patterns and bulk/block deals answer from CI?
Prints HTTP status, size and the start of each response (no secrets involved). Safe to delete afterwards.
"""
import json
import time

import requests
from curl_cffi import requests as cffi

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept": "*/*", "Accept-Language": "en-US,en;q=0.9"}


def show(label, resp):
    body = resp.text if hasattr(resp, "text") else ""
    print(f"[{label}] HTTP {resp.status_code}, {len(body)} chars")
    print("    " + body[:500].replace("\n", " ") + "\n", flush=True)


def attempt(label, fn):
    try:
        show(label, fn())
    except Exception as e:
        print(f"[{label}] ERROR {e}\n", flush=True)


print("=== NSE JSON API (Chrome impersonation) ===", flush=True)
s = cffi.Session(impersonate="chrome124")
s.headers.update({**UA, "Referer": "https://www.nseindia.com/"})
attempt("nse home", lambda: s.get("https://www.nseindia.com/", timeout=20))
time.sleep(1)
for label, path in [
    ("shareholding master", "/api/corporate-share-holdings-master?index=equities&symbol=DRREDDY"),
    ("shareholding master (period)", "/api/corporate-share-holdings-master?index=equities&period_ended=all&symbol=DRREDDY"),
    ("bulk deals history", "/api/historical/bulk-deals?symbol=DRREDDY&from=01-08-2026&to=05-11-2026"),
    ("block deals history", "/api/historical/block-deals?symbol=DRREDDY&from=01-08-2026&to=05-11-2026"),
    ("insider trading (PIT)", "/api/corporates-pit?index=equities&symbol=DRREDDY&from_date=01-08-2026&to_date=05-11-2026"),
]:
    attempt(label, lambda p=path: s.get("https://www.nseindia.com" + p, timeout=25))
    time.sleep(1)

print("=== NSE archives (plain requests) ===", flush=True)
for label, url in [
    ("bulk.csv", "https://nsearchives.nseindia.com/content/equities/bulk.csv"),
    ("block.csv", "https://nsearchives.nseindia.com/content/equities/block.csv"),
]:
    attempt(label, lambda u=url: requests.get(u, headers={**UA, "Referer": "https://www.nseindia.com/"}, timeout=30))

print("=== BSE JSON API ===", flush=True)
b = requests.Session()
b.headers.update({**UA, "Referer": "https://www.bseindia.com/", "Origin": "https://www.bseindia.com"})
for label, url in [
    ("bse shp summary", "https://api.bseindia.com/BseIndiaAPI/api/shpSecSummery_New/w?qtrid=&scripcode=500124&flag="),
    ("bse shareholding", "https://api.bseindia.com/BseIndiaAPI/api/ShareholdingPatternNew/w?scripcode=500124"),
]:
    attempt(label, lambda u=url: b.get(u, timeout=25))

print("=== Yahoo holders fields ===", flush=True)
try:
    import yfinance as yf
    info = yf.Ticker("DRREDDY.NS", session=cffi.Session(impersonate="chrome")).info or {}
    print({k: info.get(k) for k in ("heldPercentInsiders", "heldPercentInstitutions", "floatShares", "sharesOutstanding")}, flush=True)
except Exception as e:
    print("yahoo error", e, flush=True)
