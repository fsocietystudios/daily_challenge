import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST() {
  try {
    await db.eraseAllData();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error erasing data:', error);
    return NextResponse.json(
      { error: 'Failed to erase data' },
      { status: 500 }
    );
  }
} 