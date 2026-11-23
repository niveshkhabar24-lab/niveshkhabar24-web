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

  const title =
    ipo.seo_title ||
    `${ipo.company_name} IPO GMP Today in Hindi | ${ipo.company_name} GMP in Hindi & Allotment Status`;
  const description =
    ipo.meta_description ||
    `${ipo.company_name} GMP in Hindi: Aaj ka ${ipo.company_name} IPO GMP ₹${ipo.gmp_price} hai. Jaanein issue price ₹${minP}-₹${maxP}, lot size, live subscription aur allotment date saral Hindi mein.`;

  return {
    title,
    description,
    keywords:
      ipo.focus_keywords ||
      `${ipo.company_name} gmp in hindi, ${ipo.company_name} ipo gmp in hindi, ${ipo.company_name} ipo gmp today, ${ipo.company_name} allotment status in hindi`,
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
  const gmp = Number(ipo.gmp_price) || 0;
  const issueSize = Number(ipo.issue_size_cr) || 0;
  const estListing = maxPrice + gmp;
  const gainPercent = maxPrice > 0 ? ((gmp / maxPrice) * 100).toFixed(2) : '0.00';
  const oneLotProfit = gmp * lotSize;
  const minInvestment = maxPrice * lotSize;
  const formattedTotalSub = Number(ipo.total_sub || 0).toFixed(2);

  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    ipo.company_name || 'IPO'
  )}&background=0f766e&color=fff&size=200&bold=true`;
  const displayLogo = ipo.logo_url || fallbackAvatar;

  const shortIntro =
    ipo.company_about ||
    `${ipo.company_name} भारतीय शेयर बाजार के ${ipo.category || 'Mainboard'} सेगमेंट में ₹${minPrice}-₹${maxPrice} प्रति शेयर के प्राइस बैंड पर अपना पब्लिक इश्यू लेकर आई है। यह इश्यू ${formatBoxDate(
      ipo.open_date
    )} से ${formatBoxDate(ipo.close_date)} तक निवेश के लिए खुला रहेगा।`;

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `${ipo.company_name} GMP in Hindi — Aaj ka live GMP kitna hai?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Aaj ${ipo.company_name} IPO ka live GMP ₹${gmp} prati share chal raha hai, jo issue price ₹${maxPrice} par lagbhag ${gainPercent}% ka listing gain dikha raha hai.`,
        },
      },
      {
        '@type': 'Question',
        name: `${ipo.company_name} IPO ki estimated listing price kya ho sakti hai?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Issue price ₹${maxPrice} aur aaj ke GMP ₹${gmp} ke hisaab se ${ipo.company_name} IPO ki estimated listing price ₹${estListing} ke aas-paas rehne ka anuman hai.`,
        },
      },
    ],
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

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

      {/* Main Header Card */}
      <header className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border border-slate-200 bg-white p-2 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
            <img
              src={displayLogo}
              alt={`${ipo.company_name} Logo`}
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
              {issueSize > 0 && (
                <span className="bg-teal-50 text-teal-800 border border-teal-200 text-xs font-semibold px-3 py-0.5 rounded-full">
                  Issue Size: ₹{issueSize.toLocaleString('en-IN')} Cr
                </span>
              )}
              {ipo.has_shareholder_quota && (
                <span className="bg-purple-100 text-purple-800 text-xs font-bold px-3 py-0.5 rounded-full">
                  Shareholder Quota ({ipo.parent_company})
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 leading-snug">
              {ipo.seo_title ||
                `${ipo.company_name} IPO GMP Today in Hindi | ${ipo.company_name} GMP & Allotment`}
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{shortIntro}</p>
          </div>
        </div>

        {/* Unified 2x4 Grid (All 8 Boxes Left-Aligned in Exact Same Vertical Columns) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
          {/* Row 1: Four Dates */}
          <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-3.5 text-left">
            <span className="text-xs font-semibold text-teal-800 block">IPO Open Date</span>
            <span className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5 block">
              {formatBoxDate(ipo.open_date)}
            </span>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 text-left">
            <span className="text-xs font-semibold text-amber-800 block">IPO Close Date</span>
            <span className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5 block">
              {formatBoxDate(ipo.close_date)}
            </span>
          </div>

          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 text-left">
            <span className="text-xs font-semibold text-blue-800 block">Allotment Date</span>
            <span className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5 block">
              {formatBoxDate(ipo.allotment_date)}
            </span>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 text-left">
            <span className="text-xs font-semibold text-emerald-800 block">Listing Date</span>
            <span className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5 block">
              {formatBoxDate(ipo.listing_date)}
            </span>
          </div>

          {/* Row 2: Four Live Metrics */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-left">
            <span className="text-xs text-emerald-700 font-medium block">Aaj Ka Live GMP</span>
            <span className="text-xl font-extrabold text-emerald-700">
              {gmp > 0 ? `+₹${gmp}` : `₹${gmp}`}
            </span>
            <span className="text-[11px] text-emerald-600 block">({gainPercent}% Gain)</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-left">
            <span className="text-xs text-slate-500 font-medium block">Est. Listing Price</span>
            <span className="text-xl font-extrabold text-slate-900">₹{estListing}</span>
            <span className="text-[11px] text-slate-500 block">
              1 Lot Profit: {lotSize > 0 ? `₹${oneLotProfit.toLocaleString('en-IN')}` : 'TBA'}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-left">
            <span className="text-xs text-slate-500 font-medium block">Issue Price Band</span>
            <span className="text-lg font-extrabold text-slate-900">
              {maxPrice > 0 ? `₹${minPrice} - ₹${maxPrice}` : 'Announced Soon'}
            </span>
            <span className="text-[11px] text-slate-500 block">
              Lot Size: {lotSize > 0 ? `${lotSize} Shares` : 'TBA'}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-left">
            <span className="text-xs text-slate-500 font-medium block">Total Subscription</span>
            <span className="text-xl font-extrabold text-blue-700">{formattedTotalSub}x</span>
            <span className="text-[11px] text-slate-500 block">
              Min Invest: {minInvestment > 0 ? `₹${minInvestment.toLocaleString('en-IN')}` : 'TBA'}
            </span>
          </div>
        </div>
      </header>

      {/* Interactive 7-Tab Hub & 700-Word Clean Hindi Blog */}
      <IpoTabsClient ipo={ipo} gmpHistory={gmpHistory} />
    </div>
  );
}import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const revalidate = 60;

function formatShortDate(dateStr) {
  if (!dateStr) return 'TBA';
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 'TBA';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]}`;
}

