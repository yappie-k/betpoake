'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface BetSelection {
  fixtureId: string;
  marketId: string;
  matchTitle: string;
  outcomeName: string;
  odds: number;
  oddsDirection?: 'up' | 'down';
  isLocked?: boolean;
}

interface BetSlipContextType {
  selections: BetSelection[];
  addSelection: (selection: BetSelection) => void;
  removeSelection: (marketId: string) => void;
  clearSlip: () => void;
  stake: number;
  setStake: (val: number) => void;
  totalOdds: number;
  isSlipOpen: boolean;
  setIsSlipOpen: (open: boolean) => void;
}

const BetSlipContext = createContext<BetSlipContextType | undefined>(undefined);

export function BetSlipProvider({ children }: { children: React.ReactNode }) {
  const [selections, setSelections] = useState<BetSelection[]>([]);
  const [stake, setStake] = useState<number>(100);
  const [isSlipOpen, setIsSlipOpen] = useState<boolean>(false);

  // Real-time WebSocket connection to pipe odds movements
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000/realtime';
    let socket: WebSocket;

    function connect() {
      socket = new WebSocket(wsUrl);

      socket.onmessage = (event) => {
        try {
          const packet = JSON.parse(event.data);

          if (packet.type === 'ODDS_TICK') {
            const { marketId, rawOddsDecimal, isActive } = packet.data;
            setSelections((prev) =>
              prev.map((sel) => {
                if (sel.marketId === marketId) {
                  const direction = rawOddsDecimal > sel.odds ? 'up' : rawOddsDecimal < sel.odds ? 'down' : undefined;
                  return {
                    ...sel,
                    odds: rawOddsDecimal,
                    oddsDirection: direction,
                    isLocked: !isActive,
                  };
                }
                return sel;
              })
            );
          }

          if (packet.type === 'MARKET_FREEZE') {
            const { fixtureId, isActive } = packet.data;
            setSelections((prev) =>
              prev.map((sel) => (sel.fixtureId === fixtureId ? { ...sel, isLocked: !isActive } : sel))
            );
          }
        } catch (e) {
          console.error('WebSocket parse error:', e);
        }
      };

      socket.onclose = () => {
        setTimeout(connect, 2000);
      };
    }

    connect();
    return () => {
      if (socket) socket.close();
    };
  }, []);

  const addSelection = (selection: BetSelection) => {
    setSelections((prev) => {
      // Allow only one outcome selection per fixture
      const filtered = prev.filter((s) => s.fixtureId !== selection.fixtureId);
      return [...filtered, selection];
    });
    setIsSlipOpen(true);
  };

  const removeSelection = (marketId: string) => {
    setSelections((prev) => prev.filter((s) => s.marketId !== marketId));
  };

  const clearSlip = () => {
    setSelections([]);
  };

  const totalOdds = selections.reduce((acc, curr) => acc * curr.odds, 1);

  return (
    <BetSlipContext.Provider
      value={{
        selections,
        addSelection,
        removeSelection,
        clearSlip,
        stake,
        setStake,
        totalOdds: Number(totalOdds.toFixed(2)),
        isSlipOpen,
        setIsSlipOpen,
      }}
    >
      {children}
    </BetSlipContext.Provider>
  );
}

export function useBetSlip() {
  const context = useContext(BetSlipContext);
  if (!context) throw new Error('useBetSlip must be used within a BetSlipProvider');
  return context;
}