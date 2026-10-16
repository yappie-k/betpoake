'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { DepositModal } from './DepositModal';
import { Wallet, Plus, User, LogOut, Flame } from 'lucide-react';

export function Navbar() {
  const { user, openAuthModal, logout } = useAuth();
  const [isDepositOpen, setIsDepositOpen] = useState(false);

  const handleDepositClick = () => {
    if (!user) {
      openAuthModal('LOGIN');
    } else {
      setIsDepositOpen(true);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#070b14] border-b border-slate-800/80 px-4 lg:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-1.5">
              <span className="text-2xl font-black italic tracking-tighter text-white">
                BET<span className="text-amber-400">PLUS</span><span className="text-rose-500">KE</span>
              </span>
              <span className="bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                KE
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-4 text-xs font-black uppercase text-slate-300">
              <Link href="/" className="hover:text-amber-400 transition flex items-center gap-1 text-amber-400">
                <Flame className="w-3.5 h-3.5" /> Sports
              </Link>
              <Link href="/admin/referee" className="hover:text-emerald-400 transition flex items-center gap-1 text-slate-400">
                Referee Console
              </Link>
            </nav>
          </div>

          {/* Balance & Actions */}
          <div className="flex items-center gap-2.5">
            {user ? (
              <>
                <div className="bg-[#0f172a] border border-slate-800 rounded-xl px-3 py-1.5 flex items-center gap-2">
                  <Wallet className="w-3.5 h-3.5 text-amber-400" />
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-400 font-extrabold leading-none">WALLET</span>
                    <span className="text-xs font-black text-white font-mono leading-tight">
                      KES {user.balanceKes.toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleDepositClick}
                  className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-black text-xs uppercase px-3.5 py-2 rounded-xl flex items-center gap-1 transition shadow-lg shadow-emerald-500/20"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" /> DEPOSIT
                </button>

                <button
                  onClick={logout}
                  title="Logout"
                  className="text-slate-400 hover:text-red-400 p-2"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex bg-[#0f172a] border border-slate-800 rounded-xl px-3 py-1.5 flex-col">
                  <span className="text-[9px] text-slate-500 font-extrabold leading-none">BALANCE</span>
                  <span className="text-xs font-black text-slate-400 font-mono leading-tight">KES 0.00</span>
                </div>

                <button
                  onClick={() => openAuthModal('LOGIN')}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase px-3 py-2 rounded-xl transition border border-slate-700"
                >
                  Sign In
                </button>
                <button
                  onClick={() => openAuthModal('REGISTER')}
                  className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase px-3.5 py-2 rounded-xl transition shadow-lg shadow-amber-400/20"
                >
                  Register (18+)
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {user && (
        <DepositModal isOpen={isDepositOpen} onClose={() => setIsDepositOpen(false)} />
      )}
    </>
  );
}
