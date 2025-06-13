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

export default function Welcome() {
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
    // Check if user is already logged in
    const savedUserId = localStorage.getItem("userId");
    if (savedUserId) {
      router.push("/challenge");
    }
  }, [router]);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    
    if (!userId.trim()) {
      setError("נא להזין מזהה משתמש");
      setIsLoading(false);
      return;
    }

    try {
      // Validate userId with backend
      const response = await fetch('/api/validate-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: userId.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'שגיאה באימות המשתמש');
      }

      if (!data.isValid) {
        setError("מזהה משתמש לא תקין");
        setIsLoading(false);
        return;
      }

      // Store userId in localStorage only if valid
      localStorage.setItem("userId", userId.trim());
      router.push("/challenge");
    } catch (error: any) {
      setError(error.message || 'שגיאה בהתחברות');
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
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-center items-center gap-10 px-4">
          <div className="relative w-64 h-64">
            <Image
              src="/logo.png"
              alt="Logo"
              width={300}
              height={300}
              className="object-contain"
              priority
            />
          </div>
          <Card className="w-full max-w-md">
            <MagicCard
              gradientColor={theme === "dark" ? "#262626" : "#D9D9D955"}
              className="p-0"
            >
              <CardHeader className="border-b border-border p-4">
                <CardTitle>כניסה</CardTitle>
                <CardDescription>
                  הזן את מזהה המשתמש שלך כדי להתחבר
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">מזהה משתמש</label>
                    <Input
                      type="text"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      placeholder="הכנס את המזהה שקיבלת בהרשמה"
                      className="w-full"
                      disabled={isLoading}
                    />
                    {error && (
                      <p className="text-sm text-red-500">{error}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'מתחבר...' : 'התחבר'}
                  </Button>
                </form>
              </CardContent>
              <CardFooter className="p-4 border-t border-border">
                <p className="text-sm text-center w-full">
                  אין לך מזהה?{" "}
                  <Button
                    variant="link"
                    className="p-0"
                    onClick={() => router.push("/register")}
                  >
                    הירשם כאן
                  </Button>
                </p>
              </CardFooter>
            </MagicCard>
          </Card>
        </div>
      </div>
    </main>
  );
}