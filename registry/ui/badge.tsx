import type { ComponentProps } from "react";
import { cn } from "@/registry/lib/cn";

// Each tone is one hue. Badges tint from it at low strength, so a column of them stays calm.
const tones = {
  neutral: "[--tone:var(--qui-fg-subtle)]",
  success: "[--tone:var(--qui-success)]",
  warning: "[--tone:var(--qui-warning)]",
  danger: "[--tone:var(--qui-danger)]",
  info: "[--tone:var(--qui-info)]",
} as const;

const variants = {
  soft: "border-[color-mix(in_oklch,var(--tone)_24%,transparent)] bg-[color-mix(in_oklch,var(--tone)_11%,var(--qui-surface))] text-[color-mix(in_oklch,var(--tone)_78%,var(--qui-fg))]",
  // The tone shows only in the dot or icon: for dense tables, where a column of tints gets loud.
  outline: "border-border text-fg-muted",
} as const;

// Sized from the text token, so badges follow density without becoming control-sized.
const sizes = {
  sm: "h-[calc(var(--qui-text)+0.25rem)] gap-1 px-1.5 text-[calc(var(--qui-text)-0.1875rem)] has-[>svg:first-child]:pl-1 has-[>[data-badge-dot]]:pl-1.5 [&_svg]:size-3",
  md: "h-[calc(var(--qui-text)+0.5rem)] gap-1.5 px-2 text-[calc(var(--qui-text)-0.125rem)] has-[>svg:first-child]:pl-1.5 has-[>[data-badge-dot]]:pl-2 [&_svg]:size-3.5",
} as const;

export type BadgeProps = ComponentProps<"span"> & {
  /** The status it shows. Defaults to neutral. */
  tone?: keyof typeof tones;
  /** `soft` tints the whole badge; `outline` keeps it quiet and colours only the dot or icon. Defaults to soft. */
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  /** A small dot in the tone's colour before the label. */
  dot?: boolean;
};

export function Badge({ tone = "neutral", variant = "soft", size = "md", dot = false, className, children, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "nums inline-flex shrink-0 items-center rounded-[calc(var(--radius-control)-0.125rem)] border leading-none font-medium whitespace-nowrap [&_svg]:shrink-0 [&_svg]:text-(--tone)",
        tones[tone],
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {dot && <span data-badge-dot aria-hidden className="size-1.5 shrink-0 rounded-full bg-(--tone)" />}
      {children}
    </span>
  );
}
