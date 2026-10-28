# RailSync Express: High-Concurrency Railway Reservation System

RailSync Express is a full-stack ticket reservation and inventory management system designed for multi-stop passenger rail services. It models intermediate station segment allocation, enforces strict ACID concurrency control to eliminate double-bookings, manages 120-second atomic checkout holds, automates FIFO waitlist handovers, and provides a role-protected operator telemetry hub.

---

## Technical Overview

* **Framework:** Next.js 16 (App Router), React 19, TypeScript
* **Styling & UI:** Tailwind CSS, Lucide Icons, Canvas-Confetti
* **Database Engine:** Embedded SQLite (`node:sqlite` DatabaseSync) in Write-Ahead Logging (WAL) mode
* **Concurrency Model:** Transactional write serialization using `BEGIN IMMEDIATE`
* **Route Corridor:** Vande Bharat Express (#22436), 6 stations from New Delhi (NDLS) to Patna Junction (PNBE)

---

## Core Engineering Features

### 1. Multi-Station Segment Interval Allocation
Unlike point-to-point ticket systems (e.g. flights or movie theaters), a train seat is an inventory segment across time and space.
The 6-station route comprises 5 contiguous segments:
```
[0] New Delhi (NDLS) ─── [1] Kanpur Central (CNB) ─── [2] Prayagraj Jn (PRYJ) ─── [3] Varanasi Cantt (BSB) ─── [4] Pt. Deen Dayal Upadhyaya (DDU) ─── [5] Patna Jn (PNBE)
```
* **Non-Conflicting Allocation:** A passenger booking Seat 1A from New Delhi (0) to Kanpur (1) only locks Segment 0. The same Seat 1A remains available for booking between Kanpur (1) and Patna (5).
* **Mathematical Collision Rule:** Two bookings or active holds conflict if and only if their intervals overlap:
  $$\text{existing\_start} < \text{requested\_end} \quad \land \quad \text{existing\_end} > \text{requested\_start}$$

### 2. Zero Double-Booking Concurrency Engine
To prevent race conditions when multiple users attempt to hold the exact same seat at the same millisecond:
* The transaction executes inside `BEGIN IMMEDIATE`, immediately acquiring a reserved write lock on the SQLite database.
* Confirmed bookings and active unexpired holds are queried inside the lock.
* If clear, the 120-second hold is written atomically. Competing transactions wait up to 5,000ms (`busy_timeout = 5000`) and abort with `HTTP 409 Conflict` once the lock releases.
* **Test Bench:** A live concurrency stress test panel (`/concurrency-test`) fires 50 asynchronous bot requests simultaneously to verify that exactly 1 lock is granted and 49 are rejected.

### 3. 120-Second Atomic Hold & Expiry Lifecycle
* Selecting an available seat reserves it with a 120-second Time-To-Live (TTL).
* An animated real-time countdown bar visualizes checkout time.
* If payment is completed within 120 seconds, the hold converts into a confirmed booking and issues a unique PNR (e.g., `PNR-8492014`).
* If payment fails or the timer hits 0:00, the hold expires and the seat is released back to inventory.

### 4. Automated FIFO Waitlist Promotion
* When a seat is held or booked, other passengers can queue for that specific seat.
* If the current hold expires or payment is declined, the backend automatically transfers the seat to the first person in line (`queue_position = 1`), starting their own 120-second checkout window without manual intervention.

### 5. Ticket Cancellation & Refund Workflow
* Passengers can inspect confirmed trips under **My Bookings** (`/my-bookings`).
* Cancelling a ticket immediately frees the reserved segment, triggers waitlist auto-promotion, and logs a refund notification confirming that the fare (in ₹) will be credited to the original payment source within 3–5 working days.

### 6. Role-Based Access Control (RBAC) & Security
* **Passenger Role:** Default public tier. Guests can view seat layouts and train schedules; confirming a booking requires signing in. Passengers can only access and cancel their own tickets (protected against Insecure Direct Object References - IDOR).
* **Organiser Role:** Protected operator portal (`/organiser`). The tab is hidden from regular passengers. Direct route access requires backend admin clearance (`admin@railsync.com` / `admin123`).
* **Operator Telemetry:** Real-time metrics computed directly via SQL:
  * Total Settled Revenue (`SUM(total_price)`)
  * Seat Occupancy Rate (`occupied / total * 100`)
  * Active Holds & Waitlist Counters
  * Real-Time Passenger Audit Log

---

## Architecture Diagram

```
                     ┌──────────────────────────────────────────────┐
                     │            Next.js Full-Stack App            │
                     │                                              │
┌─────────────────┐  │  ┌──────────────────────┐  ┌──────────────┐  │   ┌────────────────────┐
│ Passenger /     │ <┼─>│ Client Interface     │  │ Route        │  │   │ SQLite (WAL Mode)  │
│ Operator Browser│  │  │ React 19 UI          │<─┼> Handlers    │<─┼──>│ data/railsync.db   │
└─────────────────┘  │  │ Tailwind / Real-Time │  │ (/api/*)     │  │   │ node:sqlite engine │
                     │  └──────────────────────┘  └──────┬───────┘  │   └────────────────────┘
                     │                                   │          │
                     │                            ┌──────▼───────┐  │
                     │                            │BookingService│  │
                     │                            │ACID Domain   │  │
                     │                            └──────────────┘  │
                     └──────────────────────────────────────────────┘
```

---

## Database Schema

```sql
-- Users (Passenger vs Organiser)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'passenger',
  created_at TEXT NOT NULL
);

-- Trains & Stations (Multi-Stop Corridor)
CREATE TABLE trains (
  id TEXT PRIMARY KEY,
  train_number TEXT NOT NULL,
  name TEXT NOT NULL,
  departure_time TEXT NOT NULL,
  total_coaches INTEGER NOT NULL
);

CREATE TABLE stations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  train_id TEXT NOT NULL,
  stop_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  arrival_time TEXT NOT NULL,
  distance_km INTEGER NOT NULL,
  FOREIGN KEY (train_id) REFERENCES trains(id)
);

-- Coaches & Seats
CREATE TABLE coaches (
  id TEXT PRIMARY KEY,
  train_id TEXT NOT NULL,
  coach_code TEXT NOT NULL,
  class_type TEXT NOT NULL,
  base_price REAL NOT NULL,
  FOREIGN KEY (train_id) REFERENCES trains(id)
);

CREATE TABLE seats (
  id TEXT PRIMARY KEY,
  coach_id TEXT NOT NULL,
  seat_number TEXT NOT NULL,
  seat_type TEXT NOT NULL,
  FOREIGN KEY (coach_id) REFERENCES coaches(id)
);

-- Atomic 120s Holds
CREATE TABLE seat_holds (
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

-- Confirmed Bookings
CREATE TABLE bookings (
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
  FOREIGN KEY (seat_id) REFERENCES seats(id)
);

-- FIFO Waitlist
CREATE TABLE waitlist (
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
```

---

## API Reference

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/trains` | `GET` | Retrieve route stations, coaches, and real-time seat availability for selected segment |
| `/api/hold` | `POST` | Acquire atomic 120s seat hold wrapped in `BEGIN IMMEDIATE` transaction |
| `/api/pay` | `POST` | Process mock payment (`CONFIRM` creates PNR; `FAIL` releases hold to waitlist) |
| `/api/waitlist` | `POST`, `DELETE` | Join or leave the FIFO waitlist for a held seat |
| `/api/bookings` | `GET`, `POST` | Retrieve user bookings or cancel an existing ticket (with IDOR check) |
| `/api/auth` | `POST` | User registration, login, and administrator credential verification |
| `/api/organiser` | `GET` | Return live business metrics (revenue, occupancy, active holds, audit trail) |
| `/api/stress-test` | `POST` | Execute 50 concurrent seat requests to benchmark race-condition protection |

---

## Local Setup & Execution

### Prerequisites
* Node.js 18.17+ or Node.js 20+ / 24+
* npm 9+

### Installation & Run
```bash
# 1. Clone the repository
git clone https://github.com/aarushipujari/ticket.git
cd ticket

# 2. Install dependencies
npm install

# 3. Build optimized production package
npm run build

# 4. Start production server
npm start
```
The application will be live at `http://localhost:3000`.

---

## Default Access Credentials

| User Type | Email | Password | Access Scope |
|---|---|---|---|
| **Passenger** | Any registered email | Custom password | Search, hold, simulated pay, cancel, waitlist |
| **Administrator** | `admin@railsync.com` | `admin123` | Full Organiser Dashboard, revenue telemetry, audit trail |

---

## Verification & Evaluation Guide
Refer to [`PROJECT_EVALUATION_GUIDE.md`](./PROJECT_EVALUATION_GUIDE.md) for the itemized mapping against all 10 evaluation rubrics and the examiner viva defense script.
