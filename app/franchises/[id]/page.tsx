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

  const rosterPlayers = (roster?.players ?? [])
    .map(id => ({
      id,
      player: data?.players?.[id],
      starter: roster?.starters?.includes(id) ?? false
    }))
    .sort((a, b) => Number(b.starter) - Number(a.starter));

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
            title={teamName(roster, data.users).toUpperCase()}
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
                {fmt(points(roster.settings, 'fpts'))}
              </strong>
              <span>Points For</span>
            </div>

            <div className="kpi">
              <strong>
                {fmt(points(roster.settings, 'fpts_against'))}
              </strong>
              <span>Points Against</span>
            </div>

            <div className="kpi">
              <strong>{rosterPlayers.length}</strong>
              <span>Roster players</span>
            </div>
          </section>

          <Refresh
            data={data}
            loading={loading}
            refresh={refresh}
          />

          <div className="grid2">
            <section className="panel">
              <h2>Franchise Information</h2>

              <p>
                <span className="muted">
                  General manager:{' '}
                </span>
                {owner?.display_name || 'Not available'}
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

              <div className="tableScroll">
                <table>
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Position</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rosterPlayers.map(
                      ({ id, player, starter }) => (
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

                          <td>
                            {player?.position || '—'}
                          </td>

                          <td>
                            {starter
                              ? 'Starter'
                              : 'Bench / reserve'}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}
    </main>
  );
}
