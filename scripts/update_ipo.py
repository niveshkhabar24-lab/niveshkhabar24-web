import os
import re
import io
import time
import requests
from datetime import datetime, timezone
from bs4 import BeautifulSoup
from pypdf import PdfReader
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
    s = name.lower()
    for word in ["limited", "ltd.", "ltd", "ipo", "sme", "india", "private", "pvt.", "the"]:
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
    for fmt in ("%d-%b-%Y", "%d %b %Y", "%Y-%m-%d", "%d/%m/%Y", "%b %d, %Y", "%d-%m-%Y", "%d %B %Y"):
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
        str(item_dict.get("Category") or ""),
        str(item_dict.get("companyName") or item_dict.get("Scrip_Name") or ""),
    ]).upper()

    if any(k in combined_flags for k in ["SME", "EMERGE", "BSE SME", "NSE SME"]):
        return "SME"
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


def is_valid_active_ipo(ipo: dict) -> bool:
    today_dt = datetime.now(timezone.utc).date()
    open_str = ipo.get("open_date")
    close_str = ipo.get("close_date")

    if close_str:
        try:
            c_dt = datetime.strptime(close_str, "%Y-%m-%d").date()
            if (today_dt - c_dt).days > 20:
                return False
        except ValueError:
            pass

    if open_str:
        try:
            o_dt = datetime.strptime(open_str, "%Y-%m-%d").date()
            if o_dt < today_dt and (ipo.get("price_max") or 0) == 0:
                return False
        except ValueError:
            pass

    return True


def extract_pdf_insights(pdf_url: str) -> dict:
    """DRHP/RHP PDF ke shuruati pages padhkar business sector, issue type aur key facts nikalta hai"""
    insights = {
        "sector": "",
        "is_ofs": False,
        "has_fresh_issue": False,
        "debt_repayment": False,
        "capex_expansion": False,
        "registrar": "",
        "lead_managers": "",
    }
    if not pdf_url or not pdf_url.lower().endswith(".pdf"):
        return insights

    try:
        resp = requests.get(pdf_url, headers=NSE_HEADERS, timeout=25, stream=True)
        if resp.status_code != 200:
            return insights

        # Sirf pehle ~3 MB download karein taaki script fast rahe
        buf = io.BytesIO()
        downloaded = 0
        for chunk in resp.iter_content(chunk_size=65536):
            if not chunk:
                break
            buf.write(chunk)
            downloaded += len(chunk)
            if downloaded > 3 * 1024 * 1024:
                break

        buf.seek(0)
        reader = PdfReader(buf)
        sample_text = ""
        for page in reader.pages[:12]:
            txt = page.extract_text() or ""
            sample_text += " " + txt

        lower_txt = re.sub(r"\s+", " ", sample_text).lower()

        if "offer for sale" in lower_txt:
            insights["is_ofs"] = True
        if "fresh issue" in lower_txt:
            insights["has_fresh_issue"] = True
        if "repayment" in lower_txt or "prepayment" in lower_txt or "borrowings" in lower_txt:
            insights["debt_repayment"] = True
        if "capital expenditure" in lower_txt or "expansion" in lower_txt or "manufacturing facility" in lower_txt:
            insights["capex_expansion"] = True

        for reg in ["KFin Technologies", "Link Intime", "MUFG Intime", "Bigshare Services", "Skyline Financial", "Maashitla Securities", "Cameo Corporate"]:
            if reg.lower() in lower_txt:
                insights["registrar"] = reg
                break

        sector_keywords = {
            "coal": "कोयला खनन और ऊर्जा (Coal Mining & Energy)",
            "crop protection": "एग्रोकेमिकल्स और फसल सुरक्षा (Agrochemicals & Crop Protection)",
            "agrochemical": "एग्रोकेमिकल्स और कृषि उत्पाद (Agrochemicals)",
            "pharmaceutical": "फार्मास्युटिकल और हेल्थकेयर (Pharma & Healthcare)",
            "software": "आईटी और डिजिटल सॉल्यूशंस (IT & Software)",
            "infrastructure": "इन्फ्रास्ट्रक्चर और कंस्ट्रक्शन (Infrastructure & Engineering)",
            "solar": "रिन्यूएबल एनर्जी और सोलर (Renewable Energy)",
            "financial": "बैंकिंग और फाइनेंशियल सर्विसेज (BFSI / NBFC)",
            "automobile": "ऑटोमोबाइल और ऑटो कंपोनेंट्स (Auto & Ancillary)",
            "steel": "मेटल्स और स्टील मैन्युफैक्चरिंग (Metals & Steel)",
            "textile": "टेक्सटाइल और गारमेंट्स (Textiles & Apparel)",
        }
        for kw, label in sector_keywords.items():
            if kw in lower_txt:
                insights["sector"] = label
                break
    except Exception as e:
        print(f"PDF read warning ({pdf_url}): {e}")

    return insights


