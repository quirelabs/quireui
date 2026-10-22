"use client";

import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { type ComponentProps, type ReactNode, useId } from "react";
import { cn } from "@/registry/lib/cn";

export function Switch({ className, ...props }: ComponentProps<typeof BaseSwitch.Root>) {
  return (
    <BaseSwitch.Root
      data-slot="switch"
      className={cn(
        // Follows density: as wide as a control is tall (28, 32, 40px), whole pixels at every step.
        "[--h:calc(var(--qui-control-h)/2+0.125rem)] motion-control focus-ring relative inline-flex h-(--h) w-(--qui-control-h) shrink-0 cursor-default items-center rounded-[5px] bg-fg-subtle/70 p-0.5",
        // A mid grey off track: the surface-coloured thumb stands out on it in light and dark alike.
        "hover:bg-fg-subtle data-[checked]:bg-primary data-[checked]:hover:bg-primary-hover",
        "data-[invalid]:ring-1 data-[invalid]:ring-danger data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <BaseSwitch.Thumb
        className={cn(
          "motion-thumb block size-[calc(var(--h)-0.25rem)] rounded-[3px] bg-surface",
          // Travels the track's spare width: the track width minus its height.
          "data-[checked]:translate-x-[calc(var(--qui-control-h)-var(--h))] data-[checked]:bg-primary-fg",
        )}
      />
    </BaseSwitch.Root>
  );
}

/**
 * A settings row: label and optional description on the left, the switch on the right. The
 * whole row toggles it, so the switch is never the only thing to aim for.
 */
export function SwitchLabel({
  className,
  children,
  description,
  ...props
}: ComponentProps<typeof Switch> & {
  /** A second line in a quieter colour, e.g. what turning it on does. */
  description?: ReactNode;
}) {
  const descriptionId = useId();
  return (
    <label
      data-slot="switch-label"
      className={cn(
        "flex w-full cursor-default items-start justify-between gap-4 text-(length:--qui-text) text-fg has-[[data-disabled]]:cursor-not-allowed has-[[data-disabled]]:opacity-50",
        className,
      )}
    >
      <span className="flex flex-col leading-[1.5]">
        <span>{children}</span>
        {description && (
          <span id={descriptionId} className="text-xs text-fg-muted">
            {description}
          </span>
        )}
      </span>
      {/* Centred on the first line of text at every density. */}
      <span className="flex h-[1.5em] shrink-0 items-center">
        <Switch aria-describedby={description ? descriptionId : undefined} {...props} />
      </span>
    </label>
  );
}
