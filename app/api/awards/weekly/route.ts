import { NextRequest, NextResponse } from 'next/server';

import {
  sleeper,
  getPlayers,
  type League,
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

import type { AwardRecord } from '@/lib/awards';

type Candidate = {
  playerId: string;
  playerName: string;
  position: string;
  franchiseId: string;
  franchiseName: string;
  rosterId: number;
  fantasyPoints: number;
  previousWeekPoints: number | null;
};

type WeeklyResult = {
  week: number;
  status: 'awarded' | 'unresolved' | 'unavailable';
  winner: AwardRecord | null;
  candidates: Candidate[];
  decidedBy: 'fantasyPoints' | 'previousWeek' | null;
  reason?: string;
};

function roundPoints(value: number): number {
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

    const [league, rosters, players] = await Promise.all([
      sleeper<League>(`/league/${leagueId}`),
      sleeper<Roster[]>(`/league/${leagueId}/rosters`),
      getPlayers()
    ]);

    if (rosters.length !== config.franchiseCount) {
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

    const results: WeeklyResult[] = [];
    const awards: AwardRecord[] = [];
    const warnings: string[] = [];

    const weeklyPlayerScores = new Map<
      number,
      Map<string, number>
    >();

    for (const { week, rows } of weeklyMatchups) {
      if (
        !Array.isArray(rows) ||
        rows.length !== config.franchiseCount ||
        new Set(rows.map(row => row.roster_id)).size !==
          config.franchiseCount
      ) {
        warnings.push(`Incomplete matchup data for week ${week}`);

        results.push({
          week,
          status: 'unavailable',
          winner: null,
          candidates: [],
          decidedBy: null,
          reason: 'Incomplete matchup data'
        });

        continue;
      }

      const candidates: Candidate[] = [];
      const currentScores = new Map<string, number>();

      const previousScores =
        weeklyPlayerScores.get(week - 1);

      let invalidData = false;

      for (const row of rows) {
        const franchise = getFranchiseByRoster(
          seasonYear,
          row.roster_id
        );

        if (!franchise || !Array.isArray(row.starters)) {
          invalidData = true;
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
            currentScores.has(playerId)
          ) {
            invalidData = true;
            continue;
          }

          const player = players[playerId];

          const playerName =
            player?.full_name ||
            [
              player?.first_name,
              player?.last_name
            ].filter(Boolean).join(' ') ||
            playerId;

          const fantasyPoints = roundPoints(rawPoints);

          currentScores.set(
            playerId,
            fantasyPoints
          );

          candidates.push({
            playerId,
            playerName,
            position: player?.position || 'Unknown',
            franchiseId: franchise.id,
            franchiseName:
              franchise.seasons[seasonYear]?.name ||
              franchise.name,
            rosterId: row.roster_id,
            fantasyPoints,
            previousWeekPoints:
              previousScores?.get(playerId) ?? null
          });
        }
      }

      if (invalidData || candidates.length === 0) {
        warnings.push(`Incomplete player data for week ${week}`);

        results.push({
          week,
          status: 'unavailable',
          winner: null,
          candidates: [],
          decidedBy: null,
          reason: 'Incomplete player scoring data'
        });

        continue;
      }

      weeklyPlayerScores.set(week, currentScores);

      candidates.sort(
        (a, b) => b.fantasyPoints - a.fantasyPoints
      );

      const highestScore = candidates[0].fantasyPoints;

      const tiedCandidates = candidates.filter(
        candidate => candidate.fantasyPoints === highestScore
      );

      let winner: Candidate | null = null;

      let decidedBy:
        | 'fantasyPoints'
        | 'previousWeek'
        | null = null;

      if (tiedCandidates.length === 1) {
        winner = tiedCandidates[0];
        decidedBy = 'fantasyPoints';
      } else if (
        week > 1 &&
        tiedCandidates.every(
          candidate => candidate.previousWeekPoints !== null
        )
      ) {
        const ranked = [...tiedCandidates].sort(
          (a, b) =>
            (b.previousWeekPoints ?? 0) -
            (a.previousWeekPoints ?? 0)
        );

        if (
          ranked[0].previousWeekPoints !==
          ranked[1].previousWeekPoints
        ) {
          winner = ranked[0];
          decidedBy = 'previousWeek';
        }
      }

      if (!winner) {
        warnings.push(
          `Manual award decision required for week ${week}`
        );

        results.push({
          week,
          status: 'unresolved',
          winner: null,
          candidates: tiedCandidates,
          decidedBy: null,
          reason: 'Unresolved scoring tiebreaker'
        });

        continue;
      }

      const award: AwardRecord = {
        id: `${seasonYear}-POTW-${week}`,
        awardId: 'playerOfTheWeek',
        season: seasonYear,
        week,
        playerId: winner.playerId,
        recipientName: winner.playerName,
        position: winner.position,
        franchiseId: winner.franchiseId,
        franchiseName: winner.franchiseName,
        fantasyPoints: winner.fantasyPoints,
        selection: 'automatic',
        notes:
          decidedBy === 'previousWeek'
            ? 'Won on previous-week scoring tiebreaker.'
            : 'Highest fantasy score among starting players.'
      };

      awards.push(award);

      results.push({
        week,
        status: 'awarded',
        winner: award,
        candidates: candidates.slice(0, 5),
        decidedBy
      });
    }

    const leaderboardMap = new Map<
      string,
      {
        playerId: string;
        playerName: string;
        position: string;
        totalAwards: number;
        weeks: number[];
        franchises: string[];
      }
    >();

    for (const award of awards) {
      if (!award.playerId || !award.week) continue;

      const existing = leaderboardMap.get(award.playerId) || {
        playerId: award.playerId,
        playerName: award.recipientName,
        position: award.position || 'Unknown',
        totalAwards: 0,
        weeks: [],
        franchises: []
      };

      existing.totalAwards++;
      existing.weeks.push(award.week);

      if (
        award.franchiseName &&
        !existing.franchises.includes(award.franchiseName)
      ) {
        existing.franchises.push(award.franchiseName);
      }

      leaderboardMap.set(award.playerId, existing);
    }

    const leaderboard = [...leaderboardMap.values()].sort(
      (a, b) =>
        b.totalAwards - a.totalAwards ||
        a.playerName.localeCompare(b.playerName)
    );

    return NextResponse.json(
      {
        season: seasonYear,
        seasonName: season.name,
        leagueName: league.name,
        award: 'Crown Player of the Week',
        selection: 'automatic',
        rules: {
          regularSeasonOnly: true,
          firstWeek: 1,
          lastWeek: config.regularSeasonEnd,
          startersOnly: true,
          completedWeeksOnly: true,
          tiebreaker: 'previousWeekFantasyPoints',
          unresolvedTiebreaker: 'manual'
        },
        summary: {
          completedWeeks,
          awardsPresented: awards.length,
          uniqueWinners: leaderboard.length,
          unresolvedWeeks: results.filter(
            result => result.status === 'unresolved'
          ).length,
          unavailableWeeks: results.filter(
            result => result.status === 'unavailable'
          ).length,
          highestWinningScore:
            awards.length > 0
              ? Math.max(
                  ...awards.map(
                    award => award.fantasyPoints ?? 0
                  )
                )
              : null
        },
        latestWinner: awards[awards.length - 1] ?? null,
        awards,
        results,
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
            : 'Could not load weekly awards'
      },
      { status: 502 }
    );
  }
}
