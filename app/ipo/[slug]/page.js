import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import IpoTabsClient from './IpoTabsClient';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const revalidate = 60;

function parseDateSafe(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function addDays(dateObj, days) {
  const copy = new Date(dateObj.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatDateObj(d) {
  if (!d || Number.isNaN(d.getTime())) return 'Announced Soon';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function getSmartTimetableDates(ipo) {
  const openD = parseDateSafe(ipo.open_date);
  const closeD = parseDateSafe(ipo.close_date);
  const allotmentD = parseDateSafe(ipo.allotment_date) || (closeD ? addDays(closeD, 1) : null);
  const refundD = parseDateSafe(ipo.refund_date) || (allotmentD ? addDays(allotmentD, 1) : null);
  const creditD = parseDateSafe(ipo.credit_date) || (allotmentD ? addDays(allotmentD, 1) : null);
  const listingD = parseDateSafe(ipo.listing_date) || (allotmentD ? addDays(allotmentD, 2) : null);

  return {
    openStr: openD ? formatDateObj(openD) : 'Announced Soon',
    closeStr: closeD ? formatDateObj(closeD) : 'Announced Soon',
    allotmentStr: allotmentD ? formatDateObj(allotmentD) : 'Announced Soon',
    refundStr: refundD ? formatDateObj(refundD) : 'Announced Soon',
    creditStr: creditD ? formatDateObj(creditD) : 'Announced Soon',
    listingStr: listingD ? formatDateObj(listingD) : 'Announced Soon',
  };
}

function buildIpoPhotoDataUri(companyName, category) {
  const cleanName = String(companyName || 'IPO')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const words = String(companyName || 'IPO').trim().split(/\s+/);
  const initials =
    words.length >= 2
      ? `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase()
      : String(companyName || 'IPO').slice(0, 2).toUpperCase();
  const tag = String(category || 'IPO').toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0f766e"/>
        <stop offset="100%" stop-color="#1e293b"/>
      </linearGradient>
    </defs>
    <rect width="240" height="240" rx="24" fill="url(#bg)"/>
    <circle cx="120" cy="96" r="46" fill="#ffffff" fill-opacity="0.16"/>
    <text x="120" y="111" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="40" font-weight="800">${initials}</text>
    <rect x="64" y="156" width="112" height="26" rx="13" fill="#10b981"/>
    <text x="120" y="173" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="12" font-weight="700">${tag}</text>
    <text x="120" y="212" text-anchor="middle" fill="#e2e8f0" font-family="Arial, sans-serif" font-size="12" font-weight="600">${cleanName.slice(0, 24)}</text>
  </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildLotSizeRows(category, lotSize, maxPrice) {
  if (!lotSize || lotSize <= 0 || !maxPrice || maxPrice <= 0) {
    return [];
  }

  const oneLotAmount = lotSize * maxPrice;
  const isSME = String(category || '').toLowerCase().includes('sme');

  if (isSME) {
    const hniMinLots = oneLotAmount > 200000 ? 1 : 2;
    return [
      { application: 'Retail (Min)', lots: 1, shares: lotSize, amount: oneLotAmount },
      {
        application: 'HNI / NII (Min)',
        lots: hniMinLots,
        shares: hniMinLots * lotSize,
        amount: hniMinLots * oneLotAmount,
      },
    ];
  }

  const retailMaxLots = Math.max(1, Math.floor(200000 / oneLotAmount));
  const sHniMinLots = retailMaxLots + 1;
  const sHniMaxLots = Math.max(sHniMinLots, Math.floor(1000000 / oneLotAmount));
  const bHniMinLots = sHniMaxLots + 1;

  return [
    { application: 'Retail (Min)', lots: 1, shares: lotSize, amount: oneLotAmount },
    {
      application: 'Retail (Max)',
      lots: retailMaxLots,
      shares: retailMaxLots * lotSize,
      amount: retailMaxLots * oneLotAmount,
    },
    {
      application: 'S-HNI (Min)',
      lots: sHniMinLots,
      shares: sHniMinLots * lotSize,
      amount: sHniMinLots * oneLotAmount,
    },
    {
      application: 'S-HNI (Max)',
      lots: sHniMaxLots,
      shares: sHniMaxLots * lotSize,
      amount: sHniMaxLots * oneLotAmount,
    },
    {
      application: 'B-HNI (Min)',
      lots: bHniMinLots,
      shares: bHniMinLots * lotSize,
      amount: bHniMinLots * oneLotAmount,
    },
  ];
}

function buildReservationRows(ipo) {
  const isSME = String(ipo.category || '').toLowerCase().includes('sme');
  const hasDbQuotas = ipo.qib_quota != null || ipo.nii_quota != null || ipo.retail_quota != null;

  if (hasDbQuotas) {
    const rows = [];
    if (ipo.market_maker_quota != null && Number(ipo.market_maker_quota) > 0) {
      rows.push({ category: 'Market Maker', percent: `${Number(ipo.market_maker_quota).toFixed(2)}%` });
    }
    if (ipo.qib_quota != null) {
      rows.push({ category: 'QIB Shares Offered', percent: `${Number(ipo.qib_quota).toFixed(2)}%` });
    }
    if (ipo.nii_quota != null) {
      rows.push({ category: 'NII (HNI) Shares Offered', percent: `${Number(ipo.nii_quota).toFixed(2)}%` });
    }
    if (ipo.shni_quota != null && Number(ipo.shni_quota) > 0) {
      rows.push({ category: 'Small HNI (sNII ≤ ₹10L)', percent: `${Number(ipo.shni_quota).toFixed(2)}%`, isSub: true });
    }
    if (ipo.bhni_quota != null && Number(ipo.bhni_quota) > 0) {
      rows.push({ category: 'Big HNI (bNII > ₹10L)', percent: `${Number(ipo.bhni_quota).toFixed(2)}%`, isSub: true });
    }
    if (ipo.retail_quota != null) {
      rows.push({ category: 'Retail Shares Offered', percent: `${Number(ipo.retail_quota).toFixed(2)}%` });
    }
    if (ipo.employee_quota != null && Number(ipo.employee_quota) > 0) {
      rows.push({ category: 'Employee Quota', percent: `${Number(ipo.employee_quota).toFixed(2)}%` });
    }
    if (ipo.shareholder_quota != null && Number(ipo.shareholder_quota) > 0) {
      rows.push({ category: 'Shareholder Quota', percent: `${Number(ipo.shareholder_quota).toFixed(2)}%` });
    }
    rows.push({ category: 'Total Shares Offered', percent: '100.00%', isTotal: true });
    return rows;
  }

  if (isSME) {
    return [
      { category: 'Market Maker Shares', percent: '5.00%' },
      { category: 'QIB Shares Offered', percent: '47.50%' },
      { category: 'NII (HNI) Shares Offered', percent: '14.25%' },
      { category: 'Small HNI (sNII ≤ ₹10L)', percent: '4.75%', isSub: true },
      { category: 'Big HNI (bNII > ₹10L)', percent: '9.50%', isSub: true },
      { category: 'Retail Shares Offered', percent: '33.25%' },
      { category: 'Total Shares Offered', percent: '100.00%', isTotal: true },
    ];
  }

  return [
    { category: 'QIB Shares Offered', percent: 'Not more than 50.00%' },
    { category: 'NII (HNI) Shares Offered', percent: 'Not less than 15.00%' },
    { category: 'Small HNI (sNII ≤ ₹10L)', percent: '5.00% (1/3rd of NII)', isSub: true },
    { category: 'Big HNI (bNII > ₹10L)', percent: '10.00% (2/3rd of NII)', isSub: true },
    { category: 'Retail Shares Offered', percent: 'Not less than 35.00%' },
    { category: 'Total Shares Offered', percent: '100.00%', isTotal: true },
  ];
}

async function getIPOBySlug(slug) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('ipos')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) return null;
  return data;
}

async function getGmpHistory(slug) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('ipo_gmp_history')
    .select('*')
    .eq('ipo_slug', slug)
    .order('gmp_date', { ascending: false });

  if (error || !data) return [];
  return data;
}

export async function generateMetadata({ params, searchParams }) {
  const { slug } = await params;
  const sp = (await searchParams) || {};
  const activeTab = sp.tab || '';

  const ipo = await getIPOBySlug(slug);
  if (!ipo) return { title: 'IPO Not Found | NiveshKhabar24' };

  const minP = Number(ipo.issue_price_min ?? ipo.price_min ?? 0);
  const maxP = Number(ipo.issue_price_max ?? ipo.price_max ?? 0);

  const tabSuffix =
    activeTab === 'gmp'
      ? ' — GMP'
      : activeTab === 'subscription'
      ? ' — Subscription'
      : activeTab === 'allotment'
      ? ' — Allotment Status'
      : '';

  return {
    title: `${ipo.company_name} IPO${tabSuffix} | NiveshKhabar24`,
    description:
      ipo.meta_description ||
      `${ipo.company_name} IPO details in Hindi: Issue price ₹${minP}-₹${maxP}, lot size, timetable, reservation quota aur company financials saral Hindi mein.`,
  };
}

export default async function IPODetailPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = (await searchParams) || {};
  const activeTabParam = ['gmp', 'subscription', 'allotment'].includes(sp.tab) ? sp.tab : null;

  const [ipo, gmpHistory] = await Promise.all([
    getIPOBySlug(slug),
    getGmpHistory(slug),
  ]);

  if (!ipo) notFound();

  const minPrice = Number(ipo.issue_price_min ?? ipo.price_min ?? 0);
  const maxPrice = Number(ipo.issue_price_max ?? ipo.price_max ?? 0);
  const lotSize = Number(ipo.lot_size) || 0;
  const dates = getSmartTimetableDates(ipo);
  const lotSizeRows = buildLotSizeRows(ipo.category, lotSize, maxPrice);
  const reservationRows = buildReservationRows(ipo);

  const generatedPhotoSrc = buildIpoPhotoDataUri(ipo.company_name, ipo.category);
  const displayLogo =
    ipo.logo_url && String(ipo.logo_url).startsWith('http')
      ? ipo.logo_url
      : generatedPhotoSrc;

  const introSummary =
    ipo.company_summary ||
    `${ipo.company_name} भारतीय शेयर बाजार के ${ipo.category || 'Mainboard'} सेगमेंट में अपना पब्लिक इश्यू लेकर आई है, जिसका प्राइस बैंड ₹${minPrice > 0 ? minPrice : 'TBA'} से ₹${maxPrice > 0 ? maxPrice : 'TBA'} प्रति शेयर तय किया गया है। यह इश्यू ${dates.openStr} को खुलेगा और ${dates.closeStr} को बंद होगा। निवेशक निर्धारित लॉट साइज़ के अनुसार बोली लगा सकेंगे, जिसका अलॉटमेंट ${dates.allotmentStr} और संभावित लिस्टिंग ${dates.listingStr} को निर्धारित है। कंपनी के व्यवसाय, वित्तीय स्थिति, सब्सक्रिप्शन और आवेदन प्रक्रिया से जुड़ी सभी मुख्य जानकारियाँ नीचे व्यवस्थित तालिकाओं और विवरण में दी गई हैं ताकि निवेशक आसानी से हर पहलू समझ सकें।`;

  const issueSizeValue =
    ipo.total_issue_size ||
    (maxPrice > 0 && lotSize > 0
      ? `Min 1 Lot (${lotSize} Shares = ₹${(maxPrice * lotSize).toLocaleString('en-IN')})`
      : 'Updating from Exchange');

  const timetableRows = [
    { label: 'IPO Open Date', date: dates.openStr },
    { label: 'IPO Close Date', date: dates.closeStr },
    { label: 'Allotment Date', date: dates.allotmentStr },
    { label: 'Refund Initiation Date', date: dates.refundStr },
    { label: 'Credit of Shares to Demat', date: dates.creditStr },
    { label: 'Listing Date', date: dates.listingStr },
  ];

  const ipoDetailRows = [
    { label: 'IPO Date', value: `${dates.openStr} to ${dates.closeStr}` },
    { label: 'Listing Date', value: dates.listingStr },
    { label: 'Face Value', value: ipo.face_value ? `₹${ipo.face_value} per share` : '₹10 per share' },
    { label: 'Price Band', value: maxPrice > 0 ? `₹${minPrice} to ₹${maxPrice}` : 'Announced Soon' },
    { label: 'Lot Size', value: lotSize > 0 ? `${lotSize} Shares` : 'Announced Soon' },
    { label: 'Sale Type', value: ipo.sale_type || (Number(ipo.ofs_amount || 0) > 0 ? 'OFS' : 'Fresh Issue') },
    { label: 'Issue Type', value: ipo.issue_type || `${ipo.category || 'Mainboard'} IPO` },
    { label: 'Listing At', value: ipo.listing_at || 'BSE, NSE' },
  ];

  const issueSizeRows = [
    { label: 'Total Issue Size', value: issueSizeValue },
    { label: 'Offer For Sale (OFS)', value: ipo.ofs_size || 'As per RHP' },
    { label: 'Share Holding Pre Issue', value: ipo.pre_issue_holding || 'As per RHP' },
    { label: 'Share Holding Post Issue', value: ipo.post_issue_holding || 'As per RHP' },
  ];

  const registrarInfo = {
    name: ipo.registrar_name || 'As per RHP / Exchange Filing',
    phone: ipo.registrar_phone || 'Check Registrar Portal',
    email: ipo.registrar_email || 'Check Registrar Portal',
    website: ipo.registrar_website || 'https://www.sebi.gov.in',
  };

  const contactInfo = {
    company: ipo.company_name,
    address: ipo.company_address || 'Registered Office (As per NSE/BSE Filing)',
    phone: ipo.company_phone || 'As per Exchange Filing',
    email: ipo.company_email || 'As per Exchange Filing',
    website: ipo.company_website || '',
  };

  const pdfUrl =
    ipo.rhp_url ||
    ipo.drhp_url ||
    'https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=3&ssid=15&smid=10';

  const basePath = `/ipo/${ipo.slug}`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-5 space-y-5">
      {/* TOP BAR WITH 4 SIMPLE LINKS (GMP, Subscription, DRHP/RHP PDF Download, Allotment Status) */}
      <div className="bg-white rounded-xl border border-slate-200 px-3 py-2.5 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <a href="/" className="text-xs sm:text-sm font-extrabold text-teal-800 hover:underline">
          ← Sabhi IPOs
        </a>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold">
          <a
            href={`${basePath}?tab=gmp`}
            className={`px-3 py-1.5 rounded-lg ${
              activeTabParam === 'gmp'
                ? 'bg-teal-700 text-white'
                : 'bg-slate-100 text-slate-800 hover:bg-teal-50 hover:text-teal-800'
            }`}
          >
            GMP
          </a>

          <a
            href={`${basePath}?tab=subscription`}
            className={`px-3 py-1.5 rounded-lg ${
              activeTabParam === 'subscription'
                ? 'bg-teal-700 text-white'
                : 'bg-slate-100 text-slate-800 hover:bg-teal-50 hover:text-teal-800'
            }`}
          >
            Subscription
          </a>

          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={`${ipo.slug}-drhp-rhp.pdf`}
            className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800"
          >
            DRHP / RHP PDF ⬇
          </a>

          <a
            href={`${basePath}?tab=allotment`}
            className={`px-3 py-1.5 rounded-lg ${
              activeTabParam === 'allotment'
                ? 'bg-teal-700 text-white'
                : 'bg-slate-100 text-slate-800 hover:bg-teal-50 hover:text-teal-800'
            }`}
          >
            Allotment Status
          </a>
        </div>
      </div>

      {/* BOX 1: PHOTO + 100-150 WORD DETAIL + 4 IMPORTANT DATES */}
      <header className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
            <img
              src={displayLogo}
              alt={`${ipo.company_name} IPO Photo`}
              className="w-full h-full object-cover rounded-xl"
            />
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-0.5 rounded-full">
                {ipo.status || 'Open'}
              </span>
              <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-0.5 rounded-full">
                {ipo.category || 'Mainboard'} IPO
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 leading-snug">
              {ipo.company_name} IPO Details
            </h1>

            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{introSummary}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-3 text-center">
            <span className="text-[11px] uppercase tracking-wide font-bold text-teal-800 block">
              IPO Open Date
            </span>
            <span className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5 block">
              {dates.openStr}
            </span>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-center">
            <span className="text-[11px] uppercase tracking-wide font-bold text-amber-800 block">
              IPO Close Date
            </span>
            <span className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5 block">
              {dates.closeStr}
            </span>
          </div>

          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-center">
            <span className="text-[11px] uppercase tracking-wide font-bold text-blue-800 block">
              Allotment Date
            </span>
            <span className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5 block">
              {dates.allotmentStr}
            </span>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-center">
            <span className="text-[11px] uppercase tracking-wide font-bold text-emerald-800 block">
              Listing Date
            </span>
            <span className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5 block">
              {dates.listingStr}
            </span>
          </div>
        </div>
      </header>

      {/* BOX 2: TWO SIDE-BY-SIDE TABLE BOXES (IPO Details | Issue Size & Shareholding) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-800 text-white px-4 py-3">
            <h2 className="text-sm sm:text-base font-bold">{ipo.company_name} IPO Details</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left border-collapse">
              <tbody className="divide-y divide-slate-200">
                {ipoDetailRows.map((item) => (
                  <tr key={item.label} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-semibold text-slate-700 w-2/5">{item.label}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 text-right">{item.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-teal-800 text-white px-4 py-3">
            <h2 className="text-sm sm:text-base font-bold">Issue Size &amp; Shareholding</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left border-collapse">
              <tbody className="divide-y divide-slate-200">
                {issueSizeRows.map((item) => (
                  <tr key={item.label} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-semibold text-slate-700 w-1/2">{item.label}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 text-right">{item.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* BOX 3: POORA IPO TIMETABLE */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-800 text-white px-4 py-3">
          <h2 className="text-sm sm:text-base font-bold">{ipo.company_name} IPO Timetable</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                <th className="py-2.5 px-4 font-bold">Event / Milestone</th>
                <th className="py-2.5 px-4 font-bold text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {timetableRows.map((row) => (
                <tr key={row.label} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-semibold text-slate-800">{row.label}</td>
                  <td className="py-2.5 px-4 font-bold text-slate-900 text-right">{row.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* BOX 4: TWO SIDE-BY-SIDE TABLE BOXES (Issue Reservation | IPO Lot Size) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-800 text-white px-4 py-3">
            <h2 className="text-sm sm:text-base font-bold">{ipo.company_name} IPO Reservation</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <th className="py-2.5 px-4 font-bold">Investor Category</th>
                  <th className="py-2.5 px-4 font-bold text-right">Allocation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {reservationRows.map((row) => (
                  <tr
                    key={row.category}
                    className={
                      row.isTotal
                        ? 'bg-slate-100 font-bold'
                        : row.isSub
                        ? 'bg-slate-50/50 text-slate-600'
                        : 'hover:bg-slate-50'
                    }
                  >
                    <td className={`py-2.5 px-4 ${row.isSub ? 'pl-7 text-xs' : 'font-semibold text-slate-800'}`}>
                      {row.category}
                    </td>
                    <td className={`py-2.5 px-4 text-right ${row.isSub ? 'text-xs font-medium' : 'font-bold text-slate-900'}`}>
                      {row.percent}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-teal-800 text-white px-4 py-3">
            <h2 className="text-sm sm:text-base font-bold">{ipo.company_name} IPO Lot Size</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <th className="py-2.5 px-3 font-bold">Application</th>
                  <th className="py-2.5 px-3 font-bold text-center">Lots</th>
                  <th className="py-2.5 px-3 font-bold text-center">Shares</th>
                  <th className="py-2.5 px-3 font-bold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {lotSizeRows.length > 0 ? (
                  lotSizeRows.map((row) => (
                    <tr key={row.application} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{row.application}</td>
                      <td className="py-2.5 px-3 text-center text-slate-700">{row.lots}</td>
                      <td className="py-2.5 px-3 text-center text-slate-700">
                        {row.shares.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        ₹{row.amount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 px-4 text-center text-slate-500 text-xs">
                      Price band &amp; lot size details will be updated soon.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* BOX 5 & BOX 6: DETAILS BLOG + COMPANY FINANCIALS (OR SELECTED QUERY TAB VIEW) */}
      <IpoTabsClient
        ipo={ipo}
        gmpHistory={gmpHistory}
        activeTabParam={activeTabParam}
        basePath={basePath}
      />

      {/* BOTTOM 2 BOXES: REGISTRAR DETAIL & COMPANY CONTACT DETAIL (BSE / NSE) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-800 text-white px-4 py-3">
            <h2 className="text-sm sm:text-base font-bold">IPO Registrar Details</h2>
          </div>
          <div className="p-4 space-y-2 text-xs sm:text-sm text-slate-700">
            <p><strong className="text-slate-900">Registrar:</strong> {registrarInfo.name}</p>
            <p><strong className="text-slate-900">Phone:</strong> {registrarInfo.phone}</p>
            <p><strong className="text-slate-900">Email:</strong> {registrarInfo.email}</p>
            <p>
              <strong className="text-slate-900">Website:</strong>{' '}
              <a
                href={registrarInfo.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-700 font-semibold hover:underline"
              >
                {registrarInfo.website}
              </a>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-teal-800 text-white px-4 py-3">
            <h2 className="text-sm sm:text-base font-bold">Company Contact Details (BSE / NSE)</h2>
          </div>
          <div className="p-4 space-y-2 text-xs sm:text-sm text-slate-700">
            <p><strong className="text-slate-900">Company:</strong> {contactInfo.company}</p>
            <p><strong className="text-slate-900">Address:</strong> {contactInfo.address}</p>
            <p><strong className="text-slate-900">Phone:</strong> {contactInfo.phone}</p>
            <p><strong className="text-slate-900">Email:</strong> {contactInfo.email}</p>
            {contactInfo.website && (
              <p>
                <strong className="text-slate-900">Website:</strong>{' '}
                <a
                  href={contactInfo.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-700 font-semibold hover:underline"
                >
                  {contactInfo.website}
                </a>
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
