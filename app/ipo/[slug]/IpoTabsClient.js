'use client';

import { useState, useEffect } from 'react';

function formatShortDate(dateStr) {
  if (!dateStr) return 'Announced Soon';
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 'Announced Soon';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function FinancialsBox({ companyName, financials }) {
  const rows = financials && Array.isArray(financials.rows) ? financials.rows : [];
  const unit = financials?.unit || '₹ Crore';

  if (rows.length === 0) {
    return (
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-2 shadow-xs">
        <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
          {companyName} Company Financials
        </h3>
        <p className="text-xs sm:text-sm text-slate-600">
          कंपनी के वित्तीय विवरण (Revenue, Profit After Tax, Net Worth) ऑफर दस्तावेज़ के अनुसार अपडेट किए जा रहे हैं।
        </p>
      </section>
    );
  }

  const maxVal = Math.max(...rows.map((r) => Math.max(Number(r.revenue) || 0, Number(r.profit) || 0, 1)));

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
            {companyName} Company Financials ({unit})
          </h3>
          <p className="text-xs text-slate-500">
            RHP / DRHP के अनुसार कंपनी के वित्तीय आंकड़े
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-teal-800">
            <span className="w-3 h-3 rounded-xs bg-teal-600 inline-block" /> Revenue
          </span>
          <span className="flex items-center gap-1.5 text-emerald-800">
            <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block" /> Profit After Tax
          </span>
        </div>
      </div>

      <div
        className={`grid gap-4 sm:gap-8 pt-4 pb-2 px-2 sm:px-6 bg-slate-50/70 rounded-xl border border-slate-100 ${
          rows.length === 2 ? 'grid-cols-2' : rows.length >= 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'
        }`}
      >
        {rows.map((item, idx) => {
          const rev = Number(item.revenue) || 0;
          const pat = Number(item.profit) || 0;
          const revHeight = Math.max(Math.round((rev / maxVal) * 140), 12);
          const patHeight = pat > 0 ? Math.max(Math.round((pat / maxVal) * 140), 10) : 6;

          return (
            <div key={idx} className="flex flex-col items-center justify-end space-y-2">
              <div className="flex items-end justify-center gap-2 sm:gap-3 h-40 w-full">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] sm:text-xs font-bold text-teal-800 mb-1">
                    {rev.toLocaleString('en-IN')}
                  </span>
                  <div
                    style={{ height: `${revHeight}px` }}
                    className="w-7 sm:w-10 bg-teal-600 rounded-t-md transition-all"
                  />
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-[10px] sm:text-xs font-bold text-emerald-800 mb-1">
                    {pat.toLocaleString('en-IN')}
                  </span>
                  <div
                    style={{ height: `${patHeight}px` }}
                    className={`w-7 sm:w-10 rounded-t-md transition-all ${
                      pat >= 0 ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  />
                </div>
              </div>
              <span className="text-xs sm:text-sm font-extrabold text-slate-800 border-t border-slate-200 w-full text-center pt-1.5">
                {item.year}
              </span>
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-xs sm:text-sm text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
              <th className="py-2.5 px-4 font-bold">Metric ({unit})</th>
              {rows.map((r, i) => (
                <th key={i} className="py-2.5 px-4 font-bold text-right">
                  {r.year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.some((r) => r.assets != null && Number(r.assets) > 0) && (
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-700">Assets</td>
                {rows.map((r, i) => (
                  <td key={i} className="py-2.5 px-4 text-right text-slate-800">
                    {Number(r.assets || 0) > 0 ? Number(r.assets).toLocaleString('en-IN') : '—'}
                  </td>
                ))}
              </tr>
            )}
            <tr>
              <td className="py-2.5 px-4 font-semibold text-slate-700">Total Revenue</td>
              {rows.map((r, i) => (
                <td key={i} className="py-2.5 px-4 text-right font-semibold text-slate-900">
                  {Number(r.revenue || 0).toLocaleString('en-IN')}
                </td>
              ))}
            </tr>
            <tr className="bg-slate-50/70">
              <td className="py-2.5 px-4 font-semibold text-slate-700">Profit After Tax (PAT)</td>
              {rows.map((r, i) => (
                <td
                  key={i}
                  className={`py-2.5 px-4 text-right font-bold ${
                    Number(r.profit || 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {Number(r.profit || 0).toLocaleString('en-IN')}
                </td>
              ))}
            </tr>
            {rows.some((r) => Number(r.net_worth || 0) > 0) && (
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-700">Net Worth</td>
                {rows.map((r, i) => (
                  <td key={i} className="py-2.5 px-4 text-right text-slate-800">
                    {Number(r.net_worth || 0) > 0 ? Number(r.net_worth).toLocaleString('en-IN') : '—'}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function triggerDirectPdfDownload(ipo) {
  const pdfUrl = ipo.rhp_url || ipo.drhp_url || '';
  const fallbackDocUrl =
    pdfUrl ||
    'https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=3&ssid=15&smid=10';

  const link = document.createElement('a');
  link.href = fallbackDocUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  if (pdfUrl) {
    link.setAttribute('download', `${ipo.slug || 'ipo'}-drhp-rhp.pdf`);
  }
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function IpoTabsClient({
  ipo,
  gmpHistory = [],
  externalTab = null,
  onClearExternalTab = null,
}) {
  const [activeTab, setActiveTab] = useState(externalTab || 'details');

  useEffect(() => {
    if (externalTab) {
      setActiveTab(externalTab);
    }
  }, [externalTab]);

  const lowerPrice = Number(ipo.issue_price_min ?? ipo.price_min ?? 0);
  const upperPrice = Number(ipo.issue_price_max ?? ipo.price_max ?? 0);
  const lotSize = Number(ipo.lot_size) || 0;
  const gmp = Number(ipo.gmp_price) || 0;
  const pdfUrl = ipo.rhp_url || ipo.drhp_url || '';

  const aiBlogParagraphs = ipo.ai_blog_hindi
    ? ipo.ai_blog_hindi.split(/\n\n+/).filter((p) => p.trim().length > 0)
    : [];

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    if (onClearExternalTab && tabId === 'details') {
      onClearExternalTab();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {activeTab !== 'details' && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 bg-teal-50/70 border-b border-teal-200">
          <span className="text-xs sm:text-sm font-bold text-teal-900 uppercase tracking-wide">
            Active View: {activeTab}
          </span>
          <button
            onClick={() => handleSelectTab('details')}
            className="text-xs font-bold bg-white text-teal-800 border border-teal-300 px-3 py-1 rounded-lg hover:bg-teal-100 cursor-pointer"
          >
            ← Back to Full IPO Details &amp; Financials
          </button>
        </div>
      )}

      <div className="p-5 sm:p-6">
        {activeTab === 'details' && (
          <div className="space-y-8">
            <article className="space-y-4 text-sm sm:text-[15px] leading-7 text-slate-800">
              <h2 className="text-base sm:text-xl font-extrabold text-slate-900 border-b border-slate-200 pb-3">
                {ipo.company_name} IPO — विस्तृत जानकारी और विश्लेषण
              </h2>

              {aiBlogParagraphs.length > 0 ? (
                aiBlogParagraphs.map((para, idx) => (
                  <p key={idx} className="text-slate-800">
                    {para}
                  </p>
                ))
              ) : (
                <>
                  <p>
                    <strong>{ipo.company_name} IPO</strong> भारतीय शेयर बाजार के{' '}
                    <strong>{ipo.category || 'Mainboard'}</strong> सेगमेंट में एक प्रमुख पब्लिक इश्यू है। इस इश्यू का
                    प्राइस बैंड <strong>₹{lowerPrice} से ₹{upperPrice} प्रति शेयर</strong> तय किया गया है, और यह{' '}
                    <strong>{formatShortDate(ipo.open_date)}</strong> से{' '}
                    <strong>{formatShortDate(ipo.close_date)}</strong> तक खुला रहेगा।
                  </p>
                  <p>
                    निवेशक निर्धारित लॉट साइज़ के अनुसार आवेदन कर सकते हैं। इश्यू से प्राप्त राशि का उपयोग कंपनी के
                    कारोबार विस्तार, कार्यशील पूंजी और सामान्य कॉर्पोरेट जरूरतों में किया जाएगा। निवेश से पहले
                    कंपनी के वित्तीय विवरण और जोखिम कारकों का आकलन अवश्य करें।
                  </p>
                </>
              )}
            </article>

            <FinancialsBox companyName={ipo.company_name} financials={ipo.financials_json} />
          </div>
        )}

        {activeTab === 'gmp' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              {ipo.company_name} IPO GMP
            </h2>
            <p className="text-sm text-slate-600">
              Upper price band ₹{upperPrice} के आधार पर लाइव GMP <strong>₹{gmp}</strong> और अनुमानित लिस्टिंग कीमत{' '}
              <strong>₹{upperPrice + gmp}</strong> है।
            </p>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                    <th className="py-2.5 px-4 font-bold">Date</th>
                    <th className="py-2.5 px-4 font-bold">IPO Price</th>
                    <th className="py-2.5 px-4 font-bold">GMP</th>
                    <th className="py-2.5 px-4 font-bold">Est. Listing Price</th>
                    <th className="py-2.5 px-4 font-bold">Est. Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {gmpHistory.length > 0 ? (
                    gmpHistory.map((row, i) => {
                      const rowGmp = Number(row.gmp_price) || 0;
                      const est = upperPrice + rowGmp;
                      return (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-medium">
                            {formatShortDate(row.gmp_date || row.recorded_date)}
                          </td>
                          <td className="py-2.5 px-4">₹{upperPrice}</td>
                          <td className="py-2.5 px-4 font-bold text-emerald-700">₹{rowGmp}</td>
                          <td className="py-2.5 px-4">₹{est}</td>
                          <td className="py-2.5 px-4 font-semibold">
                            {lotSize > 0 ? `₹${(rowGmp * lotSize).toLocaleString('en-IN')}` : '—'}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="py-2.5 px-4 font-medium">Live</td>
                      <td className="py-2.5 px-4">₹{upperPrice}</td>
                      <td className="py-2.5 px-4 font-bold text-emerald-700">₹{gmp}</td>
                      <td className="py-2.5 px-4">₹{upperPrice + gmp}</td>
                      <td className="py-2.5 px-4 font-semibold">
                        {lotSize > 0 ? `₹${(gmp * lotSize).toLocaleString('en-IN')}` : '—'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'subscription' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              {ipo.company_name} IPO Live Subscription
            </h2>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                    <th className="py-2.5 px-4 font-bold">Investor Category</th>
                    <th className="py-2.5 px-4 font-bold text-right">Subscription</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-2.5 px-4 font-medium">QIB</td>
                    <td className="py-2.5 px-4 text-right font-semibold">
                      {Number(ipo.qib_sub || 0).toFixed(2)}x
                    </td>
                  </tr>
                  <tr className="bg-slate-50/70">
                    <td className="py-2.5 px-4 font-medium">NII / HNI</td>
                    <td className="py-2.5 px-4 text-right font-semibold">
                      {Number(ipo.nii_sub || 0).toFixed(2)}x
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium">Retail</td>
                    <td className="py-2.5 px-4 text-right font-semibold">
                      {Number(ipo.retail_sub || 0).toFixed(2)}x
                    </td>
                  </tr>
                  <tr className="bg-emerald-50 font-bold text-emerald-900">
                    <td className="py-2.5 px-4">Total Subscription</td>
                    <td className="py-2.5 px-4 text-right">{Number(ipo.total_sub || 0).toFixed(2)}x</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'drhp' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {ipo.company_name} DRHP / RHP PDF
                </h2>
                <p className="text-xs sm:text-sm text-slate-600">
                  आधिकारिक ऑफर दस्तावेज़ डाउनलोड करें या नीचे पढ़ें।
                </p>
              </div>
              <button
                onClick={() => triggerDirectPdfDownload(ipo)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-bold rounded-lg shadow-sm shrink-0 cursor-pointer"
              >
                Download PDF ⬇
              </button>
            </div>

            {pdfUrl ? (
              <div className="w-full h-[600px] border border-slate-300 rounded-xl overflow-hidden bg-slate-100">
                <iframe
                  src={`https://docs.google.com/gview?url=${encodeURIComponent(pdfUrl)}&embedded=true`}
                  title={`${ipo.company_name} DRHP/RHP Document`}
                  className="w-full h-full border-0"
                />
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
                <p className="text-sm text-slate-700">
                  सीधा PDF लिंक उपलब्ध होते ही यहाँ दिखेगा। आप SEBI या NSE पोर्टल से भी दस्तावेज़ देख सकते हैं:
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=3&ssid=15&smid=10"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-slate-900 text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-slate-800"
                  >
                    SEBI Filings
                  </a>
                  <a
                    href="https://www.nseindia.com/market-data/all-upcoming-issues-ipo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-teal-700 text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-teal-800"
                  >
                    NSE IPO Documents
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'allotment' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              {ipo.company_name} IPO Allotment Status
            </h2>
            <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-700">
              <li>आधिकारिक रजिस्ट्रार की वेबसाइट खोलें।</li>
              <li>सूची से <strong>{ipo.company_name}</strong> चुनें।</li>
              <li>PAN Number, Application Number या DP/Client ID दर्ज करें।</li>
              <li>Submit करके अपना अलॉटमेंट स्टेटस देखें।</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
