import os
import re
import time
import requests
from datetime import datetime, timezone
from supabase import create_client, Client

# 1. Supabase Connection
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment!")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://www.investorgain.com/"
}

def make_slug(name: str) -> str:
    clean = re.sub(r'[^a-zA-Z0-9\s-]', '', name.lower()).strip()
    clean = re.sub(r'[\s-]+', '-', clean)
    if not clean.endswith('-ipo-gmp'):
        clean = f"{clean}-ipo-gmp"
    return clean

def parse_number(val, default=0):
    if val is None:
        return default
    s = str(val).replace(',', '').replace('₹', '').replace('%', '').strip()
    match = re.search(r'-?\d+(\.\d+)?', s)
    return float(match.group()) if match else default

def parse_price_range(price_str):
    if not price_str:
        return 0, 0
    nums = re.findall(r'\d+(?:\.\d+)?', str(price_str).replace(',', ''))
    if len(nums) >= 2:
        return int(float(nums[0])), int(float(nums[1]))
    elif len(nums) == 1:
        val = int(float(nums[0]))
        return val, val
    return 0, 0

def parse_date(date_str):
    if not date_str or str(date_str).strip() in ["-", "TBA", "N/A", ""]:
        return None
    clean_str = re.sub(r'(\d+)(st|nd|rd|th)', r'\1', str(date_str).strip())
    for fmt in ("%d %b %Y", "%d-%b-%Y", "%Y-%m-%d", "%d %B %Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(clean_str, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None

def map_status(raw_status: str) -> str:
    s = str(raw_status).lower()
    if "open" in s or "live" in s:
        return "Open"
    if "upcoming" in s or "announce" in s:
        return "Upcoming"
    return "Closed"

def fetch_live_ipos():
    # InvestorGain public JSON feed for Mainboard & SME IPO GMP
    url = "https://webnodejs.investorgain.com/cloud/report/data-read/331/1/11/2026/2026-27/0/all"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        return data.get("reportTableData", [])
    except Exception as e:
        print(f"Primary feed error: {e}")
        return []

def sync_ipos():
    rows = fetch_live_ipos()
    if not rows:
        print("No IPO rows fetched. Exiting safely.")
        return

    upserted_count = 0
    for item in rows[:30]:  # Top 30 recent/active IPOs
        raw_name = re.sub(r'<[^>]+>', '', str(item.get("Name", ""))).strip()
        if not raw_name:
            continue

        company_name = raw_name.replace(" IPO", "").strip()
        slug = make_slug(company_name)
        category = "SME" if "SME" in str(item.get("Category", "")).upper() or "SME" in raw_name.upper() else "Mainboard"
        status = map_status(item.get("Status", ""))

        p_min, p_max = parse_price_range(item.get("Price", ""))
        gmp_val = parse_number(item.get("GMP", 0))
        lot_size = int(parse_number(item.get("Lot", 0)))
        issue_size = parse_number(item.get("Size", 0))

        open_dt = parse_date(item.get("Open", ""))
        close_dt = parse_date(item.get("Close", ""))
        allot_dt = parse_date(item.get("BoA Dt", ""))
        list_dt = parse_date(item.get("Listing", ""))

        sub_total = parse_number(item.get("Sub", 0))

        record = {
            "slug": slug,
            "company_name": company_name,
            "category": category,
            "status": status,
            "issue_price_min": p_min,
            "issue_price_max": p_max,
            "lot_size": lot_size,
            "issue_size_cr": issue_size,
            "open_date": open_dt,
            "close_date": close_dt,
            "allotment_date": allot_dt,
            "listing_date": list_dt,
            "gmp_price": gmp_val,
            "total_sub": sub_total,
            "seo_title": f"{company_name} IPO GMP Today, Price Band, Allotment & Listing Date",
            "meta_description": f"{company_name} {category} IPO live GMP today is ₹{int(gmp_val)}. Check price band, lot size, subscription status, and allotment date on NiveshKhabar24.",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

        try:
            supabase.table("ipos").upsert(record, on_conflict="slug").execute()
            upserted_count += 1
            print(f"Synced: {company_name} | Status: {status} | GMP: ₹{gmp_val}")
        except Exception as db_err:
            print(f"DB Error for {company_name}: {db_err}")

    print(f"Done! Total IPOs synced: {upserted_count}")

if __name__ == "__main__":
    sync_ipos()
