import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export const runtime = 'edge';

export async function GET(req: Request) {
  try {
    const token = req.headers.get('cookie')?.split(';')
      .find(c => c.trim().startsWith('auth_token='))
      ?.split('=')[1];

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      await jwtVerify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [registrations, challenges, guesses] = await Promise.all([
      db.getRegistrations(),
      db.getChallenges(),
      db.getGuesses()
    ]);

    return NextResponse.json({
      registrations,
      challenges,
      guesses
    });
  } catch (error) {
    console.error('Error in GET /api/db:', error);
    return NextResponse.json(
      { error: 'Failed to fetch database data' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const token = req.headers.get('cookie')?.split(';')
      .find(c => c.trim().startsWith('auth_token='))
      ?.split('=')[1];

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      await jwtVerify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();

    if (!data.registrations || !data.challenges || !data.guesses) {
      return NextResponse.json(
        { error: 'Invalid data structure: missing required fields' },
        { status: 400 }
      );
    }

    if (!Array.isArray(data.registrations) || !Array.isArray(data.challenges) || !Array.isArray(data.guesses)) {
      return NextResponse.json(
        { error: 'Invalid data structure: fields must be arrays' },
        { status: 400 }
      );
    }

    try {
      await Promise.all([
        db.updateRegistrations(data.registrations),
        db.updateChallenges(data.challenges),
        db.updateGuesses(data.guesses)
      ]);

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error updating database:', error);
      return NextResponse.json(
        { error: 'Failed to update database: ' + (error instanceof Error ? error.message : 'Unknown error') },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in PUT /api/db:', error);
    return NextResponse.json(
      { error: 'Failed to process request: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}