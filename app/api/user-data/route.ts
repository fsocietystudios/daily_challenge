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

    const registrations = await db.getRegistrations();
    const userRegistration = registrations.find(reg => reg.userId === userId);

    if (!userRegistration) {
      return NextResponse.json(
        { error: 'משתמש לא נמצא' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      name: userRegistration.name,
      pluga: userRegistration.pluga,
      team: userRegistration.team
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json(
      { error: 'שגיאה בטעינת נתוני המשתמש' },
      { status: 500 }
    );
  }
}