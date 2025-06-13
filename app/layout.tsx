import type { Metadata } from "next";
import { Assistant } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import HolyLoader from "holy-loader";
import "./globals.css";

const assistantFont = Assistant({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "החידון היומי",
  description: "החידון היומי של פלוגת הבשור - אתגר יומי למשתתפים",
  keywords: ["חידון", "אתגר", "פלוגת הבשור", "חידון יומי"],
  authors: [{ name: "פלוגת הבשור" }],
  creator: "פלוגת הבשור",
  publisher: "פלוגת הבשור",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  openGraph: {
    title: "החידון היומי",
    description: "החידון היומי של פלוגת הבשור - אתגר יומי למשתתפים",
    type: "website",
    locale: "he_IL",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body
        className={`${assistantFont.variable} antialiased`}
      >
        <HolyLoader zIndex={9999} color="#25821e" />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}