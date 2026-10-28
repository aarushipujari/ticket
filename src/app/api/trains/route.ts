import { NextRequest, NextResponse } from 'next/server';
import { BookingService } from '@/lib/bookingService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const trainId = searchParams.get('trainId') || 'train_101';
    const start = parseInt(searchParams.get('start') || '0', 10);
    const end = parseInt(searchParams.get('end') || '3', 10);
    const userId = searchParams.get('userId') || 'guest_user';

    const train = BookingService.getTrainWithAvailability(trainId, start, end, userId);
    if (!train) {
      return NextResponse.json({ error: 'Train not found' }, { status: 404 });
    }

    return NextResponse.json(train);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
