import { NextRequest, NextResponse } from 'next/server';

import {
  sleeper,
  League,
  Roster,
  User,
  Matchup,
  teamName,
  points
} from '@/lib/sleeper';

import {
  getSeason,
  getCurrentSeason
} from '@/lib/seasons';

import {
  getPlayoffConfig,
  getPlayoffRound,
  getWildCardMatchups
} from '@/lib/playoffs';

import {
  getFranchiseByRoster
} from '@/lib/franchises';

export const runtime = 'nodejs';

type ScheduledGame = {
  week: number;
  opponentId: string;
  opponentName: string;
  opponentRosterId: number;
};

type PlayoffTeam = {
  franchiseId: string;
  rosterId: number;
  name: string;
  seed: number;
  wins: number;
  losses: number;
  ties: number;
  gamesPlayed: number;
  winPercentage: number;
  pointsFor: number;
  pointsAgainst: number;
  remainingGames: number;
  remainingSchedule: ScheduledGame[];
  currentlyInPlayoffs: boolean;
  currentlyHasBye: boolean;
};

export async function GET(
  request: NextRequest
) {
  try {
    const requestedSeason =
      request.nextUrl.searchParams.get('season');

    const season = requestedSeason
      ? getSeason(requestedSeason)
      : getCurrentSeason();

    if (!season) {
      return NextResponse.json(
        { error: 'Season not registered' },
        { status: 404 }
      );
    }

    const config = getPlayoffConfig(
      season.year
    );

    if (!config) {
      return NextResponse.json(
        {
          error:
            `Playoff configuration missing for ${season.year}`
        },
        { status: 404 }
      );
    }

    const leagueId = season.leagueId;

    const [
      league,
      rosters,
      users,
      state
    ] = await Promise.all([
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
      throw new Error(
        'Invalid Sleeper response'
      );
    }

    if (
      rosters.length !== config.franchiseCount
    ) {
      throw new Error(
        'Unexpected number of franchises'
      );
    }

    const isComplete =
      league.status === 'complete';

    const currentWeek = isComplete
      ? config.championshipWeek + 1
      : Number(league.settings?.leg) ||
        Number(state?.week) ||
        1;

    const completedRegularWeeks =
      isComplete
        ? config.regularSeasonEnd
        : Math.max(
            0,
            Math.min(
              config.regularSeasonEnd,
              currentWeek - 1
            )
          );

    const remainingWeeks = Math.max(
      0,
      config.regularSeasonEnd -
        completedRegularWeeks
    );

    const regularSeasonComplete =
      remainingWeeks === 0;

    const rosterMap = new Map(
      rosters.map(roster => [
        roster.roster_id,
        roster
      ])
    );

    function franchiseIdentity(
      rosterId: number
    ) {
      const roster = rosterMap.get(rosterId);

      const franchise = getFranchiseByRoster(
        season!.year,
        rosterId
      );

      if (!franchise) {
        throw new Error(
          `Unregistered roster ${rosterId}`
        );
      }

      return {
        id: franchise.id,
        name:
          franchise.seasons[season!.year]?.name ||
          (
            roster
              ? teamName(roster, users)
              : franchise.name
          )
      };
    }

    // Import the remaining regular-season schedule
    const remainingMatchups =
      await Promise.all(
        Array.from(
          { length: remainingWeeks },
          (_, index) => {
            const week =
              completedRegularWeeks +
              index +
              1;

            return sleeper<Matchup[]>(
              `/league/${leagueId}/matchups/${week}`
            ).then(matchups => ({
              week,
              matchups
            }));
          }
        )
      );

    const schedules: Record<
      number,
      ScheduledGame[]
    > = {};

    rosters.forEach(roster => {
      schedules[roster.roster_id] = [];
    });

    const unavailableScheduleWeeks: number[] = [];

    remainingMatchups.forEach(
      ({ week, matchups }) => {
        if (
          !Array.isArray(matchups) ||
          matchups.length === 0
        ) {
          unavailableScheduleWeeks.push(week);
          return;
        }

        const groups = new Map<
          number,
          Matchup[]
        >();

        matchups.forEach(matchup => {
          if (
            matchup.matchup_id === null ||
            matchup.matchup_id === undefined
          ) {
            return;
          }

          const group =
            groups.get(matchup.matchup_id) ?? [];

          group.push(matchup);

          groups.set(
            matchup.matchup_id,
            group
          );
        });

        let validGames = 0;

        groups.forEach(group => {
          if (group.length !== 2) return;

          const [first, second] = group;

          if (
            first.roster_id === second.roster_id ||
            !schedules[first.roster_id] ||
            !schedules[second.roster_id]
          ) {
            return;
          }

          const firstIdentity =
            franchiseIdentity(first.roster_id);

          const secondIdentity =
            franchiseIdentity(second.roster_id);

          schedules[first.roster_id].push({
            week,
            opponentId: secondIdentity.id,
            opponentName: secondIdentity.name,
            opponentRosterId: second.roster_id
          });

          schedules[second.roster_id].push({
            week,
            opponentId: firstIdentity.id,
            opponentName: firstIdentity.name,
            opponentRosterId: first.roster_id
          });

          validGames += 1;
        });

        if (
          validGames !== config.franchiseCount / 2
        ) {
          unavailableScheduleWeeks.push(week);
        }
      }
    );

    // Official XII-L standings:
    // Wins, ties and Points For
    const sortedRosters = [...rosters].sort(
      (a, b) => {
        const first = a.settings ?? {};
        const second = b.settings ?? {};

        const firstRecord =
          (first.wins ?? 0) +
          (first.ties ?? 0) * 0.5;

        const secondRecord =
          (second.wins ?? 0) +
          (second.ties ?? 0) * 0.5;

        return (
          secondRecord - firstRecord ||
          points(second, 'fpts') -
            points(first, 'fpts')
        );
      }
    );

    const standings: PlayoffTeam[] =
      sortedRosters.map((roster, index) => {
        const settings = roster.settings ?? {};

        const identity =
          franchiseIdentity(roster.roster_id);

        const wins = settings.wins ?? 0;
        const losses = settings.losses ?? 0;
        const ties = settings.ties ?? 0;

        const gamesPlayed =
          wins + losses + ties;

        const seed = index + 1;

        return {
          franchiseId: identity.id,
          rosterId: roster.roster_id,
          name: identity.name,
          seed,
          wins,
          losses,
          ties,
          gamesPlayed,

          winPercentage:
            gamesPlayed > 0
              ? (wins + ties * 0.5) /
                gamesPlayed
              : 0,

          pointsFor:
            points(settings, 'fpts'),

          pointsAgainst:
            points(settings, 'fpts_against'),

          remainingGames: Math.max(
            0,
            config.regularSeasonEnd -
              gamesPlayed
          ),

          remainingSchedule:
            schedules[roster.roster_id] ?? [],

          currentlyInPlayoffs:
            seed <= config.playoffTeams,

          currentlyHasBye:
            seed <= config.byeTeams
        };
      });

    const unresolvedSeedTies = standings
      .slice(1)
      .flatMap((team, index) => {
        const previous = standings[index];

        const sameRecord =
          team.wins + team.ties * 0.5 ===
          previous.wins + previous.ties * 0.5;

        const samePoints =
          team.pointsFor === previous.pointsFor;

        return sameRecord && samePoints
          ? [{
              seeds: [previous.seed, team.seed],
              franchises: [
                previous.franchiseId,
                team.franchiseId
              ]
            }]
          : [];
      });

    const playoffTeams = standings.slice(
      0,
      config.playoffTeams
    );

    const byeTeams = standings.slice(
      0,
      config.byeTeams
    );

    const projectedWildCardMatchups =
      getWildCardMatchups().map(matchup => ({
        week: config.wildCardWeek,

        homeSeed: matchup.homeSeed,
        awaySeed: matchup.awaySeed,

        homeTeam:
          standings.find(
            team => team.seed === matchup.homeSeed
          ) ?? null,

        awayTeam:
          standings.find(
            team => team.seed === matchup.awaySeed
          ) ?? null
      }));

    return NextResponse.json(
      {
        season: season.year,
        seasonName: season.name,
        leagueId,
        config,

        tiebreaker: 'pointsFor',

        currentWeek,

        currentRound: getPlayoffRound(
          season.year,
          currentWeek
        ),

        completedRegularWeeks,
        remainingWeeks,
        regularSeasonComplete,

        unresolvedSeedTies,

        seedingFinal:
          regularSeasonComplete &&
          unresolvedSeedTies.length === 0,

        scheduleComplete:
          unavailableScheduleWeeks.length === 0,

        unavailableScheduleWeeks,

        standings,
        playoffTeams,
        byeTeams,
        projectedWildCardMatchups,

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
            : 'Playoff import failed'
      },
      { status: 502 }
    );
  }
}
