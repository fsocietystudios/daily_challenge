import { join } from "path"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { writeFile as writeFileAsync } from "fs/promises"

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
  ): Promise<{ isCorrect: boolean; message: string }>
  getLeaderboard(): Promise<{
    idNumber: string
    name: string
    correctGuesses: number
    totalGuesses: number
  }[]>
  eraseAllData(): Promise<void>
}

class JsonDatabase implements IDatabase {
  private readonly dataDir: string
  private readonly dataPath: string
  private readonly imagesDir: string
  private data: Database

  constructor() {
    this.dataDir = join(process.cwd(), "data")
    this.dataPath = join(this.dataDir, "db.json")
    console.log('Database path:', this.dataPath);
    this.imagesDir = join(process.cwd(), "public", "images")
    
    // Create data and images directories if they don't exist
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true })
    }
    if (!existsSync(this.imagesDir)) {
      mkdirSync(this.imagesDir, { recursive: true })
    }

    // Initialize data
    this.data = {
      challenges: [],
      activeChallengeId: null
    }

    // Load data if exists
    this.loadData()
    console.log('Initial database state:', this.data);
  }

  private loadData() {
    try {
      console.log('Loading data from:', this.dataPath);
      const data = readFileSync(this.dataPath, "utf-8")
      console.log('Raw data from file:', data);
      const parsedData = JSON.parse(data) as Database
      console.log('Parsed data:', parsedData);
      
      // Validate data structure
      if (!parsedData.challenges || !Array.isArray(parsedData.challenges)) {
        console.error('Invalid data structure: challenges is not an array');
        throw new Error("Invalid data structure")
      }
      
      this.data = parsedData
      console.log('Data loaded successfully');
    } catch (error) {
      console.error('Error loading db.json:', error)
      // Initialize with empty data if file doesn't exist or is corrupted
      this.data = {
        challenges: [],
        activeChallengeId: null
      }
      this.saveData()
    }
  }

  private saveData() {
    writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2))
  }

  async createChallenge(image: File, answer: string): Promise<Challenge> {
    const filename = `${Date.now()}.jpg`
    const imagePath = join(this.imagesDir, filename)
    const buffer = Buffer.from(await image.arrayBuffer())
    await writeFileAsync(imagePath, buffer)

    const challenge = {
      id: Date.now().toString(),
      image: filename,
      answer,
      guesses: []
    }

    this.data.challenges.push(challenge)
    this.data.activeChallengeId = challenge.id
    this.saveData()

    return challenge
  }

  async getCurrentChallenge(): Promise<Challenge | null> {
    console.log('Getting current challenge. Active ID:', this.data.activeChallengeId);
    console.log('All challenges:', this.data.challenges);
    if (!this.data.activeChallengeId) return null
    const challenge = this.data.challenges.find(c => c.id === this.data.activeChallengeId)
    console.log('Found challenge:', challenge);
    return challenge || null
  }

  async submitGuess(
    idNumber: string,
    name: string,
    guess: string
  ): Promise<{ isCorrect: boolean; message: string }> {
    console.log('Current database state:', this.data);
    const challenge = await this.getCurrentChallenge()
    console.log('Current challenge:', challenge);
    if (!challenge) {
      throw new Error("No active challenge")
    }

    const isCorrect = guess.toLowerCase() === challenge.answer.toLowerCase()
    const timestamp = new Date().toISOString()

    console.log('Adding guess to challenge:', {
      idNumber,
      name,
      guess,
      timestamp,
      isCorrect
    });

    challenge.guesses.push({
      idNumber,
      name,
      guess,
      timestamp,
      isCorrect
    })
    console.log('Updated challenge:', challenge);
    this.saveData()
    console.log('Data saved');

    return {
      isCorrect,
      message: isCorrect ? "ניחוש נכון!" : "ניחוש שגוי, נסה שוב",
    }
  }

  async getLeaderboard(): Promise<{
    idNumber: string
    name: string
    correctGuesses: number
    totalGuesses: number
  }[]> {
    const playerStats = new Map<string, { correctGuesses: number; totalGuesses: number }>()
    
    this.data.challenges.forEach(challenge => {
      challenge.guesses.forEach(guess => {
        const stats = playerStats.get(guess.idNumber) || { correctGuesses: 0, totalGuesses: 0 }
        stats.totalGuesses++
        if (guess.isCorrect) stats.correctGuesses++
        playerStats.set(guess.idNumber, stats)
      })
    })

    return Array.from(playerStats.entries()).map(([idNumber, stats]) => ({
      idNumber,
      name: this.data.challenges.find(c => c.guesses.some(g => g.idNumber === idNumber))?.guesses.find(g => g.idNumber === idNumber)?.name || "",
      correctGuesses: stats.correctGuesses,
      totalGuesses: stats.totalGuesses
    }))
  }

  async eraseAllData(): Promise<void> {
    this.data = {
      challenges: [],
      activeChallengeId: null
    }
    this.saveData()
  }
}

export const db = new JsonDatabase() 