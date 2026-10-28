import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

// Fixed single backend-configured administrator
const ADMIN_EMAIL = 'admin@railsync.com';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_NAME = 'Rail Operations Controller';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, name, email, password } = body;
    const db = getDatabase();

    // 1. REGISTRATION (Normal users only)
    if (action === 'REGISTER') {
      if (!name || !email || !password) {
        return NextResponse.json({ error: 'Name, email and password are required.' }, { status: 400 });
      }

      const cleanEmail = email.toLowerCase().trim();

      // Disallow claiming admin email
      if (cleanEmail === ADMIN_EMAIL) {
        return NextResponse.json({ error: 'This email is reserved for system administration.' }, { status: 403 });
      }

      // Check if user already exists
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
      if (existing) {
        return NextResponse.json({ error: 'An account with this email already exists. Please log in.' }, { status: 409 });
      }

      // All public registrations are strictly passengers
      const userId = 'usr_' + Math.random().toString(36).substring(2, 9);
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO users (id, name, email, password, role, created_at)
        VALUES (?, ?, ?, ?, 'passenger', ?)
      `).run(userId, name.trim(), cleanEmail, password, now);

      return NextResponse.json({
        success: true,
        user: {
          id: userId,
          name: name.trim(),
          email: cleanEmail,
          role: 'passenger',
        },
      });
    }

    // 2. LOGIN
    if (action === 'LOGIN') {
      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
      }

      const cleanEmail = email.toLowerCase().trim();

      // Check if trying to log in as the fixed Admin
      if (cleanEmail === ADMIN_EMAIL) {
        if (password === ADMIN_PASSWORD) {
          return NextResponse.json({
            success: true,
            user: {
              id: 'usr_admin',
              name: ADMIN_NAME,
              email: ADMIN_EMAIL,
              role: 'organiser',
            },
          });
        } else {
          return NextResponse.json({ error: 'Invalid administrator credentials.' }, { status: 401 });
        }
      }

      // Normal passenger login from SQLite database
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
      if (!user) {
        return NextResponse.json({ error: 'No account found with this email. Please create an account.' }, { status: 404 });
      }

      if (user.password !== password) {
        return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 });
      }

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    }

    // 3. DIRECT ADMIN PASSCODE VERIFICATION (for Organiser Dashboard unlock)
    if (action === 'VERIFY_ADMIN') {
      if (password === ADMIN_PASSWORD) {
        return NextResponse.json({
          success: true,
          user: {
            id: 'usr_admin',
            name: ADMIN_NAME,
            email: ADMIN_EMAIL,
            role: 'organiser',
          },
        });
      }
      return NextResponse.json({ error: 'Invalid organiser credentials.' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Invalid auth action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
