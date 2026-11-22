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

  // Exact Chittorgarh 2-Column Directory Table (Zebra + Open/Pre-Apply Row Tint + O/P Badges + Formatted Dates)
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
              const isOpen = ipo.status === 'Open';
              const isPreApply = ipo.status === 'Upcoming' && Boolean(ipo.open_date);

              let rowBgClass = index % 2 === 0 ? 'bg-white' : 'bg-slate-50/90';
              if (isOpen) {
                rowBgClass = 'bg-sky-100/80';
              } else if (isPreApply) {
                rowBgClass = 'bg-amber-50';
              }

              return (
                <tr key={ipo.id} className={`${rowBgClass} hover:bg-blue-50/70 transition group`}>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`/ipo/${ipo.slug}`}
                        className="font-semibold text-[#1a56db] group-hover:text-teal-700 group-hover:underline text-sm"
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

                      {isPreApply && (
                        <span
                          title="Pre-Apply Open"
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

        {/* Status Badge Legend (Just like Chittorgarh) */}
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
            Pre-Apply / Upcoming
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
        <section id="sme-list" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h2 className="text-base font-extrabold text-slate-900">
                SME IPOs &amp; FPOs 2026
              </h2>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                {smeIpos.length} Listed/Active
              </span>
            </div>
            {renderChittorgarhTable(smeIpos, 'Abhi koi SME IPO available nahi hai.')}
          </div>
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-right">
            <span className="text-[11px] text-slate-500">
              Company par click karke Live GMP &amp; Subscription dekhein →
            </span>
          </div>
        </section>
      </div>

      {/* UPCOMING IPOs & FPOs 2026 SECTION */}
      <section id="upcoming-list" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-amber-50/70">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Upcoming IPOs &amp; FPOs 2026 (Mainboard &amp; SME)
            </h2>
            <p className="text-[11px] text-slate-600">
              Aane wale IPOs jinki bidding jald shuru hone wali hai (Pre-Apply Open)
            </p>
          </div>
          <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded">
            {upcomingIpos.length} Upcoming
          </span>
        </div>
        {renderChittorgarhTable(upcomingIpos, 'Abhi koi Upcoming IPO scheduled nahi hai.')}
      </section>

      {/* GRID SECTION: Direct Allotment Links + Allotment Probability Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section id="allotment-guide" className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Direct IPO Allotment Status Check Links
            </h2>
            <p className="text-xs text-slate-500">
              Official registrar par click karke PAN card se turant allotment status check karein
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <a
              href="https://ris.kfintech.com/ipostatus/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition flex justify-between items-center"
            >
              <div>
                <span className="font-bold text-slate-900 block text-xs">KFintech IPO Status</span>
                <span className="text-[10px] text-slate-500">Official Registrar</span>
              </div>
              <span className="text-emerald-600 font-bold text-xs">Check →</span>
            </a>
            <a
              href="https://in.mpms.mufg.com/Initial_Offer/public-issues.html"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition flex justify-between items-center"
            >
              <div>
                <span className="font-bold text-slate-900 block text-xs">Link Intime (MUFG)</span>
                <span className="text-[10px] text-slate-500">Official Registrar</span>
              </div>
              <span className="text-emerald-600 font-bold text-xs">Check →</span>
            </a>
            <a
              href="https://ipo.bigshareonline.com/IPO_Status.html"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition flex justify-between items-center"
            >
              <div>
                <span className="font-bold text-slate-900 block text-xs">Bigshare Services</span>
                <span className="text-[10px] text-slate-500">SME &amp; Mainboard</span>
              </div>
              <span className="text-emerald-600 font-bold text-xs">Check →</span>
            </a>
            <a
              href="https://www.bseindia.com/investors/appli_check.aspx"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition flex justify-between items-center"
            >
              <div>
                <span className="font-bold text-slate-900 block text-xs">BSE India IPO Status</span>
                <span className="text-[10px] text-slate-500">Exchange Portal</span>
              </div>
              <span className="text-emerald-600 font-bold text-xs">Check →</span>
            </a>
          </div>
        </section>

        <section id="allotment-calculator" className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              IPO Allotment Chance Calculator (Hindi)
            </h2>
            <p className="text-xs text-slate-500">
              Alag-alag family Demat accounts se apply karne par allotment chance calculate karein
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">IPO Chunein:</label>
              <select
                value={selectedIpoId}
                onChange={(e) => setSelectedIpoId(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 bg-slate-50 font-semibold text-slate-900 text-xs"
              >
                {ipos.map((ipo) => (
                  <option key={ipo.id} value={ipo.id}>
                    {ipo.company_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Family Demat Accounts (Alag PAN):</span>
                <span className="text-emerald-700">{dematAccounts} Accounts</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={dematAccounts}
                onChange={(e) => setDematAccounts(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">1 Account Se Chance</span>
                <span className="text-base font-extrabold text-slate-900">
                  {singleAccChance.toFixed(1)}%
                </span>
              </div>
              <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                <span className="text-[10px] text-emerald-700 font-semibold block">
                  {dematAccounts} Accounts Se Total Chance
                </span>
                <span className="text-base font-extrabold text-emerald-700">
                  {combinedChance.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Latest IPO News & Guides */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <h2 className="text-base font-extrabold text-slate-900">
          Latest IPO News &amp; Investor Guides (Hindi/Hinglish)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <span className="text-[10px] font-bold uppercase bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
              Shareholder Quota
            </span>
            <h3 className="font-bold text-slate-900 text-xs md:text-sm">
              Parent Company Ka 1 Share Rakhkar Double Allotment Chance Paayein
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Jin IPOs mein Shareholder Quota hota hai, unmein RHP filing se pehle parent company ka 1 share rakhne par Retail + Shareholder dono mein apply kar sakte hain.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
              GMP Guide
            </span>
            <h3 className="font-bold text-slate-900 text-xs md:text-sm">
              Grey Market Premium (GMP) Kab Aur Kaise Dekhein?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              IPO band hone ke aakhiri din (Day 3) dopahar 2 baje ke baad QIB subscription aur Live GMP ko milakar dekhna sabse sateek maana jaata hai.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <span className="text-[10px] font-bold uppercase bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
              UPI Mandate Rule
            </span>
            <h3 className="font-bold text-slate-900 text-xs md:text-sm">
              Closing Day Sham 5 Baje Se Pehle UPI Mandate Approve Karein
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Bank server delay se bachne ke liye aakhiri din dopahar 3 baje tak apna UPI mandate approve kar lein, warna application reject ho sakti hai.
            </p>
          </div>
        </div>
      </section>

      <SipCalculator />
    </div>
  );
}