def generate_unique_analysis(ipo: dict, pdf_info: dict) -> tuple:
    """Har IPO ke real data aur DRHP/RHP PDF insights ke basis par unique Hindi blog + Pros & Cons banata hai"""
    name = ipo["company_name"]
    cat = ipo["category"]
    p_min = ipo.get("price_min") or 0
    p_max = ipo.get("price_max") or 0
    lot = ipo.get("lot_size") or 0
    size_cr = ipo.get("issue_size_cr") or 0
    gmp = ipo.get("gmp_price") or 0
    total_sub = ipo.get("total_sub") or 0
    open_dt = ipo.get("open_date") or "जल्द घोषित"
    close_dt = ipo.get("close_date") or "जल्द घोषित"

    sector_line = (
        f"यह कंपनी मुख्य रूप से {pdf_info['sector']} सेक्टर में काम करती है।"
        if pdf_info.get("sector")
        else f"यह कंपनी अपने सेक्टर में तेज़ी से विस्तार कर रही है और {cat} सेगमेंट में पब्लिक इश्यू लेकर आई है।"
    )

    issue_structure = ""
    if pdf_info.get("is_ofs") and not pdf_info.get("has_fresh_issue"):
        issue_structure = "DRHP/RHP दस्तावेज़ के अनुसार यह इश्यू पूरी तरह Offer for Sale (OFS) है, यानी इसकी राशि मौजूदा शेयरधारकों को जाएगी।"
    elif pdf_info.get("has_fresh_issue") and pdf_info.get("is_ofs"):
        issue_structure = "यह इश्यू Fresh Issue और Offer for Sale (OFS) दोनों का मिश्रण है, जिससे कंपनी को ग्रोथ कैपिटल भी मिलेगी।"
    elif pdf_info.get("has_fresh_issue"):
        issue_structure = "यह एक Fresh Issue है, जिसका पैसा सीधे कंपनी के बिज़नेस विस्तार और वर्किंग कैपिटल में लगेगा।"

    purpose_line = ""
    if pdf_info.get("debt_repayment") and pdf_info.get("capex_expansion"):
        purpose_line = "कंपनी इस फंड का उपयोग नए प्रोजेक्ट्स (Capex) और पुराने कर्ज़ को कम करने के लिए करेगी, जिससे ब्याज खर्च घटेगा।"
    elif pdf_info.get("capex_expansion"):
        purpose_line = "जुटाई गई पूंजी का मुख्य हिस्सा नई उत्पादन क्षमता और बुनियादी ढांचे के विस्तार पर खर्च किया जाएगा।"
    elif pdf_info.get("debt_repayment"):
        purpose_line = "कंपनी इस राशि का बड़ा हिस्सा अपने बकाया कर्ज़ चुकाने के लिए इस्तेमाल करेगी, जिससे बैलेंस शीट मज़बूत होगी।"

    min_inv = p_max * lot if (p_max > 0 and lot > 0) else 0
    lot_text = (
        f"रिटेल निवेशकों के लिए 1 लॉट में {lot} शेयर रखे गए हैं, जिसके लिए ऊपरी प्राइस बैंड ₹{p_max} पर न्यूनतम ₹{min_inv:,} का निवेश करना होगा।"
        if min_inv > 0
        else f"इसका प्राइस बैंड ₹{p_min} से ₹{p_max} प्रति शेयर तय किया गया है और लॉट साइज़ की आधिकारिक पुष्टि एक्सचेंज पर अपडेट की जा रही है।"
    )

    gain_pct = round((gmp / p_max) * 100, 2) if p_max > 0 else 0
    est_price = p_max + gmp if p_max > 0 else gmp
    gmp_text = (
        f"ग्रे मार्केट में {name} IPO का लाइव GMP ₹{gmp} चल रहा है, जो ₹{p_max} के मुकाबले लगभग ₹{est_price} ({gain_pct}%) पर लिस्टिंग के संकेत देता है।"
        if gmp > 0
        else f"अभी ग्रे मार्केट में {name} IPO का GMP ₹0 पर शांत है, इसलिए निवेशकों को सब्सक्रिप्शन के आखिरी दिन QIB और NII मांग पर नज़र रखनी चाहिए।"
    )

    blog_paragraphs = [
        f"1. कंपनी प्रोफ़ाइल और बिज़नेस मॉडल: {name} IPO भारतीय शेयर बाजार के {cat} प्लेटफॉर्म पर निवेश के लिए खुला है। {sector_line} यह इश्यू {open_dt} को बोली लगाने के लिए खुलेगा और {close_dt} को बंद होगा।",
        f"2. इश्यू साइज़ और फंड का उपयोग: {f'इस पब्लिक इश्यू का कुल आकार लगभग ₹{size_cr} करोड़ है।' if size_cr > 0 else ''} {issue_structure} {purpose_line}".strip(),
        f"3. लॉट साइज़ और निवेश की राशि: {lot_text} {('इस इश्यू का आधिकारिक रजिस्ट्रार ' + pdf_info['registrar'] + ' है।') if pdf_info.get('registrar') else ''}".strip(),
        f"4. GMP और सब्सक्रिप्शन विश्लेषण: {gmp_text} {f'अब तक यह इश्यू कुल {total_sub}x सब्सक्राइब हो चुका है।' if total_sub > 0 else ''}".strip(),
    ]

    # Dynamic Pros (Strengths)
    pros = []
    if size_cr >= 500:
        pros.append(f"₹{size_cr} करोड़ का बड़ा इश्यू साइज़ होने के कारण संस्थागत निवेशकों (QIB) की भागीदारी और लिस्टिंग के बाद अच्छी लिक्विडिटी की उम्मीद है।")
    else:
        pros.append(f"{cat} सेगमेंट में तेज़ ग्रोथ क्षमता और अपने सेक्टर में स्थापित ग्राहक नेटवर्क।")

    if pdf_info.get("debt_repayment"):
        pros.append("IPO से जुटाए गए फंड से कंपनी का कर्ज़ कम होगा, जिससे भविष्य में शुद्ध मुनाफ़ा (PAT Margin) सुधर सकता है।")
    elif pdf_info.get("capex_expansion"):
        pros.append("नए प्लांट/कैपेसिटी विस्तार पर निवेश से आने वाले वर्षों में कंपनी की आय बढ़ने की संभावना है।")
    else:
        pros.append("ब्रांड पहचान और उद्योग में बढ़ती मांग से कंपनी को दीर्घकालिक लाभ मिल सकता है।")

    if gmp > 0:
        pros.append(f"ग्रे मार्केट में +₹{gmp} ({gain_pct}%) का सकारात्मक प्रीमियम शुरुआती लिस्टिंग गेन का संकेत दे रहा है।")
    elif total_sub >= 2:
        pros.append(f"बाज़ार में {total_sub}x का मज़बूत सब्सक्रिप्शन निवेशकों के भरोसे को दर्शाता है।")

    # Dynamic Cons (Risks)
    cons = []
    if pdf_info.get("is_ofs") and not pdf_info.get("has_fresh_issue"):
        cons.append("यह इश्यू 100% Offer for Sale (OFS) है, इसलिए IPO से मिला पैसा कंपनी के विकास में नहीं बल्कि प्रमोटर्स/विक्रेताओं के पास जाएगा।")
    else:
        cons.append("कच्चे माल की कीमतों में उतार-चढ़ाव और प्रतिस्पर्धी बाज़ार कंपनी के मार्जिन पर दबाव डाल सकते हैं।")

    if gmp <= 0:
        cons.append("वर्तमान में ग्रे मार्केट प्रीमियम (GMP) ₹0 होने के कारण लिस्टिंग गेन को लेकर अनिश्चितता बनी हुई है।")
    if cat == "SME":
        cons.append("SME कैटेगरी का IPO होने के कारण न्यूनतम निवेश राशि अधिक है और लिस्टिंग के बाद लोअर सर्किट/लिक्विडिटी का जोखिम रहता है।")
    else:
        cons.append("यदि आखिरी दिन QIB सब्सक्रिप्शन कमज़ोर रहता है, तो लिस्टिंग पर दबाव देखने को मिल सकता है।")

    return "\n\n".join(blog_paragraphs), " | ".join(pros), " | ".join(cons)


