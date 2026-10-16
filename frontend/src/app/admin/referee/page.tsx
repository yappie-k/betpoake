'use client';

import React, { useState } from 'react';
import { Lock, Unlock, Plus, RefreshCw } from 'lucide-react';

export default function RefereeController() {
  const [fixtureId, setFixtureId] = useState('');
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [status, setStatus] = useState<'PRE_MATCH' | 'LIVE' | 'COMPLETED'>('LIVE');
  const [isLocked, setIsLocked] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  // Local Fixture Creator Form State
  const [tournament, setTournament] = useState('Kibera Community Cup');
  const [homeTeam, setHomeTeam] = useState('Langata Gholas');
  const [awayTeam, setAwayTeam] = useState('Dagoretti Santos');
  const [homeOdds, setHomeOdds] = useState('2.10');
  const [drawOdds, setDrawOdds] = useState('3.10');
  const [awayOdds, setAwayOdds] = useState('3.50');

  const addLog = (msg: string) => setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  const handleCreateLocalMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('betpoake_token') || 'ADMIN_TOKEN';
    const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

    try {
      const res = await fetch(`${API}/admin/fixtures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          sport: 'Soccer',
          tournament,
          homeTeam,
          awayTeam,
          startTime: new Date(Date.now() + 3600000).toISOString(),
          homeOdds: parseFloat(homeOdds),
          drawOdds: parseFloat(drawOdds),
          awayOdds: parseFloat(awayOdds),
        }),
      });
      const data = await res.json();
      if (data.fixtureId) {
        setFixtureId(data.fixtureId);
        addLog(`Created Grassroots Match ID: ${data.fixtureId}`);
      }
    } catch (err: any) {
      addLog(`Failed to create fixture: ${err.message}`);
    }
  };

  const syncScores = async (h: number, a: number, st: 'PRE_MATCH' | 'LIVE' | 'COMPLETED') => {
    if (!fixtureId) return;
    const token = localStorage.getItem('betpoake_token') || 'ADMIN_TOKEN';
    const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

    try {
      await fetch(`${API}/admin/fixtures/${fixtureId}/score`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ homeScore: h, awayScore: a, status: st }),
      });
      addLog(`Score update pushed: ${h} - ${a} (${st})`);
    } catch (err: any) {
      addLog(`Score update failed: ${err.message}`);
    }
  };

  const toggleFreezeSwitch = async () => {
    if (!fixtureId) return;
    const nextLocked = !isLocked;
    const token = localStorage.getItem('betpoake_token') || 'ADMIN_TOKEN';
    const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

    try {
      await fetch(`${API}/admin/fixtures/${fixtureId}/lock-odds`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isLocked: nextLocked }),
      });
      setIsLocked(nextLocked);
      addLog(`MASTER FREEZE: Odds are now ${nextLocked ? 'LOCKED (FROZEN)' : 'OPEN'}`);
    } catch (err: any) {
      addLog(`Lock toggle failed: ${err.message}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-[#0e1626] border border-slate-800 rounded-2xl p-6">
        <h2 className="text-lg font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-emerald-400" /> Grassroots Ground Referee Console
        </h2>

        {/* Create Local Fixture */}
        <form onSubmit={handleCreateLocalMatch} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 p-4 bg-slate-900/60 rounded-xl border border-slate-800">
          <div className="col-span-full font-bold text-xs text-emerald-400 uppercase">1. Create Grassroots Match</div>
          <input
            placeholder="Tournament"
            value={tournament}
            onChange={(e) => setTournament(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
          />
          <input
            placeholder="Home Team"
            value={homeTeam}
            onChange={(e) => setHomeTeam(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
          />
          <input
            placeholder="Away Team"
            value={awayTeam}
            onChange={(e) => setAwayTeam(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
          />
          <input
            placeholder="1 Odds"
            value={homeOdds}
            onChange={(e) => setHomeOdds(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
          />
          <input
            placeholder="X Odds"
            value={drawOdds}
            onChange={(e) => setDrawOdds(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
          />
          <input
            placeholder="2 Odds"
            value={awayOdds}
            onChange={(e) => setAwayOdds(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
          />
          <button type="submit" className="col-span-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold py-2 rounded text-emerald-400">
            Publish Local Grassroots Match
          </button>
        </form>

        {/* Live Controls */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-center">
            <input
              placeholder="Active Target Fixture ID"
              value={fixtureId}
              onChange={(e) => setFixtureId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white"
            />

            {/* Master Odds Freeze Toggle Button */}
            <button
              onClick={toggleFreezeSwitch}
              className={`w-full md:w-auto px-5 py-2.5 rounded-lg text-xs font-black uppercase flex items-center justify-center gap-2 transition ${
                isLocked ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
              }`}
            >
              {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              {isLocked ? 'ODDS LOCKED (FROZEN)' : 'FREEZE ODDS NOW'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-center space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase">Home Score</span>
              <div className="text-3xl font-black font-mono text-white">{homeScore}</div>
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => {
                    const next = homeScore + 1;
                    setHomeScore(next);
                    syncScores(next, awayScore, status);
                  }}
                  className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-3 py-1 rounded text-sm font-black"
                >
                  +1
                </button>
                <button
                  onClick={() => {
                    const next = Math.max(0, homeScore - 1);
                    setHomeScore(next);
                    syncScores(next, awayScore, status);
                  }}
                  className="bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded text-sm font-black"
                >
                  -1
                </button>
              </div>
            </div>

            <div className="text-center space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase">Away Score</span>
              <div className="text-3xl font-black font-mono text-white">{awayScore}</div>
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => {
                    const next = awayScore + 1;
                    setAwayScore(next);
                    syncScores(homeScore, next, status);
                  }}
                  className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-3 py-1 rounded text-sm font-black"
                >
                  +1
                </button>
                <button
                  onClick={() => {
                    const next = Math.max(0, awayScore - 1);
                    setAwayScore(next);
                    syncScores(homeScore, next, status);
                  }}
                  className="bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded text-sm font-black"
                >
                  -1
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {(['PRE_MATCH', 'LIVE', 'COMPLETED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatus(st);
                  syncScores(homeScore, awayScore, st);
                }}
                className={`flex-1 py-2 rounded text-xs font-bold ${
                  status === st ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Mark {st}
              </button>
            ))}
          </div>
        </div>

        {/* Event Logs */}
        <div className="mt-6">
          <div className="text-xs font-bold text-slate-400 uppercase mb-2">Operational Event Stream</div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-900 h-32 overflow-y-auto font-mono text-[11px] text-slate-300 space-y-1">
            {log.length === 0 ? <span className="text-slate-600">No events logged yet.</span> : log.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}