import { NextRequest, NextResponse } from 'next/server';

import {
  LEAGUE_ID,
  sleeper,
  getPlayers,
  League,
  Roster,
  User,
  Matchup
} from '@/lib/sleeper';

export const runtime = 'nodejs';

type PlayerStats = {
  total: number;
  starts: number;
  weekly: Record<number, number>;
};

type FranchisePlayerStats = Record<
  string,
  Record<string, PlayerStats>
>;

export async function GET(request: NextRequest) {
  try {
    const requested = Number(
      request.nextUrl.searchParams.get('week')
    );

    const [league, rosters, users, state] = await Promise.all([
      sleeper<League>(`/league/${LEAGUE_ID}`),
      sleeper<Roster[]>(`/league/${LEAGUE_ID}/rosters`),
      sleeper<User[]>(`/league/${LEAGUE_ID}/users`),
      sleeper<{ week: number }>('/state/nfl')
    ]);

    if (
      !league ||
      !Array.isArray(rosters) ||
      !Array.isArray(users)
    ) {
      throw new Error('Invalid Sleeper response');
    }

    const currentWeek =
      Number(league.settings?.leg) ||
      Number(state?.week) ||
      1;

    const week =
      Number.isInteger(requested) &&
      requested >= 1 &&
      requested <= 18
        ? requested
        : Math.max(1, Math.min(18, currentWeek));

    const lastWeek = Math.max(
      1,
      Math.min(18, currentWeek)
    );

    // Fetch all historical matchups
    const weeklyMatchups = await Promise.all(
      Array.from({ length: lastWeek }, (_, index) =>
        sleeper<Matchup[]>(
          `/league/${LEAGUE_ID}/matchups/${index + 1}`
        )
      )
    );

    const matchups =
      weeklyMatchups[week - 1] ??
      await sleeper<Matchup[]>(
        `/league/${LEAGUE_ID}/matchups/${week}`
      );

    // Individual player statistics across all franchises
    const playerStats: Record<string, PlayerStats> = {};

    // Historical player statistics per franchise roster ID
    const franchisePlayerStats: FranchisePlayerStats = {};

    weeklyMatchups.forEach((rows, index) => {
      const gameWeek = index + 1;

      rows.forEach(row => {
        const rosterId = String(row.roster_id);

        if (!franchisePlayerStats[rosterId]) {
          franchisePlayerStats[rosterId] = {};
        }

        const starters = row.starters ?? [];
        const scores = row.players_points ?? {};

        starters.forEach(playerId => {
          if (!playerId || playerId === '0') {
            return;
          }

          const score = Number(scores[playerId] ?? 0);

          // Personal season statistics
          if (!playerStats[playerId]) {
            playerStats[playerId] = {
              total: 0,
              starts: 0,
              weekly: {}
            };
          }

          playerStats[playerId].weekly[gameWeek] =
            (playerStats[playerId].weekly[gameWeek] ?? 0) +
            score;

          playerStats[playerId].total += score;
          playerStats[playerId].starts += 1;

          // Statistics for the franchise where the player started
          if (!franchisePlayerStats[rosterId][playerId]) {
            franchisePlayerStats[rosterId][playerId] = {
              total: 0,
              starts: 0,
              weekly: {}
            };
          }

          const franchiseStats =
            franchisePlayerStats[rosterId][playerId];

          franchiseStats.weekly[gameWeek] =
            (franchiseStats.weekly[gameWeek] ?? 0) +
            score;

          franchiseStats.total += score;
          franchiseStats.starts += 1;
        });
      });
    });

    // Include current and historical players
    const allPlayers = await getPlayers();

    const playerIds = new Set([
      ...rosters.flatMap(roster => roster.players ?? []),
      ...Object.keys(playerStats)
    ]);

    const players = Object.fromEntries(
      [...playerIds]
        .filter(id => allPlayers[id])
        .map(id => [id, allPlayers[id]])
    );

    return NextResponse.json(
      {
        league,
        rosters,
        users,
        matchups,
        players,
        playerStats,
        franchisePlayerStats,
        week,
        currentWeek,
        leagueId: LEAGUE_ID,
        fetchedAt: new Date().toISOString()
      },
      {
        headers: {
          'Cache-Control':
            'public, s-maxage=60, stale-while-revalidate=120'
        }
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unknown import error'
      },
      { status: 502 }
    );
  }
}
