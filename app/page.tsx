"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import confetti from 'canvas-confetti';
import { Background } from "@/components/background/background";
import { ModeToggle } from "@/components/ui/dark-mode-toggle";
import { RainbowButton } from "@/components/magicui/rainbow-button";
import { VelocityScroll } from "@/components/magicui/scroll-based-velocity";
import { MagicCard } from "@/components/magicui/magic-card";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Leaderboard } from "@/components/leaderboard";
import { Button } from '@/components/ui/button';

export default function Home() {
  const { theme } = useTheme();
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [guess, setGuess] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<{
    overall: { userId: string; name: string; pluga: string; team: string; correctGuesses: number; totalGuesses: number }[];
    byPluga: { [key: string]: { correctGuesses: number; totalGuesses: number; users: number } };
    byTeam: { [key: string]: { correctGuesses: number; totalGuesses: number; users: number } };
  }>({ overall: [], byPluga: {}, byTeam: {} });
  const [hasGuessed, setHasGuessed] = useState(false);
  const [error, setError] = useState("");
  const [challenge, setChallenge] = useState<{ image: string } | null>(null);
  
  useEffect(() => {
    fetchChallenge();
  }, []);

  const fetchChallenge = async () => {
    try {
      console.log('Fetching challenge...');
      setIsInitialLoading(true);
      setError("");
      const response = await fetch("/api/challenge");
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error("Failed to fetch challenge");
      }
      
      const data = await response.json();
      console.log('Challenge data:', data);
      
      if (data.error) {
        setError(data.error);
        setChallenge(null);
        return;
      }

      if (!data.challenge || !data.challenge.image) {
        console.warn('No challenge or image in response:', data);
        setError("לא נמצא אתגר פעיל");
        setChallenge(null);
        return;
      }

      setChallenge(data.challenge);
      setLeaderboard(data.leaderboard);
    } catch (error) {
      console.error("Error fetching challenge:", error);
      setError("שגיאה בטעינת האתגר");
      setChallenge(null);
    } finally {
      setIsInitialLoading(false);
    }
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/challenge', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          guess,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בשליחת הניחוש');
      }

      setMessage(data.message);
      if (data.isCorrect) {
        setGuess('');
        setHasGuessed(true);
        triggerConfetti();
      }

      if (data.leaderboard) {
        console.log('Updating leaderboard with:', data.leaderboard);
        setLeaderboard(data.leaderboard);
      } else {
        console.warn('No leaderboard data in response');
      }
    } catch (error: any) {
      setMessage(error.message || 'שגיאה בשליחת הניחוש');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <main className="relative min-h-screen" dir="rtl">
      <Background />
      <div className="relative z-10 min-h-screen flex flex-col">
        <div className="flex flex-row justify-between p-10 gap-5">
          <ModeToggle />
          <div className="flex gap-2">
            <RainbowButton 
              variant={"default"} 
              className=""
              onClick={() => router.push("/register")}
            >
              הרשמה
            </RainbowButton>
            <RainbowButton 
              variant={"default"} 
              className=""
              onClick={() => router.push("/login")}
            >
              פאנל
            </RainbowButton>
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-center items-center gap-20 px-10">
          {isInitialLoading ? (
            <div className="w-full text-center">
              <div className="relative w-64 h-64 mx-auto">
                <Image
                  src="/logo.png"
                  alt="Loading"
                  fill
                  className="object-contain animate-pulse"
                  priority
                />
              </div>
            </div>
          ) : error ? (
            <div className="w-full text-center">
              <VelocityScroll className="text-4xl font-bold">{error}</VelocityScroll>
            </div>
          ) : !challenge ? (
            <div className="w-full text-center">
              <VelocityScroll className="text-4xl font-bold">לא נמצא אתגר פעיל</VelocityScroll>
            </div>
          ) : (
            <div className="md:-mt-32 animate-fade-in flex flex-col md:flex-row gap-10 md:gap-20 justify-center items-start w-full max-w-[1200px]">
              <Card className="p-0 w-full md:w-[400px] text-center shadow-none border-none">
                <MagicCard
                  gradientColor={theme === "dark" ? "#262626" : "#D9D9D955"}
                  className="p-0"
                >
                  <CardHeader className="border-b border-border p-4 [.border-b]:pb-4">
                    <CardTitle>החידון היומי</CardTitle>
                    <CardDescription>
                      ברוכים הבאים לחידון היומי של פלוגת הבשור
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 flex justify-center">
                    <div className="relative w-[250px] h-[250px] md:w-[300px] md:h-[300px]">
                      {challenge?.image ? (
                        <Image
                          src={challenge.image}
                          alt="Daily Challenge"
                          fill
                          className="object-contain rounded-2xl"
                          priority
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-2xl">
                          <p className="text-gray-500 dark:text-gray-400">אין תמונה זמינה</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 border-t border-border [.border-t]:pt-4">
                    <form onSubmit={handleSubmit} className="w-full space-y-4">
                      <div className="space-y-2">
                        <div>
                          <label className="block text-sm font-medium mb-1">מזהה משתמש</label>
                          <Input
                            type="text"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            required
                            className="w-full"
                            placeholder="הכנס את המזהה שקיבלת בהרשמה"
                          />
                        </div>

                        {/* <div>
                          <label className="block text-sm font-medium mb-1">שם מלא</label>
                          <Input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full"
                            placeholder="הכנס את שמך המלא"
                          />
                        </div> */}

                        <div>
                          <label className="block text-sm font-medium mb-1">ניחוש</label>
                          <Input
                            type="text"
                            value={guess}
                            onChange={(e) => setGuess(e.target.value)}
                            required
                            className="w-full"
                            placeholder="הכנס את הניחוש שלך"
                          />
                        </div>
                      </div>
                      {message && (
                        <div className={`mt-4 p-4 rounded ${message.includes('נכון') ? 'bg-green-500' : 'bg-red-500'}`}>
                          <p className="text-center">{message}</p>
                        </div>
                      )}
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading}
                      >
                        {isLoading ? 'שולח...' : 'שלח ניחוש'}
                      </Button>
                    </form>
                  </CardFooter>
                </MagicCard>
              </Card>
              <div className="w-full md:w-[400px]">
                <Leaderboard data={leaderboard} />
              </div>
            </div>
          )}
        </div>
        {!isInitialLoading && (
          <div className="opacity-5 absolute bottom-0 left-0 right-0 flex w-full flex-col items-center justify-center overflow-hidden" dir="ltr">
            <VelocityScroll className="text-center w-full">החידון היומי</VelocityScroll>
          </div>
        )}
      </div>
    </main>
  );
}