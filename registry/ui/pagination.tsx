"use client";

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react/ssr";
import { type ComponentProps, type CSSProperties, type KeyboardEvent, type ReactNode, useRef, useState } from "react";
import { cn } from "@/registry/lib/cn";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/registry/ui/select";

type Slot = number | "gap-start" | "gap-end";

/**
 * Always the same number of slots: first, last, the current page with one on each side, and a
 * gap where pages are skipped. A fixed count means the pager never changes width while paging.
 */
function slotsFor(page: number, count: number): Slot[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, "gap-end", count];
  if (page >= count - 3) return [1, "gap-start", count - 4, count - 3, count - 2, count - 1, count];
  return [1, "gap-start", page - 1, page, page + 1, "gap-end", count];
}

export type PaginationProps = Omit<ComponentProps<"nav">, "onChange"> & {
  /** The current page, from 1. */
  page: number;
  pageCount: number;
  onPageChange?: (page: number) => void;
  /** Makes each page a real link, so pages can be opened in a new tab and crawled. */
  getHref?: (page: number) => string;
  /** `pages` lists page numbers; `compact` shows "Page 4 of 20" with a field to jump. Defaults to pages. */
  variant?: "pages" | "compact";
  /** The new page is still loading: a thin line runs in the marker, after 150ms so fast loads never flicker. */
  loading?: boolean;
};

// A thin indeterminate line, shown only once loading has taken longer than 150ms.
function LoadingLine({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      // motion-exception: an ongoing load has no end state; it uses the skeleton's fade-in and sweep.
      className={cn(
        "pointer-events-none absolute h-0.5 overflow-hidden rounded-full bg-border animate-[qui-skeleton-in_var(--qui-duration-base)_var(--qui-ease-out)_150ms_both]",
        className,
      )}
    >
      <span className="absolute inset-0 rounded-full bg-fg-muted animate-[qui-skeleton-sweep_1.1s_var(--qui-ease-in-out)_infinite] motion-reduce:animate-none in-data-[motion=reduced]:animate-none" />
    </span>
  );
}

const item =
  "motion-control focus-ring relative z-[1] inline-flex h-(--qui-control-h) w-(--slot) shrink-0 items-center justify-center rounded-control text-(length:--qui-text) text-fg-muted select-none hover:bg-surface-hover hover:text-fg aria-[current=page]:font-medium aria-[current=page]:text-fg aria-[current=page]:hover:bg-transparent";
const step =
  "motion-control focus-ring inline-flex size-(--qui-control-h) shrink-0 items-center justify-center rounded-control text-fg-muted hover:bg-surface-hover hover:text-fg aria-disabled:pointer-events-none aria-disabled:opacity-40 [&_svg]:size-4";

