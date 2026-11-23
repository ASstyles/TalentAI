import { NextRequest, NextResponse } from 'next/server';

// Public routes that never require authentication
const PUBLIC_PATHS = ['/', '/login', '/register', '/forgot-password', '/recruiter/access-request'];

/**
 * Fast navigation hint extraction for Edge middleware.
 * NOTE: Unverified JWT claims are used ONLY for optimistic navigation routing.
 * Authoritative cryptographic security is enforced in Server APIs and RouteGuard.
 */
function parseJwtClaims(token: string): { role?: string; exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // Static assets and internal next paths bypass middleware
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  const sessionCookie = req.cookies.get('session')?.value;

  // If already authenticated and visiting login or register, redirect to appropriate workspace
  if ((pathname === '/login' || pathname === '/register') && sessionCookie) {
    const claims = parseJwtClaims(sessionCookie);
    const isExpired = claims?.exp ? claims.exp * 1000 < Date.now() : true;

    if (claims && !isExpired) {
      const redirectParam = searchParams.get('redirect');
      const role = claims.role || 'candidate';

      let destination =
        role === 'admin'
          ? '/admin/dashboard'
          : role === 'recruiter'
          ? '/recruiter/dashboard'
          : '/candidate/dashboard';

      // Safe internal redirect validation
      if (
        redirectParam &&
        redirectParam.startsWith('/') &&
        !redirectParam.startsWith('//') &&
        !redirectParam.startsWith('/login') &&
        !redirectParam.startsWith('/register')
      ) {
        destination = redirectParam;
      }

      return NextResponse.redirect(new URL(destination, req.url));
    } else {
      // Stale or expired cookie on login page: clear it immediately
      const res = NextResponse.next();
      res.cookies.delete('session');
      return res;
    }
  }

  // Allow public routes
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Protected paths check
  const isCandidateRoute = pathname.startsWith('/candidate');
  const isRecruiterRoute = pathname.startsWith('/recruiter');
  const isAdminRoute = pathname.startsWith('/admin');

  if (isCandidateRoute || isRecruiterRoute || isAdminRoute) {
    // If no session cookie present, redirect safely to login gateway
    if (!sessionCookie) {
      const loginUrl = new URL('/login', req.url);
      if (isCandidateRoute) loginUrl.searchParams.set('role', 'candidate');
      if (isRecruiterRoute) loginUrl.searchParams.set('role', 'recruiter');

      // Prevent open redirects: verify internal path format
      if (
        pathname.startsWith('/') &&
        !pathname.startsWith('//') &&
        !pathname.startsWith('/login') &&
        !pathname.startsWith('/register')
      ) {
        loginUrl.searchParams.set('redirect', pathname);
      }
      return NextResponse.redirect(loginUrl);
    }

    // Role-based route protection
    const claims = parseJwtClaims(sessionCookie);
    const isExpired = claims?.exp ? claims.exp * 1000 < Date.now() : true;

    if (isExpired) {
      const loginUrl = new URL('/login', req.url);
      const res = NextResponse.redirect(loginUrl);
      res.cookies.delete('session');
      return res;
    }

    const role = claims?.role;
    if (isCandidateRoute && role && role !== 'candidate' && role !== 'admin') {
      return NextResponse.redirect(new URL('/recruiter/dashboard', req.url));
    }
    if (isRecruiterRoute && role && role !== 'recruiter' && role !== 'admin') {
      return NextResponse.redirect(new URL('/candidate/dashboard', req.url));
    }
    if (isAdminRoute && role && role !== 'admin') {
      return NextResponse.redirect(new URL('/candidate/dashboard', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
