"use client";

import { useEffect, useRef } from "react";

/* Tracks the pointer over an element and writes its position (and the angle
   from center, for the edge-trace accent) into CSS custom properties that
   `.spotlight` in globals.css reads. Native listeners + direct style writes
   — no React state, so hovering never triggers a re-render. */
export function useSpotlightRef<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      el.style.setProperty("--sx", `${x}px`);
      el.style.setProperty("--sy", `${y}px`);
      const angle = Math.atan2(y - rect.height / 2, x - rect.width / 2) * (180 / Math.PI);
      el.style.setProperty("--sa", angle.toFixed(1));
    };

    el.addEventListener("pointermove", handleMove);
    return () => el.removeEventListener("pointermove", handleMove);
  }, []);

  return ref;
}