def fetch_nse_ipos() -> list:
    session = requests.Session()
    session.headers.update(NSE_HEADERS)
    results = []

    try:
        session.get("https://www.nseindia.com/market-data/all-upcoming-issues-ipo", timeout=15)
        time.sleep(1.2)

        endpoints = [
            "https://www.nseindia.com/api/ipo-current-issue",
            "https://www.nseindia.com/api/all-upcoming-issues?category=ipo",
        ]

        seen_keys = set()
        for url in endpoints:
            resp = session.get(url, timeout=15)
            if resp.status_code != 200:
                continue

            data = resp.json()
            items = data if isinstance(data, list) else data.get("data", [])
            for item in items:
                name = (item.get("companyName") or item.get("symbol") or "").strip()
                symbol = (item.get("symbol") or "").strip()
                key = normalize_company_key(name)
                if not name or not key or key in seen_keys:
                    continue
                seen_keys.add(key)

                detail_data = {}
                if symbol:
                    try:
                        d_resp = session.get(f"https://www.nseindia.com/api/ipo-detail?symbol={symbol}", timeout=10)
                        if d_resp.status_code == 200:
                            detail_data = d_resp.json() or {}
                    except Exception:
                        pass

                merged_raw = {**item, **detail_data}
                p_min, p_max = parse_price_band(
                    merged_raw.get("priceBand") or merged_raw.get("issuePrice") or merged_raw.get("priceRange")
                )
                lot_size = int(float(str(
                    merged_raw.get("lotSize") or merged_raw.get("marketLot") or merged_raw.get("bidLot") or 0
                ).replace(",", "") or 0))

                open_dt = parse_any_date(merged_raw.get("issueStartDate") or merged_raw.get("bidStartDate"))
                close_dt = parse_any_date(merged_raw.get("issueEndDate") or merged_raw.get("bidEndDate"))
                list_dt = parse_any_date(merged_raw.get("listingDate"))

                qib_sub = float(merged_raw.get("qibSubscription") or 0)
                nii_sub = float(merged_raw.get("niiSubscription") or 0)
                retail_sub = float(merged_raw.get("retailSubscription") or 0)
                total_sub = float(merged_raw.get("noOfTime") or merged_raw.get("totalSubscription") or 0)

                issue_size_raw = str(merged_raw.get("issueSize") or "0").replace(",", "")
                nums = re.findall(r"\d+(?:\.\d+)?", issue_size_raw)
                issue_size_num = float(nums[0]) if nums else 0
                if issue_size_num > 100000 and p_max > 0:
                    issue_size_cr = round((issue_size_num * p_max) / 10000000, 2)
                else:
                    issue_size_cr = round(issue_size_num, 2)

                # DRHP / RHP PDF Links agar NSE JSON mein hon
                drhp_link = merged_raw.get("drhpUrl") or merged_raw.get("prospectusUrl") or ""
                rhp_link = merged_raw.get("rhpUrl") or merged_raw.get("redHerringUrl") or ""

                category = classify_category(merged_raw, p_max, lot_size)
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
                    "drhp_url": drhp_link,
                    "rhp_url": rhp_link,
                })
    except Exception as e:
        print(f"NSE Fetch Error: {e}")

    return results


