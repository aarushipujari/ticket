'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import { Booking } from '@/lib/types';
import {
  Ticket,
  MapPin,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Train,
  RefreshCw,
  CreditCard,
  Clock,
  ShieldCheck,
  X,
} from 'lucide-react';
import Link from 'next/link';

export default function MyBookingsPage() {
  const { currentUser } = useUser();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<{
    type: 'success' | 'error';
    text: string;
    refundAmount?: number;
    pnr?: string;
  } | null>(null);
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

  const handleCancelBooking = async (b: Booking) => {
    if (
      !confirm(
        `Are you sure you want to cancel ticket for ${b.train_name} (${b.booking_reference})? Your fare of ₹${b.total_price} will be refunded and the seat will be released.`
      )
    ) {
      return;
    }

    setCancellingId(b.id);
    setActionMessage(null);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: b.id,
          userId,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setActionMessage({
          type: 'error',
          text: result.error || 'Failed to cancel booking.',
        });
      } else {
        const refundAmt = result.refundAmount ?? b.total_price;
        setActionMessage({
          type: 'success',
          text: `Ticket ${b.booking_reference} cancelled successfully.`,
          refundAmount: refundAmt,
          pnr: b.booking_reference,
        });
        await fetchBookings();
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Error communicating with server.',
      });
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-3">
            <Ticket className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            <span>My Bookings &amp; Itineraries</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Confirmed rail reservations for{' '}
            <strong className="text-slate-800 dark:text-slate-200">{userName}</strong>
          </p>
        </div>

        <Link
          href="/"
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm"
        >
          <Train className="w-4 h-4" />
          <span>Book New Journey</span>
        </Link>
      </div>

      {/* Prominent Cancellation & Refund Notification Box */}
      {actionMessage && actionMessage.type === 'success' && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-teal-500/10 border-2 border-emerald-500/30 dark:border-emerald-500/40 p-5 shadow-lg shadow-emerald-500/5 animate-fadeIn">
          <button
            onClick={() => setActionMessage(null)}
            className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-emerald-950 dark:text-emerald-200">
                  Ticket Cancelled &amp; Refund Initiated
                </h3>
                {actionMessage.pnr && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-mono text-xs font-bold border border-emerald-300 dark:border-emerald-700">
                    {actionMessage.pnr}
                  </span>
                )}
              </div>

              {/* Crucial refund notice */}
              <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-900/50 space-y-1.5">
                <div className="flex items-center space-x-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    Refund Amount:{' '}
                    <strong className="text-emerald-600 dark:text-emerald-400 text-base">
                      ₹{actionMessage.refundAmount}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                  <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>
                    Your money will be refunded to your original payment method in{' '}
                    <strong className="text-amber-700 dark:text-amber-300">
                      3–5 working days
                    </strong>
                    .
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                <span>
                  The seat has been released and immediately restored to train inventory for waiting passengers.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {actionMessage && actionMessage.type === 'error' && (
        <div className="px-4 py-3.5 rounded-2xl flex items-center justify-between text-sm bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-300">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs uppercase font-bold hover:opacity-80 ml-4 tracking-wider"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Bookings List */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center space-y-3">
          <RefreshCw className="w-7 h-7 text-blue-600 dark:text-blue-400 animate-spin" />
          <p className="text-sm font-semibold">Retrieving your confirmed rail passes...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
            <Ticket className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Active Reservations</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            You haven't reserved any tickets yet as {userName}. Choose your route and lock your seat in real time.
          </p>
          <Link
            href="/"
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all shadow-sm"
          >
            <span>Explore Train Routes</span>
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
                className={`border rounded-3xl p-5 sm:p-6 transition-all ${
                  isCancelled
                    ? 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                    : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                      <Train className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-slate-900 dark:text-white text-base">
                          {b.train_name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-blue-700 dark:text-blue-400 border border-slate-200 dark:border-slate-700 font-bold">
                          {b.train_number}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        PNR: {b.booking_reference}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider font-mono ${
                        isCancelled
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                          : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                </div>

                {/* Journey Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-4 text-xs">
                  <div>
                    <span className="text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                      Route Segments
                    </span>
                    <p className="font-extrabold text-slate-900 dark:text-white text-sm mt-0.5">
                      {b.start_station_name} ➔ {b.end_station_name}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400">
                      Stop {b.start_stop_order} to Stop {b.end_stop_order}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                      Seat &amp; Class
                    </span>
                    <p className="font-extrabold text-blue-700 dark:text-blue-400 text-sm mt-0.5">
                      Seat {b.seat_number} ({b.coach_code})
                    </p>
                    <p className="text-slate-500 dark:text-slate-400">{b.class_type || 'Reserved Carriage'}</p>
                  </div>

                  <div>
                    <span className="text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                      Fare &amp; Date
                    </span>
                    <p className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">
                      ₹{b.total_price}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400">
                      {new Date(b.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Cancel Action */}
                {!isCancelled ? (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Cancellation immediately frees inventory and refunds ₹{b.total_price} in 3–5 working days.
                    </span>
                    <button
                      disabled={cancellingId === b.id}
                      onClick={() => handleCancelBooking(b)}
                      className="px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold transition-all self-end sm:self-auto"
                    >
                      {cancellingId === b.id ? 'Processing...' : 'Cancel Ticket'}
                    </button>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Refund of ₹{b.total_price} in progress (3–5 working days)</span>
                    </span>
                    <span className="font-mono text-[10px]">Seat released</span>
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
