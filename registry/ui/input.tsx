"use client";

import { Input as BaseInput } from "@base-ui/react/input";
import { XIcon } from "@phosphor-icons/react/ssr";
import { type ComponentProps, type ReactNode, type Ref, type RefObject, useRef, useState } from "react";
import { cn } from "@/registry/lib/cn";
import { useShortcut, useShortcutLabel } from "@/registry/lib/shortcut";

export type InputProps = ComponentProps<typeof BaseInput> & {
  /** Icon or text before the value, e.g. a search icon or "$". */
  leading?: ReactNode;
  /** Icon, unit or button after the value, e.g. ".com" or "kg". */
  trailing?: ReactNode;
  /** Shows a clear button while there is text. Esc clears too. */
  clearable?: boolean;
  /** Focuses the field, e.g. "/" or "mod+k". Shown as a key badge while the field is empty. */
  shortcut?: string;
};

export function Input({
  leading,
  trailing,
  clearable,
  shortcut,
  className,
  disabled,
  ref,
  onChange,
  onKeyDown,
  ...props
}: InputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const keys = useShortcutLabel(shortcut);
  // Tracks emptiness for uncontrolled inputs; controlled ones read `value` directly.
  const [typed, setTyped] = useState(() => String(props.defaultValue ?? "") !== "");
  const filled = props.value !== undefined ? String(props.value) !== "" : typed;

  useShortcut(
    shortcut,
    () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    },
    !disabled,
  );

  // Goes through the native setter + input event so onChange and onValueChange fire as if typed.
  const clear = () => {
    const input = inputRef.current;
    if (!input) return;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, "");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: clicks on adornments only forward focus to the input
    <div
      data-slot="input"
      onPointerDown={(e) => {
        if (!(e.target as HTMLElement).closest("input, button, a")) {
          e.preventDefault();
          inputRef.current?.focus();
        }
      }}
      className={cn(
        "motion-control group flex h-(--uil-control-h) w-full min-w-0 cursor-text items-center gap-2 rounded-control border border-border-strong bg-surface px-(--uil-control-px) text-(length:--uil-text) text-fg",
        "hover:border-fg-subtle focus-within:border-ring focus-within:ring-1 focus-within:ring-ring",
        // Invalid wins over focus, so the error stays visible while it is being fixed.
        "has-[[aria-invalid=true]]:border-danger has-[[data-invalid]]:border-danger",
        "has-[[aria-invalid=true]]:focus-within:border-danger has-[[aria-invalid=true]]:focus-within:ring-danger has-[[data-invalid]]:focus-within:border-danger has-[[data-invalid]]:focus-within:ring-danger",
        "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
        "[&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
    >
      {leading && <span className="flex items-center text-fg-subtle">{leading}</span>}
      <BaseInput
        ref={mergeRefs(inputRef, ref)}
        disabled={disabled}
        onChange={(e) => {
          setTyped(e.currentTarget.value !== "");
          onChange?.(e);
        }}
        onKeyDown={(e) => {
          // Only swallow Esc when there is something to clear, so dialogs still close on an empty field.
          if (clearable && e.key === "Escape" && filled) {
            e.preventDefault();
            e.stopPropagation();
            clear();
          }
          onKeyDown?.(e);
        }}
        // 16px on touch stops iOS from zooming the page on focus.
        className="h-full w-full min-w-0 bg-transparent outline-none placeholder:text-fg-subtle pointer-coarse:text-base"
        {...props}
      />
      {(keys || clearable) && (
        // Key badge and clear button share one slot and crossfade, so nothing jumps:
        // the badge shows while empty, the clear button once there is text.
        <span className="grid shrink-0 place-items-center">
          {keys && (
            <kbd
              data-swap={filled ? "out" : undefined}
              aria-hidden
              className="motion-swap pointer-events-none col-start-1 row-start-1 rounded-sm border border-border px-1.5 font-sans text-[0.75em] leading-[1.6] text-fg-subtle"
            >
              {keys}
            </kbd>
          )}
          {clearable && (
            <button
              type="button"
              aria-label="Clear"
              onClick={clear}
              data-swap={filled && !disabled ? undefined : "out"}
              tabIndex={filled && !disabled ? undefined : -1}
              aria-hidden={filled && !disabled ? undefined : true}
              className="motion-swap focus-ring col-start-1 row-start-1 grid size-5 place-items-center rounded-sm text-fg-subtle hover:bg-surface-hover hover:text-fg data-[swap=out]:pointer-events-none [&_svg]:size-3.5"
            >
              <XIcon />
            </button>
          )}
        </span>
      )}
      {trailing && <span className="flex items-center text-fg-subtle">{trailing}</span>}
    </div>
  );
}

function mergeRefs<T>(inner: RefObject<T | null>, outer?: Ref<T>) {
  return (node: T | null) => {
    inner.current = node;
    if (typeof outer === "function") return outer(node);
    if (outer) outer.current = node;
  };
}