def fetch_bse_ipos() -> list:
    results = []
    bse_urls = [
        "https://api.bseindia.com/BseIndiaAPI/api/GetPublicIssueData/w?Type=P&Status=L",
        "https://api.bseindia.com/BseIndiaAPI/api/GetPublicIssueData/w?Type=P&Status=F",
    ]

    seen_keys = set()
    for url in bse_urls:
        try:
            resp = requests.get(url, headers=BSE_HEADERS, timeout=15)
            if resp.status_code != 200:
                continue

            data = resp.json()
            items = data if isinstance(data, list) else data.get("Table", []) or data.get("data", [])
            for item in items:
                name = (item.get("Scrip_Name") or item.get("Company_Name") or item.get("Issuer_Name") or "").strip()
                key = normalize_company_key(name)
                if not name or not key or key in seen_keys:
                    continue
                seen_keys.add(key)

                p_min, p_max = parse_price_band(
                    item.get("Offer_Price") or item.get("Price_Band") or item.get("Issue_Price")
                )
                lot_size = int(float(str(
                    item.get("Market_Lot") or item.get("Lot_Size") or item.get("Bid_Lot") or 0
                ).replace(",", "") or 0))

                open_dt = parse_any_date(item.get("Start_Dt") or item.get("Open_Date") or item.get("Issue_Open_Date"))
                close_dt = parse_any_date(item.get("End_Dt") or item.get("Close_Date") or item.get("Issue_Close_Date"))
                list_dt = parse_any_date(item.get("Listing_Date"))

                total_sub = float(str(item.get("No_of_Times") or item.get("Total_Sub") or 0).replace(",", "") or 0)
                issue_size_raw = str(item.get("Issue_Size") or item.get("Total_Issue_Size") or "0").replace(",", "")
                nums = re.findall(r"\d+(?:\.\d+)?", issue_size_raw)
                issue_size_num = float(nums[0]) if nums else 0
                if issue_size_num > 100000 and p_max > 0:
                    issue_size_cr = round((issue_size_num * p_max) / 10000000, 2)
                else:
                    issue_size_cr = round(issue_size_num, 2)

                pdf_doc = item.get("Prospectus_File") or item.get("DRHP_Link") or ""
                if pdf_doc and not pdf_doc.startswith("http"):
                    pdf_doc = f"https://www.bseindia.com/corporates/download/{pdf_doc}"

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
                    "qib_sub": 0.0,
                    "nii_sub": 0.0,
                    "retail_sub": 0.0,
                    "total_sub": total_sub,
                    "drhp_url": pdf_doc,
                    "rhp_url": pdf_doc,
                })
        except Exception as e:
            print(f"BSE Fetch Warning ({url}): {e}")

    return results


