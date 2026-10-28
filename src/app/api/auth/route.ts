import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, name, email, password, role, adminCode } = body;
    const db = getDatabase();

    if (action === 'REGISTER') {
      if (!name || !email || !password) {
        return NextResponse.json({ error: 'Name, email and password are required.' }, { status: 400 });
      }

      const cleanEmail = email.toLowerCase().trim();

      // Check if user already exists
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
      if (existing) {
        return NextResponse.json({ error: 'An account with this email already exists. Please log in.' }, { status: 409 });
      }

      // Check organiser role
      let userRole = 'passenger';
      if (role === 'organiser' || password === 'admin123') {
        if (adminCode === 'admin123' || password === 'admin123') {
          userRole = 'organiser';
        } else {
          return NextResponse.json({ error: 'Invalid Organiser Passcode. Passcode is admin123.' }, { status: 403 });
        }
      }

      const userId = 'usr_' + Math.random().toString(36).substring(2, 9);
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO users (id, name, email, password, role, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(userId, name.trim(), cleanEmail, password, userRole, now);

      return NextResponse.json({
        success: true,
        user: {
          id: userId,
          name: name.trim(),
          email: cleanEmail,
          role: userRole,
        },
      });
    }

    if (action === 'LOGIN') {
      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
      }

      const cleanEmail = email.toLowerCase().trim();

      // If password is 'admin123', immediately grant Organiser clearance
      if (password === 'admin123') {
        let adminUser = db.prepare('SELECT id, name, email, role FROM users WHERE email = ?').get(cleanEmail);
        if (!adminUser) {
          const userId = 'usr_' + Math.random().toString(36).substring(2, 9);
          db.prepare(`
            INSERT INTO users (id, name, email, password, role, created_at)
            VALUES (?, ?, ?, ?, 'organiser', ?)
          `).run(userId, cleanEmail.split('@')[0], cleanEmail, password, new Date().toISOString());
          adminUser = { id: userId, name: cleanEmail.split('@')[0], email: cleanEmail, role: 'organiser' };
        }
        return NextResponse.json({ success: true, user: adminUser });
      }

      // Check SQLite users table
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);
      if (!user) {
        return NextResponse.json({ error: 'No account found with this email. Please sign up.' }, { status: 404 });
      }

      if (user.password !== password) {
        return NextResponse.json({ error: 'Incorrect password. Try again or use admin123 for organiser.' }, { status: 401 });
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

    return NextResponse.json({ error: 'Invalid auth action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
