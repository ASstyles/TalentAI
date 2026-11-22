import { NextRequest, NextResponse } from 'next/server';

// Public routes that never require authentication
const PUBLIC_PATHS = ['/', '/login', '/register', '/forgot-password', '/recruiter/access-request'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static assets and internal next paths bypass middleware
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
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
    const sessionCookie = req.cookies.get('session')?.value;

    // If no session cookie present, redirect safely to login gateway
    if (!sessionCookie) {
      const loginUrl = new URL('/login', req.url);
      if (isCandidateRoute) loginUrl.searchParams.set('role', 'candidate');
      if (isRecruiterRoute) loginUrl.searchParams.set('role', 'recruiter');

      // Prevent open redirects: verify internal path format
      if (pathname.startsWith('/') && !pathname.startsWith('//')) {
        loginUrl.searchParams.set('redirect', pathname);
      }
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
