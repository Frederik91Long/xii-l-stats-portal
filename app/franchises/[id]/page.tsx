'use client';

import Link from 'next/link';
import { Suspense } from 'react';

import {
  useParams,
  useSearchParams
} from 'next/navigation';

import { useLeague } from '@/lib/useLeague';
import { teamName, points } from '@/lib/sleeper';

import {
  CURRENT_SEASON,
  getAvailableSeasons
} from '@/lib/seasons';

import {
  Hero,
  State,
  fmt,
  Refresh
} from '../../components';

export default function Franchise() {
  return (
    <Suspense
      fallback={
        <main className="wrap main">
          <div className="loading">
            Loading franchise profile...
          </div>
        </main>
      }
    >
      <FranchiseContent />
    </Suspense>
  );
}

function FranchiseContent() {
  const params = useParams();
  const searchParams = useSearchParams();

  const season =
    searchParams.get('season') ?? CURRENT_SEASON;

  const availableSeasons = getAvailableSeasons();

  const isCurrentSeason =
    season === CURRENT_SEASON;

  const {
    data: leagueData,
    loading,
    error,
    refresh
  } = useLeague(undefined, season);

  // Prevent statistics from another season
  // being displayed under the wrong year.
  const data =
    leagueData?.season === season
      ? leagueData
      : null;

  const roster = data?.rosters.find(
    r => String(r.roster_id) === String(params.id)
  );

  const owner = data?.users.find(
    u => u.user_id === roster?.owner_id
  );

  const rosterId = String(roster?.roster_id ?? '');

  // Historical stats for this franchise only
  const franchiseStats =
    data?.franchisePlayerStats?.[rosterId] ?? {};

  // Available weeks for the selected season
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

  // Roster from the selected season
  const currentPlayerIds = roster?.players ?? [];

  const currentPlayerSet =
    new Set(currentPlayerIds);

  // Players who started for this franchise
  const historicalPlayerIds =
    Object.keys(franchiseStats);

  // Former starters from this season
  const formerPlayerIds =
    historicalPlayerIds.filter(
      id => !currentPlayerSet.has(id)
    );

  const buildPlayer = (id: string) => ({
    id,
    player: data?.players?.[id],
    starter:
      roster?.starters?.includes(id) ?? false,
    stats: franchiseStats[id]
  });

  const currentPlayers = currentPlayerIds
    .map(buildPlayer)
    .sort((a, b) => {
      const starterDifference =
        Number(b.starter) - Number(a.starter);

      if (starterDifference !== 0) {
        return starterDifference;
      }

      return (
        (b.stats?.total ?? 0) -
        (a.stats?.total ?? 0)
      );
    });

  const formerPlayers = formerPlayerIds
    .map(buildPlayer)
    .sort(
      (a, b) =>
        (b.stats?.total ?? 0) -
        (a.stats?.total ?? 0)
    );

  const franchiseTotal = Object.values(
    franchiseStats
  ).reduce(
    (sum, stats) => sum + stats.total,
    0
  );

  function renderPlayerRows(
    players: ReturnType<typeof buildPlayer>[],
    former = false
  ) {
    return players.map(
      ({ id, player, starter, stats }) => (
        <tr key={id}>
          <td>
            <Link
              href={`/players/${id}?season=${season}`}
            >
              {player?.full_name ||
                [
                  player?.first_name,
                  player?.last_name
                ]
                  .filter(Boolean)
                  .join(' ') ||
                id}
            </Link>
          </td>

          <td>{player?.position || '—'}</td>

          <td>
            {former
              ? 'Former player'
              : starter
                ? 'Starter'
                : 'Bench / reserve'}
          </td>

          <td>{stats?.starts ?? 0}</td>

          {weeks.map(week => {
            const score =
              stats?.weekly?.[week] ?? 0;

            return (
              <td key={week}>
                {score.toFixed(2)}
              </td>
            );
          })}

          <td>
            <strong>
              {(stats?.total ?? 0).toFixed(2)}
            </strong>
          </td>
        </tr>
      )
    );
  }

  function renderTable(
    players: ReturnType<typeof buildPlayer>[],
    former = false
  ) {
    return (
      <div className="tableScroll">
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th>POS</th>
              <th>Status</th>
              <th>Starts</th>

              {weeks.map(week => (
                <th key={week}>W{week}</th>
              ))}

              <th>Franchise PTS</th>
            </tr>
          </thead>

          <tbody>
            {renderPlayerRows(players, former)}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <main className="wrap main">

      <Link href="/franchises" className="back">
        ← All franchises
      </Link>

      <section className="panel">
        <h2>Available Seasons</h2>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          {availableSeasons.map(item => (
            <Link
              key={item.year}
              className="button"
              href={
                `/franchises?season=${item.year}`
              }
            >
              {item.year} — {item.name}
            </Link>
          ))}
        </div>

        <p className="muted small">
          Viewing season: {season}
        </p>

        <p className="muted small">
          Franchise roster IDs may differ
          between seasons.
        </p>
      </section>

      <State
        loading={loading}
        error={error}
        refresh={refresh}
      />

      {data && !roster && (
        <div className="error">
          Franchise not found in the
          {` ${season} `}season.
        </div>
      )}

      {data && roster && (
        <>
          <Hero
            title={teamName(
              roster,
              data.users
            ).toUpperCase()}
            subtitle={`Franchise profile · ${season} XII-L season`}
          />

          <section className="kpis">
            <div className="kpi">
              <strong>
                {roster.settings?.wins || 0}–
                {roster.settings?.losses || 0}
              </strong>
              <span>Win–loss</span>
            </div>

            <div className="kpi">
              <strong>
                {fmt(
                  points(
                    roster.settings,
                    'fpts'
                  )
                )}
              </strong>
              <span>Points For</span>
            </div>

            <div className="kpi">
              <strong>
                {fmt(
                  points(
                    roster.settings,
                    'fpts_against'
                  )
                )}
              </strong>
              <span>Points Against</span>
            </div>

            <div className="kpi">
              <strong>
                {currentPlayers.length}
              </strong>
              <span>
                {isCurrentSeason
                  ? 'Current Players'
                  : 'Roster Players'}
              </span>
            </div>

            <div className="kpi">
              <strong>
                {franchiseTotal.toFixed(2)}
              </strong>
              <span>Starter Fantasy PTS</span>
            </div>
          </section>

          <Refresh
            data={data}
            loading={loading}
            refresh={refresh}
          />

          <section className="panel">
            <h2>
              Franchise Information — {season}
            </h2>

            <p>
              <span className="muted">
                General manager:{' '}
              </span>
              {owner?.display_name ||
                'Not available'}
            </p>

            <p>
              <span className="muted">
                Sleeper roster ID:{' '}
              </span>
              {roster.roster_id}
            </p>

            <p>
              <span className="muted">
                League:{' '}
              </span>
              {data.league.name}
            </p>

            <p>
              <span className="muted">
                Season:{' '}
              </span>
              {season}
            </p>
          </section>

          <section className="panel">
            <h2>
              {isCurrentSeason
                ? 'Current Roster'
                : `Season Roster — ${season}`}
            </h2>

            <p className="muted small">
              Fantasy points earned as a starter
              for this franchise during the
              selected season only.
              Click a player name to view
              individual statistics.
            </p>

            {!isCurrentSeason && (
              <p className="muted small">
                Historical roster based on the
                latest available Sleeper roster
                for this season.
              </p>
            )}

            {renderTable(currentPlayers)}
          </section>

          <section className="panel">
            <h2>Former Players — {season}</h2>

            <p className="muted small">
              Players who started for this
              franchise during the selected
              season but are no longer on
              its available season roster.
            </p>

            {formerPlayers.length > 0 ? (
              renderTable(formerPlayers, true)
            ) : (
              <p className="muted">
                No former starters found.
              </p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
