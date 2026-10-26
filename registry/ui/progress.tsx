"use client";

import { Meter as BaseMeter } from "@base-ui/react/meter";
import { Progress as BaseProgress } from "@base-ui/react/progress";
import { CheckIcon } from "@phosphor-icons/react/ssr";
import { type ComponentProps, type CSSProperties, type ReactNode, useState } from "react";
import { cn } from "@/registry/lib/cn";

type Tone = "neutral" | "muted" | "success" | "warning" | "danger" | "info";
const fills: Record<Tone, string> = {
  neutral: "bg-primary",
  // For minor parts of a stack, like "Other".
  muted: "bg-fg-subtle/60",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
};
const tracks = { sm: "h-1", md: "h-1.5", lg: "h-2" } as const;
type Size = keyof typeof tracks;

const percentOf = (value: number, max: number) => Math.min(1, Math.max(0, value / max));

// The fill sits in the track at full width and slides into view, so it never animates width.
function Fill({ fraction, tone, className }: { fraction: number; tone: Tone; className?: string }) {
  return (
    <span
      style={{ "--p": fraction } as CSSProperties}
      className={cn(
        "motion-fill absolute inset-0 translate-x-[calc((var(--p)-1)*100%)] rounded-full",
        fills[tone],
        className,
      )}
    />
  );
}

function Header({ label, value }: { label?: ReactNode; value?: ReactNode }) {
  if (!label && !value) return null;
  return (
    <div className="flex items-baseline justify-between gap-3 text-(length:--qui-text)">
      {label}
      <span className="nums text-fg-muted">{value}</span>
    </div>
  );
}

export type ProgressProps = Omit<ComponentProps<typeof BaseProgress.Root>, "value" | "children"> & {
  /** How far along. `null` means the amount is unknown, and the bar sweeps instead. */
  value: number | null;
  max?: number;
  label?: ReactNode;
  /** The text on the right, e.g. "5 of 12". Defaults to the percentage. */
  valueLabel?: ReactNode;
  /** Splits the bar into this many segments, for steps like "2 of 4". */
  steps?: number;
  size?: Size;
  tone?: Tone;
};

/** Work moving toward done: an upload, an import, onboarding steps. */
export function Progress({
  value,
  max = 100,
  label,
  valueLabel,
  steps,
  size = "md",
  tone = "neutral",
  className,
  ...props
}: ProgressProps) {
  const fraction = value === null ? 0 : percentOf(value, max);
  const done = value !== null && fraction >= 1;
  // Finishing turns the bar green and stamps a check in place of the number.
  const shownTone = done ? "success" : tone;
  const right =
    value === null ? valueLabel : done ? (
      <span key="done" className="motion-stamp inline-flex items-center gap-1 text-success [&_svg]:size-3.5">
        <CheckIcon weight="bold" />
        Done
      </span>
    ) : (
      (valueLabel ?? `${Math.round(fraction * 100)}%`)
    );

  return (
    <BaseProgress.Root
      data-slot="progress"
      value={value}
      max={max}
      // Screen readers hear what the screen shows, like "5 of 12" or "Done", not just a percentage.
      aria-valuetext={done ? "Done" : typeof valueLabel === "string" ? valueLabel : undefined}
      className={cn("flex w-full flex-col gap-2", className)}
      {...props}
    >
      <Header label={label && <BaseProgress.Label className="font-medium">{label}</BaseProgress.Label>} value={right} />
      {steps ? (
        <BaseProgress.Track className="flex gap-1">
          {Array.from({ length: steps }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: steps are positions
            <span key={i} className={cn("relative flex-1 overflow-hidden rounded-full bg-surface-active", tracks[size])}>
              <Fill fraction={Math.min(1, Math.max(0, fraction * steps - i))} tone={shownTone} />
            </span>
          ))}
        </BaseProgress.Track>
      ) : (
        <BaseProgress.Track className={cn("relative overflow-hidden rounded-full bg-surface-active", tracks[size])}>
          {value === null ? (
            <span data-sweep className={cn("motion-fill absolute inset-y-0 left-0 w-2/5 rounded-full", fills[tone])} />
          ) : (
            <Fill fraction={fraction} tone={shownTone} />
          )}
        </BaseProgress.Track>
      )}
    </BaseProgress.Root>
  );
}

