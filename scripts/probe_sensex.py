"""Temporary: what does Yahoo return for the Sensex (^BSESN)? Safe to delete."""
import yfinance as yf
from curl_cffi import requests as cffi

s = cffi.Session(impersonate="chrome")
t = yf.Ticker("^BSESN", session=s)
try:
    fi = t.fast_info
    print("fast_info last/prev/open/day_high/day_low:", fi.last_price, fi.previous_close, fi.open, fi.day_high, fi.day_low)
except Exception as e:
    print("fast_info failed:", e)
for per, itv in (("7d", "1d"), ("2d", "5m"), ("1d", "1m")):
    try:
        h = t.history(period=per, interval=itv)
        print(f"--- history {per}/{itv}: {len(h)} rows")
        print(h[["Open", "High", "Low", "Close"]].tail(6).to_string())
    except Exception as e:
        print(f"history {per}/{itv} failed:", e)
try:
    print("info:", {k: t.info.get(k) for k in ("regularMarketPrice", "regularMarketPreviousClose", "regularMarketTime", "marketState")})
except Exception as e:
    print("info failed:", e)
