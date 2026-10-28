'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import {
  BarChart3,
  IndianRupee,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  Train,
  Lock,
  KeyRound,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

export default function OrganiserDashboard() {
  const { currentUser, isAdmin, unlockAdmin } = useUser();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Admin passcode prompt state
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch('/api/organiser');
      if (!res.ok) throw new Error('Failed to load organiser analytics');
      const data = await res.json();
      setMetrics(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchMetrics();
      const interval = setInterval(fetchMetrics, 3000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeError(null);

    const result = await unlockAdmin(passcode);
    if (!result.success) {
      setPasscodeError('Incorrect passcode. Default admin passcode is admin123');
    } else {
      setPasscode('');
    }
  };

  // ACCESS CONTROL: IF NOT ADMIN, SHOW PASSCODE UNLOCK PROMPT
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-12 space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-sm transition-colors">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center mx-auto text-purple-600 dark:text-purple-400">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 uppercase font-bold tracking-wider">
              Restricted Dispatch Operations
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Conductor &amp; Admin Hub</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              Enter the manager passcode <code className="text-purple-700 dark:text-purple-300 font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">admin123</code> to access real-time train occupancy and financial audit telemetry.
            </p>
          </div>

          {passcodeError && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-3.5 rounded-xl text-xs flex items-center space-x-2 text-left">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{passcodeError}</span>
            </div>
          )}

          {/* Passcode Input Form */}
          <form onSubmit={handleUnlock} className="space-y-3 pt-1">
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter admin password (admin123)"
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-sm transition-all"
            >
              Verify Dispatch Clearance
            </button>
          </form>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <Link
              href="/"
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
            >
              ← Return to Passenger Booking
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // AUTHORIZED ORGANISER DASHBOARD
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Operations Command Clearance • Verified Administrator</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Dispatch Operations Command
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time train carriage telemetry, multi-segment seat occupancy, and live revenue audit.
          </p>
        </div>

        <button
          onClick={fetchMetrics}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-600' : ''}`} />
          <span>Sync Telemetry</span>
        </button>
      </div>

      {/* METRIC KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Revenue
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-3">
            ₹{metrics?.totalRevenue || 0}
          </p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center space-x-1 mt-1 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Settled transaction total</span>
          </p>
        </div>

        {/* Occupancy Rate */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Seat Occupancy
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Train className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-3">
            {metrics?.occupancyRate || 0}%
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {metrics?.confirmedCount || 0} of {metrics?.totalSeats || 40} seats reserved
          </p>
        </div>

        {/* Active Holds */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active 2-Min Holds
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-3">
            {metrics?.activeHolds || 0}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">In passenger checkout flow</p>
        </div>

        {/* Waitlist Queue */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Waitlist Queue
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-purple-700 dark:text-purple-300 mt-3">
            {metrics?.totalWaitlist || 0}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Queued for seat transfer</p>
        </div>
      </div>

      {/* RECENT BOOKINGS & AUDIT TRAIL */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Confirmed Reservations</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Database audit trail with passenger identity and multi-station segment locks.
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-mono font-bold self-start sm:self-auto">
            Clearance: Level 4 Operations
          </span>
        </div>

        {metrics?.recentBookings?.length === 0 ? (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm">
            No bookings recorded yet in this session.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] bg-slate-50 dark:bg-slate-800/40">
                <tr>
                  <th className="py-3 px-4 font-bold">Reference (PNR)</th>
                  <th className="py-3 px-4 font-bold">Passenger</th>
                  <th className="py-3 px-4 font-bold">Coach &amp; Seat</th>
                  <th className="py-3 px-4 font-bold">Route Segments</th>
                  <th className="py-3 px-4 font-bold">Fare Paid</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {metrics?.recentBookings?.map((b: any) => (
                  <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-blue-700 dark:text-blue-400">{b.booking_reference}</td>
                    <td className="py-3.5 px-4 font-sans text-slate-800 dark:text-slate-200 font-medium">{b.user_name}</td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                      {b.coach_code} • {b.seat_number}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-sans">
                      {b.start_station_name} ➔ {b.end_station_name}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400">₹{b.total_price}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          b.status === 'CONFIRMED'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
