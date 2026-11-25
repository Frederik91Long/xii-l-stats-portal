
import { NextRequest, NextResponse } from 'next/server';

import { getAvailableSeasons } from '@/lib/seasons';
import { getFranchises } from '@/lib/franchises';
import { getPlayoffConfig } from '@/lib/playoffs';

import { GET as getPlayoffs } from '../playoffs/route';

export const runtime = 'nodejs';

type Finalist = {
  franchiseId: string;
  rosterId: number;
  name: string;
  seed: number;
};

type ChampionshipGame = {
  week: number;
  status: string;
  homeTeam: Finalist | null;
  awayTeam: Finalist | null;
  homeScore: number | null;
  awayScore: number | null;
  winner: Finalist | null;
  loser: Finalist | null;
};

type ChampionshipEntry = {
  season: string;
  seasonName: string;
  week: number | null;
  status: 'completed' | 'pending' | 'unresolved' | 'unavailable';
  champion: Finalist | null;
  runnerUp: Finalist | null;
  championScore: number | null;
  runnerUpScore: number | null;
  margin: number | null;
  finalists: Finalist[];
  warnings: string[];
};

type FranchiseChampionshipRecord = {
  franchiseId: string;
  name: string;
  championships: number;
  finals: number;
  finalsLost: number;
  championshipWinPercentage: number | null;
  championshipSeasons: string[];
  runnerUpSeasons: string[];
};

export async function GET() {
  try {
    const seasons = getAvailableSeasons();
    const franchises = getFranchises();

    const history: ChampionshipEntry[] = [];

    const leaderboard: FranchiseChampionshipRecord[] =
      franchises.map(franchise => ({
        franchiseId: franchise.id,
        name: franchise.name,
        championships: 0,
        finals: 0,
        finalsLost: 0,
        championshipWinPercentage: null,
        championshipSeasons: [],
        runnerUpSeasons: []
      }));

    const franchiseMap = new Map(
      leaderboard.map(franchise => [
        franchise.franchiseId,
        franchise
      ])
    );

    for (const season of seasons) {
      const config = getPlayoffConfig(season.year);

      const entry: ChampionshipEntry = {
        season: season.year,
        seasonName: season.name,
        week: config?.championshipWeek ?? null,
        status: 'pending',
        champion: null,
        runnerUp: null,
        championScore: null,
        runnerUpScore: null,
        margin: null,
        finalists: [],
        warnings: []
      };

      if (!config) {
        entry.status = 'unavailable';

        entry.warnings.push(
          'Playoff configuration missing'
        );

        history.push(entry);
        continue;
      }

      try {
        // Reuse the existing playoff route directly.
        // No separate external HTTP request is needed.
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

        if (!data.bracket?.championship) {
          throw new Error(
            'Championship bracket unavailable'
          );
        }

        const final =
          data.bracket.championship as ChampionshipGame;

        entry.week = final.week;

        entry.warnings = Array.isArray(
          data.bracket.warnings
        )
          ? [...data.bracket.warnings]
          : [];

        if (data.seedingFinal) {
          entry.finalists = [
            final.homeTeam,
            final.awayTeam
          ].filter(
            (team): team is Finalist => team !== null
          );
        }

        if (
          final.status === 'completed' &&
          data.seedingFinal &&
          final.winner &&
          final.loser &&
          final.homeTeam &&
          final.awayTeam &&
          final.homeScore !== null &&
          final.awayScore !== null &&
          Number.isFinite(final.homeScore) &&
          Number.isFinite(final.awayScore)
        ) {
          const champion = final.winner;
          const runnerUp = final.loser;

          const championRecord = franchiseMap.get(
            champion.franchiseId
          );

          const runnerUpRecord = franchiseMap.get(
            runnerUp.franchiseId
          );

          if (
            !championRecord ||
            !runnerUpRecord ||
            champion.franchiseId === runnerUp.franchiseId
          ) {
            throw new Error(
              'Invalid championship franchise identities'
            );
          }

          const championIsHome =
            champion.rosterId === final.homeTeam.rosterId;

          const championScore = championIsHome
            ? final.homeScore
            : final.awayScore;

          const runnerUpScore = championIsHome
            ? final.awayScore
            : final.homeScore;

          entry.status = 'completed';

          entry.champion = {
            franchiseId: champion.franchiseId,
            rosterId: champion.rosterId,
            name: champion.name,
            seed: champion.seed
          };

          entry.runnerUp = {
            franchiseId: runnerUp.franchiseId,
            rosterId: runnerUp.rosterId,
            name: runnerUp.name,
            seed: runnerUp.seed
          };

          entry.championScore = championScore;
          entry.runnerUpScore = runnerUpScore;

          entry.margin = Math.round(
            (championScore - runnerUpScore) * 100
          ) / 100;

          championRecord.championships++;
          championRecord.finals++;

          championRecord.championshipSeasons.push(
            season.year
          );

          runnerUpRecord.finals++;
          runnerUpRecord.finalsLost++;

          runnerUpRecord.runnerUpSeasons.push(
            season.year
          );

        } else if (
          final.status === 'unresolved' ||
          final.status === 'missingMatchup' ||
          data.currentWeek > config.championshipWeek
        ) {
          entry.status = 'unresolved';

          entry.warnings.push(
            'Championship result requires verification'
          );
        }

      } catch (error) {
        entry.status = 'unavailable';

        entry.warnings.push(
          error instanceof Error
            ? error.message
            : 'Championship import failed'
        );
      }

      history.push(entry);
    }

    leaderboard.forEach(franchise => {
      franchise.championshipWinPercentage =
        franchise.finals > 0
          ? franchise.championships / franchise.finals
          : null;
    });

    leaderboard.sort((a, b) =>
      b.championships - a.championships ||
      b.finals - a.finals ||
      a.name.localeCompare(b.name)
    );

    history.sort(
      (a, b) => Number(b.season) - Number(a.season)
    );

    const completedChampionships = history.filter(
      entry => entry.status === 'completed'
    );

    const unresolvedChampionships = history.filter(
      entry =>
        entry.status === 'unresolved' ||
        entry.status === 'unavailable'
    );

    const latestChampion =
      completedChampionships[0] ?? null;

    const uniqueChampions = new Set(
      completedChampionships.flatMap(entry =>
        entry.champion
          ? [entry.champion.franchiseId]
          : []
      )
    ).size;

    return NextResponse.json(
      {
        summary: {
          registeredSeasons: seasons.length,
          completedSeasons: completedChampionships.length,
          championshipsAwarded: completedChampionships.length,
          finalsPlayed: completedChampionships.length,
          uniqueChampions,
          unresolvedSeasons: unresolvedChampionships.length,
          historyComplete: unresolvedChampionships.length === 0
        },

        latestChampion,
        history,
        leaderboard,

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
            : 'Championship history import failed'
      },
      { status: 502 }
    );
  }
}
