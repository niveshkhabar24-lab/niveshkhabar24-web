import { createClient } from '@supabase/supabase-js';
import SipCalculator from './SipCalculator';

export const revalidate = 60; // हर 60 सेकंड में ताज़ा डेटा दिखाएगा

export default async function HomePage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data: ipos } = await supabase
    .from('ipos')
    .select('*')
    .order('open_date', { ascending: false });

  const getBadgeStyle = (status) => {
    if (status === 'Open') return { backgroundColor: '#dcfce7', color: '#166534' };
    if (status === 'Upcoming') return { backgroundColor: '#fef9c3', color: '#854d0e' };
    return { backgroundColor: '#f1f5f9', color: '#475569' };
  };

  return (
    <div>
      <section style={{ backgroundColor: '#ffffff', padding: '20px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 8px', fontSize: '22px' }}>🚀 Latest IPO GMP & Subscription Tracker (2026)</h2>
        <p style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
          भारत के सभी सक्रिय (Open) और आगामी (Upcoming) Mainboard व SME IPO का ताज़ा Grey Market Premium (GMP), प्राइस बैंड, लॉट साइज़ और सब्सक्रिप्शन स्टेटस एक ही जगह देखें।
        </p>
      </section>

      <section id="ipo-table" style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #e2e8f0', color: '#334155' }}>
              <th style={{ padding: '14px 16px' }}>Company Name</th>
              <th style={{ padding: '14px 16px' }}>Status</th>
              <th style={{ padding: '14px 16px' }}>Price Band</th>
              <th style={{ padding: '14px 16px' }}>Est. GMP</th>
              <th style={{ padding: '14px 16px' }}>Subscription</th>
              <th style={{ padding: '14px 16px' }}>Open - Close</th>
            </tr>
          </thead>
          <tbody>
            {ipos && ipos.length > 0 ? (
              ipos.map((ipo) => (
                <tr key={ipo.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '14px 16px', fontWeight: '600' }}>
                    {ipo.company_name}
                    <span style={{ display: 'inline-block', marginLeft: '8px', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#e0f2fe', color: '#0369a1' }}>
                      {ipo.category}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ ...getBadgeStyle(ipo.status), padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '700' }}>
                      {ipo.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>{ipo.price_band}</td>
                  <td style={{ padding: '14px 16px', fontWeight: '700', color: '#16a34a' }}>
                    ₹{ipo.gmp_price} ({ipo.gmp_percent}%)
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: '600' }}>{ipo.subscription_total}x</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#475569' }}>
                    {ipo.open_date} → {ipo.close_date}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                  डेटा लोड हो रहा है...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <SipCalculator />
    </div>
  );
}
