import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

// This should be in an environment variable in production
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value

  // If we're on the login page and have a valid token, redirect to panel
  if (request.nextUrl.pathname === '/login' && token) {
    try {
      await jwtVerify(token, JWT_SECRET)
      return NextResponse.redirect(new URL('/panel', request.url))
    } catch (error) {
      // Token is invalid, clear it and stay on login page
      const response = NextResponse.next()
      response.cookies.delete('auth_token')
      return response
    }
  }

  // If we're on the panel page, verify authentication
  if (request.nextUrl.pathname.startsWith('/panel')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    try {
      await jwtVerify(token, JWT_SECRET)
      return NextResponse.next()
    } catch (error) {
      // Token is invalid, redirect to login
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('auth_token')
      return response
    }
  }

  return NextResponse.next()
}

// Configure which routes to run middleware on
export const config = {
  matcher: ['/panel/:path*', '/login'],
}