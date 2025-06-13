import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'מזהה משתמש חסר' },
        { status: 400 }
      );
    }

    const isValid = await db.isParticipantApproved(userId);

    return NextResponse.json(
      { isValid },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error validating user:', error);
    return NextResponse.json(
      { error: 'שגיאה באימות המשתמש' },
      { status: 500 }
    );
  }
}