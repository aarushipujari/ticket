'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import { Booking } from '@/lib/types';
import { Ticket, Calendar, MapPin, AlertCircle, CheckCircle2, XCircle, ArrowRight, Train, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function MyBookingsPage() {
  const { currentUser } = useUser();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const userId = currentUser?.id || 'usr_guest';
  const userName = currentUser?.name || 'Guest Passenger';

  const fetchBookings = async () => {
    try {
      const res = await fetch(`/api/bookings?userId=${userId}`);
      if (!res.ok) throw new Error('Failed to load bookings');
      const data = await res.json();
      setBookings(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [userId]);

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this ticket? The seat will be immediately released.')) {
      return;
    }

    setCancellingId(bookingId);
    setActionMessage(null);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          userId,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setActionMessage({ type: 'error', text: result.error || 'Failed to cancel booking.' });
      } else {
        setActionMessage({
          type: 'success',
          text: 'Booking cancelled successfully. The seat has been restored to inventory and offered to the waitlist.',
        });
        await fetchBookings();
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Error communicating with server.' });
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center space-x-3">
            <Ticket className="w-7 h-7 text-cyan-400" />
            <span>My Bookings</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Active and past rail reservations for <strong className="text-slate-200">{userName}</strong>
          </p>
        </div>

        <Link
          href="/"
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition-all shadow-md shadow-cyan-500/20"
        >
          <Train className="w-4 h-4" />
          <span>Book New Journey</span>
        </Link>
      </div>

      {/* Action Notification */}
      {actionMessage && (
        <div
          className={`px-4 py-3 rounded-xl flex items-center justify-between text-sm ${
            actionMessage.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs uppercase font-semibold hover:opacity-80 ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Bookings List */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 flex flex-col items-center space-y-3">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-sm font-medium">Loading your confirmed tickets...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
            <Ticket className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">No Bookings Found</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            You haven't reserved any seats yet as {userName}. Head over to the booking page to reserve a seat.
          </p>
          <Link
            href="/"
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-sm font-bold transition-all shadow-lg shadow-cyan-500/20"
          >
            <span>Explore Seats</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const isCancelled = b.status === 'CANCELLED';

            return (
              <div
                key={b.id}
                className={`border rounded-2xl p-5 sm:p-6 transition-all ${
                  isCancelled
                    ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 shadow-xl'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
                      <Train className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-white text-base">{b.train_name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 font-mono text-cyan-400 border border-slate-700 font-semibold">
                          {b.train_number}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono">Ref: {b.booking_reference}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider font-mono ${
                        isCancelled
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                </div>

                {/* Journey Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-4 text-xs">
                  <div>
                    <span className="text-slate-400 uppercase font-semibold text-[10px]">Route Segments</span>
                    <p className="font-bold text-white text-sm mt-0.5">
                      {b.start_station_name} ➔ {b.end_station_name}
                    </p>
                    <p className="text-slate-400">Stop {b.start_stop_order} to Stop {b.end_stop_order}</p>
                  </div>

                  <div>
                    <span className="text-slate-400 uppercase font-semibold text-[10px]">Seat Allocation</span>
                    <p className="font-bold text-cyan-400 text-sm mt-0.5">
                      Seat {b.seat_number} ({b.coach_code})
                    </p>
                    <p className="text-slate-400">{b.class_type}</p>
                  </div>

                  <div>
                    <span className="text-slate-400 uppercase font-semibold text-[10px]">Fare & Timestamp</span>
                    <p className="font-extrabold text-emerald-400 text-sm mt-0.5">₹{b.total_price}</p>
                    <p className="text-slate-400">{new Date(b.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Cancel Action */}
                {!isCancelled && (
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Cancellation automatically releases seat lock for other passengers.
                    </span>
                    <button
                      disabled={cancellingId === b.id}
                      onClick={() => handleCancelBooking(b.id)}
                      className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all hover:scale-105"
                    >
                      {cancellingId === b.id ? 'Cancelling...' : 'Cancel Reservation'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
