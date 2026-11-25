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
      <AllTimeFranchiseRecords />
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

type FranchiseTotals = {
  games: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  winPercentage: number;
  averagePoints: number;
};

type FranchiseStreak = {
  length: number;
  startSeason: string;
  startWeek: number;
  endSeason: string;
  endWeek: number;
};

type FranchiseCareerRecord = {
  id: string;
  name: string;
  overall: FranchiseTotals;
  seasons: Record<string, { rosterId: number; overall: FranchiseTotals }>;
  longestWinningStreak: FranchiseStreak | null;
  longestLosingStreak: FranchiseStreak | null;
};

type FranchiseGameRecord = {
  franchiseName: string;
  rosterId: number;
  season: string;
  week: number;
  pointsFor: number;
  margin: number;
  opponentName: string;
};

type FranchiseSeasonRecord = FranchiseTotals & {
  franchiseName: string;
  rosterId: number;
  season: string;
};

type FranchiseStanding = FranchiseTotals & {
  rank: number;
  id: string;
  name: string;
  seasonsPlayed: number;
};

type FranchisePhase = 'overall' | 'regularSeason' | 'postseason';

type AllTimeFranchiseData = {
  importedSeasons: string[];
  completedGames: number;
  franchises: FranchiseCareerRecord[];
  standings: Record<FranchisePhase, FranchiseStanding[]>;
  records: {
    mostWins: FranchiseCareerRecord | null;
    mostLosses: FranchiseCareerRecord | null;
    bestWinPercentage: FranchiseCareerRecord | null;
    mostPointsFor: FranchiseCareerRecord | null;
    mostPointsAgainst: FranchiseCareerRecord | null;
    highestTeamScore: FranchiseGameRecord | null;
    lowestTeamScore: FranchiseGameRecord | null;
    biggestVictory: FranchiseGameRecord | null;
    longestWinningStreak: FranchiseCareerRecord | null;
    longestLosingStreak: FranchiseCareerRecord | null;
    bestScoringSeason: FranchiseSeasonRecord | null;
  };
};

