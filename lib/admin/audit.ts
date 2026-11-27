import { getAdminAuth } from '@/lib/admin/auth';

import {
  createClient
} from '@/lib/supabase/server';

export const AUDIT_ACTIONS = [
  'created',
  'updated',
  'published',
  'unpublished',
  'deleted'
] as const;

export const AUDIT_TABLES = [
  'season_awards',
  'hall_of_fame'
] as const;

export type AuditAction =
  typeof AUDIT_ACTIONS[number];

export type AuditTable =
  typeof AUDIT_TABLES[number];

export type AuditActionFilter =
  AuditAction | 'ALL';

export type AuditTableFilter =
  AuditTable | 'ALL';

export type AuditSnapshot =
  Record<string, unknown> | null;

export type AuditLogEntry = {
  id: string;
  tableName: AuditTable;
  moduleName: string;
  recordId: string;
  action: AuditAction;
  performedBy: string | null;
  administratorName: string | null;
  oldData: AuditSnapshot;
  newData: AuditSnapshot;
  recordName: string;
  season: string | null;
  createdAt: string;
};

export type AuditLogFilters = {
  action?: AuditActionFilter;
  table?: AuditTableFilter;
  page?: number;
  pageSize?: number;
};

export type AuditLogResult = {
  entries: AuditLogEntry[];
  filters: {
    action: AuditActionFilter;
    table: AuditTableFilter;
  };
  pagination: {
    page: number;
    pageSize: number;
    totalEntries: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
  fetchedAt: string;
};

export type AuditLogSummary = {
  totalEvents: number;
  created: number;
  updated: number;
  published: number;
  unpublished: number;
  deleted: number;
  seasonAwards: number;
  hallOfFame: number;
  fetchedAt: string;
};

type AuditDatabaseRow = {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  performed_by: string | null;
  old_data: unknown;
  new_data: unknown;
  created_at: string;
};

const AUDIT_COLUMNS = [
  'id',
  'table_name',
  'record_id',
  'action',
  'performed_by',
  'old_data',
  'new_data',
  'created_at'
].join(', ');

const AWARD_NAMES: Record<string, string> = {
  mvp: 'Crown MVP',
  offensivePlayerOfTheYear:
    'Offensive Player of the Year',
  rookieOfTheYear:
    'Rookie of the Year',
  gmOfTheYear:
    'Crown GM of the Year',
  championshipMvp:
    'Championship MVP'
};

export function isAuditAction(
  value: string
): value is AuditAction {
  return AUDIT_ACTIONS.some(
    action => action === value
  );
}

export function isAuditTable(
  value: string
): value is AuditTable {
  return AUDIT_TABLES.some(
    table => table === value
  );
}

export function getAuditModuleName(
  table: AuditTable
): string {
  switch (table) {
    case 'season_awards':
      return 'Season Awards';

    case 'hall_of_fame':
      return 'Hall of Fame';
  }
}

function normalizeSnapshot(
  value: unknown
): AuditSnapshot {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readSnapshotString(
  snapshot: AuditSnapshot,
  key: string
): string | null {
  if (!snapshot) {
    return null;
  }

  const value = snapshot[key];

  if (
    typeof value !== 'string' ||
    value.trim() === ''
  ) {
    return null;
  }

  return value.trim();
}

function getRecordName(
  table: AuditTable,
  snapshot: AuditSnapshot
): string {
  if (table === 'season_awards') {
    const awardId = readSnapshotString(
      snapshot,
      'award_id'
    );

    const recipientName = readSnapshotString(
      snapshot,
      'recipient_name'
    );

    const awardName = awardId
      ? AWARD_NAMES[awardId] ?? awardId
      : 'Season Award';

    return recipientName
      ? `${awardName} — ${recipientName}`
      : awardName;
  }

  return (
    readSnapshotString(snapshot, 'name') ??
    'Hall of Fame Record'
  );
}

function getRecordSeason(
  table: AuditTable,
  snapshot: AuditSnapshot
): string | null {
  const season = readSnapshotString(
    snapshot,
    table === 'season_awards'
      ? 'season'
      : 'induction_season'
  );

  return season && /^\d{4}$/.test(season)
    ? season
    : null;
}

function mapAuditEntry(
  row: AuditDatabaseRow,
  currentAdmin: {
    userId: string;
    displayName: string;
  }
): AuditLogEntry {
  if (!isAuditTable(row.table_name)) {
    throw new Error(
      'Invalid audit table.'
    );
  }

  if (!isAuditAction(row.action)) {
    throw new Error(
      'Invalid audit action.'
    );
  }

  const oldData =
    normalizeSnapshot(row.old_data);

  const newData =
    normalizeSnapshot(row.new_data);

  const relevantSnapshot =
    newData ?? oldData;

  const administratorName =
    row.performed_by === currentAdmin.userId
      ? currentAdmin.displayName
      : null;

  return {
    id: row.id,
    tableName: row.table_name,
    moduleName: getAuditModuleName(
      row.table_name
    ),
    recordId: row.record_id,
    action: row.action,
    performedBy: row.performed_by,
    administratorName,
    oldData,
    newData,
    recordName: getRecordName(
      row.table_name,
      relevantSnapshot
    ),
    season: getRecordSeason(
      row.table_name,
      relevantSnapshot
    ),
    createdAt: row.created_at
  };
}

export async function getAdminAuditLogs(
  filters: AuditLogFilters = {}
): Promise<AuditLogResult> {
  const auth = await getAdminAuth();

  if (!auth.authorized) {
    throw new Error(
      'Administrator access required.'
    );
  }

  const action =
    filters.action ?? 'ALL';

  const table =
    filters.table ?? 'ALL';

  const page =
    filters.page ?? 1;

  const pageSize =
    filters.pageSize ?? 25;

  if (
    action !== 'ALL' &&
    !isAuditAction(action)
  ) {
    throw new Error(
      'Invalid audit action filter.'
    );
  }

  if (
    table !== 'ALL' &&
    !isAuditTable(table)
  ) {
    throw new Error(
      'Invalid audit table filter.'
    );
  }

  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 100000
  ) {
    throw new Error(
      'Invalid audit page.'
    );
  }

  if (
    !Number.isSafeInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100
  ) {
    throw new Error(
      'Invalid audit page size.'
    );
  }

  const supabase = await createClient();

  const from =
    (page - 1) * pageSize;

  const to =
    from + pageSize - 1;

  let query = supabase
    .from('award_audit_log')
    .select(
      AUDIT_COLUMNS,
      { count: 'exact' }
    );

  if (action !== 'ALL') {
    query = query.eq(
      'action',
      action
    );
  }

  if (table !== 'ALL') {
    query = query.eq(
      'table_name',
      table
    );
  }

  const {
    data,
    error,
    count
  } = await query
    .order('created_at', {
      ascending: false
    })
    .order('id', {
      ascending: false
    })
    .range(from, to);

  if (error || count === null) {
    console.error(
      'Audit log query failed:',
      error?.message
    );

    throw new Error(
      'Audit log data could not be loaded.'
    );
  }

  const rows =
    (data ?? []) as unknown as AuditDatabaseRow[];

  const entries = rows.map(
    row => mapAuditEntry(
      row,
      auth.admin
    )
  );

  const totalPages =
    Math.ceil(count / pageSize);

  return {
    entries,
    filters: {
      action,
      table
    },
    pagination: {
      page,
      pageSize,
      totalEntries: count,
      totalPages,
      hasPreviousPage:
        page > 1 && count > 0,
      hasNextPage:
        page < totalPages
    },
    fetchedAt:
      new Date().toISOString()
  };
}

export async function getAdminAuditLog(
  auditId: string
): Promise<AuditLogEntry | null> {
  const auth = await getAdminAuth();

  if (!auth.authorized) {
    throw new Error(
      'Administrator access required.'
    );
  }

  const id = auditId.trim();

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(id)) {
    throw new Error(
      'Invalid audit record ID.'
    );
  }

  const supabase = await createClient();

  const {
    data,
    error
  } = await supabase
    .from('award_audit_log')
    .select(AUDIT_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error(
      'Audit record query failed:',
      error.message
    );

    throw new Error(
      'Audit record could not be loaded.'
    );
  }

  if (!data) {
    return null;
  }

  return mapAuditEntry(
    data as unknown as AuditDatabaseRow,
    auth.admin
  );
}

