import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { validateAndSanitize } from '@/lib/security';
import { jwtVerify } from 'jose';
import { PLUGA_OPTIONS, TEAM_OPTIONS } from '@/lib/constants';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

async function checkRateLimit(ip: string): Promise<boolean> {
  const key = `rate_limit:${ip}`;
  const count = await db.getRateLimit(key) || 0;
  
  if (count >= 3) {
    return false;
  }
  
  await db.setRateLimit(key, count + 1);
  return true;
}

export async function GET(req: NextRequest) {
  console.log('GET /api/register - Starting request');
  try {
    const token = req.cookies.get('auth_token')?.value;
    console.log('Token check result:', !!token);
    
    if (!token) {
      console.log('No token found, returning unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      await jwtVerify(token, JWT_SECRET);
    } catch (error) {
      console.log('Invalid token:', error);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Fetching registrations from database...');
    const registrations = await db.getRegistrations();
    console.log('Registrations retrieved:', registrations);

    const response = Array.isArray(registrations) ? registrations : [];
    console.log('Sending response:', response);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in GET /api/register:', error);

    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  console.log('Received registration request');
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    console.log('Client IP:', ip);
    
    const isAllowed = await checkRateLimit(ip);
    console.log('Rate limit check result:', isAllowed);

    if (!isAllowed) {
      console.log('Rate limit exceeded');
      return NextResponse.json(
        { error: 'יותר מדי בקשות. נסה שוב מחר.' },
        { status: 429 }
      );
    }

    console.log('Parsing request body...');
    const data = await req.json();
    console.log('Request data:', data);

    const { name, pluga, team } = validateAndSanitize(data, {
      name: 'string',
      pluga: 'string',
      team: 'string',
    });
    console.log('Validated data:', { name, pluga, team });

    if (!name || !pluga || !team) {
      console.log('Missing required fields');
      return NextResponse.json(
        { error: 'כל השדות נדרשים' },
        { status: 400 }
      );
    }

    if (!PLUGA_OPTIONS.includes(pluga)) {
      console.log('Invalid pluga:', pluga);
      return NextResponse.json(
        { error: 'פלוגה לא תקינה' },
        { status: 400 }
      );
    }

    const validTeams = TEAM_OPTIONS[pluga as keyof typeof TEAM_OPTIONS];
    if (!validTeams.some(t => t === team)) {
      console.log('Invalid team for pluga:', { team, pluga });
      return NextResponse.json(
        { error: 'צוות לא תקין לפלוגה שנבחרה' },
        { status: 400 }
      );
    }

    console.log('Submitting registration to database...');
    const registration = await db.submitRegistration(
      name,
      pluga,
      team
    );
    console.log('Registration successful:', registration);

    return NextResponse.json(registration);
  } catch (error: any) {
    console.error('Error in registration endpoint:', error);
    if (error.message === 'משתמש זה כבר קיים') {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to submit registration' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();
    const { userId, status } = validateAndSanitize(data, {
      userId: 'string',
      status: 'string',
    });

    if (!userId || !status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    const registration = await db.updateRegistrationStatus(
      userId,
      status as 'approved' | 'rejected'
    );

    return NextResponse.json(registration);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update registration' },
      { status: 500 }
    );
  }
}