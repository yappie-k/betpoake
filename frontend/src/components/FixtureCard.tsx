'use client';

import React from 'react';
import { useBetSlip } from '../context/BetSlipContext';
import { Lock } from 'lucide-react';
import { cn } from '../lib/utils';

export interface Market {
  marketId: string;
  marketType: string;
  outcomeName: string;
  rawOddsDecimal: number | string;
  raw_odds_decimal?: number | string;
  isActive: boolean;
}

export interface FixtureProps {
  fixture: {
    id: string;
    sport: string;
    tournament: string;
    home_team: string;
    away_team: string;
    start_time: string;
    match_status: 'PRE_MATCH' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
    live_home_score: number;
    live_away_score: number;
    external_provider_id: string;
    markets: Market[];
  };
}

export function FixtureCard({ fixture }: FixtureProps) {
  const { selections, addSelection } = useBetSlip();

  const getMarket = (outcome: string) =>
    fixture.markets.find((m) => m.outcomeName.toUpperCase() === outcome.toUpperCase());

  const homeMarket = getMarket('HOME');
  const drawMarket = getMarket('DRAW');
  const awayMarket = getMarket('AWAY');

  const isLive = fixture.match_status === 'LIVE';
  const isLocal = fixture.external_provider_id?.startsWith('MANUAL_LOCAL');

  const renderOddButton = (market?: Market, label?: string) => {
    if (!market) return <div className="flex-1 bg-slate-900/50 rounded-lg h-10 border border-slate-800" />;

    const isSelected = selections.some((s) => s.marketId === market.marketId);
    const locked = !market.isActive;
    const oddsValue = Number(market.rawOddsDecimal ?? market.raw_odds_decimal ?? 1.0);

    return (
      <button
        disabled={locked}
        onClick={() => {
          if (!locked) {
            addSelection({
              fixtureId: fixture.id,
              marketId: market.marketId,
              matchTitle: `${fixture.home_team} vs ${fixture.away_team}`,
              outcomeName: market.outcomeName,
              odds: oddsValue,
            });
          }
        }}
        className={cn(
          'flex-1 flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold border transition duration-150',
          locked
            ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
            : isSelected
            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
            : 'bg-slate-900/90 hover:bg-slate-800 border-slate-800 text-slate-200'
        )}
      >
        <span className="text-[10px] text-slate-400 uppercase font-semibold">{label}</span>
        {locked ? <Lock className="w-3 h-3 text-slate-500" /> : <span>{oddsValue.toFixed(2)}</span>}
      </button>
    );
  };

  return (
    <div className="bg-[#0f172a]/90 border border-slate-800/80 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{fixture.tournament}</span>
          {isLocal && (
            <span className="bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 text-[9px] font-extrabold px-1.5 py-0.2 rounded">
              KENYA GRASSROOTS
            </span>
          )}
        </div>

        {isLive ? (
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-red-400 text-xs font-black uppercase">LIVE</span>
          </div>
        ) : (
          <span className="text-slate-500 text-xs font-semibold">
            {new Date(fixture.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      <div className="grid grid-cols-12 gap-2 items-center mb-3">
        <div className="col-span-8 space-y-1">
          <div className="flex items-center justify-between text-sm font-bold text-slate-100">
            <span>{fixture.home_team}</span>
            {isLive && <span className="text-emerald-400 text-base">{fixture.live_home_score}</span>}
          </div>
          <div className="flex items-center justify-between text-sm font-bold text-slate-100">
            <span>{fixture.away_team}</span>
            {isLive && <span className="text-emerald-400 text-base">{fixture.live_away_score}</span>}
          </div>
        </div>

        <div className="col-span-4 flex justify-end">
          {isLive && (
            <div className="bg-slate-900 border border-slate-800 text-[11px] font-mono font-bold text-amber-400 px-2 py-1 rounded">
              {fixture.live_home_score} - {fixture.live_away_score}
            </div>
          )}
        </div>
      </div>

      {/* 1X2 Market Ticks */}
      <div className="flex items-center gap-2">
        {renderOddButton(homeMarket, '1')}
        {renderOddButton(drawMarket, 'X')}
        {renderOddButton(awayMarket, '2')}
      </div>
    </div>
  );
}
