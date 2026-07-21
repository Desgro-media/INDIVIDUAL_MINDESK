"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

type FaqItem = { q: string; a: string };

export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openSet, setOpenSet] = useState<Set<number>>(new Set([0]));

  const toggle = (i: number) => {
    setOpenSet((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {items.map((item, i) => {
        const isOpen = openSet.has(i);
        return (
          <div
            key={item.q}
            className={`group relative rounded-2xl border transition-all duration-300 overflow-hidden ${
              isOpen
                ? "border-[#4f6ef7]/30 bg-white shadow-[0_16px_40px_rgba(79,110,247,0.14)]"
                : "border-[#E4E8FF] bg-white hover:border-[#4f6ef7]/25 hover:shadow-[0_8px_24px_rgba(80,110,200,0.08)]"
            }`}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#4f6ef7]/25 to-transparent opacity-0 transition-opacity duration-300"
              style={{ opacity: isOpen ? 1 : 0 }}
            />
            <button
              onClick={() => toggle(i)}
              className="w-full flex items-center gap-4 md:gap-5 p-6 md:p-8 text-left outline-none"
              aria-expanded={isOpen}
            >
              <span
                className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold tabular-nums border transition-colors duration-300 ${
                  isOpen
                    ? "border-[#4f6ef7]/40 bg-[#4f6ef7]/10 text-[#4f6ef7]"
                    : "border-[#D6DCFA] text-[#8a90bc] group-hover:text-[#4a5282] group-hover:border-[#4f6ef7]/30"
                }`}
              >
                {String(i + 1).padStart(2, "0")}
              </span>

              <span className="flex-1 font-semibold text-[#1b2048] text-[17px] md:text-lg">
                {item.q}
              </span>

              <span
                className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-300 ${
                  isOpen
                    ? "border-[#4f6ef7]/40 bg-[#4f6ef7]/10 rotate-45"
                    : "border-[#D6DCFA] text-[#8a90bc] group-hover:border-[#4f6ef7]/30 group-hover:text-[#4a5282]"
                }`}
              >
                <Plus className={`w-4 h-4 ${isOpen ? "text-[#4f6ef7]" : ""}`} />
              </span>
            </button>

            <div
              className="grid transition-[grid-template-rows] duration-300 ease-out"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <div className="pl-[68px] md:pl-[80px] pr-6 md:pr-8 pb-7 md:pb-8">
                  <p className="text-[#4a5282] leading-relaxed text-[15px] md:text-base">
                    {item.a}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
