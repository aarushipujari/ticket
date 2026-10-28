import { NextRequest, NextResponse } from 'next/server';
import { BookingService } from '@/lib/bookingService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { holdId, userId, userEmail, action } = body;

    if (!holdId || !userId) {
      return NextResponse.json({ error: 'Hold ID and User ID are required' }, { status: 400 });
    }

    if (action === 'FAIL') {
      const released = BookingService.failOrReleaseHold(holdId, userId);
      return NextResponse.json({
        success: false,
        released,
        message: 'Mock payment failed. The seat hold was released and made available to the next passenger.'
      });
    }

    // Default action is 'CONFIRM'
    const result = BookingService.confirmPayment(holdId, userId, userEmail || 'passenger@example.com');
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
