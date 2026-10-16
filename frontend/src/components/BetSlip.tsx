'use client';

import React, { useState } from 'react';
import { useBetSlip } from '../context/BetSlipContext';
import { useAuth } from '../context/AuthContext';
import { placeBet } from '../lib/api';
import { X, Trash2, ShieldAlert, CheckCircle2, Receipt, Lock } from 'lucide-react';
import { cn } from '../lib/utils';

export function BetSlip() {
  const { selections, removeSelection, clearSlip, stake, setStake, totalOdds, isSlipOpen, setIsSlipOpen } = useBetSlip();
  const { user, token, openAuthModal, updateBalance } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isSlipOpen) return null;

  const grossPayout = stake * totalOdds;
  const netWin = grossPayout > stake ? grossPayout - stake : 0;
  // 5% KRA Withholding Tax
  const taxDeduction = netWin * 0.05;
  const netDisbursement = grossPayout - taxDeduction;

  const hasLockedOdds = selections.some((s) => s.isLocked);

  const handlePlaceBet = async () => {
    // 1. Force Authentication
    if (!user || !token) {
      openAuthModal('LOGIN');
      return;
    }

    // 2. Check Balance
    if (user.balanceKes < stake) {
      setErrorMsg(`Insufficient funds (Balance: KES ${user.balanceKes.toFixed(2)}). Please deposit via M-Pesa.`);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const legs = selections.map((s) => ({ marketId: s.marketId, outcomeName: s.outcomeName }));
      const res = await placeBet(token, stake, legs);

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        updateBalance(user.balanceKes - stake);
        setSuccessMsg(`Bet Placed! Potential Net Payout: KES ${netDisbursement.toFixed(2)}`);
        setTimeout(() => {
          clearSlip();
          setIsSlipOpen(false);
          setSuccessMsg(null);
        }, 3000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Wager failed to record.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="fixed bottom-0 right-0 w-full md:w-96 max-h-[90vh] bg-[#0c1220] border-t md:border-l border-slate-800 z-50 flex flex-col shadow-2xl rounded-t-2xl md:rounded-tl-2xl overflow-hidden">
      <div className="bg-[#10182b] px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-black tracking-wide text-white">BETSLIP</span>
          <span className="bg-amber-400 text-slate-950 font-bold text-xs px-2 py-0.2 rounded-full">
            {selections.length}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {selections.length > 0 && (
            <button onClick={clearSlip} className="text-slate-400 hover:text-red-400 text-xs font-semibold flex items-center gap-1">
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
          )}
          <button onClick={() => setIsSlipOpen(false)} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {selections.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs font-semibold">
            Your slip is empty. Click any odds (1, X, 2) on the games to build your ticket.
          </div>
        ) : (
          selections.map((sel) => (
            <div
              key={sel.marketId}
              className={cn(
                'p-3 rounded-lg border text-xs relative transition',
                sel.isLocked ? 'bg-red-950/20 border-red-800/40 text-slate-400' : 'bg-slate-900 border-slate-800 text-slate-200'
              )}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-slate-400 line-clamp-1">{sel.matchTitle}</span>
                <button onClick={() => removeSelection(sel.marketId)} className="text-slate-500 hover:text-red-400 ml-2">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex justify-between items-center">
                <span className="font-bold text-amber-400 uppercase">PICK: {sel.outcomeName}</span>
                <span className="font-mono font-black text-sm text-white">
                  {sel.isLocked ? <span className="text-red-500 text-[10px]">ODDS LOCKED</span> : sel.odds.toFixed(2)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {selections.length > 0 && (
        <div className="p-4 bg-[#0a0f1c] border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-bold">TOTAL ODDS</span>
            <span className="font-mono font-black text-amber-400 text-base">{totalOdds}</span>
          </div>

          {/* Quick Stake Chips */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase">
              <span>Stake (KES)</span>
              <div className="flex gap-1">
                {[50, 100, 200, 500].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setStake(chip)}
                    className="bg-slate-800 hover:bg-slate-700 text-[10px] font-bold px-2 py-0.5 rounded text-slate-300"
                  >
                    +{chip}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="number"
              min="10"
              value={stake}
              onChange={(e) => setStake(Math.max(0, Number(e.target.value)))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* KRA 5% Tax Calculation */}
          <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 text-[11px] space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>Gross Return</span>
              <span className="font-mono text-slate-200">KES {grossPayout.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-amber-400/90 font-medium">
              <span>KRA WHT (5% on Net Win)</span>
              <span className="font-mono">- KES {taxDeduction.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-emerald-400 font-bold text-xs pt-1 border-t border-slate-800">
              <span>Est. Net Payout</span>
              <span className="font-mono">KES {netDisbursement.toFixed(2)}</span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-2 bg-red-950/50 border border-red-800 text-red-400 text-xs rounded flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2 bg-emerald-950/50 border border-emerald-800 text-emerald-400 text-xs rounded flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <button
            disabled={loading || hasLockedOdds || stake <= 0}
            onClick={handlePlaceBet}
            className={cn(
              'w-full py-3 rounded-lg font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5',
              !user
                ? 'bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-lg'
                : hasLockedOdds
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-emerald-500/20'
            )}
          >
            {!user ? (
              <>
                <Lock className="w-3.5 h-3.5" /> LOGIN TO PLACE BET
              </>
            ) : loading ? (
              'Processing...'
            ) : (
              `Place Bet (KES ${stake})`
            )}
          </button>
        </div>
      )}
    </aside>
  );
}
