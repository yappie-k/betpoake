'use client';

import React from 'react';
import { useBetSlip } from '../context/BetSlipContext';
import { Lock, Radio } from 'lucide-react';
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
    live_minute?: string;
    external_provider_id: string;
    markets: Market[];
  };
}

export function FixtureCard({ fixture }: FixtureProps) {
  const { selections, addSelection } = useBetSlip();

  const getMarket = (type: string, outcome: string) =>
    fixture.markets.find(
      (m) =>
        m.marketType.toUpperCase() === type.toUpperCase() &&
        m.outcomeName.toUpperCase() === outcome.toUpperCase()
    );

  const homeMarket = getMarket('1X2', 'HOME') || fixture.markets.find((m) => m.outcomeName === 'HOME');
  const drawMarket = getMarket('1X2', 'DRAW') || fixture.markets.find((m) => m.outcomeName === 'DRAW');
  const awayMarket = getMarket('1X2', 'AWAY') || fixture.markets.find((m) => m.outcomeName === 'AWAY');

  const isLive = fixture.match_status === 'LIVE';
  const isLocal = fixture.external_provider_id?.startsWith('MANUAL_LOCAL');

  const renderOddButton = (market?: Market, label?: string) => {
    if (!market) return <div className="flex-1 bg-slate-900/40 rounded-lg h-9 border border-slate-800" />;

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
          'flex-1 flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-bold border transition duration-150',
          locked
            ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
            : isSelected
            ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/20'
            : 'bg-[#101728] hover:bg-slate-800 border-slate-800 text-slate-200'
        )}
      >
        <span className="text-[10px] text-slate-400 uppercase font-semibold">{label}</span>
        {locked ? <Lock className="w-3 h-3 text-slate-500" /> : <span className="font-mono">{oddsValue.toFixed(2)}</span>}
      </button>
    );
  };

  return (
    <div className="bg-[#0b1222] border border-slate-800/80 rounded-xl p-3.5 shadow-sm hover:border-slate-700 transition">
      {/* League Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide truncate max-w-[200px]">
            {fixture.tournament}
          </span>
          {isLocal && (
            <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded">
              GRASSROOTS
            </span>
          )}
        </div>

        {isLive ? (
          <div className="flex items-center gap-1 text-rose-500 text-[11px] font-black uppercase">
            <Radio className="w-3.5 h-3.5 animate-pulse text-rose-500" />
            <span>LIVE {fixture.live_minute || '68\''}</span>
          </div>
        ) : (
          <span className="text-slate-500 text-[11px] font-mono font-semibold">
            {new Date(fixture.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Teams & Scores */}
      <div className="grid grid-cols-12 gap-2 items-center mb-3">
        <div className="col-span-9 space-y-1">
          <div className="flex items-center justify-between text-sm font-bold text-white">
            <span className="truncate">{fixture.home_team}</span>
            {isLive && <span className="text-amber-400 font-mono text-base">{fixture.live_home_score}</span>}
          </div>
          <div className="flex items-center justify-between text-sm font-bold text-white">
            <span className="truncate">{fixture.away_team}</span>
            {isLive && <span className="text-amber-400 font-mono text-base">{fixture.live_away_score}</span>}
          </div>
        </div>

        <div className="col-span-3 flex justify-end">
          {isLive && (
            <div className="bg-slate-900 border border-slate-800 text-xs font-mono font-black text-amber-400 px-2 py-1 rounded">
              {fixture.live_home_score} - {fixture.live_away_score}
            </div>
          )}
        </div>
      </div>

      {/* 1X2 Market Ticks */}
      <div className="flex items-center gap-1.5">
        {renderOddButton(homeMarket, '1')}
        {renderOddButton(drawMarket, 'X')}
        {renderOddButton(awayMarket, '2')}
      </div>
    </div>
  );
}
