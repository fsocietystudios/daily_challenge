"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MagicCard } from "@/components/magicui/magic-card";
import { useTheme } from "next-themes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LeaderboardProps {
  data: {
    overall: {
      userId: string;
      name: string;
      pluga: string;
      team: string;
      correctGuesses: number;
      totalGuesses: number;
    }[];
    byPluga: {
      [key: string]: {
        correctGuesses: number;
        totalGuesses: number;
        users: number;
      };
    };
    byTeam: {
      [key: string]: {
        correctGuesses: number;
        totalGuesses: number;
        users: number;
      };
    };
  };
}

export function Leaderboard({ data }: LeaderboardProps) {
  const { theme } = useTheme();
  const sortedData = [...data.overall]
    .filter(player => player.totalGuesses > 0)
    .sort((a, b) => b.correctGuesses - a.correctGuesses);

  const sortedPlugas = Object.entries(data.byPluga)
    .filter(([_, stats]) => stats.totalGuesses > 0)
    .sort(([_, a], [__, b]) => b.correctGuesses - a.correctGuesses);

  const sortedTeams = Object.entries(data.byTeam)
    .filter(([_, stats]) => stats.totalGuesses > 0)
    .sort(([_, a], [__, b]) => b.correctGuesses - a.correctGuesses);

  const renderPlayerList = (players: typeof sortedData) => (
    <div className="space-y-2 max-h-[200px] md:max-h-[400px] overflow-y-auto">
      {players.map((player, index) => (
        <div
          key={`${player.userId}-${index}`}
          className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
        >
          <div dir="rtl" className="text-sm text-muted-foreground">
            {Math.round((player.correctGuesses / player.totalGuesses) * 100)}% ({player.correctGuesses} מתוך {player.totalGuesses})
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{player.name}</span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              index === 0 ? "bg-yellow-500" :
              index === 1 ? "bg-gray-400" :
              index === 2 ? "bg-amber-600" :
              "bg-muted"
            }`}>
              {index + 1}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderGroupList = (groups: [string, { correctGuesses: number; totalGuesses: number; users: number }][]) => (
    <div className="space-y-2 max-h-[200px] md:max-h-[400px] overflow-y-auto">
      {groups.map(([name, stats], index) => (
        <div
          key={`${name}-${index}`}
          className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
        >
          <div dir="rtl" className="text-sm text-muted-foreground">
            {Math.round((stats.correctGuesses / stats.totalGuesses) * 100)}% ({stats.correctGuesses} מתוך {stats.totalGuesses})
            <span className="text-xs ml-2 mr-2">({stats.users} משתתפים)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{name}</span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              index === 0 ? "bg-yellow-500" :
              index === 1 ? "bg-gray-400" :
              index === 2 ? "bg-amber-600" :
              "bg-muted"
            }`}>
              {index + 1}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Card className="p-0 w-full md:w-[400px] text-center shadow-none border-none">
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
          <Tabs defaultValue="users" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="plugas">ע"פ פלוגה</TabsTrigger>
              <TabsTrigger value="teams">ע"פ צוות</TabsTrigger>
              <TabsTrigger value="users">ע"פ משתתף</TabsTrigger>
            </TabsList>
            <TabsContent value="users">
              {renderPlayerList(sortedData)}
            </TabsContent>
            <TabsContent value="teams">
              {renderGroupList(sortedTeams)}
            </TabsContent>
            <TabsContent value="plugas">
              {renderGroupList(sortedPlugas)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </MagicCard>
    </Card>
  );
} 