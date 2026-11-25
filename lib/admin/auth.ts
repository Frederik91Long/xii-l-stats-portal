import { createClient } from '@/lib/supabase/server';

export type AdminRole = 'admin' | 'super_admin';

export type AdminProfile = {
  userId: string;
  displayName: string;
  role: AdminRole;
  isActive: boolean;
};

export type AdminAuthResult =
  | {
      authorized: true;
      admin: AdminProfile;
    }
  | {
      authorized: false;
      reason:
        | 'unauthenticated'
        | 'forbidden'
        | 'verification_failed';
    };

export async function getAdminAuth(): Promise<AdminAuthResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      authorized: false,
      reason: 'unauthenticated'
    };
  }

  const { data: admin, error: adminError } = await supabase
    .from('admin_users')
    .select('user_id, display_name, role, is_active')
    .eq('user_id', user.id)
    .maybeSingle();

  if (adminError) {
    return {
      authorized: false,
      reason: 'verification_failed'
    };
  }

  if (
    !admin ||
    admin.is_active !== true ||
    (
      admin.role !== 'admin' &&
      admin.role !== 'super_admin'
    )
  ) {
    return {
      authorized: false,
      reason: 'forbidden'
    };
  }

  return {
    authorized: true,
    admin: {
      userId: admin.user_id,
      displayName: admin.display_name,
      role: admin.role,
      isActive: admin.is_active
    }
  };
}

export async function getSuperAdminAuth(): Promise<AdminAuthResult> {
  const result = await getAdminAuth();

  if (!result.authorized) {
    return result;
  }

  if (result.admin.role !== 'super_admin') {
    return {
      authorized: false,
      reason: 'forbidden'
    };
  }

  return result;
}
