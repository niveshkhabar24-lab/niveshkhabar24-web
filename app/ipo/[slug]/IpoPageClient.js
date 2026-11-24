'use client';

import { useState } from 'react';
import IpoTabsClient, { triggerDirectPdfDownload } from './IpoTabsClient';

export default function IpoPageClient({
  ipo,
  gmpHistory = [],
  displayLogo,
  introSummary,
  dates,
  ipoDetailRows,
  issueSizeRows,
  timetableRows,
  reservationRows,
  lotSizeRows,
  registrarInfo,
  contactInfo,
}) {
  const [selectedTopTab, setSelectedTopTab] = useState(null);

  const handleTopTabClick = (tabId) => {
    if (tabId === 'drhp_download') {
      triggerDirectPdfDownload(ipo);
      return;
    }
    setSelectedTopTab((prev) => (prev === tabId ? null : tabId));
    const el = document.getElementById('ipo-tabs-panel');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-5 space-y-5">
      {/* TOP HEADER BAR WITH ONLY THE 4 REQUESTED TABS */}
      <div className="bg-white rounded-xl border border-slate-200 px-3 py-2.5 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <a href="/" className="text-xs sm:text-sm font-extrabold text-teal-800 hover:underline">
          ← Sabhi IPOs
        </a>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold">
          <button
            onClick={() => handleTopTabClick('gmp')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
              selectedTopTab === 'gmp'
                ? 'bg-teal-700 text-white'
                : 'bg-slate-100 text-slate-800 hover:bg-teal-50 hover:text-teal-800'
            }`}
          >
            GMP
          </button>

          <button
            onClick={() => handleTopTabClick('subscription')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
              selectedTopTab === 'subscription'
                ? 'bg-teal-700 text-white'
                : 'bg-slate-100 text-slate-800 hover:bg-teal-50 hover:text-teal-800'
            }`}
          >
            Subscription
          </button>

          <button
            onClick={() => handleTopTabClick('drhp_download')}
            className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 cursor-pointer transition-all"
          >
            DRHP / RHP PDF ⬇
          </button>

          <button
            onClick={() => handleTopTabClick('allotment')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
              selectedTopTab === 'allotment'
                ? 'bg-teal-700 text-white'
                : 'bg-slate-100 text-slate-800 hover:bg-teal-50 hover:text-teal-800'
            }`}
          >
            Allotment Status
          </button>
        </div>
      </div>

      {/* BOX 1: PHOTO + 100-150 WORD DETAIL + 4 IMPORTANT DATES */}
      <header className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
            <img
              src={displayLogo}
              alt={`${ipo.company_name} IPO Photo`}
              className="w-full h-full object-cover rounded-xl"
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
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 leading-snug">
              {ipo.company_name} IPO Details
            </h1>

            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{introSummary}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-3 text-center">
            <span className="text-[11px] uppercase tracking-wide font-bold text-teal-800 block">
              IPO Open Date
            </span>
            <span className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5 block">
              {dates.openStr}
            </span>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-center">
            <span className="text-[11px] uppercase tracking-wide font-bold text-amber-800 block">
              IPO Close Date
            </span>
            <span className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5 block">
              {dates.closeStr}
            </span>
          </div>

          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-center">
            <span className="text-[11px] uppercase tracking-wide font-bold text-blue-800 block">
              Allotment Date
            </span>
            <span className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5 block">
              {dates.allotmentStr}
            </span>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-center">
            <span className="text-[11px] uppercase tracking-wide font-bold text-emerald-800 block">
              Listing Date
            </span>
            <span className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5 block">
              {dates.listingStr}
            </span>
          </div>
        </div>
      </header>

      {/* BOX 2: TWO SIDE-BY-SIDE TABLE BOXES (IPO Details | Issue Size & Shareholding) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-800 text-white px-4 py-3">
            <h2 className="text-sm sm:text-base font-bold">
              {ipo.company_name} IPO Details
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left border-collapse">
              <tbody className="divide-y divide-slate-200">
                {ipoDetailRows.map((item) => (
                  <tr key={item.label} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-semibold text-slate-700 w-2/5">{item.label}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 text-right">{item.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-teal-800 text-white px-4 py-3">
            <h2 className="text-sm sm:text-base font-bold">
              Issue Size &amp; Shareholding
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left border-collapse">
              <tbody className="divide-y divide-slate-200">
                {issueSizeRows.map((item) => (
                  <tr key={item.label} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-semibold text-slate-700 w-1/2">{item.label}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 text-right">{item.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* BOX 3: POORA IPO TIMETABLE */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-800 text-white px-4 py-3">
          <h2 className="text-sm sm:text-base font-bold">
            {ipo.company_name} IPO Timetable
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                <th className="py-2.5 px-4 font-bold">Event / Milestone</th>
                <th className="py-2.5 px-4 font-bold text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {timetableRows.map((row) => (
                <tr key={row.label} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-semibold text-slate-800">{row.label}</td>
                  <td className="py-2.5 px-4 font-bold text-slate-900 text-right">{row.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* BOX 4: TWO SIDE-BY-SIDE TABLE BOXES (Issue Reservation | IPO Lot Size) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-800 text-white px-4 py-3">
            <h2 className="text-sm sm:text-base font-bold">
              {ipo.company_name} IPO Reservation
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <th className="py-2.5 px-4 font-bold">Investor Category</th>
                  <th className="py-2.5 px-4 font-bold text-right">Allocation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {reservationRows.map((row) => (
                  <tr
                    key={row.category}
                    className={
                      row.isTotal
                        ? 'bg-slate-100 font-bold'
                        : row.isSub
                        ? 'bg-slate-50/50 text-slate-600'
                        : 'hover:bg-slate-50'
                    }
                  >
                    <td className={`py-2.5 px-4 ${row.isSub ? 'pl-7 text-xs' : 'font-semibold text-slate-800'}`}>
                      {row.category}
                    </td>
                    <td className={`py-2.5 px-4 text-right ${row.isSub ? 'text-xs font-medium' : 'font-bold text-slate-900'}`}>
                      {row.percent}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-teal-800 text-white px-4 py-3">
            <h2 className="text-sm sm:text-base font-bold">
              {ipo.company_name} IPO Lot Size
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <th className="py-2.5 px-3 font-bold">Application</th>
                  <th className="py-2.5 px-3 font-bold text-center">Lots</th>
                  <th className="py-2.5 px-3 font-bold text-center">Shares</th>
                  <th className="py-2.5 px-3 font-bold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {lotSizeRows.length > 0 ? (
                  lotSizeRows.map((row) => (
                    <tr key={row.application} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{row.application}</td>
                      <td className="py-2.5 px-3 text-center text-slate-700">{row.lots}</td>
                      <td className="py-2.5 px-3 text-center text-slate-700">
                        {row.shares.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        ₹{row.amount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 px-4 text-center text-slate-500 text-xs">
                      Price band &amp; lot size details will be updated soon.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* BOX 5 & BOX 6: DETAILS BLOG + COMPANY FINANCIALS (OR DEDICATED TAB VIEW WHEN CLICKED AT TOP) */}
      <div id="ipo-tabs-panel">
        <IpoTabsClient
          ipo={ipo}
          gmpHistory={gmpHistory}
          externalTab={selectedTopTab}
          onClearExternalTab={() => setSelectedTopTab(null)}
        />
      </div>

      {/* BOTTOM 2 BOXES: REGISTRAR DETAIL & COMPANY CONTACT DETAIL (BSE / NSE) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-800 text-white px-4 py-3">
            <h2 className="text-sm sm:text-base font-bold">IPO Registrar Details</h2>
          </div>
          <div className="p-4 space-y-2 text-xs sm:text-sm text-slate-700">
            <p><strong className="text-slate-900">Registrar:</strong> {registrarInfo.name}</p>
            <p><strong className="text-slate-900">Phone:</strong> {registrarInfo.phone}</p>
            <p><strong className="text-slate-900">Email:</strong> {registrarInfo.email}</p>
            <p>
              <strong className="text-slate-900">Website:</strong>{' '}
              <a
                href={registrarInfo.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-700 font-semibold hover:underline"
              >
                {registrarInfo.website}
              </a>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-teal-800 text-white px-4 py-3">
            <h2 className="text-sm sm:text-base font-bold">Company Contact Details (BSE / NSE)</h2>
          </div>
          <div className="p-4 space-y-2 text-xs sm:text-sm text-slate-700">
            <p><strong className="text-slate-900">Company:</strong> {contactInfo.company}</p>
            <p><strong className="text-slate-900">Address:</strong> {contactInfo.address}</p>
            <p><strong className="text-slate-900">Phone:</strong> {contactInfo.phone}</p>
            <p><strong className="text-slate-900">Email:</strong> {contactInfo.email}</p>
            {contactInfo.website && (
              <p>
                <strong className="text-slate-900">Website:</strong>{' '}
                <a
                  href={contactInfo.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-700 font-semibold hover:underline"
                >
                  {contactInfo.website}
                </a>
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
