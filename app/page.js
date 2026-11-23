'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import SipCalculator from './SipCalculator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

function formatIssueDates(openDate, closeDate) {
  if (!openDate) return '';

  const start = new Date(`${openDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return '';

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const sDay = String(start.getDate()).padStart(2, '0');
  const sMonth = months[start.getMonth()];

  if (!closeDate) {
    return `${sDay} ${sMonth}`;
  }

  const end = new Date(`${closeDate}T00:00:00`);
  if (Number.isNaN(end.getTime())) {
    return `${sDay} ${sMonth}`;
  }

  const eDay = String(end.getDate()).padStart(2, '0');
  const eMonth = months[end.getMonth()];

  if (sMonth === eMonth) {
    return `${sDay} - ${eDay} ${eMonth}`;
  }

  return `${sDay} ${sMonth} - ${eDay} ${eMonth}`;
}

export default function HomePage() {
  const [ipos, setIpos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIpoId, setSelectedIpoId] = useState('');
  const [dematAccounts, setDematAccounts] = useState(1);

  useEffect(() => {
    async function fetchIPOs() {
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('ipos')
        .select('*')
        .order('open_date', { ascending: false, nullsFirst: false });

      if (!error && data) {
        setIpos(data);
        if (data.length > 0) setSelectedIpoId(String(data[0].id));
      }
      setLoading(false);
    }
    fetchIPOs();
  }, []);

  const searchedIpos = ipos.filter(
    (ipo) =>
      ipo.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ipo.parent_company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const mainboardIpos = searchedIpos.filter((i) => i.category !== 'SME');
  const smeIpos = searchedIpos.filter((i) => i.category === 'SME');
  const upcomingIpos = searchedIpos.filter((i) => i.status === 'Upcoming');

  // Allotment Probability Calculator Logic
  const selectedIpo = ipos.find((i) => String(i.id) === String(selectedIpoId));
  const retailSub = Number(selectedIpo?.retail_sub) || 1;
  const singleAccChance = retailSub <= 1 ? 100 : Math.min(100, (1 / retailSub) * 100);
  const combinedChance =
    retailSub <= 1
      ? 100
      : Math.min(99.9, (1 - Math.pow(1 - 1 / retailSub, dematAccounts)) * 100);

  // Exact Chittorgarh 2-Column Directory Table
  const renderChittorgarhTable = (list, emptyMsg) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="bg-slate-100 text-slate-700 border-b-2 border-slate-300 text-xs">
            <th className="py-2.5 px-4 font-bold">Company</th>
            <th className="py-2.5 px-4 font-bold text-right">Issue Dates</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200/80">
          {loading ? (
            <tr>
              <td colSpan="2" className="py-8 text-center text-slate-400 text-xs">
                IPOs list load ho rahi hai...
              </td>
            </tr>
          ) : list.length === 0 ? (
            <tr>
              <td colSpan="2" className="py-6 text-center text-slate-400 text-xs">
                {emptyMsg}
              </td>
            </tr>
          ) : (
            list.map((ipo, index) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);

              const openDt = ipo.open_date ? new Date(`${ipo.open_date}T00:00:00`) : null;
              const closeDt = ipo.close_date ? new Date(`${ipo.close_date}T00:00:00`) : null;
              const listDt = ipo.listing_date ? new Date(`${ipo.listing_date}T00:00:00`) : null;

              // 1. 'L' = Aaj Listing Date hai
              const isListingToday = Boolean(listDt && today.getTime() === listDt.getTime());

              // 2. 'O' = Bidding abhi Open (Live) hai
              const isOpen =
                !isListingToday &&
                (ipo.status === 'Open' ||
                  (openDt && closeDt && today >= openDt && today <= closeDt));

              // 3. 'P' = Bidding close ho chuki hai, lekin abhi Listing Date nahi aayi
              const daysSinceClose = closeDt
                ? Math.floor((today - closeDt) / (1000 * 60 * 60 * 24))
                : -1;

              const isPendingListing =
                !isListingToday &&
                !isOpen &&
                closeDt &&
                today > closeDt &&
                (listDt ? today < listDt : daysSinceClose <= 7);

              let rowBgClass = index % 2 === 0 ? 'bg-white' : 'bg-slate-50/90';
              if (isListingToday || isOpen) {
                rowBgClass = 'bg-emerald-100/75';
              } else if (isPendingListing) {
                rowBgClass = 'bg-amber-50/90';
              }

              return (
                <tr
                  key={ipo.id}
                  className={`${rowBgClass} hover:bg-[#e2f3ea] transition-colors duration-150 cursor-pointer group`}
                >
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`/ipo/${ipo.slug}`}
                        className="font-semibold text-[#1a56db] group-hover:text-teal-800 group-hover:underline text-sm"
                      >
                        {ipo.company_name}
                      </a>

                      {isListingToday && (
                        <span
                          title="Listing Today"
                          className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-600 text-white text-[10px] font-bold leading-none shrink-0"
                        >
                          L
                        </span>
                      )}

                      {isOpen && (
                        <span
                          title="Open for Bidding"
                          className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-teal-600 text-white text-[10px] font-bold leading-none shrink-0"
                        >
                          O
                        </span>
                      )}

                      {isPendingListing && (
                        <span
                          title="Allotment / Listing Pending"
                          className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-400 text-slate-900 text-[10px] font-bold leading-none shrink-0"
                        >
                          P
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-2.5 px-4 text-right text-slate-700 font-medium text-xs sm:text-sm whitespace-nowrap">
                    {formatIssueDates(ipo.open_date, ipo.close_date)}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Top Search & Legend Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80">
          <input
            type="text"
            placeholder="Search IPO company name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-teal-600 text-white text-[10px] font-bold inline-flex items-center justify-center">
              O
            </span>
            Open Now
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-900 text-[10px] font-bold inline-flex items-center justify-center">
              P
            </span>
            Allotment / Listing Pending
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-green-600 text-white text-[10px] font-bold inline-flex items-center justify-center">
              L
            </span>
            Listing Today
          </span>
        </div>
      </div>

      {/* Mainboard & SME 2-Column Chittorgarh Directory */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mainboard IPOs */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="bg-[#0f766e] text-white px-4 py-3 flex items-center justify-between">
            <h2 className="font-bold text-sm sm:text-base">
              Mainboard IPOs ({mainboardIpos.length})
            </h2>
            <span className="text-[11px] bg-white/15 px-2 py-0.5 rounded">NSE &amp; BSE</span>
          </div>
          {renderChittorgarhTable(mainboardIpos, 'Abhi koi Mainboard IPO list nahi hai.')}
        </section>

        {/* SME IPOs */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center justify-between">
            <h2 className="font-bold text-sm sm:text-base">
              SME IPOs ({smeIpos.length})
            </h2>
            <span className="text-[11px] bg-white/15 px-2 py-0.5 rounded">NSE Emerge &amp; BSE SME</span>
          </div>
          {renderChittorgarhTable(smeIpos, 'Abhi koi SME IPO list nahi hai.')}
        </section>
      </div>

      {/* Live GMP Snapshot Table */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between">
          <h2 className="font-bold text-sm sm:text-base">
            Live IPO GMP Today &amp; Expected Listing Gain
          </h2>
          <span className="text-[11px] text-slate-300">Updated Live</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                <th className="py-2.5 px-4 font-bold">IPO Name</th>
                <th className="py-2.5 px-3 font-bold">Price</th>
                <th className="py-2.5 px-3 font-bold">GMP</th>
                <th className="py-2.5 px-3 font-bold">Est. Listing</th>
                <th className="py-2.5 px-3 font-bold">Lot Size</th>
                <th className="py-2.5 px-3 font-bold">Sub</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {searchedIpos.map((ipo) => {
                const maxP = Number(ipo.issue_price_max ?? 0);
                const gmp = Number(ipo.gmp_price ?? 0);
                const lot = Number(ipo.lot_size ?? 0);
                const est = maxP + gmp;
                const gain = maxP > 0 ? ((gmp / maxP) * 100).toFixed(1) : '0.0';

                return (
                  <tr key={ipo.id} className="hover:bg-teal-50/40">
                    <td className="py-2.5 px-4">
                      <a
                        href={`/ipo/${ipo.slug}`}
                        className="font-semibold text-[#1a56db] hover:underline"
                      >
                        {ipo.company_name}
                      </a>
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                        {ipo.category || 'Mainboard'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800 whitespace-nowrap">
                      {maxP > 0 ? `₹${maxP}` : 'TBA'}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-emerald-700 whitespace-nowrap">
                      {gmp > 0 ? `+₹${gmp}` : `₹${gmp}`}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                      {maxP > 0 ? `₹${est} (${gain}%)` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                      {lot > 0 ? `${lot} Shares` : 'TBA'}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-blue-700 whitespace-nowrap">
                      {Number(ipo.total_sub || 0).toFixed(2)}x
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Allotment Probability Calculator & SIP Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h2 className="text-base font-extrabold text-slate-900">
            🎯 IPO Allotment Probability Calculator
          </h2>
          <div className="space-y-3 text-xs sm:text-sm">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">IPO Chunein:</label>
              <select
                value={selectedIpoId}
                onChange={(e) => setSelectedIpoId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
              >
                {ipos.map((ipo) => (
                  <option key={ipo.id} value={ipo.id}>
                    {ipo.company_name} (Retail Sub: {Number(ipo.retail_sub || 1).toFixed(2)}x)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Alag-Alag PAN / Demat Accounts: {dematAccounts}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={dematAccounts}
                onChange={(e) => setDematAccounts(Number(e.target.value))}
                className="w-full accent-teal-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="text-xs text-slate-500 block">1 Account Chance</span>
                <span className="text-lg font-extrabold text-slate-900">
                  {singleAccChance.toFixed(1)}%
                </span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <span className="text-xs text-emerald-700 block">
                  {dematAccounts} Accounts Combined
                </span>
                <span className="text-lg font-extrabold text-emerald-700">
                  {combinedChance.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </section>

        <SipCalculator />
      </div>
    </div>
  );
}
