'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Wallet, ShieldCheck, Flame, Plus, Plane, Sparkles } from 'lucide-react';
import { DepositModal } from './DepositModal';

export function Navbar() {
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [balance] = useState(500000); // KES 5,000.00 micro-units

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#090e1a] border-b border-slate-800/80 px-4 lg:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
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
              <Link href="/" className="hover:text-rose-400 transition flex items-center gap-1">
                <Plane className="w-3.5 h-3.5 text-rose-500" /> Aviator
              </Link>
              <Link href="/" className="hover:text-amber-400 transition flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Casino
              </Link>
              <Link href="/admin/referee" className="hover:text-emerald-400 transition flex items-center gap-1 text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Grassroots Console
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="bg-[#0f172a] border border-slate-800 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <Wallet className="w-3.5 h-3.5 text-amber-400" />
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400 font-extrabold leading-none">M-PESA WALLET</span>
                <span className="text-xs font-black text-white font-mono leading-tight">KES {(balance / 100).toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => setIsDepositOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-black text-xs uppercase px-3.5 py-2 rounded-xl flex items-center gap-1 transition shadow-lg shadow-emerald-500/20"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" /> DEPOSIT
            </button>
          </div>
        </div>
      </header>

      <DepositModal isOpen={isDepositOpen} onClose={() => setIsDepositOpen(false)} />
    </>
  );
}
