'use client';

import {
  useState,
  useEffect,
  useId
} from 'react';

import {
  Search,
  Shield,
  CheckCircle2,
  PlusCircle,
  X,
  LoaderCircle,
  AlertTriangle,
  Database,
  RotateCcw
} from 'lucide-react';

import type {
  AdminFranchiseOption
} from '@/lib/admin/franchises';

type AdminFranchiseSelectorProps = {
  season: string;
  value: AdminFranchiseOption | null;
  onChange: (
    franchise: AdminFranchiseOption | null
  ) => void;
  label?: string;
  disabled?: boolean;
};

type FranchiseResponse = {
  success: boolean;
  error?: string;
  season: string;
  totalFranchises: number;
  returnedResults: number;
  franchises: AdminFranchiseOption[];
};

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function AdminFranchiseSelector({
  season,
  value,
  onChange,
  label = 'Select Franchise',
  disabled = false
}: AdminFranchiseSelectorProps) {
  const inputId = useId();

  const [query, setQuery] = useState('');

  const [franchises, setFranchises] =
    useState<AdminFranchiseOption[]>([]);

  const [loadedSeason, setLoadedSeason] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [retryKey, setRetryKey] =
    useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setFranchises([]);
    setLoadedSeason(null);
    setLoading(true);
    setError(null);
    setQuery('');

    async function loadFranchises() {
      try {
        const params = new URLSearchParams({
          season
        });

        const response = await fetch(
          `/api/admin/franchises?${params.toString()}`,
          {
            cache: 'no-store',
            credentials: 'same-origin',
            signal: controller.signal
          }
        );

        const data: FranchiseResponse =
          await response.json();

        if (!active) {
          return;
        }

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ||
            'Franchise data could not be loaded.'
          );
        }

        if (
          data.season !== season ||
          !Array.isArray(data.franchises) ||
          data.franchises.some(
            franchise => franchise.season !== season
          )
        ) {
          throw new Error(
            'Invalid franchise response.'
          );
        }

        setFranchises(data.franchises);
        setLoadedSeason(season);

      } catch (error) {
        if (
          !active ||
          controller.signal.aborted
        ) {
          return;
        }

        setError(
          error instanceof Error
            ? error.message
            : 'Franchise data is unavailable.'
        );

        setFranchises([]);

      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadFranchises();

    return () => {
      active = false;
      controller.abort();
    };

  }, [season, retryKey]);

  const selectedFranchise =
    value?.season === season
      ? value
      : null;

  const staleSelection =
    value !== null &&
    value.season !== season;

  const normalizedQuery =
    normalizeText(query);

  const availableFranchises =
    loadedSeason === season
      ? franchises
      : [];

  const filteredFranchises =
    query.trim() === ''
      ? availableFranchises
      : availableFranchises.filter(franchise => {
          if (!normalizedQuery) {
            return false;
          }

          const searchableText = normalizeText(
            [
              franchise.franchiseId,
              franchise.franchiseName,
              franchise.currentName
            ].join(' ')
          );

          return normalizedQuery
            .split(' ')
            .every(word =>
              searchableText.includes(word)
            );
        });

  function selectFranchise(
    franchise: AdminFranchiseOption
  ) {
    if (
      disabled ||
      loading ||
      loadedSeason !== season ||
      franchise.season !== season
    ) {
      return;
    }

    onChange(franchise);
    setQuery('');
  }

  return (
    <section
      style={{
        background: '#111827',
        color: '#ffffff',
        border: '1px solid #374151',
        borderRadius: '14px',
        padding: '24px',
        opacity: disabled ? 0.6 : 1
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '8px'
        }}
      >
        <label
          htmlFor={inputId}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '17px',
            fontWeight: 700
          }}
        >
          <Shield
            size={22}
            color="#d4af37"
          />

          {label}
        </label>

        <span
          style={{
            color: '#d4af37',
            background: 'rgba(212,175,55,0.12)',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 700
          }}
        >
          {season}
        </span>
      </div>

      <p
        style={{
          color: '#9ca3af',
          fontSize: '13px',
          lineHeight: 1.6,
          margin: '0 0 20px'
        }}
      >
        Select an official XII-L franchise
        for the {season} season.
      </p>

      {staleSelection && (
        <div
          role="alert"
          style={{
            background: '#292211',
            border: '1px solid #92400e',
            color: '#fbbf24',
            borderRadius: '10px',
            padding: '14px',
            marginBottom: '18px',
            fontSize: '13px'
          }}
        >
          The previous selection belongs to
          another season. Please select a
          franchise for {season}.

          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(null)}
            style={{
              display: 'block',
              background: 'transparent',
              color: '#fbbf24',
              border: 'none',
              padding: '10px 0 0',
              cursor: disabled
                ? 'not-allowed'
                : 'pointer',
              textDecoration: 'underline'
            }}
          >
            Clear previous selection
          </button>
        </div>
      )}

      {selectedFranchise && (
        <div
          style={{
            background: 'rgba(212,175,55,0.07)',
            border: '1px solid #d4af37',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '20px'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#86efac',
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '1px',
              marginBottom: '12px'
            }}
          >
            <CheckCircle2 size={15} />
            SELECTED FRANCHISE
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                background: '#29251b',
                color: '#d4af37',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 800
              }}
            >
              {selectedFranchise.franchiseId}
            </div>

            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 700
                }}
              >
                {selectedFranchise.franchiseName}
              </div>

              <div
                style={{
                  color: '#9ca3af',
                  fontSize: '12px',
                  marginTop: '5px'
                }}
              >
                Franchise ID:{' '}
                {selectedFranchise.franchiseId}
                {' · '}
                {selectedFranchise.season} Season
              </div>

              <div
                style={{
                  color: '#9ca3af',
                  fontSize: '12px',
                  marginTop: '4px'
                }}
              >
                Roster ID:{' '}
                {selectedFranchise.rosterId}
              </div>

              {selectedFranchise.currentName !==
                selectedFranchise.franchiseName && (
                <div
                  style={{
                    color: '#9ca3af',
                    fontSize: '12px',
                    marginTop: '4px'
                  }}
                >
                  Current name:{' '}
                  {selectedFranchise.currentName}
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'transparent',
                color: '#f87171',
                border: '1px solid #7f1d1d',
                borderRadius: '7px',
                padding: '8px 10px',
                fontSize: '12px',
                cursor: disabled
                  ? 'not-allowed'
                  : 'pointer'
              }}
            >
              <X size={14} />
              Remove
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: '#030712',
          border: '1px solid #4b5563',
          borderRadius: '9px',
          padding: '0 14px'
        }}
      >
        <Search
          size={18}
          color="#9ca3af"
        />

        <input
          id={inputId}
          type="search"
          value={query}
          maxLength={100}
          disabled={
            disabled ||
            loading ||
            loadedSeason !== season
          }
          onChange={event =>
            setQuery(event.target.value)
          }
          placeholder="Search franchise name or ID..."
          style={{
            flex: 1,
            minWidth: 0,
            background: 'transparent',
            color: '#ffffff',
            border: 'none',
            outline: 'none',
            padding: '13px 0',
            fontSize: '14px'
          }}
        />
      </div>

      <div
        aria-live="polite"
        aria-busy={loading}
        style={{
          marginTop: '16px'
        }}
      >
        {loading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#9ca3af',
              padding: '16px 0',
              fontSize: '13px'
            }}
          >
            <LoaderCircle
              size={18}
              color="#d4af37"
            />

            Loading franchises...
          </div>
        )}

        {!loading && error && (
          <div
            role="alert"
            style={{
              background: '#292211',
              color: '#fbbf24',
              border: '1px solid #92400e',
              borderRadius: '9px',
              padding: '14px',
              fontSize: '13px'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertTriangle size={18} />
              {error}
            </div>

            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                setRetryKey(previous => previous + 1)
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#111827',
                color: '#d4af37',
                border: '1px solid #4b5563',
                borderRadius: '7px',
                padding: '8px 12px',
                marginTop: '12px',
                cursor: disabled
                  ? 'not-allowed'
                  : 'pointer'
              }}
            >
              <RotateCcw size={14} />
              Retry
            </button>
          </div>
        )}

        {!loading &&
          !error &&
          loadedSeason === season && (
            <>
              <div
                style={{
                  color: '#9ca3af',
                  fontSize: '12px',
                  marginBottom: '12px'
                }}
              >
                {filteredFranchises.length}
                {' of '}
                {availableFranchises.length}
                {' available franchises'}
              </div>

              {filteredFranchises.length === 0 && (
                <div
                  style={{
                    color: '#9ca3af',
                    textAlign: 'center',
                    padding: '24px',
                    fontSize: '13px'
                  }}
                >
                  No matching franchises found.
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  maxHeight: '380px',
                  overflowY: 'auto'
                }}
              >
                {filteredFranchises.map(franchise => {
                  const isSelected =
                    selectedFranchise?.franchiseId ===
                    franchise.franchiseId;

                  return (
                    <button
                      key={franchise.franchiseId}
                      type="button"
                      disabled={disabled}
                      aria-pressed={isSelected}
                      onClick={() =>
                        selectFranchise(franchise)
                      }
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        width: '100%',
                        background: isSelected
                          ? 'rgba(212,175,55,0.08)'
                          : '#030712',
                        color: '#ffffff',
                        border: isSelected
                          ? '1px solid #d4af37'
                          : '1px solid #374151',
                        borderRadius: '9px',
                        padding: '12px',
                        textAlign: 'left',
                        cursor: disabled
                          ? 'not-allowed'
                          : 'pointer'
                      }}
                    >
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          flexShrink: 0,
                          background: '#29251b',
                          color: '#d4af37',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 800
                        }}
                      >
                        {franchise.franchiseId}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: '14px',
                            fontWeight: 700
                          }}
                        >
                          {franchise.franchiseName}
                        </div>

                        <div
                          style={{
                            color: '#9ca3af',
                            fontSize: '11px',
                            marginTop: '4px'
                          }}
                        >
                          Franchise ID:{' '}
                          {franchise.franchiseId}
                          {' · Roster ID: '}
                          {franchise.rosterId}
                        </div>

                        {franchise.currentName !==
                          franchise.franchiseName && (
                          <div
                            style={{
                              color: '#9ca3af',
                              fontSize: '11px',
                              marginTop: '4px'
                            }}
                          >
                            Current name:{' '}
                            {franchise.currentName}
                          </div>
                        )}
                      </div>

                      {isSelected ? (
                        <CheckCircle2
                          size={20}
                          color="#86efac"
                        />
                      ) : (
                        <PlusCircle
                          size={20}
                          color="#d4af37"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderTop: '1px solid #374151',
          paddingTop: '16px',
          marginTop: '20px',
          color: '#9ca3af',
          fontSize: '11px'
        }}
      >
        <Database size={14} />

        Official XII-L Franchise Registry
      </div>
    </section>
  );
}
