import { NextRequest, NextResponse } from 'next/server';
import { BookingService } from '@/lib/bookingService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const seatId = body.seatId || 'seat_A_2B';
    const bots = parseInt(body.numberOfBots || '50', 10);

    const testResults = BookingService.runConcurrencyTest(seatId, bots);
    return NextResponse.json(testResults);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
