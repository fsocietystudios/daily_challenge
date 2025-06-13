"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MagicCard } from "@/components/magicui/magic-card";
import { useTheme } from "next-themes";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { theme } = useTheme();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        window.location.href = "/panel";
      } else {
        setError(data.message || "שם משתמש או סיסמה שגויים");
      }
    } catch (error) {
      console.error('Login error:', error);
      setError("שגיאה בהתחברות. אנא נסה שוב.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center" dir="rtl">
      <Card className="p-0 max-w-sm w-full text-center shadow-none border-none">
        <MagicCard
          gradientColor={theme === "dark" ? "#262626" : "#D9D9D955"}
          className="p-0"
        >
          <CardHeader className="border-b border-border p-4 [.border-b]:pb-4">
            <CardTitle>כניסה למערכת</CardTitle>
            <CardDescription>
              הכנס את פרטי ההתחברות שלך
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Input
                  id="username"
                  type="text"
                  placeholder="שם משתמש"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="text-center"
                  disabled={isLoading}
                />
                <Input
                  id="password"
                  type="password"
                  placeholder="סיסמה"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="text-center"
                  disabled={isLoading}
                />
                {error && <p className="text-red-500 text-sm">{error}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "מתחבר..." : "התחבר"}
              </Button>
            </form>
          </CardContent>
        </MagicCard>
      </Card>
    </main>
  );
} 