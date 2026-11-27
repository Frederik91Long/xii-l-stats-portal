import {
  NextRequest,
  NextResponse
} from 'next/server';

import { getAdminAuth } from '@/lib/admin/auth';

import {
  getAdminGMs,
  getAdminGM
} from '@/lib/admin/gms';

import type {
  AdminGMStatusFilter
} from '@/lib/admin/gms';

import {
  resolveAdminSeason,
  getAdminSeasonError
} from '@/lib/admin/seasons';

import {
  getFranchise,
  getFranchiseRosterId
} from '@/lib/franchises';

export const dynamic = 'force-dynamic';

const responseHeaders = {
  'Cache-Control': 'private, no-store, max-age=0'
};

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

      if (auth.reason === 'verification_failed') {
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
      'season',
      'q',
      'id',
      'franchise',
      'status'
    ];

    for (const parameter of supportedParams) {
      if (params.getAll(parameter).length > 1) {
        return errorResponse(
          `Duplicate parameter: ${parameter}.`,
          400
        );
      }
    }

    const validation = resolveAdminSeason(
      params.get('season')
    );

    if (!validation.valid) {
      return errorResponse(
        getAdminSeasonError(validation.reason),
        400
      );
    }

    const season = validation.season.year;

    const seasonName =
      validation.season.name;

    const rawQuery =
      params.get('q') ?? '';

    const query = rawQuery.trim();

    if (query.length > 100) {
      return errorResponse(
        'Search query must not exceed 100 characters.',
        400
      );
    }

    const rawGMId =
      params.get('id');

    const gmId =
      rawGMId?.trim().toUpperCase() ?? '';

    if (
      rawGMId !== null &&
      !/^GM[0-9]{3,}$/.test(gmId)
    ) {
      return errorResponse(
        'Invalid GM ID.',
        400
      );
    }

    const rawFranchiseId =
      params.get('franchise');

    const franchiseId =
      rawFranchiseId?.trim().toUpperCase() ?? '';

    if (rawFranchiseId !== null) {
      if (
        !franchiseId ||
        !/^[A-Z0-9_-]{1,30}$/.test(franchiseId)
      ) {
        return errorResponse(
          'Invalid franchise ID.',
          400
        );
      }

      const franchise =
        getFranchise(franchiseId);

      if (!franchise) {
        return errorResponse(
          'Unknown franchise.',
          400
        );
      }

      const rosterId =
        getFranchiseRosterId(
          franchiseId,
          season
        );

      if (
        typeof rosterId !== 'number' ||
        !Number.isInteger(rosterId) ||
        rosterId < 1
      ) {
        return errorResponse(
          'The selected franchise is not registered for this season.',
          400
        );
      }
    }

    const rawStatus =
      params.get('status') ?? 'ALL';

    const normalizedStatus =
      rawStatus.trim().toLowerCase();

    if (
      normalizedStatus !== 'all' &&
      normalizedStatus !== 'active' &&
      normalizedStatus !== 'former'
    ) {
      return errorResponse(
        'Invalid GM status. Use ALL, active or former.',
        400
      );
    }

    const status: AdminGMStatusFilter =
      normalizedStatus === 'all'
        ? 'ALL'
        : normalizedStatus;

    if (rawGMId !== null) {
      if (
        params.has('q') ||
        params.has('franchise') ||
        params.has('status')
      ) {
        return errorResponse(
          'GM ID lookup cannot be combined with search or filter parameters.',
          400
        );
      }

      const assignments =
        await getAdminGM(
          gmId,
          season
        );

      if (assignments.length === 0) {
        return errorResponse(
          'GM not found for the selected season.',
          404
        );
      }

      return NextResponse.json(
        {
          success: true,
          source: 'XII-L GM Registry',
          season,
          seasonName,
          gmId,
          totalAssignments: assignments.length,
          assignments,
          fetchedAt: new Date().toISOString()
        },
        {
          headers: responseHeaders
        }
      );
    }

    const result =
      await getAdminGMs(
        season,
        query,
        franchiseId,
        status
      );

    return NextResponse.json(
      {
        success: true,
        source: 'XII-L GM Registry',
        ...result,
        fetchedAt: new Date().toISOString()
      },
      {
        headers: responseHeaders
      }
    );

  } catch (error) {
    console.error(
      'Admin GM API error:',
      error
    );

    return errorResponse(
      'GM Registry is temporarily unavailable.',
      503
    );
  }
}
