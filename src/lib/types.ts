export interface Station {
  id: number;
  train_id: string;
  stop_order: number;
  name: string;
  arrival_time: string;
  distance_km: number;
}

export interface Coach {
  id: string;
  train_id: string;
  coach_code: string;
  class_type: 'Executive Chair' | 'Standard Chair';
  base_price: number;
  seats?: Seat[];
}

export interface Seat {
  id: string;
  coach_id: string;
  seat_number: string;
  seat_type: 'Window' | 'Aisle';
  // Dynamic status for a queried segment:
  status?: 'AVAILABLE' | 'HELD' | 'BOOKED';
  held_by_me?: boolean;
  held_expires_at?: string;
  waitlist_count?: number;
  my_waitlist_position?: number | null;
}

export interface Train {
  id: string;
  train_number: string;
  name: string;
  departure_time: string;
  stations: Station[];
  coaches: Coach[];
}

export interface Booking {
  id: string;
  booking_reference: string;
  user_id: string;
  user_name: string;
  user_email: string;
  seat_id: string;
  seat_number: string;
  coach_code: string;
  class_type: string;
  train_id: string;
  train_name: string;
  train_number: string;
  start_stop_order: number;
  start_station_name: string;
  end_stop_order: number;
  end_station_name: string;
  status: 'CONFIRMED' | 'CANCELLED';
  total_price: number;
  created_at: string;
}

export interface SeatHold {
  id: string;
  seat_id: string;
  train_id: string;
  start_stop_order: number;
  end_stop_order: number;
  user_id: string;
  user_name: string;
  held_at: string;
  expires_at: string;
  status: 'ACTIVE' | 'EXPIRED' | 'RELEASED' | 'CONVERTED';
}

export interface WaitlistEntry {
  id: string;
  seat_id: string;
  train_id: string;
  start_stop_order: number;
  end_stop_order: number;
  user_id: string;
  user_name: string;
  queue_position: number;
  status: 'WAITING' | 'PROMOTED' | 'EXPIRED' | 'LEFT';
  created_at: string;
}
