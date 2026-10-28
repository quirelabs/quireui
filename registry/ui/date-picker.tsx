"use client";

import { CalendarBlankIcon, CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react/ssr";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/registry/lib/cn";
import {
  addDays,
  addMonths,
  clamp,
  type DateRange,
  endOfMonth,
  firstDayOfWeek,
  isPlain,
  monthGrid,
  type PlainDate,
  parseDate,
  parts,
  sameMonth,
  startOfMonth,
  startOfWeek,
  todayPlain,
} from "@/registry/lib/dates";
import { Button } from "@/registry/ui/button";
import { Input } from "@/registry/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/registry/ui/popover";

export type { DateRange, PlainDate } from "@/registry/lib/dates";

// Dates are built at noon UTC and formatted in UTC, so no timezone can tip them into another day.
const asDate = (date: PlainDate) => {
  const { year, month, day } = parts(date);
  return new Date(Date.UTC(year, month - 1, day, 12));
};
const formatter = (locale: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" });

/** Whether a locale writes the day first ("3/10" is the 3rd of October) or the month first, as in the US. */
const dayFirstIn = (locale: string) =>
  formatter(locale, { day: "numeric", month: "numeric" })
    .formatToParts(new Date(Date.UTC(2026, 9, 3, 12)))
    .find((part) => part.type === "day" || part.type === "month")?.type === "day";

/** Every word the pickers show, for apps in another language. */
export type DatePickerLabels = {
  /** The tip under the calendar. Pass null to leave it out. */
  hint: string | null;
  /** Shown while what is typed is not a date that can be picked. */
  invalid: string;
  openCalendar: string;
  previousMonth: string;
  nextMonth: string;
};

const defaultLabels: DatePickerLabels = {
  hint: "Or type a date, like “next fri” or “in 2 weeks”.",
  invalid: "Not a date",
  openCalendar: "Open calendar",
  previousMonth: "Previous month",
  nextMonth: "Next month",
};

export type CalendarProps = {
  /** The month on show, as any date in it. */
  month: PlainDate;
  /** Called with the first day of the month to show, from the arrows or a key that turns the page. */
  onMonthChange: (month: PlainDate) => void;
  /** The day that has keyboard focus inside the grid. */
  focused: PlainDate;
  /** Called as the keys or the pointer move focus to another day. */
  onFocusedChange: (date: PlainDate) => void;
  /** What is chosen: one day, or a range. */
  selected?: DateRange | null;
  /** Called with the day that was clicked, or chosen with Enter. */
  onPick: (date: PlainDate) => void;
  /** Called with the day under the pointer, so a range can preview where it would end. */
  onHover?: (date: PlainDate | null) => void;
  /** Today, which gets a dot. Read it after mount, not while rendering. */
  today: PlainDate;
  /** Days before this cannot be picked. */
  min?: PlainDate;
  /** Days after this cannot be picked. */
  max?: PlainDate;
  /** Any other day that cannot be picked. */
  isDateDisabled?: (date: PlainDate) => boolean;
  /** Names the months and weekdays. */
  locale: string;
  /** 0 for Sunday, 1 for Monday. */
  weekStartsOn: number;
  /** Months side by side. */
  months?: 1 | 2;
  /** Labels for the month buttons, for other languages. */
  labels?: Pick<DatePickerLabels, "previousMonth" | "nextMonth">;
};

/**
 * Month grids that move with the keyboard: arrows by day and week, Page Up and Down by month
 * (with Shift, by year), Home and End to the ends of the week. Focus never leaves the grid while
 * moving, so screen readers follow the date.
 */
export function Calendar({
  month,
  onMonthChange,
  focused,
  onFocusedChange,
  selected,
  onPick,
  onHover,
  today,
  min,
  max,
  isDateDisabled,
  locale,
  weekStartsOn,
  months = 1,
  labels = defaultLabels,
}: CalendarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const title = formatter(locale, { month: "long", year: "numeric" });
  const label = formatter(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const weekdays = monthGrid(month, weekStartsOn)[0].map((day) => ({
    short: formatter(locale, { weekday: "narrow" }).format(asDate(day)),
    long: formatter(locale, { weekday: "long" }).format(asDate(day)),
  }));
  const shown = Array.from({ length: months }, (_, i) => addMonths(startOfMonth(month), i));
  const disabled = (date: PlainDate) =>
    (min !== undefined && date < min) || (max !== undefined && date > max) || !!isDateDisabled?.(date);

  // Moving focus to a day outside the months on show turns the page to it.
  const focus = (date: PlainDate) => {
    const next = clamp(date, min, max);
    onFocusedChange(next);
    if (next < startOfMonth(shown[0])) onMonthChange(startOfMonth(next));
    else if (next > endOfMonth(shown[shown.length - 1])) onMonthChange(startOfMonth(addMonths(next, 1 - months)));
  };

  // Keyboard focus follows the focused day, also when the move turned the page and the button
  // that had focus is gone.
  const keyed = useRef(false);
  useEffect(() => {
    if (!keyed.current) return;
    keyed.current = false;
    ref.current?.querySelector<HTMLElement>(`[data-date="${focused}"]`)?.focus();
  }, [focused]);

  const onKeyDown = (event: KeyboardEvent) => {
    const moves: Record<string, () => PlainDate> = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      PageUp: () => addMonths(focused, event.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focused, event.shiftKey ? 12 : 1),
      Home: () => startOfWeek(focused, weekStartsOn),
      End: () => addDays(startOfWeek(focused, weekStartsOn), 6),
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    keyed.current = true;
    focus(moves[event.key]());
  };

  const inRange = (date: PlainDate) => !!selected && date >= selected.from && date <= selected.to;

  return (
    <div ref={ref} data-slot="calendar" className="flex gap-6">
      {shown.map((first, index) => (
        <div key={first} className="flex flex-col gap-2">
          <div className="flex h-7 items-center justify-between">
            {index === 0 ? (
              <Button
                size="icon"
                variant="ghost"
                aria-label={labels.previousMonth}
                className="size-7"
                disabled={min !== undefined && startOfMonth(first) <= startOfMonth(min)}
                onClick={() => onMonthChange(addMonths(month, -1))}
              >
                <CaretLeftIcon />
              </Button>
            ) : (
              <span className="size-7" />
            )}
            <p aria-live="polite" className="text-[calc(var(--qui-text)-0.0625rem)] font-medium">
              {title.format(asDate(first))}
            </p>
            {index === shown.length - 1 ? (
              <Button
                size="icon"
                variant="ghost"
                aria-label={labels.nextMonth}
                className="size-7"
                disabled={max !== undefined && endOfMonth(first) >= endOfMonth(max)}
                onClick={() => onMonthChange(addMonths(month, 1))}
              >
                <CaretRightIcon />
              </Button>
            ) : (
              <span className="size-7" />
            )}
          </div>
          <table
            // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: the ARIA date picker pattern, a grid table whose day buttons move focus
            role="grid"
            aria-label={title.format(asDate(first))}
            onKeyDown={onKeyDown}
            className="border-separate border-spacing-y-0.5"
          >
            <thead>
              <tr>
                {weekdays.map((day) => (
                  <th
                    key={day.long}
                    scope="col"
                    abbr={day.long}
                    className="h-7 w-9 text-center text-xs font-normal text-fg-subtle"
                  >
                    {day.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthGrid(first, weekStartsOn).map((week) => (
                <tr key={week[0]}>
                  {week.map((date) => {
                    const outside = !sameMonth(date, first);
                    // Days of the neighbouring months stay empty, so two grids never show a day twice.
                    if (outside) return <td key={date} />;
                    const start = selected?.from === date;
                    const end = selected?.to === date;
                    const between = inRange(date);
                    const off = disabled(date);
                    return (
                      // biome-ignore lint/a11y/useAriaPropsSupportedByRole: inside a grid a td is a gridcell, which takes aria-selected
                      <td
                        key={date}
                        aria-selected={between || undefined}
                        className={cn(
                          "relative p-0",
                          // A range is one band across the days, rounded where it starts and ends.
                          between &&
                            !(start && end) &&
                            "before:absolute before:inset-y-0 before:bg-surface-active before:content-['']",
                          between &&
                            !start &&
                            !end &&
                            "before:inset-x-0 first:before:rounded-l-control last:before:rounded-r-control",
                          start && !end && "before:right-0 before:left-1/2",
                          end && !start && "before:right-1/2 before:left-0",
                        )}
                      >
                        <button
                          type="button"
                          data-date={date}
                          data-today={date === today || undefined}
                          tabIndex={date === focused ? 0 : -1}
                          disabled={off}
                          aria-label={label.format(asDate(date))}
                          aria-current={date === today ? "date" : undefined}
                          onClick={() => onPick(date)}
                          onFocus={() => date !== focused && onFocusedChange(date)}
                          onPointerEnter={() => onHover?.(date)}
                          onPointerLeave={() => onHover?.(null)}
                          className={cn(
                            "nums focus-ring relative z-[1] grid size-9 place-items-center rounded-control text-(length:--qui-text) text-fg hover:bg-surface-hover",
                            "disabled:pointer-events-none disabled:text-fg-subtle disabled:opacity-50",
                            // Today is marked with a dot, so it stays legible when it is also chosen.
                            "data-today:after:absolute data-today:after:bottom-1 data-today:after:size-1 data-today:after:rounded-full data-today:after:bg-current data-today:after:content-['']",
                            (start || end) && "bg-primary text-primary-fg hover:bg-primary",
                          )}
                        >
                          {parts(date).day}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export type DatePickerProps = {
  /** The chosen day as "YYYY-MM-DD", or null. */
  value?: PlainDate | null;
  /** The day to start with when it manages its own state. */
  defaultValue?: PlainDate | null;
  /** Called with the chosen day as "YYYY-MM-DD", or null when cleared. */
  onValueChange?: (value: PlainDate | null) => void;
  /** Days before this cannot be picked. */
  min?: PlainDate;
  /** Days after this cannot be picked. */
  max?: PlainDate;
  /** Any other day that cannot be picked, e.g. weekends. */
  isDateDisabled?: (date: PlainDate) => boolean;
  /** Formats the date and the calendar, and decides what "3/10" means. Defaults to en-US. */
  locale?: string;
  /** 0 for Sunday, 1 for Monday. Defaults to the locale's own first day. */
  weekStartsOn?: number;
  /** Defaults to "Type or pick a date". */
  placeholder?: string;
  /** Sends the value with a form, as "YYYY-MM-DD". */
  name?: string;
  /** The words it shows, for other languages. Any you leave out stay in English. */
  labels?: Partial<DatePickerLabels>;
  /** Turns the field and its calendar off. */
  disabled?: boolean;
  /** Names the field when there is no visible label. */
  "aria-label"?: string;
  /** For a `<label htmlFor>` to point at the field. */
  id?: string;
  className?: string;
};

/**
 * A date you can type or pick. Typing understands "oct 3", "3/10", "tomorrow", "next fri",
 * "in 2 weeks" and "eom", and shows what it read before you press Enter. The calendar opens
 * from the button or with the down arrow.
 */
export function DatePicker({
  value,
  defaultValue = null,
  onValueChange,
  min,
  max,
  isDateDisabled,
  locale = "en-US",
  weekStartsOn,
  placeholder = "Type or pick a date",
  name,
  labels: customLabels,
  disabled,
  "aria-label": ariaLabel,
  id,
  className,
}: DatePickerProps) {
  const hintId = useId();
  const labels = { ...defaultLabels, ...customLabels };
  const inputRef = useRef<HTMLInputElement>(null);
  const [inner, setInner] = useState<PlainDate | null>(defaultValue);
  const current = value !== undefined ? value : inner;
  const display = formatter(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const hintFormat = formatter(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const shown = (date: PlainDate | null) => (date && isPlain(date) ? display.format(asDate(date)) : "");

  const [text, setText] = useState(shown(current));
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  // Today is read after mount: the clock is not something to render on the server.
  const [today, setToday] = useState<PlainDate | null>(null);
  useEffect(() => setToday(todayPlain()), []);
  const [month, setMonth] = useState<PlainDate>(current ?? "2000-01-01");
  const [focused, setFocused] = useState<PlainDate>(current ?? "2000-01-01");
  const startOn = weekStartsOn ?? firstDayOfWeek(locale);
  const allowed = (date: PlainDate) =>
    (min === undefined || date >= min) && (max === undefined || date <= max) && !isDateDisabled?.(date);

  // A value changed from outside shows in the field, unless someone is typing in it.
  const [seen, setSeen] = useState(current);
  if (current !== seen) {
    setSeen(current);
    if (!editing) setText(shown(current));
  }

  const read = editing && text.trim() ? parseDate(text, today ?? todayPlain(), dayFirstIn(locale)) : null;
  const hint = !editing || !text.trim() || read === current ? null : read && allowed(read) ? read : "invalid";

  const commit = (date: PlainDate | null) => {
    if (value === undefined) setInner(date);
    if (date !== current) onValueChange?.(date);
    setText(shown(date));
    setEditing(false);
  };

  const openCalendar = () => {
    const start = current ?? today ?? todayPlain();
    setMonth(startOfMonth(start));
    setFocused(start);
    setOpen(true);
  };

  return (
    <div data-slot="date-picker" className={cn("w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <Input
          ref={inputRef}
          id={id}
          value={text}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-describedby={hint ? hintId : undefined}
          aria-invalid={hint === "invalid" || undefined}
          autoComplete="off"
          onValueChange={(next) => {
            setText(next);
            setEditing(true);
          }}
          onBlur={() => {
            if (!editing) return;
            // Leaving the field keeps what it read, or puts back the last good date.
            if (!text.trim()) commit(null);
            else if (read && allowed(read)) commit(read);
            else {
              setText(shown(current));
              setEditing(false);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && editing) {
              event.preventDefault();
              if (!text.trim()) commit(null);
              else if (read && allowed(read)) {
                commit(read);
                requestAnimationFrame(() => inputRef.current?.select());
              }
            } else if (event.key === "Escape" && editing) {
              event.preventDefault();
              event.stopPropagation();
              setText(shown(current));
              setEditing(false);
            } else if (event.key === "ArrowDown") {
              event.preventDefault();
              openCalendar();
            }
          }}
          trailing={
            <span className="flex items-center gap-1.5">
              {hint && (
                <span
                  id={hintId}
                  aria-live="polite"
                  className={cn("text-xs whitespace-nowrap", hint === "invalid" ? "text-danger" : "text-fg-subtle")}
                >
                  {hint === "invalid" ? labels.invalid : `→ ${hintFormat.format(asDate(hint))}`}
                </span>
              )}
              <PopoverTrigger
                render={
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={labels.openCalendar}
                    disabled={disabled}
                    className="-mr-1.5 size-7"
                    onClick={() => (open ? setOpen(false) : openCalendar())}
                  />
                }
              >
                <CalendarBlankIcon />
              </PopoverTrigger>
            </span>
          }
        />
        <PopoverContent
          align="end"
          size="auto"
          className="p-3"
          // The grid takes focus on its chosen or current day, and closing hands it back to the field.
          initialFocus={() => document.querySelector<HTMLElement>(`[data-slot=calendar] [data-date="${focused}"]`)}
          finalFocus={inputRef}
        >
          <Calendar
            month={month}
            onMonthChange={setMonth}
            focused={focused}
            onFocusedChange={setFocused}
            selected={current ? { from: current, to: current } : null}
            onPick={(date) => {
              commit(date);
              setOpen(false);
            }}
            today={today ?? ""}
            min={min}
            max={max}
            isDateDisabled={isDateDisabled}
            locale={locale}
            weekStartsOn={startOn}
            labels={labels}
          />
          {labels.hint && <p className="mt-2 border-t border-border pt-2 text-xs text-fg-subtle">{labels.hint}</p>}
        </PopoverContent>
      </Popover>
      {name && <input type="hidden" name={name} value={current ?? ""} />}
    </div>
  );
}
