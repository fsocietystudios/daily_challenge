import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';

// This should be in an environment variable in production
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

console.log(JWT_SECRET);

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    // Use environment variables for credentials
    const validUsername = process.env.ADMIN_USERNAME;
    const validPassword = process.env.ADMIN_PASSWORD;

    // Check if environment variables are set
    if (!validUsername || !validPassword) {
      console.error('Admin credentials not configured in environment variables');
      return NextResponse.json(
        { success: false, message: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (username === validUsername && password === validPassword) {
      try {
        const token = await new SignJWT({ username })
          .setProtectedHeader({ alg: 'HS256' })
          .setIssuedAt()
          .setExpirationTime('24h')
          .sign(JWT_SECRET);

        // Create response with success message
        const response = NextResponse.json({ 
          success: true,
          message: 'Login successful'
        });

        // Set cookie using headers directly with a more compatible format
        const cookieOptions = [
          'HttpOnly',
          'Path=/',
          'SameSite=Lax',
          `Max-Age=${60 * 60 * 24}`,
          process.env.NODE_ENV === 'production' ? 'Secure' : ''
        ].filter(Boolean).join('; ');

        // Set the cookie in the response headers
        response.headers.set('Set-Cookie', `auth_token=${token}; ${cookieOptions}`);

        // Also set a response header to indicate successful authentication
        response.headers.set('X-Auth-Status', 'success');

        console.log(token);

        return response;
      } catch (tokenError) {
        console.error('Error generating token:', tokenError);
        return NextResponse.json(
          { success: false, message: 'Error during authentication' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { success: false, message: 'Invalid credentials' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 