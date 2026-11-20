'use client';
import { useState } from 'react';

export default function SipCalculator() {
  const [monthly, setMonthly] = useState(5000);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(10);

  const months = years * 12;
  const monthlyRate = rate / 12 / 100;
  const totalInvested = monthly * months;
  const futureValue = Math.round(
    monthly * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate)
  );
  const estReturns = futureValue - totalInvested;

  return (
    <section id="sip-calc" style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', marginTop: '32px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <h2 style={{ margin: '0 0 6px', fontSize: '20px', color: '#0f172a' }}>📊 Mutual Fund SIP Calculator</h2>
      <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#64748b' }}>अपनी मासिक बचत (SIP) का भविष्य मूल्य तुरंत कैलकुलेट करें</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>मासिक निवेश (₹): {monthly.toLocaleString('en-IN')}</label>
          <input type="range" min="500" max="100000" step="500" value={monthly} onChange={(e) => setMonthly(Number(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>अनुमानित रिटर्न (% वार्षिक): {rate}%</label>
          <input type="range" min="6" max="25" step="0.5" value={rate} onChange={(e) => setRate(Number(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>अवधि (वर्ष): {years} साल</label>
          <input type="range" min="1" max="35" step="1" value={years} onChange={(e) => setYears(Number(e.target.value))} style={{ width: '100%' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', backgroundColor: '#f1f5f9', padding: '16px', borderRadius: '8px' }}>
        <div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>कुल निवेश राशि</span>
          <div style={{ fontSize: '18px', fontWeight: '700' }}>₹{totalInvested.toLocaleString('en-IN')}</div>
        </div>
        <div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>अनुमानित मुनाफा</span>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#16a34a' }}>+₹{estReturns.toLocaleString('en-IN')}</div>
        </div>
        <div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>कुल फंड वैल्यू</span>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>₹{futureValue.toLocaleString('en-IN')}</div>
        </div>
      </div>
    </section>
  );
}
