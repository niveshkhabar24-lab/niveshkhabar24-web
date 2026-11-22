'use client';

import { useState } from 'react';

function formatShortDate(dateStr) {
  if (!dateStr) return 'Announced Soon';
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 'Announced Soon';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export default function IpoTabsClient({ ipo, gmpHistory = [] }) {
  const [activeTab, setActiveTab] = useState('overview');

  const lowerPrice = Number(ipo.price_min) || 0;
  const upperPrice = Number(ipo.price_max) || 0;
  const lotSize = Number(ipo.lot_size) || 0;
  const gmp = Number(ipo.gmp_price) || 0;
  const issueSize = Number(ipo.issue_size_cr) || 0;
  const minInvestment = upperPrice > 0 && lotSize > 0 ? upperPrice * lotSize : 0;

  // PDF URL (RHP ko priority, warna DRHP)
  const pdfUrl = ipo.rhp_url || ipo.drhp_url || '';
  const hasDirectPdf = Boolean(pdfUrl);

  // Unique AI/PDF Blog Paragraphs
  const aiBlogParagraphs = ipo.ai_blog_hindi
    ? ipo.ai_blog_hindi.split(/\n\n+/).filter((p) => p.trim().length > 0)
    : [];

  // Dynamic Pros & Cons Lists
  const prosList = ipo.pros_list
    ? ipo.pros_list.split('|').map((s) => s.trim()).filter(Boolean)
    : [
        `${ipo.category || 'Mainboard'} सेगमेंट में कंपनी की मज़बूत बाज़ार स्थिति और विस्तार की क्षमता।`,
        gmp > 0
          ? `ग्रे मार्केट में +₹${gmp} का सकारात्मक प्रीमियम शुरुआती लिस्टिंग गेन का संकेत दे रहा है।`
          : 'दीर्घकालिक निवेशकों के लिए कंपनी के बिज़नेस मॉडल और वित्तीय परिणामों का अध्ययन महत्वपूर्ण है।',
      ];

  const consList = ipo.cons_list
    ? ipo.cons_list.split('|').map((s) => s.trim()).filter(Boolean)
    : [
        'बाज़ार में अस्थिरता और सेक्टर प्रतिस्पर्धा से कंपनी के मार्जिन पर असर पड़ सकता है।',
        gmp <= 0
          ? 'अभी ग्रे मार्केट प्रीमियम (GMP) शांत है, इसलिए आखिरी दिन के QIB सब्सक्रिप्शन का इंतज़ार करें।'
          : 'लिस्टिंग के दिन मुनाफ़ावसूली (Profit Booking) के कारण शुरुआती उतार-चढ़ाव संभव है।',
      ];

  const tabs = [
    { id: 'overview', label: '1. Overview & Hindi Blog' },
    { id: 'gmp', label: '2. Live GMP History' },
    { id: 'subscription', label: '3. Live Subscription' },
    { id: 'drhp', label: '4. DRHP / RHP PDF' },
    { id: 'review', label: '5. Review (Apply/Avoid)' },
    { id: 'allotment', label: '6. Allotment Status' },
    { id: 'faq', label: '7. Hindi FAQs' },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
        {/* TAB 1: OVERVIEW & UNIQUE HINDI BLOG */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-3">
                {ipo.company_name} IPO Dates &amp; Issue Details
              </h2>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm text-left border-collapse">
                  <tbody className="divide-y divide-slate-200">
                    <tr className="bg-slate-50/70">
                      <td className="py-2.5 px-4 font-semibold text-slate-700 w-1/2">IPO Open Date</td>
                      <td className="py-2.5 px-4 text-slate-900">{formatShortDate(ipo.open_date)}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-slate-700">IPO Close Date</td>
                      <td className="py-2.5 px-4 text-slate-900">{formatShortDate(ipo.close_date)}</td>
                    </tr>
                    <tr className="bg-slate-50/70">
                      <td className="py-2.5 px-4 font-semibold text-slate-700">Allotment Date</td>
                      <td className="py-2.5 px-4 text-slate-900">{formatShortDate(ipo.allotment_date)}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-slate-700">Listing Date</td>
                      <td className="py-2.5 px-4 text-slate-900">{formatShortDate(ipo.listing_date)}</td>
                    </tr>
                    <tr className="bg-slate-50/70">
                      <td className="py-2.5 px-4 font-semibold text-slate-700">Issue Price Band</td>
                      <td className="py-2.5 px-4 text-slate-900">
                        {upperPrice > 0 ? `₹${lowerPrice} - ₹${upperPrice} per share` : 'Announced Soon'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-slate-700">Lot Size &amp; Min Investment</td>
                      <td className="py-2.5 px-4 text-slate-900">
                        {lotSize > 0
                          ? `${lotSize} Shares (${minInvestment > 0 ? `₹${minInvestment.toLocaleString('en-IN')}` : 'TBA'})`
                          : 'Announced Soon'}
                      </td>
                    </tr>
                    <tr className="bg-slate-50/70">
                      <td className="py-2.5 px-4 font-semibold text-slate-700">Total Issue Size</td>
                      <td className="py-2.5 px-4 text-slate-900">
                        {issueSize > 0 ? `₹${issueSize.toLocaleString('en-IN')} Crore` : 'Announced Soon'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-semibold text-slate-700">IPO Category / Documents</td>
                      <td className="py-2.5 px-4 text-slate-900 flex flex-wrap items-center gap-2">
                        <span>{ipo.category || 'Mainboard'}</span>
                        {hasDirectPdf && (
                          <button
                            onClick={() => setActiveTab('drhp')}
                            className="text-xs font-semibold text-teal-700 underline hover:text-teal-900 cursor-pointer"
                          >
                            | DRHP / RHP PDF देखें
                          </button>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Unique PDF-Analyzed Hindi Article */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3 text-sm leading-relaxed text-slate-800">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {ipo.company_name} IPO की पूरी जानकारी और DRHP विश्लेषण (हिंदी में)
                </h2>
                {hasDirectPdf && (
                  <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                    Verified from Official Prospectus
                  </span>
                )}
              </div>

              {aiBlogParagraphs.length > 0 ? (
                aiBlogParagraphs.map((para, idx) => <p key={idx}>{para}</p>)
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
            </div>
          </div>
        )}

        {/* TAB 2: LIVE GMP HISTORY */}
        {activeTab === 'gmp' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              {ipo.company_name} GMP Today — Date-Wise Grey Market Premium
            </h2>
            <p className="text-sm text-slate-600">
              ऊपरी प्राइस बैंड ₹{upperPrice} के हिसाब से आज का लाइव GMP <strong>₹{gmp}</strong> है, जिससे अनुमानित
              लिस्टिंग कीमत <strong>₹{upperPrice + gmp}</strong> (
              {upperPrice > 0 ? `${((gmp / upperPrice) * 100).toFixed(2)}%` : '0.00%'}) बनती है।
            </p>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                    <th className="py-2.5 px-4 font-bold">Date</th>
                    <th className="py-2.5 px-4 font-bold">IPO Price</th>
                    <th className="py-2.5 px-4 font-bold">Live GMP</th>
                    <th className="py-2.5 px-4 font-bold">Est. Listing Price</th>
                    <th className="py-2.5 px-4 font-bold">1 Lot Profit</th>
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
                          <td className="py-2.5 px-4 font-medium">{formatShortDate(row.recorded_date)}</td>
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
          </div>
        )}

        {/* TAB 3: LIVE SUBSCRIPTION */}
        {activeTab === 'subscription' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              {ipo.company_name} IPO Live Subscription Status (Day-Wise)
            </h2>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm text-left border-collapse">
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
                <p className="text-xs text-slate-500">
                  यदि PDF प्रीव्यू लोड होने में समय ले रहा है, तो ऊपर दिए गए{' '}
                  <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-teal-700 underline font-semibold">
                    Download Official PDF
                  </a>{' '}
                  बटन से सीधे अपने फ़ोन या कंप्यूटर में सेव करें।
                </p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
                <p className="text-sm text-amber-900 font-medium">
                  इस IPO का सीधा PDF लिंक एक्सचेंज से सिंक हो रहा है। आप नीचे दिए गए आधिकारिक SEBI या NSE पोर्टल से
                  इसका DRHP / RHP तुरंत डाउनलोड कर सकते हैं:
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href={`https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=3&ssid=15&smid=10`}
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

        {/* TAB 5: REVIEW WITH PROS & CONS */}
        {activeTab === 'review' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">
                {ipo.company_name} IPO Review — Pros &amp; Cons (Apply या Avoid?)
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                DRHP/RHP दस्तावेज़, कंपनी के वित्तीय प्रदर्शन और ग्रे मार्केट संकेतों के आधार पर मुख्य ताकत (Pros) और
                जोखिम (Cons):
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* PROS CARD */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 space-y-2.5">
                <h3 className="text-sm sm:text-base font-bold text-emerald-900 flex items-center gap-2">
                  <span>✅</span> Key Strengths (Pros / सकारात्मक पक्ष)
                </h3>
                <ul className="space-y-2 text-xs sm:text-sm text-emerald-950 list-disc pl-5">
                  {prosList.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* CONS CARD */}
              <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-4 space-y-2.5">
                <h3 className="text-sm sm:text-base font-bold text-rose-900 flex items-center gap-2">
                  <span>⚠️</span> Key Risks (Cons / ध्यान देने योग्य जोखिम)
                </h3>
                <ul className="space-y-2 text-xs sm:text-sm text-rose-950 list-disc pl-5">
                  {consList.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

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
              {ipo.company_name} IPO Allotment Status कैसे चेक करें?
            </h2>
            <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-700">
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
          </div>
        )}

        {/* TAB 7: HINDI FAQS */}
        {activeTab === 'faq' && (
          <div className="space-y-4 text-sm text-slate-800">
            <h2 className="text-lg font-bold text-slate-900">
              {ipo.company_name} IPO — अक्सर पूछे जाने वाले सवाल (FAQs)
            </h2>
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
          </div>
        )}
      </div>
    </div>
  );
}
