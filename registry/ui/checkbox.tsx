"use client";

import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { CheckboxGroup as BaseCheckboxGroup } from "@base-ui/react/checkbox-group";
import { CheckIcon, MinusIcon } from "@phosphor-icons/react/ssr";
import { type ComponentProps, type ReactNode, useId } from "react";
import { cn } from "@/registry/lib/cn";

export function Checkbox({ className, ...props }: ComponentProps<typeof BaseCheckbox.Root>) {
  return (
    <BaseCheckbox.Root
      data-slot="checkbox"
      className={cn(
        // Half a control's height: 14, 16 or 20px with density, larger on touch.
        "motion-control focus-ring grid size-[calc(var(--qui-control-h)/2)] shrink-0 cursor-default place-items-center rounded-[4px] border border-border-strong bg-surface text-primary-fg",
        "hover:border-fg-subtle data-[checked]:border-primary data-[checked]:bg-primary data-[indeterminate]:border-primary data-[indeterminate]:bg-primary",
        "data-[invalid]:border-danger data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <BaseCheckbox.Indicator
        className="motion-pop flex data-[unchecked]:hidden [&_svg]:size-[calc(var(--qui-control-h)/2-0.25rem)]"
        render={(indicatorProps, state) => (
          <span {...indicatorProps}>{state.indeterminate ? <MinusIcon weight="bold" /> : <CheckIcon weight="bold" />}</span>
        )}
      />
    </BaseCheckbox.Root>
  );
}

/**
 * A checkbox with its label and an optional description. The whole row is the hit area, so
 * the small box is never the only thing to aim for.
 */
export function CheckboxLabel({
  className,
  children,
  description,
  ...props
}: ComponentProps<typeof Checkbox> & {
  /** A second line in a quieter colour, e.g. what the option means. */
  description?: ReactNode;
}) {
  const descriptionId = useId();
  return (
    <label
      data-slot="checkbox-label"
      className={cn(
        "flex cursor-default items-start gap-2 text-(length:--qui-text) text-fg has-[[data-disabled]]:cursor-not-allowed has-[[data-disabled]]:opacity-50",
        className,
      )}
    >
      {/* Nudged down so the box centres on the first line of text at every density. */}
      <span className="flex h-[1.5em] shrink-0 items-center">
        <Checkbox aria-describedby={description ? descriptionId : undefined} {...props} />
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

/** Holds a list of checkboxes and their combined value; a `parent` checkbox selects them all. */
export function CheckboxGroup({ className, ...props }: ComponentProps<typeof BaseCheckboxGroup>) {
  return <BaseCheckboxGroup data-slot="checkbox-group" className={cn("flex flex-col gap-2.5", className)} {...props} />;
}