async function getAllIPOs() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('ipos')
    .select('*')
    .order('open_date', { ascending: false });

  if (error || !data) return [];
  return data;
}

export const metadata = {
  title: 'NiveshKhabar24 — Live IPO GMP Today in Hindi, Subscription & Allotment Status',
  description:
    'Aaj ka Live IPO GMP, Mainboard aur SME IPO ki dates, lot size, subscription status aur allotment jankari saral Hindi mein.',
};

export default async function HomePage() {
  const ipos = await getAllIPOs();

  const statusBadge = (status) => {
    const s = (status || 'Open').toLowerCase();
    if (s === 'open') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (s === 'upcoming') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (s === 'listed') return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Hero Banner */}
      <section className="bg-gradient-to-r from-teal-800 to-emerald-700 text-white rounded-2xl p-6 sm:p-8 shadow-sm space-y-2">
        <span className="inline-block bg-white/15 text-xs font-bold px-3 py-1 rounded-full">
          LIVE IPO GMP &amp; ALLOTMENT TRACKER (हिंदी में)
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold leading-snug">
          NiveshKhabar24 — आज का लाइव IPO GMP, सब्सक्रिप्शन और अलॉटमेंट स्टेटस
        </h1>
        <p className="text-xs sm:text-sm text-teal-100 max-w-3xl">
          Mainboard और SME IPO के ताज़ा ग्रे मार्केट प्रीमियम (GMP), लॉट साइज़, संभावित लिस्टिंग मुनाफ़ा और DRHP विश्लेषण सरल हिंदी में।
        </p>
      </section>

      {/* IPO Table / Cards */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
            📊 Live Mainboard &amp; SME IPO List ({ipos.length})
          </h2>
          <span className="text-xs text-slate-500">Auto-updated via NSE, BSE &amp; Market Sources</span>
        </div>

        {ipos.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-600">
            IPO डेटा लोड हो रहा है... कृपया थोड़ी देर में रीफ़्रेश करें।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                  <th className="py-3 px-4 font-bold">Company Name</th>
                  <th className="py-3 px-3 font-bold">Status</th>
                  <th className="py-3 px-3 font-bold">Open - Close</th>
                  <th className="py-3 px-3 font-bold">Price Band</th>
                  <th className="py-3 px-3 font-bold">Live GMP</th>
                  <th className="py-3 px-3 font-bold">Est. Listing</th>
                  <th className="py-3 px-3 font-bold">Lot Size</th>
                  <th className="py-3 px-3 font-bold">Sub</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {ipos.map((ipo) => {
                  const minP = Number(ipo.issue_price_min ?? 0);
                  const maxP = Number(ipo.issue_price_max ?? 0);
                  const gmp = Number(ipo.gmp_price ?? 0);
                  const lot = Number(ipo.lot_size ?? 0);
                  const est = maxP + gmp;
                  const pct = maxP > 0 ? ((gmp / maxP) * 100).toFixed(1) : '0.0';

                  return (
                    <tr key={ipo.slug} className="hover:bg-teal-50/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <a
                          href={`/ipo/${ipo.slug}`}
                          className="font-bold text-slate-900 hover:text-teal-700 block"
                        >
                          {ipo.company_name}
                        </a>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {ipo.category || 'Mainboard'} IPO
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusBadge(
                            ipo.status
                          )}`}
                        >
                          {ipo.status || 'Open'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-700 whitespace-nowrap">
                        {formatShortDate(ipo.open_date)} – {formatShortDate(ipo.close_date)}
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                        {maxP > 0 ? `₹${minP} - ₹${maxP}` : 'TBA'}
                      </td>
                      <td className="py-3.5 px-3 font-extrabold text-emerald-700 whitespace-nowrap">
                        {gmp > 0 ? `+₹${gmp}` : `₹${gmp}`}
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                        {maxP > 0 ? `₹${est} (${pct}%)` : '—'}
                      </td>
                      <td className="py-3.5 px-3 text-slate-700 whitespace-nowrap">
                        {lot > 0 ? `${lot} Shares` : 'TBA'}
                      </td>
                      <td className="py-3.5 px-3 font-bold text-blue-700 whitespace-nowrap">
                        {Number(ipo.total_sub || 0).toFixed(2)}x
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
