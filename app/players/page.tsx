'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLeague } from '@/lib/useLeague';
import { Hero, State, Refresh } from '../components';

type PositionFilter = 'ALL' | 'QB' | 'RB' | 'WR' | 'TE';
type SortField = 'total' | 'starts' | 'average';

export default function PlayersLeaderboard() {
  const { data, loading, error, refresh } = useLeague();

  const [position, setPosition] =
    useState<PositionFilter>('ALL');

  const [sortBy, setSortBy] =
    useState<SortField>('total');

  const players = data
    ? Object.entries(data.playerStats)
        .map(([id, stats]) => {
          const player = data.players[id];

          const name =
            player?.full_name ||
            [player?.first_name, player?.last_name]
              .filter(Boolean)
              .join(' ') ||
            id;

          const average =
            stats.starts > 0
              ? stats.total / stats.starts
              : 0;

          return {
            id,
            name,
            position: player?.position || '—',
            total: stats.total,
            starts: stats.starts,
            average
          };
        })
        .filter(player =>
          position === 'ALL'
            ? true
            : player.position === position
        )
        .sort((a, b) => {
          const difference = b[sortBy] - a[sortBy];

          return difference !== 0
            ? difference
            : b.total - a.total;
        })
    : [];

  return (
    <main className="wrap main">
      <Hero
        title="XII-L PLAYERS"
        subtitle="Official player fantasy leaderboard"
      />

      <State
        loading={loading}
        error={error}
        refresh={refresh}
      />

      {data && (
        <>
          <section className="kpis">
            <div className="kpi">
              <strong>{players.length}</strong>
              <span>Players</span>
            </div>

            <div className="kpi">
              <strong>
                {players.length > 0
                  ? players[0].name
                  : '—'}
              </strong>
              <span>Leaderboard Leader</span>
            </div>

            <div className="kpi">
              <strong>
                {players.length > 0
                  ? players[0][sortBy].toFixed(2)
                  : '0.00'}
              </strong>
              <span>Leading Value</span>
            </div>
          </section>

          <Refresh
            data={data}
            loading={loading}
            refresh={refresh}
          />

          <section className="panel">
            <h2>Player Rankings</h2>

            <p className="muted small">
              Only fantasy points earned as a
              starter count towards XII-L rankings.
            </p>

            <div
              style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                marginBottom: '20px'
              }}
            >
              <label>
                Position{' '}
                <select
                  value={position}
                  onChange={event =>
                    setPosition(
                      event.target.value as PositionFilter
                    )
                  }
                >
                  <option value="ALL">
                    All Positions
                  </option>
                  <option value="QB">QB</option>
                  <option value="RB">RB</option>
                  <option value="WR">WR</option>
                  <option value="TE">TE</option>
                </select>
              </label>

              <label>
                Sort by{' '}
                <select
                  value={sortBy}
                  onChange={event =>
                    setSortBy(
                      event.target.value as SortField
                    )
                  }
                >
                  <option value="total">
                    Total Fantasy PTS
                  </option>
                  <option value="average">
                    Average PTS / Start
                  </option>
                  <option value="starts">
                    Total Starts
                  </option>
                </select>
              </label>
            </div>

            <div className="tableScroll">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>POS</th>
                    <th>Total PTS</th>
                    <th>Starts</th>
                    <th>AVG PTS</th>
                  </tr>
                </thead>

                <tbody>
                  {players.map((player, index) => (
                    <tr key={player.id}>
                      <td>{index + 1}</td>

                      <td>
                        <Link
                          href={`/players/${player.id}`}
                        >
                          {player.name}
                        </Link>
                      </td>

                      <td>{player.position}</td>

                      <td>
                        {player.total.toFixed(2)}
                      </td>

                      <td>{player.starts}</td>

                      <td>
                        {player.average.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {players.length === 0 && (
              <p className="muted">
                No players found for this position.
              </p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
