import os
import re
import time
import requests
from datetime import datetime, timezone
from bs4 import BeautifulSoup
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
    "Referer": "https://www.nseindia.com/market-data/all-upcoming-issues-ipo",
}

BSE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Origin": "https://www.bseindia.com",
    "Referer": "https://www.bseindia.com/markets/PublicIssues/IPOIssues_new.aspx?id=1&Type=P",
}

IG_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "application/json, text/html, */*",
    "Referer": "https://www.investorgain.com/report/live-ipo-gmp/331/",
}


def make_slug(name: str) -> str:
    clean = re.sub(r"[^a-zA-Z0-9\s-]", "", name.lower()).strip()
    clean = re.sub(r"[\s-]+", "-", clean)
    if not clean.endswith("-ipo-gmp"):
        clean = f"{clean}-ipo-gmp"
    return clean


def normalize_company_key(name: str) -> str:
    """Fuzzy matching ke liye company name ko clean key mein badalta hai"""
    s = name.lower()
    for word in ["limited", "ltd.", "ltd", "ipo", "sme", "india", "private", "pvt."]:
        s = re.sub(rf"\b{re.escape(word)}\b", "", s)
    return re.sub(r"[^a-z0-9]", "", s).strip()


def parse_price_band(price_str):
    if not price_str:
        return 0, 0
    nums = re.findall(r"\d+(?:\.\d+)?", str(price_str).replace(",", ""))
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
    for fmt in ("%d-%b-%Y", "%d %b %Y", "%Y-%m-%d", "%d/%m/%Y", "%b %d, %Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(clean_dt, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def classify_category(item_dict, p_max: int, lot_size: int) -> str:
    combined_flags = " ".join([
        str(item_dict.get("series") or ""),
        str(item_dict.get("securityType") or ""),
        str(item_dict.get("issueType") or ""),
        str(item_dict.get("subType") or ""),
        str(item_dict.get("exchange") or ""),
        str(item_dict.get("Scrip_Flag") or ""),
        str(item_dict.get("companyName") or item_dict.get("Scrip_Name") or ""),
    ]).upper()

    if any(k in combined_flags for k in ["SME", "EMERGE", "BSE SME", "NSE SME"]):
        return "SME"
    # SEBI rule: SME IPO min application value hamesha ₹1,00,000+ hoti hai
    if p_max > 0 and lot_size > 0 and (p_max * lot_size) >= 90000:
        return "SME"
    return "Mainboard"


def determine_status(open_dt: str, close_dt: str, list_dt: str) -> str:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if list_dt and today >= list_dt:
        return "Listed"
    if open_dt and close_dt:
        if open_dt <= today <= close_dt:
            return "Open"
        elif today < open_dt:
            return "Upcoming"
        else:
            return "Closed"
    if open_dt and today < open_dt:
        return "Upcoming"
    return "Open"


def fetch_nse_ipos() -> list:
    """NSE ki official APIs se Current aur Upcoming IPOs fetch karta hai"""
    session = requests.Session()
    session.headers.update(NSE_HEADERS)
    results = []

    try:
        # NSE cookie handshake
        session.get("https://www.nseindia.com/market-data/all-upcoming-issues-ipo", timeout=15)
        time.sleep(1.2)

        endpoints = [
            "https://www.nseindia.com/api/ipo-current-issue",
            "https://www.nseindia.com/api/all-upcoming-issues?category=ipo",
        ]

        seen_names = set()
        for url in endpoints:
            resp = session.get(url, timeout=15)
            if resp.status_code != 200:
                print(f"NSE endpoint {url} returned {resp.status_code}")
                continue

            data = resp.json()
            items = data if isinstance(data, list) else data.get("data", [])
            for item in items:
                name = (item.get("companyName") or item.get("symbol") or "").strip()
                if not name or name.lower() in seen_names:
                    continue
                seen_names.add(name.lower())

                p_min, p_max = parse_price_band(item.get("priceBand") or item.get("issuePrice"))
                lot_size = int(float(str(item.get("lotSize") or item.get("marketLot") or 0).replace(",", "") or 0))
                open_dt = parse_any_date(item.get("issueStartDate") or item.get("bidStartDate"))
                close_dt = parse_any_date(item.get("issueEndDate") or item.get("bidEndDate"))
                list_dt = parse_any_date(item.get("listingDate"))

                # Subscription details agar available hon
                qib_sub = float(item.get("qibSubscription") or 0)
                nii_sub = float(item.get("niiSubscription") or 0)
                retail_sub = float(item.get("retailSubscription") or 0)
                total_sub = float(item.get("noOfTime") or item.get("totalSubscription") or 0)

                issue_size_raw = str(item.get("issueSize") or "0").replace(",", "")
                issue_size_num = float(re.findall(r"\d+(?:\.\d+)?", issue_size_raw)[0]) if re.findall(r"\d+(?:\.\d+)?", issue_size_raw) else 0
                # Agar NSE shares mein size deta hai to approx Cr mein convert karein
                if issue_size_num > 100000 and p_max > 0:
                    issue_size_cr = round((issue_size_num * p_max) / 10000000, 2)
                else:
                    issue_size_cr = round(issue_size_num, 2)

                category = classify_category(item, p_max, lot_size)
                status = determine_status(open_dt, close_dt, list_dt)

                results.append({
                    "company_name": name,
                    "slug": make_slug(name),
                    "category": category,
                    "status": status,
                    "open_date": open_dt,
                    "close_date": close_dt,
                    "listing_date": list_dt,
                    "price_min": p_min,
                    "price_max": p_max,
                    "lot_size": lot_size,
                    "issue_size_cr": issue_size_cr,
                    "qib_sub": qib_sub,
                    "nii_sub": nii_sub,
                    "retail_sub": retail_sub,
                    "total_sub": total_sub,
                })
    except Exception as e:
        print(f"NSE Fetch Error: {e}")

    print(f"Total IPOs fetched from NSE: {len(results)}")
    return results


def fetch_investorgain_gmp() -> dict:
    """InvestorGain se live GMP table scrape/fetch karke {normalized_name: gmp_float} return karta hai"""
    gmp_map = {}
    urls = [
        "https://webnodejs.investorgain.com/cloud/report/data-read/331/1/11/2026/2026-27/0/all",
        "https://www.investorgain.com/report/live-ipo-gmp/331/",
    ]

    for url in urls:
        try:
            resp = requests.get(url, headers=IG_HEADERS, timeout=15)
            if resp.status_code != 200:
                continue

            # Case 1: JSON API response
            if "application/json" in resp.headers.get("Content-Type", ""):
                payload = resp.json()
                rows = payload.get("reportTableData", [])
                for r in rows:
                    raw_name = BeautifulSoup(str(r.get("Name") or r.get("IPO") or ""), "html.parser").get_text(" ", strip=True)
                    raw_gmp = BeautifulSoup(str(r.get("GMP") or "0"), "html.parser").get_text(" ", strip=True)
                    nums = re.findall(r"-?\d+(?:\.\d+)?", raw_gmp.replace(",", ""))
                    if raw_name and nums:
                        gmp_map[normalize_company_key(raw_name)] = float(nums[0])
                if gmp_map:
                    break

            # Case 2: HTML table fallback
            soup = BeautifulSoup(resp.text, "html.parser")
            table = soup.find("table")
            if table:
                for tr in table.find_all("tr")[1:]:
                    cols = [td.get_text(" ", strip=True) for td in tr.find_all("td")]
                    if len(cols) >= 3:
                        raw_name = cols[0]
                        nums = re.findall(r"-?\d+(?:\.\d+)?", cols[2].replace(",", ""))
                        if raw_name and nums:
                            gmp_map[normalize_company_key(raw_name)] = float(nums[0])
                if gmp_map:
                    break
        except Exception as e:
            print(f"InvestorGain fetch warning ({url}): {e}")

    print(f"Total GMP entries mapped from InvestorGain: {len(gmp_map)}")
    return gmp_map


def sync_all():
    nse_ipos = fetch_nse_ipos()
    gmp_map = fetch_investorgain_gmp()

    # Existing DB rows fetch karein taaki manual entries aur purane GMP values safe rahein
    existing_res = supabase.table("ipos").select("*").execute()
    existing_by_slug = {row["slug"]: row for row in (existing_res.data or [])}
    existing_by_key = {normalize_company_key(row["company_name"]): row for row in (existing_res.data or [])}

    updated_count = 0

    # 1. NSE se aaye IPOs ko update/insert karein
    for ipo in nse_ipos:
        key = normalize_company_key(ipo["company_name"])
        matched_gmp = gmp_map.get(key)

        # Partial key match fallback
        if matched_gmp is None:
            for g_key, g_val in gmp_map.items():
                if len(key) >= 6 and (key in g_key or g_key in key):
                    matched_gmp = g_val
                    break

        old_row = existing_by_slug.get(ipo["slug"]) or existing_by_key.get(key)
        if old_row:
            ipo["slug"] = old_row["slug"]
            if matched_gmp is None:
                matched_gmp = float(old_row.get("gmp_price") or 0)
            # Agar NSE ne lot_size 0 diya ho to purana lot_size bachaye rakhein
            if ipo["lot_size"] == 0 and old_row.get("lot_size"):
                ipo["lot_size"] = old_row["lot_size"]
            if ipo["issue_size_cr"] == 0 and old_row.get("issue_size_cr"):
                ipo["issue_size_cr"] = old_row["issue_size_cr"]

        ipo["gmp_price"] = matched_gmp if matched_gmp is not None else 0
        ipo["updated_at"] = datetime.now(timezone.utc).isoformat()

        supabase.table("ipos").upsert(ipo, on_conflict="slug").execute()
        updated_count += 1

    # 2. Jo IPOs pehle se DB mein hain (jaise Mahanadi Coalfields), unka GMP aur Status bhi refresh karein
    for row in (existing_res.data or []):
        key = normalize_company_key(row["company_name"])
        matched_gmp = gmp_map.get(key)
        if matched_gmp is None:
            for g_key, g_val in gmp_map.items():
                if len(key) >= 6 and (key in g_key or g_key in key):
                    matched_gmp = g_val
                    break

        patch = {}
        if matched_gmp is not None and float(row.get("gmp_price") or 0) != matched_gmp:
            patch["gmp_price"] = matched_gmp

        new_status = determine_status(row.get("open_date"), row.get("close_date"), row.get("listing_date"))
        if new_status != row.get("status"):
            patch["status"] = new_status

        if patch:
            patch["updated_at"] = datetime.now(timezone.utc).isoformat()
            supabase.table("ipos").update(patch).eq("id", row["id"]).execute()
            updated_count += 1

    print(f"Sync complete! Total records upserted/updated: {updated_count}")


if __name__ == "__main__":
    sync_all()
