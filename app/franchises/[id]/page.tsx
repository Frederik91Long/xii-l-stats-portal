'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useLeague } from '@/lib/useLeague';
import { teamName, points } from '@/lib/sleeper';
import { Hero, State, fmt, Refresh } from '../../components';

export default function Franchise() {
  const params = useParams();

  const { data, loading, error, refresh } = useLeague();

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

  // All played weeks, including current week
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

  // Current roster player IDs
  const currentPlayerIds = roster?.players ?? [];

  const currentPlayerSet = new Set(currentPlayerIds);

  // Historical players who started for this franchise
  const historicalPlayerIds = Object.keys(franchiseStats);

  // Players who started here but are no longer on roster
  const formerPlayerIds = historicalPlayerIds.filter(
    id => !currentPlayerSet.has(id)
  );

  const buildPlayer = (id: string) => ({
    id,
    player: data?.players?.[id],
    starter: roster?.starters?.includes(id) ?? false,
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
            {player?.full_name ||
              [
                player?.first_name,
                player?.last_name
              ]
                .filter(Boolean)
                .join(' ') ||
              id}
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

      <State
        loading={loading}
        error={error}
        refresh={refresh}
      />

      {data && !roster && (
        <div className="error">
          Franchise not found in Sleeper.
        </div>
      )}

      {data && roster && (
        <>
          <Hero
            title={teamName(
              roster,
              data.users
            ).toUpperCase()}
            subtitle={`Franchise profile · ${data.league.season} XII-L season`}
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
              <span>Current Players</span>
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
            <h2>Franchise Information</h2>

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
          </section>

          <section className="panel">
            <h2>Current Roster</h2>

            <p className="muted small">
              Fantasy points earned as a starter
              for this franchise only.
              Scroll horizontally to see all weeks.
            </p>

            {renderTable(currentPlayers)}
          </section>

          <section className="panel">
            <h2>Former Players</h2>

            <p className="muted small">
              Players who previously started for
              this franchise but are no longer
              on the current roster.
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
