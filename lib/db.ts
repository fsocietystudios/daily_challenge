import { put, del } from '@vercel/blob';
import { Redis } from '@upstash/redis';
import { Pluga, Team } from './constants';

interface Guess {
  userId: string
  name: string
  guess: string
  timestamp: string
  isCorrect: boolean
}

interface Registration {
  userId: string
  name: string
  pluga: Pluga
  team: Team
  status: 'pending' | 'approved' | 'rejected'
  timestamp: string
}

interface Challenge {
  id: string
  image: string
  answers?: string[]
  answer?: string
  question?: string
  guesses: Guess[]
  createdAt: string
}

export interface IDatabase {
  createChallenge(image: File, answers: string[], question?: string): Promise<Challenge>
  getCurrentChallenge(): Promise<Challenge | null>
  submitGuess(
    userId: string,
    name: string,
    guess: string
  ): Promise<{ isCorrect: boolean; message: string; alreadyGuessed?: boolean }>
  getLeaderboard(): Promise<{
    overall: { userId: string; name: string; pluga: string; team: string; correctGuesses: number; totalGuesses: number }[];
    byPluga: { [key: string]: { correctGuesses: number; totalGuesses: number; users: number } };
    byTeam: { [key: string]: { correctGuesses: number; totalGuesses: number; users: number } };
  }>
  eraseAllData(): Promise<void>
  submitRegistration(name: string, pluga: Pluga, team: Team): Promise<Registration>
  getRegistrations(): Promise<Registration[]>
  updateRegistrationStatus(userId: string, status: 'approved' | 'rejected'): Promise<Registration>
  isParticipantApproved(userId: string): Promise<boolean>
  getRateLimit(key: string): Promise<number>
  setRateLimit(key: string, count: number): Promise<void>
  getGuesses(): Promise<Guess[]>
  updateRegistrations(registrations: Registration[]): Promise<void>
  updateChallenges(challenges: Challenge[]): Promise<void>
  updateGuesses(guesses: Guess[]): Promise<void>
  getChallenges(): Promise<Challenge[]>
}

async function generateUserId(name: string, pluga: Pluga, team: Team): Promise<string> {
  const timestamp = Date.now();
  const baseString = `${pluga}-${team}-${timestamp}`;
  
  // Convert string to Uint8Array
  const encoder = new TextEncoder();
  const data = encoder.encode(baseString);
  
  // Hash the data
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convert to hex string and take first 8 characters
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 8);
  
  // Create a more readable format: BHD-XXXX
  return `BHD-${hashHex.toUpperCase()}`;
}

