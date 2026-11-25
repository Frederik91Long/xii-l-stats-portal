import { NextRequest, NextResponse } from 'next/server';

import { getAvailableSeasons } from '@/lib/seasons';
import { getFranchises } from '@/lib/franchises';
import { getPlayoffConfig } from '@/lib/playoffs';

import { GET as getPlayoffs } from '../playoffs/route';

export const runtime = 'nodejs';

type PlayoffTeam = {
  franchiseId: string;
  rosterId: number;
  name: string;
  seed: number;
};

type PlayoffGame = {
  id: string;
  week: number;
  status: string;
  homeTeam: PlayoffTeam | null;
  awayTeam: PlayoffTeam | null;
  homeScore: number | null;
  awayScore: number | null;
  winner: PlayoffTeam | null;
  loser: PlayoffTeam | null;
};

type HistoricalGame = {
  season: string;
  week: number;
  round: string;
  winner: PlayoffTeam;
  loser: PlayoffTeam;
  winnerScore: number;
  loserScore: number;
  margin: number;
};

type FranchiseRecord = {
  franchiseId: string;
  name: string;
  appearances: number;
  byes: number;
  championships: number;
  finals: number;
  games: number;
  wins: number;
  losses: number;
  winPercentage: number | null;
  pointsFor: number;
  pointsAgainst: number;
  averagePoints: number | null;
  highestScore: number | null;
  lowestScore: number | null;
  biggestVictory: number | null;
  closestVictory: number | null;
  longestWinningStreak: number;
  longestLosingStreak: number;
  currentStreak: number;
  playoffSeasons: string[];
  byeSeasons: string[];
  championshipSeasons: string[];
};

function roundPoints(value: number) {
  return Math.round(value * 100) / 100;
}

