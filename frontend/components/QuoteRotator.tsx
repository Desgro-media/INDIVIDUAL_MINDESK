"use client";

import { useState, useEffect } from "react";
import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({ subsets: ["latin"], style: ["italic"] });

const QUOTES = [
  "Healing is not linear, but it is always possible.",
  "You don't have to control your thoughts. You just have to stop letting them control you.",
  "Your mental health is a priority. Your happiness is an essential.",
  "Every step forward, no matter how small, is progress.",
  "A safe space to pause, reflect, and heal."
];

export default function QuoteRotator() {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    // Calculate display duration: Base 2 seconds + 300ms per word
    const wordCount = QUOTES[index].split(" ").length;
    const duration = 2000 + (wordCount * 300);

    const timer = setTimeout(() => {
      setFade(false); 
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % QUOTES.length);
        setFade(true); 
      }, 500); // Wait for fade out to finish before changing text
    }, duration);

    return () => clearTimeout(timer);
  }, [index]);

  return (
    <section className="w-full bg-gradient-to-r from-[#F2F4FF] to-[#F5F0FF] py-8 border-y border-[#E4E8FF] shadow-inner relative overflow-hidden">
      {/* Decorative quotes marks faintly in background */}
      <div className={`${playfair.className} absolute -top-10 left-1/2 -translate-x-1/2 text-[120px] text-[#4f6ef7]/[0.07] pointer-events-none select-none`}>
        "
      </div>

      <div className="max-w-4xl mx-auto px-6 text-center min-h-[3.5rem] flex items-center justify-center relative z-10">
        <p
          className={`${playfair.className} text-[#1b2048]/85 text-xl md:text-2xl font-light tracking-wide transition-all duration-500 transform ${fade ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95'}`}
        >
          "{QUOTES[index]}"
        </p>
      </div>
    </section>
  );
}
