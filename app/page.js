'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import SipCalculator from './SipCalculator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export default function HomePage() {
  const [ipos, setIpos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    async function fetchIPOs() {
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('ipos')
        .select('*')
        .order('open_date', { ascending: false });

      if (!error && data) {
        setIpos(data);
      }
      setLoading(false);
    }
    fetchIPOs();
  }, []);

  const filteredIpos = ipos.filter((ipo) => {
    const matchesSearch =
      ipo.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ipo.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ipo.parent_company?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'All' ||
      ipo.status?.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'open') return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (s === 'upcoming') return 'bg-amber-100 text-amber-800 border-amber-300';
    if (s === 'closed') return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-slate-100 text-slate-700 border-slate-300';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
      {/* Hero Banner */}
      <section className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-6 md:p-10 shadow-lg">
        <div className="max-w-3xl space-y-3">
          <span className="inline-block bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold px-3 py-1 rounded-full">
            LIVE IPO GMP TODAY IN HINDI • 2026
          </span>
          <h1 className="text-2xl md:text-4xl font-extrabold leading-tight">
            Aaj Ka IPO GMP, Live Subscription Aur Allotment Status (Hindi Mein)
          </h1>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed">
            Mainboard aur SME IPO ka latest Grey Market Premium (GMP), QIB/Retail subscription
            status, aur shareholder quota ki poori jankari bilkul saral bhasha mein.
          </p>
        </div>
      </section>

      {/* Main IPO Table Section */}
      <section id="live-ipo-table" className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900">
              Live IPO GMP List 2026 (Updated Today)
            </h2>
            <p className="text-xs md:text-sm text-slate-500">
              Kisi bhi IPO ka estimated listing gain aur subscription status turant dekhein
            </p>
          </div>

          {/* Search Bar */}
          <div className="w-full md:w-72">
            <input
              type="text"
              placeholder="IPO ya Parent Company search karein..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {['All', 'Open', 'Upcoming', 'Closed', 'Listed'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                statusFilter === tab
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab === 'All' ? 'Sabhi IPOs' : tab}
            </button>
          ))}
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-4 font-bold">IPO Name</th>
                <th className="py-3.5 px-4 font-bold">Status</th>
                <th className="py-3.5 px-4 font-bold">Price Band</th>
                <th className="py-3.5 px-4 font-bold">Live GMP</th>
                <th className="py-3.5 px-4 font-bold">Est. Listing</th>
                <th className="py-3.5 px-4 font-bold">Subscription</th>
                <th className="py-3.5 px-4 font-bold">Dates (Open - Close)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    Live IPO data load ho raha hai...
                  </td>
                </tr>
              ) : filteredIpos.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    Koi IPO nahi mila. Filter ya search badal kar dekhein.
                  </td>
                </tr>
              ) : (
                filteredIpos.map((ipo) => {
                  const maxPrice = Number(ipo.issue_price_max) || 0;
                  const gmp = Number(ipo.gmp_price) || 0;
                  const estPrice = maxPrice + gmp;
                  const gainPercent = maxPrice > 0 ? ((gmp / maxPrice) * 100).toFixed(1) : '0.0';

                  return (
                    <tr key={ipo.id} className="hover:bg-slate-50 transition">
                      <td className="py-4 px-4">
                        <a
                          href={`/ipo/${ipo.slug}`}
                          className="font-bold text-slate-900 hover:text-emerald-600 block"
                        >
                          {ipo.company_name}
                        </a>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                            {ipo.category || 'Mainboard'}
                          </span>
                          {ipo.has_shareholder_quota && (
                            <span className="text-[11px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-semibold">
                              Shareholder Quota ({ipo.parent_company})
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusBadge(
                            ipo.status
                          )}`}
                        >
                          {ipo.status}
                        </span>
                      </td>

                      <td className="py-4 px-4 font-medium text-slate-800">
                        ₹{ipo.issue_price_min} - ₹{ipo.issue_price_max}
                        <span className="block text-xs text-slate-500">
                          Lot: {ipo.lot_size} Shares
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`font-bold text-base ${
                            gmp > 0 ? 'text-emerald-600' : 'text-slate-600'
                          }`}
                        >
                          {gmp > 0 ? `+₹${gmp}` : `₹${gmp}`}
                        </span>
                        <span className="block text-xs text-slate-500">
                          1 Lot Profit: ₹{(gmp * (ipo.lot_size || 0)).toLocaleString('en-IN')}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="font-bold text-slate-900">₹{estPrice}</span>
                        <span
                          className={`block text-xs font-semibold ${
                            Number(gainPercent) > 0 ? 'text-emerald-600' : 'text-slate-500'
                          }`}
                        >
                          ({Number(gainPercent) > 0 ? `+${gainPercent}%` : `${gainPercent}%`})
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="font-bold text-slate-900">{ipo.total_sub || 0}x</span>
                        <span className="block text-[11px] text-slate-500">
                          QIB: {ipo.qib_sub || 0}x | Ret: {ipo.retail_sub || 0}x
                        </span>
                      </td>

                      <td className="py-4 px-4 text-xs text-slate-700">
                        <div>
                          <span className="font-semibold">Open:</span> {ipo.open_date || '-'}
                        </div>
                        <div>
                          <span className="font-semibold">Close:</span> {ipo.close_date || '-'}
                        </div>
                        <div className="text-slate-500">
                          Allot: {ipo.allotment_date || '-'}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Allotment Tips Section (SEO Content in Hindi) */}
      <section id="allotment-guide" className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
        <h2 className="text-xl font-bold text-slate-900">
          IPO Allotment Kaise Badhayein? (Retail Investors Ke Liye 4 Zaroori Tips)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-1">1. Alag-Alag Family PAN Card Se Apply Karein</h3>
            <p>
              Oversubscribed IPO mein ek hi PAN se 5 lot lagane ke bajay parivar ke 4-5 alag Demat
              accounts se 1-1 lot lagane par allotment milne ka chance kai guna badh jata hai.
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-1">2. Hamesha Cut-Off Price Chunein</h3>
            <p>
              Retail category mein apply karte samay hamesha Cut-Off Price tick karein, taaki
              upper price band par aapka application valid rahe.
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-1">3. Shareholder Quota Ka Fayda Uthayein</h3>
            <p>
              Jis IPO mein Parent Company ka Shareholder Quota hota hai, usmein RHP filing se
              pehle parent company ka 1 share rakhne par alag category mein apply kar sakte hain.
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-1">4. Aakhiri Din 3 Baje Se Pehle UPI Approve Karein</h3>
            <p>
              Closing day par dopahar 3 baje se pehle apna application aur UPI mandate zaroor
              approve kar lein taaki last-minute bank server delay se bacha ja sake.
            </p>
          </div>
        </div>
      </section>

      {/* Existing SIP Calculator */}
      <section id="sip-calculator" className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <SipCalculator />
      </section>
    </div>
  );
}
