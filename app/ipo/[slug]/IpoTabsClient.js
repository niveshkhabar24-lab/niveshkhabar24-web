'use client';

import { useState } from 'react';

function formatShortDate(dateStr) {
  if (!dateStr) return 'Announced Soon';
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 'Announced Soon';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function FinancialsChartSection({ companyName, financials }) {
  const rows = financials && Array.isArray(financials.rows) ? financials.rows : [];
  const unit = financials?.unit || '₹ Crore';

  if (rows.length === 0) {
    return (
      <section className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2">
        <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
          📊 {companyName} — Financial Performance (Revenue &amp; Profit)
        </h3>
        <p className="text-xs sm:text-sm text-slate-600">
          इस कंपनी के वित्तीय वर्षों के राजस्व (Revenue) और शुद्ध मुनाफ़े (PAT) के आंकड़े RHP/DRHP फाइलिंग से
          अपडेट किए जा रहे हैं।
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
            📊 {companyName} — Revenue &amp; Profit ({unit})
          </h3>
          <p className="text-xs text-slate-500">
            RHP / DRHP ऑफर दस्तावेज़ के अनुसार कंपनी की वित्तीय प्रगति
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-teal-800">
            <span className="w-3 h-3 rounded-xs bg-teal-600 inline-block" /> Total Revenue
          </span>
          <span className="flex items-center gap-1.5 text-emerald-800">
            <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block" /> Profit After Tax (PAT)
          </span>
        </div>
      </div>

      {/* Visual Bar Chart */}
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
                {/* Revenue Bar */}
                <div className="flex flex-col items-center">
                  <span className="text-[10px] sm:text-xs font-bold text-teal-800 mb-1">
                    {rev.toLocaleString('en-IN')}
                  </span>
                  <div
                    style={{ height: `${revHeight}px` }}
                    className="w-7 sm:w-10 bg-teal-600 rounded-t-md transition-all"
                  />
                </div>

                {/* Profit Bar */}
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

      {/* Financial Data Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-xs sm:text-sm text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
              <th className="py-2.5 px-4 font-bold">Financial Metric ({unit})</th>
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
              <td className="py-2.5 px-4 font-semibold text-slate-700">Total Revenue / Income</td>
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

export default function IpoTabsClient({ ipo, gmpHistory = [] }) {
  const [activeTab, setActiveTab] = useState('overview');

  const lowerPrice = Number(ipo.issue_price_min ?? ipo.price_min ?? 0);
  const upperPrice = Number(ipo.issue_price_max ?? ipo.price_max ?? 0);
  const lotSize = Number(ipo.lot_size) || 0;
  const gmp = Number(ipo.gmp_price) || 0;

  const pdfUrl = ipo.rhp_url || ipo.drhp_url || '';
  const hasDirectPdf = Boolean(pdfUrl);

  const aiBlogParagraphs = ipo.ai_blog_hindi
    ? ipo.ai_blog_hindi.split(/\n\n+/).filter((p) => p.trim().length > 0)
    : [];

  const prosList = ipo.pros_list
    ? ipo.pros_list.split('|').map((s) => s.trim()).filter(Boolean)
    : [
        `${ipo.category || 'Mainboard'} सेगमेंट में कंपनी की मज़बूत बाज़ार स्थिति और विस्तार की क्षमता।`,
        'स्थापित ग्राहक आधार और अनुभवी प्रमोटर टीम कंपनी के दीर्घकालिक विकास को सहारा देती है।',
        'उद्योग में बढ़ती मांग के कारण आगामी वित्तीय वर्षों में राजस्व वृद्धि की संभावना।',
        'संतुलित पूंजी संरचना और स्पष्ट व्यवसाय विस्तार योजना।',
        gmp > 0
          ? `ग्रे मार्केट में +₹${gmp} का सकारात्मक प्रीमियम शुरुआती लिस्टिंग गेन का संकेत दे रहा है।`
          : 'रिटेल निवेशकों के लिए न्यूनतम 1 लॉट की सुलभ निवेश सीमा उपलब्ध है।',
      ];

  const consList = ipo.cons_list
    ? ipo.cons_list.split('|').map((s) => s.trim()).filter(Boolean)
    : [
        'कच्चे माल की लागत में उतार-चढ़ाव कंपनी के ऑपरेटिंग मार्जिन पर दबाव डाल सकता है।',
        'उद्योग में घरेलू और अंतरराष्ट्रीय कंपनियों की बढ़ती प्रतिस्पर्धा से प्राइसिंग पावर सीमित हो सकती है।',
        'कंपनी का व्यवसाय सरकारी नीतियों और समग्र आर्थिक चक्रों के प्रति संवेदनशील है।',
        'कार्यशील पूंजी की अधिक आवश्यकता के कारण नकदी प्रवाह में अस्थायी उतार-चढ़ाव संभव है।',
        gmp <= 0
          ? 'अभी ग्रे मार्केट प्रीमियम (GMP) शांत है, इसलिए आखिरी दिन के QIB सब्सक्रिप्शन का इंतज़ार करें।'
          : 'लिस्टिंग के दिन मुनाफ़ावसूली (Profit Booking) के कारण शुरुआती उतार-चढ़ाव संभव है।',
      ];

  const tabs = [
    { id: 'overview', label: '1. Overview & Complete Flow' },
    { id: 'subscription', label: '2. Live Subscription' },
    { id: 'gmp', label: '3. Live GMP History' },
    { id: 'drhp', label: '4. DRHP / RHP PDF' },
    { id: 'review', label: '5. Review (Apply/Avoid)' },
    { id: 'allotment', label: '6. Allotment Status' },
    { id: 'faq', label: '7. Hindi FAQs' },
  ];

  const subscriptionBlock = (
    <section className="space-y-3">
      <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
        📈 {ipo.company_name} IPO Live Subscription Status
      </h3>
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-xs sm:text-sm text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
              <th className="py-2.5 px-4 font-bold">Investor Category</th>
              <th className="py-2.5 px-4 font-bold text-right">Subscription (Times)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            <tr>
              <td className="py-2.5 px-4 font-medium">Qualified Institutional Buyers (QIB)</td>
              <td className="py-2.5 px-4 text-right font-semibold">
                {Number(ipo.qib_sub || 0).toFixed(2)}x
              </td>
            </tr>
            <tr className="bg-slate-50/70">
              <td className="py-2.5 px-4 font-medium">Non-Institutional Investors (NII / HNI)</td>
              <td className="py-2.5 px-4 text-right font-semibold">
                {Number(ipo.nii_sub || 0).toFixed(2)}x
              </td>
            </tr>
            <tr>
              <td className="py-2.5 px-4 font-medium">Retail Individual Investors (RII)</td>
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
    </section>
  );

  const gmpHistoryBlock = (
    <section className="space-y-3">
      <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
        💹 {ipo.company_name} GMP Today — Date-Wise Grey Market Premium
      </h3>
      <p className="text-xs sm:text-sm text-slate-600">
        ऊपरी प्राइस बैंड ₹{upperPrice} के हिसाब से आज का लाइव GMP <strong>₹{gmp}</strong> है, जिससे अनुमानित
        लिस्टिंग कीमत <strong>₹{upperPrice + gmp}</strong> (
        {upperPrice > 0 ? `${((gmp / upperPrice) * 100).toFixed(2)}%` : '0.00%'}) बनती है।
      </p>
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-xs sm:text-sm text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
              <th className="py-2.5 px-4 font-bold">Date</th>
              <th className="py-2.5 px-4 font-bold">IPO Price</th>
              <th className="py-2.5 px-4 font-bold">Live GMP</th>
              <th className="py-2.5 px-4 font-bold">Est. Listing Price</th>
              <th className="py-2.5 px-4 font-bold">Est. Profit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {gmpHistory.length > 0 ? (
              gmpHistory.map((row, i) => {
                const rowGmp = Number(row.gmp_price) || 0;
                const est = upperPrice + rowGmp;
                const pct = upperPrice > 0 ? ((rowGmp / upperPrice) * 100).toFixed(2) : '0.00';
                return (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-medium">
                      {formatShortDate(row.gmp_date || row.recorded_date)}
                    </td>
                    <td className="py-2.5 px-4">₹{upperPrice}</td>
                    <td className="py-2.5 px-4 font-bold text-emerald-700">+₹{rowGmp}</td>
                    <td className="py-2.5 px-4">
                      ₹{est} ({pct}%)
                    </td>
                    <td className="py-2.5 px-4 font-semibold">
                      {lotSize > 0 ? `₹${(rowGmp * lotSize).toLocaleString('en-IN')}` : '—'}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="py-2.5 px-4 font-medium">Today (Live)</td>
                <td className="py-2.5 px-4">₹{upperPrice}</td>
                <td className="py-2.5 px-4 font-bold text-emerald-700">+₹{gmp}</td>
                <td className="py-2.5 px-4">
                  ₹{upperPrice + gmp} ({upperPrice > 0 ? `${((gmp / upperPrice) * 100).toFixed(2)}%` : '0.00%'})
                </td>
                <td className="py-2.5 px-4 font-semibold">
                  {lotSize > 0 ? `₹${(gmp * lotSize).toLocaleString('en-IN')}` : '—'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  const prosAndConsBlock = (
    <section className="space-y-4">
      <div>
        <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
          ⚖️ {ipo.company_name} IPO Pros &amp; Cons (सकारात्मक पक्ष और जोखिम)
        </h3>
        <p className="text-xs sm:text-sm text-slate-600">
          DRHP/RHP दस्तावेज़, कंपनी के वित्तीय प्रदर्शन और ग्रे मार्केट संकेतों के आधार पर विस्तृत आकलन:
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 sm:p-5 space-y-2.5">
          <h4 className="text-sm sm:text-base font-bold text-emerald-900 flex items-center gap-2">
            <span>✅</span> Key Strengths (Pros / ताकत)
          </h4>
          <ul className="space-y-2 text-xs sm:text-sm text-emerald-950 list-disc pl-5">
            {prosList.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-4 sm:p-5 space-y-2.5">
          <h4 className="text-sm sm:text-base font-bold text-rose-900 flex items-center gap-2">
            <span>⚠️</span> Key Risks (Cons / जोखिम)
          </h4>
          <ul className="space-y-2 text-xs sm:text-sm text-rose-950 list-disc pl-5">
            {consList.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );

  const allotmentBlock = (
    <section className="space-y-3">
      <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
        🧾 {ipo.company_name} IPO Allotment Status कैसे चेक करें?
      </h3>
      <ol className="list-decimal pl-5 space-y-2 text-xs sm:text-sm text-slate-700">
        <li>
          आधिकारिक रजिस्ट्रार (<strong>Link Intime / KFinTech / Bigshare</strong>) की वेबसाइट पर जाएं।
        </li>
        <li>
          ड्रॉपडाउन सूची से <strong>{ipo.company_name}</strong> चुनें।
        </li>
        <li>
          अपना <strong>PAN Number</strong>, Application Number या DP/Client ID दर्ज करें।
        </li>
        <li>
          <strong>Submit</strong> पर क्लिक करते ही आपका अलॉटमेंट स्टेटस स्क्रीन पर दिख जाएगा।
        </li>
      </ol>
    </section>
  );

  const faqBlock = (
    <section className="space-y-3 text-xs sm:text-sm text-slate-800">
      <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
        ❓ {ipo.company_name} IPO — अक्सर पूछे जाने वाले सवाल (FAQs)
      </h3>
      <div className="border-b border-slate-200 pb-3">
        <p className="font-bold text-slate-900">
          Q1. {ipo.company_name} IPO का आज का GMP क्या है?
        </p>
        <p className="mt-1">
          आज {ipo.company_name} IPO का लाइव GMP <strong>₹{gmp}</strong> चल रहा है।
        </p>
      </div>
      <div className="border-b border-slate-200 pb-3">
        <p className="font-bold text-slate-900">
          Q2. {ipo.company_name} IPO का प्राइस बैंड और लॉट साइज़ क्या है?
        </p>
        <p className="mt-1">
          इसका प्राइस बैंड ₹{lowerPrice} - ₹{upperPrice} प्रति शेयर है और 1 लॉट में{' '}
          {lotSize > 0 ? `${lotSize} शेयर` : 'निर्धारित शेयर'} हैं।
        </p>
      </div>
      <div>
        <p className="font-bold text-slate-900">
          Q3. {ipo.company_name} IPO की अलॉटमेंट और लिस्टिंग तारीख़ क्या है?
        </p>
        <p className="mt-1">
          अलॉटमेंट <strong>{formatShortDate(ipo.allotment_date)}</strong> को और लिस्टिंग{' '}
          <strong>{formatShortDate(ipo.listing_date)}</strong> को प्रस्तावित है।
        </p>
      </div>
    </section>
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 p-4 bg-slate-50 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-teal-700 text-white shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-teal-50 hover:text-teal-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content Area */}
      <div className="p-5 sm:p-6">
        {/* TAB 1: FULL ORDERED FLOW (Blog -> Subscription -> GMP History -> Financials -> Pros/Cons -> Allotment -> FAQs) */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <article className="space-y-4 text-sm sm:text-[15px] leading-7 text-slate-800">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200 pb-3">
                <h2 className="text-base sm:text-xl font-extrabold text-slate-900">
                  {ipo.company_name} IPO की संपूर्ण जानकारी और DRHP विश्लेषण (हिंदी में)
                </h2>
                <button
                  onClick={() => setActiveTab('drhp')}
                  className="text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 px-3 py-1 rounded-full hover:bg-teal-100 cursor-pointer"
                >
                  DRHP / RHP PDF देखें
                </button>
              </div>

              {aiBlogParagraphs.length > 0 ? (
                aiBlogParagraphs.map((para, idx) => (
                  <p key={idx} className="text-slate-800">
                    {para}
                  </p>
                ))
              ) : (
                <>
                  <p>
                    भारतीय शेयर बाजार में निवेश करने वाले खुदरा और संस्थागत निवेशकों के लिए{' '}
                    <strong>{ipo.company_name} IPO</strong> एक महत्वपूर्ण अवसर बनकर आया है। यह एक{' '}
                    <strong>{ipo.category || 'Mainboard'}</strong> श्रेणी का पब्लिक इश्यू है, जिसका मूल्य दायरा
                    (Price Band) <strong>₹{lowerPrice} से ₹{upperPrice} प्रति शेयर</strong> तय किया गया है। यह
                    इश्यू <strong>{formatShortDate(ipo.open_date)}</strong> को बोली लगाने के लिए खुलेगा और{' '}
                    <strong>{formatShortDate(ipo.close_date)}</strong> को बंद होगा।
                  </p>
                  <p>
                    <strong>लॉट साइज़ और न्यूनतम निवेश:</strong> रिटेल निवेशकों को इस आईपीओ में आवेदन करने के लिए
                    कम से कम कंपनी द्वारा निर्धारित न्यूनतम 1 लॉट के लिए बोली लगानी होगी। इस पब्लिक इश्यू से जुटाई गई
                    राशि का उपयोग कंपनी अपने कारोबार के विस्तार, कार्यशील पूंजी (Working Capital) की ज़रूरतों को पूरा
                    करने और सामान्य कॉर्पोरेट उद्देश्यों के लिए करेगी।
                  </p>
                </>
              )}
            </article>

            {subscriptionBlock}
            {gmpHistoryBlock}
            <FinancialsChartSection companyName={ipo.company_name} financials={ipo.financials_json} />
            {prosAndConsBlock}
            {allotmentBlock}
            {faqBlock}
          </div>
        )}

        {/* TAB 2: LIVE SUBSCRIPTION */}
        {activeTab === 'subscription' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              {ipo.company_name} IPO Live Subscription Status (Day-Wise)
            </h2>
            {subscriptionBlock}
          </div>
        )}

        {/* TAB 3: LIVE GMP HISTORY */}
        {activeTab === 'gmp' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              {ipo.company_name} GMP Today — Date-Wise Grey Market Premium
            </h2>
            {gmpHistoryBlock}
          </div>
        )}

        {/* TAB 4: EMBEDDED DRHP / RHP PDF VIEWER & DOWNLOAD */}
        {activeTab === 'drhp' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {ipo.company_name} DRHP &amp; RHP Offer Document (PDF)
                </h2>
                <p className="text-xs sm:text-sm text-slate-600">
                  कंपनी के वित्तीय आंकड़े, प्रमोटर होल्डिंग, बिज़नेस मॉडल और रिस्क फैक्टर्स की आधिकारिक जानकारी के लिए
                  नीचे RHP/DRHP दस्तावेज़ पढ़ें या डाउनलोड करें।
                </p>
              </div>

              {hasDirectPdf && (
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-bold rounded-lg shadow-sm shrink-0"
                >
                  Download Official PDF ⬇
                </a>
              )}
            </div>

            {hasDirectPdf ? (
              <div className="space-y-3">
                <div className="w-full h-[600px] border border-slate-300 rounded-xl overflow-hidden bg-slate-100">
                  <iframe
                    src={`https://docs.google.com/gview?url=${encodeURIComponent(pdfUrl)}&embedded=true`}
                    title={`${ipo.company_name} DRHP/RHP Document`}
                    className="w-full h-full border-0"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
                <p className="text-sm text-amber-900 font-medium">
                  इस IPO का सीधा PDF लिंक एक्सचेंज से सिंक हो रहा है। आप नीचे दिए गए आधिकारिक SEBI या NSE पोर्टल से
                  इसका DRHP / RHP तुरंत डाउनलोड कर सकते हैं:
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=3&ssid=15&smid=10"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-slate-900 text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-slate-800"
                  >
                    SEBI Official DRHP Filings ↗
                  </a>
                  <a
                    href="https://www.nseindia.com/market-data/all-upcoming-issues-ipo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-teal-700 text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-teal-800"
                  >
                    NSE Offer Documents ↗
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: REVIEW WITH PROS, CONS & FINANCIALS */}
        {activeTab === 'review' && (
          <div className="space-y-6">
            {prosAndConsBlock}
            <FinancialsChartSection companyName={ipo.company_name} financials={ipo.financials_json} />
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs sm:text-sm text-slate-700">
              <strong>निष्कर्ष:</strong> यदि आखिरी दिन QIB और NII वर्ग से मज़बूत मांग आती है और GMP में स्थिरता बनी
              रहती है, तो लिस्टिंग गेन के लिए आवेदन पर विचार किया जा सकता है। निवेश से पहले अपना जोखिम आकलन अवश्य करें।
            </div>
          </div>
        )}

        {/* TAB 6: ALLOTMENT STATUS */}
        {activeTab === 'allotment' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              {ipo.company_name} IPO Allotment Status
            </h2>
            {allotmentBlock}
          </div>
        )}

        {/* TAB 7: HINDI FAQS */}
        {activeTab === 'faq' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              {ipo.company_name} IPO FAQs
            </h2>
            {faqBlock}
          </div>
        )}
      </div>
    </div>
  );
}
