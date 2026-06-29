"""
Ingest NSE equity master list into Supabase companies table.
Run once to populate, then periodically to add new listings.

Sector data is sourced in two passes:
  Pass 1 — NSE sector-specific index files: each file IS a sector, so the
            sector label is derived from the URL, not from an "Industry" column.
            These cover most recognisable stocks (800-1000+).
  Pass 2 — NSE broad index constituent files (Nifty 500, Total Market, etc.)
            which carry an "Industry" column.  Fills gaps for stocks that
            appear in big indices but not in any sector-specific index.

Sources (all on nsearchives.nseindia.com, CI-reachable):
  - EQUITY_L.csv          → full symbol + ISIN universe
  - Sector-specific index files → direct sector label per stock
  - Broad index files      → "Industry" column fallback
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

# Pass 1: sector-specific index files — each URL maps to a known sector label.
# Sector is determined by the file name, not parsed from a column.
SECTOR_FILES: list[tuple[str, str]] = [
    ("https://nsearchives.nseindia.com/content/indices/ind_niftyitlist.csv",                   "IT"),
    ("https://nsearchives.nseindia.com/content/indices/ind_niftyfmcglist.csv",                 "FMCG"),
    ("https://nsearchives.nseindia.com/content/indices/ind_niftybanklist.csv",                 "Banking"),
    ("https://nsearchives.nseindia.com/content/indices/ind_niftyfinancialserviceslist.csv",    "Banking"),
    ("https://nsearchives.nseindia.com/content/indices/ind_niftypharmaindex.csv",              "Pharma"),
    ("https://nsearchives.nseindia.com/content/indices/ind_niftyautolist.csv",                 "Auto"),
    ("https://nsearchives.nseindia.com/content/indices/ind_niftymetallist.csv",                "Metal"),
    ("https://nsearchives.nseindia.com/content/indices/ind_niftyrealty.csv",                   "Realty"),
    ("https://nsearchives.nseindia.com/content/indices/ind_niftyenergylist.csv",               "Power"),
    ("https://nsearchives.nseindia.com/content/indices/ind_niftyoilgaslist.csv",               "Oil & Gas"),
    ("https://nsearchives.nseindia.com/content/indices/ind_niftyconsumerdurables.csv",         "Consumer"),
    ("https://nsearchives.nseindia.com/content/indices/ind_niftychemicals.csv",                "Chemicals"),
    ("https://nsearchives.nseindia.com/content/indices/ind_niftymedialist.csv",                "Media"),
    ("https://nsearchives.nseindia.com/content/indices/ind_niftymedia.csv",                    "Media"),
    ("https://nsearchives.nseindia.com/content/indices/ind_niftytelecom.csv",                  "Telecom"),
    ("https://nsearchives.nseindia.com/content/indices/ind_niftycapitalmarket.csv",            "Capital Goods"),
    ("https://nsearchives.nseindia.com/content/indices/ind_niftyinfrastructurelist.csv",       "Capital Goods"),
    ("https://nsearchives.nseindia.com/content/indices/ind_niftycpse.csv",                     "Capital Goods"),
    ("https://nsearchives.nseindia.com/content/indices/ind_niftytextiles.csv",                 "Textiles"),
    ("https://nsearchives.nseindia.com/content/indices/ind_niftyservices.csv",                 "Services"),
    ("https://nsearchives.nseindia.com/content/indices/ind_niftymidsmallfinancialservices.csv","Banking"),
    ("https://nsearchives.nseindia.com/content/indices/ind_niftymidsmallhealthcare.csv",       "Pharma"),
    ("https://nsearchives.nseindia.com/content/indices/ind_niftymidsmallitandtelecom.csv",     "IT"),
    ("https://nsearchives.nseindia.com/content/indices/ind_niftymidcapselect.csv",             None),  # broad — skip
]

# Pass 2: broad index files with an "Industry" column for any remaining gaps.
INDEX_FILES = [
    "https://nsearchives.nseindia.com/content/indices/ind_niftytotalmarketlist.csv",
    "https://nsearchives.nseindia.com/content/indices/ind_nifty500list.csv",
    "https://nsearchives.nseindia.com/content/indices/ind_nifty200list.csv",
    "https://nsearchives.nseindia.com/content/indices/ind_nifty100list.csv",
    "https://nsearchives.nseindia.com/content/indices/ind_nifty50list.csv",
    "https://nsearchives.nseindia.com/content/indices/ind_niftynext50list.csv",
    "https://nsearchives.nseindia.com/content/indices/ind_niftymidcap150list.csv",
    "https://nsearchives.nseindia.com/content/indices/ind_niftysmallcap250list.csv",
    "https://nsearchives.nseindia.com/content/indices/ind_niftymicrocap250list.csv",
    "https://nsearchives.nseindia.com/content/indices/ind_niftylargemidcap250list.csv",
]

# Normalise NSE's verbose industry names to clean sector labels.
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
    key = raw.strip().upper()
    if key in INDUSTRY_MAP:
        return INDUSTRY_MAP[key]
    for k, v in INDUSTRY_MAP.items():
        if k in key or key in k:
            return v
    return "Other"


def _sym_col(df: pd.DataFrame) -> str | None:
    return next((c for c in df.columns if c.strip().lower() == "symbol"), None)


def build_sector_map(session: requests.Session) -> dict[str, str]:
    sector_map: dict[str, str] = {}

    # Pass 1 — sector-specific index files.
    print("Pass 1: sector-specific index files...")
    for url, sector in SECTOR_FILES:
        if sector is None:
            continue
        try:
            resp = session.get(url, timeout=30)
            if resp.status_code != 200 or not resp.text.strip():
                continue
            df = pd.read_csv(io.StringIO(resp.text))
            df.columns = [c.strip() for c in df.columns]
            sym_col = _sym_col(df)
            if not sym_col:
                continue
            added = 0
            for sym in df[sym_col].astype(str).str.strip():
                if sym and sym not in sector_map:
                    sector_map[sym] = sector
                    added += 1
            print(f"  {url.split('/')[-1]}: +{added} → {sector} ({len(sector_map)} total)")
        except Exception as e:
            print(f"  {url.split('/')[-1]}: {e}")

    # Pass 2 — broad index files with Industry column.
    print("Pass 2: broad index files (Industry column)...")
    for url in INDEX_FILES:
        try:
            resp = session.get(url, timeout=30)
            if resp.status_code != 200 or not resp.text.strip():
                continue
            df = pd.read_csv(io.StringIO(resp.text))
            df.columns = [c.strip() for c in df.columns]
            sym_col = _sym_col(df)
            ind_col = next((c for c in df.columns if "industry" in c.strip().lower()), None)
            if not sym_col or not ind_col:
                continue
            added = 0
            for _, row in df.iterrows():
                sym = str(row[sym_col]).strip()
                ind = str(row[ind_col]).strip()
                if sym and ind and sym not in sector_map:
                    mapped = normalize_industry(ind)
                    if mapped != "Other":
                        sector_map[sym] = mapped
                        added += 1
            print(f"  {url.split('/')[-1]}: +{added} ({len(sector_map)} total)")
        except Exception as e:
            print(f"  {url.split('/')[-1]}: {e}")

    print(f"Sector map complete: {len(sector_map)} symbols classified")
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

    session = requests.Session()
    session.headers.update(HEADERS)
    try:
        session.get("https://www.nseindia.com/", timeout=15)
    except requests.RequestException:
        pass

    sector_map = build_sector_map(session)

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
