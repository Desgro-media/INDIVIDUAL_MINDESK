"use client";

import React from "react";
import Link, { type LinkProps } from "next/link";
import { useSpotlightRef } from "../lib/useSpotlight";

/* Thin wrappers so a cursor-tracked spotlight glow can be dropped into a
   .map() list — the hook needs its own instance per card, which a bare
   className can't give it. See lib/useSpotlight.ts + .spotlight in globals.css. */

type SpotlightLinkProps = LinkProps & React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: React.ReactNode;
};

export function SpotlightLink({ className, children, ...rest }: SpotlightLinkProps) {
  const ref = useSpotlightRef<HTMLAnchorElement>();
  return (
    <Link ref={ref} className={`spotlight ${className ?? ""}`} {...rest}>
      {children}
    </Link>
  );
}

type SpotlightDivProps = React.HTMLAttributes<HTMLDivElement>;

export function SpotlightDiv({ className, children, ...rest }: SpotlightDivProps) {
  const ref = useSpotlightRef<HTMLDivElement>();
  return (
    <div ref={ref} className={`spotlight ${className ?? ""}`} {...rest}>
      {children}
    </div>
  );
}