async function generateUniqueUserId(name: string, pluga: Pluga, team: Team, db: RedisDatabase): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const userId = await generateUserId(name, pluga, team);
    
    // Check if this userId already exists
    const registrations = await db.getRegistrations();
    const existingUser = registrations.find(r => r.userId === userId);
    
    if (!existingUser) {
      return userId;
    }
    
    attempts++;
    // Add a small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 1));
  }
  
  // If we still have duplicates after max attempts, add a random suffix
  const baseUserId = await generateUserId(name, pluga, team);
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${baseUserId}-${randomSuffix}`;
}

class RedisDatabase implements IDatabase {
  private redis: Redis;
  private readonly CACHE_TTL = 5000; // 5 seconds cache

  constructor() {
    console.log('Initializing RedisDatabase...');
    
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      throw new Error('Redis credentials are not set');
    }

    this.redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
  }

  private async getHashData<T>(key: string): Promise<Record<string, T> | null> {
    try {
      const data = await this.redis.hgetall<Record<string, string>>(key);
      if (!data) return null;

      // Parse each value in the hash
      const result: Record<string, T> = {};
      for (const [field, value] of Object.entries(data)) {
        try {
          // Handle the case where value is already an object
          if (typeof value === 'object' && value !== null) {
            result[field] = value as unknown as T;
          } else {
            // Try to parse JSON string
            result[field] = JSON.parse(value) as T;
          }
        } catch (error) {
          console.error(`Error parsing JSON for hash field ${field}:`, error);
          // If parsing fails, try to use the value as is
          result[field] = value as unknown as T;
        }
      }
      return result;
    } catch (error) {
      console.error(`Error getting hash data for key ${key}:`, error);
      return null;
    }
  }

  private async setHashData<T>(key: string, field: string, value: T): Promise<void> {
    try {
      // Ensure we're storing a proper JSON string
      let serialized: string;
      if (typeof value === 'string') {
        serialized = value;
      } else if (typeof value === 'object' && value !== null) {
        serialized = JSON.stringify(value);
      } else {
        serialized = String(value);
      }
      await this.redis.hset(key, { [field]: serialized });
    } catch (error) {
      console.error(`Error setting hash data for key ${key}, field ${field}:`, error);
      throw error;
    }
  }

  private async getStringData<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get<string>(key);
      if (!data) return null;
      
      // Handle the case where data is already an object
      if (typeof data === 'object' && data !== null) {
        return data as unknown as T;
      }
      
      try {
        return JSON.parse(data) as T;
      } catch (error) {
        console.error(`Error parsing JSON for key ${key}:`, error);
        return data as unknown as T;
      }
    } catch (error) {
      console.error(`Error getting string data for key ${key}:`, error);
      return null;
    }
  }

  private async setStringData<T>(key: string, value: T): Promise<void> {
    try {
      // Ensure we're storing a proper JSON string
      let serialized: string;
      if (typeof value === 'string') {
        serialized = value;
      } else if (typeof value === 'object' && value !== null) {
        serialized = JSON.stringify(value);
      } else {
        serialized = String(value);
      }
      await this.redis.set(key, serialized);
    } catch (error) {
      console.error(`Error setting string data for key ${key}:`, error);
      throw error;
    }
  }

  async createChallenge(image: File, answers: string[], question?: string): Promise<Challenge> {
    console.log('Creating challenge with answers:', answers);
    
    // Upload image to Vercel Blob Storage
    const blob = await put(`challenges/${Date.now()}.jpg`, image, {
      access: 'public',
    });

    // Normalize answers
    const normalizedAnswers = answers.map(a => String(a).trim());
    console.log('Normalized answers:', normalizedAnswers);

    const challenge: Challenge = {
      id: crypto.randomUUID(),
      image: blob.url,
      answers: normalizedAnswers,
      question,
      guesses: [],
      createdAt: new Date().toISOString()
    };

    console.log('Created challenge:', challenge);
    
    // Store the challenge in hash
    await this.setHashData('challenges', challenge.id, challenge);
    
    // Set as current challenge
    await this.setStringData('current_challenge', challenge);
    
    return challenge;
  }

  async getCurrentChallenge(): Promise<Challenge | null> {
    console.log('Getting current challenge...');
    try {
      const challenge = await this.getStringData<Challenge>('current_challenge');
      console.log('Current challenge:', challenge);
      return challenge;
    } catch (error) {
      console.error('Error getting current challenge:', error);
      return null;
    }
  }

  async getChallenges(): Promise<Challenge[]> {
    const challenges = await this.getHashData<Challenge>('challenges');
    return Object.values(challenges || {});
  }

  async submitGuess(
    userId: string,
    name: string,
    guess: string
  ): Promise<{ isCorrect: boolean; message: string; alreadyGuessed?: boolean }> {
    const challenge = await this.getCurrentChallenge();

    if (!challenge) {
      throw new Error("No active challenge");
    }

    // Handle both single answer and answers array formats
    const answers = Array.isArray(challenge.answers) 
      ? challenge.answers.map((a: string) => String(a))
      : challenge.answer 
        ? [String(challenge.answer)] 
        : [];

    if (answers.length === 0) {
      throw new Error("Invalid challenge format");
    }

    console.log('Comparing answers:', {
      guess: String(guess).toLowerCase(),
      answers: answers.map((a: string) => a.toLowerCase()),
      challenge: {
        answers: challenge.answers,
        answer: challenge.answer
      }
    });

    // Check if user has already guessed
    const hasGuessed = challenge.guesses.some((g: Guess) => g.userId === userId);
    if (hasGuessed) {
      return {
        isCorrect: false,
        message: "כבר ניחשת היום",
        alreadyGuessed: true
      };
    }

    const isCorrect = answers.some((ans: string) => {
      const normalizedGuess = String(guess).toLowerCase().trim();
      const normalizedAns = ans.toLowerCase().trim();
      const matches = normalizedGuess === normalizedAns;
      console.log('Comparing:', { normalizedGuess, normalizedAns, matches });
      return matches;
    });

    const newGuess: Guess = {
      userId,
      name,
      guess,
      timestamp: new Date().toISOString(),
      isCorrect
    };

    // Update challenge with new guess
    challenge.guesses.push(newGuess);
    
    // Update challenges hash
    await this.setHashData('challenges', challenge.id, challenge);
    
    // Update current challenge
    await this.setStringData('current_challenge', challenge);

    return {
      isCorrect,
      message: isCorrect ? "ניחוש נכון!" : "ניחוש שגוי, נסה שוב",
    };
  }

  async getLeaderboard(): Promise<{
    overall: { userId: string; name: string; pluga: string; team: string; correctGuesses: number; totalGuesses: number }[];
    byPluga: { [key: string]: { correctGuesses: number; totalGuesses: number; users: number } };
    byTeam: { [key: string]: { correctGuesses: number; totalGuesses: number; users: number } };
  }> {
    const registrations = await this.getRegistrations();
    const challenges = await this.getChallenges();
    const allGuesses: Guess[] = [];
    
    // Collect all guesses from all challenges
    if (Array.isArray(challenges)) {
      for (const challenge of challenges) {
        if (challenge?.guesses && Array.isArray(challenge.guesses)) {
          allGuesses.push(...challenge.guesses);
        }
      }
    }

    // Get user statistics
    const userStats = new Map<string, { 
      name: string;
      pluga: string;
      team: string;
      correctGuesses: number;
      totalGuesses: number;
    }>();

    // Initialize user stats
    if (Array.isArray(registrations)) {
      for (const reg of registrations) {
        userStats.set(reg.userId, {
          name: reg.name,
          pluga: reg.pluga,
          team: reg.team,
          correctGuesses: 0,
          totalGuesses: 0
        });
      }
    }

    // Calculate user statistics
    for (const guess of allGuesses) {
      const stats = userStats.get(guess.userId);
      if (stats) {
        stats.totalGuesses++;
        if (guess.isCorrect) {
          stats.correctGuesses++;
        }
      }
    }

    // Convert to array and sort by correct guesses
    const overall = Array.from(userStats.entries())
      .map(([userId, stats]) => ({
        userId,
        ...stats
      }))
      .sort((a, b) => b.correctGuesses - a.correctGuesses);

    // Calculate pluga statistics
    const byPluga: { [key: string]: { correctGuesses: number; totalGuesses: number; users: number } } = {};
    if (Array.isArray(registrations)) {
      for (const reg of registrations) {
        if (!byPluga[reg.pluga]) {
          byPluga[reg.pluga] = { correctGuesses: 0, totalGuesses: 0, users: 0 };
        }
        byPluga[reg.pluga].users++;
      }
    }

    // Calculate team statistics
    const byTeam: { [key: string]: { correctGuesses: number; totalGuesses: number; users: number } } = {};
    if (Array.isArray(registrations)) {
      for (const reg of registrations) {
        if (!byTeam[reg.team]) {
          byTeam[reg.team] = { correctGuesses: 0, totalGuesses: 0, users: 0 };
        }
        byTeam[reg.team].users++;
      }
    }

    // Add guess statistics to pluga and team stats
    for (const stats of overall) {
      byPluga[stats.pluga].correctGuesses += stats.correctGuesses;
      byPluga[stats.pluga].totalGuesses += stats.totalGuesses;
      byTeam[stats.team].correctGuesses += stats.correctGuesses;
      byTeam[stats.team].totalGuesses += stats.totalGuesses;
    }

    return {
      overall,
      byPluga,
      byTeam
    };
  }

  async eraseAllData(): Promise<void> {
    // Delete all images from Vercel Blob Storage
    const challenges = await this.getChallenges();
    for (const challenge of challenges) {
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

    // Clear Redis data
    await Promise.all([
      this.redis.del('challenges'),
      this.redis.del('current_challenge'),
      this.redis.del('registrations'),
      this.redis.del('rate_limits')
    ]);
  }

  async submitRegistration(name: string, pluga: Pluga, team: Team): Promise<Registration> {
    console.log('Submitting registration:', { name, pluga, team });
    
    // Get existing registrations
    const registrations = await this.getRegistrations();
    
    // Check for existing registration with same name, pluga, and team
    const existingRegistration = registrations.find(r => 
      r.name === name && 
      r.pluga === pluga && 
      r.team === team
    );
    
    if (existingRegistration) {
      console.log('Registration already exists:', existingRegistration);
      throw new Error("משתמש זה כבר קיים");
    }

    const userId = await generateUniqueUserId(name, pluga, team, this);
    console.log('Generated userId:', userId);

    const registration: Registration = {
      userId,
      name,
      pluga,
      team,
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    // Add new registration
    registrations.push(registration);
    await this.setStringData('registrations', registrations);
    
    console.log('Adding new registration:', registration);
    return registration;
  }

  async getRegistrations(): Promise<Registration[]> {
    try {
      console.log('Getting all registrations...');
      const registrations = await this.getStringData<Registration[]>('registrations');
      console.log('Current registrations:', registrations);
      return registrations || [];
    } catch (error) {
      console.error('Error in getRegistrations:', error);
      return []; // Return empty array on error
    }
  }

  async updateRegistrationStatus(userId: string, status: 'approved' | 'rejected'): Promise<Registration> {
    console.log('Updating registration status:', { userId, status });
    const registrations = await this.getRegistrations();
    const registration = registrations.find(r => r.userId === userId);
    
    if (!registration) {
      console.log('Registration not found for userId:', userId);
      throw new Error("Registration not found");
    }
    
    registration.status = status;
    console.log('Updated registration:', registration);
    
    await this.setStringData('registrations', registrations);
    return registration;
  }

  async isParticipantApproved(userId: string): Promise<boolean> {
    const registrations = await this.getRegistrations();
    const registration = registrations.find(r => r.userId === userId);
    return registration?.status === 'approved';
  }

  async getRateLimit(key: string): Promise<number> {
    const rateLimits = await this.getHashData<{ count: number; timestamp: number }>('rate_limits');
    const rateLimit = rateLimits?.[key];
    
    if (!rateLimit) {
      return 0;
    }

    // Check if rate limit has expired (24 hours)
    if (Date.now() - rateLimit.timestamp > 24 * 60 * 60 * 1000) {
      return 0;
    }

    return rateLimit.count;
  }

  async setRateLimit(key: string, count: number): Promise<void> {
    await this.setHashData('rate_limits', key, {
      count,
      timestamp: Date.now()
    });
  }

  async getGuesses(): Promise<Guess[]> {
    const challenges = await this.getChallenges();
    return challenges.flatMap(challenge => challenge.guesses);
  }

  async updateRegistrations(registrations: Registration[]): Promise<void> {
    await this.setStringData('registrations', registrations);
  }

  async updateChallenges(challenges: Challenge[]): Promise<void> {
    // Clear existing challenges
    await this.redis.del('challenges');
    
    // Add each challenge to the hash
    for (const challenge of challenges) {
      await this.setHashData('challenges', challenge.id, challenge);
    }
  }

  async updateGuesses(guesses: Guess[]): Promise<void> {
    const challenges = await this.getChallenges();
    // Update guesses in each challenge
    challenges.forEach(challenge => {
      challenge.guesses = guesses.filter(g => 
        challenges.some(c => c.guesses.some(eg => eg.userId === g.userId && eg.timestamp === g.timestamp))
      );
    });
    
    await this.updateChallenges(challenges);
  }
}

export const db = new RedisDatabase(); 