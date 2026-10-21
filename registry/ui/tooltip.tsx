"use client";

import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import type { ComponentProps } from "react";
import { cn } from "@/registry/lib/cn";

/**
 * Wrap the app once. After the first tooltip opens, neighbours open instantly
 * (no delay, no animation), so scanning a toolbar never feels laggy.
 */
export function TooltipProvider({
  delay = 500,
  closeDelay = 0,
  ...props
}: ComponentProps<typeof BaseTooltip.Provider>) {
  return <BaseTooltip.Provider delay={delay} closeDelay={closeDelay} {...props} />;
}

export const Tooltip = BaseTooltip.Root;
export const TooltipTrigger = BaseTooltip.Trigger;

type PositionerProps = Pick<
  ComponentProps<typeof BaseTooltip.Positioner>,
  "side" | "align" | "sideOffset"
>;

export function TooltipContent({
  className,
  side = "top",
  align = "center",
  sideOffset = 6,
  ...props
}: ComponentProps<typeof BaseTooltip.Popup> & PositionerProps) {
  return (
    <BaseTooltip.Portal>
      <BaseTooltip.Positioner side={side} align={align} sideOffset={sideOffset} className="z-50">
        <BaseTooltip.Popup
          data-slot="tooltip"
          className={cn(
            "motion-pop rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-fg [--qui-pop-scale:0.98]",
            className,
          )}
          {...props}
        />
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  );
}
