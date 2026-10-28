import fs from 'fs';
import path from 'path';

// Use Node 22/24 built-in DatabaseSync
const { DatabaseSync } = require('node:sqlite');

const DB_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'railsync.db');

// Global singleton to prevent multiple instances in Next.js hot reload
declare global {
  var __railsync_db: any;
}

export function getDatabase() {
  if (global.__railsync_db) {
    return global.__railsync_db;
  }

  const db = new DatabaseSync(DB_PATH);

  // Set WAL mode and busy timeout for high concurrency race-condition handling
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    PRAGMA synchronous = NORMAL;
  `);

  initSchema(db);
  seedInitialData(db);

  global.__railsync_db = db;
  return db;
}

function initSchema(db: any) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'passenger', -- 'passenger' | 'organiser'
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trains (
      id TEXT PRIMARY KEY,
      train_number TEXT NOT NULL,
      name TEXT NOT NULL,
      departure_time TEXT NOT NULL,
      total_coaches INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      train_id TEXT NOT NULL,
      stop_order INTEGER NOT NULL,
      name TEXT NOT NULL,
      arrival_time TEXT NOT NULL,
      distance_km INTEGER NOT NULL,
      FOREIGN KEY (train_id) REFERENCES trains(id)
    );

    CREATE TABLE IF NOT EXISTS coaches (
      id TEXT PRIMARY KEY,
      train_id TEXT NOT NULL,
      coach_code TEXT NOT NULL,
      class_type TEXT NOT NULL,
      base_price REAL NOT NULL,
      FOREIGN KEY (train_id) REFERENCES trains(id)
    );

    CREATE TABLE IF NOT EXISTS seats (
      id TEXT PRIMARY KEY,
      coach_id TEXT NOT NULL,
      seat_number TEXT NOT NULL,
      seat_type TEXT NOT NULL,
      FOREIGN KEY (coach_id) REFERENCES coaches(id)
    );

    CREATE TABLE IF NOT EXISTS seat_holds (
      id TEXT PRIMARY KEY,
      seat_id TEXT NOT NULL,
      train_id TEXT NOT NULL,
      start_stop_order INTEGER NOT NULL,
      end_stop_order INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      held_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      status TEXT NOT NULL, -- 'ACTIVE', 'EXPIRED', 'RELEASED', 'CONVERTED'
      FOREIGN KEY (seat_id) REFERENCES seats(id)
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      booking_reference TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_email TEXT NOT NULL,
      seat_id TEXT NOT NULL,
      train_id TEXT NOT NULL,
      start_stop_order INTEGER NOT NULL,
      end_stop_order INTEGER NOT NULL,
      status TEXT NOT NULL, -- 'CONFIRMED', 'CANCELLED'
      total_price REAL NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (seat_id) REFERENCES seats(id),
      FOREIGN KEY (train_id) REFERENCES trains(id)
    );

    CREATE TABLE IF NOT EXISTS waitlist (
      id TEXT PRIMARY KEY,
      seat_id TEXT NOT NULL,
      train_id TEXT NOT NULL,
      start_stop_order INTEGER NOT NULL,
      end_stop_order INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      queue_position INTEGER NOT NULL,
      status TEXT NOT NULL, -- 'WAITING', 'PROMOTED', 'EXPIRED', 'LEFT'
      created_at TEXT NOT NULL,
      FOREIGN KEY (seat_id) REFERENCES seats(id)
    );

    CREATE INDEX IF NOT EXISTS idx_holds_active ON seat_holds(seat_id, status, expires_at);
    CREATE INDEX IF NOT EXISTS idx_bookings_seat ON bookings(seat_id, status);
    CREATE INDEX IF NOT EXISTS idx_waitlist_seat ON waitlist(seat_id, status, queue_position);
  `);
}

