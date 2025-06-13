import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateAndSanitize } from '@/lib/security';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { userId, name, guess } = validateAndSanitize(data, {
      userId: 'string',
      name: 'string',
      guess: 'string',
    });

    if (!userId || !name || !guess) {
      return NextResponse.json(
        { error: 'כל השדות נדרשים' },
        { status: 400 }
      );
    }

    const result = await db.submitGuess(userId, name, guess);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'שגיאה בשליחת הניחוש' },
      { status: 500 }
    );
  }
} 