'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import { Station, Coach, Seat, Train } from '@/lib/types';
import confetti from 'canvas-confetti';
import {
  Train as TrainIcon,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Ticket,
  Users,
  RefreshCw,
  Compass,
  Sparkles,
  ChevronRight,
  Calendar
} from 'lucide-react';
import Link from 'next/link';

export default function BookingPage() {
  const { currentUser } = useUser();
  const userId = currentUser?.id || 'usr_guest';
  const userName = currentUser?.name || 'Guest Passenger';
  const userEmail = currentUser?.email || 'passenger@gmail.com';

  const [train, setTrain] = useState<Train | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCoachId, setSelectedCoachId] = useState<string>('coach_101_A');

  // Journey stops (0: New Delhi to 5: Patna Jn)
  const [startStop, setStartStop] = useState<number>(0);
  const [endStop, setEndStop] = useState<number>(5);

  // Active user's hold state
  const [activeHold, setActiveHold] = useState<{
    holdId: string;
    seatId: string;
    seatNumber: string;
    coachCode: string;
    expiresAt: string;
    price: number;
  } | null>(null);

  const [holdSecondsRemaining, setHoldSecondsRemaining] = useState<number>(120);

  // Waitlist interaction modal
  const [waitlistModal, setWaitlistModal] = useState<{
    seat: Seat;
    waitlistCount: number;
    myPosition: number | null;
    myWaitlistId: string | null;
  } | null>(null);

  // Booking confirmation modal
  const [confirmedBooking, setConfirmedBooking] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch train and seat statuses
  const fetchTrainData = async () => {
    try {
      const res = await fetch(
        `/api/trains?trainId=train_101&start=${startStop}&end=${endStop}&userId=${userId}`
      );
      if (!res.ok) throw new Error('Failed to load train details');
      const data = await res.json();
      setTrain(data);

      // Check if current user has an active hold in any coach
      let foundHold = null;
      for (const coach of data.coaches) {
        for (const seat of coach.seats) {
          if (seat.held_by_me && seat.held_expires_at) {
            const segmentCount = endStop - startStop;
            const price = coach.base_price * segmentCount;
            foundHold = {
              holdId: seat.hold_id,
              seatId: seat.id,
              seatNumber: seat.seat_number,
              coachCode: coach.coach_code,
              expiresAt: seat.held_expires_at,
              price
            };
            break;
          }
        }
        if (foundHold) break;
      }
      setActiveHold(foundHold);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainData();
    const interval = setInterval(fetchTrainData, 3000);
    return () => clearInterval(interval);
  }, [startStop, endStop, userId]);

  // Hold countdown timer
  useEffect(() => {
    if (!activeHold?.expiresAt) {
      setHoldSecondsRemaining(0);
      return;
    }

    const updateTimer = () => {
      const remainingMs = new Date(activeHold.expiresAt).getTime() - Date.now();
      const remainingSec = Math.max(0, Math.floor(remainingMs / 1000));
      setHoldSecondsRemaining(remainingSec);

      if (remainingSec <= 0) {
        setActiveHold(null);
        fetchTrainData();
      }
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(timerInterval);
  }, [activeHold?.expiresAt]);

  // Handle seat click
  const handleSeatClick = async (seat: Seat, coach: Coach) => {
    setErrorMessage(null);

    // If already booked
    if (seat.status === 'BOOKED') {
      return;
    }

    // If held by someone else -> Open User's Waitlist Dialog
    if (seat.status === 'HELD' && !seat.held_by_me) {
      setWaitlistModal({
        seat,
        waitlistCount: seat.waitlist_count || 0,
        myPosition: seat.my_waitlist_position || null,
        myWaitlistId: (seat as any).my_waitlist_id || null,
      });
      return;
    }

    // If already held by me -> user can pay in drawer
    if (seat.held_by_me) {
      return;
    }

    // Attempt to acquire hold (Atomic lock)
    setIsProcessing(true);
    try {
      const res = await fetch('/api/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainId: 'train_101',
          seatId: seat.id,
          startOrder: startStop,
          endOrder: endStop,
          userId: userId,
          userName: userName,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        if (result.canWaitlist) {
          setWaitlistModal({
            seat,
            waitlistCount: result.waitlistPosition - 1,
            myPosition: null,
            myWaitlistId: null,
          });
        } else {
          setErrorMessage(result.error || 'Failed to acquire seat.');
        }
      } else {
        const segmentCount = endStop - startStop;
        const price = coach.base_price * segmentCount;
        setActiveHold({
          holdId: result.holdId,
          seatId: seat.id,
          seatNumber: seat.seat_number,
          coachCode: coach.coach_code,
          expiresAt: result.expiresAt,
          price,
        });
        await fetchTrainData();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error holding seat.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Join waitlist for held seat
  const handleJoinWaitlist = async (seatId: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainId: 'train_101',
          seatId,
          startOrder: startStop,
          endOrder: endStop,
          userId: userId,
          userName: userName,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setWaitlistModal(null);
        await fetchTrainData();
      } else {
        setErrorMessage(data.error);
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Leave waitlist
  const handleLeaveWaitlist = async (waitlistId: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/waitlist?waitlistId=${waitlistId}&userId=${userId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setWaitlistModal(null);
        await fetchTrainData();
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Mock Payment Action (Confirm or Fail)
  const handlePayment = async (action: 'CONFIRM' | 'FAIL') => {
    if (!activeHold) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holdId: activeHold.holdId,
          userId: userId,
          userEmail: userEmail,
          action,
        }),
      });

      const data = await res.json();

      if (action === 'CONFIRM') {
        if (!res.ok) {
          setErrorMessage(data.error || 'Payment failed.');
        } else {
          setActiveHold(null);
          setConfirmedBooking(data.booking);
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
          await fetchTrainData();
        }
      } else {
        setActiveHold(null);
        setErrorMessage('Simulation: Payment was declined. The hold was immediately released to the waitlist queue.');
        await fetchTrainData();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment processing error.');
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedCoach = train?.coaches.find((c) => c.id === selectedCoachId) || train?.coaches[0];

  return (
    <div className="space-y-8 pb-16">
      {/* Top Railway Hero Header */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm">
        {/* Subtle decorative rail pattern accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500" />
        
        <div className="p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <Compass className="w-3.5 h-3.5" />
                <span>Vande Bharat Superfast Corridor</span>
              </span>
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>ACID Atomic Seat Protection</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <span>Vande Bharat Express</span>
              <span className="text-sm font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                #22436
              </span>
            </h1>

            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              New Delhi ➔ Patna Jn via Kanpur, Prayagraj, and Varanasi. Reserve intermediate or complete journeys with serialized zero double-booking protection.
            </p>
          </div>

          <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl px-4 py-3 shrink-0 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 animate-spin" />
            </div>
            <div className="text-left text-xs">
              <p className="font-bold text-slate-800 dark:text-slate-200">Live Seat Telemetry</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Syncing status every 3s</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error / Notification Banner */}
      {errorMessage && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-300 px-5 py-4 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center space-x-3 text-sm font-medium">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-bold text-rose-700 dark:text-rose-400 hover:text-rose-900 dark:hover:text-rose-200 uppercase tracking-wider ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* SECTION 1: JOURNEY & SEGMENT PLANNER */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm transition-colors">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Step 1: Plan Your Journey &amp; Stations
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose boarding and alighting stops along the express transit corridor
              </p>
            </div>
          </div>
        </div>

        {/* Departure & Arrival Input Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          {/* Origin Boarding Station */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Origin (Boarding)</span>
              </span>
              <select
                value={startStop}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setStartStop(val);
                  if (val >= endStop) setEndStop(val + 1);
                }}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all cursor-pointer"
              >
                {train?.stations.slice(0, -1).map((s) => (
                  <option key={s.id} value={s.stop_order}>
                    {s.name} ({s.arrival_time})
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              Departure Platform • Track 1
            </p>
          </div>

          {/* Destination Alighting Station */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400" />
                <span>Destination (Alighting)</span>
              </span>
              <select
                value={endStop}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (val > startStop) setEndStop(val);
                }}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all cursor-pointer"
              >
                {train?.stations.filter((s) => s.stop_order > startStop).map((s) => (
                  <option key={s.id} value={s.stop_order}>
                    {s.name} ({s.arrival_time})
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              Arrival Gate • Main Terminal
            </p>
          </div>

          {/* Fare & Segment Calculator Badge */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-200/90 dark:border-blue-800/80 flex flex-col justify-between shadow-xs">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-blue-700 dark:text-blue-300">
                  Journey Distance
                </p>
                <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {endStop - startStop} Station Hop{endStop - startStop > 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                  Fare per Seat
                </p>
                <p className="text-2xl font-black text-blue-700 dark:text-blue-400 mt-0.5">
                  ₹{(selectedCoach?.base_price || 380) * (endStop - startStop)}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-blue-200/60 dark:border-blue-800/40 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 font-medium">
              <span>Class: {selectedCoach?.coach_code} (₹{selectedCoach?.base_price}/hop)</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Instant e-Ticket</span>
            </div>
          </div>
        </div>

        {/* Visual Train Track Diagram */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Transit Route Map &amp; Scheduled Timings:
            </p>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Highlighted track indicates your selected travel segment
            </span>
          </div>

          <div className="relative py-4 px-2 sm:px-6">
            {/* Background Railway Track Line */}
            <div className="absolute top-1/2 left-8 right-8 h-1.5 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 rounded-full z-0" />
            
            {/* Active Travel Track Segment */}
            {train?.stations && (
              <div
                className="absolute top-1/2 h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 -translate-y-1/2 rounded-full z-0 transition-all duration-300"
                style={{
                  left: `${(startStop / (train.stations.length - 1)) * 92 + 4}%`,
                  width: `${((endStop - startStop) / (train.stations.length - 1)) * 92}%`,
                }}
              />
            )}

            <div className="relative z-10 flex items-center justify-between">
              {train?.stations.map((s, idx) => {
                const isSelected = s.stop_order >= startStop && s.stop_order <= endStop;
                const isBoarding = s.stop_order === startStop;
                const isAlighting = s.stop_order === endStop;

                return (
                  <div key={s.id} className="flex flex-col items-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-200 shadow-sm ${
                        isBoarding
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/60 scale-110'
                          : isAlighting
                          ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-900/60 scale-110'
                          : isSelected
                          ? 'bg-blue-500 text-white ring-2 ring-blue-200 dark:ring-blue-800'
                          : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {idx + 1}
                    </div>

                    <span
                      className={`text-xs mt-2.5 font-bold max-w-[110px] text-center truncate ${
                        isSelected
                          ? 'text-slate-900 dark:text-white'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {s.name}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      {s.arrival_time}
                    </span>

                    {isBoarding && (
                      <span className="text-[9px] uppercase font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.2 rounded mt-1 border border-blue-200 dark:border-blue-800">
                        Board
                      </span>
                    )}
                    {isAlighting && (
                      <span className="text-[9px] uppercase font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.2 rounded mt-1 border border-indigo-200 dark:border-indigo-800">
                        Alight
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: CABIN SELECTION & SEAT MAP */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Ticket className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Step 2: Choose Your Coach &amp; Reserve Seat
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Seat locks are validated across segments {startStop} ➔ {endStop}
              </p>
            </div>
          </div>

          {/* Coach Switcher Tabs */}
          <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 self-start sm:self-auto">
            {train?.coaches.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCoachId(c.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedCoachId === c.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-700/60'
                }`}
              >
                <span>{c.coach_code}</span>
                <span className="ml-1.5 text-[10px] font-normal opacity-85">
                  (₹{c.base_price}/hop)
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Status Legend */}
        <div className="flex flex-wrap items-center justify-center gap-6 py-3 px-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/70 text-xs font-medium mb-8">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-400 dark:border-emerald-600" />
            <span className="text-slate-700 dark:text-slate-300">Available</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-400 dark:border-amber-600" />
            <span className="text-slate-700 dark:text-slate-300">Held (In Checkout / Waitlist)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-lg bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700" />
            <span className="text-slate-500 dark:text-slate-400">Sold (Occupied)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-lg bg-blue-600 text-white shadow-xs" />
            <span className="text-blue-700 dark:text-blue-300 font-bold">Your Active Hold</span>
          </div>
        </div>

        {/* Coach Fuselage & Seats */}
        {loading ? (
          <div className="py-20 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center space-y-3">
            <RefreshCw className="w-7 h-7 text-blue-600 dark:text-blue-400 animate-spin" />
            <p className="text-sm font-semibold">Synchronizing live carriage seats...</p>
          </div>
        ) : selectedCoach ? (
          <div className="max-w-xl mx-auto bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-xs relative">
            {/* Front of Train direction indicator */}
            <div className="w-full text-center pb-5 border-b border-slate-200 dark:border-slate-700 mb-6 flex items-center justify-center space-x-2 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">
              <TrainIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Front of Train • Direction of Travel</span>
            </div>

            {/* Seat Grid: 4 columns (A, B, [Aisle], C, D) */}
            <div className="space-y-4">
              {Array.from(
                new Set((selectedCoach.seats || []).map((s: Seat) => s.seat_number.slice(0, -1)))
              ).map((rowNum: string) => {
                const coachSeats = selectedCoach.seats || [];
                const rowSeats = coachSeats.filter((s: Seat) => s.seat_number.startsWith(rowNum));
                const seatA = rowSeats.find((s: Seat) => s.seat_number.endsWith('A'));
                const seatB = rowSeats.find((s: Seat) => s.seat_number.endsWith('B'));
                const seatC = rowSeats.find((s: Seat) => s.seat_number.endsWith('C'));
                const seatD = rowSeats.find((s: Seat) => s.seat_number.endsWith('D'));

                return (
                  <div key={rowNum} className="flex items-center justify-between gap-2 sm:gap-4">
                    {/* Left pair (Window A & Aisle B) */}
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      {seatA && renderSeatButton(seatA, selectedCoach)}
                      {seatB && renderSeatButton(seatB, selectedCoach)}
                    </div>

                    {/* Carriage Center Aisle */}
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-bold px-2 uppercase select-none tracking-wider">
                      Row {rowNum}
                    </div>

                    {/* Right pair (Aisle C & Window D) */}
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      {seatC && renderSeatButton(seatC, selectedCoach)}
                      {seatD && renderSeatButton(seatD, selectedCoach)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {/* SECTION 3: FLOATING CHECKOUT & HOLD TIMER DRAWER */}
      {activeHold && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0e1626]/95 backdrop-blur-md border-t border-blue-500/30 dark:border-blue-500/40 p-4 shadow-2xl transition-colors animate-in slide-in-from-bottom duration-300">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Hold Details */}
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-base shadow-md shadow-blue-600/30">
                {activeHold.seatNumber}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-slate-900 dark:text-white text-base">
                    Seat Held Exclusively for You
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-mono font-bold">
                    {activeHold.coachCode}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {train?.stations.find((s) => s.stop_order === startStop)?.name} ➔{' '}
                  {train?.stations.find((s) => s.stop_order === endStop)?.name} • Total: ₹{activeHold.price}
                </p>
              </div>
            </div>

            {/* Countdown Timer with Progress Bar */}
            <div className="w-full md:w-64 flex flex-col items-center">
              <div className="flex items-center justify-between w-full text-xs font-bold mb-1.5">
                <span className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Hold Expires In:</span>
                </span>
                <span
                  className={`font-mono text-sm font-extrabold ${
                    holdSecondsRemaining < 30
                      ? 'text-rose-600 dark:text-rose-400 animate-pulse'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {Math.floor(holdSecondsRemaining / 60)}:
                  {(holdSecondsRemaining % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${
                    holdSecondsRemaining < 30 ? 'bg-rose-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${(holdSecondsRemaining / 120) * 100}%` }}
                />
              </div>
            </div>

            {/* Payment simulation buttons */}
            <div className="flex items-center space-x-2.5 w-full md:w-auto">
              <button
                disabled={isProcessing}
                onClick={() => handlePayment('CONFIRM')}
                className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm text-xs sm:text-sm transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm &amp; Pay (₹{activeHold.price})</span>
              </button>

              <button
                disabled={isProcessing}
                onClick={() => handlePayment('FAIL')}
                className="flex items-center justify-center space-x-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all"
                title="Test edge case: simulate payment decline & release"
              >
                <XCircle className="w-4 h-4" />
                <span>Simulate Decline</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* USER WAITLIST MODAL */}
      {waitlistModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3 text-amber-600 dark:text-amber-400">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Seat Currently Held</h3>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              Seat <strong className="text-slate-900 dark:text-white font-bold">{waitlistModal.seat.seat_number}</strong> is in checkout by another passenger.
            </p>

            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-500 dark:text-slate-400">Current Queue:</span>
                <span className="text-amber-700 dark:text-amber-400">{waitlistModal.waitlistCount} Passenger(s) waiting</span>
              </div>
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-500 dark:text-slate-400">Your Status:</span>
                <span className="text-blue-700 dark:text-blue-400 font-bold">
                  {waitlistModal.myPosition ? `#${waitlistModal.myPosition} in Waitlist` : 'Not in queue'}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              💡 <strong>Instant Handover:</strong> If the current buyer's payment fails or their 2-minute timer lapses, this seat transfers immediately to the next person in line.
            </p>

            <div className="flex items-center space-x-3 pt-2">
              {waitlistModal.myPosition ? (
                <button
                  disabled={isProcessing}
                  onClick={() => handleLeaveWaitlist(waitlistModal.myWaitlistId!)}
                  className="w-full py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-sm font-bold border border-rose-200 dark:border-rose-800 transition-all"
                >
                  Leave Waitlist
                </button>
              ) : (
                <button
                  disabled={isProcessing}
                  onClick={() => handleJoinWaitlist(waitlistModal.seat.id)}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-all"
                >
                  Join Waitlist (Position #{waitlistModal.waitlistCount + 1})
                </button>
              )}
              <button
                onClick={() => setWaitlistModal(null)}
                className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMED BOARDING PASS MODAL */}
      {confirmedBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-600 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">Reservation Confirmed!</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                PNR Reference:{' '}
                <span className="font-mono text-blue-700 dark:text-blue-400 font-bold text-sm">
                  {confirmedBooking.booking_reference}
                </span>
              </p>
            </div>

            {/* Boarding Pass Ticket with perforated styling */}
            <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-4 font-mono text-xs relative overflow-hidden shadow-xs">
              <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                <div>
                  <p className="text-slate-500 uppercase text-[10px] font-bold">Passenger</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{confirmedBooking.user_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500 uppercase text-[10px] font-bold">Train Service</p>
                  <p className="text-sm font-bold text-blue-700 dark:text-blue-400">{confirmedBooking.train_name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-slate-200 dark:border-slate-700 pb-3">
                <div>
                  <p className="text-slate-500 uppercase text-[10px] font-bold">From</p>
                  <p className="font-bold text-slate-800 dark:text-slate-100">{confirmedBooking.start_station_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500 uppercase text-[10px] font-bold">To</p>
                  <p className="font-bold text-slate-800 dark:text-slate-100">{confirmedBooking.end_station_name}</p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-1">
                <div>
                  <p className="text-slate-500 uppercase text-[10px] font-bold">Coach &amp; Seat</p>
                  <p className="text-base font-black text-slate-900 dark:text-white">
                    {confirmedBooking.coach_code} • {confirmedBooking.seat_number}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500 uppercase text-[10px] font-bold">Fare Paid</p>
                  <p className="text-base font-black text-emerald-600 dark:text-emerald-400">
                    ₹{confirmedBooking.total_price}
                  </p>
                </div>
              </div>

              {/* Decorative barcode */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center space-y-1">
                <div className="h-7 w-48 bg-slate-300 dark:bg-slate-700 rounded flex items-center justify-center text-[9px] text-slate-700 dark:text-slate-300 font-extrabold tracking-widest">
                  ||||| | |||| ||| |||| | ||
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-sans">
                  ACID TRANSACTION SERIALIZED • E-TICKET VERIFIED
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3">
              <Link
                href="/my-bookings"
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-center text-sm font-bold transition-all shadow-sm"
              >
                View in My Bookings
              </Link>
              <button
                onClick={() => setConfirmedBooking(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-all"
              >
                Book Another Seat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Helper function to render an aesthetic seat button
  function renderSeatButton(seat: Seat, coach: Coach) {
    const isBooked = seat.status === 'BOOKED';
    const isHeldByMe = seat.held_by_me;
    const isHeldByOther = seat.status === 'HELD' && !isHeldByMe;
    const isAvailable = seat.status === 'AVAILABLE';

    let styling = 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed';
    let badgeText = '';

    if (isHeldByMe) {
      styling = 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/30 scale-105 glow-held';
      badgeText = 'HELD';
    } else if (isHeldByOther) {
      styling = 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-300 hover:border-amber-500';
      badgeText = seat.waitlist_count ? `WL(${seat.waitlist_count})` : 'HELD';
    } else if (isBooked) {
      styling = 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed';
      badgeText = 'SOLD';
    } else if (isAvailable) {
      styling = 'bg-white dark:bg-slate-800 border-emerald-300 dark:border-emerald-600/70 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:border-emerald-500 hover:scale-105 shadow-xs';
    }

    return (
      <button
        key={seat.id}
        disabled={isBooked}
        onClick={() => handleSeatClick(seat, coach)}
        className={`relative w-12 h-14 sm:w-14 sm:h-16 rounded-xl border flex flex-col items-center justify-center transition-all ${styling}`}
      >
        <span className="text-xs sm:text-sm font-extrabold font-mono">{seat.seat_number}</span>
        <span className="text-[9px] uppercase tracking-tighter opacity-80">
          {seat.seat_type === 'Window' ? 'Win' : 'Aisle'}
        </span>
        {badgeText && (
          <span
            className={`absolute -top-2 -right-1 text-[8px] font-mono px-1 py-0.2 rounded-full font-bold shadow-xs ${
              isHeldByMe
                ? 'bg-amber-400 text-slate-900'
                : isHeldByOther
                ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            {badgeText}
          </span>
        )}
      </button>
    );
  }
}
