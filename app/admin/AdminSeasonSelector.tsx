'use client';

import { useTransition } from 'react';

import {
  usePathname,
  useRouter,
  useSearchParams
} from 'next/navigation';

import {
  CalendarDays,
  LoaderCircle
} from 'lucide-react';

import {
  getAvailableSeasons,
  CURRENT_SEASON
} from '@/lib/seasons';

type AdminSeasonSelectorProps = {
  selectedSeason: string;
};

export default function AdminSeasonSelector({
  selectedSeason
}: AdminSeasonSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isPending, startTransition] =
    useTransition();

  const seasons = getAvailableSeasons();

  const activeSeason = seasons.find(
    season => season.year === selectedSeason
  );

  function changeSeason(year: string) {
    const validSeason = seasons.some(
      season => season.year === year
    );

    if (!validSeason || year === selectedSeason) {
      return;
    }

    const params = new URLSearchParams(
      searchParams.toString()
    );

    params.set('season', year);

    startTransition(() => {
      router.push(
        `${pathname}?${params.toString()}`,
        { scroll: false }
      );
    });
  }

  return (
    <section
      style={{
        background: '#111827',
        color: '#ffffff',
        border: '1px solid #374151',
        borderRadius: '14px',
        padding: '20px',
        marginBottom: '24px'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              background: 'rgba(212, 175, 55, 0.12)',
              color: '#d4af37',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <CalendarDays size={22} />
          </div>

          <div>
            <div
              style={{
                color: '#9ca3af',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '1px',
                marginBottom: '6px'
              }}
            >
              SELECTED SEASON
            </div>

            <div
              style={{
                fontSize: '18px',
                fontWeight: 700
              }}
            >
              {activeSeason?.name ?? selectedSeason}
            </div>

            <div
              style={{
                color:
                  selectedSeason === CURRENT_SEASON
                    ? '#86efac'
                    : '#9ca3af',
                fontSize: '12px',
                marginTop: '6px'
              }}
            >
              {selectedSeason === CURRENT_SEASON
                ? 'Current Season'
                : 'Historical Season'}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          {isPending && (
            <LoaderCircle
              size={18}
              color="#d4af37"
              aria-label="Loading season"
            />
          )}

          <select
            aria-label="Select XII-L season"
            value={selectedSeason}
            disabled={isPending}
            onChange={event =>
              changeSeason(event.target.value)
            }
            style={{
              background: '#030712',
              color: '#ffffff',
              border: '1px solid #4b5563',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 600,
              minWidth: '150px',
              maxWidth: '100%',
              cursor: isPending
                ? 'wait'
                : 'pointer'
            }}
          >
            {seasons.map(season => (
              <option
                key={season.year}
                value={season.year}
              >
                {season.year} Season
                {season.year === CURRENT_SEASON
                  ? ' (Current)'
                  : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}
