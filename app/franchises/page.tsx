'use client';

import Link from 'next/link';
import { Suspense } from 'react';

import {
  useSearchParams,
  useRouter
} from 'next/navigation';

import { useLeague } from '@/lib/useLeague';

import {
  CURRENT_SEASON,
  getAvailableSeasons
} from '@/lib/seasons';

import {
  getFranchiseByRoster
} from '@/lib/franchises';

import {
  teamName,
  points
} from '@/lib/sleeper';

import {
  Hero,
  State,
  Refresh,
  fmt
} from '../components';

export default function Franchises() {
  return (
    <Suspense
      fallback={
        <main className="wrap main">
          <div className="loading">
            Loading franchises...
          </div>
        </main>
      }
    >
      <FranchisesContent />
    </Suspense>
  );
}

function FranchisesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const season =
    searchParams.get('season') ?? CURRENT_SEASON;

  const availableSeasons = getAvailableSeasons();

  return (
    <main className="wrap main">

      <Hero
        title="THE FRANCHISES"
        subtitle={`Meet the teams competing for the XII-L Crown · ${season} Season`}
      />

      <section className="panel">
        <h2>Select Season</h2>

        <select
          value={season}
          onChange={event =>
            router.push(
              `/franchises?season=${event.target.value}`
            )
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

        <p className="muted small">
          Viewing XII-L season: {season}
        </p>
      </section>

      <SeasonFranchises
        key={season}
        season={season}
      />

    </main>
  );
}

function SeasonFranchises({
  season
}: {
  season: string;
}) {
  const {
    data,
    loading,
    error,
    refresh
  } = useLeague(undefined, season);

  return (
    <>
      <State
        loading={loading}
        error={error}
        refresh={refresh}
      />

      {data && (
        <>
          <Refresh
            data={data}
            loading={loading}
            refresh={refresh}
          />

          <section className="teams">

            {data.rosters.map(roster => {
              const franchise =
                getFranchiseByRoster(
                  season,
                  roster.roster_id
                );

              const owner = data.users.find(
                user =>
                  user.user_id === roster.owner_id
              );

              const franchiseName =
                season === CURRENT_SEASON
                  ? teamName(roster, data.users)
                  : franchise?.seasons[season]?.name ||
                    teamName(roster, data.users);

              const wins =
                roster.settings?.wins ?? 0;

              const losses =
                roster.settings?.losses ?? 0;

              const ties =
                roster.settings?.ties ?? 0;

              const pointsFor = points(
                roster.settings,
                'fpts'
              );

              const pointsAgainst = points(
                roster.settings,
                'fpts_against'
              );

              return (
                <Link
                  key={roster.roster_id}
                  className="teamCard"
                  href={`/franchises/${roster.roster_id}?season=${season}`}
                >
                  <div className="teamBadge">
                    {franchise?.id ?? 'XII'}
                  </div>

                  <h3>{franchiseName}</h3>

                  <div className="muted small">
                    GM: {owner?.display_name ||
                      'Not available'}
                  </div>

                  <div className="record">
                    {wins}–{losses}
                    {ties > 0 ? `–${ties}` : ''}
                  </div>

                  <div className="muted small">
                    PF {fmt(pointsFor)}
                    {' · '}
                    PA {fmt(pointsAgainst)}
                  </div>

                  <div className="muted small">
                    Season {season}
                  </div>

                </Link>
              );
            })}

          </section>

          {data.rosters.length === 0 && (
            <section className="panel">
              <p className="muted">
                No franchises available
                for this season.
              </p>
            </section>
          )}
        </>
      )}
    </>
  );
}
