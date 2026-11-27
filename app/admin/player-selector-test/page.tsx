import { redirect } from 'next/navigation';
import Link from 'next/link';

import { getAdminAuth } from '@/lib/admin/auth';

import AdminShell from '../AdminShell';
import LogoutButton from '../LogoutButton';
import PlayerSelectorTest from './PlayerSelectorTest';

export const dynamic = 'force-dynamic';

export default async function PlayerSelectorTestPage() {
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

  return (
    <AdminShell
      admin={auth.admin}
      title="Player Selector Test"
      description="Temporary development environment for testing the XII-L Admin Player Selector."
    >
      <div style={{ marginBottom: '24px' }}>
        <Link
          href="/admin"
          style={{
            color: '#d4af37',
            fontSize: '13px',
            fontWeight: 700,
            textDecoration: 'none'
          }}
        >
          ← Back to Admin Dashboard
        </Link>
      </div>

      <PlayerSelectorTest />
    </AdminShell>
  );
}
