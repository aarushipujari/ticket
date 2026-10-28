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
      setPasscodeError('Incorrect administrator password.');
    } else {
      setPasscode('');
    }
  };

  // ACCESS CONTROL: IF NOT ADMIN, SHOW PASSCODE UNLOCK PROMPT
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-12 space-y-6">
        <div className="bg-slate-900/90 border border-purple-500/40 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl backdrop-blur-md">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center mx-auto text-purple-400">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase font-bold">
              Restricted Area • Organiser Clearance Only
            </span>
            <h2 className="text-2xl font-extrabold text-white">Organiser Command Center</h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              This dashboard contains protected revenue and operational telemetry. Please authenticate with administrator credentials to continue.
            </p>
          </div>

          {passcodeError && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{passcodeError}</span>
            </div>
          )}

          {/* Passcode Input Form */}
          <form onSubmit={handleUnlock} className="space-y-3 pt-1">
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter administrator password"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-sm shadow-lg shadow-purple-600/30 transition-all hover:scale-[1.01]"
            >
              Authenticate as Organiser
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800">
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              ← Back to Passenger Booking
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Admin Clearance Verified • System Administrator</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Dispatch Operations Command
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Live inventory telemetry, real-time occupancy rates, and transaction audit trails.
          </p>
        </div>

        <button
          onClick={fetchMetrics}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs font-semibold transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-400' : ''}`} />
          <span>Sync Telemetry</span>
        </button>
      </div>

      {/* METRIC KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Revenue</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white mt-3">₹{metrics?.totalRevenue || 0}</p>
          <p className="text-[11px] text-emerald-400 flex items-center space-x-1 mt-1 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Real-time settled funds</span>
          </p>
        </div>

        {/* Occupancy Rate */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Seat Occupancy</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Train className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white mt-3">{metrics?.occupancyRate || 0}%</p>
          <p className="text-[11px] text-slate-400 mt-1">
            {metrics?.confirmedCount || 0} of {metrics?.totalSeats || 40} seats confirmed
          </p>
        </div>

        {/* Active Holds */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active 2-Min Holds</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-amber-400 mt-3">{metrics?.activeHolds || 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">In active checkout flow</p>
        </div>

        {/* Waitlist Queue */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Waitlist Queue</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-purple-300 mt-3">{metrics?.totalWaitlist || 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">Passengers queued for held seats</p>
        </div>
      </div>

      {/* RECENT BOOKINGS & AUDIT TRAIL */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Recent Confirmed Bookings</h2>
            <p className="text-xs text-slate-400">Database audit trail with passenger identity and segment ranges.</p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-md bg-purple-950/60 text-purple-300 border border-purple-800/80 font-mono">
            Admin Clearance: Verified
          </span>
        </div>

        {metrics?.recentBookings?.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            No bookings recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] bg-slate-950/40">
                <tr>
                  <th className="py-3 px-4 font-semibold">Reference</th>
                  <th className="py-3 px-4 font-semibold">Passenger</th>
                  <th className="py-3 px-4 font-semibold">Seat & Coach</th>
                  <th className="py-3 px-4 font-semibold">Route Segments</th>
                  <th className="py-3 px-4 font-semibold">Fare</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {metrics?.recentBookings?.map((b: any) => (
                  <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-cyan-400">{b.booking_reference}</td>
                    <td className="py-3 px-4 font-sans text-slate-200">{b.user_name}</td>
                    <td className="py-3 px-4 text-slate-300">
                      {b.coach_code} • {b.seat_number}
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-sans">
                      {b.start_station_name} ➔ {b.end_station_name}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-400">₹{b.total_price}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          b.status === 'CONFIRMED'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
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
