'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Info
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

  // Journey stops (0: Grand Central, 1: East Park, 2: Highland, 3: Riverport)
  const [startStop, setStartStop] = useState<number>(0);
  const [endStop, setEndStop] = useState<number>(3);

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
    const interval = setInterval(fetchTrainData, 3000); // Poll every 3 seconds for real-time multiplayer updates
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
          // Trigger celebratory confetti
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
          await fetchTrainData();
        }
      } else {
        // Failed payment simulation
        setActiveHold(null);
        setErrorMessage('Mock payment declined! Hold was immediately released and passed to next passenger.');
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
    <div className="space-y-6">
      {/* Top Banner / Problem Statement Alignment */}
      <div className="bg-gradient-to-r from-blue-900/30 via-cyan-900/20 to-slate-900/40 border border-cyan-500/20 rounded-2xl p-4 sm:p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Multi-Station Segment Lock • Zero Double-Booking Guaranteed</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Metropolitan Express #101
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Experience atomic seat holds with real-time countdown, automatic waitlist handover, and zero race conditions across intermediate stations.
            </p>
          </div>

          <div className="flex items-center space-x-3 bg-slate-900/80 border border-slate-700/60 rounded-xl px-4 py-2.5">
            <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
            <div className="text-left text-xs">
              <p className="font-semibold text-slate-200">Live Multi-User Sync</p>
              <p className="text-[10px] text-slate-400">Polling status every 3s</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error / Notification Banner */}
      {errorMessage && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-xl flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center space-x-2 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs text-rose-400 hover:text-rose-200 uppercase font-semibold ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* SECTION 1: ROUTE & SEGMENT SELECTOR */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-cyan-400" />
          <span>Step 1: Select Your Journey Route (Station Segments)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-center">
          {/* Origin */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Origin Station (Boarding)</label>
            <select
              value={startStop}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setStartStop(val);
                if (val >= endStop) setEndStop(val + 1);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            >
              {train?.stations.slice(0, -1).map((s) => (
                <option key={s.id} value={s.stop_order}>
                  {s.name} ({s.arrival_time})
                </option>
              ))}
            </select>
          </div>

          {/* Destination */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Destination Station (Alighting)</label>
            <select
              value={endStop}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (val > startStop) setEndStop(val);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            >
              {train?.stations.filter((s) => s.stop_order > startStop).map((s) => (
                <option key={s.id} value={s.stop_order}>
                  {s.name} ({s.arrival_time})
                </option>
              ))}
            </select>
          </div>

          {/* Price & Segment Summary Badge */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Segments Covered</p>
              <p className="text-base font-bold text-cyan-400">
                {endStop - startStop} Segment{endStop - startStop > 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Est. Ticket Price</p>
              <p className="text-lg font-extrabold text-white">
                ${(selectedCoach?.base_price || 50) * (endStop - startStop)}
              </p>
            </div>
          </div>
        </div>

        {/* Visual Station Track Line */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Segment Trajectory Map:
          </p>
          <div className="relative flex items-center justify-between">
            <div className="absolute top-1/2 left-4 right-4 h-1 bg-slate-800 -translate-y-1/2 z-0" />
            {train?.stations.map((s, idx) => {
              const isSelected = s.stop_order >= startStop && s.stop_order <= endStop;
              const isBoarding = s.stop_order === startStop;
              const isAlighting = s.stop_order === endStop;

              return (
                <div key={s.id} className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                      isBoarding || isAlighting
                        ? 'bg-cyan-500 text-black ring-4 ring-cyan-500/20 scale-110 shadow-lg shadow-cyan-500/50'
                        : isSelected
                        ? 'bg-blue-600 text-white ring-2 ring-blue-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <span
                    className={`text-xs mt-2 font-medium max-w-[100px] text-center truncate ${
                      isSelected ? 'text-white font-semibold' : 'text-slate-500'
                    }`}
                  >
                    {s.name}
                  </span>
                  <span className="text-[10px] text-slate-500">{s.arrival_time}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 2: COACH SELECTOR & SEAT MAP */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
              <Ticket className="w-4 h-4 text-cyan-400" />
              <span>Step 2: Choose Your Coach & Seat</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Seats are checked live against segments {startStop} ➔ {endStop}
            </p>
          </div>

          {/* Coach Switcher Tabs */}
          <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {train?.coaches.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCoachId(c.id)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  selectedCoachId === c.id
                    ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                {c.coach_code} (${c.base_price}/seg)
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-6 py-3 px-4 bg-slate-950/40 rounded-xl border border-slate-800/60 text-xs mb-6">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded bg-emerald-500/20 border border-emerald-500/40" />
            <span className="text-slate-300">Available</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded bg-amber-500/20 border border-amber-500/60" />
            <span className="text-slate-300">Held (2-Min Timer / Waitlist)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded bg-rose-500/20 border border-rose-500/40" />
            <span className="text-slate-300">Booked (Segment Taken)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded bg-cyan-500 ring-2 ring-cyan-400/50" />
            <span className="text-cyan-300 font-semibold">Your Active Hold</span>
          </div>
        </div>

        {/* Coach Fuselage & Seats */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 flex flex-col items-center space-y-3">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-sm font-medium">Checking live atomic seat locks...</p>
          </div>
        ) : selectedCoach ? (
          <div className="max-w-2xl mx-auto bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-inner relative">
            {/* Front of Train indicator */}
            <div className="w-full text-center pb-6 border-b border-slate-800/80 mb-6 flex items-center justify-center space-x-2 text-slate-500 text-xs font-semibold uppercase tracking-widest">
              <TrainIcon className="w-4 h-4" />
              <span>FRONT OF TRAIN • DIRECTION OF TRAVEL</span>
            </div>

            {/* Seat Grid: 4 columns (A, B, [Aisle], C, D) */}
            <div className="space-y-4">
              {/* Group seats by row */}
              {Array.from(new Set((selectedCoach.seats || []).map((s: Seat) => s.seat_number.slice(0, -1)))).map((rowNum: string) => {
                const coachSeats = selectedCoach.seats || [];
                const rowSeats = coachSeats.filter((s: Seat) => s.seat_number.startsWith(rowNum));
                const seatA = rowSeats.find((s: Seat) => s.seat_number.endsWith('A'));
                const seatB = rowSeats.find((s: Seat) => s.seat_number.endsWith('B'));
                const seatC = rowSeats.find((s: Seat) => s.seat_number.endsWith('C'));
                const seatD = rowSeats.find((s: Seat) => s.seat_number.endsWith('D'));

                return (
                  <div key={rowNum} className="flex items-center justify-between gap-2 sm:gap-4">
                    {/* Left pair (A & B) */}
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      {seatA && renderSeatButton(seatA, selectedCoach)}
                      {seatB && renderSeatButton(seatB, selectedCoach)}
                    </div>

                    {/* Aisle */}
                    <div className="text-[10px] text-slate-600 font-mono font-bold px-2 uppercase select-none">
                      Row {rowNum}
                    </div>

                    {/* Right pair (C & D) */}
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
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-cyan-500/40 p-4 shadow-2xl animate-in slide-in-from-bottom duration-300">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Hold Details */}
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500 flex items-center justify-center text-cyan-400 font-extrabold text-lg shadow-lg shadow-cyan-500/20">
                {activeHold.seatNumber}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-white text-base">Seat Held Exclusively for You</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700 font-mono">
                    {activeHold.coachCode}
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  {train?.stations.find((s) => s.stop_order === startStop)?.name} ➔{' '}
                  {train?.stations.find((s) => s.stop_order === endStop)?.name} • Total: ${activeHold.price}
                </p>
              </div>
            </div>

            {/* Countdown Timer with Progress Bar */}
            <div className="w-full md:w-64 flex flex-col items-center">
              <div className="flex items-center justify-between w-full text-xs font-semibold mb-1">
                <span className="flex items-center space-x-1 text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Hold Expires In:</span>
                </span>
                <span
                  className={`font-mono text-sm font-bold ${
                    holdSecondsRemaining < 30 ? 'text-rose-400 animate-pulse' : 'text-amber-400'
                  }`}
                >
                  {Math.floor(holdSecondsRemaining / 60)}:
                  {(holdSecondsRemaining % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${
                    holdSecondsRemaining < 30 ? 'bg-rose-500' : 'bg-amber-400'
                  }`}
                  style={{ width: `${(holdSecondsRemaining / 120) * 100}%` }}
                />
              </div>
            </div>

            {/* Mock Payment Test Buttons */}
            <div className="flex items-center space-x-2.5 w-full md:w-auto">
              <button
                disabled={isProcessing}
                onClick={() => handlePayment('CONFIRM')}
                className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-black font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 text-xs sm:text-sm transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simulate Pay (Success)</span>
              </button>

              <button
                disabled={isProcessing}
                onClick={() => handlePayment('FAIL')}
                className="flex items-center justify-center space-x-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all"
                title="Test edge case: simulate payment decline & release"
              >
                <XCircle className="w-4 h-4" />
                <span>Simulate Pay (Fail)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* USER-REQUESTED WAITLIST MODAL */}
      {waitlistModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3 text-amber-400">
              <Users className="w-6 h-6" />
              <h3 className="text-lg font-bold text-white">Seat Currently Being Held</h3>
            </div>

            <p className="text-sm text-slate-300">
              Seat <strong className="text-white">{waitlistModal.seat.seat_number}</strong> is in checkout by another passenger.
            </p>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Current Queue Size:</span>
                <span className="font-bold text-amber-400">{waitlistModal.waitlistCount} Passenger(s)</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Your Status:</span>
                <span className="font-bold text-cyan-400">
                  {waitlistModal.myPosition ? `#${waitlistModal.myPosition} in Waitlist` : 'Not in queue'}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              💡 <strong>Smart Handover:</strong> If the current buyer's payment fails or their 2-minute timer expires, the seat automatically transfers to the next person in line.
            </p>

            <div className="flex items-center space-x-3 pt-2">
              {waitlistModal.myPosition ? (
                <button
                  disabled={isProcessing}
                  onClick={() => handleLeaveWaitlist(waitlistModal.myWaitlistId!)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 text-sm font-semibold border border-rose-500/30 transition-all"
                >
                  Leave Waitlist
                </button>
              ) : (
                <button
                  disabled={isProcessing}
                  onClick={() => handleJoinWaitlist(waitlistModal.seat.id)}
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-sm font-bold shadow-lg shadow-cyan-500/20 transition-all"
                >
                  Join Waitlist (Queue #{waitlistModal.waitlistCount + 1})
                </button>
              )}
              <button
                onClick={() => setWaitlistModal(null)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-all"
              >
                Close & Pick Other
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMED BOOKING PASS MODAL */}
      {confirmedBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-extrabold text-white">Booking Confirmed!</h3>
              <p className="text-xs text-slate-400">
                Booking Reference:{' '}
                <span className="font-mono text-cyan-400 font-bold text-sm">
                  {confirmedBooking.booking_reference}
                </span>
              </p>
            </div>

            {/* Boarding Pass Ticket */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 font-mono text-xs relative overflow-hidden">
              <div className="flex justify-between border-b border-slate-800/80 pb-3">
                <div>
                  <p className="text-slate-500 uppercase">Passenger</p>
                  <p className="text-sm font-bold text-white">{confirmedBooking.user_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500 uppercase">Train</p>
                  <p className="text-sm font-bold text-cyan-400">{confirmedBooking.train_name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-slate-800/80 pb-3">
                <div>
                  <p className="text-slate-500 uppercase">From</p>
                  <p className="font-semibold text-white">{confirmedBooking.start_station_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500 uppercase">To</p>
                  <p className="font-semibold text-white">{confirmedBooking.end_station_name}</p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-1">
                <div>
                  <p className="text-slate-500 uppercase">Coach & Seat</p>
                  <p className="text-base font-extrabold text-white">
                    {confirmedBooking.coach_code} • {confirmedBooking.seat_number}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500 uppercase">Fare Paid</p>
                  <p className="text-base font-extrabold text-emerald-400">
                    ${confirmedBooking.total_price}
                  </p>
                </div>
              </div>

              {/* Decorative barcode */}
              <div className="pt-3 border-t border-slate-800 flex flex-col items-center justify-center space-y-1">
                <div className="h-7 w-48 bg-gradient-to-r from-slate-700 via-slate-400 to-slate-700 opacity-60 rounded flex items-center justify-center text-[9px] text-black font-extrabold tracking-widest">
                  ||||| | |||| ||| |||| | ||
                </div>
                <span className="text-[10px] text-slate-500">ACID SECURE TRANSACTION VERIFIED</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center space-x-3">
              <Link
                href="/my-bookings"
                className="flex-1 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-center text-sm font-bold transition-all shadow-lg shadow-cyan-500/20"
              >
                View in My Bookings
              </Link>
              <button
                onClick={() => setConfirmedBooking(null)}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition-all"
              >
                Book Another Seat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Helper function to render a seat button
  function renderSeatButton(seat: Seat, coach: Coach) {
    const isBooked = seat.status === 'BOOKED';
    const isHeldByMe = seat.held_by_me;
    const isHeldByOther = seat.status === 'HELD' && !isHeldByMe;
    const isAvailable = seat.status === 'AVAILABLE';

    let styling = 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed';
    let badgeText = '';

    if (isHeldByMe) {
      styling = 'bg-cyan-500/20 border-cyan-400 text-cyan-300 ring-2 ring-cyan-400/50 glow-held scale-105';
      badgeText = 'HELD';
    } else if (isHeldByOther) {
      styling = 'bg-amber-500/10 border-amber-500/40 text-amber-300 hover:border-amber-400';
      badgeText = seat.waitlist_count ? `WL(${seat.waitlist_count})` : 'HELD';
    } else if (isBooked) {
      styling = 'bg-rose-950/20 border-rose-900/40 text-rose-500/60 cursor-not-allowed';
      badgeText = 'SOLD';
    } else if (isAvailable) {
      styling = 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400 hover:scale-105';
    }

    return (
      <button
        key={seat.id}
        disabled={isBooked}
        onClick={() => handleSeatClick(seat, coach)}
        className={`relative w-12 h-14 sm:w-14 sm:h-16 rounded-xl border flex flex-col items-center justify-center transition-all ${styling}`}
      >
        <span className="text-xs sm:text-sm font-bold font-mono">{seat.seat_number}</span>
        <span className="text-[9px] text-slate-400 uppercase tracking-tighter">
          {seat.seat_type === 'Window' ? 'Win' : 'Aisle'}
        </span>
        {badgeText && (
          <span className="absolute -top-2 -right-1 text-[8px] font-mono px-1 py-0.2 rounded-full font-bold bg-slate-950 border border-slate-700">
            {badgeText}
          </span>
        )}
      </button>
    );
  }
}
