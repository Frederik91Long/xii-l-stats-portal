'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  CURRENT_SEASON,
  getAvailableSeasons
} from '@/lib/seasons';

import { Hero, fmt } from '@/app/components';

type Scenario = {
  status: string;
  bestPossibleSeed: number | null;
  worstPossibleSeed: number | null;
};

type PlayoffTeam = {
  franchiseId: string;
  rosterId: number;
  name: string;
  seed: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  remainingGames: number;
  currentlyInPlayoffs: boolean;
  currentlyHasBye: boolean;
  scenario: Scenario | null;
  remainingSchedule: {
    week: number;
    opponentId: string;
    opponentName: string;
    opponentRosterId: number;
  }[];
};

type WildCardMatchup = {
  week: number;
  homeSeed: number;
  awaySeed: number;
  homeTeam: PlayoffTeam | null;
  awayTeam: PlayoffTeam | null;
};

type BracketGame = {
  id: string;
  week: number;
  homeSeed: number | null;
  awaySeed: number | null;
  homeTeam: PlayoffTeam | null;
  awayTeam: PlayoffTeam | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  winner: PlayoffTeam | null;
  loser: PlayoffTeam | null;
};

type PlayoffBracket = {
  wildCard: BracketGame[];
  semiFinals: BracketGame[];
  championship: BracketGame;
  champion: PlayoffTeam | null;
  runnerUp: PlayoffTeam | null;
  warnings: string[];
};

type PlayoffData = {
  season: string;
  seasonName: string;
  currentWeek: number;
  completedRegularWeeks: number;
  remainingWeeks: number;
  regularSeasonComplete: boolean;
  seedingFinal: boolean;
  scheduleComplete: boolean;
  scenarioCalculation?: string;
  config: {
    playoffTeams: number;
    byeTeams: number;
    regularSeasonEnd: number;
    wildCardWeek: number;
    semiFinalWeek: number;
    championshipWeek: number;
    reseeding: boolean;
  };
  standings: PlayoffTeam[];
  projectedWildCardMatchups: WildCardMatchup[];
  bracket?: PlayoffBracket;
  fetchedAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  clinchedTopSeed: 'Clinched #1 Seed',
  clinchedBye: 'Clinched First-Round Bye',
  clinchedPlayoffs: 'Clinched Playoffs',
  inTheHunt: 'In the Hunt',
  eliminated: 'Eliminated',
  unknown: 'Not Available'
};

const STATUS_COLORS: Record<string, string> = {
  clinchedTopSeed: '#d4af37',
  clinchedBye: '#22c55e',
  clinchedPlayoffs: '#22c55e',
  inTheHunt: '#eab308',
  eliminated: '#ef4444',
  unknown: '#94a3b8'
};

function StatusBadge({
  status
}: {
  status: string;
}) {
  const color =
    STATUS_COLORS[status] ??
    STATUS_COLORS.unknown;

  return (
    <span
      style={{
        display: 'inline-block',
        color,
        border: `1px solid ${color}55`,
        background: `${color}12`,
        padding: '5px 9px',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: 'nowrap'
      }}
    >
      {STATUS_LABELS[status] ??
        STATUS_LABELS.unknown}
    </span>
  );
}

function SeedRange({
  best,
  worst,
  total
}: {
  best: number | null;
  worst: number | null;
  total: number;
}) {
  if (best === null || worst === null) {
    return <span className="muted">—</span>;
  }

  return (
    <div style={{ minWidth: 110 }}>
      <div
        style={{
          fontWeight: 700,
          marginBottom: 5
        }}
      >
        #{best}
        {best !== worst && ` – #${worst}`}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 3
        }}
      >
        {Array.from(
          { length: total },
          (_, index) => {
            const seed = index + 1;

            const possible =
              seed >= best &&
              seed <= worst;

            return (
              <div
                key={seed}
                title={`Seed ${seed}`}
                style={{
                  flex: 1,
                  height: 7,
                  borderRadius: 2,
                  background: possible
                    ? '#d4af37'
                    : 'rgba(128,128,128,0.18)'
                }}
              />
            );
          }
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="panel" style={{
      border: '1px solid rgba(128,128,128,0.25)',
      borderRadius: 12,
      padding: 20
    }}>
      <div className="muted small">
        {label}
      </div>

      <div style={{
        fontSize: 32,
        fontWeight: 800,
        margin: '8px 0'
      }}>
        {value}
      </div>

      <div className="muted small">
        {detail}
      </div>
    </div>
  );
}

