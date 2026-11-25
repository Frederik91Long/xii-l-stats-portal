'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { CURRENT_SEASON, getAvailableSeasons } from '@/lib/seasons';
import { useLeague } from '@/lib/useLeague';
import type { HistoricalMatchup } from '@/lib/useLeague';
import {
  teamName,
  points
} from '@/lib/sleeper';
import {
  Hero,
  State,
  Refresh
} from '../components';

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
  const [season, setSeason] = useState(CURRENT_SEASON);
  const availableSeasons = getAvailableSeasons();
  const { data: response, loading, error, refresh } = useLeague(undefined, season);
  const data = response?.season === season ? response : null;

  // Individual player records
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
      <Link href={`/players/${player.id}?season=${season}`}>
        {player.name}
      </Link>
    );
  }

  // Franchise records
  const franchiseName = (rosterId: number) => {
    const roster = data?.rosters.find(
      r => r.roster_id === rosterId
    );

    return roster && data
      ? teamName(roster, data.users)
      : `Roster ${rosterId}`;
  };

  function franchiseLink(rosterId?: number) {
    if (rosterId === undefined) return '—';

    return (
      <Link href={`/franchises/${rosterId}?season=${season}`}>
        {franchiseName(rosterId)}
      </Link>
    );
  }

  // Exclude the current, potentially unfinished week
  const completedWeekLimit = data
    ? (data.league.status === 'complete' ? 18 : Math.max(0, data.currentWeek - 1))
    : 0;

  const historical: HistoricalMatchup[] =
    (data?.historicalMatchups ?? [])
      .filter(row =>
        row.week <= completedWeekLimit &&
        Number.isFinite(row.points) &&
        row.matchupId !== null
      );

  const highestScore = [...historical].sort(
    (a, b) =>
      b.points - a.points ||
      a.week - b.week ||
      a.rosterId - b.rosterId
  )[0];

  const lowestScore = [...historical].sort(
    (a, b) =>
      a.points - b.points ||
      a.week - b.week ||
      a.rosterId - b.rosterId
  )[0];

  // Compare opponents within the same matchup and week
  const victories: {
    winner: HistoricalMatchup;
    loser: HistoricalMatchup;
    margin: number;
  }[] = [];

  const matchupGroups = new Map<
    string,
    HistoricalMatchup[]
  >();

  historical.forEach(row => {
    const key = `${row.week}-${row.matchupId}`;
    const group = matchupGroups.get(key) ?? [];
    group.push(row);
    matchupGroups.set(key, group);
  });

  matchupGroups.forEach(group => {
    if (group.length !== 2) return;

    const [first, second] = group;

    if (first.points === second.points) return;

    const winner =
      first.points > second.points ? first : second;

    const loser =
      first.points > second.points ? second : first;

    victories.push({
      winner,
      loser,
      margin: winner.points - loser.points
    });
  });

  const biggestVictory = victories.sort(
    (a, b) =>
      b.margin - a.margin ||
      a.winner.week - b.winner.week
  )[0];

  // Season standings records
  const franchiseSeasonStats = data?.rosters.map(
    roster => {
      const settings = roster.settings ?? {};

      const wins = settings.wins ?? 0;
      const losses = settings.losses ?? 0;
      const ties = settings.ties ?? 0;

      const games = wins + losses + ties;

      return {
        rosterId: roster.roster_id,
        pointsFor: points(settings, 'fpts'),
        pointsAgainst: points(settings, 'fpts_against'),
        winPercentage:
          games > 0
            ? (wins + ties * 0.5) / games
            : 0,
        games
      };
    }
  ) ?? [];

  const mostPointsFor = [...franchiseSeasonStats]
    .sort((a, b) => b.pointsFor - a.pointsFor)[0];

  const mostPointsAgainst = [...franchiseSeasonStats]
    .sort(
      (a, b) => b.pointsAgainst - a.pointsAgainst
    )[0];

  const bestWinPercentage = [...franchiseSeasonStats]
    .filter(team => team.games > 0)
    .sort(
      (a, b) =>
        b.winPercentage - a.winPercentage ||
        b.pointsFor - a.pointsFor
    )[0];

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

      <section className="panel">
        <h2>Season Records</h2>
        <label htmlFor="records-season">Select Season </label>
        <select
          id="records-season"
          value={season}
          onChange={event => setSeason(event.target.value)}
        >
          {availableSeasons.map(item => (
            <option key={item.year} value={item.year}>
              {item.year} — {item.name}
            </option>
          ))}
        </select>
      </section>

      {data && (
        <>
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
                    <td>{startsLeader?.starts ?? '—'}</td>
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
            <h2>Franchise Records — {season}</h2>

            <p className="muted small">
              Weekly franchise records exclude the current
              potentially unfinished week unless the league is complete.
            </p>

            <div className="tableScroll">
              <table>
                <thead>
                  <tr>
                    <th>Record</th>
                    <th>Franchise</th>
                    <th>Value</th>
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td>Highest Team Score</td>
                    <td>
                      {franchiseLink(
                        highestScore?.rosterId
                      )}
                    </td>
                    <td>
                      {highestScore
                        ? `${highestScore.points.toFixed(2)} (W${highestScore.week})`
                        : '—'}
                    </td>
                  </tr>

                  <tr>
                    <td>Lowest Team Score</td>
                    <td>
                      {franchiseLink(
                        lowestScore?.rosterId
                      )}
                    </td>
                    <td>
                      {lowestScore
                        ? `${lowestScore.points.toFixed(2)} (W${lowestScore.week})`
                        : '—'}
                    </td>
                  </tr>

                  <tr>
                    <td>Biggest Victory</td>
                    <td>
                      {franchiseLink(
                        biggestVictory?.winner.rosterId
                      )}
                    </td>
                    <td>
                      {biggestVictory
                        ? `${biggestVictory.margin.toFixed(2)} (W${biggestVictory.winner.week})`
                        : '—'}
                    </td>
                  </tr>

                  <tr>
                    <td>Most Points For</td>
                    <td>
                      {franchiseLink(
                        mostPointsFor?.rosterId
                      )}
                    </td>
                    <td>
                      {mostPointsFor
                        ? mostPointsFor.pointsFor.toFixed(2)
                        : '—'}
                    </td>
                  </tr>

                  <tr>
                    <td>Most Points Against</td>
                    <td>
                      {franchiseLink(
                        mostPointsAgainst?.rosterId
                      )}
                    </td>
                    <td>
                      {mostPointsAgainst
                        ? mostPointsAgainst.pointsAgainst.toFixed(2)
                        : '—'}
                    </td>
                  </tr>

                  <tr>
                    <td>Best Win Percentage</td>
                    <td>
                      {franchiseLink(
                        bestWinPercentage?.rosterId
                      )}
                    </td>
                    <td>
                      {bestWinPercentage
                        ? `${(bestWinPercentage.winPercentage * 100).toFixed(1)}%`
                        : '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>


        </>
      )}
      <AllTimeRecords />
    </main>
  );
}

