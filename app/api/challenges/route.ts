import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'edge';

export async function GET() {
  try {
    const challenges = await db.getChallenges();
    const currentChallenge = await db.getCurrentChallenge();
    const completedChallenges = challenges.filter(challenge => 
      challenge.id !== currentChallenge?.id
    );

    return NextResponse.json({ challenges: completedChallenges });
  } catch (error) {
    console.error('Error fetching challenges:', error);
    return NextResponse.json(
      { error: 'Failed to fetch challenges' },
      { status: 500 }
    );
  }
} 