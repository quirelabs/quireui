"use client";

import { Combobox } from "@base-ui/react/combobox";
import { CaretUpDownIcon, CheckIcon, CircleNotchIcon, PlusIcon, XIcon } from "@phosphor-icons/react/ssr";
import { type ClipboardEvent, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/registry/lib/cn";

export type MultiSelectOption = {
  /** What goes in the value, like an id. */
  value: string;
  /** What the list and the chip show. */
  label: string;
  /** A second line in the list, like an email. */
  description?: string;
  /** An icon, avatar or colour dot before the label. */
  icon?: ReactNode;
  /** Shown, but cannot be picked. */
  disabled?: boolean;
  /** Puts it under this heading in the list. */
  group?: string;
};

/** Every word it shows, for apps in another language. */
export type MultiSelectLabels = {
  empty: string;
  loading: string;
  error: string;
  retry: string;
  /** The heading over what was already chosen when the list opened. */
  selected: string;
  create: (text: string) => string;
  /** Shown once the limit is reached, e.g. `(n) => \`Up to ${n}\``. */
  max: (count: number) => string;
  /** The chip standing in for the ones that do not fit, e.g. `(n) => \`+${n}\``. */
  more: (count: number) => string;
  remove: (label: string) => string;
  clear: string;
  /** Names the button that opens the list. */
  showOptions: string;
  /** After a pasted list, what could not be found. */
  notFound: (items: string) => string;
  /** After a pasted list, how many were added. */
  added: (count: number) => string;
};

const defaultLabels: MultiSelectLabels = {
  empty: "No results",
  loading: "Searching…",
  error: "Could not load results",
  retry: "Retry",
  selected: "Selected",
  create: (text) => `Create “${text}”`,
  max: (n) => `Up to ${n}`,
  more: (n) => `+${n}`,
  remove: (label) => `Remove ${label}`,
  clear: "Clear all",
  showOptions: "Show options",
  notFound: (items) => `Not found: ${items}`,
  added: (n) => (n === 1 ? "Added 1" : `Added ${n}`),
};

export type MultiSelectProps = {
  /** The chosen values. */
  value?: string[];
  /** The values to start with when it manages its own state. */
  defaultValue?: string[];
  /** Called with the new values, and the options they stand for. */
  onValueChange?: (value: string[], options: MultiSelectOption[]) => void;
  /** Every option, filtered as you type. With `load`, the ones it starts with, so chosen values have labels. */
  options?: MultiSelectOption[];
  /**
   * Fetches options for what is typed, for lists too long to send at once. It waits for a pause
   * in typing, cancels requests that are no longer needed through `signal`, and keeps showing
   * the last results while the next ones load.
   */
  load?: (query: string, context: { signal: AbortSignal }) => Promise<MultiSelectOption[]>;
  /** Offers to create what was typed when nothing matches it, and adds what it returns. */
  onCreate?: (text: string) => MultiSelectOption | Promise<MultiSelectOption>;
  /** The most that can be chosen. */
  max?: number;
  /** Shown while nothing is chosen. */
  placeholder?: string;
  /** Sends each value with a form, as repeated `name` fields. */
  name?: string;
  /** The words it shows, for other languages. Any you leave out stay in English. */
  labels?: Partial<MultiSelectLabels>;
  /** Turns it off. */
  disabled?: boolean;
  /** Names the field when there is no visible label. */
  "aria-label"?: string;
  /** For a `<label htmlFor>` to point at the field. */
  id?: string;
  className?: string;
};

type Item = MultiSelectOption & { create?: true };
type Group = { label: string; items: Item[] };

const normal = (text: string) => text.trim().toLowerCase();

// Matches that start with the query come first, then those that contain it anywhere.
function search(options: MultiSelectOption[], query: string) {
  const q = normal(query);
  if (!q) return options;
  const starts: MultiSelectOption[] = [];
  const contains: MultiSelectOption[] = [];
  for (const option of options) {
    const label = option.label.toLowerCase();
    if (label.startsWith(q)) starts.push(option);
    else if (label.includes(q) || option.description?.toLowerCase().includes(q)) contains.push(option);
  }
  return [...starts, ...contains];
}

// The typed part of a label is set in bold, so you can see why each row matched.
function marked(label: string, query: string) {
  const at = query ? label.toLowerCase().indexOf(normal(query)) : -1;
  if (at < 0) return label;
  const end = at + normal(query).length;
  return (
    <>
      {label.slice(0, at)}
      <mark className="bg-transparent font-semibold text-inherit">{label.slice(at, end)}</mark>
      {label.slice(end)}
    </>
  );
}

const chipClass =
  "focus-ring flex h-[calc(var(--qui-control-h)-0.5rem-2px)] max-w-48 min-w-0 shrink-0 items-center gap-1 rounded-[calc(var(--radius-control)-0.25rem)] bg-surface-active pr-0.5 pl-1.5 text-[calc(var(--qui-text)-0.0625rem)] outline-none [&_svg]:size-3.5";

/**
 * Picks several things from a list you search, like people or labels. Results can load as you
 * type; what was chosen opens pinned on top; a pasted list adds every match at once; and the
 * field keeps one line at rest, folding what does not fit into "+3".
 */
export function MultiSelect({
  value,
  defaultValue = [],
  onValueChange,
  options = [],
  load,
  onCreate,
  max,
  placeholder,
  name,
  labels: customLabels,
  disabled,
  "aria-label": ariaLabel,
  id,
  className,
}: MultiSelectProps) {
  const labels = { ...defaultLabels, ...customLabels };
  const [inner, setInner] = useState(defaultValue);
  const chosen = value ?? inner;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  // Every option seen in a load or a create, so chosen values keep their labels.
  const [seen, setSeen] = useState<Map<string, MultiSelectOption>>(new Map());
  const known = (id: string) => options.find((option) => option.value === id) ?? seen.get(id);
  const optionOf = (id: string): MultiSelectOption => known(id) ?? { value: id, label: id };
  const remember = (found: MultiSelectOption[]) =>
    setSeen((before) => {
      const next = new Map(before);
      for (const option of found) next.set(option.value, option);
      return next;
    });

  const commit = (next: string[]) => {
    if (value === undefined) setInner(next);
    onValueChange?.(next, next.map(optionOf));
  };

  // Loading: waits for a pause in typing, cancels what is no longer needed, and caches by query.
  const loadRef = useRef(load);
  loadRef.current = load;
  const cache = useRef(new Map<string, MultiSelectOption[]>());
  const [results, setResults] = useState<{
    query: string;
    items: MultiSelectOption[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt re-runs the load on Retry
  useEffect(() => {
    if (!loadRef.current || !open) return;
    const key = normal(query);
    const hit = cache.current.get(key);
    if (hit) {
      setResults({ query: key, items: hit });
      setLoading(false);
      setFailed(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(
      async () => {
        try {
          const items =
            (await loadRef.current?.(query.trim(), {
              signal: controller.signal,
            })) ?? [];
          if (controller.signal.aborted) return;
          cache.current.set(key, items);
          remember(items);
          setResults({ query: key, items });
          setFailed(false);
        } catch {
          if (!controller.signal.aborted) setFailed(true);
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      },
      key ? 200 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open, attempt]);

  // What was chosen when the list opened sits on top; picks made since stay where they are, so
  // nothing moves under the pointer.
  const [pinned, setPinned] = useState<string[]>([]);
  const atMax = max !== undefined && chosen.length >= max;
  // Results that failed to load are not shown, so nothing stale passes for a match.
  const pool = load ? (failed ? [] : (results?.items ?? [])) : search(options, query);
  const typed = query.trim();
  const exists = [...pool, ...chosen.map(optionOf)].some((option) => normal(option.label) === normal(typed));
  const [creating, setCreating] = useState<string | null>(null);

  const groups: Group[] = [];
  if (!typed && pinned.length) groups.push({ label: labels.selected, items: pinned.map(optionOf) });
  const rest = typed ? pool : pool.filter((o) => !pinned.includes(o.value));
  for (const option of rest) {
    const label = option.group ?? "";
    const group = groups.find((g) => g.label === label && g.label !== labels.selected);
    if (group) group.items.push(option);
    else groups.push({ label, items: [option] });
  }
  if (onCreate && typed && !exists && !atMax)
    groups.push({
      label: "",
      items: [{ value: `\u0000create:${typed}`, label: typed, create: true }],
    });

  const create = async (text: string) => {
    if (!onCreate) return;
    setCreating(text);
    try {
      const option = await onCreate(text);
      remember([option]);
      cache.current.clear();
      commit([...chosen, option.value]);
      setQuery("");
    } finally {
      setCreating(null);
    }
  };

  // A pasted list ("ada@x.com, lena@y.com") adds every match at once, and says what it could not find.
  const [notice, setNotice] = useState<string | null>(null);
  const paste = async (event: ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData("text");
    if (!/[,;\n\t]/.test(text)) return;
    event.preventDefault();
    const words = text
      .split(/[,;\n\t]+/)
      .map((word) => word.trim())
      .filter(Boolean);
    const next = [...chosen];
    const missing: string[] = [];
    let added = 0;
    for (const word of words) {
      if (max !== undefined && next.length >= max) break;
      const same = (o: MultiSelectOption) => normal(o.label) === normal(word) || normal(o.value) === normal(word);
      let match = options.find(same) ?? [...seen.values()].find(same) ?? pool.find(same);
      if (!match && loadRef.current) {
        const found = await loadRef
          .current(word, {
            signal: new AbortController().signal,
          })
          .catch(() => []);
        match = found.find(same);
        if (match) remember([match]);
      }
      if (!match && onCreate) {
        match = await onCreate(word);
        remember([match]);
      }
      if (!match) missing.push(word);
      else if (!next.includes(match.value)) {
        next.push(match.value);
        added++;
      }
    }
    commit(next);
    setQuery("");
    setOpen(true);
    setNotice(
      [
        added ? labels.added(added) : null,
        missing.length ? labels.notFound(missing.join(", ")) : null,
        max !== undefined && next.length >= max ? labels.max(max) : null,
      ]
        .filter(Boolean)
        .join(" · "),
    );
  };

  // At rest the field keeps one line: chips that do not fit fold into "+3". While editing it
  // grows over what is below it, so the form around it never moves.
  const [editing, setEditing] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const pressed = useRef(false);
  const [fit, setFit] = useState(Number.POSITIVE_INFINITY);
  const [measured, setMeasured] = useState(chosen.join("\u0000"));
  if (measured !== chosen.join("\u0000")) {
    setMeasured(chosen.join("\u0000"));
    setFit(Number.POSITIVE_INFINITY);
  }
  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (!field || editing || fit !== Number.POSITIVE_INFINITY) return;
    const chips = [...field.querySelectorAll<HTMLElement>("[data-slot=multi-select-chip]")];
    const style = getComputedStyle(field);
    // Room for the fold chip, a sliver of input and the end buttons.
    const reserved = 40 + 16 + (field.querySelector("[data-end]")?.clientWidth ?? 0);
    let room =
      field.clientWidth - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight) - reserved;
    let count = 0;
    for (const chip of chips) {
      room -= chip.offsetWidth + 4;
      if (room < 0) break;
      count++;
    }
    setFit(count === chips.length ? chips.length : Math.max(1, count));
  }, [editing, fit]);
  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    let width = field.clientWidth;
    const observer = new ResizeObserver(() => {
      if (field.clientWidth === width) return;
      width = field.clientWidth;
      setFit(Number.POSITIVE_INFINITY);
    });
    observer.observe(field);
    return () => observer.disconnect();
  }, []);
  const folded = editing ? 0 : Math.max(0, chosen.length - fit);

  const status = loading ? labels.loading : failed ? labels.error : atMax ? labels.max(max ?? 0) : notice;

  return (
    <div data-slot="multi-select" className={cn("relative h-(--qui-control-h) w-full", className)}>
      <Combobox.Root
        multiple
        items={groups}
        filter={null}
        value={chosen.map(optionOf)}
        onValueChange={(next: Item[]) => {
          const pick = next.find((item) => item.create);
          if (pick) {
            void create(pick.label);
            return;
          }
          setNotice(null);
          commit(next.map((item) => item.value));
        }}
        inputValue={query}
        onInputValueChange={(next) => {
          setQuery(next);
          setNotice(null);
        }}
        open={open}
        onOpenChange={(next, details) => {
          // Picking while searching clears the search but keeps the list open for the next pick.
          if (!next && details.reason === "item-press") {
            details.cancel();
            setQuery("");
            return;
          }
          if (next && !open) setPinned(chosen);
          setOpen(next);
        }}
        itemToStringLabel={(item: Item) => item.label}
        itemToStringValue={(item: Item) => item.value}
        isItemEqualToValue={(a: Item, b: Item) => a.value === b.value}
        autoHighlight
        disabled={disabled}
      >
        <Combobox.Chips
          ref={fieldRef}
          data-editing={editing || undefined}
          // Focus from a click opens up on release, so nothing moves under the pointer mid-click.
          onPointerDown={() => {
            pressed.current = true;
          }}
          onClick={() => {
            pressed.current = false;
            setEditing(true);
          }}
          onFocus={() => {
            if (!pressed.current) setEditing(true);
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              pressed.current = false;
              setEditing(false);
            }
          }}
          className={cn(
            // Styled like Input. At rest one line; while editing it wraps and lifts over the page.
            "motion-control absolute inset-x-0 top-0 flex min-h-full w-full cursor-text items-center gap-1 overflow-hidden rounded-control border border-border-strong bg-surface py-1 pr-(--qui-control-px) pl-1 text-(length:--qui-text) text-fg",
            "hover:border-fg-subtle data-editing:z-10 data-editing:flex-wrap data-editing:border-ring data-editing:ring-1 data-editing:ring-ring",
            "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
          )}
        >
          {chosen.map((id, index) => {
            const option = optionOf(id);
            return (
              <Combobox.Chip
                key={id}
                data-slot="multi-select-chip"
                className={cn(chipClass, !editing && index >= fit && "hidden")}
              >
                {option.icon}
                <span className="truncate">{option.label}</span>
                <Combobox.ChipRemove
                  aria-label={labels.remove(option.label)}
                  className="motion-control grid size-5 shrink-0 place-items-center rounded-sm text-fg-subtle hover:bg-surface-hover hover:text-fg [&_svg]:size-3"
                >
                  <XIcon />
                </Combobox.ChipRemove>
              </Combobox.Chip>
            );
          })}
          {folded > 0 && (
            <span className="nums flex h-[calc(var(--qui-control-h)-0.5rem-2px)] shrink-0 items-center rounded-[calc(var(--radius-control)-0.25rem)] px-1.5 text-[calc(var(--qui-text)-0.0625rem)] text-fg-muted">
              {labels.more(folded)}
            </span>
          )}
          <Combobox.Input
            id={id}
            aria-label={ariaLabel}
            placeholder={chosen.length ? undefined : placeholder}
            onPaste={paste}
            // Esc with the list closed would clear every chip; one stray key should not undo all of that.
            onKeyDown={(event) => {
              if (event.key === "Escape" && !open) event.preventBaseUIHandler();
            }}
            className="h-[calc(var(--qui-control-h)-0.5rem-2px)] min-w-4 flex-1 in-data-editing:min-w-12 bg-transparent pl-1 outline-none placeholder:text-fg-subtle pointer-coarse:text-base"
          />
          <span
            data-end
            className="ml-auto flex shrink-0 items-center gap-0.5 self-start pt-[calc((var(--qui-control-h)-0.5rem-2px-1.25rem)/2)] [&_svg]:size-4"
          >
            {chosen.length > 0 && (
              <Combobox.Clear
                aria-label={labels.clear}
                className="motion-control focus-ring grid size-5 place-items-center rounded-sm text-fg-subtle hover:bg-surface-hover hover:text-fg [&_svg]:size-3.5"
              >
                <XIcon />
              </Combobox.Clear>
            )}
            <Combobox.Trigger
              aria-label={labels.showOptions}
              className="grid size-5 place-items-center rounded-sm text-fg-subtle outline-none hover:text-fg"
            >
              <CaretUpDownIcon />
            </Combobox.Trigger>
          </span>
        </Combobox.Chips>
        <Combobox.Portal>
          <Combobox.Positioner anchor={fieldRef} sideOffset={4} align="start" className="z-50 outline-none">
            <Combobox.Popup
              data-slot="multi-select-content"
              className="motion-pop relative w-(--anchor-width) min-w-56 overflow-hidden rounded-float border border-border bg-surface text-fg shadow-float outline-none"
            >
              {!loading && (
                <Combobox.Empty className="px-3 py-6 text-center text-sm text-fg-muted empty:hidden">
                  {failed ? null : labels.empty}
                </Combobox.Empty>
              )}
              <Combobox.List className="max-h-[min(var(--available-height),20rem)] scroll-py-1 overflow-y-auto p-1 empty:hidden">
                {(group: Group) => (
                  <Combobox.Group key={group.label || "all"} items={group.items}>
                    {group.label && (
                      <Combobox.GroupLabel className="px-2 pt-1.5 pb-1 text-xs font-medium text-fg-subtle">
                        {group.label}
                      </Combobox.GroupLabel>
                    )}
                    <Combobox.Collection>
                      {(item: Item) =>
                        item.create ? (
                          <Combobox.Item key={item.value} value={item} disabled={creating !== null} className={row}>
                            <span className="grid size-4 shrink-0 place-items-center text-fg-muted">
                              {creating ? <CircleNotchIcon className="animate-spin" /> : <PlusIcon weight="bold" />}
                            </span>
                            <span className="truncate">{labels.create(item.label)}</span>
                          </Combobox.Item>
                        ) : (
                          <Combobox.Item
                            key={item.value}
                            value={item}
                            disabled={item.disabled || (atMax && !chosen.includes(item.value))}
                            className={row}
                          >
                            {/* A box that fills when chosen: every row can be toggled. */}
                            <span className="grid size-4 shrink-0 place-items-center rounded-[4px] border border-border-strong text-primary-fg group-data-[selected]:border-primary group-data-[selected]:bg-primary [&_svg]:size-3">
                              <Combobox.ItemIndicator>
                                <CheckIcon weight="bold" />
                              </Combobox.ItemIndicator>
                            </span>
                            {item.icon && (
                              <span className="flex shrink-0 items-center [&_svg]:size-4">{item.icon}</span>
                            )}
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate">{marked(item.label, query)}</span>
                              {item.description && (
                                <span className="truncate text-xs text-fg-muted">
                                  {marked(item.description, query)}
                                </span>
                              )}
                            </span>
                          </Combobox.Item>
                        )
                      }
                    </Combobox.Collection>
                  </Combobox.Group>
                )}
              </Combobox.List>
              {status && (
                <Combobox.Status className="flex min-h-9 items-center gap-2 border-t border-border px-3 text-xs text-fg-muted [&_svg]:size-3.5">
                  {loading && <CircleNotchIcon aria-hidden className="animate-spin" />}
                  <span className="flex-1">{status}</span>
                  {failed && !loading && (
                    <button
                      type="button"
                      onClick={() => setAttempt((n) => n + 1)}
                      className="motion-control focus-ring rounded-sm font-medium text-fg hover:underline"
                    >
                      {labels.retry}
                    </button>
                  )}
                </Combobox.Status>
              )}
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
      {name && chosen.map((id) => <input key={id} type="hidden" name={name} value={id} />)}
    </div>
  );
}

// No hover transition: the highlight tracks the pointer and the arrow keys 1:1.
const row =
  "group relative flex min-h-(--qui-item-h) cursor-default items-center gap-2 rounded-md px-2 py-1 text-(length:--qui-text) outline-none select-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface-hover";
