import { createClient } from '@/lib/supabase/server';
import { getAdminAuth } from '@/lib/admin/auth';

export type AdminDashboardStats = {
  publishedAwards: number | null;
  draftAwards: number | null;
  publishedHallOfFame: number | null;
  draftHallOfFame: number | null;
  auditRecords: number | null;
};

export type AdminActivity = {
  id: string;
  tableName: 'season_awards' | 'hall_of_fame';
  recordId: string;
  action:
    | 'created'
    | 'updated'
    | 'published'
    | 'unpublished'
    | 'deleted';
  recipientName: string | null;
  createdAt: string;
};

export type AdminDashboardData = {
  stats: AdminDashboardStats;
  recentActivity: AdminActivity[];
  databaseStatus: 'connected' | 'degraded' | 'unavailable';
  activityAvailable: boolean;
  warnings: string[];
  fetchedAt: string;
};

export async function getAdminDashboardData():
  Promise<AdminDashboardData> {

  const auth = await getAdminAuth();

  if (!auth.authorized) {
    throw new Error('Administrator access required.');
  }

  const supabase = await createClient();

  const [
    publishedAwards,
    draftAwards,
    publishedHallOfFame,
    draftHallOfFame,
    auditRecords,
    recentActivity
  ] = await Promise.all([
    supabase
      .from('season_awards')
      .select('id', {
        count: 'exact',
        head: true
      })
      .eq('status', 'published'),

    supabase
      .from('season_awards')
      .select('id', {
        count: 'exact',
        head: true
      })
      .eq('status', 'draft'),

    supabase
      .from('hall_of_fame')
      .select('id', {
        count: 'exact',
        head: true
      })
      .eq('status', 'published'),

    supabase
      .from('hall_of_fame')
      .select('id', {
        count: 'exact',
        head: true
      })
      .eq('status', 'draft'),

    supabase
      .from('award_audit_log')
      .select('id', {
        count: 'exact',
        head: true
      }),

    supabase
      .from('award_audit_log')
      .select(`
        id,
        table_name,
        record_id,
        action,
        old_data,
        new_data,
        created_at
      `)
      .order('created_at', {
        ascending: false
      })
      .order('id', {
        ascending: false
      })
      .limit(10)
  ]);

  const warnings: string[] = [];

  function readCount(
    result: {
      count: number | null;
      error: unknown;
    },
    label: string
  ): number | null {
    if (result.error || result.count === null) {
      warnings.push(`Unable to load ${label}.`);
      return null;
    }

    return result.count;
  }

  const stats: AdminDashboardStats = {
    publishedAwards: readCount(
      publishedAwards,
      'published season awards'
    ),

    draftAwards: readCount(
      draftAwards,
      'season award drafts'
    ),

    publishedHallOfFame: readCount(
      publishedHallOfFame,
      'published Hall of Fame inductees'
    ),

    draftHallOfFame: readCount(
      draftHallOfFame,
      'Hall of Fame drafts'
    ),

    auditRecords: readCount(
      auditRecords,
      'audit records'
    )
  };

  let activity: AdminActivity[] = [];

  if (recentActivity.error || !recentActivity.data) {
    warnings.push(
      'Unable to load recent administrative activity.'
    );
  } else {
    activity = recentActivity.data.map(record => {
      const snapshot =
        record.new_data ?? record.old_data;

      const recipientName =
        snapshot?.recipient_name ??
        snapshot?.name ??
        null;

      return {
        id: record.id,
        tableName: record.table_name,
        recordId: record.record_id,
        action: record.action,
        recipientName:
          typeof recipientName === 'string'
            ? recipientName
            : null,
        createdAt: record.created_at
      };
    });
  }

  const activityAvailable =
    !recentActivity.error &&
    recentActivity.data !== null;

  const successfulQueries =
    Object.values(stats).filter(
      value => value !== null
    ).length +
    (activityAvailable ? 1 : 0);

  const databaseStatus =
    successfulQueries === 6
      ? 'connected'
      : successfulQueries === 0
        ? 'unavailable'
        : 'degraded';

  return {
    stats,
    recentActivity: activity,
    databaseStatus,
    activityAvailable,
    warnings,
    fetchedAt: new Date().toISOString()
  };
}
