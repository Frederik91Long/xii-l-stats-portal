import { NextResponse } from 'next/server';

import {
  sleeper,
  getPlayers,
  League,
  Matchup
} from '@/lib/sleeper';

import {
  getAvailableSeasons,
  CURRENT_SEASON
} from '@/lib/seasons';

export const runtime = 'nodejs';

type SeasonPlayerStats = {
  season: string;
  total: number;
  starts: number;
  average: number;
  weekly: Record<number, number>;
};

type GameRecord = {
  season: string;
  week: number;
  points: number;
};

type CareerPlayerStats = {
  id: string;
  name: string;
  position: string;
  total: number;
  starts: number;
  average: number;
  seasonsPlayed: number;
  seasons: Record<string, SeasonPlayerStats>;
  bestGame: GameRecord | null;
  bestSeason: SeasonPlayerStats | null;
};

type SingleSeasonRecord = {
  playerId: string;
  name: string;
  position: string;
  season: string;
  total: number;
  starts: number;
  average: number;
};

const MIN_CAREER_STARTS = 10;

export async function GET() {
  try {
    const availableSeasons =
      getAvailableSeasons();

    const [allPlayers, state] =
      await Promise.all([
        getPlayers(),
        sleeper<{ week: number }>('/state/nfl')
      ]);

    const careerStats: Record<
      string,
      CareerPlayerStats
    > = {};

    const importedSeasons: string[] = [];

    // Import each registered XII-L season
    for (const season of availableSeasons) {
      const league = await sleeper<League>(
        `/league/${season.leagueId}`
      );

      if (!league) {
        throw new Error(
          `Could not load season ${season.year}`
        );
      }

      const isCurrentSeason =
        season.year === CURRENT_SEASON;

      const currentWeek = isCurrentSeason
        ? (
            Number(league.settings?.leg) ||
            Number(state?.week) ||
            1
          )
        : 18;

      const lastWeek = Math.max(
        1,
        Math.min(18, currentWeek)
      );

      // Fetch weekly matchups
      const weeklyMatchups = await Promise.all(
        Array.from(
          { length: lastWeek },
          (_, index) =>
            sleeper<Matchup[]>(
              `/league/${season.leagueId}/matchups/${index + 1}`
            )
        )
      );

      const seasonStats: Record<
        string,
        SeasonPlayerStats
      > = {};

      weeklyMatchups.forEach((rows, index) => {
        const week = index + 1;

        if (!Array.isArray(rows)) {
          throw new Error(
            `Invalid matchups for ${season.year}, week ${week}`
          );
        }

        rows.forEach(row => {
          const starters = row.starters ?? [];
          const scores = row.players_points ?? {};

          starters.forEach(playerId => {
            if (!playerId || playerId === '0') {
              return;
            }

            const score = Number(
              scores[playerId] ?? 0
            );

            if (!Number.isFinite(score)) {
              return;
            }

            if (!seasonStats[playerId]) {
              seasonStats[playerId] = {
                season: season.year,
                total: 0,
                starts: 0,
                average: 0,
                weekly: {}
              };
            }

            const stats = seasonStats[playerId];

            stats.total += score;
            stats.starts += 1;

            stats.weekly[week] =
              (stats.weekly[week] ?? 0) + score;
          });
        });
      });

      // Merge season statistics into career totals
      Object.entries(seasonStats).forEach(
        ([playerId, stats]) => {
          const player = allPlayers[playerId];

          const name =
            player?.full_name ||
            [
              player?.first_name,
              player?.last_name
            ]
              .filter(Boolean)
              .join(' ') ||
            playerId;

          stats.average =
            stats.starts > 0
              ? stats.total / stats.starts
              : 0;

          if (!careerStats[playerId]) {
            careerStats[playerId] = {
              id: playerId,
              name,
              position:
                player?.position || 'Unknown',
              total: 0,
              starts: 0,
              average: 0,
              seasonsPlayed: 0,
              seasons: {},
              bestGame: null,
              bestSeason: null
            };
          }

          const career = careerStats[playerId];

          career.total += stats.total;
          career.starts += stats.starts;

          career.seasons[season.year] = stats;

          // Highest individual weekly score
          Object.entries(stats.weekly).forEach(
            ([week, score]) => {
              if (
                !career.bestGame ||
                score > career.bestGame.points
              ) {
                career.bestGame = {
                  season: season.year,
                  week: Number(week),
                  points: score
                };
              }
            }
          );

          // Highest individual season total
          if (
            !career.bestSeason ||
            stats.total > career.bestSeason.total
          ) {
            career.bestSeason = stats;
          }
        }
      );

      importedSeasons.push(season.year);
    }

    // Calculate final career averages
    const players = Object.values(
      careerStats
    ).map(player => ({
      ...player,

      average:
        player.starts > 0
          ? player.total / player.starts
          : 0,

      seasonsPlayed:
        Object.keys(player.seasons).length
    }));

    // Career scoring leader
    const careerScoringLeader =
      [...players].sort(
        (a, b) => b.total - a.total
      )[0] ?? null;

    // Most career starts
    const mostCareerStarts =
      [...players].sort(
        (a, b) =>
          b.starts - a.starts ||
          b.total - a.total
      )[0] ?? null;

    // Best career average
    const bestCareerAverage =
      [...players]
        .filter(
          player =>
            player.starts >= MIN_CAREER_STARTS
        )
        .sort(
          (a, b) =>
            b.average - a.average ||
            b.starts - a.starts
        )[0] ?? null;

    // Highest single-game score
    const highestSingleGame =
      [...players]
        .filter(player => player.bestGame !== null)
        .sort(
          (a, b) =>
            (b.bestGame?.points ?? 0) -
            (a.bestGame?.points ?? 0)
        )[0] ?? null;

    // Build a list of every player-season
    const singleSeasonRecords: SingleSeasonRecord[] =
      players.flatMap(player =>
        Object.values(player.seasons).map(stats => ({
          playerId: player.id,
          name: player.name,
          position: player.position,
          season: stats.season,
          total: stats.total,
          starts: stats.starts,
          average: stats.average
        }))
      );

    // Highest single-season total
    const highestSingleSeason =
      [...singleSeasonRecords].sort(
        (a, b) => b.total - a.total
      )[0] ?? null;

    // Most starts in one season
    const mostStartsInSeason =
      [...singleSeasonRecords].sort(
        (a, b) =>
          b.starts - a.starts ||
          b.total - a.total
      )[0] ?? null;

    // All-time leaders by position
    const positionLeaders = [
      'QB',
      'RB',
      'WR',
      'TE'
    ].map(position => ({
      position,
      player:
        [...players]
          .filter(
            player => player.position === position
          )
          .sort(
            (a, b) => b.total - a.total
          )[0] ?? null
    }));

    // All-time player leaderboard
    const leaderboard = [...players].sort(
      (a, b) =>
        b.total - a.total ||
        b.starts - a.starts
    );

    return NextResponse.json(
      {
        importedSeasons,

        seasonCount:
          importedSeasons.length,

        playerCount:
          players.length,

        minimumCareerStarts:
          MIN_CAREER_STARTS,

        records: {
          careerScoringLeader,
          mostCareerStarts,
          bestCareerAverage,
          highestSingleGame,
          highestSingleSeason,
          mostStartsInSeason,
          positionLeaders
        },

        leaderboard,

        fetchedAt:
          new Date().toISOString()
      },
      {
        headers: {
          'Cache-Control':
            'public, s-maxage=120, stale-while-revalidate=300'
        }
      }
    );

  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'All-time statistics import failed'
      },
      { status: 502 }
    );
  }
}
