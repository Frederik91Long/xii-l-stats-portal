import { NextResponse } from 'next/server';

import {
  sleeper,
  League,
  Matchup
} from '@/lib/sleeper';

import {
  getAvailableSeasons,
  CURRENT_SEASON
} from '@/lib/seasons';

import {
  getFranchises,
  getFranchiseByRoster
} from '@/lib/franchises';

export const runtime = 'nodejs';

type GameResult = 'W' | 'L' | 'T';

type GamePhase =
  | 'regularSeason'
  | 'postseason';

type FranchiseGame = {
  season: string;
  week: number;
  franchiseId: string;
  franchiseName: string;
  rosterId: number;
  opponentId: string;
  opponentName: string;
  pointsFor: number;
  pointsAgainst: number;
  margin: number;
  result: GameResult;
  phase: GamePhase;
};

type TeamStats = {
  games: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  winPercentage: number;
  averagePoints: number;
};

type Streak = {
  length: number;
  startSeason: string;
  startWeek: number;
  endSeason: string;
  endWeek: number;
};

type FranchiseSeasonStats = {
  season: string;
  rosterId: number;
  name: string;
  regularSeason: TeamStats;
  postseason: TeamStats;
  overall: TeamStats;
};

type FranchiseCareer = {
  id: string;
  name: string;
  seasonsPlayed: number;
  regularSeason: TeamStats;
  postseason: TeamStats;
  overall: TeamStats;
  seasons: Record<string, FranchiseSeasonStats>;
  games: FranchiseGame[];
  highestScore: FranchiseGame | null;
  lowestScore: FranchiseGame | null;
  biggestVictory: FranchiseGame | null;
  longestWinningStreak: Streak | null;
  longestLosingStreak: Streak | null;
};

function emptyStats(): TeamStats {
  return {
    games: 0,
    wins: 0,
    losses: 0,
    ties: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    winPercentage: 0,
    averagePoints: 0
  };
}

function addGame(
  stats: TeamStats,
  game: FranchiseGame
) {
  stats.games += 1;

  stats.pointsFor += game.pointsFor;
  stats.pointsAgainst += game.pointsAgainst;

  if (game.result === 'W') {
    stats.wins += 1;
  } else if (game.result === 'L') {
    stats.losses += 1;
  } else {
    stats.ties += 1;
  }

  stats.winPercentage =
    (stats.wins + stats.ties * 0.5) /
    stats.games;

  stats.averagePoints =
    stats.pointsFor / stats.games;
}

function calculateStreak(
  games: FranchiseGame[],
  target: 'W' | 'L'
): Streak | null {
  let best: Streak | null = null;
  let current: Streak | null = null;

  for (const game of games) {
    if (game.result !== target) {
      current = null;
      continue;
    }

    if (!current) {
      current = {
        length: 1,
        startSeason: game.season,
        startWeek: game.week,
        endSeason: game.season,
        endWeek: game.week
      };
    } else {
      current.length += 1;
      current.endSeason = game.season;
      current.endWeek = game.week;
    }

    if (!best || current.length > best.length) {
      best = { ...current };
    }
  }

  return best;
}

