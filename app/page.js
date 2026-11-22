'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import SipCalculator from './SipCalculator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

function formatIssueDates(openDate, closeDate) {
  if (!openDate) return '';

  const start = new Date(`${openDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return '';

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const sDay = String(start.getDate()).padStart(2, '0');
  const sMonth = months[start.getMonth()];

  if (!closeDate) {
    return `${sDay} ${sMonth}`;
  }

  const end = new Date(`${closeDate}T00:00:00`);
  if (Number.isNaN(end.getTime())) {
    return `${sDay} ${sMonth}`;
  }

  const eDay = String(end.getDate()).padStart(2, '0');
  const eMonth = months[end.getMonth()];

  if (sMonth === eMonth) {
    return `${sDay} - ${eDay} ${eMonth}`;
  }

  return `${sDay} ${sMonth} - ${eDay} ${eMonth}`;
}

export default function HomePage() {
  const [ipos, setIpos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIpoId, setSelectedIpoId] = useState('');
  const [dematAccounts, setDematAccounts] = useState(1);

  useEffect(() => {
    async function fetchIPOs() {
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('ipos')
        .select('*')
        .order('open_date', { ascending: false, nullsFirst: false });

      if (!error && data) {
        setIpos(data);
        if (data.length > 0) setSelectedIpoId(String(data[0].id));
      }
      setLoading(false);
    }
    fetchIPOs();
  }, []);

  const searchedIpos = ipos.filter(
    (ipo) =>
      ipo.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ipo.parent_company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const mainboardIpos = searchedIpos.filter((i) => i.category !== 'SME');
  const smeIpos = searchedIpos.filter((i) => i.category === 'SME');
  const upcomingIpos = searchedIpos.filter((i) => i.status === 'Upcoming');

  // Allotment Probability Calculator Logic
  const selectedIpo = ipos.find((i) => String(i.id) === String(selectedIpoId));
  const retailSub = Number(selectedIpo?.retail_sub) || 1;
  const singleAccChance = retailSub <= 1 ? 100 : Math.min(100, (1 / retailSub) * 100);
  const combinedChance =
    retailSub <= 1
      ? 100
      : Math.min(99.9, (1 - Math.pow(1 - 1 / retailSub, dematAccounts)) * 100);

  // Exact Chittorgarh 2-Column Directory Table
  const renderChittorgarhTable = (list, emptyMsg) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="bg-slate-100 text-slate-700 border-b-2 border-slate-300 text-xs">
            <th className="py-2.5 px-4 font-bold">Company</th>
            <th className="py-2.5 px-4 font-bold text-right">Issue Dates</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200/80">
          {loading ? (
            <tr>
              <td colSpan="2" className="py-8 text-center text-slate-400 text-xs">
                IPOs list load ho rahi hai...
              </td>
            </tr>
          ) : list.length === 0 ? (
            <tr>
              <td colSpan="2" className="py-6 text-center text-slate-400 text-xs">
                {emptyMsg}
              </td>
            </tr>
          ) : (
            list.map((ipo, index) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);

              const openDt = ipo.open_date ? new Date(`${ipo.open_date}T00:00:00`) : null;
              const closeDt = ipo.close_date ? new Date(`${ipo.close_date}T00:00:00`) : null;
              const listDt = ipo.listing_date ? new Date(`${ipo.listing_date}T00:00:00`) : null;

              // 1. 'L' = Aaj Listing Date hai
              const isListingToday = Boolean(listDt && today.getTime() === listDt.getTime());

              // 2. 'O' = Bidding abhi Open (Live) hai
              const isOpen =
                !isListingToday &&
                (ipo.status === 'Open' ||
                  (openDt && closeDt && today >= openDt && today <= closeDt));

              // 3. 'P' = Bidding close ho chuki hai, lekin abhi Listing Date nahi aayi
              const daysSinceClose = closeDt
                ? Math.floor((today - closeDt) / (1000 * 60 * 60 * 24))
                : -1;

              const isPendingListing =
                !isListingToday &&
                !isOpen &&
                closeDt &&
                today > closeDt &&
                (listDt ? today < listDt : daysSinceClose <= 7);

              let rowBgClass = index % 2 === 0 ? 'bg-white' : 'bg-slate-50/90';
              if (isListingToday || isOpen) {
                rowBgClass = 'bg-emerald-100/75';
              } else if (isPendingListing) {
                rowBgClass = 'bg-amber-50/90';
              }

              return (
                <tr
                  key={ipo.id}
                  className={`${rowBgClass} hover:bg-[#e2f3ea] transition-colors duration-150 cursor-pointer group`}
                >
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`/ipo/${ipo.slug}`}
                        className="font-semibold text-[#1a56db] group-hover:text-teal-800 group-hover:underline text-sm"
                      >
                        {ipo.company_name}
                      </a>

                      {isListingToday && (
                        <span
                          title="Listing Today"
                          className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-600 text-white text-[10px] font-bold leading-none shrink-0"
                        >
                          L
                        </span>
                      )}

                      {isOpen && (
                        <span
                          title="Open for Bidding"
                          className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-teal-600 text-white text-[10px] font-bold leading-none shrink-0"
                        >
                          O
                        </span>
                      )}

                      {isPendingListing && (
                        <span
                          title="Allotment / Listing Pending"
                          className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-40
