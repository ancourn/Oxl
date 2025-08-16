import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SecurityMiddleware, AuditLogger } from '@/lib/security';

export function middleware(request: NextRequest) {
  // Security headers
  const securityHeaders = SecurityMiddleware.getSecurityHeaders();
  
  // Enforce HTTPS in production
  if (!SecurityMiddleware.enforceHTTPS(request)) {
    return NextResponse.redirect(
      new URL(`https://${request.headers.get('host')}${request.nextUrl.pathname}`, request.url)
    );
  }

  // Validate origin for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    if (origin && !SecurityMiddleware.validateOrigin(origin)) {
      AuditLogger.log({
        userId: 'system',
        action: 'INVALID_ORIGIN',
        resource: 'API_ACCESS',
        details: { origin, path: request.nextUrl.pathname },
        ipAddress: request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        severity: 'WARNING'
      });

      return new NextResponse('Invalid origin', { status: 403 });
    }
  }

  // Add security headers to response
  const response = NextResponse.next();
  
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Log security events
  if (request.nextUrl.pathname.startsWith('/api/')) {
    AuditLogger.log({
      userId: 'system',
      action: 'API_ACCESS',
      resource: request.nextUrl.pathname,
      details: { method: request.method, query: Object.fromEntries(request.nextUrl.searchParams) },
      ipAddress: request.ip || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      severity: 'INFO'
    });
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};