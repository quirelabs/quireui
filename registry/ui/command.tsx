"use client";

import { Autocomplete } from "@base-ui/react/autocomplete";
import { Dialog } from "@base-ui/react/dialog";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/ssr";
import { type ReactNode, type Ref, useId } from "react";
import { cn } from "@/registry/lib/cn";
import { useShortcut } from "@/registry/lib/shortcut";

export type CommandItem = {
  value: string;
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  /** Extra search terms that are not shown, e.g. ["preferences"] for "Settings". */
  keywords?: string[];
  onSelect?: () => void;
};

export type CommandGroup = { heading: string; items: CommandItem[] };

// Plain substring match. Predictable beats clever for something used all day.
function matches(item: CommandItem, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    item.label.toLowerCase().includes(q) ||
    (item.keywords?.some((k) => k.toLowerCase().includes(q)) ?? false)
  );
}

export type CommandProps = {
  groups: CommandGroup[];
  /** Runs after the item's own onSelect, e.g. to close a surrounding dialog. */
  onRun?: (item: CommandItem) => void;
  placeholder?: string;
  emptyText?: ReactNode;
  inputRef?: Ref<HTMLInputElement>;
  className?: string;
};

/** Inline command list. Use CommandPalette for the Cmd+K dialog version. */
export function Command({
  groups,
  onRun,
  placeholder = "Search for a command...",
  emptyText = "No results",
  inputRef,
  className,
}: CommandProps) {
  const hintId = useId();
  return (
    <Autocomplete.Root
      inline
      open
      items={groups}
      filter={matches}
      itemToStringValue={(item: CommandItem) => item.label}
      autoHighlight="always"
      keepHighlight
    >
      <div data-slot="command" className={cn("flex min-h-0 flex-col text-fg", className)}>
        <Autocomplete.InputGroup className="flex items-center gap-2 border-b border-border px-3">
          <MagnifyingGlassIcon aria-hidden className="size-4 shrink-0 text-fg-subtle" />
          <Autocomplete.Input
            ref={inputRef}
            aria-label="Search commands"
            aria-describedby={hintId}
            placeholder={placeholder}
            className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-fg-subtle pointer-coarse:text-base"
          />
        </Autocomplete.InputGroup>
        <span id={hintId} className="sr-only">
          Use arrow keys to move and Enter to run the highlighted command.
        </span>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1 [scroll-padding-block:0.25rem]">
          <Autocomplete.Empty className="py-8 text-center text-sm text-fg-muted empty:hidden">
            {emptyText}
          </Autocomplete.Empty>
          <Autocomplete.List>
            {(group: CommandGroup) => (
              <Autocomplete.Group key={group.heading} items={group.items} className="not-last:mb-1">
                <Autocomplete.GroupLabel className="px-2 pt-2 pb-1 text-xs font-medium text-fg-subtle">
                  {group.heading}
                </Autocomplete.GroupLabel>
                <Autocomplete.Collection>
                  {(item: CommandItem) => (
                    <Autocomplete.Item
                      key={item.value}
                      value={item}
                      onClick={() => {
                        item.onSelect?.();
                        onRun?.(item);
                      }}
                      className="flex h-(--qui-item-h) cursor-default select-none items-center gap-2 rounded-md px-2 text-(length:--qui-text) outline-none [scroll-margin-block:0.25rem] data-[highlighted]:bg-surface-hover [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-fg-muted"
                    >
                      {item.icon}
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.shortcut && <Kbd>{item.shortcut}</Kbd>}
                    </Autocomplete.Item>
                  )}
                </Autocomplete.Collection>
              </Autocomplete.Group>
            )}
          </Autocomplete.List>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-3 py-2 text-xs text-fg-subtle">
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd> run
          </span>
          <span className="flex items-center gap-1">
            <Kbd>↑↓</Kbd> move
          </span>
        </div>
      </div>
    </Autocomplete.Root>
  );
}

export type CommandPaletteProps = Omit<CommandProps, "onRun" | "inputRef"> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Mod+<hotkey> toggles the palette. Pass null to disable. */
  hotkey?: string | null;
};

export function CommandPalette({
  open,
  onOpenChange,
  hotkey = "k",
  className,
  ...commandProps
}: CommandPaletteProps) {
  // The shared helper, so the palette follows the same per-platform rule as every other shortcut.
  useShortcut(hotkey ? `mod+${hotkey}` : undefined, () => {
    onOpenChange(!open);
  });

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="motion-fade fixed inset-0 bg-backdrop" />
        {/* Anchored near the top: the list grows downward and the input never moves. */}
        <Dialog.Viewport className="fixed inset-0 flex items-start justify-center px-3 pt-[12vh]">
          <Dialog.Popup
            aria-label="Command palette"
            className={cn(
              "motion-dialog flex max-h-[min(30rem,76vh)] w-full max-w-xl flex-col overflow-hidden rounded-float border border-border bg-surface shadow-float outline-none",
              className,
            )}
          >
            <Command {...commandProps} onRun={() => onOpenChange(false)} className="flex-1" />
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-surface-muted px-1 font-sans text-[0.6875rem] text-fg-muted">
      {children}
    </kbd>
  );
}
