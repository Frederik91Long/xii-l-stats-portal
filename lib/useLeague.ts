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

export type PlayerStats = {
  total: number;
  starts: number;
  weekly: Record<number, number>;
};

export type Data = {
  league: League;
  rosters: Roster[];
  users: User[];
  matchups: Matchup[];
  players: Players;

  // Individual player statistics
  playerStats: Record<string, PlayerStats>;

  // Historical statistics per franchise and player
  franchisePlayerStats: Record<
    string,
    Record<string, PlayerStats>
  >;

  week: number;
  currentWeek: number;
  fetchedAt: string;
  leagueId: string;
};

export function useLeague(week?: number) {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(
        `/api/league${week ? `?week=${week}` : ''}`,
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
      setError(
        e instanceof Error
          ? e.message
          : 'Unknown error'
      );
    } finally {
      setLoading(false);
    }
  }, [week]);

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
