import { NextRequest, NextResponse } from 'next/server';
import { BookingService } from '@/lib/bookingService';

export async function GET(request: NextRequest) {
  try {
    const metrics = BookingService.getOrganiserMetrics();
    return NextResponse.json(metrics);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
