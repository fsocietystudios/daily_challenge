"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MagicCard } from "@/components/magicui/magic-card";
import { useTheme } from "next-themes";

interface LeaderboardProps {
  data: {
    idNumber: string
    name: string
    correctGuesses: number
    totalGuesses: number
  }[]
}

export function Leaderboard({ data }: LeaderboardProps) {
  const { theme } = useTheme();
  const sortedData = [...data].sort((a, b) => b.correctGuesses - a.correctGuesses);

  return (
    <Card className="mb-32 p-0 w-full md:w-[400px] text-center shadow-none border-none">
      <MagicCard
        gradientColor={theme === "dark" ? "#262626" : "#D9D9D955"}
        className="p-0"
      >
        <CardHeader className="border-b border-border p-4 [.border-b]:pb-4">
          <CardTitle>טבלת המובילים</CardTitle>
          <CardDescription>
            דירוג המשתתפים לפי מספר ניחושים נכונים
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-2 max-h-[200px] md:max-h-[400px] overflow-y-auto">
            {sortedData.map((player, index) => (
              <div
                key={`${player.idNumber}-${index}`}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index === 0 ? "bg-yellow-500" :
                    index === 1 ? "bg-gray-400" :
                    index === 2 ? "bg-amber-600" :
                    "bg-muted"
                  }`}>
                    {index + 1}
                  </div>
                  <span className="font-medium">{player.name}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {Math.round((player.correctGuesses / player.totalGuesses) * 100)}% ({player.correctGuesses} מתוך {player.totalGuesses})
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </MagicCard>
    </Card>
  );
} 