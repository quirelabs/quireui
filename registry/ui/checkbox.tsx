"use client";

import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { CheckboxGroup as BaseCheckboxGroup } from "@base-ui/react/checkbox-group";
import { CheckIcon, MinusIcon } from "@phosphor-icons/react/ssr";
import { type ComponentProps, createContext, type ReactNode, use, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/registry/lib/cn";

type GroupState = {
  value: string[];
  allValues: string[] | undefined;
  setValue: (next: string[], details: Parameters<NonNullable<BaseCheckboxGroup.Props["onValueChange"]>>[1]) => void;
  disabled: Set<string>;
};
const GroupContext = createContext<GroupState | null>(null);

export function Checkbox({
  className,
  parent,
  value,
  disabled,
  onCheckedChange,
  ...props
}: ComponentProps<typeof BaseCheckbox.Root>) {
  const group = use(GroupContext);

  // Disabled options keep their state when the parent selects or clears the rest.
  useEffect(() => {
    if (!group || value === undefined || !disabled) return;
    group.disabled.add(value);
    return () => {
      group.disabled.delete(value);
    };
  }, [group, value, disabled]);

  return (
    <BaseCheckbox.Root
      data-slot="checkbox"
      parent={parent}
      value={value}
      disabled={disabled}
      onCheckedChange={(checked, details) => {
        onCheckedChange?.(checked, details);
        if (!parent || !group?.allValues || details.isCanceled) return;
        // Select all means select all. Base UI's parent cycles back to the previous partial
        // selection after clearing, which reads as a bug; ours only toggles all and none.
        details.cancel();
        const locked = group.value.filter((v) => group.disabled.has(v));
        const enabled = group.allValues.filter((v) => !group.disabled.has(v));
        const allOn = enabled.every((v) => group.value.includes(v));
        group.setValue(allOn ? locked : [...new Set([...locked, ...enabled])], details);
      }}
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
export function CheckboxGroup({
  className,
  value: valueProp,
  defaultValue = [],
  onValueChange,
  allValues,
  ...props
}: ComponentProps<typeof BaseCheckboxGroup>) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const value = valueProp ?? uncontrolled;
  const disabled = useRef(new Set<string>()).current;
  const setValue: GroupState["setValue"] = (next, details) => {
    onValueChange?.(next, details);
    if (!details.isCanceled && valueProp === undefined) setUncontrolled(next);
  };
  return (
    <GroupContext value={{ value, allValues, setValue, disabled }}>
      <BaseCheckboxGroup
        data-slot="checkbox-group"
        value={value}
        onValueChange={setValue}
        allValues={allValues}
        className={cn("flex flex-col gap-2.5", className)}
        {...props}
      />
    </GroupContext>
  );
}
