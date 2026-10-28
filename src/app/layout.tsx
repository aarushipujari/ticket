import type { Metadata } from 'next';
import './globals.css';
import { UserProvider } from '@/context/UserContext';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'RailSync Express | High-Concurrency Multi-Stop Ticket Booking',
  description: 'Zero double-booking ticket reservation system with multi-hop segment locks and live waitlist.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-[#090d16] text-slate-100 antialiased selection:bg-cyan-500 selection:text-black">
        <UserProvider>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
          <footer className="border-t border-slate-900 bg-slate-950/40 py-6 text-center text-xs text-slate-500">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span>RailSync Express • Indian Railways Multi-Stop Concurrency Engine</span>
              <span className="text-slate-400">ACID Transactions with SQLite WAL Mode</span>
            </div>
          </footer>
        </UserProvider>
      </body>
    </html>
  );
}
