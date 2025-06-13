"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MagicCard } from "@/components/magicui/magic-card";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PLUGA_OPTIONS, TEAM_OPTIONS, Pluga, Team } from "@/lib/constants";
import { Copy, Check } from "lucide-react";

export default function Register() {
  const { theme } = useTheme();
  const router = useRouter();
  const [name, setName] = useState("");
  const [pluga, setPluga] = useState<Pluga | "">("");
  const [team, setTeam] = useState<Team | "">("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // Prevent duplicate submissions
    setIsLoading(true);
    setMessage("");

    try {
      console.log('Submitting registration form with data:', { name, pluga, team });
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          pluga,
          team,
        }),
      });

      console.log('Registration response status:', response.status);
      const data = await response.json();
      console.log('Registration response data:', data);

      if (!response.ok) {
        throw new Error(data.error || "שגיאה בהרשמה");
      }

      setUserId(data.userId);
      setMessage("ההרשמה בוצעה בהצלחה! אנא שמור את המזהה שלך:");
      
      // Clear form after successful registration
      setName("");
      setPluga("");
      setTeam("");
    } catch (error: any) {
      console.error("Error registering:", error);
      setMessage(error.message || "שגיאה בהרשמה");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlugaChange = (value: string) => {
    setPluga(value as Pluga);
    setTeam(""); // Reset team when pluga changes
  };

  const handleCopyUserId = async () => {
    try {
      await navigator.clipboard.writeText(userId);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <main className="relative min-h-screen p-10 flex items-center justify-center" dir="rtl">
      <div className="w-full max-w-md">
        <Card className="p-0 w-full text-center shadow-none border-none">
          <MagicCard
            gradientColor={theme === "dark" ? "#262626" : "#D9D9D955"}
            className="p-0"
          >
            <CardHeader className="border-b border-border p-4 [.border-b]:pb-4">
              <div className="flex justify-between items-center mb-4 w-full" dir="rtl">
                <div className="text-right">
                  <CardTitle>הרשמה לאתגר היומי</CardTitle>
                  <CardDescription>
                    מלא את הפרטים הבאים כדי להירשם
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => router.push("/")}
                  className="flex items-center gap-2"
                >
                  חזרה לבית
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="שם מלא"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-center"
                    required
                    dir="rtl"
                  />
                  <Select
                    value={pluga}
                    onValueChange={handlePlugaChange}
                    required
                  >
                    <SelectTrigger className="text-center" dir="rtl">
                      <SelectValue placeholder="בחר פלוגה" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLUGA_OPTIONS.map((pluga) => (
                        <SelectItem key={pluga} value={pluga}>
                          {pluga}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={team}
                    onValueChange={(value) => setTeam(value as Team)}
                    required
                    disabled={!pluga}
                  >
                    <SelectTrigger className="text-center" dir="rtl">
                      <SelectValue placeholder={pluga ? "בחר צוות" : "בחר קודם פלוגה"} />
                    </SelectTrigger>
                    <SelectContent>
                      {pluga && TEAM_OPTIONS[pluga as keyof typeof TEAM_OPTIONS].map((team) => (
                        <SelectItem key={team} value={team}>
                          {team}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {message && (
                  <div className={`mt-4 p-4 rounded ${userId ? 'bg-green-500' : 'bg-red-500'}`}>
                    <p className="text-center">{message}</p>
                    {userId && (
                      <div className="text-black mt-2 p-2 bg-white rounded border">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCopyUserId}
                            className="h-8 w-8 p-0"
                          >
                            {copySuccess ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <code className="block text-center font-mono">{userId}</code>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "שולח..." : "שלח הרשמה"}
                </Button>
              </form>
            </CardContent>
          </MagicCard>
        </Card>
      </div>
    </main>
  );
} 