'use client';

import {
  useEffect,
  useState,
  useCallback
} from 'react';

import type {
  League,
  Roster,
  User,
  Matchup,
  Players
} from './sleeper';

import { CURRENT_SEASON } from './seasons';

export type PlayerStats = {
  total: number;
  starts: number;
  weekly: Record<number, number>;
};

export type HistoricalMatchup = {
  week: number;
  rosterId: number;
  matchupId: number | null;
  points: number;
};

export type Data = {
  league: League;
  rosters: Roster[];
  users: User[];
  matchups: Matchup[];

  // Historical franchise scores
  historicalMatchups: HistoricalMatchup[];

  players: Players;

  // Individual player statistics
  playerStats: Record<string, PlayerStats>;

  // Player statistics per franchise
  franchisePlayerStats: Record<
    string,
    Record<string, PlayerStats>
  >;

  // Season information
  season: string;
  seasonName: string;

  week: number;
  currentWeek: number;
  fetchedAt: string;
  leagueId: string;
};

export function useLeague(
  week?: number,
  season: string = CURRENT_SEASON
) {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();

      params.set('season', season);

      if (week !== undefined) {
        params.set('week', String(week));
      }

      const res = await fetch(
        `/api/league?${params.toString()}`,
        { cache: 'no-store' }
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(
          json.error || 'Import failed'
        );
      }

      setData(json);
    } catch (e) {
      setData(null);

      setError(
        e instanceof Error
          ? e.message
          : 'Unknown error'
      );
    } finally {
      setLoading(false);
    }
  }, [week, season]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    data,
    loading,
    error,
    refresh
  };
}