export async function GET() {
  try {
    const availableSeasons =
      getAvailableSeasons().sort(
        (a, b) =>
          Number(a.year) - Number(b.year)
      );

    const state = await sleeper<{
      week: number;
    }>('/state/nfl');

    const careers: Record<
      string,
      FranchiseCareer
    > = {};

    const importedSeasons: string[] = [];

    // Initialize permanent franchise identities
    getFranchises().forEach(franchise => {
      careers[franchise.id] = {
        id: franchise.id,
        name: franchise.name,
        seasonsPlayed: 0,
        regularSeason: emptyStats(),
        postseason: emptyStats(),
        overall: emptyStats(),
        seasons: {},
        games: [],
        highestScore: null,
        lowestScore: null,
        biggestVictory: null,
        longestWinningStreak: null,
        longestLosingStreak: null
      };
    });

    // Import seasons in chronological order
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

      const isComplete =
        league.status === 'complete';

      const currentWeek =
        Number(league.settings?.leg) ||
        Number(state?.week) ||
        1;

      // Exclude potentially unfinished games
      const completedWeekLimit =
        isComplete
          ? 18
          : isCurrentSeason
            ? Math.max(
                0,
                Math.min(18, currentWeek - 1)
              )
            : 0;

      if (!isCurrentSeason && !isComplete) {
        throw new Error(
          `Historical season ${season.year} is not marked complete`
        );
      }

      const playoffStartWeek = Number(
        league.settings?.playoff_week_start
      );

      if (
        !Number.isInteger(playoffStartWeek) ||
        playoffStartWeek < 1 ||
        playoffStartWeek > 19
      ) {
        throw new Error(
          `Invalid playoff start week for ${season.year}`
        );
      }

      // Initialize registered season identities
      getFranchises().forEach(franchise => {
        const registration =
          franchise.seasons[season.year];

        if (!registration) return;

        careers[franchise.id].seasons[
          season.year
        ] = {
          season: season.year,
          rosterId: registration.rosterId,
          name: registration.name,
          regularSeason: emptyStats(),
          postseason: emptyStats(),
          overall: emptyStats()
        };
      });

      // Import completed matchup weeks
      const weeklyMatchups = await Promise.all(
        Array.from(
          { length: completedWeekLimit },
          (_, index) =>
            sleeper<Matchup[]>(
              `/league/${season.leagueId}/matchups/${index + 1}`
            )
        )
      );

      weeklyMatchups.forEach((rows, index) => {
        const week = index + 1;

        if (!Array.isArray(rows)) {
          throw new Error(
            `Invalid matchups for ${season.year}, week ${week}`
          );
        }

        const phase: GamePhase =
          week >= playoffStartWeek
            ? 'postseason'
            : 'regularSeason';

        const matchupGroups = new Map<
          number,
          Matchup[]
        >();

        // Group opposing franchises
        rows.forEach(row => {
          if (
            row.matchup_id === null ||
            row.matchup_id === undefined
          ) {
            return;
          }

          const group =
            matchupGroups.get(row.matchup_id) ??
            [];

          group.push(row);

          matchupGroups.set(
            row.matchup_id,
            group
          );
        });

        matchupGroups.forEach(group => {
          if (group.length !== 2) {
            return;
          }

          const [first, second] = group;

          const firstFranchise =
            getFranchiseByRoster(
              season.year,
              first.roster_id
            );

          const secondFranchise =
            getFranchiseByRoster(
              season.year,
              second.roster_id
            );

          if (
            !firstFranchise ||
            !secondFranchise
          ) {
            throw new Error(
              `Unregistered franchise in ${season.year}, week ${week}`
            );
          }

          if (
            firstFranchise.id ===
            secondFranchise.id
          ) {
            throw new Error(
              `Duplicate franchise in ${season.year}, week ${week}`
            );
          }

          const firstPoints = Number(
            first.custom_points ?? first.points
          );

          const secondPoints = Number(
            second.custom_points ?? second.points
          );

          if (
            !Number.isFinite(firstPoints) ||
            !Number.isFinite(secondPoints)
          ) {
            throw new Error(
              `Invalid score in ${season.year}, week ${week}`
            );
          }

          const firstName =
            firstFranchise.seasons[
              season.year
            ].name;

          const secondName =
            secondFranchise.seasons[
              season.year
            ].name;

          const firstGame: FranchiseGame = {
            season: season.year,
            week,
            franchiseId: firstFranchise.id,
            franchiseName: firstName,
            rosterId: first.roster_id,
            opponentId: secondFranchise.id,
            opponentName: secondName,
            pointsFor: firstPoints,
            pointsAgainst: secondPoints,
            margin: firstPoints - secondPoints,
            result:
              firstPoints > secondPoints
                ? 'W'
                : firstPoints < secondPoints
                  ? 'L'
                  : 'T',
            phase
          };

          const secondGame: FranchiseGame = {
            season: season.year,
            week,
            franchiseId: secondFranchise.id,
            franchiseName: secondName,
            rosterId: second.roster_id,
            opponentId: firstFranchise.id,
            opponentName: firstName,
            pointsFor: secondPoints,
            pointsAgainst: firstPoints,
            margin: secondPoints - firstPoints,
            result:
              secondPoints > firstPoints
                ? 'W'
                : secondPoints < firstPoints
                  ? 'L'
                  : 'T',
            phase
          };

          [firstGame, secondGame].forEach(game => {
            const career =
              careers[game.franchiseId];

            const seasonStats =
              career.seasons[season.year];

            career.games.push(game);

            addGame(career.overall, game);
            addGame(career[phase], game);

            addGame(seasonStats.overall, game);
            addGame(seasonStats[phase], game);

            // Highest franchise score
            if (
              !career.highestScore ||
              game.pointsFor >
                career.highestScore.pointsFor
            ) {
              career.highestScore = game;
            }

            // Lowest franchise score
            if (
              !career.lowestScore ||
              game.pointsFor <
                career.lowestScore.pointsFor
            ) {
              career.lowestScore = game;
            }

            // Biggest franchise victory
            if (
              game.result === 'W' &&
              (
                !career.biggestVictory ||
                game.margin >
                  career.biggestVictory.margin
              )
            ) {
              career.biggestVictory = game;
            }
          });
        });
      });

      importedSeasons.push(season.year);
    }

    // Finalize franchise career statistics
    const franchises = Object.values(
      careers
    ).map(franchise => {
      franchise.seasonsPlayed =
        Object.values(franchise.seasons)
          .filter(
            season => season.overall.games > 0
          ).length;

      franchise.games.sort(
        (a, b) =>
          Number(a.season) -
          Number(b.season) ||
          a.week - b.week
      );

      franchise.longestWinningStreak =
        calculateStreak(
          franchise.games,
          'W'
        );

      franchise.longestLosingStreak =
        calculateStreak(
          franchise.games,
          'L'
        );

      return franchise;
    });

    const activeFranchises =
      franchises.filter(
        franchise =>
          franchise.overall.games > 0
      );

    // Career records
    const mostWins =
      [...activeFranchises].sort(
        (a, b) =>
          b.overall.wins - a.overall.wins ||
          b.overall.pointsFor -
            a.overall.pointsFor
      )[0] ?? null;

    const mostLosses =
      [...activeFranchises].sort(
        (a, b) =>
          b.overall.losses - a.overall.losses
      )[0] ?? null;

    const bestWinPercentage =
      [...activeFranchises].sort(
        (a, b) =>
          b.overall.winPercentage -
          a.overall.winPercentage ||
          b.overall.wins - a.overall.wins
      )[0] ?? null;

    const mostPointsFor =
      [...activeFranchises].sort(
        (a, b) =>
          b.overall.pointsFor -
          a.overall.pointsFor
      )[0] ?? null;

    const mostPointsAgainst =
      [...activeFranchises].sort(
        (a, b) =>
          b.overall.pointsAgainst -
          a.overall.pointsAgainst
      )[0] ?? null;

    const allGames = activeFranchises.flatMap(
      franchise => franchise.games
    );

    const highestTeamScore =
      [...allGames].sort(
        (a, b) => b.pointsFor - a.pointsFor
      )[0] ?? null;

    const lowestTeamScore =
      [...allGames].sort(
        (a, b) => a.pointsFor - b.pointsFor
      )[0] ?? null;

    const biggestVictory =
      [...allGames]
        .filter(game => game.result === 'W')
        .sort(
          (a, b) => b.margin - a.margin
        )[0] ?? null;

    const longestWinningStreak =
      [...activeFranchises]
        .filter(
          franchise =>
            franchise.longestWinningStreak
        )
        .sort(
          (a, b) =>
            (b.longestWinningStreak?.length ?? 0) -
            (a.longestWinningStreak?.length ?? 0)
        )[0] ?? null;

    const longestLosingStreak =
      [...activeFranchises]
        .filter(
          franchise =>
            franchise.longestLosingStreak
        )
        .sort(
          (a, b) =>
            (b.longestLosingStreak?.length ?? 0) -
            (a.longestLosingStreak?.length ?? 0)
        )[0] ?? null;

    // Regular-season scoring records
    const franchiseSeasons =
      activeFranchises.flatMap(franchise =>
        Object.values(franchise.seasons)
          .filter(
            season =>
              season.regularSeason.games > 0
          )
          .map(season => ({
            franchiseId: franchise.id,
            franchiseName: season.name,
            season: season.season,
            rosterId: season.rosterId,
            ...season.regularSeason
          }))
      );

    const bestScoringSeason =
      [...franchiseSeasons].sort(
        (a, b) =>
          b.pointsFor - a.pointsFor
      )[0] ?? null;

    // Build separate historical standings
    function buildStandings(
      phase: 'overall' | GamePhase
    ) {
      return [...franchises]
        .sort(
          (a, b) =>
            b[phase].winPercentage -
              a[phase].winPercentage ||
            b[phase].wins -
              a[phase].wins ||
            b[phase].pointsFor -
              a[phase].pointsFor
        )
        .map((franchise, index) => ({
          rank: index + 1,
          id: franchise.id,
          name: franchise.name,
          seasonsPlayed:
            franchise.seasonsPlayed,
          ...franchise[phase]
        }));
    }

    return NextResponse.json(
      {
        importedSeasons,
        seasonCount: importedSeasons.length,
        franchiseCount: franchises.length,
        completedGames: allGames.length / 2,

        records: {
          mostWins,
          mostLosses,
          bestWinPercentage,
          mostPointsFor,
          mostPointsAgainst,
          highestTeamScore,
          lowestTeamScore,
          biggestVictory,
          longestWinningStreak,
          longestLosingStreak,
          bestScoringSeason
        },

        standings: {
          overall: buildStandings('overall'),

          regularSeason:
            buildStandings('regularSeason'),

          postseason:
            buildStandings('postseason')
        },

        franchises,

        fetchedAt: new Date().toISOString()
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
            : 'All-time franchise import failed'
      },
      { status: 502 }
    );
  }
}
