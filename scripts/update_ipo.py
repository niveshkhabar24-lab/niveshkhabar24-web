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

def parse_nse_date(date_str):
    if not date_str or str(date_str).strip() in ["-", "TBA", "N/A", ""]:
        return None
    for fmt in ("%d-%b-%Y", "%d %b %Y", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(str(date_str).strip(), fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None

def fetch_gmp_from_google_rss(company_name: str) -> float:
    """Google News public RSS se latest GMP headline padh kar Rs value nikalta hai"""
    query = quote_plus(f"{company_name} IPO GMP today")
    rss_url = f"https://news.google.com/rss/search?q={query}&hl=en-IN&gl=IN&ceid=IN:en"
    try:
        resp = requests.get(rss_url, timeout=10)
        if resp.status_code != 200:
            return 0.0
        root = ET.fromstring(resp.text)
        for item in root.findall(".//item")[:5]:
            title = item.findtext("title") or ""
            # Match patterns like 'GMP at Rs 85', 'GMP ₹120', 'GMP of Rs. 45'
            match = re.search(r'GMP[^\d₹Rs]{0,15}(?:₹|Rs\.?|INR)?\s*(\d{1,4})', title, re.IGNORECASE)
            if match:
                return float(match.group(1))
    except Exception:
        pass
    return 0.0

def get_nse_session():
    session = requests.Session()
    session.headers.update(NSE_HEADERS)
    try:
        session.get("https://www.nseindia.com/market-data/all-upcoming-issues-ipo", timeout=15)
        time.sleep(1)
    except Exception as e:
        print(f"NSE cookie init warning: {e}")
    return session

def fetch_nse_ipos():
    session = get_nse_session()
    all_items = []

    endpoints = [
        ("https://www.nseindia.com/api/ipo-current-issue", "Open"),
        ("https://www.nseindia.com/api/ipo-upcoming", "Upcoming")
    ]

    for url, default_status in endpoints:
        try:
            resp = session.get(url, timeout=20)
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list):
                    for row in data:
                        row["_default_status"] = default_status
                        all_items.append(row)
        except Exception as e:
            print(f"NSE endpoint error ({url}): {e}")

    return all_items

def sync_ipos():
    print("Fetching Official NSE Current & Upcoming IPOs...")
    items = fetch_nse_ipos()
    if not items:
        print("NSE returned 0 items. Keeping existing database rows intact.")
        return

    today = datetime.now().strftime("%Y-%m-%d")
    synced = 0

    for item in items:
        raw_name = str(item.get("companyName") or item.get("symbol") or "").strip()
        if not raw_name:
            continue

        company_name = re.sub(r'\s+Limited$|\s+Ltd\.?$', '', raw_name, flags=re.IGNORECASE).strip()
        series = str(item.get("series") or item.get("securityType") or "").upper()
        category = "SME" if "SME" in series or "EMERGE" in series else "Mainboard"

        open_dt = parse_nse_date(item.get("issueStartDate"))
        close_dt = parse_nse_date(item.get("issueEndDate"))

        status = item.get("_default_status", "Upcoming")
        if open_dt and close_dt:
            if open_dt <= today <= close_dt:
                status = "Open"
            elif today < open_dt:
                status = "Upcoming"
            else:
                status = "Closed"

        p_min, p_max = parse_price_band(item.get("issuePrice") or item.get("priceBand"))
        lot_size = int(float(item.get("lotSize") or 0))
        sub_total = float(item.get("noOfTime") or 0)

        gmp_val = fetch_gmp_from_google_rss(company_name)

        record = {
            "slug": make_slug(company_name),
            "company_name": company_name,
            "category": category,
            "status": status,
            "issue_price_min": p_min,
            "issue_price_max": p_max,
            "lot_size": lot_size,
            "open_date": open_dt,
            "close_date": close_dt,
            "gmp_price": gmp_val,
            "total_sub": sub_total,
            "seo_title": f"{company_name} IPO GMP Today, Price Band, Allotment & Listing Date",
            "meta_description": f"{company_name} {category} IPO status is {status}. Check latest GMP (₹{int(gmp_val)}), price band, lot size, and dates on NiveshKhabar24.",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

        try:
            supabase.table("ipos").upsert(record, on_conflict="slug").execute()
            synced += 1
            print(f"Synced: {company_name} | {category} | Status: {status} | GMP: ₹{gmp_val}")
        except Exception as err:
            print(f"DB Error ({company_name}): {err}")

    print(f"Done! Synced {synced} official IPOs.")

if __name__ == "__main__":
    sync_ipos()
