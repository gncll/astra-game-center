import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { authConfigured, cookieOptions, supabaseKey, supabaseUrl } from './lib/config';
import { isAssetPath, isProtectedPath } from './lib/security.mjs';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  let authenticated = false;
  if (authConfigured) {
    const client = createServerClient(supabaseUrl, supabaseKey, {
      cookieOptions,
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: values => {
          for (const { name, value } of values) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of values) response.cookies.set(name, value, options);
        },
      },
    });
    try { const { data, error } = await client.auth.getClaims(); authenticated = !error && Boolean(data?.claims?.sub); } catch { authenticated = false; }
  }
  const path = request.nextUrl.pathname;
  if (isProtectedPath(path) && !authenticated) {
    const denied = path.startsWith('/api/') || isAssetPath(path)
      ? NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url));
    for (const cookie of response.cookies.getAll()) denied.cookies.set(cookie);
    denied.headers.set('Cache-Control', 'private, no-store');
    return denied;
  }
  if (isProtectedPath(path)) response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
// Includes every game image, sound and script. Do not use a generic image-extension exclusion.
export const config = { matcher: ['/library/:path*', '/api/:path*', '/play/:path*', '/games/:path*', '/login'] };
