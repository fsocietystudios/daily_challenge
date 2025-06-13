import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateAndSanitizeAdmin, validateAndSanitize, isParticipantAllowed } from '@/lib/security';

export async function GET() {
  try {
    const challenge = await db.getCurrentChallenge()
    if (!challenge) {
      return NextResponse.json({ error: "No active challenge" }, { status: 404 })
    }

    const leaderboard = await db.getLeaderboard()

    return NextResponse.json({ challenge, leaderboard })
  } catch (error) {
    console.error("Error getting challenge:", error)
    return NextResponse.json(
      { error: "Failed to get challenge" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;
    const answerStr = formData.get('answer') as string;

    if (!image || !answerStr) {
      console.error('Missing required fields:', { image: !!image, answer: !!answerStr });
      return NextResponse.json(
        { error: "Image and answer are required" },
        { status: 400 }
      );
    }

    let answers: string[];
    try {
      answers = JSON.parse(answerStr);
    } catch (e) {
      console.error('Failed to parse answers:', e);
      return NextResponse.json(
        { error: "Invalid answer format" },
        { status: 400 }
      );
    }

    const sanitizedInput = validateAndSanitizeAdmin({ answer: answers });
    if (!sanitizedInput || !sanitizedInput.answer) {
      console.error('Validation failed:', { answers });
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }

    console.log('Creating new challenge with:', {
      imageSize: image.size,
      imageType: image.type,
      answers: sanitizedInput.answer
    });

    const result = await db.createChallenge(image, sanitizedInput.answer);
    console.log('Challenge created successfully:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating challenge:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack
      });
    }
    return NextResponse.json(
      { error: "Failed to create challenge" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    console.log('Received PUT request for guess submission');
    const { userId, guess } = await request.json();
    console.log('Received guess data:', { userId, guess });

    if (!userId || !guess) {
      console.error('Missing required fields');
      return NextResponse.json(
        { error: 'מספר אישי וניחוש נדרשים' },
        { status: 400 }
      );
    }

    // Get user details from registration
    const registrations = await db.getRegistrations();
    const user = registrations.find(r => r.userId === userId);
    
    if (!user) {
      return NextResponse.json(
        { error: 'משתמש לא נמצא' },
        { status: 404 }
      );
    }

    const isAllowed = await isParticipantAllowed(userId);
    if (!isAllowed) {
      return NextResponse.json(
        { error: 'מצטערים, אינך ברשימת המשתתפים המורשים' },
        { status: 403 }
      );
    }

    const validationResult = validateAndSanitize({ userId, guess }, {
      userId: 'string',
      guess: 'string'
    });
    if (!validationResult) {
      console.error('Validation failed');
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      );
    }

    const result = await db.submitGuess(
      validationResult.userId,
      user.name,
      validationResult.guess
    );
    console.log('Guess submitted successfully:', result);

    const leaderboard = await db.getLeaderboard();
    console.log('Updated leaderboard:', leaderboard);

    const response = {
      ...result,
      leaderboard
    };
    console.log('Sending response:', response);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in PUT /api/challenge:', error);
    return NextResponse.json(
      { error: 'Failed to submit guess' },
      { status: 500 }
    );
  }
} 