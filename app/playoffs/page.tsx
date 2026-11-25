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

          <section style={{ marginTop: 36 }}>
            <h2>
              {data.seedingFinal
                ? 'Wild Card Matchups'
                : 'Projected Wild Card Matchups'}
            </h2>

            <p className="muted small">
              Week {data.config.wildCardWeek}
              {' · '}
              {data.seedingFinal
                ? 'Based on final regular-season seeds'
                : 'If the season ended today'}
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 16
            }}>
              {data.projectedWildCardMatchups.map(
                (game, index) => (
                  <div
                    key={index}
                    style={{
                      border:
                        '1px solid rgba(128,128,128,0.25)',
                      borderRadius: 12,
                      padding: 22,
                      textAlign: 'center'
                    }}
                  >
                    <div className="muted small">
                      WILD CARD GAME {index + 1}
                    </div>

                    <h3>
                      #{game.homeSeed}{' '}
                      {game.homeTeam?.name ?? 'TBD'}
                    </h3>

                    <div className="muted">VS</div>

                    <h3>
                      #{game.awaySeed}{' '}
                      {game.awayTeam?.name ?? 'TBD'}
                    </h3>
                  </div>
                )
              )}
            </div>
          </section>

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
    </>
  );
}
