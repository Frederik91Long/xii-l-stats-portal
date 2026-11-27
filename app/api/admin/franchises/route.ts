import {
  NextRequest,
  NextResponse
} from 'next/server';

import { getAdminAuth } from '@/lib/admin/auth';

import {
  getAdminFranchises,
  getAdminFranchise
} from '@/lib/admin/franchises';

import {
  resolveAdminSeason,
  getAdminSeasonError
} from '@/lib/admin/seasons';

export const dynamic = 'force-dynamic';

function jsonResponse(
  data: unknown,
  status: number = 200
) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control':
        'private, no-store, max-age=0'
    }
  });
}

export async function GET(
  request: NextRequest
) {
  try {
    const auth = await getAdminAuth();

    if (!auth.authorized) {
      if (auth.reason === 'unauthenticated') {
        return jsonResponse(
          {
            success: false,
            error: 'Authentication required.'
          },
          401
        );
      }

      if (auth.reason === 'verification_failed') {
        return jsonResponse(
          {
            success: false,
            error:
              'Administrator permissions could not be verified.'
          },
          503
        );
      }

      return jsonResponse(
        {
          success: false,
          error: 'Administrator access required.'
        },
        403
      );
    }

    const params = request.nextUrl.searchParams;

    const supportedParams = [
      'season',
      'q',
      'id'
    ];

    for (const param of supportedParams) {
      if (params.getAll(param).length > 1) {
        return jsonResponse(
          {
            success: false,
            error: `Duplicate parameter: ${param}.`
          },
          400
        );
      }
    }

    const validation = resolveAdminSeason(
      params.get('season')
    );

    if (!validation.valid) {
      return jsonResponse(
        {
          success: false,
          error: getAdminSeasonError(
            validation.reason
          )
        },
        400
      );
    }

    const season = validation.season.year;

    const query =
      (params.get('q') ?? '').trim();

    const rawFranchiseId =
      params.get('id');

    if (query.length > 100) {
      return jsonResponse(
        {
          success: false,
          error:
            'Search query cannot exceed 100 characters.'
        },
        400
      );
    }

    if (rawFranchiseId !== null) {
      const franchiseId =
        rawFranchiseId.trim().toUpperCase();

      if (
        !/^[A-Z0-9_-]{1,30}$/.test(
          franchiseId
        )
      ) {
        return jsonResponse(
          {
            success: false,
            error: 'Invalid franchise ID.'
          },
          400
        );
      }

      if (query !== '') {
        return jsonResponse(
          {
            success: false,
            error:
              'Use either a franchise ID or a search query.'
          },
          400
        );
      }

      const franchise =
        await getAdminFranchise(
          franchiseId,
          season
        );

      if (!franchise) {
        return jsonResponse(
          {
            success: false,
            error:
              'Franchise not found for the selected season.'
          },
          404
        );
      }

      return jsonResponse({
        success: true,
        source: 'XII-L Franchise Registry',
        season,
        seasonName: validation.season.name,
        franchise,
        fetchedAt: new Date().toISOString()
      });
    }

    const result = await getAdminFranchises(
      season,
      query
    );

    return jsonResponse({
      success: true,
      source: 'XII-L Franchise Registry',
      season: result.season,
      seasonName: result.seasonName,
      totalFranchises: result.totalFranchises,
      returnedResults: result.returnedResults,
      query: result.query,
      franchises: result.franchises,
      fetchedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error(
      'Admin franchise request failed:',
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          'Franchise data is currently unavailable. Please try again later.'
      },
      503
    );
  }
}
