'use client';

import React, { useState, useEffect } from 'react';
import { FixtureCard } from '../components/FixtureCard';
import { GameUnavailable } from '../components/GameUnavailable';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { Trophy, Plane, Sparkles, Radio, Filter, RefreshCw, Flame, Gift } from 'lucide-react';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'SPORTS' | 'LIVE' | 'AVIATOR' | 'CASINO'>('SPORTS');
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedLeague, setSelectedLeague] = useState<string>('ALL');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://betpoake-production.up.railway.app/api/v1';

  // Fetch real matches dynamically from backend
  const fetchLiveMatches = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/fixtures`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setFixtures(data.fixtures || []);
      }
    } catch (err) {
      console.error('Error loading real fixtures:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveMatches();
    const interval = setInterval(fetchLiveMatches, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, []);

  const filteredFixtures = fixtures.filter((f) => {
    if (activeTab === 'LIVE') return f.match_status === 'LIVE';
    if (selectedLeague === 'ALL') return true;
    if (selectedLeague === 'GRASSROOTS') return f.external_provider_id?.startsWith('MANUAL_LOCAL');
    if (selectedLeague === 'EPL') return f.tournament?.toLowerCase().includes('premier league');
    if (selectedLeague === 'UEFA') return f.tournament?.toLowerCase().includes('champions league');
    if (selectedLeague === 'LALIGA') return f.tournament?.toLowerCase().includes('la liga');
    if (selectedLeague === 'BASKETBALL') return f.sport?.toLowerCase() === 'basketball';
    return true;
  });

  return (
    <div className="space-y-5 pb-24 md:pb-10">
      {/* Betpluske Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-950 via-[#0d1629] to-[#070b14] border border-rose-500/30 p-5 md:p-6 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
              <Gift className="w-3.5 h-3.5" /> 100% KARIBU DEPOSIT BONUS ON M-PESA
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">
              KENYA'S PREMIER SPORTSBOOK
            </h1>
            <p className="text-xs text-slate-300">
              Instant Safaricom M-Pesa • 5% KRA Compliant • Live Grassroots Kenyan Leagues
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('AVIATOR')}
              className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase px-5 py-2.5 rounded-xl transition shadow-lg shadow-rose-600/30 flex items-center gap-1.5"
            >
              <Plane className="w-4 h-4" /> AVIATOR
            </button>
            <button
              onClick={() => setActiveTab('CASINO')}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase px-5 py-2.5 rounded-xl transition shadow-lg shadow-amber-400/20 flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" /> CASINO
            </button>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setActiveTab('SPORTS')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black uppercase shrink-0 transition border ${
            activeTab === 'SPORTS'
              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-lg shadow-amber-400/20'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
          }`}
        >
          <Trophy className="w-4 h-4" /> Sportsbook
        </button>

        <button
          onClick={() => setActiveTab('LIVE')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black uppercase shrink-0 transition border ${
            activeTab === 'LIVE'
              ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/20'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
          }`}
        >
          <Radio className="w-4 h-4 text-rose-500 animate-pulse" /> Live Now
        </button>

        <button
          onClick={() => setActiveTab('AVIATOR')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black uppercase shrink-0 transition border ${
            activeTab === 'AVIATOR'
              ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/20'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
          }`}
        >
          <Plane className="w-4 h-4 text-rose-400" /> Aviator (Crash)
        </button>

        <button
          onClick={() => setActiveTab('CASINO')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black uppercase shrink-0 transition border ${
            activeTab === 'CASINO'
              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-lg shadow-amber-400/20'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" /> Casino
        </button>
      </div>

      {/* 1. GAME UNAVAILABLE POPUP FOR AVIATOR & CASINO (MATCHING SCREENSHOT) */}
      {(activeTab === 'AVIATOR' || activeTab === 'CASINO') && (
        <GameUnavailable onReturn={() => setActiveTab('SPORTS')} />
      )}

      {/* 2. REAL SPORTSBOOK & LIVE IN-PLAY */}
      {(activeTab === 'SPORTS' || activeTab === 'LIVE') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-bold flex items-center gap-1 shrink-0">
                <Filter className="w-3.5 h-3.5" /> LEAGUES:
              </span>
              {[
                { id: 'ALL', label: 'All Live Games' },
                { id: 'GRASSROOTS', label: '🇰🇪 Grassroots Kenya' },
                { id: 'EPL', label: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League' },
                { id: 'UEFA', label: '🇪🇺 Champions League' },
                { id: 'LALIGA', label: '🇪🇸 La Liga' },
                { id: 'BASKETBALL', label: '🏀 NBA' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedLeague(tab.id)}
                  className={`px-3 py-1.5 rounded-lg font-bold shrink-0 border transition ${
                    selectedLeague === tab.id
                      ? 'bg-amber-400 text-slate-950 border-amber-300'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={fetchLiveMatches}
              className="bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-1 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Real Live Games Grid */}
          {loading && fixtures.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div key={idx} className="h-32 bg-slate-900/60 rounded-xl border border-slate-800/80 animate-pulse p-4" />
              ))}
            </div>
          ) : filteredFixtures.length === 0 ? (
            <div className="bg-[#0b1222] border border-slate-800 rounded-2xl p-8 text-center space-y-3">
              <Trophy className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="text-sm font-bold text-white">No live matches in this category right now.</div>
              <p className="text-xs text-slate-400">
                Matches appear automatically as international fixtures and Kenyan grassroots games kick off.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredFixtures.map((fixture) => (
                <FixtureCard key={fixture.id} fixture={fixture} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mobile Sticky Navigation */}
      <MobileBottomNav activeTab={activeTab} setActiveTab={(t) => setActiveTab(t as any)} />
    </div>
  );
}
