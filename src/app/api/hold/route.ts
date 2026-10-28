import { NextRequest, NextResponse } from 'next/server';
import { BookingService } from '@/lib/bookingService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trainId, seatId, startOrder, endOrder, userId, userName } = body;

    if (!trainId || !seatId || startOrder === undefined || endOrder === undefined || !userId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    if (startOrder >= endOrder) {
      return NextResponse.json({ error: 'Origin stop must come before destination stop' }, { status: 400 });
    }

    const result = BookingService.holdSeat(
      trainId,
      seatId,
      startOrder,
      endOrder,
      userId,
      userName || 'Passenger'
    );

    if (!result.success) {
      return NextResponse.json(result, { status: 409 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
