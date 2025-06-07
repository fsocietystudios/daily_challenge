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
import { Button } from "@/components/ui/button";
import { Leaderboard } from "@/components/leaderboard";
import { validateAndSanitize } from '@/lib/security';

export default function Home() {
  const { theme } = useTheme();
  const router = useRouter();
  const [idNumber, setIdNumber] = useState("");
  const [name, setName] = useState("");
  const [guess, setGuess] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<{
    idNumber: string
    name: string
    correctGuesses: number
    totalGuesses: number
  }[]>([]);
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
        return;
      }

      setChallenge(data.challenge);
      setLeaderboard(data.leaderboard);
    } catch (error) {
      console.error("Error fetching challenge:", error);
      setError("שגיאה בטעינת האתגר");
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
    if (!idNumber || !name || !guess) {
      setError("נא למלא את כל השדות");
      return;
    }
    setIsSubmitting(true);
    setMessage("");

    try {
      console.log('Submitting guess with:', { idNumber, name, guess });
      const validationResult = validateAndSanitize({ idNumber, name, guess });
      if (!validationResult) {
        setMessage('שגיאה בוולידציה');
        return;
      }

      const { idNumber: validId, name: validName, guess: validGuess } = validationResult;
      console.log('Sending request with validated data:', { validId, validName, validGuess });
      
      const response = await fetch('/api/challenge', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idNumber: validId,
          name: validName,
          guess: validGuess,
        }),
      });

      console.log('Response status:', response.status);
      if (!response.ok) {
        throw new Error("Failed to submit guess");
      }

      const data = await response.json();
      console.log('Response data:', data);
      
      if (!data) {
        throw new Error("No data received from server");
      }

      if (data.alreadyGuessed) {
        setMessage("כבר ניחשת את האתגר הזה");
        setHasGuessed(true);
      } else if (data.isCorrect) {
        setMessage("כל הכבוד! ניחשת נכון");
        setHasGuessed(true);
        setGuess("");
        triggerConfetti();
      } else {
        setMessage("לא נכון, נסה שוב");
        setHasGuessed(true);
        setGuess("");
      }

      if (data.leaderboard) {
        console.log('Updating leaderboard with:', data.leaderboard);
        setLeaderboard(data.leaderboard);
      } else {
        console.warn('No leaderboard data in response');
      }
    } catch (error) {
      console.error("Error submitting guess:", error);
      setError("שגיאה בשליחת הניחוש");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <main className="relative min-h-screen" dir="rtl">
      <Background />
      <div className="relative z-10 min-h-screen flex flex-col">
        <div className="flex flex-row justify-between p-10 gap-5">
          <ModeToggle />
          <RainbowButton 
            variant={"default"} 
            className=""
            onClick={() => router.push("/login")}
          >
            פאנל אדמינים
          </RainbowButton>
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
            <div className="md:-mt-32 animate-fade-in flex flex-col md:flex-row gap-10 md:gap-20 justify-center items-center w-full max-w-[1200px]">
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
                      <Image
                        src={challenge.image}
                        alt="Daily Challenge"
                        fill
                        className="object-contain rounded-2xl"
                        priority
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 border-t border-border [.border-t]:pt-4">
                    <form onSubmit={handleSubmit} className="w-full space-y-4">
                      <div className="space-y-2">
                        <div>
                          <label htmlFor="idNumber" className="block text-sm font-medium mb-1">
                            מספר אישי
                          </label>
                          <Input
                            id="idNumber"
                            value={idNumber}
                            onChange={(e) => setIdNumber(e.target.value)}
                            disabled={isSubmitting || hasGuessed}
                            className="w-full text-center placeholder:text-center"
                            placeholder="הכנס מספר אישי"
                            dir="ltr"
                          />
                        </div>

                        <div>
                          <label htmlFor="name" className="block text-sm font-medium mb-1">
                            שם מלא
                          </label>
                          <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={isSubmitting || hasGuessed}
                            className="w-full text-center placeholder:text-center"
                            placeholder="הכנס את שמך המלא"
                          />
                        </div>

                        <div>
                          <label htmlFor="guess" className="block text-sm font-medium mb-1">
                            ניחוש
                          </label>
                          <Input 
                            id="guess" 
                            type="text" 
                            className="w-full text-center placeholder:text-center" 
                            placeholder="נחש כאן..." 
                            value={guess}
                            onChange={(e) => setGuess(e.target.value)}
                            disabled={hasGuessed || isSubmitting}
                          />
                        </div>
                      </div>
                      {message && (
                        <p className={`text-sm ${message.includes("כל הכבוד") ? "text-green-500" : "text-red-500"}`}>
                          {message}
                        </p>
                      )}
                      {error && (
                        <p className="text-sm text-red-500">
                          {error}
                        </p>
                      )}
                      <RainbowButton 
                        variant={"default"} 
                        type="submit"
                        className="w-full" 
                        disabled={hasGuessed || isSubmitting}
                      >
                        {isSubmitting ? "טוען..." : "שלח ניחוש"}
                      </RainbowButton>
                    </form>
                  </CardFooter>
                </MagicCard>
              </Card>
              <Leaderboard data={leaderboard} />
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