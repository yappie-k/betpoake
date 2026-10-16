'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Smartphone, ShieldCheck, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, authMode, setAuthMode, setAuthData } = useAuth();

  const [phone, setPhone] = useState('2547');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dob, setDob] = useState('2001-01-01');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://betpoake-production.up.railway.app/api/v1';

  // Handle User Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: phone, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.requiresOtp) {
          setAuthMode('OTP');
          setErrorMsg(data.error);
        } else {
          setErrorMsg(data.error || 'Invalid credentials');
        }
      } else {
        setAuthData(data.token, {
          id: data.user.id,
          email: data.user.email,
          phoneNumber: data.user.phoneNumber,
          role: data.user.role,
          kycVerified: data.user.kycVerified,
          balanceKes: (data.user.balanceMicroUnits || 0) / 100, // True balance from ledger
        });
      }
    } catch {
      setErrorMsg('Failed to connect to authentication server.');
    } finally {
      setLoading(false);
    }
  };

  // Handle User Registration with 18+ Age Verification
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    // Verify 18+
    const birthDate = new Date(dob);
    const ageDiff = new Date(Date.now() - birthDate.getTime());
    const calculatedAge = Math.abs(ageDiff.getUTCFullYear() - 1970);

    if (calculatedAge < 18) {
      setLoading(false);
      setErrorMsg('Strict Regulatory Gate: You must be at least 18 years old to join BetPoake.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          phoneNumber: phone,
          password,
          dateOfBirth: dob,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Registration failed');
      } else {
        setSuccessMsg('SMS OTP dispatched! Check your phone.');
        setAuthMode('OTP');
      }
    } catch {
      setErrorMsg('Connection error during registration.');
    } finally {
      setLoading(false);
    }
  };

  // Handle SMS OTP Verification
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, otp }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Invalid or expired OTP code.');
      } else {
        setAuthData(data.token, {
          id: data.user.id,
          email: data.user.email,
          phoneNumber: data.user.phone_number,
          role: data.user.role,
          kycVerified: true,
          balanceKes: 0.00, // Zero balance initially
        });
      }
    } catch {
      setErrorMsg('Failed to verify OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0b101d] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              {authMode === 'LOGIN' && 'Sign In to BetPoake'}
              {authMode === 'REGISTER' && 'Create Player Account (18+)'}
              {authMode === 'OTP' && 'Verify SMS OTP Code'}
            </h3>
          </div>
          <button onClick={closeAuthModal} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        {authMode !== 'OTP' && (
          <div className="grid grid-cols-2 p-1.5 bg-slate-950/60 border-b border-slate-800 text-xs font-black uppercase">
            <button
              onClick={() => { setAuthMode('LOGIN'); setErrorMsg(null); }}
              className={`py-2 rounded-lg transition ${authMode === 'LOGIN' ? 'bg-[#141e33] text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setAuthMode('REGISTER'); setErrorMsg(null); }}
              className={`py-2 rounded-lg transition ${authMode === 'REGISTER' ? 'bg-[#141e33] text-amber-400' : 'text-slate-400 hover:text-white'}`}
            >
              Register (18+)
            </button>
          </div>
        )}

        <div className="p-5">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. LOGIN FORM */}
          {authMode === 'LOGIN' && (
            <form onSubmit={handleLogin} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1.5">
                <label className="text-slate-300">M-Pesa Phone or Email</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="2547XXXXXXXX"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-mono text-sm focus:border-amber-400 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-amber-400 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase rounded-xl transition shadow-lg tracking-wider"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          )}

          {/* 2. REGISTRATION FORM (18+ MANDATORY) */}
          {authMode === 'REGISTER' && (
            <form onSubmit={handleRegister} className="space-y-3.5 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-slate-300">Safaricom / M-Pesa Phone</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="2547XXXXXXXX"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:border-amber-400 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-400 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300">Date of Birth (Must be 18+)</label>
                <input
                  type="date"
                  required
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-400 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300">Create Password (Min 8 characters)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-400 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase rounded-xl transition shadow-lg tracking-wider"
              >
                {loading ? 'Verifying...' : 'Create Account & Send SMS OTP'}
              </button>
            </form>
          )}

          {/* 3. SMS OTP VERIFICATION */}
          {authMode === 'OTP' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1.5 text-center">
                <Smartphone className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="text-slate-400 text-xs">
                  Enter the 6-digit verification code sent to <span className="text-white font-mono">{phone}</span>
                </p>
              </div>

              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="w-full text-center tracking-widest text-xl bg-slate-900 border border-slate-700 rounded-xl py-2.5 text-white font-mono font-black focus:border-amber-400 outline-none"
              />

              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs uppercase rounded-xl transition shadow-lg tracking-wider"
              >
                {loading ? 'Verifying OTP...' : 'Verify Phone & Activate Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
