"""
Ingest NSE equity master list into Supabase companies table.
Run once to populate, then periodically to add new listings.

Sector data comes from NSE's index constituent files (Nifty Total Market,
Nifty 500, etc.) which carry an "Industry" column. The base equity list
(EQUITY_L.csv) only has a "SERIES" trading-type column (EQ/BE/etc.) and
is used purely for the symbol universe — NOT for sector classification.

Sources (all on nsearchives.nseindia.com, CI-reachable):
  - EQUITY_L.csv          → full symbol + ISIN universe
  - ind_niftytotalmarketlist.csv  → ~750 stocks with Industry
  - ind_nifty500list.csv          → 500 stocks with Industry
  - ind_nifty50list.csv           → 50 stocks with Industry (fallback)
"""

import io
import os

import pandas as pd
import requests
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept": "text/csv,application/octet-stream,*/*",
    "Referer": "https://www.nseindia.com/",
}

NSE_EQUITY_CSV = "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv"

# NSE index constituent files — each has "Industry" and "Symbol" columns.
INDEX_FILES = [
    "https://nsearchives.nseindia.com/content/indices/ind_niftytotalmarketlist.csv",
    "https://nsearchives.nseindia.com/content/indices/ind_nifty500list.csv",
    "https://nsearchives.nseindia.com/content/indices/ind_nifty200list.csv",
    "https://nsearchives.nseindia.com/content/indices/ind_nifty100list.csv",
    "https://nsearchives.nseindia.com/content/indices/ind_nifty50list.csv",
    "https://nsearchives.nseindia.com/content/indices/ind_niftynext50list.csv",
    "https://nsearchives.nseindia.com/content/indices/ind_niftymidcap150list.csv",
    "https://nsearchives.nseindia.com/content/indices/ind_niftysmallcap250list.csv",
]

# Map NSE's verbose industry names to cleaner display sector labels.
INDUSTRY_MAP = {
    "FINANCIAL SERVICES": "Banking",
    "BANKS": "Banking",
    "BANK": "Banking",
    "NBFC": "Banking",
    "INSURANCE": "Insurance",
    "INFORMATION TECHNOLOGY": "IT",
    "IT": "IT",
    "SOFTWARE & SERVICES": "IT",
    "FAST MOVING CONSUMER GOODS": "FMCG",
    "FMCG": "FMCG",
    "CONSUMER GOODS": "FMCG",
    "HEALTHCARE": "Pharma",
    "PHARMACEUTICALS": "Pharma",
    "PHARMA": "Pharma",
    "PHARMACEUTICALS & BIOTECHNOLOGY": "Pharma",
    "HOSPITAL & DIAGNOSTIC CENTRES": "Pharma",
    "AUTOMOBILE AND AUTO COMPONENTS": "Auto",
    "AUTOMOBILE": "Auto",
    "AUTO COMPONENTS": "Auto",
    "METALS & MINING": "Metal",
    "METALS": "Metal",
    "MINING": "Metal",
    "STEEL": "Metal",
    "OIL GAS & CONSUMABLE FUELS": "Oil & Gas",
    "OIL & GAS": "Oil & Gas",
    "PETROLEUM PRODUCTS": "Oil & Gas",
    "ENERGY": "Power",
    "POWER": "Power",
    "UTILITIES": "Power",
    "CAPITAL GOODS": "Capital Goods",
    "ENGINEERING": "Capital Goods",
    "INDUSTRIAL MANUFACTURING": "Capital Goods",
    "CONSTRUCTION MATERIALS": "Cement",
    "CEMENT & CEMENT PRODUCTS": "Cement",
    "CEMENT": "Cement",
    "REALTY": "Realty",
    "REAL ESTATE": "Realty",
    "CONSTRUCTION": "Realty",
    "CONSUMER DURABLES": "Consumer",
    "CONSUMER DISCRETIONARY": "Consumer",
    "TEXTILES": "Textiles",
    "CHEMICALS": "Chemicals",
    "FERTILISERS & AGROCHEMICALS": "Chemicals",
    "AGROCHEMICALS": "Chemicals",
    "MEDIA & ENTERTAINMENT": "Media",
    "MEDIA ENTERTAINMENT & PUBLICATION": "Media",
    "MEDIA": "Media",
    "TELECOMMUNICATION": "Telecom",
    "TELECOM": "Telecom",
    "TRANSPORTATION": "Logistics",
    "LOGISTICS": "Logistics",
    "RETAILING": "Retail",
    "RETAIL": "Retail",
    "DIVERSIFIED": "Diversified",
    "SERVICES": "Services",
    "CONSUMER SERVICES": "Services",
}


def normalize_industry(raw: str) -> str:
    """Map an NSE industry string to a clean sector label."""
    key = raw.strip().upper()
    # Direct match
    if key in INDUSTRY_MAP:
        return INDUSTRY_MAP[key]
    # Partial match (longest prefix wins)
    for k, v in INDUSTRY_MAP.items():
        if k in key or key in k:
            return v
    return "Other"


def fetch_sector_map() -> dict[str, str]:
    """Download NSE index constituent CSVs and build symbol → sector mapping."""
    session = requests.Session()
    session.headers.update(HEADERS)
    try:
        session.get("https://www.nseindia.com/", timeout=15)
    except requests.RequestException:
        pass

    sector_map: dict[str, str] = {}
    for url in INDEX_FILES:
        try:
            resp = session.get(url, timeout=30)
            if resp.status_code != 200 or not resp.text.strip():
                continue
            df = pd.read_csv(io.StringIO(resp.text))
            df.columns = [c.strip() for c in df.columns]
            sym_col = next((c for c in df.columns if c.strip().lower() == "symbol"), None)
            ind_col = next((c for c in df.columns if "industry" in c.strip().lower()), None)
            if not sym_col or not ind_col:
                print(f"  Skipping {url}: no Symbol/Industry columns (got {list(df.columns)})")
                continue
            added = 0
            for _, row in df.iterrows():
                sym = str(row[sym_col]).strip()
                ind = str(row[ind_col]).strip()
                if sym and ind and sym not in sector_map:
                    sector_map[sym] = normalize_industry(ind)
                    added += 1
            print(f"  {url.split('/')[-1]}: {added} new symbols mapped ({len(sector_map)} total)")
        except Exception as e:
            print(f"  {url.split('/')[-1]}: {e}")

    print(f"Sector map: {len(sector_map)} symbols with industry classification")
    return sector_map


def classify_mcap(mcap: float) -> str:
    if mcap >= 20000:
        return "large"
    elif mcap >= 5000:
        return "mid"
    elif mcap >= 500:
        return "small"
    return "micro"


def fetch_nse_list() -> pd.DataFrame:
    session = requests.Session()
    session.headers.update(HEADERS)
    resp = session.get(NSE_EQUITY_CSV, timeout=30)
    resp.raise_for_status()
    df = pd.read_csv(io.StringIO(resp.text))
    df.columns = [c.strip() for c in df.columns]
    return df


def run():
    print("Connecting to Supabase...")
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    print("Building sector map from NSE index constituent files...")
    sector_map = fetch_sector_map()

    print("Fetching NSE equity list...")
    df = fetch_nse_list()
    print(f"  {len(df)} companies in EQUITY_L.csv")

    records = []
    sector_counts: dict[str, int] = {}
    for _, row in df.iterrows():
        symbol = str(row.get("SYMBOL", "")).strip()
        name = str(row.get("NAME OF COMPANY", "")).strip()
        isin = str(row.get("ISIN NUMBER", "")).strip()

        if not symbol or not name:
            continue

        sector = sector_map.get(symbol, "Other")
        sector_counts[sector] = sector_counts.get(sector, 0) + 1

        records.append({
            "symbol": symbol,
            "name": name,
            "isin": isin if isin and isin != "nan" else None,
            "sector": sector,
            "is_active": True,
        })

    print(f"Upserting {len(records)} company records...")
    print("Sector distribution:", {k: v for k, v in sorted(sector_counts.items(), key=lambda x: -x[1])})

    batch_size = 500
    for i in range(0, len(records), batch_size):
        batch = records[i: i + batch_size]
        client.table("companies").upsert(batch, on_conflict="symbol").execute()
        print(f"  Upserted {min(i + batch_size, len(records))}/{len(records)}")

    print("Done!")


if __name__ == "__main__":
    run()
