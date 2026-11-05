"""
One-off probe 2: what does NSE's shareholding master return, and can the per-quarter XBRL filing be read?
Prints the field names, one filing link and the percentage-type elements of the XBRL file. Safe to delete afterwards.
"""
import json
import re
import time

from curl_cffi import requests as cffi

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept": "*/*", "Accept-Language": "en-US,en;q=0.9", "Referer": "https://www.nseindia.com/"}

s = cffi.Session(impersonate="chrome124")
s.headers.update(UA)
s.get("https://www.nseindia.com/", timeout=20)
time.sleep(1)
r = s.get("https://www.nseindia.com/api/corporate-share-holdings-master?index=equities&symbol=DRREDDY", timeout=25)
data = r.json()
print(f"{len(data)} quarters returned")
print("fields:", sorted(data[0].keys()))
for q in data[:6]:
    print({k: q.get(k) for k in ("date", "pr_and_prgrp", "public_val", "employeeTrusts", "recordId", "xbrl")})

link = data[0].get("xbrl")
print("xbrl link:", link)
if link:
    x = s.get(link, timeout=40)
    print(f"xbrl HTTP {x.status_code}, {len(x.text)} chars")
    txt = x.text
    print(txt[:400].replace("\n", " "))
    # Percentage elements with their context ids
    items = re.findall(r"<([\w\-:]+)\s+contextRef=\"([^\"]+)\"[^>]*>([^<]*)</\1>", txt)
    pct = [(n, c, v) for n, c, v in items if "ercent" in n or "Pledge" in n or "pledge" in n]
    print(f"{len(items)} fact elements, {len(pct)} percentage/pledge facts")
    for n, c, v in pct[:60]:
        print(f"  {n} | {c} | {v}")
    ctx = re.findall(r"<xbrli:context id=\"([^\"]+)\">(.*?)</xbrli:context>", txt, re.S)
    print(f"{len(ctx)} contexts; sample:")
    for cid, body in ctx[:25]:
        members = re.findall(r"<xbrldi:explicitMember[^>]*>([^<]+)</xbrldi:explicitMember>", body)
        print(f"  {cid}: {members}")
