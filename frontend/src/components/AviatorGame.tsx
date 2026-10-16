'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plane, History, Users, Sparkles, Volume2, VolumeX } from 'lucide-react';

export function AviatorGame({ userBalance, onBalanceChange }: { userBalance: number; onBalanceChange: (newBal: number) => void }) {
  const [multiplier, setMultiplier] = useState(1.00);
  const [gameState, setGameState] = useState<'IDLE' | 'FLYING' | 'FLEW_AWAY'>('IDLE');
  const [countdown, setCountdown] = useState(5);
  const [betAmount, setBetAmount] = useState(100);
  const [hasBet, setHasBet] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [cashoutAmount, setCashoutAmount] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([1.34, 2.85, 1.15, 8.42, 1.95, 24.10, 1.08, 3.12, 1.50]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Simulated Live Kenyan Players Feed
  const [liveBets] = useState([
    { phone: '254712***48', bet: 250, cashout: 2.15, win: 537.50 },
    { phone: '254790***12', bet: 1000, cashout: 1.45, win: 1450.00 },
    { phone: '254722***90', bet: 50, cashout: 5.20, win: 260.00 },
    { phone: '254705***33', bet: 500, cashout: 1.80, win: 900.00 },
    { phone: '254741***77', bet: 100, cashout: null, win: null },
  ]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const crashPointRef = useRef<number>(1.00);

  // Generate crash point (house edge 4%)
  const generateCrashPoint = () => {
    const r = Math.random();
    if (r < 0.04) return 1.00;
    return Number((1.01 + Math.random() * 3.5 * (Math.random() > 0.7 ? 4 : 1.2)).toFixed(2));
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (gameState === 'IDLE') {
      let timer = 5;
      setCountdown(5);
      setCashedOut(false);
      setCashoutAmount(null);
      setMultiplier(1.00);

      interval = setInterval(() => {
        timer -= 1;
        setCountdown(timer);
        if (timer <= 0) {
          clearInterval(interval);
          startRound();
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [gameState]);

  const startRound = () => {
    setGameState('FLYING');
    crashPointRef.current = generateCrashPoint();
    startTimeRef.current = Date.now();
  };

  useEffect(() => {
    if (gameState !== 'FLYING') return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    const render = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const currentMulti = Number(Math.max(1.00, Math.exp(0.19 * elapsed)).toFixed(2));
      setMultiplier(currentMulti);

      // Plane flew away!
      if (currentMulti >= crashPointRef.current) {
        setGameState('FLEW_AWAY');
        setHasBet(false);
        setHistory((prev) => [crashPointRef.current, ...prev.slice(0, 11)]);
        return;
      }

      // Draw Aviator Red Plane Trajectory
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const progress = Math.min(1, (currentMulti - 1) / 4);
        const startX = 40;
        const startY = canvas.height - 40;
        const endX = startX + progress * (canvas.width - 120);
        const endY = startY - Math.pow(progress, 1.5) * (canvas.height - 100);

        // Fill area under curve
        const gradient = ctx.createLinearGradient(0, endY, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(225, 29, 72, 0.35)');
        gradient.addColorStop(1, 'rgba(225, 29, 72, 0.0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(canvas.width * 0.35, startY, endX, endY);
        ctx.lineTo(endX, startY);
        ctx.closePath();
        ctx.fill();

        // Stroke line
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#e11d48';
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(canvas.width * 0.35, startY, endX, endY);
        ctx.stroke();

        // Red Plane Head
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(endX, endY, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e11d48';
        ctx.beginPath();
        ctx.arc(endX, endY, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [gameState]);

  const handlePlaceBet = () => {
    if (userBalance < betAmount) {
      alert('Insufficient balance. Please deposit via M-Pesa.');
      return;
    }
    onBalanceChange(userBalance - betAmount);
    setHasBet(true);
  };

  const handleCashout = () => {
    if (!hasBet || cashedOut) return;
    const win = Number((betAmount * multiplier).toFixed(2));
    onBalanceChange(userBalance + win);
    setCashedOut(true);
    setCashoutAmount(win);
    setHasBet(false);
  };

  return (
    <div className="bg-[#0b111e] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Top Multiplier Strip */}
      <div className="bg-[#060a12] px-3 py-2 border-b border-slate-800/80 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <History className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          {history.map((val, idx) => (
            <span
              key={idx}
              className={`px-2 py-0.5 rounded-full font-black text-[11px] shrink-0 border ${
                val >= 10.0
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : val >= 2.0
                  ? 'bg-purple-950/70 text-purple-400 border-purple-800/50'
                  : 'bg-slate-900 text-blue-400 border-slate-800'
              }`}
            >
              {val.toFixed(2)}x
            </span>
          ))}
        </div>

        <button onClick={() => setSoundEnabled(!soundEnabled)} className="text-slate-400 hover:text-white pl-2">
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-400" />}
        </button>
      </div>

      {/* Main Flight Arena Canvas */}
      <div className="relative h-64 md:h-80 bg-gradient-to-b from-[#0e172a] via-[#090f1d] to-[#04070e] flex items-center justify-center overflow-hidden">
        <canvas ref={canvasRef} width={650} height={320} className="absolute inset-0 w-full h-full" />

        <div className="relative z-10 text-center select-none">
          {gameState === 'IDLE' && (
            <div className="space-y-1">
              <span className="text-[11px] uppercase font-black text-rose-400 tracking-widest flex items-center justify-center gap-1">
                <Plane className="w-4 h-4 animate-bounce" /> NEXT ROUND IN
              </span>
              <div className="text-5xl md:text-6xl font-black font-mono text-white tracking-wider">{countdown}s</div>
              <div className="w-36 h-1.5 bg-slate-800 rounded-full mx-auto overflow-hidden">
                <div
                  className="h-full bg-rose-500 transition-all duration-1000"
                  style={{ width: `${(countdown / 5) * 100}%` }}
                />
              </div>
            </div>
          )}

          {gameState === 'FLYING' && (
            <div className="space-y-1">
              <div className="text-6xl md:text-8xl font-black font-mono text-white tracking-tight drop-shadow-[0_0_35px_rgba(225,29,72,0.6)]">
                {multiplier.toFixed(2)}x
              </div>
              <span className="text-xs uppercase font-extrabold text-rose-400 tracking-widest animate-pulse">
                AVIATOR IN FLIGHT
              </span>
            </div>
          )}

          {gameState === 'FLEW_AWAY' && (
            <div className="space-y-1">
              <span className="text-xs font-black uppercase text-rose-500 tracking-widest">FLEW AWAY</span>
              <div className="text-5xl md:text-7xl font-black font-mono text-rose-500 drop-shadow-[0_0_30px_rgba(244,63,94,0.6)]">
                {crashPointRef.current.toFixed(2)}x
              </div>
              <span className="text-xs text-slate-500 font-bold">Waiting for next flight...</span>
            </div>
          )}

          {cashedOut && cashoutAmount && (
            <div className="mt-2 bg-emerald-500/20 border border-emerald-500/60 text-emerald-400 text-xs font-black px-4 py-1.5 rounded-full animate-bounce">
              WON KES {cashoutAmount.toFixed(2)}
            </div>
          )}
        </div>
      </div>

      {/* Bet Control Deck */}
      <div className="p-4 bg-[#080d18] border-t border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Bet Chips & Input */}
        <div className="md:col-span-6 space-y-1.5">
          <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase">
            <span>BET AMOUNT (KES)</span>
            <span>BALANCE: KES {userBalance.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="10"
              max="50000"
              disabled={hasBet}
              value={betAmount}
              onChange={(e) => setBetAmount(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono font-bold text-sm focus:border-rose-500 outline-none"
            />
            <div className="grid grid-cols-4 gap-1 shrink-0">
              {[50, 100, 200, 500].map((amt) => (
                <button
                  key={amt}
                  disabled={hasBet}
                  onClick={() => setBetAmount(amt)}
                  className="bg-slate-800 hover:bg-slate-700 text-[11px] font-black px-2.5 py-1.5 rounded-lg text-slate-200 border border-slate-700"
                >
                  +{amt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="md:col-span-6 flex flex-col justify-end">
          {gameState === 'FLYING' && hasBet && !cashedOut ? (
            <button
              onClick={handleCashout}
              className="w-full bg-amber-400 hover:bg-amber-500 active:scale-95 text-slate-950 font-black text-base uppercase py-3.5 rounded-xl transition shadow-xl shadow-amber-400/20"
            >
              CASHOUT KES {(betAmount * multiplier).toFixed(2)}
            </button>
          ) : (
            <button
              disabled={hasBet || gameState === 'FLYING'}
              onClick={handlePlaceBet}
              className={`w-full font-black text-base uppercase py-3.5 rounded-xl transition shadow-xl ${
                hasBet
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-rose-600 hover:bg-rose-700 active:scale-95 text-white shadow-rose-600/30'
              }`}
            >
              {hasBet ? 'WAITING FOR NEXT FLIGHT...' : `BET KES ${betAmount}`}
            </button>
          )}
        </div>
      </div>

      {/* Concurrent Kenyan Players Live Bets Panel */}
      <div className="p-3 bg-[#060912] border-t border-slate-800/80">
        <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-400 uppercase mb-2">
          <Users className="w-3.5 h-3.5 text-emerald-400" />
          <span>ALL BETS (2,841 PLAYERS ONLINE)</span>
        </div>
        <div className="space-y-1 max-h-24 overflow-y-auto font-mono text-[11px]">
          {liveBets.map((player, i) => (
            <div key={i} className="flex justify-between items-center py-1 px-2 rounded bg-slate-900/50 text-slate-300">
              <span className="font-semibold text-slate-400">{player.phone}</span>
              <span>KES {player.bet}</span>
              {player.cashout ? (
                <span className="text-emerald-400 font-bold">{player.cashout}x (+KES {player.win})</span>
              ) : (
                <span className="text-slate-600 font-bold">In-play...</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
