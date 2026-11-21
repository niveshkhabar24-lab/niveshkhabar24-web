import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const revalidate = 60; // Har 60 second mein fresh data

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
  if (!ipo) {
    return { title: 'IPO Not Found | NiveshKhabar24' };
  }

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
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: ipo.created_at,
      modifiedTime: ipo.updated_at,
      images: ipo.image_url ? [{ url: ipo.image_url, width: 1200, height: 675 }] : [],
    },
  };
}

export default async function IPODetailPage({ params }) {
  const { slug } = await params;
  const ipo = await getIPOBySlug(slug);

  if (!ipo) {
    notFound();
  }

  const maxPrice = Number(ipo.issue_price_max) || 0;
  const gmp = Number(ipo.gmp_price) || 0;
  const estListing = maxPrice + gmp;
  const gainPercent = maxPrice > 0 ? ((gmp / maxPrice) * 100).toFixed(2) : '0.00';
  const oneLotProfit = gmp * (Number(ipo.lot_size) || 0);
  const minInvestment = maxPrice * (Number(ipo.lot_size) || 0);

  // Google Discover & NewsArticle JSON-LD Schema
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: ipo.seo_title || `${ipo.company_name} IPO GMP Today in Hindi`,
    datePublished: ipo.created_at,
    dateModified: ipo.updated_at,
    author: {
      '@type': 'Organization',
      name: 'NiveshKhabar24',
    },
  };

  // Google Search Rich Snippets ke liye FAQ Schema ("GMP in Hindi" targeting)
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `${ipo.company_name} GMP in Hindi — Aaj ka live GMP kitna hai?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Aaj ${ipo.company_name} IPO ka live GMP (Grey Market Premium) ₹${gmp} prati share chal raha hai, jo issue price ₹${maxPrice} par lagbhag ${gainPercent}% ka listing gain dikha raha hai.`,
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
      {
        '@type': 'Question',
        name: `${ipo.company_name} IPO ka allotment status kaise check karein?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${ipo.company_name} IPO ka allotment ${ipo.allotment_date || 'closing ke baad'} ko official registrar ${ipo.registrar_name || 'BSE/NSE'} ki website par PAN card number daal kar check kiya ja sakta hai.`,
        },
      },
    ],
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Breadcrumb */}
      <nav className="text-xs text-slate-500 flex items-center gap-2">
        <a href="/" className="hover:text-emerald-600 font-medium">Home</a>
        <span>/</span>
        <a href="/#live-ipo-table" className="hover:text-emerald-600 font-medium">IPO GMP in Hindi</a>
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
              Shareholder Quota Available ({ipo.parent_company})
            </span>
          )}
        </div>

        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-snug">
          {ipo.seo_title || `${ipo.company_name} IPO GMP Today in Hindi | ${ipo.company_name} GMP in Hindi & Listing Gain`}
        </h1>

        <p className="text-xs text-slate-500">
          Last Updated: {new Date(ipo.updated_at).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })} • By NiveshKhabar24 Desk
        </p>

        {/* 4 Highlight Boxes */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
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

      {/* IPO Dates & Key Details Table */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900">
          {ipo.company_name} IPO Dates &amp; Important Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">IPO Open Date</span>
            <span className="font-semibold text-slate-900">{ipo.open_date || 'Announced Soon'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">IPO Close Date</span>
            <span className="font-semibold text-slate-900">{ipo.close_date || 'Announced Soon'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Allotment Date</span>
            <span className="font-semibold text-slate-900">{ipo.allotment_date || 'Announced Soon'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Listing Date</span>
            <span className="font-semibold text-slate-900">{ipo.listing_date || 'Announced Soon'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Total Issue Size</span>
            <span className="font-semibold text-slate-900">₹{ipo.issue_size_cr} Crore</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Official Registrar</span>
            <span className="font-semibold text-slate-900">{ipo.registrar_name || 'N/A'}</span>
          </div>
        </div>
      </section>

      {/* Live Subscription Breakdown */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900">
          Live Subscription Status (Category-Wise)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 block">QIB (Qualified)</span>
            <span className="text-lg font-bold text-slate-900">{ipo.qib_sub || 0}x</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 block">NII / HNI</span>
            <span className="text-lg font-bold text-slate-900">{ipo.nii_sub || 0}x</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 block">Retail Investor</span>
            <span className="text-lg font-bold text-slate-900">{ipo.retail_sub || 0}x</span>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
            <span className="text-xs text-blue-700 font-medium block">Total Subscribed</span>
            <span className="text-lg font-extrabold text-blue-800">{ipo.total_sub || 0}x</span>
          </div>
        </div>
      </section>

      {/* Full Hinglish Review / Auto-Generated Smart Summary */}
      <article className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 leading-relaxed text-slate-800">
        <h2 className="text-xl font-bold text-slate-900">
          {ipo.company_name} GMP in Hindi &amp; IPO Review — Apply Karein Ya Nahi?
        </h2>

        {ipo.hinglish_review ? (
          <div className="whitespace-pre-line text-sm md:text-base space-y-4">
            {ipo.hinglish_review}
          </div>
        ) : (
          <div className="space-y-3 text-sm md:text-base">
            <p>
              <strong>{ipo.company_name} GMP in Hindi:</strong> Agar aap aaj {ipo.company_name} IPO ka Grey Market Premium (GMP) aur listing gain dekh rahe hain, toh iska issue price band <strong>₹{ipo.issue_price_min} se ₹{ipo.issue_price_max}</strong> prati share tay kiya gaya hai. Ek retail lot mein kul <strong>{ipo.lot_size} shares</strong> hain, jiske liye kam se kam <strong>₹{minInvestment.toLocaleString('en-IN')}</strong> ka nivesh karna hoga.
            </p>
            <p>
              Grey Market ki taza report ke mutabik aaj {ipo.company_name} IPO ka live GMP <strong>₹{gmp}</strong> chal raha hai. Is hisaab se iski estimated listing <strong>₹{estListing}</strong> ke aas-paas hone ka anuman hai, jo retail investors ko ek lot par lagbhag <strong>₹{oneLotProfit.toLocaleString('en-IN')} ({gainPercent}%)</strong> ka listing gain dikha raha hai.
            </p>
            {ipo.has_shareholder_quota && (
              <p className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl text-purple-950">
                <strong>Shareholder Quota Special Tip:</strong> Is IPO mein parent company <strong>{ipo.parent_company}</strong> ke shareholders ke liye alag quota rakha gaya hai. Agar aapke Demat account mein RHP filing se pehle {ipo.parent_company} ka share hai, toh aap Shareholder Category mein bhi apply karke apne allotment chance badha sakte hain.
              </p>
            )}
            <p>
              <strong>Allotment Status Kaise Check Karein?</strong> {ipo.company_name} IPO ka allotment <strong>{ipo.allotment_date || 'closing ke baad'}</strong> ko iske official registrar <strong>{ipo.registrar_name || 'BSE/NSE'}</strong> ki website par PAN card number daal kar check kiya ja sakega.
            </p>
          </div>
        )}
      </article>

      {/* Visible Hindi/Hinglish FAQ Section for Google Rich Results */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900">
          {ipo.company_name} GMP in Hindi — Aksar Puche Jane Wale Sawal (FAQs)
        </h2>
        <div className="space-y-3 text-sm">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <h3 className="font-bold text-slate-900">
              Q1. {ipo.company_name} GMP in Hindi — Aaj ka live GMP kitna hai?
            </h3>
            <p className="text-slate-700 mt-1">
              Aaj {ipo.company_name} IPO ka live GMP ₹{gmp} prati share chal raha hai, jo upper price band ₹{maxPrice} par lagbhag {gainPercent}% ka estimated gain dikha raha hai.
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <h3 className="font-bold text-slate-900">
              Q2. {ipo.company_name} IPO ki estimated listing price kya ho sakti hai?
            </h3>
            <p className="text-slate-700 mt-1">
              Issue price ₹{maxPrice} aur aaj ke GMP ₹{gmp} ko milakar iski estimated listing ₹{estListing} ke aas-paas hone ka anuman hai.
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <h3 className="font-bold text-slate-900">
              Q3. {ipo.company_name} IPO ka allotment status kaise check karein?
            </h3>
            <p className="text-slate-700 mt-1">
              {ipo.company_name} IPO ka allotment {ipo.allotment_date || 'closing ke baad'} ko official registrar {ipo.registrar_name || 'BSE/NSE'} ki website par PAN number daal kar check kiya ja sakta hai.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
