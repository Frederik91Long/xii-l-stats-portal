'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import {
  useParams,
  useSearchParams,
  useRouter
} from 'next/navigation';

import { useLeague } from '@/lib/useLeague';
import { teamName } from '@/lib/sleeper';

import {
  CURRENT_SEASON,
  getAvailableSeasons
} from '@/lib/seasons';

import {
  Hero,
  State,
  Refresh
} from '../../components';

export default function PlayerProfile() {
  return (
    <Suspense
      fallback={
        <main className="wrap main">
          <div className="loading">
            Loading player profile...
          </div>
        </main>
      }
    >
      <PlayerProfileContent />
    </Suspense>
  );
}

function PlayerProfileContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const playerId = String(params.id);

  const season =
    searchParams.get('season') ?? CURRENT_SEASON;

  const availableSeasons = getAvailableSeasons();

  const {
    data: leagueData,
    loading,
    error,
    refresh
  } = useLeague(undefined, season);

  // Prevent data from another season being displayed
  const data =
    leagueData?.season === season
      ? leagueData
      : null;

  const player = data?.players?.[playerId];
  const stats = data?.playerStats?.[playerId];

  const playerName =
    player?.full_name ||
    [player?.first_name, player?.last_name]
      .filter(Boolean)
      .join(' ') ||
    playerId;

  const total = stats?.total ?? 0;
  const starts = stats?.starts ?? 0;

  const average =
    starts > 0 ? total / starts : 0;

  const weeks = data
    ? Array.from(
        {
          length: Math.min(
            18,
            Math.max(1, data.currentWeek)
          )
        },
        (_, index) => index + 1
      )
    : [];

  const franchiseHistory = data
    ? data.rosters
        .map(roster => ({
          roster,
          stats:
            data.franchisePlayerStats?.[
              String(roster.roster_id)
            ]?.[playerId]
        }))
        .filter(entry => entry.stats)
        .sort(
          (a, b) =>
            (b.stats?.total ?? 0) -
            (a.stats?.total ?? 0)
        )
    : [];

  function changeSeason(nextSeason: string) {
    router.push(
      `/players/${playerId}?season=${nextSeason}`
    );
  }

  return (
    <main className="wrap main">

      <Link href="/players" className="back">
        ← All players
      </Link>

      <section className="panel">
        <h2>Select Season</h2>

        <select
          value={season}
          onChange={event =>
            changeSeason(event.target.value)
          }
        >
          {availableSeasons.map(item => (
            <option
              key={item.year}
              value={item.year}
            >
              {item.year} — {item.name}
            </option>
          ))}
        </select>
      </section>

      <State
        loading={loading}
        error={error}
        refresh={refresh}
      />

      {data && !player && !stats && (
        <div className="error">
          Player not found in the {season} season.
        </div>
      )}

      {data && (player || stats) && (
        <>
          <Hero
            title={playerName.toUpperCase()}
            subtitle={`${player?.position || 'Player'} · XII-L ${season}`}
          />

          <section className="kpis">

            <div className="kpi">
              <strong>{total.toFixed(2)}</strong>
              <span>Season Fantasy PTS</span>
            </div>

            <div className="kpi">
              <strong>{starts}</strong>
              <span>Season Starts</span>
            </div>

            <div className="kpi">
              <strong>{average.toFixed(2)}</strong>
              <span>Average PTS / Start</span>
            </div>

            <div className="kpi">
              <strong>
                {franchiseHistory.length}
              </strong>
              <span>Franchises Started For</span>
            </div>

          </section>

          <Refresh
            data={data}
            loading={loading}
            refresh={refresh}
          />

          <section className="panel">
            <h2>Weekly Performance — {season}</h2>

            <p className="muted small">
              Only points earned as a starter
              count towards XII-L statistics.
            </p>

            <div className="tableScroll">
              <table>
                <thead>
                  <tr>
                    <th>Week</th>
                    <th>Fantasy PTS</th>
                    <th>Started</th>
                  </tr>
                </thead>

                <tbody>
                  {weeks.map(week => {
                    const score =
                      stats?.weekly?.[week] ?? 0;

                    const started =
                      franchiseHistory.some(
                        entry =>
                          entry.stats?.weekly?.[week] !==
                          undefined
                      );

                    return (
                      <tr key={week}>
                        <td>Week {week}</td>
                        <td>{score.toFixed(2)}</td>
                        <td>
                          {started ? 'Yes' : 'No'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <h2>Franchise History — {season}</h2>

            <div className="tableScroll">
              <table>
                <thead>
                  <tr>
                    <th>Franchise</th>
                    <th>Starts</th>
                    <th>Fantasy PTS</th>
                    <th>Average</th>
                  </tr>
                </thead>

                <tbody>
                  {franchiseHistory.map(
                    ({
                      roster,
                      stats: franchiseStats
                    }) => {
                      const franchiseStarts =
                        franchiseStats?.starts ?? 0;

                      const franchisePoints =
                        franchiseStats?.total ?? 0;

                      const franchiseAverage =
                        franchiseStarts > 0
                          ? franchisePoints /
                            franchiseStarts
                          : 0;

                      return (
                        <tr key={roster.roster_id}>
                          <td>
                            <Link
                              href={`/franchises/${roster.roster_id}?season=${season}`}
                            >
                              {teamName(
                                roster,
                                data.users
                              )}
                            </Link>
                          </td>

                          <td>{franchiseStarts}</td>

                          <td>
                            {franchisePoints.toFixed(2)}
                          </td>

                          <td>
                            {franchiseAverage.toFixed(2)}
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>

            {franchiseHistory.length === 0 && (
              <p className="muted">
                No XII-L starts recorded
                in this season.
              </p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