def fetch_sebi_drhp_links() -> dict:
    """SEBI official filings page se latest DRHP/RHP PDF links map karta hai"""
    pdf_map = {}
    try:
        sebi_url = "https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=3&ssid=15&smid=10"
        resp = requests.get(sebi_url, headers=NSE_HEADERS, timeout=15)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, "html.parser")
            for a in soup.find_all("a", href=True):
                title = a.get_text(" ", strip=True)
                href = a["href"]
                if title and len(title) > 5:
                    key = normalize_company_key(title)
                    if key:
                        full_link = href if href.startswith("http") else f"https://www.sebi.gov.in{href}"
                        pdf_map[key] = full_link
    except Exception as e:
        print(f"SEBI DRHP fetch warning: {e}")
    return pdf_map


def merge_nse_and_bse(nse_list: list, bse_list: list) -> list:
    merged_map = {}
    for item in nse_list:
        merged_map[normalize_company_key(item["company_name"])] = item

    for bse_item in bse_list:
        key = normalize_company_key(bse_item["company_name"])
        if key not in merged_map:
            merged_map[key] = bse_item
        else:
            ex = merged_map[key]
            if ex["price_max"] == 0 and bse_item["price_max"] > 0:
                ex["price_min"], ex["price_max"] = bse_item["price_min"], bse_item["price_max"]
            if ex["lot_size"] == 0 and bse_item["lot_size"] > 0:
                ex["lot_size"] = bse_item["lot_size"]
            if ex["issue_size_cr"] == 0 and bse_item["issue_size_cr"] > 0:
                ex["issue_size_cr"] = bse_item["issue_size_cr"]
            if not ex["open_date"] and bse_item["open_date"]:
                ex["open_date"] = bse_item["open_date"]
            if not ex["close_date"] and bse_item["close_date"]:
                ex["close_date"] = bse_item["close_date"]
            if not ex["listing_date"] and bse_item["listing_date"]:
                ex["listing_date"] = bse_item["listing_date"]
            if not ex["drhp_url"] and bse_item["drhp_url"]:
                ex["drhp_url"] = bse_item["drhp_url"]
            if not ex["rhp_url"] and bse_item["rhp_url"]:
                ex["rhp_url"] = bse_item["rhp_url"]
            if bse_item["category"] == "SME":
                ex["category"] = "SME"

    return [ipo for ipo in merged_map.values() if is_valid_active_ipo(ipo)]


