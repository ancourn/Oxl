import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAdmin = token?.role === 'ADMIN'
    
    // Admin routes protection
    if (req.nextUrl.pathname.startsWith('/admin') && !isAdmin) {
      return NextResponse.redirect(new URL('/', req.url))
    }
    
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    },
  }
)

export const config = {
  matcher: [
    '/drive/:path*',
    '/docs/:path*',
    '/mail/:path*',
    '/meet/:path*',
    '/calendar/:path*',
    '/admin/:path*',
    '/billing/:path*',
    '/profile/:path*',
  ],
}