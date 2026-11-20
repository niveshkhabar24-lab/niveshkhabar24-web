export const metadata = {
  title: 'NiveshKhabar24 - Live IPO GMP, Allotment & Market News in Hinglish',
  description: 'Latest Mainboard aur SME IPO GMP, Live Subscription Status, Allotment Dates aur Stock Market News सरल Hinglish में।',
};

export default function RootLayout({ children }) {
  return (
    <html lang="hi">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#f8fafc', color: '#0f172a' }}>
        <header style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '16px 24px', borderBottom: '3px solid #16a34a' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '22px', letterSpacing: '0.5px' }}>
                Nivesh<span style={{ color: '#4ade80' }}>Khabar24</span>
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94a3b8' }}>Live IPO GMP • Market Updates • Smart Calculators</p>
            </div>
            <nav style={{ display: 'flex', gap: '18px', fontSize: '14px', fontWeight: '600' }}>
              <a href="#ipo-table" style={{ color: '#ffffff', textDecoration: 'none' }}>Live IPO GMP</a>
              <a href="#sip-calc" style={{ color: '#4ade80', textDecoration: 'none' }}>SIP Calculator</a>
            </nav>
          </div>
        </header>
        <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px' }}>
          {children}
        </main>
        <footer style={{ backgroundColor: '#0f172a', color: '#94a3b8', textAlign: 'center', padding: '20px', fontSize: '13px', marginTop: '40px' }}>
          <p style={{ margin: '0 0 6px', color: '#e2e8f0' }}>© 2026 NiveshKhabar24.com — All Rights Reserved</p>
          <p style={{ margin: 0, fontSize: '11px' }}>Disclaimer: यहाँ दी गई IPO GMP और मार्केट जानकारी केवल शैक्षणिक उद्देश्य के लिए है। निवेश से पहले अपने वित्तीय सलाहकार से परामर्श लें।</p>
        </footer>
      </body>
    </html>
  );
}
