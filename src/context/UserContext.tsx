'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'passenger' | 'organiser';
}

interface UserContextType {
  currentUser: UserProfile | null;
  isAdmin: boolean;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  unlockAdmin: (password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: {
    name: string;
    email: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Load session & theme on mount
  useEffect(() => {
    // 1. Session
    const saved = localStorage.getItem('railsync_auth_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) setCurrentUser(parsed);
      } catch {}
    } else {
      const guest: UserProfile = {
        id: 'usr_guest',
        name: 'Guest Passenger',
        email: 'guest@railsync.com',
        role: 'passenger',
      };
      setCurrentUser(guest);
      localStorage.setItem('railsync_auth_user', JSON.stringify(guest));
    }

    // 2. Theme
    const savedTheme = localStorage.getItem('railsync_theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      applyTheme('dark');
    }
  }, []);

  const applyTheme = (t: 'dark' | 'light') => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (t === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
      }
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('railsync_theme', nextTheme);
    applyTheme(nextTheme);
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'LOGIN', email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      setCurrentUser(data.user);
      localStorage.setItem('railsync_auth_user', JSON.stringify(data.user));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during login' };
    }
  };

  const unlockAdmin = async (password: string) => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'VERIFY_ADMIN', password }),
      });
      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Invalid organiser credentials' };
      }

      setCurrentUser(data.user);
      localStorage.setItem('railsync_auth_user', JSON.stringify(data.user));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Verification error' };
    }
  };

  const register = async (formData: {
    name: string;
    email: string;
    password: string;
  }) => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REGISTER', ...formData }),
      });
      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }

      setCurrentUser(data.user);
      localStorage.setItem('railsync_auth_user', JSON.stringify(data.user));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during registration' };
    }
  };

  const logout = () => {
    const guest: UserProfile = {
      id: 'usr_guest',
      name: 'Guest Passenger',
      email: 'guest@railsync.com',
      role: 'passenger',
    };
    setCurrentUser(guest);
    localStorage.setItem('railsync_auth_user', JSON.stringify(guest));
  };

  const isAdmin = currentUser?.role === 'organiser';

  return (
    <UserContext.Provider
      value={{
        currentUser,
        isAdmin,
        theme,
        toggleTheme,
        login,
        unlockAdmin,
        register,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
