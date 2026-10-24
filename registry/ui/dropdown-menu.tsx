"use client";

import { Menu } from "@base-ui/react/menu";
import { CheckIcon } from "@phosphor-icons/react/ssr";
import { type ComponentProps, createContext, use } from "react";
import { cn } from "@/registry/lib/cn";

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;

// Lets a label know whether it names a group or stands alone, e.g. "Signed in as".
const InGroupContext = createContext(false);

export function DropdownMenuGroup(props: ComponentProps<typeof Menu.Group>) {
  return (
    <InGroupContext value={true}>
      <Menu.Group {...props} />
    </InGroupContext>
  );
}

type PositionerProps = Pick<
  ComponentProps<typeof Menu.Positioner>,
  "side" | "align" | "sideOffset" | "alignOffset"
>;

export function DropdownMenuContent({
  className,
  side = "bottom",
  align = "start",
  sideOffset = 4,
  alignOffset,
  ...props
}: ComponentProps<typeof Menu.Popup> & PositionerProps) {
  return (
    <Menu.Portal>
      <Menu.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        className="z-50"
      >
        <Menu.Popup
          data-slot="dropdown-menu"
          className={cn(
            "motion-pop min-w-44 rounded-float border border-border bg-surface p-1 text-fg shadow-float outline-none",
            className,
          )}
          {...props}
        />
      </Menu.Positioner>
    </Menu.Portal>
  );
}

// No hover transition on items: highlight must track the pointer and arrow keys 1:1.
const item =
  "flex h-(--qui-item-h) cursor-default select-none items-center gap-2 rounded-md px-2 text-(length:--qui-text) outline-none data-[highlighted]:bg-surface-hover data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-fg-muted";

export function DropdownMenuItem({
  className,
  variant = "default",
  ...props
}: ComponentProps<typeof Menu.Item> & { variant?: "default" | "danger" }) {
  return (
    <Menu.Item
      className={cn(
        item,
        variant === "danger" && "text-danger [&_svg]:text-danger",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: ComponentProps<typeof Menu.CheckboxItem>) {
  return (
    <Menu.CheckboxItem className={cn(item, "pr-8 relative", className)} {...props}>
      {children}
      <Menu.CheckboxItemIndicator className="absolute right-2 flex">
        <CheckIcon weight="bold" />
      </Menu.CheckboxItemIndicator>
    </Menu.CheckboxItem>
  );
}

export function DropdownMenuLabel({
  className,
  ...props
}: ComponentProps<typeof Menu.GroupLabel>) {
  const classes = cn("px-2 pt-1.5 pb-1 text-xs font-medium text-fg-subtle", className);
  // Inside a group it labels the group for screen readers; outside one it is a plain caption.
  if (use(InGroupContext)) return <Menu.GroupLabel className={classes} {...props} />;
  const { render: _render, ...rest } = props;
  return <div className={classes} {...(rest as ComponentProps<"div">)} />;
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof Menu.Separator>) {
  return <Menu.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}

export function DropdownMenuShortcut({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn("ml-auto pl-4 font-sans text-xs tracking-wide text-fg-subtle", className)}
      {...props}
    />
  );
}