const GAME_STATUS: Record<string, string> = {
  projected: 'Projected', pending: 'Awaiting results',
  scheduled: 'Scheduled', inProgress: 'In Progress',
  completed: 'Final', unresolved: 'Result requires verification',
  missingMatchup: 'Matchup not available'
};

function BracketCard({ game, season, label }: {
  game: BracketGame; season: string; label: string;
}) {
  const entries = [
    { team: game.homeTeam, seed: game.homeSeed, score: game.homeScore },
    { team: game.awayTeam, seed: game.awaySeed, score: game.awayScore }
  ];
  return (
    <article style={{ border: '1px solid rgba(128,128,128,0.3)', borderRadius: 12, padding: 16 }}>
      <div className="muted small">{label} · Week {game.week}</div>
      {entries.map((entry, index) => {
        const won = game.status === 'completed' && entry.team != null &&
          game.winner?.rosterId === entry.team.rosterId;
        return (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 10,
            padding: '14px 0', borderBottom: '1px solid rgba(128,128,128,0.2)',
            color: won ? '#d4af37' : undefined }}>
            <span className="muted small">{entry.seed == null ? '—' : `#${entry.seed}`}</span>
            <div style={{ flex: 1, fontWeight: won ? 800 : 600 }}>
              {entry.team ? <Link href={`/franchises/${entry.team.rosterId}?season=${season}`}>
                {entry.team.name}</Link> : 'TBD'}
              {won && <div className="small" style={{ color: '#d4af37' }}>Winner</div>}
            </div>
            <strong>{entry.score == null ? '—' : fmt(entry.score)}</strong>
          </div>
        );
      })}
      <p className="small" style={{ marginBottom: 0,
        color: game.status === 'inProgress' ? '#22c55e' : undefined }}>
        {GAME_STATUS[game.status] ?? 'Status unavailable'}
      </p>
    </article>
  );
}

function RoadToTheCrown({ data }: { data: PlayoffData }) {
  const bracket = data.bracket;
  const roundGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 };
  return (
    <section id="road-to-the-crown" style={{ marginTop: 36 }}>
      <div style={{ color: '#d4af37', fontWeight: 700, letterSpacing: 2, fontSize: 12 }}>XII-L CHAMPIONSHIP</div>
      <h2>Road to the Crown</h2>
      <p className="muted small">{data.seedingFinal ? 'Final regular-season seeds' : 'Projected bracket — if the season ended today'}</p>
      {!bracket ? <p className="muted">Playoff bracket data is unavailable.</p> : <>
        <h3>Wild Card Round · Week {data.config.wildCardWeek}</h3>
        <div style={roundGrid}>
          {bracket.wildCard.map((game, index) => <BracketCard key={game.id} game={game} season={data.season} label={`Wild Card ${index + 1}`} />)}
        </div>
        <div style={{ textAlign: 'center', padding: 20, color: '#d4af37' }}>
          <strong>↓ Automatic Reseeding ↓</strong>
          <p className="muted small">Seed 1 faces the lowest remaining seed. Seed 2 faces the other Wild Card winner.</p>
        </div>
        <h3>Semi-finals · Week {data.config.semiFinalWeek}</h3>
        <div style={roundGrid}>
          {bracket.semiFinals.map((game, index) => <BracketCard key={game.id} game={game} season={data.season} label={`Semi-final ${index + 1}`} />)}
        </div>
        <div style={{ textAlign: 'center', padding: 16, color: '#d4af37' }}>↓</div>
        <h3>XII-L Championship · Week {data.config.championshipWeek}</h3>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <BracketCard game={bracket.championship} season={data.season} label="Championship" />
        </div>
        <div style={{ marginTop: 24, padding: 28, textAlign: 'center', border: '1px solid #d4af3766', borderRadius: 12 }}>
          <div style={{ fontSize: 36 }}>🏆</div>
          <h2 style={{ color: '#d4af37' }}>{data.season} XII-L Champion</h2>
          {bracket.champion ? <>
            <h3><Link href={`/franchises/${bracket.champion.rosterId}?season=${data.season}`}>{bracket.champion.name}</Link></h3>
            {bracket.runnerUp && <p className="muted">Runner-up: {bracket.runnerUp.name}</p>}
          </> : <p className="muted">The Crown awaits.</p>}
        </div>
        {bracket.warnings?.length > 0 && <div className="error" style={{ marginTop: 16 }}>
          <strong>Bracket verification required</strong>
          <ul>{bracket.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
        </div>}
      </>}
    </section>
  );
}

