"use client";

import { PreviewCard } from "@base-ui/react/preview-card";
import type { ComponentProps } from "react";
import { cn } from "@/registry/lib/cn";

/**
 * A preview of what a link points to, on hover or keyboard focus. Mouse and keyboard only:
 * screen readers and touch get the link itself, so never put anything here that the
 * destination does not also show.
 */
export const HoverCard = PreviewCard.Root;

/** Waits long enough that passing the cursor over a link does not open it. */
export function HoverCardTrigger({ delay = 500, closeDelay = 200, ...props }: ComponentProps<typeof PreviewCard.Trigger>) {
  return <PreviewCard.Trigger delay={delay} closeDelay={closeDelay} {...props} />;
}

const sizes = { sm: "w-56", md: "w-72", lg: "w-96" };

type PositionerProps = Pick<ComponentProps<typeof PreviewCard.Positioner>, "side" | "align" | "sideOffset" | "alignOffset">;

export function HoverCardContent({
  className,
  children,
  side = "bottom",
  align = "start",
  sideOffset = 8,
  alignOffset,
  size = "md",
  ...props
}: ComponentProps<typeof PreviewCard.Popup> &
  PositionerProps & {
    /** The card's width. Defaults to md. */
    size?: keyof typeof sizes;
  }) {
  return (
    <PreviewCard.Portal>
      <PreviewCard.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        className="z-50 data-[anchor-hidden]:invisible"
      >
        <PreviewCard.Popup
          data-slot="hover-card"
          className={cn(
            "motion-pop max-w-[calc(100vw-1rem)] rounded-float border border-border bg-surface p-4 text-sm text-fg shadow-float outline-none",
            sizes[size],
            className,
          )}
          {...props}
        >
          {children}
        </PreviewCard.Popup>
      </PreviewCard.Positioner>
    </PreviewCard.Portal>
  );
}
