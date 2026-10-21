"use client";

import { Select as BaseSelect } from "@base-ui/react/select";
import { CaretDownIcon, CaretUpDownIcon, CaretUpIcon, CheckIcon } from "@phosphor-icons/react/ssr";
import { type ComponentProps, createContext, use } from "react";
import { cn } from "@/registry/lib/cn";

// Same heights as Button and Input, so a select sits flush in a toolbar or a form row.
const sizes = {
  sm: "h-[calc(var(--qui-control-h)-0.25rem)] gap-1.5 px-2.5 text-[calc(var(--qui-text)-0.0625rem)]",
  md: "h-(--qui-control-h) gap-2 px-(--qui-control-px) text-(length:--qui-text)",
  lg: "h-[calc(var(--qui-control-h)+0.5rem)] gap-2 px-4 text-(length:--qui-text)",
} as const;

// The open list lines its text up with the trigger's, so items inset by the trigger's padding
// minus the popup's own 4px padding. Otherwise the list shifts sideways and no longer covers it.
const insets = {
  sm: "pl-1.5",
  md: "pl-[calc(var(--qui-control-px)-0.25rem)]",
  lg: "pl-3",
} as const;
const itemText = {
  sm: "text-[calc(var(--qui-text)-0.0625rem)]",
  md: "text-(length:--qui-text)",
  lg: "text-(length:--qui-text)",
} as const;

type Size = keyof typeof sizes;
const SizeContext = createContext<Size>("md");

export function Select<Value, Multiple extends boolean | undefined = false>({
  size = "md",
  ...props
}: BaseSelect.Root.Props<Value, Multiple> & {
  /** Trigger and list size; follows the density tokens. Defaults to md. */
  size?: Size;
}) {
  return (
    <SizeContext value={size}>
      <BaseSelect.Root {...props} />
    </SizeContext>
  );
}

export const SelectGroup = BaseSelect.Group;

export function SelectTrigger({ className, children, ...props }: ComponentProps<typeof BaseSelect.Trigger>) {
  const size = use(SizeContext);
  return (
    <BaseSelect.Trigger
      data-slot="select"
      className={cn(
        // Styled like Input: it is a form field, not a button.
        "motion-control flex w-full min-w-0 cursor-default select-none items-center justify-between rounded-control border border-border-strong bg-surface text-fg outline-none",
        "hover:border-fg-subtle focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring data-[popup-open]:border-ring",
        // Invalid wins over focus, so the error stays visible while it is being fixed.
        "data-[invalid]:border-danger data-[invalid]:focus-visible:ring-danger",
        "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        "[&_svg]:size-4 [&_svg]:shrink-0",
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
      <BaseSelect.Icon className="flex text-fg-subtle">
        <CaretUpDownIcon />
      </BaseSelect.Icon>
    </BaseSelect.Trigger>
  );
}

/** The chosen item's label, or `placeholder` in a quieter colour until something is picked. */
export function SelectValue({ className, ...props }: ComponentProps<typeof BaseSelect.Value>) {
  return (
    <BaseSelect.Value
      className={cn("min-w-0 flex-1 truncate text-left data-[placeholder]:text-fg-subtle", className)}
      {...props}
    />
  );
}

type PositionerProps = Pick<
  ComponentProps<typeof BaseSelect.Positioner>,
  "side" | "align" | "sideOffset" | "alignItemWithTrigger"
>;

export function SelectContent({
  className,
  children,
  side = "bottom",
  align = "start",
  sideOffset = 4,
  alignItemWithTrigger = true,
  ...props
}: ComponentProps<typeof BaseSelect.Popup> & PositionerProps) {
  return (
    <BaseSelect.Portal>
      <BaseSelect.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        // The open list puts the chosen item over the trigger, so the eye never has to jump.
        alignItemWithTrigger={alignItemWithTrigger}
        className="z-50 outline-none select-none"
      >
        <BaseSelect.Popup
          data-slot="select-content"
          className={cn(
            "motion-pop relative min-w-(--anchor-width) rounded-float border border-border bg-surface text-fg shadow-float outline-none",
            className,
          )}
          {...props}
        >
          <BaseSelect.ScrollUpArrow className={scrollArrow("top-0")}>
            <CaretUpIcon />
          </BaseSelect.ScrollUpArrow>
          <BaseSelect.List className="max-h-[min(var(--available-height),22rem)] overflow-y-auto p-1">
            {children}
          </BaseSelect.List>
          <BaseSelect.ScrollDownArrow className={scrollArrow("bottom-0")}>
            <CaretDownIcon />
          </BaseSelect.ScrollDownArrow>
        </BaseSelect.Popup>
      </BaseSelect.Positioner>
    </BaseSelect.Portal>
  );
}

// Shown only while there is more list in that direction; hovering scrolls it.
const scrollArrow = (edge: string) =>
  cn(
    "absolute inset-x-0 z-10 flex h-5 cursor-default items-center justify-center rounded-float bg-surface text-fg-subtle [&_svg]:size-3",
    edge,
  );

// No hover transition on items: highlight must track the pointer and arrow keys 1:1.
const item =
  "relative flex h-(--qui-item-h) cursor-default select-none items-center gap-2 rounded-md pr-8 outline-none data-[highlighted]:bg-surface-hover data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-fg-muted";

export function SelectItem({ className, children, ...props }: ComponentProps<typeof BaseSelect.Item>) {
  const size = use(SizeContext);
  return (
    <BaseSelect.Item className={cn(item, insets[size], itemText[size], className)} {...props}>
      <BaseSelect.ItemText className="flex min-w-0 flex-1 items-center gap-2 truncate">{children}</BaseSelect.ItemText>
      <BaseSelect.ItemIndicator className="absolute right-2 flex">
        <CheckIcon weight="bold" className="text-fg!" />
      </BaseSelect.ItemIndicator>
    </BaseSelect.Item>
  );
}

export function SelectLabel({ className, ...props }: ComponentProps<typeof BaseSelect.GroupLabel>) {
  const size = use(SizeContext);
  return (
    <BaseSelect.GroupLabel
      className={cn("pt-1.5 pr-2 pb-1 text-xs font-medium text-fg-subtle", insets[size], className)}
      {...props}
    />
  );
}

export function SelectSeparator({ className, ...props }: ComponentProps<typeof BaseSelect.Separator>) {
  return <BaseSelect.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}
