import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) {
      return NextResponse.json(
        {
          connected: false,
          error: 'Missing environment variables'
        },
        { status: 500 }
      );
    }

    const supabase = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    const awards = await supabase
      .from('season_awards')
      .select('id', { count: 'exact', head: true });

    const hallOfFame = await supabase
      .from('hall_of_fame')
      .select('id', { count: 'exact', head: true });

    if (awards.error || hallOfFame.error) {
      return NextResponse.json(
        {
          connected: false,
          error: 'Database query failed'
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      connected: true,
      project: 'XII-L Stats Portal',
      database: 'Supabase',
      tables: {
        season_awards: {
          accessible: true,
          publishedRecords: awards.count
        },
        hall_of_fame: {
          accessible: true,
          publishedRecords: hallOfFame.count
        }
      },
      checkedAt: new Date().toISOString()
    });
  } catch {
    return NextResponse.json(
      {
        connected: false,
        error: 'Connection test failed'
      },
      { status: 500 }
    );
  }
}
