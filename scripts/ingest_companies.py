"""
Ingest NSE equity master list into Supabase companies table.
Run once to populate, then periodically to add new listings.

Source: NSE equity list CSV (free, updated daily)
URL: https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv
"""

import os
import io
import requests
import pandas as pd
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

NSE_EQUITY_CSV = "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv"

SECTOR_MAP = {
    "AUTOMOBILE AND AUTO COMPONENTS": "Auto",
    "AUTOMOBILE": "Auto",
    "FAST MOVING CONSUMER GOODS": "FMCG",
    "CONSUMER DURABLES": "Consumer",
    "FINANCIAL SERVICES": "Banking",
    "BANK": "Banking",
    "NBFC": "NBFC",
    "INSURANCE": "Insurance",
    "INFORMATION TECHNOLOGY": "IT",
    "HEALTHCARE": "Pharma",
    "PHARMACEUTICALS & BIOTECHNOLOGY": "Pharma",
    "OIL GAS & CONSUMABLE FUELS": "Oil & Gas",
    "ENERGY": "Power",
    "POWER": "Power",
    "METALS & MINING": "Metal",
    "CONSTRUCTION MATERIALS": "Cement",
    "CAPITAL GOODS": "Capital Goods",
    "REALTY": "Realty",
    "MEDIA ENTERTAINMENT & PUBLICATION": "Media",
    "TEXTILES": "Textiles",
    "CHEMICALS": "Chemicals",
    "FERTILISERS & AGROCHEMICALS": "Chemicals",
    "CONSUMER SERVICES": "Services",
    "TELECOMMUNICATION": "Telecom",
    "FOREST MATERIALS": "Materials",
    "DIVERSIFIED": "Diversified",
}

def classify_mcap(mcap: float) -> str:
    if mcap >= 20000:
        return "large"
    elif mcap >= 5000:
        return "mid"
    elif mcap >= 500:
        return "small"
    return "micro"


def fetch_nse_list() -> pd.DataFrame:
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml",
    }
    resp = requests.get(NSE_EQUITY_CSV, headers=headers, timeout=30)
    resp.raise_for_status()
    df = pd.read_csv(io.StringIO(resp.text))
    df.columns = [c.strip() for c in df.columns]
    return df


def run():
    print("Connecting to Supabase...")
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    print("Fetching NSE equity list...")
    df = fetch_nse_list()
    print(f"  Found {len(df)} companies in NSE list")

    records = []
    for _, row in df.iterrows():
        symbol = str(row.get("SYMBOL", "")).strip()
        name = str(row.get("NAME OF COMPANY", "")).strip()
        isin = str(row.get("ISIN NUMBER", "")).strip()

        if not symbol or not name:
            continue

        sector_raw = str(row.get("SERIES", "")).strip()
        sector = SECTOR_MAP.get(sector_raw.upper(), "Other")

        records.append({
            "symbol": symbol,
            "name": name,
            "isin": isin if isin else None,
            "sector": sector,
            "is_active": True,
        })

    print(f"Upserting {len(records)} company records...")
    batch_size = 500
    for i in range(0, len(records), batch_size):
        batch = records[i : i + batch_size]
        client.table("companies").upsert(batch, on_conflict="symbol").execute()
        print(f"  Upserted {min(i + batch_size, len(records))}/{len(records)}")

    print("Done!")


if __name__ == "__main__":
    run()
