import os
import re
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY!")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9"
}

def make_slug(name: str) -> str:
    clean = re.sub(r'[^a-zA-Z0-9\s-]', '', name.lower()).strip()
    clean = re.sub(r'[\s-]+', '-', clean)
    if not clean.endswith('-ipo-gmp'):
        clean = f"{clean}-ipo-gmp"
    return clean

def parse_number(val, default=0.0):
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
        v = int(float(nums[0]))
        return v, v
    return 0, 0

def parse_date(date_str):
    if not date_str or str(date_str).strip() in ["-", "TBA", "N/A", ""]:
        return None
    clean_str = re.sub(r'(\d+)(st|nd|rd|th)', r'\1', str(date_str).strip())
    # Agar year missing ho to current year jodein
    if re.match(r'^\d{1,2}\s+[A-Za-z]{3}$', clean_str):
        clean_str = f"{clean_str} {datetime.now().year}"
    for fmt in ("%d %b %Y", "%d-%b-%Y", "%Y-%m-%d", "%d %B %Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(clean_str, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None

def detect_status(open_dt, close_dt, raw_status=""):
    s = str(raw_status).lower()
    if "open" in s or "live" in s:
        return "Open"
    if "upcoming" in s:
        return "Upcoming"
    today = datetime.now().strftime("%Y-%m-%d")
    if open_dt and close_dt:
        if open_dt <= today <= close_dt:
            return "Open"
        elif today < open_dt:
            return "Upcoming"
        else:
            return "Closed"
    return "Upcoming"

def fetch_from_ipowatch():
    url = "https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/"
    resp = requests.get(url, headers=HEADERS, timeout=25)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    tables = soup.find_all("table")
    records = []

    for table in tables:
        rows = table.find_all("tr")
        if len(rows) < 3:
            continue
        header_text = rows[0].get_text(" ", strip=True).lower()
        if "ipo" not in header_text or "gmp" not in header_text:
            continue

        for row in rows[1:]:
            cols = [c.get_text(" ", strip=True) for c in row.find_all(["td", "th"])]
            if len(cols) < 4:
                continue
            raw_name = cols[0].strip()
            if not raw_name or "ipo name" in raw_name.lower():
                continue

            company_name = re.sub(r'\s*\(.*?\)', '', raw_name).replace(" IPO", "").strip()
            category = "SME" if "sme" in raw_name.lower() or "sme" in " ".join(cols).lower() else "Mainboard"

            # Columns generally: IPO Name | Price | GMP | Est Listing | Fire/Dates
            p_min, p_max = parse_price_range(cols[1])
            gmp_val = parse_number(cols[2], 0.0)

            open_dt, close_dt = None, None
            for col in cols[3:]:
                if "-" in col and any(m in col for m in ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]):
                    parts = col.split("-")
                    if len(parts) == 2:
                        close_dt = parse_date(parts[1].strip())
                        open_part = parts[0].strip()
                        if len(open_part) <= 2 and close_dt:
                            month_yr = datetime.strptime(close_dt, "%Y-%m-%d").strftime("%b %Y")
                            open_dt = parse_date(f"{open_part} {month_yr}")
                        else:
                            open_dt = parse_date(open_part)

            status = detect_status(open_dt, close_dt, " ".join(cols))

            records.append({
                "slug": make_slug(company_name),
                "company_name": company_name,
                "category": category,
                "status": status,
                "issue_price_min": p_min,
                "issue_price_max": p_max,
                "gmp_price": gmp_val,
                "open_date": open_dt,
                "close_date": close_dt,
                "seo_title": f"{company_name} IPO GMP Today, Price Band, Allotment & Listing Date",
                "meta_description": f"{company_name} {category} IPO live GMP today is ₹{int(gmp_val)}. Check latest price band, dates, and subscription status on NiveshKhabar24.",
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
        if records:
            break
    return records

def sync_ipos():
    print("Fetching live IPO GMP data...")
    try:
        records = fetch_from_ipowatch()
    except Exception as e:
        print(f"Fetch error: {e}")
        records = []

    if not records:
        print("Still 0 records fetched. Check source layout.")
        return

    synced = 0
    for rec in records[:25]:
        try:
            supabase.table("ipos").upsert(rec, on_conflict="slug").execute()
            synced += 1
            print(f"Synced: {rec['company_name']} ({rec['category']}) | Price: ₹{rec['issue_price_max']} | GMP: ₹{rec['gmp_price']}")
        except Exception as err:
            print(f"DB Error for {rec['company_name']}: {err}")

    print(f"Successfully synced {synced} live IPOs to Supabase!")

if __name__ == "__main__":
    sync_ipos()
