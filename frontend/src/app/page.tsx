'use client';

import React, { useState, useEffect } from 'react';
import { FixtureCard } from '../components/FixtureCard';
import { AviatorGame } from '../components/AviatorGame';
import { CasinoSlots } from '../components/CasinoSlots';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { Trophy, Plane, Sparkles, Flame, ShieldAlert, Radio, Filter, Zap, Gift } from 'lucide-react';

const REAL_SCHEDULE_FEED = [
  // Live in-play matches
  {
    id: 'live_kibera_derby',
    sport: 'Soccer',
    tournament: 'Nairobi South County League',
    home_team: 'Kibera Black Stars B',
    away_team: 'Githurai All-Stars',
    start_time: new Date().toISOString(),
    match_status: 'LIVE' as const,
    live_home_score: 2,
    live_away_score: 1,
    live_minute: '72\'',
    external_provider_id: 'MANUAL_LOCAL_KIBERA_01',
    markets: [
      { marketId: 'm1', marketType: '1X2', outcomeName: 'HOME', rawOddsDecimal: 1.65, isActive: true },
      { marketId: 'm2', marketType: '1X2', outcomeName: 'DRAW', rawOddsDecimal: 3.40, isActive: true },
      { marketId: 'm3', marketType: '1X2', outcomeName: 'AWAY', rawOddsDecimal: 5.10, isActive: true },
    ],
  },
  {
    id: 'live_epl_arsenal_chelsea',
    sport: 'Soccer',
    tournament: 'English Premier League',
    home_team: 'Arsenal',
    away_team: 'Chelsea',
    start_time: new Date().toISOString(),
    match_status: 'LIVE' as const,
    live_home_score: 1,
    live_away_score: 1,
    live_minute: '58\'',
    external_provider_id: 'EPL_ARS_CHE',
    markets: [
      { marketId: 'm4', marketType: '1X2', outcomeName: 'HOME', rawOddsDecimal: 2.10, isActive: true },
      { marketId: 'm5', marketType: '1X2', outcomeName: 'DRAW', rawOddsDecimal: 2.90, isActive: true },
      { marketId: 'm6', marketType: '1X2', outcomeName: 'AWAY', rawOddsDecimal: 3.65, isActive: true },
    ],
  },

  // Upcoming matches (Tonight & Tomorrow)
  {
    id: 'epl_mci_liv',
    sport: 'Soccer',
    tournament: 'English Premier League',
    home_team: 'Manchester City',
    away_team: 'Liverpool',
    start_time: new Date(Date.now() + 7200000).toISOString(),
    match_status: 'PRE_MATCH' as const,
    live_home_score: 0,
    live_away_score: 0,
    external_provider_id: 'EPL_MCI_LIV',
    markets: [
      { marketId: 'm7', marketType: '1X2', outcomeName: 'HOME', rawOddsDecimal: 2.05, isActive: true },
      { marketId: 'm8', marketType: '1X2', outcomeName: 'DRAW', rawOddsDecimal: 3.60, isActive: true },
      { marketId: 'm9', marketType: '1X2', outcomeName: 'AWAY', rawOddsDecimal: 3.40, isActive: true },
    ],
  },
  {
    id: 'kpl_gor_afc',
    sport: 'Soccer',
    tournament: 'SportPesa Kenya Premier League',
    home_team: 'Gor Mahia',
    away_team: 'AFC Leopards',
    start_time: new Date(Date.now() + 10800000).toISOString(),
    match_status: 'PRE_MATCH' as const,
    live_home_score: 0,
    live_away_score: 0,
    external_provider_id: 'KPL_MASHEMEJI',
    markets: [
      { marketId: 'm10', marketType: '1X2', outcomeName: 'HOME', rawOddsDecimal: 1.80, isActive: true },
      { marketId: 'm11', marketType: '1X2', outcomeName: 'DRAW', rawOddsDecimal: 3.10, isActive: true },
      { marketId: 'm12', marketType: '1X2', outcomeName: 'AWAY', rawOddsDecimal: 4.50, isActive: true },
    ],
  },
  {
    id: 'uefa_real_bayern',
    sport: 'Soccer',
    tournament: 'UEFA Champions League',
    home_team: 'Real Madrid',
    away_team: 'Bayern Munich',
    start_time: new Date(Date.now() + 18000000).toISOString(),
    match_status: 'PRE_MATCH' as const,
    live_home_score: 0,
    live_away_score: 0,
    external_provider_id: 'UEFA_RMA_BAY',
    markets: [
      { marketId: 'm13', marketType: '1X2', outcomeName: 'HOME', rawOddsDecimal: 2.25, isActive: true },
      { marketId: 'm14', marketType: '1X2', outcomeName: 'DRAW', rawOddsDecimal: 3.50, isActive: true },
      { marketId: 'm15', marketType: '1X2', outcomeName: 'AWAY', rawOddsDecimal: 2.95, isActive: true },
    ],
  },
  {
    id: 'grassroots_dandora_youth',
    sport: 'Soccer',
    tournament: 'Eastlands Community Cup',
    home_team: 'Dandora Youth FC',
    away_team: 'Eastleigh Santos',
    start_time: new Date(Date.now() + 21600000).toISOString(),
    match_status: 'PRE_MATCH' as const,
    live_home_score: 0,
    live_away_score: 0,
    external_provider_id: 'MANUAL_LOCAL_DANDORA',
    markets: [
      { marketId: 'm16', marketType: '1X2', outcomeName: 'HOME', rawOddsDecimal: 2.15, isActive: true },
      { marketId: 'm17', marketType: '1X2', outcomeName: 'DRAW', rawOddsDecimal: 3.05, isActive: true },
      { marketId: 'm18', marketType: '1X2', outcomeName: 'AWAY', rawOddsDecimal: 3.30, isActive: true },
    ],
  },
  {
    id: 'nba_lakers_celtics',
    sport: 'Basketball',
    tournament: 'NBA Basketball',
    home_team: 'Los Angeles Lakers',
    away_team: 'Boston Celtics',
    start_time: new Date(Date.now() + 28800000).toISOString(),
    match_status: 'PRE_MATCH' as const,
    live_home_score: 0,
    live_away_score: 0,
    external_provider_id: 'NBA_LAL_BOS',
    markets: [
      { marketId: 'm19', marketType: '1X2', outcomeName: 'HOME', rawOddsDecimal: 2.20, isActive: true },
      { marketId: 'm20', marketType: '1X2', outcomeName: 'DRAW', rawOddsDecimal: 11.00, isActive: true },
      { marketId: 'm21', marketType: '1X2', outcomeName: 'AWAY', rawOddsDecimal: 1.70, isActive: true },
    ],
  },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'SPORTS' | 'LIVE' | 'AVIATOR' | 'CASINO'>('SPORTS');
  const [selectedLeague, setSelectedLeague] = useState<string>('ALL');
  const [userBalance, setUserBalance] = useState<number>(5000);
  const [fixtures, setFixtures] = useState<any[]>(REAL_SCHEDULE_FEED);

  // Sync real-time updates from Railway backend if available
  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://betpoake-production.up.railway.app/api/v1';

    fetch(`${API_URL}/fixtures`)
      .then((res) => res.json())
      .then((data) => {
        if (data.fixtures && data.fixtures.length > 0) {
          setFixtures(data.fixtures);
        }
      })
      .catch(() => {});
  }, []);

  const filteredFixtures = fixtures.filter((f) => {
    if (activeTab === 'LIVE') return f.match_status === 'LIVE';
    if (selectedLeague === 'ALL') return true;
    if (selectedLeague === 'GRASSROOTS') return f.external_provider_id?.startsWith('MANUAL_LOCAL');
    if (selectedLeague === 'EPL') return f.tournament?.toLowerCase().includes('premier league');
    if (selectedLeague === 'KPL') return f.tournament?.toLowerCase().includes('kenya premier league');
    if (selectedLeague === 'UEFA') return f.tournament?.toLowerCase().includes('champions league');
    if (selectedLeague === 'BASKETBALL') return f.sport?.toLowerCase() === 'basketball';
    return true;
  });

  return (
    <div className="space-y-5 pb-24 md:pb-10">
      {/* Betpluske Hero Promotional Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-900 via-[#10192e] to-[#090e1a] border border-rose-500/30 p-5 md:p-6 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
              <Gift className="w-3.5 h-3.5" /> 100% KARIBU BONUS ON M-PESA
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">
              KENYA'S #1 SPORTSBOOK & AVIATOR ARENA
            </h1>
            <p className="text-xs text-slate-300">
              Instant Safaricom M-Pesa Withdrawals • 5% KRA Compliant • Live Grassroots Kenyan Leagues
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('AVIATOR')}
              className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase px-5 py-2.5 rounded-xl transition shadow-lg shadow-rose-600/30 flex items-center gap-1.5"
            >
              <Plane className="w-4 h-4" /> PLAY AVIATOR
            </button>
            <button
              onClick={() => setActiveTab('CASINO')}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase px-5 py-2.5 rounded-xl transition shadow-lg shadow-amber-400/20 flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" /> CASINO SLOTS
            </button>
          </div>
        </div>
      </div>

      {/* Main Category Subnavigation */}
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
          <Radio className="w-4 h-4 text-rose-500 animate-pulse" /> Live Now ({fixtures.filter((f) => f.match_status === 'LIVE').length})
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
          <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 rounded">HOT</span>
        </button>

        <button
          onClick={() => setActiveTab('CASINO')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black uppercase shrink-0 transition border ${
            activeTab === 'CASINO'
              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-lg shadow-amber-400/20'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" /> Casino Slots
        </button>
      </div>

      {/* RENDER AVIATOR GAME */}
      {activeTab === 'AVIATOR' && (
        <AviatorGame userBalance={userBalance} onBalanceChange={(bal) => setUserBalance(bal)} />
      )}

      {/* RENDER CASINO SLOTS */}
      {activeTab === 'CASINO' && (
        <CasinoSlots userBalance={userBalance} onBalanceChange={(bal) => setUserBalance(bal)} />
      )}

      {/* RENDER SPORTSBOOK & LIVE IN-PLAY */}
      {(activeTab === 'SPORTS' || activeTab === 'LIVE') && (
        <div className="space-y-4">
          {/* League Filters */}
          <div className="flex items-center gap-2 overflow-x-auto text-xs pb-1">
            <span className="text-slate-500 font-bold flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5" /> LEAGUES:
            </span>
            {[
              { id: 'ALL', label: 'All Leagues' },
              { id: 'GRASSROOTS', label: '🇰🇪 Grassroots Kenya' },
              { id: 'KPL', label: '🇰🇪 Kenya Premier League' },
              { id: 'EPL', label: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League' },
              { id: 'UEFA', label: '🇪🇺 Champions League' },
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

          {/* Matches Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredFixtures.map((fixture) => (
              <FixtureCard key={fixture.id} fixture={fixture} />
            ))}
          </div>
        </div>
      )}

      {/* Mobile Sticky Bottom Nav */}
      <MobileBottomNav activeTab={activeTab} setActiveTab={(t) => setActiveTab(t as any)} />
    </div>
  );
}
