"use client";

import type { ElementType } from "react";
import { TextMorph as Torph } from "torph/react";
import { useInstantMotion } from "@/registry/lib/input-modality";

/**
 * Optional, opt-in: morphs text letter by letter when it changes. The one place the
 * library uses a JS animation library (torph), so it ships as its own item and no
 * core component depends on it.
 *
 * Timing matches the foundation tokens: --qui-duration-slow (220ms) on --qui-ease-out.
 * Instant from the keyboard or with data-motion="reduced"; torph honours
 * prefers-reduced-motion on its own.
 */
export function TextMorph({
  children,
  as = "span",
  className,
}: {
  children: string;
  as?: ElementType;
  className?: string;
}) {
  const instant = useInstantMotion();
  return (
    <Torph
      as={as}
      duration={220}
      ease="cubic-bezier(0.2, 0.8, 0.2, 1)"
      disabled={instant}
      respectReducedMotion
      className={className}
    >
      {children}
    </Torph>
  );
}
