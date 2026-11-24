import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import IpoTabsClient from './IpoTabsClient';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const revalidate = 60;

function formatBoxDate(dateStr) {
  if (!dateStr) return 'Announced Soon';
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 'Announced Soon';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
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
      {
        application: 'Retail (Min)',
        lots: 1,
        shares: lotSize,
        amount: oneLotAmount,
      },
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
    {
      application: 'Retail (Min)',
      lots: 1,
      shares: lotSize,
      amount: oneLotAmount,
    },
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

  const hasDbQuotas =
    ipo.qib_quota != null || ipo.nii_quota != null || ipo.retail_quota != null;

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
      rows.push({ category: '  ↳ Small HNI (sNII ≤ ₹10L)', percent: `${Number(ipo.shni_quota).toFixed(2)}%`, isSub: true });
    }
    if (ipo.bhni_quota != null && Number(ipo.bhni_quota) > 0) {
      rows.push({ category: '  ↳ Big HNI (bNII > ₹10L)', percent: `${Number(ipo.bhni_quota).toFixed(2)}%`, isSub: true });
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
      { category: '  ↳ Small HNI (sNII ≤ ₹10L)', percent: '4.75%', isSub: true },
      { category: '  ↳ Big HNI (bNII > ₹10L)', percent: '9.50%', isSub: true },
      { category: 'Retail Shares Offered', percent: '33.25%' },
      { category: 'Total Shares Offered', percent: '100.00%', isTotal: true },
    ];
  }

  return [
    { category: 'QIB Shares Offered', percent: 'Not more than 50.00%' },
    { category: 'NII (HNI) Shares Offered', percent: 'Not less than 15.00%' },
    { category: '  ↳ Small HNI (sNII ≤ ₹10L)', percent: '5.00% (1/3rd of NII)', isSub: true },
    { category: '  ↳ Big HNI (bNII > ₹10L)', percent: '10.00% (2/3rd of NII)', isSub: true },
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
  const lotSizeRows = buildLotSizeRows(ipo.category, lotSize, maxPrice);
  const reservationRows = buildReservationRows(ipo);

  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    ipo.company_name || 'IPO'
  )}&background=0f766e&color=fff&size=200&bold=true`;
  const displayLogo = ipo.logo_url || fallbackAvatar;

  // 100-150 words crisp summary for the top box
  const introSummary =
    ipo.company_summary ||
    `${ipo.company_name} भारतीय शेयर बाजार के ${ipo.category || 'Mainboard'} सेगमेंट में अपना पब्लिक इश्यू लेकर आई है, जिसका प्राइस बैंड ₹${minPrice > 0 ? minPrice : 'TBA'} से ₹${maxPrice > 0 ? maxPrice : 'TBA'} प्रति शेयर तय किया गया है। यह इश्यू ${formatBoxDate(
      ipo.open_date
    )} को खुलेगा और ${formatBoxDate(
      ipo.close_date
    )} को बंद होगा। निवेशक निर्धारित लॉट साइज़ के अनुसार बोली लगा सकेंगे, जिसका अलॉटमेंट ${formatBoxDate(
      ipo.allotment_date
    )} और संभावित लिस्टिंग ${formatBoxDate(
      ipo.listing_date
    )} को निर्धारित है। कंपनी के व्यवसाय, वित्तीय स्थिति, सब्सक्रिप्शन और आवेदन प्रक्रिया से जुड़ी सभी मुख्य जानकारियाँ नीचे व्यवस्थित तालिकाओं और विवरण में दी गई हैं ताकि निवेशक आसानी से हर पहलू समझ सकें।`;

  const timetableRows = [
    { label: 'IPO Open Date', date: formatBoxDate(ipo.open_date) },
    { label: 'IPO Close Date', date: formatBoxDate(ipo.close_date) },
    { label: 'Allotment Date', date: formatBoxDate(ipo.allotment_date) },
    { label: 'Refund Initiation Date', date: formatBoxDate(ipo.refund_date) },
    { label: 'Credit of Shares to Demat', date: formatBoxDate(ipo.credit_date || ipo.listing_date) },
    { label: 'Listing Date', date: formatBoxDate(ipo.listing_date) },
  ];

  const ipoDetailRows = [
    { label: 'IPO Date', value: `${formatBoxDate(ipo.open_date)} to ${formatBoxDate(ipo.close_date)}` },
    { label: 'Listing Date', value: formatBoxDate(ipo.listing_date) },
    { label: 'Face Value', value: ipo.face_value ? `₹${ipo.face_value} per share` : '₹10 per share' },
    { label: 'Price Band', value: maxPrice > 0 ? `₹${minPrice} to ₹${maxPrice}` : 'Announced Soon' },
    { label: 'Lot Size', value: lotSize > 0 ? `${lotSize} Shares` : 'Announced Soon' },
    { label: 'Sale Type', value: ipo.sale_type || (Number(ipo.ofs_amount || 0) > 0 ? 'OFS' : 'Fresh Issue') },
    { label: 'Issue Type', value: ipo.issue_type || `${ipo.category || 'Mainboard'} IPO` },
    { label: 'Listing At', value: ipo.listing_at || 'BSE, NSE' },
  ];

  const issueSizeRows = [
    {
      label: 'Total Issue Size',
      value: ipo.total_issue_size || (maxPrice > 0 && lotSize > 0 ? `${lotSize.toLocaleString('en-IN')} Shares+` : 'Announced Soon'),
    },
    {
      label: 'Fresh Issue',
      value: ipo.fresh_issue_size || '—',
    },
    {
      label: 'Offer For Sale (OFS)',
      value: ipo.ofs_size || '—',
    },
    {
      label: 'Share Holding Pre Issue',
      value: ipo.pre_issue_holding || '—',
    },
    {
      label: 'Share Holding Post Issue',
      value: ipo.post_issue_holding || '—',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      {/* Breadcrumb */}
      <nav className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
        <a href="/" className="hover:text-teal-700 font-bold">
          ← Sabhi IPOs (Home)
        </a>
        <span>/</span>
        <span>{ipo.category || 'Mainboard'} IPO</span>
        <span>/</span>
        <span className="text-slate-800 font-semibold">{ipo.company_name}</span>
      </nav>

      {/* BOX 1: PHOTO + 100-150 WORD DETAIL + 4 IMPORTANT DATES */}
      <header className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl border border-slate-200 bg-white p-2 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
            <img
              src={displayLogo}
              alt={`${ipo.company_name} Photo / Logo`}
              className="w-full h-full object-contain"
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

        {/* 4 Important Dates inside Box 1 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-3 text-center">
            <span className="text-[11px] uppercase tracking-wide font-bold text-teal-800 block">
              IPO Open Date
            </span>
            <span className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5 block">
              {formatBoxDate(ipo.open_date)}
            </span>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-center">
            <span className="text-[11px] uppercase tracking-wide font-bold text-amber-800 block">
              IPO Close Date
            </span>
            <span className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5 block">
              {formatBoxDate(ipo.close_date)}
            </span>
          </div>

          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-center">
            <span className="text-[11px] uppercase tracking-wide font-bold text-blue-800 block">
              Allotment Date
            </span>
            <span className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5 block">
              {formatBoxDate(ipo.allotment_date)}
            </span>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-center">
            <span className="text-[11px] uppercase tracking-wide font-bold text-emerald-800 block">
              Listing Date
            </span>
            <span className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5 block">
              {formatBoxDate(ipo.listing_date)}
            </span>
          </div>
        </div>
      </header>

      {/* BOX 2: TWO SIDE-BY-SIDE TABLE BOXES (IPO Details | Issue Size & Shareholding) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Table: IPO Details */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-800 text-white px-4 py-3">
            <h2 className="text-sm sm:text-base font-bold">
              {ipo.company_name} IPO Details
            </h2>
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

        {/* Right Table: Issue Size & Shareholding */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-teal-800 text-white px-4 py-3">
            <h2 className="text-sm sm:text-base font-bold">
              Issue Size &amp; Shareholding
            </h2>
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
          <h2 className="text-sm sm:text-base font-bold">
            {ipo.company_name} IPO Timetable
          </h2>
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

      {/* BOX 4: TWO SIDE-BY-SIDE TABLE BOXES (Issue Reservation with sHNI & bHNI | IPO Lot Size) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Table: Issue Reservation */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-800 text-white px-4 py-3">
            <h2 className="text-sm sm:text-base font-bold">
              {ipo.company_name} IPO Reservation
            </h2>
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

        {/* Right Table: IPO Lot Size */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-teal-800 text-white px-4 py-3">
            <h2 className="text-sm sm:text-base font-bold">
              {ipo.company_name} IPO Lot Size
            </h2>
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

      {/* BOX 5 & BOX 6: DETAILS BLOG + COMPANY FINANCIALS (AND DEDICATED GMP / EXTRA TABS) */}
      <IpoTabsClient ipo={ipo} gmpHistory={gmpHistory} />
    </div>
  );
}
