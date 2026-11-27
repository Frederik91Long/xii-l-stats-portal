import {
  NextRequest,
  NextResponse
} from 'next/server';

import { getAdminAuth } from '@/lib/admin/auth';

import {
  searchAdminPlayers,
  ADMIN_PLAYER_POSITIONS
} from '@/lib/admin/players';

export const dynamic = 'force-dynamic';

const allowedPositions = new Set<string>(
  ADMIN_PLAYER_POSITIONS
);

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

    const query =
      (params.get('q') ?? '').trim();

    const position =
      (params.get('position') ?? 'ALL')
        .trim()
        .toUpperCase();

    const rawLimit =
      params.get('limit') ?? '25';

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

    if (
      position !== 'ALL' &&
      !allowedPositions.has(position)
    ) {
      return jsonResponse(
        {
          success: false,
          error: 'Invalid player position.'
        },
        400
      );
    }

    if (!/^\d+$/.test(rawLimit)) {
      return jsonResponse(
        {
          success: false,
          error: 'Invalid result limit.'
        },
        400
      );
    }

    const limit = Number(rawLimit);

    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 50
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            'Result limit must be between 1 and 50.'
        },
        400
      );
    }

    const result = await searchAdminPlayers(
      query,
      position,
      limit
    );

    return jsonResponse({
      success: true,
      source: 'Sleeper',
      query: result.query,
      position: result.position,
      totalMatches: result.totalMatches,
      returnedResults: result.returnedResults,
      players: result.players,
      fetchedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error(
      'Admin player search failed:',
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          'Player search is currently unavailable. Please try again later.'
      },
      503
    );
  }
}
