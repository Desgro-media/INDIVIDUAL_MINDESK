import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import ChatbotWidget from "../components/ChatbotWidget";
import { Toaster } from 'sonner';

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: "Mindesk — Practice Management for Freelance Psychologists",
  description: "A booking page, client records, session notes, invoicing, and analytics for independent psychologists.",
  keywords: ["appointment", "booking", "psychologist", "therapy", "practice management"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jakarta.variable} ${playfair.variable}`}>
      <head>
        {/*
          Inline script runs before React hydration — prevents flash of wrong theme.
          Reads pb-theme from localStorage and sets data-theme on <html> immediately.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('pb-theme');
                  if (t === 'dark') {
                    document.documentElement.setAttribute('data-theme', 'dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={jakarta.className}>
        {children}
        <ChatbotWidget />
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
