import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

// This should be in an environment variable in production
const JWT_SECRET = new TextEncoder().encode('your-secret-key-min-32-chars-long!!')

export async function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname

  // Define public paths that don't require authentication
  const isPublicPath = path === '/login' || path === '/'

  // Get the auth token from cookies
  const token = request.cookies.get('auth_token')?.value

  // Verify the token
  let isAuthenticated = false
  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET)
      isAuthenticated = true
    } catch (error) {
      // Token is invalid or expired
      isAuthenticated = false
    }
  }

  // Redirect authenticated users away from login page
  if (isAuthenticated && path === '/login') {
    return NextResponse.redirect(new URL('/panel', request.url))
  }

  // Redirect unauthenticated users to login page
  if (!isAuthenticated && path === '/panel') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

// Configure which routes to run middleware on
export const config = {
  matcher: ['/panel', '/login']
}