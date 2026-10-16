'use client';

import React, { useState } from 'react';
import { X, Smartphone, CheckCircle, AlertCircle } from 'lucide-react';
import { initiateStkDeposit } from '../lib/api';

export function DepositModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [phone, setPhone] = useState('2547');
  const [amount, setAmount] = useState('100');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  if (!isOpen) return null;

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    const token = localStorage.getItem('betpoake_token') || 'SAMPLE_TOKEN';

    try {
      const res = await initiateStkDeposit(token, phone, Number(amount));
      if (res.error) {
        setStatus({ ok: false, msg: res.error });
      } else {
        setStatus({ ok: true, msg: 'M-Pesa STK push dispatched! Enter your PIN on your phone.' });
      }
    } catch (err: any) {
      setStatus({ ok: false, msg: err.message || 'Deposit initiation failed.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">M-Pesa Express Deposit</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleDeposit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Safricom M-Pesa Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="2547XXXXXXXX"
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Amount (KES)</label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[50, 100, 500, 1000].map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setAmount(val.toString())}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold py-1.5 rounded text-slate-200"
                >
                  KES {val}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="10"
              max="150000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-emerald-500 outline-none"
            />
          </div>

          {status && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                status.ok ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300' : 'bg-red-950/60 border border-red-800 text-red-300'
              }`}
            >
              {status.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{status.msg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-slate-950 font-black text-xs uppercase py-3 rounded-lg transition"
          >
            {loading ? 'Dispatched to MegaPay...' : `Pay KES ${amount}`}
          </button>
        </form>
      </div>
    </div>
  );
}