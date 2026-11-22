import os
import re
import io
import time
import requests
from datetime import datetime, timezone
from urllib.parse import quote
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

HINDI_MONTHS = {
    1: "जनवरी", 2: "फ़रवरी", 3: "मार्च", 4: "अप्रैल",
    5: "मई", 6: "जून", 7: "जुलाई", 8: "अगस्त",
    9: "सितंबर", 10: "अक्टूबर", 11: "नवंबर", 12: "दिसंबर"
}


def format_hindi_date(date_str) -> str:
    if not date_str:
        return "जल्द घोषित"
    try:
        dt = datetime.strptime(str(date_str).strip()[:10], "%Y-%m-%d")
        return f"{dt.day:02d} {HINDI_MONTHS[dt.month]} {dt.year}"
    except Exception:
        return str(date_str)


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


def fetch_company_logo(company_name: str, website_url: str = "") -> str:
    """Company ke official domain ya Clearbit API se high-res logo URL nikalta hai"""
    domain = ""
    if website_url:
        cleaned = re.sub(r"^https?://(www\.)?", "", website_url.strip().lower()).split("/")[0]
        if "." in cleaned:
            domain = cleaned

    if not domain:
        clean_words = re.sub(r"\b(limited|ltd|private|pvt|india|ipo|sme)\b", "", company_name.lower())
        slug_domain = re.sub(r"[^a-z0-9]", "", clean_words)
        if slug_domain:
            candidate = f"{slug_domain}.com"
            try:
                r = requests.head(f"https://logo.clearbit.com/{candidate}", timeout=4)
                if r.status_code == 200:
                    return f"https://logo.clearbit.com/{candidate}"
            except Exception:
                pass
            return f"https://ui-avatars.com/api/?name={quote(company_name)}&background=0f766e&color=fff&size=200&bold=true"

    return f"https://logo.clearbit.com/{domain}"


