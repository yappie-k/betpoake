'use client';

import React, { useState, useEffect } from 'react';
import { FixtureCard } from '../components/FixtureCard';
import { PoaCrash } from '../components/PoaCrash';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { Trophy, Rocket, ShieldAlert, Sparkles, Filter, RefreshCw, Radio } from 'lucide-react';

export default function HomePage() {
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'SPORTS' | 'CRASH'>('SPORTS');
  const [selectedSport, setSelectedSport] = useState<string>('ALL');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://betpoake-production.up.railway.app/api/v1';
  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'wss://betpoake-production.up.railway.app/realtime';

  // 1. Fetch real-time fixtures from the database
  const loadFixtures = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/fixtures`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setFixtures(data.fixtures || []);
      }
    } catch (err) {
      console.error('Failed to load live fixtures:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFixtures();
  }, []);

  // 2. Real-time WebSocket listener for live odds ticks & score adjustments
  useEffect(() => {
    let ws: WebSocket;

    function connectWs() {
      try {
        ws = new WebSocket(WS_URL);

        ws.onmessage = (event) => {
          try {
            const packet = JSON.parse(event.data);

            if (packet.type === 'ODDS_TICK') {
              const tick = packet.data;
              setFixtures((prev) =>
                prev.map((fixture) => {
                  if (fixture.id === tick.fixtureId) {
                    const updatedMarkets = fixture.markets.map((m: any) => {
                      if (m.marketId === tick.marketId) {
                        return { ...m, rawOddsDecimal: tick.rawOddsDecimal, isActive: tick.isActive };
                      }
                      return m;
                    });

                    return {
                      ...fixture,
                      live_home_score: tick.score ? tick.score.home : fixture.live_home_score,
                      live_away_score: tick.score ? tick.score.away : fixture.live_away_score,
                      match_status: tick.status || fixture.match_status,
                      markets: updatedMarkets,
                    };
                  }
                  return fixture;
                })
              );
            }

            if (packet.type === 'MARKET_FREEZE') {
              const { fixtureId, isActive } = packet.data;
              setFixtures((prev) =>
                prev.map((f) => {
                  if (f.id === fixtureId) {
                    return {
                      ...f,
                      markets: f.markets.map((m: any) => ({ ...m, isActive })),
                    };
                  }
                  return f;
                })
              );
            }
          } catch (e) {
            console.error('WebSocket message parsing error:', e);
          }
        };

        ws.onclose = () => {
          setTimeout(connectWs, 3000);
        };
      } catch (err) {
        console.error('WebSocket connection error:', err);
      }
    }

    connectWs();
    return () => {
      if (ws) ws.close();
    };
  }, [WS_URL]);

  // 3. Trigger instant external sync from The Odds API
  const handleSyncFeeds = async () => {
    setSyncing(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`${API_URL}/fixtures/sync-now`, { method: 'POST' });
      const data = await res.json();
      setStatusMsg(data.message || 'Sync completed.');
      await loadFixtures();
    } catch {
      setStatusMsg('Error synchronizing with sports providers.');
    } finally {
      setSyncing(false);
      setTimeout(() => setStatusMsg(null), 5000);
    }
  };

  const filteredFixtures = fixtures.filter((f) => {
    if (selectedSport === 'ALL') return true;
    if (selectedSport === 'GRASSROOTS') return f.external_provider_id?.startsWith('MANUAL_LOCAL');
    if (selectedSport === 'EPL') return f.tournament?.toLowerCase().includes('premier league');
    if (selectedSport === 'UEFA') return f.tournament?.toLowerCase().includes('champions league');
    if (selectedSport === 'LALIGA') return f.tournament?.toLowerCase().includes('la liga');
    if (selectedSport === 'BASKETBALL') return f.sport?.toLowerCase() === 'basketball';
    return true;
  });

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Regulatory Age & Tax Banner */}
      <div className="bg-[#0b1222] border border-slate-800 rounded-xl p-3 px-4 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Regulated by BCLB Kenya. Strictly 18+. Responsible Wagering applies. 5% Withholding Tax applied at settlement.</span>
        </div>
      </div>

      {/* Mode Switcher: Sportsbook vs PoaCrash */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setActiveTab('SPORTS')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm uppercase transition border ${
            activeTab === 'SPORTS'
              ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20'
              : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:bg-slate-800'
          }`}
        >
          <Trophy className="w-4 h-4" /> Sportsbook
        </button>

        <button
          onClick={() => setActiveTab('CRASH')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm uppercase transition border ${
            activeTab === 'CRASH'
              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-lg shadow-amber-400/20'
              : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:bg-slate-800'
          }`}
        >
          <Rocket className="w-4 h-4 animate-pulse" /> PoaCrash (Aviator)
          <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase">HOT</span>
        </button>
      </div>

      {/* CRASH GAME ARENA */}
      {activeTab === 'CRASH' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-black text-white uppercase tracking-wide">PoaCrash Arena</h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">Provably Fair SHA-256</span>
          </div>
          <PoaCrash />
        </div>
      )}

      {/* REAL SPORTSBOOK */}
      {activeTab === 'SPORTS' && (
        <div className="space-y-5">
          {/* Header Controls: Live Count & Sync Action */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                Live & Upcoming Fixtures ({filteredFixtures.length})
              </h2>
            </div>

            <button
              disabled={syncing}
              onClick={handleSyncFeeds}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{syncing ? 'Ingesting Real Feeds...' : 'Sync Live Odds'}</span>
            </button>
          </div>

          {statusMsg && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-xs rounded-xl font-semibold">
              {statusMsg}
            </div>
          )}

          {/* League Filter Badges */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-500 font-bold flex items-center gap-1 shrink-0 pl-1">
              <Filter className="w-3.5 h-3.5" /> LEAGUES:
            </span>
            {[
              { id: 'ALL', label: 'All Real Games' },
              { id: 'GRASSROOTS', label: '🇰🇪 Grassroots Kenya' },
              { id: 'EPL', label: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League' },
              { id: 'UEFA', label: '🇪🇺 Champions League' },
              { id: 'LALIGA', label: '🇪🇸 La Liga' },
              { id: 'BASKETBALL', label: '🏀 NBA' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedSport(cat.id)}
                className={`px-3 py-1.5 rounded-lg font-bold shrink-0 border transition ${
                  selectedSport === cat.id
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Match Display */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((sk) => (
                <div key={sk} className="h-36 bg-slate-900/50 border border-slate-800/60 rounded-xl animate-pulse p-4 space-y-3">
                  <div className="h-3 bg-slate-800 rounded w-1/3" />
                  <div className="h-4 bg-slate-800 rounded w-3/4" />
                  <div className="h-8 bg-slate-800/80 rounded" />
                </div>
              ))}
            </div>
          ) : filteredFixtures.length === 0 ? (
            <div className="bg-[#0b1222] border border-slate-800 rounded-2xl p-8 text-center space-y-3">
              <Trophy className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="text-base font-bold text-white">No active matches found in the database.</div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Click below to trigger a live ingestion loop from international sports data feeds, or add a grassroots match from the referee console.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={handleSyncFeeds}
                  className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 text-xs font-black uppercase px-4 py-2.5 rounded-xl transition"
                >
                  Pull Live International Games
                </button>
                <a
                  href="/admin/referee"
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl transition border border-slate-700"
                >
                  Add Local Match (+1/-1 Controls)
                </a>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFixtures.map((fixture) => (
                <FixtureCard key={fixture.id} fixture={fixture} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sticky Bottom Navigation for Mobile */}
      <MobileBottomNav activeTab={activeTab} setActiveTab={(t) => setActiveTab(t as any)} />
    </div>
  );
}
