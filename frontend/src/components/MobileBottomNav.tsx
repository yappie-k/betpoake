'use client';

import React from 'react';
import { Flame, Trophy, Plane, Sparkles, Receipt } from 'lucide-react';
import { useBetSlip } from '../context/BetSlipContext';

export function MobileBottomNav({
  activeTab,
  setActiveTab,
}: {
  activeTab: string;
  setActiveTab: (t: any) => void;
}) {
  const { selections, setIsSlipOpen } = useBetSlip();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#090e1a] border-t border-slate-800 px-3 py-2 flex items-center justify-around shadow-2xl">
      <button
        onClick={() => setActiveTab('SPORTS')}
        className={`flex flex-col items-center gap-1 transition ${
          activeTab === 'SPORTS' ? 'text-amber-400 font-bold' : 'text-slate-400'
        }`}
      >
        <Trophy className="w-4 h-4" />
        <span className="text-[10px] font-bold">Sports</span>
      </button>

      <button
        onClick={() => setActiveTab('LIVE')}
        className={`flex flex-col items-center gap-1 transition ${
          activeTab === 'LIVE' ? 'text-rose-500 font-bold' : 'text-slate-400'
        }`}
      >
        <Flame className="w-4 h-4" />
        <span className="text-[10px] font-bold">Live</span>
      </button>

      <button
        onClick={() => setActiveTab('AVIATOR')}
        className={`flex flex-col items-center gap-1 transition ${
          activeTab === 'AVIATOR' ? 'text-rose-400 font-bold' : 'text-slate-400'
        }`}
      >
        <Plane className="w-4 h-4" />
        <span className="text-[10px] font-bold">Aviator</span>
      </button>

      <button
        onClick={() => setActiveTab('CASINO')}
        className={`flex flex-col items-center gap-1 transition ${
          activeTab === 'CASINO' ? 'text-amber-400 font-bold' : 'text-slate-400'
        }`}
      >
        <Sparkles className="w-4 h-4" />
        <span className="text-[10px] font-bold">Casino</span>
      </button>

      <button
        onClick={() => setIsSlipOpen(true)}
        className="relative flex flex-col items-center gap-1 text-slate-400 hover:text-emerald-400 transition"
      >
        <div className="relative">
          <Receipt className="w-4 h-4 text-emerald-400" />
          {selections.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-emerald-500 text-slate-950 font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
              {selections.length}
            </span>
          )}
        </div>
        <span className="text-[10px] font-bold text-white">Slip</span>
      </button>
    </div>
  );
}
