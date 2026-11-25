'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  LayoutDashboard,
  Trophy,
  Landmark,
  ClipboardList,
  Settings,
  ExternalLink,
  Lock
} from 'lucide-react';

import {
  getAdminNavigation
} from '@/lib/admin/navigation';

import type {
  AdminNavigationIcon
} from '@/lib/admin/navigation';

const navigationIcons = {
  dashboard: LayoutDashboard,
  trophy: Trophy,
  landmark: Landmark,
  clipboard: ClipboardList,
  settings: Settings
};

type AdminSidebarProps = {
  displayName: string;
  role: 'admin' | 'super_admin';
};

export default function AdminSidebar({
  displayName,
  role
}: AdminSidebarProps) {
  const pathname = usePathname();
  const navigation = getAdminNavigation(role);

  return (
    <aside
      style={{
        background: '#111827',
        color: '#ffffff',
        border: '1px solid #374151',
        borderRadius: '16px',
        padding: '20px',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px'
        }}
      >
        <div
          style={{
            background: '#d4af37',
            color: '#111827',
            borderRadius: '10px',
            padding: '12px',
            fontSize: '20px',
            fontWeight: 900
          }}
        >
          XII
        </div>

        <div>
          <div style={{ fontWeight: 800 }}>
            XII-L ADMIN
          </div>

          <div
            style={{
              color: '#9ca3af',
              fontSize: '12px'
            }}
          >
            Commissioner Portal
          </div>
        </div>
      </div>

      <div
        style={{
          borderTop: '1px solid #374151',
          borderBottom: '1px solid #374151',
          padding: '18px 0',
          marginBottom: '24px'
        }}
      >
        <div style={{ fontWeight: 600 }}>
          {displayName}
        </div>

        <span
          style={{
            display: 'inline-block',
            marginTop: '8px',
            background: '#d4af37',
            color: '#111827',
            padding: '4px 8px',
            borderRadius: '5px',
            fontSize: '10px',
            fontWeight: 800
          }}
        >
          {role === 'super_admin'
            ? 'SUPER ADMIN'
            : 'ADMIN'}
        </span>
      </div>

      <div
        style={{
          color: '#9ca3af',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '1.5px',
          marginBottom: '12px'
        }}
      >
        WORKSPACE
      </div>

      <nav
        aria-label="Admin navigation"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}
      >
        {navigation.map(item => {
          const Icon =
            navigationIcons[
              item.icon as AdminNavigationIcon
            ];

          const isActive =
            pathname === item.href ||
            (
              item.href !== '/admin' &&
              pathname.startsWith(item.href + '/')
            );

          const itemStyle = {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            textDecoration: 'none',
            background: isActive && item.enabled
              ? 'rgba(212, 175, 55, 0.12)'
              : 'transparent',
            color: !item.enabled
              ? '#6b7280'
              : isActive
                ? '#d4af37'
                : '#d1d5db',
            border: isActive && item.enabled
              ? '1px solid rgba(212, 175, 55, 0.3)'
              : '1px solid transparent'
          } as const;

          if (!item.enabled) {
            return (
              <div
                key={item.id}
                style={itemStyle}
                aria-disabled="true"
                title="Coming soon"
              >
                <Icon size={18} />

                <span style={{ flex: 1 }}>
                  {item.label}
                </span>

                <Lock size={13} />
              </div>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.href}
              style={itemStyle}
              aria-current={
                isActive ? 'page' : undefined
              }
            >
              <Icon size={18} />

              <span style={{ flex: 1 }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div
        style={{
          borderTop: '1px solid #374151',
          marginTop: '24px',
          paddingTop: '20px'
        }}
      >
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
            color: '#9ca3af',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: 600
          }}
        >
          <ExternalLink size={17} />
          Return to Public Portal
        </Link>
      </div>

      <div
        style={{
          marginTop: '24px',
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '11px'
        }}
      >
        XII-L · The Road to the Crown
      </div>
    </aside>
  );
}
