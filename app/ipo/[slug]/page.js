import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import IpoTabsClient from './IpoTabsClient';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const revalidate = 60;

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

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const ipo = await getIPOBySlug(slug);
  if (!ipo) return { title: 'IPO Not Found | NiveshKhabar24' };

  const title =
    ipo.seo_title ||
    `${ipo.company_name} IPO GMP Today in Hindi | ${ipo.company_name} GMP in Hindi & Allotment Status`;
  const description =
    ipo.meta_description ||
    `${ipo.company_name} GMP in Hindi: Aaj ka ${ipo.company_name} IPO GMP ₹${ipo.gmp_price} hai. Jaanein issue price ₹${ipo.issue_price_min}-₹${ipo.issue_price_max}, lot size, live subscription aur allotment date saral Hindi mein.`;

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
  const ipo = await getIPOBySlug(slug);

  if (!ipo) notFound();

  const maxPrice = Number(ipo.issue_price_max) || 0;
  const gmp = Number(ipo.gmp_price) || 0;
  const estListing = maxPrice + gmp;
  const gainPercent = maxPrice > 0 ? ((gmp / maxPrice) * 100).toFixed(2) : '0.00';
  const oneLotProfit = gmp * (Number(ipo.lot_size) || 0);
  const minInvestment = maxPrice * (Number(ipo.lot_size) || 0);

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
      <nav className="text-xs text-slate-500 flex items-center gap-2">
        <a href="/" className="hover:text-emerald-600 font-bold">← Sabhi IPOs (Home)</a>
        <span>/</span>
        <span>{ipo.category} IPO</span>
        <span>/</span>
        <span className="text-slate-800 font-semibold">{ipo.company_name}</span>
      </nav>

      {/* Main Header Card */}
      <header className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">
            {ipo.status}
          </span>
          <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1 rounded-full">
            {ipo.category || 'Mainboard'} IPO
          </span>
          {ipo.has_shareholder_quota && (
            <span className="bg-purple-100 text-purple-800 text-xs font-bold px-3 py-1 rounded-full">
              Shareholder Quota ({ipo.parent_company})
            </span>
          )}
        </div>

        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-snug">
          {ipo.seo_title || `${ipo.company_name} IPO GMP Today in Hindi | ${ipo.company_name} GMP in Hindi`}
        </h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5">
            <span className="text-xs text-emerald-700 font-medium block">Aaj Ka Live GMP</span>
            <span className="text-xl font-extrabold text-emerald-700">
              {gmp > 0 ? `+₹${gmp}` : `₹${gmp}`}
            </span>
            <span className="text-[11px] text-emerald-600 block">({gainPercent}% Gain)</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <span className="text-xs text-slate-500 font-medium block">Est. Listing Price</span>
            <span className="text-xl font-extrabold text-slate-900">₹{estListing}</span>
            <span className="text-[11px] text-slate-500 block">1 Lot Profit: ₹{oneLotProfit.toLocaleString('en-IN')}</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <span className="text-xs text-slate-500 font-medium block">Issue Price Band</span>
            <span className="text-lg font-extrabold text-slate-900">
              ₹{ipo.issue_price_min} - ₹{ipo.issue_price_max}
            </span>
            <span className="text-[11px] text-slate-500 block">Lot Size: {ipo.lot_size} Shares</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <span className="text-xs text-slate-500 font-medium block">Total Subscription</span>
            <span className="text-xl font-extrabold text-blue-700">{ipo.total_sub || 0}x</span>
            <span className="text-[11px] text-slate-500 block">Min Invest: ₹{minInvestment.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </header>

      {/* Interactive 6-Tab Hub */}
      <IpoTabsClient ipo={ipo} />
    </div>
  );
}