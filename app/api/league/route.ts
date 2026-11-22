import { NextRequest, NextResponse } from 'next/server';

import {
  sleeper,
  getPlayers,
  League,
  Roster,
  User,
  Matchup
} from '@/lib/sleeper';

import {
  getSeason,
  getCurrentSeason
} from '@/lib/seasons';

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

type HistoricalMatchup = {
  week: number;
  rosterId: number;
  matchupId: number | null;
  points: number;
};

export async function GET(request: NextRequest) {
  try {
    // Select the requested XII-L season
    const requestedSeason =
      request.nextUrl.searchParams.get('season');

    const season = requestedSeason
      ? getSeason(requestedSeason)
      : getCurrentSeason();

    if (!season) {
      return NextResponse.json(
        {
          error: `XII-L season ${requestedSeason} is not registered`
        },
        { status: 404 }
      );
    }

    const leagueId = season.leagueId;

    // Select requested week
    const requestedWeek = Number(
      request.nextUrl.searchParams.get('week')
    );

    // Load the correct Sleeper league
    const [league, rosters, users, state] =
      await Promise.all([
        sleeper<League>(
          `/league/${leagueId}`
        ),
        sleeper<Roster[]>(
          `/league/${leagueId}/rosters`
        ),
        sleeper<User[]>(
          `/league/${leagueId}/users`
        ),
        sleeper<{ week: number }>(
          '/state/nfl'
        )
      ]);

    if (
      !league ||
      !Array.isArray(rosters) ||
      !Array.isArray(users)
    ) {
      throw new Error('Invalid Sleeper response');
    }

    // For historical seasons, fetch all 18 weeks.
    // For the active season, use the current league week.
    const isCurrentSeason =
      season.year === getCurrentSeason().year;

    const currentWeek = isCurrentSeason
      ? (
          Number(league.settings?.leg) ||
          Number(state?.week) ||
          1
        )
      : 18;

    const week =
      Number.isInteger(requestedWeek) &&
      requestedWeek >= 1 &&
      requestedWeek <= 18
        ? requestedWeek
        : Math.max(
            1,
            Math.min(18, currentWeek)
          );

    const lastWeek = Math.max(
      1,
      Math.min(18, currentWeek)
    );

    // Fetch all available historical matchups
    const weeklyMatchups = await Promise.all(
      Array.from(
        { length: lastWeek },
        (_, index) =>
          sleeper<Matchup[]>(
            `/league/${leagueId}/matchups/${index + 1}`
          )
      )
    );

    const matchups =
      weeklyMatchups[week - 1] ??
      await sleeper<Matchup[]>(
        `/league/${leagueId}/matchups/${week}`
      );

    // Historical franchise scores
    const historicalMatchups: HistoricalMatchup[] = [];

    weeklyMatchups.forEach((rows, index) => {
      const gameWeek = index + 1;

      rows.forEach(row => {
        historicalMatchups.push({
          week: gameWeek,
          rosterId: row.roster_id,
          matchupId: row.matchup_id ?? null,
          points: Number(
            row.custom_points ?? row.points ?? 0
          )
        });
      });
    });

    // Individual player statistics
    const playerStats: Record<string, PlayerStats> = {};

    // Player statistics attributed to each franchise
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

          const score = Number(
            scores[playerId] ?? 0
          );

          // Personal statistics
          if (!playerStats[playerId]) {
            playerStats[playerId] = {
              total: 0,
              starts: 0,
              weekly: {}
            };
          }

          playerStats[playerId].weekly[gameWeek] =
            (
              playerStats[playerId].weekly[gameWeek] ??
              0
            ) + score;

          playerStats[playerId].total += score;
          playerStats[playerId].starts += 1;

          // Franchise-specific statistics
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
            (
              franchiseStats.weekly[gameWeek] ??
              0
            ) + score;

          franchiseStats.total += score;
          franchiseStats.starts += 1;
        });
      });
    });

    // Include current and former players
    const allPlayers = await getPlayers();

    const playerIds = new Set([
      ...rosters.flatMap(
        roster => roster.players ?? []
      ),
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
        historicalMatchups,
        players,
        playerStats,
        franchisePlayerStats,

        // Season information
        season: season.year,
        seasonName: season.name,

        week,
        currentWeek,
        leagueId,
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