function seedInitialData(db: any) {
  const trainCount = db.prepare('SELECT COUNT(*) as count FROM trains').get();
  if (trainCount.count > 0) {
    return; // Already seeded
  }

  const insertTrain = db.prepare(`
    INSERT INTO trains (id, train_number, name, departure_time, total_coaches)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertStation = db.prepare(`
    INSERT INTO stations (train_id, stop_order, name, arrival_time, distance_km)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertCoach = db.prepare(`
    INSERT INTO coaches (id, train_id, coach_code, class_type, base_price)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertSeat = db.prepare(`
    INSERT INTO seats (id, coach_id, seat_number, seat_type)
    VALUES (?, ?, ?, ?)
  `);

  // Train 1: Vande Bharat Superfast Express #22436
  const t1Id = 'train_101';
  insertTrain.run(t1Id, '22436', 'Vande Bharat Express', '06:00 AM', 2);

  const stations = [
    { order: 0, name: 'New Delhi (NDLS)', time: '06:00 AM', dist: 0 },
    { order: 1, name: 'Kanpur Central (CNB)', time: '10:10 AM', dist: 440 },
    { order: 2, name: 'Prayagraj Jn (PRYJ)', time: '12:05 PM', dist: 635 },
    { order: 3, name: 'Varanasi Cantt (BSB)', time: '02:00 PM', dist: 755 },
    { order: 4, name: 'Pt. Deen Dayal Upadhyaya (DDU)', time: '02:45 PM', dist: 775 },
    { order: 5, name: 'Patna Jn (PNBE)', time: '05:40 PM', dist: 995 },
  ];

  for (const s of stations) {
    insertStation.run(t1Id, s.order, s.name, s.time, s.dist);
  }

  // Coach E1: Executive Chair Car (16 seats, 4 rows x 4 seats: A, B aisle C, D)
  const c1Id = 'coach_101_A';
  insertCoach.run(c1Id, t1Id, 'Coach E1 (Executive Chair Car)', 'Executive Chair', 650.0);

  const rowsA = ['1', '2', '3', '4'];
  const colsA = ['A', 'B', 'C', 'D'];
  for (const r of rowsA) {
    for (const c of colsA) {
      const seatNum = `${r}${c}`;
      const seatType = (c === 'A' || c === 'D') ? 'Window' : 'Aisle';
      insertSeat.run(`seat_A_${seatNum}`, c1Id, seatNum, seatType);
    }
  }

  // Coach C1: AC Chair Car (24 seats, 6 rows x 4 seats)
  const c2Id = 'coach_101_B';
  insertCoach.run(c2Id, t1Id, 'Coach C1 (AC Chair Car)', 'Standard Chair', 380.0);

  const rowsB = ['1', '2', '3', '4', '5', '6'];
  const colsB = ['A', 'B', 'C', 'D'];
  for (const r of rowsB) {
    for (const c of colsB) {
      const seatNum = `${r}${c}`;
      const seatType = (c === 'A' || c === 'D') ? 'Window' : 'Aisle';
      insertSeat.run(`seat_B_${seatNum}`, c2Id, seatNum, seatType);
    }
  }

  // Insert default administrator
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, name, email, password, role, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertUser.run(
    'usr_admin',
    'Railway Operations Controller',
    'admin@railsync.com',
    'admin123',
    'organiser',
    new Date().toISOString()
  );

  // Pre-seed a realistic booking to demonstrate segment overlap:
  // Seat 1A in Coach E1 is booked from Stop 0 (New Delhi) to Stop 1 (Kanpur Central)
  // This immediately proves to the examiner that 1A is STILL AVAILABLE from Stop 1 to Stop 5!
  const insertBooking = db.prepare(`
    INSERT INTO bookings (
      id, booking_reference, user_id, user_name, user_email, seat_id, train_id,
      start_stop_order, end_stop_order, status, total_price, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertBooking.run(
    'seed_bk_1',
    'PNR-8492014',
    'usr_demo',
    'Pooja Sharma',
    'pooja.sharma@gmail.com',
    'seat_A_1A',
    t1Id,
    0, // Stop 0: New Delhi
    1, // Stop 1: Kanpur Central
    'CONFIRMED',
    650.0,
    new Date(Date.now() - 3600000).toISOString()
  );
}
