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

              // 1. 'O' = Bidding abhi Open (Live) hai
              const isOpen =
                ipo.status === 'Open' ||
                (openDt && closeDt && today >= openDt && today <= closeDt);

              // 2. 'P' = Bidding close ho chuki hai, lekin abhi Allotment/Listing pending hai
              const daysSinceClose = closeDt
                ? Math.floor((today - closeDt) / (1000 * 60 * 60 * 24))
                : -1;

              const isPendingListing =
                !isOpen &&
                closeDt &&
                today > closeDt &&
                (listDt ? today < listDt : daysSinceClose <= 7);

              let rowBgClass = index % 2 === 0 ? 'bg-white' : 'bg-slate-50/90';
              if (isOpen) {
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
                          className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-400 text-white text-[10px] font-bold leading-none shrink-0"
                        >
                          P
                        </span>
                      )}
                    </div>
                    {ipo.has_shareholder_quota && (
                      <span className="inline-block mt-0.5 text-[10px] text-purple-700 font-semibold">
                        - Shareholder Quota ({ipo.parent_company})
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-xs text-slate-700 text-right whitespace-nowrap font-medium">
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
    <div className="max-w-7xl mx-auto px-4 py-5 space-y-6">
      {/* Chittorgarh Style Top Quick Navigation Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-700">
        <div className="flex flex-wrap items-center gap-2">
          <a href="#mainboard-list" className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-800 hover:bg-blue-100 transition">
            Mainboard IPOs &amp; FPOs
          </a>
          <a href="#sme-list" className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition">
            SME IPOs &amp; FPOs
          </a>
          <a href="#upcoming-list" className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 transition">
            Upcoming IPOs ({upcomingIpos.length})
          </a>
          <a href="#allotment-guide" className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition">
            Allotment Status Check
          </a>
          <a href="#allotment-calculator" className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition">
            Allotment Chance Calculator
          </a>
          <a href="#sip-calculator" className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition">
            SIP Calculator
          </a>
        </div>

        {/* Status Badge Legend */}
        <div className="flex items-center gap-3 text-[11px] text-slate-600 px-2">
          <span className="flex items-center gap-1">
            <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-teal-600 text-white text-[9px] font-bold">
              O
            </span>
            Open
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-amber-400 text-white text-[9px] font-bold">
              P
            </span>
            Allotment / Listing Pending
          </span>
        </div>
      </div>

      {/* Compact Title & Search Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-lg md:text-xl font-extrabold text-slate-900">
            IPOs, Live GMP, Subscription &amp; Allotment Status 2026 (Hindi Mein)
          </h1>
          <p className="text-xs text-slate-500">
            Live GMP, QIB/Retail Subscription aur Review dekhne ke liye kisi bhi company ke naam par click karein
          </p>
        </div>
        <input
          type="text"
          placeholder="Company naam search karein..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-72 px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-medium focus:outline-none focus:border-emerald-600"
        />
      </div>

      {/* EXACT CHITTORGARH 2-COLUMN DIRECTORY GRID */}
      <div id="live-ipo-table" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Mainboard IPOs & FPOs 2026 */}
        <section id="mainboard-list" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h2 className="text-base font-extrabold text-slate-900">
                Mainboard IPOs &amp; FPOs 2026
              </h2>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                {mainboardIpos.length} Listed/Active
              </span>
            </div>
            {renderChittorgarhTable(mainboardIpos, 'Abhi koi Mainboard IPO available nahi hai.')}
          </div>
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-right">
            <span className="text-[11px] text-slate-500">
              Company par click karke Live GMP &amp; Subscription dekhein →
            </span>
          </div>
        </section>

        {/* Right Column: SME IPOs & FPOs 2026 */}
        <section id="sme-list" className="bg-white rounded-xl border border-slate-200 shadow-
