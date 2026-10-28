'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { Mail, Lock, Train, User, UserPlus, LogIn, AlertCircle, CheckCircle2 } from 'lucide-react';

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  const { login, register } = useUser();

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'LOGIN') {
        const result = await login(email, password);
        if (!result.success) {
          setError(result.error || 'Failed to sign in');
        } else {
          router.push(redirectUrl);
        }
      } else {
        // Register new account (Passenger only)
        const result = await register({
          name,
          email,
          password,
        });

        if (!result.success) {
          setError(result.error || 'Failed to create account');
        } else {
          setSuccessMsg('Account created successfully! Redirecting...');
          setTimeout(() => {
            router.push(redirectUrl);
          }, 800);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
      {/* Mode Switcher Tabs */}
      <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
        <button
          type="button"
          onClick={() => {
            setMode('LOGIN');
            setError(null);
          }}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
            mode === 'LOGIN'
              ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Sign In</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('REGISTER');
            setError(null);
          }}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
            mode === 'REGISTER'
              ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Create Account</span>
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3.5 rounded-xl flex items-center space-x-2 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-3.5 rounded-xl flex items-center space-x-2 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'REGISTER' && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-sm shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.01] disabled:opacity-50"
        >
          {loading
            ? 'Processing...'
            : mode === 'LOGIN'
            ? 'Sign In'
            : 'Create Account'}
        </button>
      </form>

      <div className="text-center pt-2 border-t border-slate-800">
        <p className="text-[11px] text-slate-400">
          {mode === 'LOGIN' ? "Don't have an account yet? Switch to Create Account tab." : 'Already registered? Switch to Sign In tab.'}
        </p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <div className="max-w-md mx-auto py-8 sm:py-12 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white mx-auto shadow-xl shadow-cyan-500/20">
          <Train className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          RailSync Account Portal
        </h1>
        <p className="text-xs text-slate-400">
          Secure Authentication • Role-Based Access Control
        </p>
      </div>

      <Suspense fallback={<div className="p-8 text-center text-slate-400 text-xs">Loading authentication form...</div>}>
        <AuthForm />
      </Suspense>
    </div>
  );
}
