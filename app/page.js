import { createClient } from '@supabase/supabase-js';

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
