import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_COOKIE = 'auth_token';

const PROTECTED_USER_PATHS = ['/dashboard', '/wallet', '/profile', '/news', '/market'];
const ADMIN_PATH = '/admin';
const ADMIN_LOGIN = '/admin/login';
const LOGIN_PATH = '/login';
const REGISTER_PATH = '/register';

function hasAuthCookie(request: NextRequest): boolean {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  return !!token;
}

function isProtectedUserPath(pathname: string): boolean {
  return PROTECTED_USER_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function isAdminPath(pathname: string): boolean {
  return pathname === ADMIN_PATH || pathname.startsWith(ADMIN_PATH + '/');
}

function isAuthPage(pathname: string): boolean {
  return pathname === LOGIN_PATH || pathname === REGISTER_PATH;
}

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  if (!requestHeaders.has('bypass-tunnel-reminder')) {
    requestHeaders.set('bypass-tunnel-reminder', 'true');
  }

  const pathname = request.nextUrl.pathname;
  const authenticated = hasAuthCookie(request);

  // Redirect authenticated users away from login/register to dashboard
  if (isAuthPage(pathname) && authenticated) {
    const url = request.nextUrl.clone();
    const returnTo = url.searchParams.get('from');
    url.pathname = returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/dashboard';
    url.searchParams.delete('from');
    return NextResponse.redirect(url);
  }

  if (isProtectedUserPath(pathname) && !authenticated) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  if (isAdminPath(pathname) && pathname !== ADMIN_LOGIN && !authenticated) {
    const url = request.nextUrl.clone();
    url.pathname = ADMIN_LOGIN;
    return NextResponse.redirect(url);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
