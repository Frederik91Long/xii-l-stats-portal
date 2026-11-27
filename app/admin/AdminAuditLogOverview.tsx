'use client';

import {
  useEffect,
  useState
} from 'react';

import type {
  CSSProperties
} from 'react';

import {
  Activity,
  PlusCircle,
  Pencil,
  CheckCircle2,
  EyeOff,
  Trash2,
  Trophy,
  Landmark,
  ClipboardList,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Loader2
} from 'lucide-react';

import type {
  AuditAction,
  AuditActionFilter,
  AuditTableFilter,
  AuditLogEntry,
  AuditLogResult,
  AuditLogSummary
} from '@/lib/admin/audit';

type Props = {
  onSelectEntry?: (
    entry: AuditLogEntry
  ) => void;
};

const GOLD = '#d4af37';

const ACTION_LABELS: Record<
  AuditAction,
  string
> = {
  created: 'Created',
  updated: 'Updated',
  published: 'Published',
  unpublished: 'Unpublished',
  deleted: 'Deleted'
};

const ACTION_COLORS: Record<
  AuditAction,
  string
> = {
  created: GOLD,
  updated: '#93c5fd',
  published: '#86efac',
  unpublished: '#fbbf24',
  deleted: '#f87171'
};

const panelStyle: CSSProperties = {
  background: '#111827',
  border: '1px solid #374151',
  borderRadius: '14px',
  padding: '22px',
  color: '#ffffff'
};

const selectStyle: CSSProperties = {
  background: '#030712',
  color: '#ffffff',
  border: '1px solid #4b5563',
  borderRadius: '8px',
  padding: '11px 12px',
  width: '100%',
  fontSize: '13px'
};

const buttonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  background: '#030712',
  color: GOLD,
  border: '1px solid #4b5563',
  borderRadius: '8px',
  padding: '10px 14px',
  cursor: 'pointer',
  fontSize: '13px'
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return new Intl.DateTimeFormat(
    'en-GB',
    {
      timeZone: 'Europe/Brussels',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    }
  ).format(date);
}

function getActionIcon(
  action: AuditAction
) {
  switch (action) {
    case 'created':
      return PlusCircle;

    case 'updated':
      return Pencil;

    case 'published':
      return CheckCircle2;

    case 'unpublished':
      return EyeOff;

    case 'deleted':
      return Trash2;
  }
}