export type MeterProps = Omit<ComponentProps<typeof BaseMeter.Root>, "children"> & {
  label?: ReactNode;
  /** The text on the right, e.g. "7.2 GB of 10 GB". Defaults to the percentage. */
  valueLabel?: ReactNode;
  size?: Size;
  /** Fixed colour. Without it the colour follows the thresholds. */
  tone?: Tone;
  /** Where the bar turns amber and red, as fractions. `false` keeps it neutral. Defaults to 0.8 and 0.95. */
  thresholds?: { warning: number; danger: number } | false;
};

/** An amount within a range: storage, seats, plan usage. It warns as it fills up. */
export function Meter({
  value,
  max = 100,
  label,
  valueLabel,
  size = "md",
  tone,
  thresholds = { warning: 0.8, danger: 0.95 },
  className,
  ...props
}: MeterProps) {
  const fraction = percentOf(value, max);
  const shownTone =
    tone ??
    (thresholds && fraction >= thresholds.danger
      ? "danger"
      : thresholds && fraction >= thresholds.warning
        ? "warning"
        : "neutral");
  return (
    <BaseMeter.Root
      data-slot="meter"
      value={value}
      max={max}
      aria-valuetext={typeof valueLabel === "string" ? valueLabel : undefined}
      className={cn("flex w-full flex-col gap-2", className)}
      {...props}
    >
      <Header
        label={label && <BaseMeter.Label className="font-medium">{label}</BaseMeter.Label>}
        value={
          <span className={cn(shownTone === "danger" && "text-danger")}>
            {valueLabel ?? `${Math.round(fraction * 100)}%`}
          </span>
        }
      />
      <BaseMeter.Track className={cn("relative overflow-hidden rounded-full bg-surface-active", tracks[size])}>
        <Fill fraction={fraction} tone={shownTone} />
      </BaseMeter.Track>
    </BaseMeter.Root>
  );
}

export type MeterStackPart = { label: string; value: number; tone: Tone; valueLabel?: ReactNode };

/**
 * Several parts of one total in a single bar, with a legend, like storage by type. Hovering a
 * part or its legend entry brings it forward and quiets the rest.
 */
export function MeterStack({
  parts,
  max,
  label,
  valueLabel,
  size = "lg",
  className,
}: {
  parts: MeterStackPart[];
  max: number;
  label?: ReactNode;
  valueLabel?: ReactNode;
  size?: Size;
  className?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  let offset = 0;
  return (
    <BaseMeter.Root
      data-slot="meter-stack"
      value={total}
      max={max}
      aria-valuetext={typeof valueLabel === "string" ? valueLabel : undefined}
      className={cn("flex w-full flex-col gap-2", className)}
    >
      <Header
        label={label && <BaseMeter.Label className="font-medium">{label}</BaseMeter.Label>}
        value={valueLabel ?? `${Math.round(percentOf(total, max) * 100)}%`}
      />
      <BaseMeter.Track
        className={cn("relative flex overflow-hidden rounded-full bg-surface-active", tracks[size])}
        onPointerLeave={() => setActive(null)}
      >
        {parts.map((part, i) => {
          const start = offset;
          offset += part.value;
          return (
            <span
              key={part.label}
              aria-hidden
              onPointerEnter={() => setActive(i)}
              style={{ left: `${(start / max) * 100}%`, width: `${(part.value / max) * 100}%` }}
              className={cn(
                // A hairline of track between parts keeps them apart.
                "motion-fade absolute inset-y-0 border-r-2 border-(--qui-surface) last:border-r-0",
                fills[part.tone],
                active !== null && active !== i && "opacity-35",
              )}
            />
          );
        })}
      </BaseMeter.Track>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[calc(var(--qui-text)-0.0625rem)]">
        {parts.map((part, i) => (
          <li
            key={part.label}
            onPointerEnter={() => setActive(i)}
            onPointerLeave={() => setActive(null)}
            className={cn("motion-fade flex items-center gap-1.5", active !== null && active !== i && "opacity-50")}
          >
            <span aria-hidden className={cn("size-2 rounded-full", fills[part.tone])} />
            <span>{part.label}</span>
            <span className="nums text-fg-muted">{part.valueLabel ?? part.value}</span>
          </li>
        ))}
      </ul>
    </BaseMeter.Root>
  );
}
