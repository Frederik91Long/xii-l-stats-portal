import {
  Trophy,
  FilePen,
  Landmark,
  Users,
  ClipboardList,
  Database,
  History,
  AlertTriangle
} from 'lucide-react';

import type {
  AdminDashboardData,
  AdminActivity
} from '@/lib/admin/dashboard';

type AdminDashboardOverviewProps = {
  data: AdminDashboardData;
};

const actionLabels: Record<
  AdminActivity['action'],
  string
> = {
  created: 'Created',
  updated: 'Updated',
  published: 'Published',
  unpublished: 'Unpublished',
  deleted: 'Deleted'
};

const actionColors: Record<
  AdminActivity['action'],
  string
> = {
  created: '#60a5fa',
  updated: '#fbbf24',
  published: '#86efac',
  unpublished: '#fb923c',
  deleted: '#f87171'
};

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Brussels'
  }).format(date);
}

export default function AdminDashboardOverview({
  data
}: AdminDashboardOverviewProps) {
  const { stats } = data;

  const statusLabels = {
    connected: 'Connected',
    degraded: 'Degraded',
    unavailable: 'Unavailable'
  };

  const statusColors = {
    connected: '#86efac',
    degraded: '#fbbf24',
    unavailable: '#f87171'
  };

  const cards = [
    {
      label: 'Published Season Awards',
      value: stats.publishedAwards,
      description: 'Officially published awards',
      icon: Trophy,
      color: '#d4af37'
    },
    {
      label: 'Season Award Drafts',
      value: stats.draftAwards,
      description: 'Awaiting publication',
      icon: FilePen,
      color: '#60a5fa'
    },
    {
      label: 'Hall of Fame Inductees',
      value: stats.publishedHallOfFame,
      description: 'Officially inducted members',
      icon: Landmark,
      color: '#d4af37'
    },
    {
      label: 'Hall of Fame Drafts',
      value: stats.draftHallOfFame,
      description: 'Pending inductions',
      icon: Users,
      color: '#60a5fa'
    },
    {
      label: 'Audit Records',
      value: stats.auditRecords,
      description: 'Recorded administrative actions',
      icon: ClipboardList,
      color: '#a78bfa'
    },
    {
      label: 'Database Status',
      value: statusLabels[data.databaseStatus],
      description: 'Dashboard database queries',
      icon: Database,
      color: statusColors[data.databaseStatus]
    }
  ];

  return (
    <section style={{ marginBottom: '32px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2
          style={{
            fontSize: '22px',
            margin: '0 0 8px'
          }}
        >
          Dashboard Overview
        </h2>

        <p
          style={{
            color: '#9ca3af',
            fontSize: '14px',
            margin: 0
          }}
        >
          Administration statistics across all XII-L seasons.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(min(100%, 210px), 1fr))',
          gap: '16px'
        }}
      >
        {cards.map(card => {
          const Icon = card.icon;

          return (
            <section
              key={card.label}
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
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '12px',
                  marginBottom: '16px'
                }}
              >
                <div
                  style={{
                    color: '#9ca3af',
                    fontSize: '13px',
                    fontWeight: 600,
                    lineHeight: 1.5
                  }}
                >
                  {card.label}
                </div>

                <div style={{ color: card.color }}>
                  <Icon size={22} />
                </div>
              </div>

              <div
                style={{
                  fontSize:
                    typeof card.value === 'string'
                      ? '23px'
                      : '34px',
                  fontWeight: 800,
                  color: card.color,
                  marginBottom: '8px',
                  fontVariantNumeric: 'tabular-nums'
                }}
              >
                {card.value === null
                  ? '—'
                  : typeof card.value === 'number'
                    ? card.value.toLocaleString('en-GB')
                    : card.value}
              </div>

              <div
                style={{
                  color: '#9ca3af',
                  fontSize: '12px',
                  lineHeight: 1.5
                }}
              >
                {card.value === null
                  ? 'Data unavailable'
                  : card.description}
              </div>
            </section>
          );
        })}
      </div>

      {data.warnings.length > 0 && (
        <section
          role="alert"
          style={{
            background: '#292211',
            border: '1px solid #92400e',
            borderRadius: '12px',
            padding: '18px',
            marginTop: '20px',
            color: '#fbbf24'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontWeight: 700
            }}
          >
            <AlertTriangle size={20} />
            Dashboard Data Warning
          </div>

          <ul
            style={{
              marginBottom: 0,
              paddingLeft: '24px',
              fontSize: '13px',
              lineHeight: 1.8
            }}
          >
            {data.warnings.map(warning => (
              <li key={warning}>
                {warning}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section
        style={{
          background: '#111827',
          color: '#ffffff',
          border: '1px solid #374151',
          borderRadius: '14px',
          padding: '24px',
          marginTop: '24px'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <History size={22} color="#d4af37" />

          <h2
            style={{
              fontSize: '19px',
              margin: 0
            }}
          >
            Recent Administrative Activity
          </h2>
        </div>

        <p
          style={{
            color: '#9ca3af',
            fontSize: '13px',
            marginBottom: '24px'
          }}
        >
          Latest changes across Season Awards and Hall of Fame.
        </p>

        {!data.activityAvailable ? (
          <div
            style={{
              padding: '32px 12px',
              textAlign: 'center',
              color: '#fbbf24'
            }}
          >
            Administrative activity is currently unavailable.
          </div>
        ) : data.recentActivity.length === 0 ? (
          <div
            style={{
              padding: '40px 12px',
              textAlign: 'center',
              borderTop: '1px solid #374151'
            }}
          >
            <History
              size={36}
              color="#6b7280"
              style={{ margin: '0 auto 12px' }}
            />

            <div
              style={{
                fontWeight: 600,
                marginBottom: '8px'
              }}
            >
              No recent activity
            </div>

            <div
              style={{
                color: '#9ca3af',
                fontSize: '13px'
              }}
            >
              Administrative changes will appear here
              automatically.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                minWidth: '560px',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '13px'
              }}
            >
              <thead>
                <tr
                  style={{
                    color: '#9ca3af',
                    borderBottom: '1px solid #374151'
                  }}
                >
                  {[
                    'Action',
                    'Module',
                    'Recipient',
                    'Date & Time'
                  ].map(label => (
                    <th
                      key={label}
                      scope="col"
                      style={{
                        padding: '12px 10px',
                        fontWeight: 600
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {data.recentActivity.map(activity => (
                  <tr
                    key={activity.id}
                    style={{
                      borderBottom: '1px solid #374151'
                    }}
                  >
                    <td
                      style={{
                        padding: '14px 10px',
                        color: actionColors[activity.action],
                        fontWeight: 700
                      }}
                    >
                      {actionLabels[activity.action]}
                    </td>

                    <td style={{ padding: '14px 10px' }}>
                      {activity.tableName === 'season_awards'
                        ? 'Season Awards'
                        : 'Hall of Fame'}
                    </td>

                    <td style={{ padding: '14px 10px' }}>
                      {activity.recipientName ?? '—'}
                    </td>

                    <td
                      style={{
                        padding: '14px 10px',
                        color: '#9ca3af',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {formatDate(activity.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div
        style={{
          marginTop: '16px',
          color: '#9ca3af',
          fontSize: '11px',
          textAlign: 'right'
        }}
      >
        Last updated: {formatDate(data.fetchedAt)}
        {' · Europe/Brussels'}
      </div>
    </section>
  );
}