def fetch_investorgain_gmp() -> dict:
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

            if "application/json" in resp.headers.get("Content-Type", ""):
                payload = resp.json()
                for r in payload.get("reportTableData", []):
                    raw_name = BeautifulSoup(str(r.get("Name") or r.get("IPO") or ""), "html.parser").get_text(" ", strip=True)
                    raw_gmp = BeautifulSoup(str(r.get("GMP") or "0"), "html.parser").get_text(" ", strip=True)
                    nums = re.findall(r"-?\d+(?:\.\d+)?", raw_gmp.replace(",", ""))
                    if raw_name and nums:
                        gmp_map[normalize_company_key(raw_name)] = float(nums[0])
                if gmp_map:
                    break

            soup = BeautifulSoup(resp.text, "html.parser")
            table = soup.find("table")
            if table:
                for tr in table.find_all("tr")[1:]:
                    cols = [td.get_text(" ", strip=True) for td in tr.find_all("td")]
                    if len(cols) >= 3:
                        nums = re.findall(r"-?\d+(?:\.\d+)?", cols[2].replace(",", ""))
                        if cols[0] and nums:
                            gmp_map[normalize_company_key(cols[0])] = float(nums[0])
                if gmp_map:
                    break
        except Exception as e:
            print(f"InvestorGain warning ({url}): {e}")

    return gmp_map


def sync_all():
    nse_ipos = fetch_nse_ipos()
    bse_ipos = fetch_bse_ipos()
    combined_ipos = merge_nse_and_bse(nse_ipos, bse_ipos)
    gmp_map = fetch_investorgain_gmp()
    sebi_pdfs = fetch_sebi_drhp_links()

    existing_res = supabase.table("ipos").select("*").execute()
    existing_by_slug = {row["slug"]: row for row in (existing_res.data or [])}
    existing_by_key = {normalize_company_key(row["company_name"]): row for row in (existing_res.data or [])}

    updated_count = 0

    for ipo in combined_ipos:
        key = normalize_company_key(ipo["company_name"])
        matched_gmp = gmp_map.get(key)
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
            if ipo["lot_size"] == 0 and old_row.get("lot_size"):
                ipo["lot_size"] = old_row["lot_size"]
            if ipo["issue_size_cr"] == 0 and old_row.get("issue_size_cr"):
                ipo["issue_size_cr"] = old_row["issue_size_cr"]
            if ipo["price_max"] == 0 and old_row.get("price_max"):
                ipo["price_min"] = old_row.get("price_min") or 0
                ipo["price_max"] = old_row.get("price_max") or 0
            if not ipo["drhp_url"] and old_row.get("drhp_url"):
                ipo["drhp_url"] = old_row["drhp_url"]
            if not ipo["rhp_url"] and old_row.get("rhp_url"):
                ipo["rhp_url"] = old_row["rhp_url"]

        # SEBI PDF fallback
        if not ipo["drhp_url"]:
            for s_key, s_url in sebi_pdfs.items():
                if len(key) >= 6 and (key in s_key or s_key in key):
                    ipo["drhp_url"] = s_url
                    break

        ipo["gmp_price"] = matched_gmp if matched_gmp is not None else 0

        # PDF read karke unique blog + Pros & Cons banayein
        target_pdf = ipo.get("rhp_url") or ipo.get("drhp_url") or ""
        pdf_insights = extract_pdf_insights(target_pdf)
        blog_txt, pros_txt, cons_txt = generate_unique_analysis(ipo, pdf_insights)

        ipo["ai_blog_hindi"] = blog_txt
        ipo["pros_list"] = pros_txt
        ipo["cons_list"] = cons_txt
        ipo["updated_at"] = datetime.now(timezone.utc).isoformat()

        supabase.table("ipos").upsert(ipo, on_conflict="slug").execute()
        updated_count += 1

    # DB mein pehle se maujood IPOs ko bhi unique analysis + Pros/Cons se update karein
    for row in (existing_res.data or []):
        key = normalize_company_key(row["company_name"])
        matched_gmp = gmp_map.get(key)
        if matched_gmp is not None:
            row["gmp_price"] = matched_gmp

        target_pdf = row.get("rhp_url") or row.get("drhp_url") or ""
        pdf_insights = extract_pdf_insights(target_pdf)
        blog_txt, pros_txt, cons_txt = generate_unique_analysis(row, pdf_insights)

        patch = {
            "gmp_price": row.get("gmp_price") or 0,
            "ai_blog_hindi": blog_txt,
            "pros_list": pros_txt,
            "cons_list": cons_txt,
            "status": determine_status(row.get("open_date"), row.get("close_date"), row.get("listing_date")),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        supabase.table("ipos").update(patch).eq("id", row["id"]).execute()
        updated_count += 1

    print(f"Sync + PDF Analysis Complete! Updated records: {updated_count}")


if __name__ == "__main__":
    sync_all()
