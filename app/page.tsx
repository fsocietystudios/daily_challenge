"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { Background } from "@/components/background/background";
import { ModeToggle } from "@/components/ui/dark-mode-toggle";
import { RainbowButton } from "@/components/magicui/rainbow-button";
import { VelocityScroll } from "@/components/magicui/scroll-based-velocity";
import { MagicCard } from "@/components/magicui/magic-card";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { theme } = useTheme();
  
  return (
    <main className="relative min-h-screen" dir="rtl">
      <Background />
      <div className="relative z-10 h-screen">
        <div className="relative flex flex-row justify-between p-10 gap-5">
          <ModeToggle />
          <RainbowButton variant={"default"} className="">פאנל אדמינים</RainbowButton>
        </div>
        <div className="flex flex-row h-[70vh] justify-center items-center">
          <Card className="p-0 max-w-sm w-full text-center shadow-none border-none">
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
                <Image
                  className="rounded-2xl"
                  src="/challenge.jpg"
                  alt="Next.js logo"
                  width={300}
                  height={300}
                  priority
                />
              </CardContent>
              <CardFooter className="p-4 border-t border-border [.border-t]:pt-4">
                <form className="w-full space-y-4">
                  <div className="space-y-2">
                    <Input 
                      id="guess" 
                      type="text" 
                      className="w-full text-center placeholder:text-center" 
                      placeholder="נחש כאן..." 
                    />
                  </div>
                  <Button className="w-full">ניחוש</Button>
                </form>
              </CardFooter>
            </MagicCard>
          </Card>
        </div>
        <div className="opacity-5 absolute bottom-0 left-0 right-0 flex w-full flex-col items-center justify-center overflow-hidden" dir="ltr">
          <VelocityScroll className="text-center w-full">החידון היומי</VelocityScroll>
        </div>
      </div>
    </main>
  );
}