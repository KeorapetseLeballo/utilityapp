import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedPrefixes = ['/dashboard', '/provider', '/admin', '/browse', '/listings', '/notifications'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p));

  if (isProtected && !request.cookies.get('utilities_session')) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/provider/:path*', '/admin/:path*', '/browse/:path*', '/listings/:path*', '/notifications/:path*'],
};
