'use client';

import { useState } from 'react';

function formatShortDate(dateStr) {
  if (!dateStr) return 'Announced Soon';
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 'Announced Soon';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function ArticleWithReadMore({ companyName, category, lowerPrice, upperPrice, openDate, closeDate, paragraphs }) {
  const [expanded, setExpanded] = useState(false);

  const hasParagraphs = Array.isArray(paragraphs) && paragraphs.length > 0;
  const halfCount = hasParagraphs ? Math.max(1, Math.ceil(paragraphs.length / 2)) : 1;
  const visibleParagraphs = hasParagraphs
    ? expanded
      ? paragraphs
      : paragraphs.slice(0, halfCount)
    : [];

  return (
    <article className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4 text-sm sm:text-[15px] leading-7 text-slate-800 shadow-xs">
      <h2 className="text-base sm:text-xl font-extrabold text-slate-900 border-b border-slate-200 pb-3">
        {companyName} IPO — विस्तृत जानकारी और विश्लेषण
      </h2>

      {hasParagraphs ? (
        <div className="space-y-3">
          {visibleParagraphs.map((para, idx) => (
            <p key={idx} className="text-slate-800">
              {para}
            </p>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <p>
            <strong>{companyName} IPO</strong> भारतीय शेयर बाजार के{' '}
            <strong>{category || 'Mainboard'}</strong> सेगमेंट में एक प्रमुख पब्लिक इश्यू है। इस इश्यू का प्राइस बैंड{' '}
            <strong>₹{lowerPrice} से ₹{upperPrice} प्रति शेयर</strong> तय किया गया है, और यह{' '}
            <strong>{formatShortDate(openDate)}</strong> से <strong>{formatShortDate(closeDate)}</strong> तक खुला
            रहेगा।
          </p>
          {expanded && (
            <p>
              निवेशक निर्धारित लॉट साइज़ के अनुसार आवेदन कर सकते हैं। इश्यू से प्राप्त राशि का उपयोग कंपनी के
              कारोबार विस्तार, कार्यशील पूंजी और सामान्य कॉर्पोरेट जरूरतों में किया जाएगा। निवेश से पहले कंपनी के
              वित्तीय विवरण और जोखिम कारकों का आकलन अवश्य करें।
            </p>
          )}
        </div>
      )}

      <div className="pt-1">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="text-xs sm:text-sm font-bold text-teal-800 hover:text-teal-950 underline underline-offset-4 cursor-pointer"
        >
          {expanded ? 'Show Less ▲' : 'Read More ▼'}
        </button>
      </div>
    </article>
  );
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

export default function IpoTabsClient({
  ipo,
  gmpHistory = [],
  activeTabParam = null,
  basePath = '',
}) {
  const lowerPrice = Number(ipo.issue_price_min ?? ipo.price_min ?? 0);
  const upperPrice = Number(ipo.issue_price_max ?? ipo.price_max ?? 0);
  const lotSize = Number(ipo.lot_size) || 0;
  const gmp = Number(ipo.gmp_price) || 0;
  const estListing = upperPrice + gmp;
  const estGainPct = upperPrice > 0 ? ((gmp / upperPrice) * 100).toFixed(2) : '0.00';
  const estLotProfit = lotSize > 0 ? gmp * lotSize : 0;

  const qibSub = Number(ipo.qib_sub || 0).toFixed(2);
  const niiSub = Number(ipo.nii_sub || 0).toFixed(2);
  const retailSub = Number(ipo.retail_sub || 0).toFixed(2);
  const totalSub = Number(ipo.total_sub || 0).toFixed(2);

  const aiBlogParagraphs = ipo.ai_blog_hindi
    ? ipo.ai_blog_hindi.split(/\n\n+/).filter((p) => p.trim().length > 0)
    : [];

  return (
    <div className="space-y-6">
      {/* DEDICATED TAB VIEW (GMP / Subscription / Allotment) */}
      {activeTabParam && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 bg-teal-50/70 border-b border-teal-200">
            <span className="text-xs sm:text-sm font-bold text-teal-900 uppercase tracking-wide">
              Active Tab View: {activeTabParam}
            </span>
            <a
              href={basePath || `/ipo/${ipo.slug}`}
              className="text-xs font-bold bg-white text-teal-800 border border-teal-300 px-3 py-1 rounded-lg hover:bg-teal-100"
            >
              ← Full Page View
            </a>
          </div>

          <div className="p-5 sm:p-6">
            {activeTabParam === 'gmp' && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                    {ipo.company_name} IPO GMP Summary &amp; History
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    ग्रे मार्केट प्रीमियम (GMP) अनौपचारिक बाजार का एक शुरुआती संकेत मात्र है।
                  </p>
                </div>

                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-2 text-xs sm:text-sm text-slate-800">
                  <p className="font-bold text-emerald-950">GMP Summary:</p>
                  <p>
                    <strong>{ipo.company_name}</strong> ({ipo.category || 'Mainboard'}) का ऊपरी इश्यू प्राइस{' '}
                    <strong>₹{upperPrice}</strong> है। वर्तमान GMP <strong>₹{gmp}</strong> के आधार पर अनुमानित लिस्टिंग
                    कीमत <strong>₹{estListing}</strong> (लगभग <strong>{estGainPct}%</strong>) बनती है, और 1 लॉट (
                    {lotSize > 0 ? `${lotSize} shares` : 'TBA'}) पर संभावित अंतर{' '}
                    <strong>₹{estLotProfit.toLocaleString('en-IN')}</strong> है।
                  </p>
                </div>

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
                          <td className="py-2.5 px-4">₹{estListing}</td>
                          <td className="py-2.5 px-4 font-semibold">
                            {lotSize > 0 ? `₹${estLotProfit.toLocaleString('en-IN')}` : '—'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-1">
                  <p className="font-bold text-slate-800">Dhyan Rakhne Wali Baat:</p>
                  <p>
                    लिस्टिंग के दिन वास्तविक शेयर मूल्य एक्सचेंज की मांग, कुल सब्सक्रिप्शन और बाजार के रुझान पर निर्भर
                    करता है। GMP को निवेश का एकमात्र आधार न मानें।
                  </p>
                </div>
              </div>
            )}

            {activeTabParam === 'subscription' && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                    {ipo.company_name} IPO Subscription Summary
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    विभिन्न निवेशक श्रेणियों में प्राप्त बोलियों (Bids) का संक्षिप्त विवरण।
                  </p>
                </div>

                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-2 text-xs sm:text-sm text-slate-800">
                  <p className="font-bold text-blue-950">Subscription Overview:</p>
                  <p>
                    <strong>{ipo.company_name}</strong> IPO का कुल सब्सक्रिप्शन <strong>{totalSub}x</strong> दर्ज किया
                    गया है। इसमें QIB <strong>{qibSub}x</strong>, NII/HNI <strong>{niiSub}x</strong>, और Retail{' '}
                    <strong>{retailSub}x</strong> स्तर पर है। इश्यू अवधि{' '}
                    <strong>{formatShortDate(ipo.open_date)}</strong> से{' '}
                    <strong>{formatShortDate(ipo.close_date)}</strong> तक निर्धारित है।
                  </p>
                </div>

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
                        <td className="py-2.5 px-4 text-right font-semibold">{qibSub}x</td>
                      </tr>
                      <tr className="bg-slate-50/70">
                        <td className="py-2.5 px-4 font-medium">NII / HNI</td>
                        <td className="py-2.5 px-4 text-right font-semibold">{niiSub}x</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-medium">Retail</td>
                        <td className="py-2.5 px-4 text-right font-semibold">{retailSub}x</td>
                      </tr>
                      <tr className="bg-emerald-50 font-bold text-emerald-900">
                        <td className="py-2.5 px-4">Total Subscription</td>
                        <td className="py-2.5 px-4 text-right">{totalSub}x</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-1">
                  <p className="font-bold text-slate-800">Category Note:</p>
                  <p>
                    आमतौर पर आखिरी दिन के अंतिम घंटों में QIB और NII वर्ग की बोलियां तेजी से अपडेट होती हैं, इसलिए
                    आंकड़ों को समय-समय पर रीफ़्रेश करके देखें।
                  </p>
                </div>
              </div>
            )}

            {activeTabParam === 'allotment' && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                    {ipo.company_name} IPO Allotment Status Summary
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    अलॉटमेंट अंतिम रूप से जारी होने के बाद आप रजिस्ट्रार या एक्सचेंज पोर्टल पर स्थिति जांच सकते हैं।
                  </p>
                </div>

                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-2 text-xs sm:text-sm text-slate-800">
                  <p className="font-bold text-amber-950">Allotment Timeline Summary:</p>
                  <p>
                    <strong>{ipo.company_name}</strong> IPO का इश्यू <strong>{formatShortDate(ipo.close_date)}</strong>{' '}
                    को बंद हुआ/होगा, अलॉटमेंट की संभावित तिथि <strong>{formatShortDate(ipo.allotment_date)}</strong>{' '}
                    है, और लिस्टिंग <strong>{formatShortDate(ipo.listing_date)}</strong> को प्रस्तावित है।
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                  <h3 className="text-sm font-bold text-slate-900">Status Check Karne Ke Kadam:</h3>
                  <ol className="list-decimal pl-5 space-y-2 text-xs sm:text-sm text-slate-700">
                    <li>इश्यू के आधिकारिक रजिस्ट्रार (जैसे Link Intime / KFinTech / Bigshare) की वेबसाइट पर जाएं।</li>
                    <li>कंपनी सूची से <strong>{ipo.company_name}</strong> का चयन करें।</li>
                    <li>अपना <strong>PAN Number</strong>, Application Number या DP/Client ID दर्ज करें।</li>
                    <li>कैप्चा/विवरण भरकर Submit करें और शेयर आवंटन की स्थिति देखें।</li>
                  </ol>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-1">
                  <p className="font-bold text-slate-800">Refund &amp; Demat Credit:</p>
                  <p>
                    जिन आवेदकों को शेयर आवंटित नहीं होते, उनके ASBA/UPI खाते में राशि अनब्लॉक/रिफंड की प्रक्रिया शुरू
                    की जाती है, और सफल आवेदकों के डीमैट खाते में शेयर लिस्टिंग से पहले क्रेडिट किए जाते हैं।
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ARTICLE WITH READ MORE (ALWAYS AVAILABLE, HALF SHOWN BY DEFAULT) */}
      <ArticleWithReadMore
        companyName={ipo.company_name}
        category={ipo.category}
        lowerPrice={lowerPrice}
        upperPrice={upperPrice}
        openDate={ipo.open_date}
        closeDate={ipo.close_date}
        paragraphs={aiBlogParagraphs}
      />

      {/* FINANCIALS ONLY ON MAIN FULL VIEW */}
      {!activeTabParam && (
        <FinancialsBox companyName={ipo.company_name} financials={ipo.financials_json} />
      )}
    </div>
  );
}