export async function getAdminAuditSummary():
  Promise<AuditLogSummary> {
  const auth = await getAdminAuth();

  if (!auth.authorized) {
    throw new Error(
      'Administrator access required.'
    );
  }

  const supabase = await createClient();

  async function countEvents(
    action?: AuditAction,
    table?: AuditTable
  ): Promise<number> {
    let query = supabase
      .from('award_audit_log')
      .select('id', {
        count: 'exact',
        head: true
      });

    if (action) {
      query = query.eq(
        'action',
        action
      );
    }

    if (table) {
      query = query.eq(
        'table_name',
        table
      );
    }

    const {
      count,
      error
    } = await query;

    if (error || count === null) {
      console.error(
        'Audit count query failed:',
        error?.message
      );

      throw new Error(
        'Audit statistics could not be loaded.'
      );
    }

    return count;
  }

  const [
    totalEvents,
    created,
    updated,
    published,
    unpublished,
    deleted,
    seasonAwards,
    hallOfFame
  ] = await Promise.all([
    countEvents(),
    countEvents('created'),
    countEvents('updated'),
    countEvents('published'),
    countEvents('unpublished'),
    countEvents('deleted'),
    countEvents(
      undefined,
      'season_awards'
    ),
    countEvents(
      undefined,
      'hall_of_fame'
    )
  ]);

  return {
    totalEvents,
    created,
    updated,
    published,
    unpublished,
    deleted,
    seasonAwards,
    hallOfFame,
    fetchedAt:
      new Date().toISOString()
  };
}
