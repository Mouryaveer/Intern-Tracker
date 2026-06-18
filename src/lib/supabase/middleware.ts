// ============================================================
// Supabase Middleware Helper
// Refreshes the auth session on every request
// ============================================================

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — IMPORTANT: do NOT remove this
  const { data: { user } } = await supabase.auth.getUser();

  // Protected routes — redirect to login if not authenticated
  const isAuthPage = request.nextUrl.pathname === '/login' ||
                     request.nextUrl.pathname === '/reset-password';
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
  const isPublicAsset = request.nextUrl.pathname.startsWith('/_next/') ||
                        request.nextUrl.pathname.startsWith('/favicon') ||
                        request.nextUrl.pathname.endsWith('.png') ||
                        request.nextUrl.pathname.endsWith('.ico');

  if (isPublicAsset || isApiRoute) {
    return supabaseResponse;
  }

  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    // Check if user needs password reset
    // We handle this in the auth context, so just let them through
    // unless they're on the login page with a valid session
    if (request.nextUrl.pathname === '/login') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
