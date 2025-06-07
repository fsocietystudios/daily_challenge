"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MagicCard } from "@/components/magicui/magic-card";
import { useTheme } from "next-themes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { validateAndSanitizeAdmin } from '@/lib/security';
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Panel() {
  const { theme } = useTheme();
  const router = useRouter();
  const [image, setImage] = useState<File | null>(null);
  const [answer, setAnswer] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isErasing, setIsErasing] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);

      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const validationResult = validateAndSanitizeAdmin({ answer });
      if (!validationResult || !validationResult.answer) {
        setMessage('שגיאה בוולידציה');
        return;
      }

      if (!image) {
        setMessage("נדרש להעלות תמונה");
        return;
      }

      const formData = new FormData();
      formData.append("image", image);
      formData.append("answer", validationResult.answer);

      const response = await fetch("/api/challenge", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to create challenge");
      }

      setMessage("האתגר נוצר בהצלחה");
      setImage(null);
      setAnswer("");
      setPreviewUrl(null);
      router.push("/");
    } catch (error) {
      console.error("Error creating challenge:", error);
      setMessage("שגיאה ביצירת האתגר");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEraseData = async () => {
    setIsErasing(true);
    try {
      const response = await fetch("/api/challenge/erase", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to erase data");
      }

      setMessage("כל הנתונים נמחקו בהצלחה");
    } catch (error) {
      console.error("Error erasing data:", error);
      setMessage("שגיאה במחיקת הנתונים");
    } finally {
      setIsErasing(false);
    }
  };

  return (
    <main className="relative min-h-screen p-10 flex items-center justify-center" dir="rtl">
      <Card className="p-0 max-w-4xl w-full text-center shadow-none border-none">
        <MagicCard
          gradientColor={theme === "dark" ? "#262626" : "#D9D9D955"}
          className="p-0"
        >
          <CardHeader className="border-b border-border p-4 [.border-b]:pb-4">
            <div className="flex justify-between items-center mb-4">
              <Button
                variant="outline"
                onClick={() => router.push("/")}
                className="flex items-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
                חזרה לדף הבית
              </Button>
              <div>
                <CardTitle>פאנל אדמינים</CardTitle>
                <CardDescription>
                  ניהול החידון היומי
                </CardDescription>
              </div>
              <div className="w-[100px]" /> {/* Spacer for balance */}
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
              <div className="space-y-2">
                <div className="flex flex-col items-center gap-4">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full max-w-xs"
                  />
                  {previewUrl && (
                    <div className="relative w-[300px] h-[300px]">
                      <Image
                        src={previewUrl}
                        alt="Preview"
                        fill
                        className="object-contain rounded-lg"
                      />
                    </div>
                  )}
                </div>
                <Input
                  type="text"
                  placeholder="התשובה הנכונה"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="text-center"
                />
              </div>
              {message && (
                <p className={`text-sm ${message.includes("שגיאה") ? "text-red-500" : "text-green-500"}`}>
                  {message}
                </p>
              )}
              <div className="flex flex-col gap-2">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'שולח...' : 'צור אתגר'}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full" disabled={isErasing}>
                      {isErasing ? 'מוחק...' : 'מחק את כל הנתונים'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle dir="rtl">האם אתה בטוח?</AlertDialogTitle>
                      <AlertDialogDescription dir="rtl">
                        פעולה זו תמחק את כל הנתונים כולל אתגרים וניחושים. לא ניתן לבטל פעולה זו.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="w-full flex flex-row gap-5" dir="rtl">
                      <AlertDialogCancel>ביטול</AlertDialogCancel>
                      <AlertDialogAction onClick={handleEraseData} className="bg-red-500 hover:bg-red-600">
                        מחק הכל
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </form>
          </CardContent>
        </MagicCard>
      </Card>
    </main>
  );
} 