function AllTimeFranchiseRecords() {
  const [data, setData] = useState<AllTimeFranchiseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<FranchisePhase>('overall');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    fetch('/api/all-time-franchises', {
      cache: 'no-store',
      signal: controller.signal
    })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'All-time franchise import failed');
        }
        if (
          !result.records ||
          !Array.isArray(result.franchises) ||
          !Array.isArray(result.importedSeasons) ||
          !Array.isArray(result.standings?.overall) ||
          !Array.isArray(result.standings?.regularSeason) ||
          !Array.isArray(result.standings?.postseason)
        ) {
          throw new Error('Invalid all-time franchise API response');
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

  const refresh = () => setAttempt(value => value + 1);
  const formatPoints = (value?: number) =>
    value === undefined ? '—' : value.toFixed(2);
  const formatPercentage = (value?: number) =>
    value === undefined ? '—' : `${(value * 100).toFixed(1)}%`;

  function historicalLink(name: string, rosterId: number, season: string) {
    return <Link href={`/franchises/${rosterId}?season=${season}`}>{name}</Link>;
  }

  function careerLink(franchise: FranchiseCareerRecord | null) {
    if (!franchise) return '—';
    const years = Object.keys(franchise.seasons).sort((a, b) => Number(b) - Number(a));
    const year = years.find(year => franchise.seasons[year].overall.games > 0) ?? years[0];
    return year
      ? historicalLink(franchise.name, franchise.seasons[year].rosterId, year)
      : franchise.name;
  }

  function gameLink(game: FranchiseGameRecord | null) {
    return game ? historicalLink(game.franchiseName, game.rosterId, game.season) : '—';
  }

  function gameValue(game: FranchiseGameRecord | null, margin = false) {
    return game
      ? `${formatPoints(margin ? game.margin : game.pointsFor)} (W${game.week}, ${game.season} vs ${game.opponentName})`
      : '—';
  }

  function streakValue(streak: FranchiseStreak | null | undefined) {
    return streak
      ? `${streak.length} (W${streak.startWeek}, ${streak.startSeason} – W${streak.endWeek}, ${streak.endSeason})`
      : '—';
  }

  const r = data?.records;
  const standings = data?.standings[phase] ?? [];
  const hasGames = standings.some(team => team.games > 0);

  return (
    <>
      <section className="panel">
        <h2>All-Time Franchise Records</h2>
        <State loading={loading} error={error} refresh={refresh} />
        {data && r && (
          <>
            <p className="muted small">
              Imported seasons: {data.importedSeasons.join(', ')} · {data.completedGames} completed matchups.
              Records include regular season and postseason unless otherwise stated.
              Streaks carry across seasons. Postseason includes consolation games.
            </p>
            {error && <p className="muted small">Showing previously loaded results.</p>}
            <button className="button" disabled={loading} onClick={refresh}>
              Refresh All-Time Franchise Records
            </button>
            <div className="tableScroll">
              <table>
                <thead><tr><th>Record</th><th>Franchise</th><th>Value</th></tr></thead>
                <tbody>
                  <tr><td>Most Wins</td><td>{careerLink(r.mostWins)}</td><td>{r.mostWins?.overall.wins ?? '—'}</td></tr>
                  <tr><td>Most Losses</td><td>{careerLink(r.mostLosses)}</td><td>{r.mostLosses?.overall.losses ?? '—'}</td></tr>
                  <tr><td>Best Win Percentage</td><td>{careerLink(r.bestWinPercentage)}</td><td>{formatPercentage(r.bestWinPercentage?.overall.winPercentage)}</td></tr>
                  <tr><td>Most Points For</td><td>{careerLink(r.mostPointsFor)}</td><td>{formatPoints(r.mostPointsFor?.overall.pointsFor)}</td></tr>
                  <tr><td>Most Points Against</td><td>{careerLink(r.mostPointsAgainst)}</td><td>{formatPoints(r.mostPointsAgainst?.overall.pointsAgainst)}</td></tr>
                  <tr><td>Highest Team Score</td><td>{gameLink(r.highestTeamScore)}</td><td>{gameValue(r.highestTeamScore)}</td></tr>
                  <tr><td>Lowest Team Score</td><td>{gameLink(r.lowestTeamScore)}</td><td>{gameValue(r.lowestTeamScore)}</td></tr>
                  <tr><td>Biggest Victory</td><td>{gameLink(r.biggestVictory)}</td><td>{gameValue(r.biggestVictory, true)}</td></tr>
                  <tr><td>Longest Winning Streak</td><td>{careerLink(r.longestWinningStreak)}</td><td>{streakValue(r.longestWinningStreak?.longestWinningStreak)}</td></tr>
                  <tr><td>Longest Losing Streak</td><td>{careerLink(r.longestLosingStreak)}</td><td>{streakValue(r.longestLosingStreak?.longestLosingStreak)}</td></tr>
                  <tr>
                    <td>Best Scoring Season (Regular Season)</td>
                    <td>{r.bestScoringSeason ? historicalLink(r.bestScoringSeason.franchiseName, r.bestScoringSeason.rosterId, r.bestScoringSeason.season) : '—'}</td>
                    <td>{r.bestScoringSeason ? `${formatPoints(r.bestScoringSeason.pointsFor)} (${r.bestScoringSeason.season})` : '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="muted small">Best Scoring Season includes completed games of the ongoing season. Career links open the latest season played.</p>
          </>
        )}
      </section>

      {data && (
        <section className="panel">
          <h2>All-Time Franchise Standings</h2>
          <div className="toolbar">
            <label htmlFor="franchise-phase">Competition </label>
            <select id="franchise-phase" value={phase} onChange={event => setPhase(event.target.value as FranchisePhase)}>
              <option value="overall">Overall</option>
              <option value="regularSeason">Regular Season</option>
              <option value="postseason">Postseason</option>
            </select>
          </div>
          <p className="muted small">
            {phase === 'overall' ? 'All completed matchups.' : phase === 'regularSeason' ? 'Regular season matchups only.' : 'Postseason matchups, including consolation games.'}
            {' '}Ranked by win percentage, wins and points for.
          </p>
          {!hasGames ? (
            <p className="muted">No completed games available for this competition.</p>
          ) : (
            <div className="tableScroll">
              <table>
                <thead><tr><th>#</th><th>Franchise</th><th>GP</th><th>W</th><th>L</th><th>T</th><th>WIN%</th><th>PF</th><th>PA</th><th>AVG PF</th></tr></thead>
                <tbody>
                  {standings.map(team => (
                    <tr key={team.id}>
                      <td>{team.games > 0 ? team.rank : '—'}</td>
                      <td>{careerLink(data.franchises.find(franchise => franchise.id === team.id) ?? null)}</td>
                      <td>{team.games}</td>
                      <td>{team.wins}</td>
                      <td>{team.losses}</td>
                      <td>{team.ties}</td>
                      <td>{team.games > 0 ? formatPercentage(team.winPercentage) : '—'}</td>
                      <td>{formatPoints(team.pointsFor)}</td>
                      <td>{formatPoints(team.pointsAgainst)}</td>
                      <td>{team.games > 0 ? formatPoints(team.averagePoints) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </>
  );
}
