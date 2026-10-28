'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import {
  Train,
  Ticket,
  BarChart3,
  Zap,
  User,
  LogOut,
  LogIn,
  Shield,
  Lock,
  Sun,
  Moon
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, isAdmin, theme, toggleTheme, logout } = useUser();

  const isGuest = !currentUser || currentUser.id === 'usr_guest';

  const navLinks = [
    { href: '/', label: 'Book Train', icon: Train },
    { href: '/my-bookings', label: 'My Bookings', icon: Ticket },
    {
      href: '/organiser',
      label: 'Organiser Hub',
      icon: BarChart3,
      adminOnly: true,
    },
    { href: '/concurrency-test', label: 'Race-Condition Arena', icon: Zap, highlight: true },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <Train className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-lg text-white tracking-tight">RailSync</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
                EXPRESS
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Multi-Stop Segment Engine</p>
          </div>
        </Link>

        {/* Center Nav */}
        <nav className="hidden md:flex items-center space-x-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                } ${link.highlight ? 'text-amber-400 border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10' : ''}`}
              >
                <Icon className={`w-4 h-4 ${link.highlight ? 'text-amber-400' : ''}`} />
                <span>{link.label}</span>
                {link.adminOnly && !isAdmin && (
                  <span title="Admin access required">
                    <Lock className="w-3 h-3 text-slate-500" />
                  </span>
                )}
                {link.highlight && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono font-semibold">
                    TEST
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Section: Theme Toggle & User Info */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Dark / Light Mode Switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 transition-all"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-cyan-500" />
            )}
          </button>

          {/* User Status / Profile */}
          {!isGuest && currentUser ? (
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5">
                {isAdmin ? (
                  <Shield className="w-4 h-4 text-purple-400" />
                ) : (
                  <User className="w-4 h-4 text-cyan-400" />
                )}
                <div className="flex flex-col text-left max-w-[130px] sm:max-w-[160px]">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[11px] font-bold text-white truncate">
                      {currentUser.name}
                    </span>
                    <span
                      className={`text-[8px] px-1 rounded font-bold uppercase ${
                        isAdmin
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          : 'bg-cyan-500/20 text-cyan-300'
                      }`}
                    >
                      {isAdmin ? 'Admin' : 'User'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 truncate">{currentUser.email}</span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={() => {
                  logout();
                  router.push('/login');
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-900 border border-slate-800 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition-all shadow-md shadow-cyan-500/20"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In / Register</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
