"use client";

import { Radio as BaseRadio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { type ComponentProps, type ReactNode, useId } from "react";
import { cn } from "@/registry/lib/cn";

/** Holds the options; arrow keys move the choice between them, Tab leaves the group. */
export function RadioGroup({ className, ...props }: ComponentProps<typeof BaseRadioGroup>) {
  return <BaseRadioGroup data-slot="radio-group" className={cn("flex flex-col gap-2.5", className)} {...props} />;
}

export function Radio({ className, ...props }: ComponentProps<typeof BaseRadio.Root>) {
  return (
    <BaseRadio.Root
      data-slot="radio"
      className={cn(
        // Same size as Checkbox: half a control's height, so it follows density.
        "motion-control focus-ring grid size-[calc(var(--qui-control-h)/2)] shrink-0 cursor-default place-items-center rounded-full border border-border-strong bg-surface",
        "hover:border-fg-subtle data-[checked]:border-primary data-[checked]:bg-primary",
        "data-[invalid]:border-danger data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <BaseRadio.Indicator className="motion-pop size-[40%] rounded-full bg-primary-fg" />
    </BaseRadio.Root>
  );
}

/** A radio with its label and an optional description; the whole row selects it. */
export function RadioLabel({
  className,
  children,
  description,
  ...props
}: ComponentProps<typeof Radio> & {
  /** A second line in a quieter colour, e.g. what choosing it means. */
  description?: ReactNode;
}) {
  const descriptionId = useId();
  return (
    <label
      data-slot="radio-label"
      className={cn(
        "flex cursor-default items-start gap-2 text-(length:--qui-text) text-fg has-[[data-disabled]]:cursor-not-allowed has-[[data-disabled]]:opacity-50",
        className,
      )}
    >
      {/* Centred on the first line of text at every density. */}
      <span className="flex h-[1.5em] shrink-0 items-center">
        <Radio aria-describedby={description ? descriptionId : undefined} {...props} />
      </span>
      <span className="flex flex-col leading-[1.5]">
        <span>{children}</span>
        {description && (
          <span id={descriptionId} className="text-xs text-fg-muted">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}
