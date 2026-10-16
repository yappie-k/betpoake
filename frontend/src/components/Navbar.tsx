'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Wallet, ShieldCheck, Flame, Plus } from 'lucide-react';
import { DepositModal } from './DepositModal';

export function Navbar() {
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [balance] = useState(500000); // Sample 5,000.00 KES micro-units

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0d1322] border-b border-slate-800 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl font-black italic tracking-wider text-emerald-400">BET<span className="text-white">POAKE</span></span>
              <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-500/30">KE</span>
            </Link>

            <nav className="hidden md:flex items-center gap-4 text-sm font-semibold text-slate-300">
              <Link href="/" className="hover:text-emerald-400 transition flex items-center gap-1 text-emerald-400">
                <Flame className="w-4 h-4" /> Live Sports
              </Link>
              <Link href="/admin/referee" className="hover:text-emerald-400 transition flex items-center gap-1 text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Grassroots Console
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-900 border border-slate-700/60 rounded-lg px-3 py-1.5 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold leading-none">BALANCE</span>
                <span className="text-sm font-black text-white leading-tight">KES {(balance / 100).toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => setIsDepositOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-bold text-xs uppercase px-3.5 py-2 rounded-lg flex items-center gap-1 transition"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" /> Deposit
            </button>
          </div>
        </div>
      </header>

      <DepositModal isOpen={isDepositOpen} onClose={() => setIsDepositOpen(false)} />
    </>
  );
}