type CareerPlayer = {
  id: string;
  name: string;
  position: string;
  total: number;
  starts: number;
  average: number;
  seasonsPlayed: number;
  seasons: Record<string, unknown>;
  bestGame: { season: string; week: number; points: number } | null;
};

type SingleSeason = {
  playerId: string;
  name: string;
  season: string;
  total: number;
  starts: number;
};

type AllTimeData = {
  importedSeasons: string[];
  minimumCareerStarts: number;
  records: {
    careerScoringLeader: CareerPlayer | null;
    mostCareerStarts: CareerPlayer | null;
    bestCareerAverage: CareerPlayer | null;
    highestSingleGame: CareerPlayer | null;
    highestSingleSeason: SingleSeason | null;
    mostStartsInSeason: SingleSeason | null;
    positionLeaders: { position: string; player: CareerPlayer | null }[];
  };
  leaderboard: CareerPlayer[];
};

function AllTimeRecords() {
  const [data, setData] = useState<AllTimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [position, setPosition] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'total' | 'starts' | 'average' | 'seasonsPlayed'>('total');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch('/api/all-time', { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'All-time import failed');
        if (!result.records || !Array.isArray(result.leaderboard)) {
          throw new Error('Invalid all-time API response');
        }
        if (!controller.signal.aborted) setData(result);
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          setError(error instanceof Error ? error.message : 'Unknown error');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);

  function careerLink(player: CareerPlayer | null, year?: string) {
    if (!player) return '—';
    const season = year ?? Object.keys(player.seasons).sort((a, b) => Number(b) - Number(a))[0] ?? CURRENT_SEASON;
    return <Link href={`/players/${player.id}?season=${season}`}>{player.name}</Link>;
  }

  function seasonLink(player: SingleSeason | null) {
    return player ? <Link href={`/players/${player.playerId}?season=${player.season}`}>{player.name}</Link> : '—';
  }

  const r = data?.records;
  const leaderboard = (data?.leaderboard ?? [])
    .filter(player => position === 'ALL' || player.position === position)
    .filter(player => player.name.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => b[sort] - a[sort] || b.total - a.total || a.name.localeCompare(b.name));

  return (
    <>
      <section className="panel">
        <h2>All-Time XII-L Player Records</h2>
        <State loading={loading} error={error} refresh={() => setAttempt(value => value + 1)} />
        {data && r && (
          <>
            <p className="muted small">Imported seasons: {data.importedSeasons.join(', ')}. Starter points only. Current week scores may be provisional.</p>
            <button className="button" disabled={loading} onClick={() => setAttempt(value => value + 1)}>Refresh All-Time Records</button>
            <div className="tableScroll">
              <table>
                <thead><tr><th>Record</th><th>Player</th><th>Value</th></tr></thead>
                <tbody>
                  <tr><td>Career Scoring Leader</td><td>{careerLink(r.careerScoringLeader)}</td><td>{r.careerScoringLeader?.total.toFixed(2) ?? '—'}</td></tr>
                  <tr><td>Most Career Starts</td><td>{careerLink(r.mostCareerStarts)}</td><td>{r.mostCareerStarts?.starts ?? '—'}</td></tr>
                  <tr><td>Best Career Average (min. {data.minimumCareerStarts} starts)</td><td>{careerLink(r.bestCareerAverage)}</td><td>{r.bestCareerAverage?.average.toFixed(2) ?? '—'}</td></tr>
                  <tr><td>Highest Single Game Score</td><td>{careerLink(r.highestSingleGame, r.highestSingleGame?.bestGame?.season)}</td><td>{r.highestSingleGame?.bestGame ? `${r.highestSingleGame.bestGame.points.toFixed(2)} (W${r.highestSingleGame.bestGame.week}, ${r.highestSingleGame.bestGame.season})` : '—'}</td></tr>
                  <tr><td>Highest Single Season Score</td><td>{seasonLink(r.highestSingleSeason)}</td><td>{r.highestSingleSeason ? `${r.highestSingleSeason.total.toFixed(2)} (${r.highestSingleSeason.season})` : '—'}</td></tr>
                  <tr><td>Most Starts in a Season</td><td>{seasonLink(r.mostStartsInSeason)}</td><td>{r.mostStartsInSeason ? `${r.mostStartsInSeason.starts} (${r.mostStartsInSeason.season})` : '—'}</td></tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
      {data && r && (
        <>
          <section className="panel">
            <h2>All-Time Position Leaders</h2>
            <div className="tableScroll"><table>
              <thead><tr><th>Position</th><th>Player</th><th>Career PTS</th><th>Starts</th><th>AVG</th></tr></thead>
              <tbody>{r.positionLeaders.map(({position, player}) => <tr key={position}><td>{position}</td><td>{careerLink(player)}</td><td>{player?.total.toFixed(2) ?? '—'}</td><td>{player?.starts ?? '—'}</td><td>{player?.average.toFixed(2) ?? '—'}</td></tr>)}</tbody>
            </table></div>
          </section>
          <section className="panel">
            <h2>All-Time Player Leaderboard</h2>
            <div className="toolbar" style={{flexWrap: 'wrap', gap: 12}}>
              <label>Position <select value={position} onChange={event => setPosition(event.target.value)}>{['ALL','QB','RB','WR','TE'].map(pos => <option key={pos} value={pos}>{pos}</option>)}</select></label>
              <label>Sort by <select value={sort} onChange={event => setSort(event.target.value as typeof sort)}><option value="total">Career PTS</option><option value="starts">Starts</option><option value="average">Average</option><option value="seasonsPlayed">Seasons</option></select></label>
              <label>Search <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Player name" /></label>
            </div>
            <p className="muted small">{leaderboard.length} players. Average sorting includes all starters; the 10-start minimum applies to the career average record only. Career links open the latest season played.</p>
            <div className="tableScroll"><table>
              <thead><tr><th>#</th><th>Player</th><th>POS</th><th>Seasons</th><th>Starts</th><th>Career PTS</th><th>AVG</th></tr></thead>
              <tbody>{leaderboard.map((player, index) => <tr key={player.id}><td>{index + 1}</td><td>{careerLink(player)}</td><td>{player.position}</td><td>{player.seasonsPlayed}</td><td>{player.starts}</td><td>{player.total.toFixed(2)}</td><td>{player.average.toFixed(2)}</td></tr>)}</tbody>
            </table></div>
            {leaderboard.length === 0 && <p className="muted">No matching players.</p>}
          </section>
        </>
      )}
    </>
  );
}
