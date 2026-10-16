import './globals.css';
import type { Metadata } from 'next';
import { Navbar } from '../components/Navbar';
import { BetSlip } from '../components/BetSlip';
import { AuthModal } from '../components/AuthModal';
import { BetSlipProvider } from '../context/BetSlipContext';
import { AuthProvider } from '../context/AuthContext';

export const metadata: Metadata = {
  title: 'BetPoake KE | Kenya Sportsbook & Grassroots Arena',
  description: 'Enterprise Ultra-Low Latency Sports Betting Engine tailored for Kenya.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[#070b13] flex flex-col text-slate-100">
        <AuthProvider>
          <BetSlipProvider>
            <Navbar />
            <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">{children}</main>
            <BetSlip />
            <AuthModal />
          </BetSlipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
