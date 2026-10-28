import { NextRequest, NextResponse } from 'next/server';
import { BookingService } from '@/lib/bookingService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trainId, seatId, startOrder, endOrder, userId, userName } = body;

    if (!trainId || !seatId || startOrder === undefined || endOrder === undefined || !userId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const result = BookingService.joinWaitlist(
      trainId,
      seatId,
      startOrder,
      endOrder,
      userId,
      userName || 'Passenger'
    );

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const waitlistId = searchParams.get('waitlistId');
    const userId = searchParams.get('userId');

    if (!waitlistId || !userId) {
      return NextResponse.json({ error: 'Waitlist ID and User ID required' }, { status: 400 });
    }

    const success = BookingService.leaveWaitlist(waitlistId, userId);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