def extract_pdf_insights(pdf_url: str) -> dict:
    insights = {
        "sector": "",
        "is_ofs": False,
        "has_fresh_issue": False,
        "debt_repayment": False,
        "capex_expansion": False,
        "registrar": "",
        "website": "",
    }
    if not pdf_url or not pdf_url.lower().endswith(".pdf"):
        return insights

    try:
        resp = requests.get(pdf_url, headers=NSE_HEADERS, timeout=25, stream=True)
        if resp.status_code != 200:
            return insights

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

        web_match = re.search(r"www\.[a-z0-9-]+\.(?:com|in|co\.in|org|net)", lower_txt)
        if web_match:
            insights["website"] = web_match.group(0)

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
    """Har IPO ke liye 650-800 shabd ka comprehensive Hindi analytical blog + short intro + Pros & Cons banata hai"""
    name = ipo["company_name"]
    cat = ipo.get("category") or "Mainboard"
    p_min = int(ipo.get("price_min") or 0)
    p_max = int(ipo.get("price_max") or 0)
    lot = int(ipo.get("lot_size") or 0)
    size_cr = round(float(ipo.get("issue_size_cr") or 0), 2)
    gmp = round(float(ipo.get("gmp_price") or 0), 2)
    total_sub = round(float(ipo.get("total_sub") or 0), 2)
    qib_sub = round(float(ipo.get("qib_sub") or 0), 2)
    nii_sub = round(float(ipo.get("nii_sub") or 0), 2)
    retail_sub = round(float(ipo.get("retail_sub") or 0), 2)

    open_hi = format_hindi_date(ipo.get("open_date"))
    close_hi = format_hindi_date(ipo.get("close_date"))
    allot_hi = format_hindi_date(ipo.get("allotment_date"))
    list_hi = format_hindi_date(ipo.get("listing_date"))

    sector_desc = (
        f"यह कंपनी मुख्य रूप से {pdf_info['sector']} क्षेत्र में कार्यरत है और अपने उद्योग में स्थापित बाज़ार हिस्सेदारी रखती है।"
        if pdf_info.get("sector")
        else f"यह कंपनी अपने कार्यक्षेत्र में निरंतर विस्तार कर रही है और भारतीय पूंजी बाजार के {cat} सेगमेंट में अपनी हिस्सेदारी सूचीबद्ध कराने जा रही है।"
    )

    short_about = (
        f"{name} एक {cat} श्रेणी की कंपनी है जो {pdf_info['sector'] if pdf_info.get('sector') else 'अपने प्रमुख बिज़नेस सेगमेंट'} में सक्रिय है। "
        f"कंपनी ₹{p_min}-₹{p_max} प्रति शेयर के प्राइस बैंड पर अपना पब्लिक इश्यू लेकर आई है, जो {open_hi} से {close_hi} तक निवेश के लिए खुला रहेगा।"
    )

    if pdf_info.get("is_ofs") and not pdf_info.get("has_fresh_issue"):
        issue_type_text = "कंपनी के ऑफर दस्तावेज़ (DRHP/RHP) के अनुसार यह पब्लिक इश्यू पूरी तरह से Offer for Sale (OFS) है। इसका अर्थ है कि इस IPO से प्राप्त होने वाली संपूर्ण राशि कंपनी के खाते में जाने के बजाय मौजूदा प्रमोटर्स और विक्रय करने वाले शेयरधारकों (Selling Shareholders) को प्राप्त होगी, और कंपनी पर कोई नया इक्विटी डायल्यूशन नहीं होगा।"
    elif pdf_info.get("has_fresh_issue") and pdf_info.get("is_ofs"):
        issue_type_text = "यह पब्लिक इश्यू Fresh Issue और Offer for Sale (OFS) दोनों का संतुलित संयोजन है। Fresh Issue से प्राप्त होने वाली पूंजी का उपयोग सीधे कंपनी के व्यवसाय विस्तार, नई परियोजनाओं और कार्यशील पूंजी की ज़रूरतों को पूरा करने में किया जाएगा, जबकि OFS का हिस्सा मौजूदा निवेशकों को आंशिक निकासी प्रदान करेगा।"
    else:
        issue_type_text = "इस पब्लिक इश्यू के माध्यम से जुटाई जाने वाली शुद्ध आय (Net Proceeds) का उपयोग कंपनी अपने दीर्घकालिक विकास लक्ष्यों को पूरा करने के लिए करेगी। इसमें मुख्य रूप से व्यवसाय विस्तार, कार्यशील पूंजी (Working Capital) की आवश्यकताओं को सुदृढ़ करना और सामान्य कॉर्पोरेट उद्देश्यों की पूर्ति शामिल है।"

    purpose_detail = ""
    if pdf_info.get("debt_repayment") and pdf_info.get("capex_expansion"):
        purpose_detail = "विशेष रूप से कंपनी ने अपने Red Herring Prospectus में स्पष्ट किया है कि वह इस पूंजी का बड़ा हिस्सा नए विनिर्माण/बुनियादी ढांचे (Capex) के विस्तार और मौजूदा बैंक कर्ज़ (Borrowings) को चुकाने में लगाएगी। कर्ज़ कम होने से कंपनी के वार्षिक ब्याज खर्च में कमी आएगी, जिसका सीधा सकारात्मक प्रभाव शुद्ध मुनाफ़े (PAT) पर दिखाई देगा।"
    elif pdf_info.get("capex_expansion"):
        purpose_detail = "कंपनी की योजना इस पूंजी से अपनी उत्पादन और सेवा क्षमता (Capacity Expansion) को बढ़ाने की है, जिससे आगामी वित्तीय वर्षों में राजस्व वृद्धि की नई संभावनाएं खुलेंगी।"
    elif pdf_info.get("debt_repayment"):
        purpose_detail = "कंपनी इस इश्यू से प्राप्त राशि का उपयोग अपने बकाया कर्ज़ के पूर्व-भुगतान (Prepayment/Repayment) के लिए करेगी, जिससे कंपनी का Debt-to-Equity अनुपात बेहतर होगा और बैलेंस शीट अधिक मज़बूत बनेगी।"

    min_inv = p_max * lot if (p_max > 0 and lot > 0) else 0
    if min_inv > 0:
        lot_detail = (
            f"खुदरा निवेशकों (Retail Individual Investors) के लिए कंपनी ने न्यूनतम 1 लॉट में {lot} शेयर निर्धारित किए हैं। "
            f"ऊपरी प्राइस बैंड ₹{p_max} प्रति शेयर के हिसाब से 1 लॉट के लिए आवेदन करने हेतु न्यूनतम ₹{min_inv:,} की पूंजी आवश्यक होगी। "
            f"एक रिटेल निवेशक अधिकतम ₹2,00,000 की सीमा तक बोली लगा सकता है, जबकि ₹2 लाख से ₹10 लाख के बीच आवेदन करने वाले निवेशकों को Small HNI (sNII) और ₹10 लाख से अधिक वालों को Big HNI (bNII) श्रेणी में गिना जाएगा।"
        )
    else:
        lot_detail = (
            f"इस IPO का प्राइस बैंड ₹{p_min} से ₹{p_max} प्रति शेयर तय किया गया है। रिटेल निवेशकों को आवेदन करने के लिए कम से कम 1 लॉट के लिए बोली लगानी होगी, "
            f"जिसके सटीक शेयरों की संख्या एक्सचेंज के आधिकारिक सर्कुलर के अनुसार अपडेट की जा रही है। निवेशकों को सलाह दी जाती है कि वे हमेशा Cut-off Price (₹{p_max}) पर ही बोली लगाएं ताकि आवंटन की संभावना बनी रहे।"
        )

    gain_pct = round((gmp / p_max) * 100, 2) if p_max > 0 else 0
    est_price = round(p_max + gmp, 2) if p_max > 0 else gmp
    if gmp > 0:
        gmp_detail = (
            f"ग्रे मार्केट के ताज़ा आंकड़ों के अनुसार {name} IPO का लाइव GMP +₹{gmp} प्रति शेयर पर ट्रेड कर रहा है। "
            f"यदि यही रुझान लिस्टिंग के दिन तक बना रहता है, तो ₹{p_max} के ऊपरी प्राइस बैंड के मुकाबले यह शेयर लगभग ₹{est_price} प्रति शेयर पर सूचीबद्ध हो सकता है, "
            f"जो निवेशकों को लगभग {gain_pct}% के संभावित लिस्टिंग गेन (Listing Gain) का संकेत देता है। हालांकि, ग्रे मार्केट प्रीमियम अनौपचारिक होता है और बाजार की स्थिति के अनुसार बदलता रहता है।"
        )
    else:
        gmp_detail = (
            f"वर्तमान में ग्रे मार्केट में {name} IPO का GMP ₹0 के स्तर पर शांत बना हुआ है। इसका अर्थ है कि अनौपचारिक बाजार अभी संस्थागत निवेशकों (QIB) और HNI वर्ग की बोली का इंतज़ार कर रहा है। "
            f"ऐसे मामलों में निवेशकों को जल्दबाजी करने के बजाय इश्यू के अंतिम दिन दोपहर 2 बजे तक लाइव सब्सक्रिप्शन आंकड़ों का आकलन करने के बाद ही अंतिम निर्णय लेना चाहिए।"
        )

    reg_name = pdf_info.get("registrar") or "Link Intime / KFin Technologies / Bigshare Services"

    sections = [
        f"1. {name} IPO का परिचय और कंपनी प्रोफ़ाइल: भारतीय शेयर बाजार में निवेश के अवसर तलाश रहे खुदरा और संस्थागत निवेशकों के लिए {name} IPO एक महत्वपूर्ण पब्लिक इश्यू है। {sector_desc} यह इश्यू स्टॉक एक्सचेंज के {cat} प्लेटफॉर्म पर सूचीबद्ध होने के लिए लाया गया है। कंपनी ने अपने शेयरों का मूल्य दायरा (Price Band) ₹{p_min} से ₹{p_max} प्रति शेयर तय किया है। यह पब्लिक इश्यू {open_hi} को बोली लगाने के लिए खुलेगा और {close_hi} को शाम 5 बजे बंद होगा।",
        f"2. महत्वपूर्ण तारीख़ें और अलॉटमेंट शेड्यूल: किसी भी IPO में सफल आवेदन के लिए उसकी समय-सारणी को समझना बेहद ज़रूरी है। {name} IPO की बोली प्रक्रिया {close_hi} को समाप्त होने के बाद शेयरों के आवंटन (Basis of Allotment) को {allot_hi} को अंतिम रूप दिए जाने की संभावना है। जिन निवेशकों को शेयर आवंटित नहीं होंगे, उनके बैंक खाते में ASBA/UPI के माध्यम से ब्लॉक की गई राशि की वापसी (Refund Initiation) अगले कार्यदिवस पर शुरू हो जाएगी, और सफल आवेदकों के डीमैट खाते में शेयर क्रेडिट कर दिए जाएंगे। इसके पश्चात {list_hi} को NSE और BSE पर कंपनी के शेयरों की आधिकारिक लिस्टिंग होगी।",
        f"3. इश्यू साइज़ और जुटाई गई पूंजी का उपयोग (Objects of the Issue): {f'इस पब्लिक इश्यू का कुल आकार लगभग ₹{size_cr} करोड़ निर्धारित किया गया है।' if size_cr > 0 else 'इस पब्लिक इश्यू का आकार एक्सचेंज की फाइलिंग के अनुसार निर्धारित किया गया है।'} {issue_type_text} {purpose_detail}".strip(),
        f"4. लॉट साइज़, न्यूनतम निवेश और निवेशक श्रेणियां: {lot_detail}",
        f"5. लाइव सब्सक्रिप्शन स्थिति और संस्थागत मांग का विश्लेषण: किसी भी IPO की वास्तविक ताकत का अंदाज़ा उसके लाइव सब्सक्रिप्शन आंकड़ों से लगता है। ताज़ा एक्सचेंज डेटा के अनुसार {name} IPO अब तक कुल {total_sub}x गुना सब्सक्राइब हो चुका है। इसमें Qualified Institutional Buyers (QIB) वर्ग में {qib_sub}x, Non-Institutional Investors (NII/HNI) वर्ग में {nii_sub}x, और Retail Individual Investors (RII) वर्ग में {retail_sub}x गुना बोली दर्ज की गई है। विशेष रूप से QIB और NII वर्ग की मज़बूत भागीदारी कंपनी के मूल्यांकन (Valuation) पर बड़े फंड हाउस के भरोसे को दर्शाती है।",
        f"6. ग्रे मार्केट प्रीमियम (GMP) और संभावित लिस्टिंग कीमत: {gmp_detail}",
        f"7. अलॉटमेंट स्टेटस कैसे चेक करें और निवेश से पहले की सावधानियां: इस इश्यू का आधिकारिक रजिस्ट्रार {reg_name} है। अलॉटमेंट जारी होने के बाद निवेशक रजिस्ट्रार की वेबसाइट या BSE/NSE के IPO पोर्टल पर जाकर अपना PAN नंबर या Application नंबर दर्ज करके आसानी से अपना स्टेटस देख सकते हैं। निवेश से पहले कंपनी के पिछले 3 वर्षों के राजस्व (Revenue), शुद्ध लाभ (PAT Margin), और पीयर ग्रुप कंपनियों के P/E अनुपात की तुलना अवश्य करें, और केवल ग्रे मार्केट प्रीमियम के आधार पर निवेश का निर्णय न लें।"
    ]

    pros = []
    if size_cr >= 500:
        pros.append(f"₹{size_cr} करोड़ का बड़ा इश्यू साइज़ होने के कारण संस्थागत निवेशकों (QIB) की सक्रिय भागीदारी और लिस्टिंग के बाद उच्च लिक्विडिटी की संभावना है।")
    else:
        pros.append(f"{cat} सेगमेंट में कंपनी की मज़बूत पकड़ और अपने सेक्टर में विस्तार की स्पष्ट रणनीति।")

    if pdf_info.get("debt_repayment"):
        pros.append("IPO से प्राप्त राशि का उपयोग कर्ज़ चुकाने में होने से कंपनी का ब्याज बोझ कम होगा और शुद्ध मुनाफ़ा बढ़ेगा।")
    elif pdf_info.get("capex_expansion"):
        pros.append("नई उत्पादन क्षमता और बुनियादी ढांचे पर निवेश से भविष्य में आय और बाज़ार हिस्सेदारी बढ़ने की उम्मीद है।")
    else:
        pros.append("स्थापित ग्राहक आधार और अनुभवी प्रमोटर टीम कंपनी के दीर्घकालिक विकास को सहारा देती है।")

    if gmp > 0:
        pros.append(f"ग्रे मार्केट में +₹{gmp} ({gain_pct}%) का सकारात्मक प्रीमियम शुरुआती लिस्टिंग गेन के संकेत दे रहा है।")
    elif total_sub >= 2:
        pros.append(f"एक्सचेंज पर {total_sub}x का मज़बूत सब्सक्रिप्शन निवेशकों के सकारात्मक रुझान को दर्शाता है।")

    cons = []
    if pdf_info.get("is_ofs") and not pdf_info.get("has_fresh_issue"):
        cons.append("यह इश्यू 100% Offer for Sale (OFS) है, इसलिए जुटाई गई राशि कंपनी के विकास में नहीं बल्कि विक्रय करने वाले शेयरधारकों को जाएगी।")
    else:
        cons.append("कच्चे माल की लागत में उतार-चढ़ाव और उद्योग में बढ़ती प्रतिस्पर्धा कंपनी के ऑपरेटिंग मार्जिन पर दबाव डाल सकती है।")

    if gmp <= 0:
        cons.append("वर्तमान में ग्रे मार्केट प्रीमियम (GMP) ₹0 होने के कारण लिस्टिंग गेन को लेकर अनिश्चितता बनी हुई है।")
    if cat == "SME":
        cons.append("SME कैटेगरी का IPO होने के कारण न्यूनतम निवेश राशि अधिक है और लिस्टिंग के बाद सर्किट लिमिट व लो-लिक्विडिटी का जोखिम रहता है।")
    else:
        cons.append("यदि अंतिम दिन QIB सब्सक्रिप्शन कमज़ोर रहता है या समग्र बाजार में गिरावट आती है, तो लिस्टिंग कीमत प्रभावित हो सकती है।")

    return short_about, "\n\n".join(sections), " | ".join(pros), " | ".join(cons)


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

                qib_sub = round(float(merged_raw.get("qibSubscription") or 0), 2)
                nii_sub = round(float(merged_raw.get("niiSubscription") or 0), 2)
                retail_sub = round(float(merged_raw.get("retailSubscription") or 0), 2)
                total_sub = round(float(merged_raw.get("noOfTime") or merged_raw.get("totalSubscription") or 0), 2)

                issue_size_raw = str(merged_raw.get("issueSize") or "0").replace(",", "")
                nums = re.findall(r"\d+(?:\.\d+)?", issue_size_raw)
                issue_size_num = float(nums[0]) if nums else 0
                if issue_size_num > 100000 and p_max > 0:
                    issue_size_cr = round((issue_size_num * p_max) / 10000000, 2)
                else:
                    issue_size_cr = round(issue_size_num, 2)

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

                total_sub = round(float(str(item.get("No_of_Times") or item.get("Total_Sub") or 0).replace(",", "") or 0), 2)
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

        if not ipo["drhp_url"]:
            for s_key, s_url in sebi_pdfs.items():
                if len(key) >= 6 and (key in s_key or s_key in key):
                    ipo["drhp_url"] = s_url
                    break

        ipo["gmp_price"] = matched_gmp if matched_gmp is not None else 0

        target_pdf = ipo.get("rhp_url") or ipo.get("drhp_url") or ""
        pdf_insights = extract_pdf_insights(target_pdf)
        short_about, blog_txt, pros_txt, cons_txt = generate_unique_analysis(ipo, pdf_insights)

        ipo["logo_url"] = (old_row.get("logo_url") if old_row and old_row.get("logo_url") else "") or fetch_company_logo(ipo["company_name"], pdf_insights.get("website", ""))
        ipo["company_about"] = short_about
        ipo["ai_blog_hindi"] = blog_txt
        ipo["pros_list"] = pros_txt
        ipo["cons_list"] = cons_txt
        ipo["updated_at"] = datetime.now(timezone.utc).isoformat()

        supabase.table("ipos").upsert(ipo, on_conflict="slug").execute()
        updated_count += 1

    for row in (existing_res.data or []):
        key = normalize_company_key(row["company_name"])
        matched_gmp = gmp_map.get(key)
        if matched_gmp is not None:
            row["gmp_price"] = matched_gmp

        target_pdf = row.get("rhp_url") or row.get("drhp_url") or ""
        pdf_insights = extract_pdf_insights(target_pdf)
        short_about, blog_txt, pros_txt, cons_txt = generate_unique_analysis(row, pdf_insights)

        patch = {
            "gmp_price": row.get("gmp_price") or 0,
            "logo_url": row.get("logo_url") or fetch_company_logo(row["company_name"], pdf_insights.get("website", "")),
            "company_about": short_about,
            "ai_blog_hindi": blog_txt,
            "pros_list": pros_txt,
            "cons_list": cons_txt,
            "status": determine_status(row.get("open_date"), row.get("close_date"), row.get("listing_date")),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        supabase.table("ipos").update(patch).eq("id", row["id"]).execute()
        updated_count += 1

    print(f"Sync + 700-Word Blog + Logo Complete! Updated: {updated_count}")


if __name__ == "__main__":
    sync_all()
