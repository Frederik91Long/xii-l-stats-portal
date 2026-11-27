'use client';

import {
  useState,
  useEffect,
  useId
} from 'react';

import {
  Search,
  UserRound,
  CheckCircle2,
  PlusCircle,
  X,
  LoaderCircle,
  AlertTriangle,
  Database
} from 'lucide-react';

import type {
  AdminPlayerOption
} from '@/lib/admin/players';

type AdminPlayerSelectorProps = {
  value: AdminPlayerOption | null;
  onChange: (
    player: AdminPlayerOption | null
  ) => void;
  label?: string;
  disabled?: boolean;
  allowedPositions?: readonly string[];
};

type SearchResponse = {
  success: boolean;
  error?: string;
  totalMatches: number;
  returnedResults: number;
  players: AdminPlayerOption[];
};

const DEFAULT_POSITIONS = [
  'QB', 'RB', 'WR', 'TE', 'K', 'FB',
  'DL', 'DE', 'DT', 'LB', 'DB', 'CB',
  'S', 'SS', 'FS', 'OL', 'OT', 'OG',
  'C', 'P', 'LS'
] as const;

export default function AdminPlayerSelector({
  value,
  onChange,
  label = 'Select Player',
  disabled = false,
  allowedPositions = DEFAULT_POSITIONS
}: AdminPlayerSelectorProps) {
  const inputId = useId();

  const [query, setQuery] = useState('');
  const [position, setPosition] =
    useState('ALL');

  const [results, setResults] =
    useState<AdminPlayerOption[]>([]);

  const [totalMatches, setTotalMatches] =
    useState(0);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [searched, setSearched] =
    useState(false);

  const positionsKey =
    allowedPositions.join(',');

  const effectivePosition =
    position === 'ALL' ||
    allowedPositions.includes(position)
      ? position
      : 'ALL';

  useEffect(() => {
    const cleanQuery = query.trim();

    setResults([]);
    setTotalMatches(0);
    setError(null);
    setSearched(false);

    if (disabled || cleanQuery.length < 2) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let active = true;

    setLoading(true);

    const timer = window.setTimeout(
      async () => {
        try {
          const params = new URLSearchParams({
            q: cleanQuery,
            position: effectivePosition,
            limit: '50'
          });

          const response = await fetch(
            `/api/admin/players/search?${params.toString()}`,
            {
              cache: 'no-store',
              credentials: 'same-origin',
              signal: controller.signal
            }
          );

          const data: SearchResponse =
            await response.json();

          if (!active) {
            return;
          }

          if (!response.ok || !data.success) {
            throw new Error(
              data.error ||
              'Player search failed.'
            );
          }

          if (!Array.isArray(data.players)) {
            throw new Error(
              'Invalid player search response.'
            );
          }

          const permittedPositions =
            positionsKey.split(',');

          const filteredPlayers =
            data.players.filter(player =>
              permittedPositions.includes(
                player.position
              )
            );

          setResults(filteredPlayers);
          setTotalMatches(data.totalMatches);
          setSearched(true);

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
              : 'Player search is unavailable.'
          );

          setResults([]);

        } finally {
          if (active) {
            setLoading(false);
          }
        }
      },
      350
    );

    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };

  }, [
    query,
    effectivePosition,
    disabled,
    positionsKey
  ]);

  function selectPlayer(
    player: AdminPlayerOption
  ) {
    if (
      disabled ||
      !allowedPositions.includes(
        player.position
      )
    ) {
      return;
    }

    onChange(player);
    setQuery('');
    setResults([]);
    setSearched(false);
    setError(null);
  }

  return (
    <section
      style={{
        background: '#111827',
        color: '#ffffff',
        border: '1px solid #374151',
        borderRadius: '14px',
        padding: '20px'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '8px'
        }}
      >
        <UserRound
          size={22}
          color="#d4af37"
        />

        <label
          htmlFor={inputId}
          style={{
            fontSize: '18px',
            fontWeight: 700
          }}
        >
          {label}
        </label>
      </div>

      <p
        style={{
          color: '#9ca3af',
          fontSize: '13px',
          lineHeight: 1.6,
          marginBottom: '20px'
        }}
      >
        Search and select a player from
        the Sleeper database.
      </p>

      {value && (
        <div
          style={{
            background:
              'rgba(212, 175, 55, 0.06)',
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
              gap: '8px',
              color: '#86efac',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '1px',
              marginBottom: '14px'
            }}
          >
            <CheckCircle2 size={16} />
            SELECTED PLAYER
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              flexWrap: 'wrap'
            }}
          >
            <div
              style={{
                background: '#29251b',
                color: '#d4af37',
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800
              }}
            >
              {value.position}
            </div>

            <div
              style={{
                flex: 1,
                minWidth: '140px'
              }}
            >
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  marginBottom: '5px'
                }}
              >
                {value.playerName}
              </div>

              <div
                style={{
                  color: '#9ca3af',
                  fontSize: '12px',
                  lineHeight: 1.7
                }}
              >
                {value.position}
                {' · '}
                {value.nflTeam ?? 'No NFL Team'}

                <div>
                  Sleeper ID: {value.playerId}
                </div>
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
                borderRadius: '8px',
                padding: '9px 12px',
                fontSize: '12px',
                cursor: disabled
                  ? 'not-allowed'
                  : 'pointer'
              }}
            >
              <X size={15} />
              Remove
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px'
        }}
      >
        <div
          style={{
            position: 'relative',
            flex: '1 1 200px'
          }}
        >
          <Search
            size={18}
            color="#9ca3af"
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none'
            }}
          />

          <input
            id={inputId}
            type="search"
            value={query}
            disabled={disabled}
            maxLength={100}
            autoComplete="off"
            placeholder="Search player name or ID..."
            onChange={event =>
              setQuery(event.target.value)
            }
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: '#030712',
              color: '#ffffff',
              border: '1px solid #4b5563',
              borderRadius: '8px',
              padding: '12px 12px 12px 40px',
              fontSize: '14px'
            }}
          />
        </div>

        <select
          aria-label="Filter player position"
          value={effectivePosition}
          disabled={disabled}
          onChange={event =>
            setPosition(event.target.value)
          }
          style={{
            background: '#030712',
            color: '#ffffff',
            border: '1px solid #4b5563',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '13px'
          }}
        >
          <option value="ALL">
            All positions
          </option>

          {allowedPositions.map(pos => (
            <option key={pos} value={pos}>
              {pos}
            </option>
          ))}
        </select>
      </div>

      <div aria-live="polite">
        {!disabled &&
          query.trim().length < 2 && (
            <p
              style={{
                color: '#9ca3af',
                fontSize: '13px'
              }}
            >
              Enter at least 2 characters
              to search.
            </p>
          )}

        {loading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#d4af37',
              padding: '20px 0',
              fontSize: '13px'
            }}
          >
            <LoaderCircle size={20} />
            Searching players...
          </div>
        )}

        {error && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: '#292211',
              color: '#fbbf24',
              border: '1px solid #92400e',
              borderRadius: '8px',
              padding: '14px',
              fontSize: '13px'
            }}
          >
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        {!loading &&
          !error &&
          searched &&
          results.length === 0 && (
            <div
              style={{
                padding: '28px 12px',
                textAlign: 'center',
                color: '#9ca3af'
              }}
            >
              <Search
                size={30}
                style={{
                  margin: '0 auto 12px'
                }}
              />

              <div>
                No matching players found
                in the returned results.
              </div>

              <p style={{ fontSize: '12px' }}>
                Try another name, player ID
                or position filter.
              </p>
            </div>
          )}

        {!loading &&
          !error &&
          searched &&
          results.length > 0 && (
            <>
              <div
                style={{
                  color: '#9ca3af',
                  fontSize: '12px',
                  marginBottom: '12px'
                }}
              >
                Showing {results.length} players
                {' · '}
                {totalMatches} search matches
                before local position filtering
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  maxHeight: '420px',
                  overflowY: 'auto'
                }}
              >
                {results.map(player => {
                  const isSelected =
                    value?.playerId ===
                    player.playerId;

                  return (
                    <button
                      key={player.playerId}
                      type="button"
                      disabled={disabled}
                      aria-pressed={isSelected}
                      onClick={() =>
                        selectPlayer(player)
                      }
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        width: '100%',
                        background: '#030712',
                        color: '#ffffff',
                        border: `1px solid ${
                          isSelected
                            ? '#d4af37'
                            : '#374151'
                        }`,
                        borderRadius: '10px',
                        padding: '12px',
                        textAlign: 'left',
                        cursor: disabled
                          ? 'not-allowed'
                          : 'pointer'
                      }}
                    >
                      <span
                        style={{
                          background: '#29251b',
                          color: '#d4af37',
                          width: '40px',
                          height: '40px',
                          flexShrink: 0,
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 800
                        }}
                      >
                        {player.position}
                      </span>

                      <span
                        style={{
                          flex: 1,
                          minWidth: 0
                        }}
                      >
                        <span
                          style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: 700,
                            marginBottom: '5px'
                          }}
                        >
                          {player.playerName}
                        </span>

                        <span
                          style={{
                            color: '#9ca3af',
                            fontSize: '11px',
                            lineHeight: 1.6
                          }}
                        >
                          {player.position}
                          {' · '}
                          {player.nflTeam ??
                            'No NFL Team'}
                          {' · ID: '}
                          {player.playerId}
                          {player.status
                            ? ` · ${player.status}`
                            : ''}
                        </span>
                      </span>

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
          borderTop: '1px solid #374151',
          marginTop: '20px',
          paddingTop: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#9ca3af',
          fontSize: '11px'
        }}
      >
        <Database size={14} />
        Powered by Sleeper
      </div>
    </section>
  );
}
