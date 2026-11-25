import {
  createServerClient,
  type CookieOptions
} from '@supabase/ssr';

import {
  NextResponse,
  type NextRequest
} from 'next/server';

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request
          });

          cookiesToSet.forEach(
            ({ name, value, options }) => {
              response.cookies.set(name, value, options);
            }
          );
        }
      }
    }
  );

  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isLoginPage =
    pathname === '/admin/login';

  if ((error || !user) && !isLoginPage) {
    const loginUrl = request.nextUrl.clone();

    loginUrl.pathname = '/admin/login';
    loginUrl.search = '';

    const redirectResponse =
      NextResponse.redirect(loginUrl);

    response.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*']
};
