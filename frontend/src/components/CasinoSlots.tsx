'use client';

import React, { useState } from 'react';
import { Sparkles, Trophy, RotateCcw } from 'lucide-react';

const SYMBOLS = ['🍒', '🍋', '🍇', '🔔', '💎', '7️⃣'];

export function CasinoSlots({ userBalance, onBalanceChange }: { userBalance: number; onBalanceChange: (newBal: number) => void }) {
  const [reels, setReels] = useState<string[]>(['💎', '7️⃣', '💎']);
  const [isSpinning, setIsSpinning] = useState(false);
  const [bet, setBet] = useState(100);
  const [winMessage, setWinMessage] = useState<string | null>(null);

  const handleSpin = () => {
    if (userBalance < bet) {
      alert('Insufficient funds. Top up via M-Pesa.');
      return;
    }

    onBalanceChange(userBalance - bet);
    setIsSpinning(true);
    setWinMessage(null);

    // Reel spin animation
    let count = 0;
    const interval = setInterval(() => {
      setReels([
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      ]);
      count++;
      if (count >= 15) {
        clearInterval(interval);
        finalizeSpin();
      }
    }, 80);
  };

  const finalizeSpin = () => {
    setIsSpinning(false);
    const r1 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const r2 = Math.random() > 0.6 ? r1 : SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const r3 = Math.random() > 0.7 ? r2 : SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];

    setReels([r1, r2, r3]);

    if (r1 === r2 && r2 === r3) {
      const multiplier = r1 === '7️⃣' ? 50 : r1 === '💎' ? 25 : 10;
      const win = bet * multiplier;
      onBalanceChange(userBalance - bet + win);
      setWinMessage(`JACKPOT! 3x ${r1} — YOU WON KES ${win.toLocaleString()}!`);
    } else if (r1 === r2 || r2 === r3 || r1 === r3) {
      const win = Math.round(bet * 1.5);
      onBalanceChange(userBalance - bet + win);
      setWinMessage(`MATCH 2! — You won KES ${win.toLocaleString()}`);
    }
  };

  return (
    <div className="bg-[#0b1222] border border-slate-800 rounded-2xl p-6 shadow-2xl text-center space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-black text-white uppercase tracking-wider">BetPoake Fruit Fiesta Slots</h3>
        </div>
        <span className="text-xs font-mono font-bold text-emerald-400">JACKPOT: 50x</span>
      </div>

      {/* 3 Reels Slot Display */}
      <div className="bg-[#060a14] border-2 border-amber-500/40 rounded-2xl p-6 py-8 flex justify-center gap-4 shadow-inner">
        {reels.map((sym, idx) => (
          <div
            key={idx}
            className={`w-24 h-28 bg-gradient-to-b from-[#131d33] to-[#090f1d] border border-slate-700 rounded-xl flex items-center justify-center text-5xl shadow-xl transition-transform ${
              isSpinning ? 'scale-95 blur-[1px]' : 'scale-100'
            }`}
          >
            {sym}
          </div>
        ))}
      </div>

      {winMessage && (
        <div className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 font-black text-sm p-3 rounded-xl animate-bounce">
          {winMessage}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-slate-400 uppercase">STAKE:</span>
          {[50, 100, 200, 500].map((v) => (
            <button
              key={v}
              disabled={isSpinning}
              onClick={() => setBet(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                bet === v ? 'bg-amber-400 text-slate-950 border-amber-300' : 'bg-slate-900 text-slate-300 border-slate-700'
              }`}
            >
              KES {v}
            </button>
          ))}
        </div>

        <button
          disabled={isSpinning}
          onClick={handleSpin}
          className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 active:scale-95 text-slate-950 font-black text-sm uppercase rounded-xl transition shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2"
        >
          <RotateCcw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
          {isSpinning ? 'SPINNING...' : `SPIN KES ${bet}`}
        </button>
      </div>
    </div>
  );
}
