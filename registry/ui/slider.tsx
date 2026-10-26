"use client";

import { Slider as BaseSlider } from "@base-ui/react/slider";
import { type ComponentProps, type KeyboardEvent, type ReactNode, useEffect, useState } from "react";
import { cn } from "@/registry/lib/cn";

type Value = number | readonly number[];

export type SliderProps = Omit<
  ComponentProps<typeof BaseSlider.Root>,
  "value" | "defaultValue" | "onValueChange" | "children"
> & {
  /** The value, or two values for a range. */
  value?: Value;
  /** The starting value when it manages its own state. Defaults to the minimum. */
  defaultValue?: Value;
  /** Called with the new value, or values for a range, while it moves. Always a whole step. */
  onValueChange?: (value: Value) => void;
  /** A name shown above the track and read to screen readers. */
  label?: ReactNode;
  /** How a value reads, e.g. as money or a percentage. Used above the track and in the bubble. */
  format?: (value: number) => string;
  /** Points on the track, with optional labels underneath, like 0, 50 and 100. */
  marks?: { value: number; label?: ReactNode }[];
  /** Show the value above the track. Defaults to true when there is a label. */
  showValue?: boolean;
  /**
   * `settle` lets the thumb follow the pointer smoothly and glide onto the nearest step when let
   * go; `live` jumps from step to step while dragging. Defaults to settle.
   */
  snap?: "settle" | "live";
};

const plain = (value: number) => value.toLocaleString();
const asList = (value: Value) => (typeof value === "number" ? [value] : [...value]);
const same = (a: Value, b: Value) => asList(a).join() === asList(b).join();

/**
 * A value picked along a track. The value shows above it, or, on a compact slider with no
 * label, in a bubble over the thumb while it moves. Marks can fill as the range passes them.
 */
