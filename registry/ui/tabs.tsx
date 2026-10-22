"use client";

import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { type ComponentProps, createContext, use } from "react";
import { cn } from "@/registry/lib/cn";

type Variant = "line" | "contained";
const VariantContext = createContext<Variant>("line");

export function Tabs({
  variant = "line",
  className,
  ...props
}: ComponentProps<typeof BaseTabs.Root> & {
  /** `line` underlines the chosen tab; `contained` raises it out of a tinted track. Defaults to line. */
  variant?: Variant;
}) {
  return (
    <VariantContext value={variant}>
      <BaseTabs.Root
        data-slot="tabs"
        className={cn("flex flex-col gap-4 data-[orientation=vertical]:flex-row", className)}
        {...props}
      />
    </VariantContext>
  );
}

const lists: Record<Variant, string> = {
  // The line runs the full width as a divider; the contained track fits its tabs.
  line: "w-full gap-1 border-b border-border data-[orientation=vertical]:border-r data-[orientation=vertical]:border-b-0",
  contained: "gap-0.5 rounded-control bg-surface-muted p-0.5 border border-border",
};

export function TabsList({
  className,
  children,
  activateOnFocus = true,
  ...props
}: ComponentProps<typeof BaseTabs.List>) {
  const variant = use(VariantContext);
  return (
    <BaseTabs.List
      // Arrow keys switch views directly: panels render instantly, so there is nothing to wait for.
      activateOnFocus={activateOnFocus}
      className={cn(
        // Too many tabs scroll sideways, without a scrollbar sitting under the labels.
        "relative flex w-max max-w-full shrink-0 overflow-x-auto overflow-y-hidden [scrollbar-width:none] data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col data-[orientation=vertical]:overflow-visible",
        lists[variant],
        className,
      )}
      {...props}
    >
      {children}
      <BaseTabs.Indicator className={indicators[variant]} />
    </BaseTabs.List>
  );
}

// The marker slides to the chosen tab in 160ms: enough to show where the selection went, settled
// before the eye gets there. It sits under the labels; the inset keeps the underline off the edges.
const indicators: Record<Variant, string> = {
  line: cn(
    "motion-indicator pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-full bg-primary",
    "w-[calc(var(--active-tab-width)-0.75rem)] translate-x-[calc(var(--active-tab-left)+0.375rem)]",
    "data-[orientation=vertical]:top-0 data-[orientation=vertical]:right-0 data-[orientation=vertical]:bottom-auto data-[orientation=vertical]:left-auto data-[orientation=vertical]:h-[calc(var(--active-tab-height)-0.75rem)] data-[orientation=vertical]:w-0.5 data-[orientation=vertical]:translate-x-0 data-[orientation=vertical]:translate-y-[calc(var(--active-tab-top)+0.375rem)]",
  ),
  contained: cn(
    "motion-indicator pointer-events-none absolute top-0 left-0 rounded-[calc(var(--radius-control)-0.125rem)] bg-surface shadow-[0_0_0_1px_var(--qui-border)]",
    "h-(--active-tab-height) w-(--active-tab-width) translate-x-(--active-tab-left) translate-y-(--active-tab-top)",
  ),
};

const tabs: Record<Variant, string> = {
  line: "h-(--qui-control-h) px-2.5 data-[orientation=vertical]:justify-start",
  contained: "h-[calc(var(--qui-control-h)-0.25rem)] px-2.5",
};

export function TabsTab({ className, ...props }: ComponentProps<typeof BaseTabs.Tab>) {
  const variant = use(VariantContext);
  return (
    <BaseTabs.Tab
      data-slot="tabs-tab"
      className={cn(
        // Above the sliding marker; the label colour follows it.
        "motion-control focus-ring relative z-[1] inline-flex shrink-0 cursor-default select-none items-center justify-center gap-1.5 rounded-[calc(var(--radius-control)-0.125rem)] whitespace-nowrap text-(length:--qui-text) font-medium text-fg-muted hover:text-fg data-[active]:text-fg",
        "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
        tabs[variant],
        className,
      )}
      {...props}
    />
  );
}

export function TabsPanel({ className, ...props }: ComponentProps<typeof BaseTabs.Panel>) {
  return (
    <BaseTabs.Panel
      data-slot="tabs-panel"
      className={cn("motion-panel focus-ring min-w-0 flex-1 rounded-control", className)}
      {...props}
    />
  );
}

/** A count next to a tab label, e.g. how many invoices are overdue. */
export function TabsCount({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn("nums rounded-[4px] bg-surface-hover px-1 text-[0.75em] leading-[1.5] font-medium text-fg-muted", className)}
      {...props}
    />
  );
}
