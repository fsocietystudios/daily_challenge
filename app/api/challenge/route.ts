import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateAndSanitizeAdmin, validateAndSanitize } from '@/lib/security';

export async function GET() {
  try {
    const challenge = await db.getCurrentChallenge()
    if (!challenge) {
      return NextResponse.json({ error: "No active challenge" }, { status: 404 })
    }

    const challengeWithImageUrl = {
      ...challenge,
      image: `/api/images/${challenge.image}`
    }

    const leaderboard = await db.getLeaderboard()

    return NextResponse.json({ challenge: challengeWithImageUrl, leaderboard })
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
    const answer = formData.get('answer') as string;

    if (!image || !answer) {
      console.error('Missing required fields:', { image: !!image, answer: !!answer });
      return NextResponse.json(
        { error: "Image and answer are required" },
        { status: 400 }
      );
    }

    const sanitizedInput = validateAndSanitizeAdmin({ answer });
    if (!sanitizedInput || !sanitizedInput.answer) {
      console.error('Validation failed:', { answer });
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }

    console.log('Creating new challenge with:', {
      imageSize: image.size,
      imageType: image.type,
      answer: sanitizedInput.answer
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
    const { idNumber, name, guess } = await request.json();
    console.log('Received guess data:', { idNumber, name, guess });

    if (!idNumber || !name || !guess) {
      console.error('Missing required fields');
      return NextResponse.json(
        { error: 'ID number, name, and guess are required' },
        { status: 400 }
      );
    }

    const validationResult = validateAndSanitize({ idNumber, name, guess });
    if (!validationResult) {
      console.error('Validation failed');
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      );
    }

    const result = await db.submitGuess(
      validationResult.idNumber,
      validationResult.name,
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