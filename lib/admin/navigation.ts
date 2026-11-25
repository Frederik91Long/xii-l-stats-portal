export type AdminNavigationIcon =
  | 'dashboard'
  | 'trophy'
  | 'landmark'
  | 'clipboard'
  | 'settings';

export type AdminNavigationItem = {
  id: string;
  label: string;
  href: string;
  description: string;
  icon: AdminNavigationIcon;
  enabled: boolean;
  superAdminOnly: boolean;
};

export const ADMIN_NAVIGATION: AdminNavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/admin',
    description: 'Overview of the XII-L Admin Center.',
    icon: 'dashboard',
    enabled: true,
    superAdminOnly: false
  },
  {
    id: 'season-awards',
    label: 'Season Awards',
    href: '/admin/awards',
    description: 'Manage official XII-L season awards.',
    icon: 'trophy',
    enabled: false,
    superAdminOnly: false
  },
  {
    id: 'hall-of-fame',
    label: 'Hall of Fame',
    href: '/admin/hall-of-fame',
    description: 'Manage inductees and career achievements.',
    icon: 'landmark',
    enabled: false,
    superAdminOnly: false
  },
  {
    id: 'audit-log',
    label: 'Audit Log',
    href: '/admin/audit-log',
    description: 'Review administrative activity and changes.',
    icon: 'clipboard',
    enabled: false,
    superAdminOnly: false
  },
  {
    id: 'league-management',
    label: 'League Management',
    href: '/admin/league',
    description: 'Manage league settings and administration.',
    icon: 'settings',
    enabled: false,
    superAdminOnly: true
  }
];

export function getAdminNavigation(
  role: 'admin' | 'super_admin'
): AdminNavigationItem[] {
  return ADMIN_NAVIGATION.filter(item => {
    if (item.superAdminOnly) {
      return role === 'super_admin';
    }

    return true;
  });
}
