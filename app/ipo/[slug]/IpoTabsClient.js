"use client";

import { useState } from "react";

function formatShortDate(dateStr) {
  if (!dateStr || dateStr === "TBA" || dateStr === "Announced Soon") {
    return "Announced Soon";
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function IpoTabsClient({ ipo, gmpHistory = [] }) {
  const [activeTab, setActiveTab] = useState("overview");

  const upperPrice = Number(ipo.price_max) || 0;
  const lowerPrice = Number(ipo.price_min) || 0;
  const gmp = Number(ipo.gmp_price) || 0;
  const lotSize = Number(ipo.lot_size) || 0;
  const estListing = upperPrice + gmp;
  const gainPct = upperPrice > 0 ? ((gmp / upperPrice) * 100).toFixed(2) : "0.00";
  const oneLotProfit = gmp * lotSize;
  const minInvestment = upperPrice * lotSize;

  const qibSub = Number(ipo.qib_sub || 0).toFixed(2);
  const niiSub = Number(ipo.nii_sub || 0).toFixed(2);
  const retailSub = Number(ipo.retail_sub || 0).toFixed(2);
  const totalSub = Number(ipo.total_sub || 0).toFixed(2);

  const tabs = [
    { id: "overview", label: "1. Overview & Hindi Blog" },
    { id: "gmp", label: "2. Live GMP History" },
    { id: "subscription", label: "3. Live Subscription" },
    { id: "drhp", label: "4. DRHP / RHP PDF" },
    { id: "review", label: "5. Review (Apply/Avoid)" },
    { id: "allotment", label: "6. Allotment Status" },
    { id: "faq", label: "7. Hindi FAQs" },
  ];

  const sebiSearchUrl = `https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=3&ssid=15&smid=10`;
  const nseSearchUrl = `https://www.nseindia.com/market-data/all-upcoming-issues-ipo`;
  const pdfUrl = ipo.drhp_url || ipo.rhp_url || "";

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Tab Navigation Bar */}
      <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
              activeTab === tab.id
                ? "bg-emerald-700 text-white shadow-sm"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-emerald-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-5 sm:p-6">
        {/* TAB 1: OVERVIEW, DATES & 350-WORD DEVANAGARI HINDI BLOG */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3">
                {ipo.company_name} IPO Dates & Issue Details
              </h2>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm text-left">
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <th className="p-3 bg-slate-50 font-semibold text-slate-700 w-1/3">IPO Open Date</th>
                      <td className="p-3 text-slate-900">{formatShortDate(ipo.open_date)}</td>
                    </tr>
                    <tr>
                      <th className="p-3 bg-slate-50 font-semibold text-slate-700">IPO Close Date</th>
                      <td className="p-3 text-slate-900">{formatShortDate(ipo.close_date)}</td>
                    </tr>
                    <tr>
                      <th className="p-3 bg-slate-50 font-semibold text-slate-700">Allotment Date</th>
                      <td className="p-3 text-slate-900">{formatShortDate(ipo.allotment_date)}</td>
                    </tr>
                    <tr>
                      <th className="p-3 bg-slate-50 font-semibold text-slate-700">Listing Date</th>
                      <td className="p-3 text-slate-900">{formatShortDate(ipo.listing_date)}</td>
                    </tr>
                    <tr>
                      <th className="p-3 bg-slate-50 font-semibold text-slate-700">Issue Price Band</th>
                      <td className="p-3 font-semibold text-slate-900">₹{lowerPrice} - ₹{upperPrice} per share</td>
                    </tr>
                    <tr>
                      <th className="p-3 bg-slate-50 font-semibold text-slate-700">Lot Size & Min Investment</th>
                      <td className="p-3 text-slate-900">
                        {lotSize > 0 ? `${lotSize} Shares (₹${minInvestment.toLocaleString("en-IN")})` : "Announced Soon"}
                      </td>
                    </tr>
                    <tr>
                      <th className="p-3 bg-slate-50 font-semibold text-slate-700">Total Issue Size</th>
                      <td className="p-3 text-slate-900">
                        {Number(ipo.issue_size_cr) > 0 ? `₹${ipo.issue_size_cr} Crore` : "Announced Soon"}
                      </td>
                    </tr>
                    <tr>
                      <th className="p-3 bg-slate-50 font-semibold text-slate-700">IPO Category / Registrar</th>
                      <td className="p-3 text-slate-900">
                        {ipo.category || "Mainboard"} | {ipo.registrar_name || "Official Registrar"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 300-400 Words Devanagari Hindi SEO Analysis */}
            <article className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 text-slate-800 leading-relaxed text-sm sm:text-base">
              <h3 className="text-lg font-bold text-slate-900">
                {ipo.company_name} IPO की पूरी जानकारी और विश्लेषण (हिंदी में)
              </h3>
              <p>
                भारतीय शेयर बाज़ार में निवेश करने वाले खुदरा और संस्थागत निवेशकों के लिए{" "}
                <strong>{ipo.company_name} IPO</strong> एक महत्वपूर्ण अवसर बनकर आया है। यह एक{" "}
                <strong>{ipo.category || "Mainboard"}</strong> श्रेणी का पब्लिक इश्यू है, जिसका मूल्य दायरा (Price Band){" "}
                <strong>₹{lowerPrice} से ₹{upperPrice} प्रति शेयर</strong> तय किया गया है। यह इश्यू{" "}
                <strong>{formatShortDate(ipo.open_date)}</strong> को बोली लगाने के लिए खुलेगा और{" "}
                <strong>{formatShortDate(ipo.close_date)}</strong> को बंद होगा।
              </p>
              <p>
                <strong>लॉट साइज़ और न्यूनतम निवेश:</strong> रिटेल निवेशकों को इस आईपीओ में आवेदन करने के लिए कम से कम{" "}
                {lotSize > 0 ? (
                  <>
                    <strong>1 लॉट यानी {lotSize} शेयरों</strong> के लिए बोली लगानी होगी, जिसके लिए ऊपरी प्राइस बैंड पर{" "}
                    <strong>₹{minInvestment.toLocaleString("en-IN")}</strong> की पूंजी आवश्यक होगी।
                  </>
                ) : (
                  <>कंपनी द्वारा निर्धारित न्यूनतम 1 लॉट के लिए बोली लगानी होगी।</>
                )}{" "}
                इस पब्लिक इश्यू से जुटाई गई राशि का उपयोग कंपनी अपने कारोबार के विस्तार, कार्यशील पूंजी (Working Capital) की ज़रूरतों को पूरा करने और सामान्य कॉर्पोरेट उद्देश्यों के लिए करेगी।
              </p>
              <p>
                <strong>ग्रे मार्केट प्रीमियम (GMP) और लिस्टिंग अनुमान:</strong> ताज़ा ग्रे मार्केट संकेतों के अनुसार,{" "}
                {ipo.company_name} IPO का लाइव GMP <strong>₹{gmp}</strong> चल रहा है। ऊपरी प्राइस बैंड ₹{upperPrice} के आधार पर इसकी अनुमानित लिस्टिंग कीमत{" "}
                <strong>₹{estListing} प्रति शेयर</strong> के आसपास रहने का संकेत मिल रहा है, जो लगभग{" "}
                <strong>{gainPct}%</strong> के संभावित लिस्टिंग गेन या डिस्काउंट को दर्शाता है। हालांकि, निवेशकों को केवल GMP पर निर्भर न रहकर कंपनी के वित्तीय परिणाम, QIB सब्सक्रिप्शन और बाज़ार की स्थिति को भी ध्यान में रखना चाहिए।
              </p>
              <p>
                <strong>अलॉटमेंट और लिस्टिंग प्रक्रिया:</strong> बोली बंद होने के बाद शेयरों का आवंटन (Allotment){" "}
                <strong>{formatShortDate(ipo.allotment_date)}</strong> को फाइनल होने की संभावना है। जिन निवेशकों को शेयर आवंटित होंगे, उनके डीमैट खाते में शेयर क्रेडिट कर दिए जाएंगे और{" "}
                <strong>{formatShortDate(ipo.listing_date)}</strong> को स्टॉक एक्सचेंज पर इसकी लिस्टिंग होगी।
              </p>
            </article>
          </div>
        )}

        {/* TAB 2: DATE-WISE LIVE GMP HISTORY */}
        {activeTab === "gmp" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              {ipo.company_name} GMP Today — Date-Wise Grey Market Premium
            </h2>
            <p className="text-sm text-slate-600">
              ऊपरी प्राइस बैंड ₹{upperPrice} के हिसाब से आज का लाइव GMP <strong>₹{gmp}</strong> है, जिससे अनुमानित लिस्टिंग कीमत{" "}
              <strong>₹{estListing} ({gainPct}%)</strong> बनती है।
            </p>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">IPO Price</th>
                    <th className="p-3">Live GMP</th>
                    <th className="p-3">Est. Listing Price</th>
                    <th className="p-3">1 Lot Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {gmpHistory.length > 0 ? (
                    gmpHistory.map((row, idx) => {
                      const rowGmp = Number(row.gmp_price) || 0;
                      const rowEst = upperPrice + rowGmp;
                      const rowPct = upperPrice > 0 ? ((rowGmp / upperPrice) * 100).toFixed(2) : "0.00";
                      const rowProfit = rowGmp * lotSize;
                      return (
                        <tr key={row.id || idx} className={idx === 0 ? "bg-emerald-50/50 font-medium" : ""}>
                          <td className="p-3 text-slate-900">{formatShortDate(row.recorded_date)}</td>
                          <td className="p-3">₹{upperPrice}</td>
                          <td className="p-3 text-emerald-700 font-bold">+₹{rowGmp}</td>
                          <td className="p-3">₹{rowEst} ({rowPct}%)</td>
                          <td className="p-3 font-semibold text-slate-900">₹{rowProfit.toLocaleString("en-IN")}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="p-3 text-slate-900">Latest</td>
                      <td className="p-3">₹{upperPrice}</td>
                      <td className="p-3 text-emerald-700 font-bold">+₹{gmp}</td>
                      <td className="p-3">₹{estListing} ({gainPct}%)</td>
                      <td className="p-3 font-semibold">₹{oneLotProfit.toLocaleString("en-IN")}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500">
              Disclaimer: GMP figures are indicative grey market estimates for informational purposes only.
            </p>
          </div>
        )}

        {/* TAB 3: LIVE SUBSCRIPTION */}
        {activeTab === "subscription" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              {ipo.company_name} IPO Live Subscription Status (Day-Wise)
            </h2>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold">
                  <tr>
                    <th className="p-3">Investor Category</th>
                    <th className="p-3">Subscription (Times)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-3 font-medium">Qualified Institutional Buyers (QIB)</td>
                    <td className="p-3 font-bold text-slate-900">{qibSub}x</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium">Non-Institutional Investors (NII / HNI)</td>
                    <td className="p-3 font-bold text-slate-900">{niiSub}x</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium">Retail Individual Investors (RII)</td>
                    <td className="p-3 font-bold text-slate-900">{retailSub}x</td>
                  </tr>
                  <tr className="bg-emerald-50">
                    <td className="p-3 font-bold text-emerald-900">Total Subscription</td>
                    <td className="p-3 font-extrabold text-emerald-800">{totalSub}x</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: DRHP / RHP PDF DIRECT VIEW & DOWNLOAD */}
        {activeTab === "drhp" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              {ipo.company_name} DRHP & RHP Offer Document (PDF)
            </h2>
            <p className="text-sm text-slate-600">
              कंपनी के वित्तीय आंकड़े, प्रमोटर होल्डिंग, रिस्क फैक्टर्स और इश्यू के उद्देश्यों की आधिकारिक जानकारी के लिए DRHP / RHP दस्तावेज़ देखें या डाउनलोड करें:
            </p>
            {pdfUrl ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 bg-emerald-700 text-white rounded-lg text-sm font-semibold hover:bg-emerald-800"
                  >
                    Open / Download Official DRHP PDF ↗
                  </a>
                </div>
                <iframe
                  src={pdfUrl}
                  title={`${ipo.company_name} DRHP PDF`}
                  className="w-full h-[520px] border border-slate-300 rounded-lg"
                />
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                <p className="text-sm text-amber-900 font-medium">
                  इस IPO का सीधा PDF लिंक अभी अपडेट हो रहा है। आप नीचे दिए गए आधिकारिक SEBI या NSE पोर्टल से इसका DRHP / RHP तुरंत डाउनलोड कर सकते हैं:
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href={sebiSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-slate-800"
                  >
                    SEBI Official DRHP Filings ↗
                  </a>
                  <a
                    href={nseSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-emerald-800"
                  >
                    NSE Offer Documents ↗
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: REVIEW */}
        {activeTab === "review" && (
          <div className="space-y-3 text-sm sm:text-base text-slate-800 leading-relaxed">
            <h2 className="text-lg font-bold text-slate-900">
              {ipo.company_name} IPO Review — Apply या Avoid?
            </h2>
            <p>
              {ipo.review_summary ||
                `${ipo.company_name} IPO में आवेदन करने से पहले कंपनी के पिछले 3 वर्षों के मुनाफे, क़र्ज़ (Debt-to-Equity) और QIB सब्सक्रिप्शन के रुझान को ज़रूर देखें। यदि आखिरी दिन QIB और NII वर्ग से मज़बूत मांग आती है और GMP सकारात्मक बना रहता है, तो लिस्टिंग गेन के लिए आवेदन पर विचार किया जा सकता है।`}
            </p>
          </div>
        )}

        {/* TAB 6: ALLOTMENT STATUS */}
        {activeTab === "allotment" && (
          <div className="space-y-3 text-sm text-slate-800">
            <h2 className="text-lg font-bold text-slate-900">
              {ipo.company_name} IPO Allotment Status कैसे चेक करें?
            </h2>
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                आधिकारिक रजिस्ट्रार <strong>({ipo.registrar_name || "Link Intime / KFinTech / Bigshare"})</strong> की वेबसाइट पर जाएं।
              </li>
              <li>ड्रॉपडाउन सूची में से <strong>{ipo.company_name}</strong> चुनें।</li>
              <li>अपना <strong>PAN Number</strong>, Application Number या DP/Client ID दर्ज करें।</li>
              <li><strong>Submit</strong> पर क्लिक करते ही आपका अलॉटमेंट स्टेटस स्क्रीन पर दिख जाएगा।</li>
            </ol>
          </div>
        )}

        {/* TAB 7: HINDI FAQS */}
        {activeTab === "faq" && (
          <div className="space-y-4 text-sm text-slate-800">
            <h2 className="text-lg font-bold text-slate-900">
              {ipo.company_name} IPO — अक्सर पूछे जाने वाले सवाल (FAQs)
            </h2>
            <div className="border-b border-slate-200 pb-3">
              <p className="font-bold text-slate-900">Q1. {ipo.company_name} IPO का आज का GMP क्या है?</p>
              <p className="mt-1">आज {ipo.company_name} IPO का लाइव GMP ₹{gmp} चल रहा है।</p>
            </div>
            <div className="border-b border-slate-200 pb-3">
              <p className="font-bold text-slate-900">Q2. {ipo.company_name} IPO का प्राइस बैंड और लॉट साइज़ क्या है?</p>
              <p className="mt-1">
                इसका प्राइस बैंड ₹{lowerPrice} - ₹{upperPrice} प्रति शेयर है और 1 लॉट में {lotSize || "निर्धारित"} शेयर हैं।
              </p>
            </div>
            <div>
              <p className="font-bold text-slate-900">Q3. {ipo.company_name} IPO की अलॉटमेंट और लिस्टिंग तारीख़ क्या है?</p>
              <p className="mt-1">
                अलॉटमेंट {formatShortDate(ipo.allotment_date)} को और लिस्टिंग {formatShortDate(ipo.listing_date)} को प्रस्तावित है।
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