export default function AdminAuditLogOverview({
  onSelectEntry
}: Props) {
  const [action, setAction] =
    useState<AuditActionFilter>('ALL');

  const [table, setTable] =
    useState<AuditTableFilter>('ALL');

  const [page, setPage] =
    useState(1);

  const [pageSize, setPageSize] =
    useState(25);

  const [refreshKey, setRefreshKey] =
    useState(0);

  const [result, setResult] =
    useState<AuditLogResult | null>(null);

  const [summary, setSummary] =
    useState<AuditLogSummary | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [summaryLoading, setSummaryLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [summaryError, setSummaryError] =
    useState<string | null>(null);

  // Load global audit statistics.

  useEffect(() => {
    const controller =
      new AbortController();

    let active = true;

    async function loadSummary() {
      setSummaryLoading(true);
      setSummaryError(null);
      setSummary(null);

      try {
        const response = await fetch(
          '/api/admin/audit?summary=true',
          {
            cache: 'no-store',
            signal: controller.signal
          }
        );

        const data = await response.json();

        if (
          !response.ok ||
          data.success !== true ||
          data.mode !== 'summary' ||
          !data.summary
        ) {
          throw new Error(
            data.error ??
            'Audit statistics could not be loaded.'
          );
        }

        if (active) {
          setSummary(data.summary);
        }

      } catch (error) {
        if (
          active &&
          !controller.signal.aborted
        ) {
          setSummaryError(
            error instanceof Error
              ? error.message
              : 'Unable to load audit statistics.'
          );
        }
      } finally {
        if (active) {
          setSummaryLoading(false);
        }
      }
    }

    loadSummary();

    return () => {
      active = false;
      controller.abort();
    };

  }, [refreshKey]);

  // Load filtered audit records.

  useEffect(() => {
    const controller =
      new AbortController();

    let active = true;

    async function loadEntries() {
      setLoading(true);
      setError(null);
      setResult(null);

      try {
        const params =
          new URLSearchParams({
            action,
            table,
            page: String(page),
            pageSize: String(pageSize)
          });

        const response = await fetch(
          `/api/admin/audit?${params.toString()}`,
          {
            cache: 'no-store',
            signal: controller.signal
          }
        );

        const data = await response.json();

        if (
          !response.ok ||
          data.success !== true ||
          data.mode !== 'list' ||
          !Array.isArray(data.entries) ||
          !data.pagination
        ) {
          throw new Error(
            data.error ??
            'Audit records could not be loaded.'
          );
        }

        if (!active) {
          return;
        }

        const lastPage = Math.max(
          1,
          data.pagination.totalPages
        );

        if (page > lastPage) {
          setPage(lastPage);
          return;
        }

        setResult(data);

      } catch (error) {
        if (
          active &&
          !controller.signal.aborted
        ) {
          setError(
            error instanceof Error
              ? error.message
              : 'Unable to load audit records.'
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadEntries();

    return () => {
      active = false;
      controller.abort();
    };

  }, [
    action,
    table,
    page,
    pageSize,
    refreshKey
  ]);

  function refresh() {
    setRefreshKey(
      previous => previous + 1
    );
  }

  function clearFilters() {
    setAction('ALL');
    setTable('ALL');
    setPage(1);
  }

  const statistics = [
    {
      label: 'Total Events',
      value: summary?.totalEvents,
      icon: Activity,
      color: GOLD
    },
    {
      label: 'Created',
      value: summary?.created,
      icon: PlusCircle,
      color: GOLD
    },
    {
      label: 'Updated',
      value: summary?.updated,
      icon: Pencil,
      color: '#93c5fd'
    },
    {
      label: 'Published',
      value: summary?.published,
      icon: CheckCircle2,
      color: '#86efac'
    },
    {
      label: 'Unpublished',
      value: summary?.unpublished,
      icon: EyeOff,
      color: '#fbbf24'
    },
    {
      label: 'Deleted',
      value: summary?.deleted,
      icon: Trash2,
      color: '#f87171'
    },
    {
      label: 'Season Awards',
      value: summary?.seasonAwards,
      icon: Trophy,
      color: GOLD
    },
    {
      label: 'Hall of Fame',
      value: summary?.hallOfFame,
      icon: Landmark,
      color: GOLD
    }
  ];

  const pagination =
    result?.pagination;

  const firstRecord =
    pagination &&
    pagination.totalEntries > 0
      ? (pagination.page - 1) *
        pagination.pageSize + 1
      : 0;

  const lastRecord =
    pagination
      ? Math.min(
          pagination.page *
          pagination.pageSize,
          pagination.totalEntries
        )
      : 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}
    >
      {/* Header */}

      <section style={panelStyle}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <ClipboardList
                color={GOLD}
                size={26}
              />

              <h2
                style={{
                  margin: 0,
                  fontSize: '21px'
                }}
              >
                Audit Log Overview
              </h2>
            </div>

            <p
              style={{
                color: '#9ca3af',
                fontSize: '13px',
                lineHeight: 1.7
              }}
            >
              Monitor administrative changes
              across Season Awards and the
              XII-L Hall of Fame.
            </p>
          </div>

          <button
            type="button"
            style={{
              ...buttonStyle,
              opacity:
                loading || summaryLoading
                  ? 0.5
                  : 1
            }}
            onClick={refresh}
            disabled={
              loading || summaryLoading
            }
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        <div
          style={{
            color: '#9ca3af',
            fontSize: '12px'
          }}
        >
          All timestamps use
          Europe/Brussels time.
        </div>
      </section>

      {/* Global statistics */}

      <section>
        <h3
          style={{
            fontSize: '16px',
            color: GOLD,
            margin: '0 0 14px'
          }}
        >
          Global Audit Statistics
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '14px'
          }}
        >
          {statistics.map(stat => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                style={{
                  ...panelStyle,
                  padding: '18px'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#9ca3af',
                    fontSize: '12px'
                  }}
                >
                  {stat.label}

                  <Icon
                    size={18}
                    color={stat.color}
                  />
                </div>

                <div
                  style={{
                    marginTop: '14px',
                    fontSize: '28px',
                    fontWeight: 800,
                    color: stat.color
                  }}
                >
                  {summaryLoading
                    ? '...'
                    : stat.value ?? '—'}
                </div>
              </div>
            );
          })}
        </div>

        {summaryError && (
          <div
            role="alert"
            style={{
              marginTop: '14px',
              color: '#fca5a5',
              fontSize: '13px'
            }}
          >
            {summaryError}
          </div>
        )}
      </section>

      {/* Filters and activity history */}

      <section style={panelStyle}>
        <h3
          style={{
            fontSize: '18px',
            marginTop: 0
          }}
        >
          Activity History
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '14px'
          }}
        >
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontSize: '12px',
              color: '#9ca3af'
            }}
          >
            Action

            <select
              style={selectStyle}
              value={action}
              onChange={event => {
                setAction(
                  event.target.value
                    as AuditActionFilter
                );

                setPage(1);
              }}
            >
              <option value="ALL">
                All actions
              </option>

              <option value="created">
                Created
              </option>

              <option value="updated">
                Updated
              </option>

              <option value="published">
                Published
              </option>

              <option value="unpublished">
                Unpublished
              </option>

              <option value="deleted">
                Deleted
              </option>
            </select>
          </label>

          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontSize: '12px',
              color: '#9ca3af'
            }}
          >
            Module

            <select
              style={selectStyle}
              value={table}
              onChange={event => {
                setTable(
                  event.target.value
                    as AuditTableFilter
                );

                setPage(1);
              }}
            >
              <option value="ALL">
                All modules
              </option>

              <option value="season_awards">
                Season Awards
              </option>

              <option value="hall_of_fame">
                Hall of Fame
              </option>
            </select>
          </label>

          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontSize: '12px',
              color: '#9ca3af'
            }}
          >
            Records per page

            <select
              style={selectStyle}
              value={pageSize}
              onChange={event => {
                setPageSize(
                  Number(event.target.value)
                );

                setPage(1);
              }}
            >
              {[10, 25, 50, 100].map(size => (
                <option
                  key={size}
                  value={size}
                >
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            margin: '16px 0'
          }}
        >
          <button
            type="button"
            style={buttonStyle}
            onClick={clearFilters}
          >
            Clear filters
          </button>
        </div>

        {/* Loading */}

        {loading && (
          <div
            role="status"
            style={{
              padding: '48px 20px',
              textAlign: 'center',
              color: '#9ca3af'
            }}
          >
            <Loader2
              size={28}
              color={GOLD}
            />

            <p>Loading audit records...</p>
          </div>
        )}

        {/* Error */}

        {!loading && error && (
          <div
            role="alert"
            style={{
              padding: '24px',
              background: '#2b1117',
              border: '1px solid #7f1d1d',
              borderRadius: '10px',
              color: '#fca5a5'
            }}
          >
            <AlertTriangle size={24} />

            <p>{error}</p>

            <button
              type="button"
              style={buttonStyle}
              onClick={refresh}
            >
              <RefreshCw size={15} />
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}

        {!loading &&
          !error &&
          result &&
          result.entries.length === 0 && (
            <div
              style={{
                padding: '48px 20px',
                textAlign: 'center',
                border: '1px dashed #374151',
                borderRadius: '12px'
              }}
            >
              <ClipboardList
                size={42}
                color="#6b7280"
              />

              <h4>
                No audit records found
              </h4>

              <p
                style={{
                  color: '#9ca3af',
                  fontSize: '13px',
                  lineHeight: 1.7
                }}
              >
                {action !== 'ALL' ||
                table !== 'ALL'
                  ? 'No administrative changes match the selected filters.'
                  : 'Administrative changes will appear here automatically.'}
              </p>
            </div>
          )}

        {/* Audit records */}

        {!loading &&
          !error &&
          result &&
          result.entries.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              {result.entries.map(entry => {
                const Icon =
                  getActionIcon(entry.action);

                const color =
                  ACTION_COLORS[entry.action];

                return (
                  <article
                    key={entry.id}
                    style={{
                      background: '#030712',
                      border: '1px solid #374151',
                      borderRadius: '10px',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '14px'
                    }}
                  >
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        flexShrink: 0,
                        borderRadius: '10px',
                        background: '#1f2937',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Icon
                        size={21}
                        color={color}
                      />
                    </div>

                    <div
                      style={{
                        flex: 1,
                        minWidth: 0
                      }}
                    >
                      <div
                        style={{
                          color,
                          fontSize: '11px',
                          fontWeight: 800,
                          letterSpacing: '0.5px'
                        }}
                      >
                        {ACTION_LABELS[
                          entry.action
                        ].toUpperCase()}
                      </div>

                      <h4
                        style={{
                          margin: '7px 0',
                          fontSize: '15px',
                          overflowWrap: 'anywhere'
                        }}
                      >
                        {entry.recordName}
                      </h4>

                      <div
                        style={{
                          color: GOLD,
                          fontSize: '12px'
                        }}
                      >
                        {entry.moduleName}

                        {entry.season
                          ? ` · ${entry.season}`
                          : ''}
                      </div>

                      <div
                        style={{
                          color: '#9ca3af',
                          fontSize: '12px',
                          marginTop: '10px',
                          lineHeight: 1.8,
                          overflowWrap: 'anywhere'
                        }}
                      >
                        Administrator:{' '}

                        {entry.administratorName ??
                          entry.performedBy ??
                          'Unknown actor'}

                        <br />

                        {formatDate(
                          entry.createdAt
                        )}
                      </div>

                      {onSelectEntry && (
                        <button
                          type="button"
                          style={{
                            ...buttonStyle,
                            marginTop: '12px'
                          }}
                          onClick={() =>
                            onSelectEntry(entry)
                          }
                        >
                          View details
                          <ChevronRight size={15} />
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

        {/* Pagination */}

        {!loading &&
          !error &&
          pagination && (
            <div
              style={{
                borderTop:
                  '1px solid #374151',
                marginTop: '24px',
                paddingTop: '18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '14px'
              }}
            >
              <span
                style={{
                  color: '#9ca3af',
                  fontSize: '12px'
                }}
              >
                {pagination.totalEntries === 0
                  ? '0 records'
                  : `Showing ${firstRecord}–${lastRecord} of ${pagination.totalEntries} records`}
              </span>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={
                    !pagination.hasPreviousPage
                  }
                  onClick={() =>
                    setPage(previous =>
                      Math.max(1, previous - 1)
                    )
                  }
                  style={{
                    ...buttonStyle,
                    opacity:
                      pagination.hasPreviousPage
                        ? 1
                        : 0.35
                  }}
                >
                  <ChevronLeft size={16} />
                </button>

                <span
                  style={{
                    fontSize: '12px'
                  }}
                >
                  Page {pagination.page} of{' '}
                  {Math.max(
                    1,
                    pagination.totalPages
                  )}
                </span>

                <button
                  type="button"
                  aria-label="Next page"
                  disabled={
                    !pagination.hasNextPage
                  }
                  onClick={() =>
                    setPage(previous =>
                      previous + 1
                    )
                  }
                  style={{
                    ...buttonStyle,
                    opacity:
                      pagination.hasNextPage
                        ? 1
                        : 0.35
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

        {result && (
          <div
            style={{
              color: '#6b7280',
              fontSize: '11px',
              marginTop: '18px'
            }}
          >
            Last fetched:{' '}
            {formatDate(result.fetchedAt)}
            {' · '}
            Source: XII-L Audit Log
          </div>
        )}
      </section>

      {/* Read-only information */}

      <section
        style={{
          ...panelStyle,
          background: '#1c1a12',
          border: '1px solid #66521e',
          color: '#d4af37',
          fontSize: '13px',
          lineHeight: 1.8
        }}
      >
        <strong>Read-only Audit Trail</strong>

        <div>
          Audit records are generated
          automatically when Season Awards
          or Hall of Fame records are changed.
          Records cannot be edited or deleted
          through this interface.
        </div>
      </section>
    </div>
  );
}
