'use client';

import { useState } from 'react';

function formatSingleDate(dateStr, fallback = 'Announced Soon') {
  if (!dateStr) return fallback;
  const d = new Date(`${String(dateStr).split('T')[0]}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export default function IpoTabsClient({ ipo, gmpHistory = [] }) {
  const [activeTab, setActiveTab] = useState('overview');

  const maxPrice = Number(ipo.issue_price_max) || 0;
  const gmp = Number(ipo.gmp_price) || 0;
  const lotSize = Number(ipo.lot_size) || 0;
  const estListing = maxPrice + gmp;
  const gainPercent = maxPrice > 0 ? ((gmp / maxPrice) * 100).toFixed(2) : '0.00';
  const oneLotProfit = gmp * lotSize;
  const minInvestment = maxPrice * lotSize;
  const registrarName = ipo.registrar_name || ipo.registrar || 'BSE / NSE';

  // Agar history table mein rows hain toh unhe dikhayein, warna aaj ki latest row fallback ke roop mein dikhayein
  const historyRows =
    Array.isArray(gmpHistory) && gmpHistory.length > 0
      ? gmpHistory
      : [
          {
            id: 'latest',
            gmp_date: new Date().toISOString().split('T')[0],
            gmp_price: gmp,
          },
        ];

  const tabs = [
    { id: 'overview', label: '1. Overview & Dates' },
    { id: 'gmp', label: '2. Live GMP Today' },
    { id: 'subscription', label: '3. Subscription' },
    { id: 'review', label: '4. Review (Apply/Avoid)' },
    { id: 'allotment', label: '5. Allotment Status' },
    { id: 'faqs', label: '6. GMP in Hindi FAQs' },
  ];

  return (
    <div className="space-y-6">
      {/* Chittorgarh-Style Horizontal Navigation Tabs */}
      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm sticky top-16 z-30">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition ${
              activeTab === tab.id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW & DATES */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-extrabold text-slate-900">
              {ipo.company_name} IPO Dates &amp; Issue Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">IPO Open Date</span>
                <span className="font-bold text-slate-900">{formatSingleDate(ipo.open_date)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">IPO Close Date</span>
                <span className="font-bold text-slate-900">{formatSingleDate(ipo.close_date)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Allotment Date</span>
                <span className="font-bold text-slate-900">{formatSingleDate(ipo.allotment_date)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Listing Date</span>
                <span className="font-bold text-slate-900">{formatSingleDate(ipo.listing_date)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Price Band</span>
                <span className="font-bold text-slate-900">₹{ipo.issue_price_min} - ₹{ipo.issue_price_max} per share</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Lot Size &amp; Min Investment</span>
                <span className="font-bold text-slate-900">{lotSize} Shares (₹{minInvestment.toLocaleString('en-IN')})</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Total Issue Size</span>
                <span className="font-bold text-slate-900">
                  {Number(ipo.issue_size_cr) > 0 ? `₹${ipo.issue_size_cr} Crore` : 'TBA'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Official Registrar</span>
                <span className="font-bold text-slate-900">{registrarName}</span>
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <button
              onClick={() => setActiveTab('gmp')}
              className="bg-slate-900 hover:bg-emerald-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition"
            >
              Agla Tab: Live GMP &amp; Listing Gain Dekhein →
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE GMP TODAY (DATE-WISE HISTORY) */}
      {activeTab === 'gmp' && (
        <div className="space-y-6">
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-extrabold text-slate-900">
              {ipo.company_name} GMP in Hindi — Date-Wise Grey Market Premium &amp; Listing Gain
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              <strong>{ipo.company_name} GMP in Hindi:</strong> Grey market ke taza data ke mutabik aaj {ipo.company_name} IPO ka live GMP <strong>₹{gmp}</strong> chal raha hai. Upper price band <strong>₹{maxPrice}</strong> ke hisaab se iski estimated listing price <strong>₹{estListing}</strong> ke aas-paas rehne ka anuman hai, jo retail investors ko 1 lot ({lotSize} shares) par lagbhag <strong>₹{oneLotProfit.toLocaleString('en-IN')} ({gainPercent}%)</strong> ka listing gain dikha raha hai.
            </p>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 text-xs">
                    <th className="p-3 font-bold">GMP Date</th>
                    <th className="p-3 font-bold">IPO Price</th>
                    <th className="p-3 font-bold">GMP</th>
                    <th className="p-3 font-bold">Est. Listing Price</th>
                    <th className="p-3 font-bold text-right">1 Lot Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {historyRows.map((row, idx) => {
                    const rowGmp = Number(row.gmp_price) || 0;
                    const rowEstPrice = maxPrice + rowGmp;
                    const rowGainPct = maxPrice > 0 ? ((rowGmp / maxPrice) * 100).toFixed(2) : '0.00';
                    const rowProfit = rowGmp * lotSize;
                    const isLatest = idx === 0;

                    return (
                      <tr
                        key={row.id || row.gmp_date}
                        className={`${
                          isLatest
                            ? 'bg-emerald-50/80 font-semibold'
                            : idx % 2 === 0
                            ? 'bg-white'
                            : 'bg-slate-50/70'
                        } hover:bg-[#e2f3ea] transition-colors`}
                      >
                        <td className="p-3 whitespace-nowrap text-slate-900">
                          {formatSingleDate(row.gmp_date)}
                          {isLatest && (
                            <span className="ml-2 text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                              Latest
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-700">₹{maxPrice}</td>
                        <td className="p-3 font-bold text-emerald-700">
                          {rowGmp > 0 ? `+₹${rowGmp}` : `₹${rowGmp}`} ({rowGainPct}%)
                        </td>
                        <td className="p-3 font-bold text-slate-900">₹{rowEstPrice}</td>
                        <td className="p-3 font-bold text-emerald-700 text-right">
                          ₹{rowProfit.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <div className="flex justify-end">
            <button
              onClick={() => setActiveTab('subscription')}
              className="bg-slate-900 hover:bg-emerald-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition"
            >
              Agla Tab: Live QIB / Retail Subscription Dekhein →
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: SUBSCRIPTION STATUS */}
      {activeTab === 'subscription' && (
        <div className="space-y-6">
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-extrabold text-slate-900">
              {ipo.company_name} Live Subscription Status (Category-Wise)
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 block">QIB (Qualified)</span>
                <span className="text-2xl font-extrabold text-slate-900">
                  {Number(ipo.qib_sub || 0).toFixed(2)}x
                </span>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 block">NII / HNI</span>
                <span className="text-2xl font-extrabold text-slate-900">
                  {Number(ipo.nii_sub || 0).toFixed(2)}x
                </span>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 block">Retail Investor</span>
                <span className="text-2xl font-extrabold text-slate-900">
                  {Number(ipo.retail_sub || 0).toFixed(2)}x
                </span>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <span className="text-xs text-blue-700 font-bold block">Total Subscribed</span>
                <span className="text-2xl font-extrabold text-blue-800">
                  {Number(ipo.total_sub || 0).toFixed(2)}x
                </span>
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <button
              onClick={() => setActiveTab('review')}
              className="bg-slate-900 hover:bg-emerald-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition"
            >
              Agla Tab: IPO Review (Apply Karein Ya Nahi?) →
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: REVIEW */}
      {activeTab === 'review' && (
        <div className="space-y-6">
          <article className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 leading-relaxed text-slate-800">
            <h2 className="text-xl font-extrabold text-slate-900">
              {ipo.company_name} IPO Review in Hindi — Apply Karein Ya Avoid?
            </h2>
            {ipo.hinglish_review ? (
              <div className="whitespace-pre-line text-sm md:text-base">{ipo.hinglish_review}</div>
            ) : (
              <div className="space-y-3 text-sm md:text-base">
                <p>
                  <strong>{ipo.company_name}</strong> ka total issue size <strong>₹{ipo.issue_size_cr} Crore</strong> hai aur iska price band <strong>₹{ipo.issue_price_min} se ₹{ipo.issue_price_max}</strong> rakha gaya hai.
                </p>
                <p>
                  Aaj ke Live GMP <strong>₹{gmp} ({gainPercent}% listing gain)</strong> aur QIB/Retail demand ko dekhte hue listing gain ke liye apply karne wale investors ismein nazar rakh sakte hain.
                </p>
                {ipo.has_shareholder_quota && (
                  <p className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl text-purple-950">
                    <strong>Shareholder Quota Advantage:</strong> Agar aapke paas parent company <strong>{ipo.parent_company}</strong> ka share hai, toh Shareholder Category mein apply karne se allotment milne ka chance kaafi badh jaata hai.
                  </p>
                )}
              </div>
            )}
          </article>

          <div className="flex justify-end">
            <button
              onClick={() => setActiveTab('allotment')}
              className="bg-slate-900 hover:bg-emerald-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition"
            >
              Agla Tab: Allotment Status &amp; Direct Link Dekhein →
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: ALLOTMENT STATUS */}
      {activeTab === 'allotment' && (
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-extrabold text-slate-900">
            {ipo.company_name} IPO Allotment Status Kaise Check Karein?
          </h2>
          <p className="text-sm text-slate-700">
            Is IPO ka allotment <strong>{formatSingleDate(ipo.allotment_date, 'closing ke baad')}</strong> ko official registrar <strong>{registrarName}</strong> ki website par jaari hoga.
          </p>
          <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-700">
            <li>Registrar <strong>{registrarName}</strong> ke official allotment portal par jayein.</li>
            <li>Dropdown list mein se <strong>{ipo.company_name}</strong> chunein.</li>
            <li>Apna <strong>PAN Card Number</strong> ya Application Number daal kar Submit karein.</li>
          </ol>
          <div className="pt-2">
            <a
              href="/#allotment-guide"
              className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl"
            >
              Direct Registrar Portal Kholne Ke Liye Yahan Click Karein →
            </a>
          </div>
        </section>
      )}

      {/* TAB 6: FAQs */}
      {activeTab === 'faqs' && (
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-extrabold text-slate-900">
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
                {ipo.company_name} IPO ka allotment {formatSingleDate(ipo.allotment_date, 'closing ke baad')} ko official registrar {registrarName} ki website par PAN number daal kar check kiya ja sakta hai.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
