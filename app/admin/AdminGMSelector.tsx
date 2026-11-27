'use client';

import {
  useState,
  useEffect,
  useId
} from 'react';

import {
  Search,
  Users,
  UserRound,
  CheckCircle2,
  PlusCircle,
  X,
  LoaderCircle,
  AlertTriangle,
  Database,
  RotateCcw
} from 'lucide-react';

import type {
  AdminGMOption,
  AdminGMStatusFilter
} from '@/lib/admin/gms';

type AdminGMSelectorProps = {
  season: string;
  value: AdminGMOption | null;
  onChange: (gm: AdminGMOption | null) => void;
  label?: string;
  disabled?: boolean;
};

type GMResponse = {
  success: boolean;
  error?: string;
  season: string;
  totalGMs: number;
  totalAssignments: number;
  returnedResults: number;
  gms: AdminGMOption[];
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

function getAssignmentKey(
  gm: AdminGMOption
): string {
  return [
    gm.gmId,
    gm.season,
    gm.franchiseId,
    gm.role,
    gm.startWeek ?? 'unknown',
    gm.endWeek ?? 'unknown'
  ].join(':');
}

export default function AdminGMSelector({
  season,
  value,
  onChange,
  label = 'Select General Manager',
  disabled = false
}: AdminGMSelectorProps) {
  const inputId = useId();

  const [query, setQuery] = useState('');

  const [franchiseFilter, setFranchiseFilter] =
    useState('ALL');

  const [statusFilter, setStatusFilter] =
    useState<AdminGMStatusFilter>('ALL');

  const [gms, setGMs] =
    useState<AdminGMOption[]>([]);

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

    setGMs([]);
    setLoadedSeason(null);
    setLoading(true);
    setError(null);
    setQuery('');
    setFranchiseFilter('ALL');
    setStatusFilter('ALL');

    async function loadGMs() {
      try {
        const params = new URLSearchParams({
          season
        });

        const response = await fetch(
          `/api/admin/gms?${params.toString()}`,
          {
            cache: 'no-store',
            credentials: 'same-origin',
            signal: controller.signal
          }
        );

        const data: GMResponse =
          await response.json();

        if (!active) {
          return;
        }

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ||
            'General Manager data could not be loaded.'
          );
        }

        if (
          data.season !== season ||
          !Array.isArray(data.gms) ||
          data.gms.some(
            gm => gm.season !== season
          )
        ) {
          throw new Error(
            'Invalid General Manager response.'
          );
        }

        setGMs(data.gms);
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
            : 'General Manager data is unavailable.'
        );

        setGMs([]);

      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadGMs();

    return () => {
      active = false;
      controller.abort();
    };

  }, [season, retryKey]);

  const selectedGM =
    value?.season === season
      ? value
      : null;

  const staleSelection =
    value !== null &&
    value.season !== season;

  const availableGMs =
    loadedSeason === season
      ? gms
      : [];

  const controlsDisabled =
    disabled ||
    loading ||
    loadedSeason !== season;

  const franchiseOptions = Array.from(
    new Map(
      availableGMs.map(gm => [
        gm.franchiseId,
        {
          id: gm.franchiseId,
          name: gm.franchiseName
        }
      ])
    ).values()
  ).sort(
    (a, b) =>
      a.name.localeCompare(b.name, 'en')
  );

  const normalizedQuery =
    normalizeText(query);

  const filteredGMs =
    availableGMs.filter(gm => {
      if (
        franchiseFilter !== 'ALL' &&
        gm.franchiseId !== franchiseFilter
      ) {
        return false;
      }

      if (
        statusFilter !== 'ALL' &&
        gm.status !== statusFilter
      ) {
        return false;
      }

      if (query.trim() === '') {
        return true;
      }

      if (!normalizedQuery) {
        return false;
      }

      const searchableText = normalizeText(
        [
          gm.gmId,
          gm.displayName,
          ...gm.previousNames,
          gm.sleeperUserId ?? '',
          gm.franchiseId,
          gm.franchiseName
        ].join(' ')
      );

      return normalizedQuery
        .split(' ')
        .every(word =>
          searchableText.includes(word)
        );
    });

  const uniqueGMCount = new Set(
    availableGMs.map(gm => gm.gmId)
  ).size;

  function selectGM(gm: AdminGMOption) {
    if (
      controlsDisabled ||
      gm.season !== season
    ) {
      return;
    }

    onChange(gm);
    setQuery('');
  }

  const selectStyle = {
    width: '100%',
    minWidth: 0,
    background: '#030712',
    color: '#ffffff',
    border: '1px solid #4b5563',
    borderRadius: '8px',
    padding: '11px',
    fontSize: '13px'
  };

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
          <Users
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
        Select an official XII-L General Manager
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
          The previous GM selection belongs
          to another season. Please select
          a General Manager for {season}.

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

      {selectedGM && (
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
            SELECTED GENERAL MANAGER
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
                justifyContent: 'center'
              }}
            >
              <UserRound size={25} />
            </div>

            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 700
                }}
              >
                {selectedGM.displayName}
              </div>

              <div
                style={{
                  color: '#d4af37',
                  fontSize: '13px',
                  marginTop: '5px'
                }}
              >
                {selectedGM.franchiseName}
              </div>

              <div
                style={{
                  color: '#9ca3af',
                  fontSize: '12px',
                  marginTop: '5px'
                }}
              >
                GM ID: {selectedGM.gmId}
                {' · '}
                {selectedGM.role}
                {' · '}
                {selectedGM.season}
              </div>

              <div
                style={{
                  color: '#9ca3af',
                  fontSize: '12px',
                  marginTop: '4px'
                }}
              >
                Franchise ID:{' '}
                {selectedGM.franchiseId}
                {' · Roster ID: '}
                {selectedGM.rosterId}
              </div>

              <div
                style={{
                  color:
                    selectedGM.status === 'active'
                      ? '#86efac'
                      : '#9ca3af',
                  fontSize: '11px',
                  fontWeight: 700,
                  marginTop: '6px',
                  textTransform: 'uppercase'
                }}
              >
                {selectedGM.status}
              </div>

              {(selectedGM.startWeek !== null ||
                selectedGM.endWeek !== null) && (
                <div
                  style={{
                    color: '#9ca3af',
                    fontSize: '12px',
                    marginTop: '5px'
                  }}
                >
                  Assignment weeks:{' '}
                  {selectedGM.startWeek ?? 'Unknown'}
                  {' – '}
                  {selectedGM.endWeek ??
                    (selectedGM.status === 'active'
                      ? 'Present'
                      : 'Unknown')}
                </div>
              )}

              {selectedGM.previousNames.length > 0 && (
                <div
                  style={{
                    color: '#9ca3af',
                    fontSize: '12px',
                    marginTop: '5px'
                  }}
                >
                  Previous names:{' '}
                  {selectedGM.previousNames.join(', ')}
                </div>
              )}

              <div
                style={{
                  color: '#9ca3af',
                  fontSize: '11px',
                  marginTop: '5px'
                }}
              >
                Sleeper User ID:{' '}
                {selectedGM.sleeperUserId ??
                  'Not linked'}
              </div>
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
          disabled={controlsDisabled}
          onChange={event =>
            setQuery(event.target.value)
          }
          placeholder="Search GM name, ID or franchise..."
          style={{
            flex: 1,
            minWidth: 0,
            background: 'transparent',
            color: '#ffffff',
            border: 'none',
            padding: '13px 0',
            fontSize: '14px'
          }}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
          gap: '12px',
          marginTop: '14px'
        }}
      >
        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '7px',
            color: '#9ca3af',
            fontSize: '12px'
          }}
        >
          Franchise

          <select
            value={franchiseFilter}
            disabled={controlsDisabled}
            onChange={event =>
              setFranchiseFilter(event.target.value)
            }
            style={selectStyle}
          >
            <option value="ALL">
              All franchises
            </option>

            {franchiseOptions.map(franchise => (
              <option
                key={franchise.id}
                value={franchise.id}
              >
                {franchise.name}
              </option>
            ))}
          </select>
        </label>

        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '7px',
            color: '#9ca3af',
            fontSize: '12px'
          }}
        >
          Status

          <select
            value={statusFilter}
            disabled={controlsDisabled}
            onChange={event =>
              setStatusFilter(
                event.target.value as AdminGMStatusFilter
              )
            }
            style={selectStyle}
          >
            <option value="ALL">
              All statuses
            </option>

            <option value="active">
              Active
            </option>

            <option value="former">
              Former
            </option>
          </select>
        </label>
      </div>

      {(query ||
        franchiseFilter !== 'ALL' ||
        statusFilter !== 'ALL') && (
        <button
          type="button"
          disabled={controlsDisabled}
          onClick={() => {
            setQuery('');
            setFranchiseFilter('ALL');
            setStatusFilter('ALL');
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'transparent',
            color: '#d4af37',
            border: 'none',
            padding: '10px 0 0',
            fontSize: '12px',
            cursor: controlsDisabled
              ? 'not-allowed'
              : 'pointer'
          }}
        >
          <RotateCcw size={13} />
          Clear filters
        </button>
      )}

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

            Loading General Managers...
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
                {filteredGMs.length}
                {' of '}
                {availableGMs.length}
                {' GM assignments · '}
                {uniqueGMCount}
                {' registered GMs'}
              </div>

              {filteredGMs.length === 0 && (
                <div
                  style={{
                    color: '#9ca3af',
                    textAlign: 'center',
                    padding: '24px',
                    fontSize: '13px'
                  }}
                >
                  No matching General Managers found.
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
                {filteredGMs.map(gm => {
                  const assignmentKey =
                    getAssignmentKey(gm);

                  const isSelected =
                    selectedGM !== null &&
                    getAssignmentKey(selectedGM) ===
                      assignmentKey;

                  return (
                    <button
                      key={assignmentKey}
                      type="button"
                      disabled={controlsDisabled}
                      aria-pressed={isSelected}
                      onClick={() => selectGM(gm)}
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
                        cursor: controlsDisabled
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
                        {gm.franchiseId}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: '14px',
                            fontWeight: 700
                          }}
                        >
                          {gm.displayName}
                        </div>

                        <div
                          style={{
                            color: '#d4af37',
                            fontSize: '12px',
                            marginTop: '4px'
                          }}
                        >
                          {gm.franchiseName}
                        </div>

                        <div
                          style={{
                            color: '#9ca3af',
                            fontSize: '11px',
                            marginTop: '4px'
                          }}
                        >
                          {gm.gmId}
                          {' · '}
                          {gm.role}
                          {' · '}

                          <span
                            style={{
                              color:
                                gm.status === 'active'
                                  ? '#86efac'
                                  : '#9ca3af'
                            }}
                          >
                            {gm.status === 'active'
                              ? 'Active'
                              : 'Former'}
                          </span>
                        </div>

                        {(gm.startWeek !== null ||
                          gm.endWeek !== null) && (
                          <div
                            style={{
                              color: '#9ca3af',
                              fontSize: '11px',
                              marginTop: '4px'
                            }}
                          >
                            Weeks:{' '}
                            {gm.startWeek ?? 'Unknown'}
                            {' – '}
                            {gm.endWeek ??
                              (gm.status === 'active'
                                ? 'Present'
                                : 'Unknown')}
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
        Official XII-L GM Registry
      </div>
    </section>
  );
}
