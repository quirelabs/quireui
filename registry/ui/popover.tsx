"use client";

import { Popover as BasePopover } from "@base-ui/react/popover";
import type { ComponentProps } from "react";
import { cn } from "@/registry/lib/cn";
import { Form } from "@/registry/ui/form";

export const Popover = BasePopover.Root;
export const PopoverTrigger = BasePopover.Trigger;
export const PopoverClose = BasePopover.Close;

const sizes = { sm: "w-56", md: "w-72", lg: "w-96", auto: "w-auto" };

type PositionerProps = Pick<ComponentProps<typeof BasePopover.Positioner>, "side" | "align" | "sideOffset" | "alignOffset">;

export function PopoverContent({
  className,
  children,
  side = "bottom",
  align = "center",
  sideOffset,
  alignOffset,
  size = "md",
  arrow = false,
  onKeyDown,
  ...props
}: ComponentProps<typeof BasePopover.Popup> &
  PositionerProps & {
    size?: keyof typeof sizes;
    /** Point at the trigger. Useful when several triggers sit close together. */
    arrow?: boolean;
  }) {
  return (
    <BasePopover.Portal>
      <BasePopover.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset ?? (arrow ? 10 : 6)}
        alignOffset={alignOffset}
        arrowPadding={10}
        // Follows the trigger while scrolling and hides when it leaves view, keeping its state
        // for when it scrolls back, instead of floating over unrelated content.
        className="z-50 data-[anchor-hidden]:invisible"
      >
        <BasePopover.Popup
          data-slot="popover"
          onKeyDown={(event) => {
            // Cmd/Ctrl+Enter submits a PopoverForm from any field, like Dialog.
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              const form = event.currentTarget.querySelector("form");
              if (form) {
                event.preventDefault();
                form.requestSubmit();
              }
            }
            onKeyDown?.(event);
          }}
          className={cn(
            "motion-pop relative max-w-[calc(100vw-1rem)] rounded-float border border-border bg-surface p-4 text-sm text-fg shadow-float outline-none",
            sizes[size],
            className,
          )}
          {...props}
        >
          {children}
          {arrow && <PopoverArrow />}
        </BasePopover.Popup>
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );
}

/** A bordered square turned 45deg; only its two outer edges get a border so it joins the popup seamlessly. */
const arrowClassName = cn(
  "size-2.5 rotate-45 border-border bg-surface",
  "data-[side=bottom]:-top-[5.5px] data-[side=bottom]:border-t data-[side=bottom]:border-l",
  "data-[side=top]:-bottom-[5.5px] data-[side=top]:border-r data-[side=top]:border-b",
  "data-[side=left]:-right-[5.5px] data-[side=left]:border-t data-[side=left]:border-r",
  "data-[side=right]:-left-[5.5px] data-[side=right]:border-b data-[side=right]:border-l",
);

function PopoverArrow() {
  return <BasePopover.Arrow className={arrowClassName} />;
}

export function PopoverTitle({ className, ...props }: ComponentProps<typeof BasePopover.Title>) {
  return <BasePopover.Title className={cn("font-semibold", className)} {...props} />;
}

export function PopoverDescription({ className, ...props }: ComponentProps<typeof BasePopover.Description>) {
  return <BasePopover.Description className={cn("text-fg-muted", className)} {...props} />;
}

/** A small form: validates like Input, Cmd/Ctrl+Enter submits from any field. */
export function PopoverForm({ className, ...props }: ComponentProps<typeof Form>) {
  return <Form className={cn("gap-3", className)} {...props} />;
}

export function PopoverFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex justify-end gap-2", className)} {...props} />;
}