export function Slider({
  value,
  defaultValue,
  onValueChange,
  label,
  format = plain,
  marks,
  showValue = label !== undefined,
  snap = "settle",
  min = 0,
  max = 100,
  step = 1,
  largeStep = step * 10,
  className,
  ...props
}: SliderProps) {
  const settle = snap === "settle";
  const decimals = (String(step).split(".")[1] ?? "").length;
  const toStep = (v: number) =>
    Number(Math.min(max, Math.max(min, Math.round((v - min) / step) * step + min)).toFixed(decimals));
  const snapped = (v: Value): Value => (typeof v === "number" ? toStep(v) : v.map(toStep));

  // `current` is the value in whole steps; `visual` is where the thumb is drawn, which can sit
  // between steps while it follows the pointer.
  const [inner, setInner] = useState<Value>(defaultValue ?? min);
  const current = value ?? inner;
  const [visual, setVisual] = useState<Value>(current);
  const [settling, setSettling] = useState(false);
  const [seen, setSeen] = useState(current);
  // A value changed from outside moves the thumb too.
  if (!same(current, seen)) {
    setSeen(current);
    if (!same(current, snapped(visual))) setVisual(current);
  }
  useEffect(() => {
    if (!settling) return;
    const timer = setTimeout(() => setSettling(false), 200);
    return () => clearTimeout(timer);
  }, [settling]);

  const report = (next: Value) => {
    if (same(next, current)) return;
    if (value === undefined) setInner(next);
    setSeen(next);
    onValueChange?.(next);
  };

  // With settle, the pointer moves the thumb finely, so the keys take whole steps here instead.
  const onThumbKey = (index: number) => (event: KeyboardEvent) => {
    if (!settle) return;
    const values = asList(current);
    const by = event.shiftKey ? largeStep : step;
    const moves: Record<string, number> = {
      ArrowRight: values[index] + by,
      ArrowUp: values[index] + by,
      ArrowLeft: values[index] - by,
      ArrowDown: values[index] - by,
      PageUp: values[index] + largeStep,
      PageDown: values[index] - largeStep,
      Home: min,
      End: max,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    // A range's thumbs never cross.
    const lower = index > 0 ? values[index - 1] : min;
    const upper = index < values.length - 1 ? values[index + 1] : max;
    values[index] = toStep(Math.min(upper, Math.max(lower, moves[event.key])));
    const next = typeof current === "number" ? values[0] : values;
    setVisual(next);
    report(next);
  };

  const shown = asList(current);
  const low = shown.length > 1 ? Math.min(...shown) : min;
  const high = Math.max(...shown);
  const at = (v: number) => ((v - min) / (max - min)) * 100;

  return (
    <BaseSlider.Root
      data-slot="slider"
      data-settling={settling || undefined}
      value={settle ? visual : current}
      min={min}
      max={max}
      // Settle drags on a fine step, so the thumb follows the pointer instead of jumping.
      step={settle ? Math.min(step, (max - min) / 1000) : step}
      largeStep={largeStep}
      onValueChange={(next) => {
        if (settle) {
          setSettling(false);
          setVisual(next as Value);
        }
        report(snapped(next as Value));
      }}
      onValueCommitted={(next) => {
        if (!settle) return;
        // Let go between steps: glide onto the nearest one.
        const landed = snapped(next as Value);
        if (!same(landed, next as Value)) setSettling(true);
        setVisual(landed);
        report(landed);
      }}
      className={cn("flex w-full flex-col gap-2.5 data-[disabled]:opacity-50", className)}
      {...props}
    >
      {(label || showValue) && (
        <div className="flex items-baseline justify-between gap-3 text-(length:--qui-text)">
          {label && <BaseSlider.Label className="font-medium">{label}</BaseSlider.Label>}
          {showValue && <span className="nums text-fg-muted">{shown.map(format).join(" – ")}</span>}
        </div>
      )}
      <BaseSlider.Control className="relative flex h-5 cursor-pointer touch-none items-center select-none data-[disabled]:cursor-not-allowed">
        <BaseSlider.Track className="relative h-1.5 w-full rounded-full bg-surface-active">
          <BaseSlider.Indicator
            // motion-exception: the fill is an absolutely positioned marker; it glides with the thumb as it settles.
            className="rounded-full bg-primary in-data-[settling]:[transition:inset-inline-start_var(--qui-duration-base)_var(--qui-ease-out),width_var(--qui-duration-base)_var(--qui-ease-out)] motion-reduce:transition-none!"
          />
          {/* The ends are marked by the track itself, so only points between them get a dot. */}
          {marks
            ?.filter((mark) => mark.value > min && mark.value < max)
            .map((mark) => (
              <span
                key={mark.value}
                aria-hidden
                style={{ left: `${at(mark.value)}%` }}
                className={cn(
                  // A dot on the track, filled once the range covers it.
                  "pointer-events-none absolute top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full",
                  mark.value >= low && mark.value <= high ? "bg-primary-fg/70" : "bg-fg-subtle/60",
                )}
              />
            ))}
        </BaseSlider.Track>
        {shown.map((v, i) => (
          <BaseSlider.Thumb
            // biome-ignore lint/suspicious/noArrayIndexKey: thumbs are positions, not items
            key={i}
            index={i}
            onKeyDown={onThumbKey(i)}
            getAriaValueText={() => format(v)}
            className={cn(
              "group/thumb motion-control size-4.5 rounded-full border border-border-strong bg-surface shadow-[0_1px_2px_oklch(0%_0_0/0.12)] outline-none",
              "hover:scale-110 data-[dragging]:scale-115 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
              // motion-exception: the thumb is an absolutely positioned marker; it glides onto the step it settles on.
              "in-data-[settling]:[transition:inset-inline-start_var(--qui-duration-base)_var(--qui-ease-out),scale_var(--qui-duration-fast)_var(--qui-ease-out)] motion-reduce:transition-none!",
            )}
          >
            {/* Without a value above the track, a bubble shows it over the thumb while it moves. */}
            {!showValue && (
              <span
                aria-hidden
                className="nums motion-fade pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-md bg-primary px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-primary-fg opacity-0 group-data-[dragging]/thumb:opacity-100 in-data-[input=keyboard]:group-has-[:focus-visible]/thumb:opacity-100"
              >
                {format(v)}
              </span>
            )}
          </BaseSlider.Thumb>
        ))}
      </BaseSlider.Control>
      {marks?.some((mark) => mark.label !== undefined) && (
        <div aria-hidden className="relative h-4 text-xs text-fg-subtle">
          {marks.map((mark, i) => (
            <span
              key={mark.value}
              style={{ left: `${at(mark.value)}%` }}
              className={cn(
                "nums absolute top-0 whitespace-nowrap",
                // The end labels align to the edges, so they never hang off the sides.
                i === 0 && at(mark.value) === 0
                  ? ""
                  : i === marks.length - 1 && at(mark.value) === 100
                    ? "-translate-x-full"
                    : "-translate-x-1/2",
              )}
            >
              {mark.label}
            </span>
          ))}
        </div>
      )}
    </BaseSlider.Root>
  );
}
