import type { ReactNode } from 'react';
import type { AdminProfile } from '@/lib/admin/auth';

import AdminSidebar from './AdminSidebar';
import LogoutButton from './LogoutButton';

type AdminShellProps = {
  admin: AdminProfile;
  title: string;
  description?: string;
  children: ReactNode;
};

export default function AdminShell({
  admin,
  title,
  description,
  children
}: AdminShellProps) {
  return (
    <main
      style={{
        maxWidth: '1600px',
        margin: '0 auto',
        padding: '24px',
        boxSizing: 'border-box',
        minHeight: '75vh'
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          gap: '24px'
        }}
      >
        <div
          style={{
            flex: '1 1 260px',
            minWidth: 0
          }}
        >
          <AdminSidebar
            displayName={admin.displayName}
            role={admin.role}
          />
        </div>

        <div
          style={{
            flex: '4 1 650px',
            minWidth: 0
          }}
        >
          <header
            style={{
              background: '#111827',
              color: '#ffffff',
              border: '1px solid #374151',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px'
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
              <div style={{ flex: '1 1 240px' }}>
                <div
                  style={{
                    color: '#d4af37',
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '2px',
                    marginBottom: '12px'
                  }}
                >
                  XII-L COMMISSIONER WORKSPACE
                </div>

                <h1
                  style={{
                    fontSize: '30px',
                    fontWeight: 800,
                    margin: '0 0 10px'
                  }}
                >
                  {title}
                </h1>

                {description && (
                  <p
                    style={{
                      color: '#9ca3af',
                      fontSize: '14px',
                      lineHeight: 1.6,
                      margin: 0
                    }}
                  >
                    {description}
                  </p>
                )}
              </div>

              <LogoutButton />
            </div>

            <div
              style={{
                borderTop: '1px solid #374151',
                marginTop: '20px',
                paddingTop: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#22c55e',
                  display: 'inline-block'
                }}
              />

              <span
                style={{
                  color: '#86efac',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                Authenticated · Administrator access verified
              </span>
            </div>
          </header>

          <div style={{ minWidth: 0 }}>
            {children}
          </div>

          <footer
            style={{
              marginTop: '32px',
              padding: '20px 0',
              borderTop: '1px solid #374151',
              color: '#6b7280',
              fontSize: '12px',
              textAlign: 'center'
            }}
          >
            XII-L Admin Center · Commissioner Workspace
          </footer>
        </div>
      </div>
    </main>
  );
}