export function Pagination({
  page,
  pageCount,
  onPageChange,
  getHref,
  variant = "pages",
  loading = false,
  className,
  ...props
}: PaginationProps) {
  const ref = useRef<HTMLElement>(null);
  const count = Math.max(1, pageCount);
  const current = Math.min(Math.max(1, page), count);
  const go = (next: number) => {
    const clamped = Math.min(Math.max(1, next), count);
    if (clamped !== current) onPageChange?.(clamped);
    return clamped;
  };

  // Arrow keys page while focus is inside; focus then follows the current page.
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target instanceof HTMLInputElement) return;
    const target = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 1, End: count }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    const next = go(target);
    requestAnimationFrame(() =>
      ref.current?.querySelector<HTMLElement>(`[data-page="${next}"], [data-slot="pagination-input"]`)?.focus(),
    );
  };

  type Extra = { "aria-label"?: string; "aria-current"?: "page"; "data-page"?: number };
  const link = (to: number, children: ReactNode, className: string, extra: Extra = {}) => {
    const disabled = to < 1 || to > count;
    const shared = {
      className,
      "aria-disabled": disabled || undefined,
      ...extra,
    };
    if (getHref && !disabled) {
      return (
        <a
          href={getHref(to)}
          onClick={(event) => {
            if (!onPageChange) return;
            event.preventDefault();
            go(to);
          }}
          {...shared}
        >
          {children}
        </a>
      );
    }
    return (
      <button type="button" disabled={disabled} onClick={() => go(to)} {...shared}>
        {children}
      </button>
    );
  };

  const prev = link(current - 1, <CaretLeftIcon />, step, { "aria-label": "Previous page" });
  const next = link(current + 1, <CaretRightIcon />, step, { "aria-label": "Next page" });

  if (variant === "compact") {
    return (
      <nav
        ref={ref}
        data-slot="pagination"
        aria-label="Pagination"
        aria-busy={loading || undefined}
        onKeyDown={onKeyDown}
        className={cn("inline-flex items-center gap-1 text-(length:--qui-text)", className)}
        {...props}
      >
        {prev}
        <span className="flex items-center gap-1.5 px-1 text-fg-muted">
          Page
          <span className="relative inline-flex">
            <PageInput page={current} count={count} onCommit={go} />
            {loading && <LoadingLine className="inset-x-1.5 -bottom-1" />}
          </span>
          of <span className="nums text-fg">{count.toLocaleString()}</span>
        </span>
        {next}
      </nav>
    );
  }

  const slots = slotsFor(current, count);
  const index = slots.indexOf(current);
  return (
    <nav
      ref={ref}
      data-slot="pagination"
      aria-label="Pagination"
      aria-busy={loading || undefined}
      onKeyDown={onKeyDown}
      // Every slot is as wide as the longest page number, so nothing moves while paging.
      style={{ "--slot": `max(var(--qui-control-h), calc(${String(count).length}ch + 0.75rem))` } as CSSProperties}
      // One font size for the whole pager, so the slot width (in ch) means the same everywhere.
      className={cn("nums inline-flex items-center gap-1 text-(length:--qui-text)", className)}
      {...props}
    >
      {prev}
      <div className="relative flex items-center gap-0.5">
        {/* The marker slides to the current page; in the middle it stays and the numbers change. */}
        <span
          aria-hidden
          style={{ "--index": index } as CSSProperties}
          className="motion-indicator pointer-events-none absolute top-0 left-0 h-(--qui-control-h) w-(--slot) translate-x-[calc(var(--index)*(var(--slot)+0.125rem))] rounded-control bg-surface shadow-[0_0_0_1px_var(--qui-border-strong)]"
        >
          {loading && <LoadingLine className="inset-x-2 bottom-1" />}
        </span>
        {slots.map((slot, i) =>
          typeof slot === "number" ? (
            // Keyed by position, so focus stays in place while the numbers change.
            // biome-ignore lint/suspicious/noArrayIndexKey: slots are positions, not items
            <span key={i} className="contents">
              {link(slot, slot.toLocaleString(), item, {
                "aria-current": slot === current ? "page" : undefined,
                "aria-label": `Page ${slot}`,
                "data-page": slot,
              })}
            </span>
          ) : (
            // biome-ignore lint/suspicious/noArrayIndexKey: slots are positions, not items
            <span key={i} aria-hidden className="inline-flex w-(--slot) shrink-0 justify-center text-fg-subtle">
              …
            </span>
          ),
        )}
      </div>
      {next}
    </nav>
  );
}

function PageInput({ page, count, onCommit }: { page: number; count: number; onCommit: (page: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const value = Number.parseInt(draft, 10);
    if (Number.isFinite(value)) onCommit(value);
    setDraft(null);
  };
  return (
    <input
      data-slot="pagination-input"
      aria-label={`Page, of ${count}`}
      inputMode="numeric"
      value={draft ?? String(page)}
      onChange={(event) => setDraft(event.target.value.replace(/\D/g, ""))}
      onFocus={(event) => event.target.select()}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") commit();
        if (event.key === "Escape") setDraft(null);
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          onCommit(page + (event.key === "ArrowUp" ? 1 : -1));
          setDraft(null);
        }
      }}
      // As wide as the largest page number, so typing never resizes it.
      style={{ width: `calc(${String(count).length}ch + 1.25rem)` }}
      className="nums motion-control h-[calc(var(--qui-control-h)-0.25rem)] rounded-[calc(var(--radius-control)-0.125rem)] border border-border-strong bg-surface text-center text-fg outline-none hover:border-fg-subtle focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
    />
  );
}

/** "31–40 of 1,284 invoices": where the visible rows sit in the whole set. */
export function PaginationSummary({
  page,
  pageSize,
  total,
  noun,
  className,
  ...props
}: ComponentProps<"p"> & { page: number; pageSize: number; total: number; noun?: string }) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <p
      data-slot="pagination-summary"
      aria-live="polite"
      className={cn("nums text-(length:--qui-text) text-fg-muted", className)}
      {...props}
    >
      <span className="text-fg">
        {from.toLocaleString()}–{to.toLocaleString()}
      </span>{" "}
      of {total.toLocaleString()}
      {noun ? ` ${noun}` : ""}
    </p>
  );
}

/** How many rows per page. */
export function PaginationPageSize({
  value,
  onValueChange,
  options = [10, 25, 50, 100],
  className,
}: {
  value: number;
  onValueChange: (value: number) => void;
  options?: number[];
  className?: string;
}) {
  const items = options.map((n) => ({ value: n, label: `${n} per page` }));
  return (
    <Select items={items} value={value} onValueChange={(v) => onValueChange(Number(v))} size="sm">
      <SelectTrigger aria-label="Rows per page" className={cn("nums w-auto gap-2", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
