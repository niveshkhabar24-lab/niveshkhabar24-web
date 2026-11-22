import os
import re
import time
import requests
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from urllib.parse import quote_plus
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY!")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

NSE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.nseindia.com/market-data/all-upcoming-issues-ipo"
}

BSE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Origin": "https://www.bseindia.com",
    "Referer": "https://www.bseindia.com/markets/PublicIssues/IPOIssues_new.aspx?id=1&Type=P"
}

def make_slug(name: str) -> str:
    clean = re.sub(r'[^a-zA-Z0-9\s-]', '', name.lower()).strip()
    clean = re.sub(r'[\s-]+', '-', clean)
    if not clean.endswith('-ipo-gmp'):
        clean = f"{clean}-ipo-gmp"
    return clean

def parse_price_band(price_str):
    if not price_str:
        return 0, 0
    nums = re.findall(r'\d+(?:\.\d+)?', str(price_str).replace(',', ''))
    if len(nums) >= 2:
        return int(float(nums[0])), int(float(nums[1]))
    elif len(nums) == 1:
        v = int(float(nums[0]))
        return v, v
    return 0, 0

def parse_any_date(date_str):
    if not date_str or str(date_str).strip() in ["-", "TBA", "N/A", "None", ""]:
        return None
    clean_dt = str(date_str).strip().split("T")[0]
    for fmt in ("%d-%b-%Y", "%d %b %Y", "%Y-%m-%d", "%d/%m/%Y", "%b %d, %Y"):
        try:
            return datetime.strptime(clean_dt, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None

def classify_category(item_dict, p_max: int, lot_size: int) -> str:
    """NSE/BSE flags + SEBI Lot Value rule se 100% accurate Mainboard vs SME classification"""
    combined_flags = " ".join([
        str(item_dict.get("series") or ""),
        str(item_dict.get("securityType") or ""),
        str(item_dict.get("issueType") or ""),
        str(item_dict.get("subType") or ""),
        str(item_dict.get("exchange") or ""),
        str(item_dict.get("Scrip_Flag") or ""),
        str(item_dict.get("companyName") or item_dict.get("Scrip_Name") or "")
    ]).upper()

    if any(k in combined_flags for
