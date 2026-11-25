import { redirect } from 'next/navigation';
import Link from 'next/link';

import {
  Trophy,
  Landmark,
  ClipboardList,
  Settings,
  LayoutDashboard
} from 'lucide-react';

import { getAdminAuth } from '@/lib/admin/auth';
import { getAdminNavigation } from '@/lib/admin/navigation';

import {
  getAdminDashboardData
} from '@/lib/admin/dashboard';

import type {
  AdminDashboardData
} from '@/lib/admin/dashboard';

import AdminShell from './AdminShell';
import AdminDashboardOverview from './AdminDashboardOverview';
import LogoutButton from './LogoutButton';

export const dynamic = 'force-dynamic';

const moduleIcons = {
  dashboard: LayoutDashboard,
  trophy: Trophy,
  landmark: Landmark,
  clipboard: ClipboardList,
  settings: Settings
};

export default async function AdminPage() {
  const auth = await getAdminAuth();

  if (!auth.authorized) {
    if (auth.reason === 'unauthenticated') {
      redirect('/admin/login');
    }

    return (
      <main
        style={{
          maxWidth: '700px',
          margin: '60px auto',
          padding: '24px'
        }}
      >
        <h1>Access Denied</h1>

        <p>
          {auth.reason === 'verification_failed'
            ? 'Administrator permissions could not be verified. Please try again later.'
            : 'Your account does not have active XII-L administrator permissions.'}
        </p>

        <LogoutButton />

        <div style={{ marginTop: '24px' }}>
          <Link href="/">
            Return to Stats Portal
          </Link>
        </div>
      </main>
    );
  }

  const admin = auth.admin;

  let dashboardData: AdminDashboardData;

  try {
    dashboardData = await getAdminDashboardData();
  } catch {
    dashboardData = {
      stats: {
        publishedAwards: null,
        draftAwards: null,
        publishedHallOfFame: null,
        draftHallOfFame: null,
        auditRecords: null
      },
      recentActivity: [],
      databaseStatus: 'unavailable',
      activityAvailable: false,
      warnings: [
        'Dashboard data could not be loaded or administrator access could not be verified. Please refresh the page.'
      ],
      fetchedAt: new Date().toISOString()
    };
  }

  const modules = getAdminNavigation(admin.role)
    .filter(item => item.id !== 'dashboard');

  return (
    <AdminShell
      admin={admin}
      title="Dashboard"
      description={`Welcome, ${admin.displayName}. Manage the official XII-L Stats Portal from your commissioner workspace.`}
    >
      <AdminDashboardOverview data={dashboardData} />

      <section
        style={{
          marginBottom: '24px'
        }}
      >
        <h2
          style={{
            fontSize: '22px',
            margin: '0 0 8px'
          }}
        >
          Administration Modules
        </h2>

        <p
          style={{
            color: '#9ca3af',
            fontSize: '14px',
            margin: 0
          }}
        >
          Manage league awards, historical achievements
          and administrative activity.
        </p>
      </section>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
          gap: '20px'
        }}
      >
        {modules.map(module => {
          const Icon = moduleIcons[module.icon];

          return (
            <section
              key={module.id}
              style={{
                background: '#111827',
                color: '#ffffff',
                border: '1px solid #374151',
                borderRadius: '14px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div
                style={{
                  background: 'rgba(212, 175, 55, 0.12)',
                  color: '#d4af37',
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Icon size={24} />
              </div>

              <h2
                style={{
                  fontSize: '19px',
                  margin: 0
                }}
              >
                {module.label}
              </h2>

              <p
                style={{
                  color: '#9ca3af',
                  fontSize: '14px',
                  lineHeight: 1.6,
                  margin: 0,
                  flex: 1
                }}
              >
                {module.description}
              </p>

              <div
                style={{
                  borderTop: '1px solid #374151',
                  paddingTop: '14px',
                  marginTop: '8px'
                }}
              >
                {module.enabled ? (
                  <Link
                    href={module.href}
                    style={{
                      color: '#d4af37',
                      fontSize: '13px',
                      fontWeight: 700,
                      textDecoration: 'none'
                    }}
                  >
                    Open Module →
                  </Link>
                ) : (
                  <span
                    style={{
                      color: '#d4af37',
                      fontSize: '11px',
                      fontWeight: 800,
                      letterSpacing: '1px'
                    }}
                  >
                    COMING SOON
                  </span>
                )}
              </div>
            </section>
          );
        })}
      </div>

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
        <h2
          style={{
            fontSize: '19px',
            margin: '0 0 16px'
          }}
        >
          Admin Center Status
        </h2>

        <p
          style={{
            color: '#86efac',
            fontSize: '14px'
          }}
        >
          ✓ Authentication verified
        </p>

        <p
          style={{
            color: '#86efac',
            fontSize: '14px'
          }}
        >
          ✓ Administrator permissions verified
        </p>

        <p
          style={{
            color: '#86efac',
            fontSize: '14px'
          }}
        >
          ✓ Admin navigation initialized
        </p>

        <p
          style={{
            color:
              dashboardData.databaseStatus === 'connected'
                ? '#86efac'
                : dashboardData.databaseStatus === 'degraded'
                  ? '#fbbf24'
                  : '#f87171',
            fontSize: '14px'
          }}
        >
          {dashboardData.databaseStatus === 'connected'
            ? '✓ Dashboard database queries successful'
            : dashboardData.databaseStatus === 'degraded'
              ? '⚠ Some dashboard queries failed'
              : '✕ Dashboard data unavailable'}
        </p>

        <p
          style={{
            color: '#9ca3af',
            fontSize: '13px',
            lineHeight: 1.6,
            marginBottom: 0
          }}
        >
          Additional administration modules will become
          available as development progresses.
        </p>
      </section>
    </AdminShell>
  );
}