type HistoryFinalist = {
  franchiseId: string;
  rosterId: number;
  name: string;
  seed: number;
};

type HistoryEntry = {
  season: string;
  seasonName: string;
  week: number | null;
  status: 'completed' | 'pending' | 'unresolved' | 'unavailable';
  champion: HistoryFinalist | null;
  runnerUp: HistoryFinalist | null;
  championScore: number | null;
  runnerUpScore: number | null;
  margin: number | null;
  finalists: HistoryFinalist[];
  warnings: string[];
};

type ChampionshipHistoryData = {
  summary: {
    championshipsAwarded: number;
    uniqueChampions: number;
    finalsPlayed: number;
    unresolvedSeasons: number;
  };
  latestChampion: HistoryEntry | null;
  history: HistoryEntry[];
  leaderboard: {
    franchiseId: string;
    name: string;
    championships: number;
    finals: number;
    finalsLost: number;
    championshipWinPercentage: number | null;
    championshipSeasons: string[];
    runnerUpSeasons: string[];
  }[];
};

function ChampionshipHistory({ onSelectSeason, refreshKey }: {
  onSelectSeason: (season: string) => void;
  refreshKey: number;
}) {
  const [history, setHistory] = useState<ChampionshipHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setHistory(null);
    async function load() {
      try {
        const response = await fetch('/api/championships', {
          cache: 'no-store', signal: controller.signal
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || 'Championship import failed');
        if (!json.summary || !Array.isArray(json.history) || !Array.isArray(json.leaderboard)) {
          throw new Error('Invalid championship history response');
        }
        if (!controller.signal.aborted) setHistory(json);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [refreshKey, retry]);

  const latest = history?.latestChampion;
  const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 };
  return (
    <section style={{ marginTop: 48 }}>
      <div style={{ color: '#d4af37', fontWeight: 700, letterSpacing: 2, fontSize: 12 }}>XII-L LEGACY</div>
      <h2>Championship History</h2>
      <p className="muted">Legends are crowned. History is written.</p>
      {loading && <div className="loading">Loading championship history...</div>}
      {error && <div className="error"><p>{error}</p><button className="button" onClick={() => setRetry(v => v + 1)}>Retry</button></div>}
      {!loading && history && <>
        {history.summary.unresolvedSeasons > 0 && <p className="error">Some historical results require verification. Totals include confirmed results only.</p>}
        <div style={grid}>
          <SummaryCard label="Championships" value={history.summary.championshipsAwarded} detail="Confirmed titles" />
          <SummaryCard label="Unique Champions" value={history.summary.uniqueChampions} detail="Title-winning franchises" />
          <SummaryCard label="Finals Played" value={history.summary.finalsPlayed} detail="Confirmed finals" />
        </div>
        <div style={{ margin: '24px 0', padding: 28, textAlign: 'center', border: '1px solid #d4af3766', borderRadius: 12 }}>
          <div style={{ fontSize: 36 }}>🏆</div>
          <h2 style={{ color: '#d4af37' }}>{latest?.champion ? 'Latest Confirmed Champion' : 'The Crown Awaits'}</h2>
          {latest?.champion ? <>
            <h3><Link href={`/franchises/${latest.champion.rosterId}?season=${latest.season}`}>{latest.champion.name}</Link></h3>
            <p>{latest.season} · Seed #{latest.champion.seed}</p>
          </> : <p className="muted">No confirmed champion in the archive yet.</p>}
        </div>
        <h3>Championship Finals</h3>
        <div style={grid}>
          {history.history.map(entry => <article key={entry.season} style={{ border: '1px solid rgba(128,128,128,0.3)', borderRadius: 12, padding: 20 }}>
            <div className="muted small">{entry.season} · {entry.seasonName}</div>
            <p className="muted small">{entry.week === null ? 'Week unavailable' : `Week ${entry.week}`}</p>
            {entry.status === 'completed' && entry.champion && entry.runnerUp ? <>
              <h3 style={{ color: '#d4af37' }}>🏆 <Link href={`/franchises/${entry.champion.rosterId}?season=${entry.season}`}>{entry.champion.name}</Link></h3>
              <p>Seed #{entry.champion.seed} · {entry.championScore === null ? '—' : fmt(entry.championScore)}</p>
              <strong><Link href={`/franchises/${entry.runnerUp.rosterId}?season=${entry.season}`}>{entry.runnerUp.name}</Link></strong>
              <p>Seed #{entry.runnerUp.seed} · {entry.runnerUpScore === null ? '—' : fmt(entry.runnerUpScore)}</p>
              <p className="muted small">Victory margin: {entry.margin === null ? '—' : fmt(entry.margin)}</p>
            </> : <>
              <h3>{entry.status === 'pending' ? 'Championship Pending' : 'Result Requires Verification'}</h3>
              <p>{entry.finalists.length ? entry.finalists.map(team => team.name).join(' vs ') : 'Finalists to be determined'}</p>
            </>}
            {entry.warnings.length > 0 && <details><summary>Verification notes</summary><ul>{entry.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></details>}
            <button className="button" onClick={() => {
              onSelectSeason(entry.season);
              document.getElementById('road-to-the-crown')?.scrollIntoView({ behavior: 'smooth' });
            }}>View {entry.season} Bracket</button>
          </article>)}
        </div>
        <h3 style={{ marginTop: 32 }}>All-Time Championship Leaderboard</h3>
        <div className="tableScroll"><table>
          <thead><tr><th>Franchise</th><th>Titles</th><th>Finals</th><th>Finals Lost</th><th>Win %</th><th>Championship Seasons</th><th>Runner-up Seasons</th></tr></thead>
          <tbody>{history.leaderboard.map(team => <tr key={team.franchiseId}>
            <td><strong>{team.name}</strong></td>
            <td style={{ color: team.championships > 0 ? '#d4af37' : undefined }}>{team.championships}</td>
            <td>{team.finals}</td><td>{team.finalsLost}</td>
            <td>{team.championshipWinPercentage === null ? '—' : `${(team.championshipWinPercentage * 100).toFixed(1)}%`}</td>
            <td>{team.championshipSeasons.join(', ') || '—'}</td>
            <td>{team.runnerUpSeasons.join(', ') || '—'}</td>
          </tr>)}</tbody>
        </table></div>
      </>}
    </section>
  );
}

type CareerPlayoffTeam = {
  franchiseId: string; name: string; appearances: number; byes: number;
  championships: number; finals: number; games: number; wins: number; losses: number;
  winPercentage: number | null; pointsFor: number; pointsAgainst: number;
  averagePoints: number | null; longestWinningStreak: number; longestLosingStreak: number;
};
type CareerPlayoffGame = {
  season: string; week: number; round: string; winner: HistoryFinalist;
  loser: HistoryFinalist; winnerScore: number; loserScore: number; margin: number;
};
type CareerRecordHolder = { name?: string; franchise?: HistoryFinalist; opponent?: HistoryFinalist; winner?: HistoryFinalist; loser?: HistoryFinalist; season?: string; week?: number; round?: string };
type CareerPlayoffData = {
  summary: { totalPlayoffGames: number; totalPlayoffPoints: number; uniquePlayoffFranchises: number; totalFirstRoundByes: number; historyComplete: boolean };
  standings: CareerPlayoffTeam[];
  records: Record<string, { value: number; holders: CareerRecordHolder[] } | null>;
  games: CareerPlayoffGame[];
  seasonHistory: { season: string; status: string; completedGames: number }[];
  warnings: string[]; fetchedAt: string;
};
const CAREER_RECORDS = [
  ['mostPlayoffAppearances', 'Most Playoff Appearances', 'count'],
  ['mostPlayoffWins', 'Most Playoff Wins', 'count'],
  ['mostPlayoffLosses', 'Most Playoff Losses', 'count'],
  ['bestPlayoffWinPercentage', 'Best Playoff Win Percentage', 'percent'],
  ['mostFirstRoundByes', 'Most First-Round Byes', 'count'],
  ['mostPlayoffPoints', 'Most Playoff Points', 'points'],
  ['mostChampionships', 'Most Championships', 'count'],
  ['longestWinningStreak', 'Longest Playoff Winning Streak', 'count'],
  ['longestLosingStreak', 'Longest Playoff Losing Streak', 'count'],
  ['highestPlayoffScore', 'Highest Playoff Score', 'points'],
  ['lowestPlayoffScore', 'Lowest Playoff Score', 'points'],
  ['biggestPlayoffVictory', 'Biggest Playoff Victory', 'points'],
  ['closestPlayoffVictory', 'Closest Playoff Victory', 'points']
] as const;

function AllTimePlayoffRecords({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<CareerPlayoffData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [filter, setFilter] = useState('all');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setData(null);
    async function load() {
      try {
        const response = await fetch('/api/all-time-playoffs', { cache: 'no-store', signal: controller.signal });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || 'Playoff records import failed');
        if (!json.summary || !json.records || !Array.isArray(json.standings) || !Array.isArray(json.games) || !Array.isArray(json.seasonHistory) || !Array.isArray(json.warnings)) throw new Error('Invalid playoff records response');
        if (!controller.signal.aborted) setData(json);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [refreshKey, retry]);
  const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 };
  const visibleGames = data?.games.filter(game => filter === 'all' || game.season === filter) ?? [];
  const percent = (value: number | null) => value === null ? '—' : `${(value * 100).toFixed(1)}%`;
  const teamLink = (team: HistoryFinalist, season: string) => <Link href={`/franchises/${team.rosterId}?season=${encodeURIComponent(season)}`}>{team.name}</Link>;
  return <section id="all-time-playoff-records" style={{ marginTop: 48 }}>
    <div style={{ color: '#d4af37', fontWeight: 700, letterSpacing: 2, fontSize: 12 }}>XII-L LEGACY</div>
    <h2>All-Time Playoff Records</h2>
    <p className="muted">Every game. Every victory. Every legacy.</p>
    <p className="muted small">Championship bracket only. Byes are not wins. All seasons combined.</p>
    {loading && <div className="loading">Loading playoff records...</div>}
    {error && <div className="error"><p>{error}</p><button className="button" onClick={() => setRetry(v => v + 1)}>Retry</button></div>}
    {!loading && data && <>
      {!data.summary.historyComplete && <div className="error"><strong>Historical data may be incomplete</strong><ul>{data.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul></div>}
      <div style={grid}>
        <SummaryCard label="Playoff Games" value={data.summary.totalPlayoffGames} detail="Completed games" />
        <SummaryCard label="Playoff Points" value={fmt(data.summary.totalPlayoffPoints)} detail="Combined team scores" />
        <SummaryCard label="Playoff Franchises" value={data.summary.uniquePlayoffFranchises} detail="Confirmed qualifiers" />
        <SummaryCard label="First-Round Byes" value={data.summary.totalFirstRoundByes} detail="Confirmed byes" />
      </div>
      <h3 style={{ marginTop: 32 }}>Playoff Record Book</h3>
      <div style={grid}>{CAREER_RECORDS.map(([key, label, format]) => {
        const record = data.records[key];
        return <article key={key} style={{ border: '1px solid #d4af3766', borderRadius: 12, padding: 18 }}>
          <div className="muted small">{label}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#d4af37', margin: '8px 0' }}>{record ? format === 'percent' ? percent(record.value) : format === 'points' ? fmt(record.value) : record.value : '—'}</div>
          {record ? record.holders.map((holder, i) => <div key={i} style={{ marginTop: 8 }}>
            <strong>{holder.season && holder.franchise ? teamLink(holder.franchise, holder.season) : holder.season && holder.winner ? teamLink(holder.winner, holder.season) : holder.name ?? 'Unknown franchise'}</strong>
            {holder.season && <div className="muted small">{holder.season} · Week {holder.week} · {holder.round}{holder.opponent ? ` · vs ${holder.opponent.name}` : holder.loser ? ` · vs ${holder.loser.name}` : ''}</div>}
          </div>) : <p className="muted small">No record established</p>}
        </article>;
      })}</div>
      <h3 style={{ marginTop: 32 }}>All-Time Playoff Standings</h3>
      <div className="tableScroll"><table><thead><tr>{['Franchise','APP','BYE','GP','W','L','WIN%','PF','PA','AVG','Finals','Titles','W Streak','L Streak'].map(label => <th key={label}>{label}</th>)}</tr></thead>
        <tbody>{data.standings.map(team => <tr key={team.franchiseId}>
          <td><strong>{team.name}</strong></td><td>{team.appearances}</td><td>{team.byes}</td><td>{team.games}</td><td>{team.wins}</td><td>{team.losses}</td><td>{percent(team.winPercentage)}</td><td>{fmt(team.pointsFor)}</td><td>{fmt(team.pointsAgainst)}</td><td>{team.averagePoints === null ? '—' : fmt(team.averagePoints)}</td><td>{team.finals}</td><td>{team.championships}</td><td>{team.longestWinningStreak}</td><td>{team.longestLosingStreak}</td>
        </tr>)}</tbody></table></div>
      <p className="muted small">APP = appearances · GP = games played · AVG = points per game · Streaks = career longest. Finals count completed finals only.</p>
      <h3 style={{ marginTop: 32 }}>Historical Playoff Results</h3>
      <div className="toolbar"><label>Season <select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All seasons</option>{data.seasonHistory.map(item => <option key={item.season} value={item.season}>{item.season}</option>)}</select></label></div>
      {visibleGames.length === 0 ? <p className="muted">No completed playoff games available for this selection.</p> : <div className="tableScroll"><table><thead><tr><th>Season</th><th>Week</th><th>Round</th><th>Winner</th><th>Score</th><th>Loser</th><th>Margin</th></tr></thead><tbody>{visibleGames.map(game => <tr key={`${game.season}-${game.week}-${game.winner.franchiseId}-${game.loser.franchiseId}`}><td>{game.season}</td><td>{game.week}</td><td>{game.round}</td><td style={{ color: '#d4af37' }}>{teamLink(game.winner, game.season)}</td><td>{fmt(game.winnerScore)} – {fmt(game.loserScore)}</td><td>{teamLink(game.loser, game.season)}</td><td>{fmt(game.margin)}</td></tr>)}</tbody></table></div>}
      <h3>Season Coverage</h3><div className="tableScroll"><table><thead><tr><th>Season</th><th>Status</th><th>Completed Games</th></tr></thead><tbody>{data.seasonHistory.map(item => <tr key={item.season}><td>{item.season}</td><td>{({pending:'Pending',inProgress:'In Progress',completed:'Completed',unresolved:'Requires Verification',unavailable:'Unavailable'} as Record<string, string>)[item.status] ?? item.status}</td><td>{item.completedGames}</td></tr>)}</tbody></table></div>
      <p className="muted small">Last synchronized: {new Date(data.fetchedAt).toLocaleString('nl-BE')}</p>
    </>}
  </section>;
}

export default function PlayoffsPage() {
  const [season, setSeason] =
    useState(CURRENT_SEASON);

  const [data, setData] =
    useState<PlayoffData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [refreshKey, setRefreshKey] =
    useState(0);

  const [expanded, setExpanded] =
    useState<number | null>(null);

  const seasons = getAvailableSeasons();

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError('');
      setData(null);
      setExpanded(null);

      try {
        const response = await fetch(
          `/api/playoffs?season=${encodeURIComponent(season)}`,
          {
            cache: 'no-store',
            signal: controller.signal
          }
        );

        const json = await response.json();

        if (!response.ok) {
          throw new Error(
            json.error ||
            'Could not load playoff data'
          );
        }

        if (!Array.isArray(json.standings)) {
          throw new Error(
            'Invalid playoff standings'
          );
        }

        if (!controller.signal.aborted) {
          setData(json);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unknown error'
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => controller.abort();

  }, [season, refreshKey]);

  const clinched = data?.standings.filter(
    team =>
      [
        'clinchedTopSeed',
        'clinchedBye',
        'clinchedPlayoffs'
      ].includes(team.scenario?.status ?? '')
  ).length ?? 0;

  const eliminated = data?.standings.filter(
    team =>
      team.scenario?.status === 'eliminated'
  ).length ?? 0;

  return (
    <>
      <Hero
        title="Playoff Center"
        subtitle="The Road to the Crown — playoff picture, qualification scenarios and the race for the XII-L Championship."
      />

      <div className="toolbar">
        <select
          value={season}
          onChange={event =>
            setSeason(event.target.value)
          }
          style={{
            padding: '9px 14px',
            borderRadius: 8
          }}
        >
          {seasons.map(item => (
            <option
              key={item.year}
              value={item.year}
            >
              {item.year} Season
            </option>
          ))}
        </select>

        <button
          className="button"
          disabled={loading}
          onClick={() =>
            setRefreshKey(value => value + 1)
          }
        >
          {loading
            ? 'Loading...'
            : '↻ Refresh Playoffs'}
        </button>
      </div>

      {loading && (
        <div className="loading">
          Loading playoff picture...
        </div>
      )}

      {error && (
        <div className="error">
          <strong>Playoff import failed</strong>
          <p>{error}</p>
        </div>
      )}

      {!loading && data && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 14,
            margin: '24px 0'
          }}>
            <SummaryCard
              label="Playoff Spots"
              value={data.config.playoffTeams}
              detail="Road to the Crown"
            />

            <SummaryCard
              label="First-Round Byes"
              value={data.config.byeTeams}
              detail="Top two seeds"
            />

            <SummaryCard
              label="Weeks Remaining"
              value={data.remainingWeeks}
              detail="Regular season"
            />

            <SummaryCard
              label="Clinched Playoffs"
              value={`${clinched}/${data.config.playoffTeams}`}
              detail="Confirmed qualifiers"
            />

            <SummaryCard
              label="Eliminated"
              value={eliminated}
              detail="Out of contention"
            />
          </div>

          <section style={{ marginTop: 32 }}>
            <h2>{data.season} Playoff Picture</h2>

            <p className="muted small">
              {data.seedingFinal
                ? 'Final regular-season seeding'
                : 'Current playoff seeding'}
              {' · '}
              Points For tiebreaker
            </p>

            {!data.scheduleComplete && (
              <p className="muted small">
                Remaining schedule is incomplete.
                Some scenarios may be unavailable.
              </p>
            )}

            {data.regularSeasonComplete &&
              !data.seedingFinal && (
                <p className="muted small">
                  Final seeding requires verification.
                </p>
              )}

            <p className="muted small">
              Seed ranges are conservative estimates
              when future Points For or complete
              scenario calculations are unavailable.
            </p>

            <div className="tableScroll">
              <table>
                <thead>
                  <tr>
                    <th>Seed</th>
                    <th>Franchise</th>
                    <th>Record</th>
                    <th className="num">PF</th>
                    <th className="num">PA</th>
                    <th>Status</th>
                    <th>Seed Range</th>
                    <th>Schedule</th>
                  </tr>
                </thead>

                <tbody>
                  {data.standings.map(team => {
                    const status =
                      team.scenario?.status ??
                      'unknown';

                    const zoneColor =
                      team.currentlyHasBye
                        ? '#d4af37'
                        : team.currentlyInPlayoffs
                          ? '#22c55e'
                          : 'transparent';

                    return (
                      <tr
                        key={team.rosterId}
                        style={{
                          borderLeft:
                            `4px solid ${zoneColor}`
                        }}
                      >
                        <td className="rank">
                          {team.seed}
                        </td>

                        <td>
                          <Link
                            href={`/franchises/${team.rosterId}?season=${season}`}
                          >
                            <strong>
                              {team.name}
                            </strong>
                          </Link>

                          <div className="muted small">
                            {team.currentlyHasBye
                              ? 'First-Round Bye Position'
                              : team.currentlyInPlayoffs
                                ? 'Wild Card Position'
                                : 'Outside Playoffs'}
                          </div>
                        </td>

                        <td>
                          {team.wins}–{team.losses}
                          {team.ties > 0 &&
                            `–${team.ties}`}
                        </td>

                        <td className="num">
                          {fmt(team.pointsFor)}
                        </td>

                        <td className="num">
                          {fmt(team.pointsAgainst)}
                        </td>

                        <td>
                          <StatusBadge status={status}/>
                        </td>

                        <td>
                          <SeedRange
                            best={
                              team.scenario
                                ?.bestPossibleSeed ?? null
                            }
                            worst={
                              team.scenario
                                ?.worstPossibleSeed ?? null
                            }
                            total={data.standings.length}
                          />
                        </td>

                        <td>
                          <button
                            className="button"
                            onClick={() =>
                              setExpanded(
                                expanded === team.rosterId
                                  ? null
                                  : team.rosterId
                              )
                            }
                          >
                            {expanded === team.rosterId
                              ? 'Hide'
                              : `${team.remainingGames} games`}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{
              display: 'flex',
              gap: 20,
              flexWrap: 'wrap',
              marginTop: 14
            }}>
              <span style={{ color: '#d4af37' }}>
                ■ First-Round Bye
              </span>

              <span style={{ color: '#22c55e' }}>
                ■ Wild Card Position
              </span>
            </div>
          </section>

          {expanded !== null &&
            data.standings
              .filter(team =>
                team.rosterId === expanded
              )
              .map(team => (
                <section
                  key={team.rosterId}
                  style={{ marginTop: 30 }}
                >
                  <h2>{team.name}</h2>

                  <p className="muted">
                    Remaining Regular-Season Schedule
                  </p>

                  <div className="tableScroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Week</th>
                          <th>Opponent</th>
                          <th>Current Seed</th>
                        </tr>
                      </thead>

                      <tbody>
                        {team.remainingSchedule.map(
                          game => (
                            <tr key={game.week}>
                              <td>Week {game.week}</td>

                              <td>
                                <Link
                                  href={`/franchises/${game.opponentRosterId}?season=${season}`}
                                >
                                  {game.opponentName}
                                </Link>
                              </td>

                              <td>
                                #{data.standings.find(
                                  opponent =>
                                    opponent.rosterId ===
                                    game.opponentRosterId
                                )?.seed ?? '—'}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>

                  {team.remainingSchedule.length === 0 && (
                    <p className="muted">
                      No remaining games available.
                    </p>
                  )}
                </section>
              ))
          }

          <RoadToTheCrown data={data} />

          <section style={{ marginTop: 30 }}>
            <h2>First-Round Byes</h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 16
            }}>
              {data.standings
                .filter(team => team.currentlyHasBye)
                .map(team => (
                  <div
                    key={team.rosterId}
                    style={{
                      border: '1px solid #d4af3766',
                      borderRadius: 12,
                      padding: 20
                    }}
                  >
                    <div style={{
                      color: '#d4af37',
                      fontWeight: 700
                    }}>
                      SEED #{team.seed}
                    </div>

                    <h3>{team.name}</h3>

                    <p className="muted small">
                      {data.seedingFinal
                        ? 'First-round bye'
                        : 'Projected first-round bye'}
                      {' · '}
                      Semi-finals in Week{' '}
                      {data.config.semiFinalWeek}
                    </p>
                  </div>
                ))}
            </div>
          </section>

          <p
            className="muted small"
            style={{ marginTop: 30 }}
          >
            Last synchronized:{' '}
            {new Date(data.fetchedAt)
              .toLocaleString('nl-BE')}
          </p>
        </>
      )}
      <ChampionshipHistory onSelectSeason={setSeason} refreshKey={refreshKey} />
      <AllTimePlayoffRecords refreshKey={refreshKey} />
    </>
  );
}
