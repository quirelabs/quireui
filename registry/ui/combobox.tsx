"use client";

import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { CaretUpDownIcon, CheckIcon, XIcon } from "@phosphor-icons/react/ssr";
import { type ComponentProps, createContext, type ReactNode, use } from "react";
import { cn } from "@/registry/lib/cn";

// Same heights as Button, Input and Select, so a combobox sits flush in a form row.
const sizes = {
  sm: "h-[calc(var(--qui-control-h)-0.25rem)] gap-1.5 px-2.5 text-[calc(var(--qui-text)-0.0625rem)]",
  md: "h-(--qui-control-h) gap-2 px-(--qui-control-px) text-(length:--qui-text)",
  lg: "h-[calc(var(--qui-control-h)+0.5rem)] gap-2 px-4 text-(length:--qui-text)",
} as const;

// Items inset by the field's padding minus the popup's 4px, so result text lines up with what
// you typed, the same as Select.
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

export function Combobox<Value, Multiple extends boolean | undefined = false>({
  size = "md",
  autoHighlight = true,
  ...props
}: BaseCombobox.Root.Props<Value, Multiple> & {
  /** Field and list size; follows the density tokens. Defaults to md. */
  size?: Size;
}) {
  return (
    <SizeContext value={size}>
      {/* The first match is highlighted while typing, so typing and Enter picks it. */}
      <BaseCombobox.Root autoHighlight={autoHighlight} {...props} />
    </SizeContext>
  );
}

export const ComboboxGroup = BaseCombobox.Group;
export const ComboboxCollection = BaseCombobox.Collection;

/** The field: a text input with a clear button once something is chosen, and a list toggle. */
export function ComboboxInput({
  className,
  leading,
  ...props
}: ComponentProps<typeof BaseCombobox.Input> & {
  /** An icon or short text before the input, e.g. a search icon. */
  leading?: ReactNode;
}) {
  const size = use(SizeContext);
  return (
    <BaseCombobox.InputGroup
      data-slot="combobox"
      className={cn(
        // Styled like Input, so forms read as one set of fields.
        "motion-control flex w-full min-w-0 cursor-text items-center rounded-control border border-border-strong bg-surface text-fg",
        "hover:border-fg-subtle focus-within:border-ring focus-within:ring-1 focus-within:ring-ring",
        // Invalid wins over focus, so the error stays visible while it is being fixed.
        "has-[[data-invalid]]:border-danger has-[[data-invalid]]:focus-within:border-danger has-[[data-invalid]]:focus-within:ring-danger",
        "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        "[&_svg]:size-4 [&_svg]:shrink-0",
        sizes[size],
        className,
      )}
    >
      {leading && <span className="flex items-center text-fg-subtle">{leading}</span>}
      <BaseCombobox.Input
        className="h-full w-full min-w-0 bg-transparent outline-none placeholder:text-fg-subtle pointer-coarse:text-base"
        {...props}
      />
      <BaseCombobox.Clear
        aria-label="Clear"
        className="motion-control focus-ring grid size-5 shrink-0 place-items-center rounded-sm text-fg-subtle hover:bg-surface-hover hover:text-fg [&_svg]:size-3.5"
      >
        <XIcon />
      </BaseCombobox.Clear>
      <BaseCombobox.Trigger
        aria-label="Show all options"
        className="-mr-1 grid size-5 shrink-0 place-items-center rounded-sm text-fg-subtle outline-none hover:text-fg"
      >
        <CaretUpDownIcon />
      </BaseCombobox.Trigger>
    </BaseCombobox.InputGroup>
  );
}

type PositionerProps = Pick<ComponentProps<typeof BaseCombobox.Positioner>, "side" | "align" | "sideOffset">;

export function ComboboxContent({
  className,
  children,
  empty = "No results",
  side = "bottom",
  align = "start",
  sideOffset = 4,
  ...props
}: Omit<ComponentProps<typeof BaseCombobox.Popup>, "children"> &
  PositionerProps & {
    /** The items, or a function rendering one item from the root's `items`. */
    children: ComponentProps<typeof BaseCombobox.List>["children"];
    /** Shown when nothing matches what was typed. */
    empty?: ReactNode;
  }) {
  return (
    <BaseCombobox.Portal>
      <BaseCombobox.Positioner side={side} align={align} sideOffset={sideOffset} className="z-50 outline-none">
        <BaseCombobox.Popup
          data-slot="combobox-content"
          className={cn(
            "motion-pop relative min-w-(--anchor-width) overflow-hidden rounded-float border border-border bg-surface text-fg shadow-float outline-none",
            className,
          )}
          {...props}
        >
          <BaseCombobox.Empty className="px-3 py-6 text-center text-sm text-fg-muted empty:hidden">
            {empty}
          </BaseCombobox.Empty>
          <BaseCombobox.List className="max-h-[min(var(--available-height),22rem)] scroll-py-1 overflow-y-auto p-1 empty:hidden">
            {children}
          </BaseCombobox.List>
        </BaseCombobox.Popup>
      </BaseCombobox.Positioner>
    </BaseCombobox.Portal>
  );
}

// No hover transition on items: highlight must track the pointer and arrow keys 1:1.
const item =
  "relative flex h-(--qui-item-h) cursor-default select-none items-center gap-2 rounded-md pr-8 outline-none data-[highlighted]:bg-surface-hover data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-fg-muted";

export function ComboboxItem({ className, children, ...props }: ComponentProps<typeof BaseCombobox.Item>) {
  const size = use(SizeContext);
  return (
    <BaseCombobox.Item className={cn(item, insets[size], itemText[size], className)} {...props}>
      <span className="flex min-w-0 flex-1 items-center gap-2 truncate">{children}</span>
      <BaseCombobox.ItemIndicator className="absolute right-2 flex">
        <CheckIcon weight="bold" className="text-fg!" />
      </BaseCombobox.ItemIndicator>
    </BaseCombobox.Item>
  );
}

export function ComboboxLabel({ className, ...props }: ComponentProps<typeof BaseCombobox.GroupLabel>) {
  const size = use(SizeContext);
  return (
    <BaseCombobox.GroupLabel
      className={cn("pt-1.5 pr-2 pb-1 text-xs font-medium text-fg-subtle", insets[size], className)}
      {...props}
    />
  );
}

export function ComboboxSeparator({ className, ...props }: ComponentProps<typeof BaseCombobox.Separator>) {
  return <BaseCombobox.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}
