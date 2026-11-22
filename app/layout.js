export const metadata = {
  title: {
    default: 'NiveshKhabar24 - IPO GMP Today in Hindi, Live Subscription & Allotment Status',
    template: '%s | NiveshKhabar24',
  },
  description:
    'Aaj ka IPO GMP in Hindi, Mainboard aur SME IPO ki live subscription, allotment status check karne ka tareeka aur retail investors ke liye saral jankari.',
  keywords: [
    'IPO GMP in Hindi',
    'Upcoming IPO 2026 in Hindi',
    'IPO Allotment Status in Hindi',
    'Mainboard IPO GMP Today',
    'NiveshKhabar24',
  ],
  robots: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
    'max-video-preview': -1,
  },
  openGraph: {
    title: 'NiveshKhabar24 - IPO GMP Today in Hindi & Live Subscription',
    description:
      'Har naye IPO ka live GMP, QIB/Retail subscription aur allotment chance ek hi jagah saral Hindi mein.',
    url: 'https://niveshkhabar24.com',
    siteName: 'NiveshKhabar24',
    locale: 'hi_IN',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="hi">
      <head>
        <meta name="robots" content="max-image-preview:large" />
<script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased min-h-screen flex flex-col">
        {/* Top Navbar */}
        <header className="bg-slate-900 text-white sticky top-0 z-50 shadow-md">
          <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <a href="/" className="flex items-center gap-2">
              <span className="bg-emerald-500 text-slate-950 font-extrabold px-2.5 py-1 rounded-lg text-lg">
                NK24
              </span>
              <div>
                <span className="text-xl font-bold tracking-tight">
                  Nivesh<span className="text-emerald-400">Khabar24</span>
                </span>
                <p className="text-[11px] text-slate-400 leading-none">
                  IPO GMP &amp; Allotment Guide in Hindi
                </p>
              </div>
            </a>

            <nav className="flex items-center gap-4 text-sm font-medium text-slate-200">
              <a href="#live-ipo-table" className="hover:text-emerald-400 transition">
                Live IPO GMP
              </a>
              <a href="#sip-calculator" className="hover:text-emerald-400 transition">
                SIP Calculator
              </a>
              <a
                href="#allotment-guide"
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition"
              >
                Allotment Tips
              </a>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-grow">{children}</main>

        {/* Footer */}
        <footer className="bg-slate-900 text-slate-400 text-xs mt-12 border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-white font-bold text-base mb-2">NiveshKhabar24.com</h3>
              <p className="leading-relaxed">
                Retail investors ke liye saral Hindi aur Hinglish mein IPO GMP, live subscription,
                shareholder quota aur allotment probability ki sateek jankari.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">Quick Links</h4>
              <ul className="space-y-1.5">
                <li><a href="#live-ipo-table" className="hover:text-emerald-400">Aaj ka IPO GMP (Hindi)</a></li>
                <li><a href="#sip-calculator" className="hover:text-emerald-400">Mutual Fund SIP Calculator</a></li>
                <li><a href="#allotment-guide" className="hover:text-emerald-400">IPO Allotment Kaise Badhayein?</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">SEBI Disclaimer</h4>
              <p className="leading-relaxed">
                Hum SEBI registered advisor nahi hain. Grey Market Premium (GMP) sirf market
                anuman par aadharit hota hai. Nivesh se pehle apne financial advisor ki salah lein.
              </p>
            </div>
          </div>
          <div className="text-center py-3 border-t border-slate-800 text-slate-500">
            © {new Date().getFullYear()} NiveshKhabar24.com — All Rights Reserved.
          </div>
        </footer>
      </body>
    </html>
  );
}
