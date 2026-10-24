import type { ComponentProps } from "react";
import { cn } from "@/registry/lib/cn";

/**
 * A loading placeholder for anything that is not text: an avatar, a badge, a chart. Size it with
 * the same classes as the real thing, e.g. `size-8 rounded-full`, so nothing moves when it loads.
 */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="skeleton" aria-hidden className={cn("skeleton rounded-control", className)} {...props} />;
}

// Varied, repeatable widths, so a block of lines reads like text rather than a barcode.
const widths = ["100%", "94%", "97%", "88%"];

export type SkeletonTextProps = Omit<ComponentProps<"div">, "children"> & {
  /** How many lines. The last of several is shorter, like the end of a paragraph. Defaults to 1. */
  lines?: number;
};

/**
 * Placeholder lines measured in lines, not pixels: each is exactly one line-height of the text
 * around it, with the bar centred where the letters sit. Put it where the text will go, in the
 * same font size, and the text replaces it without moving anything.
 */
export function SkeletonText({ lines = 1, className, ...props }: SkeletonTextProps) {
  return (
    <div data-slot="skeleton-text" aria-hidden className={className} {...props}>
      {Array.from({ length: lines }, (_, i) => (
        <div
          // Lines never reorder, so the index is a stable key.
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder lines
          key={i}
          className="flex h-lh items-center"
          style={{ width: lines > 1 && i === lines - 1 ? "62%" : lines > 1 ? widths[i % widths.length] : undefined }}
        >
          <div className="skeleton h-[0.7em] w-full rounded-[0.25em]" />
        </div>
      ))}
    </div>
  );
}
