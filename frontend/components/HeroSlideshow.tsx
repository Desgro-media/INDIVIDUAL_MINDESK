"use client";

import { useState, useEffect } from "react";
import { Lock } from "lucide-react";

const SLIDES = [
  { image: "/screens/overview.png", alt: "Mindesk booking overview" },
  { image: "/screens/appointments.png", alt: "Mindesk appointments list" },
  { image: "/screens/analytics.png", alt: "Mindesk analytics dashboard" },
  { image: "/screens/billing.png", alt: "Mindesk billing and invoices" },
  { image: "/screens/services.png", alt: "Mindesk services catalog" },
];

export default function HeroSlideshow() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setIndex(i => (i + 1) % SLIDES.length);
    }, 3800);
    return () => clearInterval(timer);
  }, [paused]);

  return (
    <div
      className="relative w-full rounded-2xl md:rounded-[28px] overflow-hidden border border-[#E4E8FF] bg-white shadow-[0_40px_90px_-24px_rgba(80,110,200,0.38)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Browser chrome */}
      <div className="relative flex items-center justify-center px-5 py-3.5 md:py-4 border-b border-[#EDEFFC] bg-[#FAFBFF]">
        <div className="absolute left-5 flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-white border border-[#E4E8FF] text-[11px] text-[#8a90bc]">
          <Lock className="w-2.5 h-2.5" />
          app.mindesk.in
        </div>
      </div>

      {/* Slides */}
      <div className="relative aspect-[16/10] sm:aspect-[2/1] bg-[#F8F9FF]">
        {SLIDES.map((s, i) => (
          <img
            key={s.image}
            src={s.image}
            alt={s.alt}
            className={`absolute inset-0 w-full h-full object-cover object-left-top transition-opacity duration-700 ease-in-out ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
      </div>

      {/* Slide indicators — dark pill so dots read over any screenshot content */}
      <div className="absolute bottom-4 md:bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-full bg-black/30 backdrop-blur-sm">
        {SLIDES.map((s, i) => (
          <button
            key={s.image}
            onClick={() => setIndex(i)}
            aria-label={`Show slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === index ? "w-6 bg-white" : "w-1.5 bg-white/45 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
