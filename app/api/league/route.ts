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

    // Current selected week
    const matchups = await sleeper<Matchup[]>(
      `/league/${LEAGUE_ID}/matchups/${week}`
    );

    // Historical matchups through the current week
    const lastWeek = Math.max(
      1,
      Math.min(18, currentWeek)
    );

    const weeklyMatchups = await Promise.all(
      Array.from({ length: lastWeek }, (_, index) =>
        sleeper<Matchup[]>(
          `/league/${LEAGUE_ID}/matchups/${index + 1}`
        )
      )
    );

    // Player scoring: only starters earn XII-L points
    const playerStats: Record<
      string,
      {
        total: number;
        starts: number;
        weekly: Record<number, number>;
      }
    > = {};

    weeklyMatchups.forEach((rows, index) => {
      const gameWeek = index + 1;

      rows.forEach(row => {
        const starters = row.starters ?? [];
        const scores = row.players_points ?? {};

        starters.forEach(playerId => {
          if (!playerId || playerId === '0') {
            return;
          }

          if (!playerStats[playerId]) {
            playerStats[playerId] = {
              total: 0,
              starts: 0,
              weekly: {}
            };
          }

          const score = Number(scores[playerId] ?? 0);

          playerStats[playerId].weekly[gameWeek] =
            (playerStats[playerId].weekly[gameWeek] ?? 0) +
            score;

          playerStats[playerId].total += score;
          playerStats[playerId].starts += 1;
        });
      });
    });

    // Load only relevant player details
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
