import { NextRequest, NextResponse } from 'next/server';

import {
  sleeper,
  getPlayers,
  type Roster,
  type Matchup
} from '@/lib/sleeper';

import {
  getSeason,
  CURRENT_SEASON
} from '@/lib/seasons';

import {
  getFranchiseByRoster
} from '@/lib/franchises';

import {
  getPlayoffConfig
} from '@/lib/playoffs';

import {
  GET as getWeeklyAwards
} from '../weekly/route';

type MvpCandidate = {
  playerId: string;
  playerName: string;
  position: string;
  franchiseId: string | null;
  franchiseName: string | null;
  seasonFranchises: string[];
  totalPoints: number;
  starts: number;
  averagePoints: number;
  highestScore: number;
  weeklyAwards: number | null;
  weeklyScores: {
    week: number;
    points: number;
    franchiseId: string;
    franchiseName: string;
  }[];
};

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function GET(request: NextRequest) {
  try {
    const seasonYear =
      request.nextUrl.searchParams.get('season') ||
      CURRENT_SEASON;

    const season = getSeason(seasonYear);
    const config = getPlayoffConfig(seasonYear);

    if (!season || !config) {
      return NextResponse.json(
        { error: 'Season not configured' },
        { status: 404 }
      );
    }

    const leagueId = season.leagueId;

    const [rosters, players] = await Promise.all([
      sleeper<Roster[]>(
        `/league/${leagueId}/rosters`
      ),
      getPlayers()
    ]);

    if (
      rosters.length !== config.franchiseCount ||
      new Set(rosters.map(r => r.roster_id)).size !==
        config.franchiseCount
    ) {
      throw new Error('Unexpected franchise count');
    }

    const gamesPlayed = rosters.map(roster =>
      Number(roster.settings?.wins || 0) +
      Number(roster.settings?.losses || 0) +
      Number(roster.settings?.ties || 0)
    );

    const completedWeeks = Math.max(
      0,
      Math.min(
        config.regularSeasonEnd,
        ...gamesPlayed
      )
    );

    const weeks = Array.from(
      { length: completedWeeks },
      (_, index) => index + 1
    );

    const weeklyMatchups = await Promise.all(
      weeks.map(async week => {
        try {
          const rows = await sleeper<Matchup[]>(
            `/league/${leagueId}/matchups/${week}`
          );

          return { week, rows };
        } catch {
          return { week, rows: null };
        }
      })
    );

    const candidates = new Map<string, MvpCandidate>();
    const warnings: string[] = [];
    const importedWeeks: number[] = [];

    for (const { week, rows } of weeklyMatchups) {
      if (
        !Array.isArray(rows) ||
        rows.length !== config.franchiseCount ||
        new Set(rows.map(row => row.roster_id)).size !==
          config.franchiseCount
      ) {
        warnings.push(
          `Incomplete matchup data for week ${week}`
        );

        continue;
      }

      const entries: {
        playerId: string;
        points: number;
        franchiseId: string;
        franchiseName: string;
      }[] = [];

      const seen = new Set<string>();
      let valid = true;

      for (const row of rows) {
        const franchise = getFranchiseByRoster(
          seasonYear,
          row.roster_id
        );

        if (
          !franchise ||
          !Array.isArray(row.starters)
        ) {
          valid = false;
          continue;
        }

        for (
          let index = 0;
          index < row.starters.length;
          index++
        ) {
          const playerId = row.starters[index];

          if (!playerId || playerId === '0') {
            continue;
          }

          const rawPoints =
            row.starters_points?.[index] ??
            row.players_points?.[playerId];

          if (
            typeof rawPoints !== 'number' ||
            !Number.isFinite(rawPoints) ||
            seen.has(playerId)
          ) {
            valid = false;
            continue;
          }

          seen.add(playerId);

          entries.push({
            playerId,
            points: round(rawPoints),
            franchiseId: franchise.id,
            franchiseName:
              franchise.seasons[seasonYear]?.name ||
              franchise.name
          });
        }
      }

      if (!valid || entries.length === 0) {
        warnings.push(
          `Incomplete player data for week ${week}`
        );

        continue;
      }

      importedWeeks.push(week);

      for (const entry of entries) {
        const player = players[entry.playerId];

        const existing = candidates.get(entry.playerId);

        const candidate: MvpCandidate = existing || {
          playerId: entry.playerId,
          playerName:
            player?.full_name ||
            [
              player?.first_name,
              player?.last_name
            ].filter(Boolean).join(' ') ||
            entry.playerId,
          position: player?.position || 'Unknown',
          franchiseId: null,
          franchiseName: null,
          seasonFranchises: [],
          totalPoints: 0,
          starts: 0,
          averagePoints: 0,
          highestScore: entry.points,
          weeklyAwards: null,
          weeklyScores: []
        };

        candidate.totalPoints = round(
          candidate.totalPoints + entry.points
        );

        candidate.starts++;

        candidate.highestScore = Math.max(
          candidate.highestScore,
          entry.points
        );

        candidate.averagePoints = round(
          candidate.totalPoints / candidate.starts
        );

        if (
          !candidate.seasonFranchises.includes(
            entry.franchiseName
          )
        ) {
          candidate.seasonFranchises.push(
            entry.franchiseName
          );
        }

        candidate.weeklyScores.push({
          week,
          points: entry.points,
          franchiseId: entry.franchiseId,
          franchiseName: entry.franchiseName
        });

        candidates.set(entry.playerId, candidate);
      }
    }

    const weeklyAwardCounts = new Map<string, number>();

    let weeklyAwardsAvailable = false;

    try {
      const weeklyRequest = new NextRequest(
        `http://localhost/api/awards/weekly?season=${seasonYear}`
      );

      const weeklyResponse = await getWeeklyAwards(
        weeklyRequest
      );

      const weeklyData = await weeklyResponse.json();

      if (
        weeklyResponse.ok &&
        Array.isArray(weeklyData.awards) &&
        weeklyData.summary?.completedWeeks === completedWeeks &&
        weeklyData.summary?.unavailableWeeks === 0 &&
        weeklyData.summary?.unresolvedWeeks === 0
      ) {
        weeklyAwardsAvailable = true;

        for (const award of weeklyData.awards) {
          if (!award.playerId) continue;

          weeklyAwardCounts.set(
            award.playerId,
            (weeklyAwardCounts.get(award.playerId) || 0) + 1
          );
        }
      }
    } catch {
      weeklyAwardsAvailable = false;
    }

    if (!weeklyAwardsAvailable) {
      warnings.push(
        'Weekly award totals are unavailable or incomplete'
      );
    }

    for (const candidate of candidates.values()) {
      const currentRoster = rosters.find(
        roster =>
          roster.players?.includes(candidate.playerId)
      );

      if (currentRoster) {
        const franchise = getFranchiseByRoster(
          seasonYear,
          currentRoster.roster_id
        );

        candidate.franchiseId = franchise?.id ?? null;

        candidate.franchiseName =
          franchise?.seasons[seasonYear]?.name ||
          franchise?.name ||
          null;
      }

      candidate.weeklyAwards = weeklyAwardsAvailable
        ? weeklyAwardCounts.get(candidate.playerId) || 0
        : null;
    }

    const leaderboard = [...candidates.values()]
      .sort(
        (a, b) =>
          b.totalPoints - a.totalPoints ||
          b.totalPoints / b.starts -
            a.totalPoints / a.starts ||
          a.playerName.localeCompare(b.playerName) ||
          a.playerId.localeCompare(b.playerId)
      )
      .map((candidate, index) => ({
        rank: index + 1,
        ...candidate
      }));

    const dataComplete =
      importedWeeks.length === completedWeeks;

    const frontRunners = dataComplete
      ? leaderboard.slice(0, 5)
      : [];

    return NextResponse.json(
      {
        season: seasonYear,
        seasonName: season.name,
        award: 'Crown MVP',
        selection: 'manual',
        race: {
          ranking: 'totalFantasyPoints',
          tiebreaker: 'averageFantasyPoints',
          startersOnly: true,
          completedWeeksOnly: true,
          regularSeasonOnly: true,
          firstWeek: 1,
          lastWeek: config.regularSeasonEnd
        },
        summary: {
          completedWeeks,
          importedWeeks: importedWeeks.length,
          eligiblePlayers: leaderboard.length,
          dataComplete,
          weeklyAwardsAvailable
        },
        statisticalLeader: frontRunners[0] ?? null,
        frontRunners,
        leaderboard,
        warnings,
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
            : 'Could not load MVP race'
      },
      { status: 502 }
    );
  }
}
