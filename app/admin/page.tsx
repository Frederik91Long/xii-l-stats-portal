import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminAuth } from '@/lib/admin/auth';
import LogoutButton from './LogoutButton';

export const dynamic = 'force-dynamic';

const modules = [
  {
    title: 'Season Awards',
    description: 'Manage official XII-L season awards.',
    icon: '🏆'
  },
  {
    title: 'Hall of Fame',
    description: 'Manage inductees and career achievements.',
    icon: '🏛️'
  },
  {
    title: 'Audit Log',
    description: 'Review administrative activity and changes.',
    icon: '📋'
  },
  {
    title: 'League Management',
    description: 'Future league administration tools.',
    icon: '⚙️'
  }
];

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
          <Link href="/">Return to Stats Portal</Link>
        </div>
      </main>
    );
  }

  const admin = auth.admin;

  return (
    <main
      style={{
        maxWidth: '1200px',
        margin: '40px auto',
        padding: '24px'
      }}
    >
      <section
        style={{
          background: '#111827',
          color: '#ffffff',
          border: '1px solid #374151',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '28px'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '20px'
          }}
        >
          <div>
            <div
              style={{
                color: '#d4af37',
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '2px'
              }}
            >
              XII-L COMMISSIONER ACCESS
            </div>

            <h1 style={{ margin: '12px 0' }}>
              Admin Center
            </h1>

            <p style={{ color: '#9ca3af' }}>
              Welcome, {admin.displayName}.
            </p>

            <span
              style={{
                display: 'inline-block',
                background: '#d4af37',
                color: '#111827',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700
              }}
            >
              {admin.role === 'super_admin'
                ? 'SUPER ADMIN'
                : 'ADMIN'}
            </span>
          </div>

          <LogoutButton />
        </div>

        <p
          style={{
            color: '#86efac',
            marginTop: '20px'
          }}
        >
          Authenticated · Administrator access verified
        </p>
      </section>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px'
        }}
      >
        {modules.map(module => (
          <section
            key={module.title}
            style={{
              background: '#111827',
              color: '#ffffff',
              border: '1px solid #374151',
              borderRadius: '12px',
              padding: '24px'
            }}
          >
            <div style={{ fontSize: '30px' }}>
              {module.icon}
            </div>

            <h2 style={{ fontSize: '20px' }}>
              {module.title}
            </h2>

            <p style={{ color: '#9ca3af' }}>
              {module.description}
            </p>

            <span
              style={{
                color: '#d4af37',
                fontSize: '12px',
                fontWeight: 700
              }}
            >
              COMING SOON
            </span>
          </section>
        ))}
      </div>

      <div style={{ marginTop: '32px' }}>
        <Link href="/">
          Return to XII-L Stats Portal
        </Link>
      </div>
    </main>
  );
}