export async function GET() {
  try {
    const seasons = [...getAvailableSeasons()].sort(
      (a, b) => Number(a.year) - Number(b.year)
    );

    const franchises = getFranchises();

    const standings: FranchiseRecord[] =
      franchises.map(franchise => ({
        franchiseId: franchise.id,
        name: franchise.name,
        appearances: 0,
        byes: 0,
        championships: 0,
        finals: 0,
        games: 0,
        wins: 0,
        losses: 0,
        winPercentage: null,
        pointsFor: 0,
        pointsAgainst: 0,
        averagePoints: null,
        highestScore: null,
        lowestScore: null,
        biggestVictory: null,
        closestVictory: null,
        longestWinningStreak: 0,
        longestLosingStreak: 0,
        currentStreak: 0,
        playoffSeasons: [],
        byeSeasons: [],
        championshipSeasons: []
      }));

    const franchiseMap = new Map(
      standings.map(franchise => [
        franchise.franchiseId,
        franchise
      ])
    );

    const games: HistoricalGame[] = [];

    const warnings: string[] = [];

    const seasonHistory: {
      season: string;
      status: string;
      completedGames: number;
    }[] = [];

    let processedSeasons = 0;
    let completedSeasons = 0;

    for (const season of seasons) {
      const config = getPlayoffConfig(season.year);

      if (!config) {
        warnings.push(
          `${season.year}: playoff configuration missing`
        );

        seasonHistory.push({
          season: season.year,
          status: 'unavailable',
          completedGames: 0
        });

        continue;
      }

      try {
        const request = new NextRequest(
          `http://localhost/api/playoffs?season=${encodeURIComponent(season.year)}`
        );

        const response = await getPlayoffs(request);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || 'Playoff import failed'
          );
        }

        if (
          !data.bracket ||
          !Array.isArray(data.standings)
        ) {
          throw new Error(
            'Invalid playoff data'
          );
        }

        processedSeasons++;

        if (Array.isArray(data.bracket.warnings)) {
          for (const warning of data.bracket.warnings) {
            warnings.push(
              `${season.year}: ${warning}`
            );
          }
        }

        if (!data.seedingFinal) {
          const unresolved =
            data.currentWeek >= config.wildCardWeek;

          if (unresolved) {
            warnings.push(
              `${season.year}: final seeding requires verification`
            );
          }

          seasonHistory.push({
            season: season.year,
            status: unresolved
              ? 'unresolved'
              : 'pending',
            completedGames: 0
          });

          continue;
        }

        const qualifiedTeams =
          (data.standings as PlayoffTeam[])
            .filter(team =>
              team.seed <= config.playoffTeams
            );

        if (
          qualifiedTeams.length !== config.playoffTeams ||
          new Set(
            qualifiedTeams.map(team => team.franchiseId)
          ).size !== config.playoffTeams ||
          qualifiedTeams.some(
            team => !franchiseMap.has(team.franchiseId)
          )
        ) {
          throw new Error(
            'Invalid playoff qualifiers'
          );
        }

        for (const team of qualifiedTeams) {
          const record = franchiseMap.get(
            team.franchiseId
          )!;

          record.appearances++;

          record.playoffSeasons.push(
            season.year
          );

          if (team.seed <= config.byeTeams) {
            record.byes++;

            record.byeSeasons.push(
              season.year
            );
          }
        }

        const bracketGames: {
          round: string;
          game: PlayoffGame;
        }[] = [
          ...(
            data.bracket.wildCard as PlayoffGame[]
          ).map(game => ({
            round: 'Wild Card',
            game
          })),

          ...(
            data.bracket.semiFinals as PlayoffGame[]
          ).map(game => ({
            round: 'Semi-final',
            game
          })),

          {
            round: 'Championship',
            game: data.bracket.championship
          }
        ];

        bracketGames.sort(
          (a, b) => a.game.week - b.game.week
        );

        let seasonGames = 0;
        let championshipCompleted = false;

        const processedGames = new Set<string>();

        for (const item of bracketGames) {
          const { game, round } = item;

          if (game.status !== 'completed') {
            continue;
          }

          if (processedGames.has(game.id)) {
            warnings.push(
              `${season.year}: duplicate game ${game.id}`
            );

            continue;
          }

          if (
            !game.winner ||
            !game.loser ||
            !game.homeTeam ||
            !game.awayTeam ||
            game.homeScore === null ||
            game.awayScore === null ||
            !Number.isFinite(game.homeScore) ||
            !Number.isFinite(game.awayScore)
          ) {
            warnings.push(
              `${season.year}: invalid game ${game.id}`
            );

            continue;
          }

          const winner = franchiseMap.get(
            game.winner.franchiseId
          );

          const loser = franchiseMap.get(
            game.loser.franchiseId
          );

          if (
            !winner ||
            !loser ||
            winner.franchiseId === loser.franchiseId
          ) {
            warnings.push(
              `${season.year}: invalid franchise identity`
            );

            continue;
          }

          const winnerIsHome =
            game.winner.rosterId ===
            game.homeTeam.rosterId;

          const expectedWinner = winnerIsHome
            ? game.homeTeam
            : game.awayTeam;

          const expectedLoser = winnerIsHome
            ? game.awayTeam
            : game.homeTeam;

          if (
            expectedWinner.franchiseId !==
              game.winner.franchiseId ||
            expectedLoser.franchiseId !==
              game.loser.franchiseId
          ) {
            warnings.push(
              `${season.year}: inconsistent result ${game.id}`
            );

            continue;
          }

          const winnerScore = winnerIsHome
            ? game.homeScore
            : game.awayScore;

          const loserScore = winnerIsHome
            ? game.awayScore
            : game.homeScore;

          if (winnerScore <= loserScore) {
            warnings.push(
              `${season.year}: unresolved score ${game.id}`
            );

            continue;
          }

          const margin = roundPoints(
            winnerScore - loserScore
          );

          processedGames.add(game.id);

          winner.games++;
          winner.wins++;

          loser.games++;
          loser.losses++;

          winner.pointsFor += winnerScore;
          winner.pointsAgainst += loserScore;

          loser.pointsFor += loserScore;
          loser.pointsAgainst += winnerScore;

          winner.highestScore =
            winner.highestScore === null
              ? winnerScore
              : Math.max(
                  winner.highestScore,
                  winnerScore
                );

          winner.lowestScore =
            winner.lowestScore === null
              ? winnerScore
              : Math.min(
                  winner.lowestScore,
                  winnerScore
                );

          loser.highestScore =
            loser.highestScore === null
              ? loserScore
              : Math.max(
                  loser.highestScore,
                  loserScore
                );

          loser.lowestScore =
            loser.lowestScore === null
              ? loserScore
              : Math.min(
                  loser.lowestScore,
                  loserScore
                );

          winner.biggestVictory =
            winner.biggestVictory === null
              ? margin
              : Math.max(
                  winner.biggestVictory,
                  margin
                );

          winner.closestVictory =
            winner.closestVictory === null
              ? margin
              : Math.min(
                  winner.closestVictory,
                  margin
                );

          winner.currentStreak =
            winner.currentStreak > 0
              ? winner.currentStreak + 1
              : 1;

          loser.currentStreak =
            loser.currentStreak < 0
              ? loser.currentStreak - 1
              : -1;

          winner.longestWinningStreak = Math.max(
            winner.longestWinningStreak,
            winner.currentStreak
          );

          loser.longestLosingStreak = Math.max(
            loser.longestLosingStreak,
            Math.abs(loser.currentStreak)
          );

          if (round === 'Championship') {
            winner.championships++;
            winner.finals++;
            loser.finals++;

            winner.championshipSeasons.push(
              season.year
            );

            championshipCompleted = true;
          }

          games.push({
            season: season.year,
            week: game.week,
            round,
            winner: game.winner,
            loser: game.loser,
            winnerScore,
            loserScore,
            margin
          });

          seasonGames++;
        }

        if (championshipCompleted) {
          completedSeasons++;
        }

        seasonHistory.push({
          season: season.year,
          status: championshipCompleted
            ? 'completed'
            : data.currentWeek > config.championshipWeek
              ? 'unresolved'
              : 'inProgress',
          completedGames: seasonGames
        });

      } catch (error) {
        warnings.push(
          `${season.year}: ${
            error instanceof Error
              ? error.message
              : 'Playoff import failed'
          }`
        );

        seasonHistory.push({
          season: season.year,
          status: 'unavailable',
          completedGames: 0
        });
      }
    }

    for (const franchise of standings) {
      franchise.pointsFor = roundPoints(
        franchise.pointsFor
      );

      franchise.pointsAgainst = roundPoints(
        franchise.pointsAgainst
      );

      franchise.winPercentage =
        franchise.games > 0
          ? franchise.wins / franchise.games
          : null;

      franchise.averagePoints =
        franchise.games > 0
          ? roundPoints(
              franchise.pointsFor / franchise.games
            )
          : null;
    }

    standings.sort((a, b) =>
      (b.winPercentage ?? -1) -
        (a.winPercentage ?? -1) ||
      b.wins - a.wins ||
      b.pointsFor - a.pointsFor ||
      a.name.localeCompare(b.name)
    );

    function franchiseLeaders(
      key: keyof FranchiseRecord,
      minimum = 1
    ) {
      const eligible = standings.filter(
        franchise => {
          const value = franchise[key];

          return (
            typeof value === 'number' &&
            Number.isFinite(value) &&
            value >= minimum
          );
        }
      );

      if (eligible.length === 0) {
        return null;
      }

      const value = Math.max(
        ...eligible.map(
          franchise => Number(franchise[key])
        )
      );

      return {
        value,
        holders: eligible.filter(
          franchise => franchise[key] === value
        )
      };
    }

    const scoringPerformances = games.flatMap(
      game => [
        {
          season: game.season,
          week: game.week,
          round: game.round,
          franchise: game.winner,
          opponent: game.loser,
          score: game.winnerScore
        },
        {
          season: game.season,
          week: game.week,
          round: game.round,
          franchise: game.loser,
          opponent: game.winner,
          score: game.loserScore
        }
      ]
    );

    const highestScore =
      scoringPerformances.length > 0
        ? Math.max(
            ...scoringPerformances.map(
              performance => performance.score
            )
          )
        : null;

    const lowestScore =
      scoringPerformances.length > 0
        ? Math.min(
            ...scoringPerformances.map(
              performance => performance.score
            )
          )
        : null;

    const biggestMargin =
      games.length > 0
        ? Math.max(
            ...games.map(game => game.margin)
          )
        : null;

    const closestMargin =
      games.length > 0
        ? Math.min(
            ...games.map(game => game.margin)
          )
        : null;

    const records = {
      mostPlayoffAppearances:
        franchiseLeaders('appearances'),

      mostPlayoffWins:
        franchiseLeaders('wins'),

      mostPlayoffLosses:
        franchiseLeaders('losses'),

      bestPlayoffWinPercentage:
        franchiseLeaders('winPercentage', 0),

      mostFirstRoundByes:
        franchiseLeaders('byes'),

      mostPlayoffPoints:
        franchiseLeaders('pointsFor'),

      mostChampionships:
        franchiseLeaders('championships'),

      longestWinningStreak:
        franchiseLeaders('longestWinningStreak'),

      longestLosingStreak:
        franchiseLeaders('longestLosingStreak'),

      highestPlayoffScore:
        highestScore === null
          ? null
          : {
              value: highestScore,
              holders: scoringPerformances.filter(
                performance =>
                  performance.score === highestScore
              )
            },

      lowestPlayoffScore:
        lowestScore === null
          ? null
          : {
              value: lowestScore,
              holders: scoringPerformances.filter(
                performance =>
                  performance.score === lowestScore
              )
            },

      biggestPlayoffVictory:
        biggestMargin === null
          ? null
          : {
              value: biggestMargin,
              holders: games.filter(
                game => game.margin === biggestMargin
              )
            },

      closestPlayoffVictory:
        closestMargin === null
          ? null
          : {
              value: closestMargin,
              holders: games.filter(
                game => game.margin === closestMargin
              )
            }
    };

    games.sort((a, b) =>
      Number(b.season) - Number(a.season) ||
      b.week - a.week
    );

    seasonHistory.sort(
      (a, b) => Number(b.season) - Number(a.season)
    );

    return NextResponse.json(
      {
        summary: {
          registeredSeasons: seasons.length,
          processedSeasons,
          completedSeasons,
          totalPlayoffGames: games.length,
          totalPlayoffPoints: roundPoints(
            standings.reduce(
              (total, franchise) =>
                total + franchise.pointsFor,
              0
            )
          ),
          uniquePlayoffFranchises:
            standings.filter(
              franchise => franchise.appearances > 0
            ).length,
          totalChampionships: completedSeasons,
          totalFirstRoundByes:
            standings.reduce(
              (total, franchise) =>
                total + franchise.byes,
              0
            ),
          historyComplete:
            warnings.length === 0
        },

        standings,
        records,
        games,
        seasonHistory,
        warnings,

        fetchedAt: new Date().toISOString()
      },
      {
        headers: {
          'Cache-Control':
            'public, s-maxage=300, stale-while-revalidate=600'
        }
      }
    );

  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'All-time playoff import failed'
      },
      { status: 502 }
    );
  }
}
