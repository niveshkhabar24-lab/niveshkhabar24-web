import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import IpoPageClient from './IpoPageClient';

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

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const ipo = await getIPOBySlug(slug);
  if (!ipo) return { title: 'IPO Not Found | NiveshKhabar24' };

  const minP = Number(ipo.issue_price_min ?? ipo.price_min ?? 0);
  const maxP = Number(ipo.issue_price_max ?? ipo.price_max ?? 0);

  return {
    title:
      ipo.seo_title ||
      `${ipo.company_name} IPO Details, Dates, Lot Size & Reservation | NiveshKhabar24`,
    description:
      ipo.meta_description ||
      `${ipo.company_name} IPO details in Hindi: Issue price ₹${minP}-₹${maxP}, lot size, timetable, reservation quota aur company financials saral Hindi mein.`,
  };
}

export default async function IPODetailPage({ params }) {
  const { slug } = await params;
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

  return (
    <IpoPageClient
      ipo={ipo}
      gmpHistory={gmpHistory}
      displayLogo={displayLogo}
      introSummary={introSummary}
      dates={dates}
      ipoDetailRows={ipoDetailRows}
      issueSizeRows={issueSizeRows}
      timetableRows={timetableRows}
      reservationRows={reservationRows}
      lotSizeRows={lotSizeRows}
      registrarInfo={registrarInfo}
      contactInfo={contactInfo}
    />
  );
}
