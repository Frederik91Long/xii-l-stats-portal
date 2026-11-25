import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import {
  Trophy,
  AlertTriangle,
  Clock
} from 'lucide-react';

import { getAdminAuth } from '@/lib/admin/auth';

import {
  resolveAdminSeason,
  getAdminSeasonError
} from '@/lib/admin/seasons';

import { getSeasonAwards } from '@/lib/awards';
import { CURRENT_SEASON } from '@/lib/seasons';

import AdminShell from '../AdminShell';
import AdminSeasonSelector from '../AdminSeasonSelector';
import LogoutButton from '../LogoutButton';

export const dynamic = 'force-dynamic';

type SeasonAwardsPageProps = {
  searchParams: Promise<{
    season?: string | string[];
  }>;
};

export default async function AdminSeasonAwardsPage({
  searchParams
}: SeasonAwardsPageProps) {
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

  const params = await searchParams;

  const validation = resolveAdminSeason(
    params.season
  );

  if (!validation.valid) {
    return (
      <AdminShell
        admin={auth.admin}
        title="Season Awards"
        description="Manage official XII-L season awards."
      >
        <section
          role="alert"
          style={{
            background: '#111827',
            color: '#ffffff',
            border: '1px solid #92400e',
            borderRadius: '14px',
            padding: '28px'
          }}
        >
          <AlertTriangle
            size={32}
            color="#fbbf24"
          />

          <h2 style={{ color: '#fbbf24' }}>
            Invalid Season
          </h2>

          <p style={{ color: '#9ca3af' }}>
            {getAdminSeasonError(validation.reason)}
          </p>

          <Link
            href={`/admin/awards?season=${CURRENT_SEASON}`}
            style={{
              display: 'inline-block',
              background: '#d4af37',
              color: '#111827',
              borderRadius: '8px',
              padding: '12px 18px',
              fontWeight: 700,
              textDecoration: 'none',
              marginTop: '12px'
            }}
          >
            Return to Current Season
          </Link>
        </section>
      </AdminShell>
    );
  }

  const season = validation.season;
  const awards = getSeasonAwards();

  return (
    <AdminShell
      admin={auth.admin}
      title="Season Awards"
      description="Manage official XII-L season awards."
    >
      <Suspense
        fallback={
          <p style={{ color: '#9ca3af' }}>
            Loading season selector...
          </p>
        }
      >
        <AdminSeasonSelector
          selectedSeason={season.year}
        />
      </Suspense>

      <section style={{ marginBottom: '24px' }}>
        <h2
          style={{
            fontSize: '22px',
            margin: '0 0 8px'
          }}
        >
          {season.year} Season Awards
        </h2>

        <p
          style={{
            color: '#9ca3af',
            fontSize: '14px',
            margin: 0
          }}
        >
          Official award categories for the selected
          XII-L season.
        </p>
      </section>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
          gap: '16px'
        }}
      >
        {awards.map(award => (
          <section
            key={award.id}
            style={{
              background: '#111827',
              color: '#ffffff',
              border: '1px solid #374151',
              borderRadius: '14px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background:
                    'rgba(212, 175, 55, 0.12)',
                  color: '#d4af37',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Trophy size={24} />
              </div>

              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  letterSpacing: '1px',
                  color:
                    award.selection === 'automatic'
                      ? '#60a5fa'
                      : '#d4af37'
                }}
              >
                {award.selection === 'automatic'
                  ? 'AUTOMATIC'
                  : 'MANUAL'}
              </span>
            </div>

            <h3
              style={{
                fontSize: '18px',
                margin: 0
              }}
            >
              {award.name}
            </h3>

            <p
              style={{
                color: '#9ca3af',
                fontSize: '13px',
                lineHeight: 1.6,
                margin: 0,
                flex: 1
              }}
            >
              {award.description}
            </p>

            <div
              style={{
                borderTop: '1px solid #374151',
                paddingTop: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <span
                style={{
                  color: '#9ca3af',
                  fontSize: '12px'
                }}
              >
                {season.year} Season
              </span>

              <span
                style={{
                  color: '#d4af37',
                  fontSize: '10px',
                  fontWeight: 800
                }}
              >
                COMING SOON
              </span>
            </div>
          </section>
        ))}
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <Clock size={22} color="#d4af37" />

          <h2
            style={{
              fontSize: '18px',
              margin: 0
            }}
          >
            Season Awards Management
          </h2>
        </div>

        <p
          style={{
            color: '#9ca3af',
            fontSize: '14px',
            lineHeight: 1.7,
            marginBottom: 0
          }}
        >
          Award assignment, draft management,
          publication and editing will become
          available in a future development phase.
        </p>
      </section>
    </AdminShell>
  );
}
