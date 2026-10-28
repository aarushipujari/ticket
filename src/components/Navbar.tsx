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
    <header className="border-b border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-[#0e1626]/95 backdrop-blur-md sticky top-0 z-50 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-600/20 group-hover:scale-105 transition-transform">
            <Train className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight">RailSync</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/80 font-mono">
                EXPRESS
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">InterCity Reservation Hub</p>
          </div>
        </Link>

        {/* Center Nav */}
        <nav className="hidden md:flex items-center space-x-1.5">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;

            if (link.highlight) {
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all border ${
                    isActive
                      ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-xs dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40'
                      : 'text-amber-800 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                  }`}
                >
                  <Icon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>{link.label}</span>
                  <span className="text-[10px] bg-amber-200 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 rounded font-mono font-bold">
                    TEST
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200 shadow-xs dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/50'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
                {link.adminOnly && !isAdmin && (
                  <span title="Admin access required">
                    <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 ml-0.5" />
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
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all shadow-xs"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-blue-600" />
            )}
          </button>

          {/* User Status / Profile */}
          {!isGuest && currentUser ? (
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2.5 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-1.5 shadow-xs">
                {isAdmin ? (
                  <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                ) : (
                  <User className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                )}
                <div className="flex flex-col text-left max-w-[120px] sm:max-w-[160px]">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate">
                      {currentUser.name}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                        isAdmin
                          ? 'bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
                          : 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                      }`}
                    >
                      {isAdmin ? 'Admin' : 'Passenger'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{currentUser.email}</span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={() => {
                  logout();
                  router.push('/login');
                }}
                className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-100 dark:bg-slate-800/80 hover:bg-rose-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 transition-colors shadow-xs"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-sm hover:shadow"
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
