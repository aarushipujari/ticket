import type { Metadata } from 'next';
import './globals.css';
import { UserProvider } from '@/context/UserContext';
import Navbar from '@/components/Navbar';
import { Train, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'RailSync Express | Vande Bharat InterCity Train Reservations',
  description: 'Aesthetic multi-stop passenger rail booking with real-time atomic seat locks and waitlist protection.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#0b1120] dark:text-slate-100 antialiased transition-colors duration-200 selection:bg-blue-600 selection:text-white">
        <UserProvider>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm py-6 text-xs text-slate-500 dark:text-slate-400 transition-colors">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 rounded bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white">
                  <Train className="w-3.5 h-3.5" />
                </div>
                <span className="font-semibold text-slate-700 dark:text-slate-200">RailSync Express</span>
                <span className="text-slate-400">•</span>
                <span>Vande Bharat Multi-Stop Concurrency Engine</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>ACID Atomic Seat Protection &amp; Serialized Handover</span>
              </div>
            </div>
          </footer>
        </UserProvider>
      </body>
    </html>
  );
}
