import { redirect } from 'next/navigation';
import Link from 'next/link';

import { getAdminAuth } from '@/lib/admin/auth';

import AdminShell from '../AdminShell';
import LogoutButton from '../LogoutButton';
import GMSelectorTest from './GMSelectorTest';

export const dynamic = 'force-dynamic';

export default async function AdminGMSelectorTestPage() {
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
      title="GM Selector Test"
      description="Temporary development environment for testing the official XII-L General Manager Selector."
    >
      <GMSelectorTest />
    </AdminShell>
  );
}
