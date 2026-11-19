'use client';

import Link from 'next/link';
import { useLeague } from '@/lib/useLeague';
import { Hero, State, Refresh } from '../components';

type PlayerRecord = {
  id: string;
  name: string;
  position: string;
  total: number;
  starts: number;
  average: number;
  bestWeek: number;
  bestScore: number;
};

export default function RecordsPage() {
  const { data, loading, error, refresh } = useLeague();

  const season = data?.league.season ?? '2026';

  const records: PlayerRecord[] = data
    ? Object.entries(data.playerStats)
        .map(([id, stats]) => {
          const player = data.players[id];

          const name =
            player?.full_name ||
            [player?.first_name, player?.last_name]
              .filter(Boolean)
              .join(' ') ||
            id;

          const weeklyScores = Object.entries(
            stats.weekly
          ).map(([week, score]) => ({
            week: Number(week),
            score
          }));

          const best = weeklyScores.reduce(
            (highest, current) =>
              current.score > highest.score
                ? current
                : highest,
            { week: 0, score: -Infinity }
          );

          return {
            id,
            name,
            position: player?.position || '—',
            total: stats.total,
            starts: stats.starts,
            average:
              stats.starts > 0
                ? stats.total / stats.starts
                : 0,
            bestWeek: best.week,
            bestScore:
              Number.isFinite(best.score)
                ? best.score
                : 0
          };
        })
        .filter(player => player.starts > 0)
    : [];

  const scoringLeader = [...records].sort(
    (a, b) => b.total - a.total
  )[0];

  const weeklyLeader = [...records].sort(
    (a, b) => b.bestScore - a.bestScore
  )[0];

  const averageLeader = [...records]
    .filter(player => player.starts >= 3)
    .sort((a, b) => b.average - a.average)[0];

  const startsLeader = [...records].sort(
    (a, b) => b.starts - a.starts
  )[0];

  const positionLeaders = ['QB', 'RB', 'WR', 'TE']
    .map(position => ({
      position,
      player: [...records]
        .filter(player => player.position === position)
        .sort((a, b) => b.total - a.total)[0]
    }));

  function playerLink(player?: PlayerRecord) {
    if (!player) return '—';

    return (
      <Link href={`/players/${player.id}`}>
        {player.name}
      </Link>
    );
  }

  return (
    <main className="wrap main">
      <Hero
        title="XII-L RECORDS"
        subtitle="The Road to the Crown · Official league records"
      />

      <State
        loading={loading}
        error={error}
        refresh={refresh}
      />

      {data && (
        <>
          <section className="panel">
            <h2>Season Records</h2>

            <p className="muted small">
              Season: {season}
            </p>

            <p className="muted small">
              Future XII-L seasons will be added
              when their historical Sleeper data
              becomes available.
            </p>
          </section>

          <Refresh
            data={data}
            loading={loading}
            refresh={refresh}
          />

          <section className="panel">
            <h2>Individual Records — {season}</h2>

            <div className="tableScroll">
              <table>
                <thead>
                  <tr>
                    <th>Record</th>
                    <th>Player</th>
                    <th>Value</th>
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td>Season Scoring Leader</td>
                    <td>{playerLink(scoringLeader)}</td>
                    <td>
                      {scoringLeader
                        ? scoringLeader.total.toFixed(2)
                        : '—'}
                    </td>
                  </tr>

                  <tr>
                    <td>Highest Weekly Score</td>
                    <td>{playerLink(weeklyLeader)}</td>
                    <td>
                      {weeklyLeader
                        ? `${weeklyLeader.bestScore.toFixed(2)} (W${weeklyLeader.bestWeek})`
                        : '—'}
                    </td>
                  </tr>

                  <tr>
                    <td>Best Average (min. 3 starts)</td>
                    <td>{playerLink(averageLeader)}</td>
                    <td>
                      {averageLeader
                        ? averageLeader.average.toFixed(2)
                        : '—'}
                    </td>
                  </tr>

                  <tr>
                    <td>Most Starts</td>
                    <td>{playerLink(startsLeader)}</td>
                    <td>
                      {startsLeader?.starts ?? '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <h2>Position Leaders — {season}</h2>

            <div className="tableScroll">
              <table>
                <thead>
                  <tr>
                    <th>Position</th>
                    <th>Player</th>
                    <th>Total PTS</th>
                    <th>Starts</th>
                    <th>AVG PTS</th>
                  </tr>
                </thead>

                <tbody>
                  {positionLeaders.map(
                    ({ position, player }) => (
                      <tr key={position}>
                        <td>{position}</td>
                        <td>{playerLink(player)}</td>
                        <td>
                          {player
                            ? player.total.toFixed(2)
                            : '—'}
                        </td>
                        <td>{player?.starts ?? '—'}</td>
                        <td>
                          {player
                            ? player.average.toFixed(2)
                            : '—'}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <h2>All-Time XII-L Records</h2>

            <p className="muted">
              All-time records will become available
              when multiple XII-L seasons have been
              imported and stored.
            </p>
          </section>
        </>
      )}
    </main>
  );
}
