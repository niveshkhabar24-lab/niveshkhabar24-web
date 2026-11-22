'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import SipCalculator from './SipCalculator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

function formatIssueDates(openDate, closeDate) {
  if (!openDate) return 'Announced Soon';

  const start = new Date(`${openDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return 'Announced Soon';

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

  const selectedIpo = ipos.find((i) => String(i.id) === String(selectedIpoId));
  const retailSub = Number(selectedIpo?.retail_sub) || 1;
  const singleAccChance = retailSub <= 1 ? 100 : Math.min(100, (1 / retailSub) * 100);
  const combinedChance =
    retailSub <= 1
      ? 100
      : Math.min(99.9, (1 - Math.pow(1 - 1 / retailSub, dematAccounts)) * 100);

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

              const isListingToday = Boolean(listDt && today.getTime() === listDt.getTime());

              const isOpen =
                !isListingToday &&
                (ipo.status === 'Open' ||
                  (openDt && closeDt && today >= openDt && today <= closeDt));

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

                  <td className="py-2.5 px-4 text-right text-xs font-medium text-slate-700 whitespace-nowrap">
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
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
      {/* Search & Status Legend */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <input
          type="text"
          placeholder="Search IPO by company name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-80 px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
        />
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1">
            <span className="w-4 h-4 rounded-full bg-teal-600 text-white text-[10px] font-bold inline-flex items-center justify-center">O</span>
            Open Now
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-900 text-[10px] font-bold inline-flex items-center justify-center">P</span>
            Allotment Pending
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-4 h-4 rounded-full bg-green-600 text-white text-[10px] font-bold inline-flex items-center justify-center">L</span>
            Listing Today
          </span>
        </div>
      </div>

      {/* Mainboard & SME IPO Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-emerald-800 text-white px-4 py-3 font-bold text-sm sm:text-base">
            Current & Recent Mainboard IPOs (Live GMP)
          </div>
          {renderChittorgarhTable(mainboardIpos, 'Abhi koi Mainboard IPO list nahi hai.')}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-800 text-white px-4 py-3 font-bold text-sm sm:text-base">
            Current & Recent SME IPOs (Live GMP)
          </div>
          {renderChittorgarhTable(smeIpos, 'Abhi koi SME IPO list nahi hai.')}
        </div>
      </div>

      {/* Upcoming IPOs */}
      {upcomingIpos.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-indigo-800 text-white px-4 py-3 font-bold text-sm sm:text-base">
            Upcoming IPOs Watchlist 2026
          </div>
          {renderChittorgarhTable(upcomingIpos, 'Koi upcoming IPO nahi mila.')}
        </div>
      )}

      {/* Allotment Probability Calculator */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900">
          IPO Allotment Probability Calculator (Retail Category)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select IPO</label>
            <select
              value={selectedIpoId}
              onChange={(e) => setSelectedIpoId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              {ipos.map((ipo) => (
                <option key={ipo.id} value={ipo.id}>
                  {ipo.company_name} ({Number(ipo.retail_sub || 1).toFixed(2)}x)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Number of Demat Accounts (PANs)
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={dematAccounts}
              onChange={(e) => setDematAccounts(Math.max(1, Number(e.target.value) || 1))}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm">
            <div className="text-slate-700">
              1 Account Chance: <strong>{singleAccChance.toFixed(1)}%</strong>
            </div>
            <div className="text-emerald-800 font-bold">
              {dematAccounts} Account(s) Chance: {combinedChance.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* SIP Calculator */}
      <SipCalculator />
    </div>
  );
}
