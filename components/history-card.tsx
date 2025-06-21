"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MagicCard } from "@/components/magicui/magic-card";
import { useTheme } from "next-themes";
import Image from "next/image";
import { useState } from "react";

interface Challenge {
  id: string;
  image: string;
  answers?: string[];
  answer?: string;
  question?: string;
  guesses: {
    userId: string;
    name: string;
    guess: string;
    timestamp: string;
    isCorrect: boolean;
  }[];
  createdAt: string;
}

interface HistoryCardProps {
  challenges: Challenge[];
}

export function HistoryCard({ challenges }: HistoryCardProps) {
  const { theme } = useTheme();
  const [expandedChallenge, setExpandedChallenge] = useState<string | null>(null);

  // Sort challenges by creation date (newest first)
  const sortedChallenges = [...challenges].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const getAnswers = (challenge: Challenge): string[] => {
    if (challenge.answers && Array.isArray(challenge.answers)) {
      return challenge.answers;
    }
    if (challenge.answer) {
      return [challenge.answer];
    }
    return [];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const toggleExpanded = (challengeId: string) => {
    setExpandedChallenge(expandedChallenge === challengeId ? null : challengeId);
  };

  return (
    <Card className="mb-32 p-0 w-full md:w-[400px] text-center shadow-none border-none" dir="rtl">
      <MagicCard
        gradientColor={theme === "dark" ? "#262626" : "#D9D9D955"}
        className="p-0"
      >
        <CardHeader className="border-b border-border p-4 [.border-b]:pb-4">
          <CardTitle>היסטוריית אתגרים</CardTitle>
          <CardDescription>
            כל האתגרים הקודמים והתשובות הנכונות
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {sortedChallenges.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                אין אתגרים קודמים
              </div>
            ) : (
              sortedChallenges.map((challenge) => {
                const answers = getAnswers(challenge);
                const isExpanded = expandedChallenge === challenge.id;
                const correctGuesses = challenge.guesses.filter(g => g.isCorrect).length;
                const totalGuesses = challenge.guesses.length;

                return (
                  <div
                    key={challenge.id}
                    className="border border-border rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleExpanded(challenge.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        {formatDate(challenge.createdAt)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {correctGuesses}/{totalGuesses} נכונים
                      </span>
                    </div>
                    
                    {challenge.question && (
                      <p className="text-sm text-muted-foreground mb-2 text-right">
                        {challenge.question}
                      </p>
                    )}

                    <div className="relative w-full h-32 mb-2">
                      <Image
                        src={challenge.image}
                        alt="Challenge"
                        fill
                        className="object-cover rounded-md"
                      />
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="text-sm">
                          <span className="font-medium text-green-600">תשובות נכונות:</span>
                          <div className="mt-1 space-y-1">
                            {answers.map((answer, index) => (
                              <div
                                key={index}
                                className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 px-2 py-1 rounded text-xs"
                              >
                                {answer}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground mt-2">
                      לחץ להרחבה
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </MagicCard>
    </Card>
  );
} 