import {
  NextRequest,
  NextResponse
} from 'next/server';

import {
  getAdminAuth
} from '@/lib/admin/auth';

import {
  getAdminAuditLogs,
  getAdminAuditLog,
  getAdminAuditSummary,
  isAuditAction,
  isAuditTable
} from '@/lib/admin/audit';

import type {
  AuditActionFilter,
  AuditTableFilter
} from '@/lib/admin/audit';

export const dynamic = 'force-dynamic';

const responseHeaders = {
  'Cache-Control': 'private, no-store, max-age=0'
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function errorResponse(
  error: string,
  status: number
) {
  return NextResponse.json(
    {
      success: false,
      error
    },
    {
      status,
      headers: responseHeaders
    }
  );
}

function successResponse(
  data: Record<string, unknown>
) {
  return NextResponse.json(
    {
      success: true,
      source: 'XII-L Audit Log',
      ...data
    },
    {
      headers: responseHeaders
    }
  );
}

export async function GET(
  request: NextRequest
) {
  try {
    const auth = await getAdminAuth();

    if (!auth.authorized) {
      if (auth.reason === 'unauthenticated') {
        return errorResponse(
          'Authentication required.',
          401
        );
      }

      if (
        auth.reason === 'verification_failed'
      ) {
        return errorResponse(
          'Administrator permissions could not be verified.',
          503
        );
      }

      return errorResponse(
        'Administrator access required.',
        403
      );
    }

    const params =
      request.nextUrl.searchParams;

    const supportedParams = [
      'id',
      'summary',
      'action',
      'table',
      'page',
      'pageSize'
    ];

    for (const parameter of params.keys()) {
      if (!supportedParams.includes(parameter)) {
        return errorResponse(
          `Unsupported parameter: ${parameter}.`,
          400
        );
      }
    }

    for (const parameter of supportedParams) {
      if (params.getAll(parameter).length > 1) {
        return errorResponse(
          `Duplicate parameter: ${parameter}.`,
          400
        );
      }
    }

    const rawId =
      params.get('id');

    const rawSummary =
      params.get('summary');

    const listParameters = [
      'action',
      'table',
      'page',
      'pageSize'
    ];

    const hasListParameters =
      listParameters.some(
        parameter => params.has(parameter)
      );

    // Individual audit record

    if (rawId !== null) {
      if (
        rawSummary !== null ||
        hasListParameters
      ) {
        return errorResponse(
          'Audit record lookup cannot be combined with summary or list parameters.',
          400
        );
      }

      const auditId =
        rawId.trim();

      if (!UUID_PATTERN.test(auditId)) {
        return errorResponse(
          'Invalid audit record ID.',
          400
        );
      }

      const entry =
        await getAdminAuditLog(auditId);

      if (!entry) {
        return errorResponse(
          'Audit record not found.',
          404
        );
      }

      return successResponse({
        mode: 'detail',
        entry,
        fetchedAt:
          new Date().toISOString()
      });
    }

    // Global audit summary

    if (rawSummary !== null) {
      if (rawSummary !== 'true') {
        return errorResponse(
          'Invalid summary parameter. Use summary=true.',
          400
        );
      }

      if (hasListParameters) {
        return errorResponse(
          'Audit summary cannot be combined with list parameters.',
          400
        );
      }

      const summary =
        await getAdminAuditSummary();

      return successResponse({
        mode: 'summary',
        summary,
        fetchedAt: summary.fetchedAt
      });
    }

    // Audit action filter

    const rawAction =
      params.get('action') ?? 'ALL';

    const normalizedAction =
      rawAction.trim().toLowerCase();

    let action: AuditActionFilter = 'ALL';

    if (normalizedAction !== 'all') {
      if (!isAuditAction(normalizedAction)) {
        return errorResponse(
          'Invalid audit action. Use ALL, created, updated, published, unpublished or deleted.',
          400
        );
      }

      action = normalizedAction;
    }

    // Audit module filter

    const rawTable =
      params.get('table') ?? 'ALL';

    const normalizedTable =
      rawTable.trim().toLowerCase();

    let table: AuditTableFilter = 'ALL';

    if (normalizedTable !== 'all') {
      if (!isAuditTable(normalizedTable)) {
        return errorResponse(
          'Invalid audit table. Use ALL, season_awards or hall_of_fame.',
          400
        );
      }

      table = normalizedTable;
    }

    // Pagination

    const rawPage =
      params.get('page') ?? '1';

    const rawPageSize =
      params.get('pageSize') ?? '25';

    if (!/^\d+$/.test(rawPage)) {
      return errorResponse(
        'Page must be a positive integer.',
        400
      );
    }

    if (!/^\d+$/.test(rawPageSize)) {
      return errorResponse(
        'Page size must be a positive integer.',
        400
      );
    }

    const page =
      Number(rawPage);

    const pageSize =
      Number(rawPageSize);

    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 100000
    ) {
      return errorResponse(
        'Page must be between 1 and 100000.',
        400
      );
    }

    if (
      !Number.isSafeInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 100
    ) {
      return errorResponse(
        'Page size must be between 1 and 100.',
        400
      );
    }

    // Audit log overview

    const result =
      await getAdminAuditLogs({
        action,
        table,
        page,
        pageSize
      });

    return successResponse({
      mode: 'list',
      ...result
    });

  } catch (error) {
    console.error(
      'Admin Audit API error:',
      error
    );

    return errorResponse(
      'Audit Log is temporarily unavailable.',
      503
    );
  }
}
