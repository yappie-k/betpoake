'use client';

import React from 'react';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

export function GameUnavailable({ onReturn }: { onReturn: () => void }) {
  return (
    <div className="min-h-[500px] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0c1220] border border-slate-800/80 rounded-2xl p-8 shadow-2xl text-center space-y-5">
        {/* Glowing Amber Warning Icon */}
        <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(245,158,11,0.2)]">
          <AlertTriangle className="w-9 h-9 text-amber-400 stroke-[2.5]" />
        </div>

        {/* Headings */}
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white tracking-wide uppercase">
            Game Unavailable
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
            Unable to establish a connection. This game module is currently under maintenance or experiencing high traffic.
          </p>
        </div>

        {/* Return Button */}
        <button
          onClick={onReturn}
          className="w-full py-3.5 bg-[#141e33] hover:bg-[#1a2742] active:scale-98 text-slate-200 hover:text-white font-black text-xs uppercase rounded-xl transition border border-slate-700/80 flex items-center justify-center gap-2 shadow-lg tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Lobby
        </button>
      </div>
    </div>
  );
}
