import { put, del } from '@vercel/blob';
import { createClient } from '@vercel/edge-config';

interface Guess {
  idNumber: string
  name: string
  guess: string
  timestamp: string
  isCorrect: boolean
}

interface Challenge {
  id: string
  image: string
  answer: string
  guesses: Guess[]
}

interface Database {
  challenges: Challenge[]
  activeChallengeId: string | null
}

export interface IDatabase {
  createChallenge(image: File, answer: string): Promise<Challenge>
  getCurrentChallenge(): Promise<Challenge | null>
  submitGuess(
    idNumber: string,
    name: string,
    guess: string
  ): Promise<{ isCorrect: boolean; message: string; alreadyGuessed?: boolean }>
  getLeaderboard(): Promise<{
    idNumber: string
    name: string
    correctGuesses: number
    totalGuesses: number
  }[]>
  eraseAllData(): Promise<void>
}

class EdgeConfigDatabase implements IDatabase {
  private config: ReturnType<typeof createClient>;

  constructor() {
    if (!process.env.EDGE_CONFIG) {
      throw new Error('EDGE_CONFIG environment variable is not set');
    }
    this.config = createClient(process.env.EDGE_CONFIG);
  }

  private async getData(): Promise<Database> {
    const data = await this.config.get<string>('challenges');
    if (!data) return { challenges: [], activeChallengeId: null };
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Error parsing challenges data:', error);
      return { challenges: [], activeChallengeId: null };
    }
  }

  private async setData(data: Database): Promise<void> {
    const response = await fetch(`https://api.vercel.com/v1/edge-config/${process.env.EDGE_CONFIG_ID}/items`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.VERCEL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [{
          operation: 'upsert',
          key: 'challenges',
          value: JSON.stringify(data)
        }]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update Edge Config: ${error}`);
    }
  }

  async createChallenge(image: File, answer: string): Promise<Challenge> {
    const filename = `${Date.now()}.jpg`
    
    // Upload image to Vercel Blob Storage
    const { url } = await put(filename, image, {
      access: 'public',
      addRandomSuffix: false,
    });

    const challenge = {
      id: Date.now().toString(),
      image: url,
      answer,
      guesses: []
    }

    const data = await this.getData();
    data.challenges.push(challenge);
    data.activeChallengeId = challenge.id;
    await this.setData(data);

    return challenge;
  }

  async getCurrentChallenge(): Promise<Challenge | null> {
    const data = await this.getData();
    if (!data.activeChallengeId) return null;
    return data.challenges.find(c => c.id === data.activeChallengeId) || null;
  }

  async submitGuess(
    idNumber: string,
    name: string,
    guess: string
  ): Promise<{ isCorrect: boolean; message: string; alreadyGuessed?: boolean }> {
    const data = await this.getData();
    const challenge = data.challenges.find(c => c.id === data.activeChallengeId);
    
    if (!challenge) {
      throw new Error("No active challenge");
    }

    // Check if user has already guessed for this challenge
    const hasGuessed = challenge.guesses.some(g => g.idNumber === idNumber);
    if (hasGuessed) {
      return {
        isCorrect: false,
        message: "כבר ניחשת את האתגר הזה",
        alreadyGuessed: true
      };
    }

    const isCorrect = guess.toLowerCase() === challenge.answer.toLowerCase();
    const timestamp = new Date().toISOString();

    challenge.guesses.push({
      idNumber,
      name,
      guess,
      timestamp,
      isCorrect
    });

    await this.setData(data);

    return {
      isCorrect,
      message: isCorrect ? "ניחוש נכון!" : "ניחוש שגוי, נסה שוב",
    };
  }

  async getLeaderboard(): Promise<{
    idNumber: string
    name: string
    correctGuesses: number
    totalGuesses: number
  }[]> {
    const data = await this.getData();
    const playerStats = new Map<string, { 
      name: string;
      correctGuesses: number; 
      totalGuesses: number 
    }>();
    
    data.challenges.forEach(challenge => {
      challenge.guesses.forEach(guess => {
        const stats = playerStats.get(guess.idNumber) || { 
          name: guess.name,
          correctGuesses: 0, 
          totalGuesses: 0 
        };
        stats.totalGuesses++;
        if (guess.isCorrect) stats.correctGuesses++;
        playerStats.set(guess.idNumber, stats);
      });
    });

    return Array.from(playerStats.entries())
      .map(([idNumber, stats]) => ({
        idNumber,
        name: stats.name,
        correctGuesses: stats.correctGuesses,
        totalGuesses: stats.totalGuesses
      }))
      .sort((a, b) => b.correctGuesses - a.correctGuesses);
  }

  async eraseAllData(): Promise<void> {
    const data = await this.getData();
    
    // Delete all images from Vercel Blob Storage
    for (const challenge of data.challenges) {
      try {
        // Extract the blob URL from the image URL
        const blobUrl = new URL(challenge.image);
        const pathname = blobUrl.pathname;
        // Get the filename from the pathname
        const filename = pathname.split('/').pop();
        if (filename) {
          await del(filename);
        }
      } catch (error) {
        console.error('Error deleting image:', error);
      }
    }

    // Clear the Edge Config data
    await this.setData({ challenges: [], activeChallengeId: null });
  }
}

export const db = new EdgeConfigDatabase(); 