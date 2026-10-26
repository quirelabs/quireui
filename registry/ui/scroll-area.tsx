"use client";

import { ScrollArea as BaseScrollArea } from "@base-ui/react/scroll-area";
import type { ComponentProps } from "react";
import { cn } from "@/registry/lib/cn";

// Fades grow with the hidden amount, up to this size, so a barely-scrolled edge fades barely.
const FADE = "24px";

const fades = {
  vertical: `linear-gradient(to bottom, transparent 0, #000 min(${FADE}, var(--scroll-area-overflow-y-start, 0px)), #000 calc(100% - min(${FADE}, var(--scroll-area-overflow-y-end, 0px))), transparent 100%)`,
  horizontal: `linear-gradient(to right, transparent 0, #000 min(${FADE}, var(--scroll-area-overflow-x-start, 0px)), #000 calc(100% - min(${FADE}, var(--scroll-area-overflow-x-end, 0px))), transparent 100%)`,
};

/**
 * Native scrolling (wheel, touch, keyboard, momentum) with a slim overlay scrollbar that
 * shows while hovering or scrolling, and soft fades at edges that have more content.
 */
export function ScrollArea({
  className,
  viewportClassName,
  contentClassName,
  orientation = "vertical",
  fade = true,
  children,
  ...props
}: ComponentProps<typeof BaseScrollArea.Root> & {
  /** Classes for the scrolling element, e.g. max-height. */
  viewportClassName?: string;
  /** Classes for the wrapper around children, e.g. padding or spacing. */
  contentClassName?: string;
  /** Which ways it scrolls, and so which scroll bars it shows. Defaults to vertical. */
  orientation?: "vertical" | "horizontal" | "both";
  /** Fade edges that have more content. */
  fade?: boolean;
}) {
  const mask = fade ? fades[orientation === "horizontal" ? "horizontal" : "vertical"] : undefined;
  return (
    <BaseScrollArea.Root
      data-slot="scroll-area"
      className={cn("relative flex min-h-0 flex-col overflow-hidden", className)}
      {...props}
    >
      <BaseScrollArea.Viewport
        style={{ maskImage: mask, WebkitMaskImage: mask }}
        className={cn(
          "min-h-0 flex-1 overscroll-contain rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          viewportClassName,
        )}
      >
        <BaseScrollArea.Content className={contentClassName}>{children}</BaseScrollArea.Content>
      </BaseScrollArea.Viewport>
      {orientation !== "horizontal" && <Scrollbar orientation="vertical" />}
      {orientation !== "vertical" && <Scrollbar orientation="horizontal" />}
      {orientation === "both" && <BaseScrollArea.Corner />}
    </BaseScrollArea.Root>
  );
}

function Scrollbar({ orientation }: { orientation: "vertical" | "horizontal" }) {
  const vertical = orientation === "vertical";
  return (
    <BaseScrollArea.Scrollbar
      orientation={orientation}
      className={cn(
        // Overlay, so content never shifts. Lingers briefly after scrolling instead of flickering.
        // motion-exception: the delayed fade-out needs its own delay, which no motion-* utility has.
        "absolute z-10 flex touch-none p-0.5 opacity-0 select-none transition-opacity delay-500 duration-(--qui-duration-base)",
        "data-[hovering]:opacity-100 data-[hovering]:delay-0 data-[scrolling]:opacity-100 data-[scrolling]:delay-0",
        vertical ? "inset-y-0 right-0 w-2.5" : "inset-x-0 bottom-0 h-2.5",
      )}
    >
      <BaseScrollArea.Thumb
        className={cn(
          "motion-control rounded-full bg-fg-subtle/40 hover:bg-fg-subtle/70 active:bg-fg-subtle/80",
          vertical ? "w-full" : "h-full",
        )}
      />
    </BaseScrollArea.Scrollbar>
  );
}
